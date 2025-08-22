class TimerCore {
    constructor() {
        this.totalSeconds = 0;
        this.remainingSeconds = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.interval = null;
        this.startTime = null;
        this.pausedTime = 0;
        this.actualElapsedSeconds = 0;
        this.alarmPlaying = false;
        
        this.isDragging = false;
        this.dragStartY = 0;
        this.dragStartTime = 0;
        this.hasDragged = false;
        this.wheelTimeout = null;
        this.globalWheelTimeout = null;
    }

    adjustTimer(deltaSeconds) {
        if (typeof deltaSeconds !== 'number' || isNaN(deltaSeconds)) {
            return;
        }
        
        if (this.isRunning) {
            const currentElapsed = this.totalSeconds - this.remainingSeconds;
            const newTotalSeconds = Math.max(0, Math.min(5999, this.totalSeconds + deltaSeconds));
            
            if (newTotalSeconds < currentElapsed) {
                return;
            }
            
            this.totalSeconds = newTotalSeconds;
            this.remainingSeconds = this.totalSeconds - currentElapsed;
            
            const sessionElapsedMs = Date.now() - this.startTime;
            const sessionElapsedSeconds = Math.floor(sessionElapsedMs / 1000);
            this.actualElapsedSeconds = Math.max(0, currentElapsed - sessionElapsedSeconds);
        } else {
            this.totalSeconds = Math.max(0, Math.min(5999, this.totalSeconds + deltaSeconds));
            this.remainingSeconds = this.totalSeconds;
            this.actualElapsedSeconds = 0;
        }
        
        window.app.ui.updateDisplay();
        window.app.ui.updateStatus();
        window.app.storage.saveState();
    }

    start() {
        if (this.totalSeconds === 0) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.startTime = Date.now();
        this.pausedTime = 0;
        this.actualElapsedSeconds = this.totalSeconds - this.remainingSeconds;
        
        this.interval = setInterval(() => {
            this.updateTimerFromTimestamp();
        }, 1000);
        
        // Disable task input and todo input when timer starts
        window.app.ui.taskInput.disabled = true;
        window.app.ui.taskInput.blur();
        window.app.todo.todoInput.disabled = true;
        window.app.todo.todoInput.blur();
        
        window.app.ui.updateStatus();
        window.app.storage.saveState();
    }

    pause() {
        this.isRunning = false;
        this.isPaused = true;
        this.pausedTime += Date.now() - this.startTime;
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        // Re-enable task input and todo input when timer pauses
        window.app.ui.taskInput.disabled = false;
        window.app.todo.todoInput.disabled = false;
        
        window.app.ui.updateStatus();
        window.app.storage.saveState();
    }

    reset() {
        this.isRunning = false;
        this.isPaused = false;
        this.totalSeconds = 0;
        this.remainingSeconds = 0;
        this.actualElapsedSeconds = 0;
        this.pausedTime = 0;
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        this.stopAlarm();
        
        // Re-enable task input and todo input when timer resets
        window.app.ui.taskInput.disabled = false;
        window.app.todo.todoInput.disabled = false;
        
        window.app.ui.updateDisplay();
        window.app.ui.updateStatus();
        window.app.storage.saveState();
    }

    finish() {
        this.isRunning = false;
        clearInterval(this.interval);
        this.interval = null;
        
        // Re-enable task input and todo input when timer finishes
        window.app.ui.taskInput.disabled = false;
        window.app.todo.todoInput.disabled = false;
        
        window.app.ui.showFinished();
        this.playAlarm();
        window.app.storage.saveState();
    }

    completeTask() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        // Re-enable task input and todo input when task completes
        window.app.ui.taskInput.disabled = false;
        window.app.todo.todoInput.disabled = false;
        
        window.app.ui.showCompleted();
        this.addCompletedTask();
        this.playCelebrationSound();
        this.showCelebrationEffect();
        window.app.storage.saveState();
        
        setTimeout(() => {
            this.reset();
            this.startNextTodoTask();
        }, 3000);
    }

    startNextTodoTask() {
        const nextTodo = window.app.todo.getNextTodo();
        if (nextTodo) {
            window.app.ui.setCurrentTaskWithTypewriter(nextTodo.text);
            window.app.todo.deleteTodoSilent(nextTodo.id);
            
            // Show a subtle notification
            window.app.ui.showTaskAutoStarted(nextTodo.text);
        } else {
            // No more todos - clear the input after a delay
            setTimeout(() => {
                window.app.ui.clearTaskInputWithAnimation();
            }, 2000);
        }
    }

    playAlarm() {
        if (this.alarmPlaying) return;
        
        this.alarmPlaying = true;
        let alarmCount = 0;
        const maxAlarms = 3;
        
        const playTone = () => {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
                
                alarmCount++;
                if (alarmCount < maxAlarms) {
                    setTimeout(playTone, 600);
                } else {
                    this.alarmPlaying = false;
                }
            } catch (e) {
                this.alarmPlaying = false;
            }
        };
        
        playTone();
    }

    stopAlarm() {
        this.alarmPlaying = false;
        const alarmSound = document.getElementById('alarmSound');
        if (alarmSound) {
            alarmSound.pause();
            alarmSound.currentTime = 0;
        }
    }

    updateTimerFromTimestamp() {
        if (!this.isRunning) return;
        
        const currentTime = Date.now();
        const sessionElapsedMs = currentTime - this.startTime;
        const sessionElapsedSeconds = Math.floor(sessionElapsedMs / 1000);
        
        const newRemainingSeconds = this.totalSeconds - this.actualElapsedSeconds - sessionElapsedSeconds;
        
        if (this.remainingSeconds > 0 && newRemainingSeconds <= 0) {
            this.playAlarm();
            window.app.ui.timerDisplay.classList.add('finished');
        }
        
        this.remainingSeconds = newRemainingSeconds;
        window.app.ui.updateDisplay();
        window.app.ui.updateStatus();
        window.app.storage.saveState();
    }

    addCompletedTask() {
        const currentTaskName = window.app.ui.getCurrentTaskName();
        if (!currentTaskName) return;
        
        const sessionElapsedMs = Date.now() - this.startTime;
        const sessionElapsedSeconds = Math.floor(sessionElapsedMs / 1000);
        const totalElapsedSeconds = this.actualElapsedSeconds + sessionElapsedSeconds;
        
        const allocatedTime = this.formatDuration(this.totalSeconds);
        const actualTime = this.formatDuration(totalElapsedSeconds);
        const isOvertime = totalElapsedSeconds > this.totalSeconds;
        
        const task = {
            name: currentTaskName,
            duration: isOvertime ? `${allocatedTime} → ${actualTime}` : allocatedTime,
            allocatedSeconds: this.totalSeconds,
            actualSeconds: totalElapsedSeconds,
            completedAt: new Date().toLocaleString(),
            timestamp: Date.now()
        };
        
        window.app.storage.addTask(task);
    }

    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    playCelebrationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            const playNote = (frequency, startTime, duration, volume = 0.3) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(frequency, startTime);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            };
            
            const now = audioContext.currentTime;
            playNote(523.25, now, 0.2);
            playNote(659.25, now + 0.15, 0.2);
            playNote(783.99, now + 0.3, 0.2);
            playNote(1046.50, now + 0.45, 0.4);
        } catch (e) {
            // Audio not supported
        }
    }

    showCelebrationEffect() {
        window.app.ui.clearActiveConfetti();
        this.createConfetti();
    }

    createConfetti() {
        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
        const confettiCount = 150;
        
        for (let i = 0; i < confettiCount; i++) {
            setTimeout(() => {
                this.createConfettiPiece(colors[Math.floor(Math.random() * colors.length)]);
            }, i * 10);
        }
    }

    createConfettiPiece(color) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = Math.random() * 10 + 5 + 'px';
        confetti.style.height = Math.random() * 10 + 5 + 'px';
        confetti.style.backgroundColor = color;
        confetti.style.left = Math.random() * window.innerWidth + 'px';
        confetti.style.top = '-20px';
        confetti.style.zIndex = '1000';
        confetti.style.pointerEvents = 'none';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        confetti.style.opacity = '0.8';
        
        const rotation = Math.random() * 360;
        const xVelocity = (Math.random() - 0.5) * 4;
        const yVelocity = Math.random() * 3 + 2;
        const rotationSpeed = (Math.random() - 0.5) * 10;
        
        confetti.style.transform = `rotate(${rotation}deg)`;
        
        document.body.appendChild(confetti);
        
        let currentRotation = rotation;
        let currentX = parseFloat(confetti.style.left);
        let currentY = -20;
        let animationId = null;
        
        const confettiObj = { element: confetti, animationId: null };
        window.app.ui.activeConfetti.push(confettiObj);
        
        const animate = () => {
            currentY += yVelocity;
            currentX += xVelocity;
            currentRotation += rotationSpeed;
            
            confetti.style.top = currentY + 'px';
            confetti.style.left = currentX + 'px';
            confetti.style.transform = `rotate(${currentRotation}deg)`;
            
            if (currentY > window.innerHeight + 20 || currentX < -20 || currentX > window.innerWidth + 20) {
                confetti.remove();
                const index = window.app.ui.activeConfetti.indexOf(confettiObj);
                if (index > -1) {
                    window.app.ui.activeConfetti.splice(index, 1);
                }
            } else {
                animationId = requestAnimationFrame(animate);
                confettiObj.animationId = animationId;
            }
        };
        
        animationId = requestAnimationFrame(animate);
        confettiObj.animationId = animationId;
    }

    cleanup() {
        clearInterval(this.interval);
        clearTimeout(this.wheelTimeout);
        clearTimeout(this.globalWheelTimeout);
        this.stopAlarm();
        window.app.ui.clearActiveConfetti();
    }
}
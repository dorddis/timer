class MinimalisticTimer {
    constructor() {
        this.timeDigits = document.getElementById('timeDigits');
        this.timerStatus = document.getElementById('timerStatus');
        this.timerDisplay = document.getElementById('timerDisplay');
        this.alarmSound = document.getElementById('alarmSound');
        this.taskInput = document.getElementById('taskInput');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.sidebar = document.getElementById('sidebar');
        this.tasksList = document.getElementById('tasksList');
        this.clearHistory = document.getElementById('clearHistory');
        this.timerContainer = document.querySelector('.timer-container');
        this.taskInputContainer = document.querySelector('.task-input-container');
        this.controls = document.querySelector('.controls');
        
        this.totalSeconds = 0;
        this.remainingSeconds = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.interval = null;
        this.startTime = null;
        this.currentTaskName = '';
        this.actualElapsedSeconds = 0;
        
        this.isDragging = false;
        this.dragStartY = 0;
        this.dragStartTime = 0;
        this.hasDragged = false;
        this.sidebarOpen = false;
        this.alarmPlaying = false;
        
        this.init();
        this.loadState();
        this.loadTaskHistory();
    }
    
    init() {
        this.setupEventListeners();
        this.updateDisplay();
        this.updateStatus();
    }
    
    setupEventListeners() {
        this.timerDisplay.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        this.timerDisplay.addEventListener('wheel', this.handleWheel.bind(this));
        this.timerDisplay.addEventListener('click', this.handleClick.bind(this));
        
        document.addEventListener('wheel', this.handleGlobalWheel.bind(this), { passive: false });
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        
        this.sidebarToggle.addEventListener('click', this.toggleSidebar.bind(this));
        this.clearHistory.addEventListener('click', this.clearTaskHistory.bind(this));
        this.taskInput.addEventListener('input', this.handleTaskInput.bind(this));
        
        document.addEventListener('click', this.handleOutsideClick.bind(this));
        
        window.addEventListener('beforeunload', this.saveState.bind(this));
        
        this.timerDisplay.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    handleMouseDown(e) {
        if (this.isRunning) return;
        
        this.isDragging = true;
        this.hasDragged = false;
        this.dragStartY = e.clientY;
        this.dragStartTime = this.totalSeconds;
        this.timerDisplay.classList.add('dragging');
        e.preventDefault();
    }
    
    handleMouseMove(e) {
        if (!this.isDragging || this.isRunning) return;
        
        const deltaY = this.dragStartY - e.clientY;
        const sensitivity = 2;
        const timeChange = Math.round(deltaY * sensitivity);
        
        // Only mark as dragged if there's actual movement
        if (Math.abs(deltaY) > 3) {
            this.hasDragged = true;
        }
        
        this.totalSeconds = Math.max(0, Math.min(5999, this.dragStartTime + timeChange));
        this.remainingSeconds = this.totalSeconds;
        this.actualElapsedSeconds = 0;
        this.updateDisplay();
        this.updateStatus();
    }
    
    handleMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.timerDisplay.classList.remove('dragging');
            this.saveState();
        }
    }
    
    handleWheel(e) {
        if (this.isRunning) return;
        
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            return;
        }
        
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        this.totalSeconds = Math.max(0, Math.min(5999, this.totalSeconds + delta * 15));
        
        this.remainingSeconds = this.totalSeconds;
        this.actualElapsedSeconds = 0;
        this.updateDisplay();
        this.updateStatus();
        this.saveState();
    }
    
    handleGlobalWheel(e) {
        if (this.isRunning) return;
        
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            return;
        }
        
        // Don't hijack scroll if we're over the sidebar
        if (this.sidebar.contains(e.target)) {
            return;
        }
        
        if (e.target !== this.timerDisplay && !this.timerDisplay.contains(e.target)) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -1 : 1;
            
            this.totalSeconds = Math.max(0, Math.min(5999, this.totalSeconds + delta * 15));
            this.remainingSeconds = this.totalSeconds;
            this.actualElapsedSeconds = 0;
            this.updateDisplay();
            this.updateStatus();
            this.saveState();
        }
    }
    
    handleClick(e) {
        // Don't trigger click if we just finished dragging
        if (this.hasDragged) {
            this.hasDragged = false;
            return;
        }
        
        if (this.totalSeconds === 0) return;
        
        if (this.isRunning) {
            this.pause();
        } else {
            this.start();
        }
    }
    
    handleKeydown(e) {
        if (document.activeElement === this.taskInput || 
            document.activeElement.classList.contains('task-edit-input')) {
            return;
        }
        
        if (e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }
        
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                if (this.totalSeconds > 0) {
                    this.isRunning ? this.pause() : this.start();
                }
                break;
            case 'KeyR':
                this.reset();
                break;
            case 'KeyC':
                if (this.isRunning) {
                    this.completeTask();
                }
                break;
            case 'ArrowUp':
                if (!this.isRunning) {
                    this.totalSeconds = Math.min(5999, this.totalSeconds + (e.shiftKey ? 60 : 1));
                    this.remainingSeconds = this.totalSeconds;
                    this.actualElapsedSeconds = 0;
                    this.updateDisplay();
                    this.updateStatus();
                    this.saveState();
                }
                break;
            case 'ArrowDown':
                if (!this.isRunning) {
                    this.totalSeconds = Math.max(0, this.totalSeconds - (e.shiftKey ? 60 : 1));
                    this.remainingSeconds = this.totalSeconds;
                    this.actualElapsedSeconds = 0;
                    this.updateDisplay();
                    this.updateStatus();
                    this.saveState();
                }
                break;
            case 'AudioVolumeUp':
            case 'VolumeUp':
                if (document.hasFocus() && !this.isRunning) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.totalSeconds = Math.min(5999, this.totalSeconds + 15);
                    this.remainingSeconds = this.totalSeconds;
                    this.actualElapsedSeconds = 0;
                    this.updateDisplay();
                    this.updateStatus();
                    this.saveState();
                }
                break;
            case 'AudioVolumeDown':
            case 'VolumeDown':
                if (document.hasFocus() && !this.isRunning) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.totalSeconds = Math.max(0, this.totalSeconds - 15);
                    this.remainingSeconds = this.totalSeconds;
                    this.actualElapsedSeconds = 0;
                    this.updateDisplay();
                    this.updateStatus();
                    this.saveState();
                }
                break;
        }
    }
    
    start() {
        if (this.totalSeconds === 0) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.startTime = Date.now();
        this.actualElapsedSeconds = this.totalSeconds - this.remainingSeconds;
        this.currentTaskName = this.taskInput.value.trim() || 'Untitled Task';
        this.timerDisplay.classList.add('running');
        // Only remove 'finished' if we're not in overtime (remainingSeconds >= 0)
        if (this.remainingSeconds >= 0) {
            this.timerDisplay.classList.remove('finished');
        }
        
        this.interval = setInterval(() => {
            this.remainingSeconds--;
            this.actualElapsedSeconds++;
            this.updateDisplay();
            this.updateStatus();
            
            if (this.remainingSeconds === 0) {
                this.playAlarm();
                this.timerDisplay.classList.add('finished');
            }
            
            this.saveState();
        }, 1000);
        
        this.updateStatus();
        this.saveState();
    }
    
    pause() {
        this.isRunning = false;
        this.isPaused = true;
        this.timerDisplay.classList.remove('running');
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        this.updateStatus();
        this.saveState();
    }
    
    reset() {
        this.isRunning = false;
        this.isPaused = false;
        this.totalSeconds = 0;
        this.remainingSeconds = 0;
        this.actualElapsedSeconds = 0;
        this.timerDisplay.classList.remove('running', 'finished', 'completed');
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        this.updateDisplay();
        this.updateStatus();
        this.saveState();
    }
    
    
    completeTask() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.isPaused = false;
        this.timerDisplay.classList.remove('running');
        this.timerDisplay.classList.add('completed');
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        this.addCompletedTask();
        this.playCelebrationSound();
        this.showCelebrationEffect();
        this.updateStatus();
        this.saveState();
        
        setTimeout(() => {
            this.reset();
        }, 3000);
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
                console.log('Audio not supported');
                this.alarmPlaying = false;
            }
        };
        
        playTone();
    }
    
    updateDisplay() {
        if (this.remainingSeconds >= 0) {
            const minutes = Math.floor(this.remainingSeconds / 60);
            const seconds = this.remainingSeconds % 60;
            this.timeDigits.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            const overtimeSeconds = Math.abs(this.remainingSeconds);
            const minutes = Math.floor(overtimeSeconds / 60);
            const seconds = overtimeSeconds % 60;
            this.timeDigits.textContent = `-${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    updateStatus() {
        if (this.totalSeconds === 0) {
            this.timerStatus.textContent = 'Click and drag to set time';
        } else if (this.isRunning && this.remainingSeconds < 0) {
            this.timerStatus.textContent = 'Overtime - C to complete';
        } else if (this.isRunning) {
            this.timerStatus.textContent = 'Running... Click to pause';
        } else if (this.isPaused) {
            this.timerStatus.textContent = 'Paused - Click to resume';
        } else if (this.remainingSeconds <= 0 && this.totalSeconds > 0) {
            this.timerStatus.textContent = 'Time up! C to complete';
        } else {
            this.timerStatus.textContent = 'Click to start timer';
        }
    }
    
    loadState() {
        try {
            const saved = localStorage.getItem('timerState');
            if (!saved) return;
            
            const state = JSON.parse(saved);
            const timePassed = Math.floor((Date.now() - state.timestamp) / 1000);
            
            this.totalSeconds = state.totalSeconds;
            this.remainingSeconds = state.remainingSeconds;
            
            if (state.currentTaskName) {
                this.taskInput.value = state.currentTaskName;
            }
            
            if (state.isRunning) {
                this.remainingSeconds = state.remainingSeconds - timePassed;
                this.actualElapsedSeconds = state.actualElapsedSeconds || (this.totalSeconds - this.remainingSeconds);
                this.start();
            } else {
                this.isRunning = false;
                this.isPaused = state.isPaused;
                this.actualElapsedSeconds = state.actualElapsedSeconds || 0;
            }
            
            this.updateDisplay();
            this.updateStatus();
        } catch (e) {
            console.log('Failed to load saved state');
        }
    }
    
    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        this.sidebar.classList.toggle('open');
        this.sidebarToggle.classList.toggle('open');
        this.timerContainer.classList.toggle('sidebar-open');
        this.taskInputContainer.classList.toggle('sidebar-open');
        this.controls.classList.toggle('sidebar-open');
    }
    
    handleOutsideClick(e) {
        if (this.sidebarOpen && 
            !this.sidebar.contains(e.target) && 
            !this.sidebarToggle.contains(e.target)) {
            this.closeSidebar();
        }
    }
    
    closeSidebar() {
        this.sidebarOpen = false;
        this.sidebar.classList.remove('open');
        this.sidebarToggle.classList.remove('open');
        this.timerContainer.classList.remove('sidebar-open');
        this.taskInputContainer.classList.remove('sidebar-open');
        this.controls.classList.remove('sidebar-open');
    }
    
    handleTaskInput() {
        this.saveState();
    }
    
    addCompletedTask() {
        if (!this.currentTaskName) return;
        
        const allocatedTime = this.formatDuration(this.totalSeconds);
        const actualTime = this.formatDuration(this.actualElapsedSeconds);
        const isOvertime = this.actualElapsedSeconds > this.totalSeconds;
        
        const task = {
            name: this.currentTaskName,
            duration: isOvertime ? `${allocatedTime} - ${actualTime}` : allocatedTime,
            allocatedSeconds: this.totalSeconds,
            actualSeconds: this.actualElapsedSeconds,
            completedAt: new Date().toLocaleString(),
            timestamp: Date.now()
        };
        
        let tasks = this.getTaskHistory();
        tasks.unshift(task);
        tasks = tasks.slice(0, 50);
        
        localStorage.setItem('taskHistory', JSON.stringify(tasks));
        this.loadTaskHistory();
    }
    
    getTaskHistory() {
        try {
            const saved = localStorage.getItem('taskHistory');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }
    
    loadTaskHistory() {
        const tasks = this.getTaskHistory();
        
        if (tasks.length === 0) {
            this.tasksList.innerHTML = '<div class="no-tasks">No completed tasks yet</div>';
            return;
        }
        
        this.tasksList.innerHTML = tasks.map((task, index) => `
            <div class="task-item">
                <div class="task-content">
                    <div class="task-name">
                        <span class="task-text" data-task-index="${index}">${this.escapeHtml(task.name)}</span>
                        <button class="task-delete" data-task-index="${index}" title="Delete task">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 3V4H4V6H5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V6H20V4H15V3H9ZM7 6H17V19H7V6ZM9 8V17H11V8H9ZM13 8V17H15V8H13Z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="task-details">
                        <span class="task-duration">${task.duration}</span>
                        <span class="task-time">${task.completedAt}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add event listeners to delete buttons
        const deleteButtons = this.tasksList.querySelectorAll('.task-delete');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const taskIndex = parseInt(e.currentTarget.getAttribute('data-task-index'));
                this.deleteTask(taskIndex);
            });
        });
        
        // Add event listeners to task text elements for editing
        const taskTexts = this.tasksList.querySelectorAll('.task-text');
        taskTexts.forEach(textElement => {
            textElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const taskIndex = parseInt(e.currentTarget.getAttribute('data-task-index'));
                this.editTaskName(textElement, taskIndex);
            });
        });
    }
    
    editTaskName(textElement, taskIndex) {
        if (textElement.classList.contains('editing')) {
            return;
        }
        
        const currentText = textElement.textContent;
        textElement.classList.add('editing');
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.className = 'task-edit-input';
        input.style.cssText = `
            background: rgba(35, 35, 35, 0.9);
            border: 1px solid rgba(232, 232, 232, 0.3);
            border-radius: 4px;
            color: #e8e8e8;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9rem;
            padding: 0.25rem 0.5rem;
            width: 100%;
            outline: none;
            user-select: text;
        `;
        
        textElement.style.display = 'none';
        textElement.parentNode.insertBefore(input, textElement);
        input.focus();
        input.select();
        
        const saveEdit = () => {
            const newText = input.value.trim();
            if (newText && newText !== currentText) {
                this.updateTaskName(taskIndex, newText);
            }
            input.remove();
            textElement.style.display = '';
            textElement.classList.remove('editing');
        };
        
        const cancelEdit = () => {
            input.remove();
            textElement.style.display = '';
            textElement.classList.remove('editing');
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }
    
    updateTaskName(taskIndex, newName) {
        let tasks = this.getTaskHistory();
        if (tasks[taskIndex]) {
            tasks[taskIndex].name = newName;
            localStorage.setItem('taskHistory', JSON.stringify(tasks));
            this.loadTaskHistory();
        }
    }

    deleteTask(index) {
        let tasks = this.getTaskHistory();
        tasks.splice(index, 1);
        localStorage.setItem('taskHistory', JSON.stringify(tasks));
        this.loadTaskHistory();
    }

    clearTaskHistory() {
        localStorage.removeItem('taskHistory');
        this.loadTaskHistory();
    }
    
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    saveState() {
        const state = {
            totalSeconds: this.totalSeconds,
            remainingSeconds: this.remainingSeconds,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            currentTaskName: this.taskInput.value,
            actualElapsedSeconds: this.actualElapsedSeconds,
            timestamp: Date.now()
        };
        localStorage.setItem('timerState', JSON.stringify(state));
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
            console.log('Audio not supported');
        }
    }
    
    showCelebrationEffect() {
        this.createConfetti();
        
        document.body.style.background = 'radial-gradient(circle, rgba(50, 205, 50, 0.1) 0%, rgba(0, 0, 0, 1) 70%)';
        setTimeout(() => {
            document.body.style.background = '#000000';
        }, 2000);
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
        
        const animate = () => {
            currentY += yVelocity;
            currentX += xVelocity;
            currentRotation += rotationSpeed;
            
            confetti.style.top = currentY + 'px';
            confetti.style.left = currentX + 'px';
            confetti.style.transform = `rotate(${currentRotation}deg)`;
            
            if (currentY > window.innerHeight + 20 || currentX < -20 || currentX > window.innerWidth + 20) {
                confetti.remove();
            } else {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.timer = new MinimalisticTimer();
});
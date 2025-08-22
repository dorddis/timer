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
        this.todoToggle = document.getElementById('todoToggle');
        this.todoWindow = document.getElementById('todoWindow');
        this.todoClose = document.getElementById('todoClose');
        this.todoInput = document.getElementById('todoInput');
        this.todoList = document.getElementById('todoList');
        this.timerContainer = document.querySelector('.timer-container');
        this.taskInputContainer = document.querySelector('.task-input-container');
        this.controls = document.querySelector('.controls');
        
        this.totalSeconds = 0;
        this.remainingSeconds = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.interval = null;
        this.startTime = null;
        this.pausedTime = 0;
        this.currentTaskName = '';
        this.actualElapsedSeconds = 0;
        
        this.isDragging = false;
        this.dragStartY = 0;
        this.dragStartTime = 0;
        this.hasDragged = false;
        this.sidebarOpen = false;
        this.todoWindowOpen = false;
        this.alarmPlaying = false;
        this.activeConfetti = [];
        this.wheelTimeout = null;
        this.globalWheelTimeout = null;
        this.todos = [];
        this.todoIdCounter = 1;
        
        this.init();
        this.loadState();
        this.loadTaskHistory();
        this.loadTodos();
        this.loadVersion();
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
        
        // Todo window event listeners
        this.todoToggle.addEventListener('click', this.toggleTodoWindow.bind(this));
        this.todoClose.addEventListener('click', this.closeTodoWindow.bind(this));
        this.todoInput.addEventListener('keydown', this.handleTodoInputKeydown.bind(this));
        
        // Event delegation for task list
        this.tasksList.addEventListener('click', this.handleTaskListClick.bind(this));
        
        // Event delegation for todo list
        this.todoList.addEventListener('click', this.handleTodoListClick.bind(this));
        
        document.addEventListener('click', this.handleOutsideClick.bind(this));
        
        window.addEventListener('beforeunload', this.cleanup.bind(this));
        
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
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            return;
        }
        
        e.preventDefault();
        
        // Debounce wheel events
        clearTimeout(this.wheelTimeout);
        this.wheelTimeout = setTimeout(() => {
            this.adjustTimer(e.deltaY > 0 ? -15 : 15);
        }, 50);
    }
    
    handleGlobalWheel(e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            return;
        }
        
        // Don't hijack scroll if we're over the sidebar or todo window
        if (this.sidebar.contains(e.target) || this.todoWindow.contains(e.target)) {
            return;
        }
        
        if (e.target !== this.timerDisplay && !this.timerDisplay.contains(e.target)) {
            e.preventDefault();
            
            // Debounce global wheel events
            clearTimeout(this.globalWheelTimeout);
            this.globalWheelTimeout = setTimeout(() => {
                this.adjustTimer(e.deltaY > 0 ? -15 : 15);
            }, 50);
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
            document.activeElement === this.todoInput ||
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
                this.adjustTimer(e.shiftKey ? 60 : 1);
                break;
            case 'ArrowDown':
                this.adjustTimer(e.shiftKey ? -60 : -1);
                break;
            case 'AudioVolumeUp':
            case 'VolumeUp':
                if (document.hasFocus()) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.adjustTimer(15);
                }
                break;
            case 'AudioVolumeDown':
            case 'VolumeDown':
                if (document.hasFocus()) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.adjustTimer(-15);
                }
                break;
        }
    }
    
    adjustTimer(deltaSeconds) {
        // Validate input
        if (typeof deltaSeconds !== 'number' || isNaN(deltaSeconds)) {
            return;
        }
        
        if (this.isRunning) {
            // If timer is running, we need to adjust the current elapsed time
            const currentElapsed = this.totalSeconds - this.remainingSeconds;
            const newTotalSeconds = Math.max(0, Math.min(5999, this.totalSeconds + deltaSeconds));
            
            // Don't allow adjusting below current elapsed time when running
            if (newTotalSeconds < currentElapsed) {
                return;
            }
            
            this.totalSeconds = newTotalSeconds;
            this.remainingSeconds = this.totalSeconds - currentElapsed;
            
            // Update the start time to maintain consistency
            const sessionElapsedMs = Date.now() - this.startTime;
            const sessionElapsedSeconds = Math.floor(sessionElapsedMs / 1000);
            this.actualElapsedSeconds = Math.max(0, currentElapsed - sessionElapsedSeconds);
        } else {
            // If timer is not running, simple adjustment
            this.totalSeconds = Math.max(0, Math.min(5999, this.totalSeconds + deltaSeconds));
            this.remainingSeconds = this.totalSeconds;
            this.actualElapsedSeconds = 0;
        }
        
        this.updateDisplay();
        this.updateStatus();
        this.saveState();
    }
    
    start() {
        if (this.totalSeconds === 0) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.startTime = Date.now();
        this.pausedTime = 0;
        this.actualElapsedSeconds = this.totalSeconds - this.remainingSeconds;
        this.currentTaskName = this.taskInput.value.trim() || 'Untitled Task';
        this.timerDisplay.classList.add('running');
        // Only remove 'finished' if we're not in overtime (remainingSeconds >= 0)
        if (this.remainingSeconds >= 0) {
            this.timerDisplay.classList.remove('finished');
        }
        
        this.interval = setInterval(() => {
            this.updateTimerFromTimestamp();
        }, 1000);
        
        this.updateStatus();
        this.saveState();
    }
    
    pause() {
        this.isRunning = false;
        this.isPaused = true;
        this.pausedTime += Date.now() - this.startTime;
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
        this.pausedTime = 0;
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
    
    updateTimerFromTimestamp() {
        if (!this.isRunning) return;
        
        const currentTime = Date.now();
        const sessionElapsedMs = currentTime - this.startTime;
        const sessionElapsedSeconds = Math.floor(sessionElapsedMs / 1000);
        
        const newRemainingSeconds = this.totalSeconds - this.actualElapsedSeconds - sessionElapsedSeconds;
        
        if (this.remainingSeconds > 0 && newRemainingSeconds <= 0) {
            this.playAlarm();
            this.timerDisplay.classList.add('finished');
        }
        
        this.remainingSeconds = newRemainingSeconds;
        this.updateDisplay();
        this.updateStatus();
        this.saveState();
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
            
            this.totalSeconds = state.totalSeconds;
            this.remainingSeconds = state.remainingSeconds;
            this.pausedTime = state.pausedTime || 0;
            
            if (state.currentTaskName) {
                this.taskInput.value = state.currentTaskName;
            }
            
            if (state.isRunning) {
                const timePassed = Date.now() - state.timestamp;
                const sessionSeconds = Math.floor(timePassed / 1000);
                
                this.pausedTime = state.pausedTime || 0;
                this.startTime = Date.now() - timePassed;
                this.actualElapsedSeconds = state.actualElapsedSeconds || 0;
                
                // Calculate current remaining time accounting for time passed while app was closed
                this.remainingSeconds = Math.max(-999, this.remainingSeconds - sessionSeconds);
                
                // If timer should have finished while we were away, handle it
                if (this.remainingSeconds <= 0 && state.remainingSeconds > 0) {
                    this.timerDisplay.classList.add('finished');
                }
                
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
        
        if (this.todoWindowOpen &&
            !this.todoWindow.contains(e.target) &&
            !this.todoToggle.contains(e.target)) {
            this.closeTodoWindow();
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
    
    closeTodoWindow() {
        this.todoWindowOpen = false;
        this.todoWindow.classList.remove('open');
        this.todoToggle.classList.remove('open');
    }
    
    handleTaskInput() {
        this.saveState();
    }
    
    handleTaskListClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const deleteButton = e.target.closest('.task-delete');
        const taskText = e.target.closest('.task-text');
        
        if (deleteButton) {
            const taskIndex = parseInt(deleteButton.getAttribute('data-task-index'));
            if (confirm('Delete this task from history?')) {
                this.deleteTask(taskIndex);
            }
        } else if (taskText) {
            const taskIndex = parseInt(taskText.getAttribute('data-task-index'));
            this.editTaskName(taskText, taskIndex);
        }
    }
    
    addCompletedTask() {
        if (!this.currentTaskName) return;
        
        // Calculate actual elapsed time including current session and any overtime
        const sessionElapsedMs = Date.now() - this.startTime;
        const sessionElapsedSeconds = Math.floor(sessionElapsedMs / 1000);
        const totalElapsedSeconds = this.actualElapsedSeconds + sessionElapsedSeconds;
        
        const allocatedTime = this.formatDuration(this.totalSeconds);
        const actualTime = this.formatDuration(totalElapsedSeconds);
        const isOvertime = totalElapsedSeconds > this.totalSeconds;
        
        const task = {
            name: this.currentTaskName,
            duration: isOvertime ? `${allocatedTime} → ${actualTime}` : allocatedTime,
            allocatedSeconds: this.totalSeconds,
            actualSeconds: totalElapsedSeconds,
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
        
        // Clear existing content and event listeners
        this.tasksList.innerHTML = '';
        
        if (tasks.length === 0) {
            this.tasksList.innerHTML = '<div class="no-tasks">No completed tasks yet</div>';
            return;
        }
        
        // Use event delegation instead of adding individual listeners
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
        input.maxLength = 100;
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
            if (newText && newText !== currentText && newText.length <= 100) {
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
            pausedTime: this.pausedTime,
            startTime: this.startTime,
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
        this.clearActiveConfetti();
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
    
    clearActiveConfetti() {
        this.activeConfetti.forEach(confetti => {
            if (confetti.element && confetti.element.parentNode) {
                confetti.element.remove();
            }
            if (confetti.animationId) {
                cancelAnimationFrame(confetti.animationId);
            }
        });
        this.activeConfetti = [];
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
        this.activeConfetti.push(confettiObj);
        
        const animate = () => {
            currentY += yVelocity;
            currentX += xVelocity;
            currentRotation += rotationSpeed;
            
            confetti.style.top = currentY + 'px';
            confetti.style.left = currentX + 'px';
            confetti.style.transform = `rotate(${currentRotation}deg)`;
            
            if (currentY > window.innerHeight + 20 || currentX < -20 || currentX > window.innerWidth + 20) {
                confetti.remove();
                const index = this.activeConfetti.indexOf(confettiObj);
                if (index > -1) {
                    this.activeConfetti.splice(index, 1);
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
        // Save state before unload
        this.saveState();
        
        // Clear timeouts
        if (this.wheelTimeout) {
            clearTimeout(this.wheelTimeout);
        }
        if (this.globalWheelTimeout) {
            clearTimeout(this.globalWheelTimeout);
        }
        
        // Clear timer interval
        if (this.interval) {
            clearInterval(this.interval);
        }
        
        // Clear confetti animations
        this.clearActiveConfetti();
    }
    
    toggleTodoWindow() {
        this.todoWindowOpen = !this.todoWindowOpen;
        this.todoWindow.classList.toggle('open', this.todoWindowOpen);
        this.todoToggle.classList.toggle('open', this.todoWindowOpen);
    }
    
    addTodo() {
        const text = this.todoInput.value.trim();
        if (!text) return;
        
        const todo = {
            id: this.todoIdCounter++,
            text: text,
            completed: false,
            created: Date.now()
        };
        
        this.todos.push(todo);
        this.todoInput.value = '';
        this.renderTodos();
        this.saveTodos();
    }
    
    handleTodoInputKeydown(e) {
        if (e.code === 'Enter') {
            this.addTodo();
        }
    }
    
    handleTodoListClick(e) {
        const todoItem = e.target.closest('.todo-item');
        if (!todoItem) return;
        
        const todoId = parseInt(todoItem.dataset.todoId);
        
        if (e.target.classList.contains('todo-delete')) {
            this.deleteTodo(todoId);
        } else if (e.target.classList.contains('todo-text')) {
            this.startTodoAsCurrentTask(todoId);
        }
    }
    
    deleteTodo(id) {
        this.todos = this.todos.filter(todo => todo.id !== id);
        this.renderTodos();
        this.saveTodos();
    }
    
    startTodoAsCurrentTask(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            this.taskInput.value = todo.text;
            this.currentTaskName = todo.text;
            this.deleteTodo(id);
            if (this.todoWindowOpen) {
                this.closeTodoWindow();
            }
        }
    }
    
    renderTodos() {
        if (this.todos.length === 0) {
            this.todoList.innerHTML = '<div class="no-todos">No tasks yet</div>';
            return;
        }
        
        this.todoList.innerHTML = this.todos.map(todo => `
            <div class="todo-item" data-todo-id="${todo.id}">
                <div class="todo-content">
                    <div class="todo-text">${this.escapeHtml(todo.text)}</div>
                    <div class="todo-actions">
                        <button class="todo-delete">×</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    loadTodos() {
        try {
            const saved = localStorage.getItem('timerTodos');
            if (saved) {
                this.todos = JSON.parse(saved);
                if (this.todos.length > 0) {
                    this.todoIdCounter = Math.max(...this.todos.map(t => t.id)) + 1;
                }
                this.renderTodos();
            }
        } catch (error) {
            console.log('Could not load todos from localStorage');
            this.todos = [];
        }
    }
    
    saveTodos() {
        try {
            localStorage.setItem('timerTodos', JSON.stringify(this.todos));
        } catch (error) {
            console.log('Could not save todos to localStorage');
        }
    }
    
    async loadVersion() {
        try {
            const response = await fetch('/api/version');
            const versionData = await response.json();
            const versionDisplay = document.getElementById('versionDisplay');
            if (versionDisplay && versionData.version) {
                versionDisplay.textContent = `v${versionData.version}`;
            }
        } catch (error) {
            console.log('Could not load version data');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.timer = new MinimalisticTimer();
});
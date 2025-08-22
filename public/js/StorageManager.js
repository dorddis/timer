class StorageManager {
    constructor() {
        this.completedTasks = [];
    }

    saveState() {
        const state = {
            totalSeconds: window.app.timer.totalSeconds,
            remainingSeconds: window.app.timer.remainingSeconds,
            isRunning: window.app.timer.isRunning,
            isPaused: window.app.timer.isPaused,
            currentTaskName: window.app.ui.taskInput.value,
            actualElapsedSeconds: window.app.timer.actualElapsedSeconds,
            pausedTime: window.app.timer.pausedTime,
            startTime: window.app.timer.startTime,
            timestamp: Date.now()
        };
        localStorage.setItem('timerState', JSON.stringify(state));
    }

    loadState() {
        try {
            const saved = localStorage.getItem('timerState');
            if (!saved) return;
            
            const state = JSON.parse(saved);
            
            window.app.timer.totalSeconds = state.totalSeconds;
            window.app.timer.remainingSeconds = state.remainingSeconds;
            window.app.timer.pausedTime = state.pausedTime || 0;
            
            if (state.currentTaskName) {
                window.app.ui.taskInput.value = state.currentTaskName;
            }
            
            if (state.isRunning) {
                const timePassed = Date.now() - state.timestamp;
                const sessionSeconds = Math.floor(timePassed / 1000);
                
                window.app.timer.pausedTime = state.pausedTime || 0;
                window.app.timer.startTime = Date.now() - timePassed;
                window.app.timer.actualElapsedSeconds = state.actualElapsedSeconds || 0;
                
                window.app.timer.remainingSeconds = Math.max(-999, window.app.timer.remainingSeconds - sessionSeconds);
                
                if (window.app.timer.remainingSeconds <= 0 && state.remainingSeconds > 0) {
                    window.app.ui.timerDisplay.classList.add('finished');
                }
                
                window.app.timer.start();
            } else {
                window.app.timer.isRunning = false;
                window.app.timer.isPaused = state.isPaused;
                window.app.timer.actualElapsedSeconds = state.actualElapsedSeconds || 0;
            }
            
            window.app.ui.updateDisplay();
            window.app.ui.updateStatus();
        } catch (e) {
            console.log('Failed to load saved state');
        }
    }

    loadTaskHistory() {
        try {
            const saved = localStorage.getItem('taskHistory');
            if (saved) {
                this.completedTasks = JSON.parse(saved);
            }
        } catch (e) {
            this.completedTasks = [];
        }
    }

    addTask(task) {
        this.completedTasks.unshift(task);
        this.completedTasks = this.completedTasks.slice(0, 50);
        
        localStorage.setItem('taskHistory', JSON.stringify(this.completedTasks));
        window.app.ui.renderTaskHistory();
    }

    getTaskHistory() {
        try {
            const saved = localStorage.getItem('taskHistory');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    getCompletedTasks() {
        return this.getTaskHistory();
    }

    deleteTask(taskIndex) {
        this.completedTasks.splice(taskIndex, 1);
        localStorage.setItem('taskHistory', JSON.stringify(this.completedTasks));
    }

    clearTaskHistory() {
        localStorage.removeItem('taskHistory');
        this.completedTasks = [];
    }
}
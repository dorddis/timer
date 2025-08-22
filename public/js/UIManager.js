class UIManager {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.sidebarOpen = false;
        this.activeConfetti = [];
    }

    initializeElements() {
        this.timeDigits = document.getElementById('timeDigits');
        this.timerStatus = document.getElementById('timerStatus');
        this.timerDisplay = document.getElementById('timerDisplay');
        this.taskInput = document.getElementById('taskInput');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.sidebar = document.getElementById('sidebar');
        this.tasksList = document.getElementById('tasksList');
        this.clearHistory = document.getElementById('clearHistory');
        this.timerContainer = document.querySelector('.timer-container');
        this.taskInputContainer = document.querySelector('.task-input-container');
        this.controls = document.querySelector('.controls');
        this.currentTaskName = '';
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
        
        this.tasksList.addEventListener('click', this.handleTaskListClick.bind(this));
        document.addEventListener('click', this.handleOutsideClick.bind(this));
        
        this.timerDisplay.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    handleMouseDown(e) {
        if (window.app.timer.isRunning) return;
        
        window.app.timer.isDragging = true;
        window.app.timer.hasDragged = false;
        window.app.timer.dragStartY = e.clientY;
        window.app.timer.dragStartTime = window.app.timer.totalSeconds;
        this.timerDisplay.classList.add('dragging');
        e.preventDefault();
    }

    handleMouseMove(e) {
        if (!window.app.timer.isDragging || window.app.timer.isRunning) return;
        
        const deltaY = window.app.timer.dragStartY - e.clientY;
        const sensitivity = 2;
        const timeChange = Math.round(deltaY * sensitivity);
        
        if (Math.abs(deltaY) > 3) {
            window.app.timer.hasDragged = true;
        }
        
        window.app.timer.totalSeconds = Math.max(0, Math.min(5999, window.app.timer.dragStartTime + timeChange));
        window.app.timer.remainingSeconds = window.app.timer.totalSeconds;
        window.app.timer.actualElapsedSeconds = 0;
        this.updateDisplay();
        this.updateStatus();
        window.app.storage.saveState();
    }

    handleMouseUp() {
        if (window.app.timer.isDragging) {
            window.app.timer.isDragging = false;
            this.timerDisplay.classList.remove('dragging');
            window.app.storage.saveState();
        }
    }

    handleWheel(e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;
        
        e.preventDefault();
        
        clearTimeout(window.app.timer.wheelTimeout);
        window.app.timer.wheelTimeout = setTimeout(() => {
            window.app.timer.adjustTimer(e.deltaY > 0 ? -15 : 15);
        }, 50);
    }

    handleGlobalWheel(e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;
        
        if (this.sidebar.contains(e.target) || window.app.todo.todoWindow.contains(e.target)) {
            return;
        }
        
        if (e.target !== this.timerDisplay && !this.timerDisplay.contains(e.target)) {
            e.preventDefault();
            
            clearTimeout(window.app.timer.globalWheelTimeout);
            window.app.timer.globalWheelTimeout = setTimeout(() => {
                window.app.timer.adjustTimer(e.deltaY > 0 ? -15 : 15);
            }, 50);
        }
    }

    handleClick(e) {
        if (window.app.timer.hasDragged) {
            window.app.timer.hasDragged = false;
            return;
        }
        
        if (window.app.timer.totalSeconds === 0) return;
        
        if (window.app.timer.isRunning) {
            window.app.timer.pause();
        } else {
            window.app.timer.start();
        }
    }

    handleKeydown(e) {
        if (document.activeElement === this.taskInput || 
            document.activeElement === window.app.todo.todoInput ||
            document.activeElement.classList.contains('task-edit-input')) {
            return;
        }
        
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                if (window.app.timer.totalSeconds > 0) {
                    window.app.timer.isRunning ? window.app.timer.pause() : window.app.timer.start();
                }
                break;
            case 'KeyR':
                window.app.timer.reset();
                break;
            case 'KeyC':
                if (window.app.timer.isRunning) {
                    window.app.timer.completeTask();
                }
                break;
            case 'ArrowUp':
                window.app.timer.adjustTimer(e.shiftKey ? 60 : 1);
                break;
            case 'ArrowDown':
                window.app.timer.adjustTimer(e.shiftKey ? -60 : -1);
                break;
            case 'AudioVolumeUp':
            case 'VolumeUp':
                if (document.hasFocus()) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.app.timer.adjustTimer(15);
                }
                break;
            case 'AudioVolumeDown':
            case 'VolumeDown':
                if (document.hasFocus()) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.app.timer.adjustTimer(-15);
                }
                break;
        }
    }

    updateDisplay() {
        if (window.app.timer.remainingSeconds >= 0) {
            const minutes = Math.floor(window.app.timer.remainingSeconds / 60);
            const seconds = window.app.timer.remainingSeconds % 60;
            this.timeDigits.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            const overtimeSeconds = Math.abs(window.app.timer.remainingSeconds);
            const minutes = Math.floor(overtimeSeconds / 60);
            const seconds = overtimeSeconds % 60;
            this.timeDigits.textContent = `-${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateStatus() {
        if (window.app.timer.totalSeconds === 0) {
            this.timerStatus.textContent = 'Click and drag to set time';
            this.timerDisplay.classList.remove('running', 'finished', 'completed');
        } else if (window.app.timer.isRunning && window.app.timer.remainingSeconds < 0) {
            this.timerStatus.textContent = 'Overtime - C to complete';
            this.timerDisplay.classList.add('running', 'finished');
            this.timerDisplay.classList.remove('completed');
        } else if (window.app.timer.isRunning) {
            this.timerStatus.textContent = 'Running... Click to pause';
            this.timerDisplay.classList.add('running');
            this.timerDisplay.classList.remove('finished', 'completed');
        } else if (window.app.timer.isPaused) {
            this.timerStatus.textContent = 'Paused - Click to resume';
            this.timerDisplay.classList.remove('running', 'finished', 'completed');
        } else if (window.app.timer.remainingSeconds <= 0 && window.app.timer.totalSeconds > 0) {
            this.timerStatus.textContent = 'Time up! C to complete';
            this.timerDisplay.classList.add('finished');
            this.timerDisplay.classList.remove('running', 'completed');
        } else {
            this.timerStatus.textContent = 'Click to start timer';
            this.timerDisplay.classList.remove('running', 'finished', 'completed');
        }
    }

    showFinished() {
        this.timerDisplay.classList.add('finished');
        this.timerDisplay.classList.remove('running', 'completed');
        this.timerStatus.textContent = 'Time\'s up!';
    }

    showCompleted() {
        this.timerDisplay.classList.add('completed');
        this.timerDisplay.classList.remove('running', 'finished');
        this.timerStatus.textContent = 'Task completed!';
    }

    getCurrentTaskName() {
        return this.taskInput.value.trim() || 'Untitled Task';
    }

    setCurrentTask(taskName) {
        this.taskInput.value = taskName;
        this.currentTaskName = taskName;
    }

    setCurrentTaskWithTypewriter(taskName) {
        // Clear any existing typewriter animation
        if (this.typewriterTimeout) {
            clearTimeout(this.typewriterTimeout);
            this.typewriterTimeout = null;
        }
        
        this.currentTaskName = taskName;
        
        // Clear current input and remove any existing typewriter classes
        this.taskInput.value = '';
        this.taskInput.classList.remove('typewriter-active');
        
        // Blur the input to remove focus and prevent caret
        this.taskInput.blur();
        
        // Add typewriter class for effect (but no cursor)
        this.taskInput.classList.add('typewriter-active');
        
        // Disable the input during animation to prevent interaction
        this.taskInput.disabled = true;
        
        let i = 0;
        const typeChar = () => {
            if (i < taskName.length) {
                this.taskInput.value += taskName.charAt(i);
                i++;
                this.typewriterTimeout = setTimeout(typeChar, 80 + Math.random() * 60);
            } else {
                // After typing completes, just clean up - don't clear input
                this.typewriterTimeout = setTimeout(() => {
                    this.taskInput.classList.remove('typewriter-active');
                    this.taskInput.disabled = false;
                    this.typewriterTimeout = null;
                }, 500);
            }
        };
        
        // Start typing after a longer delay to create gap with notification
        this.typewriterTimeout = setTimeout(typeChar, 1000);
    }

    showTaskAutoStarted(taskName) {
        // Create and show a subtle notification
        const notification = document.createElement('div');
        notification.className = 'task-notification';
        notification.textContent = `Next task: ${taskName}`;
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        this.sidebar.classList.toggle('open');
        this.sidebarToggle.classList.toggle('open');
        this.timerContainer.classList.toggle('sidebar-open');
        this.taskInputContainer.classList.toggle('sidebar-open');
        this.controls.classList.toggle('sidebar-open');
        
        // Show/hide theme button based on sidebar state
        if (window.app.settings) {
            window.app.settings.updateVisibility(this.sidebarOpen);
        }
        
        if (this.sidebarOpen) {
            this.renderTaskHistory();
        }
    }

    closeSidebar() {
        this.sidebarOpen = false;
        this.sidebar.classList.remove('open');
        this.sidebarToggle.classList.remove('open');
        this.timerContainer.classList.remove('sidebar-open');
        this.taskInputContainer.classList.remove('sidebar-open');
        this.controls.classList.remove('sidebar-open');
        
        // Hide theme button when sidebar closes
        if (window.app.settings) {
            window.app.settings.updateVisibility(false);
        }
    }

    handleOutsideClick(e) {
        // Don't handle outside clicks if a modal is open
        if (document.getElementById('confirmModal')) {
            return;
        }
        
        // Check if click is on theme button or theme panel
        const isThemeButtonClick = e.target.closest('#settingsToggle') || e.target.closest('#settingsPanel');
        
        if (this.sidebarOpen && 
            !this.sidebar.contains(e.target) && 
            !this.sidebarToggle.contains(e.target) &&
            !isThemeButtonClick) {
            this.closeSidebar();
        }
        
        window.app.todo.handleOutsideClick(e);
    }

    handleTaskInput() {
        window.app.storage.saveState();
    }

    handleTaskListClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const deleteButton = e.target.closest('.task-delete');
        const taskText = e.target.closest('.task-text');
        
        if (deleteButton) {
            const taskIndex = parseInt(deleteButton.getAttribute('data-task-index'));
            const taskItem = deleteButton.closest('.task-item');
            this.showConfirmModal(
                'Delete Task',
                'Delete this task from history?',
                () => {
                    this.deleteTaskWithAnimation(taskIndex, taskItem);
                }
            );
        } else if (taskText) {
            const taskIndex = parseInt(taskText.getAttribute('data-task-index'));
            this.editTaskName(taskText, taskIndex);
        }
    }

    clearTaskHistory() {
        // Prevent multiple clear operations
        if (this.clearingInProgress) {
            return;
        }
        
        this.showConfirmModal(
            'Clear Task History',
            'Are you sure you want to clear all task history? This action cannot be undone.',
            () => {
                this.clearingInProgress = true;
                this.clearTasksWithAnimation();
                
                // Reset flag after operation completes
                setTimeout(() => {
                    this.clearingInProgress = false;
                }, 5000); // Allow enough time for animations to complete
            }
        );
    }

    clearTasksWithAnimation() {
        const taskItems = this.tasksList.querySelectorAll('.task-item');
        if (taskItems.length === 0) return;

        // Check if any items are already being animated to prevent conflicts
        const hasActiveAnimations = Array.from(taskItems).some(item => 
            item.dataset.deleting === 'true' || 
            item.classList.contains('deleting') || 
            item.classList.contains('clearing')
        );
        
        if (hasActiveAnimations) {
            // If animations are in progress, fall back to immediate clear
            window.app.storage.clearTaskHistory();
            this.renderTaskHistory();
            setTimeout(() => {
                this.closeSidebar();
            }, 500);
            return;
        }

        // Mark all items as being cleared to prevent individual deletions during bulk clear
        taskItems.forEach(item => {
            item.dataset.clearing = 'true';
        });

        // Add clearing animation to all items with staggered delay
        taskItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('clearing');
            }, index * 50);
        });

        // Clear storage and re-render after animations complete
        const animationDuration = taskItems.length * 50 + 400; // Match CSS animation duration
        setTimeout(() => {
            window.app.storage.clearTaskHistory();
            this.renderTaskHistory();
            
            // Close sidebar after animation and a brief pause for user to see result
            setTimeout(() => {
                this.closeSidebar();
            }, 800);
        }, animationDuration);
    }

    showConfirmModal(title, message, onConfirm) {
        // Create modal HTML
        const modalHTML = `
            <div class="modal-overlay" id="confirmModal">
                <div class="modal">
                    <h3 class="modal-title">${title}</h3>
                    <p class="modal-message">${message}</p>
                    <div class="modal-actions">
                        <button class="modal-button" onclick="window.app.ui.hideConfirmModal()">Cancel</button>
                        <button class="modal-button primary" onclick="window.app.ui.confirmModalAction()">Clear</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Store the callback
        this.modalConfirmCallback = onConfirm;
        
        // Show modal with animation
        requestAnimationFrame(() => {
            const modal = document.getElementById('confirmModal');
            modal.classList.add('show');
        });

        // Add keyboard support
        this.modalKeyHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideConfirmModal();
            }
        };
        document.addEventListener('keydown', this.modalKeyHandler);
    }

    hideConfirmModal() {
        const modal = document.getElementById('confirmModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 200);
        }
        this.modalConfirmCallback = null;
        
        // Remove keyboard handler
        if (this.modalKeyHandler) {
            document.removeEventListener('keydown', this.modalKeyHandler);
            this.modalKeyHandler = null;
        }
    }

    confirmModalAction() {
        if (this.modalConfirmCallback) {
            this.modalConfirmCallback();
        }
        this.hideConfirmModal();
    }

    renderTaskHistory() {
        const tasks = window.app.storage.getTaskHistory();
        
        this.tasksList.innerHTML = '';
        
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

    deleteTaskWithAnimation(index, taskItem) {
        // Prevent multiple deletions on the same item or during bulk clear
        if (taskItem.classList.contains('deleting') || 
            taskItem.dataset.deleting === 'true' ||
            taskItem.dataset.clearing === 'true' ||
            taskItem.classList.contains('clearing')) {
            return;
        }
        
        // Mark as being deleted to prevent duplicate calls
        taskItem.dataset.deleting = 'true';
        
        // Add deleting class - CSS handles all the animation
        taskItem.classList.add('deleting');
        
        // Clean up and re-render after animation completes
        setTimeout(() => {
            this.deleteTask(index);
        }, 300); // Match CSS transition duration
    }

    deleteTask(index) {
        let tasks = window.app.storage.getTaskHistory();
        tasks.splice(index, 1);
        localStorage.setItem('taskHistory', JSON.stringify(tasks));
        this.renderTaskHistory();
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
        let tasks = window.app.storage.getTaskHistory();
        if (tasks[taskIndex]) {
            tasks[taskIndex].name = newName;
            localStorage.setItem('taskHistory', JSON.stringify(tasks));
            this.renderTaskHistory();
        }
    }

    clearTaskInputWithAnimation() {
        // Clear any existing animation first
        if (this.typewriterTimeout) {
            clearTimeout(this.typewriterTimeout);
            this.typewriterTimeout = null;
        }
        
        // Make sure input is enabled
        this.taskInput.disabled = false;
        this.taskInput.classList.remove('typewriter-active');
        
        // If input is already empty, just restore placeholder with animation
        if (!this.taskInput.value.trim()) {
            this.animatePlaceholder();
            return;
        }
        
        // Animate clearing the task input
        let currentText = this.taskInput.value;
        let i = currentText.length;
        
        const clearChar = () => {
            if (i > 0) {
                this.taskInput.value = currentText.substring(0, i - 1);
                i--;
                this.typewriterTimeout = setTimeout(clearChar, 30);
            } else {
                // Text cleared - now animate the placeholder
                this.currentTaskName = '';
                this.typewriterTimeout = null;
                
                // Save the cleared state
                window.app.storage.saveState();
                
                // Start placeholder animation after a brief pause
                setTimeout(() => {
                    this.animatePlaceholder();
                }, 300);
            }
        };
        
        // Start clearing immediately
        clearChar();
    }

    animatePlaceholder() {
        const placeholderText = 'What are you working on?';
        
        // Clear placeholder and set up for animation
        this.taskInput.placeholder = '';
        this.taskInput.value = '';
        this.taskInput.disabled = true;
        this.taskInput.classList.add('typewriter-active');
        
        let i = 0;
        const typePlaceholderChar = () => {
            if (i < placeholderText.length) {
                this.taskInput.placeholder += placeholderText.charAt(i);
                i++;
                this.typewriterTimeout = setTimeout(typePlaceholderChar, 60 + Math.random() * 40);
            } else {
                // Animation complete - restore normal state
                this.typewriterTimeout = setTimeout(() => {
                    this.taskInput.classList.remove('typewriter-active');
                    this.taskInput.disabled = false;
                    this.typewriterTimeout = null;
                }, 500);
            }
        };
        
        // Start typing placeholder after a short delay
        this.typewriterTimeout = setTimeout(typePlaceholderChar, 200);
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
}
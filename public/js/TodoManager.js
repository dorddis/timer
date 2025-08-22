class TodoManager {
    constructor() {
        this.todos = [];
        this.todoIdCounter = 1;
        this.todoWindowOpen = false;
        this.currentInstructionText = '';
        this.animationTimeout = null;
        
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.todoToggle = document.getElementById('todoToggle');
        this.todoWindow = document.getElementById('todoWindow');
        this.todoInput = document.getElementById('todoInput');
        this.todoInstruction = document.getElementById('todoInstruction');
        this.todoList = document.getElementById('todoList');
    }

    setupEventListeners() {
        this.todoToggle.addEventListener('click', this.toggleTodoWindow.bind(this));
        this.todoInput.addEventListener('keydown', this.handleTodoInputKeydown.bind(this));
        this.todoList.addEventListener('click', this.handleTodoListClick.bind(this));
    }

    toggleTodoWindow() {
        this.todoWindowOpen = !this.todoWindowOpen;
        this.todoWindow.classList.toggle('open', this.todoWindowOpen);
        this.todoToggle.classList.toggle('open', this.todoWindowOpen);
    }

    closeTodoWindow() {
        this.todoWindowOpen = false;
        this.todoWindow.classList.remove('open');
        this.todoToggle.classList.remove('open');
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
            e.stopPropagation();
            this.deleteTodo(todoId);
        } else {
            e.stopPropagation();
            this.startTodoAsCurrentTask(todoId);
        }
    }

    deleteTodo(id) {
        this.todos = this.todos.filter(todo => todo.id !== id);
        this.renderTodos();
        this.saveTodos();
    }

    deleteTodoSilent(id) {
        this.todos = this.todos.filter(todo => todo.id !== id);
        this.renderTodosWithoutInstructions();
        this.saveTodos();
    }

    startTodoAsCurrentTask(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            const isLastTask = this.todos.length === 1;
            
            window.app.ui.setCurrentTask(todo.text);
            
            if (isLastTask && this.todoWindowOpen) {
                this.deleteTodoSilent(id);
                this.showCelebratory();
                setTimeout(() => {
                    this.closeTodoWindow();
                }, 6000);
            } else {
                this.deleteTodo(id);
                if (this.todoWindowOpen) {
                    this.closeTodoWindow();
                }
            }
        }
    }

    showCelebratory() {
        const instructionSpan = this.todoInstruction.querySelector('span');
        
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
            this.animationTimeout = null;
        }
        
        this.currentInstructionText = 'Woohoo! All planned tasks started!';
        this.animateText(instructionSpan, 'Woohoo! All planned tasks started!', 50);
    }

    renderTodos() {
        this.renderTodosWithoutInstructions();
        this.updateInstructionText();
    }

    renderTodosWithoutInstructions() {
        if (this.todos.length === 0) {
            this.todoList.innerHTML = '<div class="no-todos">No tasks yet</div>';
        } else {
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
    }

    updateInstructionText(forceAnimate = false) {
        const instructionSpan = this.todoInstruction.querySelector('span');
        const newText = this.todos.length === 0 ? 'Press enter to save task' : 'Tap on task to start';
        
        if (this.currentInstructionText !== newText || forceAnimate) {
            this.currentInstructionText = newText;
            
            if (this.animationTimeout) {
                clearTimeout(this.animationTimeout);
                this.animationTimeout = null;
            }
            
            this.animateText(instructionSpan, newText);
        }
    }

    animateText(element, newText, speed = 40) {
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
        }
        
        element.style.opacity = '0.6';
        
        setTimeout(() => {
            element.textContent = '';
            
            let i = 0;
            const typeChar = () => {
                if (i < newText.length) {
                    element.textContent += newText.charAt(i);
                    i++;
                    this.animationTimeout = setTimeout(typeChar, speed);
                } else {
                    element.style.opacity = '1';
                    this.animationTimeout = null;
                }
            };
            
            typeChar();
        }, 200);
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
            }
            this.renderTodos();
            const instructionSpan = this.todoInstruction.querySelector('span');
            this.currentInstructionText = this.todos.length === 0 ? 'Press enter to save task' : 'Tap on task to start';
            instructionSpan.textContent = this.currentInstructionText;
        } catch (error) {
            console.log('Could not load todos from localStorage');
            this.todos = [];
            this.renderTodos();
            const instructionSpan = this.todoInstruction.querySelector('span');
            this.currentInstructionText = 'Press enter to save task';
            instructionSpan.textContent = this.currentInstructionText;
        }
    }

    saveTodos() {
        try {
            localStorage.setItem('timerTodos', JSON.stringify(this.todos));
        } catch (error) {
            console.log('Could not save todos to localStorage');
        }
    }

    handleOutsideClick(e) {
        if (this.todoWindowOpen &&
            !this.todoWindow.contains(e.target) &&
            !this.todoToggle.contains(e.target)) {
            this.closeTodoWindow();
        }
    }
}
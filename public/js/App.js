class App {
    constructor() {
        this.init();
    }

    async init() {
        // Make app globally accessible for module communication first
        window.app = this;
        
        // Initialize all managers
        this.theme = new ThemeManager();
        this.storage = new StorageManager();
        this.timer = new TimerCore();
        this.ui = new UIManager();
        this.todo = new TodoManager();
        this.settings = new SettingsPanel();

        // Load saved data
        this.storage.loadState();
        this.storage.loadTaskHistory();
        this.todo.loadTodos();

        // Load version info
        await this.loadVersion();

        // Setup cleanup
        window.addEventListener('beforeunload', this.cleanup.bind(this));

        // Initial UI update
        this.ui.updateDisplay();
        this.ui.updateStatus();
    }

    async loadVersion() {
        try {
            const response = await fetch(`/api/version?t=${Date.now()}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            const versionData = await response.json();
            const versionDisplay = document.getElementById('versionDisplay');
            if (versionDisplay && versionData.version) {
                versionDisplay.textContent = `v${versionData.version}`;
            }
        } catch (error) {
            console.log('Could not load version data');
        }
    }

    cleanup() {
        this.timer.cleanup();
        this.ui.clearActiveConfetti();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
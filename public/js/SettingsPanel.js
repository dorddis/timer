class SettingsPanel {
    constructor() {
        this.isOpen = false;
        this.createSettingsPanel();
        this.setupEventListeners();
    }

    createSettingsPanel() {
        // Create settings toggle button
        const settingsToggle = document.createElement('div');
        settingsToggle.className = 'settings-toggle';
        settingsToggle.id = 'settingsToggle';
        settingsToggle.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12z"/>
                <path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m8.49 8.49l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m8.49-8.49l2.83-2.83"/>
            </svg>
        `;
        
        // Create settings panel
        const settingsPanel = document.createElement('div');
        settingsPanel.className = 'settings-panel';
        settingsPanel.id = 'settingsPanel';
        settingsPanel.innerHTML = `
            <div class="settings-header">
                <span class="settings-title">Settings</span>
                <button class="settings-close" id="settingsClose">×</button>
            </div>
            <div class="settings-content">
                <div class="setting-group">
                    <label class="setting-label">Theme</label>
                    <div class="theme-options" id="themeOptions">
                        <!-- Theme options will be populated by JavaScript -->
                    </div>
                </div>
            </div>
        `;

        // Insert into DOM
        document.body.appendChild(settingsToggle);
        document.body.appendChild(settingsPanel);

        this.settingsToggle = settingsToggle;
        this.settingsPanel = settingsPanel;
        this.settingsClose = document.getElementById('settingsClose');

        this.populateThemeOptions();
    }

    setupEventListeners() {
        this.settingsToggle.addEventListener('click', this.toggleSettings.bind(this));
        this.settingsClose.addEventListener('click', this.closeSettings.bind(this));
        
        // Close settings when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && 
                !this.settingsPanel.contains(e.target) && 
                !this.settingsToggle.contains(e.target)) {
                this.closeSettings();
            }
        });
    }

    populateThemeOptions() {
        const themeOptions = document.getElementById('themeOptions');
        const themes = window.app.theme.getThemes();
        const currentTheme = window.app.theme.getCurrentTheme();

        themeOptions.innerHTML = Object.entries(themes).map(([key, theme]) => `
            <div class="theme-option ${key === currentTheme ? 'active' : ''}" data-theme="${key}">
                <div class="theme-preview theme-preview-${key}"></div>
                <span class="theme-name">${theme.name}</span>
            </div>
        `).join('');

        // Add event listeners to theme options
        themeOptions.addEventListener('click', (e) => {
            const themeOption = e.target.closest('.theme-option');
            if (themeOption) {
                const themeName = themeOption.dataset.theme;
                this.selectTheme(themeName);
            }
        });
    }

    selectTheme(themeName) {
        window.app.theme.setTheme(themeName);
        
        // Update active state in UI
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`[data-theme="${themeName}"]`).classList.add('active');
    }

    toggleSettings() {
        if (this.isOpen) {
            this.closeSettings();
        } else {
            this.openSettings();
        }
    }

    openSettings() {
        this.isOpen = true;
        this.settingsPanel.classList.add('open');
        this.settingsToggle.classList.add('open');
    }

    closeSettings() {
        this.isOpen = false;
        this.settingsPanel.classList.remove('open');
        this.settingsToggle.classList.remove('open');
    }
}
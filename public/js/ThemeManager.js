class ThemeManager {
    constructor() {
        this.themes = {
            dark: {
                name: 'Dark (Default)',
                variables: {
                    '--bg-primary': '#0a0a0a',
                    '--text-primary': '#e8e8e8',
                    '--text-secondary': 'rgba(232, 232, 232, 0.7)',
                    '--text-muted': 'rgba(232, 232, 232, 0.5)',
                    '--border-color': 'rgba(232, 232, 232, 0.1)',
                    '--bg-secondary': 'rgba(25, 25, 25, 0.8)',
                    '--bg-tertiary': 'rgba(15, 15, 15, 0.95)',
                    '--accent-color': 'rgba(232, 232, 232, 0.2)',
                    '--timer-bg': 'rgba(25, 25, 25, 0.8)',
                    '--timer-bg-hover': 'rgba(35, 35, 35, 0.8)',
                    '--timer-bg-dragging': 'rgba(45, 45, 45, 0.8)',
                    '--shadow-color': 'rgba(0, 0, 0, 0.3)'
                }
            },
            brown: {
                name: 'Warm Brown',
                variables: {
                    '--bg-primary': '#2d1b12',
                    '--text-primary': '#f4e5d3',
                    '--text-secondary': 'rgba(244, 229, 211, 0.8)',
                    '--text-muted': 'rgba(244, 229, 211, 0.6)',
                    '--border-color': 'rgba(180, 142, 102, 0.2)',
                    '--bg-secondary': 'rgba(61, 39, 26, 0.8)',
                    '--bg-tertiary': 'rgba(41, 26, 17, 0.95)',
                    '--accent-color': 'rgba(180, 142, 102, 0.3)',
                    '--timer-bg': 'rgba(61, 39, 26, 0.8)',
                    '--timer-bg-hover': 'rgba(71, 49, 36, 0.8)',
                    '--timer-bg-dragging': 'rgba(81, 59, 46, 0.8)',
                    '--shadow-color': 'rgba(29, 18, 12, 0.4)'
                }
            },
            light: {
                name: 'Brown on White',
                variables: {
                    '--bg-primary': '#faf7f2',
                    '--text-primary': '#3d291a',
                    '--text-secondary': 'rgba(61, 41, 26, 0.8)',
                    '--text-muted': 'rgba(61, 41, 26, 0.6)',
                    '--border-color': 'rgba(61, 41, 26, 0.15)',
                    '--bg-secondary': 'rgba(245, 240, 235, 0.9)',
                    '--bg-tertiary': 'rgba(250, 247, 242, 0.95)',
                    '--accent-color': 'rgba(139, 102, 66, 0.2)',
                    '--timer-bg': 'rgba(245, 240, 235, 0.8)',
                    '--timer-bg-hover': 'rgba(240, 235, 230, 0.8)',
                    '--timer-bg-dragging': 'rgba(235, 230, 225, 0.8)',
                    '--shadow-color': 'rgba(61, 41, 26, 0.1)'
                }
            }
        };
        
        this.currentTheme = 'dark';
        this.loadTheme();
    }

    setTheme(themeName) {
        if (!this.themes[themeName]) return;
        
        this.currentTheme = themeName;
        const theme = this.themes[themeName];
        
        // Apply CSS variables to document root
        const root = document.documentElement;
        Object.entries(theme.variables).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
        
        // Save theme preference
        localStorage.setItem('selectedTheme', themeName);
        
        // Update body class for theme-specific styles
        document.body.className = document.body.className
            .replace(/theme-\w+/g, '')
            .trim();
        document.body.classList.add(`theme-${themeName}`);
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    getThemes() {
        return this.themes;
    }

    loadTheme() {
        try {
            const saved = localStorage.getItem('selectedTheme');
            const themeToLoad = saved && this.themes[saved] ? saved : 'dark';
            this.setTheme(themeToLoad);
        } catch (error) {
            console.log('Failed to load theme preference');
            this.setTheme('dark');
        }
    }
}
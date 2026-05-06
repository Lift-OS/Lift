// modules/theme.js - Sistema de Temas
window.ThemeManager = {
  currentTheme: 'dark',
  themes: {
    dark: { name: 'Escuro', icon: 'fa-moon' },
    light: { name: 'Claro', icon: 'fa-sun' },
    blue: { name: 'Azul', icon: 'fa-water' },
    green: { name: 'Verde', icon: 'fa-leaf' }
  },

  init() {
    this.loadTheme();
    this.setupEvents();
  },

  loadTheme() {
    const saved = localStorage.getItem('LiftOS_theme');
    if (saved && this.themes[saved]) {
      this.currentTheme = saved;
    }
    this.applyTheme(this.currentTheme);
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    localStorage.setItem('LiftOS_theme', theme);
    this.updateButtonUI();
  },

  updateButtonUI() {
    const themeNameSpan = document.getElementById('themeName');
    if (themeNameSpan) {
      const themeInfo = this.themes[this.currentTheme];
      themeNameSpan.innerHTML = `<i class="fas ${themeInfo.icon}"></i> ${themeInfo.name}`;
    }
  },

  setupEvents() {
    const toggleBtn = document.getElementById('themeToggle');
    const dropdown = document.getElementById('themeDropdown');

    if (toggleBtn) {
      toggleBtn.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
      };
    }

    const options = document.querySelectorAll('.theme-option');
    options.forEach(opt => {
      opt.onclick = (e) => {
        const theme = opt.getAttribute('data-theme');
        if (theme) {
          this.applyTheme(theme);
          dropdown.classList.remove('open');
          
          // Marca a opção ativa
          options.forEach(o => o.classList.remove('active'));
          opt.classList.add('active');
        }
      };
    });

    // Fecha dropdown ao clicar fora
    document.addEventListener('click', (e) => {
      if (toggleBtn && !toggleBtn.contains(e.target)) {
        if (dropdown) dropdown.classList.remove('open');
      }
    });
  }
};

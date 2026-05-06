// auth.js - Sistema de autenticação (ADMIN vê todas as abas)
window.Auth = {
  currentUser: null,
  inactivityTimer: null,

  can: function(permission) {
    if (!this.currentUser) return false;
    // ADMIN tem todas as permissões
    if (this.currentUser.nivel === 'admin') return true;
    // Técnico tem permissões limitadas
    if (this.currentUser.nivel === 'tecnico') {
      var tecnicas = ['ver_jornada', 'ver_agendamentos', 'jornada_registrar', 'heartbeat'];
      return tecnicas.includes(permission);
    }
    return false;
  },

  isAdmin: function() { return this.currentUser?.nivel === 'admin'; },
  isTecnico: function() { return this.currentUser?.nivel === 'tecnico'; },

  getUsers: function() {
    var users = localStorage.getItem('LiftOS_users');
    if (users) {
      try { return JSON.parse(users); } catch(e) {}
    }
    var defaultUsers = [
      { id: 1, nome: 'Administrador', login: 'admin', senha: 'admin123', nivel: 'admin' },
      { id: 2, nome: 'Técnico Principal', login: 'tecnico', senha: '123456', nivel: 'tecnico' }
    ];
    localStorage.setItem('LiftOS_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  },

  saveUsers: function(users) { localStorage.setItem('LiftOS_users', JSON.stringify(users)); },

  login: function() {
    var login = document.getElementById('loginUsername').value.trim();
    var senha = document.getElementById('loginPassword').value;
    var errDiv = document.getElementById('loginErrorMessage');
    if (errDiv) { errDiv.classList.add('hidden'); errDiv.innerHTML = ''; }
    
    if (!login || !senha) {
      if (errDiv) { errDiv.innerHTML = 'Preencha usuário e senha'; errDiv.classList.remove('hidden'); }
      return;
    }
    
    var users = this.getUsers();
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].login === login && users[i].senha === senha) {
        user = users[i];
        break;
      }
    }
    
    if (!user) {
      if (errDiv) { errDiv.innerHTML = 'Credenciais inválidas!'; errDiv.classList.remove('hidden'); }
      document.getElementById('loginPassword').value = '';
      return;
    }
    
    this.currentUser = user;
    localStorage.setItem('LiftOS_current_user', JSON.stringify(user));
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('currentUserName').innerHTML = window.esc(user.nome);
    this.updateUI();
    this.startInactivityTimer();
    if (window.App) window.App.init();
    showToast('Bem-vindo, ' + user.nome + '!');
  },

  logout: function() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (window.Heartbeat) window.Heartbeat.stop();
    this.currentUser = null;
    localStorage.removeItem('LiftOS_current_user');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
  },

  checkSession: function() {
    var session = localStorage.getItem('LiftOS_current_user');
    if (session) {
      try {
        this.currentUser = JSON.parse(session);
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        document.getElementById('currentUserName').innerHTML = window.esc(this.currentUser.nome);
        this.updateUI();
        this.startInactivityTimer();
        return true;
      } catch(e) { localStorage.removeItem('LiftOS_current_user'); }
    }
    return false;
  },

  startInactivityTimer: function() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.currentUser) {
      this.inactivityTimer = setTimeout(function() { Auth.logout(); }, 15 * 60 * 1000);
    }
    var resetTimer = function() {
      if (Auth.inactivityTimer) clearTimeout(Auth.inactivityTimer);
      if (Auth.currentUser) {
        Auth.inactivityTimer = setTimeout(function() { Auth.logout(); }, 15 * 60 * 1000);
      }
    };
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(function(event) {
      document.removeEventListener(event, resetTimer);
      document.addEventListener(event, resetTimer);
    });
  },

  recoverPassword: function() {
    var login = document.getElementById('loginUsername').value.trim();
    if (!login) login = prompt('Digite seu usuário:');
    if (!login) return;
    var user = this.getUsers().find(function(u) { return u.login === login; });
    if (!user) { alert('Usuário não encontrado'); return; }
    window.open('https://wa.me/5598988248877?text=' + encodeURIComponent('Esqueci minha senha - Usuário: ' + login), '_blank');
  },

  updateUI: function() {
    if (!this.currentUser) return;
    var nivel = this.currentUser.nivel;
    var isAdmin = nivel === 'admin';
    var isTecnico = nivel === 'tecnico';
    
    // Badge do usuário
    var badge = document.getElementById('currentUserNivel');
    if (badge) {
      badge.textContent = isAdmin ? 'ADMIN' : (isTecnico ? 'TÉCNICO' : 'VISUALIZADOR');
    }
    
    // ========== ADMIN: MOSTRA TODAS AS ABAS ==========
    var navAgendamentos = document.getElementById('navAgendamentos');
    var navJornada = document.getElementById('navJornada');
    var navPermissoes = document.getElementById('navPermissoes');
    var navUsuarios = document.getElementById('navUsuarios');
    var navEstoque = document.getElementById('tabEstoqueBtn');
    var navOrcamento = document.getElementById('tabOrcamentoBtn');
    
    if (isAdmin) {
      // ADMIN: todas as abas visíveis
      if (navAgendamentos) navAgendamentos.style.display = 'inline-flex';
      if (navJornada) navJornada.style.display = 'inline-flex';
      if (navPermissoes) navPermissoes.style.display = 'inline-flex';
      if (navUsuarios) navUsuarios.style.display = 'inline-flex';
      if (navEstoque) navEstoque.style.display = 'inline-flex';
      if (navOrcamento) navOrcamento.style.display = 'inline-flex';
    } else if (isTecnico) {
      // TÉCNICO: vê Agendamentos e Jornada
      if (navAgendamentos) navAgendamentos.style.display = 'inline-flex';
      if (navJornada) navJornada.style.display = 'inline-flex';
      if (navPermissoes) navPermissoes.style.display = 'none';
      if (navUsuarios) navUsuarios.style.display = 'none';
    } else {
      // VISUALIZADOR: só vê o básico
      if (navAgendamentos) navAgendamentos.style.display = 'none';
      if (navJornada) navJornada.style.display = 'none';
      if (navPermissoes) navPermissoes.style.display = 'none';
      if (navUsuarios) navUsuarios.style.display = 'none';
    }
    
    // Botões da toolbar (Nova OS, Sincronizar, Baixar)
    var btnNovaOS = document.getElementById('btnNovaOS');
    var btnSync = document.getElementById('btnSync');
    var btnDownload = document.getElementById('btnDownload');
    
    if (isAdmin) {
      if (btnNovaOS) btnNovaOS.style.display = 'inline-flex';
      if (btnSync) btnSync.style.display = 'inline-flex';
      if (btnDownload) btnDownload.style.display = 'inline-flex';
    } else {
      if (btnNovaOS) btnNovaOS.style.display = 'none';
      if (btnSync) btnSync.style.display = 'none';
      if (btnDownload) btnDownload.style.display = 'none';
    }
  }
};

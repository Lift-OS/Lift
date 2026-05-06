// auth.js - Sistema de autenticação completo com permissões
window.Auth = {
  currentUser: null,
  inactivityTimer: null,

  permissoes: {
    admin: {
      // Navegação
      ver_usuarios: true,
      ver_agendamentos: true,
      ver_permissoes: true,
      ver_jornada: true,
      ver_estoque: true,
      ver_orcamento: true,
      ver_historico: true,
      ver_checklist: true,
      ver_clientes: true,
      // Ações
      criar_os: true,
      sincronizar: true,
      baixar_dados: true,
      heartbeat: true,
      clientes_cadastrar: true,
      clientes_editar: true,
      clientes_excluir: true,
      agendamentos_criar: true,
      agendamentos_editar: true,
      agendamentos_excluir: true,
      jornada_registrar: true,
      usuarios_criar: true,
      usuarios_editar: true,
      usuarios_excluir: true,
      permissoes_editar: true
    },
    tecnico: {
      ver_usuarios: false,
      ver_agendamentos: true,
      ver_permissoes: false,
      ver_jornada: true,
      ver_estoque: false,
      ver_orcamento: true,
      ver_historico: true,
      ver_checklist: true,
      ver_clientes: true,
      criar_os: false,
      sincronizar: false,
      baixar_dados: false,
      heartbeat: true,
      clientes_cadastrar: false,
      clientes_editar: false,
      clientes_excluir: false,
      agendamentos_criar: false,
      agendamentos_editar: false,
      agendamentos_excluir: false,
      jornada_registrar: true,
      usuarios_criar: false,
      usuarios_editar: false,
      usuarios_excluir: false,
      permissoes_editar: false
    },
    visualizador: {
      ver_usuarios: false,
      ver_agendamentos: true,
      ver_permissoes: false,
      ver_jornada: false,
      ver_estoque: false,
      ver_orcamento: true,
      ver_historico: true,
      ver_checklist: true,
      ver_clientes: true,
      criar_os: false,
      sincronizar: false,
      baixar_dados: false,
      heartbeat: false,
      clientes_cadastrar: false,
      clientes_editar: false,
      clientes_excluir: false,
      agendamentos_criar: false,
      agendamentos_editar: false,
      agendamentos_excluir: false,
      jornada_registrar: false,
      usuarios_criar: false,
      usuarios_editar: false,
      usuarios_excluir: false,
      permissoes_editar: false
    }
  },

  can: function(permission) {
    if (!this.currentUser) return false;
    return this.permissoes[this.currentUser.nivel]?.[permission] === true;
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
    
    // ========== MENU DE NAVEGAÇÃO ==========
    var navAgendamentos = document.getElementById('navAgendamentos');
    if (navAgendamentos) navAgendamentos.style.display = this.can('ver_agendamentos') ? 'inline-flex' : 'none';
    
    var navJornada = document.getElementById('navJornada');
    if (navJornada) navJornada.style.display = this.can('ver_jornada') ? 'inline-flex' : 'none';
    
    var navPermissoes = document.getElementById('navPermissoes');
    if (navPermissoes) navPermissoes.style.display = this.can('ver_permissoes') ? 'inline-flex' : 'none';
    
    var navUsuarios = document.getElementById('navUsuarios');
    if (navUsuarios) navUsuarios.style.display = this.can('ver_usuarios') ? 'inline-flex' : 'none';
    
    var navEstoque = document.getElementById('tabEstoqueBtn');
    if (navEstoque) navEstoque.style.display = this.can('ver_estoque') ? 'inline-flex' : 'none';
    
    var navOrcamento = document.getElementById('tabOrcamentoBtn');
    if (navOrcamento) navOrcamento.style.display = this.can('ver_orcamento') ? 'inline-flex' : 'none';
    
    // ========== BOTÕES DA TOOLBAR ==========
    var btnNovaOS = document.getElementById('btnNovaOS');
    if (btnNovaOS) btnNovaOS.style.display = this.can('criar_os') ? 'inline-flex' : 'none';
    
    var btnSync = document.getElementById('btnSync');
    if (btnSync) btnSync.style.display = this.can('sincronizar') ? 'inline-flex' : 'none';
    
    var btnDownload = document.getElementById('btnDownload');
    if (btnDownload) btnDownload.style.display = this.can('baixar_dados') ? 'inline-flex' : 'none';
  }
};

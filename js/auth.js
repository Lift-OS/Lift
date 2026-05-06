// auth.js - Controle de permissões e visibilidade
window.Auth = {
  currentUser: null,

  permissoes: {
    admin: {
      // Abas visíveis
      ver_os: true,
      ver_orcamento: true,
      ver_estoque: true,
      ver_clientes: true,
      ver_historico: true,
      ver_checklist: true,
      ver_agendamentos: true,
      ver_jornada: false,     // ADMIN NÃO vê Jornada
      ver_permissoes: true,
      ver_usuarios: true,
      // Botões
      criar_os: true,
      criar_orcamento: true,
      sincronizar: true,
      baixar_dados: true
    },
    tecnico: {
      ver_os: true,
      ver_orcamento: true,
      ver_estoque: false,
      ver_clientes: true,
      ver_historico: true,
      ver_checklist: true,
      ver_agendamentos: true,
      ver_jornada: true,      // TÉCNICO vê Jornada
      ver_permissoes: false,
      ver_usuarios: false,
      criar_os: false,
      criar_orcamento: true,
      sincronizar: false,
      baixar_dados: false
    },
    visualizador: {
      ver_os: true,
      ver_orcamento: true,
      ver_estoque: false,
      ver_clientes: true,
      ver_historico: true,
      ver_checklist: true,
      ver_agendamentos: false,
      ver_jornada: false,
      ver_permissoes: false,
      ver_usuarios: false,
      criar_os: false,
      criar_orcamento: false,
      sincronizar: false,
      baixar_dados: false
    }
  },

  can(permission) {
    if (!this.currentUser) return false;
    return this.permissoes[this.currentUser.nivel]?.[permission] === true;
  },

  isAdmin() { return this.currentUser?.nivel === 'admin'; },
  isTecnico() { return this.currentUser?.nivel === 'tecnico'; },

  getUsers() {
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

  login() {
    var login = document.getElementById('loginUsername').value.trim();
    var senha = document.getElementById('loginPassword').value;
    var errDiv = document.getElementById('loginErrorMessage');
    if (errDiv) { errDiv.classList.add('hidden'); errDiv.innerHTML = ''; }
    if (!login || !senha) {
      if (errDiv) { errDiv.innerHTML = 'Preencha usuário e senha'; errDiv.classList.remove('hidden'); }
      return;
    }
    var users = this.getUsers();
    var user = users.find(u => u.login === login && u.senha === senha);
    if (!user) {
      if (errDiv) { errDiv.innerHTML = 'Credenciais inválidas!'; errDiv.classList.remove('hidden'); }
      return;
    }
    this.currentUser = user;
    localStorage.setItem('LiftOS_current_user', JSON.stringify(user));
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('currentUserName').innerHTML = user.nome;
    this.atualizarMenu();
    if (window.App) window.App.init();
    showToast('Bem-vindo, ' + user.nome + '!');
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('LiftOS_current_user');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
  },

  checkSession() {
    var session = localStorage.getItem('LiftOS_current_user');
    if (session) {
      try {
        this.currentUser = JSON.parse(session);
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        document.getElementById('currentUserName').innerHTML = this.currentUser.nome;
        this.atualizarMenu();
        return true;
      } catch(e) {}
    }
    return false;
  },

  atualizarMenu() {
    if (!this.currentUser) return;
    var nivel = this.currentUser.nivel;
    
    // Controle de abas
    var abas = {
      navAgendamentos: 'ver_agendamentos',
      navJornada: 'ver_jornada',
      navPermissoes: 'ver_permissoes',
      navUsuarios: 'ver_usuarios'
    };
    
    for (var id in abas) {
      var el = document.getElementById(id);
      if (el) el.style.display = this.can(abas[id]) ? 'inline-flex' : 'none';
    }
    
    // Botões da toolbar
    var btnNovaOS = document.getElementById('btnNovaOS');
    if (btnNovaOS) btnNovaOS.style.display = this.can('criar_os') ? 'inline-flex' : 'none';
    
    var btnNovoOrc = document.getElementById('btnNovoOrcamento');
    if (btnNovoOrc) btnNovoOrc.style.display = this.can('criar_orcamento') ? 'inline-flex' : 'none';
    
    var btnSync = document.getElementById('btnSync');
    if (btnSync) btnSync.style.display = this.can('sincronizar') ? 'inline-flex' : 'none';
    
    var btnDownload = document.getElementById('btnDownload');
    if (btnDownload) btnDownload.style.display = this.can('baixar_dados') ? 'inline-flex' : 'none';
  }
};

// auth.js - Versão estável
window.Auth = {
  currentUser: null,

  permissoes: {
    admin: {
      clientes_visualizar: true, clientes_cadastrar: true, clientes_editar: true, clientes_excluir: true,
      clientes_exportar_csv: true, clientes_importar_csv: true,
      heartbeat: true, sincronizar: true
    },
    tecnico: {
      clientes_visualizar: true, clientes_cadastrar: false, clientes_editar: false, clientes_excluir: false,
      clientes_exportar_csv: false, clientes_importar_csv: false,
      heartbeat: true, sincronizar: true
    },
    visualizador: {
      clientes_visualizar: true, clientes_cadastrar: false, clientes_editar: false, clientes_excluir: false,
      clientes_exportar_csv: false, clientes_importar_csv: false,
      heartbeat: false, sincronizar: false
    }
  },

  can(permission) {
    if (!this.currentUser) return false;
    return this.permissoes[this.currentUser.nivel]?.[permission] === true;
  },

  getUsers() {
    let users = localStorage.getItem('LiftOS_users');
    if (users) {
      try { return JSON.parse(users); } catch(e) {}
    }
    const defaultUsers = [
      { id: 1, nome: 'Administrador', login: 'admin', senha: 'admin123', nivel: 'admin' },
      { id: 2, nome: 'Técnico Principal', login: 'tecnico', senha: '123456', nivel: 'tecnico' }
    ];
    localStorage.setItem('LiftOS_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  },

  login() {
    const login = document.getElementById('loginUsername').value.trim();
    const senha = document.getElementById('loginPassword').value;
    const errDiv = document.getElementById('loginErrorMessage');
    
    const user = this.getUsers().find(u => u.login === login && u.senha === senha);
    if (!user) {
      if (errDiv) { errDiv.innerHTML = 'Credenciais inválidas!'; errDiv.style.display = 'block'; }
      return;
    }
    
    this.currentUser = user;
    localStorage.setItem('LiftOS_current_user', JSON.stringify(user));
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('currentUserName').innerHTML = window.esc(user.nome);
    this.updateUI();
    
    if (window.App) window.App.init();
    showToast(`Bem-vindo, ${user.nome}!`);
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('LiftOS_current_user');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
  },

  checkSession() {
    const session = localStorage.getItem('LiftOS_current_user');
    if (session) {
      try {
        this.currentUser = JSON.parse(session);
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        document.getElementById('currentUserName').innerHTML = window.esc(this.currentUser.nome);
        this.updateUI();
        return true;
      } catch(e) {}
    }
    return false;
  },

  updateUI() {
    const nivel = this.currentUser?.nivel || 'visualizador';
    const badge = document.getElementById('currentUserNivel');
    if (badge) {
      if (nivel === 'admin') badge.textContent = 'ADMIN';
      else if (nivel === 'tecnico') badge.textContent = 'TÉCNICO';
      else badge.textContent = 'VISUALIZADOR';
    }
  }
};s

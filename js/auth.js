// auth.js - Sistema de autenticação
window.Auth = {
  currentUser: null,

  can: function(permission) {
    if (!this.currentUser) return false;
    if (this.currentUser.nivel === 'admin') return true;
    return false;
  },

  isAdmin: function() {
    return this.currentUser && this.currentUser.nivel === 'admin';
  },

  isTecnico: function() {
    return this.currentUser && this.currentUser.nivel === 'tecnico';
  },

  getUsers: function() {
    var users = localStorage.getItem('LiftOS_users');
    if (users) {
      try { 
        var parsed = JSON.parse(users);
        if (parsed && parsed.length) return parsed;
      } catch(e) {}
    }
    var defaultUsers = [
      { id: 1, nome: 'Administrador', login: 'admin', senha: 'admin123', nivel: 'admin' },
      { id: 2, nome: 'Técnico Principal', login: 'tecnico', senha: '123456', nivel: 'tecnico' }
    ];
    localStorage.setItem('LiftOS_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  },

  saveUsers: function(users) {
    localStorage.setItem('LiftOS_users', JSON.stringify(users));
  },

  login: function() {
    var login = document.getElementById('loginUsername').value.trim();
    var senha = document.getElementById('loginPassword').value;
    var errDiv = document.getElementById('loginErrorMessage');
    
    if (errDiv) {
      errDiv.classList.add('hidden');
      errDiv.innerHTML = '';
    }
    
    if (!login || !senha) {
      if (errDiv) {
        errDiv.innerHTML = 'Preencha usuário e senha';
        errDiv.classList.remove('hidden');
      }
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
      if (errDiv) {
        errDiv.innerHTML = 'Credenciais inválidas!';
        errDiv.classList.remove('hidden');
      }
      document.getElementById('loginPassword').value = '';
      return;
    }
    
    this.currentUser = user;
    localStorage.setItem('LiftOS_current_user', JSON.stringify(user));
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('currentUserName').innerHTML = window.esc(user.nome);
    this.updateUI();
    if (window.App) window.App.init();
    showToast('Bem-vindo, ' + user.nome + '!');
  },

  logout: function() {
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
        return true;
      } catch(e) {
        localStorage.removeItem('LiftOS_current_user');
      }
    }
    return false;
  },

  updateUI: function() {
    if (!this.currentUser) return;
    var nivel = this.currentUser.nivel;
    var badge = document.getElementById('currentUserNivel');
    if (badge) {
      badge.textContent = nivel === 'admin' ? 'ADMIN' : (nivel === 'tecnico' ? 'TÉCNICO' : 'VISUALIZADOR');
    }
    
    // Botões da toolbar
    var btnNovaOS = document.getElementById('btnNovaOS');
    if (btnNavaOS) btnNovaOS.style.display = this.can('criar_os') ? 'inline-flex' : 'none';
    
    var btnSync = document.getElementById('btnSync');
    if (btnSync) btnSync.style.display = this.can('sincronizar') ? 'inline-flex' : 'none';
    
    var btnDownload = document.getElementById('btnDownload');
    if (btnDownload) btnDownload.style.display = this.can('baixar_dados') ? 'inline-flex' : 'none';
  }
};

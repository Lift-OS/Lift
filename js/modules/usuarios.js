// modules/usuarios.js - Gerenciamento de Usuários
window.UserManager = {
  editingId: null,

  init: function() {
    this.render();
    this.loadEventListeners();
  },

  loadEventListeners: function() {
    var btnAdicionar = document.getElementById('btnAdicionarUsuario');
    if (btnAdicionar) btnAdicionar.onclick = function() { UserManager.addUser(); };
    
    var btnCancelar = document.getElementById('userCancelBtn');
    if (btnCancelar) btnCancelar.onclick = function() { UserManager.cancelEdit(); };
  },

  render: function() {
    var users = window.Auth.getUsers();
    var tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!users.length) {
      tbody.innerHTML = '</table><td colspan="4" class="text-center p-4 text-[var(--muted)]">Nenhum usuário cadastrado</td></tr>';
      return;
    }
    
    var podeEditar = window.Auth.can('usuarios_editar');
    var podeExcluir = window.Auth.can('usuarios_excluir');
    var currentUser = window.Auth.currentUser;
    
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      var nivelLabel = u.nivel === 'admin' ? 'Admin' : (u.nivel === 'tecnico' ? 'Técnico' : 'Visualizador');
      var acoes = '';
      
      if (podeEditar && u.id !== currentUser?.id) {
        acoes += '<i class="fas fa-edit text-blue-400 cursor-pointer mr-2" onclick="UserManager.edit(' + u.id + ')"></i>';
      }
      if (podeExcluir && u.id !== currentUser?.id) {
        acoes += '<i class="fas fa-trash text-red-400 cursor-pointer" onclick="UserManager.delete(' + u.id + ')"></i>';
      }
      if (u.id === currentUser?.id) {
        acoes += '<span class="text-xs text-[var(--muted)]">(você)</span>';
      }
      
      var row = tbody.insertRow();
      row.innerHTML = `
        <td class="p-2">${window.esc(u.nome)}</td>
        <td class="p-2">${window.esc(u.login)}</td>
        <td class="p-2">${window.esc(nivelLabel)}</td>
        <td class="p-2">${acoes}</td>
      `;
    }
  },

  addUser: function() {
    if (!window.Auth.can('usuarios_criar')) {
      showToast('Apenas administrador pode criar usuários', true);
      return;
    }
    
    var nome = document.getElementById('userNome')?.value.trim();
    var login = document.getElementById('userLogin')?.value.trim();
    var senha = document.getElementById('userSenha')?.value;
    var nivel = document.getElementById('userNivel')?.value;
    
    if (!nome || !login || !senha) {
      showToast('Preencha todos os campos', true);
      return;
    }
    
    var users = window.Auth.getUsers();
    var exists = false;
    for (var i = 0; i < users.length; i++) {
      if (users[i].login === login) {
        exists = true;
        break;
      }
    }
    
    if (exists) {
      showToast('Login já existe', true);
      return;
    }
    
    var newUser = {
      id: Date.now(),
      nome: nome,
      login: login,
      senha: senha,
      nivel: nivel
    };
    
    users.push(newUser);
    window.Auth.saveUsers(users);
    this.clearForm();
    this.render();
    showToast('Usuário adicionado!');
    
    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      window.GoogleSheets.syncUsuarios(users);
    }
  },

  edit: function(id) {
    if (!window.Auth.can('usuarios_editar')) {
      showToast('Apenas administrador pode editar usuários', true);
      return;
    }
    
    var users = window.Auth.getUsers();
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === id) {
        user = users[i];
        break;
      }
    }
    
    if (!user) return;
    
    this.editingId = id;
    document.getElementById('userNome').value = user.nome;
    document.getElementById('userLogin').value = user.login;
    document.getElementById('userSenha').value = '';
    document.getElementById('userNivel').value = user.nivel;
    document.getElementById('userCancelBtn').style.display = 'inline-flex';
    document.getElementById('btnAdicionarUsuario').style.display = 'none';
  },

  delete: function(id) {
    if (!window.Auth.can('usuarios_excluir')) {
      showToast('Apenas administrador pode excluir usuários', true);
      return;
    }
    
    if (window.Auth.currentUser?.id === id) {
      showToast('Você não pode excluir seu próprio usuário', true);
      return;
    }
    
    if (!confirm('Excluir este usuário permanentemente?')) return;
    
    var users = window.Auth.getUsers();
    var newUsers = [];
    for (var i = 0; i < users.length; i++) {
      if (users[i].id !== id) newUsers.push(users[i]);
    }
    
    window.Auth.saveUsers(newUsers);
    this.render();
    showToast('Usuário excluído');
    
    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      window.GoogleSheets.syncUsuarios(newUsers);
    }
  },

  cancelEdit: function() {
    this.editingId = null;
    this.clearForm();
    document.getElementById('userCancelBtn').style.display = 'none';
    document.getElementById('btnAdicionarUsuario').style.display = 'inline-flex';
  },

  clearForm: function() {
    document.getElementById('userNome').value = '';
    document.getElementById('userLogin').value = '';
    document.getElementById('userSenha').value = '';
    document.getElementById('userNivel').value = 'tecnico';
  },

  loadFromSync: function(users) {
    if (Array.isArray(users) && users.length) {
      window.Auth.saveUsers(users);
      this.render();
    }
  }
};

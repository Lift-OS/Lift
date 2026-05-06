// modules/usuarios.js - Módulo de Usuários (Admin)
window.UserManager = {
  editingId: null,

  init() {
    if (!window.Auth.can('usuarios_visualizar')) return;
    this.render();
    this.loadEventListeners();
  },

  loadEventListeners() {
    const btnAdicionar = document.getElementById('btnAdicionarUsuario');
    if (btnAdicionar) btnAdicionar.onclick = () => this.addUser();

    const btnCancelar = document.getElementById('userCancelBtn');
    if (btnCancelar) btnCancelar.onclick = () => this.cancelEdit();
  },

  render() {
    const users = window.Auth.getUsers();
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-[var(--muted)]">Nenhum usuário cadastrado</td></tr>';
      return;
    }

    const podeEditar = window.Auth.can('usuarios_editar');
    const podeExcluir = window.Auth.can('usuarios_excluir');
    const currentUser = window.Auth.currentUser;

    users.forEach(user => {
      const nivelLabel = user.nivel === 'admin' ? 'Admin' : (user.nivel === 'tecnico' ? 'Técnico' : 'Visualizador');
      let acoes = '';

      if (podeEditar && user.id !== currentUser?.id) {
        acoes += `<i class="fas fa-edit text-blue-400 cursor-pointer mr-2" onclick="UserManager.edit(${user.id})"></i>`;
      }
      if (podeExcluir && user.id !== currentUser?.id) {
        acoes += `<i class="fas fa-trash text-red-400 cursor-pointer" onclick="UserManager.delete(${user.id})"></i>`;
      }
      if (user.id === currentUser?.id) {
        acoes += `<span class="text-xs text-[var(--muted)]">(você)</span>`;
      }

      const row = tbody.insertRow();
      row.innerHTML = `
        <td class="p-2">${window.esc(user.nome)}</td>
        <td class="p-2">${window.esc(user.login)}</td>
        <td class="p-2">${window.esc(nivelLabel)}</td>
        <td class="p-2">${acoes}</td>
      `;
    });
  },

  addUser() {
    if (!window.Auth.can('usuarios_criar')) {
      showToast('Apenas administrador pode criar usuários', true);
      return;
    }

    const nome = document.getElementById('userNome')?.value.trim();
    const login = document.getElementById('userLogin')?.value.trim();
    const senha = document.getElementById('userSenha')?.value;
    const nivel = document.getElementById('userNivel')?.value;

    if (!nome || !login || !senha) {
      showToast('Preencha todos os campos', true);
      return;
    }

    const users = window.Auth.getUsers();
    if (users.find(u => u.login === login)) {
      showToast('Login já existe', true);
      return;
    }

    const newUser = {
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

  edit(id) {
    if (!window.Auth.can('usuarios_editar')) {
      showToast('Apenas administrador pode editar usuários', true);
      return;
    }

    const user = window.Auth.getUsers().find(u => u.id === id);
    if (!user) return;

    this.editingId = id;
    document.getElementById('userNome').value = user.nome;
    document.getElementById('userLogin').value = user.login;
    document.getElementById('userSenha').value = '';
    document.getElementById('userNivel').value = user.nivel;
    document.getElementById('userCancelBtn').style.display = 'inline-flex';
    document.getElementById('btnAdicionarUsuario').style.display = 'none';
  },

  delete(id) {
    if (!window.Auth.can('usuarios_excluir')) {
      showToast('Apenas administrador pode excluir usuários', true);
      return;
    }

    if (window.Auth.currentUser?.id === id) {
      showToast('Você não pode excluir seu próprio usuário', true);
      return;
    }

    if (!confirm('Excluir este usuário permanentemente?')) return;

    const users = window.Auth.getUsers().filter(u => u.id !== id);
    window.Auth.saveUsers(users);
    this.render();
    showToast('Usuário excluído');

    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      window.GoogleSheets.syncUsuarios(users);
    }
  },

  cancelEdit() {
    this.editingId = null;
    this.clearForm();
    document.getElementById('userCancelBtn').style.display = 'none';
    document.getElementById('btnAdicionarUsuario').style.display = 'inline-flex';
  },

  clearForm() {
    document.getElementById('userNome').value = '';
    document.getElementById('userLogin').value = '';
    document.getElementById('userSenha').value = '';
    document.getElementById('userNivel').value = 'tecnico';
  },

  loadFromSync(users) {
    if (Array.isArray(users) && users.length) {
      window.Auth.saveUsers(users);
      this.render();
    }
  }
};

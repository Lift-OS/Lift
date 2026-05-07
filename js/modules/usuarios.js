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

    const btnSalvar = document.getElementById('btnSalvarUsuario');
    if (btnSalvar) btnSalvar.onclick = () => this.saveEdit();

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
        <td class="p-2">${window.esc ? window.esc(user.nome) : user.nome}</td>
        <td class="p-2">${window.esc ? window.esc(user.login) : user.login}</td>
        <td class="p-2">${window.esc ? window.esc(nivelLabel) : nivelLabel}</td>
        <td class="p-2">${acoes}</td>
      `;
    });
  },

  addUser() {
    if (!window.Auth.can('usuarios_criar')) {
      this.showToast('Apenas administrador pode criar usuários', true);
      return;
    }

    const nome = document.getElementById('userNome')?.value.trim();
    const login = document.getElementById('userLogin')?.value.trim();
    const senha = document.getElementById('userSenha')?.value;
    const nivel = document.getElementById('userNivel')?.value;

    if (!nome || !login || !senha) {
      this.showToast('Preencha todos os campos', true);
      return;
    }

    if (senha.length < 4) {
      this.showToast('Senha deve ter no mínimo 4 caracteres', true);
      return;
    }

    const users = window.Auth.getUsers();
    if (users.find(u => u.login.toLowerCase() === login.toLowerCase())) {
      this.showToast('Login já existe', true);
      return;
    }

    const newUser = {
      id: Date.now(),
      nome: nome,
      login: login,
      senha: senha,
      nivel: nivel || 'tecnico'
    };

    users.push(newUser);
    window.Auth.saveUsers(users);
    this.clearForm();
    this.render();
    this.showToast('Usuário adicionado!');

    this.syncIfAllowed(users);
  },

  // ✅ NOVO MÉTODO - Salvar edição
  saveEdit() {
    if (!this.editingId) {
      this.showToast('Nenhuma edição em andamento', true);
      return;
    }

    if (!window.Auth.can('usuarios_editar')) {
      this.showToast('Apenas administrador pode editar usuários', true);
      return;
    }

    const nome = document.getElementById('userNome')?.value.trim();
    const login = document.getElementById('userLogin')?.value.trim();
    const senha = document.getElementById('userSenha')?.value;
    const nivel = document.getElementById('userNivel')?.value;

    if (!nome || !login) {
      this.showToast('Nome e login são obrigatórios', true);
      return;
    }

    const users = window.Auth.getUsers();
    
    // Verificar se login já existe (para outro usuário)
    const loginExistente = users.find(u => u.login.toLowerCase() === login.toLowerCase() && u.id !== this.editingId);
    if (loginExistente) {
      this.showToast('Login já existe para outro usuário', true);
      return;
    }

    // Encontrar e atualizar o usuário
    const userIndex = users.findIndex(u => u.id === this.editingId);
    if (userIndex === -1) {
      this.showToast('Usuário não encontrado', true);
      this.cancelEdit();
      return;
    }

    users[userIndex].nome = nome;
    users[userIndex].login = login;
    users[userIndex].nivel = nivel || 'tecnico';
    
    // Só atualiza a senha se foi preenchida
    if (senha && senha.length >= 4) {
      users[userIndex].senha = senha;
    } else if (senha && senha.length > 0 && senha.length < 4) {
      this.showToast('Senha deve ter no mínimo 4 caracteres', true);
      return;
    }

    window.Auth.saveUsers(users);
    this.cancelEdit();
    this.render();
    this.showToast('Usuário atualizado!');

    this.syncIfAllowed(users);
  },

  edit(id) {
    if (!window.Auth.can('usuarios_editar')) {
      this.showToast('Apenas administrador pode editar usuários', true);
      return;
    }

    const user = window.Auth.getUsers().find(u => u.id === id);
    if (!user) {
      this.showToast('Usuário não encontrado', true);
      return;
    }

    this.editingId = id;
    
    const elNome = document.getElementById('userNome');
    const elLogin = document.getElementById('userLogin');
    const elSenha = document.getElementById('userSenha');
    const elNivel = document.getElementById('userNivel');
    const btnCancelar = document.getElementById('userCancelBtn');
    const btnAdicionar = document.getElementById('btnAdicionarUsuario');
    const btnSalvar = document.getElementById('btnSalvarUsuario');

    if (elNome) elNome.value = user.nome;
    if (elLogin) elLogin.value = user.login;
    if (elSenha) elSenha.value = '';
    if (elNivel) elNivel.value = user.nivel;
    
    // ✅ CORRIGIDO - Mostrar botão salvar e esconder adicionar
    if (btnCancelar) btnCancelar.style.display = 'inline-flex';
    if (btnAdicionar) btnAdicionar.style.display = 'none';
    if (btnSalvar) btnSalvar.style.display = 'inline-flex';

    // Scroll para o formulário
    elNome?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  delete(id) {
    if (!window.Auth.can('usuarios_excluir')) {
      this.showToast('Apenas administrador pode excluir usuários', true);
      return;
    }

    if (window.Auth.currentUser?.id === id) {
      this.showToast('Você não pode excluir seu próprio usuário', true);
      return;
    }

    if (!confirm('Excluir este usuário permanentemente?')) return;

    const users = window.Auth.getUsers().filter(u => u.id !== id);
    window.Auth.saveUsers(users);
    this.render();
    this.showToast('Usuário excluído');

    this.syncIfAllowed(users);
  },

  cancelEdit() {
    this.editingId = null;
    this.clearForm();
    
    const btnCancelar = document.getElementById('userCancelBtn');
    const btnAdicionar = document.getElementById('btnAdicionarUsuario');
    const btnSalvar = document.getElementById('btnSalvarUsuario');

    if (btnCancelar) btnCancelar.style.display = 'none';
    if (btnAdicionar) btnAdicionar.style.display = 'inline-flex';
    if (btnSalvar) btnSalvar.style.display = 'none';
  },

  clearForm() {
    const elNome = document.getElementById('userNome');
    const elLogin = document.getElementById('userLogin');
    const elSenha = document.getElementById('userSenha');
    const elNivel = document.getElementById('userNivel');

    if (elNome) elNome.value = '';
    if (elLogin) elLogin.value = '';
    if (elSenha) elSenha.value = '';
    if (elNivel) elNivel.value = 'tecnico';
  },

  // ✅ NOVO - Helper para toast
  showToast(message, isError = false) {
    if (typeof showToast === 'function') {
      showToast(message, isError);
    } else {
      console.log(isError ? '❌' : '✅', message);
    }
  },

  // ✅ NOVO - Helper para sincronização
  syncIfAllowed(users) {
    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      window.GoogleSheets.syncUsuarios(users);
    }
  },

  loadFromSync(users) {
    if (Array.isArray(users) && users.length) {
      window.Auth.saveUsers(users);
      this.render();
    }
  }
};

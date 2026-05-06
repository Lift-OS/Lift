// auth.js - Sistema de autenticação
window.Auth = {
  currentUser: null,
  inactivityTimer: null,

  permissoes: {
    admin: {
      criar_os: true, editar_os: true, excluir_os: true, mudar_status: true, salvar_os: true,
      checklist_visualizar: true, checklist_preencher: true, fotos_horimetro: true,
      fotos_servico: true, fotos_pendencias: true, assinatura_tecnico: true, assinatura_cliente: true,
      timer_controle: true, horas_editar: true, gerar_pdf: true, enviar_email: true,
      enviar_whatsapp: true, sincronizar: true, limpar_fila: true, baixar_dados: true, heartbeat: true,
      clientes_cadastrar: true, clientes_editar: true, clientes_excluir: true, clientes_exportar_csv: true,
      clientes_importar_csv: true, clientes_visualizar: true, historico_visualizar: true,
      historico_excluir: true, historico_exportar_csv: true, historico_importar_csv: true,
      historico_limpar: true, agendamentos_criar: true, agendamentos_editar: true, agendamentos_excluir: true,
      agendamentos_concluir: true, agendamentos_visualizar: true, usuarios_criar: true,
      usuarios_editar: true, usuarios_excluir: true, usuarios_visualizar: true, permissoes_editar: true,
      jornada_registrar: true, estoque_cadastrar: true, estoque_editar: true, estoque_excluir: true,
      estoque_movimentar: true, orcamento_criar: true, orcamento_editar: true, orcamento_excluir: true,
      orcamento_aprovar: true, orcamento_visualizar: true
    },
    tecnico: {
      criar_os: false, editar_os: true, excluir_os: false, mudar_status: true, salvar_os: true,
      checklist_visualizar: true, checklist_preencher: true, fotos_horimetro: true,
      fotos_servico: true, fotos_pendencias: true, assinatura_tecnico: true, assinatura_cliente: true,
      timer_controle: true, horas_editar: true, gerar_pdf: true, enviar_email: true,
      enviar_whatsapp: true, sincronizar: false, limpar_fila: false, baixar_dados: false, heartbeat: true,
      clientes_cadastrar: false, clientes_editar: false, clientes_excluir: false,
      clientes_exportar_csv: false, clientes_importar_csv: false, clientes_visualizar: true,
      historico_visualizar: true, historico_excluir: false, historico_exportar_csv: false,
      historico_importar_csv: false, historico_limpar: false, agendamentos_criar: false,
      agendamentos_editar: false, agendamentos_excluir: false, agendamentos_concluir: false,
      agendamentos_visualizar: true, usuarios_criar: false, usuarios_editar: false,
      usuarios_excluir: false, usuarios_visualizar: false, permissoes_editar: false,
      jornada_registrar: true, estoque_cadastrar: false, estoque_editar: false, estoque_excluir: false,
      estoque_movimentar: true, orcamento_criar: true, orcamento_editar: true, orcamento_excluir: false,
      orcamento_aprovar: false, orcamento_visualizar: true
    },
    visualizador: {
      criar_os: false, editar_os: true, excluir_os: false, mudar_status: true, salvar_os: true,
      checklist_visualizar: true, checklist_preencher: true, fotos_horimetro: true,
      fotos_servico: true, fotos_pendencias: true, assinatura_tecnico: true, assinatura_cliente: true,
      timer_controle: false, horas_editar: false, gerar_pdf: true, enviar_email: true,
      enviar_whatsapp: true, sincronizar: false, limpar_fila: false, baixar_dados: false, heartbeat: false,
      clientes_cadastrar: false, clientes_editar: false, clientes_excluir: false,
      clientes_exportar_csv: false, clientes_importar_csv: false, clientes_visualizar: true,
      historico_visualizar: true, historico_excluir: false, historico_exportar_csv: false,
      historico_importar_csv: false, historico_limpar: false, agendamentos_criar: false,
      agendamentos_editar: false, agendamentos_excluir: false, agendamentos_concluir: false,
      agendamentos_visualizar: true, usuarios_criar: false, usuarios_editar: false,
      usuarios_excluir: false, usuarios_visualizar: false, permissoes_editar: false,
      jornada_registrar: false, estoque_cadastrar: false, estoque_editar: false, estoque_excluir: false,
      estoque_movimentar: false, orcamento_criar: false, orcamento_editar: false, orcamento_excluir: false,
      orcamento_aprovar: false, orcamento_visualizar: true
    }
  },

  can(permission) {
    if (!this.currentUser) return false;
    return this.permissoes[this.currentUser.nivel]?.[permission] === true;
  },

  isAdmin() { return this.currentUser?.nivel === 'admin'; },
  isTecnico() { return this.currentUser?.nivel === 'tecnico'; },

  getUsers() {
    let users = localStorage.getItem('LiftOS_users');
    if (users) {
      try {
        const parsed = JSON.parse(users);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch(e) {}
    }
    const defaultUsers = [
      { id: 1, nome: 'Administrador', login: 'admin', senha: 'admin123', nivel: 'admin' },
      { id: 2, nome: 'Técnico Principal', login: 'tecnico', senha: '123456', nivel: 'tecnico' }
    ];
    localStorage.setItem('LiftOS_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  },

  saveUsers(users) { localStorage.setItem('LiftOS_users', JSON.stringify(users)); },

  login() {
    const login = document.getElementById('loginUsername').value.trim();
    const senha = document.getElementById('loginPassword').value;
    const errDiv = document.getElementById('loginErrorMessage');
    if (errDiv) { errDiv.classList.add('hidden'); errDiv.innerHTML = ''; }
    
    if (!login || !senha) {
      if (errDiv) { errDiv.innerHTML = 'Preencha usuário e senha'; errDiv.classList.remove('hidden'); }
      return;
    }
    
    const users = this.getUsers();
    const user = users.find(u => u.login === login && u.senha === senha);
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
    showToast(`Bem-vindo, ${user.nome}!`);
  },

  logout(reason) {
    if (reason === 'inactivity') showToast('Sessão expirada', true);
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (window.Heartbeat) window.Heartbeat.stop();
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
        this.startInactivityTimer();
        return true;
      } catch(e) { localStorage.removeItem('LiftOS_current_user'); }
    }
    return false;
  },

  startInactivityTimer() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.currentUser) {
      this.inactivityTimer = setTimeout(() => this.logout('inactivity'), 15 * 60 * 1000);
    }
    const resetTimer = () => {
      if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
      if (this.currentUser) {
        this.inactivityTimer = setTimeout(() => this.logout('inactivity'), 15 * 60 * 1000);
      }
    };
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.removeEventListener(event, resetTimer);
      document.addEventListener(event, resetTimer);
    });
  },

  recoverPassword() {
    let login = document.getElementById('loginUsername').value.trim();
    if (!login) login = prompt('Digite seu usuário:');
    if (!login) return;
    const user = this.getUsers().find(u => u.login === login);
    if (!user) { alert('Usuário não encontrado'); return; }
    window.open(`https://wa.me/5598988248877?text=${encodeURIComponent(`Esqueci minha senha - Usuário: ${login}`)}`, '_blank');
  },

  updateUI() {
    if (!this.currentUser) return;
    const nivel = this.currentUser.nivel;
    const isAdmin = nivel === 'admin';
    const isTecnico = nivel === 'tecnico';
    
    const badge = document.getElementById('currentUserNivel');
    if (badge) {
      badge.textContent = isAdmin ? 'ADMIN' : (isTecnico ? 'TÉCNICO' : 'VISUALIZADOR');
    }
    
    const btnNovaOS = document.getElementById('btnNovaOS');
    if (btnNovaOS) btnNovaOS.style.display = this.can('criar_os') ? 'inline-flex' : 'none';
    
    const btnSync = document.getElementById('btnSync');
    if (btnSync) btnSync.style.display = this.can('sincronizar') ? 'inline-flex' : 'none';
    
    const btnDownload = document.getElementById('btnDownload');
    if (btnDownload) btnDownload.style.display = this.can('baixar_dados') ? 'inline-flex' : 'none';
  }
};

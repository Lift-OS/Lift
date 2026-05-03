// ========== GERENCIADOR DE PÁGINAS (CORE) ==========
window.PageLoader = {
  currentPage: null,
  cache: {},

  async load(pageName, skipEvent = false) {
    // Salva o estado do módulo atual ANTES de trocar de página
    if (this.currentPage === 'orcamento' && window.OrcamentoModule && window.OrcamentoModule.salvarEstado) {
      window.OrcamentoModule.salvarEstado();
    }
    if (this.currentPage === 'os' && window.OSModule && window.OSModule.salvarEstado) {
      window.OSModule.salvarEstado();
    }

    if (!skipEvent) {
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-page') === pageName) {
          btn.classList.add('active');
        }
      });
    }

    this.currentPage = pageName;

    // Se já está no cache, mostra
    if (this.cache[pageName]) {
      document.getElementById('pageContainer').innerHTML = this.cache[pageName];
      this.initPage(pageName);
      return;
    }

    // Carrega o HTML da página
    try {
      const response = await fetch(`pages/${pageName}.html`);
      if (!response.ok) throw new Error(`Página ${pageName} não encontrada`);
      const html = await response.text();
      this.cache[pageName] = html;
      document.getElementById('pageContainer').innerHTML = html;
      this.initPage(pageName);
    } catch (error) {
      console.error('Erro ao carregar página:', error);
      document.getElementById('pageContainer').innerHTML = `
        <div class="text-center py-20 text-[var(--danger)]">
          <i class="fas fa-exclamation-triangle text-4xl mb-3"></i>
          <p>Erro ao carregar página: ${pageName}</p>
          <button onclick="PageLoader.load('os')" class="btn btn-primary mt-4">Voltar para OS</button>
        </div>
      `;
    }
  },

  initPage(pageName) {
    // Remove modais residuais
    const modalCliente = document.getElementById('modalEscolhaCliente');
    if (modalCliente) modalCliente.remove();
    const modalEquip = document.getElementById('modalEquipamentosCliente');
    if (modalEquip) modalEquip.remove();

    // Inicializa o módulo correspondente
    switch (pageName) {
      case 'os':
        if (window.OSModule) window.OSModule.init();
        break;
      case 'orcamento':
        if (window.OrcamentoModule) window.OrcamentoModule.init();
        break;
      case 'estoque':
        if (window.EstoqueModule) window.EstoqueModule.init();
        break;
      case 'clientes':
        if (window.ClientesModule) window.ClientesModule.init();
        break;
      case 'historico':
        if (window.HistoricoModule) window.HistoricoModule.init();
        break;
      case 'checklist':
        if (window.ChecklistModule) window.ChecklistModule.init();
        break;
      case 'agendamentos':
        if (window.AgendamentosModule) window.AgendamentosModule.init();
        break;
      case 'jornada':
        if (window.JornadaModule) window.JornadaModule.init();
        break;
      case 'permissoes':
        if (window.PermissoesModule) window.PermissoesModule.init();
        break;
      case 'usuarios':
        if (window.UserManager) window.UserManager.init();
        break;
    }

    // Restaura estado do orçamento (se houver) após a página ser carregada
    if (pageName === 'orcamento' && window.OrcamentoModule && window.OrcamentoModule.restaurarEstado) {
      window.OrcamentoModule.restaurarEstado();
    }
    if (pageName === 'os' && window.OSModule && window.OSModule.restaurarEstado) {
      window.OSModule.restaurarEstado();
    }

    // Restaura dados do cliente (apenas OS e Orçamento)
    if ((pageName === 'os' || pageName === 'orcamento') && window.ClientesModule && window.ClientesModule.tryRestaurarDados) {
      const restoredKey = `restaurado_${pageName}`;
      if (!sessionStorage.getItem(restoredKey)) {
        window.ClientesModule.tryRestaurarDados();
        sessionStorage.setItem(restoredKey, 'true');
      }
    }
  }
};

// Estado global
window.State = {
  osCounter: 0,
  orcCounter: 0,
  osHistory: [],
  clients: [],
  pecas: [],
  movimentosEstoque: [],
  orcamentos: [],
  agendamentos: [],
  hasUnsavedChanges: false
};

// Storage helper
window.Storage = {
  save(key, value) {
    try { localStorage.setItem(`LiftOS_${key}`, JSON.stringify(value)); } catch(e) {}
  },
  load(key) {
    try { const data = localStorage.getItem(`LiftOS_${key}`); return data ? JSON.parse(data) : null; } catch(e) { return null; }
  },
  saveCounter() { this.save('os_counter', window.State.osCounter); },
  loadCounter() { window.State.osCounter = this.load('os_counter') || 0; },
  saveOrcCounter() { this.save('orc_counter', window.State.orcCounter); },
  loadOrcCounter() { window.State.orcCounter = this.load('orc_counter') || 0; },
  saveOSHistory() { this.save('os_history', window.State.osHistory); },
  loadOSHistory() { window.State.osHistory = this.load('os_history') || []; },
  saveClients() { this.save('clientes', window.State.clients); },
  loadClients() { window.State.clients = this.load('clientes') || []; },
  savePecas() { this.save('pecas', window.State.pecas); },
  loadPecas() { window.State.pecas = this.load('pecas') || []; },
  saveMovimentos() { this.save('movimentos', window.State.movimentosEstoque); },
  loadMovimentos() { window.State.movimentosEstoque = this.load('movimentos') || []; },
  saveOrcamentos() { this.save('orcamentos', window.State.orcamentos); },
  loadOrcamentos() { window.State.orcamentos = this.load('orcamentos') || []; },
  saveAgendamentos() { this.save('agendamentos', window.State.agendamentos); },
  loadAgendamentos() { window.State.agendamentos = this.load('agendamentos') || []; },
  saveJornada(login, jornada) { const todas = this.load('jornadas') || {}; todas[login] = jornada; this.save('jornadas', todas); },
  loadJornada(login) { const todas = this.load('jornadas') || {}; return todas[login] || null; }
};

// Inicialização do App
window.App = {
  async init() {
    window.Storage.loadCounter();
    window.Storage.loadOrcCounter();
    window.Storage.loadOSHistory();
    window.Storage.loadClients();
    window.Storage.loadPecas();
    window.Storage.loadMovimentos();
    window.Storage.loadOrcamentos();
    window.Storage.loadAgendamentos();
    await window.PageLoader.load('os');
    if (window.Auth.can('sincronizar') && navigator.onLine) {
      setTimeout(() => window.GoogleSheets.fetchFromSheet(), 1500);
    }
    window.addEventListener('online', () => {
      showToast('Conexão restaurada');
      if (window.Auth.can('sincronizar')) window.GoogleSheets.fetchFromSheet();
    });
    window.addEventListener('offline', () => showToast('Sem conexão', true));

    // ========== NOVOS MÓDULOS (online, heartbeat, notificações) ==========
    // Inicia heartbeat (para aparecer como online)
    if (window.Auth.can('heartbeat') && window.Heartbeat) {
      window.Heartbeat.start();
    }
    // Inicia widget de usuários online
    if (window.Auth.can('heartbeat') && window.OnlineUsers) {
      window.OnlineUsers.start();
    }
    // Inicia notificações
    if (window.Notificacoes) {
      window.Notificacoes.init();
    }
  }
};

// Inicialização automática após login
document.addEventListener('DOMContentLoaded', () => {
  if (!window.Auth.checkSession()) {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
  } else {
    document.getElementById('appContainer').style.display = 'block';
    window.App.init();
  }
});

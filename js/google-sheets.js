// google-sheets.js - Baseado no original funcional
window.GoogleSheets = {
  webAppUrl: 'https://script.google.com/macros/s/AKfycbzchqX9_PRTvn_8tW5qQ81b0ZoKsDv6BNw0io7SjIFGC_jky0EfSMMYXfY4os4pWOEz/exec', // ← Substitua pela URL correta

  async postData(action, data) {
    try {
      const response = await fetch(this.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, data }),
        redirect: 'follow'
      });
      const text = await response.text();
      try { return JSON.parse(text).success === true; } catch(e) { return false; }
    } catch(e) { return false; }
  },

  async syncSingleOS(osData) { return this.postData('syncOS', osData); },
  async syncSingleCliente(clienteData) { return this.postData('syncCliente', clienteData); },
  async syncSingleOrcamento(orcData) { return this.postData('syncOrcamento', orcData); },
  async syncPeca(pecaData) { return this.postData('syncPeca', pecaData); },
  async syncMovimento(movData) { return this.postData('syncMovimento', movData); },
  async syncAgendamento(agData) { return this.postData('syncAgendamento', agData); },
  async syncJornada(jornadaData) { return this.postData('syncJornada', jornadaData); },
  async syncPermissoes(permData) { return this.postData('syncPermissoes', permData); },
  async syncUsuarios(usersData) { return this.postData('syncUsuarios', usersData); },
  async syncNotificacao(notifData) { return this.postData('syncNotificacao', notifData); },

  async fetchOnlineUsers() {
    try {
      const response = await fetch(`${this.webAppUrl}?action=onlineUsers&_t=${Date.now()}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.users)) {
        if (window.OnlineUsers) window.OnlineUsers.updateList(data.users);
        return true;
      }
      return false;
    } catch(e) { return false; }
  },

  async fetchFromSheet() {
    const btn = document.getElementById('btnDownload');
    if (btn) { btn.classList.add('btn-loading'); btn.disabled = true; }
    try {
      const response = await fetch(`${this.webAppUrl}?_t=${Date.now()}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Erro');

      if (data.clientes && window.ClientesModule) {
        window.State.clients = data.clientes;
        window.Storage.saveClients();
        if (window.ClientesModule.renderTable) window.ClientesModule.renderTable();
        if (window.ClientesModule.updateStats) window.ClientesModule.updateStats();
      }
      if (data.os && window.OSModule) {
        window.State.osHistory = data.os;
        window.Storage.saveOSHistory();
        if (window.HistoricoModule) window.HistoricoModule.render();
      }
      if (data.orcamentos && window.OrcamentoModule) {
        window.State.orcamentos = data.orcamentos;
        window.Storage.saveOrcamentos();
        if (window.OrcamentoModule.renderLista) window.OrcamentoModule.renderLista();
      }
      if (data.pecas && window.EstoqueModule) {
        window.State.pecas = data.pecas;
        window.Storage.savePecas();
        if (window.EstoqueModule.renderPecas) window.EstoqueModule.renderPecas();
      }
      if (data.movimentosEstoque && window.EstoqueModule) {
        window.State.movimentosEstoque = data.movimentosEstoque;
        window.Storage.saveMovimentos();
      }
      if (data.agendamentos && window.AgendamentosModule) {
        window.State.agendamentos = data.agendamentos;
        window.Storage.saveAgendamentos();
        if (window.AgendamentosModule.atualizarLista) window.AgendamentosModule.atualizarLista();
      }
      if (data.notificacoes && window.Notificacoes) {
        data.notificacoes.forEach(n => window.Notificacoes.adicionar(n));
      }
      if (data.permissoes && window.PermissoesModule) {
        localStorage.setItem('LiftOS_permissoes_tecnico', JSON.stringify(data.permissoes));
      }
      if (data.usuarios && window.Auth) {
        window.Auth.saveUsers(data.usuarios);
      }
      showToast('Sincronização concluída!');
    } catch(err) {
      console.error('[SYNC] Erro:', err);
      showToast('Erro: ' + err.message, true);
    } finally {
      if (btn) { btn.classList.remove('btn-loading'); btn.disabled = false; }
    }
  }
};

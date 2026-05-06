// google-sheets.js - URL da sua nova planilha
window.GoogleSheets = {
  webAppUrl: 'https://script.google.com/macros/s/AKfycbx52Q1MHNIbNnz7ZrUu56vWBgJYfFWWfx0-ipMmngqDJvO8MwqOIi5jE3HVqi5E6sw/exec',

  async postData(action, data) {
    try {
      const response = await fetch(this.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, data })
      });
      const result = await response.json();
      return result.success === true;
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
  async syncDeleteOS(osData) { return this.postData('deleteOS', osData); },

  async fetchFromSheet() {
    try {
      const response = await fetch(this.webAppUrl + '?_t=' + Date.now());
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Erro');
      if (data.clientes && window.ClientesModule) {
        window.State.clients = data.clientes;
        window.Storage.saveClients();
        window.ClientesModule.renderTable();
        window.ClientesModule.updateStats();
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
      }
      if (data.agendamentos && window.AgendamentosModule) {
        window.State.agendamentos = data.agendamentos;
        window.Storage.saveAgendamentos();
      }
      showToast('Sincronização concluída!');
    } catch(err) {
      console.error('[SYNC] Erro:', err);
      showToast('Erro: ' + err.message, true);
    }
  }
};

// ========== SINCRONIZAÇÃO COM GOOGLE SHEETS ==========
window.GoogleSheets = {
  webAppUrl: 'https://script.google.com/macros/s/AKfycbzjMxXuVEGVW-Rgz_jKxDTn9oVFxZZJzVmpsCcjk3lmtFWX5DQFW2FigD1BRximEWgf/exec', // ← substitua pela URL correta (termine com /exec)

  async postData(action, data) {
    try {
      const response = await fetch(this.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, data }),
        redirect: 'follow'
      });
      const text = await response.text();
      try {
        return JSON.parse(text).success === true;
      } catch (e) {
        console.error('Erro ao parsear resposta POST:', e);
        return false;
      }
    } catch (e) {
      console.error('Erro no POST:', e);
      return false;
    }
  },

  async syncSingleOS(osData) {
    return this.postData('syncOS', osData);
  },
  async syncSingleCliente(clienteData) {
    return this.postData('syncCliente', clienteData);
  },
  async syncSingleOrcamento(orcData) {
    return this.postData('syncOrcamento', orcData);
  },
  async syncPeca(pecaData) {
    return this.postData('syncPeca', pecaData);
  },
  async syncMovimento(movData) {
    return this.postData('syncMovimento', movData);
  },
  async syncAgendamento(agData) {
    return this.postData('syncAgendamento', agData);
  },
  async syncJornada(jornadaData) {
    return this.postData('syncJornada', jornadaData);
  },
  async syncPermissoes(permData) {
    return this.postData('syncPermissoes', permData);
  },
  async syncUsuarios(usersData) {
    return this.postData('syncUsuarios', usersData);
  },

  async fetchFromSheet() {
    try {
      const response = await fetch(`${this.webAppUrl}?_t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Erro ao sincronizar');

      if (data.os && window.OSModule) window.OSModule.loadFromSync(data.os);
      if (data.clientes && window.ClientesModule) window.ClientesModule.loadFromSync(data.clientes);
      if (data.orcamentos && window.OrcamentoModule) window.OrcamentoModule.loadFromSync(data.orcamentos);
      if (data.pecas && window.EstoqueModule) window.EstoqueModule.loadFromSync(data.pecas);
      if (data.movimentosEstoque && window.EstoqueModule)
        window.EstoqueModule.loadMovimentosFromSync(data.movimentosEstoque);
      if (data.agendamentos && window.AgendamentosModule)
        window.AgendamentosModule.loadFromSync(data.agendamentos);
      if (data.permissoes && window.PermissoesModule)
        window.PermissoesModule.loadFromSync(data.permissoes);
      if (data.usuarios && window.UserManager) window.UserManager.loadFromSync(data.usuarios);

      showToast('Sincronização concluída!');
      return data;
    } catch (error) {
      console.error('[SYNC] Erro:', error);
      showToast('Erro na sincronização: ' + error.message, true);
      return null;
    }
  },

  async fetchOnlineUsers() {
    try {
      const response = await fetch(`${this.webAppUrl}?action=onlineUsers&_t=${Date.now()}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.users)) {
        if (window.OnlineUsers) window.OnlineUsers.updateList(data.users);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Erro ao buscar usuários online:', e);
      return false;
    }
  }
};

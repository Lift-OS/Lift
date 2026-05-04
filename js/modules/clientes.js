// --- Substitua apenas estas funções no seu clientes.js existente ---
window.ClientesModule = {
  // ... mantenha todo o resto igual, apenas troque estas partes:
  init: function() {
    setTimeout(() => {
      if (window.State.clients.length) {
        window.State.clients = window.State.clients.map(c => this.normalizarCliente(c));
        window.Storage.saveClients();
      }
      this.renderTable();
      if (typeof this.updateStats === 'function') this.updateStats();
      this.loadEventListeners();
      this.removerModal();
    }, 200);
  },
  renderTable: function(clientesList) {
    const list = clientesList || window.State.clients;
    const tbody = document.getElementById('cad_tableBody');
    if (!tbody) { setTimeout(() => this.renderTable(clientesList), 300); return; }
    tbody.innerHTML = '';
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-[var(--muted)]">Nenhum cliente cadastrado</td></tr>'; return; }
    const podeEditar = window.Auth.can('clientes_editar');
    const podeExcluir = window.Auth.can('clientes_excluir');
    list.forEach(cliente => {
      const marcas = (cliente.equipamentos || []).map(e => e.marca || '').filter(Boolean).join(', ');
      let acoes = `<button onclick="ClientesModule.select(${cliente.id})" class="btn btn-primary text-xs py-1 px-2"><i class="fas fa-arrow-right"></i> Selecionar</button>`;
      if (podeEditar) acoes += ` <i class="fas fa-edit text-blue-400 cursor-pointer ml-2" onclick="ClientesModule.edit(${cliente.id})"></i>`;
      if (podeExcluir) acoes += ` <i class="fas fa-trash text-red-400 cursor-pointer ml-2" onclick="ClientesModule.delete(${cliente.id})"></i>`;
      const row = tbody.insertRow();
      row.innerHTML = `<td class="p-2 font-medium">${window.esc(cliente.nome) || ''}</td><td class="p-2">${window.esc(cliente.cidade) || '-'}</td><td class="p-2">${window.esc(marcas) || '-'}</td><td class="p-2">${acoes}</td>`;
    });
  }
};

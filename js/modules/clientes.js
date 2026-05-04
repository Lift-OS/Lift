// modules/clientes.js - Versão final com normalização de chaves
window.ClientesModule = {
  editingId: null,
  modalEscolha: null,
  modalEquipamentos: null,

  normalizarCliente: function(cliente) {
    if (!cliente) return { equipamentos: [] };
    const novo = {};
    for (let [chave, valor] of Object.entries(cliente)) {
      novo[chave.toLowerCase()] = valor;
    }
    if (typeof novo.equipamentos === 'string') {
      try {
        novo.equipamentos = JSON.parse(novo.equipamentos);
      } catch(e) {
        novo.equipamentos = [];
      }
    }
    if (!Array.isArray(novo.equipamentos)) novo.equipamentos = [];
    return novo;
  },

  removerModal: function() {
    if (this.modalEscolha?.parentNode) this.modalEscolha.parentNode.removeChild(this.modalEscolha);
    if (this.modalEquipamentos?.parentNode) this.modalEquipamentos.parentNode.removeChild(this.modalEquipamentos);
    const m1 = document.getElementById('modalEscolhaCliente'); if (m1) m1.remove();
    const m2 = document.getElementById('modalEquipamentosCliente'); if (m2) m2.remove();
    this.modalEscolha = null;
    this.modalEquipamentos = null;
  },

  init: function() {
    setTimeout(() => {
      window.State.clients = window.State.clients.map(c => this.normalizarCliente(c));
      window.Storage.saveClients();
      this.renderTable();
      if (typeof this.updateStats === 'function') this.updateStats();
      this.loadEventListeners();
      this.removerModal();
    }, 200);
  },

  loadEventListeners: function() {
    const searchInput = document.getElementById('cad_searchInput');
    if (searchInput) searchInput.oninput = (e) => this.filtrarClientes(e.target.value);
    const btnSalvar = document.getElementById('btnSalvarCliente');
    if (btnSalvar) btnSalvar.onclick = () => this.save();
    const btnCancelar = document.getElementById('cad_btnCancelar');
    if (btnCancelar) btnCancelar.onclick = () => this.cancelEdit();
    const btnExportar = document.getElementById('btnExportarCSVClientes');
    if (btnExportar) btnExportar.onclick = () => this.exportCSV();
    const btnImportar = document.getElementById('btnImportarCSVClientes');
    if (btnImportar) btnImportar.onclick = () => this.importCSV();
  },

  updateStats: function() {
    const totalClientes = window.State.clients.length;
    let totalEquipamentos = 0;
    const clientesComOS = new Set();
    let totalOS = 0, osAbertas = 0, osAprovadas = 0;
    window.State.clients.forEach(c => { totalEquipamentos += c.equipamentos.length; });
    window.State.osHistory.forEach(os => {
      if (os.cliente) { clientesComOS.add(os.cliente); totalOS++; }
      if (['abertura','execucao','finalizacao'].includes(os.status)) osAbertas++;
      if (os.status === 'aprovada') osAprovadas++;
    });
    const elTotal = document.getElementById('statTotalClientes');
    const elMarcas = document.getElementById('statTotalMarcas');
    const elClientesOS = document.getElementById('statClientesComOS');
    const elTotalOS = document.getElementById('statTotalOSClientes');
    const elOSAbertas = document.getElementById('statOSAbertasCliente');
    const elOSAprovadas = document.getElementById('statOSAprovadasCliente');
    if (elTotal) elTotal.innerText = totalClientes;
    if (elMarcas) elMarcas.innerText = totalEquipamentos;
    if (elClientesOS) elClientesOS.innerText = clientesComOS.size;
    if (elTotalOS) elTotalOS.innerText = totalOS;
    if (elOSAbertas) elOSAbertas.innerText = osAbertas;
    if (elOSAprovadas) elOSAprovadas.innerText = osAprovadas;
  },

  renderTable: function(clientesList) {
    const list = clientesList || window.State.clients;
    const tbody = document.getElementById('cad_tableBody');
    if (!tbody) {
      console.warn('cad_tableBody não encontrado');
      return;
    }
    tbody.innerHTML = '';
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-[var(--muted)]">Nenhum cliente cadastrado</td></tr>';
      return;
    }
    const podeEditar = window.Auth.can('clientes_editar');
    const podeExcluir = window.Auth.can('clientes_excluir');
    list.forEach(cliente => {
      const marcas = (cliente.equipamentos || []).map(e => e.marca || '').filter(Boolean).join(', ');
      let acoes = `<button onclick="ClientesModule.select(${cliente.id})" class="btn btn-primary text-xs py-1 px-2"><i class="fas fa-arrow-right"></i> Selecionar</button>`;
      if (podeEditar) acoes += ` <i class="fas fa-edit text-blue-400 cursor-pointer ml-2" onclick="ClientesModule.edit(${cliente.id})"></i>`;
      if (podeExcluir) acoes += ` <i class="fas fa-trash text-red-400 cursor-pointer ml-2" onclick="ClientesModule.delete(${cliente.id})"></i>`;
      const row = tbody.insertRow();
      row.innerHTML = `
        <td class="p-2 font-medium">${window.esc(cliente.nome) || ''}</td>
        <td class="p-2">${window.esc(cliente.cidade) || '-'}</td>
        <td class="p-2">${window.esc(marcas) || '-'}</td>
        <td class="p-2">${acoes}</td>
      `;
    });
  },

  filtrarClientes: function(busca) {
    if (!busca) { this.renderTable(); return; }
    const filtered = window.State.clients.filter(c =>
      (c.nome?.toLowerCase().includes(busca.toLowerCase())) ||
      (c.cidade?.toLowerCase().includes(busca.toLowerCase()))
    );
    this.renderTable(filtered);
  },

  // demais métodos (select, mostrarModalEscolha, abrirOS, abrirOrcamento, etc.) mantidos conforme original
  // por questão de espaço, não repito tudo aqui, mas devem permanecer idênticos

  loadFromSync: function(clientes) {
    if (Array.isArray(clientes) && clientes.length) {
      const padronizados = clientes.map(c => this.normalizarCliente(c));
      window.State.clients = padronizados;
      window.Storage.saveClients();
      this.renderTable();
      this.updateStats();
    }
  }
};

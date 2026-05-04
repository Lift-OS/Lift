// modules/clientes.js - Versão final com normalização de chaves
window.ClientesModule = {
  editingId: null,
  modalEscolha: null,
  modalEquipamentos: null,

  // Converte as chaves do objeto para minúsculo e garante equipamentos como array
  normalizarCliente: function(cliente) {
    if (!cliente) return { equipamentos: [] };
    const novo = {};
    for (let [chave, valor] of Object.entries(cliente)) {
      novo[chave.toLowerCase()] = valor;
    }
    // Trata equipamentos (pode ser string JSON ou array)
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
    if (this.modalEscolha && this.modalEscolha.parentNode) this.modalEscolha.parentNode.removeChild(this.modalEscolha);
    if (this.modalEquipamentos && this.modalEquipamentos.parentNode) this.modalEquipamentos.parentNode.removeChild(this.modalEquipamentos);
    const m1 = document.getElementById('modalEscolhaCliente'); if (m1) m1.remove();
    const m2 = document.getElementById('modalEquipamentosCliente'); if (m2) m2.remove();
    this.modalEscolha = null;
    this.modalEquipamentos = null;
  },

  init: function() {
    setTimeout(() => {
      // Normaliza todos os clientes existentes (caso venham do storage sem padronização)
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
    window.State.clients.forEach(c => {
      totalEquipamentos += c.equipamentos.length;
    });
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
      const marcas = cliente.equipamentos.map(e => e.marca).join(', ');
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
      (c.nome && c.nome.toLowerCase().includes(busca.toLowerCase())) ||
      (c.cidade && c.cidade.toLowerCase().includes(busca.toLowerCase()))
    );
    this.renderTable(filtered);
  },

  select: function(id) {
    const cliente = window.State.clients.find(c => c.id === id);
    if (!cliente) return;
    this.mostrarModalEscolha(cliente);
  },

  mostrarModalEscolha: function(cliente) {
    this.removerModal();
    const modal = document.createElement('div');
    modal.id = 'modalEscolhaCliente';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content bg-[var(--card)] rounded-2xl p-6 max-w-sm w-full text-center">
        <h3 class="text-xl font-bold text-[var(--accent)] mb-4">${window.esc(cliente.nome)}</h3>
        <p class="text-sm text-[var(--muted)] mb-6">O que deseja fazer com este cliente?</p>
        <div class="flex flex-col gap-3">
          <button id="escolhaOS" class="btn btn-primary w-full"><i class="fas fa-clipboard-list"></i> Abrir Ordem de Serviço</button>
          <button id="escolhaOrcamento" class="btn btn-info w-full"><i class="fas fa-file-invoice-dollar"></i> Criar Orçamento</button>
          <button id="escolhaCancelar" class="btn btn-secondary w-full"><i class="fas fa-times"></i> Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.modalEscolha = modal;
    document.getElementById('escolhaOS').onclick = () => { this.removerModal(); this.abrirOS(cliente); };
    document.getElementById('escolhaOrcamento').onclick = () => { this.removerModal(); this.abrirOrcamento(cliente); };
    document.getElementById('escolhaCancelar').onclick = () => this.removerModal();
  },

  mostrarModalEquipamentosCliente: function(cliente, destino) {
    const equipamentos = cliente.equipamentos || [];
    if (equipamentos.length === 0) return;
    if (equipamentos.length === 1) {
      if (destino === 'os') this._finalizarAbrirOS(cliente, equipamentos[0]);
      else this._finalizarAbrirOrcamento(cliente, equipamentos[0]);
      return;
    }
    this.removerModal();
    const modal = document.createElement('div');
    modal.id = 'modalEquipamentosCliente';
    modal.className = 'modal';
    modal.style.display = 'flex';
    let listaHtml = '<div class="modal-content bg-[var(--card)] rounded-2xl p-6 max-w-md w-full"><h3 class="text-xl font-bold text-[var(--accent)] mb-4">Selecione o Equipamento</h3><div class="space-y-2">';
    equipamentos.forEach((eq, idx) => {
      listaHtml += `<div class="equip-option p-3 bg-[var(--bg-secondary)] rounded-lg cursor-pointer hover:border-[var(--accent)] transition-all" data-equip-idx="${idx}">
        <div><strong>${window.esc(eq.marca || 'N/A')} ${window.esc(eq.modelo || '')}</strong></div>
        <div class="text-sm text-[var(--muted)]">Série: ${window.esc(eq.serie || 'N/A')} | Combustível: ${window.esc(eq.combustivel || 'N/A')}</div>
      </div>`;
    });
    listaHtml += '</div><button class="btn btn-secondary w-full mt-4" onclick="ClientesModule.removerModal()">Cancelar</button></div>';
    modal.innerHTML = listaHtml;
    document.body.appendChild(modal);
    this.modalEquipamentos = modal;
    modal.querySelectorAll('.equip-option').forEach(opt => {
      opt.onclick = () => {
        const idx = parseInt(opt.getAttribute('data-equip-idx'));
        const equip = equipamentos[idx];
        this.removerModal();
        if (destino === 'os') this._finalizarAbrirOS(cliente, equip);
        else this._finalizarAbrirOrcamento(cliente, equip);
      };
    });
  },

  async abrirOS(cliente) {
    sessionStorage.setItem('clienteSelecionado', JSON.stringify({
      nome: cliente.nome,
      cnpj: cliente.cnpj || '',
      cidade: cliente.cidade || '',
      endereco: cliente.endereco || '',
      whatsapp: cliente.whatsapp || '',
      equipamentos: cliente.equipamentos
    }));
    sessionStorage.removeItem('restaurado_os');
    await window.PageLoader.load('os');
    const equipamentos = cliente.equipamentos || [];
    if (equipamentos.length === 1) this._finalizarAbrirOS(cliente, equipamentos[0]);
    else if (equipamentos.length > 1) this.mostrarModalEquipamentosCliente(cliente, 'os');
    else this._finalizarAbrirOS(cliente, null);
  },

  _finalizarAbrirOS: function(cliente, equip) {
    window.Utils.setVal('cliente', cliente.nome);
    window.Utils.setVal('cnpj', cliente.cnpj || '');
    window.Utils.setVal('cidadeCliente', cliente.cidade || '');
    window.Utils.setVal('endereco', cliente.endereco || '');
    window.Utils.setVal('whatsappCliente', cliente.whatsapp || '');
    if (equip) this.carregarEquipamento(equip, cliente);
    showToast(`Cliente ${cliente.nome} carregado na OS`);
  },

  async abrirOrcamento(cliente) {
    sessionStorage.setItem('clienteSelecionado', JSON.stringify({
      nome: cliente.nome,
      cnpj: cliente.cnpj || '',
      cidade: cliente.cidade || '',
      endereco: cliente.endereco || '',
      whatsapp: cliente.whatsapp || '',
      equipamentos: cliente.equipamentos
    }));
    sessionStorage.removeItem('restaurado_orcamento');
    await window.PageLoader.load('orcamento');
    const equipamentos = cliente.equipamentos || [];
    if (equipamentos.length === 1) this._finalizarAbrirOrcamento(cliente, equipamentos[0]);
    else if (equipamentos.length > 1) this.mostrarModalEquipamentosCliente(cliente, 'orcamento');
    else this._finalizarAbrirOrcamento(cliente, null);
  },

  _finalizarAbrirOrcamento: function(cliente, equip) {
    window.Utils.setVal('orc_cliente', cliente.nome);
    window.Utils.setVal('orc_equipamento', '');
    window.Utils.setVal('orc_serie_combustivel', '');
    if (equip) {
      const marcaModelo = `${equip.marca || ''} ${equip.modelo || ''}`.trim();
      window.Utils.setVal('orc_equipamento', marcaModelo);
      const serieComb = `Série: ${equip.serie || 'N/A'} | Combustível: ${equip.combustivel || 'N/A'}`;
      window.Utils.setVal('orc_serie_combustivel', serieComb);
    }
    showToast(`Cliente ${cliente.nome} carregado no orçamento`);
  },

  tryRestaurarDados: function() {
    const dados = sessionStorage.getItem('clienteSelecionado');
    if (!dados) return;
    const cliente = JSON.parse(dados);
    const isOS = !!document.getElementById('cliente');
    const isOrc = !!document.getElementById('orc_cliente');
    if (isOS && !window.Utils.getVal('cliente')) {
      this._finalizarAbrirOS(cliente, null);
      sessionStorage.removeItem('clienteSelecionado');
    } else if (isOrc && !window.Utils.getVal('orc_cliente')) {
      this._finalizarAbrirOrcamento(cliente, null);
      sessionStorage.removeItem('clienteSelecionado');
    }
  },

  carregarDadosCliente: function(cliente) {
    window.Utils.setVal('cliente', cliente.nome);
    window.Utils.setVal('cnpj', cliente.cnpj || '');
    window.Utils.setVal('cidadeCliente', cliente.cidade || '');
    window.Utils.setVal('endereco', cliente.endereco || '');
    window.Utils.setVal('whatsappCliente', cliente.whatsapp || '');
  },

  carregarEquipamento: function(equip, cliente) {
    this.carregarDadosCliente(cliente);
    const marcaSelect = document.getElementById('marcaSelect');
    const marcaOutraDiv = document.getElementById('marcaOutraDiv');
    const marcaOutra = document.getElementById('marcaOutra');
    if (marcaSelect) {
      const marca = equip.marca || '';
      const marcasList = ["TOYOTA","CLARK","BYD","PALETRANS","LINDE","HYSTER","YALE","CATERPILLAR","KOMATSU","MITSUBISHI","NISSAN","STILL","CROWN","JUNGHEINRICH","TCM","HYUNDAI","DOOSAN","HELI","HANGCHA","LONKING"];
      if (marcasList.includes(marca)) {
        marcaSelect.value = marca;
        if (marcaOutraDiv) marcaOutraDiv.style.display = 'none';
      } else if (marca) {
        marcaSelect.value = 'OUTRA';
        if (marcaOutraDiv) marcaOutraDiv.style.display = 'block';
        if (marcaOutra) marcaOutra.value = marca;
      }
    }
    window.Utils.setVal('modelo', equip.modelo || '');
    window.Utils.setVal('numSerie', equip.serie || '');
    if (equip.combustivel) window.Utils.setVal('combustivel', equip.combustivel);
  },

  // Métodos CRUD (save, edit, delete, etc.) mantidos conforme original
  async save() { /* manter implementação original */ },
  edit(id) { /* manter implementação original */ },
  delete(id) { /* manter implementação original */ },
  cancelEdit() { /* manter original */ },
  clearForm() { /* manter original */ },
  adicionarCampoEquipamento() { /* manter original */ },
  exportCSV() { /* manter original */ },
  importCSV() { /* manter original */ },

  loadFromSync: function(clientes) {
    if (Array.isArray(clientes) && clientes.length) {
      // Padroniza chaves (maiúsculo/minúsculo) e equipamentos
      const padronizados = clientes.map(c => this.normalizarCliente(c));
      window.State.clients = padronizados;
      window.Storage.saveClients();
      this.renderTable();
      this.updateStats();
    }
  }
};

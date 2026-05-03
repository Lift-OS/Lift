// modules/clientes.js - Módulo de Clientes (com correções)
window.ClientesModule = {
  editingId: null,
  modalEscolha: null,
  modalEquipamentos: null,

  // Converte string JSON para array
  normalizarEquipamentos(cliente) {
    if (!cliente) return;
    if (Array.isArray(cliente.equipamentos)) return;
    if (typeof cliente.equipamentos === 'string' && cliente.equipamentos.trim() !== '') {
      try {
        const parsed = JSON.parse(cliente.equipamentos);
        if (Array.isArray(parsed)) {
          cliente.equipamentos = parsed;
          return;
        }
      } catch (e) { console.warn('Erro ao parsear equipamentos', e); }
    }
    cliente.equipamentos = [];
  },

  // Remove modais flutuantes
  removerModal() {
    if (this.modalEscolha && this.modalEscolha.parentNode) {
      this.modalEscolha.parentNode.removeChild(this.modalEscolha);
      this.modalEscolha = null;
    }
    if (this.modalEquipamentos && this.modalEquipamentos.parentNode) {
      this.modalEquipamentos.parentNode.removeChild(this.modalEquipamentos);
      this.modalEquipamentos = null;
    }
    const existing = document.getElementById('modalEscolhaCliente');
    if (existing) existing.remove();
    const existing2 = document.getElementById('modalEquipamentosCliente');
    if (existing2) existing2.remove();
  },

  init() {
    setTimeout(() => {
      window.State.clients.forEach(c => this.normalizarEquipamentos(c));
      this.renderTable();
      if (typeof this.updateStats === 'function') this.updateStats();
      this.loadEventListeners();
      this.removerModal();
    }, 50);
  },

  loadEventListeners() {
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

  updateStats() { /* ... (igual ao anterior, não repetido para brevidade) */ },
  renderTable() { /* ... (igual ao anterior) */ },
  filtrarClientes(busca) { /* ... (igual) */ },

  // ==== Modal de escolha (OS / Orçamento) ====
  select(id) {
    const cliente = window.State.clients.find(c => c.id === id);
    if (!cliente) return;
    this.mostrarModalEscolha(cliente);
  },

  mostrarModalEscolha(cliente) {
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

    document.getElementById('escolhaOS').onclick = () => {
      this.removerModal();
      this.abrirOS(cliente);
    };
    document.getElementById('escolhaOrcamento').onclick = () => {
      this.removerModal();
      this.abrirOrcamento(cliente);
    };
    document.getElementById('escolhaCancelar').onclick = () => this.removerModal();
  },

  // Modal de seleção de equipamento (quando houver mais de um)
  mostrarModalEquipamentosCliente(cliente, destino) { // destino = 'os' ou 'orcamento'
    this.removerModal();
    const equipamentos = Array.isArray(cliente.equipamentos) ? cliente.equipamentos : [];
    if (equipamentos.length === 0) {
      // Prossegue sem equipamento
      if (destino === 'os') this._finalizarAbrirOS(cliente, null);
      else this._finalizarAbrirOrcamento(cliente, null);
      return;
    }
    if (equipamentos.length === 1) {
      if (destino === 'os') this._finalizarAbrirOS(cliente, equipamentos[0]);
      else this._finalizarAbrirOrcamento(cliente, equipamentos[0]);
      return;
    }

    // Mais de um equipamento: exibir modal
    const modal = document.createElement('div');
    modal.id = 'modalEquipamentosCliente';
    modal.className = 'modal';
    modal.style.display = 'flex';
    let listaHtml = '<div class="modal-content bg-[var(--card)] rounded-2xl p-6 max-w-md w-full"><h3 class="text-xl font-bold text-[var(--accent)] mb-4">Selecione o Equipamento</h3><div class="space-y-2">';
    equipamentos.forEach((eq, idx) => {
      listaHtml += `
        <div class="equip-option p-3 bg-[var(--bg-secondary)] rounded-lg cursor-pointer hover:border-[var(--accent)] transition-all" data-equip-idx="${idx}">
          <div><strong>${window.esc(eq.marca || 'N/A')} ${window.esc(eq.modelo || '')}</strong></div>
          <div class="text-sm text-[var(--muted)]">Série: ${window.esc(eq.serie || 'N/A')} | Combustível: ${window.esc(eq.combustivel || 'N/A')}</div>
        </div>
      `;
    });
    listaHtml += '</div><button class="btn btn-secondary w-full mt-4" onclick="ClientesModule.removerModal()">Cancelar</button></div>';
    modal.innerHTML = listaHtml;
    document.body.appendChild(modal);
    this.modalEquipamentos = modal;

    // Adiciona eventos aos itens
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

  // Abrir OS com possibilidade de escolher equipamento
  async abrirOS(cliente) {
    // Armazena no sessionStorage para não perder ao navegar
    sessionStorage.setItem('clienteSelecionado', JSON.stringify({
      nome: cliente.nome,
      cnpj: cliente.cnpj || '',
      cidade: cliente.cidade || '',
      endereco: cliente.endereco || '',
      whatsapp: cliente.whatsapp || '',
      equipamentos: cliente.equipamentos
    }));
    await window.PageLoader.load('os');
    // Verifica se há equipamentos e exibe modal se necessário
    const equipamentos = Array.isArray(cliente.equipamentos) ? cliente.equipamentos : [];
    if (equipamentos.length === 1) {
      this._finalizarAbrirOS(cliente, equipamentos[0]);
    } else if (equipamentos.length > 1) {
      this.mostrarModalEquipamentosCliente(cliente, 'os');
    } else {
      this._finalizarAbrirOS(cliente, null);
    }
  },

  _finalizarAbrirOS(cliente, equip) {
    // Preenche os dados do cliente
    window.Utils.setVal('cliente', cliente.nome);
    window.Utils.setVal('cnpj', cliente.cnpj || '');
    window.Utils.setVal('cidadeCliente', cliente.cidade || '');
    window.Utils.setVal('endereco', cliente.endereco || '');
    window.Utils.setVal('whatsappCliente', cliente.whatsapp || '');
    if (equip) {
      this.carregarEquipamento(equip, cliente);
    }
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
    await window.PageLoader.load('orcamento');
    const equipamentos = Array.isArray(cliente.equipamentos) ? cliente.equipamentos : [];
    if (equipamentos.length === 1) {
      this._finalizarAbrirOrcamento(cliente, equipamentos[0]);
    } else if (equipamentos.length > 1) {
      this.mostrarModalEquipamentosCliente(cliente, 'orcamento');
    } else {
      this._finalizarAbrirOrcamento(cliente, null);
    }
  },

  _finalizarAbrirOrcamento(cliente, equip) {
    window.Utils.setVal('orc_cliente', cliente.nome);
    window.Utils.setVal('orc_equipamento', '');
    window.Utils.setVal('orc_serie_hor', '');
    if (equip) {
      const marcaModelo = `${equip.marca || ''} ${equip.modelo || ''}`.trim();
      window.Utils.setVal('orc_equipamento', marcaModelo);
      if (equip.serie) window.Utils.setVal('orc_serie_hor', equip.serie);
    }
    showToast(`Cliente ${cliente.nome} carregado no orçamento`);
  },

  // Métodos auxiliares já existentes (carregarDadosCliente, carregarEquipamento, etc.)
  carregarDadosCliente(cliente) { /* ... (igual anterior) */ },
  carregarEquipamento(equip, cliente) { /* ... (igual) */ },

  // Garantir que, ao iniciar a página OS/Orçamento, os dados não sejam perdidos
  // Isto será chamado no módulo OS e Orçamento, se existir dados no sessionStorage
  tryRestaurarDados() {
    const dados = sessionStorage.getItem('clienteSelecionado');
    if (dados) {
      const cliente = JSON.parse(dados);
      // Verifica se a página atual é OS ou Orçamento e se os campos estão vazios
      const isOS = !!document.getElementById('cliente');
      const isOrc = !!document.getElementById('orc_cliente');
      if (isOS && !window.Utils.getVal('cliente')) {
        this._finalizarAbrirOS(cliente, null);
      } else if (isOrc && !window.Utils.getVal('orc_cliente')) {
        this._finalizarAbrirOrcamento(cliente, null);
      }
      sessionStorage.removeItem('clienteSelecionado');
    }
  },

  // ... Demais métodos (save, edit, delete, etc.) permanecem iguais
};

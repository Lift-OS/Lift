// modules/clientes.js - Versão corrigida (modal e preenchimento)
window.ClientesModule = {
  editingId: null,
  modalEscolha: null,      // referência ao modal

  // Converte equipamentos de string JSON para array
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
      } catch (e) { console.warn(e); }
    }
    cliente.equipamentos = [];
  },

  init() {
    window.State.clients.forEach(c => this.normalizarEquipamentos(c));
    this.renderTable();
    this.updateStats();
    this.loadEventListeners();
    // Garante que qualquer modal residual seja removido ao trocar de página
    this.removerModal();
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

  removerModal() {
    if (this.modalEscolha && this.modalEscolha.parentNode) {
      this.modalEscolha.parentNode.removeChild(this.modalEscolha);
      this.modalEscolha = null;
    }
    // Também remove qualquer outro modal com mesmo ID
    const existing = document.getElementById('modalEscolhaCliente');
    if (existing) existing.remove();
  },

  select(id) {
    const cliente = window.State.clients.find(c => c.id === id);
    if (!cliente) return;
    this.mostrarModalEscolha(cliente);
  },

  mostrarModalEscolha(cliente) {
    // Remove qualquer modal anterior
    this.removerModal();
    // Cria o modal
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

    // Adiciona eventos
    const btnOS = document.getElementById('escolhaOS');
    const btnOrc = document.getElementById('escolhaOrcamento');
    const btnCancel = document.getElementById('escolhaCancelar');

    btnOS.onclick = () => {
      this.removerModal();
      this.abrirOS(cliente);
    };
    btnOrc.onclick = () => {
      this.removerModal();
      this.abrirOrcamento(cliente);
    };
    btnCancel.onclick = () => this.removerModal();
  },

  async abrirOS(cliente) {
    // Primeiro navega para a página OS
    await window.PageLoader.load('os');
    // Aguarda um pequeno delay para garantir que o DOM foi atualizado
    setTimeout(() => {
      // Preenche os dados do cliente
      this.carregarDadosCliente(cliente);
      const equipamentos = Array.isArray(cliente.equipamentos) ? cliente.equipamentos : [];
      if (equipamentos.length === 1) {
        this.carregarEquipamento(equipamentos[0], cliente);
      } else if (equipamentos.length > 1) {
        this.mostrarModalEquipamentos(cliente);
      }
      showToast(`Cliente ${cliente.nome} carregado na OS`);
    }, 100);
  },

  async abrirOrcamento(cliente) {
    await window.PageLoader.load('orcamento');
    setTimeout(() => {
      window.Utils.setVal('orc_cliente', cliente.nome);
      window.Utils.setVal('orc_equipamento', '');
      window.Utils.setVal('orc_serie_hor', '');
      const equipamentos = Array.isArray(cliente.equipamentos) ? cliente.equipamentos : [];
      if (equipamentos.length) {
        const eq = equipamentos[0];
        window.Utils.setVal('orc_equipamento', `${eq.marca} ${eq.modelo || ''}`.trim());
        if (eq.serie) window.Utils.setVal('orc_serie_hor', eq.serie);
      }
      showToast(`Cliente ${cliente.nome} carregado no orçamento`);
    }, 100);
  },

  // ---------- Métodos existentes (com pequenos ajustes) ----------
  carregarDadosCliente(cliente) {
    window.Utils.setVal('cliente', cliente.nome);
    window.Utils.setVal('cnpj', cliente.cnpj || '');
    window.Utils.setVal('cidadeCliente', cliente.cidade || '');
    window.Utils.setVal('endereco', cliente.endereco || '');
    window.Utils.setVal('whatsappCliente', cliente.whatsapp || '');
  },

  carregarEquipamento(equip, cliente) {
    this.carregarDadosCliente(cliente);
    const marcaSelect = document.getElementById('marcaSelect');
    const marcaOutraDiv = document.getElementById('marcaOutraDiv');
    const marcaOutra = document.getElementById('marcaOutra');
    if (marcaSelect) {
      const marca = equip.marca || '';
      const marcasList = ["TOYOTA", "CLARK", "BYD", "PALETRANS", "LINDE", "HYSTER", "YALE", "CATERPILLAR", "KOMATSU", "MITSUBISHI", "NISSAN", "STILL", "CROWN", "JUNGHEINRICH", "TCM", "HYUNDAI", "DOOSAN", "HELI", "HANGCHA", "LONKING"];
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

  mostrarModalEquipamentos(cliente) {
    const modal = document.getElementById('equipModal');
    const list = document.getElementById('equipList');
    if (!modal || !list) return;
    list.innerHTML = '';
    const equipamentos = Array.isArray(cliente.equipamentos) ? cliente.equipamentos : [];
    equipamentos.forEach(eq => {
      const div = document.createElement('div');
      div.className = 'equip-option p-3 bg-[var(--bg-secondary)] rounded-lg mb-2 cursor-pointer hover:border-[var(--accent)] transition-all';
      div.innerHTML = `
        <div><strong><i class="fas fa-forklift"></i> ${window.esc(eq.marca || 'N/A')} ${window.esc(eq.modelo || '')}</strong></div>
        <div class="text-sm text-[var(--muted)]">Série: ${window.esc(eq.serie || 'N/A')} | Qtd: ${eq.qtd || 1}</div>
      `;
      div.onclick = () => {
        this.carregarEquipamento(eq, cliente);
        modal.style.display = 'none';
        // Não precisa navegar novamente porque já está na OS
      };
      list.appendChild(div);
    });
    modal.style.display = 'flex';
  },

  // Os demais métodos (renderTable, updateStats, save, edit, delete, exportCSV, importCSV, loadFromSync)
  // permanecem exatamente iguais ao código anterior (não repeti para economizar espaço)
  // ... (inserir aqui o restante do código igual ao anterior, sem alterações)
};

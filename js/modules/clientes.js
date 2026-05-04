// modules/clientes.js - Versão estável
window.ClientesModule = {
  editingId: null,

  init() {
    setTimeout(() => {
      this.renderTable();
      if (typeof this.updateStats === 'function') this.updateStats();
      this.loadEventListeners();
    }, 100);
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

  updateStats() {
    const totalClientes = window.State.clients.length;
    const elTotal = document.getElementById('statTotalClientes');
    if (elTotal) elTotal.innerText = totalClientes;
  },

  renderTable() {
    const tbody = document.getElementById('cad_tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!window.State.clients.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-[var(--muted)]">Nenhum cliente cadastrado</td></tr>';
      return;
    }

    window.State.clients.forEach(cliente => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td class="p-2">${window.esc(cliente.nome || '')}</td>
        <td class="p-2">${window.esc(cliente.cidade || '-')}</td>
        <td class="p-2">-</td>
        <td class="p-2">
          <button onclick="ClientesModule.selecionarCliente(${cliente.id})" class="btn btn-primary text-xs py-1 px-2">
            <i class="fas fa-arrow-right"></i> Selecionar
          </button>
        </td>
      `;
    });
  },

  filtrarClientes(busca) {
    if (!busca) { this.renderTable(); return; }
    const filtered = window.State.clients.filter(c =>
      (c.nome && c.nome.toLowerCase().includes(busca.toLowerCase())) ||
      (c.cidade && c.cidade.toLowerCase().includes(busca.toLowerCase()))
    );
    this.renderTable(filtered);
  },

  selecionarCliente(id) {
    const cliente = window.State.clients.find(c => c.id === id);
    if (!cliente) return;
    
    // Modal de escolha entre OS e Orçamento
    this.mostrarModalEscolha(cliente);
  },

  mostrarModalEscolha(cliente) {
    let modal = document.getElementById('modalEscolhaCliente');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'modalEscolhaCliente';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content bg-[var(--card)] rounded-2xl p-6 max-w-sm w-full text-center">
        <h3 class="text-xl font-bold text-[var(--accent)] mb-4">${window.esc(cliente.nome)}</h3>
        <p class="text-sm text-[var(--muted)] mb-6">O que deseja fazer?</p>
        <div class="flex flex-col gap-3">
          <button id="escolhaOS" class="btn btn-primary w-full"><i class="fas fa-clipboard-list"></i> Abrir OS</button>
          <button id="escolhaOrcamento" class="btn btn-info w-full"><i class="fas fa-file-invoice-dollar"></i> Criar Orçamento</button>
          <button id="escolhaCancelar" class="btn btn-secondary w-full">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('escolhaOS').onclick = () => {
      modal.remove();
      this.abrirOS(cliente);
    };
    document.getElementById('escolhaOrcamento').onclick = () => {
      modal.remove();
      this.abrirOrcamento(cliente);
    };
    document.getElementById('escolhaCancelar').onclick = () => modal.remove();
  },

  async abrirOS(cliente) {
    await window.PageLoader.load('os');
    setTimeout(() => {
      window.Utils.setVal('cliente', cliente.nome);
      window.Utils.setVal('cnpj', cliente.cnpj || '');
      window.Utils.setVal('cidadeCliente', cliente.cidade || '');
      window.Utils.setVal('endereco', cliente.endereco || '');
      window.Utils.setVal('whatsappCliente', cliente.whatsapp || '');
      showToast(`Cliente ${cliente.nome} carregado na OS`);
    }, 200);
  },

  async abrirOrcamento(cliente) {
    await window.PageLoader.load('orcamento');
    setTimeout(() => {
      window.Utils.setVal('orc_cliente', cliente.nome);
      showToast(`Cliente ${cliente.nome} carregado no orçamento`);
    }, 200);
  },

  async save() {
    const nome = document.getElementById('cad_nome')?.value.trim();
    if (!nome) { showToast('Nome do cliente é obrigatório', true); return; }
    
    const cliente = {
      id: this.editingId || Date.now(),
      nome: nome,
      cnpj: document.getElementById('cad_cnpj')?.value || '',
      endereco: document.getElementById('cad_endereco')?.value || '',
      cidade: document.getElementById('cad_cidade')?.value || '',
      telefone: document.getElementById('cad_telefone')?.value || '',
      whatsapp: document.getElementById('cad_whatsapp')?.value || '',
      email: document.getElementById('cad_email')?.value || '',
      equipamentos: []
    };
    
    if (this.editingId) {
      const index = window.State.clients.findIndex(c => c.id === this.editingId);
      if (index >= 0) window.State.clients[index] = cliente;
      this.editingId = null;
      document.getElementById('cad_btnCancelar').style.display = 'none';
    } else {
      window.State.clients.push(cliente);
    }
    
    window.Storage.saveClients();
    this.clearForm();
    this.renderTable();
    this.updateStats();
    showToast('Cliente salvo');
  },

  edit(id) {
    const cliente = window.State.clients.find(c => c.id === id);
    if (!cliente) return;
    
    this.editingId = id;
    document.getElementById('cad_nome').value = cliente.nome || '';
    document.getElementById('cad_cnpj').value = cliente.cnpj || '';
    document.getElementById('cad_endereco').value = cliente.endereco || '';
    document.getElementById('cad_cidade').value = cliente.cidade || '';
    document.getElementById('cad_telefone').value = cliente.telefone || '';
    document.getElementById('cad_whatsapp').value = cliente.whatsapp || '';
    document.getElementById('cad_email').value = cliente.email || '';
    document.getElementById('cad_btnCancelar').style.display = 'inline-flex';
  },

  delete(id) {
    if (!confirm('Excluir este cliente?')) return;
    window.State.clients = window.State.clients.filter(c => c.id !== id);
    window.Storage.saveClients();
    this.renderTable();
    this.updateStats();
    showToast('Cliente excluído');
  },

  cancelEdit() {
    this.editingId = null;
    this.clearForm();
    document.getElementById('cad_btnCancelar').style.display = 'none';
  },

  clearForm() {
    const fields = ['cad_nome', 'cad_cnpj', 'cad_endereco', 'cad_cidade', 'cad_telefone', 'cad_whatsapp', 'cad_email', 'cad_responsavel_nome', 'cad_responsavel_telefone'];
    fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  },

  exportCSV() {
    let csv = "Nome,CNPJ,Endereco,Cidade,Telefone,WhatsApp,E-mail\n";
    window.State.clients.forEach(c => {
      csv += `"${c.nome || ''}",${c.cnpj || ''},"${c.endereco || ''}","${c.cidade || ''}",${c.telefone || ''},${c.whatsapp || ''},${c.email || ''}\n`;
    });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${window.Utils.dataHojeISO()}.csv`;
    link.click();
  },

  importCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const lines = ev.target.result.split('\n');
        for (let i = 1; i < lines.length; i++) {
          const cols = window.Utils.parseCSVLine(lines[i]);
          if (cols[0]) {
            window.State.clients.push({
              id: Date.now() + i,
              nome: cols[0]?.trim() || '',
              cnpj: cols[1] || '',
              endereco: cols[2] || '',
              cidade: cols[3] || '',
              telefone: cols[4] || '',
              whatsapp: cols[5] || '',
              email: cols[6] || '',
              equipamentos: []
            });
          }
        }
        window.Storage.saveClients();
        this.renderTable();
        this.updateStats();
        showToast('Clientes importados');
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  },

  loadFromSync(clientes) {
    if (Array.isArray(clientes) && clientes.length) {
      window.State.clients = clientes;
      window.Storage.saveClients();
      this.renderTable();
      this.updateStats();
    }
  }
};

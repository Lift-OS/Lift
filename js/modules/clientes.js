// modules/clientes.js - Módulo de Clientes (com carregamento de equipamento)
window.ClientesModule = {
  editingId: null,
  clienteSelecionado: null,
  equipamentoSelecionado: null,

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
      } catch(e) { console.warn('Erro ao parsear equipamentos', e); }
    }
    cliente.equipamentos = [];
  },

  init() {
    setTimeout(() => {
      window.State.clients.forEach(c => this.normalizarEquipamentos(c));
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
      const equipArray = Array.isArray(cliente.equipamentos) ? cliente.equipamentos : [];
      const marcas = equipArray.map(e => e.marca || '').join(', ');
      const row = tbody.insertRow();
      row.innerHTML = `
        <td class="p-2">${window.esc(cliente.nome || '')}</td>
        <td class="p-2">${window.esc(cliente.cidade || '-')}</td>
        <td class="p-2">${window.esc(marcas) || '-'}</td>
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
    this.clienteSelecionado = cliente;
    
    const equipamentos = Array.isArray(cliente.equipamentos) ? cliente.equipamentos : [];
    if (equipamentos.length === 0) {
      this.mostrarModalEscolha(cliente, null);
    } else if (equipamentos.length === 1) {
      this.mostrarModalEscolha(cliente, equipamentos[0]);
    } else {
      this.mostrarModalEquipamentos(cliente, equipamentos);
    }
  },

  mostrarModalEquipamentos(cliente, equipamentos) {
    let modal = document.getElementById('equipModal');
    const list = document.getElementById('equipList');
    if (!modal || !list) return;
    
    list.innerHTML = '';
    modal.style.display = 'flex';
    
    equipamentos.forEach(eq => {
      const div = document.createElement('div');
      div.className = 'equip-option p-3 bg-[var(--bg-secondary)] rounded-lg mb-2 cursor-pointer hover:border-[var(--accent)] transition-all';
      div.innerHTML = `
        <div><strong>${window.esc(eq.marca || 'N/A')} ${window.esc(eq.modelo || '')}</strong></div>
        <div class="text-sm text-[var(--muted)]">Série: ${window.esc(eq.serie || 'N/A')} | Combustível: ${window.esc(eq.combustivel || 'N/A')}</div>
      `;
      div.onclick = () => {
        modal.style.display = 'none';
        this.mostrarModalEscolha(cliente, eq);
      };
      list.appendChild(div);
    });
  },

  mostrarModalEscolha(cliente, equipamento) {
    let modal = document.getElementById('modalEscolhaCliente');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'modalEscolhaCliente';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content bg-[var(--card)] rounded-2xl p-6 max-w-sm w-full text-center">
        <h3 class="text-xl font-bold text-[var(--accent)] mb-2">${window.esc(cliente.nome)}</h3>
        ${equipamento ? `<p class="text-sm text-[var(--success)] mb-4">Equipamento: ${window.esc(equipamento.marca)} ${window.esc(equipamento.modelo || '')}</p>` : '<p class="text-sm text-[var(--muted)] mb-4">Nenhum equipamento cadastrado</p>'}
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
      this.abrirOS(cliente, equipamento);
    };
    document.getElementById('escolhaOrcamento').onclick = () => {
      modal.remove();
      this.abrirOrcamento(cliente, equipamento);
    };
    document.getElementById('escolhaCancelar').onclick = () => modal.remove();
  },

  async abrirOS(cliente, equipamento) {
    await window.PageLoader.load('os');
    setTimeout(() => {
      // Dados do cliente
      window.Utils.setVal('cliente', cliente.nome);
      window.Utils.setVal('cnpj', cliente.cnpj || '');
      window.Utils.setVal('cidadeCliente', cliente.cidade || '');
      window.Utils.setVal('endereco', cliente.endereco || '');
      window.Utils.setVal('whatsappCliente', cliente.whatsapp || '');
      
      // Dados do equipamento (se existir)
      if (equipamento) {
        // Marca
        const marcaSelect = document.getElementById('marcaSelect');
        const marcaOutraDiv = document.getElementById('marcaOutraDiv');
        const marcaOutra = document.getElementById('marcaOutra');
        const marca = equipamento.marca || '';
        const marcasList = ["TOYOTA","CLARK","BYD","PALETRANS","LINDE","HYSTER","YALE","CATERPILLAR","KOMATSU","MITSUBISHI","NISSAN","STILL","CROWN","JUNGHEINRICH","TCM","HYUNDAI","DOOSAN","HELI","HANGCHA","LONKING"];
        
        if (marcaSelect) {
          if (marcasList.includes(marca)) {
            marcaSelect.value = marca;
            if (marcaOutraDiv) marcaOutraDiv.style.display = 'none';
          } else if (marca) {
            marcaSelect.value = 'OUTRA';
            if (marcaOutraDiv) marcaOutraDiv.style.display = 'block';
            if (marcaOutra) marcaOutra.value = marca;
          }
        }
        
        // Modelo
        window.Utils.setVal('modelo', equipamento.modelo || '');
        
        // Número de Série
        window.Utils.setVal('numSerie', equipamento.serie || '');
        
        // Combustível
        if (equipamento.combustivel) {
          window.Utils.setVal('combustivel', equipamento.combustivel);
        }
        
        showToast(`Equipamento ${equipamento.marca} ${equipamento.modelo} carregado`);
      }
      
      showToast(`Cliente ${cliente.nome} carregado na OS`);
    }, 300);
  },

  async abrirOrcamento(cliente, equipamento) {
    await window.PageLoader.load('orcamento');
    setTimeout(() => {
      // Dados do cliente
      window.Utils.setVal('orc_cliente', cliente.nome);
      
      // Dados do equipamento (se existir)
      if (equipamento) {
        // Equipamento (Marca + Modelo)
        const marcaModelo = `${equipamento.marca || ''} ${equipamento.modelo || ''}`.trim();
        window.Utils.setVal('orc_equipamento', marcaModelo);
        
        // Série e Combustível
        const serieComb = `Série: ${equipamento.serie || 'N/A'} | Combustível: ${equipamento.combustivel || 'N/A'}`;
        window.Utils.setVal('orc_serie_combustivel', serieComb);
        
        showToast(`Equipamento ${marcaModelo} carregado`);
      }
      
      showToast(`Cliente ${cliente.nome} carregado no orçamento`);
    }, 300);
  },

  async save() {
    if (!window.Auth.can('clientes_cadastrar')) { showToast('Sem permissão', true); return; }
    const nome = document.getElementById('cad_nome')?.value.trim();
    if (!nome) { showToast('Nome obrigatório', true); return; }
    
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
    if (!window.Auth.can('clientes_editar')) { showToast('Sem permissão', true); return; }
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
    if (!window.Auth.can('clientes_excluir')) { showToast('Sem permissão', true); return; }
    if (!confirm('Excluir cliente?')) return;
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
    const fields = ['cad_nome', 'cad_cnpj', 'cad_endereco', 'cad_cidade', 'cad_telefone', 'cad_whatsapp', 'cad_email'];
    fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  },

  exportCSV() {
    if (!window.Auth.can('clientes_exportar_csv')) return;
    let csv = "Nome,CNPJ,Endereco,Cidade,Telefone,WhatsApp,E-mail\n";
    window.State.clients.forEach(c => {
      csv += `"${c.nome || ''}",${c.cnpj || ''},"${c.endereco || ''}","${c.cidade || ''}",${c.telefone || ''},${c.whatsapp || ''},${c.email || ''}\n`;
    });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${window.Utils.dataHojeISO()}.csv`;
    link.click();
    showToast('Clientes exportados');
  },

  importCSV() {
    if (!window.Auth.can('clientes_importar_csv')) return;
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

// modules/clientes.js - Módulo de Clientes (completo e estável)
window.ClientesModule = {
  editingId: null,
  modalEscolha: null,
  modalEquipamentos: null,

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

  removerModal() {
    if (this.modalEscolha && this.modalEscolha.parentNode) this.modalEscolha.parentNode.removeChild(this.modalEscolha);
    if (this.modalEquipamentos && this.modalEquipamentos.parentNode) this.modalEquipamentos.parentNode.removeChild(this.modalEquipamentos);
    const m1 = document.getElementById('modalEscolhaCliente'); if(m1) m1.remove();
    const m2 = document.getElementById('modalEquipamentosCliente'); if(m2) m2.remove();
    this.modalEscolha = null; this.modalEquipamentos = null;
  },

  init() {
    setTimeout(() => {
      window.State.clients.forEach(c => this.normalizarEquipamentos(c));
      this.renderTable();
      if (typeof this.updateStats === 'function') this.updateStats();
      this.loadEventListeners();
      this.removerModal();
    }, 200);
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
    let totalEquipamentos = 0;
    const clientesComOS = new Set();
    let totalOS = 0, osAbertas = 0, osAprovadas = 0;
    window.State.clients.forEach(c => {
      const eq = Array.isArray(c.equipamentos) ? c.equipamentos : [];
      totalEquipamentos += eq.length;
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

  renderTable(clientesList) {
    const list = clientesList || window.State.clients;
    const tbody = document.getElementById('cad_tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-[var(--muted)]">Nenhum cliente cadastrado</td></tr>';
      return;
    }
    const podeEditar = window.Auth.can('clientes_editar');
    const podeExcluir = window.Auth.can('clientes_excluir');
    list.forEach(cliente => {
      const equipArray = Array.isArray(cliente.equipamentos) ? cliente.equipamentos : [];
      const marcas = equipArray.map(e => e.marca).join(', ');
      let acoes = `<button onclick="ClientesModule.select(${cliente.id})" class="btn btn-primary text-xs py-1 px-2"><i class="fas fa-arrow-right"></i> Selecionar</button>`;
      if (podeEditar) acoes += ` <i class="fas fa-edit text-blue-400 cursor-pointer ml-2" onclick="ClientesModule.edit(${cliente.id})"></i>`;
      if (podeExcluir) acoes += ` <i class="fas fa-trash text-red-400 cursor-pointer ml-2" onclick="ClientesModule.delete(${cliente.id})"></i>`;
      const row = tbody.insertRow();
      row.innerHTML = `
        <td class="p-2 font-medium">${window.esc(cliente.nome)}</td>
        <td class="p-2">${window.esc(cliente.cidade || '-')}</td>
        <td class="p-2">${window.esc(marcas || '-')}</td>
        <td class="p-2">${acoes}</td>
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
    document.getElementById('escolhaOS').onclick = () => { this.removerModal(); this.abrirOS(cliente); };
    document.getElementById('escolhaOrcamento').onclick = () => { this.removerModal(); this.abrirOrcamento(cliente); };
    document.getElementById('escolhaCancelar').onclick = () => this.removerModal();
  },

  mostrarModalEquipamentosCliente(cliente, destino) {
    const equipamentos = Array.isArray(cliente.equipamentos) ? cliente.equipamentos : [];
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
    const equipamentos = Array.isArray(cliente.equipamentos) ? cliente.equipamentos : [];
    if (equipamentos.length === 1) this._finalizarAbrirOS(cliente, equipamentos[0]);
    else if (equipamentos.length > 1) this.mostrarModalEquipamentosCliente(cliente, 'os');
    else this._finalizarAbrirOS(cliente, null);
  },

  _finalizarAbrirOS(cliente, equip) {
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
    const equipamentos = Array.isArray(cliente.equipamentos) ? cliente.equipamentos : [];
    if (equipamentos.length === 1) this._finalizarAbrirOrcamento(cliente, equipamentos[0]);
    else if (equipamentos.length > 1) this.mostrarModalEquipamentosCliente(cliente, 'orcamento');
    else this._finalizarAbrirOrcamento(cliente, null);
  },

  _finalizarAbrirOrcamento(cliente, equip) {
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

  tryRestaurarDados() {
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

  async save() {
    if (!window.Auth.can('clientes_cadastrar')) { showToast('Apenas administrador pode cadastrar clientes', true); return; }
    const nome = document.getElementById('cad_nome')?.value.trim();
    if (!nome) { showToast('Nome do cliente é obrigatório', true); return; }
    const equipamentos = [];
    const equipItems = document.querySelectorAll('#equipamentosList .equip-item');
    equipItems.forEach(item => {
      const marcaSelect = item.querySelector('.equip-marca');
      const outraMarca = item.querySelector('.outra-marca');
      let marca = marcaSelect?.value || '';
      if (marca === 'OUTRA' && outraMarca) marca = outraMarca.value.toUpperCase();
      if (marca) {
        equipamentos.push({
          marca: marca,
          modelo: item.querySelector('.equip-modelo')?.value || '',
          serie: item.querySelector('.equip-serie')?.value || '',
          qtd: parseInt(item.querySelector('.equip-qtd')?.value) || 1,
          combustivel: item.querySelector('.equip-combustivel')?.value || ''
        });
      }
    });
    const cliente = {
      id: this.editingId || Date.now(),
      nome: nome,
      cnpj: document.getElementById('cad_cnpj')?.value || '',
      endereco: document.getElementById('cad_endereco')?.value || '',
      cidade: document.getElementById('cad_cidade')?.value || '',
      telefone: document.getElementById('cad_telefone')?.value || '',
      whatsapp: document.getElementById('cad_whatsapp')?.value || '',
      email: document.getElementById('cad_email')?.value || '',
      responsavel_nome: document.getElementById('cad_responsavel_nome')?.value || '',
      responsavel_telefone: document.getElementById('cad_responsavel_telefone')?.value || '',
      equipamentos: equipamentos
    };
    if (this.editingId) {
      const index = window.State.clients.findIndex(c => c.id === this.editingId);
      if (index >= 0) window.State.clients[index] = cliente;
      showToast('Cliente atualizado');
      this.editingId = null;
      document.getElementById('cad_btnCancelar').style.display = 'none';
    } else {
      window.State.clients.push(cliente);
      showToast('Cliente cadastrado');
    }
    window.Storage.saveClients();
    this.clearForm();
    this.renderTable();
    this.updateStats();
    if (window.GoogleSheets && window.Auth.can('sincronizar')) await window.GoogleSheets.syncSingleCliente(cliente);
  },

  edit(id) {
    if (!window.Auth.can('clientes_editar')) { showToast('Apenas administrador pode editar', true); return; }
    const cliente = window.State.clients.find(c => c.id === id);
    if (!cliente) return;
    this.normalizarEquipamentos(cliente);
    this.editingId = id;
    document.getElementById('cad_nome').value = cliente.nome || '';
    document.getElementById('cad_cnpj').value = cliente.cnpj || '';
    document.getElementById('cad_endereco').value = cliente.endereco || '';
    document.getElementById('cad_cidade').value = cliente.cidade || '';
    document.getElementById('cad_telefone').value = cliente.telefone || '';
    document.getElementById('cad_whatsapp').value = cliente.whatsapp || '';
    document.getElementById('cad_email').value = cliente.email || '';
    document.getElementById('cad_responsavel_nome').value = cliente.responsavel_nome || '';
    document.getElementById('cad_responsavel_telefone').value = cliente.responsavel_telefone || '';
    const container = document.getElementById('equipamentosList');
    if (container) container.innerHTML = '';
    const equipamentos = Array.isArray(cliente.equipamentos) ? cliente.equipamentos : [];
    equipamentos.forEach(eq => this.adicionarCampoEquipamento(eq.marca, eq.modelo, eq.serie, eq.qtd, eq.combustivel));
    document.getElementById('cad_btnCancelar').style.display = 'inline-flex';
    document.getElementById('clienteFormCard')?.scrollIntoView({ behavior: 'smooth' });
  },

  delete(id) {
    if (!window.Auth.can('clientes_excluir')) { showToast('Apenas administrador pode excluir', true); return; }
    if (!confirm('Excluir este cliente permanentemente?')) return;
    window.State.clients = window.State.clients.filter(c => c.id !== id);
    window.Storage.saveClients();
    this.renderTable();
    this.updateStats();
    showToast('Cliente excluído');
  },

  cancelEdit() { this.editingId = null; this.clearForm(); document.getElementById('cad_btnCancelar').style.display = 'none'; },
  clearForm() {
    const fields = ['cad_nome','cad_cnpj','cad_endereco','cad_cidade','cad_telefone','cad_whatsapp','cad_email','cad_responsavel_nome','cad_responsavel_telefone'];
    fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const container = document.getElementById('equipamentosList'); if (container) container.innerHTML = '';
  },

  adicionarCampoEquipamento(marca, modelo, serie, qtd, combustivel) {
    const container = document.getElementById('equipamentosList');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'equip-item grid grid-cols-1 md:grid-cols-6 gap-2 p-2 bg-[var(--bg-secondary)] rounded-lg mb-2';
    const marcasOptions = `
      <option value="">Selecione</option>
      <option value="TOYOTA" ${marca === 'TOYOTA' ? 'selected' : ''}>TOYOTA</option>
      <option value="CLARK" ${marca === 'CLARK' ? 'selected' : ''}>CLARK</option>
      <option value="BYD" ${marca === 'BYD' ? 'selected' : ''}>BYD</option>
      <option value="PALETRANS" ${marca === 'PALETRANS' ? 'selected' : ''}>PALETRANS</option>
      <option value="LINDE" ${marca === 'LINDE' ? 'selected' : ''}>LINDE</option>
      <option value="HYSTER" ${marca === 'HYSTER' ? 'selected' : ''}>HYSTER</option>
      <option value="YALE" ${marca === 'YALE' ? 'selected' : ''}>YALE</option>
      <option value="CATERPILLAR" ${marca === 'CATERPILLAR' ? 'selected' : ''}>CATERPILLAR</option>
      <option value="KOMATSU" ${marca === 'KOMATSU' ? 'selected' : ''}>KOMATSU</option>
      <option value="MITSUBISHI" ${marca === 'MITSUBISHI' ? 'selected' : ''}>MITSUBISHI</option>
      <option value="NISSAN" ${marca === 'NISSAN' ? 'selected' : ''}>NISSAN</option>
      <option value="OUTRA" ${marca === 'OUTRA' || (marca && !['TOYOTA','CLARK','BYD','PALETRANS','LINDE','HYSTER','YALE','CATERPILLAR','KOMATSU','MITSUBISHI','NISSAN'].includes(marca)) ? 'selected' : ''}>OUTRA</option>
    `;
    div.innerHTML = `
      <select class="form-input equip-marca">${marcasOptions}</select>
      <div class="outra-marca-container" style="display:${marca && !['TOYOTA','CLARK','BYD','PALETRANS','LINDE','HYSTER','YALE','CATERPILLAR','KOMATSU','MITSUBISHI','NISSAN'].includes(marca) ? 'block' : 'none'}">
        <input type="text" placeholder="Digite a marca" class="form-input outra-marca" value="${window.esc(marca && !['TOYOTA','CLARK','BYD','PALETRANS','LINDE','HYSTER','YALE','CATERPILLAR','KOMATSU','MITSUBISHI','NISSAN'].includes(marca) ? marca : '')}">
      </div>
      <input type="text" placeholder="Modelo" class="form-input equip-modelo" value="${window.esc(modelo || '')}">
      <input type="text" placeholder="Série" class="form-input equip-serie" value="${window.esc(serie || '')}">
      <input type="number" placeholder="Qtd" class="form-input equip-qtd" value="${qtd || 1}">
      <select class="form-input equip-combustivel">
        <option value="">Combustível</option>
        <option value="eletrico" ${combustivel === 'eletrico' ? 'selected' : ''}>Elétrico</option>
        <option value="diesel" ${combustivel === 'diesel' ? 'selected' : ''}>Diesel</option>
        <option value="gasolina" ${combustivel === 'gasolina' ? 'selected' : ''}>Gasolina</option>
        <option value="glp" ${combustivel === 'glp' ? 'selected' : ''}>GLP</option>
      </select>
      <button type="button" class="text-red-500" onclick="this.closest('.equip-item').remove()"><i class="fas fa-trash"></i></button>
    `;
    const marcaSelect = div.querySelector('.equip-marca');
    const outraDiv = div.querySelector('.outra-marca-container');
    marcaSelect.onchange = () => { outraDiv.style.display = marcaSelect.value === 'OUTRA' ? 'block' : 'none'; };
    container.appendChild(div);
  },

  exportCSV() {
    if (!window.Auth.can('clientes_exportar_csv')) { showToast('Apenas administrador pode exportar', true); return; }
    let csv = "Nome,CNPJ,Endereco,Cidade,Telefone,WhatsApp,E-mail,Responsavel,TelResp,Marcas\n";
    window.State.clients.forEach(c => {
      const equipArray = Array.isArray(c.equipamentos) ? c.equipamentos : [];
      const marcas = equipArray.map(e => e.marca).join(';');
      csv += `"${c.nome || ''}",${c.cnpj || ''},"${c.endereco || ''}","${c.cidade || ''}",${c.telefone || ''},${c.whatsapp || ''},${c.email || ''},"${c.responsavel_nome || ''}",${c.responsavel_telefone || ''},"${marcas}"\n`;
    });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${window.Utils.dataHojeISO()}.csv`;
    link.click();
    showToast('Clientes exportados');
  },

  importCSV() {
    if (!window.Auth.can('clientes_importar_csv')) { showToast('Apenas administrador pode importar', true); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const lines = ev.target.result.split('\n');
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
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
              responsavel_nome: cols[7] || '',
              responsavel_telefone: cols[8] || '',
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
      clientes.forEach(c => this.normalizarEquipamentos(c));
      window.State.clients = clientes;
      window.Storage.saveClients();
      this.renderTable();
      this.updateStats();
    }
  }
};

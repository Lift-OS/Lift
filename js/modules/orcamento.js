// modules/orcamento.js - Módulo de Orçamentos
window.OrcamentoModule = {
  state: {
    itens: [],
    editId: null
  },

  init() {
    this.loadEventListeners();
    this.novo();
    this.renderLista();
    this.updateStats();
    this.preencherClientes();
    this.preencherTecnicos();
  },

  loadEventListeners() {
    const btnNovo = document.getElementById('btnOrcNovo');
    if (btnNovo) btnNovo.onclick = () => this.novo();

    const btnLimpar = document.getElementById('btnOrcLimpar');
    if (btnLimpar) btnLimpar.onclick = () => this.limparFormulario();

    const desconto = document.getElementById('orcDesconto');
    if (desconto) desconto.onchange = () => this.calcularTotais();

    const clienteInput = document.getElementById('orc_cliente');
    if (clienteInput) {
      clienteInput.onchange = () => this.carregarDadosCliente(clienteInput.value);
    }
  },

  preencherClientes() {
    const datalist = document.getElementById('orcClientesList');
    if (!datalist) return;
    datalist.innerHTML = '';
    window.State.clients.forEach(cliente => {
      const option = document.createElement('option');
      option.value = cliente.nome;
      datalist.appendChild(option);
    });
  },

  preencherTecnicos() {
    const select = document.getElementById('orc_tecnico');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione</option>';
    const users = window.Auth.getUsers();
    users.forEach(user => {
      if (user.nivel === 'tecnico' || user.nivel === 'admin') {
        select.innerHTML += `<option value="${window.esc(user.login)}">${window.esc(user.nome)}</option>`;
      }
    });
  },

  carregarDadosCliente(nome) {
    const cliente = window.State.clients.find(c => c.nome === nome);
    if (!cliente) return;
    // Preenche equipamento se disponível
    if (cliente.equipamentos && cliente.equipamentos.length) {
      const eq = cliente.equipamentos[0];
      window.Utils.setVal('orc_equipamento', `${eq.marca} ${eq.modelo || ''}`.trim());
      if (eq.serie) window.Utils.setVal('orc_serie_hor', eq.serie);
    }
  },

  novo() {
    window.Utils.setVal('orc_editId', '');
    this.state.itens = [];
    window.Utils.setVal('orc_numero', window.Utils.generateOrcNumber());
    window.Utils.setVal('orc_data', window.Utils.dataHojeISO());
    const validade = new Date();
    validade.setDate(validade.getDate() + 15);
    window.Utils.setVal('orc_validade', validade.toISOString().split('T')[0]);
    
    ['orc_cliente', 'orc_equipamento', 'orc_serie_hor', 'orc_descricao', 'orc_tecnico', 
     'orc_observacoes', 'orc_assinante', 'orc_assinante_cpf', 'assinaturaOrcData'].forEach(id => {
      window.Utils.setVal(id, '');
    });
    window.Utils.setVal('orcDesconto', '0');
    
    const title = document.getElementById('orcFormTitle');
    if (title) title.innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Novo Orçamento';
    
    this.esconderBotoesAcao();
    this.renderItens();
    this.calcularTotais();
    if (window.SignatureOrc) window.SignatureOrc.clear();
  },

  limparFormulario() {
    if (confirm('Limpar todos os campos do formulário? As alterações não salvas serão perdidas.')) {
      this.novo();
      showToast('Formulário limpo');
    }
  },

  esconderBotoesAcao() {
    const btnAprovar = document.getElementById('btnOrcAprovar');
    const btnRejeitar = document.getElementById('btnOrcRejeitar');
    const btnGerarOS = document.getElementById('btnOrcGerarOS');
    if (btnAprovar) btnAprovar.style.display = 'none';
    if (btnRejeitar) btnRejeitar.style.display = 'none';
    if (btnGerarOS) btnGerarOS.style.display = 'none';
  },

  addItem(descricao, tipo, quantidade, valorUnitario) {
    this.state.itens.push({
      descricao: descricao || '',
      tipo: tipo || 'peca',
      quantidade: parseInt(quantidade) || 1,
      valor_unitario: parseFloat(valorUnitario) || 0
    });
    this.renderItens();
    this.calcularTotais();
  },

  removeItem(index) {
    this.state.itens.splice(index, 1);
    this.renderItens();
    this.calcularTotais();
  },

  renderItens() {
    const container = document.getElementById('orcItensLista');
    if (!container) return;
    
    if (!this.state.itens.length) {
      container.innerHTML = '<div class="text-center py-4 text-[var(--muted)] text-sm">Nenhum item adicionado</div>';
      return;
    }

    let html = '';
    this.state.itens.forEach((item, i) => {
      html += `
        <div class="orc-item-row grid grid-cols-12 gap-2 mb-2 items-center">
          <input type="text" class="form-input text-sm col-span-4" value="${window.esc(item.descricao)}" placeholder="Descrição" 
                 onchange="OrcamentoModule.state.itens[${i}].descricao = this.value; OrcamentoModule.calcularTotais()">
          <select class="form-input text-sm col-span-2" onchange="OrcamentoModule.state.itens[${i}].tipo = this.value; OrcamentoModule.calcularTotais()">
            <option value="peca" ${item.tipo === 'peca' ? 'selected' : ''}>Peça</option>
            <option value="servico" ${item.tipo === 'servico' ? 'selected' : ''}>Serviço</option>
            <option value="mobra" ${item.tipo === 'mobra' ? 'selected' : ''}>Mão de Obra</option>
            <option value="outro" ${item.tipo === 'outro' ? 'selected' : ''}>Outro</option>
          </select>
          <input type="number" class="form-input text-sm text-center col-span-1" value="${item.quantidade}" min="1" 
                 onchange="OrcamentoModule.state.itens[${i}].quantidade = parseInt(this.value) || 1; OrcamentoModule.calcularTotais()">
          <input type="number" class="form-input text-sm text-right col-span-2" value="${item.valor_unitario}" step="0.01" placeholder="0,00" 
                 onchange="OrcamentoModule.state.itens[${i}].valor_unitario = parseFloat(this.value) || 0; OrcamentoModule.calcularTotais()">
          <div class="font-mono text-sm font-bold text-right col-span-2">${window.Utils.moneyFormat(item.quantidade * item.valor_unitario)}</div>
          <button onclick="OrcamentoModule.removeItem(${i})" class="text-red-400 hover:text-red-300 text-lg col-span-1"><i class="fas fa-times-circle"></i></button>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  calcularTotais() {
    let subtotal = 0;
    this.state.itens.forEach(item => {
      subtotal += item.quantidade * item.valor_unitario;
    });
    
    const descontoPct = parseFloat(window.Utils.getVal('orcDesconto')) || 0;
    const valorDesconto = subtotal * descontoPct / 100;
    const total = subtotal - valorDesconto;
    
    const subtotalEl = document.getElementById('orcSubtotal');
    const descontoEl = document.getElementById('orcValorDesconto');
    const totalEl = document.getElementById('orcTotalFinal');
    
    if (subtotalEl) subtotalEl.innerText = window.Utils.moneyFormat(subtotal);
    if (descontoEl) descontoEl.innerText = `- ${window.Utils.moneyFormat(valorDesconto)}`;
    if (totalEl) totalEl.innerText = window.Utils.moneyFormat(total);
  },

  coletarDados() {
    let subtotal = 0;
    this.state.itens.forEach(item => {
      subtotal += item.quantidade * item.valor_unitario;
    });
    const descontoPct = parseFloat(window.Utils.getVal('orcDesconto')) || 0;
    const valorDesconto = subtotal * descontoPct / 100;
    
    return {
      id: parseInt(window.Utils.getVal('orc_editId')) || Date.now(),
      numero: window.Utils.getVal('orc_numero'),
      data: window.Utils.getVal('orc_data'),
      validade: window.Utils.getVal('orc_validade'),
      cliente: window.Utils.getVal('orc_cliente').trim(),
      equipamento: window.Utils.getVal('orc_equipamento').trim(),
      serie_horimetro: window.Utils.getVal('orc_serie_hor').trim(),
      tecnico: window.Utils.getVal('orc_tecnico'),
      descricao: window.Utils.getVal('orc_descricao'),
      itens: this.state.itens.slice(),
      desconto: descontoPct,
      subtotal: subtotal,
      valor_desconto: valorDesconto,
      total: subtotal - valorDesconto,
      status: 'rascunho',
      assinatura: window.Utils.getVal('assinaturaOrcData'),
      assinante: window.Utils.getVal('orc_assinante').trim(),
      assinante_cpf: window.Utils.getVal('orc_assinante_cpf').trim(),
      observacoes: window.Utils.getVal('orc_observacoes'),
      os_gerada: ''
    };
  },

  async salvarRascunho() {
    if (!this.state.itens.length) {
      showToast('Adicione pelo menos 1 item', true);
      return;
    }
    if (!window.Utils.getVal('orc_cliente').trim()) {
      showToast('Cliente é obrigatório', true);
      return;
    }
    
    const dados = this.coletarDados();
    dados.status = 'rascunho';
    
    const editId = parseInt(window.Utils.getVal('orc_editId'));
    if (editId) {
      const index = window.State.orcamentos.findIndex(o => o.id === editId);
      if (index >= 0) window.State.orcamentos[index] = dados;
    } else {
      window.State.orcamentos.unshift(dados);
    }
    
    window.Storage.saveOrcamentos();
    this.renderLista();
    this.updateStats();
    showToast('Rascunho salvo');
    
    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      await window.GoogleSheets.syncSingleOrcamento(dados);
    }
  },

  async enviarCliente() {
    if (!this.state.itens.length) {
      showToast('Adicione pelo menos 1 item', true);
      return;
    }
    if (!window.Utils.getVal('orc_cliente').trim()) {
      showToast('Cliente é obrigatório', true);
      return;
    }
    
    const dados = this.coletarDados();
    dados.status = 'enviado';
    
    const editId = parseInt(window.Utils.getVal('orc_editId'));
    if (editId) {
      const index = window.State.orcamentos.findIndex(o => o.id === editId);
      if (index >= 0) window.State.orcamentos[index] = dados;
    } else {
      window.State.orcamentos.unshift(dados);
    }
    
    window.Storage.saveOrcamentos();
    this.renderLista();
    this.updateStats();
    showToast('Orçamento enviado ao cliente');
    
    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      await window.GoogleSheets.syncSingleOrcamento(dados);
    }
  },

  async aprovarOrcamento() {
    const editId = parseInt(window.Utils.getVal('orc_editId'));
    if (!editId) {
      showToast('Nenhum orçamento selecionado', true);
      return;
    }
    
    const assinatura = window.Utils.getVal('assinaturaOrcData');
    const assinante = window.Utils.getVal('orc_assinante').trim();
    
    if (!assinatura) {
      showToast('Cliente deve assinar o orçamento', true);
      return;
    }
    if (!assinante) {
      showToast('Nome do assinante é obrigatório', true);
      return;
    }
    
    const index = window.State.orcamentos.findIndex(o => o.id === editId);
    if (index === -1) return;
    
    window.State.orcamentos[index].status = 'aprovado';
    window.State.orcamentos[index].assinatura = assinatura;
    window.State.orcamentos[index].assinante = assinante;
    window.State.orcamentos[index].assinante_cpf = window.Utils.getVal('orc_assinante_cpf').trim();
    
    window.Storage.saveOrcamentos();
    this.renderLista();
    this.updateStats();
    showToast('Orçamento APROVADO!');
    
    const btnGerarOS = document.getElementById('btnOrcGerarOS');
    if (btnGerarOS) btnGerarOS.style.display = 'inline-flex';
    
    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      await window.GoogleSheets.syncSingleOrcamento(window.State.orcamentos[index]);
    }
  },

  async rejeitarOrcamento() {
    const editId = parseInt(window.Utils.getVal('orc_editId'));
    if (!editId) return;
    
    const motivo = prompt('Motivo da rejeição:');
    if (motivo === null) return;
    
    const index = window.State.orcamentos.findIndex(o => o.id === editId);
    if (index === -1) return;
    
    window.State.orcamentos[index].status = 'rejeitado';
    window.State.orcamentos[index].observacoes += (window.State.orcamentos[index].observacoes ? '\n' : '') + `REJEITADO: ${motivo}`;
    
    window.Storage.saveOrcamentos();
    this.renderLista();
    this.updateStats();
    showToast('Orçamento rejeitado');
    
    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      await window.GoogleSheets.syncSingleOrcamento(window.State.orcamentos[index]);
    }
  },

  gerarOS() {
    const editId = parseInt(window.Utils.getVal('orc_editId'));
    const orc = window.State.orcamentos.find(o => o.id === editId);
    if (!orc) {
      showToast('Orçamento não encontrado', true);
      return;
    }
    if (orc.os_gerada) {
      showToast(`OS já gerada: ${orc.os_gerada}`, true);
      return;
    }
    
    const osNum = window.Utils.generateOSNumber();
    const pecasText = orc.itens.map(it => `- ${it.descricao} (${it.tipo}): ${it.quantidade}x ${window.Utils.moneyFormat(it.valor_unitario)} = ${window.Utils.moneyFormat(it.quantidade * it.valor_unitario)}`).join('\n');
    
    const osData = {
      numeroOS: osNum,
      dataOS: window.Utils.dataHojeISO(),
      cliente: orc.cliente,
      status: 'abertura',
      tipoChamado: 'orcamento',
      horasTotais: '0h',
      totalGeral: '00:00',
      descricaoServico: orc.descricao,
      pecasAplicadas: pecasText,
      pendencias: '',
      relatoCliente: orc.descricao,
      marca: '',
      modelo: '',
      numSerie: '',
      horimetro: '',
      combustivel: '',
      whatsappCliente: '',
      cnpj: '',
      cidadeCliente: '',
      endereco: '',
      tecnico: orc.tecnico || 'LiftOS',
      recebedor: '',
      orcamentoVinculado: orc.numero,
      fotosBase64: [],
      fotoHorimetro: null,
      fotosPendencias: [],
      assinaturaTecnico: '',
      assinaturaCliente: '',
      checklistData: {}
    };
    
    window.State.osHistory.unshift(osData);
    window.Storage.saveOSHistory();
    
    orc.os_gerada = osNum;
    window.Storage.saveOrcamentos();
    
    this.renderLista();
    if (window.HistoricoModule) window.HistoricoModule.render();
    if (window.ClientesModule) window.ClientesModule.updateStats();
    
    showToast(`OS ${osNum} gerada a partir do orçamento!`);
    
    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      window.GoogleSheets.syncSingleOS(osData);
      window.GoogleSheets.syncSingleOrcamento(orc);
    }
    
    // Carregar a OS
    if (window.OSModule) {
      window.OSModule.carregarOS(osData);
      window.PageLoader.load('os');
    }
  },

  enviarWhatsApp() {
    const cliente = window.Utils.getVal('orc_cliente').trim();
    const clienteData = window.State.clients.find(c => c.nome === cliente);
    let telefone = clienteData ? clienteData.whatsapp : '';
    
    if (!telefone) {
      telefone = prompt('WhatsApp do cliente (com DDD):');
      if (!telefone) return;
    }
    
    let subtotal = 0;
    this.state.itens.forEach(it => {
      subtotal += it.quantidade * it.valor_unitario;
    });
    const descontoPct = parseFloat(window.Utils.getVal('orcDesconto')) || 0;
    const total = subtotal * (1 - descontoPct / 100);
    
    let msg = '*LiftOS*\n*ORÇAMENTO ' + window.Utils.getVal('orc_numero') + '*\n\n';
    msg += `Cliente: *${cliente.toUpperCase()}*\n`;
    msg += `Data: ${window.Utils.getVal('orc_data')}\n`;
    msg += `Validade: ${window.Utils.getVal('orc_validade')}\n\n`;
    msg += '*ITENS:*\n';
    this.state.itens.forEach((it, i) => {
      msg += `${i + 1}. ${it.descricao} - ${it.quantidade}x ${window.Utils.moneyFormat(it.valor_unitario)} = ${window.Utils.moneyFormat(it.quantidade * it.valor_unitario)}\n`;
    });
    msg += `\n*TOTAL: ${window.Utils.moneyFormat(total)}*\n\n_Aguardando sua aprovação._`;
    
    window.open(`https://wa.me/${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  },

  editar(numero) {
    const orc = window.State.orcamentos.find(o => o.numero === numero);
    if (!orc) return;
    
    window.Utils.setVal('orc_editId', orc.id);
    window.Utils.setVal('orc_numero', orc.numero);
    window.Utils.setVal('orc_data', orc.data);
    window.Utils.setVal('orc_validade', orc.validade);
    window.Utils.setVal('orc_cliente', orc.cliente);
    window.Utils.setVal('orc_equipamento', orc.equipamento);
    window.Utils.setVal('orc_serie_hor', orc.serie_horimetro);
    window.Utils.setVal('orc_tecnico', orc.tecnico);
    window.Utils.setVal('orc_descricao', orc.descricao);
    window.Utils.setVal('orcDesconto', orc.desconto);
    window.Utils.setVal('orc_observacoes', orc.observacoes);
    window.Utils.setVal('orc_assinante', orc.assinante);
    window.Utils.setVal('orc_assinante_cpf', orc.assinante_cpf);
    
    this.state.itens = (orc.itens || []).map(it => ({
      descricao: it.descricao || '',
      tipo: it.tipo || 'peca',
      quantidade: parseInt(it.quantidade) || 1,
      valor_unitario: parseFloat(it.valor_unitario) || 0
    }));
    
    this.renderItens();
    this.calcularTotais();
    
    if (orc.assinatura && window.SignatureOrc) {
      window.SignatureOrc.loadFrom(orc.assinatura);
    }
    
    const btnAprovar = document.getElementById('btnOrcAprovar');
    const btnRejeitar = document.getElementById('btnOrcRejeitar');
    const btnGerarOS = document.getElementById('btnOrcGerarOS');
    
    if (btnAprovar) btnAprovar.style.display = orc.status === 'enviado' ? 'inline-flex' : 'none';
    if (btnRejeitar) btnRejeitar.style.display = (orc.status === 'enviado' || orc.status === 'rascunho') ? 'inline-flex' : 'none';
    if (btnGerarOS) btnGerarOS.style.display = (orc.status === 'aprovado' && !orc.os_gerada) ? 'inline-flex' : 'none';
    
    const title = document.getElementById('orcFormTitle');
    if (title) title.innerHTML = `<i class="fas fa-edit"></i> Editar Orçamento ${window.esc(orc.numero)}`;
    
    document.querySelector('.nav-btn[data-page="orcamento"]').click();
    document.getElementById('orcFormTitle').scrollIntoView({ behavior: 'smooth' });
  },

  excluir(numero) {
    if (!confirm(`Excluir orçamento ${numero}?`)) return;
    window.State.orcamentos = window.State.orcamentos.filter(o => o.numero !== numero);
    window.Storage.saveOrcamentos();
    this.renderLista();
    this.updateStats();
    showToast('Excluído');
  },

  verDetalhe(numero) {
    const orc = window.State.orcamentos.find(o => o.numero === numero);
    if (!orc) return;
    
    const statusClass = {
      rascunho: 'status-rascunho',
      enviado: 'status-enviado',
      aprovado: 'status-aprovado',
      rejeitado: 'status-rejeitado'
    }[orc.status] || '';
    
    let itensHtml = '';
    (orc.itens || []).forEach((it, i) => {
      itensHtml += `
        <tr>
          <td class="p-2 border-b border-[var(--border)]">${i + 1}</td>
          <td class="p-2 border-b border-[var(--border)]">${window.esc(it.descricao)}</td>
          <td class="p-2 border-b border-[var(--border)] text-center">${window.esc(it.tipo)}</td>
          <td class="p-2 border-b border-[var(--border)] text-center">${it.quantidade || 0}</td>
          <td class="p-2 border-b border-[var(--border)] text-right">${window.Utils.moneyFormat(it.valor_unitario)}</td>
          <td class="p-2 border-b border-[var(--border)] text-right font-bold">${window.Utils.moneyFormat((it.quantidade || 0) * (it.valor_unitario || 0))}</td>
        </tr>
      `;
    });
    
    let html = `
      <div class="modal-title">
        <i class="fas fa-file-invoice-dollar"></i> Orçamento ${window.esc(orc.numero)}
        <span class="status-badge ${statusClass}" style="margin-left:10px">${window.Utils.formatOrcStatus(orc.status)}</span>
      </div>
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div>
          <span class="text-xs text-[var(--muted)]">Cliente</span>
          <p class="font-bold">${window.esc(orc.cliente)}</p>
        </div>
        <div>
          <span class="text-xs text-[var(--muted)]">Data</span>
          <p>${window.esc(orc.data)} — Validade: ${window.esc(orc.validade)}</p>
        </div>
        <div>
          <span class="text-xs text-[var(--muted)]">Equipamento</span>
          <p>${window.esc(orc.equipamento)}</p>
        </div>
        <div>
          <span class="text-xs text-[var(--muted)]">Técnico</span>
          <p>${window.esc(orc.tecnico)}</p>
        </div>
      </div>
      ${orc.descricao ? `<p class="text-sm mb-3"><strong>Descrição:</strong><br>${window.esc(orc.descricao).replace(/\n/g, '<br>')}</p>` : ''}
      <table class="w-full mb-4">
        <thead class="bg-[var(--bg-secondary)]">
          <tr>
            <th class="p-2 text-left">#</th><th class="p-2 text-left">Descrição</th><th class="p-2 text-center">Tipo</th>
            <th class="p-2 text-center">Qtd</th><th class="p-2 text-right">V. Un.</th><th class="p-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itensHtml}</tbody>
      </table>
      <div class="orc-total-box bg-[var(--bg-secondary)] p-4 rounded-lg">
        <div class="flex justify-between py-1"><span>Subtotal</span><span class="font-mono">${window.Utils.moneyFormat(orc.subtotal)}</span></div>
        <div class="flex justify-between py-1"><span>Desconto (${orc.desconto}%)</span><span class="font-mono text-[var(--danger)]">- ${window.Utils.moneyFormat(orc.valor_desconto)}</span></div>
        <div class="flex justify-between py-2 text-lg font-bold text-[var(--accent)] border-t-2 border-[var(--accent)] mt-2"><span>TOTAL</span><span class="font-mono">${window.Utils.moneyFormat(orc.total)}</span></div>
      </div>
      ${orc.os_gerada ? `<p class="mt-3 text-sm"><i class="fas fa-link text-[var(--accent)]"></i> OS Gerada: <strong class="text-[var(--accent)] font-mono">${window.esc(orc.os_gerada)}</strong></p>` : ''}
      ${orc.assinatura ? `
        <div class="mt-3 text-center">
          <p class="text-xs text-[var(--muted)]">Assinatura do Cliente</p>
          <img src="${orc.assinatura}" style="max-width:200px; border-radius:8px; border:1px solid var(--border)">
          <p class="text-sm mt-1">${window.esc(orc.assinante)} — CPF: ${window.esc(orc.assinante_cpf)}</p>
        </div>
      ` : ''}
      ${orc.observacoes ? `<p class="mt-3 text-xs text-[var(--muted)]"><strong>Observações:</strong><br>${window.esc(orc.observacoes).replace(/\n/g, '<br>')}</p>` : ''}
    `;
    
    const modal = document.getElementById('orcDetalheModal');
    const conteudo = document.getElementById('orcDetalheConteudo');
    if (conteudo) conteudo.innerHTML = html;
    if (modal) modal.style.display = 'flex';
  },

  renderLista() {
    const busca = (document.getElementById('orcSearch')?.value || '').toLowerCase();
    const filtroStatus = document.getElementById('orcFiltroStatus')?.value || '';
    
    let filtered = window.State.orcamentos.filter(orc => {
      if (busca && !orc.numero.toLowerCase().includes(busca) && !orc.cliente.toLowerCase().includes(busca)) return false;
      if (filtroStatus && orc.status !== filtroStatus) return false;
      return true;
    });
    
    filtered.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    
    const tbody = document.getElementById('orcTableBody');
    const empty = document.getElementById('orcEmpty');
    
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!filtered.length) {
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    
    filtered.forEach(orc => {
      const statusClass = {
        rascunho: 'status-rascunho',
        enviado: 'status-enviado',
        aprovado: 'status-aprovado',
        rejeitado: 'status-rejeitado'
      }[orc.status] || '';
      
      const row = tbody.insertRow();
      row.innerHTML = `
        <td class="font-mono font-bold">${window.esc(orc.numero)}</td>
        <td>${window.esc(orc.data)}</td>
        <td class="font-medium">${window.esc(orc.cliente).toUpperCase()}</td>
        <td class="font-mono font-bold text-[var(--accent)]">${window.Utils.moneyFormat(orc.total)}</td>
        <td><span class="status-badge ${statusClass}">${window.Utils.formatOrcStatus(orc.status)}</span>${orc.os_gerada ? ` <i class="fas fa-link text-xs text-[var(--success)]" title="OS: ${window.esc(orc.os_gerada)}"></i>` : ''}</td>
        <td>
          <button onclick="OrcamentoModule.verDetalhe('${window.esc(orc.numero).replace(/'/g, "\\'")}')" class="text-blue-400"><i class="fas fa-eye"></i></button>
          <button onclick="OrcamentoModule.editar('${window.esc(orc.numero).replace(/'/g, "\\'")}')" class="text-orange-400 ml-2"><i class="fas fa-edit"></i></button>
          ${orc.status !== 'aprovado' ? `<button onclick="OrcamentoModule.excluir('${window.esc(orc.numero).replace(/'/g, "\\'")}')" class="text-red-400 ml-2"><i class="fas fa-trash"></i></button>` : ''}
        </td>
      `;
    });
  },

  updateStats() {
    const total = window.State.orcamentos.length;
    const stats = { rascunho: 0, enviado: 0, aprovado: 0, rejeitado: 0 };
    let valorAprovado = 0;
    
    window.State.orcamentos.forEach(orc => {
      stats[orc.status] = (stats[orc.status] || 0) + 1;
      if (orc.status === 'aprovado') valorAprovado += orc.total;
    });
    
    const elTotal = document.getElementById('statOrcTotal');
    const elRascunho = document.getElementById('statOrcRascunho');
    const elEnviado = document.getElementById('statOrcEnviado');
    const elAprovado = document.getElementById('statOrcAprovado');
    const elRejeitado = document.getElementById('statOrcRejeitado');
    const elValor = document.getElementById('statOrcValorTotal');
    
    if (elTotal) elTotal.innerText = total;
    if (elRascunho) elRascunho.innerText = stats.rascunho;
    if (elEnviado) elEnviado.innerText = stats.enviado;
    if (elAprovado) elAprovado.innerText = stats.aprovado;
    if (elRejeitado) elRejeitado.innerText = stats.rejeitado;
    if (elValor) elValor.innerText = window.Utils.moneyFormat(valorAprovado);
  },

  loadFromSync(orcamentos) {
    if (Array.isArray(orcamentos) && orcamentos.length) {
      window.State.orcamentos = orcamentos;
      window.Storage.saveOrcamentos();
      this.renderLista();
      this.updateStats();
      this.preencherClientes();
    }
  }
};

// Assinatura para orçamento
window.SignatureOrc = {
    canvas: null,
    drawing: false,
    ctx: null,

    init() {
        this.canvas = document.getElementById('sigOrcCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        this.clear();
        this.bindEvents();
        // Redimensiona se a janela for redimensionada
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        const parent = this.canvas.parentElement;
        if (!parent) return;
        const width = parent.clientWidth;
        const height = 140;
        if (this.canvas.width !== width) {
            this.canvas.width = width;
            this.canvas.height = height;
            this.clear(); // limpa ao redimensionar
        }
    },

    bindEvents() {
        const getPoint = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            let clientX, clientY;
            if (e.touches) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            let x = (clientX - rect.left) * scaleX;
            let y = (clientY - rect.top) * scaleY;
            x = Math.max(0, Math.min(x, this.canvas.width));
            y = Math.max(0, Math.min(y, this.canvas.height));
            return { x, y };
        };

        const start = (e) => {
            e.preventDefault();
            this.drawing = true;
            const p = getPoint(e);
            this.ctx.beginPath();
            this.ctx.moveTo(p.x, p.y);
        };

        const draw = (e) => {
            if (!this.drawing) return;
            e.preventDefault();
            const p = getPoint(e);
            this.ctx.lineTo(p.x, p.y);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(p.x, p.y);
        };

        const end = () => {
            this.drawing = false;
        };

        this.canvas.addEventListener('mousedown', start);
        this.canvas.addEventListener('mousemove', draw);
        this.canvas.addEventListener('mouseup', end);
        this.canvas.addEventListener('mouseleave', end);
        this.canvas.addEventListener('touchstart', start);
        this.canvas.addEventListener('touchmove', draw);
        this.canvas.addEventListener('touchend', end);
    },

    clear() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        document.getElementById('assinaturaOrcData').value = '';
    },

    save() {
        if (!this.canvas) return;
        const dataURL = this.canvas.toDataURL('image/png');
        document.getElementById('assinaturaOrcData').value = dataURL;
        showToast('Assinatura salva!');
    },

    loadFrom(url) {
        if (!url) return;
        const img = new Image();
        img.onload = () => {
            this.resize();
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
            document.getElementById('assinaturaOrcData').value = url;
        };
        img.src = url;
    }
};
    attempt();
  }
};

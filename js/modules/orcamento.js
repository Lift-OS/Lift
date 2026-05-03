// modules/orcamento.js - Módulo de Orçamentos (completo)
window.OrcamentoModule = {
  state: {
    itens: [],
    editId: null,
    salvandoAutomaticamente: false
  },

  // ========== PERSISTÊNCIA ==========
  salvarEstado() {
    if (this.state.salvandoAutomaticamente) return;
    const estado = {
      itens: this.state.itens,
      editId: this.state.editId,
      campos: {
        orc_numero: window.Utils.getVal('orc_numero'),
        orc_data: window.Utils.getVal('orc_data'),
        orc_validade: window.Utils.getVal('orc_validade'),
        orc_cliente: window.Utils.getVal('orc_cliente'),
        orc_equipamento: window.Utils.getVal('orc_equipamento'),
        orc_serie_combustivel: window.Utils.getVal('orc_serie_combustivel'),
        orc_tecnico: window.Utils.getVal('orc_tecnico'),
        orc_descricao: window.Utils.getVal('orc_descricao'),
        orcDesconto: window.Utils.getVal('orcDesconto'),
        orc_observacoes: window.Utils.getVal('orc_observacoes'),
        orc_assinante: window.Utils.getVal('orc_assinante'),
        orc_assinante_cpf: window.Utils.getVal('orc_assinante_cpf'),
        assinaturaOrcData: window.Utils.getVal('assinaturaOrcData')
      }
    };
    sessionStorage.setItem('orcamento_estado', JSON.stringify(estado));
  },

  restaurarEstado() {
    const salvo = sessionStorage.getItem('orcamento_estado');
    if (!salvo) return false;
    try {
      const estado = JSON.parse(salvo);
      this.state.itens = estado.itens || [];
      this.state.editId = estado.editId || null;
      for (const [id, valor] of Object.entries(estado.campos)) {
        window.Utils.setVal(id, valor);
      }
      this.renderItens();
      this.calcularTotais();
      if (this.state.editId) {
        const orc = window.State.orcamentos.find(o => o.id === this.state.editId);
        if (orc && orc.assinatura && window.SignatureOrc) {
          window.SignatureOrc.loadFrom(orc.assinatura);
        }
        // Atualiza botões de ação conforme status
        const btnAprovar = document.getElementById('btnOrcAprovar');
        const btnRejeitar = document.getElementById('btnOrcRejeitar');
        const btnGerarOS = document.getElementById('btnOrcGerarOS');
        if (btnAprovar) btnAprovar.style.display = orc.status === 'enviado' ? 'inline-flex' : 'none';
        if (btnRejeitar) btnRejeitar.style.display = (orc.status === 'enviado' || orc.status === 'rascunho') ? 'inline-flex' : 'none';
        if (btnGerarOS) btnGerarOS.style.display = (orc.status === 'aprovado' && !orc.os_gerada) ? 'inline-flex' : 'none';
      }
      return true;
    } catch(e) { return false; }
  },

  limparEstadoSalvo() {
    sessionStorage.removeItem('orcamento_estado');
  },

  // ========== INICIALIZAÇÃO ==========
  init() {
    const restaurado = this.restaurarEstado();
    if (!restaurado) this.novo();
    this.loadEventListeners();
    this.renderLista();
    this.updateStats();
    this.preencherClientes();
    this.preencherTecnicos();
    this.preencherDatalistPecas();
    // Inicializa assinatura com pequeno atraso para garantir canvas
    setTimeout(() => {
      if (window.SignatureOrc) window.SignatureOrc.init();
    }, 200);
    this.ativarAutoSave();
  },

  ativarAutoSave() {
    const campos = ['orc_cliente', 'orc_equipamento', 'orc_serie_combustivel', 'orc_tecnico', 'orc_descricao', 'orc_observacoes', 'orc_assinante', 'orc_assinante_cpf', 'orcDesconto'];
    campos.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.salvarEstado());
    });
  },

  // ========== DATALIST DE PEÇAS ==========
  preencherDatalistPecas() {
    const datalist = document.getElementById('pecasDatalist');
    if (!datalist) return;
    datalist.innerHTML = '';
    window.State.pecas.forEach(peca => {
      const option = document.createElement('option');
      option.value = `${peca.codigo} - ${peca.descricao}`;
      option.setAttribute('data-codigo', peca.codigo);
      option.setAttribute('data-descricao', peca.descricao);
      option.setAttribute('data-valor', peca.preco_venda);
      datalist.appendChild(option);
    });
  },

  // ========== ITENS ==========
  addItem(descricao, tipo, quantidade, valorUnitario) {
    this.state.itens.push({
      descricao: descricao || '',
      tipo: tipo || 'peca',
      quantidade: parseInt(quantidade) || 1,
      valor_unitario: parseFloat(valorUnitario) || 0
    });
    this.renderItens();
    this.calcularTotais();
    this.salvarEstado();
  },

  removeItem(index) {
    this.state.itens.splice(index, 1);
    this.renderItens();
    this.calcularTotais();
    this.salvarEstado();
  },

  renderItens() {
    const container = document.getElementById('orcItensLista');
    if (!container) return;
    if (!this.state.itens.length) {
      container.innerHTML = '<div class="text-center py-4 text-[var(--muted)]">Nenhum item adicionado</div>';
      return;
    }
    let html = '';
    this.state.itens.forEach((item, i) => {
      html += `
        <div class="orc-item-row grid grid-cols-12 gap-2 mb-2 items-center">
          <input type="text" class="form-input text-sm col-span-4" value="${window.esc(item.descricao)}" placeholder="Digite a descrição (código ou nome)" 
                 list="pecasDatalist" onchange="OrcamentoModule.buscarPecaEAtualizar(${i}, this.value)">
          <select class="form-input text-sm col-span-2" onchange="OrcamentoModule.state.itens[${i}].tipo = this.value; OrcamentoModule.calcularTotais(); OrcamentoModule.salvarEstado()">
            <option value="peca" ${item.tipo === 'peca' ? 'selected' : ''}>Peça</option>
            <option value="servico" ${item.tipo === 'servico' ? 'selected' : ''}>Serviço</option>
            <option value="mobra" ${item.tipo === 'mobra' ? 'selected' : ''}>Mão de Obra</option>
            <option value="outro" ${item.tipo === 'outro' ? 'selected' : ''}>Outro</option>
          </select>
          <input type="number" class="form-input text-sm text-center col-span-1" value="${item.quantidade}" min="1" 
                 onchange="OrcamentoModule.state.itens[${i}].quantidade = parseInt(this.value) || 1; OrcamentoModule.calcularTotais(); OrcamentoModule.salvarEstado()">
          <input type="number" class="form-input text-sm text-right col-span-2" value="${item.valor_unitario}" step="0.01" placeholder="0,00" 
                 onchange="OrcamentoModule.state.itens[${i}].valor_unitario = parseFloat(this.value) || 0; OrcamentoModule.calcularTotais(); OrcamentoModule.salvarEstado()">
          <div class="font-mono text-sm font-bold text-right col-span-2">${window.Utils.moneyFormat(item.quantidade * item.valor_unitario)}</div>
          <button onclick="OrcamentoModule.removeItem(${i})" class="text-red-400 hover:text-red-300 text-lg col-span-1"><i class="fas fa-times-circle"></i></button>
        </div>
      `;
    });
    container.innerHTML = html;
    this.preencherDatalistPecas();
  },

  buscarPecaEAtualizar(index, valorDigitado) {
    const peca = window.State.pecas.find(p => 
      p.codigo === valorDigitado || 
      p.descricao.toLowerCase().includes(valorDigitado.toLowerCase()) ||
      `${p.codigo} - ${p.descricao}` === valorDigitado
    );
    if (peca) {
      this.state.itens[index].descricao = peca.descricao;
      this.state.itens[index].valor_unitario = peca.preco_venda;
      this.state.itens[index].tipo = 'peca';
      this.renderItens();
      this.calcularTotais();
      this.salvarEstado();
      showToast(`Peça encontrada: ${peca.descricao} - ${window.Utils.moneyFormat(peca.preco_venda)}`);
    } else {
      this.state.itens[index].descricao = valorDigitado;
      this.calcularTotais();
      this.salvarEstado();
    }
  },

  // ========== CÁLCULOS ==========
  calcularTotais() {
    let subtotal = 0;
    this.state.itens.forEach(item => {
      subtotal += item.quantidade * item.valor_unitario;
    });
    const descontoPct = parseFloat(window.Utils.getVal('orcDesconto')) || 0;
    const valorDesconto = subtotal * descontoPct / 100;
    const total = subtotal - valorDesconto;
    document.getElementById('orcSubtotal').innerText = window.Utils.moneyFormat(subtotal);
    document.getElementById('orcValorDesconto').innerText = `- ${window.Utils.moneyFormat(valorDesconto)}`;
    document.getElementById('orcTotalFinal').innerText = window.Utils.moneyFormat(total);
  },

  // ========== CRUD COM PLANILHA ==========
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
      serie_combustivel: window.Utils.getVal('orc_serie_combustivel').trim(), // campo alterado
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
    if (!this.state.itens.length) { showToast('Adicione pelo menos 1 item', true); return; }
    if (!window.Utils.getVal('orc_cliente').trim()) { showToast('Cliente é obrigatório', true); return; }
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
    this.limparEstadoSalvo();
    showToast('Rascunho salvo');
    if (window.GoogleSheets && window.Auth.can('sincronizar')) await window.GoogleSheets.syncSingleOrcamento(dados);
  },

  async enviarCliente() {
    if (!this.state.itens.length) { showToast('Adicione pelo menos 1 item', true); return; }
    if (!window.Utils.getVal('orc_cliente').trim()) { showToast('Cliente é obrigatório', true); return; }
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
    this.limparEstadoSalvo();
    showToast('Orçamento enviado ao cliente');
    if (window.GoogleSheets && window.Auth.can('sincronizar')) await window.GoogleSheets.syncSingleOrcamento(dados);
  },

  async aprovarOrcamento() {
    const editId = parseInt(window.Utils.getVal('orc_editId'));
    if (!editId) { showToast('Nenhum orçamento selecionado', true); return; }
    const assinatura = window.Utils.getVal('assinaturaOrcData');
    const assinante = window.Utils.getVal('orc_assinante').trim();
    if (!assinatura) { showToast('Cliente deve assinar o orçamento', true); return; }
    if (!assinante) { showToast('Nome do assinante é obrigatório', true); return; }
    const index = window.State.orcamentos.findIndex(o => o.id === editId);
    if (index === -1) return;
    window.State.orcamentos[index].status = 'aprovado';
    window.State.orcamentos[index].assinatura = assinatura;
    window.State.orcamentos[index].assinante = assinante;
    window.State.orcamentos[index].assinante_cpf = window.Utils.getVal('orc_assinante_cpf').trim();
    window.Storage.saveOrcamentos();
    this.renderLista();
    this.updateStats();
    this.limparEstadoSalvo();
    showToast('Orçamento APROVADO!');
    const btnGerarOS = document.getElementById('btnOrcGerarOS');
    if (btnGerarOS) btnGerarOS.style.display = 'inline-flex';
    if (window.GoogleSheets && window.Auth.can('sincronizar')) await window.GoogleSheets.syncSingleOrcamento(window.State.orcamentos[index]);
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
    this.limparEstadoSalvo();
    showToast('Orçamento rejeitado');
    if (window.GoogleSheets && window.Auth.can('sincronizar')) await window.GoogleSheets.syncSingleOrcamento(window.State.orcamentos[index]);
  },

  gerarOS() {
    const editId = parseInt(window.Utils.getVal('orc_editId'));
    const orc = window.State.orcamentos.find(o => o.id === editId);
    if (!orc) { showToast('Orçamento não encontrado', true); return; }
    if (orc.os_gerada) { showToast(`OS já gerada: ${orc.os_gerada}`, true); return; }
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
    this.limparEstadoSalvo();
    showToast(`OS ${osNum} gerada a partir do orçamento!`);
    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      window.GoogleSheets.syncSingleOS(osData);
      window.GoogleSheets.syncSingleOrcamento(orc);
    }
    if (window.OSModule) {
      window.OSModule.carregarOS(osData);
      window.PageLoader.load('os');
    }
  },

  enviarWhatsApp() {
    // ... (já implementado, manter o mesmo)
  },

  novo() {
    window.Utils.setVal('orc_editId', '');
    this.state.itens = [];
    window.Utils.setVal('orc_numero', window.Utils.generateOrcNumber());
    window.Utils.setVal('orc_data', window.Utils.dataHojeISO());
    const validade = new Date();
    validade.setDate(validade.getDate() + 15);
    window.Utils.setVal('orc_validade', validade.toISOString().split('T')[0]);
    ['orc_cliente', 'orc_equipamento', 'orc_serie_combustivel', 'orc_descricao', 'orc_tecnico', 'orc_observacoes', 'orc_assinante', 'orc_assinante_cpf', 'assinaturaOrcData'].forEach(id => window.Utils.setVal(id, ''));
    window.Utils.setVal('orcDesconto', '0');
    document.getElementById('orcFormTitle').innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Novo Orçamento';
    this.esconderBotoesAcao();
    this.renderItens();
    this.calcularTotais();
    if (window.SignatureOrc) window.SignatureOrc.clear();
    this.limparEstadoSalvo();
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
    window.Utils.setVal('orc_serie_combustivel', orc.serie_combustivel || '');
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
    if (orc.assinatura && window.SignatureOrc) window.SignatureOrc.loadFrom(orc.assinatura);
    const btnAprovar = document.getElementById('btnOrcAprovar');
    const btnRejeitar = document.getElementById('btnOrcRejeitar');
    const btnGerarOS = document.getElementById('btnOrcGerarOS');
    if (btnAprovar) btnAprovar.style.display = orc.status === 'enviado' ? 'inline-flex' : 'none';
    if (btnRejeitar) btnRejeitar.style.display = (orc.status === 'enviado' || orc.status === 'rascunho') ? 'inline-flex' : 'none';
    if (btnGerarOS) btnGerarOS.style.display = (orc.status === 'aprovado' && !orc.os_gerada) ? 'inline-flex' : 'none';
    document.getElementById('orcFormTitle').innerHTML = `<i class="fas fa-edit"></i> Editar Orçamento ${window.esc(orc.numero)}`;
    this.limparEstadoSalvo(); // remove rascunho automático
    window.PageLoader.load('orcamento');
    setTimeout(() => document.getElementById('orcFormTitle')?.scrollIntoView({ behavior: 'smooth' }), 100);
  },

  excluir(numero) {
    if (!confirm(`Excluir orçamento ${numero}?`)) return;
    window.State.orcamentos = window.State.orcamentos.filter(o => o.numero !== numero);
    window.Storage.saveOrcamentos();
    this.renderLista();
    this.updateStats();
    showToast('Excluído');
  },

  verDetalhe(numero) { /* ... (igual ao anterior) */ },
  renderLista() { /* ... (igual ao anterior) */ },
  updateStats() { /* ... (igual ao anterior) */ },
  preencherClientes() { /* ... (igual ao anterior) */ },
  preencherTecnicos() { /* ... (igual ao anterior) */ },
  loadEventListeners() { /* ... (igual ao anterior) */ },
  esconderBotoesAcao() { /* ... (igual ao anterior) */ },

  // ========== SYNCHRONIZATION ==========
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

// modules/orcamento.js - Módulo de Orçamentos (sem tryRestaurarDados)
window.OrcamentoModule = {
  state: { itens: [], editId: null },

  init() {
    this.loadEventListeners();
    this.novo();
    this.renderLista();
    this.updateStats();
    this.preencherClientes();
    this.preencherTecnicos();
    if (window.SignatureOrc) window.SignatureOrc.init();
    // NÃO há chamada a tryRestaurarDados aqui
  },

  loadEventListeners() {
    const btnNovo = document.getElementById('btnOrcNovo');
    if (btnNovo) btnNovo.onclick = () => this.novo();
    const btnLimpar = document.getElementById('btnOrcLimpar');
    if (btnLimpar) btnLimpar.onclick = () => this.limparFormulario();
    const desconto = document.getElementById('orcDesconto');
    if (desconto) desconto.onchange = () => this.calcularTotais();
    const clienteInput = document.getElementById('orc_cliente');
    if (clienteInput) clienteInput.onchange = () => this.carregarDadosCliente(clienteInput.value);
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
    ['orc_cliente','orc_equipamento','orc_serie_hor','orc_descricao','orc_tecnico','orc_observacoes','orc_assinante','orc_assinante_cpf','assinaturaOrcData'].forEach(id => window.Utils.setVal(id, ''));
    window.Utils.setVal('orcDesconto', '0');
    const title = document.getElementById('orcFormTitle');
    if (title) title.innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Novo Orçamento';
    this.esconderBotoesAcao();
    this.renderItens();
    this.calcularTotais();
    if (window.SignatureOrc) window.SignatureOrc.clear();
  },

  limparFormulario() { if (confirm('Limpar todos os campos?')) this.novo(); },

  esconderBotoesAcao() {
    const a = document.getElementById('btnOrcAprovar'); if (a) a.style.display = 'none';
    const r = document.getElementById('btnOrcRejeitar'); if (r) r.style.display = 'none';
    const g = document.getElementById('btnOrcGerarOS'); if (g) g.style.display = 'none';
  },

  addItem(desc, tipo, qtd, vUnit) { this.state.itens.push({ descricao: desc||'', tipo: tipo||'peca', quantidade: parseInt(qtd)||1, valor_unitario: parseFloat(vUnit)||0 }); this.renderItens(); this.calcularTotais(); },
  removeItem(idx) { this.state.itens.splice(idx,1); this.renderItens(); this.calcularTotais(); },

  renderItens() {
    const container = document.getElementById('orcItensLista');
    if (!container) return;
    if (!this.state.itens.length) { container.innerHTML = '<div class="text-center py-4 text-[var(--muted)]">Nenhum item adicionado</div>'; return; }
    let html = '';
    this.state.itens.forEach((item,i) => {
      html += `<div class="orc-item-row grid grid-cols-12 gap-2 mb-2 items-center">
        <input type="text" class="form-input text-sm col-span-4" value="${window.esc(item.descricao)}" placeholder="Descrição" onchange="OrcamentoModule.state.itens[${i}].descricao=this.value;OrcamentoModule.calcularTotais()">
        <select class="form-input text-sm col-span-2" onchange="OrcamentoModule.state.itens[${i}].tipo=this.value;OrcamentoModule.calcularTotais()">
          <option value="peca" ${item.tipo==='peca'?'selected':''}>Peça</option><option value="servico" ${item.tipo==='servico'?'selected':''}>Serviço</option>
          <option value="mobra" ${item.tipo==='mobra'?'selected':''}>Mão de Obra</option><option value="outro" ${item.tipo==='outro'?'selected':''}>Outro</option>
        </select>
        <input type="number" class="form-input text-sm text-center col-span-1" value="${item.quantidade}" min="1" onchange="OrcamentoModule.state.itens[${i}].quantidade=parseInt(this.value)||1;OrcamentoModule.calcularTotais()">
        <input type="number" class="form-input text-sm text-right col-span-2" value="${item.valor_unitario}" step="0.01" placeholder="0,00" onchange="OrcamentoModule.state.itens[${i}].valor_unitario=parseFloat(this.value)||0;OrcamentoModule.calcularTotais()">
        <div class="font-mono text-sm font-bold text-right col-span-2">${window.Utils.moneyFormat(item.quantidade*item.valor_unitario)}</div>
        <button onclick="OrcamentoModule.removeItem(${i})" class="text-red-400"><i class="fas fa-times-circle"></i></button>
      </div>`;
    });
    container.innerHTML = html;
  },

  calcularTotais() {
    let sub = 0;
    this.state.itens.forEach(it => sub += it.quantidade * it.valor_unitario);
    const descPct = parseFloat(window.Utils.getVal('orcDesconto')) || 0;
    const descVal = sub * descPct / 100;
    const total = sub - descVal;
    document.getElementById('orcSubtotal').innerText = window.Utils.moneyFormat(sub);
    document.getElementById('orcValorDesconto').innerText = `- ${window.Utils.moneyFormat(descVal)}`;
    document.getElementById('orcTotalFinal').innerText = window.Utils.moneyFormat(total);
  },

  coletarDados() {
    let sub = 0;
    this.state.itens.forEach(it => sub += it.quantidade * it.valor_unitario);
    const descPct = parseFloat(window.Utils.getVal('orcDesconto')) || 0;
    const descVal = sub * descPct / 100;
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
      desconto: descPct,
      subtotal: sub,
      valor_desconto: descVal,
      total: sub - descVal,
      status: 'rascunho',
      assinatura: window.Utils.getVal('assinaturaOrcData'),
      assinante: window.Utils.getVal('orc_assinante').trim(),
      assinante_cpf: window.Utils.getVal('orc_assinante_cpf').trim(),
      observacoes: window.Utils.getVal('orc_observacoes'),
      os_gerada: ''
    };
  },

  async salvarRascunho() { /* (igual ao anterior) */ },
  async enviarCliente() { /* (igual) */ },
  async aprovarOrcamento() { /* (igual) */ },
  async rejeitarOrcamento() { /* (igual) */ },
  gerarOS() { /* (igual) */ },
  enviarWhatsApp() { /* (igual) */ },
  editar(numero) { /* (igual) */ },
  excluir(numero) { /* (igual) */ },
  verDetalhe(numero) { /* (igual) */ },
  renderLista() { /* (igual) */ },
  updateStats() { /* (igual) */ },
  loadFromSync(orcamentos) { if (Array.isArray(orcamentos) && orcamentos.length) { window.State.orcamentos = orcamentos; window.Storage.saveOrcamentos(); this.renderLista(); this.updateStats(); this.preencherClientes(); } }
};

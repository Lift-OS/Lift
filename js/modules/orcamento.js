// modules/orcamento.js - Módulo de Orçamentos (com persistência automática)
window.OrcamentoModule = {
  state: {
    itens: [],
    editId: null
  },

  // ========== PERSISTÊNCIA ==========
  salvarEstado() {
    const estado = {
      itens: this.state.itens,
      editId: this.state.editId,
      campos: {}
    };
    // Captura todos os campos do formulário
    const campos = ['orc_numero', 'orc_data', 'orc_validade', 'orc_cliente', 'orc_equipamento',
      'orc_serie_combustivel', 'orc_tecnico', 'orc_descricao', 'orcDesconto', 'orc_observacoes',
      'orc_assinante', 'orc_assinante_cpf', 'assinaturaOrcData'];
    campos.forEach(id => {
      estado.campos[id] = window.Utils.getVal(id);
    });
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
      }
      return true;
    } catch (e) { return false; }
  },

  limparEstadoSalvo() {
    sessionStorage.removeItem('orcamento_estado');
  },

  // ========== INICIALIZAÇÃO ==========
  init() {
    this.loadEventListeners();
    this.renderLista();
    this.updateStats();
    this.preencherClientes();
    this.preencherTecnicos();
    this.preencherDatalistPecas();
    setTimeout(() => {
      if (window.SignatureOrc) window.SignatureOrc.init();
    }, 200);
    this.ativarAutoSave();
    // Restaura estado salvo anteriormente (se houver)
    this.restaurarEstado();
  },

  ativarAutoSave() {
    // Salva sempre que qualquer campo for alterado
    const campos = ['orc_cliente', 'orc_equipamento', 'orc_serie_combustivel', 'orc_tecnico',
      'orc_descricao', 'orc_observacoes', 'orc_assinante', 'orc_assinante_cpf', 'orcDesconto',
      'orc_data', 'orc_validade'];
    campos.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.salvarEstado());
    });
    // Salva também ao adicionar/remover itens (já chamamos salvarEstado nesses métodos)
  },

  // ========== DEMAIS MÉTODOS (já existentes, mas com salvamento) ==========
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

  preencherDatalistPecas() {
    const datalist = document.getElementById('pecasDatalist');
    if (!datalist) return;
    datalist.innerHTML = '';
    window.State.pecas.forEach(peca => {
      const option = document.createElement('option');
      option.value = `${peca.codigo} - ${peca.descricao}`;
      datalist.appendChild(option);
    });
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

  novo() {
    window.Utils.setVal('orc_editId', '');
    this.state.itens = [];
    window.Utils.setVal('orc_numero', window.Utils.generateOrcNumber());
    window.Utils.setVal('orc_data', window.Utils.dataHojeISO());
    const validade = new Date();
    validade.setDate(validade.getDate() + 15);
    window.Utils.setVal('orc_validade', validade.toISOString().split('T')[0]);
    ['orc_cliente', 'orc_equipamento', 'orc_serie_combustivel', 'orc_descricao', 'orc_tecnico',
      'orc_observacoes', 'orc_assinante', 'orc_assinante_cpf', 'assinaturaOrcData'].forEach(id => window.Utils.setVal(id, ''));
    window.Utils.setVal('orcDesconto', '0');
    document.getElementById('orcFormTitle').innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Novo Orçamento';
    this.esconderBotoesAcao();
    this.renderItens();
    this.calcularTotais();
    if (window.SignatureOrc) window.SignatureOrc.clear();
    this.limparEstadoSalvo();
  },

  // ... (outros métodos: salvarRascunho, enviarCliente, aprovarOrcamento, etc. mantenha os que já funcionam)
  // IMPORTANTE: ao salvar/enviar/aprovar/gerar OS, chame this.limparEstadoSalvo() para não restaurar dados antigos.

  loadEventListeners() {
    const btnNovo = document.getElementById('btnOrcNovo');
    if (btnNovo) btnNovo.onclick = () => this.novo();
    const btnLimpar = document.getElementById('btnOrcLimpar');
    if (btnLimpar) btnLimpar.onclick = () => { if (confirm('Limpar tudo?')) this.novo(); };
    const desconto = document.getElementById('orcDesconto');
    if (desconto) desconto.onchange = () => this.calcularTotais();
    const clienteInput = document.getElementById('orc_cliente');
    if (clienteInput) clienteInput.onchange = () => this.carregarDadosCliente(clienteInput.value);
  },

  carregarDadosCliente(nome) {
    const cliente = window.State.clients.find(c => c.nome === nome);
    if (!cliente) return;
    if (cliente.equipamentos && cliente.equipamentos.length) {
      const eq = cliente.equipamentos[0];
      window.Utils.setVal('orc_equipamento', `${eq.marca} ${eq.modelo || ''}`.trim());
      const serieComb = `Série: ${eq.serie || 'N/A'} | Combustível: ${eq.combustivel || 'N/A'}`;
      window.Utils.setVal('orc_serie_combustivel', serieComb);
    }
  },

  esconderBotoesAcao() {
    const a = document.getElementById('btnOrcAprovar'); if (a) a.style.display = 'none';
    const r = document.getElementById('btnOrcRejeitar'); if (r) r.style.display = 'none';
    const g = document.getElementById('btnOrcGerarOS'); if (g) g.style.display = 'none';
  },

  // ... (inclua todos os outros métodos: coletarDados, salvarRascunho, enviarCliente, aprovarOrcamento, rejeitarOrcamento, gerarOS, enviarWhatsApp, editar, excluir, verDetalhe, renderLista, updateStats, loadFromSync)
};

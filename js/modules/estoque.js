// modules/estoque.js - Módulo de Estoque (com margem e caixa)
window.EstoqueModule = {
  editingId: null,

  init() {
    this.renderPecas();
    this.renderMovimentos();
    this.updateStats();
    this.preencherSelectPecas();
    this.preencherOSList();
    this.loadEventListeners();
  },

  // Calcula preço de venda baseado no custo e margem
  calcularPrecoVenda() {
    const custo = parseFloat(document.getElementById('est_preco_custo')?.value) || 0;
    const margem = parseFloat(document.getElementById('est_margem')?.value) || 0;
    const venda = custo * (1 + margem / 100);
    document.getElementById('est_preco_venda').value = venda.toFixed(2);
    if (margem > 0 && custo > 0) {
      showToast(`Preço de venda calculado: R$ ${venda.toFixed(2)}`);
    }
  },

  loadEventListeners() {
    // Botões
    const btnSalvar = document.getElementById('btnEstSalvar');
    if (btnSalvar) btnSalvar.onclick = () => this.salvarPeca();

    const btnCancelar = document.getElementById('btnEstCancelar');
    if (btnCancelar) btnCancelar.onclick = () => this.cancelarEdicao();

    const btnRegistrarMov = document.getElementById('btnEstRegistrarMov');
    if (btnRegistrarMov) btnRegistrarMov.onclick = () => this.registrarMovimento();

    // Select de peça para mostrar estoque atual
    const selectPeca = document.getElementById('mov_peca');
    if (selectPeca) selectPeca.onchange = () => this.mostrarEstoqueAtual();

    // Filtros
    const searchInput = document.getElementById('estSearch');
    if (searchInput) searchInput.oninput = () => this.renderPecas();

    const filtroCat = document.getElementById('estFiltroCat');
    if (filtroCat) filtroCat.onchange = () => this.renderPecas();

    const filtroStock = document.getElementById('estFiltroStock');
    if (filtroStock) filtroStock.onchange = () => this.renderPecas();

    const movDataInicio = document.getElementById('movDataInicio');
    const movDataFim = document.getElementById('movDataFim');
    const movFiltroTipo = document.getElementById('movFiltroTipo');
    if (movDataInicio) movDataInicio.onchange = () => this.renderMovimentos();
    if (movDataFim) movDataFim.onchange = () => this.renderMovimentos();
    if (movFiltroTipo) movFiltroTipo.onchange = () => this.renderMovimentos();
  },

  salvarPeca() {
    const codigo = document.getElementById('est_codigo')?.value.trim();
    const descricao = document.getElementById('est_descricao')?.value.trim();
    const custo = parseFloat(document.getElementById('est_preco_custo')?.value) || 0;
    const margem = parseFloat(document.getElementById('est_margem')?.value) || 30;
    const venda = parseFloat(document.getElementById('est_preco_venda')?.value) || (custo * (1 + margem / 100));

    if (!codigo) {
      showToast('Código é obrigatório', true);
      return;
    }
    if (!descricao) {
      showToast('Descrição é obrigatória', true);
      return;
    }

    const peca = {
      id: parseInt(document.getElementById('est_editId')?.value) || Date.now(),
      codigo: codigo,
      descricao: descricao,
      categoria: document.getElementById('est_categoria')?.value || 'outro',
      unidade: document.getElementById('est_unidade')?.value || 'un',
      quantidade: parseInt(document.getElementById('est_qtd')?.value) || 0,
      minimo: parseInt(document.getElementById('est_minimo')?.value) || 2,
      preco_custo: custo,
      margem: margem,
      preco_venda: venda,
      aplicacao: document.getElementById('est_aplicacao')?.value || ''
    };

    const editId = parseInt(document.getElementById('est_editId')?.value);
    if (editId) {
      const index = window.State.pecas.findIndex(p => p.id === editId);
      if (index >= 0) window.State.pecas[index] = peca;
      showToast('Peça atualizada');
    } else {
      const existing = window.State.pecas.find(p => p.codigo === codigo);
      if (existing) {
        showToast('Código já existe', true);
        return;
      }
      window.State.pecas.push(peca);
      showToast('Peça cadastrada');
    }

    window.Storage.savePecas();
    this.cancelarEdicao();
    this.renderPecas();
    this.updateStats();
    this.preencherSelectPecas();

    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      window.GoogleSheets.syncPeca(peca);
    }
  },

  editarPeca(id) {
    const peca = window.State.pecas.find(p => p.id === id);
    if (!peca) return;

    this.editingId = id;
    document.getElementById('est_editId').value = peca.id;
    document.getElementById('est_codigo').value = peca.codigo;
    document.getElementById('est_descricao').value = peca.descricao;
    document.getElementById('est_categoria').value = peca.categoria;
    document.getElementById('est_unidade').value = peca.unidade;
    document.getElementById('est_qtd').value = peca.quantidade;
    document.getElementById('est_minimo').value = peca.minimo;
    document.getElementById('est_preco_custo').value = peca.preco_custo;
    document.getElementById('est_margem').value = peca.margem || 30;
    document.getElementById('est_preco_venda').value = peca.preco_venda;
    document.getElementById('est_aplicacao').value = peca.aplicacao || '';

    const cancelBtn = document.getElementById('btnEstCancelar');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';

    const title = document.getElementById('estFormTitle');
    if (title) title.innerHTML = '<i class="fas fa-edit"></i> Editar Peça';

    document.getElementById('estoqueFormCard')?.scrollIntoView({ behavior: 'smooth' });
  },

  cancelarEdicao() {
    this.editingId = null;
    document.getElementById('est_editId').value = '';
    document.getElementById('est_codigo').value = '';
    document.getElementById('est_descricao').value = '';
    document.getElementById('est_qtd').value = '0';
    document.getElementById('est_minimo').value = '2';
    document.getElementById('est_preco_custo').value = '0';
    document.getElementById('est_margem').value = '30';
    document.getElementById('est_preco_venda').value = '0';
    document.getElementById('est_aplicacao').value = '';
    document.getElementById('est_categoria').value = 'hidraulico';
    document.getElementById('est_unidade').value = 'un';

    const cancelBtn = document.getElementById('btnEstCancelar');
    if (cancelBtn) cancelBtn.style.display = 'none';

    const title = document.getElementById('estFormTitle');
    if (title) title.innerHTML = '<i class="fas fa-cogs"></i> Cadastrar Peça';
  },

  excluirPeca(id) {
    if (!confirm('Excluir esta peça permanentemente?')) return;
    window.State.pecas = window.State.pecas.filter(p => p.id !== id);
    window.Storage.savePecas();
    this.renderPecas();
    this.updateStats();
    this.preencherSelectPecas();
    showToast('Peça excluída');
  },

  preencherSelectPecas() {
    const select = document.getElementById('mov_peca');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione a peça</option>';
    window.State.pecas.forEach(peca => {
      select.innerHTML += `<option value="${window.esc(peca.codigo)}">${window.esc(peca.codigo)} — ${window.esc(peca.descricao)} (Qtd: ${peca.quantidade})</option>`;
    });
  },

  preencherOSList() {
    const datalist = document.getElementById('movOSList');
    if (!datalist) return;

    datalist.innerHTML = '';
    window.State.osHistory.forEach(os => {
      if (os.status !== 'aprovada') {
        const option = document.createElement('option');
        option.value = os.numeroOS;
        option.textContent = `${os.numeroOS} — ${window.esc(os.cliente).toUpperCase()}`;
        datalist.appendChild(option);
      }
    });
  },

  mostrarEstoqueAtual() {
    const codigo = document.getElementById('mov_peca')?.value;
    const container = document.getElementById('movEstoqueAtual');
    if (!container) return;

    if (!codigo) {
      container.style.display = 'none';
      return;
    }

    const peca = window.State.pecas.find(p => p.codigo === codigo);
    if (!peca) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    const statusClass = peca.quantidade <= 0 ? 'text-[var(--danger)]' : (peca.quantidade <= peca.minimo ? 'text-[var(--warning)]' : 'text-[var(--success)]');
    container.innerHTML = `
      Estoque atual de <strong>${window.esc(peca.descricao)}</strong>: 
      <span class="${statusClass} font-bold">${peca.quantidade} ${window.esc(peca.unidade)}</span>
      ${peca.quantidade <= peca.minimo ? `<span class="text-[var(--danger)] font-bold ml-2">(ABAIXO DO MÍNIMO: ${peca.minimo})</span>` : ''}
    `;
  },

  async registrarMovimento() {
    const tipo = document.getElementById('mov_tipo')?.value;
    const codigo = document.getElementById('mov_peca')?.value;
    const quantidade = parseInt(document.getElementById('mov_qtd')?.value) || 0;
    const osVinculada = document.getElementById('mov_os')?.value.trim();
    const observacao = document.getElementById('mov_obs')?.value.trim();

    if (!codigo) {
      showToast('Selecione a peça', true);
      return;
    }
    if (quantidade <= 0) {
      showToast('Quantidade inválida', true);
      return;
    }

    const peca = window.State.pecas.find(p => p.codigo === codigo);
    if (!peca) {
      showToast('Peça não encontrada', true);
      return;
    }

    if (tipo === 'saida' && peca.quantidade < quantidade) {
      showToast(`Estoque insuficiente! Disponível: ${peca.quantidade}`, true);
      return;
    }

    // Atualiza quantidade da peça
    peca.quantidade = tipo === 'entrada' ? peca.quantidade + quantidade : peca.quantidade - quantidade;
    window.Storage.savePecas();

    const movimento = {
      id: Date.now(),
      tipo: tipo,
      peca_codigo: codigo,
      peca_descricao: peca.descricao,
      quantidade: quantidade,
      os_vinculada: osVinculada || '',
      observacao: observacao || '',
      data_hora: window.Utils.agoraBr()
    };

    window.State.movimentosEstoque.unshift(movimento);
    window.Storage.saveMovimentos();

    // Limpa campos
    document.getElementById('mov_qtd').value = '1';
    document.getElementById('mov_os').value = '';
    document.getElementById('mov_obs').value = '';

    this.renderPecas();
    this.renderMovimentos();
    this.updateStats();
    this.preencherSelectPecas();

    showToast(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada: ${quantidade}x ${peca.descricao}`);

    // Verifica estoque baixo
    if (peca.quantidade <= peca.minimo && peca.quantidade > 0) {
      this.criarNotificacaoEstoque('Estoque baixo', `${peca.codigo} — ${peca.descricao} (${peca.quantidade}/${peca.minimo})`);
    }
    if (peca.quantidade === 0) {
      this.criarNotificacaoEstoque('Estoque zerado', `${peca.codigo} — ${peca.descricao} — SEM ESTOQUE`);
    }

    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      window.GoogleSheets.syncPeca(peca);
      window.GoogleSheets.syncMovimento(movimento);
    }
  },

  criarNotificacaoEstoque(titulo, descricao) {
    if (window.NotificacoesModule) {
      window.NotificacoesModule.adicionar({
        id: `estoque_${Date.now()}`,
        titulo: titulo,
        descricao: descricao,
        tipo: 'estoque',
        timestamp: Date.now(),
        lida: false
      });
    }
  },

  renderPecas() {
    const busca = (document.getElementById('estSearch')?.value || '').toLowerCase();
    const categoria = document.getElementById('estFiltroCat')?.value || '';
    const filtroStock = document.getElementById('estFiltroStock')?.value || '';

    let filtered = window.State.pecas.filter(peca => {
      if (busca && !peca.codigo.toLowerCase().includes(busca) && !peca.descricao.toLowerCase().includes(busca)) return false;
      if (categoria && peca.categoria !== categoria) return false;
      if (filtroStock === 'baixo' && peca.quantidade > peca.minimo) return false;
      if (filtroStock === 'zero' && peca.quantidade > 0) return false;
      if (filtroStock === 'normal' && (peca.quantidade <= peca.minimo || peca.quantidade <= 0)) return false;
      return true;
    });

    const tbody = document.getElementById('estPecasBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center p-4 text-[var(--muted)]">Nenhuma peça encontrada</td></tr>';
      return;
    }

    const podeEditar = window.Auth.can('estoque_editar');
    const podeExcluir = window.Auth.can('estoque_excluir');

    filtered.forEach(peca => {
      const statusClass = peca.quantidade === 0 ? 'stock-zero' : (peca.quantidade <= peca.minimo ? 'stock-low' : 'stock-ok');
      const statusText = peca.quantidade === 0 ? 'ZERADO' : (peca.quantidade <= peca.minimo ? 'BAIXO' : 'OK');
      const statusColor = peca.quantidade === 0 ? 'text-[var(--danger)]' : (peca.quantidade <= peca.minimo ? 'text-[var(--warning)]' : 'text-[var(--success)]');

      let acoes = '';
      if (podeEditar) acoes += `<i class="fas fa-edit text-blue-400 cursor-pointer mr-2" onclick="EstoqueModule.editarPeca(${peca.id})"></i>`;
      if (podeExcluir) acoes += `<i class="fas fa-trash text-red-400 cursor-pointer" onclick="EstoqueModule.excluirPeca(${peca.id})"></i>`;

      const row = tbody.insertRow();
      row.innerHTML = `
        <td class="font-mono font-bold">${window.esc(peca.codigo)}</td>
        <td>${window.esc(peca.descricao)}</td>
        <td class="text-xs">${window.esc(peca.categoria)}</td>
        <td class="font-mono font-bold ${statusColor}">${peca.quantidade} ${window.esc(peca.unidade)}</td>
        <td class="font-mono">${peca.minimo}</td>
        <td class="font-mono">${window.Utils.moneyFormat(peca.preco_venda)}</td>
        <td><span class="px-2 py-1 rounded-full text-xs font-bold ${statusClass}">${statusText}</span></td>
        <td>${acoes}</td>
      `;
    });
  },

  renderMovimentos() {
    const dataInicio = document.getElementById('movDataInicio')?.value;
    const dataFim = document.getElementById('movDataFim')?.value;
    const filtroTipo = document.getElementById('movFiltroTipo')?.value;

    let filtered = window.State.movimentosEstoque.filter(mov => {
      if (filtroTipo && mov.tipo !== filtroTipo) return false;
      if (dataInicio || dataFim) {
        const dataMov = mov.data_hora ? mov.data_hora.split(' ')[0] : '';
        if (dataInicio && dataMov < dataInicio) return false;
        if (dataFim && dataMov > dataFim) return false;
      }
      return true;
    });

    filtered = filtered.slice(0, 100);

    const tbody = document.getElementById('estMovBody');
    const empty = document.getElementById('estMovEmpty');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!filtered.length) {
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    filtered.forEach(mov => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td class="text-xs">${window.esc(mov.data_hora)}</td>
        <td><span class="${mov.tipo === 'entrada' ? 'text-[var(--success)]' : 'text-[var(--danger)]'} font-bold">${mov.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA'}</span></td>
        <td><span class="font-mono text-xs">${window.esc(mov.peca_codigo)}</span> ${window.esc(mov.peca_descricao)}</td>
        <td class="font-mono font-bold">${mov.quantidade}</td>
        <td class="font-mono text-xs">${window.esc(mov.os_vinculada || '-')}</td>
        <td class="text-xs">${window.esc(mov.observacao || '-')}</td>
      `;
    });
  },

  updateStats() {
    const total = window.State.pecas.length;
    let estoqueBaixo = 0;
    let valorTotalEstoque = 0;

    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    let entradasMes = 0;
    let saidasMes = 0;

    window.State.pecas.forEach(peca => {
      if (peca.quantidade <= peca.minimo) estoqueBaixo++;
      valorTotalEstoque += peca.quantidade * peca.preco_custo;
    });

    window.State.movimentosEstoque.forEach(mov => {
      const dataMov = mov.data_hora ? new Date(mov.data_hora.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')) : null;
      if (dataMov && dataMov.getMonth() === mesAtual && dataMov.getFullYear() === anoAtual) {
        if (mov.tipo === 'entrada') entradasMes += mov.quantidade;
        else saidasMes += mov.quantidade;
      }
    });

    const elTotal = document.getElementById('statEstTotalPecas');
    const elBaixo = document.getElementById('statEstoqueBaixo');
    const elEntradas = document.getElementById('statEstEntradas');
    const elSaidas = document.getElementById('statEstSaidas');
    const elValor = document.getElementById('statEstValorTotal');

    if (elTotal) elTotal.innerText = total;
    if (elBaixo) elBaixo.innerText = estoqueBaixo;
    if (elEntradas) elEntradas.innerText = entradasMes;
    if (elSaidas) elSaidas.innerText = saidasMes;
    if (elValor) elValor.innerText = window.Utils.moneyFormat(valorTotalEstoque);
  },

  loadFromSync(pecas) {
    if (Array.isArray(pecas) && pecas.length) {
      window.State.pecas = pecas;
      window.Storage.savePecas();
      this.renderPecas();
      this.updateStats();
      this.preencherSelectPecas();
    }
  },

  loadMovimentosFromSync(movimentos) {
    if (Array.isArray(movimentos) && movimentos.length) {
      window.State.movimentosEstoque = movimentos;
      window.Storage.saveMovimentos();
      this.renderMovimentos();
    }
  }
};

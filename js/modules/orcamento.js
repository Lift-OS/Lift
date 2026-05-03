// modules/orcamento.js - Módulo de Orçamentos (com salvamento persistente e busca de peças)
window.OrcamentoModule = {
  state: {
    itens: [],
    editId: null,
    salvandoAutomaticamente: false
  },

  // Salva o estado atual no sessionStorage
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

  // Restaura estado salvo
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

  // Limpar estado salvo (após salvar/enviar/gerar OS)
  limparEstadoSalvo() {
    sessionStorage.removeItem('orcamento_estado');
  },

  init() {
    // Tenta restaurar estado anterior; se não houver, cria novo
    const restaurado = this.restaurarEstado();
    if (!restaurado) {
      this.novo();
    }
    this.loadEventListeners();
    this.renderLista();
    this.updateStats();
    this.preencherClientes();
    this.preencherTecnicos();
    if (window.SignatureOrc) window.SignatureOrc.init();
    // Adiciona listener para salvar automaticamente em qualquer alteração
    this.ativarAutoSave();
  },

  ativarAutoSave() {
    const campos = ['orc_cliente', 'orc_equipamento', 'orc_serie_combustivel', 'orc_tecnico', 'orc_descricao', 'orc_observacoes', 'orc_assinante', 'orc_assinante_cpf', 'orcDesconto'];
    campos.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.salvarEstado());
    });
    // Também salva ao adicionar/remover itens
  },

  // Preenche o datalist de peças para autocomplete
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
      option.setAttribute('data-tipo', 'peca');
      datalist.appendChild(option);
    });
  },

  // Ao adicionar item, se a descrição corresponder a uma peça, preenche valor e tipo
  adicionarItemComBusca(descricaoDigitada) {
    const pecaEncontrada = window.State.pecas.find(p => 
      p.codigo === descricaoDigitada || 
      p.descricao.toLowerCase().includes(descricaoDigitada.toLowerCase()) ||
      `${p.codigo} - ${p.descricao}` === descricaoDigitada
    );
    if (pecaEncontrada) {
      this.addItem(pecaEncontrada.descricao, 'peca', 1, pecaEncontrada.preco_venda);
    } else {
      // Se não encontrou, abre um prompt ou deixa o usuário digitar manualmente
      const valor = prompt('Peça não encontrada no estoque. Digite o valor unitário:', '0');
      if (valor !== null) {
        this.addItem(descricaoDigitada, 'peca', 1, parseFloat(valor));
      }
    }
  },

  // Método addItem modificado para aceitar descrição com busca
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

  // Método renderItens atualizado para incluir datalist e eventos de busca
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
      // Se não encontrou, mantém o texto digitado e o usuário ajusta manualmente
      this.state.itens[index].descricao = valorDigitado;
      this.calcularTotais();
      this.salvarEstado();
    }
  },

  // ... (todos os outros métodos permanecem iguais, como novo, salvarRascunho, etc.)
  // Apenas garanta que ao salvar/enviar/gerar OS, chame this.limparEstadoSalvo()
  async salvarRascunho() {
    // ... código existente ...
    this.limparEstadoSalvo();
  },
  async enviarCliente() {
    // ... código ...
    this.limparEstadoSalvo();
  },
  async aprovarOrcamento() {
    // ... código ...
    this.limparEstadoSalvo();
  },
  gerarOS() {
    // ... código ...
    this.limparEstadoSalvo();
  }
};

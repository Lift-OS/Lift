// modules/historico.js - Módulo de Histórico (corrigido)
window.HistoricoModule = {
  init() {
    this.render();
    this.updateStats();
    this.loadEventListeners();
  },

  loadEventListeners() {
    const searchInput = document.getElementById('historicoSearch');
    if (searchInput) searchInput.oninput = () => this.render();
    const filtroTipo = document.getElementById('historicoFiltroTipo');
    if (filtroTipo) filtroTipo.onchange = () => this.render();
    const filtroStatus = document.getElementById('historicoFiltroStatus');
    if (filtroStatus) filtroStatus.onchange = () => this.render();
    const btnExportar = document.getElementById('btnExportarCSVHistorico');
    if (btnExportar) btnExportar.onclick = () => this.exportCSV();
    const btnImportar = document.getElementById('btnImportarCSVHistorico');
    if (btnImportar) btnImportar.onclick = () => this.importCSV();
    const btnLimpar = document.getElementById('btnLimparHistorico');
    if (btnLimpar) btnLimpar.onclick = () => this.clear();
  },

  updateStats() {
    const total = window.State.osHistory.length;
    const stats = { abertura: 0, execucao: 0, finalizacao: 0, fechada: 0, aprovada: 0 };
    let esteMes = 0;
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();

    window.State.osHistory.forEach(os => {
      if (stats[os.status] !== undefined) stats[os.status]++;
      if (os.dataOS) {
        const data = new Date(os.dataOS + 'T12:00:00');
        if (!isNaN(data.getTime()) && data.getMonth() === mesAtual && data.getFullYear() === anoAtual) {
          esteMes++;
        }
      }
    });

    const elTotal = document.getElementById('statTotalOS');
    const elAbertura = document.getElementById('statStatusAbertura');
    const elExecucao = document.getElementById('statStatusExecucao');
    const elFinalizacao = document.getElementById('statStatusFinalizacao');
    const elFechada = document.getElementById('statStatusFechada');
    const elAprovada = document.getElementById('statStatusAprovada');
    const elEsteMes = document.getElementById('statEsteMes');

    if (elTotal) elTotal.innerText = total;
    if (elAbertura) elAbertura.innerText = stats.abertura;
    if (elExecucao) elExecucao.innerText = stats.execucao;
    if (elFinalizacao) elFinalizacao.innerText = stats.finalizacao;
    if (elFechada) elFechada.innerText = stats.fechada;
    if (elAprovada) elAprovada.innerText = stats.aprovada;
    if (elEsteMes) elEsteMes.innerText = esteMes;
  },

  render() {
    const busca = (document.getElementById('historicoSearch')?.value || '').toLowerCase();
    const filtroTipo = document.getElementById('historicoFiltroTipo')?.value || '';
    const filtroStatus = document.getElementById('historicoFiltroStatus')?.value || '';

    let filtered = window.State.osHistory.filter(os => {
      if (busca && !os.numeroOS?.toLowerCase().includes(busca) && !os.cliente?.toLowerCase().includes(busca)) return false;
      if (filtroTipo && os.tipoChamado !== filtroTipo) return false;
      if (filtroStatus && os.status !== filtroStatus) return false;
      return true;
    });

    filtered.sort((a, b) => (b.dataOS || '').localeCompare(a.dataOS || ''));

    const tbody = document.getElementById('historicoTableBody');
    const empty = document.getElementById('historicoEmpty');

    if (!tbody) return;
    tbody.innerHTML = '';

    if (!filtered.length) {
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    const podeExcluir = window.Auth.can('historico_excluir');
    const podeEditar = window.Auth.can('editar_os');

    filtered.forEach(os => {
      // Garante que os campos existam
      const numeroOS = os.numeroOS || os.numeroos || 'N/A';
      const dataOS = os.dataOS || os.dataos || '';
      const cliente = os.cliente || '';
      const status = os.status || 'abertura';
      const horasTotais = os.horasTotais || os.horastotais || '0h';
      const orcamentoVinculado = os.orcamentoVinculado || os.orcamentovinculado || '';

      let acoes = `<button onclick="HistoricoModule.verDetalhe('${window.esc(numeroOS)}')" class="text-blue-400"><i class="fas fa-eye"></i></button>`;
      if (podeEditar) acoes += ` <button onclick="HistoricoModule.editar('${window.esc(numeroOS)}')" class="text-orange-400 ml-2"><i class="fas fa-edit"></i></button>`;
      if (podeExcluir) acoes += ` <button onclick="HistoricoModule.excluir('${window.esc(numeroOS)}')" class="text-red-400 ml-2"><i class="fas fa-trash"></i></button>`;

      const orcTag = orcamentoVinculado ? `<i class="fas fa-file-invoice-dollar text-xs text-[var(--warning)] ml-1" title="Orç: ${window.esc(orcamentoVinculado)}"></i>` : '';

      const row = tbody.insertRow();
      row.innerHTML = `
        <td class="font-mono font-bold">${window.esc(numeroOS)}${orcTag}</td>
        <td class="p-2">${window.esc(dataOS)}</td>
        <td class="font-medium">${window.esc(cliente).toUpperCase()}</td>
        <td class="p-2"><span class="status-badge status-${status}">${window.Utils.formatStatus(status)}</span></td>
        <td class="font-mono font-bold text-[var(--success)]">${window.esc(horasTotais)}</td>
        <td class="p-2">${acoes}</td>
      `;
    });
  },

  verDetalhe(numero) {
    const os = window.State.osHistory.find(o => o.numeroOS === numero || o.numeroos === numero);
    if (!os) {
      showToast('OS não encontrada', true);
      return;
    }
    if (window.OSModule) {
      window.OSModule.carregarOS(os);
      window.PageLoader.load('os');
    }
  },

  editar(numero) {
    this.verDetalhe(numero);
  },

  async excluir(numero) {
    if (!window.Auth.can('historico_excluir')) {
      showToast('Apenas administrador pode excluir', true);
      return;
    }

    if (!confirm(`⚠️ ATENÇÃO: Excluir permanentemente a OS ${numero}?\n\nEssa ação não pode ser desfeita e removerá da planilha.`)) {
      return;
    }

    try {
      // Remove da planilha via Google Sheets
      if (window.GoogleSheets && window.Auth.can('sincronizar')) {
        const result = await window.GoogleSheets.syncDeleteOS({ numeroOS: numero });
        if (!result) {
          showToast(`Falha ao excluir da planilha`, true);
          return;
        }
      }

      // Remove do localStorage
      window.State.osHistory = window.State.osHistory.filter(o => 
        o.numeroOS !== numero && o.numeroos !== numero
      );
      window.Storage.saveOSHistory();

      // Atualiza interface
      this.render();
      this.updateStats();
      if (window.ClientesModule) window.ClientesModule.updateStats();
      
      showToast(`✅ OS ${numero} excluída permanentemente!`);
    } catch (error) {
      console.error('Erro ao excluir:', error);
      showToast('Erro ao excluir OS', true);
    }
  },

  exportCSV() {
    if (!window.Auth.can('historico_exportar_csv')) {
      showToast('Apenas administrador pode exportar', true);
      return;
    }
    let csv = "OS,Data,Cliente,Status,Tipo,Horas,Total\n";
    window.State.osHistory.forEach(os => {
      const numeroOS = os.numeroOS || os.numeroos || '';
      const dataOS = os.dataOS || os.dataos || '';
      const cliente = os.cliente || '';
      const status = os.status || 'abertura';
      const tipoChamado = os.tipoChamado || os.tipochamado || 'normal';
      const horasTotais = os.horasTotais || os.horastotais || '0h';
      const totalGeral = os.totalGeral || os.totalgeral || '00:00';
      csv += `${numeroOS},${dataOS},"${cliente}",${window.Utils.formatStatus(status)},${tipoChamado},${horasTotais},${totalGeral}\n`;
    });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historico_${window.Utils.dataHojeISO()}.csv`;
    link.click();
    showToast('Histórico exportado');
  },

  importCSV() {
    if (!window.Auth.can('historico_importar_csv')) {
      showToast('Apenas administrador pode importar', true);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const lines = ev.target.result.split('\n');
        let importados = 0;
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const cols = window.Utils.parseCSVLine(lines[i]);
          if (cols[0]) {
            window.State.osHistory.push({
              numeroOS: cols[0],
              dataOS: cols[1] || '',
              cliente: (cols[2] || '').replace(/"/g, ''),
              status: (cols[3] || '').toLowerCase() || 'abertura',
              tipoChamado: (cols[4] || '').toLowerCase() || 'normal',
              horasTotais: cols[5] || '0h',
              totalGeral: cols[6] || '00:00',
              descricaoServico: '',
              pecasAplicadas: '',
              pendencias: '',
              relatoCliente: '',
              marca: '',
              modelo: '',
              numSerie: '',
              horimetro: '',
              combustivel: '',
              whatsappCliente: '',
              cnpj: '',
              cidadeCliente: '',
              endereco: '',
              tecnico: 'LiftOS',
              recebedor: '',
              orcamentoVinculado: '',
              fotosBase64: [],
              fotoHorimetro: null,
              fotosPendencias: [],
              assinaturaTecnico: '',
              assinaturaCliente: '',
              checklistData: {}
            });
            importados++;
          }
        }
        window.Storage.saveOSHistory();
        this.render();
        this.updateStats();
        if (window.ClientesModule) window.ClientesModule.updateStats();
        showToast(`${importados} OS importadas`);
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  },

  async clear() {
    if (!window.Auth.can('historico_limpar')) {
      showToast('Apenas administrador pode limpar', true);
      return;
    }
    if (!confirm('⚠️ ATENÇÃO: Isso irá apagar TODO o histórico de OS.\n\nEsta ação não pode ser desfeita. Confirmar?')) return;

    try {
      const total = window.State.osHistory.length;
      window.State.osHistory = [];
      window.Storage.saveOSHistory();

      this.render();
      this.updateStats();
      if (window.ClientesModule) window.ClientesModule.updateStats();
      showToast(`${total} OS removidas localmente`);
    } catch (error) {
      showToast('Erro ao limpar', true);
    }
  },

  // Força atualização dos dados
  refresh() {
    this.render();
    this.updateStats();
  }
};

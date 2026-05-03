// modules/os.js - Módulo de Ordem de Serviço
window.OSModule = {
  state: {
    currentStatus: 'abertura',
    fotosServico: [],
    fotoHorimetro: null,
    fotosPendencias: [],
    hasUnsavedChanges: false,
    editMode: false,
    editingOS: null
  },

  // Configurações
  config: {
    marcas: ["TOYOTA", "CLARK", "BYD", "PALETRANS", "LINDE", "HYSTER", "YALE", "CATERPILLAR", "KOMATSU", "MITSUBISHI", "NISSAN", "STILL", "CROWN", "JUNGHEINRICH", "TCM", "HYUNDAI", "DOOSAN", "HELI", "HANGCHA", "LONKING", "OUTRA"],
    maxFotos: 10
  },

  init() {
    this.loadEventListeners();
    this.populateMarcas();
    this.setDefaultDate();
    this.updateUI();
    if (window.Timer) window.Timer.restore();
  },

  loadEventListeners() {
    // Botões principais
    const btnAbrir = document.getElementById('btnAbrirOS');
    if (btnAbrir) btnAbrir.onclick = () => this.mudarStatus('abertura');

    const btnIniciar = document.getElementById('btnIniciarExecucao');
    if (btnIniciar) btnIniciar.onclick = () => this.iniciarExecucao();

    const btnFinalizar = document.getElementById('btnFinalizar');
    if (btnFinalizar) btnFinalizar.onclick = () => this.finalizarServico();

    const btnFechar = document.getElementById('btnFecharOS');
    if (btnFechar) btnFechar.onclick = () => this.fecharOS();

    const btnAprovar = document.getElementById('btnAprovar');
    if (btnAprovar) btnAprovar.onclick = () => this.mudarStatus('aprovada');

    const btnSalvar = document.getElementById('btnSalvarProgresso');
    if (btnSalvar) btnSalvar.onclick = () => this.salvar();

    const btnNovaOS = document.getElementById('btnNovaOS');
    if (btnNovaOS) btnNovaOS.onclick = () => this.novaOS();

    // Marca select
    const marcaSelect = document.getElementById('marcaSelect');
    const marcaOutraDiv = document.getElementById('marcaOutraDiv');
    const marcaOutra = document.getElementById('marcaOutra');
    if (marcaSelect) {
      marcaSelect.onchange = () => {
        const isOutra = marcaSelect.value === 'OUTRA';
        if (marcaOutraDiv) marcaOutraDiv.style.display = isOutra ? 'block' : 'none';
        const marca = isOutra ? (marcaOutra?.value || '').toUpperCase() : marcaSelect.value;
        window.Utils.setVal('marca', marca);
      };
    }
    if (marcaOutra) {
      marcaOutra.oninput = () => {
        window.Utils.setVal('marca', marcaOutra.value.toUpperCase());
      };
    }

    // Foto inputs
    const fotoHorimetro = document.getElementById('fotoHorimetroInput');
    if (fotoHorimetro) fotoHorimetro.onchange = (e) => this.handleFotoHorimetro(e);

    const fotosServico = document.getElementById('fotosServico');
    if (fotosServico) fotosServico.onchange = (e) => this.handleFotosServico(e);

    const fotosPendencias = document.getElementById('fotosPendenciasInput');
    if (fotosPendencias) fotosPendencias.onchange = (e) => this.handleFotosPendencias(e);

    // Horas
    if (window.HorasModule) window.HorasModule.init();
  },

  populateMarcas() {
    const select = document.getElementById('marcaSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione</option>';
    this.config.marcas.forEach(marca => {
      if (marca !== 'OUTRA') {
        select.innerHTML += `<option value="${marca}">${marca}</option>`;
      }
    });
    select.innerHTML += '<option value="OUTRA">OUTRA</option>';
  },

  setDefaultDate() {
    const dataOS = document.getElementById('dataOS');
    if (dataOS && !dataOS.value) {
      dataOS.value = window.Utils.dataHojeISO();
    }
  },

  updateUI() {
    const status = this.state.currentStatus;
    const canChange = window.Auth.can('mudar_status');

    const botoes = {
      btnIniciarExecucao: { show: canChange && status === 'abertura' },
      btnFinalizar: { show: canChange && status === 'execucao' },
      btnFecharOS: { show: canChange && status === 'finalizacao' },
      btnAprovar: { show: canChange && status === 'fechada' }
    };

    for (const [id, cfg] of Object.entries(botoes)) {
      const btn = document.getElementById(id);
      if (btn) {
        btn.style.display = cfg.show ? 'inline-flex' : 'none';
        btn.disabled = !cfg.show;
      }
    }

    // Botões PDF e Email
    const btnPdf = document.getElementById('btnPreviaPDF');
    if (btnPdf) btnPdf.disabled = status !== 'aprovada';

    const btnEmail = document.getElementById('btnEnviarEmail');
    if (btnEmail) btnEmail.disabled = status !== 'aprovada';

    // Status badge
    const badge = document.getElementById('statusBadge');
    if (badge) {
      const statusMap = {
        'abertura': { text: 'EM ABERTURA', class: 'status-abertura' },
        'execucao': { text: 'EM EXECUÇÃO', class: 'status-execucao' },
        'finalizacao': { text: 'FINALIZANDO', class: 'status-finalizacao' },
        'fechada': { text: 'FECHADA', class: 'status-fechada' },
        'aprovada': { text: 'APROVADA', class: 'status-aprovada' }
      };
      const s = statusMap[status] || statusMap.abertura;
      badge.textContent = s.text;
      badge.className = `status-badge ${s.class}`;
    }

    // Steps
    const steps = ['abertura', 'execucao', 'finalizacao', 'fechada', 'aprovada'];
    const stepElements = document.querySelectorAll('.step');
    stepElements.forEach((el, i) => {
      el.classList.remove('active', 'completed', 'locked');
      if (steps[i] === status) {
        el.classList.add('active');
      } else if (steps.indexOf(status) > i) {
        el.classList.add(status === 'aprovada' && steps[i] === 'fechada' ? 'locked' : 'completed');
      }
    });
  },

  async salvar() {
    if (!window.Auth.can('salvar_os')) {
      showToast('Sem permissão para salvar', true);
      return false;
    }

    const dados = this.coletarDados();
    dados.status = this.state.currentStatus;
    dados.fotosBase64 = this.state.fotosServico;
    dados.fotoHorimetro = this.state.fotoHorimetro;
    dados.fotosPendencias = this.state.fotosPendencias;
    dados.assinaturaTecnico = window.Utils.getVal('assinaturaTecnicoData');
    dados.assinaturaCliente = window.Utils.getVal('assinaturaClienteData');

    if (window.ChecklistModule) {
      dados.checklistData = window.ChecklistModule.getData();
    }

    if (window.HorasModule) {
      window.HorasModule.calcular();
      dados.horasTotais = window.Utils.getVal('horasTotais');
      dados.totalGeral = window.Utils.getVal('totalGeral');
    }

    if (!dados.numeroOS) {
      dados.numeroOS = window.Utils.generateOSNumber();
      document.getElementById('numeroOS').value = dados.numeroOS;
    }

    try {
      const index = window.State.osHistory.findIndex(o => o.numeroOS === dados.numeroOS);
      if (index >= 0) {
        window.State.osHistory[index] = dados;
      } else {
        window.State.osHistory.unshift(dados);
      }
      window.Storage.saveOSHistory();
      this.state.hasUnsavedChanges = false;

      if (window.GoogleSheets && window.Auth.can('sincronizar')) {
        await window.GoogleSheets.syncSingleOS(dados);
      }

      if (window.HistoricoModule) window.HistoricoModule.render();
      if (window.ClientesModule) window.ClientesModule.updateStats();

      showToast('OS salva com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao salvar OS:', error);
      showToast('Erro ao salvar OS', true);
      return false;
    }
  },

  coletarDados() {
    const dados = {};
    const inputs = document.querySelectorAll('#tab-os input, #tab-os select, #tab-os textarea');
    inputs.forEach(el => {
      if (el.id && el.type !== 'file') {
        dados[el.id] = el.value;
      }
    });

    const marcaSelect = document.getElementById('marcaSelect');
    const marcaOutra = document.getElementById('marcaOutra');
    if (marcaSelect) {
      dados.marca = marcaSelect.value === 'OUTRA' ? (marcaOutra?.value || '').toUpperCase() : marcaSelect.value;
    }

    return dados;
  },

  async mudarStatus(novoStatus) {
    if (!window.Auth.can('mudar_status')) {
      showToast('Sem permissão', true);
      return;
    }

    const statusAtual = this.state.currentStatus;

    // Validações
    if (novoStatus === 'execucao' && statusAtual !== 'abertura') {
      showToast('Precisa estar em ABERTURA', true);
      return;
    }
    if (novoStatus === 'finalizacao' && statusAtual !== 'execucao') {
      showToast('Precisa estar em EXECUÇÃO', true);
      return;
    }
    if (novoStatus === 'fechada' && statusAtual !== 'finalizacao') {
      showToast('Precisa estar FINALIZANDO', true);
      return;
    }
    if (novoStatus === 'aprovada') {
      if (statusAtual !== 'fechada') {
        showToast('Precisa estar FECHADA', true);
        return;
      }
      const assinatura = window.Utils.getVal('assinaturaClienteData');
      const recebedor = window.Utils.getVal('recebedor');
      if (!assinatura) {
        showToast('Cliente deve assinar', true);
        return;
      }
      if (!recebedor || !recebedor.trim()) {
        showToast('Nome do recebedor é obrigatório', true);
        return;
      }
    }

    this.state.currentStatus = novoStatus;
    if (novoStatus === 'finalizacao' || novoStatus === 'fechada') {
      if (window.HorasModule) window.HorasModule.calcular();
    }

    const ok = await this.salvar();
    if (ok) {
      this.updateUI();
      if (window.HistoricoModule) window.HistoricoModule.render();
      showToast(`Status: ${window.Utils.formatStatus(novoStatus)}`);
    }
  },

  iniciarExecucao() {
    if (this.state.currentStatus !== 'abertura') return;
    this.mudarStatus('execucao');
    if (window.Timer) window.Timer.start();
    showToast('Execução iniciada');
  },

  finalizarServico() {
    if (this.state.currentStatus !== 'execucao') return;
    const horimetro = window.Utils.getVal('horimetro');
    if (!horimetro || !window.Utils.validarHorimetro(horimetro)) {
      showToast('Horímetro inválido (ex: 1250h)', true);
      return;
    }
    if (window.Timer) window.Timer.stop();
    if (window.HorasModule) window.HorasModule.calcular();
    this.mudarStatus('finalizacao');
  },

  fecharOS() {
    if (this.state.currentStatus !== 'finalizacao') return;
    const descricao = window.Utils.getVal('descricaoServico');
    if (!descricao || !descricao.trim()) {
      showToast('Descreva o serviço realizado', true);
      return;
    }
    if (!confirm('Fechar OS? Esta ação não poderá ser desfeita.')) return;
    this.mudarStatus('fechada');
  },

  novaOS() {
    if (!window.Auth.can('criar_os')) {
      showToast('Sem permissão', true);
      return;
    }

    if (this.state.hasUnsavedChanges && !confirm('Há alterações não salvas. Criar nova OS mesmo assim?')) {
      return;
    }

    // Reset state
    this.state.currentStatus = 'abertura';
    this.state.fotosServico = [];
    this.state.fotoHorimetro = null;
    this.state.fotosPendencias = [];
    this.state.hasUnsavedChanges = false;

    // Limpar campos
    const inputs = document.querySelectorAll('#tab-os input, #tab-os select, #tab-os textarea');
    inputs.forEach(el => {
      if (el.id && el.type !== 'file') {
        if (el.id === 'dataOS') {
          el.value = window.Utils.dataHojeISO();
        } else {
          el.value = '';
        }
      }
    });

    // Limpar previews
    const fps = document.getElementById('fotosPreview');
    if (fps) fps.innerHTML = '';
    const fhp = document.getElementById('fotoHorimetroPreview');
    if (fhp) fhp.innerHTML = '';
    const fpp = document.getElementById('fotosPendenciasPreview');
    if (fpp) fpp.innerHTML = '';

    // Reset assinaturas
    if (window.SignatureModule) {
      window.SignatureModule.clear('tec');
      window.SignatureModule.clear('cli');
    }

    // Reset timer
    if (window.Timer) window.Timer.reset();

    // Gerar número
    const osNum = window.Utils.generateOSNumber();
    document.getElementById('numeroOS').value = osNum;

    // Reset checklist
    if (window.ChecklistModule) window.ChecklistModule.reset();

    // Esconder badge de orçamento
    const orcBadge = document.getElementById('orcVinculadoBadge');
    if (orcBadge) orcBadge.style.display = 'none';

    this.updateUI();
    showToast(`Nova OS: ${osNum}`);
  },

  carregarOS(dados) {
    // Carrega dados de uma OS existente
    this.state.currentStatus = dados.status || 'abertura';

    // Preenche campos
    for (const [key, value] of Object.entries(dados)) {
      if (key !== 'fotosBase64' && key !== 'fotoHorimetro' && key !== 'fotosPendencias' &&
          key !== 'assinaturaTecnico' && key !== 'assinaturaCliente' && key !== 'checklistData') {
        window.Utils.setVal(key, value);
      }
    }

    // Fotos
    this.state.fotoHorimetro = dados.fotoHorimetro || null;
    this.state.fotosServico = dados.fotosBase64 || [];
    this.state.fotosPendencias = dados.fotosPendencias || [];

    this.renderFotos();
    if (window.SignatureModule) {
      window.SignatureModule.loadFromData('tec', dados.assinaturaTecnico);
      window.SignatureModule.loadFromData('cli', dados.assinaturaCliente);
    }
    if (window.ChecklistModule && dados.checklistData) {
      window.ChecklistModule.loadData(dados.checklistData);
    }

    // Orçamento vinculado
    const orcBadge = document.getElementById('orcVinculadoBadge');
    const orcNum = document.getElementById('orcVinculadoNum');
    if (orcBadge && orcNum) {
      if (dados.orcamentoVinculado) {
        orcBadge.style.display = 'inline-flex';
        orcNum.textContent = dados.orcamentoVinculado;
      } else {
        orcBadge.style.display = 'none';
      }
    }

    this.updateUI();
    showToast('OS carregada');
  },

  renderFotos() {
    // Foto Horímetro
    const fhPreview = document.getElementById('fotoHorimetroPreview');
    if (fhPreview) {
      fhPreview.innerHTML = '';
      if (this.state.fotoHorimetro) {
        fhPreview.innerHTML = `<div class="photo-item"><img src="${this.state.fotoHorimetro}"><div class="photo-remove" onclick="OSModule.removerFotoHorimetro()">x</div></div>`;
      }
    }

    // Fotos Serviço
    const fsPreview = document.getElementById('fotosPreview');
    if (fsPreview) {
      fsPreview.innerHTML = '';
      this.state.fotosServico.forEach((src, idx) => {
        fsPreview.innerHTML += `<div class="photo-item"><img src="${src}"><div class="photo-remove" onclick="OSModule.removerFotoServico(${idx})">x</div></div>`;
      });
    }

    // Fotos Pendências
    const fpPreview = document.getElementById('fotosPendenciasPreview');
    if (fpPreview) {
      fpPreview.innerHTML = '';
      this.state.fotosPendencias.forEach((src, idx) => {
        fpPreview.innerHTML += `<div class="photo-item"><img src="${src}"><div class="photo-remove" onclick="OSModule.removerFotoPendencia(${idx})">x</div></div>`;
      });
    }
  },

  async handleFotoHorimetro(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const compressed = await this.compressImage(file);
      this.state.fotoHorimetro = compressed;
      this.renderFotos();
      this.state.hasUnsavedChanges = true;
      showToast('Foto do horímetro adicionada');
    } catch (error) {
      showToast('Erro ao processar foto', true);
    }
  },

  async handleFotosServico(event) {
    const files = Array.from(event.target.files);
    if (this.state.fotosServico.length + files.length > this.config.maxFotos) {
      showToast(`Máximo de ${this.config.maxFotos} fotos`, true);
      return;
    }
    for (const file of files) {
      try {
        const compressed = await this.compressImage(file);
        this.state.fotosServico.push(compressed);
      } catch (error) {
        console.error('Erro ao processar foto:', error);
      }
    }
    this.renderFotos();
    this.state.hasUnsavedChanges = true;
    event.target.value = '';
    showToast(`${files.length} foto(s) adicionada(s)`);
  },

  async handleFotosPendencias(event) {
    const files = Array.from(event.target.files);
    if (this.state.fotosPendencias.length + files.length > this.config.maxFotos) {
      showToast(`Máximo de ${this.config.maxFotos} fotos`, true);
      return;
    }
    for (const file of files) {
      try {
        const compressed = await this.compressImage(file);
        this.state.fotosPendencias.push(compressed);
      } catch (error) {
        console.error('Erro ao processar foto:', error);
      }
    }
    this.renderFotos();
    this.state.hasUnsavedChanges = true;
    event.target.value = '';
    showToast(`${files.length} foto(s) adicionada(s)`);
  },

  compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 800;
          const maxHeight = 600;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = ev.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  removerFotoHorimetro() {
    this.state.fotoHorimetro = null;
    document.getElementById('fotoHorimetroInput').value = '';
    this.renderFotos();
    this.state.hasUnsavedChanges = true;
    showToast('Foto removida');
  },

  removerFotoServico(index) {
    this.state.fotosServico.splice(index, 1);
    this.renderFotos();
    this.state.hasUnsavedChanges = true;
  },

  removerFotoPendencia(index) {
    this.state.fotosPendencias.splice(index, 1);
    this.renderFotos();
    this.state.hasUnsavedChanges = true;
  },

  loadFromSync(osList) {
    if (Array.isArray(osList) && osList.length) {
      window.State.osHistory = osList;
      window.Storage.saveOSHistory();
      if (window.HistoricoModule) window.HistoricoModule.render();
      if (window.ClientesModule) window.ClientesModule.updateStats();
    }
  },

  // Geração de PDF
  gerarRelatorioHTML() {
    const cliente = window.Utils.getVal('cliente');
    const endereco = window.Utils.getVal('endereco');
    const ml = endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}` : '';

    return `<!DOCTYPE html>
    <html>
    <head>
      <title>Relatorio_${window.Utils.getVal('numeroOS')}</title>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; max-width: 900px; margin: auto; }
        h1 { color: #f97316; }
        h3 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
        th { background: #f97316; color: white; }
        .signature-img { max-width: 200px; border: 1px solid #ccc; margin-top: 10px; }
        .footer { margin-top: 30px; text-align: center; color: #999; font-size: 11px; }
      </style>
    </head>
    <body>
      <h1>Lift OS</h1>
      <h2>RELATÓRIO - OS ${window.Utils.getVal('numeroOS')}</h2>
      <p>Data: ${window.Utils.agoraBr()}</p>
      <h3>Dados do Cliente</h3>
      <p><strong>Cliente:</strong> ${window.esc(cliente)}<br>
      <strong>CNPJ/CPF:</strong> ${window.esc(window.Utils.getVal('cnpj'))}<br>
      <strong>Endereço:</strong> ${window.esc(endereco)} - ${window.esc(window.Utils.getVal('cidadeCliente'))}</p>
      ${ml ? `<p><a href="${ml}" target="_blank">Ver localização no mapa</a></p>` : ''}
      <h3>Equipamento</h3>
      <p><strong>Marca:</strong> ${window.esc(window.Utils.getVal('marca'))} | 
      <strong>Modelo:</strong> ${window.esc(window.Utils.getVal('modelo'))} | 
      <strong>Série:</strong> ${window.esc(window.Utils.getVal('numSerie'))} | 
      <strong>Horímetro:</strong> ${window.esc(window.Utils.getVal('horimetro'))}h</p>
      <h3>Serviço Executado</h3>
      <p><strong>Diagnóstico:</strong><br>${window.esc(window.Utils.getVal('descricaoServico')).replace(/\n/g, '<br>')}</p>
      <p><strong>Peças Aplicadas:</strong><br>${window.esc(window.Utils.getVal('pecasAplicadas')).replace(/\n/g, '<br>')}</p>
      <p><strong>Pendências:</strong><br>${window.esc(window.Utils.getVal('pendencias')).replace(/\n/g, '<br>')}</p>
      <h3>Horas</h3>
      <p><strong>Horas Cobradas:</strong> ${window.esc(window.Utils.getVal('horasTotais'))} | 
      <strong>Total Geral:</strong> ${window.esc(window.Utils.getVal('totalGeral'))}</p>
      <h3>Assinaturas</h3>
      <div style="display: flex; gap: 40px;">
        <div>
          <strong>Técnico:</strong> ${window.esc(window.Utils.getVal('tecnico'))}<br>
          ${window.Utils.getVal('assinaturaTecnicoData') ? `<img src="${window.Utils.getVal('assinaturaTecnicoData')}" class="signature-img">` : '<em>Não assinado</em>'}
        </div>
        <div>
          <strong>Cliente:</strong> ${window.esc(window.Utils.getVal('recebedor'))}<br>
          ${window.Utils.getVal('assinaturaClienteData') ? `<img src="${window.Utils.getVal('assinaturaClienteData')}" class="signature-img">` : '<em>Não assinado</em>'}
        </div>
      </div>
      <div class="footer">Documento gerado eletronicamente - LiftOS | www.LiftOS.com.br</div>
    </body>
    </html>`;
  }
};

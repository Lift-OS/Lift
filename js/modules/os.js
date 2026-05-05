// modules/os.js - Módulo de Ordem de Serviço (com número OS automático e timer)
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

  config: {
    marcas: ["TOYOTA","CLARK","BYD","PALETRANS","LINDE","HYSTER","YALE","CATERPILLAR","KOMATSU","MITSUBISHI","NISSAN","STILL","CROWN","JUNGHEINRICH","TCM","HYUNDAI","DOOSAN","HELI","HANGCHA","LONKING","OUTRA"],
    maxFotos: 10
  },

  // Timer interno
  timer: {
    interval: null,
    running: false,
    paused: false,
    startRealTime: 0,
    pausedAccum: 0,
    displayElem: null,

    init() {
      this.displayElem = document.getElementById('timerDisplay');
      this.restore();
    },

    start() {
      if (this.running && !this.paused) return;
      if (this.paused) {
        this.paused = false;
        this.running = true;
        this.startRealTime = Date.now();
        if (!window.Utils.getVal('horaAlmocoRetorno')) {
          window.Utils.setVal('horaAlmocoRetorno', new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        }
      } else {
        this.running = true;
        this.paused = false;
        this.pausedAccum = 0;
        this.startRealTime = Date.now();
        if (!window.Utils.getVal('horaInicio')) {
          window.Utils.setVal('horaInicio', new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        }
      }
      this._startInterval();
      this._saveState();
    },

    pause() {
      if (!this.running || this.paused) return;
      this.paused = true;
      this.pausedAccum += (Date.now() - this.startRealTime);
      if (!window.Utils.getVal('horaAlmocoSaida')) {
        window.Utils.setVal('horaAlmocoSaida', new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      }
      this._clearInterval();
      this._saveState();
    },

    stop() {
      if (!this.running) return;
      if (!this.paused) {
        this.pausedAccum += (Date.now() - this.startRealTime);
      }
      this._clearInterval();
      this.running = false;
      this.paused = false;
      if (!window.Utils.getVal('horaTermino')) {
        window.Utils.setVal('horaTermino', new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      }
      if (window.HorasModule) window.HorasModule.calcular();
      this._clearState();
      this.updateDisplay();
    },

    reset() {
      this._clearInterval();
      this.running = false;
      this.paused = false;
      this.pausedAccum = 0;
      this.startRealTime = 0;
      this.updateDisplay();
      this._clearState();
    },

    getElapsedSeconds() {
      let total = this.pausedAccum;
      if (this.running && !this.paused) {
        total += (Date.now() - this.startRealTime);
      }
      return Math.floor(total / 1000);
    },

    updateDisplay() {
      if (!this.displayElem) return;
      const secs = this.getElapsedSeconds();
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      this.displayElem.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    _startInterval() {
      if (this.interval) clearInterval(this.interval);
      this.interval = setInterval(() => this.updateDisplay(), 1000);
    },

    _clearInterval() {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    },

    _saveState() {
      if (this.running && !this.paused) {
        localStorage.setItem('LiftOS_timer_state', JSON.stringify({
          running: true,
          paused: false,
          pausedAccum: this.pausedAccum,
          startReal: this.startRealTime
        }));
      }
    },

    _clearState() {
      localStorage.removeItem('LiftOS_timer_state');
    },

    restore() {
      try {
        const saved = JSON.parse(localStorage.getItem('LiftOS_timer_state'));
        if (saved && saved.running && !saved.paused) {
          this.pausedAccum = saved.pausedAccum || 0;
          this.startRealTime = saved.startReal || Date.now();
          this.running = true;
          this.paused = false;
          this._startInterval();
          this.updateDisplay();
        }
      } catch(e) {}
    }
  },

  // Gera número automático da OS
  gerarNumeroOS() {
    if (typeof window.State.osCounter !== 'number' || isNaN(window.State.osCounter)) {
      window.State.osCounter = 0;
    }
    window.State.osCounter++;
    window.Storage.saveCounter();
    const ano = new Date().getFullYear().toString().slice(-2);
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    return `OS-${ano}${mes}-${String(window.State.osCounter).padStart(4, '0')}`;
  },

  init() {
    this.loadEventListeners();
    this.populateMarcas();
    this.setDefaultDate();
    this.updateUI();
    this.timer.init();
    if (window.Signature) window.Signature.init();
    if (window.ChecklistModule) window.ChecklistModule.init();
    
    // Gera número OS automático se não existir
    const numeroOS = document.getElementById('numeroOS');
    if (numeroOS && !numeroOS.value) {
      numeroOS.value = this.gerarNumeroOS();
    }
  },

  loadEventListeners() {
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

    // Botões do timer
    const timerStart = document.getElementById('timerStart');
    if (timerStart) timerStart.onclick = () => this.timer.start();
    const timerPause = document.getElementById('timerPause');
    if (timerPause) timerPause.onclick = () => this.timer.pause();
    const timerStop = document.getElementById('timerStop');
    if (timerStop) timerStop.onclick = () => this.timer.stop();

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

    const btnPdf = document.getElementById('btnPreviaPDF');
    if (btnPdf) btnPdf.disabled = status !== 'aprovada';
    const btnEmail = document.getElementById('btnEnviarEmail');
    if (btnEmail) btnEmail.disabled = status !== 'aprovada';

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
    } else {
      dados.horasTotais = window.Utils.getVal('horasTotais') || '0h';
      dados.totalGeral = window.Utils.getVal('totalGeral') || '00:00';
    }

    if (!dados.numeroOS) {
      dados.numeroOS = this.gerarNumeroOS();
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
    this.timer.start();
    showToast('Execução iniciada');
  },

  finalizarServico() {
    if (this.state.currentStatus !== 'execucao') return;
    const horimetro = window.Utils.getVal('horimetro');
    if (!horimetro || !window.Utils.validarHorimetro(horimetro)) {
      showToast('Horímetro inválido (ex: 1250h)', true);
      return;
    }
    this.timer.stop();
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

    this.state.currentStatus = 'abertura';
    this.state.fotosServico = [];
    this.state.fotoHorimetro = null;
    this.state.fotosPendencias = [];
    this.state.hasUnsavedChanges = false;

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

    const fps = document.getElementById('fotosPreview');
    if (fps) fps.innerHTML = '';
    const fhp = document.getElementById('fotoHorimetroPreview');
    if (fhp) fhp.innerHTML = '';
    const fpp = document.getElementById('fotosPendenciasPreview');
    if (fpp) fpp.innerHTML = '';

    if (window.Signature) {
      window.Signature.clear('tec');
      window.Signature.clear('cli');
    }

    this.timer.reset();

    // Gera novo número OS
    const osNum = this.gerarNumeroOS();
    document.getElementById('numeroOS').value = osNum;

    if (window.ChecklistModule) window.ChecklistModule.reset();

    const orcBadge = document.getElementById('orcVinculadoBadge');
    if (orcBadge) orcBadge.style.display = 'none';

    this.updateUI();
    showToast(`Nova OS: ${osNum}`);
  },

  carregarOS(dados) {
    this.state.currentStatus = dados.status || 'abertura';

    for (const [key, value] of Object.entries(dados)) {
      if (key !== 'fotosBase64' && key !== 'fotoHorimetro' && key !== 'fotosPendencias' &&
          key !== 'assinaturaTecnico' && key !== 'assinaturaCliente' && key !== 'checklistData') {
        window.Utils.setVal(key, value);
      }
    }

    this.state.fotoHorimetro = dados.fotoHorimetro || null;
    this.state.fotosServico = dados.fotosBase64 || [];
    this.state.fotosPendencias = dados.fotosPendencias || [];

    this.renderFotos();
    if (window.Signature) {
      window.Signature.loadFromData('tec', dados.assinaturaTecnico);
      window.Signature.loadFromData('cli', dados.assinaturaCliente);
    }
    if (window.ChecklistModule && dados.checklistData) {
      window.ChecklistModule.loadData(dados.checklistData);
    }

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
    const fhPreview = document.getElementById('fotoHorimetroPreview');
    if (fhPreview) {
      fhPreview.innerHTML = '';
      if (this.state.fotoHorimetro) {
        fhPreview.innerHTML = `<div class="photo-item"><img src="${this.state.fotoHorimetro}"><div class="photo-remove" onclick="OSModule.removerFotoHorimetro()">x</div></div>`;
      }
    }

    const fsPreview = document.getElementById('fotosPreview');
    if (fsPreview) {
      fsPreview.innerHTML = '';
      this.state.fotosServico.forEach((src, idx) => {
        fsPreview.innerHTML += `<div class="photo-item"><img src="${src}"><div class="photo-remove" onclick="OSModule.removerFotoServico(${idx})">x</div></div>`;
      });
    }

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
          let width = img.width;
          let height = img.height;
          const maxWidth = 800;
          const maxHeight = 600;
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

  gerarRelatorioHTML() {
    // Mantenha a implementação original do PDF
    return '<html><body>Relatório OS</body></html>';
  }
};

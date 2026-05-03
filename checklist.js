// modules/checklist.js - Módulo de Checklist
window.ChecklistModule = {
  config: {
    sections: [
      { id: 'motor', title: 'Motor e Componentes', items: [
        { id: 'motor_oleo', label: 'Nível de óleo do motor' },
        { id: 'motor_filtro_oleo', label: 'Filtro de óleo' },
        { id: 'motor_filtro_ar', label: 'Filtro de ar' },
        { id: 'motor_filtro_comb', label: 'Filtro de combustível' },
        { id: 'motor_correias', label: 'Correias' },
        { id: 'motor_radiador', label: 'Radiador' }
      ] },
      { id: 'eletrico', title: 'Sistema Elétrico', items: [
        { id: 'eletr_bateria', label: 'Bateria' },
        { id: 'eletr_terminais', label: 'Terminais' },
        { id: 'eletr_alternador', label: 'Alternador' },
        { id: 'eletr_partida', label: 'Motor de partida' },
        { id: 'eletr_farois', label: 'Faróis' },
        { id: 'eletr_buzina', label: 'Buzina' }
      ] },
      { id: 'hidraulico', title: 'Sistema Hidráulico', items: [
        { id: 'hidr_oleo', label: 'Nível óleo hidráulico' },
        { id: 'hidr_bomba', label: 'Bomba hidráulica' },
        { id: 'hidr_cilindros', label: 'Cilindros' },
        { id: 'hidr_vazamentos', label: 'Vazamentos' },
        { id: 'hidr_mangueiras', label: 'Mangueiras' }
      ] },
      { id: 'transmissao', title: 'Transmissão e Freios', items: [
        { id: 'trans_oleo', label: 'Óleo transmissão' },
        { id: 'freio_servico', label: 'Freio de serviço' },
        { id: 'freio_estac', label: 'Freio de estacionamento' },
        { id: 'freio_pastilhas', label: 'Pastilhas/Lonas' }
      ] },
      { id: 'direcao', title: 'Direção', items: [
        { id: 'dir_volante', label: 'Volante' },
        { id: 'dir_caixa', label: 'Caixa de direção' },
        { id: 'dir_hidraulica', label: 'Direção hidráulica' }
      ] },
      { id: 'estrutura', title: 'Estrutura e Garfos', items: [
        { id: 'est_mastros', label: 'Mastros' },
        { id: 'est_correntes', label: 'Correntes' },
        { id: 'est_garfos', label: 'Garfos' },
        { id: 'est_roletes', label: 'Roletes' }
      ] },
      { id: 'seguranca', title: 'Segurança', items: [
        { id: 'seg_cinto', label: 'Cinto de segurança' },
        { id: 'seg_extintor', label: 'Extintor' },
        { id: 'seg_espelhos', label: 'Espelhos' },
        { id: 'seg_alarme', label: 'Alarme de ré' }
      ] }
    ]
  },

  total: 0,
  checked: 0,

  init() {
    this.render();
    this.loadEventListeners();
  },

  render() {
    const container = document.getElementById('checklistSections');
    if (!container) return;

    this.total = 0;
    let html = '';

    this.config.sections.forEach(section => {
      this.total += section.items.length;
      html += `
        <div class="checklist-card p-4 md:p-5 mb-4">
          <div class="flex justify-between items-center mb-3 flex-wrap">
            <h3 class="font-display text-xl">${window.esc(section.title)}</h3>
            <button type="button" class="btn btn-secondary text-xs" onclick="ChecklistModule.selectAll('${section.id}')">
              <i class="fas fa-check-double"></i> Todos
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
      `;

      section.items.forEach(item => {
        html += `
          <div class="checklist-item flex items-center justify-between p-2 bg-[var(--bg)] rounded-lg">
            <label class="flex items-center gap-2 cursor-pointer flex-1">
              <input type="checkbox" data-check="true" id="${item.id}" onchange="ChecklistModule.updateProgress()">
              <span class="text-sm">${window.esc(item.label)}</span>
            </label>
            <select id="${item.id}_status" class="form-input w-24 text-xs" onchange="ChecklistModule.updateProgress()">
              <option value="ok">OK</option>
              <option value="atencao">Atenção</option>
              <option value="critico">Crítico</option>
              <option value="na">N/A</option>
            </select>
          </div>
        `;
      });

      html += `</div></div>`;
    });

    container.innerHTML = html;
    this.updateProgress();
  },

  loadEventListeners() {
    // Atualiza barra de progresso quando qualquer checkbox mudar
    const updateBar = () => this.updateProgress();
    document.addEventListener('change', (e) => {
      if (e.target && e.target.type === 'checkbox') updateBar();
    });
  },

  selectAll(sectionId) {
    const section = this.config.sections.find(s => s.id === sectionId);
    if (!section) return;

    section.items.forEach(item => {
      const cb = document.getElementById(item.id);
      if (cb) cb.checked = true;
    });
    this.updateProgress();
  },

  updateProgress() {
    const checkboxes = document.querySelectorAll('input[data-check="true"]');
    this.checked = Array.from(checkboxes).filter(cb => cb.checked).length;
    const percent = this.total > 0 ? Math.round((this.checked / this.total) * 100) : 0;

    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');

    if (progressText) progressText.textContent = `${percent}%`;
    if (progressFill) progressFill.style.width = `${percent}%`;
  },

  getData() {
    const data = {};
    document.querySelectorAll('input[data-check="true"]').forEach(cb => {
      data[cb.id] = cb.checked;
    });
    document.querySelectorAll('#checklistSections select').forEach(select => {
      data[select.id] = select.value;
    });
    return data;
  },

  loadData(data) {
    if (!data) return;
    document.querySelectorAll('input[data-check="true"]').forEach(cb => {
      if (data[cb.id] !== undefined) cb.checked = data[cb.id];
    });
    document.querySelectorAll('#checklistSections select').forEach(select => {
      if (data[select.id] !== undefined) select.value = data[select.id];
    });
    this.updateProgress();
  },

  reset() {
    document.querySelectorAll('input[data-check="true"]').forEach(cb => {
      cb.checked = false;
    });
    document.querySelectorAll('#checklistSections select').forEach(select => {
      select.value = 'ok';
    });
    this.updateProgress();
  }
};
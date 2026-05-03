// ========== UTILITÁRIOS GLOBAIS ==========
window.Utils = {
  // Escape HTML
  esc(s) {
    if (s === null || s === undefined) return '';
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(s)));
    return d.innerHTML;
  },

  // Get/Set element value
  getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  },

  setVal(id, v) {
    const el = document.getElementById(id);
    if (el) el.value = v || '';
  },

  // Formatação
  moneyFormat(v) {
    const n = parseFloat(v) || 0;
    return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },

  formatStatus(s) {
    const map = {
      'abertura': 'EM ABERTURA',
      'execucao': 'EM EXECUÇÃO',
      'finalizacao': 'FINALIZANDO',
      'fechada': 'FECHADA',
      'aprovada': 'APROVADA'
    };
    return map[s] || (s || '').toUpperCase();
  },

  formatOrcStatus(s) {
    const map = {
      'rascunho': 'RASCUNHO',
      'enviado': 'ENVIADO',
      'aprovado': 'APROVADO',
      'rejeitado': 'REJEITADO'
    };
    return map[s] || (s || '').toUpperCase();
  },

  // Datas
  dataHojeISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  agoraBr() {
    return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  },

  hojeBr() {
    return new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  },

  normalizeDate(v) {
    if (!v) return '';
    if (typeof v === 'string' && v.includes('T')) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      }
    }
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    return '';
  },

  extractTimeFromDate(v) {
    if (!v) return '';
    if (typeof v === 'string') {
      const m = v.match(/(\d{1,2}):(\d{2})/);
      if (m) {
        const hh = parseInt(m[1], 10), mm = parseInt(m[2], 10);
        if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
          return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
        }
      }
      if (v.includes('T')) {
        const tp = v.split('T')[1];
        if (tp) {
          const hm = tp.match(/(\d{1,2}):(\d{2})/);
          if (hm) {
            const h2 = parseInt(hm[1], 10), m2 = parseInt(hm[2], 10);
            if (h2 >= 0 && h2 <= 23 && m2 >= 0 && m2 <= 59) {
              return String(h2).padStart(2, '0') + ':' + String(m2).padStart(2, '0');
            }
          }
        }
      }
    }
    return '';
  },

  // Tempo
  timeDiff(start, end) {
    if (!start || !end) return 0;
    const sp = start.split(':').map(Number);
    const ep = end.split(':').map(Number);
    let diff = (ep[0] * 60 + ep[1]) - (sp[0] * 60 + sp[1]);
    return diff < 0 ? diff + 1440 : diff;
  },

  timeToMinutes(t) {
    if (!t) return 0;
    if (t.indexOf('h') !== -1) return parseInt(t) * 60;
    const p = t.split(':');
    return parseInt(p[0]) * 60 + parseInt(p[1] || 0);
  },

  validarHorimetro(h) {
    if (!h) return false;
    const n = parseInt(h.replace('h', ''));
    return !isNaN(n) && n > 0 && n <= 99999;
  },

  // Números
  generateOSNumber() {
    if (typeof window.State?.osCounter !== 'number' || isNaN(window.State?.osCounter)) {
      if (!window.State) window.State = {};
      window.State.osCounter = 0;
    }
    window.State.osCounter++;
    if (window.Storage) window.Storage.saveCounter();
    const n = new Date();
    return 'OS-' + n.getFullYear().toString().slice(-2) + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(window.State.osCounter).padStart(4, '0');
  },

  generateOrcNumber() {
    if (typeof window.State?.orcCounter !== 'number' || isNaN(window.State?.orcCounter)) {
      if (!window.State) window.State = {};
      window.State.orcCounter = 0;
    }
    window.State.orcCounter++;
    if (window.Storage) window.Storage.saveOrcCounter();
    const n = new Date();
    return 'ORC-' + n.getFullYear().toString().slice(-2) + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(window.State.orcCounter).padStart(4, '0');
  },

  // CSV
  parseCSVLine(line) {
    const r = [];
    let c = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') {
          c += '"';
          i++;
        } else if (ch === '"') {
          q = false;
        } else {
          c += ch;
        }
      } else {
        if (ch === '"') {
          q = true;
        } else if (ch === ',') {
          r.push(c);
          c = '';
        } else {
          c += ch;
        }
      }
    }
    r.push(c);
    return r;
  }
};

// Funções globais de atalho
window.esc = (s) => window.Utils.esc(s);
window.$ = (id) => document.getElementById(id);
window.showToast = (msg, isError) => {
  const t = document.getElementById('toastCenter');
  if (!t) return;
  const m = document.getElementById('toastMessage');
  if (m) m.textContent = msg;
  t.style.borderColor = isError ? 'var(--danger)' : 'var(--success)';
  const icon = t.querySelector('i');
  if (icon) icon.className = isError ? 'fas fa-exclamation-circle text-red-500 text-xl' : 'fas fa-check-circle text-green-500 text-xl';
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2800);
};
window.moneyFormat = (v) => window.Utils.moneyFormat(v);
window.dataHojeISO = () => window.Utils.dataHojeISO();
window.agoraBr = () => window.Utils.agoraBr();
window.normalizeDate = (v) => window.Utils.normalizeDate(v);
window.extractTimeFromDate = (v) => window.Utils.extractTimeFromDate(v);
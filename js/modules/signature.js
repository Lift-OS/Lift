// modules/signature.js - Assinaturas digitais para OS
window.Signature = {
  canvases: { tec: null, cli: null },
  ctx: { tec: null, cli: null },
  drawing: { tec: false, cli: false },

  init() {
    this.canvases.tec = document.getElementById('sigTecnicoCanvas');
    this.canvases.cli = document.getElementById('sigClienteCanvas');
    if (this.canvases.tec) this._setup('tec');
    if (this.canvases.cli) this._setup('cli');
    window.addEventListener('resize', () => {
      if (this.canvases.tec) this._resize('tec');
      if (this.canvases.cli) this._resize('cli');
    });
  },

  _setup(who) {
    const canvas = this.canvases[who];
    if (!canvas) return;
    this.ctx[who] = canvas.getContext('2d');
    this._resize(who);
    this.clear(who);
    this._bindEvents(who);
  },

  _resize(who) {
    const canvas = this.canvases[who];
    const parent = canvas.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = 140;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      this.clear(who);
    }
  },

  _bindEvents(who) {
    const canvas = this.canvases[who];
    const ctx = this.ctx[who];
    const getPoint = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      let clientX, clientY;
      if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      let x = (clientX - rect.left) * scaleX;
      let y = (clientY - rect.top) * scaleY;
      x = Math.max(0, Math.min(x, canvas.width));
      y = Math.max(0, Math.min(y, canvas.height));
      return { x, y };
    };
    const startDraw = (e) => {
      e.preventDefault();
      this.drawing[who] = true;
      const p = getPoint(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };
    const draw = (e) => {
      if (!this.drawing[who]) return;
      e.preventDefault();
      const p = getPoint(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };
    const endDraw = () => { this.drawing[who] = false; };
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseleave', endDraw);
    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', endDraw);
  },

  clear(who, silent = true) {
    const canvas = this.canvases[who];
    const ctx = this.ctx[who];
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const inputId = who === 'tec' ? 'assinaturaTecnicoData' : 'assinaturaClienteData';
    document.getElementById(inputId).value = '';
    if (!silent) showToast(`Assinatura do ${who === 'tec' ? 'técnico' : 'cliente'} limpa`);
  },

  save(who) {
    const canvas = this.canvases[who];
    if (!canvas) return;
    const dataURL = canvas.toDataURL('image/png');
    const inputId = who === 'tec' ? 'assinaturaTecnicoData' : 'assinaturaClienteData';
    document.getElementById(inputId).value = dataURL;
    showToast(`Assinatura do ${who === 'tec' ? 'técnico' : 'cliente'} salva`);
  },

  loadFromData(who, dataURL) {
    if (!dataURL) return;
    const canvas = this.canvases[who];
    const ctx = this.ctx[who];
    if (!canvas || !ctx) return;
    const img = new Image();
    img.onload = () => {
      this._resize(who);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      document.getElementById(who === 'tec' ? 'assinaturaTecnicoData' : 'assinaturaClienteData').value = dataURL;
    };
    img.src = dataURL;
  }
};

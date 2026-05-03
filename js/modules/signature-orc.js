// modules/signature-orc.js - Assinatura digital para Orçamento
window.SignatureOrc = {
  canvas: null,
  ctx: null,
  drawing: false,

  init() {
    this.canvas = document.getElementById('sigOrcCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this._resize();
    this.clear();
    this._bindEvents();
    window.addEventListener('resize', () => this._resize());
  },

  _resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = 140;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.clear();
    }
  },

  _bindEvents() {
    const getPoint = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
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
      x = Math.max(0, Math.min(x, this.canvas.width));
      y = Math.max(0, Math.min(y, this.canvas.height));
      return { x, y };
    };

    const start = (e) => {
      e.preventDefault();
      this.drawing = true;
      const p = getPoint(e);
      this.ctx.beginPath();
      this.ctx.moveTo(p.x, p.y);
    };

    const draw = (e) => {
      if (!this.drawing) return;
      e.preventDefault();
      const p = getPoint(e);
      this.ctx.lineTo(p.x, p.y);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(p.x, p.y);
    };

    const end = () => {
      this.drawing = false;
    };

    this.canvas.addEventListener('mousedown', start);
    this.canvas.addEventListener('mousemove', draw);
    this.canvas.addEventListener('mouseup', end);
    this.canvas.addEventListener('mouseleave', end);
    this.canvas.addEventListener('touchstart', start);
    this.canvas.addEventListener('touchmove', draw);
    this.canvas.addEventListener('touchend', end);
  },

  clear() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    document.getElementById('assinaturaOrcData').value = '';
    // Não exibe toast aqui (evita mensagens ao trocar de página)
  },

  save() {
    if (!this.canvas) return;
    const dataURL = this.canvas.toDataURL('image/png');
    document.getElementById('assinaturaOrcData').value = dataURL;
    showToast('Assinatura salva!');
  },

  loadFrom(url) {
    if (!url) return;
    const img = new Image();
    img.onload = () => {
      this._resize();
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      document.getElementById('assinaturaOrcData').value = url;
    };
    img.src = url;
  }
};

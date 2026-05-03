clear(who) {
  const canvas = this.canvases[who];
  const ctx = this.ctx[who];
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath(); // importante para evitar traços residuais

  const inputId = who === 'tec' ? 'assinaturaTecnicoData' : 'assinaturaClienteData';
  document.getElementById(inputId).value = '';
  
  showToast(`Assinatura do ${who === 'tec' ? 'técnico' : 'cliente'} limpa`);
}

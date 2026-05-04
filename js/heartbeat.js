// heartbeat.js - Mantém o usuário como "online"
window.Heartbeat = {
  _timer: null,

  start() {
    if (!window.Auth.currentUser) return;
    this._sendPing();
    this._timer = setInterval(() => this._sendPing(), 30000); // a cada 30 segundos
  },

  stop() {
    if (this._timer) clearInterval(this._timer);
    // Envia status offline ao sair
    if (window.GoogleSheets && window.Auth.currentUser) {
      window.GoogleSheets.postData('heartbeat', {
        login: window.Auth.currentUser.login,
        status: 'offline'
      }).catch(() => {});
    }
  },

  _sendPing() {
    if (!window.Auth.currentUser || !window.GoogleSheets) return;
    window.GoogleSheets.postData('heartbeat', {
      login: window.Auth.currentUser.login,
      nome: window.Auth.currentUser.nome,
      nivel: window.Auth.currentUser.nivel,
      status: 'online'
    }).catch(e => console.warn('Heartbeat error:', e));
  }
};

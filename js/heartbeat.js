// heartbeat.js - Mantém o usuário como "online" para outros usuários
window.Heartbeat = {
  _timer: null,

  start() {
    if (!window.Auth.currentUser) return;
    this._sendPing();
    this._timer = setInterval(() => this._sendPing(), 30000);
  },

  stop() {
    if (this._timer) clearInterval(this._timer);
    // Opcional: enviar status offline
    if (window.GoogleSheets && window.Auth.currentUser) {
      window.GoogleSheets.postData('heartbeat', {
        login: window.Auth.currentUser.login,
        status: 'offline'
      });
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
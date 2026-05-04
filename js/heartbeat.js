// heartbeat.js - Mantém o usuário como "online"
window.Heartbeat = {
  _timer: null,
  _enabled: false,

  start() {
    if (this._enabled) return;
    if (!window.Auth.currentUser) {
      console.warn('Heartbeat: usuário não logado');
      return;
    }
    this._enabled = true;
    this._sendPing();
    this._timer = setInterval(() => this._sendPing(), 30000);
    console.log('Heartbeat iniciado para:', window.Auth.currentUser.login);
  },

  stop() {
    this._enabled = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    if (window.GoogleSheets && window.Auth.currentUser) {
      window.GoogleSheets.postData('heartbeat', {
        login: window.Auth.currentUser.login,
        status: 'offline'
      }).catch(() => {});
    }
    console.log('Heartbeat parado');
  },

  _sendPing() {
    if (!this._enabled) return;
    if (!window.Auth.currentUser || !window.GoogleSheets) return;
    
    const user = window.Auth.currentUser;
    window.GoogleSheets.postData('heartbeat', {
      login: user.login,
      nome: user.nome,
      nivel: user.nivel,
      status: 'online'
    }).then(success => {
      if (success) console.log('Heartbeat enviado com sucesso');
      else console.warn('Heartbeat falhou');
    }).catch(e => console.warn('Heartbeat error:', e));
  }
};

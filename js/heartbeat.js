// heartbeat.js - Mantém o usuário como "online" para outros usuários
window.Heartbeat = {
  _timer: null,
  _enabled: false,

  start() {
    if (this._enabled) return;
    if (!window.Auth || !window.Auth.currentUser) {
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
    // Envia status offline ao sair
    if (window.GoogleSheets && window.Auth && window.Auth.currentUser) {
      window.GoogleSheets.postData('heartbeat', {
        login: window.Auth.currentUser.login,
        status: 'offline'
      }).catch(() => {});
    }
    console.log('Heartbeat parado');
  },

  _sendPing() {
    if (!this._enabled) return;
    if (!window.Auth || !window.Auth.currentUser) return;
    if (!window.GoogleSheets) return;
    
    const user = window.Auth.currentUser;
    window.GoogleSheets.postData('heartbeat', {
      login: user.login,
      nome: user.nome,
      nivel: user.nivel,
      status: 'online'
    }).then(success => {
      if (success) {
        console.log('Heartbeat enviado com sucesso');
      } else {
        console.warn('Heartbeat falhou');
      }
    }).catch(e => console.warn('Heartbeat error:', e));
  }
};

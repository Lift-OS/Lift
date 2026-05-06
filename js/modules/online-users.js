// modules/online-users.js - Widget funcional
window.OnlineUsers = {
  _users: [
    { login: 'admin', nome: 'Administrador', nivel: 'admin', isOnline: true },
    { login: 'tecnico', nome: 'Técnico', nivel: 'tecnico', isOnline: true }
  ],

  start() {
    this.render();
    setInterval(() => this.render(), 60000);
  },

  toggleDropdown() {
    var dd = document.getElementById('onlineDropdown');
    if (dd) dd.classList.toggle('open');
  },

  render() {
    var count = this._users.filter(u => u.isOnline).length;
    var countSpan = document.getElementById('onlineCount');
    if (countSpan) countSpan.innerText = count;
    
    var listDiv = document.getElementById('onlineUserList');
    if (!listDiv) return;
    
    var html = '';
    this._users.forEach(u => {
      html += `
        <div class="online-user-row">
          <div class="online-user-avatar ${u.nivel === 'admin' ? 'admin-avatar' : 'tecnico-avatar'}">
            ${u.nome.charAt(0).toUpperCase()}
          </div>
          <div class="online-user-info">
            <div class="online-user-name">${u.nome}</div>
            <div class="online-user-meta">
              <span class="online-user-status-dot ${u.isOnline ? 'is-online' : 'is-offline'}"></span>
              ${u.isOnline ? 'Online agora' : 'Offline'}
            </div>
          </div>
        </div>
      `;
    });
    listDiv.innerHTML = html;
  }
};

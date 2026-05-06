// modules/online-users.js - Widget funcional sem heartbeat
window.OnlineUsers = {
  _users: [
    { login: 'admin', nome: 'Administrador', nivel: 'admin', isOnline: true },
    { login: 'tecnico', nome: 'Técnico Principal', nivel: 'tecnico', isOnline: false }
  ],

  start() {
    this.render();
    setInterval(() => this.render(), 30000);
  },

  toggleDropdown() {
    const dd = document.getElementById('onlineDropdown');
    if (dd) dd.classList.toggle('open');
  },

  updateList(users) {
    if (users && users.length) this._users = users;
    this.render();
  },

  render() {
    const onlineCount = this._users.filter(u => u.isOnline).length;
    const countSpan = document.getElementById('onlineCount');
    if (countSpan) countSpan.innerText = onlineCount;
    
    const listDiv = document.getElementById('onlineUserList');
    if (!listDiv) return;
    
    if (!this._users.length) {
      listDiv.innerHTML = '<div class="online-dropdown-empty">Nenhum usuário</div>';
      return;
    }
    
    let html = '';
    this._users.forEach(u => {
      html += `
        <div class="online-user-row">
          <div class="online-user-avatar ${u.nivel === 'admin' ? 'admin-avatar' : 'tecnico-avatar'}">
            ${(u.nome || u.login).charAt(0).toUpperCase()}
          </div>
          <div class="online-user-info">
            <div class="online-user-name">${window.esc(u.nome || u.login)}</div>
            <div class="online-user-meta">
              <span class="online-user-status-dot ${u.isOnline ? 'is-online' : 'is-offline'}"></span>
              ${u.isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
      `;
    });
    listDiv.innerHTML = html;
  },

  fetch() { this.render(); }
};

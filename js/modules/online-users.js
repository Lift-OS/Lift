// modules/online-users.js
window.OnlineUsers = {
  _timer: null,
  _open: false,

  start() {
    this.fetch();
    this._timer = setInterval(() => this.fetch(), 45000);
    document.addEventListener('click', (e) => {
      const widget = document.getElementById('onlineWidget');
      if (widget && !widget.contains(e.target)) this.closeDropdown();
    });
  },

  stop() {
    if (this._timer) clearInterval(this._timer);
  },

  toggleDropdown() {
    this._open = !this._open;
    const dd = document.getElementById('onlineDropdown');
    if (dd) dd.classList.toggle('open', this._open);
  },

  closeDropdown() {
    this._open = false;
    const dd = document.getElementById('onlineDropdown');
    if (dd) dd.classList.remove('open');
  },

  async fetch() {
    if (window.GoogleSheets && window.GoogleSheets.fetchOnlineUsers) {
      await window.GoogleSheets.fetchOnlineUsers();
    } else {
      this.updateList([]);
    }
  },

  updateList(users) {
    const onlineCount = users.filter(u => u.isOnline).length;
    const countSpan = document.getElementById('onlineCount');
    if (countSpan) countSpan.innerText = onlineCount;

    const listDiv = document.getElementById('onlineUserList');
    if (!listDiv) return;

    if (!users.length) {
      listDiv.innerHTML = '<div class="online-dropdown-empty"><i class="fas fa-user-slash"></i> Nenhum usuário online</div>';
      return;
    }

    let html = '';
    users.sort((a,b) => (b.isOnline === a.isOnline) ? 0 : b.isOnline ? 1 : -1);
    users.forEach(u => {
      const statusClass = u.isOnline ? 'is-online' : 'is-offline';
      const statusText = u.isOnline ? 'Online' : 'Offline';
      const avatarClass = u.nivel === 'admin' ? 'admin-avatar' : (u.nivel === 'tecnico' ? 'tecnico-avatar' : 'visualizador-avatar');
      html += `
        <div class="online-user-row">
          <div class="online-user-avatar ${avatarClass}">
            ${(u.nome || u.login).charAt(0).toUpperCase()}
          </div>
          <div class="online-user-info">
            <div class="online-user-name">${window.esc(u.nome || u.login)}</div>
            <div class="online-user-meta">
              <span class="online-user-status-dot ${statusClass}"></span> ${statusText}
            </div>
          </div>
        </div>
      `;
    });
    listDiv.innerHTML = html;
  }
};

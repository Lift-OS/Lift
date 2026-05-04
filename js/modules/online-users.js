// modules/online-users.js - Widget de usuários online
window.OnlineUsers = {
  _timer: null,
  _open: false,
  _users: [],

  start() {
    this.fetch();
    this._timer = setInterval(() => this.fetch(), 30000); // atualiza a cada 30 segundos
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
    if (this._open) this.render();
  },

  closeDropdown() {
    this._open = false;
    const dd = document.getElementById('onlineDropdown');
    if (dd) dd.classList.remove('open');
  },

  async fetch() {
    try {
      if (window.GoogleSheets && window.GoogleSheets.fetchOnlineUsers) {
        await window.GoogleSheets.fetchOnlineUsers();
      }
    } catch(e) {
      console.error('Erro ao buscar usuários online:', e);
      this.updateList(this._users); // fallback para lista atual
    }
  },

  updateList(users) {
    this._users = users || [];
    const onlineCount = this._users.filter(u => u.isOnline === true).length;
    const countSpan = document.getElementById('onlineCount');
    if (countSpan) countSpan.innerText = onlineCount;
    if (this._open) this.render();
  },

  render() {
    const listDiv = document.getElementById('onlineUserList');
    if (!listDiv) return;
    
    if (!this._users.length) {
      listDiv.innerHTML = '<div class="online-dropdown-empty"><i class="fas fa-user-slash"></i> Nenhum usuário online</div>';
      return;
    }

    let html = '';
    this._users.forEach(u => {
      const isOnline = u.isOnline === true;
      const statusClass = isOnline ? 'is-online' : 'is-offline';
      const statusText = isOnline ? 'Online' : 'Offline';
      let avatarClass = 'visualizador-avatar';
      if (u.nivel === 'admin') avatarClass = 'admin-avatar';
      else if (u.nivel === 'tecnico') avatarClass = 'tecnico-avatar';
      
      html += `
        <div class="online-user-row">
          <div class="online-user-avatar ${avatarClass}">
            ${(u.nome || u.login || '?').charAt(0).toUpperCase()}
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

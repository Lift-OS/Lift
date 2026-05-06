// modules/online-users.js - Widget de usuários online
window.OnlineUsers = {
  _users: [
    { login: 'admin', nome: 'Administrador', nivel: 'admin', isOnline: true },
    { login: 'tecnico', nome: 'Técnico Principal', nivel: 'tecnico', isOnline: true }
  ],

  start: function() {
    this.render();
    setInterval(function() { OnlineUsers.render(); }, 60000);
  },

  toggleDropdown: function() {
    var dd = document.getElementById('onlineDropdown');
    if (dd) dd.classList.toggle('open');
  },

  fetch: function() {
    this.render();
  },

  render: function() {
    var onlineCount = this._users.filter(function(u) { return u.isOnline; }).length;
    var countSpan = document.getElementById('onlineCount');
    if (countSpan) countSpan.innerText = onlineCount;
    
    var listDiv = document.getElementById('onlineUserList');
    if (!listDiv) return;
    
    var html = '';
    for (var i = 0; i < this._users.length; i++) {
      var u = this._users[i];
      var avatarClass = u.nivel === 'admin' ? 'admin-avatar' : 'tecnico-avatar';
      html += '<div class="online-user-row">';
      html += '<div class="online-user-avatar ' + avatarClass + '">' + u.nome.charAt(0).toUpperCase() + '</div>';
      html += '<div class="online-user-info">';
      html += '<div class="online-user-name">' + window.esc(u.nome) + '</div>';
      html += '<div class="online-user-meta"><span class="online-user-status-dot ' + (u.isOnline ? 'is-online' : 'is-offline') + '"></span> ' + (u.isOnline ? 'Online agora' : 'Offline') + '</div>';
      html += '</div></div>';
    }
    listDiv.innerHTML = html;
  }
};

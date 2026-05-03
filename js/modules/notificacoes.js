// modules/notificacoes.js
window.Notificacoes = {
  _list: [],
  _unread: 0,

  init() {
    this.load();
    this.render();
    this.requestPermission();
    setInterval(() => this.verificarNovosAgendamentos(), 60000);
  },

  requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  },

  load() {
    const saved = localStorage.getItem('LiftOS_notificacoes');
    this._list = saved ? JSON.parse(saved) : [];
    this._unread = this._list.filter(n => !n.lida).length;
  },

  save() {
    localStorage.setItem('LiftOS_notificacoes', JSON.stringify(this._list));
  },

  adicionar(titulo, descricao, tipo = 'info', extra = null) {
    const notif = {
      id: Date.now(),
      titulo,
      descricao,
      tipo,
      timestamp: Date.now(),
      lida: false,
      extra
    };
    this._list.unshift(notif);
    if (this._list.length > 50) this._list.pop();
    this.save();
    this.render();
    this.enviarPush(notif);
  },

  enviarPush(notif) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notif.titulo, { body: notif.descricao, icon: '/favicon.ico' });
    }
  },

  verificarNovosAgendamentos() {
    if (!window.Auth.currentUser || window.Auth.currentUser.nivel !== 'tecnico') return;
    const ultimoTimestamp = localStorage.getItem('LiftOS_ultimo_agendamento') || 0;
    const novos = window.State.agendamentos.filter(a => 
      a.tecnico === window.Auth.currentUser.login &&
      a.status === 'pendente' &&
      new Date(a.data + ' ' + a.horario).getTime() > ultimoTimestamp
    );
    if (novos.length) {
      novos.forEach(ag => {
        this.adicionar(
          'Novo agendamento',
          `${ag.cliente} - ${ag.data} às ${ag.horario}`,
          'agendamento',
          { id: ag.id }
        );
      });
      localStorage.setItem('LiftOS_ultimo_agendamento', Date.now());
    }
  },

  render() {
    const badge = document.getElementById('notifBadge');
    if (badge) {
      badge.innerText = this._unread > 99 ? '99+' : this._unread;
      badge.style.display = this._unread ? 'inline-flex' : 'none';
    }
    const listDiv = document.getElementById('notifList');
    if (!listDiv) return;
    if (!this._list.length) {
      listDiv.innerHTML = '<div class="notif-empty">Nenhuma notificação</div>';
      return;
    }
    let html = '';
    this._list.slice(0, 30).forEach(n => {
      html += `
        <div class="notif-item ${n.lida ? 'read' : 'unread'}" onclick="Notificacoes.marcarLida(${n.id})">
          <div class="notif-icon"><i class="fas fa-bell"></i></div>
          <div class="notif-body">
            <div class="notif-title">${window.esc(n.titulo)}</div>
            <div class="notif-desc">${window.esc(n.descricao)}</div>
            <div class="notif-time">${this._formatarTempo(n.timestamp)}</div>
          </div>
        </div>
      `;
    });
    listDiv.innerHTML = html;
  },

  _formatarTempo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'agora';
    if (diff < 3600000) return `${Math.floor(diff/60000)} min`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)} h`;
    return `${Math.floor(diff/86400000)} d`;
  },

  marcarLida(id) {
    const notif = this._list.find(n => n.id === id);
    if (notif && !notif.lida) {
      notif.lida = true;
      this._unread--;
      this.save();
      this.render();
    }
  },

  marcarTodasLidas() {
    this._list.forEach(n => n.lida = true);
    this._unread = 0;
    this.save();
    this.render();
  },

  toggleDropdown() {
    const dd = document.getElementById('notifDropdown');
    if (dd) dd.classList.toggle('open');
  }
};
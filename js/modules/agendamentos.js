// modules/agendamentos.js - Módulo de Agendamentos (com notificações)
window.AgendamentosModule = {
  init() {
    this.carregar();
    this.loadEventListeners();
  },

  carregar() {
    window.Storage.loadAgendamentos();
    this.atualizarLista();
    this.atualizarSelectTecnicos();
    this.atualizarDatalistClientes();
    this.carregarOSDisponiveis();
  },

  loadEventListeners() {
    const btnSalvar = document.getElementById('ag_salvar');
    if (btnSalvar) btnSalvar.onclick = () => this.salvar();

    const btnLimpar = document.getElementById('ag_limpar');
    if (btnLimpar) btnLimpar.onclick = () => this.limparForm();

    const selectTecnico = document.getElementById('ag_tecnico');
    if (selectTecnico) selectTecnico.onchange = () => this.carregarOSDisponiveis();

    const clienteInput = document.getElementById('ag_cliente');
    if (clienteInput) clienteInput.onchange = () => this.carregarOSPorCliente(clienteInput.value);
  },

  atualizarSelectTecnicos() {
    const select = document.getElementById('ag_tecnico');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione o técnico</option>';
    const users = window.Auth.getUsers();
    users.forEach(user => {
      if (user.nivel === 'tecnico' || user.nivel === 'admin') {
        select.innerHTML += `<option value="${window.esc(user.login)}">${window.esc(user.nome)}</option>`;
      }
    });
  },

  atualizarDatalistClientes() {
    const datalist = document.getElementById('clientesList');
    if (!datalist) return;
    datalist.innerHTML = '';
    window.State.clients.forEach(cliente => {
      const option = document.createElement('option');
      option.value = cliente.nome;
      datalist.appendChild(option);
    });
  },

  carregarOSDisponiveis() {
    const select = document.getElementById('ag_os_select');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione a OS</option>';
    const osDisponiveis = window.State.osHistory.filter(os => os.status === 'abertura');
    if (!osDisponiveis.length) {
      select.innerHTML += '<option value="">Nenhuma OS em abertura</option>';
      return;
    }
    osDisponiveis.forEach(os => {
      select.innerHTML += `<option value="${window.esc(os.numeroOS)}">${window.esc(os.numeroOS)} — ${window.esc(os.cliente).toUpperCase()}</option>`;
    });
  },

  carregarOSPorCliente(clienteNome) {
    const select = document.getElementById('ag_os_select');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione a OS</option>';
    const osDisponiveis = window.State.osHistory.filter(os => os.status === 'abertura' && os.cliente === clienteNome);
    if (!osDisponiveis.length) {
      select.innerHTML += `<option value="">Nenhuma OS em abertura para ${window.esc(clienteNome)}</option>`;
      return;
    }
    osDisponiveis.forEach(os => {
      select.innerHTML += `<option value="${window.esc(os.numeroOS)}">${window.esc(os.numeroOS)} — ${window.esc(os.cliente).toUpperCase()}</option>`;
    });
  },

  verificarSobreposicao(tecnico, data, horario, editId) {
    if (!tecnico || !data || !horario) return false;
    const minutos = parseInt(horario.split(':')[0]) * 60 + parseInt(horario.split(':')[1] || '0');
    return window.State.agendamentos.some(ag => {
      if (ag.status === 'concluido') return false;
      if (editId && String(ag.id) === String(editId)) return false;
      if (ag.tecnico !== tecnico || ag.data !== data || !ag.horario) return false;
      const agMinutos = parseInt(ag.horario.split(':')[0]) * 60 + parseInt(ag.horario.split(':')[1] || '0');
      return Math.abs(minutos - agMinutos) < 60;
    });
  },

  async salvar() {
    if (!window.Auth.can('agendamentos_criar')) {
      showToast('Apenas administrador pode criar agendamentos', true);
      return;
    }

    const cliente = document.getElementById('ag_cliente')?.value.trim();
    const osNumero = document.getElementById('ag_os_select')?.value;
    const data = document.getElementById('ag_data')?.value;
    const horario = document.getElementById('ag_horario')?.value;
    const tecnico = document.getElementById('ag_tecnico')?.value;
    const descricao = document.getElementById('ag_descricao')?.value;
    const editId = document.getElementById('ag_editId')?.value;

    if (!cliente || !data || !tecnico || !horario || !osNumero) {
      showToast('Preencha todos os campos obrigatórios', true);
      return;
    }

    if (this.verificarSobreposicao(tecnico, data, horario, editId)) {
      showToast('⚠️ Conflito de horário! Este técnico já tem agendamento próximo a este horário (±1h)', true);
      return;
    }

    let agendamento;
    if (editId) {
      const index = window.State.agendamentos.findIndex(a => a.id == editId);
      if (index !== -1) {
        agendamento = {
          id: parseInt(editId),
          cliente: cliente,
          equipamento: osNumero,
          data: data,
          horario: horario,
          tecnico: tecnico,
          descricao: descricao || '',
          status: 'pendente'
        };
        window.State.agendamentos[index] = agendamento;
      }
    } else {
      agendamento = {
        id: Date.now(),
        cliente: cliente,
        equipamento: osNumero,
        data: data,
        horario: horario,
        tecnico: tecnico,
        descricao: descricao || '',
        status: 'pendente'
      };
      window.State.agendamentos.push(agendamento);
    }

    window.Storage.saveAgendamentos();
    this.limparForm();
    this.atualizarLista();
    showToast('Agendamento salvo com sucesso!');

    // ========== NOTIFICAR O TÉCNICO (se for diferente do usuário logado) ==========
    if (agendamento.tecnico && agendamento.tecnico !== window.Auth.currentUser?.login) {
      if (window.Notificacoes) {
        window.Notificacoes.adicionar(
          'Novo agendamento',
          `Cliente: ${agendamento.cliente} - Data: ${agendamento.data} às ${agendamento.horario}`,
          'agendamento',
          { id: agendamento.id }
        );
      }
    }

    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      await window.GoogleSheets.syncAgendamento(agendamento);
    }
  },

  limparForm() {
    document.getElementById('ag_cliente').value = '';
    document.getElementById('ag_data').value = '';
    document.getElementById('ag_horario').value = '';
    document.getElementById('ag_tecnico').value = '';
    document.getElementById('ag_descricao').value = '';
    document.getElementById('ag_editId').value = '';
    this.carregarOSDisponiveis();
  },

  editar(id) {
    const ag = window.State.agendamentos.find(a => a.id === id);
    if (!ag) return;
    document.getElementById('ag_cliente').value = ag.cliente;
    document.getElementById('ag_data').value = ag.data;
    document.getElementById('ag_horario').value = ag.horario;
    document.getElementById('ag_tecnico').value = ag.tecnico;
    document.getElementById('ag_descricao').value = ag.descricao || '';
    document.getElementById('ag_editId').value = ag.id;
    this.carregarOSDisponiveis();
    setTimeout(() => {
      const select = document.getElementById('ag_os_select');
      if (select) select.value = ag.equipamento;
    }, 100);
  },

  concluir(id) {
    if (!window.Auth.can('agendamentos_concluir')) {
      showToast('Apenas administrador pode concluir agendamentos', true);
      return;
    }
    const index = window.State.agendamentos.findIndex(a => a.id === id);
    if (index !== -1) {
      window.State.agendamentos[index].status = 'concluido';
      window.Storage.saveAgendamentos();
      this.atualizarLista();
      showToast('Agendamento concluído!');
    }
  },

  excluir(id) {
    if (!window.Auth.can('agendamentos_excluir')) {
      showToast('Apenas administrador pode excluir agendamentos', true);
      return;
    }
    if (!confirm('Excluir este agendamento?')) return;
    window.State.agendamentos = window.State.agendamentos.filter(a => a.id !== id);
    window.Storage.saveAgendamentos();
    this.atualizarLista();
    showToast('Agendamento excluído');
  },

  irParaOS(osNumero) {
    if (osNumero) {
      const os = window.State.osHistory.find(o => o.numeroOS === osNumero);
      if (os && window.OSModule) {
        window.OSModule.carregarOS(os);
        window.PageLoader.load('os');
      } else {
        showToast('OS não encontrada', true);
      }
    }
  },

  atualizarLista() {
    const container = document.getElementById('agendamentosLista');
    if (!container) return;
    const pendentes = window.State.agendamentos.filter(a => a.status !== 'concluido');
    pendentes.sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario));
    if (!pendentes.length) {
      container.innerHTML = `
        <div class="text-center p-8 text-[var(--muted)]">
          <i class="fas fa-calendar-check text-4xl mb-3 opacity-30"></i>
          <p>Nenhum agendamento pendente</p>
        </div>
      `;
      return;
    }
    const hoje = window.Utils.dataHojeISO();
    let html = '';
    pendentes.forEach(ag => {
      const isHoje = ag.data === hoje;
      const isFuturo = ag.data > hoje;
      const cardClass = isHoje ? 'schedule-card-hoje border-2 border-[var(--success)]' : (isFuturo ? 'schedule-card-futuro border-2 border-[var(--info)]' : 'schedule-card-passado');
      const tagClass = isHoje ? 'schedule-tag-hoje bg-[var(--success)]' : (isFuturo ? 'schedule-tag-futuro bg-[var(--info)]' : 'schedule-tag-passado bg-[var(--muted)]');
      const tagText = isHoje ? 'HOJE' : (isFuturo ? ag.data.split('-').reverse().join('/') : ag.data);
      html += `
        <div class="schedule-card ${cardClass} bg-[var(--bg-secondary)] rounded-xl mb-3 overflow-hidden">
          <div class="p-4">
            <div class="flex justify-between items-center gap-2 flex-wrap mb-2">
              <span class="${tagClass} text-white text-xs font-bold px-3 py-1 rounded-full">${window.esc(tagText)}</span>
              <span class="schedule-os-num font-mono text-[var(--accent)] font-bold">${window.esc(ag.equipamento)}</span>
            </div>
            <div class="schedule-cliente text-lg font-bold">${window.esc(ag.cliente)}</div>
            <div class="flex items-center gap-4 my-2 flex-wrap">
              <div class="schedule-hora text-2xl font-mono font-bold">${window.esc(ag.horario)}</div>
              <div class="schedule-tecnico text-sm text-[var(--muted)]"><i class="fas fa-user-cog"></i> ${window.esc(ag.tecnico)}</div>
            </div>
            ${ag.descricao ? `<div class="schedule-descricao text-sm text-[var(--muted)] mt-1">${window.esc(ag.descricao)}</div>` : ''}
            <div class="schedule-actions flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
              <button onclick="AgendamentosModule.irParaOS('${window.esc(ag.equipamento)}')" class="btn btn-info text-sm py-2 px-3"><i class="fas fa-external-link-alt"></i> OS</button>
              <button onclick="AgendamentosModule.editar(${ag.id})" class="btn btn-info text-sm py-2 px-3"><i class="fas fa-edit"></i></button>
              <button onclick="AgendamentosModule.concluir(${ag.id})" class="btn btn-success text-sm py-2 px-3"><i class="fas fa-check"></i></button>
              <button onclick="AgendamentosModule.excluir(${ag.id})" class="btn btn-danger text-sm py-2 px-3"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  loadFromSync(agendamentos) {
    if (Array.isArray(agendamentos) && agendamentos.length) {
      window.State.agendamentos = agendamentos;
      window.Storage.saveAgendamentos();
      this.atualizarLista();
    }
  },

  obterAgendamentosFuturos(tecnico) {
    const hoje = window.Utils.dataHojeISO();
    const pendentes = window.State.agendamentos.filter(a => a.tecnico === tecnico && a.status !== 'concluido' && a.data >= hoje);
    return {
      hoje: pendentes.filter(a => a.data === hoje),
      futuros: pendentes.filter(a => a.data > hoje),
      total: pendentes.length
    };
  }
};

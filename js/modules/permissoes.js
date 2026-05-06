// modules/permissoes.js - Módulo de Permissões (Admin)
window.PermissoesModule = {
  permissoesPadrao: {
    criar_os: false, editar_os: false, excluir_os: false, mudar_status: false, salvar_os: false,
    checklist_visualizar: true, checklist_preencher: true, fotos_horimetro: true,
    fotos_servico: true, fotos_pendencias: true, assinatura_tecnico: true, assinatura_cliente: true,
    timer_controle: true, horas_editar: true, gerar_pdf: true, enviar_email: true,
    enviar_whatsapp: true, sincronizar: false, limpar_fila: false, baixar_dados: false,
    heartbeat: true, clientes_cadastrar: false, clientes_editar: false, clientes_excluir: false,
    clientes_exportar_csv: false, clientes_importar_csv: false, clientes_visualizar: true,
    historico_visualizar: true, historico_excluir: false, historico_exportar_csv: false,
    historico_importar_csv: false, historico_limpar: false, agendamentos_criar: false,
    agendamentos_editar: false, agendamentos_excluir: false, agendamentos_concluir: false,
    agendamentos_visualizar: false, usuarios_criar: false, usuarios_editar: false,
    usuarios_excluir: false, usuarios_visualizar: false, permissoes_editar: false,
    jornada_registrar: true, estoque_cadastrar: false, estoque_editar: false, estoque_excluir: false,
    estoque_movimentar: true, orcamento_criar: false, orcamento_editar: false, orcamento_excluir: false,
    orcamento_aprovar: false, orcamento_visualizar: true
  },

  init() {
    if (!window.Auth.can('permissoes_editar')) return;
    this.carregarInterface();
    this.loadEventListeners();
  },

  loadEventListeners() {
    const btnSalvar = document.getElementById('btnSalvarPermissoes');
    if (btnSalvar) btnSalvar.onclick = () => this.salvar();

    const btnResetar = document.getElementById('btnResetarPermissoes');
    if (btnResetar) btnResetar.onclick = () => this.resetarPadrao();
  },

  carregarInterface() {
    const container = document.getElementById('permissoesContainer');
    if (!container) return;

    let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">';
    for (const [permissao, valorPadrao] of Object.entries(this.permissoesPadrao)) {
      const label = permissao.replace(/_/g, ' ').toUpperCase();
      html += `
        <div class="permission-item bg-[var(--bg-secondary)] rounded-xl p-3 border border-[var(--border)]">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" id="perm_${permissao}" ${this.carregarPermissao(permissao) ? 'checked' : ''}>
            <span class="text-sm">${window.esc(label)}</span>
          </label>
        </div>
      `;
    }
    html += '</div>';
    container.innerHTML = html;
  },

  carregarPermissao(nome) {
    const salvas = localStorage.getItem('LiftOS_permissoes_tecnico');
    if (salvas) {
      const permissoes = JSON.parse(salvas);
      if (permissoes[nome] !== undefined) return permissoes[nome];
    }
    return this.permissoesPadrao[nome];
  },

  salvar() {
    const permissoes = {};
    for (const permissao of Object.keys(this.permissoesPadrao)) {
      const checkbox = document.getElementById(`perm_${permissao}`);
      permissoes[permissao] = checkbox ? checkbox.checked : false;
    }

    localStorage.setItem('LiftOS_permissoes_tecnico', JSON.stringify(permissoes));
    window.Auth.permissoes.tecnico = permissoes;
    window.Auth.updateUI();
    showToast('Permissões salvas com sucesso!');

    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      window.GoogleSheets.syncPermissoes(permissoes);
    }
  },

  resetarPadrao() {
    if (!confirm('Restaurar permissões para o padrão?')) return;

    for (const [permissao, valorPadrao] of Object.entries(this.permissoesPadrao)) {
      const checkbox = document.getElementById(`perm_${permissao}`);
      if (checkbox) checkbox.checked = valorPadrao;
    }
    this.salvar();
    showToast('Permissões restauradas para o padrão');
  },

  loadFromSync(permissoes) {
    if (permissoes && typeof permissoes === 'object') {
      localStorage.setItem('LiftOS_permissoes_tecnico', JSON.stringify(permissoes));
      window.Auth.permissoes.tecnico = permissoes;
      if (this.carregarInterface) this.carregarInterface();
      window.Auth.updateUI();
    }
  }
};

// modules/jornada.js - Módulo de Jornada de Trabalho
window.JornadaModule = {
  jornadaAtual: null,

  init() {
    if (!window.Auth.can('jornada_registrar')) return;
    this.carregar();
  },

  carregar() {
    const hoje = window.Utils.dataHojeISO();
    const stored = window.Storage.loadJornada(window.Auth.currentUser?.login);

    if (stored && stored.data === hoje) {
      this.jornadaAtual = stored;
      const btnNova = document.getElementById('btnNovaJornada');
      if (btnNova) btnNova.style.display = 'inline-flex';
    } else {
      this.jornadaAtual = { etapa: 'inicio', dados: {}, data: hoje };
      window.Storage.saveJornada(window.Auth.currentUser?.login, this.jornadaAtual);
      const btnNova = document.getElementById('btnNovaJornada');
      if (btnNova) btnNova.style.display = 'none';
    }
    this.renderizar();
  },

  novaJornada() {
    if (!confirm('Iniciar nova jornada? Os dados da jornada atual serão perdidos.')) return;
    this.jornadaAtual = { etapa: 'inicio', dados: {}, data: window.Utils.dataHojeISO() };
    window.Storage.saveJornada(window.Auth.currentUser?.login, this.jornadaAtual);
    this.renderizar();
    showToast('Nova jornada iniciada');
  },

  async obterLocalizacao(etapa) {
    if (!navigator.geolocation) {
      showToast('Geolocalização não suportada pelo navegador', true);
      return;
    }

    showToast('Obtendo localização...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        const localizacao = `${lat}, ${lng}`;

        const textoEl = document.getElementById(`localizacao_${etapa}_texto`);
        if (textoEl) textoEl.innerHTML = window.esc(localizacao);

        if (!this.jornadaAtual.dados[etapa]) this.jornadaAtual.dados[etapa] = {};
        this.jornadaAtual.dados[etapa].localizacao = localizacao;
        window.Storage.saveJornada(window.Auth.currentUser?.login, this.jornadaAtual);
        showToast('Localização obtida com sucesso!');
      },
      (error) => {
        showToast(`Erro ao obter localização: ${error.message}`, true);
      }
    );
  },

  async capturarCamera(etapa) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const compressed = await this.compressImage(ev.target.result);

          if (!this.jornadaAtual.dados[etapa]) this.jornadaAtual.dados[etapa] = {};
          this.jornadaAtual.dados[etapa].foto = compressed;
          window.Storage.saveJornada(window.Auth.currentUser?.login, this.jornadaAtual);

          const previewEl = document.getElementById(`jornada_foto_${etapa}_preview`);
          if (previewEl) {
            previewEl.innerHTML = `
              <div class="photo-item relative">
                <img src="${compressed}" class="w-full h-full object-cover rounded">
                <div class="photo-remove absolute top-1 right-1 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer text-white text-xs" onclick="JornadaModule.removerFoto('${etapa}')">x</div>
              </div>
            `;
          }

          showToast(`Foto capturada para ${etapa}`);
        } catch (err) {
          showToast('Erro ao processar foto', true);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  },

  compressImage(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 800;
        const maxHeight = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = dataUrl;
    });
  },

  removerFoto(etapa) {
    if (this.jornadaAtual.dados[etapa]) {
      delete this.jornadaAtual.dados[etapa].foto;
      window.Storage.saveJornada(window.Auth.currentUser?.login, this.jornadaAtual);

      const previewEl = document.getElementById(`jornada_foto_${etapa}_preview`);
      if (previewEl) previewEl.innerHTML = '';

      const fileInput = document.getElementById(`jornada_foto_${etapa}`);
      if (fileInput) fileInput.value = '';

      showToast('Foto removida');
    }
  },

  async salvarEtapa(etapa) {
    const dados = {};

    if (etapa === 'inicio') {
      const placa = document.getElementById('jornada_placa_inicio')?.value.trim();
      const km = document.getElementById('jornada_km_inicio')?.value.trim();
      const localizacao = this.jornadaAtual.dados.inicio?.localizacao || '';
      const fotoSalva = this.jornadaAtual.dados.inicio?.foto;

      if (!placa || !km || !localizacao) {
        showToast('Preencha todos os campos obrigatórios (placa, KM e localização)', true);
        return;
      }

      const fileInput = document.getElementById('jornada_foto_inicio');
      let foto = fotoSalva;
      if (fileInput && fileInput.files && fileInput.files.length) {
        foto = await this.compressImage(await this.readFileAsDataURL(fileInput.files[0]));
      } else if (!fotoSalva) {
        showToast('Foto obrigatória', true);
        return;
      }

      dados.placa = placa;
      dados.km = km;
      dados.localizacao = localizacao;
      dados.foto = foto;
      dados.dataHora = window.Utils.agoraBr();
      dados.concluido = true;

      this.jornadaAtual.dados.inicio = dados;
      this.jornadaAtual.etapa = 'chegada';
    }
    else if (etapa === 'chegada') {
      const localizacao = this.jornadaAtual.dados.chegada?.localizacao || '';
      const fotoSalva = this.jornadaAtual.dados.chegada?.foto;

      if (!localizacao) {
        showToast('Localização obrigatória', true);
        return;
      }

      const fileInput = document.getElementById('jornada_foto_chegada');
      let foto = fotoSalva;
      if (fileInput && fileInput.files && fileInput.files.length) {
        foto = await this.compressImage(await this.readFileAsDataURL(fileInput.files[0]));
      } else if (!fotoSalva) {
        showToast('Foto obrigatória', true);
        return;
      }

      dados.localizacao = localizacao;
      dados.foto = foto;
      dados.dataHora = window.Utils.agoraBr();
      dados.concluido = true;

      this.jornadaAtual.dados.chegada = dados;
      this.jornadaAtual.etapa = 'trabalhando';
    }
    else if (etapa === 'final') {
      const placa = document.getElementById('jornada_placa_final')?.value.trim();
      const km = document.getElementById('jornada_km_final')?.value.trim();
      const localizacao = this.jornadaAtual.dados.final?.localizacao || '';
      const fotoSalva = this.jornadaAtual.dados.final?.foto;

      if (!placa || !km || !localizacao) {
        showToast('Preencha todos os campos obrigatórios (placa, KM e localização)', true);
        return;
      }

      const fileInput = document.getElementById('jornada_foto_final');
      let foto = fotoSalva;
      if (fileInput && fileInput.files && fileInput.files.length) {
        foto = await this.compressImage(await this.readFileAsDataURL(fileInput.files[0]));
      } else if (!fotoSalva) {
        showToast('Foto obrigatória', true);
        return;
      }

      dados.placa = placa;
      dados.km = km;
      dados.localizacao = localizacao;
      dados.foto = foto;
      dados.dataHora = window.Utils.agoraBr();
      dados.concluido = true;

      this.jornadaAtual.dados.final = dados;
      this.jornadaAtual.etapa = 'finalizado';
    }

    window.Storage.saveJornada(window.Auth.currentUser?.login, this.jornadaAtual);
    this.renderizar();
    showToast(`Etapa ${etapa} registrada com sucesso!`);

    // Sincronizar
    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      await window.GoogleSheets.syncJornada({
        id: Date.now(),
        tecnico: window.Auth.currentUser?.login,
        data: this.jornadaAtual.data,
        etapa: etapa,
        ...dados
      });
    }
  },

  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  renderizar() {
    const container = document.getElementById('jornadaSteps');
    const statusEl = document.getElementById('jornadaStatus');
    if (!container || !statusEl) return;

    const agendamentos = window.AgendamentosModule?.obterAgendamentosFuturos(window.Auth.currentUser?.login) || { hoje: [], futuros: [], total: 0 };

    // Status com agendamentos
    let statusHtml = '';
    if (agendamentos.total > 0) {
      statusHtml = `<div class="text-[#fbbf24] font-bold mb-3"><i class="fas fa-calendar-check mr-2"></i>${agendamentos.total} agendamento(s) pendente(s)</div>`;

      if (agendamentos.hoje.length) {
        statusHtml += `<div class="mb-3"><div class="text-[var(--success)] text-xs font-bold mb-2">📅 HOJE</div><div class="flex flex-wrap gap-2">`;
        agendamentos.hoje.forEach(ag => {
          statusHtml += `<span class="bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.4)] text-[#6ee7b7] px-3 py-1 rounded-lg text-sm">
            <i class="fas fa-clock mr-1 text-[var(--success)]"></i>${window.esc(ag.horario)} — <strong>${window.esc(ag.cliente)}</strong>
          </span>`;
        });
        statusHtml += `</div></div>`;
      }

      if (agendamentos.futuros.length) {
        statusHtml += `<div><div class="text-[var(--info)] text-xs font-bold mb-2">📅 PRÓXIMOS</div><div class="flex flex-col gap-2">`;
        agendamentos.futuros.slice(0, 5).forEach(ag => {
          const dataFormatada = ag.data.split('-').reverse().join('/');
          statusHtml += `<div class="bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.3)] rounded-lg p-2 text-sm">
            <i class="fas fa-calendar-day mr-1 text-[var(--info)]"></i><strong>${dataFormatada}</strong> — ${window.esc(ag.horario)} — <strong>${window.esc(ag.cliente)}</strong>
          </div>`;
        });
        if (agendamentos.futuros.length > 5) {
          statusHtml += `<div class="text-xs text-[var(--muted)] text-center">+${agendamentos.futuros.length - 5} outros agendamentos</div>`;
        }
        statusHtml += `</div></div>`;
      }
    } else {
      statusHtml = `<div class="text-[var(--muted)]"><i class="fas fa-info-circle mr-2"></i>Nenhum agendamento pendente</div>`;
    }
    statusEl.innerHTML = statusHtml;

    const dados = this.jornadaAtual.dados || {};
    const inicioConcluido = dados.inicio && dados.inicio.concluido;
    const chegadaConcluido = dados.chegada && dados.chegada.concluido;
    const finalConcluido = dados.final && dados.final.concluido;

    let html = '';

    // Etapa 1 - Início
    html += `<div class="journey-step ${inicioConcluido ? 'completed' : ''} bg-[var(--bg-secondary)] rounded-xl p-5 mb-5 border-l-4 ${inicioConcluido ? 'border-l-[var(--success)]' : 'border-l-[var(--accent)]'}">`;
    html += `<h3 class="text-[var(--accent)] mb-4 flex items-center gap-2"><i class="fas fa-play-circle"></i> 1. Início do Trabalho</h3>`;

    if (!inicioConcluido) {
      html += `
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><label class="text-xs text-[var(--muted)]">Placa *</label><input type="text" id="jornada_placa_inicio" class="form-input" value="${window.esc(dados.inicio?.placa || '')}" placeholder="RJW1J15"></div>
          <div><label class="text-xs text-[var(--muted)]">KM Inicial *</label><input type="number" id="jornada_km_inicio" class="form-input" value="${dados.inicio?.km || ''}" placeholder="143298"></div>
        </div>
        <div class="mb-3"><button onclick="JornadaModule.obterLocalizacao('inicio')" class="btn btn-info text-sm"><i class="fas fa-map-marker-alt"></i> Obter Localização *</button> <span id="localizacao_inicio_texto" class="text-xs text-[var(--muted)] ml-2">${dados.inicio?.localizacao ? window.esc(dados.inicio.localizacao) : '<span class="text-red-400">Não obtida</span>'}</span></div>
        <div class="mb-3"><label class="text-xs text-[var(--muted)]">Foto *</label><div class="flex gap-2"><input type="file" id="jornada_foto_inicio" accept="image/*" class="form-input flex-1"><button onclick="JornadaModule.capturarCamera('inicio')" class="btn btn-secondary text-sm"><i class="fas fa-camera"></i> Câmera</button></div><div id="jornada_foto_inicio_preview" class="mt-2">${dados.inicio?.foto ? `<div class="photo-item"><img src="${dados.inicio.foto}" class="w-20 h-20 object-cover rounded"><div class="photo-remove" onclick="JornadaModule.removerFoto('inicio')">x</div></div>` : ''}</div></div>
        <button onclick="JornadaModule.salvarEtapa('inicio')" class="btn btn-primary mt-2"><i class="fas fa-save"></i> Registrar Início</button>
      `;
    } else {
      html += `<div class="text-green-400 text-sm"><i class="fas fa-check-circle"></i> ${window.esc(dados.inicio.dataHora)} — <strong>${window.esc(dados.inicio.placa)}</strong> — KM: <strong>${window.esc(dados.inicio.km)}</strong>${dados.inicio.localizacao ? ` — <i class="fas fa-map-pin"></i> ${window.esc(dados.inicio.localizacao)}` : ''}</div>`;
      if (dados.inicio.foto) html += `<div class="mt-2"><img src="${dados.inicio.foto}" class="w-24 h-24 object-cover rounded border border-[var(--border)]"></div>`;
    }
    html += `</div>`;

    // Etapa 2 - Chegada
    html += `<div class="journey-step ${chegadaConcluido ? 'completed' : ''} bg-[var(--bg-secondary)] rounded-xl p-5 mb-5 border-l-4 ${chegadaConcluido ? 'border-l-[var(--success)]' : 'border-l-[var(--accent)]'}">`;
    html += `<h3 class="text-[var(--accent)] mb-4 flex items-center gap-2"><i class="fas fa-flag-checkered"></i> 2. Chegada ao Cliente</h3>`;

    if (!chegadaConcluido && inicioConcluido) {
      html += `
        <div class="mb-3"><button onclick="JornadaModule.obterLocalizacao('chegada')" class="btn btn-info text-sm"><i class="fas fa-map-marker-alt"></i> Obter Localização *</button> <span id="localizacao_chegada_texto" class="text-xs text-[var(--muted)] ml-2">${dados.chegada?.localizacao ? window.esc(dados.chegada.localizacao) : '<span class="text-red-400">Não obtida</span>'}</span></div>
        <div class="mb-3"><label class="text-xs text-[var(--muted)]">Foto *</label><div class="flex gap-2"><input type="file" id="jornada_foto_chegada" accept="image/*" class="form-input flex-1"><button onclick="JornadaModule.capturarCamera('chegada')" class="btn btn-secondary text-sm"><i class="fas fa-camera"></i> Câmera</button></div><div id="jornada_foto_chegada_preview" class="mt-2">${dados.chegada?.foto ? `<div class="photo-item"><img src="${dados.chegada.foto}" class="w-20 h-20 object-cover rounded"><div class="photo-remove" onclick="JornadaModule.removerFoto('chegada')">x</div></div>` : ''}</div></div>
        <button onclick="JornadaModule.salvarEtapa('chegada')" class="btn btn-primary mt-2"><i class="fas fa-save"></i> Registrar Chegada</button>
      `;
    } else if (chegadaConcluido) {
      html += `<div class="text-green-400 text-sm"><i class="fas fa-check-circle"></i> ${window.esc(dados.chegada.dataHora)}${dados.chegada.localizacao ? ` — <i class="fas fa-map-pin"></i> ${window.esc(dados.chegada.localizacao)}` : ''}</div>`;
      if (dados.chegada.foto) html += `<div class="mt-2"><img src="${dados.chegada.foto}" class="w-24 h-24 object-cover rounded border border-[var(--border)]"></div>`;
    } else if (!inicioConcluido) {
      html += `<div class="text-[var(--warning)] text-sm"><i class="fas fa-hourglass-half"></i> Aguarde registrar o início do trabalho primeiro.</div>`;
    }
    html += `</div>`;

    // Etapa 3 - Finalização
    html += `<div class="journey-step ${finalConcluido ? 'completed' : ''} bg-[var(--bg-secondary)] rounded-xl p-5 mb-5 border-l-4 ${finalConcluido ? 'border-l-[var(--success)]' : 'border-l-[var(--accent)]'}">`;
    html += `<h3 class="text-[var(--accent)] mb-4 flex items-center gap-2"><i class="fas fa-stop-circle"></i> 3. Finalização (Retorno)</h3>`;

    if (!finalConcluido && chegadaConcluido) {
      html += `
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><label class="text-xs text-[var(--muted)]">Placa *</label><input type="text" id="jornada_placa_final" class="form-input" value="${window.esc(dados.final?.placa || '')}" placeholder="RJW1J15"></div>
          <div><label class="text-xs text-[var(--muted)]">KM Final *</label><input type="number" id="jornada_km_final" class="form-input" value="${dados.final?.km || ''}" placeholder="143350"></div>
        </div>
        <div class="mb-3"><button onclick="JornadaModule.obterLocalizacao('final')" class="btn btn-info text-sm"><i class="fas fa-map-marker-alt"></i> Obter Localização *</button> <span id="localizacao_final_texto" class="text-xs text-[var(--muted)] ml-2">${dados.final?.localizacao ? window.esc(dados.final.localizacao) : '<span class="text-red-400">Não obtida</span>'}</span></div>
        <div class="mb-3"><label class="text-xs text-[var(--muted)]">Foto *</label><div class="flex gap-2"><input type="file" id="jornada_foto_final" accept="image/*" class="form-input flex-1"><button onclick="JornadaModule.capturarCamera('final')" class="btn btn-secondary text-sm"><i class="fas fa-camera"></i> Câmera</button></div><div id="jornada_foto_final_preview" class="mt-2">${dados.final?.foto ? `<div class="photo-item"><img src="${dados.final.foto}" class="w-20 h-20 object-cover rounded"><div class="photo-remove" onclick="JornadaModule.removerFoto('final')">x</div></div>` : ''}</div></div>
        <button onclick="JornadaModule.salvarEtapa('final')" class="btn btn-primary mt-2"><i class="fas fa-save"></i> Registrar Finalização</button>
      `;
    } else if (finalConcluido) {
      html += `<div class="text-green-400 text-sm"><i class="fas fa-check-circle"></i> ${window.esc(dados.final.dataHora)} — <strong>${window.esc(dados.final.placa)}</strong> — KM: <strong>${window.esc(dados.final.km)}</strong>${dados.final.localizacao ? ` — <i class="fas fa-map-pin"></i> ${window.esc(dados.final.localizacao)}` : ''}</div>`;
      if (dados.final.foto) html += `<div class="mt-2"><img src="${dados.final.foto}" class="w-24 h-24 object-cover rounded border border-[var(--border)]"></div>`;
    } else if (!chegadaConcluido) {
      html += `<div class="text-[var(--warning)] text-sm"><i class="fas fa-hourglass-half"></i> Aguarde registrar a chegada ao cliente primeiro.</div>`;
    }
    html += `</div>`;

    // Etapa 4 - Executar Serviço
    if (chegadaConcluido && !finalConcluido) {
      html += `<div class="journey-step bg-[var(--bg-secondary)] rounded-xl p-5 border-l-4 border-l-[var(--info)]"><h3 class="text-[var(--info)] mb-2 flex items-center gap-2"><i class="fas fa-laptop-code"></i> 4. Executar Serviço</h3><p class="text-sm text-[var(--muted)]">A OS será exibida na guia O.S. Realize o atendimento e finalize.</p></div>`;
    }

    container.innerHTML = html;
  }
};
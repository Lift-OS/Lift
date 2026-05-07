// modules/clientes.js - Cadastro de Clientes com Equipamentos
window.ClientesModule = {
  editingId: null,

  init: function() {
    setTimeout(function() {
      ClientesModule.renderTable();
      ClientesModule.updateStats();
      ClientesModule.loadEventListeners();
    }, 100);
  },

  loadEventListeners: function() {
    var searchInput = document.getElementById('cad_searchInput');
    if (searchInput) searchInput.oninput = function(e) { ClientesModule.filtrarClientes(e.target.value); };
    
    var btnSalvar = document.getElementById('btnSalvarCliente');
    if (btnSalvar) btnSalvar.onclick = function() { ClientesModule.salvar(); };
    
    var btnCancelar = document.getElementById('cad_btnCancelar');
    if (btnCancelar) btnCancelar.onclick = function() { ClientesModule.cancelarEdicao(); };
    
    var btnAddEquip = document.getElementById('btnAddEquip');
    if (btnAddEquip) btnAddEquip.onclick = function() { ClientesModule.adicionarCampoEquipamento(); };
    
    var btnExportar = document.getElementById('btnExportarCSVClientes');
    if (btnExportar) btnExportar.onclick = function() { ClientesModule.exportCSV(); };
    
    var btnImportar = document.getElementById('btnImportarCSVClientes');
    if (btnImportar) btnImportar.onclick = function() { ClientesModule.importCSV(); };
  },

  updateStats: function() {
    var total = window.State.clients.length;
    var elTotal = document.getElementById('statTotalClientes');
    if (elTotal) elTotal.innerText = total;
  },

  renderTable: function() {
    var tbody = document.getElementById('cad_tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!window.State.clients.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-[var(--muted)]">Nenhum cliente cadastrado</td></tr>';
      return;
    }
    
    var podeEditar = window.Auth.can('clientes_editar');
    var podeExcluir = window.Auth.can('clientes_excluir');
    
    for (var i = 0; i < window.State.clients.length; i++) {
      var c = window.State.clients[i];
      var equipArray = Array.isArray(c.equipamentos) ? c.equipamentos : [];
      var marcas = '';
      for (var j = 0; j < equipArray.length; j++) {
        if (j > 0) marcas += ', ';
        marcas += equipArray[j].marca || '';
      }
      
      var acoes = '<button onclick="ClientesModule.selecionarCliente(' + c.id + ')" class="btn btn-primary text-xs py-1 px-2"><i class="fas fa-arrow-right"></i> Selecionar</button>';
      if (podeEditar) acoes += ' <i class="fas fa-edit text-blue-400 cursor-pointer ml-2" onclick="ClientesModule.editarCliente(' + c.id + ')"></i>';
      if (podeExcluir) acoes += ' <i class="fas fa-trash text-red-400 cursor-pointer ml-2" onclick="ClientesModule.excluirCliente(' + c.id + ')"></i>';
      
      var row = tbody.insertRow();
      row.innerHTML = `
        <td class="p-2">${window.esc(c.nome || '')}</td>
        <td class="p-2">${window.esc(c.cidade || '-')}</td>
        <td class="p-2">${window.esc(marcas || '-')}</td>
        <td class="p-2">${acoes}</td>
      `;
    }
  },

  selecionarCliente: function(id) {
    var cliente = null;
    for (var i = 0; i < window.State.clients.length; i++) {
      if (window.State.clients[i].id === id) {
        cliente = window.State.clients[i];
        break;
      }
    }
    if (!cliente) return;
    
    var escolha = confirm('Cliente: ' + cliente.nome + '\n\nOK = Abrir OS\nCancelar = Criar Orçamento');
    
    if (escolha) {
      window.Utils.setVal('cliente', cliente.nome);
      window.Utils.setVal('cnpj', cliente.cnpj || '');
      window.Utils.setVal('cidadeCliente', cliente.cidade || '');
      window.Utils.setVal('endereco', cliente.endereco || '');
      window.Utils.setVal('whatsappCliente', cliente.whatsapp || '');
      window.PageLoader.load('os');
      showToast('Cliente carregado na OS');
    } else {
      window.Utils.setVal('orc_cliente', cliente.nome);
      window.Utils.setVal('orc_equipamento', '');
      window.PageLoader.load('orcamento');
      showToast('Cliente carregado no orçamento');
    }
  },

  salvar: async function() {
    if (!window.Auth.can('clientes_cadastrar')) {
      showToast('Sem permissão', true);
      return;
    }
    
    var nome = document.getElementById('cad_nome')?.value.trim();
    if (!nome) {
      showToast('Nome é obrigatório', true);
      return;
    }
    
    // Coletar equipamentos
    var equipamentos = [];
    var equipItems = document.querySelectorAll('#equipamentosList .equip-item');
    for (var i = 0; i < equipItems.length; i++) {
      var item = equipItems[i];
      var marcaSelect = item.querySelector('.equip-marca');
      var outraMarca = item.querySelector('.outra-marca');
      var marca = marcaSelect ? marcaSelect.value : '';
      if (marca === 'OUTRA' && outraMarca) marca = outraMarca.value.toUpperCase();
      
      if (marca) {
        var modelo = item.querySelector('.equip-modelo')?.value || '';
        var serie = item.querySelector('.equip-serie')?.value || '';
        var qtd = parseInt(item.querySelector('.equip-qtd')?.value) || 1;
        var combustivel = item.querySelector('.equip-combustivel')?.value || '';
        equipamentos.push({ marca: marca, modelo: modelo, serie: serie, qtd: qtd, combustivel: combustivel });
      }
    }
    
    var cliente = {
      id: this.editingId || Date.now(),
      nome: nome,
      cnpj: document.getElementById('cad_cnpj')?.value || '',
      endereco: document.getElementById('cad_endereco')?.value || '',
      cidade: document.getElementById('cad_cidade')?.value || '',
      telefone: document.getElementById('cad_telefone')?.value || '',
      whatsapp: document.getElementById('cad_whatsapp')?.value || '',
      email: document.getElementById('cad_email')?.value || '',
      responsavel_nome: document.getElementById('cad_responsavel_nome')?.value || '',
      responsavel_telefone: document.getElementById('cad_responsavel_telefone')?.value || '',
      equipamentos: equipamentos
    };
    
    if (this.editingId) {
      var index = -1;
      for (var i = 0; i < window.State.clients.length; i++) {
        if (window.State.clients[i].id === this.editingId) {
          index = i;
          break;
        }
      }
      if (index >= 0) window.State.clients[index] = cliente;
      showToast('Cliente atualizado');
      this.editingId = null;
      document.getElementById('cad_btnCancelar').style.display = 'none';
    } else {
      window.State.clients.push(cliente);
      showToast('Cliente cadastrado');
    }
    
    window.Storage.saveClients();
    this.limparFormulario();
    this.renderTable();
    this.updateStats();
    
    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      await window.GoogleSheets.syncSingleCliente(cliente);
      showToast('Cliente sincronizado com a planilha!');
    }
  },

  editarCliente: function(id) {
    if (!window.Auth.can('clientes_editar')) {
      showToast('Sem permissão', true);
      return;
    }
    
    var cliente = null;
    for (var i = 0; i < window.State.clients.length; i++) {
      if (window.State.clients[i].id === id) {
        cliente = window.State.clients[i];
        break;
      }
    }
    if (!cliente) return;
    
    this.editingId = id;
    document.getElementById('cad_nome').value = cliente.nome || '';
    document.getElementById('cad_cnpj').value = cliente.cnpj || '';
    document.getElementById('cad_endereco').value = cliente.endereco || '';
    document.getElementById('cad_cidade').value = cliente.cidade || '';
    document.getElementById('cad_telefone').value = cliente.telefone || '';
    document.getElementById('cad_whatsapp').value = cliente.whatsapp || '';
    document.getElementById('cad_email').value = cliente.email || '';
    document.getElementById('cad_responsavel_nome').value = cliente.responsavel_nome || '';
    document.getElementById('cad_responsavel_telefone').value = cliente.responsavel_telefone || '';
    
    var container = document.getElementById('equipamentosList');
    if (container) container.innerHTML = '';
    
    var equipamentos = Array.isArray(cliente.equipamentos) ? cliente.equipamentos : [];
    for (var i = 0; i < equipamentos.length; i++) {
      this.adicionarCampoEquipamento(equipamentos[i].marca, equipamentos[i].modelo, equipamentos[i].serie, equipamentos[i].qtd, equipamentos[i].combustivel);
    }
    
    document.getElementById('cad_btnCancelar').style.display = 'inline-flex';
    document.getElementById('clienteFormCard')?.scrollIntoView({ behavior: 'smooth' });
  },

  excluirCliente: function(id) {
    if (!window.Auth.can('clientes_excluir')) {
      showToast('Sem permissão', true);
      return;
    }
    if (!confirm('Excluir este cliente permanentemente?')) return;
    
    var newClients = [];
    for (var i = 0; i < window.State.clients.length; i++) {
      if (window.State.clients[i].id !== id) newClients.push(window.State.clients[i]);
    }
    window.State.clients = newClients;
    window.Storage.saveClients();
    this.renderTable();
    this.updateStats();
    showToast('Cliente excluído');
  },

  cancelarEdicao: function() {
    this.editingId = null;
    this.limparFormulario();
    document.getElementById('cad_btnCancelar').style.display = 'none';
  },

  limparFormulario: function() {
    var fields = ['cad_nome', 'cad_cnpj', 'cad_endereco', 'cad_cidade', 'cad_telefone', 'cad_whatsapp', 'cad_email', 'cad_responsavel_nome', 'cad_responsavel_telefone'];
    for (var i = 0; i < fields.length; i++) {
      var el = document.getElementById(fields[i]);
      if (el) el.value = '';
    }
    var container = document.getElementById('equipamentosList');
    if (container) container.innerHTML = '';
  },

  adicionarCampoEquipamento: function(marca, modelo, serie, qtd, combustivel) {
    var container = document.getElementById('equipamentosList');
    if (!container) return;
    
    var div = document.createElement('div');
    div.className = 'equip-item grid grid-cols-1 md:grid-cols-6 gap-2 p-2 bg-[var(--bg-secondary)] rounded-lg mb-2';
    
    var marcasList = ["TOYOTA","CLARK","BYD","PALETRANS","LINDE","HYSTER","YALE","CATERPILLAR","KOMATSU","MITSUBISHI","NISSAN","STILL","CROWN","JUNGHEINRICH","TCM","HYUNDAI","DOOSAN","HELI","HANGCHA","LONKING","OUTRA"];
    var marcasOptions = '<option value="">Selecione</option>';
    for (var i = 0; i < marcasList.length; i++) {
      var selected = (marca === marcasList[i]) ? 'selected' : '';
      marcasOptions += '<option value="' + marcasList[i] + '" ' + selected + '>' + marcasList[i] + '</option>';
    }
    
    div.innerHTML = `
      <select class="form-input equip-marca">${marcasOptions}</select>
      <div class="outra-marca-container" style="display:${marca && !marcasList.includes(marca) ? 'block' : 'none'}">
        <input type="text" placeholder="Digite a marca" class="form-input outra-marca" value="${marca && !marcasList.includes(marca) ? window.esc(marca) : ''}">
      </div>
      <input type="text" placeholder="Modelo" class="form-input equip-modelo" value="${window.esc(modelo || '')}">
      <input type="text" placeholder="Série" class="form-input equip-serie" value="${window.esc(serie || '')}">
      <input type="number" placeholder="Qtd" class="form-input equip-qtd" value="${qtd || 1}">
      <select class="form-input equip-combustivel">
        <option value="">Combustível</option>
        <option value="eletrico" ${combustivel === 'eletrico' ? 'selected' : ''}>Elétrico</option>
        <option value="diesel" ${combustivel === 'diesel' ? 'selected' : ''}>Diesel</option>
        <option value="gasolina" ${combustivel === 'gasolina' ? 'selected' : ''}>Gasolina</option>
        <option value="glp" ${combustivel === 'glp' ? 'selected' : ''}>GLP</option>
      </select>
      <button type="button" class="text-red-500" onclick="this.closest('.equip-item').remove()"><i class="fas fa-trash"></i></button>
    `;
    
    var marcaSelect = div.querySelector('.equip-marca');
    var outraDiv = div.querySelector('.outra-marca-container');
    marcaSelect.onchange = function() {
      outraDiv.style.display = marcaSelect.value === 'OUTRA' ? 'block' : 'none';
    };
    
    container.appendChild(div);
  },

  exportCSV: function() {
    if (!window.Auth.can('clientes_exportar_csv')) return;
    var csv = "Nome,CNPJ,Endereco,Cidade,Telefone,WhatsApp,E-mail\n";
    for (var i = 0; i < window.State.clients.length; i++) {
      var c = window.State.clients[i];
      csv += '"' + (c.nome || '') + '",' + (c.cnpj || '') + ',"' + (c.endereco || '') + '","' + (c.cidade || '') + '",' + (c.telefone || '') + ',' + (c.whatsapp || '') + ',' + (c.email || '') + '\n';
    }
    var blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'clientes_' + window.Utils.dataHojeISO() + '.csv';
    link.click();
    showToast('Clientes exportados');
  },

  importCSV: function() {
    if (!window.Auth.can('clientes_importar_csv')) return;
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = function(e) {
      var file = e.target.files[0];
      var reader = new FileReader();
      reader.onload = function(ev) {
        var lines = ev.target.result.split('\n');
        for (var i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          var cols = window.Utils.parseCSVLine(lines[i]);
          if (cols[0]) {
            window.State.clients.push({
              id: Date.now() + i,
              nome: cols[0]?.trim() || '',
              cnpj: cols[1] || '',
              endereco: cols[2] || '',
              cidade: cols[3] || '',
              telefone: cols[4] || '',
              whatsapp: cols[5] || '',
              email: cols[6] || '',
              equipamentos: []
            });
          }
        }
        window.Storage.saveClients();
        ClientesModule.renderTable();
        ClientesModule.updateStats();
        showToast('Clientes importados');
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  },

  loadFromSync: function(clientes) {
    if (Array.isArray(clientes) && clientes.length) {
      window.State.clients = clientes;
      window.Storage.saveClients();
      this.renderTable();
      this.updateStats();
    }
  }
};

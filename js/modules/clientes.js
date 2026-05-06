// modules/clientes.js - Módulo de Clientes (com sincronização)
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
    if (btnSalvar) btnSalvar.onclick = function() { ClientesModule.save(); };
    var btnCancelar = document.getElementById('cad_btnCancelar');
    if (btnCancelar) btnCancelar.onclick = function() { ClientesModule.cancelEdit(); };
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

    window.State.clients.forEach(function(cliente) {
      var row = tbody.insertRow();
      row.innerHTML = `
        <td class="p-2">${window.esc(cliente.nome || '')}</td>
        <td class="p-2">${window.esc(cliente.cidade || '-')}</td>
        <td class="p-2">-</td>
        <td class="p-2">
          <button onclick="ClientesModule.edit(${cliente.id})" class="btn btn-primary text-xs py-1 px-2">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button onclick="ClientesModule.delete(${cliente.id})" class="btn btn-danger text-xs py-1 px-2">
            <i class="fas fa-trash"></i> Excluir
          </button>
        </td>
      `;
    });
  },

  // Adicione este método no clientes.js
selecionarCliente(id) {
  var cliente = window.State.clients.find(c => c.id === id);
  if (!cliente) return;
  
  // Mostrar modal de escolha entre OS e Orçamento
  var escolha = confirm('Cliente: ' + cliente.nome + '\n\nO que deseja fazer?\n\nOK = Abrir OS\nCancelar = Abrir Orçamento');
  
  if (escolha) {
    // Carregar OS
    window.Utils.setVal('cliente', cliente.nome);
    window.Utils.setVal('cnpj', cliente.cnpj || '');
    window.Utils.setVal('cidadeCliente', cliente.cidade || '');
    window.Utils.setVal('endereco', cliente.endereco || '');
    window.Utils.setVal('whatsappCliente', cliente.whatsapp || '');
    window.PageLoader.load('os');
    showToast('Cliente carregado na OS');
  } else {
    // Carregar Orçamento
    window.Utils.setVal('orc_cliente', cliente.nome);
    window.Utils.setVal('orc_equipamento', '');
    window.PageLoader.load('orcamento');
    showToast('Cliente carregado no orçamento');
  }
}

  filtrarClientes: function(busca) {
    if (!busca) { this.renderTable(); return; }
    var filtered = window.State.clients.filter(function(c) {
      return (c.nome && c.nome.toLowerCase().includes(busca.toLowerCase())) ||
             (c.cidade && c.cidade.toLowerCase().includes(busca.toLowerCase()));
    });
    this.renderTable(filtered);
  },

  save: async function() {
    if (!window.Auth.can('clientes_cadastrar')) {
      showToast('Sem permissão', true);
      return;
    }
    var nome = document.getElementById('cad_nome')?.value.trim();
    if (!nome) { showToast('Nome obrigatório', true); return; }
    
    var cliente = {
      id: this.editingId || Date.now(),
      nome: nome,
      cnpj: document.getElementById('cad_cnpj')?.value || '',
      endereco: document.getElementById('cad_endereco')?.value || '',
      cidade: document.getElementById('cad_cidade')?.value || '',
      telefone: document.getElementById('cad_telefone')?.value || '',
      whatsapp: document.getElementById('cad_whatsapp')?.value || '',
      email: document.getElementById('cad_email')?.value || '',
      equipamentos: []
    };
    
    if (this.editingId) {
      var index = window.State.clients.findIndex(function(c) { return c.id === this.editingId; }.bind(this));
      if (index >= 0) window.State.clients[index] = cliente;
      showToast('Cliente atualizado');
      this.editingId = null;
      document.getElementById('cad_btnCancelar').style.display = 'none';
    } else {
      window.State.clients.push(cliente);
      showToast('Cliente cadastrado');
    }
    
    window.Storage.saveClients();
    this.clearForm();
    this.renderTable();
    this.updateStats();
    
    // Sincronizar com Google Sheets
    if (window.GoogleSheets && window.Auth.can('sincronizar')) {
      await window.GoogleSheets.syncSingleCliente(cliente);
      showToast('Cliente sincronizado com a planilha!');
    }
  },

  edit: function(id) {
    if (!window.Auth.can('clientes_editar')) { showToast('Sem permissão', true); return; }
    var cliente = window.State.clients.find(function(c) { return c.id === id; });
    if (!cliente) return;
    
    this.editingId = id;
    document.getElementById('cad_nome').value = cliente.nome || '';
    document.getElementById('cad_cnpj').value = cliente.cnpj || '';
    document.getElementById('cad_endereco').value = cliente.endereco || '';
    document.getElementById('cad_cidade').value = cliente.cidade || '';
    document.getElementById('cad_telefone').value = cliente.telefone || '';
    document.getElementById('cad_whatsapp').value = cliente.whatsapp || '';
    document.getElementById('cad_email').value = cliente.email || '';
    document.getElementById('cad_btnCancelar').style.display = 'inline-flex';
  },

  delete: function(id) {
    if (!window.Auth.can('clientes_excluir')) { showToast('Sem permissão', true); return; }
    if (!confirm('Excluir cliente?')) return;
    window.State.clients = window.State.clients.filter(function(c) { return c.id !== id; });
    window.Storage.saveClients();
    this.renderTable();
    this.updateStats();
    showToast('Cliente excluído');
  },

  cancelEdit: function() {
    this.editingId = null;
    this.clearForm();
    document.getElementById('cad_btnCancelar').style.display = 'none';
  },

  clearForm: function() {
    var fields = ['cad_nome', 'cad_cnpj', 'cad_endereco', 'cad_cidade', 'cad_telefone', 'cad_whatsapp', 'cad_email'];
    fields.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
  },

  exportCSV: function() {
    if (!window.Auth.can('clientes_exportar_csv')) return;
    var csv = "Nome,CNPJ,Endereco,Cidade,Telefone,WhatsApp,E-mail\n";
    window.State.clients.forEach(function(c) {
      csv += '"' + (c.nome || '') + '",' + (c.cnpj || '') + ',"' + (c.endereco || '') + '","' + (c.cidade || '') + '",' + (c.telefone || '') + ',' + (c.whatsapp || '') + ',' + (c.email || '') + '\n';
    });
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

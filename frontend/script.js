// =================== CONFIGURAÇÃO DA API ===================
const API_BASE = 'http://localhost:5000';

// =================== FUNÇÃO FETCH GENÉRICA ===================
async function fetchData(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(error.error || `Erro ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Erro na requisição ${endpoint}:`, error);
    mostrarToast(`Erro: ${error.message}`, 'error');
    throw error;
  }
}

// =================== VARIÁVEIS GLOBAIS ===================
let todosClientes = [], todosServicos = [], todosProfissionais = [], todosAgendamentos = [];
let calendario = null;

const clienteAutocompleteInput = document.getElementById('cliente-autocomplete');
const clienteIdHiddenInput = document.getElementById('id-cliente-hidden');
const clienteFeedback = document.getElementById('cliente-feedback');
const servicoSelectAgendamento = document.getElementById('servico-select-agendamento');
const filtroServicoCalendario = document.getElementById('filtro-servico-calendario');
const filtroProfissionalCalendario = document.getElementById('filtro-profissional-calendario');

// =================== ESCAPE HTML ===================
function escapeHTML(str) {
  return str?.toString().replace(/[&<>"']/g, (match) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[match])) || '';
}

// =================== EXIBIR TOAST ===================
function mostrarToast(mensagem, tipo = 'info') {
  const container = document.getElementById('toast-container') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast-message ${tipo}`;
  toast.innerHTML = `
    <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    ${mensagem}
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (container.contains(toast)) {
        container.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// =================== TROCAR ABAS ===================
function openTab(evt, tabId) {
  // Remove classe active de todas as abas e botões
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tablink').forEach(btn => btn.classList.remove('active'));
  
  // Adiciona classe active na aba e botão selecionados
  const tabElement = document.getElementById(tabId);
  if (tabElement) {
    tabElement.classList.add('active');
  }
  
  if (evt && evt.currentTarget) {
    evt.currentTarget.classList.add('active');
  }

  // Carrega o calendário quando a aba da agenda é aberta
  if (tabId === 'agendaDataTab') {
    setTimeout(() => {
      if (!calendario) {
        carregarAgendaSemanal();
      } else {
        calendario.updateSize();
        calendario.refetchEvents();
      }
    }, 100);
  }

  // Carrega agendamentos quando a aba de novo agendamento é aberta
  if (tabId === 'agendamentoTab') {
    carregarTabelaAgendamentos();
  }
}

// =================== CLIENTES ===================
async function carregarTodosClientes() {
  try {
    showLoadingState('tabela-clientes', 4);
    const clientes = await fetchData('/clientes');
    todosClientes = clientes;
    
    setupAutocomplete(clienteAutocompleteInput, todosClientes, 'nome', 'id', id => {
      clienteIdHiddenInput.value = id;
      if (clienteFeedback) clienteFeedback.style.display = 'none';
    });
    
    popularTabelaClientes();
    console.log('✅ Clientes carregados:', todosClientes.length);
  } catch (e) {
    console.error('Erro ao carregar clientes:', e);
  }
}

function popularTabelaClientes() {
  const tbody = document.getElementById('tabela-clientes');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  if (!todosClientes.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum cliente cadastrado.</td></tr>';
    return;
  }
  
  todosClientes.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(c.nome)}</td>
      <td>${escapeHTML(c.email || '-')}</td>
      <td>${escapeHTML(c.telefone || '-')}</td>
      <td class="action-buttons">
        <button onclick="editarCliente(${c.id})" class="btn-edit" title="Editar">✏️</button>
        <button onclick="deletarCliente(${c.id})" class="btn-delete" title="Excluir">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function salvarCliente(event) {
  event.preventDefault();
  try {
    const editId = document.getElementById('edit-cliente-id')?.value;
    const nome = document.getElementById('nome-cliente').value;
    const email = document.getElementById('email-cliente').value;
    const telefone = document.getElementById('telefone-cliente').value;
    
    const method = editId ? 'PUT' : 'POST';
    const endpoint = editId ? `/clientes/${editId}` : '/clientes';
    
    await fetchData(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, telefone })
    });
    
    await carregarTodosClientes();
    event.target.reset();
    if (editId) {
      document.getElementById('edit-cliente-id').value = '';
      document.getElementById('btn-cancelar-edicao-cliente').style.display = 'none';
      document.getElementById('titulo-form-cliente').innerHTML = '<i class="fas fa-user-plus"></i> Adicionar Novo Cliente';
    }
    mostrarToast(editId ? 'Cliente atualizado com sucesso!' : 'Cliente salvo com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao salvar cliente:', error);
  }
}

async function deletarCliente(id) {
  if (!confirm("Deseja realmente excluir este cliente?")) return;
  
  try {
    await fetchData(`/clientes/${id}`, { method: 'DELETE' });
    await carregarTodosClientes();
    mostrarToast('Cliente excluído com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
  }
}

function editarCliente(id) {
  const cliente = todosClientes.find(c => c.id === id);
  if (!cliente) return;
  
  document.getElementById('nome-cliente').value = cliente.nome;
  document.getElementById('email-cliente').value = cliente.email || '';
  document.getElementById('telefone-cliente').value = cliente.telefone || '';
  document.getElementById('edit-cliente-id').value = cliente.id;
  document.getElementById('btn-cancelar-edicao-cliente').style.display = 'inline-block';
  document.getElementById('titulo-form-cliente').innerHTML = '<i class="fas fa-user-edit"></i> Editar Cliente';
  
  mostrarToast('Cliente carregado para edição', 'info');
}

// =================== SERVIÇOS ===================
async function carregarTodosServicos() {
  try {
    showLoadingState('tabela-servicos', 4);
    const servicos = await fetchData('/servicos');
    todosServicos = servicos;
    
    popularSelectServicos();
    popularTabelaServicos();
    popularCheckboxesServicosProfissional();
    console.log('✅ Serviços carregados:', todosServicos.length);
  } catch (e) {
    console.error('Erro ao carregar serviços:', e);
  }
}

function popularSelectServicos() {
  const selects = [servicoSelectAgendamento, filtroServicoCalendario];
  selects.forEach(select => {
    if (select) {
      const isFilter = select === filtroServicoCalendario;
      select.innerHTML = `<option value="">-- ${isFilter ? 'Todos os Serviços' : 'Selecione um Serviço'} --</option>`;
      
      todosServicos.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.nome} ${!isFilter ? `(R$ ${parseFloat(s.preco).toFixed(2)})` : ''}`;
        select.appendChild(opt);
      });
    }
  });
}

function popularTabelaServicos() {
  const tbody = document.getElementById('tabela-servicos');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  if (!todosServicos.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum serviço cadastrado.</td></tr>';
    return;
  }
  
  todosServicos.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(s.nome)}</td>
      <td>R$ ${parseFloat(s.preco).toFixed(2)}</td>
      <td>${s.duracao || '-'} min</td>
      <td class="action-buttons">
        <button onclick="editarServico(${s.id})" class="btn-edit" title="Editar">✏️</button>
        <button onclick="deletarServico(${s.id})" class="btn-delete" title="Excluir">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function salvarServico(event) {
  event.preventDefault();
  try {
    const editId = document.getElementById('edit-servico-id')?.value;
    const nome = document.getElementById('nome-servico').value;
    const preco = document.getElementById('preco-servico').value;
    const duracao = document.getElementById('duracao-servico').value;
    
    const method = editId ? 'PUT' : 'POST';
    const endpoint = editId ? `/servicos/${editId}` : '/servicos';
    
    await fetchData(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, preco, duracao })
    });
    
    await carregarTodosServicos();
    event.target.reset();
    if (editId) {
      document.getElementById('edit-servico-id').value = '';
      document.getElementById('btn-cancelar-edicao-servico').style.display = 'none';
      document.getElementById('titulo-form-servico').innerHTML = '<i class="fas fa-plus-circle"></i> Adicionar Novo Serviço';
    }
    mostrarToast(editId ? 'Serviço atualizado com sucesso!' : 'Serviço salvo com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao salvar serviço:', error);
  }
}

async function deletarServico(id) {
  if (!confirm("Deseja realmente excluir este serviço?")) return;
  
  try {
    await fetchData(`/servicos/${id}`, { method: 'DELETE' });
    await carregarTodosServicos();
    mostrarToast('Serviço excluído com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao deletar serviço:', error);
  }
}

function editarServico(id) {
  const servico = todosServicos.find(s => s.id === id);
  if (!servico) return;
  
  document.getElementById('nome-servico').value = servico.nome;
  document.getElementById('preco-servico').value = servico.preco;
  document.getElementById('duracao-servico').value = servico.duracao || '';
  document.getElementById('edit-servico-id').value = servico.id;
  document.getElementById('btn-cancelar-edicao-servico').style.display = 'inline-block';
  document.getElementById('titulo-form-servico').innerHTML = '<i class="fas fa-edit"></i> Editar Serviço';
  
  mostrarToast('Serviço carregado para edição', 'info');
}

function popularCheckboxesServicosProfissional() {
  const cont = document.getElementById('checkbox-servicos-container');
  if (!cont) return;
  
  cont.innerHTML = '';
  if (!todosServicos.length) {
    cont.innerHTML = '<p class="text-center">Nenhum serviço cadastrado</p>';
    return;
  }
  
  cont.style.display = 'grid';
  todosServicos.forEach(s => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${s.id}"> ${escapeHTML(s.nome)}`;
    cont.appendChild(label);
  });
}

// =================== PROFISSIONAIS ===================
async function carregarTodosProfissionais() {
  try {
    showLoadingState('tabela-profissionais', 3);
    const profissionais = await fetchData('/profissionais');
    todosProfissionais = profissionais;
    
    popularTabelaProfissionais();
    popularSelectProfissionais();
    console.log('✅ Profissionais carregados:', todosProfissionais.length);
  } catch (e) {
    console.error('Erro ao carregar profissionais:', e);
  }
}

function popularTabelaProfissionais() {
  const tbody = document.getElementById('tabela-profissionais');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  if (!todosProfissionais.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center">Nenhum profissional cadastrado.</td></tr>';
    return;
  }
  
  todosProfissionais.forEach(p => {
    const servicosTexto = p.servicos_nomes || 'Nenhum serviço associado';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(p.nome)}</td>
      <td>${escapeHTML(servicosTexto)}</td>
      <td class="action-buttons">
        <button onclick="editarProfissional(${p.id})" class="btn-edit" title="Editar">✏️</button>
        <button onclick="deletarProfissional(${p.id})" class="btn-delete" title="Excluir">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function popularSelectProfissionais() {
  const select = filtroProfissionalCalendario;
  if (select) {
    select.innerHTML = '<option value="">-- Todos os Profissionais --</option>';
    todosProfissionais.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nome;
      select.appendChild(opt);
    });
  }
}

async function salvarProfissional(event) {
  event.preventDefault();
  try {
    const editId = document.getElementById('edit-profissional-id')?.value;
    const nome = document.getElementById('nome-profissional').value;
    const servicosSelecionados = Array.from(
      document.querySelectorAll('#checkbox-servicos-container input[type="checkbox"]:checked')
    ).map(cb => cb.value);
    
    const method = editId ? 'PUT' : 'POST';
    const endpoint = editId ? `/profissionais/${editId}` : '/profissionais';
    
    await fetchData(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, servicos: servicosSelecionados })
    });
    
    await carregarTodosProfissionais();
    event.target.reset();
    document.querySelectorAll('#checkbox-servicos-container input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    if (editId) {
      document.getElementById('edit-profissional-id').value = '';
      document.getElementById('btn-cancelar-edicao-profissional').style.display = 'none';
      document.getElementById('titulo-form-profissional').innerHTML = '<i class="fas fa-user-plus"></i> Adicionar Novo Profissional';
    }
    
    mostrarToast(editId ? 'Profissional atualizado com sucesso!' : 'Profissional salvo com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao salvar profissional:', error);
  }
}

async function deletarProfissional(id) {
  if (!confirm("Deseja realmente excluir este profissional?")) return;
  
  try {
    await fetchData(`/profissionais/${id}`, { method: 'DELETE' });
    await carregarTodosProfissionais();
    mostrarToast('Profissional excluído com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao deletar profissional:', error);
  }
}

function editarProfissional(id) {
  const profissional = todosProfissionais.find(p => p.id === id);
  if (!profissional) return;
  
  document.getElementById('nome-profissional').value = profissional.nome;
  document.getElementById('edit-profissional-id').value = profissional.id;
  document.getElementById('btn-cancelar-edicao-profissional').style.display = 'inline-block';
  document.getElementById('titulo-form-profissional').innerHTML = '<i class="fas fa-user-edit"></i> Editar Profissional';
  
  // Marcar serviços associados
  document.querySelectorAll('#checkbox-servicos-container input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });
  
  if (profissional.servicos_ids) {
    const servicosIds = profissional.servicos_ids.split(',');
    servicosIds.forEach(servicoId => {
      const checkbox = document.querySelector(`#checkbox-servicos-container input[value="${servicoId}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }
  
  mostrarToast('Profissional carregado para edição', 'info');
}

// =================== AGENDAMENTOS ===================
async function carregarTodosAgendamentos() {
  try {
    const agendamentos = await fetchData('/agendamentos');
    todosAgendamentos = agendamentos;
    return todosAgendamentos;
  } catch (e) {
    console.error('Erro ao carregar agendamentos:', e);
    return [];
  }
}

async function carregarTabelaAgendamentos() {
  try {
    showLoadingState('tabela-agendamentos', 6);
    await carregarTodosAgendamentos();
    popularTabelaAgendamentos();
  } catch (error) {
    console.error('Erro ao carregar tabela de agendamentos:', error);
  }
}

function popularTabelaAgendamentos() {
  const tbody = document.getElementById('tabela-agendamentos');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  if (!todosAgendamentos.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum agendamento encontrado.</td></tr>';
    return;
  }
  
  // Ordenar por data/hora
  const agendamentosOrdenados = [...todosAgendamentos].sort((a, b) => 
    new Date(a.data_horario) - new Date(b.data_horario)
  );
  
  agendamentosOrdenados.forEach(a => {
    const dataFormatada = new Date(a.data_horario).toLocaleString('pt-BR');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dataFormatada}</td>
      <td>${escapeHTML(a.cliente)}</td>
      <td>${escapeHTML(a.servico)}</td>
      <td>${escapeHTML(a.profissional)}</td>
      <td><span class="status-chip status-${a.status}">${a.status}</span></td>
      <td class="action-buttons">
        <button onclick="editarAgendamento(${a.id})" class="btn-edit" title="Editar">✏️</button>
        <button onclick="deletarAgendamento(${a.id})" class="btn-delete" title="Cancelar">❌</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function salvarAgendamento(event) {
  event.preventDefault();
  try {
    const clienteId = clienteIdHiddenInput.value;
    const servicoId = servicoSelectAgendamento.value;
    const profissionalId = document.getElementById('profissional-select-agendamento').value;
    const dataHorario = document.getElementById('data-horario').value;
    
    if (!clienteId) {
      mostrarToast('Selecione um cliente válido', 'error');
      return;
    }
    
    await fetchData('/agendamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_id: clienteId,
        servico_id: servicoId,
        profissional_id: profissionalId,
        data_horario: dataHorario,
        status: 'agendado'
      })
    });
    
    await carregarTabelaAgendamentos();
    if (calendario) {
      calendario.refetchEvents();
    }
    
    event.target.reset();
    clienteIdHiddenInput.value = '';
    mostrarToast('Agendamento criado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao salvar agendamento:', error);
  }
}

async function deletarAgendamento(id) {
  if (!confirm("Deseja cancelar este agendamento?")) return;
  
  try {
    await fetchData(`/agendamentos/${id}`, { method: 'DELETE' });
    await carregarTabelaAgendamentos();
    if (calendario) {
      calendario.refetchEvents();
    }
    mostrarToast('Agendamento cancelado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
  }
}

function editarAgendamento(id) {
  // Implementar edição de agendamentos se necessário
  mostrarToast('Função de edição em desenvolvimento', 'info');
}

// =================== CALENDÁRIO ===================
async function carregarAgendaSemanal() {
  const calendarioContainer = document.getElementById('calendar');
  if (!calendarioContainer) {
    console.error('Container do calendário não encontrado');
    return;
  }

  try {
    await carregarTodosAgendamentos();

    const eventosFormatados = todosAgendamentos.map(a => ({
      id: a.id,
      title: `${a.cliente} - ${a.servico}`,
      start: a.data_horario,
      backgroundColor: getCorPorStatus(a.status),
      borderColor: getCorPorStatus(a.status),
      textColor: '#fff',
      extendedProps: {
        cliente: a.cliente,
        servico: a.servico,
        profissional: a.profissional,
        status: a.status
      }
    }));

    calendario = new FullCalendar.Calendar(calendarioContainer, {
      locale: 'pt-br',
      initialView: 'timeGridWeek',
      height: 600,
      slotMinTime: '08:00:00',
      slotMaxTime: '20:00:00',
      nowIndicator: true,
      events: eventosFormatados,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridWeek,timeGridDay'
      },
      slotLabelFormat: {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      },
      eventTimeFormat: {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      },
      businessHours: {
        daysOfWeek: [1, 2, 3, 4, 5, 6], // Segunda a sábado
        startTime: '08:00',
        endTime: '18:00'
      },
      eventClick: function(info) {
        const evento = info.event;
        alert(`
Cliente: ${evento.extendedProps.cliente}
Serviço: ${evento.extendedProps.servico}
Profissional: ${evento.extendedProps.profissional}
Status: ${evento.extendedProps.status}
Data/Hora: ${evento.start.toLocaleString('pt-BR')}
        `);
      }
    });

    calendario.render();
    console.log('✅ Calendário carregado com sucesso!');
    
  } catch (error) {
    console.error("Erro ao carregar agenda:", error);
    calendarioContainer.innerHTML = '<p class="text-center">Erro ao carregar calendário</p>';
  }
}

function getCorPorStatus(status) {
  const cores = {
    'agendado': '#3498db',    // Azul
    'confirmado': '#2ecc71',  // Verde
    'concluido': '#95a5a6',   // Cinza
    'cancelado': '#e74c3c'    // Vermelho
  };
  return cores[status] || '#3498db';
}

// =================== AUTOCOMPLETE ===================
function setupAutocomplete(input, dataList, field, idField, onSelect) {
  if (!input) return;
  
  input.addEventListener('input', function () {
    const val = this.value.toLowerCase();
    const filtered = dataList.filter(item => 
      item[field].toLowerCase().includes(val)
    ).slice(0, 10); // Limita a 10 resultados
    
    closeAutocompleteLists();
    
    if (filtered.length === 0 && val.length > 0) {
      if (clienteFeedback) clienteFeedback.style.display = 'block';
      return;
    } else {
      if (clienteFeedback) clienteFeedback.style.display = 'none';
    }
    
    if (filtered.length === 0) return;
    
    const list = document.createElement('div');
    list.classList.add('autocomplete-items');
    this.parentNode.appendChild(list);
    
    filtered.forEach(item => {
      const div = document.createElement('div');
      div.textContent = item[field];
      div.onclick = () => {
        input.value = item[field];
        if (typeof onSelect === 'function') onSelect(item[idField]);
        closeAutocompleteLists();
      };
      list.appendChild(div);
    });
  });
  
  document.addEventListener('click', closeAutocompleteLists);
  
  function closeAutocompleteLists() {
    document.querySelectorAll('.autocomplete-items').forEach(i => i.remove());
  }
}

// =================== UTILITÁRIOS ===================
function showLoadingState(tabelaId, colunas) {
  const tbody = document.getElementById(tabelaId);
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="${colunas}" class="text-center">Carregando...</td></tr>`;
  }
}

// =================== FILTROS DE TABELA ===================
function filtrarTabela(event) {
  const filtro = event.target.value.toLowerCase();
  const tabelaId = event.target.id.replace('filtro-tabela-', 'tabela-');
  const tbody = document.getElementById(tabelaId);
  
  if (!tbody) return;
  
  const linhas = tbody.querySelectorAll('tr');
  linhas.forEach(linha => {
    const texto = linha.textContent.toLowerCase();
    linha.style.display = texto.includes(filtro) ? '' : 'none';
  });
}


// =================== EVENT LISTENERS ===================
// Carregamento de profissionais baseado no serviço selecionado
if (servicoSelectAgendamento) {
  servicoSelectAgendamento.addEventListener('change', async function () {
    const idServico = this.value;
    const selectProfissional = document.getElementById('profissional-select-agendamento');
    
    if (!selectProfissional) return;
    
    selectProfissional.innerHTML = '<option>Carregando...</option>';

    if (!idServico) {
      selectProfissional.innerHTML = '<option value="">-- Selecione um Serviço Primeiro --</option>';
      return;
    }

    try {
      const profissionais = await fetchData(`/servicos/${idServico}/profissionais`);
      selectProfissional.innerHTML = '<option value="">-- Selecione um Profissional --</option>';
      profissionais.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nome;
        selectProfissional.appendChild(opt);
      });
      
      if (profissionais.length === 0) {
        selectProfissional.innerHTML = '<option value="">Nenhum profissional disponível para este serviço</option>';
      }
    } catch (err) {
      console.error("Erro ao carregar profissionais:", err);
      selectProfissional.innerHTML = '<option value="">Erro ao carregar profissionais</option>';
    }
  });
}

// Filtros do calendário
if (filtroServicoCalendario) {
  filtroServicoCalendario.addEventListener('change', function() {
    if (calendario) {
      filtrarEventosCalendario();
    }
  });
}

if (filtroProfissionalCalendario) {
  filtroProfissionalCalendario.addEventListener('change', function() {
    if (calendario) {
      filtrarEventosCalendario();
    }
  });
}

// =================== FILTROS DO CALENDÁRIO ===================
function filtrarEventosCalendario() {
  const servicoSelecionado = filtroServicoCalendario?.value;
  const profissionalSelecionado = filtroProfissionalCalendario?.value;
  
  let eventosFiltrados = [...todosAgendamentos];
  
  if (servicoSelecionado) {
    eventosFiltrados = eventosFiltrados.filter(a => a.servico_id == servicoSelecionado);
  }
  
  if (profissionalSelecionado) {
    eventosFiltrados = eventosFiltrados.filter(a => a.profissional_id == profissionalSelecionado);
  }
  
  const eventosFormatados = eventosFiltrados.map(a => ({
    id: a.id,
    title: `${a.cliente} - ${a.servico}`,
    start: a.data_horario,
    backgroundColor: getCorPorStatus(a.status),
    borderColor: getCorPorStatus(a.status),
    textColor: '#fff',
    extendedProps: {
      cliente: a.cliente,
      servico: a.servico,
      profissional: a.profissional,
      status: a.status
    }
  }));
  
  calendario.removeAllEvents();
  calendario.addEventSource(eventosFormatados);
}

// =================== FUNÇÕES DE CANCELAR EDIÇÃO ===================
function cancelarEdicaoCliente() {
  document.getElementById('form-cliente').reset();
  const editId = document.getElementById('edit-cliente-id');
  if (editId) editId.value = '';
  
  const btnCancelar = document.getElementById('btn-cancelar-edicao-cliente');
  if (btnCancelar) btnCancelar.style.display = 'none';
  
  const titulo = document.getElementById('titulo-form-cliente');
  if (titulo) titulo.innerHTML = '<i class="fas fa-user-plus"></i> Adicionar Novo Cliente';
  
  const btnSalvar = document.getElementById('btn-salvar-cliente');
  if (btnSalvar) btnSalvar.innerHTML = '<i class="fas fa-save"></i> Salvar Cliente';
  
  mostrarToast('Edição cancelada', 'info');
}

function cancelarEdicaoServico() {
  document.getElementById('form-servico').reset();
  const editId = document.getElementById('edit-servico-id');
  if (editId) editId.value = '';
  
  const btnCancelar = document.getElementById('btn-cancelar-edicao-servico');
  if (btnCancelar) btnCancelar.style.display = 'none';
  
  const titulo = document.getElementById('titulo-form-servico');
  if (titulo) titulo.innerHTML = '<i class="fas fa-plus-circle"></i> Adicionar Novo Serviço';
  
  const btnSalvar = document.getElementById('btn-salvar-servico');
  if (btnSalvar) btnSalvar.innerHTML = '<i class="fas fa-save"></i> Salvar';
  
  mostrarToast('Edição cancelada', 'info');
}

function cancelarEdicaoProfissional() {
  document.getElementById('form-profissional').reset();
  const editId = document.getElementById('edit-profissional-id');
  if (editId) editId.value = '';
  
  const btnCancelar = document.getElementById('btn-cancelar-edicao-profissional');
  if (btnCancelar) btnCancelar.style.display = 'none';
  
  const titulo = document.getElementById('titulo-form-profissional');
  if (titulo) titulo.innerHTML = '<i class="fas fa-user-plus"></i> Adicionar Novo Profissional';
  
  const btnSalvar = document.getElementById('btn-salvar-profissional');
  if (btnSalvar) btnSalvar.innerHTML = '<i class="fas fa-save"></i> Salvar';
  
  // Desmarcar todos os checkboxes
  document.querySelectorAll('#checkbox-servicos-container input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });
  
  mostrarToast('Edição cancelada', 'info');
}

// =================== VALIDAÇÕES DE FORMULÁRIO ===================
function validarFormularioCliente() {
  const nome = document.getElementById('nome-cliente').value.trim();
  const email = document.getElementById('email-cliente').value.trim();
  
  if (!nome) {
    mostrarToast('Nome é obrigatório', 'error');
    return false;
  }
  
  if (email && !validarEmail(email)) {
    mostrarToast('Email inválido', 'error');
    return false;
  }
  
  return true;
}

function validarFormularioServico() {
  const nome = document.getElementById('nome-servico').value.trim();
  const preco = parseFloat(document.getElementById('preco-servico').value);
  
  if (!nome) {
    mostrarToast('Nome do serviço é obrigatório', 'error');
    return false;
  }
  
  if (!preco || preco <= 0) {
    mostrarToast('Preço deve ser maior que zero', 'error');
    return false;
  }
  
  return true;
}

function validarFormularioProfissional() {
  const nome = document.getElementById('nome-profissional').value.trim();
  
  if (!nome) {
    mostrarToast('Nome do profissional é obrigatório', 'error');
    return false;
  }
  
  return true;
}

function validarFormularioAgendamento() {
  const clienteId = clienteIdHiddenInput?.value;
  const servicoId = servicoSelectAgendamento?.value;
  const profissionalId = document.getElementById('profissional-select-agendamento')?.value;
  const dataHorario = document.getElementById('data-horario')?.value;
  
  if (!clienteId) {
    mostrarToast('Selecione um cliente válido', 'error');
    return false;
  }
  
  if (!servicoId) {
    mostrarToast('Selecione um serviço', 'error');
    return false;
  }
  
  if (!profissionalId) {
    mostrarToast('Selecione um profissional', 'error');
    return false;
  }
  
  if (!dataHorario) {
    mostrarToast('Selecione data e horário', 'error');
    return false;
  }
  
  // Verificar se a data não é no passado
  const agora = new Date();
  const dataAgendamento = new Date(dataHorario);
  
  if (dataAgendamento <= agora) {
    mostrarToast('Data deve ser no futuro', 'error');
    return false;
  }
  
  return true;
}

function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// =================== FUNÇÕES DE FORMATAÇÃO ===================
function formatarTelefone(telefone) {
  if (!telefone) return '';
  
  // Remove tudo que não é número
  const numeros = telefone.replace(/\D/g, '');
  
  // Formata conforme o tamanho
  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  } else if (numeros.length === 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }
  
  return telefone;
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

function formatarData(data) {
  return new Date(data).toLocaleDateString('pt-BR');
}

function formatarDataHora(data) {
  return new Date(data).toLocaleString('pt-BR');
}

// =================== ESTATÍSTICAS E RELATÓRIOS ===================
async function carregarEstatisticas() {
  try {
    const stats = await fetchData('/estatisticas');
    atualizarDashboard(stats);
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}

function atualizarDashboard(stats) {
  // Atualizar cards de estatísticas se existirem
  const totalClientesEl = document.getElementById('total-clientes');
  const totalServicosEl = document.getElementById('total-servicos');
  const totalProfissionaisEl = document.getElementById('total-profissionais');
  const agendamentosHojeEl = document.getElementById('agendamentos-hoje');
  const faturamentoMesEl = document.getElementById('faturamento-mes');
  
  if (totalClientesEl) totalClientesEl.textContent = stats.total_clientes;
  if (totalServicosEl) totalServicosEl.textContent = stats.total_servicos;
  if (totalProfissionaisEl) totalProfissionaisEl.textContent = stats.total_profissionais;
  if (agendamentosHojeEl) agendamentosHojeEl.textContent = stats.agendamentos_hoje;
  if (faturamentoMesEl) faturamentoMesEl.textContent = `R$ ${stats.faturamento_mes}`;
}

// =================== FUNÇÕES DE BACKUP E IMPORTAÇÃO ===================
function exportarDados() {
  const dados = {
    clientes: todosClientes,
    servicos: todosServicos,
    profissionais: todosProfissionais,
    agendamentos: todosAgendamentos,
    data_exportacao: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_salao_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  mostrarToast('Dados exportados com sucesso!', 'success');
}

// =================== CONFIGURAÇÃO INICIAL ===================
function setupEventListeners() {
  // Formulários principais
  document.getElementById('form-cliente')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (validarFormularioCliente()) {
      await salvarCliente(e);
    }
  });
  
  document.getElementById('form-servico')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (validarFormularioServico()) {
      await salvarServico(e);
    }
  });
  
  document.getElementById('form-profissional')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (validarFormularioProfissional()) {
      await salvarProfissional(e);
    }
  });
  
  document.getElementById('form-agendamento')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (validarFormularioAgendamento()) {
      await salvarAgendamento(e);
    }
  });
  
  // Botões de cancelar edição
  document.getElementById('btn-cancelar-edicao-cliente')?.addEventListener('click', cancelarEdicaoCliente);
  document.getElementById('btn-cancelar-edicao-servico')?.addEventListener('click', cancelarEdicaoServico);
  document.getElementById('btn-cancelar-edicao-profissional')?.addEventListener('click', cancelarEdicaoProfissional);
  
  // Filtros de busca nas tabelas
  document.getElementById('filtro-tabela-clientes')?.addEventListener('input', filtrarTabela);
  document.getElementById('filtro-tabela-servicos')?.addEventListener('input', filtrarTabela);
  document.getElementById('filtro-tabela-profissionais')?.addEventListener('input', filtrarTabela);
  document.getElementById('filtro-tabela-agendamentos')?.addEventListener('input', filtrarTabela);
  
  // Formatação automática de telefone
  document.getElementById('telefone-cliente')?.addEventListener('input', function() {
    this.value = formatarTelefone(this.value);
  });
  
  // Definir data mínima para agendamentos (agora + 30 minutos)
  const dataHorarioInput = document.getElementById('data-horario');
  if (dataHorarioInput) {
    const agora = new Date();
    agora.setMinutes(agora.getMinutes() + 30); // 30 minutos de antecedência mínima
    const dataMinima = agora.toISOString().slice(0, 16);
    dataHorarioInput.min = dataMinima;
  }
  
  // Atualizar estatísticas periodicamente
  setInterval(carregarEstatisticas, 300000); // A cada 5 minutos
}

// =================== INICIALIZAÇÃO PRINCIPAL ===================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando Studio Agenda...');
  
  try {
    // Mostrar loading inicial
    mostrarToast('Carregando sistema...', 'info');
    
    // Carregar todos os dados em paralelo
    await Promise.all([
      carregarTodosClientes(),
      carregarTodosServicos(),
      carregarTodosProfissionais()
    ]);
    
    // Configurar event listeners
    setupEventListeners();
    
    // Carregar estatísticas
    await carregarEstatisticas();
    
    console.log('✅ Sistema carregado com sucesso!');
    console.log(`📊 Dados carregados: ${todosClientes.length} clientes, ${todosServicos.length} serviços, ${todosProfissionais.length} profissionais`);
    
    mostrarToast('Sistema carregado com sucesso! 🎉', 'success');
  } catch (error) {
    console.error('❌ Erro ao carregar aplicação:', error);
    mostrarToast('Erro ao carregar aplicação. Verifique se o servidor está rodando.', 'error');
  }
});

// =================== FUNÇÕES GLOBAIS ===================
// Disponibilizar funções no escopo global para uso no HTML
window.openTab = openTab;
window.editarCliente = editarCliente;
window.deletarCliente = deletarCliente;
window.editarServico = editarServico;
window.deletarServico = deletarServico;
window.editarProfissional = editarProfissional;
window.deletarProfissional = deletarProfissional;
window.editarAgendamento = editarAgendamento;
window.deletarAgendamento = deletarAgendamento;
window.exportarDados = exportarDados;

// =================== TRATAMENTO DE ERROS GLOBAIS ===================
window.addEventListener('error', function(event) {
  console.error('Erro JavaScript:', event.error);
  mostrarToast('Ocorreu um erro inesperado. Verifique o console para mais detalhes.', 'error');
});

window.addEventListener('unhandledrejection', function(event) {
  console.error('Promise rejeitada:', event.reason);
  mostrarToast('Erro de comunicação com o servidor.', 'error');
});

// =================== SERVICE WORKER (OPCIONAL) ===================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js')
      .then(function(registration) {
        console.log('Service Worker registrado com sucesso:', registration.scope);
      })
      .catch(function(error) {
        console.log('Falha ao registrar Service Worker:', error);
      });
  });
}

console.log('📋 Script Studio Agenda carregado completamente!');
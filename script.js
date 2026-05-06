// ==========================================
// 1. CONFIGURAÇÕES E FUNÇÕES GLOBAIS
// ==========================================
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : 'http://api.ejunicap.com.br';

function decodificarJWT(token) {
    try {
        const payloadBase64 = token.split('.')[1];
        const jsonString = atob(payloadBase64);
        return JSON.parse(jsonString);
    } catch (e) {
        return null; 
    }
}

async function entrarNoSistema() {
    const login = document.getElementById('login-container');
    const dash = document.getElementById('main-dashboard');

    try {
        const res = await fetchSeguro('/auth/me');
        if (!res.ok) throw new Error("Sessão expirada ou token revogado.");
        
        const userData = await res.json();

        const token = localStorage.getItem('token_ej');
        const payload = decodificarJWT(token);
        const userRoleReal = userData.role || (payload ? payload.role : 'CONSULTANT');

        localStorage.setItem('userId', userData.id);
        localStorage.setItem('userRole', userRoleReal);

        if (login) login.style.display = 'none';
        if (dash) dash.style.display = 'flex';

        const menuAdmin = document.getElementById('menu-admin');
        if (menuAdmin) {
            if (userRoleReal === 'ADMIN' || userRoleReal === 'MANAGER' || userRoleReal === 'PC') {
                menuAdmin.style.display = 'block';
            } else {
                menuAdmin.style.display = 'none';
            }
        }
    } catch (err) {
        localStorage.removeItem('token_ej');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        exibirLogin();
    }
}

function exibirLogin() {
    const login = document.getElementById('login-container');
    const dash = document.getElementById('main-dashboard');
    if (login) login.style.display = 'flex';
    if (dash) dash.style.display = 'none';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

async function fetchSeguro(endpoint, opcoes = {}) {
    const token = localStorage.getItem('token_ej');
    const headers = {
        ...opcoes.headers,
        'Authorization': `Bearer ${token}`
    };
    if (!(opcoes.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    return fetch(`${API_BASE_URL}${endpoint}`, { ...opcoes, headers });
}

function addContactField() {
    const container = document.getElementById('contacts-container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'contact-row';
    div.innerHTML = `
        <input type="text" class="dark-input contact-name" placeholder="Nome" required>
        <input type="text" class="dark-input contact-phone" placeholder="Telefone">
        <input type="text" class="dark-input contact-cargo" placeholder="Cargo">
        <button type="button" class="btn-icon-danger" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(div);
}

// ==========================================
// 2. FUNÇÕES DE BUSCA DE DADOS (GET)
// ==========================================

async function carregarVisaoIndividual() {
    const tbody = document.getElementById('minhas-tarefas-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center dim">Sincronizando seus dados...</td></tr>';

    try {
        const res = await fetchSeguro('/auth/me'); 
        if (!res.ok) throw new Error("Sessão inválida ou acesso negado.");
        const usuario = await res.json();

        const avatarBox = document.querySelector('.avatar-mini');
        if (avatarBox && usuario.nome) {
            avatarBox.innerText = usuario.nome.substring(0, 2).toUpperCase();
            avatarBox.title = usuario.email;
        }
        const tituloH1 = document.querySelector('#sec-individual h1');
        if (tituloH1 && usuario.nome) tituloH1.innerText = `Olá, ${usuario.nome.split(' ')[0]}`;

        const listaTarefas = usuario.tarefas || usuario.tasks || [];

        if (listaTarefas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center dim">Nenhuma tarefa atribuída a você no momento.</td></tr>';
        } else {
            tbody.innerHTML = listaTarefas.map(t => {
                // Caça o nome do projeto (depende de como o Back-end serializou)
                const nomeDoProjeto = t.projeto_nome || (t.project ? t.project.title : 'Projeto Interno');
                // Caça o título da tarefa
                const tituloDaTarefa = t.title || t.nome || 'Tarefa sem título';
                // Formata o status
                const statusDaTarefa = typeof t.status === 'object' ? t.status.value : (t.status || 'Pendente');

                return `
                <tr>
                    <td><strong>${tituloDaTarefa}</strong></td>
                    <td class="dim">${nomeDoProjeto}</td>
                    <td><span class="status-badge status-${statusDaTarefa.toLowerCase()}">${statusDaTarefa}</span></td>
                    <td>
                        ${statusDaTarefa !== 'CONCLUIDO' && statusDaTarefa !== 'COMPLETED' ? 
                        `<button class="btn-outline-sm" onclick="concluirTarefa(${t.id})" style="width: auto;" title="Concluir"><i class="ph ph-check"></i></button>` 
                        : '<span class="dim small"><i class="ph ph-check-circle" style="color: var(--success)"></i></span>'
                        }
                    </td>
                </tr>
                `;
            }).join('');
        }

        try {
            const resFlags = await fetchSeguro('/users/me/flags');
            if (resFlags.ok) {
                const flags = await resFlags.json();
                const flagsCard = document.getElementById('my-flags-card');
                const flagsContainer = document.getElementById('my-flags-container');
        
                if (flags.length > 0 && flagsCard && flagsContainer) {
                    flagsCard.style.display = 'block';
                    flagsContainer.innerHTML = flags.map(f => {
                    const isFormal = f.severity === 'FORMAL';
                    const cor = isFormal ? 'var(--danger)' : 'var(--warning)';
                    return `
                        <div style="background: rgba(0,0,0,0.2); padding: 12px; border-left: 3px solid ${cor}; border-radius: 4px; margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <strong style="color: ${cor}; font-size: 13px;">${f.severity}</strong>
                            <span class="dim small">${new Date(f.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p style="font-size: 14px; margin: 0;">${f.reason}</p>
                        </div>
                    `;
                }).join('');
                } else if (flagsCard) {
                flagsCard.style.display = 'none'; // Esconde se for um membro comportado
            }
            }
        } catch (e) {
            console.error("Erro ao carregar bandeiras pessoais:", e);
        }   

        const horasFeitas = parseFloat(usuario.horas_semanais) || 0;
        const meta = 20; 
        const porcentagem = Math.min((horasFeitas / meta) * 100, 100);
        
        const textoHoras = document.getElementById('horas-feitas-text');
        const barraPonto = document.getElementById('ponto-progress-bar');
        
        if (textoHoras) textoHoras.innerText = `${horasFeitas}h / ${meta}h`;
        if (barraPonto) barraPonto.style.width = `${porcentagem}%`;

        // Verifica turno real se a API estiver online
        const resResumo = await fetchSeguro('/clockins/summary');
        if (resResumo.ok) {
            const resumo = await resResumo.json();
            const turnoContainer = document.getElementById('turno-container');
            
            if (resumo.is_working && resumo.current_start_time) {
                window.turnoStartTime = new Date(resumo.current_start_time);
                if (turnoContainer) turnoContainer.style.display = 'block';
            } else {
                window.turnoStartTime = null;
                if (turnoContainer) turnoContainer.style.display = 'none';
            }
        }

    } catch (err) { 
        tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--danger)">${err.message}</td></tr>`; 
    }
}

window.concluirTarefa = async function(taskId) {
    if (!confirm("Deseja realmente marcar esta tarefa como concluída?")) return;

    try {
        const res = await fetchSeguro(`/tasks/${taskId}/complete`, {
            method: 'PATCH'
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || "Erro ao tentar concluir a tarefa.");
        }

        // Recarrega a tabela para atualizar a UI imediatamente
        carregarVisaoIndividual();

    } catch (err) {
        alert("Falha: " + err.message);
    }
};

async function carregarLeads() {
    const listBody = document.getElementById('leads-list-body');
    if (!listBody) return;
    listBody.innerHTML = '<tr><td colspan="5" class="text-center dim">Buscando organizações...</td></tr>';
    try {
        const response = await fetchSeguro('/organizations/leads');
        if (!response.ok) throw new Error("Acesso negado (401/403)");
        const leads = await response.json();
        if (leads.length === 0) return listBody.innerHTML = '<tr><td colspan="5" class="text-center dim">Nenhum lead encontrado.</td></tr>';
        
        listBody.innerHTML = leads.map(lead => `
            <tr>
                <td><strong>${lead.name}</strong></td>
                <td>${lead.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")}</td>
                <td><span class="status-badge status-${lead.status.toLowerCase()}">${lead.status}</span></td>
                <td>${lead.contacts ? lead.contacts.length : 0}</td>
                <td><button class="btn-icon"><i class="ph ph-eye"></i></button></td>
            </tr>
        `).join('');
    } catch (error) { listBody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--danger)">${error.message}</td></tr>`; }
}

async function carregarProjetosAcompanhamento() {
    const listBody = document.getElementById('projetos-list-body');
    if (!listBody) return;
    listBody.innerHTML = '<tr><td colspan="4" class="text-center dim">Buscando projetos...</td></tr>';
    try {
        const res = await fetchSeguro('/projects/');
        if (!res.ok) throw new Error("Erro ao buscar projetos");
        const projetos = await res.json();
        
        if (projetos.length === 0) return listBody.innerHTML = '<tr><td colspan="4" class="text-center dim">Nenhum projeto ativo.</td></tr>';
        
        // CORREÇÃO: Estrutura da tabela recuperada com sucesso
        listBody.innerHTML = projetos.map(p => `
            <tr>
                <td><strong>${p.title || p.name || 'Projeto sem nome'}</strong></td>
                <td class="dim">${(p.description || '').substring(0, 50)}...</td>
                <td><span class="status-badge status-${(p.status||'planejamento').toLowerCase()}">${p.status || 'Planejamento'}</span></td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-outline-sm" title="Editar Projeto" onclick="prepararEdicaoProjeto(${p.id})" style="width: auto; font-size: 12px;">
                            <i class="ph ph-pencil"></i> Editar
                        </button>
                        <button class="btn-outline-sm" title="Ir para Diagnóstico Matemático" onclick="abrirDiagnosticoDoProjeto(${p.id})" style="width: auto; font-size: 12px;">
                            <i class="ph ph-math-operations"></i> Diagnóstico
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) { listBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--danger)">${err.message}</td></tr>`; }
}

async function carregarLeadsParaPrecificacao() {
    const selector = document.getElementById('preco-lead');
    if (!selector) return;
    
    selector.innerHTML = '<option value="">Buscando organizações do banco...</option>';
    
    try {
        const res = await fetchSeguro('/organizations/leads');
        if (!res.ok) throw new Error("Erro na comunicação com a API");
        
        const leads = await res.json();
        
        if (leads.length === 0) {
            selector.innerHTML = '<option value="" disabled selected>Nenhum lead/cliente encontrado.</option>';
            return;
        }
        
        selector.innerHTML = '<option value="" disabled selected>-- Selecione o Lead/Cliente --</option>' + 
            leads.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
            
    } catch (err) { 
        selector.innerHTML = '<option value="" disabled>Erro ao carregar organizações</option>'; 
    }
}

async function carregarComplianceAdmin() {
    const tbodyFlags = document.getElementById('tabela-todas-flags-body');
    if (!tbodyFlags) return;
    
    try {
        const res = await fetchSeguro('/users/all'); 
        if (!res.ok) throw new Error("Acesso negado.");
        const flags = await res.json();
        
        if (flags.length === 0) {
            tbodyFlags.innerHTML = '<tr><td colspan="3" class="text-center dim">Nenhuma punição registrada na EJ.</td></tr>';
            return;
        }

        tbodyFlags.innerHTML = flags.map(f => {
            const nomeMembro = f.user ? f.user.name || f.user.nome : `ID: ${f.user_id}`;
            const isFormal = f.severity === 'FORMAL';
            const statusClass = isFormal ? 'status-rejected' : 'status-pending';
            
            return `
                <tr title="Motivo: ${f.reason}">
                    <td><strong>${nomeMembro}</strong></td>
                    <td><span class="status-badge ${statusClass}">${f.severity}</span></td>
                    <td class="dim small">${new Date(f.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                        <button class="btn-icon-danger" onclick="revogarBandeira(${f.id})" title="Revogar Punição">
                            <i class="ph ph-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (err) {
        tbodyFlags.innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--danger)">Erro: ${err.message}</td></tr>`;
    }
}

async function carregarTodasFaltasAdmin() {
    const tbodyFaltas = document.getElementById('tabela-todas-faltas-body');
    if (!tbodyFaltas) return;

    try {
        const res = await fetchSeguro('/absences/all'); // A rota global que acabamos de fazer
        if (!res.ok) throw new Error("Acesso negado.");
        const faltas = await res.json();
        
        if (faltas.length === 0) {
            tbodyFaltas.innerHTML = '<tr><td colspan="4" class="text-center dim">Nenhuma ausência reportada na empresa.</td></tr>';
            return;
        }

        tbodyFaltas.innerHTML = faltas.map(f => {
            const nomeMembro = f.user ? (f.user.name || f.user.nome) : `ID: ${f.user_id}`;
            const dataCorrigida = new Date(f.absence_date + 'T12:00:00').toLocaleDateString('pt-BR');
            const statusClass = f.status === 'APROVADA' ? 'status-approved' : 
                               (f.status === 'REJEITADA' ? 'status-rejected' : 'status-pending');
            
            return `
                <tr title="Motivo: ${f.reason}">
                    <td><strong>${nomeMembro}</strong></td>
                    <td class="dim small">${dataCorrigida}</td>
                    <td class="dim">${f.reason.substring(0, 30)}...</td>
                    <td><span class="status-badge ${statusClass}">${f.status}</span></td>
                </tr>
            `;
        }).join('');
        
    } catch (err) {
        tbodyFaltas.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--danger)">Erro: ${err.message}</td></tr>`;
    }
}

async function carregarFaltas() {
    const tbody = document.getElementById('tabela-faltas-body');
    if (!tbody) return;
    
    try {
        const res = await fetchSeguro('/absences/');
        if (!res.ok) throw new Error("Falha ao buscar o histórico.");
        const faltas = await res.json();
        
        if (faltas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center dim">Nenhum registro de falta no histórico.</td></tr>';
            return;
        }

        tbody.innerHTML = faltas.map(f => {
            // Corrige o fuso horário para a data não voltar 1 dia
            const dataCorrigida = new Date(f.absence_date + 'T12:00:00').toLocaleDateString('pt-BR');
            return `
                <tr>
                    <td><strong>${dataCorrigida}</strong></td>
                    <td class="dim">${f.reason}</td>
                    <td><span class="status-badge status-${f.status.toLowerCase()}">${f.status}</span></td>
                </tr>
            `;
        }).join('');
        
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--danger)">Erro: ${err.message}</td></tr>`;
    }
}

window.prepararNovoProjeto = async function() {
    // CORREÇÃO: Limpeza rigorosa do modal contra vazamento de estado
    document.getElementById('projeto-form').reset();
    document.getElementById('proj-edit-id').value = "";
    document.querySelector('#modal-projeto .modal-header h3').innerText = "Criar Novo Projeto";
    document.querySelector('#projeto-form button[type="submit"]').innerText = "Salvar Projeto";
    
    if (document.querySelectorAll('.member-checkbox').length === 0) {
        await carregarCheckboxesDeMembros();
    } else {
        document.querySelectorAll('.member-checkbox').forEach(cb => cb.checked = false);
    }

    const delegationSection = document.getElementById('task-delegation-section');
    if (delegationSection) delegationSection.style.display = 'none';
    openModal('modal-projeto');
};

window.delegarTarefa = async function() {
    const projectId = document.getElementById('proj-edit-id').value;
    const taskTitle = document.getElementById('new-task-title').value.trim();
    const assigneeId = document.getElementById('new-task-assignee').value;
    const feedback = document.getElementById('task-delegation-feedback');

    if (!projectId) return alert("Erro: O projeto precisa ser salvo antes de delegar tarefas.");
    if (!taskTitle) return alert("Digite o título da tarefa.");
    if (!assigneeId) return alert("Selecione um membro para executar a tarefa.");

    feedback.innerText = "Delegando...";
    feedback.style.color = "var(--text-dim)";

    try {
        const payload = {
            title: taskTitle,
            assigned_to_id: parseInt(assigneeId)
        };

        const res = await fetchSeguro(`/projects/${projectId}/tasks`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || "Erro ao delegar.");
        }

        feedback.innerText = "Tarefa delegada com sucesso!";
        feedback.style.color = "var(--success)";
        
        document.getElementById('new-task-title').value = "";
        

    } catch (err) {
        feedback.innerText = "Falha: " + err.message;
        feedback.style.color = "var(--danger)";
    }
};

window.prepararEdicaoProjeto = async function(id) {
    try {
        // 1. Garante que as checkboxes existam
        if (document.querySelectorAll('.member-checkbox').length === 0) {
            await carregarCheckboxesDeMembros();
        }

        const res = await fetchSeguro(`/projects/${id}`);
        if (!res.ok) throw new Error("Erro ao buscar dados do projeto.");
        const projeto = await res.json();
        
        document.getElementById('proj-edit-id').value = projeto.id;
        document.getElementById('proj-name').value = projeto.title || projeto.name;
        document.getElementById('proj-desc').value = projeto.description || '';
        document.getElementById('proj-status').value = projeto.status || 'Planejamento';
        document.getElementById('proj-client').value = projeto.organization_id || "";
        
        // 2. Limpa todas as caixinhas primeiro (Prevenção de State Leakage)
        document.querySelectorAll('.member-checkbox').forEach(cb => cb.checked = false);

        // 3. Marca quem já está na equipe (o backend deve retornar "members" dentro do projeto)
        if (projeto.members && Array.isArray(projeto.members)) {
            projeto.members.forEach(membro => {
                const cb = document.querySelector(`.member-checkbox[value="${membro.id}"]`);
                if (cb) cb.checked = true;
            });
        }

        const delegationSection = document.getElementById('task-delegation-section');
        const assigneeSelect = document.getElementById('new-task-assignee');
        
        if (delegationSection && assigneeSelect) {
            delegationSection.style.display = 'block'; // Mostra a seção
            assigneeSelect.innerHTML = '<option value="">Selecione...</option>'; // Reseta
            
            // Povoa o select apenas com quem já está na equipe
            if (projeto.members && Array.isArray(projeto.members)) {
                projeto.members.forEach(membro => {
                    assigneeSelect.innerHTML += `<option value="${membro.id}">${membro.name}</option>`;
                });
            }
        }
        
        document.querySelector('#modal-projeto .modal-header h3').innerText = "Editar Projeto";
        document.querySelector('#projeto-form button[type="submit"]').innerText = "Salvar Alterações";
        
        openModal('modal-projeto');
    } catch (err) {
        alert(err.message);
    }
};

async function carregarLeadsParaProjetos() {
    const selector = document.getElementById('proj-client');
    if (!selector) return;
    selector.innerHTML = '<option value="">Buscando clientes...</option>';
    try {
        const res = await fetchSeguro('/organizations/leads');
        if (!res.ok) throw new Error("Erro na comunicação");
        const leads = await res.json();
        if (leads.length === 0) return selector.innerHTML = '<option value=\"\" disabled selected>Nenhum cliente cadastrado.</option>';
        selector.innerHTML = '<option value=\"\" disabled selected>-- Selecione a Organização --</option>' + leads.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    } catch (err) { selector.innerHTML = '<option value=\"\" disabled>Erro ao carregar</option>'; }
}

window.abrirDiagnosticoDoProjeto = function(id) {
    document.querySelector('.nav-link[data-target="diagnostico"]')?.click();
    const selector = document.getElementById('diag-project-selector');
    if(selector) selector.value = id;
};

async function carregarProjetosParaDiagnostico() {
    const selector = document.getElementById('diag-project-selector');
    if (!selector) return;
    selector.innerHTML = '<option value="">Buscando projetos...</option>';
    try {
        const res = await fetchSeguro('/projects/'); 
        if (!res.ok) throw new Error("Erro ao buscar projetos");
        const projetos = await res.json();
        if (projetos.length === 0) return selector.innerHTML = '<option value="">Nenhum projeto cadastrado</option>';
        selector.innerHTML = '<option value="" disabled selected>-- Selecione um Projeto --</option>' + projetos.map(p => `<option value="${p.id}">${p.title || p.name || 'Projeto ID: ' + p.id}</option>`).join('');
    } catch (err) { selector.innerHTML = '<option value="">Falha de comunicação</option>'; }
}

async function carregarTabelaPonto() {
    try {
        const res = await fetchSeguro('/clockins/summary'); 
        if(!res.ok) throw new Error("Erro ao buscar resumo do ponto no servidor.");
        
        const dados = await res.json(); 

        const totalMinutos = dados.worked_minutes_this_week || 0;
        const horas = Math.floor(totalMinutos / 60);
        const minutosRestantes = totalMinutos % 60;

        const painelHoras = document.getElementById('ponto-total-horas');
        const painelMinutos = document.getElementById('ponto-total-minutos');
        
        if (painelHoras) painelHoras.innerText = `${horas}h ${minutosRestantes}m`;
        if (painelMinutos) painelMinutos.innerText = totalMinutos;

        const badgeStatus = document.getElementById('ponto-status-badge');
        const textStart = document.getElementById('ponto-start-text');

        if (badgeStatus) {
            if (dados.is_working) {
                badgeStatus.innerHTML = '<span style="color: var(--warning);"><i class="ph ph-clock"></i> TRABALHANDO AGORA</span>';
                badgeStatus.style.borderColor = 'var(--warning)';
            } else {
                badgeStatus.innerHTML = '<span class="dim"><i class="ph ph-coffee"></i> FORA DO EXPEDIENTE</span>';
                badgeStatus.style.borderColor = 'var(--border)';
            }
        }

        if (textStart) {
            if (dados.current_start_time) {
                const dataInicio = new Date(dados.current_start_time);
                textStart.innerText = `Turno iniciado às: ${dataInicio.toLocaleTimeString('pt-BR')}`;
            } else {
                textStart.innerText = "Nenhum turno em andamento.";
            }
        }

    } catch (e) { 
        console.error("Erro no Resumo de Ponto:", e);
        const painelHoras = document.getElementById('ponto-total-horas');
        if (painelHoras) painelHoras.innerHTML = `<span style="font-size: 20px; color: var(--danger);">${e.message}</span>`;
    }
}

async function carregarTabelaReembolsos() {
    const tbody = document.getElementById('reembolso-list-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center dim">Carregando reembolsos...</td></tr>';
    try {
        const res = await fetchSeguro('/reimbursements/');
        if(!res.ok) throw new Error("Erro");
        const dados = await res.json();
        if (dados.length === 0) return tbody.innerHTML = '<tr><td colspan="4" class="text-center dim">Nenhum reembolso registrado.</td></tr>';
        
        tbody.innerHTML = dados.map(item => `
            <tr>
                <td><div style="display: flex; flex-direction: column;"><strong>${item.title}</strong><span class="dim" style="font-size: 12px;">${new Date(item.date_time || item.created_at).toLocaleDateString('pt-BR')}</span></div></td>
                <td class="dim">${item.category || '-'}</td>
                <td>${parseFloat(item.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td><span class="status-badge status-${(item.status || 'pending').toLowerCase()}">${item.status || 'Pendente'}</span></td>
            </tr>
        `).join('');
    } catch (e) { tbody.innerHTML = `<tr><td colspan="4" class="text-center dim">Erro ao buscar dados.</td></tr>`; }
}

async function carregarDadosTime() {
    const listBody = document.getElementById('team-status-list');
    if (!listBody) return;
    listBody.innerHTML = '<tr><td colspan="3" class="text-center dim">Sincronizando time...</td></tr>';
    
    try {
        const res = await fetchSeguro('/users/workload');
        if (!res.ok) throw new Error("Falha na busca");
        const data = await res.json();
        const listaMembros = Array.isArray(data) ? data : (data.membros || []);
        
        if (listaMembros.length > 0) {
            const myToken = localStorage.getItem('token_ej');
            const myPayload = decodificarJWT(myToken);
            const isAdmin = myPayload && myPayload.role === 'ADMIN';

            listBody.innerHTML = listaMembros.map(m => {
                const usuarioLogado = m.user || m; 
                const nome = usuarioLogado.name || usuarioLogado.nome || 'Sem Nome';
                const iniciais = nome.substring(0, 2).toUpperCase();
                
                const projetosAtivos = m.active_projects_count || 0;
                const atividade = projetosAtivos > 0 ? `${projetosAtivos} Projeto(s) Ativo(s)` : 'Livre / Disponível';
                const statusColor = projetosAtivos > 0 ? 'status-ativo' : 'status-away';
                const statusLabel = projetosAtivos > 0 ? 'ALOCADO' : 'LIVRE';

                return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="avatar-mini">${iniciais}</div>
                            ${nome}
                            ${isAdmin ? `<button class="btn-icon-danger" style="padding: 4px; border-radius: 4px; margin-left: auto;" onclick="abrirModalFlag(${usuarioLogado.id}, '${nome}')" title="Aplicar Bandeira"><i class="ph ph-flag"></i></button>` : ''}
                        </div>
                    </td>
                    <td class="dim">${atividade}</td>
                    <td><span class="status-badge ${statusColor}">${statusLabel}</span></td>
                </tr>
                `;
            }).join('');
        } else {
            listBody.innerHTML = '<tr><td colspan="3" class="text-center dim">Nenhum membro ativo retornado.</td></tr>';
        }

        if (listaMembros.length > 0) {
            const myToken = localStorage.getItem('token_ej');
            const myPayload = decodificarJWT(myToken);
            const isAdmin = myPayload && myPayload.role === 'ADMIN';
            listBody.innerHTML = listaMembros.map(m => {
                const usuarioLogado = m.user || m; 
                const nome = usuarioLogado.name || usuarioLogado.nome || 'Sem Nome';
                const iniciais = nome.substring(0, 2).toUpperCase();
                
                const projetosAtivos = m.active_projects_count || 0;
                const atividade = projetosAtivos > 0 ? `${projetosAtivos} Projeto(s) Ativo(s)` : 'Livre / Disponível';
                const statusColor = projetosAtivos > 0 ? 'status-ativo' : 'status-away';
                const statusLabel = projetosAtivos > 0 ? 'ALOCADO' : 'LIVRE';

                return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="avatar-mini">${iniciais}</div>
                            ${nome}
                            ${isAdmin ? `
                                <div style="display: flex; gap: 5px; margin-left: auto;">
                                    <button class="btn-outline-sm" style="padding: 4px; border-radius: 4px;" onclick="abrirModalDelegacaoRapida(${usuarioLogado.id}, '${nome}')" title="Atribuição Rápida">
                                        <i class="ph ph-clipboard-text"></i>
                                    </button>
                                    <button class="btn-icon-danger" style="padding: 4px; border-radius: 4px;" onclick="abrirModalFlag(${usuarioLogado.id}, '${nome}')" title="Aplicar Bandeira">
                                        <i class="ph ph-flag"></i>
                                    </button>
                                </div>` : ''
                            }
                        </div>
                    </td>
                    <td class="dim">${atividade}</td>
                    <td><span class="status-badge ${statusColor}">${statusLabel}</span></td>
                </tr>
                `;
            }).join('');
            const totalMembros = listaMembros.length;
            const membrosAlocados = listaMembros.filter(m => (m.active_projects_count || 0) > 0).length;
            const porcentagemGeral = Math.round((membrosAlocados / totalMembros) * 100);

            const chart = document.getElementById('team-occupancy-chart');
            const percentDisplay = document.getElementById('occupancy-percent');
            
            if (chart && percentDisplay) {
                let corGrafico = 'var(--success)';
                if (porcentagemGeral >= 50) corGrafico = 'var(--warning)';
                if (porcentagemGeral >= 80) corGrafico = 'var(--danger)';

                chart.style.background = `conic-gradient(${corGrafico} ${porcentagemGeral}%, var(--bg-card) 0deg)`;
                percentDisplay.innerText = `${porcentagemGeral}%`;
            }

        } else {
            listBody.innerHTML = '<tr><td colspan="3" class="text-center dim">Nenhum membro ativo retornado.</td></tr>';
            const chart = document.getElementById('team-occupancy-chart');
            if (chart) {
                chart.style.background = `conic-gradient(var(--primary) 0%, var(--bg-card) 0deg)`;
                document.getElementById('occupancy-percent').innerText = `0%`;
            }
        }

    } catch (e) { 
        listBody.innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--danger)">Erro de Processamento: ${e.message}</td></tr>`; 
    }
}

async function carregarUsuariosAdmin() {
    const tbody = document.getElementById('usuarios-list-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center dim">Sincronizando banco de dados...</td></tr>';

    try {
        const res = await fetchSeguro('/users/');
        if (!res.ok) throw new Error("Acesso negado ou erro no servidor.");
        const usuarios = await res.json();

        if (usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center dim">Nenhum membro encontrado.</td></tr>';
            return;
        }

        const roleMap = {
            'ADMIN': 'Administrador',
            'MANAGER': 'Gerente / Coordenador',
            'PC': 'People & Culture',
            'CONSULTANT': 'Consultor'
        };

        const currentUserId = parseInt(localStorage.getItem('userId')) || 0; 

        tbody.innerHTML = usuarios.map(u => {
            const badgeLabel = roleMap[u.role] || u.role;
            const nomeFormatado = u.name || u.nome || 'Sem Nome';
            
            // O BOTÃO DA PASSAGEM DE BASTÃO NASCE AQUI
            const btnPassarBastao = (u.id === currentUserId) 
                ? '' 
                : `<button class="btn-outline-sm" onclick="abrirModalCargo(${u.id}, '${nomeFormatado}', '${u.role}')" title="Alterar Nível de Acesso" style="padding: 6px; margin-right: 5px;"><i class="ph ph-swap"></i> Cargo</button>`;

            const deleteButton = (u.id === currentUserId) 
                ? `<span class="dim small" style="margin-top: 5px;">Você</span>` 
                : `<button class="btn-icon-danger" onclick="deletarUsuario(${u.id}, '${u.email}')" title="Revogar Acesso"><i class="ph ph-trash"></i></button>`;

            return `
            <tr>
                <td><strong>${nomeFormatado}</strong></td>
                <td class="dim">${u.email}</td>
                <td><span class="badge" style="border-color: var(--primary); color: var(--primary);">${badgeLabel}</span></td>
                <td><span class="status-badge status-ativo">ATIVO</span></td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        ${btnPassarBastao}
                        ${deleteButton}
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--danger)">Erro: ${err.message}</td></tr>`;
    }
}

    window.prepararNovoUsuario = function() {
        document.getElementById('usuario-form').reset();
        document.getElementById('user-edit-id').value = "";
        
        // Exige senha na criação
        document.getElementById('user-password-input').required = true;
        document.getElementById('user-password-group').style.display = 'flex';
        
        document.getElementById('modal-usuario-title').innerText = "Cadastrar Novo Membro";
        openModal('modal-usuario');
    };

    window.deletarUsuario = async function(userId, userEmail) {
        if (!confirm(`TOLERÂNCIA ZERO: Você está prestes a DELETAR a conta de ${userEmail}. Isso pode corromper tarefas vinculadas a ele. Confirma a exclusão física?`)) {
            return;
        }

        try {
            const res = await fetchSeguro(`/users/${userId}`, { method: 'DELETE' });
            if (!res.ok) {
                const erro = await res.json();
                throw new Error(erro.detail || "Erro ao deletar o usuário no banco.");
            }
            alert("Membro ejetado do sistema com sucesso.");
            carregarUsuariosAdmin();
        } catch (err) {
            alert("Falha Crítica: " + err.message);
        }
    };

    // Listener do Formulário de Criação
    document.getElementById('usuario-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.innerText = "Provisionando..."; 
        btnSubmit.disabled = true;

        const payload = {
            name: document.getElementById('user-name').value.trim(),
            email: document.getElementById('user-email-input').value.trim(),
            password: document.getElementById('user-password-input').value,
            role: document.getElementById('user-role').value
        };

        try {
            const res = await fetchSeguro('/users/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                // Tratamento específico para o Array de Erros 422 do FastAPI
                let erroMsg = "Falha de validação.";
                if (errorData.detail && Array.isArray(errorData.detail)) {
                    erroMsg = errorData.detail.map(err => `${err.loc.join('->')}: ${err.msg}`).join('\n');
                } else if (errorData.detail) {
                    erroMsg = errorData.detail;
                }
                throw new Error(erroMsg);
            }

            alert("Credencial criada com sucesso! O membro já pode fazer login.");
            closeModal('modal-usuario');
            carregarUsuariosAdmin();

        } catch (err) {
            alert("Erro de API: \n" + err.message);
        } finally {
            btnSubmit.innerText = "Salvar Membro";
            btnSubmit.disabled = false;
        }
    });

async function carregarCheckboxesDeMembros() {
    const container = document.getElementById('proj-members-list');
    if (!container) return;
    try {
        const res = await fetchSeguro('/users/workload');
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        // Blindagem: Aceita o formato com "membros" ou a Array direta do UserService
        const listaMembros = data.membros || (Array.isArray(data) ? data : []);
        
        container.innerHTML = listaMembros.map(item => {
            // Blindagem: Se vier do UserService, o dado real está dentro da chave "user"
            const membro = item.user ? item.user : item;
            
            return `
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 4px;">
                <input type="checkbox" class="member-checkbox" value="${membro.id}">
                <span style="color: white; font-size: 14px;">${membro.name || membro.nome || 'Sem Nome'}</span>
            </label>
        `}).join('');
    } catch (e) {
        container.innerHTML = '<span style="color: var(--danger)">Falha ao carregar a lista de membros.</span>';
    }
}

// ==========================================
// 3. INICIALIZAÇÃO E EVENT LISTENERS DO DOM
// ==========================================

window.abrirModalFlag = function(userId, userName) {
    document.getElementById('flag-target-id').value = userId;
    document.getElementById('flag-target-name').innerText = userName;
    openModal('modal-flag');
};

document.getElementById('flag-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.innerText = "Registrando..."; btnSubmit.disabled = true;

    const targetId = document.getElementById('flag-target-id').value;
    const payload = {
        severity: document.getElementById('flag-severity').value,
        reason: document.getElementById('flag-reason').value
    };

    try {
        const res = await fetchSeguro(`/users/${targetId}/flags`, { method: 'POST', body: JSON.stringify(payload) });
        if (!res.ok) throw new Error((await res.json()).detail || "Erro de permissão.");
        alert("Bandeira aplicada e registrada no histórico corporativo.");
        closeModal('modal-flag'); 
        e.target.reset();
    } catch (err) { alert("Falha: " + err.message); } 
    finally { btnSubmit.innerText = "Registrar Punição"; btnSubmit.disabled = false; }
});

document.addEventListener('DOMContentLoaded', () => {
    
    const token = localStorage.getItem('token_ej');
    if (token) entrarNoSistema(); else exibirLogin();

    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-entrar');
            const errorMsg = document.getElementById('login-error');
            const emailDigitado = document.getElementById('user-email').value;
            const senhaDigitada = document.getElementById('user-pass').value;

            btn.innerText = "Autenticando..."; 
            btn.disabled = true;
            if(errorMsg) errorMsg.style.display = 'none';

            const corpo = new URLSearchParams();
            corpo.append('username', emailDigitado);
            corpo.append('password', senhaDigitada);

            try {
                const res = await fetch(`${API_BASE_URL}/auth/login`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
                    body: corpo
                });
                
                const dados = await res.json();
                
                if (res.ok && dados.access_token) {
                    localStorage.setItem('token_ej', dados.access_token);
                    await entrarNoSistema();
                } else {
                    if(errorMsg) errorMsg.style.display = 'block';
                }
            } catch (err) {
                console.error("FALHA CRÍTICA DE REDE:", err);
                alert("Erro de comunicação com o servidor: " + err.message);
            } finally {
                btn.innerText = "Acessar Sistema"; 
                btn.disabled = false; 
            }
        });
    }

    // ==========================================
    // SISTEMA DE TROCA DE TEMA (DARK / LIGHT)
    // ==========================================
    const themeBtn = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme_ej') || 'dark';

    // Aplica o tema salvo assim que a página carrega
    if (savedTheme === 'light') {
        document.body.setAttribute('data-theme', 'light');
        if (themeBtn) themeBtn.innerHTML = '<i class="ph ph-moon"></i> Modo Escuro';
    }

    // Motor do botão
    themeBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        const isLight = document.body.getAttribute('data-theme') === 'light';

        if (isLight) {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme_ej', 'dark');
            themeBtn.innerHTML = '<i class="ph ph-sun"></i> Modo Claro';
        } else {
            document.body.setAttribute('data-theme', 'light');
            localStorage.setItem('theme_ej', 'light');
            themeBtn.innerHTML = '<i class="ph ph-moon"></i> Modo Escuro';
        }
    });

    function extrairInsumosDaTabela(tableId) {
        const insumos = [];
        document.querySelectorAll(`#${tableId} tr`).forEach(row => {
            const inputs = row.querySelectorAll('input');
            const nome = inputs[0].value.trim();
            const qtd = parseFloat(inputs[1].value) || 0;
            const valor = parseFloat(inputs[2].value) || 0;
            
            if (nome && qtd > 0) {
                insumos.push({ title: nome, quantity: qtd, unit_value: valor });
            }
        });
        return insumos;
    }

    document.querySelectorAll('.add-cost-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tableId = btn.getAttribute('data-table');
            const tbody = document.getElementById(tableId);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="dark-input" placeholder="Ex: Consultor Sênior"></td>
                <td><input type="number" class="dark-input sm" placeholder="0" step="0.5" style="width: 80px;"></td>
                <td><input type="number" class="dark-input sm" placeholder="0.00" step="0.01" style="width: 100px;"></td>
                <td><button type="button" class="btn-icon-danger" onclick="this.parentElement.parentElement.remove()"><i class="ph ph-trash"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    });

    document.getElementById('btn-pdf-orcamento')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    const leadId = document.getElementById('preco-lead').value;

    if (!leadId) {
        return alert("Erro: Selecione a organização/lead no menu superior antes de gerar a proposta comercial.");
    }

    btn.innerHTML = '<i class="ph ph-spinner-gap"></i>';
    btn.disabled = true;

    // Reconstrói o payload exatamente como na simulação
    const rateio = parseFloat(document.getElementById('preco-rateio').value) || 0;
    const margemDecimal = (parseFloat(document.getElementById('preco-margem').value) || 0) / 100;
    const impostoDecimal = (parseFloat(document.getElementById('preco-imposto').value) || 0) / 100;

    const payload = {
        lead_id: parseInt(leadId), // O identificador crucial para o PDF
        fixed_cost_allocation: rateio,
        margin_percent: margemDecimal,
        tax_percent: impostoDecimal,
        personnel_costs: extrairInsumosDaTabela('tb-pessoal'),
        direct_costs: extrairInsumosDaTabela('tb-direto'),
        outsourced_costs: extrairInsumosDaTabela('tb-terceiro')
    };

    try {
        const res = await fetchSeguro('/pricing/export-pdf', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const erro = await res.json();
            throw new Error(erro.detail || "Falha na geração do documento.");
        }

        // A mágica de tratar a resposta como Binário (Blob) em vez de JSON
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `Proposta_Comercial_${leadId}.pdf`;
        document.body.appendChild(a);
        a.click();
        
        // Limpeza de memória
        a.remove();
        window.URL.revokeObjectURL(url);

    } catch (err) {
        alert("Falha na Exportação: " + err.message);
    } finally {
        btn.innerHTML = '<i class="ph ph-file-pdf"></i>';
        btn.disabled = false;
    }
});

    document.getElementById('btn-calcular-preco')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.innerHTML = '<i class="ph ph-spinner-gap"></i> Simulando...';
        btn.disabled = true;

        const rateio = parseFloat(document.getElementById('preco-rateio').value) || 0;
        const margemDecimal = (parseFloat(document.getElementById('preco-margem').value) || 0) / 100;
        const impostoDecimal = (parseFloat(document.getElementById('preco-imposto').value) || 0) / 100;

        const payload = {
            fixed_cost_allocation: rateio,
            margin_percent: margemDecimal,
            tax_percent: impostoDecimal,
            personnel_costs: extrairInsumosDaTabela('tb-pessoal'),
            direct_costs: extrairInsumosDaTabela('tb-direto'),
            outsourced_costs: extrairInsumosDaTabela('tb-terceiro')
        };

        try {
            const res = await fetchSeguro('/pricing/calculate', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const erro = await res.json();
                throw new Error(erro.detail || "Erro matemático na formatação dos dados.");
            }

            const resultado = await res.json();

            const formatarMoeda = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            document.getElementById('res-custo').innerText = formatarMoeda(resultado.total_direct_cost);
            document.getElementById('res-imposto').innerText = formatarMoeda(resultado.tax_value);
            document.getElementById('res-lucro').innerText = formatarMoeda(resultado.margin_value);
            document.getElementById('res-venda').innerText = formatarMoeda(resultado.final_project_value);

        } catch (err) {
            alert("Falha na Precificação: " + err.message);
        } finally {
            btn.innerHTML = '<i class="ph ph-calculator"></i> Simular Orçamento';
            btn.disabled = false;
        }
    });

    document.getElementById('btn-logout')?.addEventListener('click', (e) => {
        e.preventDefault(); localStorage.removeItem('token_ej'); window.location.reload(); 
    });
    const relogio = document.getElementById('relogio-local');
    const turnoTimer = document.getElementById('turno-timer');

    setInterval(() => {
        const agora = new Date();
        
        if (relogio) relogio.innerText = agora.toLocaleTimeString('pt-BR');

        if (window.turnoStartTime && turnoTimer) {
            const diffMs = agora - window.turnoStartTime; 
            
            const horas = Math.floor(diffMs / 3600000);
            const minutos = Math.floor((diffMs % 3600000) / 60000);
            const segundos = Math.floor((diffMs % 60000) / 1000);

            turnoTimer.innerText = 
                String(horas).padStart(2, '0') + ':' + 
                String(minutos).padStart(2, '0') + ':' + 
                String(segundos).padStart(2, '0');

            // A TRAVA DE 4 HORAS (O "Velocímetro Vermelho")
            if (horas >= 4) {
                turnoTimer.style.color = 'var(--danger)';
                turnoTimer.style.textShadow = '0 0 15px rgba(239, 68, 68, 0.4)';
            } else if (horas >= 3 && minutos >= 30) {
                // Alerta amarelo meia hora antes de estourar
                turnoTimer.style.color = 'var(--warning)';
                turnoTimer.style.textShadow = 'none';
            } else {
                turnoTimer.style.color = 'var(--success)';
                turnoTimer.style.textShadow = 'none';
            }
        }
    }, 1000);
    const links = document.querySelectorAll('.nav-link[data-target]');
    const sections = document.querySelectorAll('.tab-content');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            if (!targetId) return;

            links.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            this.classList.add('active');
            const targetSec = document.getElementById(`sec-${targetId}`);
            if (targetSec) targetSec.classList.add('active');
            
            const titleDisplay = document.getElementById('page-title');
            if (titleDisplay) titleDisplay.innerText = this.innerText.trim();

            if (targetId === 'individual') carregarVisaoIndividual();
            if (targetId === 'ponto') carregarTabelaPonto();
            if (targetId === 'leads') carregarLeads();
            if (targetId === 'time') carregarDadosTime();
            if (targetId === 'reembolsos') carregarTabelaReembolsos();
            if (targetId === 'diagnostico') carregarProjetosParaDiagnostico();
            if (targetId == 'faltas'){
                carregarFaltas();
                carregarComplianceAdmin();
                carregarTodasFaltasAdmin();
            }
            if (targetId === 'acompanhamento') {
                carregarProjetosAcompanhamento();
                carregarLeadsParaProjetos();
            }
            if (targetId === 'precificacao') {
                carregarLeadsParaPrecificacao();
            }
            if (targetId === 'usuarios') {
                carregarUsuariosAdmin();
            }
        });
    });

    document.getElementById('file-reembolso')?.addEventListener('change', e => {
        document.getElementById('file-name-display').innerText = e.target.files[0]?.name || "Arraste ou clique";
    });


    document.getElementById('btn-bater-ponto')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.innerHTML = '<i class="ph ph-spinner-gap"></i> Registrando...'; btn.disabled = true;
        try {
            const res = await fetchSeguro('/clockins/register', { method: 'POST', body: JSON.stringify({}) });
            if (!res.ok) throw new Error("Erro ao registrar ponto.");
            alert("Ponto registrado com sucesso!");
            carregarTabelaPonto(); 
            carregarVisaoIndividual(); 
        } catch (err) { alert("Falha na API de Ponto: " + err.message); } 
        finally { btn.innerHTML = '<i class="ph ph-fingerprint"></i> Registrar Entrada / Saída'; btn.disabled = false; }
    });

    document.getElementById('projeto-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.innerText = "Processando..."; 
        btnSubmit.disabled = true;

        const editId = document.getElementById('proj-edit-id').value;

        const membrosSelecionados = Array.from(document.querySelectorAll('.member-checkbox:checked'))
                                         .map(cb => parseInt(cb.value));

        const payload = {
            title: document.getElementById('proj-name').value, 
            description: document.getElementById('proj-desc').value,
            status: document.getElementById('proj-status').value,
            organization_id: parseInt(document.getElementById('proj-client').value) || null,
            member_ids: membrosSelecionados 
        };

        try {
            let res;
            if (editId) {
                res = await fetchSeguro(`/projects/${editId}/editar`, { method: 'PATCH', body: JSON.stringify(payload) });
            } else {
                res = await fetchSeguro('/projects/', { method: 'POST', body: JSON.stringify(payload) });
            }

            if (!res.ok) {
                const errorData = await res.json();
                const errorMessage = Array.isArray(errorData.detail) 
                    ? errorData.detail[0].msg 
                    : errorData.detail || "Erro de Validação Desconhecido";
                throw new Error(errorMessage);
            }
            
            alert(editId ? "Projeto atualizado!" : "Projeto iniciado com sucesso!");
            closeModal('modal-projeto'); 
            
            e.target.reset();
            document.getElementById('proj-edit-id').value = ""; // Esvazia o ID
            document.querySelector('#modal-projeto .modal-header h3').innerText = "Criar Novo Projeto"; // Reseta o título
            
            carregarProjetosAcompanhamento(); 
            carregarProjetosParaDiagnostico(); 
        } catch (error) { 
            alert("Falha: " + error.message); 
        } finally { 
            btnSubmit.innerText = editId ? "Salvar Alterações" : "Salvar Projeto"; 
            btnSubmit.disabled = false; 
        }
    });

    document.getElementById('lead-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.innerText = "Salvando..."; btnSubmit.disabled = true;

        const leadData = {
            name: document.getElementById('lead-name').value,
            cnpj: document.getElementById('lead-cnpj').value.replace(/\D/g, ''),
            status: "LEAD",
            contacts: Array.from(document.querySelectorAll('.contact-row')).map(r => ({
                name: r.querySelector('.contact-name').value,
                phone: r.querySelector('.contact-phone').value || "",
                cargo: r.querySelector('.contact-cargo').value || ""
            }))
        };
        try {
            const res = await fetchSeguro('/organizations/leads', { method: 'POST', body: JSON.stringify(leadData) });
            if (!res.ok) throw new Error((await res.json()).detail || "Erro");
            alert("Organização salva!");
            closeModal('modal-lead'); e.target.reset();
            document.getElementById('contacts-container').innerHTML = ''; 
            carregarLeads(); 
        } catch (error) { alert("Falha: " + error.message); } 
        finally { btnSubmit.innerText = "Salvar Organização"; btnSubmit.disabled = false; }
    });

    document.getElementById('reembolso-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = document.getElementById('file-reembolso').files[0];
        if (!file) return alert("Selecione um comprovante.");
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.innerText = "Enviando arquivo..."; btnSubmit.disabled = true;

        try {
            const resUpload = await fetchSeguro('/files/upload-url', { 
                method: 'POST', body: JSON.stringify({ file_name: file.name, content_type: file.type }) 
            });
            if (!resUpload.ok) throw new Error("Erro na rota de Upload Segura");
            const uploadData = await resUpload.json();
            
            await fetch(uploadData.upload_url, { method: uploadData.method || 'PUT', body: file, headers: { 'Content-Type': file.type } });
            btnSubmit.innerText = "Salvando no Banco...";

            const dadosReembolso = {
                title: document.getElementById('ref-title').value,
                description: document.getElementById('ref-description').value,
                category: document.getElementById('ref-category').value,
                value: parseFloat(document.getElementById('ref-value').value),
                pix_key: document.getElementById('ref-pix').value,
                file_url: uploadData.file_url 
            };

            const resBanco = await fetchSeguro('/reimbursements/', { method: 'POST', body: JSON.stringify(dadosReembolso) });
            if (!resBanco.ok) throw new Error('Erro ao salvar no banco financeiro.');

            alert("Reembolso enviado e arquivado na Nuvem!");
            closeModal('modal-reembolso'); e.target.reset(); carregarTabelaReembolsos();
        } catch (error) { alert("Falha: " + error.message); } 
        finally { btnSubmit.innerText = "Enviar"; btnSubmit.disabled = false; }
    });

    document.getElementById('add-task-row')?.addEventListener('click', (e) => {
        e.preventDefault();
        const tbody = document.getElementById('task-body');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="dark-input sm" placeholder="ID"></td>
            <td><input type="text" class="dark-input" placeholder="Nova Tarefa"></td>
            <td><input type="text" class="dark-input sm" placeholder="-"></td>
            <td><input type="number" class="dark-input sm" placeholder="0"></td>
            <td><input type="number" class="dark-input sm" placeholder="0"></td>
            <td><input type="number" class="dark-input sm" placeholder="0"></td>
            <td><button type="button" class="btn-icon-danger" onclick="this.parentElement.parentElement.remove()"><i class="ph ph-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('btn-calculate-diag')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const projectId = document.getElementById('diag-project-selector').value;
        if (!projectId) return alert("ERRO DE OPERAÇÃO: Selecione um projeto na lista acima antes de calcular.");

        const payload = { tasks: {} };
        document.querySelectorAll('#task-body tr').forEach(row => {
            const inputs = row.querySelectorAll('input');
            const id = inputs[0].value.trim().toUpperCase();
            if (id) {
                payload.tasks[id] = {
                    desc: inputs[1].value.trim() || "Sem descrição",
                    pred: inputs[2].value.trim() === "-" || inputs[2].value.trim() === "" ? [] : inputs[2].value.trim().toUpperCase().split(',').map(s=>s.trim()),
                    O: parseFloat(inputs[3].value) || 0,
                    M: parseFloat(inputs[4].value) || 0,
                    P: parseFloat(inputs[5].value) || 0
                };
            }
        });

        if (Object.keys(payload.tasks).length === 0) return alert("Adicione tarefas na matriz.");
        btn.innerHTML = '<i class="ph ph-spinner-gap"></i> ...'; btn.disabled = true;

        try {
            const res = await fetchSeguro(`/projects/${projectId}/diagnostic`, { method: 'PATCH', body: JSON.stringify(payload) });
            const jsonResponse = await res.json(); // Pega o payload completo
            
            if (!res.ok) throw new Error(jsonResponse.detail || "Erro interno na API");
            
            const dadosDiagnostico = jsonResponse.dados;
            
            const pert = dadosDiagnostico.pert_classico.metricas_globais;
            const ccpm = dadosDiagnostico.corrente_critica.metricas_ccpm;

            document.getElementById('pert-total').innerText = `${pert.tempo_enxuto_horas} h`;
            document.getElementById('pert-safety').innerText = `${pert.margem_seguranca_horas} h`;
            document.getElementById('critical-path-text').innerText = dadosDiagnostico.pert_classico.caminho_critico.join(' -> ');
            
            document.getElementById('ccpm-meta').innerText = `${ccpm.tempo_agressivo_projeto_horas} h`;
            document.getElementById('ccpm-buffer').innerText = `${ccpm.project_buffer_horas} h`;
            document.getElementById('buffer-status').innerText = "Protegido Matematicamente";
            
        } catch (err) { 
            alert("Cálculo Rejeitado: " + err.message); 
        } finally { 
            btn.innerHTML = '<i class="ph ph-calculator"></i> Calcular'; 
            btn.disabled = false; 
        }
    });

    document.getElementById('btn-download-pdf')?.addEventListener('click', async () => {
        const projectId = document.getElementById('diag-project-selector').value;
        if (!projectId) return alert("Selecione um projeto para gerar o PDF.");
        try {
            const res = await fetchSeguro(`/projects/${projectId}/diagnostic/pdf`);
            if (!res.ok) throw new Error("Gere o cálculo na tela antes de exportar.");
            const url = window.URL.createObjectURL(await res.blob());
            const a = document.createElement('a'); a.href = url; a.download = `Diagnostico_Projeto_${projectId}.pdf`;
            document.body.appendChild(a); a.click(); a.remove();
        } catch (err) { alert("Falha na exportação: " + err.message); }
    });

    document.getElementById('falta-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.innerText = "Enviando..."; btnSubmit.disabled = true;

        const payload = {
            absence_date: document.getElementById('falta-data').value,
            reason: document.getElementById('falta-motivo').value
        };

        try {
            const res = await fetchSeguro('/absences/', { 
                method: 'POST', 
                body: JSON.stringify(payload) 
            });
            if (!res.ok) throw new Error("Erro ao registrar a falta no banco de dados.");
            
            alert("Sua justificativa foi enviada para análise da diretoria.");
            closeModal('modal-falta');
            e.target.reset();
            carregarFaltas(); 
        } catch (err) { 
            alert("Falha: " + err.message); 
        } finally { 
            btnSubmit.innerText = "Enviar Justificativa"; btnSubmit.disabled = false; 
        }
    });
});

window.revogarBandeira = async function(flagId) {
    if (!confirm("Tem certeza que deseja REVOGAR esta bandeira? Esta ação apagará o registro histórico.")) return;

    try {
        const res = await fetchSeguro(`/users/flags/${flagId}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || "Erro ao revogar bandeira.");
        }

        alert("Punição revogada e apagada do sistema.");
        carregarComplianceAdmin();

    } catch (err) {
        alert("Falha: " + err.message);
    }
};

window.abrirModalCargo = function(id, nome, roleAtual) {
    document.getElementById('cargo-target-id').value = id;
    document.getElementById('cargo-target-name').innerText = nome;
    document.getElementById('cargo-novo').value = roleAtual;
    openModal('modal-cargo');
};

document.getElementById('cargo-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const id = document.getElementById('cargo-target-id').value;
    const novaRole = document.getElementById('cargo-novo').value;
    
    btn.disabled = true;
    btn.innerText = "Alterando...";

    try {
        const res = await fetchSeguro(`/users/${id}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role: novaRole })
        });
        
        if(!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "Falha ao alterar cargo.");
        }
        
        closeModal('modal-cargo');
        alert("Passagem de bastão concluída! O nível de acesso foi alterado.");
        carregarUsuariosAdmin(); // Atualiza a tabela na mesma hora
    } catch(err) {
        alert("Erro Crítico: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Confirmar Alteração";
    }
});

window.abrirModalDelegacaoRapida = async function(userId, userName) {
    document.getElementById('delegacao-assignee-id').value = userId;
    document.getElementById('delegacao-assignee-name').innerText = userName;
    
    const selectProjetos = document.getElementById('delegacao-projeto-id');
    selectProjetos.innerHTML = '<option value="">Buscando projetos...</option>';
    
    openModal('modal-delegacao-rapida');

    try {
        // Busca os projetos ativos para o select
        const res = await fetchSeguro('/projects/');
        if (!res.ok) throw new Error("Falha ao buscar projetos.");
        const projetos = await res.json();
        
        if (projetos.length === 0) {
            selectProjetos.innerHTML = '<option value="" disabled>Nenhum projeto cadastrado no sistema.</option>';
        } else {
            selectProjetos.innerHTML = '<option value="" disabled selected>-- Selecione um Projeto --</option>' + 
                projetos.map(p => `<option value="${p.id}">${p.title || p.name}</option>`).join('');
        }
    } catch (err) {
        selectProjetos.innerHTML = '<option value="" disabled>Erro ao carregar projetos.</option>';
    }
};

document.getElementById('delegacao-rapida-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const assigneeId = document.getElementById('delegacao-assignee-id').value;
    const projectId = document.getElementById('delegacao-projeto-id').value;
    const title = document.getElementById('delegacao-tarefa-titulo').value.trim();
    
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner-gap"></i> Delegando...';

    try {
        const payload = {
            title: title,
            assigned_to_id: parseInt(assigneeId)
        };

        // Bate na rota EXATA que você já tem construída
        const res = await fetchSeguro(`/projects/${projectId}/tasks`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error((await res.json()).detail || "Falha ao delegar a tarefa.");
        
        closeModal('modal-delegacao-rapida');
        e.target.reset();
        alert("Tarefa atribuída com sucesso ao membro!");
        
        // Atualiza a visão do time para refletir a nova carga (se necessário)
        carregarDadosTime(); 
    } catch(err) {
        alert("Erro: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Atribuir Tarefa';
    }
});

document.getElementById('senha-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const senhaAntiga = document.getElementById('senha-antiga').value;
    const senhaNova = document.getElementById('senha-nova').value;

    if (senhaNova.length < 6) {
        return alert("A nova senha deve ter no mínimo 8 caracteres.");
    }

    btnSubmit.innerText = "Criptografando..."; 
    btnSubmit.disabled = true;

    try {
        const res = await fetchSeguro('/users/me/password', {
            method: 'PATCH', // Ajuste para o método e URL que você usou no seu back-end
            body: JSON.stringify({
                old_password: senhaAntiga,
                new_password: senhaNova
            })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || "Senha atual incorreta ou erro no servidor.");
        }

        alert("Senha atualizada com sucesso! Use-a no próximo login.");
        closeModal('modal-senha');
        e.target.reset();

    } catch (err) {
        alert("Falha de Segurança: " + err.message);
    } finally {
        btnSubmit.innerHTML = '<i class="ph ph-lock-key"></i> Atualizar Credencial';
        btnSubmit.disabled = false;
    }
});
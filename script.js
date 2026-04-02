// ==========================================
// 1. CONFIGURAÇÕES E FUNÇÕES GLOBAIS
// ==========================================
const API_BASE_URL = 'https://api-intern-platform.onrender.com';

function entrarNoSistema() {
    const login = document.getElementById('login-container');
    const dash = document.getElementById('main-dashboard');
    if (login) login.style.display = 'none';
    if (dash) dash.style.display = 'flex';
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

// Helpers de Manipulação Dinâmica
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

function addQuestionField() {
    const container = document.getElementById('questions-container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'contact-row'; // Reaproveitando grid
    div.innerHTML = `
        <input type="text" placeholder="Pergunta" class="dark-input" style="grid-column: span 2;" required>
        <select class="dark-input"><option value="text">Curta</option><option value="textarea">Longa</option></select>
        <button type="button" class="btn-icon-danger" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(div);
}

// ==========================================
// 2. FUNÇÕES DE BUSCA DE DADOS (GET)
// ==========================================

async function carregarLeads() {
    const listBody = document.getElementById('leads-list-body');
    if (!listBody) return;
    listBody.innerHTML = '<tr><td colspan="5" class="text-center dim">Buscando leads...</td></tr>';
    try {
        const response = await fetchSeguro('/organizations/leads');
        if (!response.ok) throw new Error("Acesso negado (401/403)");
        const leads = await response.json();
        if (leads.length === 0) {
            listBody.innerHTML = '<tr><td colspan="5" class="text-center dim">Nenhum lead encontrado.</td></tr>';
            return;
        }
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

async function carregarProjetosParaDiagnostico() {
    const selector = document.getElementById('diag-project-selector');
    if (!selector) return;

    selector.innerHTML = '<option value="">Buscando projetos no banco...</option>';

    try {
        const res = await fetchSeguro('/projects'); 
        if (!res.ok) throw new Error("Erro na rota GET /projects");
        
        const projetos = await res.json();
        
        if (projetos.length === 0) {
            selector.innerHTML = '<option value="">Nenhum projeto cadastrado</option>';
            return;
        }

        // Constrói as opções vinculando o ID real no atributo 'value' e mostrando o Nome
        selector.innerHTML = '<option value="" disabled selected>-- Selecione um Projeto --</option>' + 
            projetos.map(p => `<option value="${p.id}">${p.title || 'Projeto ID: ' + p.id}</option>`).join('');
        
    } catch (err) {
        selector.innerHTML = '<option value="">Falha de comunicação</option>';
        console.error(err);
    }
}

async function carregarDadosTime() {
    const listBody = document.getElementById('team-status-list');
    if (!listBody) return;
    listBody.innerHTML = '<tr><td colspan="3" class="text-center dim">Buscando equipe...</td></tr>';
    try {
        const res = await fetchSeguro('/team/status');
        if (!res.ok) throw new Error("Falha na busca");
        const data = await res.json();
        if (data.membros) {
            listBody.innerHTML = data.membros.map(m => `
                <tr>
                    <td><div style="display: flex; align-items: center; gap: 10px;"><div class="avatar-mini">${m.iniciais || '👤'}</div>${m.nome}</div></td>
                    <td class="dim">${m.atividade}</td>
                    <td><span class="status-badge ${m.status === 'Ativo' ? 'status-ativo' : 'status-away'}">${m.status}</span></td>
                </tr>
            `).join('');
        }
        const chart = document.getElementById('team-occupancy-chart');
        if (chart && data.porcentagem_geral !== undefined) {
            chart.style.background = `conic-gradient(var(--primary) ${data.porcentagem_geral}%, var(--bg-card) 0deg)`;
            document.getElementById('occupancy-percent').innerText = `${data.porcentagem_geral}%`;
        }
    } catch (e) { listBody.innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--danger)">Erro ao carregar time.</td></tr>`; }
}

async function carregarTabelaReembolsos() {
    const tbody = document.getElementById('reembolso-list-body');
    if (!tbody) return;
    try {
        const res = await fetchSeguro('/financeiro/reembolsos');
        if(!res.ok) throw new Error("Erro");
        const dados = await res.json();
        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center dim">Nenhum reembolso registrado.</td></tr>';
            return;
        }
        tbody.innerHTML = dados.map(item => `
            <tr>
                <td><div style="display: flex; flex-direction: column;"><strong>${item.title}</strong><span class="dim" style="font-size: 12px;">${new Date(item.date_time || item.created_at).toLocaleDateString('pt-BR')}</span></div></td>
                <td class="dim">${item.category || '-'}</td>
                <td>${parseFloat(item.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td><span class="status-badge status-${(item.status || 'pending').toLowerCase()}">${item.status || 'Pendente'}</span></td>
            </tr>
        `).join('');
    } catch (e) { tbody.innerHTML = `<tr><td colspan="5" class="text-center dim">Erro ao buscar dados.</td></tr>`; }
}

async function carregarTabelaFaltas() {
    const tbody = document.getElementById('tabela-faltas-body');
    if (!tbody) return;
    try {
        const res = await fetchSeguro('/absences'); // Ajuste a rota correta do back
        if(!res.ok) throw new Error("Erro");
        const faltas = await res.json();
        if (faltas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center dim">Nenhuma falta registrada.</td></tr>';
            return;
        }
        tbody.innerHTML = faltas.map(f => `
            <tr>
                <td>${new Date(f.date_absent).toLocaleDateString('pt-BR')}</td>
                <td><strong>${f.reason}</strong></td>
                <td><span class="status-badge status-${(f.status||'pendente').toLowerCase()}">${f.status||'Pendente'}</span></td>
            </tr>
        `).join('');
    } catch (e) { tbody.innerHTML = `<tr><td colspan="3" class="text-center dim">Modo Offline / Sem API configurada.</td></tr>`; }
}

async function carregarProjetosAcompanhamento() {
    const listBody = document.getElementById('projetos-list-body');
    if (!listBody) return;
    listBody.innerHTML = '<tr><td colspan="4" class="text-center dim">Buscando projetos...</td></tr>';
    
    try {
        const res = await fetchSeguro('/projects');
        if (!res.ok) throw new Error("Erro ao buscar projetos");
        const projetos = await res.json();
        
        if (projetos.length === 0) {
            listBody.innerHTML = '<tr><td colspan="4" class="text-center dim">Nenhum projeto ativo na EJ Unicap.</td></tr>';
            return;
        }
        
        listBody.innerHTML = projetos.map(p => `
            <tr>
                <td><strong>${p.name || p.title || 'Projeto sem nome'}</strong></td>
                <td class="dim">${(p.description || '').substring(0, 50)}...</td>
                <td><span class="status-badge status-${(p.status||'planejamento').toLowerCase()}">${p.status || 'Planejamento'}</span></td>
                <td>
                    <button class="btn-outline-sm" title="Ir para Diagnóstico Matemático" onclick="abrirDiagnosticoDoProjeto(${p.id})" style="width: auto; font-size: 12px;">
                        <i class="ph ph-math-operations"></i> Diagnóstico
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        listBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--danger)">${err.message}</td></tr>`;
    }
}

// A Ponte Inteligente entre Abas
window.abrirDiagnosticoDoProjeto = function(id) {
    // 1. Simula o clique na aba de Diagnóstico do menu lateral
    document.querySelector('.nav-link[data-target="diagnostico"]')?.click();
    
    // 2. Trava o Select nativo na opção do projeto escolhido
    const selector = document.getElementById('diag-project-selector');
    if(selector) {
        selector.value = id;
    }
};

async function carregarLeadsParaProjetos() {
    const selector = document.getElementById('proj-client');
    if (!selector) return;
    
    selector.innerHTML = '<option value="">Buscando no banco de dados...</option>';
    
    try {
        const res = await fetchSeguro('/organizations/leads');
        if (!res.ok) throw new Error("Erro de comunicação");
        const leads = await res.json();
        
        if (leads.length === 0) {
            selector.innerHTML = '<option value="" disabled selected>Nenhum lead/cliente cadastrado. Crie um primeiro.</option>';
            return;
        }
        
        // Alimenta o Select com o ID real no banco de dados
        selector.innerHTML = '<option value="" disabled selected>-- Selecione a Organização --</option>' + 
            leads.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
            
    } catch (err) {
        selector.innerHTML = '<option value="" disabled>Erro ao carregar organizações</option>';
        console.error(err);
    }
}

// ==========================================
// 3. INICIALIZAÇÃO E EVENT LISTENERS DO DOM
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    // Auth Check
    const token = localStorage.getItem('token_ej');
    if (token) entrarNoSistema(); else exibirLogin();

    // Login Form
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-entrar');
            const errorMsg = document.getElementById('login-error');
            btn.innerText = "Autenticando..."; btn.disabled = true;
            if(errorMsg) errorMsg.style.display = 'none';

            const corpo = new URLSearchParams();
            corpo.append('username', document.getElementById('user-email').value);
            corpo.append('password', document.getElementById('user-pass').value);

            try {
                const res = await fetch(`${API_BASE_URL}/auth/login`, { 
                    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corpo
                });
                const dados = await res.json();
                if (res.ok && dados.access_token) {
                    localStorage.setItem('token_ej', dados.access_token);
                    entrarNoSistema();
                } else {
                    if(errorMsg) errorMsg.style.display = 'block';
                }
            } catch (err) {
                alert("Erro ao conectar com a API (Render Inativa ou CORS).");
            } finally { btn.innerText = "Acessar Sistema"; btn.disabled = false; }
        });
    }

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', (e) => {
        e.preventDefault(); localStorage.removeItem('token_ej'); window.location.reload(); 
    });

    // Navegação (Tabs)
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

            // Gatilhos de Carregamento
            if (targetId === 'leads') carregarLeads();
            if (targetId === 'time') carregarDadosTime();
            if (targetId === 'reembolsos') carregarTabelaReembolsos();
            if (targetId === 'faltas') carregarTabelaFaltas();
            if (targetId === 'diagnostico') carregarProjetosParaDiagnostico(); 
            if (targetId === 'acompanhamento') {
                carregarProjetosAcompanhamento();
                carregarLeadsParaProjetos();
            }
        });
    });

    // Inputs de Arquivo UI feedback
    document.getElementById('file-reembolso')?.addEventListener('change', e => {
        document.getElementById('file-name-display').innerText = e.target.files[0]?.name || "Arraste ou clique";
    });
    document.getElementById('file-abs')?.addEventListener('change', e => {
        document.getElementById('abs-file-display').innerText = e.target.files[0]?.name || "Clique para subir";
    });

    // --- FORMULÁRIOS COMPLEXOS ---

    // Leads Form
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
            alert("Lead criado com sucesso!");
            closeModal('modal-lead');
            e.target.reset();
            document.getElementById('contacts-container').innerHTML = ''; 
            carregarLeads(); 
        } catch (error) { alert("Falha: " + error.message); } 
        finally { btnSubmit.innerText = "Salvar Organização"; btnSubmit.disabled = false; }
    });

    // Reembolso Form (Upload S3/Cloudflare 2 Passos)
    document.getElementById('reembolso-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = document.getElementById('file-reembolso').files[0];
        if (!file) return alert("Selecione um comprovante.");

        const dadosReembolso = {
            title: document.getElementById('ref-title').value,
            description: document.getElementById('ref-description').value,
            category: document.getElementById('ref-category').value,
            value: parseFloat(document.getElementById('ref-value').value),
            pix_key: document.getElementById('ref-pix').value,
            file_extension: `.${file.name.split('.').pop()}`
        };

        try {
            const res = await fetchSeguro('/reimbursements', { method: 'POST', body: JSON.stringify(dadosReembolso) });
            if (!res.ok) throw new Error('Erro ao criar solicitação');
            const { presigned_url } = await res.json();
            
            // PUT direto pro R2
            await fetch(presigned_url.upload_url, { method: presigned_url.method, body: file, headers: { 'Content-Type': file.type } });
            alert("Reembolso e comprovante enviados com sucesso!");
            closeModal('modal-reembolso'); e.target.reset(); carregarTabelaReembolsos();
        } catch (error) { alert("Falha ao processar reembolso."); }
    });

    // Faltas Form
    document.getElementById('falta-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = document.getElementById('file-abs').files[0];
        const payload = {
            name: document.getElementById('proj-name').value,
            description: document.getElementById('proj-desc').value,
            status: document.getElementById('proj-status').value,
            organization_id: parseInt(document.getElementById('proj-client').value)
        };
        console.log("Falta MOCK:", payload);
        alert("Falta enviada (Logika MOCK - Plugue a API).");
        closeModal('modal-falta');
    });

    // Formulário de Criação de Projetos
    document.getElementById('projeto-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.innerText = "Criando..."; btnSubmit.disabled = true;

        const payload = {
            name: document.getElementById('proj-name').value,
            description: document.getElementById('proj-desc').value,
            status: document.getElementById('proj-status').value
        };

        try {
            // Assumindo que a sua rota de criação no backend seja POST /projects
            const res = await fetchSeguro('/projects', { method: 'POST', body: JSON.stringify(payload) });
            if (!res.ok) throw new Error((await res.json()).detail || "Erro ao criar projeto");
            
            alert("Projeto iniciado com sucesso!");
            closeModal('modal-projeto');
            e.target.reset();
            carregarProjetosAcompanhamento(); // Recarrega a tabela imediatamente
            carregarProjetosParaDiagnostico(); // Atualiza a lista do Select do Diagnóstico
            
        } catch (error) { 
            alert("Falha na criação: " + error.message); 
        } finally { 
            btnSubmit.innerText = "Salvar Projeto"; btnSubmit.disabled = false; 
        }
    });

    // Diagnóstico PERT/CCPM
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
    });
        document.getElementById('btn-calculate-diag')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        
        // A NOVA TRAVA: Lê diretamente do <select> injetado no HTML
        const projectId = document.getElementById('diag-project-selector').value;
        
        if (!projectId) {
            return alert("ERRO DE OPERAÇÃO: Você precisa selecionar um projeto na lista acima antes de calcular a matriz.");
        }

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

        if (Object.keys(payload.tasks).length === 0) return alert("Adicione tarefas.");
        btn.innerHTML = '<i class="ph ph-spinner-gap"></i> ...'; btn.disabled = true;

        try {
            const res = await fetchSeguro(`/projects/${projectId}/diagnostic`, { method: 'PATCH', body: JSON.stringify(payload) });
            if (!res.ok) throw new Error((await res.json()).detail);
            const data = await res.json();
            const pert = data.pert_classico.metricas_globais;
            const ccpm = data.corrente_critica.metricas_ccpm;

            document.getElementById('pert-total').innerText = `${pert.tempo_enxuto_horas} h`;
            document.getElementById('pert-safety').innerText = `${pert.margem_seguranca_horas} h`;
            document.getElementById('critical-path-text').innerText = data.pert_classico.caminho_critico.join(' -> ');
            document.getElementById('ccpm-meta').innerText = `${ccpm.tempo_agressivo_projeto_horas} h`;
            document.getElementById('ccpm-buffer').innerText = `${ccpm.project_buffer_horas} h`;
            document.getElementById('buffer-status').innerText = "Matematicamente Protegido";
        } catch (err) { alert("Falha: " + err.message); } 
        finally { btn.innerHTML = '<i class="ph ph-calculator"></i> Gerar Diagnóstico'; btn.disabled = false; }
    });

    document.getElementById('btn-download-pdf')?.addEventListener('click', async () => {
        const projectId = new URLSearchParams(window.location.search).get('project_id');
        if (!projectId) return alert("Sem projeto na URL.");
        try {
            const res = await fetchSeguro(`/projects/${projectId}/diagnostic/pdf`);
            if (!res.ok) throw new Error("Calcule o projeto primeiro.");
            const url = window.URL.createObjectURL(await res.blob());
            const a = document.createElement('a'); a.href = url; a.download = `Diagnostico_${projectId}.pdf`;
            document.body.appendChild(a); a.click(); a.remove();
        } catch (err) { alert("Erro ao baixar: " + err.message); }
    });
}
);
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

        // UI: Atualiza a Identidade do Usuário no Topo
        const avatarBox = document.querySelector('.avatar-mini');
        if (avatarBox && usuario.nome) {
            avatarBox.innerText = usuario.nome.substring(0, 2).toUpperCase();
            avatarBox.title = usuario.email;
        }
        const tituloH1 = document.querySelector('#sec-individual h1');
        if (tituloH1 && usuario.nome) tituloH1.innerText = `Olá, ${usuario.nome.split(' ')[0]}`;

        // 1. Tarefas
        if (!usuario.tarefas || usuario.tarefas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center dim">Nenhuma tarefa atribuída a você no momento.</td></tr>';
        } else {
            tbody.innerHTML = usuario.tarefas.map(t => `
                <tr>
                    <td><strong>${t.nome}</strong></td>
                    <td class="dim">${t.projeto_nome || 'Interno'}</td>
                    <td><span class="status-badge status-${(t.status || 'pendente').toLowerCase()}">${t.status || 'Pendente'}</span></td>
                    <td><button class="btn-outline-sm" style="width: auto;" title="Concluir"><i class="ph ph-check"></i></button></td>
                </tr>
            `).join('');
        }

        // 2. Progresso do Ponto
        const horasFeitas = parseFloat(usuario.horas_semanais) || 0;
        const meta = 20; 
        const porcentagem = Math.min((horasFeitas / meta) * 100, 100);
        
        const textoHoras = document.getElementById('horas-feitas-text');
        const barraPonto = document.getElementById('ponto-progress-bar');
        
        if (textoHoras) textoHoras.innerText = `${horasFeitas}h / ${meta}h`;
        if (barraPonto) barraPonto.style.width = `${porcentagem}%`;

    } catch (err) { tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--danger)">${err.message}</td></tr>`; }
}

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
        
        listBody.innerHTML = projetos.map(p => `
            <tr>
                <td><strong>${p.title || p.name || 'Projeto sem nome'}</strong></td>
                <td class="dim">${(p.description || '').substring(0, 50)}...</td>
                <td><span class="status-badge status-${(p.status||'planejamento').toLowerCase()}">${p.status || 'Planejamento'}</span></td>
                <td>
                    <button class="btn-outline-sm" title="Ir para Diagnóstico Matemático" onclick="abrirDiagnosticoDoProjeto(${p.id})" style="width: auto; font-size: 12px;">
                        <i class="ph ph-math-operations"></i> Diagnóstico
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) { listBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--danger)">${err.message}</td></tr>`; }
}

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
    const tbody = document.getElementById('ponto-list-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center dim">Carregando histórico...</td></tr>';
    
    try {
        const res = await fetchSeguro('/clockins/summary'); 
        if(!res.ok) throw new Error("Erro ao buscar ponto no servidor.");
        
        let resposta_bruta = await res.json();
        let registros_array = [];

        // 1. A BLINDAGEM DE TIPOS (Procura o Array dentro do Objeto)
        if (Array.isArray(resposta_bruta)) {
            registros_array = resposta_bruta; // Se vier um array limpo, ótimo.
        } else if (typeof resposta_bruta === 'object' && resposta_bruta !== null) {
            // Se vier um Objeto, tentamos caçar a chave que guarda a lista (chutes arquiteturais comuns)
            if (Array.isArray(resposta_bruta.data)) registros_array = resposta_bruta.data;
            else if (Array.isArray(resposta_bruta.records)) registros_array = resposta_bruta.records;
            else if (Array.isArray(resposta_bruta.registros)) registros_array = resposta_bruta.registros;
            else if (Array.isArray(resposta_bruta.historico)) registros_array = resposta_bruta.historico;
            else throw new Error("A API devolveu um Objeto, mas o Front-end não achou a chave do Array. Abra o F12 (Network).");
        }

        // 2. Renderização Segura
        if (registros_array.length === 0) {
            return tbody.innerHTML = '<tr><td colspan="4" class="text-center dim">Nenhum registro encontrado.</td></tr>';
        }
        
        tbody.innerHTML = registros_array.map(r => `
            <tr>
                <td><strong>${new Date(r.date || r.created_at || r.data || new Date()).toLocaleDateString('pt-BR')}</strong></td>
                <td><span class="text-green">${r.entry_time || r.entrada || '--:--'}</span></td>
                <td><span class="text-yellow">${r.exit_time || r.saida || '--:--'}</span></td>
                <td>${r.total_hours || r.total || '0'}h</td>
            </tr>
        `).join('');
        
    } catch (e) { 
        tbody.innerHTML = `<tr><td colspan="4" class="text-center dim" style="color:var(--danger)">${e.message}</td></tr>`; 
        console.error("Erro na Tabela de Ponto:", e);
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
    } catch (e) { listBody.innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--danger)">API não conectada.</td></tr>`; }
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
                alert("Erro ao conectar com a API.");
            } finally { btn.innerText = "Acessar Sistema"; btn.disabled = false; }
        });
    }

    document.getElementById('btn-logout')?.addEventListener('click', (e) => {
        e.preventDefault(); localStorage.removeItem('token_ej'); window.location.reload(); 
    });

    // Relógio do Ponto Eletrônico
    const relogio = document.getElementById('relogio-local');
    if (relogio) setInterval(() => { relogio.innerText = new Date().toLocaleTimeString('pt-BR'); }, 1000);

    // Navegação (Tabs) e Gatilhos de API
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

            // Dispara as consultas ao banco dependendo da aba
            if (targetId === 'individual') carregarVisaoIndividual();
            if (targetId === 'ponto') carregarTabelaPonto();
            if (targetId === 'leads') carregarLeads();
            if (targetId === 'time') carregarDadosTime();
            if (targetId === 'reembolsos') carregarTabelaReembolsos();
            if (targetId === 'diagnostico') carregarProjetosParaDiagnostico(); 
            if (targetId === 'acompanhamento') {
                carregarProjetosAcompanhamento();
                carregarLeadsParaProjetos();
            }
        });
    });

    // Feedback visual dos Inputs de Arquivo
    document.getElementById('file-reembolso')?.addEventListener('change', e => {
        document.getElementById('file-name-display').innerText = e.target.files[0]?.name || "Arraste ou clique";
    });

    // --- FORMULÁRIOS DE INTEGRAÇÃO COM BACKEND ---

    // 1. Registro de Ponto
    document.getElementById('btn-bater-ponto')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.innerHTML = '<i class="ph ph-spinner-gap"></i> Registrando...'; btn.disabled = true;
        try {
            const res = await fetchSeguro('/clockins/register', { method: 'POST', body: JSON.stringify({}) });
            if (!res.ok) throw new Error("Erro ao registrar ponto.");
            alert("Ponto registrado com sucesso!");
            carregarVisaoIndividual(); 
        } catch (err) { alert("Falha na API de Ponto: " + err.message); } 
        finally { btn.innerHTML = '<i class="ph ph-fingerprint"></i> Registrar Entrada / Saída'; btn.disabled = false; }
    });

    // 2. Projetos Form (O Contrato que quebrou antes)
    document.getElementById('projeto-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.innerText = "Criando..."; btnSubmit.disabled = true;

        const payload = {
            title: document.getElementById('proj-name').value, 
            description: document.getElementById('proj-desc').value,
            status: document.getElementById('proj-status').value,
            organization_id: parseInt(document.getElementById('proj-client').value) || null,
            member_ids: [] // Obrigatório pelo schema
        };

        try {
            const res = await fetchSeguro('/projects/', { method: 'POST', body: JSON.stringify(payload) });
            if (!res.ok) throw new Error((await res.json()).detail || "Erro de Validação Pydantic");
            alert("Projeto iniciado com sucesso!");
            closeModal('modal-projeto'); e.target.reset();
            carregarProjetosAcompanhamento(); 
            carregarProjetosParaDiagnostico(); 
        } catch (error) { alert("Falha na criação: " + error.message); } 
        finally { btnSubmit.innerText = "Salvar Projeto"; btnSubmit.disabled = false; }
    });

    // 3. Leads Form
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

    // 4. Reembolso Form (O Fluxo de 3 Passos: R2 + Banco)
    document.getElementById('reembolso-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = document.getElementById('file-reembolso').files[0];
        if (!file) return alert("Selecione um comprovante.");
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.innerText = "Enviando arquivo..."; btnSubmit.disabled = true;

        try {
            // Passo 1: Presigned URL
            const resUpload = await fetchSeguro('/files/upload-url', { 
                method: 'POST', body: JSON.stringify({ file_name: file.name, content_type: file.type }) 
            });
            if (!resUpload.ok) throw new Error("Erro na rota de Upload Segura");
            const uploadData = await resUpload.json();
            
            // Passo 2: Nuvem
            await fetch(uploadData.upload_url, { method: uploadData.method || 'PUT', body: file, headers: { 'Content-Type': file.type } });
            btnSubmit.innerText = "Salvando no Banco...";

            // Passo 3: Salva Reembolso
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

    // --- MOTOR MATEMÁTICO (PERT/CCPM) ---
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
            if (!res.ok) throw new Error((await res.json()).detail);
            const data = await res.json();
            const pert = data.pert_classico.metricas_globais;
            const ccpm = data.corrente_critica.metricas_ccpm;

            document.getElementById('pert-total').innerText = `${pert.tempo_enxuto_horas} h`;
            document.getElementById('pert-safety').innerText = `${pert.margem_seguranca_horas} h`;
            document.getElementById('critical-path-text').innerText = data.pert_classico.caminho_critico.join(' -> ');
            document.getElementById('ccpm-meta').innerText = `${ccpm.tempo_agressivo_projeto_horas} h`;
            document.getElementById('ccpm-buffer').innerText = `${ccpm.project_buffer_horas} h`;
            document.getElementById('buffer-status').innerText = "Protegido Matematicamente";
        } catch (err) { alert("Cálculo Rejeitado: " + err.message); } 
        finally { btn.innerHTML = '<i class="ph ph-calculator"></i> Calcular'; btn.disabled = false; }
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
});
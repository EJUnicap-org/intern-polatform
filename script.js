// ==========================================
// FUNÇÕES GLOBAIS E AUXILIARES (Devem ficar fora do DOMContentLoaded)
// ==========================================

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

/**
 * Função Mestre para Requisições com Token JWT
 */
async function fetchSeguro(url, opcoes = {}) {
    const token = localStorage.getItem('token_ej');
    const headers = {
        ...opcoes.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    return fetch(url, { ...opcoes, headers });
}

// --- Funções da Tela de Leads ---

async function carregarLeads() {
    const listBody = document.getElementById('leads-list-body');
    if (!listBody) return;

    listBody.innerHTML = '<tr><td colspan="5" class="text-center dim">Sincronizando com a API...</td></tr>';

    try {
        // Usando fetchSeguro para passar pela proteção JWT da sua API
        const response = await fetchSeguro('https://api-intern-platform.onrender.com/organizations/leads');
        if (!response.ok) throw new Error("Falha ao buscar leads ou acesso negado (401/403)");
        
        const leads = await response.json();

        if (leads.length === 0) {
            listBody.innerHTML = '<tr><td colspan="5" class="text-center dim">Nenhum lead encontrado no banco de dados.</td></tr>';
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
    } catch (error) {
        console.error("Erro:", error);
        listBody.innerHTML = `<tr><td colspan="5" class="text-center dim" style="color: #ef4444;">${error.message}</td></tr>`;
    }
}

function addContactField() {
    const container = document.getElementById('contacts-container');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'contact-row';
    div.innerHTML = `
        <input type="text" class="dark-input contact-name" placeholder="Nome do Contato" required>
        <input type="text" class="dark-input contact-phone" placeholder="Telefone">
        <input type="text" class="dark-input contact-cargo" placeholder="Cargo">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(div);
}

async function carregarDadosTime() {
    try {
        const res = await fetchSeguro('https://api-intern-platform.onrender.com/team/status');
        if (!res.ok) throw new Error("Erro na resposta do servidor");
        const data = await res.json();
        
        const list = document.getElementById('team-status-list');
        if (list && data.membros) {
            list.innerHTML = data.membros.map(m => `
                <tr>
                    <td>${m.nome}</td>
                    <td>${m.atividade}</td>
                    <td>${m.status}</td>
                </tr>
            `).join('');
        }
    } catch (e) {
        console.error("Erro ao carregar time:", e);
    }
}


// ==========================================
// INICIALIZAÇÃO DA PÁGINA (Eventos DOM)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    
    // === 0. PROTEÇÃO DE ACESSO (JWT) ===
    const token = localStorage.getItem('token_ej');
    if (token) {
        entrarNoSistema();
    } else {
        exibirLogin();
    }

    // === 1. LÓGICA DE LOGIN ===
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('user-email').value;
            const senha = document.getElementById('user-pass').value;
            const btn = document.getElementById('btn-entrar');
            const errorMsg = document.getElementById('login-error');
            
            btn.innerText = "Autenticando...";
            btn.disabled = true;
            if(errorMsg) errorMsg.style.display = 'none';

            const corpo = new URLSearchParams();
            corpo.append('username', email);
            corpo.append('password', senha);

            try {
                const resposta = await fetch('https://api-intern-platform.onrender.com/auth/login', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: corpo
                });

                const dados = await resposta.json();

                if (resposta.ok && dados.access_token) {
                    localStorage.setItem('token_ej', dados.access_token);
                    entrarNoSistema();
                } else {
                    if(errorMsg) errorMsg.style.display = 'block';
                }
            } catch (err) {
                console.error("Erro no servidor:", err);
                alert("Erro ao conectar com a API oficial.");
            } finally {
                btn.innerText = "Acessar Sistema";
                btn.disabled = false;
            }
        });
    }

    // === 2. BOTÃO DE SAIR (LOGOUT) ===
    document.getElementById('btn-logout')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token_ej');
        window.location.reload(); 
    });

    // === 3. NAVEGAÇÃO ENTRE ABAS ===
    const links = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.tab-content');
    const titleDisplay = document.getElementById('page-title');

    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            if (!targetId) return;

            links.forEach(l => l.classList.remove('active'));
            sections.forEach(s => {
                s.classList.remove('active');
                s.style.display = 'none'; 
            });

            this.classList.add('active');
            const targetSection = document.getElementById(`sec-${targetId}`);
            if (targetSection) {
                targetSection.classList.add('active');
                targetSection.style.display = 'block'; 
                if (titleDisplay) titleDisplay.innerText = this.innerText.trim();
            }

            // Carregamentos automáticos
            if (targetId === 'leads') carregarLeads();
            if (targetId === 'time') carregarDadosTime();
        });
    });

    // === 4. CÁLCULO DIAGNÓSTICO (PERT/CCPM) ===
    const btnCalculate = document.getElementById('btn-calculate-diag');
    if (btnCalculate) {
        btnCalculate.addEventListener('click', async () => {
            const rows = document.querySelectorAll('#task-body tr');
            const payload = { tasks: {} };

            rows.forEach(row => {
                const inputs = row.querySelectorAll('input');
                const id = inputs[0].value.trim();
                const desc = inputs[1].value.trim() || "Sem descrição";
                const predStr = inputs[2].value.trim();
                const o = parseFloat(inputs[3].value) || 0;
                const m = parseFloat(inputs[4].value) || 0;
                const p = parseFloat(inputs[5].value) || 0;

                if (id) {
                    payload.tasks[id] = {
                        desc: desc,
                        pred: predStr === "-" || predStr === "" ? [] : predStr.split(',').map(s => s.trim()),
                        O: o,
                        M: m,
                        P: p
                    };
                }
            });

            if (Object.keys(payload.tasks).length === 0) {
                alert("Adicione pelo menos uma tarefa para o cálculo.");
                return;
            }

            btnCalculate.innerHTML = '<i class="ph ph-spinner-gap"></i> Calculando...';
            btnCalculate.disabled = true;

            try {
                const res = await fetchSeguro('https://api-intern-platform.onrender.com/projects/1/diagnostic', {
                    method: 'PATCH',
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errorMsg = await res.json();
                    throw new Error(JSON.stringify(errorMsg.detail));
                }

                const data = await res.json();
                const pert = data.pert_classico.metricas_globais;
                const ccpm = data.corrente_critica.metricas_ccpm;

                document.getElementById('pert-total').innerText = `${pert.tempo_enxuto_horas} h`;
                document.getElementById('pert-safety').innerText = `${pert.margem_seguranca_horas} h`;
                document.getElementById('critical-path-text').innerText = data.pert_classico.caminho_critico.join(' -> ');
                document.getElementById('ccpm-meta').innerText = `${ccpm.tempo_agressivo_projeto_horas} h`;
                document.getElementById('ccpm-buffer').innerText = `${ccpm.project_buffer_horas} h`;
                document.getElementById('buffer-status').innerText = "Matematicamente Protegido";

            } catch (err) {
                console.error("Erro da API:", err);
                alert("O cálculo falhou.\nDetalhe: " + err.message);
            } finally {
                btnCalculate.innerHTML = '<i class="ph ph-calculator"></i> Gerar Diagnóstico';
                btnCalculate.disabled = false;
            }
        });
    }

    // === 5. ADICIONAR NOVA TAREFA NA MATRIZ ===
    const btnAddTask = document.getElementById('add-task-row');
    const taskBody = document.getElementById('task-body');

    if (btnAddTask && taskBody) {
        btnAddTask.addEventListener('click', (e) => {
            e.preventDefault(); 
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><input type="text" class="dark-input sm" placeholder="ID (Ex: E)"></td>
                <td><input type="text" class="dark-input" placeholder="Nova Tarefa"></td>
                <td><input type="text" class="dark-input sm" placeholder="-"></td>
                <td><input type="number" class="dark-input sm" placeholder="0"></td>
                <td><input type="number" class="dark-input sm" placeholder="0"></td>
                <td><input type="number" class="dark-input sm" placeholder="0"></td>
                <td>
                    <button type="button" class="btn-icon-danger" onclick="this.parentElement.parentElement.remove()">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>
            `;
            taskBody.appendChild(newRow);
        });
    }

    // === 6. MOTOR DE LEADS (CRIAR NOVO) ===
    const leadForm = document.getElementById('lead-form');
    if (leadForm) {
        leadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnSubmit = leadForm.querySelector('button[type="submit"]');
            if(btnSubmit) {
                btnSubmit.innerText = "Salvando...";
                btnSubmit.disabled = true;
            }

            const leadData = {
                name: document.getElementById('lead-name').value,
                cnpj: document.getElementById('lead-cnpj').value.replace(/\D/g, ''),
                status: "LEAD",
                contacts: Array.from(document.querySelectorAll('.contact-row')).map(row => ({
                    name: row.querySelector('.contact-name').value,
                    phone: row.querySelector('.contact-phone').value || "",
                    cargo: row.querySelector('.contact-cargo').value || ""
                }))
            };

            try {
                const res = await fetchSeguro('https://api-intern-platform.onrender.com/organizations/leads', {
                    method: 'POST',
                    body: JSON.stringify(leadData)
                });
                
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(JSON.stringify(err.detail || "Erro desconhecido"));
                }
                
                alert("Lead criado com sucesso no Banco de Dados!");
                closeModal('modal-lead');
                leadForm.reset();
                const contactsContainer = document.getElementById('contacts-container');
                if(contactsContainer) contactsContainer.innerHTML = ''; 
                
                carregarLeads(); 
                
            } catch (error) {
                alert("Falha na validação: " + error.message);
            } finally {
                if(btnSubmit) {
                    btnSubmit.innerText = "Salvar Organização";
                    btnSubmit.disabled = false;
                }
            }
        });
    }

});
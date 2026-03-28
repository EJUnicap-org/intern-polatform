document.addEventListener('DOMContentLoaded', () => {
    // === 0. PROTEÇÃO DE ACESSO (JWT) ===
    const token = localStorage.getItem('token_ej');
    
    // Se já tiver token, pula o login. Se não, mostra a tela de login.
    if (token) {
        entrarNoSistema();
    } else {
        exibirLogin();
    }

    // === 1. LÓGICA DE LOGIN (AUTENTICAÇÃO) ===
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

            // --- MODO DE TESTE (ACESSO REMOTO SIMULADO) ---
            // Login: admin@ejunicap.com | Senha: unicap2026
            if (email === "admin@ejunicap.com" && senha === "unicap2026") {
                setTimeout(() => {
                    localStorage.setItem('token_ej', 'token_teste_unicap_2026');
                    entrarNoSistema();
                    btn.innerText = "Acessar Sistema";
                    btn.disabled = false;
                }, 800); // Simula um pequeno delay de rede
                return;
            }
            // --- FIM DO MODO DE TESTE ---

            const corpo = new URLSearchParams();
            corpo.append('username', email);
            corpo.append('password', senha);

            try {
                const resposta = await fetch('http://localhost:8000/auth/login', { 
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
                alert("Erro ao conectar com a API oficial. Use o acesso de teste.");
            } finally {
                btn.innerText = "Acessar Sistema";
                btn.disabled = false;
            }
        });
    }

    // === 2. BOTÃO DE SAIR (LOGOUT) ===
    document.getElementById('btn-logout')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token_ej'); // Limpa o token conforme pedido no WhatsApp
        window.location.reload(); // Recarrega para voltar ao login
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

            // Carregamentos automáticos ao abrir a aba
            if (targetId === 'leads') carregarLeads();
            if (targetId === 'time') carregarDadosTime();
        });
    });

    // === 4. CÁLCULO DIAGNÓSTICO (PERT/CPM) ===
    const btnCalculate = document.getElementById('btn-calculate-diag');
    if (btnCalculate) {
        btnCalculate.addEventListener('click', () => {
            const rows = document.querySelectorAll('#task-body tr');
            let totalTime = 0;

            rows.forEach(row => {
                const inputs = row.querySelectorAll('input');
                const o = parseFloat(inputs[2]?.value) || 0;
                const m = parseFloat(inputs[3]?.value) || 0;
                const p = parseFloat(inputs[4]?.value) || 0;

                if (o || m || p) {
                    // Te = (O + 4M + P) / 6
                    totalTime += (o + (4 * m) + p) / 6;
                }
            });

            const displayTotal = document.getElementById('pert-total');
            if(displayTotal) displayTotal.innerText = `${totalTime.toFixed(1)} dias`;
            
            const meta = totalTime * 0.75;
            const metaDisplay = document.getElementById('ccpm-meta');
            const bufferDisplay = document.getElementById('ccpm-buffer');
            
            if(metaDisplay) metaDisplay.innerText = `${meta.toFixed(1)} dias`;
            if(bufferDisplay) bufferDisplay.innerText = `${(totalTime - meta).toFixed(1)} dias`;
        });
    }
});

// === FUNÇÕES AUXILIARES GLOBAIS ===

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

/**
 * Função Mestre para Requisições com Token (Segurança solicitada pelo time)
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

/**
 * Exemplo de uso do Fetch Seguro para carregar dados do time
 */
async function carregarDadosTime() {
    try {
        const res = await fetchSeguro('http://localhost:8000/team/status');
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
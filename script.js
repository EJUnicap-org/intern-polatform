document.addEventListener('DOMContentLoaded', () => {
    // === 1. NAVEGAÇÃO DE ABAS (Sistema de Troca de Telas) ===
    const links = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.tab-content');
    const titleDisplay = document.getElementById('page-title');

    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');

            // Limpa estados anteriores
            links.forEach(l => l.classList.remove('active'));
            sections.forEach(s => {
                s.classList.remove('active');
                s.style.display = 'none'; 
            });

            // Ativa nova aba
            this.classList.add('active');
            const targetSection = document.getElementById(`sec-${targetId}`);
            
            if (targetSection) {
                targetSection.classList.add('active');
                targetSection.style.display = 'block'; 
                if (titleDisplay) titleDisplay.innerText = this.innerText.trim();
            }

            // GATILHOS DE CARREGAMENTO (Backend)
            if (targetId === 'leads') carregarLeads();
            if (targetId === 'time') carregarDadosTime(); // O Back gera as pessoas aqui
        });
    });

    // === 2. RELÓGIOS DINÂMICOS ===
    setInterval(() => {
        const clocks = ['clock', 'ponto-clock'];
        clocks.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerText = new Date().toLocaleTimeString('pt-BR');
        });

        const dateDisplay = document.getElementById('ponto-date');
        if (dateDisplay) {
            dateDisplay.innerText = new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            });
        }
    }, 1000);

    // === 3. SUBMISSÃO DE FORMULÁRIOS PARA O BACKEND ===

    // Leads
    const leadForm = document.getElementById('lead-form');
    if (leadForm) {
        leadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const leadData = {
                name: document.getElementById('lead-name').value,
                cnpj: document.getElementById('lead-cnpj').value,
                contacts: Array.from(document.querySelectorAll('.contact-row')).map(row => ({
                    name: row.querySelector('.contact-name').value,
                    phone: row.querySelector('.contact-phone').value,
                    cargo: row.querySelector('.contact-cargo').value
                }))
            };
            console.log("POST /organizations/leads", leadData);
            alert("Lead enviado ao backend!");
            closeModal('modal-lead');
        });
    }

    // PSEL (Público) - Captura o que o candidato escreve
    const publicForm = document.getElementById('public-psel-form');
    if (publicForm) {
        publicForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(publicForm);
            const data = Object.fromEntries(formData.entries());
            
            // Captura as perguntas dinâmicas geradas pelo RH
            data.respostas_personalizadas = [];
            document.querySelectorAll('#dynamic-questions-area .input-group').forEach(group => {
                data.respostas_personalizadas.push({
                    pergunta: group.querySelector('label').innerText,
                    resposta: group.querySelector('input, textarea').value
                });
            });

            console.log("POST /psel/inscricao", data);
            alert("Sua inscrição foi enviada!");
            publicForm.reset();
        });
    }

    // Reembolsos
    const reembolsoForm = document.getElementById('reembolso-form');
    if (reembolsoForm) {
        reembolsoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                descricao: reembolsoForm.querySelector('input[type="text"]').value,
                valor: reembolsoForm.querySelector('input[type="number"]').value,
                categoria: reembolsoForm.querySelector('select').value
            };
            console.log("POST /financeiro/reembolso", data);
            alert("Solicitação registrada!");
            closeModal('modal-reembolso');
        });
    }
});

// === 4. FUNÇÕES DE INTEGRAÇÃO COM O BACKEND (VISÃO DO TIME) ===

async function carregarDadosTime() {
    const listBody = document.getElementById('team-status-list');
    if (!listBody) return;

    try {
        // Simulando a resposta do seu backend Python
        // const response = await fetch('http://localhost:8000/team/status');
        // const data = await response.json();
        
        const data = {
            ocupacao_geral: 75,
            membros: [
                { nome: "Ariel Dourado", atividade: "Frontend Dashboard", status: "Ativo", iniciais: "AD" },
                { nome: "Maria Clara", atividade: "API Reembolsos", status: "Ativo", iniciais: "MC" },
                { nome: "Lucas Silva", atividade: "Almoço", status: "Away", iniciais: "LS" }
            ]
        };

        // Limpa e gera as pessoas dinamicamente
        listBody.innerHTML = data.membros.map(m => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="avatar-mini">${m.iniciais}</div>
                        ${m.nome}
                    </div>
                </td>
                <td class="dim">${m.atividade}</td>
                <td><span class="status-badge ${m.status === 'Ativo' ? 'status-lead' : 'status-away'}">${m.status}</span></td>
            </tr>
        `).join('');

        // Atualiza o gráfico circular do seu CSS
        const chart = document.getElementById('team-occupancy-chart');
        if (chart) {
            chart.style.background = `conic-gradient(var(--primary) ${data.ocupacao_geral}%, var(--border) 0deg)`;
            document.getElementById('occupancy-percent').innerText = `${data.ocupacao_geral}%`;
        }

    } catch (error) {
        console.error("Erro ao buscar dados do time:", error);
    }
}

// === 5. HELPERS DE UI ===

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function addQuestionField() {
    const container = document.getElementById('questions-container');
    const div = document.createElement('div');
    div.className = 'form-section';
    div.innerHTML = `
        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <input type="text" placeholder="Título da Pergunta" class="dark-input" style="flex: 1" required>
            <select class="dark-input" style="width: 120px">
                <option value="text">Curta</option>
                <option value="textarea">Longa</option>
            </select>
            <button type="button" class="btn-remove" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    container.appendChild(div);
}
async function carregarDadosTime() {
    const token = localStorage.getItem('access_token');
    
    try {
        // Chamada real ao seu backend Python/FastAPI
        const response = await fetch('http://localhost:8000/team/status', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json(); 

        /* O seu backend deve retornar algo como:
           {
             "porcentagem_geral": 75,
             "total_membros": 24,
             "membros": [
                {"nome": "Ariel", "atividade": "Revisão de Contrato", "status": "Ativo", "iniciais": "AR"},
                ...
             ]
           }
        */

        // 1. Renderiza a Tabela de pessoas gerada pelo Back
        const listBody = document.getElementById('team-status-list');
        listBody.innerHTML = data.membros.map(m => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="avatar-mini">${m.iniciais}</div>
                        ${m.nome}
                    </div>
                </td>
                <td class="dim">${m.atividade}</td>
                <td><span class="status-badge ${m.status === 'Ativo' ? 'status-lead' : 'status-away'}">${m.status}</span></td>
            </tr>
        `).join('');

        // 2. Atualiza o Gráfico com o cálculo vindo do Back
        const chart = document.getElementById('team-occupancy-chart');
        const percentText = document.getElementById('occupancy-percent');
        
        chart.style.background = `conic-gradient(var(--primary) ${data.porcentagem_geral}%, #27272a 0deg)`;
        percentText.innerText = `${data.porcentagem_geral}%`;

    } catch (error) {
        console.error("Erro ao carregar dados do time:", error);
    }
}
// Listener para o formulário de Reembolso
const reembolsoForm = document.getElementById('reembolso-form');

if (reembolsoForm) {
    reembolsoForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Usamos FormData porque há um arquivo (comprovante) envolvido
        const formData = new FormData(reembolsoForm);

        console.log("Enviando solicitação de reembolso...");

        try {
            const response = await fetch('http://localhost:8000/financeiro/reembolsos', {
                method: 'POST',
                // Não definimos Content-Type aqui; o navegador faz isso automaticamente para FormData
                body: formData
            });

            if (response.ok) {
                alert("Solicitação enviada! Aguarde a aprovação.");
                closeModal('modal-reembolso');
                reembolsoForm.reset();
                // Opcional: recarregar a lista de reembolsos
            } else {
                alert("Erro ao enviar solicitação.");
            }
        } catch (error) {
            console.error("Erro de conexão:", error);
        }
    });
}
document.getElementById('file-reembolso').addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || "Clique para anexar";
    document.getElementById('file-name-display').innerText = fileName;
});
async function enviarReembolso(event) {
    event.preventDefault();
    
    const form = event.target;
    const fileInput = document.getElementById('file-reembolso');
    const file = fileInput.files[0];

    if (!file) {
        alert("Por favor, selecione um comprovante.");
        return;
    }

    // 1. Preparar os dados para o Schema ReimbursementCreate
    const dadosReembolso = {
        title: document.getElementById('ref-title').value,
        description: document.getElementById('ref-description').value,
        category: document.getElementById('ref-category').value,
        value: parseFloat(document.getElementById('ref-value').value),
        pix_key: document.getElementById('ref-pix').value,
        file_extension: `.${file.name.split('.').pop()}` // Ex: .png
    };

    try {
        // 2. Chamar o seu Backend (Cria o registro e pega a URL de upload)
        const response = await fetch('/api/reimbursements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosReembolso)
        });

        if (!response.ok) throw new Error('Erro ao criar solicitação');

        const { reimbursement, presigned_url } = await response.json();

        // 3. Upload do arquivo para a URL pré-assinada (Método PUT como no seu Schema)
        const uploadRes = await fetch(presigned_url.upload_url, {
            method: presigned_url.method, // "PUT"
            body: file,
            headers: { 'Content-Type': file.type }
        });

        if (uploadRes.ok) {
            alert("Reembolso enviado com sucesso!");
            closeModal('modal-reembolso');
            form.reset();
            // Aqui você chamaria uma função para atualizar a tabela na tela
        }

    } catch (error) {
        console.error(error);
        alert("Falha ao processar reembolso.");
    }
}

// Vincula o evento ao formulário
document.getElementById('reembolso-form').addEventListener('submit', enviarReembolso);

// Listener para mostrar o nome do arquivo selecionado
document.getElementById('file-reembolso').addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || "Clique para anexar";
    document.getElementById('file-name-display').innerText = fileName;
});
async function carregarTabelaReembolsos() {
    const tabelaBody = document.querySelector('.table tbody');
    
    try {
        // Busca os dados da sua rota GET de reembolsos
        const response = await fetch('/api/reimbursements');
        const reembolsos = await response.json(); // Lista de ReimbursementResponse

        // Se não houver dados, mantém a mensagem de vazio
        if (reembolsos.length === 0) {
            tabelaBody.innerHTML = '<tr><td colspan="3" style="text-align:center">Nenhuma solicitação encontrada.</td></tr>';
            return;
        }

        // Limpa a tabela e popula com os dados novos
        tabelaBody.innerHTML = ''; 

        reembolsos.forEach(item => {
            const dataFormatada = new Date(item.date_time).toLocaleDateString('pt-BR');
            const valorFormatado = parseFloat(item.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            const row = `
                <tr>
                    <td>
                        <div style="display: flex; flex-direction: column;">
                            <strong>${item.title}</strong>
                            <span class="dim" style="font-size: 12px;">${dataFormatada}</span>
                        </div>
                    </td>
                    <td>${valorFormatado}</td>
                    <td>
                        <span class="status-badge status-${item.status.toLowerCase()}">
                            ${item.status}
                        </span>
                    </td>
                </tr>
            `;
            tabelaBody.innerHTML += row;
        });

    } catch (error) {
        console.error("Erro ao carregar tabela:", error);
    }
}

// Chama a função assim que a página carregar
document.addEventListener('DOMContentLoaded', carregarTabelaReembolsos);

// 1. Alternar entre Reembolsos e Faltas
function showTab(tabName) {
    document.querySelectorAll('.dashboard-section').forEach(s => s.style.display = 'none');
    document.getElementById(`aba-${tabName}`).style.display = 'block';
}

// 2. Feedback do nome do arquivo
document.getElementById('file-abs').addEventListener('change', function(e) {
    const name = e.target.files[0]?.name || "Clique para subir o arquivo";
    document.getElementById('abs-file-display').innerText = name;
});

// 3. Enviar Justificativa (Seguindo a lógica do Reembolso)
document.getElementById('falta-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('file-abs').files[0];
    
    const payload = {
        date_absent: document.getElementById('abs-date').value,
        reason: document.getElementById('abs-reason').value,
        description: document.getElementById('abs-desc').value,
        file_extension: `.${file.name.split('.').pop()}`
    };

    // Aqui você faria o fetch para /api/absences igual fizemos no reembolso
    console.log("Enviando Falta:", payload);
    alert("Justificativa enviada! Agora o back processa a URL do arquivo.");
    closeModal('modal-falta');
});
async function carregarTabelaFaltas() {
    const tbody = document.getElementById('tabela-faltas-body');
    if (!tbody) return;

    try {
        // Exemplo de chamada ao back
        // const response = await fetch('/api/absences');
        // const faltas = await response.json();

        // Simulando dados para teste
        const faltas = []; 

        if (faltas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;" class="dim">Nenhuma falta registrada.</td></tr>';
            return;
        }

        tbody.innerHTML = faltas.map(f => `
            <tr>
                <td>${new Date(f.date_absent).toLocaleDateString('pt-BR')}</td>
                <td><strong>${f.reason}</strong></td>
                <td><span class="status-badge status-${f.status.toLowerCase()}">${f.status}</span></td>
            </tr>
        `).join('');

    } catch (error) {
        console.error("Erro ao carregar faltas:", error);
    }
}
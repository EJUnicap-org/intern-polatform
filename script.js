document.addEventListener('DOMContentLoaded', () => {
    // === 1. NAVEGAÇÃO DE ABAS ===
    const links = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.tab-content');
    const titleDisplay = document.getElementById('page-title');

    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            
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

            if (targetId === 'leads') carregarLeads();
            if (targetId === 'time') carregarDadosTime();
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

    // === 3. REEMBOLSOS E FALTAS ===
    const reembolsoForm = document.getElementById('reembolso-form');
    if (reembolsoForm) {
        reembolsoForm.addEventListener('submit', enviarReembolso);
    }

    const fileReembolso = document.getElementById('file-reembolso');
    if (fileReembolso) {
        fileReembolso.addEventListener('change', (e) => {
            const name = e.target.files[0]?.name || "Clique para anexar";
            document.getElementById('file-name-display').innerText = name;
        });
    }

    carregarTabelaReembolsos();
    carregarTabelaFaltas();

    // === 4. DIAGNÓSTICO (PERT/CPM) ===
    const btnAddTask = document.getElementById('add-task-row');
    const taskBody = document.getElementById('task-body');

    if (btnAddTask && taskBody) {
        btnAddTask.addEventListener('click', () => {
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><input type="text" class="dark-input sm" placeholder="ID"></td>
                <td><input type="text" class="dark-input sm" placeholder="-"></td>
                <td><input type="number" class="dark-input sm" placeholder="0"></td>
                <td><input type="number" class="dark-input sm" placeholder="0"></td>
                <td><input type="number" class="dark-input sm" placeholder="0"></td>
                <td>
                    <button class="btn-icon-danger" onclick="this.parentElement.parentElement.remove()">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>`;
            taskBody.appendChild(newRow);
        });
    }

    const btnCalculate = document.getElementById('btn-calculate-diag');
    if (btnCalculate) {
        btnCalculate.addEventListener('click', calcularPertCPM);
    }

    const btnPdf = document.getElementById('btn-pdf-diag');
    if (btnPdf) {
        btnPdf.addEventListener('click', () => {
            if (document.getElementById('pert-total').innerText === "-- dias") {
                alert("Gere o diagnóstico antes de imprimir!");
                return;
            }
            window.print();
        });
    }
});

// === FUNÇÕES DE APOIO (LÓGICA FORA DO DOM) ===

async function enviarReembolso(event) {
    event.preventDefault();
    const file = document.getElementById('file-reembolso').files[0];
    if (!file) return alert("Anexe o comprovante!");

    const dados = {
        title: document.getElementById('ref-title').value,
        description: document.getElementById('ref-description').value,
        category: document.getElementById('ref-category').value,
        value: parseFloat(document.getElementById('ref-value').value),
        pix_key: document.getElementById('ref-pix').value,
        file_extension: `.${file.name.split('.').pop()}`
    };

    try {
        const res = await fetch('/api/reimbursements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        const { presigned_url } = await res.json();
        
        await fetch(presigned_url.upload_url, {
            method: presigned_url.method,
            body: file,
            headers: { 'Content-Type': file.type }
        });

        alert("Sucesso!");
        closeModal('modal-reembolso');
        event.target.reset();
        carregarTabelaReembolsos();
    } catch (err) { console.error(err); }
}

function calcularPertCPM() {
    const rows = document.querySelectorAll('#task-body tr');
    let totalTime = 0;
    let totalVar = 0;

    rows.forEach(row => {
        const v = Array.from(row.querySelectorAll('input')).map(i => parseFloat(i.value) || 0);
        if (v[2] || v[3] || v[4]) {
            totalTime += (v[2] + (4 * v[3]) + v[4]) / 6;
            totalVar += Math.pow((v[4] - v[2]) / 6, 2);
        }
    });

    document.getElementById('pert-total').innerText = `${totalTime.toFixed(1)} dias`;
    document.getElementById('pert-safety').innerText = totalVar.toFixed(2);
    
    const meta = totalTime * 0.75;
    document.getElementById('ccpm-meta').innerText = `${meta.toFixed(1)} dias`;
    document.getElementById('ccpm-buffer').innerText = `${(totalTime - meta).toFixed(1)} dias`;
    document.getElementById('buffer-fill').style.width = '100%';
    document.getElementById('buffer-status').innerText = "Estável";
}

async function carregarDadosTime() {
    const token = localStorage.getItem('access_token');
    const list = document.getElementById('team-status-list');
    if (!token || !list) return;

    try {
        const res = await fetch('http://localhost:8000/team/status', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        list.innerHTML = data.membros.map(m => `
            <tr>
                <td><div style="display:flex;align-items:center;gap:10px">
                    <div class="avatar-mini">${m.iniciais}</div>${m.nome}
                </div></td>
                <td class="dim">${m.atividade}</td>
                <td><span class="status-badge ${m.status === 'Ativo' ? 'status-lead' : 'status-away'}">${m.status}</span></td>
            </tr>`).join('');
        
        document.getElementById('team-occupancy-chart').style.background = `conic-gradient(var(--primary) ${data.porcentagem_geral}%, #27272a 0deg)`;
        document.getElementById('occupancy-percent').innerText = `${data.porcentagem_geral}%`;
    } catch (e) { console.error(e); }
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
// Funções carregarTabelaReembolsos/Faltas permanecem como as anteriores
# Dashboard de Gestão Interna - EJ Unicap

Uma interface administrativa de página única (SPA) moderna, construída para centralizar a operação da EJ Unicap. O sistema gerencia projetos, precificação comercial, recursos humanos, compliance e fluxos financeiros.

## 🛠 Tecnologias e Estrutura

Construído sem frameworks pesados para garantir alta performance e fácil manutenção.
- **Frontend:** HTML5, CSS3 (Dark Mode Nativo com CSS Variables), Vanilla JavaScript.
- **Ícones:** Phosphor Icons.
- **Integração:** Fetch API consumindo um back-end em FastAPI.

A arquitetura de arquivos é plana (Flat Structure):
\`\`\`text
projeto-ej-unicap/
├── index.html          # Estrutura principal da aplicação (Módulos e Modais)
├── script.js           # Lógica de negócio, chamadas de API e manipulação de DOM
├── style.css           # Estilização completa e responsividade
├── LICENSE             # Licença do projeto
└── README.md           # Documentação técnica
\`\`\`

## ⚙️ Instalação e Execução

1. Clone este repositório.
2. Não há necessidade de `npm install`. O projeto roda nativamente no navegador.
3. Utilize uma extensão de servidor local (ex: **Live Server** no VS Code) para evitar bloqueios de CORS ao abrir o arquivo `index.html`.
4. Garanta que a API (FastAPI) esteja rodando na porta `8000`. A constante `API_BASE_URL` no `script.js` detecta automaticamente se o ambiente é `localhost` ou produção.

## 🔐 Autenticação e Segurança

O sistema utiliza arquitetura baseada em **JWT (JSON Web Token)** acoplada a níveis de acesso (Role-Based Access Control).
- **Token:** Salvo via `localStorage.getItem('token_ej')`.
- **Injeção:** Todas as requisições autenticadas interceptam e anexam o cabeçalho `Authorization: Bearer <token>`.
- **Cargos (Roles):** A renderização da interface se adapta dinamicamente caso o payload do JWT acuse níveis de `ADMIN`, `MANAGER`, `PC` ou `CONSULTANT`.

## 🚀 Módulos do Sistema

### 1. Visão Individual & Ponto Eletrônico
- Gestão diária de tarefas delegadas.
- Relógio de ponto em tempo real. Barra de progresso baseada na meta semanal de **20 horas**.
- Fluxo de solicitação e justificativa de faltas.

### 2. Visão do Time & Atribuição Rápida
- Sincronização em tempo real da carga de trabalho dos membros (Status: Livre ou Alocado).
- Cálculo visual (Gráfico Donut) da capacidade operacional da empresa.
- Modal de delegação rápida para tarefas operacionais internas.

### 3. Acompanhamento de Projetos & Diagnóstico PERT/CCPM
- Criação e monitoramento do ciclo de vida de projetos vinculados a Leads.
- Motor matemático para cálculo de estimativas de entrega baseado em:
  $$Te = \frac{O + 4M + P}{6}$$
- Cálculo de Corrente Crítica (CCPM) que isola agressivamente a margem de segurança e aplica um "Project Buffer".

### 4. Precificação Comercial
- Simulador orçamentário para geração de propostas comerciais.
- Calcula custos fixos (rateio da sede), horas de pessoal, custos diretos, insumos terceirizados e impostos projetados.
- Geração de Orçamentos em formato PDF diretamente na aplicação.

### 5. Gestão Financeira (Reembolsos)
- Envio de comprovantes de gastos operacionais via integração direta com **Cloudflare R2 (S3)**.
- O front-end negocia uma *Presigned URL* (`POST /files/upload-url`) e despacha o binário sem onerar o servidor principal.

### 6. P&C e Compliance (Apenas Diretoria)
- **Gestão de Acessos:** Delegação de credenciais, revogação de acessos e "Passagem de Bastão" (Alteração de cargo).
- **Compliance Histórico:** Aplicação de punições disciplinares (Warnings e Bandeiras Formais) integradas ao banco de dados.

## 📡 Principais Endpoints Consumidos

- `POST /auth/login` - Geração do JWT.
- `GET /auth/me` - Validação de sessão e carga primária de tarefas.
- `GET /users/workload` - Mapeamento da equipe e projetos ativos.
- `PATCH /users/{id}/role` - Transição de cargos administrativos.
- `POST /pricing/calculate` - Motor de simulação de lucros e markups.
- `POST /projects/{id}/tasks` - Delegação de tarefas para a equipe.
- `GET /clockins/summary` - Resumo do ponto (Sincronização do painel).

---
**Desenvolvido para a Empresa Júnior da UNICAP - 2026**
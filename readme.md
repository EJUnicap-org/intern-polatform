# Front-end Platform - EJ Unicap

Uma interface moderna e responsiva para gerenciamento de leads, reembolsos e produtividade, construída com JavaScript Vanilla, CSS3 (Dark Mode) e integração com FastAPI.

## Estrutura do Projeto
Você tem razão! Pela sua imagem, o seu projeto está com todos os arquivos na raiz (todos juntos na mesma pasta principal), sem subpastas como /js ou /css.

Vamos ajustar o README para refletir exatamente o que está no seu VS Code agora.

📄 Copie este código para o seu readme.md:
Markdown
# Front-end Platform - EJ Unicap

Uma interface moderna e responsiva para gerenciamento de leads, reembolsos e produtividade, construída com JavaScript Vanilla, CSS3 (Dark Mode) e integração com FastAPI.

## Estrutura do Projeto

projeto-ej-unicap/
├── index.html          # Estrutura principal da aplicação
├── script.js           # Toda a lógica JavaScript (PERT/CPM, API, DOM)
├── style.css           # Estilização completa e variáveis (Dark Mode)
├── LICENSE             # Licença do projeto
└── readme.md           # Documentação do projeto


## Instalação

1. Clone o repositório.
2. Certifique-se de ter um servidor local (Recomendado: **Live Server** do VS Code).
3. Abra o arquivo `index.html` no navegador através do servidor local.

## Configuração

Certifique-se de que o Back-end (FastAPI) está rodando em `http://localhost:8000`. 
Caso o endereço seja diferente, altere a constante `BASE_URL` no arquivo `js/api.js`.

## Funcionalidades Principais

### 1. Sistema de Diagnóstico (PERT/CPM)
Análise de prazos baseada na média ponderada:
$$Te = \frac{O + 4M + P}{6}$$
Inclui gestão de **Buffer (Pulmão)** de 25% para Corrente Crítica.

### 2. Gestão de Reembolsos
Upload de comprovantes via **Presigned URLs** e acompanhamento de status em tempo real.

### 3. Registro de Ponto
Monitoramento de metas semanais (20h) com cálculo automático de progresso:
$$\text{Percentual} = \left( \frac{\text{Horas Realizadas}}{\text{Meta Semanal}} \right) \times 100$$

## API Integration Endpoints

O front-end consome os seguintes serviços do back-end:
- `POST /auth/login` - Autenticação e armazenamento de token.
- `GET /team/status` - Dashboard de ocupação do time.
- `POST /api/reimbursements` - Registro de solicitações financeiras.
- `GET /leads` - Listagem e filtragem de leads.

## Desenvolvimento

A aplicação segue o padrão de **Componentização via DOM**:
- **Abas**: Navegação dinâmica sem recarregamento de página.
- **UI**: Uso extensivo de CSS Variables para fácil manutenção do tema.
- **Segurança**: Interceptadores de requisição para injetar o `Bearer Token` do LocalStorage.
- ## 🔐 Integração e Autenticação

O projeto utiliza **JWT (JSON Web Token)** para garantir que apenas membros da EJ Unicap acessem os dados internos.

* **Endpoint de Login:** `POST /auth/login`
* **Formato de Envio:** `application/x-www-form-urlencoded`
* **Fluxo de Autenticação:**
    1. O usuário insere `username` (e-mail) e `password`.
    2. O servidor retorna um `access_token`.
    3. O front-end armazena esse token e o envia em todas as requisições subsequentes no cabeçalho:
       `Authorization: Bearer <seu_token_aqui>`

## 📊 Regras de Negócio (Front-end)

### Módulo PERT/CPM
Implementado via JavaScript para calcular a estimativa de tempo realista:
$$Te = \frac{O + 4M + P}{6}$$
Onde $O$ é o tempo otimista, $M$ o provável e $P$ o pessimista. O sistema isola automaticamente **25% do tempo como Buffer (Pulmão)**.

### Aba Individual
Interface de uso diário que concentra a lista de tarefas alocadas, visualização de prazos via calendário e o registro de ponto semanal (meta de 4h).

---
**EJ Unicap - 2026**
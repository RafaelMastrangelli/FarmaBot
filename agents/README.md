# FarmaBot

> Chatbot de atendimento automatizado para farmácias via **WhatsApp**, com IA conversacional e **dashboard de métricas** em tempo real.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](WebApp/Metric-Dashboard-Farmacia/package.json)
![Stack](https://img.shields.io/badge/n8n-FF6D5A?logo=n8n&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

O **FarmaBot** funciona como um atendente virtual completo: o cliente conversa pelo WhatsApp, navega pelo catálogo, monta o carrinho, informa endereço e segue para o pagamento — com transferência para atendente humano quando necessário. Todas as interações podem ser monitoradas em um painel web com KPIs, pedidos, clientes e funil de conversão.

---

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| **Atendimento WhatsApp** | Recebimento e envio de mensagens via Z-API |
| **Máquina de estados** | Sessão por telefone com fluxo guiado de compra |
| **Catálogo** | 6 categorias e 14 produtos |
| **Carrinho e checkout** | Endereço, pagamento e confirmação de pedido |
| **IA conversacional** | Respostas dinâmicas com OpenAI GPT-4o-mini |
| **Handoff humano** | Alerta ao atendente com contexto da conversa |
| **Dashboard** | Visão geral, pedidos, clientes, atividade e funil |

---

## Arquitetura

```
 WhatsApp          n8n Workflow                    Dashboard
 (usuário)              │                    (React + Express)
     │                  │                              │
     ▼                  ▼                              ▼
┌─────────┐      ┌──────────────┐              ┌──────────────┐
│  Z-API  │─────▶│ Normaliza    │              │ POST /api/   │
│ webhook │      │ Sessão       │──métricas──▶│ metrics      │
└─────────┘      │ Máq. estados │              │              │
                 │ OpenAI       │              │ PostgreSQL   │
                 │ Envia Z-API  │              │ KPIs + SSE   │
                 └──────────────┘              └──────────────┘
```

Documentação detalhada: [docs/arquitetura.md](docs/arquitetura.md)

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Automação / Bot | n8n, JavaScript (Code nodes) |
| Canal | WhatsApp via Z-API |
| IA | OpenAI GPT-4o-mini |
| Sessões (bot) | n8n Static Data (in-memory, TTL 2h) |
| Dashboard API | Express 5, TypeScript, Drizzle ORM |
| Dashboard UI | React 18, Tailwind CSS, Radix UI, Recharts |
| Banco (métricas) | PostgreSQL 16 |
| Infra local | Docker Compose, ngrok |

---

## Estrutura do Projeto

```
Farmacia Bot/
├── FarmaBot - WhatsApp + OpenAI.json   # Workflow n8n (importar no editor)
├── README.md
├── start.ps1 / stop.ps1                # Sobe e para o ambiente local
├── test-bot.ps1                        # Simula mensagem WhatsApp no webhook
├── sync-metrics.ps1                    # Força envio de métricas ao dashboard
├── docs/                               # Documentação técnica
├── agents/                             # Agentes de IA para desenvolvimento
├── skills/                             # Skills Cursor para o projeto
└── WebApp/Metric-Dashboard-Farmacia/   # Dashboard de métricas
    ├── client/                         # Frontend React
    ├── server/                         # API Express
    ├── shared/                         # Schemas Drizzle
    └── docker-compose.yml              # PostgreSQL + dashboard
```

---

## Início Rápido

### Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Conta [Z-API](https://z-api.io/) com instância WhatsApp conectada
- Conta [OpenAI](https://platform.openai.com/) com API key
- [ngrok](https://ngrok.com/) (para expor o n8n local ao Z-API)
- n8n (subido automaticamente pelo script `start.ps1`)

### 1. Subir o ambiente local

```powershell
.\start.ps1
```

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| Dashboard | http://localhost:5000 | `admin` / `admin` |
| n8n | http://localhost:5678 | — |
| ngrok UI | http://127.0.0.1:4040 | copie a URL HTTPS para o Z-API |

### 2. Configurar o workflow n8n

1. Importe `FarmaBot - WhatsApp + OpenAI.json` no n8n
2. Configure credenciais Z-API e OpenAI nos nodes indicados
3. Aponte o webhook do Z-API para `https://<seu-ngrok>/webhook/whatsapp-farmacia`
4. Ative o node **"Envia ao WebApp"** apontando para `http://host.docker.internal:5000/api/metrics`
5. Ative o workflow

Guia completo: [docs/deploy.md](docs/deploy.md)

### 3. Testar o bot

```powershell
# Primeira vez: informe seu número WhatsApp (55 + DDD + número)
.\test-bot.ps1 -Phone "5531999887766" -Message "oi"

# Próximas vezes (usa .test-phone salvo)
.\test-bot.ps1 -Message "1"
```

### 4. Parar o ambiente

```powershell
.\stop.ps1
```

---

## Dashboard de Métricas

O dashboard recebe eventos do n8n via `POST /api/metrics` (header `x-api-key`) e persiste em PostgreSQL.

### Páginas

| Rota | Conteúdo |
|------|----------|
| `/` | Visão geral — KPIs, gráficos diários, funil |
| `/orders` | Pedidos concluídos e em andamento |
| `/customers` | Clientes atendidos e histórico |
| `/activity` | Feed de eventos em tempo real (SSE) |

### API principal

| Endpoint | Auth | Descrição |
|----------|------|-----------|
| `POST /api/metrics` | `x-api-key` | Ingestão de métricas (n8n) |
| `POST /api/auth/login` | — | Login do dashboard |
| `GET /api/stats` | sessão | KPIs agregados |
| `GET /api/orders` | sessão | Lista de pedidos |
| `GET /api/customers` | sessão | Lista de clientes |
| `GET /api/events/live` | sessão | Stream SSE de atividade |

PRD e especificação: [docs/PRD-dashboard-metricas.md](docs/PRD-dashboard-metricas.md)

---

## Fluxo do Bot (resumo)

1. Usuário envia mensagem no WhatsApp → Z-API dispara webhook
2. n8n normaliza payload, busca/cria sessão e classifica a rota
3. Máquina de estados processa catálogo, carrinho, endereço e pagamento
4. Resposta via OpenAI (dinâmica) ou texto fixo (menu/comandos)
5. Resposta enviada pelo Z-API; métricas registradas e enviadas ao dashboard
6. Se solicitado, alerta o atendente humano com contexto da conversa

Detalhes: [docs/maquina-de-estados.md](docs/maquina-de-estados.md) · [docs/fluxo-workflow.md](docs/fluxo-workflow.md)

---

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [docs/README.md](docs/README.md) | Índice da documentação técnica |
| [docs/arquitetura.md](docs/arquitetura.md) | Componentes e fluxo de dados |
| [docs/deploy.md](docs/deploy.md) | Deploy, credenciais e troubleshooting |
| [docs/integracoes.md](docs/integracoes.md) | Z-API, OpenAI e webhooks |
| [docs/catalogo-produtos.md](docs/catalogo-produtos.md) | Catálogo e regras de negócio |
| [agents/README.md](agents/README.md) | Agentes de IA para desenvolvimento |
| [skills/README.md](skills/README.md) | Skills Cursor do projeto |

---

## Scripts Úteis

| Script | Uso |
|--------|-----|
| `start.ps1` | Sobe dashboard, PostgreSQL, n8n e ngrok |
| `stop.ps1` | Para todos os serviços (preserva dados) |
| `test-bot.ps1` | Simula mensagem WhatsApp no webhook n8n |
| `sync-metrics.ps1` | Força reenvio de métricas acumuladas ao dashboard |

---

## Desenvolvimento com IA

O repositório inclui **agentes** e **skills** Cursor para acelerar evolução do bot, workflow n8n, integrações e dashboard. Consulte [agents/README.md](agents/README.md) para saber qual agente usar em cada tarefa.

---

## Licença

O dashboard (`WebApp/Metric-Dashboard-Farmacia`) está sob licença **MIT**. O workflow n8n e demais artefatos seguem uso do projeto conforme configurado pelo mantenedor.

---

## Autor

**Rafael Mastrangelli** — [GitHub](https://github.com/RafaelMastrangelli) · [LinkedIn](https://linkedin.com/in/rafael-mastrangelli-534472259)

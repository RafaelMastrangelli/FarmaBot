# PRD - Dashboard de Metricas do FarmaBot

## Resumo Executivo

Criar um WebApp (dashboard) hospedado no Replit que recebe metricas em tempo real do bot de farmacia WhatsApp (rodando em n8n) e exibe um painel completo de gestao com informacoes de vendas, atendimentos, desistencias, conversoes e atividade do bot.

---

## 1. Contexto e Problema

### Situacao Atual

O FarmaBot e um chatbot de atendimento automatizado para farmacia que roda no n8n. Ele atende clientes via WhatsApp, oferece catalogo de 14 produtos em 6 categorias, gerencia carrinho de compras, processa pedidos e suporta transferencia para atendente humano.

O bot ja coleta metricas internamente no n8n (Static Data in-memory), mas esses dados:
- Nao sao visiveis em nenhuma interface
- Se perdem quando o n8n reinicia
- Nao oferecem visualizacao historica
- Nao permitem tomada de decisao do dono da farmacia

### Integracao Ja Preparada

O workflow n8n ja possui um node chamado **"Envia ao WebApp"** (atualmente desabilitado) que esta pronto para enviar metricas via `POST` para um endpoint externo. Basta:
1. Criar o WebApp com o endpoint `POST /api/metrics`
2. Configurar autenticacao via header `x-api-key`
3. Ativar o node no n8n e apontar para a URL do Replit

### Oportunidade

Com o dashboard, o dono da farmacia pode acompanhar em tempo real o desempenho do bot, identificar gargalos no funil de vendas, monitorar desistencias e tomar decisoes baseadas em dados.

---

## 2. Stack Tecnica Recomendada

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Runtime | Node.js (ou Python/Flask) | Compativel com Replit, leve |
| Framework Web | Express.js | Simples, rapido para APIs + server-side rendering |
| Frontend | HTML + CSS + JavaScript vanilla (ou React) | Dashboard responsivo, graficos interativos |
| Graficos | Chart.js ou Recharts | Leve, sem dependencias pesadas, bem documentado |
| Banco de Dados | SQLite (via better-sqlite3) ou Replit DB | Persistencia leve, sem configuracao externa |
| Autenticacao | API Key no header + login simples com senha | Proteger dados sensiveis |
| Deploy | Replit (Always On) | Hospedagem gratuita/baixo custo, URL publica |

---

## 3. Arquitetura

```
+-------------------+         +----------------------------------+
|   n8n Workflow     |         |   Replit WebApp                  |
|                    |         |                                  |
|  Coleta Metricas   |---POST-->  POST /api/metrics              |
|  (a cada mensagem) |         |    |                             |
+-------------------+         |    v                             |
                               |  [Valida x-api-key]             |
                               |    |                             |
                               |    v                             |
                               |  [Salva no SQLite]              |
                               |    |                             |
                               |    v                             |
                               |  GET /dashboard  <-- Navegador  |
                               |  GET /api/stats                 |
                               |  GET /api/events                |
                               |  GET /api/daily                 |
                               |  GET /api/funnel                |
                               +----------------------------------+
```

---

## 4. API - Endpoints

### 4.1 Recebimento de Metricas (n8n -> WebApp)

**`POST /api/metrics`**

Header de autenticacao:
```
x-api-key: <CHAVE_CONFIGURAVEL>
```

Body (payload que o n8n ja envia):
```json
{
  "totalMensagens": 150,
  "totalSessoes": 30,
  "totalPedidos": 8,
  "receitaTotal": 245.60,
  "transferenciasHumano": 3,
  "taxaConversao": "26.7",
  "ticketMedio": "30.70",
  "geradoEm": "2026-02-25T10:30:00.000Z",
  "ultimosEventos": [
    {
      "id": "EVT-1740480600000",
      "timestamp": "2026-02-25T10:30:00.000Z",
      "phone": "5531999999999",
      "customerName": "Joao",
      "step": "PEDIDO_FINALIZADO",
      "orderId": "PED-1740480600000",
      "orderTotal": 23.70,
      "event": "PEDIDO_CRIADO"
    }
  ],
  "estatisticasDiarias": {
    "2026-02-25": {
      "mensagens": 45,
      "sessoes": 10,
      "pedidos": 3,
      "receita": 89.70,
      "transferencias": 1
    }
  }
}
```

Resposta esperada:
```json
{ "status": "ok", "saved": true }
```

### 4.2 Endpoints de Consulta (WebApp -> Dashboard)

| Endpoint | Descricao |
|---|---|
| `GET /api/stats` | KPIs consolidados (totais, medias, taxas) |
| `GET /api/stats/daily?from=YYYY-MM-DD&to=YYYY-MM-DD` | Estatisticas diarias no periodo |
| `GET /api/events?limit=50&type=PEDIDO_CRIADO` | Ultimos eventos com filtro por tipo |
| `GET /api/events/live` | SSE (Server-Sent Events) para atualizacao em tempo real |
| `GET /api/funnel` | Dados do funil de conversao |
| `GET /api/products/ranking` | Ranking de produtos mais vendidos |
| `GET /api/customers?limit=20` | Ultimos clientes ativos |

---

## 5. Telas do Dashboard

### 5.1 Tela Principal - Visao Geral

**Layout:** Header fixo + Grid de cards KPI + Graficos + Tabelas

#### Cards KPI (topo da pagina, 6 cards em linha)

| Card | Valor | Icone | Cor |
|---|---|---|---|
| Total de Mensagens | `totalMensagens` | Balao de chat | Azul |
| Sessoes Iniciadas | `totalSessoes` | Usuarios | Verde |
| Pedidos Realizados | `totalPedidos` | Carrinho | Verde escuro |
| Receita Total | `R$ receitaTotal` | Cifrao | Dourado |
| Taxa de Conversao | `taxaConversao%` | Funil | Laranja |
| Ticket Medio | `R$ ticketMedio` | Etiqueta | Roxo |

#### Graficos (corpo da pagina)

**Grafico 1 - Linha: Evolucao Diaria**
- Eixo X: Datas (ultimos 7/15/30 dias, selecionavel)
- Eixo Y: Multiplas series
  - Mensagens (azul)
  - Sessoes (verde)
  - Pedidos (verde escuro)
- Toggle para mostrar/esconder cada serie
- Fonte: `estatisticasDiarias`

**Grafico 2 - Linha: Receita Diaria**
- Eixo X: Datas
- Eixo Y: Valor em R$
- Area preenchida com gradiente
- Fonte: `estatisticasDiarias[dia].receita`

**Grafico 3 - Barra: Funil de Conversao**
- Barras horizontais mostrando:
  1. Sessoes iniciadas (100%)
  2. Navegou no catalogo (% que passou do MENU_PRINCIPAL)
  3. Adicionou ao carrinho (% que chegou em POS_ADICIONAR)
  4. Iniciou checkout (% que chegou em AGUARDANDO_ENDERECO)
  5. Pedido confirmado (% que chegou em PEDIDO_FINALIZADO)
  6. Desistiu / Transferiu para humano (% que saiu do funil)
- Cores degradando de verde (topo) para vermelho (queda)

**Grafico 4 - Pizza/Donut: Formas de Pagamento**
- Distribuicao dos pedidos por forma de pagamento
  - PIX
  - Cartao de Credito
  - Cartao de Debito
  - Dinheiro na entrega
- Com porcentagem e valor absoluto

**Grafico 5 - Barra Horizontal: Produtos Mais Vendidos**
- Top 10 produtos por quantidade vendida
- Exibir nome do produto + quantidade + receita gerada

### 5.2 Tela de Pedidos

**Tabela de pedidos com:**

| Coluna | Descricao |
|---|---|
| ID do Pedido | `PED-timestamp` |
| Data/Hora | Timestamp formatado |
| Cliente | Nome do cliente |
| Telefone | Numero mascarado (ex: 5531****7415) |
| Itens | Lista de produtos e quantidades |
| Subtotal | Valor dos produtos |
| Frete | R$ 5,90 |
| Desconto | Valor do desconto (se PIX) |
| Total | Valor final |
| Pagamento | Forma de pagamento |
| Status | Confirmado / Em preparo / Entregue |

**Filtros:**
- Periodo (data inicio - data fim)
- Forma de pagamento
- Faixa de valor
- Busca por nome ou telefone

**Acoes:**
- Exportar CSV
- Ver detalhes do pedido (modal)

### 5.3 Tela de Atividade em Tempo Real

**Feed de eventos ao vivo (Server-Sent Events):**

Cada evento exibido como card no feed:

| Tipo | Visual |
|---|---|
| `MENSAGEM` | Card cinza: "Joao enviou mensagem (MENU_PRINCIPAL)" |
| `PEDIDO_CRIADO` | Card verde: "Joao fez pedido PED-xxx - R$ 23,70" |
| `TRANSFERENCIA_HUMANO` | Card amarelo: "Maria solicitou atendente humano" |

**Informacoes adicionais no card:**
- Timestamp (ha X minutos)
- Nome do cliente
- Telefone mascarado
- Step atual da sessao

**Filtro por tipo de evento** (checkboxes para MENSAGEM, PEDIDO_CRIADO, TRANSFERENCIA_HUMANO)

### 5.4 Tela de Desistencias e Abandono

**Objetivo:** Entender onde os clientes desistem da compra.

**Grafico: Mapa de Calor de Abandono por Estado**
- Lista de estados da maquina como linhas
- Intensidade de cor baseada no numero de sessoes que terminaram naquele estado
- Estados criticos de abandono destacados em vermelho

**Tabela: Sessoes Abandonadas**

| Coluna | Descricao |
|---|---|
| Cliente | Nome |
| Telefone | Mascarado |
| Ultimo Estado | Step onde parou |
| Mensagens Enviadas | messageCount |
| Valor no Carrinho | Total dos cartItems (se houver) |
| Tempo na Sessao | lastInteraction - startedAt |
| Motivo Provavel | Classificacao automatica |

**Classificacao de Motivo:**
- `Apenas explorou` - parou em MENU_PRINCIPAL ou ESCOLHENDO_CATEGORIA
- `Desistiu na escolha` - parou em ESCOLHENDO_PRODUTO ou DETALHES_PRODUTO
- `Bloqueado por receita` - parou em AGUARDANDO_RECEITA
- `Abandonou carrinho` - parou em REVISANDO_CARRINHO, AGUARDANDO_ENDERECO ou ESCOLHENDO_PAGAMENTO
- `Cancelou no checkout` - cancelou em CONFIRMANDO_PEDIDO
- `Pediu atendente` - transferiu para AGUARDANDO_HUMANO

**KPIs de Desistencia:**
- Taxa de abandono de carrinho: sessoes que adicionaram item mas nao finalizaram
- Estado com maior abandono
- Valor perdido em carrinhos abandonados

### 5.5 Tela de Clientes

**Tabela de clientes unicos:**

| Coluna | Descricao |
|---|---|
| Nome | customerName |
| Telefone | Mascarado |
| Total de Sessoes | Quantas vezes conversou |
| Total de Pedidos | Quantos pedidos fez |
| Valor Total Gasto | Soma de orderTotal |
| Ultima Interacao | Data do ultimo contato |
| Status | Ativo / Inativo / Aguardando humano |

**Acoes:**
- Ver historico de eventos do cliente
- Ver pedidos do cliente

---

## 6. Modelo de Dados (SQLite)

### Tabela: `metrics_snapshots`

Armazena cada envio do n8n como snapshot para historico.

```sql
CREATE TABLE metrics_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  total_mensagens INTEGER,
  total_sessoes INTEGER,
  total_pedidos INTEGER,
  receita_total REAL,
  transferencias_humano INTEGER,
  taxa_conversao TEXT,
  ticket_medio TEXT,
  gerado_em TEXT,
  recebido_em TEXT DEFAULT (datetime('now'))
);
```

### Tabela: `events`

Armazena todos os eventos recebidos (sem o limite de 200 do n8n).

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  timestamp TEXT,
  phone TEXT,
  customer_name TEXT,
  step TEXT,
  order_id TEXT,
  order_total REAL,
  event_type TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Tabela: `daily_stats`

Estatisticas diarias persistidas.

```sql
CREATE TABLE daily_stats (
  date TEXT PRIMARY KEY,
  mensagens INTEGER DEFAULT 0,
  sessoes INTEGER DEFAULT 0,
  pedidos INTEGER DEFAULT 0,
  receita REAL DEFAULT 0,
  transferencias INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### Tabela: `orders`

Pedidos extraidos dos eventos para consulta rapida.

```sql
CREATE TABLE orders (
  order_id TEXT PRIMARY KEY,
  phone TEXT,
  customer_name TEXT,
  order_total REAL,
  payment_method TEXT,
  delivery_address TEXT,
  items_json TEXT,
  status TEXT DEFAULT 'CONFIRMADO',
  created_at TEXT
);
```

---

## 7. Autenticacao e Seguranca

### API (n8n -> WebApp)
- Header `x-api-key` com chave de pelo menos 32 caracteres
- Rejeitar requests sem a chave com status `401 Unauthorized`
- Rate limit: maximo 60 requests por minuto (1 por segundo)

### Dashboard (Navegador)
- Login simples com usuario e senha
- Senha armazenada com hash bcrypt
- Sessao via cookie HTTP-only com expiracao de 24h
- Pagina de login como tela inicial; dashboard so acessivel apos autenticacao
- Usuario padrao configuravel via variavel de ambiente

### Dados Sensiveis
- Telefones mascarados no dashboard (ex: 5531****7415)
- Nenhuma credencial de API exibida na interface
- CORS restrito ao dominio do Replit

---

## 8. Variaveis de Ambiente (Replit Secrets)

| Variavel | Descricao | Exemplo |
|---|---|---|
| `API_KEY` | Chave para autenticar requests do n8n | `your-api-key-min-32-chars` |
| `DASHBOARD_USER` | Usuario de login do dashboard | `admin` |
| `DASHBOARD_PASSWORD` | Senha de login do dashboard | `change-me-in-production` |
| `PORT` | Porta do servidor | `3000` |
| `SESSION_SECRET` | Secret para cookies de sessao | `generate-a-random-64-char-string` |

---

## 9. Integracao com o n8n

### Ativar o envio de metricas no n8n

Apos o WebApp estar rodando no Replit:

1. Abrir o workflow no editor n8n
2. No node **"Envia ao WebApp (Desabilitado ate ficar pronto)"**:
   - Substituir URL `https://SEU-WEBAPP.replit.app/api/metrics` pela URL real do Replit
   - Substituir `COLOQUE_SUA_API_KEY_AQUI` pela API key configurada no Replit
   - Habilitar o node (clicar com botao direito > Enable)
3. Salvar o workflow
4. Testar enviando uma mensagem no WhatsApp e verificar se o dashboard atualiza

### Payload de Referencia

O node "Coleta Metricas" do n8n monta o objeto `metricsPayload` com esta estrutura:

```json
{
  "totalMensagens": 150,
  "totalSessoes": 30,
  "totalPedidos": 8,
  "receitaTotal": 245.60,
  "transferenciasHumano": 3,
  "taxaConversao": "26.7",
  "ticketMedio": "30.70",
  "geradoEm": "2026-02-25T10:30:00.000Z",
  "ultimosEventos": [
    {
      "id": "EVT-1740480600000",
      "timestamp": "2026-02-25T10:30:00.000Z",
      "phone": "5531999999999",
      "customerName": "Joao",
      "step": "MENU_PRINCIPAL",
      "orderId": null,
      "orderTotal": null,
      "event": "MENSAGEM"
    }
  ],
  "estatisticasDiarias": {
    "2026-02-25": {
      "mensagens": 45,
      "sessoes": 10,
      "pedidos": 3,
      "receita": 89.70,
      "transferencias": 1
    }
  }
}
```

---

## 10. Requisitos Nao-Funcionais

| Requisito | Criterio |
|---|---|
| Performance | Dashboard deve carregar em menos de 3 segundos |
| Disponibilidade | Replit Always On (99%+ uptime) |
| Responsividade | Layout funcional em desktop e mobile |
| Retencao de dados | Minimo 90 dias de historico |
| Atualizacao | Dados atualizados a cada mensagem recebida no bot (tempo real) |
| Compatibilidade | Chrome, Firefox, Safari, Edge (ultimas 2 versoes) |
| Tema | Dark mode como padrao, com toggle para light mode |

---

## 11. Criterios de Aceite

### MVP (Versao 1.0)

- [ ] Endpoint `POST /api/metrics` recebe e persiste dados do n8n
- [ ] Autenticacao via `x-api-key` funcionando
- [ ] Login com usuario/senha no dashboard
- [ ] 6 cards de KPI exibidos corretamente na tela principal
- [ ] Grafico de evolucao diaria (mensagens, sessoes, pedidos)
- [ ] Grafico de receita diaria
- [ ] Grafico de funil de conversao
- [ ] Tabela de ultimos eventos com filtro por tipo
- [ ] Tabela de pedidos com filtros e exportacao CSV
- [ ] Tela de desistencias com classificacao de motivo
- [ ] Dados persistidos em SQLite (sobrevivem a reinicio)
- [ ] Layout responsivo (desktop + mobile)
- [ ] Telefones mascarados em todas as telas

### Nice-to-Have (Versao 1.1)

- [ ] Atualizacao em tempo real via SSE (sem precisar dar refresh)
- [ ] Grafico de pizza com formas de pagamento
- [ ] Ranking de produtos mais vendidos
- [ ] Tela de clientes com historico individual
- [ ] Dark mode / Light mode toggle
- [ ] Notificacao sonora para novos pedidos
- [ ] Exportacao de relatorio PDF
- [ ] Comparativo periodo-sobre-periodo (esta semana vs semana passada)

---

## 12. Estrutura de Arquivos Sugerida (Replit)

```
/
├── server.js                 # Express server principal
├── package.json
├── .env                      # Variaveis de ambiente (Replit Secrets)
├── database/
│   ├── db.js                 # Conexao e setup SQLite
│   └── schema.sql            # DDL das tabelas
├── routes/
│   ├── api.js                # Endpoints de API (POST metrics, GET stats)
│   ├── auth.js               # Login/logout
│   └── dashboard.js          # Rotas de paginas HTML
├── middleware/
│   ├── apiAuth.js            # Validacao x-api-key
│   └── sessionAuth.js        # Validacao de sessao do dashboard
├── services/
│   ├── metricsService.js     # Logica de processamento de metricas
│   ├── eventsService.js      # CRUD de eventos
│   └── statsService.js       # Calculos e agregacoes
├── public/
│   ├── css/
│   │   └── style.css         # Estilos do dashboard
│   ├── js/
│   │   ├── dashboard.js      # Logica do dashboard principal
│   │   ├── charts.js         # Configuracao dos graficos Chart.js
│   │   ├── orders.js         # Logica da tela de pedidos
│   │   ├── funnel.js         # Logica do funil
│   │   └── realtime.js       # Conexao SSE para tempo real
│   └── img/
│       └── logo.png
└── views/
    ├── login.html
    ├── dashboard.html         # Tela principal com KPIs e graficos
    ├── orders.html            # Tela de pedidos
    ├── activity.html          # Feed de atividade em tempo real
    ├── dropoff.html           # Tela de desistencias
    └── customers.html         # Tela de clientes
```

---

## 13. Cronograma Sugerido

| Fase | Entregaveis | Prioridade |
|---|---|---|
| 1 - Backend | Servidor Express, SQLite, endpoint POST /api/metrics, autenticacao API key | Obrigatorio |
| 2 - Dashboard Base | Login, tela principal com 6 KPIs, grafico de evolucao diaria | Obrigatorio |
| 3 - Graficos | Funil de conversao, receita diaria, formas de pagamento | Obrigatorio |
| 4 - Pedidos | Tabela de pedidos, filtros, detalhes, exportacao CSV | Obrigatorio |
| 5 - Desistencias | Tela de abandono, classificacao de motivo, mapa de calor | Obrigatorio |
| 6 - Tempo Real | SSE, feed de atividade, notificacoes | Nice-to-have |
| 7 - Clientes | Tela de clientes, historico individual | Nice-to-have |
| 8 - Polish | Dark mode, responsividade mobile, PDF export | Nice-to-have |

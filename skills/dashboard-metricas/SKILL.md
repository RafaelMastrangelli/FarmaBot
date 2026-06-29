---
name: dashboard-metricas
description: Desenvolver o dashboard de metricas do FarmaBot. Usar quando precisar criar o webapp de metricas, implementar endpoints da API, definir schema SQLite, criar paginas do frontend, configurar Chart.js, integrar coleta de metricas do n8n, ou adicionar novas visualizacoes ao dashboard.
---

# Dashboard de Metricas - FarmaBot

## Arquitetura

```
n8n (Coleta Metricas) --POST--> Express.js API --SQLite--> Dashboard Frontend
                                     |
                                Chart.js + HTML/CSS
```

**Stack:** Replit + Node.js + Express.js + SQLite3 + Chart.js + HTML/CSS

## Schema SQLite

### Tabela: metrics_snapshots

Snapshots periodicos do estado do bot:

```sql
CREATE TABLE metrics_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  active_sessions INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  ai_messages INTEGER DEFAULT 0,
  direct_messages INTEGER DEFAULT 0,
  human_transfers INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  avg_response_time_ms REAL DEFAULT 0
);
```

### Tabela: events

Eventos individuais para analise detalhada:

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  event_type VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  state VARCHAR(50),
  metadata TEXT -- JSON string
);

CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_timestamp ON events(timestamp);
```

**event_type values:**
- `message_received` - mensagem recebida
- `message_sent` - mensagem enviada
- `ai_response` - resposta gerada pela IA
- `order_confirmed` - pedido confirmado
- `human_transfer` - transferencia para humano
- `session_created` - nova sessao
- `session_expired` - sessao expirada
- `error` - erro no processamento

### Tabela: daily_stats

Agregacoes diarias pre-calculadas:

```sql
CREATE TABLE daily_stats (
  date DATE PRIMARY KEY,
  total_messages INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  orders_total REAL DEFAULT 0,
  ai_usage_count INTEGER DEFAULT 0,
  human_transfers INTEGER DEFAULT 0,
  avg_response_time_ms REAL DEFAULT 0
);
```

### Tabela: orders

Pedidos confirmados:

```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id VARCHAR(20) UNIQUE,
  phone VARCHAR(20),
  customer_name VARCHAR(100),
  address TEXT,
  items TEXT, -- JSON array
  subtotal REAL,
  discount REAL DEFAULT 0,
  shipping REAL DEFAULT 5.90,
  total REAL,
  payment_method VARCHAR(20),
  status VARCHAR(20) DEFAULT 'confirmed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### POST /api/metrics (recebe snapshot do n8n)

```javascript
app.post('/api/metrics', authenticate, (req, res) => {
  const {
    active_sessions, total_messages, ai_messages,
    direct_messages, human_transfers, errors, avg_response_time_ms
  } = req.body;

  db.run(`INSERT INTO metrics_snapshots
    (active_sessions, total_messages, ai_messages, direct_messages,
     human_transfers, errors, avg_response_time_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [active_sessions, total_messages, ai_messages,
     direct_messages, human_transfers, errors, avg_response_time_ms],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});
```

### POST /api/events (registra evento individual)

```javascript
app.post('/api/events', authenticate, (req, res) => {
  const { event_type, phone, state, metadata } = req.body;

  db.run(`INSERT INTO events (event_type, phone, state, metadata)
    VALUES (?, ?, ?, ?)`,
    [event_type, phone, state, JSON.stringify(metadata || {})],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});
```

### POST /api/orders (registra pedido)

```javascript
app.post('/api/orders', authenticate, (req, res) => {
  const { order_id, phone, customer_name, address, items,
          subtotal, discount, shipping, total, payment_method } = req.body;

  db.run(`INSERT INTO orders
    (order_id, phone, customer_name, address, items,
     subtotal, discount, shipping, total, payment_method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [order_id, phone, customer_name, address, JSON.stringify(items),
     subtotal, discount, shipping, total, payment_method],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});
```

### GET /api/stats/today (metricas do dia)

```javascript
app.get('/api/stats/today', authenticate, (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  db.get(`SELECT * FROM daily_stats WHERE date = ?`, [today], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || {
      date: today, total_messages: 0, unique_users: 0,
      orders_count: 0, orders_total: 0
    });
  });
});
```

### GET /api/stats/range?start=YYYY-MM-DD&end=YYYY-MM-DD

```javascript
app.get('/api/stats/range', authenticate, (req, res) => {
  const { start, end } = req.query;

  db.all(`SELECT * FROM daily_stats WHERE date BETWEEN ? AND ? ORDER BY date`,
    [start, end], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});
```

### GET /api/orders/recent?limit=20

```javascript
app.get('/api/orders/recent', authenticate, (req, res) => {
  const limit = parseInt(req.query.limit) || 20;

  db.all(`SELECT * FROM orders ORDER BY created_at DESC LIMIT ?`,
    [limit], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});
```

## Integracao n8n -> Dashboard

### Payload de Metricas (node "Coleta Metricas")

```javascript
const data = $input.first().json;
const staticData = $getWorkflowStaticData('global');
const sessions = staticData.sessions || {};
const metrics = staticData.metrics || {
  totalMessages: 0, aiMessages: 0, directMessages: 0,
  humanTransfers: 0, errors: 0, orders: 0
};

// Incrementar contadores
metrics.totalMessages++;
if (data.useAI) metrics.aiMessages++;
else metrics.directMessages++;
if (data.route === 'transferir_humano') metrics.humanTransfers++;

staticData.metrics = metrics;

const metricsPayload = {
  active_sessions: Object.values(sessions)
    .filter(s => Date.now() - s.ultimaInteracao < 7200000).length,
  total_messages: metrics.totalMessages,
  ai_messages: metrics.aiMessages,
  direct_messages: metrics.directMessages,
  human_transfers: metrics.humanTransfers,
  errors: metrics.errors,
  avg_response_time_ms: Date.now() - data.timestamp
};

return [{ json: { ...data, metricsPayload } }];
```

### Node "Envia ao WebApp" (HTTP Request)

```
POST https://farmacia-bot-dashboard.replit.app/api/metrics
Headers:
  Content-Type: application/json
  x-api-key: {{DASHBOARD_API_KEY}}
Body: {{ JSON.stringify($json.metricsPayload) }}
```

## Frontend (5 Paginas)

### 1. Dashboard Principal (`/`)

Cards de resumo + graficos:

```html
<div class="dashboard-grid">
  <div class="card" id="card-messages">
    <h3>Mensagens Hoje</h3>
    <span class="value" id="total-messages">0</span>
  </div>
  <div class="card" id="card-orders">
    <h3>Pedidos Hoje</h3>
    <span class="value" id="total-orders">0</span>
  </div>
  <div class="card" id="card-users">
    <h3>Usuarios Unicos</h3>
    <span class="value" id="unique-users">0</span>
  </div>
  <div class="card" id="card-revenue">
    <h3>Faturamento</h3>
    <span class="value" id="revenue">R$0,00</span>
  </div>
</div>
<canvas id="chart-messages-hourly"></canvas>
<canvas id="chart-ai-vs-direct"></canvas>
```

### 2. Pedidos (`/orders`)

Tabela de pedidos com filtros por data/status.

### 3. Conversas (`/conversations`)

Timeline de eventos por telefone.

### 4. Produtos (`/products`)

Ranking de produtos mais vendidos.

### 5. Configuracoes (`/settings`)

API keys, preferencias, export de dados.

## Chart.js - Configuracoes

### Grafico de Mensagens por Hora

```javascript
new Chart(ctx, {
  type: 'line',
  data: {
    labels: hours, // ['00h', '01h', ..., '23h']
    datasets: [{
      label: 'Mensagens',
      data: messageCounts,
      borderColor: '#4CAF50',
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
      fill: true,
      tension: 0.4
    }]
  },
  options: {
    responsive: true,
    plugins: { legend: { position: 'top' } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } }
    }
  }
});
```

### Grafico IA vs Direto (Pizza)

```javascript
new Chart(ctx, {
  type: 'doughnut',
  data: {
    labels: ['Resposta IA', 'Resposta Direta'],
    datasets: [{
      data: [aiCount, directCount],
      backgroundColor: ['#2196F3', '#FF9800']
    }]
  }
});
```

### Grafico de Faturamento Semanal

```javascript
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: weekDays, // ['Seg', 'Ter', 'Qua', ...]
    datasets: [{
      label: 'Faturamento (R$)',
      data: dailyRevenue,
      backgroundColor: '#4CAF50'
    }]
  }
});
```

## Autenticacao

### API (x-api-key)

```javascript
function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.DASHBOARD_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
```

### Frontend (Login simples)

```javascript
const bcrypt = require('bcryptjs');

app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  const isValid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!isValid) return res.status(401).json({ error: 'Invalid password' });

  const token = crypto.randomBytes(32).toString('hex');
  // Salvar token com TTL
  res.json({ token });
});
```

## Variaveis de Ambiente

```env
PORT=3000
DASHBOARD_API_KEY=chave-secreta-para-n8n
ADMIN_PASSWORD_HASH=$2a$10$...hash-bcrypt...
SQLITE_PATH=./data/farmacia-bot.db
NODE_ENV=production
```

## Estrutura de Arquivos do Dashboard

```
dashboard/
  server.js           # Express app + API routes
  database.js         # SQLite setup + migrations
  middleware/
    auth.js           # Autenticacao
  routes/
    metrics.js        # /api/metrics, /api/stats
    orders.js         # /api/orders
    events.js         # /api/events
  public/
    index.html        # Dashboard principal
    orders.html       # Pagina de pedidos
    css/
      style.css       # Estilos (dark theme)
    js/
      dashboard.js    # Logica frontend + Chart.js
      api.js          # Fetch wrapper
  data/
    farmacia-bot.db   # SQLite database
  package.json
```

## Checklist de Implementacao

1. [ ] Projeto Node.js inicializado com Express + SQLite3 + Chart.js
2. [ ] Schema SQLite criado (4 tabelas)
3. [ ] Endpoints API implementados (POST metrics, events, orders + GET stats)
4. [ ] Autenticacao x-api-key funcionando
5. [ ] Dashboard principal com 4 cards de resumo
6. [ ] Grafico de mensagens por hora (Chart.js line)
7. [ ] Grafico IA vs Direto (Chart.js doughnut)
8. [ ] Pagina de pedidos com tabela
9. [ ] n8n node "Coleta Metricas" enviando dados
10. [ ] n8n node "Envia ao WebApp" configurado
11. [ ] Login frontend com bcrypt
12. [ ] Deploy no Replit

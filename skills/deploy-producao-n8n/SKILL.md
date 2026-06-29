---
name: deploy-producao-n8n
description: Preparar e realizar deploy do FarmaBot para producao. Usar quando precisar migrar de Static Data para Redis/PostgreSQL, mover credentials para n8n Credentials Store, configurar HTTPS, adicionar rate limiting, configurar monitoramento, preparar backup, escalar o bot, ou resolver problemas de producao.
---

# Deploy em Producao - FarmaBot n8n

## Estado Atual vs Producao

| Aspecto | Atual (Dev) | Producao (Meta) |
|---|---|---|
| Sessoes | Static Data (memoria) | Redis / PostgreSQL |
| Credentials | Hardcoded nos nodes | n8n Credentials Store |
| HTTPS | HTTP local | HTTPS via reverse proxy |
| Monitoramento | Nenhum | Uptime + logs + alertas |
| Backup | Nenhum | Workflow JSON + DB |
| Rate Limiting | Nenhum | Throttle por telefone |
| Retry | Nenhum | Exponential backoff |

## Migracao de Sessoes: Static Data -> Redis

### Por que migrar

- Static Data vive em memoria, perde dados no restart do n8n
- Sem TTL automatico (limpeza manual com `Date.now() - 2h`)
- Sem compartilhamento entre instancias (nao escala)

### Opcao 1: Redis (recomendado)

**Instalar Redis:**
```bash
# Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Ou via docker-compose junto com n8n
```

**Node HTTP Request para Redis (via REST API):**

Usar um proxy HTTP para Redis (como Webdis) ou n8n community node `n8n-nodes-redis`.

**Padrao de sessao com Redis:**

```javascript
// LEITURA - substituir $getWorkflowStaticData
const redisKey = `session:${phone}`;
// Via HTTP Request node ao Redis/Webdis
// GET /GET/{redisKey}

// ESCRITA - substituir staticData.sessions[phone] = session
// Via HTTP Request node ao Redis/Webdis
// GET /SETEX/{redisKey}/7200/{JSON.stringify(session)}
// 7200 = 2 horas em segundos (TTL automatico!)
```

### Opcao 2: PostgreSQL (se ja usar com n8n)

```sql
CREATE TABLE bot_sessions (
  phone VARCHAR(20) PRIMARY KEY,
  session_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '2 hours'
);

CREATE INDEX idx_sessions_expires ON bot_sessions(expires_at);
```

```javascript
// Leitura via n8n PostgreSQL node
// SELECT session_data FROM bot_sessions WHERE phone = '{{phone}}' AND expires_at > NOW()

// Escrita via n8n PostgreSQL node
// INSERT INTO bot_sessions (phone, session_data, updated_at, expires_at)
// VALUES ('{{phone}}', '{{json}}', NOW(), NOW() + INTERVAL '2 hours')
// ON CONFLICT (phone) DO UPDATE SET session_data = EXCLUDED.session_data, updated_at = NOW(), expires_at = NOW() + INTERVAL '2 hours'
```

## Migracao de Credentials

### Passo a passo

1. **n8n Settings > Credentials > New Credential**
2. Criar credentials:

| Nome | Tipo | Campos |
|---|---|---|
| Z-API Farmacia | Header Auth | `client-token: {valor}` |
| OpenAI Farmacia | OpenAI API | `apiKey: {valor}` |

3. **Atualizar HTTP Request nodes:**
   - Remover headers hardcoded
   - Selecionar credential criada no dropdown
   - Testar conexao

4. **Variaveis de ambiente (alternativa):**
```env
ZAPI_INSTANCE_ID=xxxxx
ZAPI_TOKEN=xxxxx
ZAPI_CLIENT_TOKEN=xxxxx
OPENAI_API_KEY=sk-xxxxx
```

Referenciar no n8n:
```
{{ $env.ZAPI_INSTANCE_ID }}
{{ $env.OPENAI_API_KEY }}
```

## HTTPS via Reverse Proxy

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name bot.farmacia.com.br;

    ssl_certificate /etc/letsencrypt/live/bot.farmacia.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bot.farmacia.com.br/privkey.pem;

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Configuracao n8n para HTTPS

```env
N8N_HOST=bot.farmacia.com.br
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://bot.farmacia.com.br/
```

## Rate Limiting

### Implementacao no "Normaliza Mensagem"

```javascript
const data = $input.first().json;
const phone = (data.phone || '').replace('@c.us', '');
const staticData = $getWorkflowStaticData('global');

// Rate limiting: max 30 mensagens por minuto por telefone
const rateLimits = staticData.rateLimits || {};
const now = Date.now();
const windowMs = 60000; // 1 minuto

if (!rateLimits[phone]) {
  rateLimits[phone] = { count: 0, windowStart: now };
}

const rl = rateLimits[phone];
if (now - rl.windowStart > windowMs) {
  rl.count = 0;
  rl.windowStart = now;
}

rl.count++;
staticData.rateLimits = rateLimits;

if (rl.count > 30) {
  // Bloquear - retornar sem processar
  return [{
    json: {
      phone,
      blocked: true,
      finalMessage: 'Voce enviou muitas mensagens. Aguarde um momento. ⏳',
      route: 'rate_limited'
    }
  }];
}

// Continuar normalmente...
```

## Retry com Backoff

### Para chamadas Z-API

```javascript
// No node "Envia Mensagem Z-API" - ativar:
// Settings > Retry On Fail: true
// Max Tries: 3
// Wait Between Tries: 1000ms
// Backoff: true
```

### Para chamadas OpenAI (no Code node)

```javascript
const MAX_RETRIES = 2;
const BASE_DELAY = 1000;

for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
  try {
    // Chamada OpenAI via $helpers ou HTTP
    const response = await $helpers.httpRequest({
      method: 'POST',
      url: 'https://api.openai.com/v1/chat/completions',
      headers: { 'Authorization': `Bearer ${$env.OPENAI_API_KEY}` },
      body: { model: 'gpt-4o-mini', messages, max_tokens: 400 },
      timeout: 15000
    });
    return response;
  } catch (err) {
    if (attempt === MAX_RETRIES) throw err;
    await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
  }
}
```

## Monitoramento e Alertas

### Health Check Endpoint

Adicionar workflow separado com webhook `/health`:

```javascript
const staticData = $getWorkflowStaticData('global');
const sessions = staticData.sessions || {};
const activeSessions = Object.values(sessions)
  .filter(s => Date.now() - s.ultimaInteracao < 7200000).length;

return [{
  json: {
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeSessions,
    uptime: process.uptime()
  }
}];
```

### Metricas para Dashboard

Coletar no node "Coleta Metricas":
- Total de mensagens recebidas
- Mensagens por hora
- Sessoes ativas
- Pedidos confirmados
- Erros de API
- Taxa de uso da IA

### Alerta de Atendente

Node "Notifica Atendente" usa a variavel de ambiente `ATTENDANT_PHONE`:
```
Telefone: {{ $env.ATTENDANT_PHONE }}  (ex: 5511999999999)
Mensagem: "🚨 Cliente {phone} precisa de atendimento humano"
```

## Docker Compose (Producao)

```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=bot.farmacia.com.br
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://bot.farmacia.com.br/
      - N8N_ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${DB_PASSWORD}
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      - POSTGRES_DB=n8n
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

volumes:
  n8n_data:
  postgres_data:
```

## Backup

### Workflow JSON
```bash
# Exportar workflow via n8n CLI
n8n export:workflow --id=WORKFLOW_ID --output=backup/workflow-$(date +%Y%m%d).json

# Ou via API
curl -H "X-N8N-API-KEY: ${API_KEY}" http://localhost:5678/api/v1/workflows/WORKFLOW_ID > backup.json
```

### Cron de backup
```bash
# Diario as 3h da manha
0 3 * * * /usr/local/bin/n8n export:workflow --all --output=/backups/workflows-$(date +\%Y\%m\%d).json
```

## Checklist de Deploy

### Pre-deploy
1. [ ] Credentials migradas para n8n Credentials Store
2. [ ] Variaveis de ambiente configuradas
3. [ ] HTTPS configurado (Nginx/Caddy + Let's Encrypt)
4. [ ] Rate limiting implementado
5. [ ] Retry com backoff nos HTTP Request nodes
6. [ ] Workflow exportado como backup JSON

### Infraestrutura
7. [ ] Docker Compose configurado (n8n + PostgreSQL + Redis)
8. [ ] Volumes persistentes para dados
9. [ ] Redis para sessoes (substituir Static Data)
10. [ ] PostgreSQL para n8n metadata

### Pos-deploy
11. [ ] Webhook URL atualizado no Z-API
12. [ ] Health check endpoint respondendo
13. [ ] Enviar mensagem de teste
14. [ ] Monitoramento de uptime configurado
15. [ ] Backup automatico agendado
16. [ ] Alerta de erro configurado

---
name: integracoes-api-externas
description: Configurar e usar APIs externas no FarmaBot - Z-API (WhatsApp), Groq (IA), e webhook. Usar quando precisar configurar endpoint Z-API, tratar payload do webhook, montar requisicao Groq, adicionar nova integracao externa, tratar erros de API, configurar credentials, ou debugar comunicacao HTTP.
---

# Integracoes API Externas - FarmaBot

## Z-API (WhatsApp)

### Configuracao

| Campo | Valor | Onde |
|---|---|---|
| Instance ID | Variavel de ambiente | Z-API Dashboard |
| Token | Variavel de ambiente | Z-API Dashboard |
| Client Token | Header `client-token` | Z-API Dashboard |
| Base URL | `https://api.z-api.io/instances/{ID}/token/{TOKEN}` | HTTP Request node |

### Webhook de Entrada (Recebendo mensagens)

**Endpoint n8n:** `POST /webhook/whatsapp-farmacia`

**Payload recebido do Z-API:**

```json
{
  "phone": "5531999999999",
  "body": {
    "message": "Ola",
    "type": "text"
  },
  "isGroup": false,
  "instanceId": "xxx",
  "momment": 1700000000000
}
```

**Normalizacao no node "Normaliza Mensagem":**

```javascript
const data = $input.first().json;

// Extrair telefone (remover @c.us se presente)
const phone = (data.phone || '').replace('@c.us', '');

// Extrair texto da mensagem
const messageText = data.body?.message || data.text?.message || '';
const messageTextLower = messageText.toLowerCase().trim();

// Tipo da mensagem
const messageType = data.body?.type || data.type || 'text';

return [{
  json: {
    phone,
    messageText,
    messageTextLower,
    messageType,
    timestamp: Date.now(),
    isFromGroup: data.isGroup || false,
    rawPayload: data
  }
}];
```

### Envio de Mensagem (Z-API send-text)

**Node:** "Envia Mensagem Z-API" (HTTP Request)

```
Metodo: POST
URL: https://api.z-api.io/instances/{{INSTANCE_ID}}/token/{{TOKEN}}/send-text
Headers:
  Content-Type: application/json
  client-token: {{CLIENT_TOKEN}}

Body:
{
  "phone": "{{ $json.phone }}",
  "message": "{{ $json.finalMessage }}"
}
```

**Formato do telefone:** `5531999999999` (sem +, sem @c.us)

### Normalizacao de Telefone

```javascript
function normalizePhone(phone) {
  // Remove tudo que nao e digito
  let clean = phone.replace(/\D/g, '');
  // Remove @c.us suffix
  clean = clean.replace(/@c\.us$/, '');
  // Garante codigo do pais
  if (!clean.startsWith('55')) {
    clean = '55' + clean;
  }
  return clean;
}
```

### Envio de Imagem (futuro - Z-API send-image)

```
POST /send-image
{
  "phone": "5531999999999",
  "image": "https://url-da-imagem.jpg",
  "caption": "Descricao da imagem"
}
```

### Envio de Documento (futuro - Z-API send-document)

```
POST /send-document
{
  "phone": "5531999999999",
  "document": "https://url-do-documento.pdf",
  "fileName": "receita.pdf"
}
```

## Groq (llama-3.3-70b-versatile)

### Configuracao

| Campo | Valor |
|---|---|
| Modelo | `llama-3.3-70b-versatile` |
| API Key | `$env.GROQ_API_KEY` (ver `.env.example`) |
| Base URL | `https://api.groq.com/openai/v1/chat/completions` |
| Timeout | 15 segundos |

### Requisicao (HTTP Request node — "Groq - Gera Resposta")

```
Metodo: POST
URL: https://api.groq.com/openai/v1/chat/completions
Headers:
  Authorization: Bearer {{ $env.GROQ_API_KEY }}
  Content-Type: application/json

Body:
{
  "model": "llama-3.3-70b-versatile",
  "max_tokens": 400,
  "temperature": 0.7,
  "messages": [
    {
      "role": "system",
      "content": "Voce e um atendente virtual de farmacia..."
    },
    {
      "role": "user",
      "content": "{{ $json.aiContext }}"
    }
  ]
}
```

### Extracao da Resposta

**Node "Extrai Resposta IA":**

```javascript
const data = $input.first().json;

// Resposta vem em choices[0].message.content (formato OpenAI-compatible)
const aiResponse = data.choices?.[0]?.message?.content || '';

// Fallback se IA nao responder
const finalMessage = aiResponse || 'Desculpe, nao consegui processar sua mensagem. Digite *menu* para ver as opcoes.';

return [{
  json: {
    ...data,
    finalMessage,
    aiTokensUsed: data.usage?.total_tokens || 0
  }
}];
```

### Tratamento de Erros Groq

```javascript
const data = $input.first().json;

// Se houve erro na chamada
if (!data.choices || data.error) {
  const errorMsg = data.error?.message || 'Erro desconhecido';
  console.log(`Groq Error: ${errorMsg}`);

  return [{
    json: {
      ...data,
      finalMessage: 'Estou com uma dificuldade tecnica. Por favor, tente novamente em instantes. 🙏',
      aiError: errorMsg
    }
  }];
}
```

## Timeouts e Resiliencia

| Servico | Timeout | Retries | Fallback |
|---|---|---|---|
| Z-API (envio) | 10s | 1 retry | Log erro, nao reenviar |
| Groq | 15s | 0 | Mensagem padrao de fallback |
| WebApp metricas | 5s | 0 | Ignora falha silenciosamente |
| Webhook (resposta) | 5s | - | Responde 200 imediato |

### Padrao de Retry (futuro)

```javascript
async function callWithRetry(fn, maxRetries = 2, delayMs = 1000) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries) throw err;
      await new Promise(r => setTimeout(r, delayMs * (i + 1))); // backoff
    }
  }
}
```

## Credentials (n8n)

### Atual (variaveis de ambiente — recomendado)

Copie `.env.example` para `.env` e configure:

```env
ZAPI_INSTANCE_ID=your-instance-id
ZAPI_TOKEN=your-token
ZAPI_CLIENT_TOKEN=your-client-token
GROQ_API_KEY=gsk_your_key
DASHBOARD_API_KEY=your-dashboard-key
ATTENDANT_PHONE=5511999999999
```

No n8n (via `$env.*` nos nodes):
```
URL Z-API: {{ 'https://api.z-api.io/instances/' + $env.ZAPI_INSTANCE_ID + '/token/' + $env.ZAPI_TOKEN + '/send-text' }}
Client-Token: {{ $env.ZAPI_CLIENT_TOKEN }}
Authorization: {{ 'Bearer ' + $env.GROQ_API_KEY }}
x-api-key: {{ $env.DASHBOARD_API_KEY }}
```

### Alternativa (n8n Credentials Store)

Migrar para n8n Credentials Store em producao:
1. Settings > Credentials > Add Credential
2. Tipo: "Header Auth" para Z-API, "OpenAI API" para Groq (compativel)
3. Referenciar via dropdown nos HTTP Request nodes

## Adicionando Nova Integracao

### Template para HTTP Request node

1. Criar node "HTTP Request"
2. Configurar:
   - Metodo: GET/POST/PUT/DELETE
   - URL: endpoint completo
   - Authentication: Header Auth ou API Key
   - Body: JSON com dados necessarios
   - Timeout: definir valor explicito
   - Continue on Fail: `true` (para tratar erro no proximo node)
3. Conectar Code node apos para extrair/validar resposta
4. Propagar dados com `...data`

### Exemplo: Integracao com API de CEP (ViaCEP)

```
GET https://viacep.com.br/ws/{{ $json.session.cep }}/json/
```

```javascript
const data = $input.first().json;
const cep = data.cep || {};

return [{
  json: {
    ...data,
    endereco: {
      rua: cep.logradouro || '',
      bairro: cep.bairro || '',
      cidade: cep.localidade || '',
      uf: cep.uf || ''
    }
  }
}];
```

## Checklist para Integracoes

1. [ ] URL do endpoint correta e parametrizada
2. [ ] Headers de autenticacao configurados
3. [ ] Timeout definido explicitamente
4. [ ] Continue on Fail ativado se necessario
5. [ ] Resposta extraida e validada no node seguinte
6. [ ] Fallback definido para erro/timeout
7. [ ] Dados propagados com `...data`
8. [ ] Telefone normalizado antes de enviar para Z-API
9. [ ] Credenciais em `.env` (nunca hardcoded nos nodes)

# Integracoes

## Visao Geral de Credenciais

Todas as credenciais sao configuradas via **variaveis de ambiente**. Copie `.env.example` para `.env` e preencha os valores.

| Variavel | Servico | Uso |
|---|---|---|
| `ZAPI_INSTANCE_ID` | Z-API | URL dos nodes de envio |
| `ZAPI_TOKEN` | Z-API | URL dos nodes de envio |
| `ZAPI_CLIENT_TOKEN` | Z-API | Header `Client-Token` |
| `GROQ_API_KEY` | Groq | Header `Authorization` (IA) |
| `DASHBOARD_API_KEY` | WebApp | Header `x-api-key` (metricas) |
| `ATTENDANT_PHONE` | Alerta humano | Destino das notificacoes de transferencia |

No n8n, os nodes referenciam essas variaveis com `$env.NOME_DA_VARIAVEL`.

---

## 1. Z-API (WhatsApp)

### O que e

Z-API e um servico brasileiro que fornece acesso a API do WhatsApp, permitindo enviar e receber mensagens programaticamente.

### Webhook de Entrada

O Z-API envia callbacks via POST para o endpoint do n8n sempre que uma mensagem e recebida.

**Configuracao no Z-API:**
- URL do webhook: `https://<seu-n8n>/webhook/whatsapp-farmacia`
- Metodo: POST
- Evento: `ReceivedCallback`

**Campos do payload utilizados:**
| Campo | Descricao |
|---|---|
| `body.isGroup` | Se a mensagem e de grupo (ignorada) |
| `body.fromMe` | Se a mensagem foi enviada pelo proprio bot (ignorada) |
| `body.type` | Tipo do evento (filtra `ReceivedCallback`) |
| `body.phone` / `body.participantPhone` / `body.from` / `body.chatId` | Telefone do remetente |
| `body.text.message` / `body.message` | Texto da mensagem |
| `body.image` / `body.audio` / `body.video` / `body.document` / `body.sticker` | Tipos de midia |

### API de Envio

**Endpoint:** `POST https://api.z-api.io/instances/{INSTANCE_ID}/token/{TOKEN}/send-text`

**Headers:**
| Header | Descricao |
|---|---|
| `Client-Token` | Token de autenticacao do cliente Z-API |
| `Content-Type` | `application/json` |

**Body:**
```json
{
  "phone": "5511999999999",
  "message": "Texto da resposta"
}
```

**Timeout:** 10 segundos

**Nodes que usam Z-API:**
- `Envia Mensagem Z-API` — resposta ao cliente
- `Notifica Atendente` — alerta de transferencia humana

---

## 2. Groq (IA)

### O que e

API da Groq utilizada para gerar respostas naturais e contextuais. A API e compativel com o formato OpenAI Chat Completions.

### Endpoint

**URL:** `POST https://api.groq.com/openai/v1/chat/completions`

**Headers:**
| Header | Valor |
|---|---|
| `Authorization` | `Bearer {{ $env.GROQ_API_KEY }}` |
| `Content-Type` | `application/json` |

### Parametros

| Parametro | Valor | Descricao |
|---|---|---|
| `model` | `llama-3.3-70b-versatile` | Modelo utilizado (rapido e economico) |
| `max_tokens` | 400 | Limite de tokens na resposta |
| `temperature` | 0.7 | Criatividade moderada |
| `timeout` | 15000ms | Timeout da requisicao |

### System Prompt

```
Voce e um atendente virtual simpatico, profissional e eficiente de uma farmacia
online que atende via WhatsApp. Suas respostas devem ser claras, objetivas e bem
formatadas para WhatsApp (use *negrito* com asteriscos, emojis relevantes e
quebras de linha). Nunca use markdown com # ou **. Maximo de 300 caracteres por
resposta quando possivel. Sempre foque em ajudar o cliente a completar sua compra.
```

### User Prompt

O campo `aiContext` e montado dinamicamente pela maquina de estados no node "Logica do Bot". Exemplos:

- Boas-vindas apos identificacao do nome
- Redirecionar mensagem livre para opcoes do menu
- Explicar medicamento como farmaceutico virtual
- Informar indisponibilidade de estoque
- Solicitar receita medica
- Confirmar quantidade e adicao ao carrinho
- Apresentar resumo do pedido

### Credenciais

| Credencial | Onde Obter | Onde Configurar |
|---|---|---|
| API Key | [console.groq.com](https://console.groq.com) | Variavel `GROQ_API_KEY` no `.env` / n8n |

**Node:** `Groq - Gera Resposta`

---

## 3. WebApp de Metricas

### Status: Ativo (ambiente local)

O node `Envia ao WebApp` envia metricas para o dashboard apos cada interacao.

| Propriedade | Valor |
|---|---|
| Metodo | POST |
| URL (local) | `http://host.docker.internal:5000/api/metrics` |
| Header | `x-api-key: {{ $env.DASHBOARD_API_KEY }}` |
| Body | Objeto `metricsPayload` com estatisticas agregadas |
| Timeout | 5 segundos |

### Para ambiente de producao

1. Substituir a URL pelo dominio real do dashboard
2. Configurar `DASHBOARD_API_KEY` identica nos dois lados (n8n e WebApp)
3. Garantir que o n8n consiga acessar o endpoint via rede interna ou HTTPS

### Codigo do dashboard

O codigo do dashboard esta em `WebApp/Metric-Dashboard-Farmacia`, no mesmo repositorio do FarmaBot.

---

## 4. Numero do Atendente Humano

O destino dos alertas de transferencia e configurado pela variavel `ATTENDANT_PHONE`.

**Formato:** DDI + DDD + numero, sem espacos ou simbolos (ex: `5511999999999`)

**Node:** `Notifica Atendente` — usa `$env.ATTENDANT_PHONE` no body JSON

# Integracoes

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
  "phone": "5531999999999",
  "message": "Texto da resposta"
}
```

**Timeout:** 10 segundos

### Credenciais Necessarias

| Credencial | Onde Obter | Onde Configurar |
|---|---|---|
| Instance ID | Painel Z-API | URL do node "Envia Mensagem Z-API" |
| Token | Painel Z-API | URL do node "Envia Mensagem Z-API" |
| Client-Token | Painel Z-API | Header do node "Envia Mensagem Z-API" |

**IMPORTANTE:** As mesmas credenciais sao usadas no node "Notifica Atendente".

---

## 2. OpenAI

### O que e

API da OpenAI utilizada para gerar respostas naturais e contextuais em linguagem humana.

### Endpoint

**URL:** `POST https://api.openai.com/v1/chat/completions`

**Headers:**
| Header | Valor |
|---|---|
| `Authorization` | `Bearer sk-proj-...` |
| `Content-Type` | `application/json` |

### Parametros

| Parametro | Valor | Descricao |
|---|---|---|
| `model` | `gpt-4o-mini` | Modelo utilizado (rapido e economico) |
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

### Credenciais Necessarias

| Credencial | Onde Obter | Onde Configurar |
|---|---|---|
| API Key | OpenAI Platform (platform.openai.com) | Header `Authorization` no node "OpenAI - Gera Resposta" |

---

## 3. WebApp de Metricas (Futuro)

### Status: Desabilitado

O node "Envia ao WebApp" esta desabilitado (`disabled: true`) e usa URLs placeholder.

**Endpoint planejado:** `POST https://<webapp>/api/metrics`

**Headers planejados:**
| Header | Valor |
|---|---|
| `x-api-key` | Chave de API do WebApp |

**Body:** Objeto `metricsPayload` contendo estatisticas agregadas.

### Para ativar:
1. Substituir URL placeholder pela URL real do WebApp
2. Configurar a API key correta no header
3. Habilitar o node no editor n8n (remover disabled)
4. Testar o envio de metricas

---

## 4. Numero do Atendente Humano

O numero `31972037415` esta hardcoded no node "Notifica Atendente" como destinatario dos alertas de transferencia. Para alterar, edite o campo `phone` no body JSON desse node.

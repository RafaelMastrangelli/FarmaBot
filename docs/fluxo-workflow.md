# Fluxo do Workflow - Nodes n8n

## Diagrama de Conexoes

```
Webhook Z-API
    |
    v
Normaliza Mensagem
    |
    v
Busca Sessao (Static Data)
    |
    v
Decide Rota
    |
    v
Switch de Rotas
    |
    +--[0: em_fila_humano]-----> Em Fila Humano ----------+
    +--[1: transferir_humano]--> Transferir para Humano --+
    +--[2: reset_menu]---------> Reset Menu --------------+
    +--[3: fallback/bot_logic]-> Logica do Bot -----------+
                                                          |
                                                          v
                                                Usa IA ou Resposta Direta
                                                   |              |
                                        [useAI=true]       [useAI=false]
                                                   |              |
                                                   v              v
                                        Groq - Gera Resposta       Passa Resposta Direta
                                                   |              |
                                                   v              |
                                        Extrai Resposta IA        |
                                                   |              |
                                                   v              v
                                                Unifica Mensagem Final
                                                   |              |
                                                   v              v
                                        Envia Mensagem Z-API   Responde 200 OK
                                                   |
                                                   v
                                        Tem Alerta de Humano?
                                           |              |
                                     [sim: alerta]   [nao: normal]
                                           |              |
                                           v              v
                              Notifica Atendente     Coleta Metricas
                                           |              |
                                           v              v
                                           Junta Fluxos
                                              |         |
                                              v         v
                                   Salva metrics.json  Envia ao WebApp
```

## Detalhamento dos Nodes

### 1. Webhook Z-API

| Propriedade | Valor |
|---|---|
| Tipo | n8n-nodes-base.webhook |
| Metodo | POST |
| Path | `/webhook/whatsapp-farmacia` |
| Response Mode | responseNode |

Ponto de entrada. Recebe o payload do Z-API quando uma mensagem chega no WhatsApp.

### 2. Normaliza Mensagem

| Propriedade | Valor |
|---|---|
| Tipo | n8n-nodes-base.code |
| Linguagem | JavaScript |

Responsabilidades:
- Ignora mensagens de grupos (`isGroup === true`)
- Ignora mensagens enviadas pelo proprio bot (`fromMe === true`)
- Ignora eventos que nao sao mensagens recebidas (`type !== 'ReceivedCallback'`)
- Extrai telefone do remetente de multiplos campos possiveis
- Normaliza numeros brasileiros (adiciona o 9o digito apos DDD quando falta)
- Extrai texto da mensagem de diferentes formatos Z-API
- Normaliza o texto para lowercase
- Identifica tipo de midia (text, image, audio, video, document, sticker)

Saida:
```json
{
  "phone": "5531999999999",
  "messageText": "Texto original",
  "messageTextLower": "texto original",
  "messageType": "text",
  "timestamp": "2026-02-25T10:30:00.000Z"
}
```

### 3. Busca Sessao (Static Data)

| Propriedade | Valor |
|---|---|
| Tipo | n8n-nodes-base.code |
| Armazenamento | Workflow Static Data (global) |

Responsabilidades:
- Recupera sessao existente pelo telefone ou cria nova
- Nova sessao inicia no step `INICIO`
- Atualiza `lastInteraction` e `messageCount`
- Limpa sessoes com mais de 2 horas sem interacao
- Suporta modo debug (passa dados sem salvar sessao)

### 4. Decide Rota

| Propriedade | Valor |
|---|---|
| Tipo | n8n-nodes-base.code |

Regras de roteamento (em ordem de prioridade):
1. `em_fila_humano` - sessao em step `AGUARDANDO_HUMANO`
2. `transferir_humano` - palavras-chave: humano, atendente, pessoa, ajuda humana
3. `reset_menu` - palavras-chave: menu, inicio, voltar, 0 (exceto em estados iniciais)
4. `bot_logic` - fallback padrao

### 5. Switch de Rotas

| Propriedade | Valor |
|---|---|
| Tipo | n8n-nodes-base.switch |
| Campo | `route` |

Mapeamento de saidas:
- Saida 0: `em_fila_humano` -> Em Fila Humano
- Saida 1: `transferir_humano` -> Transferir para Humano
- Saida 2: `reset_menu` -> Reset Menu
- Saida 3 (fallback): -> Logica do Bot

### 6. Logica do Bot

| Propriedade | Valor |
|---|---|
| Tipo | n8n-nodes-base.code |
| Linhas | ~400+ |

Node principal. Contem:
- Catalogo de produtos hardcoded (6 categorias, 14 produtos)
- Funcoes de mensagem formatada (menus, listas, carrinho)
- Maquina de estados completa (13 estados)
- Gerenciamento de carrinho de compras
- Logica de receita medica
- Fluxo de pagamento e finalizacao de pedido

Ver [maquina-de-estados.md](maquina-de-estados.md) para detalhes.

### 7. Reset Menu / Transferir para Humano / Em Fila Humano

Nodes auxiliares que ajustam a sessao e preparam contexto de IA adequado:
- **Reset Menu**: volta step para `MENU_PRINCIPAL`
- **Transferir para Humano**: muda step para `AGUARDANDO_HUMANO`, gera alerta interno
- **Em Fila Humano**: mantem o usuario na fila com mensagem de espera

### 8. Usa IA ou Resposta Direta

| Propriedade | Valor |
|---|---|
| Tipo | n8n-nodes-base.switch |
| Campo | `useAI` (boolean) |

Bifurcacao:
- `useAI === true` -> Groq - Gera Resposta
- `useAI === false` (fallback) -> Passa Resposta Direta

### 9. Groq - Gera Resposta

| Propriedade | Valor |
|---|---|
| Tipo | n8n-nodes-base.httpRequest |
| Metodo | POST |
| URL | `https://api.groq.com/openai/v1/chat/completions` |
| Modelo | llama-3.3-70b-versatile |
| Max Tokens | 400 |
| Temperature | 0.7 |
| Timeout | 15s |
| Auth | `$env.GROQ_API_KEY` via header `Authorization` |

System prompt define o tom: atendente virtual de farmacia, formatacao WhatsApp, maximo 300 caracteres.

### 10. Extrai Resposta IA

Extrai `choices[0].message.content` da resposta Groq (formato compativel com OpenAI). Fallback para mensagem de erro generica.

### 11. Passa Resposta Direta

Pega `responseText` do fluxo e coloca em `finalMessage`.

### 12. Unifica Mensagem Final

| Propriedade | Valor |
|---|---|
| Tipo | n8n-nodes-base.merge |

Junta os dois caminhos (IA e direto) em um unico fluxo.

### 13. Envia Mensagem Z-API

| Propriedade | Valor |
|---|---|
| Tipo | n8n-nodes-base.httpRequest |
| Metodo | POST |
| Endpoint | Z-API `/send-text` |
| Timeout | 10s |

Envia a mensagem final de volta ao WhatsApp do usuario.

### 14. Responde 200 OK

| Propriedade | Valor |
|---|---|
| Tipo | n8n-nodes-base.respondToWebhook |

Responde ao webhook Z-API com `{ "status": "ok" }`. Executado em paralelo com o envio da mensagem.

### 15. Tem Alerta de Humano?

Switch que verifica se o node "Transferir para Humano" gerou um `alertaInterno` nao-vazio.

### 16. Notifica Atendente

Envia alerta formatado para `$env.ATTENDANT_PHONE` via Z-API com contexto completo do cliente.

### 17. Coleta Metricas

Atualiza contadores em Static Data: mensagens, sessoes, pedidos, receita, transferencias, eventos.

### 18. Junta Fluxos / Salva metrics.json / Envia ao WebApp

- **Junta Fluxos**: Merge dos caminhos de alerta e metricas
- **Salva metrics.json**: Persiste JSON de metricas no Static Data
- **Envia ao WebApp**: HTTP POST para `http://host.docker.internal:5000/api/metrics` com `x-api-key`

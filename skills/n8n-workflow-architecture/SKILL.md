---
name: n8n-workflow-architecture
description: Projetar, adicionar e reorganizar nodes no workflow n8n do FarmaBot. Usar quando precisar criar novo node, mudar conexoes entre nodes, adicionar ramo no pipeline, inserir node de log/debug, modificar roteamento no Switch, ou redesenhar parte do fluxo. Cobre tipos de node, convencoes de nomenclatura, propagacao de dados e posicionamento visual.
---

# Workflow Architecture - FarmaBot

## Estrutura Atual (18 nodes)

```
Webhook Z-API -> Normaliza Mensagem -> Busca Sessao -> Decide Rota -> Switch de Rotas
  -> [4 ramos: Em Fila Humano | Transferir para Humano | Reset Menu | Logica do Bot]
  -> Usa IA ou Resposta Direta (Switch boolean useAI)
  -> [Groq -> Extrai Resposta IA] ou [Passa Resposta Direta]
  -> Unifica Mensagem Final (Merge)
  -> Envia Mensagem Z-API + Responde 200 OK (paralelo)
  -> Tem Alerta de Humano? (Switch)
  -> [Notifica Atendente | Coleta Metricas]
  -> Junta Fluxos -> Salva metrics.json + Envia ao WebApp
```

## Tipos de Node Disponiveis

| Tipo | Quando Usar |
|---|---|
| `n8n-nodes-base.code` | Logica JavaScript, transformacao de dados, maquina de estados |
| `n8n-nodes-base.switch` | Roteamento condicional (multiplas saidas) |
| `n8n-nodes-base.if` | Decisao binaria simples (true/false) |
| `n8n-nodes-base.merge` | Juntar caminhos paralelos |
| `n8n-nodes-base.httpRequest` | Chamadas a APIs externas (Z-API, Groq) |
| `n8n-nodes-base.webhook` | Ponto de entrada HTTP |
| `n8n-nodes-base.respondToWebhook` | Responder ao webhook explicitamente |
| `n8n-nodes-base.set` | Definir campos simples sem codigo |
| `n8n-nodes-base.noOp` | No-operation (placeholder, debugging) |

## Convencoes de Nomenclatura

| Padrao | Exemplo |
|---|---|
| Verbo + Objeto (acao) | "Envia Mensagem Z-API" |
| Verbo + Complemento (contexto) | "Busca Sessao (Static Data)" |
| Pergunta? (decisao) | "Tem Alerta de Humano?" |
| Nome + Contexto (especifico) | "Busca Sessao (Static Data)" |

Regras:
- Nomes em **portugues** sem acentos
- Maximo ~40 caracteres
- Parenteses para contexto adicional
- Interrogacao para Switch/If nodes

## Propagacao de Dados

Todo Code node DEVE propagar dados via spread:

```javascript
return [{ json: { ...data, novoCampo: valor } }];
```

### Campos obrigatorios no pipeline

Presentes desde o inicio e propagados por todos os nodes:

```
phone, messageText, messageTextLower, messageType, timestamp,
session, isNewSession, route, responseText, useAI, aiContext
```

Campo final adicionado no merge: `finalMessage`

## Conexoes do Switch de Rotas

| Saida | Rota | Destino |
|---|---|---|
| 0 | `em_fila_humano` | Em Fila Humano |
| 1 | `transferir_humano` | Transferir para Humano |
| 2 | `reset_menu` | Reset Menu |
| 3 (fallback) | `bot_logic` | Logica do Bot |

- Saida 0 = caso mais frequente ou primeiro listado
- Fallback = ultima saida

## Bifurcacao IA/Direta

O Switch "Usa IA ou Resposta Direta" separa em:
- `useAI === true` -> Groq -> Extrai Resposta IA -> `finalMessage`
- `useAI === false` (fallback) -> Passa Resposta Direta -> `finalMessage`

Merge "Unifica Mensagem Final" junta os dois caminhos (IA na entrada 0, direto na entrada 1).

## Adicionando Novo Node

### Antes de um node existente (interceptar pipeline)

1. Criar node entre os dois existentes
2. Receber dados do anterior via `$input.first().json`
3. Propagar com `...data` + campos novos
4. Reconectar: anterior -> novo -> proximo

### Novo ramo no Switch de Rotas

1. Adicionar nova rota no "Decide Rota" (Code node)
2. Adicionar saida no "Switch de Rotas" com valor da nova rota
3. Criar Code node de destino
4. Conectar saida do novo ramo ao "Usa IA ou Resposta Direta"

### Novo node pos-envio (side effect)

Conectar apos "Envia Mensagem Z-API" em paralelo com "Tem Alerta de Humano?".

## Webhook

- Path: `whatsapp-farmacia`
- Metodo: POST
- Mode: `responseNode` (obrigatorio - resposta explicita via "Responde 200 OK")
- "Responde 200 OK" executa em PARALELO com "Envia Mensagem Z-API"

## Posicionamento Visual

Nodes seguem grid horizontal/vertical no editor n8n:
- Fluxo principal: esquerda -> direita (incrementos de ~250px em x)
- Ramos paralelos: de cima para baixo (incrementos de ~150px em y)
- Merge nodes: alinhados horizontalmente com o ponto de convergencia

## Checklist para Mudancas no Workflow

1. [ ] Nome do node segue convencao (portugues, verbo+objeto, max 40 chars)
2. [ ] Dados propagados com `...data` em todo Code node
3. [ ] Campos obrigatorios do pipeline preservados
4. [ ] Conexoes recriadas corretamente (verificar indices de saida)
5. [ ] `responseMode: responseNode` preservado no webhook
6. [ ] Merge nodes recebem caminhos na ordem correta
7. [ ] Node posicionado visualmente no grid
8. [ ] Testado com execucao manual no editor n8n

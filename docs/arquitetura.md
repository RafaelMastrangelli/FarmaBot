# Arquitetura

## Visao Geral

O FarmaBot e um workflow n8n que funciona como um chatbot de atendimento para farmacia via WhatsApp. A arquitetura e orientada a eventos: cada mensagem recebida dispara uma execucao completa do workflow.

```
                        +------------------+
  WhatsApp (usuario) -->| Z-API (webhook)  |
                        +--------+---------+
                                 |
                        +--------v---------+
                        |   n8n Workflow    |
                        |                  |
                        |  Normaliza msg   |
                        |  Busca sessao    |
                        |  Decide rota     |
                        |  Logica do bot   |
                        |  IA ou direta    |
                        |  Envia resposta  |
                        +--------+---------+
                                 |
                  +--------------+-------------+
                  |              |              |
           +------v---+  +------v---+  +-------v------+
           | Groq     |  | Z-API    |  | Metricas     |
           | Llama 3.3|  | send-txt |  | Static Data  |
           +----------+  +----------+  +-------+------+
                                              |
                                       +------v------+
                                       | WebApp      |
                                       | Dashboard   |
                                       +-------------+
```

## Componentes Principais

### 1. Canal de Entrada (Z-API Webhook)

- Recebe callbacks POST do Z-API quando o usuario envia mensagem no WhatsApp
- Endpoint: `POST /webhook/whatsapp-farmacia`
- Modo: `responseNode` (responde 200 OK de forma explicita no final do fluxo)

### 2. Pipeline de Processamento (n8n Nodes)

Sequencia linear de processamento:

1. **Normaliza Mensagem** - Extrai telefone, texto, tipo de midia, timestamp
2. **Busca Sessao** - Recupera/cria sessao do usuario no Static Data
3. **Decide Rota** - Classifica a mensagem em uma das 4 rotas possiveis
4. **Switch de Rotas** - Direciona para o node correto baseado na rota
5. **Logica do Bot** - Maquina de estados principal com catalogo e carrinho
6. **Usa IA ou Resposta Direta** - Decide se a resposta vem da Groq ou e fixa
7. **Unifica Mensagem Final** - Merge dos dois caminhos (IA e direto)

### 3. Canal de Saida (Z-API send-text)

- Envia a resposta formatada de volta ao WhatsApp do usuario
- API: `POST /send-text` na instancia Z-API configurada
- Credenciais via `$env.ZAPI_INSTANCE_ID`, `$env.ZAPI_TOKEN`, `$env.ZAPI_CLIENT_TOKEN`

### 4. Subsistema de IA (Groq)

- Modelo: `llama-3.3-70b-versatile`
- Endpoint: `POST https://api.groq.com/openai/v1/chat/completions`
- Autenticacao: `$env.GROQ_API_KEY` no header `Authorization`
- Papel: Gerar respostas naturais e contextuais quando o bot precisa de linguagem dinamica
- System prompt fixo que define tom e formato WhatsApp
- User prompt montado dinamicamente pelo node "Logica do Bot" com contexto da interacao

### 5. Subsistema de Metricas

- Coleta dados de uso (mensagens, sessoes, pedidos, receita, transferencias)
- Armazena em n8n Static Data (persistencia in-memory entre execucoes)
- Envia payload para o WebApp via `POST /api/metrics` com header `x-api-key`

### 6. Subsistema de Alerta Humano

- Quando o usuario pede atendente, notifica o numero em `$env.ATTENDANT_PHONE` via Z-API
- Envia contexto completo: nome do cliente, telefone, mensagem, valor do carrinho

## Fluxo de Dados

```
Mensagem WhatsApp
    |
    v
[raw payload Z-API]
    |
    v
{ phone, messageText, messageTextLower, messageType, timestamp }
    |
    v
{ ...dados, session, isNewSession }
    |
    v
{ ...dados, route: 'bot_logic' | 'transferir_humano' | 'reset_menu' | 'em_fila_humano' }
    |
    v
{ ...dados, responseText, useAI, aiContext }
    |
    +--[useAI=true]--> Groq --> { finalMessage }
    |
    +--[useAI=false]-> Direto --> { finalMessage }
    |
    v
[Envia via Z-API] --> [Metricas] --> [WebApp] --> [Alerta humano se necessario]
```

## Decisoes Arquiteturais

| Decisao | Justificativa |
|---|---|
| n8n Static Data para sessoes | Simplicidade, sem necessidade de banco externo. Sessoes expiram em 2h. |
| Groq via HTTP Request (nao node nativo) | Maior controle sobre payload, headers e timeout; API compativel com OpenAI |
| Credenciais via variaveis de ambiente | Evita exposicao em repositorio publico e facilita rotacao de chaves |
| Maquina de estados no Code node | Logica complexa de fluxo de compra nao cabe em nodes visuais simples |
| Z-API como provider WhatsApp | API brasileira com boa integracao e suporte a envio/recebimento |
| responseMode: responseNode | Permite responder 200 OK ao Z-API de forma explicita apos todo processamento |

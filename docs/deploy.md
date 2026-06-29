# Deploy e Configuracao

## Pre-requisitos

| Requisito | Descricao |
|---|---|
| n8n | Instancia n8n rodando (self-hosted ou n8n.cloud), versao 1.x+ |
| Z-API | Conta ativa com instancia WhatsApp conectada |
| Groq | Conta com API key em [console.groq.com](https://console.groq.com) |

## Passo a Passo

### 1. Importar o Workflow

1. Abra o editor n8n no navegador
2. Va em **Workflows** > **Import from File**
3. Selecione o arquivo `FarmaBot - WhatsApp + OpenAI.json`
4. O workflow sera importado com todos os nodes e conexoes

### 2. Configurar Variaveis de Ambiente

Copie `.env.example` para `.env` na raiz do projeto e preencha os valores:

```bash
cp .env.example .env
```

| Variavel | Onde Obter | Uso no workflow |
|---|---|---|
| `ZAPI_INSTANCE_ID` | Painel Z-API > Instancia | URL dos nodes Z-API |
| `ZAPI_TOKEN` | Painel Z-API > Instancia | URL dos nodes Z-API |
| `ZAPI_CLIENT_TOKEN` | Painel Z-API > Security | Header `Client-Token` |
| `GROQ_API_KEY` | console.groq.com | Header `Authorization` (Groq) |
| `DASHBOARD_API_KEY` | Seu dashboard / WebApp | Header `x-api-key` |
| `ATTENDANT_PHONE` | Seu numero de atendente | Alerta de transferencia humana |

**Formato da URL Z-API:**
```
https://api.z-api.io/instances/{INSTANCE_ID}/token/{TOKEN}/send-text
```

No n8n self-hosted, passe as variaveis ao subir o container (veja `start.ps1`) ou configure em **Settings > Variables**.

**ATENCAO:** Nunca commite o arquivo `.env`. Rotacione imediatamente qualquer credencial que tenha sido exposta.

### 3. Configurar Webhook no Z-API

1. Acesse o painel Z-API
2. Va em configuracoes da instancia > Webhooks
3. Configure o webhook de mensagens recebidas para:
   ```
   https://<seu-dominio-n8n>/webhook/whatsapp-farmacia
   ```
4. O metodo deve ser POST

**Nota:** Se o n8n estiver local (localhost), use um servico como ngrok para expor o endpoint.

### 4. Configurar Numero do Atendente

Defina `ATTENDANT_PHONE` no `.env` (formato: DDI + DDD + numero, sem espacos ou simbolos).

Exemplo: `5511999999999`

### 5. Ativar o Workflow

1. No editor n8n, clique no toggle **Active** no canto superior direito
2. O workflow passara a receber webhooks em tempo real
3. Teste enviando uma mensagem no WhatsApp conectado

## Teste Rapido

1. Envie "oi" para o WhatsApp conectado na instancia Z-API
2. O bot deve responder com a mensagem de boas-vindas pedindo o nome
3. Responda com seu nome
4. O menu principal deve aparecer
5. Teste as opcoes 1-4

## Checklist de Configuracao

- [ ] Workflow importado no n8n
- [ ] Arquivo `.env` criado a partir de `.env.example`
- [ ] Variaveis Z-API configuradas no n8n
- [ ] API key Groq configurada no n8n
- [ ] Webhook configurado no painel Z-API apontando para o n8n
- [ ] `ATTENDANT_PHONE` configurado
- [ ] Workflow ativado
- [ ] Teste de envio e recebimento de mensagens OK

## Troubleshooting

| Problema | Causa Provavel | Solucao |
|---|---|---|
| Bot nao responde | Webhook nao configurado ou n8n inativo | Verifique URL do webhook no Z-API e se o workflow esta ativo |
| Erro 401 na Groq | API key invalida ou expirada | Gere nova key em console.groq.com |
| Erro 403 na Z-API | Client-Token incorreto | Verifique o token no painel Z-API > Security |
| Mensagens duplicadas | Webhook configurado em mais de um evento | Configure apenas `ReceivedCallback` |
| Bot responde em grupos | Filtro de grupo falhou | Verifique o node "Normaliza Mensagem" |
| Sessao perdida | n8n reiniciou (Static Data e in-memory) | Comportamento esperado; usuario reinicia conversa |
| Timeout na Groq | Rede lenta ou API sobrecarregada | Aumente o timeout (atualmente 15s) ou tente novamente |

## Consideracoes de Producao

Para uso em producao, considere:

1. **Credenciais n8n**: Use o sistema de Credentials do n8n ou variaveis de ambiente
2. **Banco de dados**: Substitua Static Data por Redis ou PostgreSQL para persistencia
3. **Rate limiting**: Adicione controle de taxa para evitar abuso
4. **Monitoramento**: Configure alertas para falhas no workflow
5. **Backup**: Exporte o workflow periodicamente
6. **HTTPS**: Garanta que o n8n esta acessivel via HTTPS para o webhook
7. **Logs**: Ative execution logs no n8n para debug
8. **Rotacao de secrets**: Troque todas as chaves antes de tornar o repositorio publico

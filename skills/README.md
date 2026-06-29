# Skills - FarmaBot

Skills especificas para desenvolvimento e manutencao do FarmaBot (WhatsApp + n8n + Groq).

Cada skill contem instrucoes detalhadas, templates de codigo, regras de validacao e checklists para garantir consistencia no desenvolvimento.

## Indice de Skills

| # | Skill | Descricao | Agente Base |
|---|---|---|---|
| 1 | [n8n-maquina-de-estados](n8n-maquina-de-estados/SKILL.md) | Adicionar/modificar estados na FSM do bot | Bot Developer + Code Reviewer |
| 2 | [n8n-workflow-architecture](n8n-workflow-architecture/SKILL.md) | Projetar nodes, conexoes e pipeline de dados no n8n | Workflow Architect |
| 3 | [whatsapp-prompts-formatacao](whatsapp-prompts-formatacao/SKILL.md) | Prompts Groq + formatacao de mensagens WhatsApp | Prompt Engineer |
| 4 | [integracoes-api-externas](integracoes-api-externas/SKILL.md) | Configurar Z-API, Groq e novas APIs externas | Integration Specialist |
| 5 | [testes-conversacao-bot](testes-conversacao-bot/SKILL.md) | Cenarios de teste e validacao de fluxos | QA Tester |
| 6 | [deploy-producao-n8n](deploy-producao-n8n/SKILL.md) | Deploy, Redis, credentials, monitoramento | DevOps Engineer |
| 7 | [catalogo-regras-negocio](catalogo-regras-negocio/SKILL.md) | Produtos, precos, frete, desconto, features | Product Owner |
| 8 | [dashboard-metricas](dashboard-metricas/SKILL.md) | Dashboard web com Express + SQLite + Chart.js | PRD Dashboard |

## Quando Usar Cada Skill

| Tarefa | Skill |
|---|---|
| Adicionar novo estado ao bot | n8n-maquina-de-estados |
| Criar/modificar node no workflow | n8n-workflow-architecture |
| Escrever prompt para Groq | whatsapp-prompts-formatacao |
| Formatar mensagem WhatsApp | whatsapp-prompts-formatacao |
| Configurar webhook Z-API | integracoes-api-externas |
| Adicionar nova API externa | integracoes-api-externas |
| Testar fluxo de conversacao | testes-conversacao-bot |
| Debugar comportamento do bot | testes-conversacao-bot |
| Preparar deploy em producao | deploy-producao-n8n |
| Migrar sessoes para Redis | deploy-producao-n8n |
| Adicionar produto ao catalogo | catalogo-regras-negocio |
| Implementar feature do backlog | catalogo-regras-negocio |
| Criar dashboard de metricas | dashboard-metricas |
| Adicionar grafico/endpoint | dashboard-metricas |

## Features do Backlog e Skills Relacionadas

| Feature | Skills Necessarias |
|---|---|
| Busca por nome de produto | maquina-de-estados + catalogo |
| Recompra rapida | maquina-de-estados + catalogo |
| Cupom de desconto | maquina-de-estados + catalogo |
| Dashboard web | dashboard-metricas |
| Rastreamento de pedido | maquina-de-estados + integracoes |
| Envio de imagem do produto | integracoes + workflow-architecture |
| Multiplos enderecos | maquina-de-estados + catalogo |
| Avaliacao pos-compra | maquina-de-estados + prompts |

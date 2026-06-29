# Agentes de IA - Time de Desenvolvimento

> Agentes especializados para desenvolver, manter e evoluir o FarmaBot.
> Cada agente possui um papel definido, contexto do projeto e instrucoes de quando e como utiliza-lo.

## Stack do Projeto

| Item | Tecnologia |
|---|---|
| Plataforma | n8n (workflow automation) |
| Canal | WhatsApp (via Z-API) |
| IA | OpenAI GPT-4o-mini |
| Linguagem | JavaScript (Code nodes n8n) |
| Armazenamento | n8n Static Data (in-memory) |

Documentacao completa: [docs/README.md](../docs/README.md)

---

## Indice de Agentes

| Agente | Arquivo | Quando Usar |
|---|---|---|
| Workflow Architect | [workflow-architect.md](workflow-architect.md) | Criar, reorganizar ou conectar nodes no workflow n8n. Adicionar novos nodes, mudar conexoes, alterar estrutura do pipeline. |
| Bot Developer | [bot-developer.md](bot-developer.md) | Modificar a maquina de estados, adicionar novos estados/transicoes, alterar logica de carrinho, pagamento ou fluxo de compra. |
| Prompt Engineer | [prompt-engineer.md](prompt-engineer.md) | Criar ou otimizar prompts do system/user para OpenAI, ajustar tom de voz, melhorar qualidade das respostas de IA. |
| Integration Specialist | [integration-specialist.md](integration-specialist.md) | Configurar, debugar ou trocar integracoes (Z-API, OpenAI, webhooks). Adicionar novas APIs ou canais de comunicacao. |
| QA Tester | [qa-tester.md](qa-tester.md) | Planejar e executar testes de conversa, validar transicoes de estado, testar cenarios de erro e edge cases. |
| Code Reviewer | [code-reviewer.md](code-reviewer.md) | Revisar codigo JavaScript dos Code nodes antes de deploy. Verificar padroes, seguranca, propagacao de dados e boas praticas. |
| DevOps Engineer | [devops-engineer.md](devops-engineer.md) | Deploy, monitoramento, configuracao de ambiente, migrar de Static Data para banco de dados, seguranca de credenciais. |
| Product Owner | [product-owner.md](product-owner.md) | Definir requisitos de negocio, priorizar features, alterar catalogo de produtos, regras de frete/desconto, fluxo de atendimento. |

---

## Como Usar os Agentes

### 1. Identifique a necessidade

Determine qual area do projeto sera modificada:

| Necessidade | Agente Indicado |
|---|---|
| "Preciso adicionar um node de log" | Workflow Architect |
| "Quero criar um estado de rastreamento de entrega" | Bot Developer |
| "As respostas da IA estao muito longas" | Prompt Engineer |
| "Preciso trocar Z-API por Twilio" | Integration Specialist |
| "Como testar o fluxo de receita medica?" | QA Tester |
| "Esse Code node esta correto?" | Code Reviewer |
| "Como colocar em producao com Redis?" | DevOps Engineer |
| "Quero adicionar categoria de cosmeticos" | Product Owner |

### 2. Copie o conteudo do agente

Cada arquivo `.md` contem um prompt completo de sistema com:
- Papel e responsabilidades
- Contexto do projeto (stack, arquitetura, padroes)
- Regras e restricoes especificas
- Formato de resposta esperado

### 3. Use como system prompt

Cole o conteudo do agente como system prompt em qualquer LLM (ChatGPT, Claude, etc.) e faca sua pergunta no user prompt.

### 4. Combine agentes quando necessario

Para tarefas complexas, use mais de um agente em sequencia:

| Tarefa | Sequencia de Agentes |
|---|---|
| Nova feature completa | Product Owner -> Bot Developer -> Prompt Engineer -> QA Tester |
| Refactoring | Code Reviewer -> Workflow Architect -> QA Tester |
| Ir para producao | DevOps Engineer -> Code Reviewer -> QA Tester |
| Nova integracao | Integration Specialist -> Workflow Architect -> QA Tester |

# FarmaBot - Documentacao

> Bot de atendimento automatizado para farmacia via WhatsApp, construido com n8n, Groq e Z-API.

## Stack do Projeto

| Item | Tecnologia |
|---|---|
| Plataforma | n8n (workflow automation) |
| Tipo | API / Automacao (Webhook-driven) |
| Canal | WhatsApp (via Z-API) |
| IA | Groq — modelo `llama-3.3-70b-versatile` |
| Linguagem dos scripts | JavaScript (Code nodes n8n) |
| Armazenamento | n8n Static Data (in-memory) |
| Dashboard | WebApp local (Express + PostgreSQL) em `WebApp/Metric-Dashboard-Farmacia` |
| Credenciais | Variaveis de ambiente (`.env`) — ver `.env.example` |

## Indice da Documentacao

| Documento | Descricao |
|---|---|
| [Arquitetura](arquitetura.md) | Visao geral da arquitetura, componentes e fluxo de dados |
| [Fluxo do Workflow](fluxo-workflow.md) | Detalhamento de cada node do workflow n8n |
| [Maquina de Estados](maquina-de-estados.md) | Estados da sessao, transicoes e comandos do usuario |
| [Catalogo de Produtos](catalogo-produtos.md) | Estrutura do catalogo, categorias e produtos |
| [Integracoes](integracoes.md) | Z-API (WhatsApp), Groq (IA) e WebApp de metricas |
| [Sessoes e Dados](sessoes-e-dados.md) | Gerenciamento de sessoes, metricas e persistencia |
| [Deploy e Configuracao](deploy.md) | Como importar, configurar credenciais e ativar o workflow |
| [Convencoes e Padroes](convencoes.md) | Padroes de codigo, nomenclatura e boas praticas |

## Visao Rapida

O bot funciona como um atendente virtual de farmacia que:

1. Recebe mensagens do WhatsApp via webhook Z-API
2. Gerencia sessoes por telefone com maquina de estados
3. Oferece catalogo de produtos com 6 categorias e 14 itens
4. Processa carrinho de compras, endereco e pagamento
5. Usa Groq para respostas dinamicas e contextuais
6. Suporta transferencia para atendente humano
7. Coleta metricas e envia ao dashboard WebApp

## Arquivo Principal

```
FarmaBot - WhatsApp + OpenAI.json   # Workflow n8n (nome legado do arquivo; internamente usa Groq)
```

## Configuracao Rapida

```powershell
Copy-Item .env.example .env
# Edite .env com suas credenciais
.\start.ps1
```

Consulte [deploy.md](deploy.md) para o passo a passo completo.

## Seguranca

- **Nunca** commite o arquivo `.env` ou `.test-phone`
- Todas as credenciais ficam em variaveis de ambiente (`ZAPI_*`, `GROQ_API_KEY`, `DASHBOARD_API_KEY`, `ATTENDANT_PHONE`)
- Rotacione imediatamente qualquer chave que tenha sido exposta em commit anterior
- O GitHub Push Protection bloqueia push com secrets detectados — isso e esperado e desejavel

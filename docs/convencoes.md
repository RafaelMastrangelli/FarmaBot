# Convencoes e Padroes

## Nomenclatura dos Nodes

### Padrao de Nomes

Os nodes seguem um padrao descritivo em portugues que indica a acao ou decisao:

| Padrao | Exemplo | Quando Usar |
|---|---|---|
| Verbo + Objeto | "Normaliza Mensagem", "Envia Mensagem Z-API" | Nodes que executam uma acao |
| Verbo + Complemento | "Busca Sessao (Static Data)" | Nodes com contexto adicional entre parenteses |
| Pergunta? | "Tem Alerta de Humano?", "Usa IA ou Resposta Direta" | Nodes de decisao (Switch/If) |
| Substantivo | "Coleta Metricas", "Junta Fluxos" | Nodes de processamento intermediario |
| Nome + Contexto | "Busca Sessao (Static Data)" | Nodes com contexto adicional entre parenteses |

### Convencoes

- Nomes em **portugues** (lingua do projeto)
- **Sem acentos** nos nomes internos quando possivel
- Parenteses `()` para contexto adicional
- Interrogacao `?` para nodes de decisao
- Nomes curtos e descritivos (maximo ~40 caracteres)

## Padrao de Codigo JavaScript

### Estilo Geral

- `const` para variaveis imutaveis, `let` para mutaveis
- Comentarios em portugues com `//` no inicio de cada bloco logico
- Strings com aspas simples `'` (exceto em template literals)
- Ponto e virgula ao final de cada instrucao
- Indentacao com 2 espacos

### Padrao dos Code Nodes

Todo Code node segue esta estrutura:

```javascript
// Comentario descritivo do que o node faz
const staticData = $getWorkflowStaticData('global');  // Se precisar de sessao
const data = $input.first().json;                      // Entrada

// ... logica ...

return [{
  json: {
    ...data,           // Propaga todos os campos anteriores
    campoNovo: valor   // Adiciona novos campos
  }
}];
```

### Propagacao de Dados

Todos os nodes propagam os dados recebidos usando spread (`...data`), adicionando ou sobrescrevendo campos conforme necessario. Isso garante que qualquer node posterior tenha acesso a todos os dados do pipeline.

### Campos de Saida Padrao

| Campo | Tipo | Descricao |
|---|---|---|
| `phone` | string | Telefone do usuario (propagado desde Normaliza) |
| `messageText` | string | Texto original da mensagem |
| `messageTextLower` | string | Texto em lowercase |
| `messageType` | string | Tipo de midia |
| `timestamp` | string | ISO timestamp |
| `session` | object | Sessao do usuario |
| `isNewSession` | boolean | Se e uma nova sessao |
| `route` | string | Rota decidida |
| `responseText` | string | Resposta direta (sem IA) |
| `useAI` | boolean | Se deve usar Groq (IA) |
| `aiContext` | string | Prompt para a Groq |
| `finalMessage` | string | Mensagem final a ser enviada |
| `alertaInterno` | string | Alerta para atendente (se houver) |

## Padrao de Mensagens WhatsApp

### Formatacao

O bot usa formatacao nativa do WhatsApp:

| Sintaxe | Resultado |
|---|---|
| `*texto*` | **negrito** |
| `_texto_` | _italico_ |
| `~texto~` | ~~tachado~~ |
| `` `texto` `` | `monoespaco` |

### Emojis

Emojis sao usados para:
- Icones de categoria (💊 💉 🌿 🧴 ❤️‍🩹 🫁)
- Indicadores de estado (✅ ❌ 🔔)
- Decoracao de menus e mensagens
- Contexto visual em mensagens de IA (definido no system prompt)

### Estrutura de Menu

```
Titulo com emoji e *negrito*

1️⃣  Emoji  Opcao 1
2️⃣  Emoji  Opcao 2
3️⃣  Emoji  Opcao 3

_Instrucao em italico_
```

### Separadores

- Linha de separacao: `'─'.repeat(28)` (28 tracos)
- Quebras de linha: `\n` (duplo `\n\n` entre blocos)

## Padrao de Roteamento

### Prioridade de Rotas

As rotas sao avaliadas em ordem de prioridade no node "Decide Rota":

1. Estado da sessao (ex: `AGUARDANDO_HUMANO` -> `em_fila_humano`)
2. Palavras-chave de transferencia humana
3. Palavras-chave de reset/voltar
4. Fallback para logica do bot

### Convencao de Nomes de Rota

Rotas usam `snake_case` em portugues:
- `bot_logic`
- `transferir_humano`
- `reset_menu`
- `em_fila_humano`

## Padrao de Sessao

### Inicializacao

Toda nova sessao e criada com todos os campos definidos (nenhum campo undefined):

```javascript
session = {
  phone,
  step: 'INICIO',
  cartItems: [],
  customerName: '',
  // ... todos os campos com valores padrao
};
```

### Nomes de Step

Steps usam `UPPER_SNAKE_CASE` em portugues:
- `INICIO`
- `AGUARDANDO_NOME`
- `MENU_PRINCIPAL`
- `ESCOLHENDO_CATEGORIA`
- `CONFIRMANDO_PEDIDO`

## Padrao de IDs

| Entidade | Formato | Exemplo |
|---|---|---|
| Produto | `P` + 2 digitos | `P01`, `P14` |
| Categoria | String numerica | `'1'`, `'6'` |
| Pedido | `PED-` + timestamp | `PED-1740480600000` |
| Evento | `EVT-` + timestamp | `EVT-1740480600000` |
| Node ID | UUID v4 | `234b805a-ad42-47f8-...` |

## Boas Praticas

1. **Sempre propagar dados**: Use `...data` ao retornar de um Code node
2. **Fallback em extractions**: Sempre ter um valor padrao ao extrair dados do payload Z-API
3. **Validar entrada**: Verificar tipo e tamanho antes de processar (ex: nome >= 2 chars, endereco >= 10 chars)
4. **Limpar sessoes antigas**: A cada execucao, remover sessoes com mais de 2h
5. **Limitar arrays**: Manter maximo de 200 eventos no historico de metricas
6. **Evitar duplicatas**: Verificar se evento ja existe antes de incrementar contadores
7. **Timeout adequado**: 15s para Groq, 10s para Z-API, 5s para WebApp
8. **Credenciais em env vars**: Nunca hardcodar tokens ou API keys nos nodes
9. **Respostas concisas**: System prompt limita a ~300 caracteres quando possivel

---
name: n8n-maquina-de-estados
description: Adicionar novos estados, transicoes e logica a maquina de estados do FarmaBot. Usar quando precisar criar novo estado de conversa, adicionar fluxo de compra, implementar nova feature no bot (ex busca por nome, recompra, cupom, rastreamento, avaliacao), modificar transicoes existentes, gerenciar carrinho de compras, ou alterar validacoes de entrada do usuario. Cobre todo o codigo JavaScript dentro do node "Logica do Bot" no n8n.
---

# Maquina de Estados - FarmaBot

## Arquitetura

O node "Logica do Bot" e um Code node n8n (~400+ linhas JS) que implementa uma FSM (Finite State Machine) com switch/case no campo `session.step`.

### Estados atuais (16)

```
INICIO -> AGUARDANDO_NOME -> MENU_PRINCIPAL
  -> ESCOLHENDO_CATEGORIA -> ESCOLHENDO_PRODUTO -> DETALHES_PRODUTO
  -> AGUARDANDO_RECEITA -> CONFIRMANDO_QUANTIDADE -> POS_ADICIONAR
  -> REVISANDO_CARRINHO -> AGUARDANDO_ENDERECO -> ESCOLHENDO_PAGAMENTO
  -> CONFIRMANDO_PEDIDO -> PEDIDO_FINALIZADO -> CONSULTA_PEDIDO
  -> AGUARDANDO_HUMANO
```

## Padrao Obrigatorio para Novo Estado

Todo `case` deve seguir este esqueleto:

```javascript
case 'NOME_DO_ESTADO':
  // Validacao de entrada
  // Logica de negocio
  // Atualizar session.step para proximo estado
  // Definir responseText (fixo) OU useAI + aiContext (dinamico)
  break;
```

### Template completo

```javascript
case 'NOVO_ESTADO':
  if (msg === '0' || msg === 'voltar') {
    session.step = 'ESTADO_ANTERIOR';
    responseText = montarMenuAnterior(session);
    useAI = false;
  } else if (/* condicao valida */) {
    // Logica de negocio
    session.campoNovo = valorExtraido;
    session.step = 'PROXIMO_ESTADO';
    
    // Opcao A: resposta fixa
    responseText = `*Titulo* \n\nConteudo formatado para WhatsApp`;
    useAI = false;
    
    // Opcao B: resposta IA
    useAI = true;
    aiContext = `O cliente ${session.customerName} fez X. Contexto: Y. Responda confirmando Z com opcoes: 1-Opcao A, 2-Opcao B, 0-Voltar. Use emojis e *negrito*.`;
  } else {
    // Entrada invalida
    useAI = true;
    aiContext = `O cliente ${session.customerName} enviou "${msgOriginal}" que nao e valido para este estado. Explique que esperava [formato] e peca para tentar novamente. Seja simpatico.`;
  }
  break;
```

## Variaveis Disponiveis

```javascript
const staticData = $getWorkflowStaticData('global');
const data = $input.first().json;
const msg = data.messageTextLower;        // texto lowercase
const msgOriginal = data.messageText;      // texto original
const msgType = data.messageType;          // 'text' | 'image' | 'document' | 'audio' | etc
let session = { ...data.session };         // copia da sessao
let responseText = '';
let useAI = false;
let aiContext = '';
```

## Variaveis de Saida Obrigatorias

Toda saida deve ter:
- `responseText` (string): mensagem quando `useAI = false`
- `useAI` (boolean): se a OpenAI deve gerar resposta
- `aiContext` (string): prompt de contexto para IA quando `useAI = true`
- `session` (object): sessao atualizada com novo `step`

## Retorno Padrao

```javascript
staticData.sessions[data.phone] = session;
return [{ json: { ...data, session, responseText, useAI, aiContext } }];
```

## Regras de Validacao

| Campo | Regra |
|---|---|
| Nome | `>= 2 caracteres` |
| Endereco | `>= 10 caracteres` |
| Quantidade | `parseInt()` entre 1 e 99, verificar `isNaN()` |
| Receita | `messageType === 'image' \|\| messageType === 'document'` |
| Opcao numerica | `parseInt()` dentro do range valido |

## Gerenciamento de Carrinho

```javascript
// Adicionar item
session.cartItems.push({
  productId: produto.id,
  nome: produto.nome,
  qtd: quantidade,
  preco: produto.preco,
  subtotal: quantidade * produto.preco
});

// Calcular total
const subtotal = session.cartItems.reduce((sum, i) => sum + i.subtotal, 0);
const frete = 5.90;
const desconto = session.paymentMethod === 'pix' ? subtotal * 0.05 : 0;
const total = subtotal - desconto + frete;

// Esvaziar
session.cartItems = [];
```

## Campos da Sessao

```javascript
{
  phone, step, cartItems: [], customerName, currentCategory,
  selectedProduct, pendingProduct, deliveryAddress, paymentMethod,
  orderTotal, orderId, orderStatus, messageCount, startedAt, lastInteraction
}
```

Ao adicionar novo campo, inicializar com valor padrao na criacao da sessao (node "Busca Sessao").

## Nomenclaturas

- Steps: `UPPER_SNAKE_CASE` em portugues (`BUSCANDO_PRODUTO`)
- IDs produto: `P` + 2 digitos (`P15`)
- IDs categoria: string numerica (`'7'`)
- IDs pedido: `PED-{Date.now()}`
- Rotas: `snake_case` (`bot_logic`)

## Formatacao de Mensagens WhatsApp

```javascript
// Negrito
'*Titulo*'

// Italico
'_Instrucao_'

// Lista numerada com emojis
'1️⃣  💊  Opcao 1\n2️⃣  🌿  Opcao 2'

// Separador
'─'.repeat(28)

// Template de menu
function montarMenu(session) {
  return `*Menu Principal* 🏥\n\nOla, ${session.customerName}!\n\n` +
    `1️⃣  📋  Ver produtos\n` +
    `2️⃣  🔍  Consultar pedido\n` +
    `3️⃣  🛒  Meu carrinho\n` +
    `4️⃣  👤  Falar com atendente\n\n` +
    `_Digite o numero da opcao desejada_`;
}
```

## Comandos Globais (tratados FORA deste node)

Estes sao tratados no node "Decide Rota", nao na maquina de estados:
- `humano`, `atendente`, `pessoa` -> rota `transferir_humano`
- `menu`, `inicio`, `voltar`, `0` -> rota `reset_menu` (exceto em estados iniciais)

## Checklist para Novo Estado

1. [ ] Nome em `UPPER_SNAKE_CASE` portugues
2. [ ] `session.step` atualizado em toda transicao
3. [ ] Opcao "voltar" (`0` ou `voltar`) implementada
4. [ ] Entrada invalida tratada com mensagem amigavel
5. [ ] `responseText` OU `useAI + aiContext` definidos em todo caminho
6. [ ] Novos campos de sessao inicializados no "Busca Sessao"
7. [ ] Sessao salva no Static Data antes do return
8. [ ] `...data` propagado no return
9. [ ] Testes de conversa documentados

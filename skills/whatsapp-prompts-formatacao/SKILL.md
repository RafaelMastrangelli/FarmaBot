---
name: whatsapp-prompts-formatacao
description: Criar e otimizar prompts para Groq e formatar mensagens WhatsApp no FarmaBot. Usar quando precisar escrever system prompt, montar aiContext com variaveis dinamicas, aplicar formatacao WhatsApp (bold, emoji, listas), ajustar parametros do modelo (temperature, max_tokens), definir personas (atendente vs farmaceutico), ou melhorar qualidade das respostas da IA.
---

# WhatsApp Prompts & Formatacao - FarmaBot

## Formatacao WhatsApp (Z-API)

### Marcacoes Suportadas

| Formato | Sintaxe | Exemplo |
|---|---|---|
| Negrito | `*texto*` | `*FarmaBot*` |
| Italico | `_texto_` | `_consulte seu medico_` |
| Riscado | `~texto~` | `~R$25,00~ R$20,00` |
| Monoespaco | ``` `texto` ``` | `` `codigo123` `` |
| Quebra de linha | `\n` | `Linha 1\nLinha 2` |

### Regras de Formatacao

- **SEMPRE** usar `\n` para quebras de linha (nunca template literals)
- Emojis SAO suportados e devem ser usados com moderacao
- Maximo ~1000 caracteres por mensagem (WhatsApp pode truncar)
- Listas: usar emoji + espaco + texto por item
- Separador visual: `━━━━━━━━━━━━` (tracos largos)

### Padrao de Menu

```javascript
const menuText =
  `*🏥 FarmaBot*\n` +
  `━━━━━━━━━━━━\n` +
  `Escolha uma opcao:\n\n` +
  `1️⃣ Ver Categorias\n` +
  `2️⃣ Meu Carrinho\n` +
  `3️⃣ Status do Pedido\n` +
  `4️⃣ Falar com Atendente\n\n` +
  `_Digite o numero da opcao_`;
```

### Padrao de Listagem de Produtos

```javascript
let msg = `*📦 ${categoria.nome}*\n━━━━━━━━━━━━\n\n`;
categoria.produtos.forEach((p, i) => {
  msg += `${i + 1}️⃣ *${p.nome}*\n`;
  msg += `   💊 ${p.descricao}\n`;
  msg += `   💰 R$${p.preco.toFixed(2)}\n\n`;
});
msg += `_Digite o numero do produto_`;
```

### Padrao de Confirmacao de Pedido

```javascript
const confirmacao =
  `*✅ Pedido Confirmado!*\n` +
  `━━━━━━━━━━━━\n` +
  `📋 Pedido: #${pedidoId}\n` +
  `📦 Itens: ${totalItens}\n` +
  `💰 Total: R$${total.toFixed(2)}\n` +
  `${desconto ? `🏷️ Desconto PIX: -R$${desconto.toFixed(2)}\n` : ''}` +
  `🚚 Frete: R$5,90\n` +
  `💳 Pagamento: ${formaPagamento}\n` +
  `⏱️ Entrega: ate 4 horas\n\n` +
  `_Obrigado pela preferencia! 💚_`;
```

## Sistema de Prompts (Groq)

### Parametros do Modelo

```
Modelo: llama-3.3-70b-versatile
max_tokens: 400
temperature: 0.7
```

| Parametro | Valor | Motivo |
|---|---|---|
| max_tokens | 400 | Mensagens WhatsApp devem ser concisas |
| temperature | 0.7 | Equilibrio entre criatividade e consistencia |
| model | llama-3.3-70b-versatile | Rapido e economico via Groq |

### System Prompt - Template Base

```
Voce e um atendente virtual da FarmaBot, uma farmacia de bairro.
Responda de forma amigavel, objetiva e profissional.
Use emojis com moderacao. Mantenha respostas curtas (max 3 paragrafos).
Formate para WhatsApp: *negrito* para destaques, \n para quebras.
NUNCA recomende medicamentos sem prescricao.
NUNCA faca diagnosticos medicos.
Se o cliente perguntar sobre sintomas, oriente a procurar um medico.
```

### aiContext - Montagem Dinamica

O campo `aiContext` e montado no "Logica do Bot" e enviado como `system` message:

```javascript
// Template base
const aiContext = `Voce e um atendente virtual da FarmaBot.
O cliente ${session.nome || 'ainda nao informou o nome'}.
Estado atual: ${session.estado}.
${session.carrinho.length > 0
  ? `Carrinho: ${session.carrinho.map(i => i.nome).join(', ')}`
  : 'Carrinho vazio.'}
Responda de forma amigavel e objetiva.`;
```

### Personas

#### Atendente (padrao)
- Tom: amigavel, profissional, objetivo
- Uso: navegacao, carrinho, pedidos
- Foco: resolver rapido, guiar pelo menu

```
Voce e um atendente virtual da FarmaBot.
Seja amigavel e objetivo. Ajude o cliente a encontrar o que precisa.
```

#### Farmaceutico (quando pergunta sobre medicamentos)
- Tom: cuidadoso, tecnico-acessivel, responsavel
- Uso: duvidas sobre medicamentos, posologia
- Foco: informar sem prescrever, orientar consulta medica

```
Voce e o farmaceutico virtual da FarmaBot.
Forneca informacoes gerais sobre medicamentos de forma acessivel.
NUNCA prescreva ou recomende medicamentos sem receita.
Sempre oriente o cliente a consultar um medico para diagnosticos.
```

### Exemplos de aiContext por Estado

#### `aguardando_mensagem_livre`
```javascript
const aiContext =
  `Atendente virtual da FarmaBot.\n` +
  `Cliente: ${session.nome || 'nao identificado'}.\n` +
  `Carrinho: ${session.carrinho.length} itens.\n` +
  `O cliente enviou uma pergunta livre. Responda de forma util.\n` +
  `Se perguntar sobre remedio, informe que temos e sugira ver categorias.\n` +
  `Se perguntar algo fora do escopo, redirecione educadamente.`;
```

#### `detalhes_produto`
```javascript
const produto = CATALOGO.flatMap(c => c.produtos).find(p => p.id === session.produtoAtual);
const aiContext =
  `Atendente da FarmaBot.\n` +
  `Produto: ${produto.nome} - ${produto.descricao}.\n` +
  `Preco: R$${produto.preco.toFixed(2)}.\n` +
  `O cliente quer saber mais sobre este produto.\n` +
  `Forneca detalhes uteis. Se for medicamento, informe bula resumida.\n` +
  `NAO prescreva.`;
```

## Regras de Conteudo

### O que a IA PODE fazer
- Informar sobre produtos do catalogo
- Dar orientacoes gerais de saude
- Explicar posologia de medicamentos OTC
- Sugerir categorias de produtos
- Responder sobre horarios, entrega, pagamento

### O que a IA NAO PODE fazer
- Prescrever medicamentos
- Fazer diagnosticos
- Recomendar dosagens especificas
- Substituir consulta medica
- Processar receitas medicas (deve pedir foto da receita)

## Checklist para Prompts

1. [ ] System prompt inclui identidade (FarmaBot)
2. [ ] Contexto do cliente incluido (nome, estado, carrinho)
3. [ ] Formatacao WhatsApp instruda (`*bold*`, `\n`)
4. [ ] Limite de tamanho definido (max 3 paragrafos)
5. [ ] Restricoes medicas/eticas incluidas
6. [ ] Persona adequada ao contexto
7. [ ] max_tokens <= 400
8. [ ] temperature adequada (0.7 conversacional, 0.3 factual)

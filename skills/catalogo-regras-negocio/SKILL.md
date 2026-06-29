---
name: catalogo-regras-negocio
description: Gerenciar catalogo de produtos e regras de negocio do FarmaBot. Usar quando precisar adicionar produto, criar categoria, alterar precos, modificar regras de frete/desconto/pagamento, implementar feature do backlog (busca por nome, recompra, cupom), ou entender as regras de negocio que o bot aplica.
---

# Catalogo & Regras de Negocio - FarmaBot

## Estrutura do Catalogo

O catalogo e definido como constante no Code node "Logica do Bot":

```javascript
const CATALOGO = [
  {
    id: 1,
    nome: 'Medicamentos Basicos',
    emoji: '💊',
    produtos: [
      { id: 101, nome: 'Dipirona 500mg', descricao: 'Analgesico e antipiretico', preco: 8.50, receita: false },
      { id: 102, nome: 'Paracetamol 750mg', descricao: 'Analgesico e antipiretico', preco: 6.50, receita: false },
      { id: 103, nome: 'Ibuprofeno 400mg', descricao: 'Anti-inflamatorio', preco: 12.00, receita: false }
    ]
  },
  // ... mais categorias
];
```

### Categorias Atuais (6)

| ID | Nome | Emoji | Qtd Produtos |
|---|---|---|---|
| 1 | Medicamentos Basicos | 💊 | 3 |
| 2 | Vitaminas e Suplementos | 🧬 | 2 |
| 3 | Higiene Pessoal | 🧴 | 2 |
| 4 | Cuidados com Bebe | 👶 | 2 |
| 5 | Primeiros Socorros | 🩹 | 3 |
| 6 | Dermocosmeticos | ✨ | 2 |

### Produtos (14 total)

| ID | Produto | Preco | Receita |
|---|---|---|---|
| 101 | Dipirona 500mg | R$8,50 | Nao |
| 102 | Paracetamol 750mg | R$6,50 | Nao |
| 103 | Ibuprofeno 400mg | R$12,00 | Nao |
| 201 | Vitamina C 1g | R$15,00 | Nao |
| 202 | Complexo B | R$18,50 | Nao |
| 301 | Shampoo Anticaspa | R$22,00 | Nao |
| 302 | Protetor Solar FPS 50 | R$35,00 | Nao |
| 401 | Pomada para Assaduras | R$16,00 | Nao |
| 402 | Soro Fisiologico | R$8,00 | Nao |
| 501 | Curativo Adesivo cx20 | R$7,50 | Nao |
| 502 | Gaze Esteril pct10 | R$9,00 | Nao |
| 503 | Alcool 70% 500ml | R$10,00 | Nao |
| 601 | Creme Hidratante | R$28,00 | Nao |
| 602 | Protetor Labial | R$12,50 | Nao |

## Adicionando Produtos

### Novo produto em categoria existente

```javascript
// Dentro da categoria correspondente em CATALOGO
{
  id: 104,                          // ID unico: centena = categoria, unidade = sequencial
  nome: 'Amoxicilina 500mg',       // Nome comercial + dosagem
  descricao: 'Antibiotico penicilina', // Descricao curta
  preco: 25.00,                     // Preco em reais (float)
  receita: true                     // Requer receita medica?
}
```

**Regras de ID:**
- Categoria 1 = IDs 100-199
- Categoria 2 = IDs 200-299
- etc.
- Novo produto: proximo ID sequencial da categoria

### Nova categoria

```javascript
{
  id: 7,                            // Proximo sequencial
  nome: 'Nutricao Esportiva',      // Nome da categoria
  emoji: '💪',                      // Emoji representativo
  produtos: [
    { id: 701, nome: 'Whey Protein', descricao: 'Proteina isolada 900g', preco: 42.00, receita: false },
    // ...
  ]
}
```

**Ao adicionar categoria, atualizar:**
1. Array `CATALOGO` no Code node
2. Estado `lista_categorias` (loop de exibicao)
3. Validacao de input no estado (numero maximo)

## Regras de Negocio

### Frete

```javascript
const FRETE = 5.90; // Fixo para qualquer pedido

// Aplicacao:
const subtotal = carrinho.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
const total = subtotal + FRETE;
```

**Futuro:** Frete gratis acima de R$X (backlog)

### Desconto PIX

```javascript
const DESCONTO_PIX = 0.05; // 5%

// Aplicacao (sobre subtotal, NAO sobre frete):
if (formaPagamento === 'pix') {
  const desconto = subtotal * DESCONTO_PIX;
  const totalComDesconto = (subtotal - desconto) + FRETE;
}
```

### Formas de Pagamento

| Opcao | Codigo | Desconto |
|---|---|---|
| 1 - PIX | `pix` | 5% sobre subtotal |
| 2 - Cartao (na entrega) | `cartao` | Nenhum |
| 3 - Dinheiro | `dinheiro` | Nenhum |

### Prazo de Entrega

```javascript
const PRAZO_ENTREGA = '4 horas'; // Padrao fixo
```

### Receita Medica

```javascript
// Verificacao ao adicionar produto:
if (produto.receita === true) {
  session.estado = 'aguardando_receita';
  session.produtoPendenteReceita = produto.id;
  responseText = '📋 Este medicamento requer receita medica.\nPor favor, envie uma *foto da receita*.';
}
```

Fluxo:
1. Cliente tenta adicionar produto com `receita: true`
2. Bot pede foto da receita
3. Estado muda para `aguardando_receita`
4. Ao receber imagem (`messageType === 'image'`), registra e adiciona ao carrinho
5. Volta ao menu principal

## Carrinho

### Estrutura

```javascript
session.carrinho = [
  {
    id: 101,
    nome: 'Dipirona 500mg',
    preco: 8.50,
    quantidade: 2
  }
];
```

### Operacoes

```javascript
// Adicionar item
function adicionarAoCarrinho(session, produto, qtd = 1) {
  const existente = session.carrinho.find(i => i.id === produto.id);
  if (existente) {
    existente.quantidade += qtd;
  } else {
    session.carrinho.push({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      quantidade: qtd
    });
  }
}

// Remover item
function removerDoCarrinho(session, produtoId) {
  session.carrinho = session.carrinho.filter(i => i.id !== produtoId);
}

// Limpar carrinho
function limparCarrinho(session) {
  session.carrinho = [];
}

// Calcular total
function calcularTotal(session) {
  const subtotal = session.carrinho.reduce((sum, i) => sum + i.preco * i.quantidade, 0);
  return { subtotal, frete: 5.90, total: subtotal + 5.90 };
}
```

## Backlog de Features (Priorizado)

### Alta Prioridade

#### Busca por Nome de Produto
```
Estado: aguardando_busca
Trigger: usuario digita nome ao inves de numero
Logica: CATALOGO.flatMap(c => c.produtos).filter(p =>
  p.nome.toLowerCase().includes(busca.toLowerCase()))
Exibir: lista filtrada, ou "nenhum resultado"
```

#### Dashboard de Metricas
```
Ver skill: dashboard-metricas
```

### Media Prioridade

#### Recompra Rapida
```
Estado: recompra_rapida
Dados: session.ultimoPedido ou persistir em DB
Logica: mostrar itens do ultimo pedido, permitir "repetir pedido"
```

#### Cupom de Desconto
```
Estado: inserir_cupom (antes de confirmar pedido)
Dados: tabela de cupons {codigo, tipo, valor, validade, usoMaximo}
Logica: validar e aplicar desconto no subtotal
```

#### Rastreamento de Pedido Real
```
Estado: rastreamento_pedido
Integrar: API de entregas / status manual
Status: preparando -> saiu_entrega -> entregue
```

### Baixa Prioridade

#### Envio de Imagem do Produto
```
Integracao: Z-API send-image
Dados: campo imagem_url no produto
Trigger: mostrar foto no detalhes_produto
```

#### Multiplos Enderecos
```
Dados: session.enderecos[] (array)
Logica: escolher endereco salvo ou digitar novo
```

#### Avaliacao Pos-Compra
```
Estado: avaliacao_pedido
Trigger: mensagem agendada apos entrega
Dados: nota 1-5 + comentario opcional
```

## Implementando Feature do Backlog

### Template de implementacao

1. **Definir estados** necessarios (ver skill `n8n-maquina-de-estados`)
2. **Adicionar dados** ao catalogo/sessao se necessario
3. **Implementar case** no switch da maquina de estados
4. **Atualizar menus** que referenciam a feature
5. **Testar cenarios** (ver skill `testes-conversacao-bot`)
6. **Revisar** propagacao de dados e formatacao WhatsApp

### Exemplo: Busca por Nome

```javascript
// No estado lista_categorias ou menu_principal, detectar texto livre:
case 'menu_principal':
  if (!['1','2','3','4','0','menu'].includes(messageTextLower)) {
    // Pode ser busca por nome
    const resultados = CATALOGO
      .flatMap(c => c.produtos)
      .filter(p => p.nome.toLowerCase().includes(messageTextLower));

    if (resultados.length > 0) {
      session.resultadosBusca = resultados;
      session.estado = 'resultado_busca';
      let msg = `*🔍 Resultados para "${messageText}"*\n━━━━━━━━━━━━\n\n`;
      resultados.forEach((p, i) => {
        msg += `${i + 1}️⃣ *${p.nome}* - R$${p.preco.toFixed(2)}\n`;
      });
      msg += `\n0️⃣ Voltar ao menu\n_Digite o numero do produto_`;
      responseText = msg;
    } else {
      responseText = `Nao encontrei "${messageText}" no catalogo. 🤔\nDigite *1* para ver categorias.`;
    }
  }
  break;
```

## Checklist para Mudancas no Catalogo

1. [ ] ID do produto/categoria unico e segue padrao (centena = cat)
2. [ ] Preco definido como float com 2 decimais
3. [ ] Campo `receita` definido (true/false)
4. [ ] Descricao do produto curta e informativa
5. [ ] Emoji da categoria adequado
6. [ ] Estados de exibicao atualizados (lista_categorias, lista_produtos)
7. [ ] Validacao de input do usuario ajustada (numeros validos)
8. [ ] Testes de navegacao executados

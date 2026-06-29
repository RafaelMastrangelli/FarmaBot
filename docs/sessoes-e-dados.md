# Sessoes e Dados

## Gerenciamento de Sessoes

### Armazenamento

As sessoes sao armazenadas no **n8n Workflow Static Data** (escopo `global`), que persiste entre execucoes do workflow enquanto o n8n estiver rodando.

```
staticData.sessions[phone] = { ... }
```

### Estrutura da Sessao

```javascript
{
  phone: '5531999999999',       // Telefone do usuario (chave primaria)
  step: 'MENU_PRINCIPAL',       // Estado atual da maquina de estados
  cartItems: [],                 // Array de itens no carrinho
  customerName: 'Joao',         // Nome informado pelo usuario
  currentCategory: '1',         // Categoria sendo navegada
  selectedProduct: 'P01',       // Produto selecionado para acao
  pendingProduct: null,          // Produto aguardando receita
  deliveryAddress: '',           // Endereco de entrega
  paymentMethod: '',             // Forma de pagamento escolhida
  orderTotal: 0,                 // Total do pedido finalizado
  orderId: null,                 // ID do pedido (PED-timestamp)
  orderStatus: null,             // Status do pedido
  messageCount: 5,               // Total de mensagens na sessao
  startedAt: '2026-02-25T...',  // Timestamp de criacao
  lastInteraction: '2026-02-25T...' // Ultimo contato
}
```

### Ciclo de Vida

1. **Criacao**: Primeira mensagem de um telefone novo cria sessao no step `INICIO`
2. **Atualizacao**: Cada mensagem atualiza `lastInteraction` e incrementa `messageCount`
3. **Expiracao**: Sessoes com mais de **2 horas** sem interacao sao removidas automaticamente
4. **Limpeza**: A cada execucao, o node "Busca Sessao" varre todas as sessoes e remove as expiradas

### Item do Carrinho

```javascript
{
  productId: 'P01',
  nome: 'Dipirona 500mg',
  qtd: 2,
  preco: 8.90,
  subtotal: 17.80           // qtd * preco
}
```

---

## Sistema de Metricas

### Armazenamento

As metricas ficam em `staticData.metrics` (mesmo Static Data global).

### Estrutura

```javascript
{
  totalMensagens: 150,
  totalSessoes: 30,
  totalPedidos: 8,
  receitaTotal: 245.60,
  transferenciasHumano: 3,
  ultimosEventos: [ ... ],      // Ultimos 200 eventos (FIFO)
  estatisticasDiarias: {
    '2026-02-25': {
      mensagens: 45,
      sessoes: 10,
      pedidos: 3,
      receita: 89.70,
      transferencias: 1
    }
  }
}
```

### Campos Calculados

| Campo | Formula |
|---|---|
| `taxaConversao` | `(totalPedidos / totalSessoes) * 100` |
| `ticketMedio` | `receitaTotal / totalPedidos` |

### Eventos

Cada execucao gera um evento no array `ultimosEventos`:

```javascript
{
  id: 'EVT-1740480600000',
  timestamp: '2026-02-25T10:30:00.000Z',
  phone: '5531999999999',
  customerName: 'Joao',
  step: 'MENU_PRINCIPAL',
  orderId: null,
  orderTotal: null,
  event: 'MENSAGEM'         // ou 'PEDIDO_CRIADO' ou 'TRANSFERENCIA_HUMANO'
}
```

O array e limitado a 200 eventos (os mais antigos sao descartados).

### Tipos de Evento

| Tipo | Quando |
|---|---|
| `MENSAGEM` | Qualquer mensagem processada |
| `PEDIDO_CRIADO` | Pedido confirmado pelo usuario (step = PEDIDO_FINALIZADO) |
| `TRANSFERENCIA_HUMANO` | Usuario solicita atendente (step = AGUARDANDO_HUMANO) |

### Protecao contra Duplicatas

O evento `PEDIDO_CRIADO` verifica se o `orderId` ja existe em `ultimosEventos` antes de incrementar os contadores. Isso evita contagem duplicada quando o usuario envia mais mensagens apos finalizar.

---

## Limitacoes

| Limitacao | Impacto | Mitigacao |
|---|---|---|
| Static Data e in-memory | Dados perdidos ao reiniciar n8n | Aceitavel para bot de demonstracao. Producao deve usar Redis ou banco de dados |
| Sem persistencia em disco | Metricas historicas perdidas em reinicio | WebApp persiste metricas via endpoint `/api/metrics` |
| Sessoes expiram em 2h | Usuario perde progresso apos inatividade | Tempo suficiente para fluxo completo de compra |
| Limite de 200 eventos | Historico limitado | Suficiente para dashboard em tempo real |
| Sem lock de concorrencia | Mensagens simultaneas do mesmo usuario podem causar race condition | Improvavel em WhatsApp (usuarios enviam uma mensagem por vez) |

## Modo Debug

O workflow suporta um modo debug ativado pelo campo `_debugMode` no payload de entrada:

- Pula salvamento de sessao
- Pula logica de rota
- Util para testar nodes individuais sem efeitos colaterais

---
name: testes-conversacao-bot
description: Testar fluxos de conversacao do FarmaBot. Usar quando precisar criar cenarios de teste, validar transicoes de estado, testar edge cases (carrinho vazio, produto invalido, timeout sessao), simular conversas completas, verificar regras de negocio, ou debugar comportamento inesperado do bot.
---

# Testes de Conversacao - FarmaBot

## Como Testar no n8n

### Execucao Manual
1. Abrir workflow no editor n8n
2. Clicar em "Test workflow"
3. Enviar POST para `/webhook-test/whatsapp-farmacia` com payload Z-API simulado
4. Inspecionar dados em cada node

### Payload de Teste

```json
{
  "phone": "5531999999999",
  "body": {
    "message": "ola",
    "type": "text"
  },
  "isGroup": false
}
```

### Ferramenta: cURL para Teste

```bash
curl -X POST http://localhost:5678/webhook-test/whatsapp-farmacia \
  -H "Content-Type: application/json" \
  -d '{"phone":"5531999999999","body":{"message":"ola","type":"text"},"isGroup":false}'
```

## Cenarios de Teste

### CT-01: Happy Path - Compra Completa

| Passo | Mensagem Enviada | Estado Esperado | Resposta Contem |
|---|---|---|---|
| 1 | "ola" | `menu_principal` | "FarmaBot", opcoes 1-4 |
| 2 | "1" | `lista_categorias` | categorias numeradas |
| 3 | "1" | `lista_produtos` | produtos da categoria |
| 4 | "1" | `detalhes_produto` | nome, preco, descricao |
| 5 | "1" (adicionar) | `menu_principal` | "adicionado ao carrinho" |
| 6 | "2" (carrinho) | `visualiza_carrinho` | itens, total, opcoes |
| 7 | "1" (finalizar) | `coleta_nome` | "qual seu nome" |
| 8 | "Joao" | `coleta_endereco` | "qual seu endereco" |
| 9 | "Rua X, 123" | `coleta_pagamento` | formas de pagamento |
| 10 | "1" (PIX) | `confirma_pedido` | resumo com desconto PIX |
| 11 | "1" (confirmar) | `pedido_confirmado` | numero pedido, prazo |

### CT-02: Navegacao de Categorias

| Passo | Mensagem | Estado | Validar |
|---|---|---|---|
| 1 | "ola" | `menu_principal` | Menu exibido |
| 2 | "1" | `lista_categorias` | 6 categorias |
| 3 | "0" (voltar) | `menu_principal` | Volta ao menu |
| 4 | "1" | `lista_categorias` | Categorias novamente |
| 5 | "7" (invalido) | `lista_categorias` | "opcao invalida" |

### CT-03: Carrinho Vazio

| Passo | Mensagem | Estado | Validar |
|---|---|---|---|
| 1 | "ola" | `menu_principal` | - |
| 2 | "2" | `visualiza_carrinho` | "carrinho vazio" |
| 3 | - | `menu_principal` | Redireciona ao menu |

### CT-04: Produto com Receita Medica

| Passo | Mensagem | Estado | Validar |
|---|---|---|---|
| 1-4 | (navegar ate produto controlado) | `detalhes_produto` | - |
| 5 | "1" (adicionar) | `aguardando_receita` | "envie foto da receita" |
| 6 | (imagem) | `menu_principal` | "receita recebida" |

### CT-05: Transferencia para Humano

| Passo | Mensagem | Estado | Validar |
|---|---|---|---|
| 1 | "ola" | `menu_principal` | - |
| 2 | "4" | `transferindo_humano` | "transferindo para atendente" |
| 3 | (qualquer) | `em_fila_humano` | "aguarde, voce esta na fila" |
| - | - | - | Notificacao enviada ao atendente |

### CT-06: Cancelamento de Pedido

| Passo | Mensagem | Estado | Validar |
|---|---|---|---|
| 1-6 | (ate visualizar carrinho) | `visualiza_carrinho` | - |
| 7 | "3" (cancelar) | `menu_principal` | "carrinho esvaziado" |
| 8 | "2" (carrinho) | `visualiza_carrinho` | "carrinho vazio" |

### CT-07: Reset via "menu"

| Passo | Mensagem | Estado | Validar |
|---|---|---|---|
| 1-4 | (qualquer estado) | qualquer | - |
| 5 | "menu" | `menu_principal` | Menu exibido, estado resetado |

### CT-08: Mensagem Livre com IA

| Passo | Mensagem | Estado | Validar |
|---|---|---|---|
| 1 | "ola" | `menu_principal` | - |
| 2 | "voces tem dipirona?" | `aguardando_mensagem_livre` | useAI=true |
| 3 | - | - | Resposta gerada pela Groq |

### CT-09: Sessao Expirada (Timeout 2h)

| Passo | Mensagem | Estado | Validar |
|---|---|---|---|
| 1 | "ola" | `menu_principal` | Sessao criada |
| 2 | (esperar 2h+) | - | - |
| 3 | "ola" | `menu_principal` | Nova sessao, carrinho vazio |

### CT-10: Multiplos Itens no Carrinho

| Passo | Mensagem | Estado | Validar |
|---|---|---|---|
| 1-5 | (adicionar item 1) | `menu_principal` | "1 item no carrinho" |
| 6-10 | (adicionar item 2) | `menu_principal` | "2 itens no carrinho" |
| 11 | "2" (carrinho) | `visualiza_carrinho` | 2 itens listados, total correto |

## Validacoes de Regras de Negocio

### Precos e Calculos

| Regra | Validacao |
|---|---|
| Frete fixo | Total inclui + R$5,90 |
| Desconto PIX | 5% sobre subtotal (nao sobre frete) |
| Preco produto | Confere com catalogo |
| Total carrinho | Soma correta de todos os itens |

### Dados do Cliente

| Campo | Validacao |
|---|---|
| Nome | Nao vazio, string |
| Endereco | Nao vazio, string |
| Telefone | Formato 55XXXXXXXXXXX |
| Pagamento | 1 (PIX), 2 (Cartao), 3 (Dinheiro) |

### Restricoes

| Regra | Teste |
|---|---|
| Receita medica | Produtos controlados exigem foto |
| Horario entrega | Prazo maximo 4 horas |
| Carrinho vazio | Nao permite finalizar sem itens |
| Opcao invalida | Mensagem de erro + repete opcoes |

## Debug Mode

### Ativando debug no Code node

```javascript
const DEBUG = true;

// No inicio do "Logica do Bot"
if (DEBUG) {
  console.log(`[DEBUG] Phone: ${phone}`);
  console.log(`[DEBUG] Estado: ${session.estado}`);
  console.log(`[DEBUG] Mensagem: ${messageTextLower}`);
  console.log(`[DEBUG] Carrinho: ${JSON.stringify(session.carrinho)}`);
}
```

### Verificando Static Data no nó

```javascript
// Node temporario para inspecionar todas as sessoes
const staticData = $getWorkflowStaticData('global');
const sessions = staticData.sessions || {};
return [{
  json: {
    totalSessions: Object.keys(sessions).length,
    sessions: Object.entries(sessions).map(([phone, s]) => ({
      phone,
      estado: s.estado,
      itensCarrinho: s.carrinho?.length || 0,
      ultimaInteracao: new Date(s.ultimaInteracao).toISOString()
    }))
  }
}];
```

## Erros Comuns e Diagnostico

| Sintoma | Causa Provavel | Verificar |
|---|---|---|
| Bot nao responde | Webhook desconectado | URL do webhook no Z-API |
| Sempre volta ao menu | Sessao nao salva | `staticData.sessions[phone] = session` |
| Carrinho sempre vazio | Sessao recriada | Verificar logica de `isNewSession` |
| Erro 500 no webhook | Excecao no Code node | Logs do n8n, try/catch |
| IA nao responde | API key invalida/timeout | Verificar `GROQ_API_KEY` no `.env`, timeout 15s |
| Mensagem duplicada | Webhook chamado 2x | Verificar Z-API config |
| Estado incorreto | Transicao errada | Console.log em cada case |

## Checklist de Testes

1. [ ] CT-01: Happy path completo executado
2. [ ] CT-02: Navegacao de categorias (ida e volta)
3. [ ] CT-03: Carrinho vazio tratado
4. [ ] CT-04: Produto com receita medica
5. [ ] CT-05: Transferencia para humano + notificacao
6. [ ] CT-06: Cancelamento de pedido
7. [ ] CT-07: Reset via "menu" de qualquer estado
8. [ ] CT-08: Mensagem livre processada pela IA
9. [ ] CT-09: Timeout de sessao (2h)
10. [ ] CT-10: Multiplos itens no carrinho
11. [ ] Precos e calculos conferidos
12. [ ] Dados do cliente validados
13. [ ] Restricoes de negocio funcionando

# Maquina de Estados

O bot utiliza uma maquina de estados finita (FSM) para controlar o fluxo de conversa. Cada sessao de usuario possui um campo `step` que determina o comportamento do bot.

## Estados

| Estado | Descricao | Usa IA? |
|---|---|---|
| `INICIO` | Primeiro contato, exibe boas-vindas | Nao |
| `AGUARDANDO_NOME` | Espera o usuario informar seu nome | Condicional |
| `MENU_PRINCIPAL` | Menu com 4 opcoes principais | Condicional |
| `ESCOLHENDO_CATEGORIA` | Lista de 6 categorias de produtos | Condicional |
| `ESCOLHENDO_PRODUTO` | Lista de produtos da categoria selecionada | Condicional |
| `DETALHES_PRODUTO` | Informacoes detalhadas de um produto (modo farmaceutico) | Sim |
| `AGUARDANDO_RECEITA` | Espera envio de foto de receita medica | Sim |
| `CONFIRMANDO_QUANTIDADE` | Espera quantidade desejada (1-99) | Sim |
| `POS_ADICIONAR` | Item adicionado ao carrinho, proximo passo | Condicional |
| `REVISANDO_CARRINHO` | Exibe carrinho com opcoes de finalizar/continuar/esvaziar | Condicional |
| `AGUARDANDO_ENDERECO` | Espera endereco completo de entrega | Sim |
| `ESCOLHENDO_PAGAMENTO` | Selecao de forma de pagamento (PIX, cartao, dinheiro) | Sim |
| `CONFIRMANDO_PEDIDO` | Resumo final do pedido para confirmacao | Sim |
| `PEDIDO_FINALIZADO` | Pedido confirmado, atendimento pos-venda | Sim |
| `CONSULTA_PEDIDO` | Busca por numero de pedido | Sim |
| `AGUARDANDO_HUMANO` | Na fila para atendimento humano | Sim |

## Diagrama de Transicoes

```
INICIO
  |
  v
AGUARDANDO_NOME --[nome valido]--> MENU_PRINCIPAL
  ^                                    |
  |                                    +--[1/produto]---> ESCOLHENDO_CATEGORIA
  |                                    +--[2/pedido]----> CONSULTA_PEDIDO
  |                                    +--[3/carrinho]--> REVISANDO_CARRINHO
  |                                    +--[4/atendente]-> AGUARDANDO_HUMANO
  |                                    +--[texto livre]-> (IA redireciona)
  |                                    |
  |                    ESCOLHENDO_CATEGORIA
  |                        |
  |                        +--[0/voltar]--> MENU_PRINCIPAL
  |                        +--[1-6]-------> ESCOLHENDO_PRODUTO
  |                                             |
  |                             +--[0/voltar]----> ESCOLHENDO_CATEGORIA
  |                             +--[numero]------> CONFIRMANDO_QUANTIDADE
  |                             |                  (se receita -> AGUARDANDO_RECEITA)
  |                             +--[numero?]-----> DETALHES_PRODUTO
  |                                                    |
  |                                    +--[0/voltar]--> ESCOLHENDO_PRODUTO
  |                                    +--[sim]-------> CONFIRMANDO_QUANTIDADE
  |                                                     (se receita -> AGUARDANDO_RECEITA)
  |                                                         |
  |      AGUARDANDO_RECEITA --[imagem/doc]--> CONFIRMANDO_QUANTIDADE
  |                                                         |
  |                                  +--[qtd valida]----> POS_ADICIONAR
  |                                                         |
  |                           +--[1/continuar]--> ESCOLHENDO_CATEGORIA
  |                           +--[2/carrinho]---> REVISANDO_CARRINHO
  |                           +--[3/esvaziar]---> MENU_PRINCIPAL
  |                                                    |
  |                  REVISANDO_CARRINHO                |
  |                      |                              |
  |                      +--[1/finalizar]--> AGUARDANDO_ENDERECO
  |                      +--[2/continuar]--> ESCOLHENDO_CATEGORIA
  |                      +--[3/esvaziar]---> MENU_PRINCIPAL
  |                                              |
  |                               AGUARDANDO_ENDERECO
  |                                    |
  |                                    +--[endereco valido]--> ESCOLHENDO_PAGAMENTO
  |                                                               |
  |                                                +--[1-4]----> CONFIRMANDO_PEDIDO
  |                                                                  |
  |                                                   +--[confirmar]--> PEDIDO_FINALIZADO
  |                                                   +--[cancelar]---> MENU_PRINCIPAL
  |
  +--- "menu"/"voltar"/"0" de qualquer estado (exceto iniciais) --> MENU_PRINCIPAL
  +--- "humano"/"atendente"/"pessoa" de qualquer estado ---------> AGUARDANDO_HUMANO
```

## Comandos Globais

Estes comandos funcionam em qualquer estado (processados no node "Decide Rota"):

| Comando | Acao | Excecoes |
|---|---|---|
| `menu`, `inicio`, `voltar`, `0` | Retorna ao MENU_PRINCIPAL | Nao funciona em INICIO, AGUARDANDO_NOME, DETALHES_PRODUTO, ESCOLHENDO_PRODUTO, ESCOLHENDO_CATEGORIA |
| `humano`, `atendente`, `pessoa`, `falar com alguem`, `ajuda humana` | Transfere para atendente humano | Nenhuma |

## Regras de Negocio por Estado

### AGUARDANDO_NOME
- Nome deve ter pelo menos 2 caracteres
- Nome invalido: pede novamente

### ESCOLHENDO_PRODUTO
- Digitar `numero` seleciona para compra
- Digitar `numero?` (com interrogacao) abre detalhes do produto
- Palavras como "explique", "detalhe", "para que serve" acionam modo farmaceutico

### AGUARDANDO_RECEITA
- Aceita apenas `image` ou `document` como tipo de mensagem
- Qualquer texto: lembra que precisa enviar a foto da receita

### CONFIRMANDO_QUANTIDADE
- Aceita inteiros entre 1 e 99
- Qualquer outro valor: pede novamente

### AGUARDANDO_ENDERECO
- Endereco deve ter pelo menos 10 caracteres
- Endereco curto: pede mais detalhes

### ESCOLHENDO_PAGAMENTO
- Opcoes: 1=PIX (5% desconto), 2=Credito, 3=Debito, 4=Dinheiro
- PIX aplica desconto de 5% sobre subtotal dos produtos

### PEDIDO_FINALIZADO
- Gera ID no formato `PED-{timestamp}`
- Se PIX: exibe chave PIX para pagamento
- Qualquer mensagem posterior: informa status e oferece menu

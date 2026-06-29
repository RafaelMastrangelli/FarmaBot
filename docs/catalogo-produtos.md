# Catalogo de Produtos

O catalogo e definido como constante hardcoded dentro do node "Logica do Bot". Ele e composto por categorias e produtos.

## Categorias

| ID | Nome | Emoji |
|---|---|---|
| 1 | Analgesicos e Antitermicos | 💊 |
| 2 | Antibioticos (receita obrigatoria) | 💉 |
| 3 | Vitaminas e Suplementos | 🌿 |
| 4 | Dermatologicos | 🧴 |
| 5 | Cardiovascular (receita obrigatoria) | ❤️‍🩹 |
| 6 | Gastrintestinal | 🫁 |

## Produtos

| ID | Categoria | Nome | Descricao | Preco (R$) | Receita | Estoque |
|---|---|---|---|---|---|---|
| P01 | 1 | Dipirona 500mg | Caixa c/ 20 comprimidos | 8.90 | Nao | Sim |
| P02 | 1 | Paracetamol 750mg | Caixa c/ 20 comprimidos | 6.50 | Nao | Sim |
| P03 | 1 | Ibuprofeno 600mg | Caixa c/ 20 comprimidos | 14.90 | Nao | Sim |
| P04 | 2 | Amoxicilina 500mg | Caixa c/ 15 capsulas | 22.00 | Sim | Sim |
| P05 | 2 | Azitromicina 500mg | Caixa c/ 3 comprimidos | 18.50 | Sim | Nao |
| P06 | 3 | Vitamina C 1g | Frasco c/ 30 efervescentes | 24.90 | Nao | Sim |
| P07 | 3 | Vitamina D3 2000UI | Frasco c/ 60 capsulas | 39.90 | Nao | Sim |
| P08 | 3 | Omega 3 1000mg | Frasco c/ 60 capsulas | 34.90 | Nao | Sim |
| P09 | 4 | Hidratante Corporal | Frasco 200ml pele seca | 19.90 | Nao | Sim |
| P10 | 4 | Protetor Solar FPS50 | Bisnaga 60g facial | 42.00 | Nao | Sim |
| P11 | 5 | Enalapril 10mg | Caixa c/ 30 comprimidos | 12.00 | Sim | Sim |
| P12 | 5 | Losartana 50mg | Caixa c/ 30 comprimidos | 14.50 | Sim | Sim |
| P13 | 6 | Omeprazol 20mg | Caixa c/ 28 capsulas | 15.90 | Nao | Sim |
| P14 | 6 | Buscopan Composto | Caixa c/ 20 drageas | 21.00 | Nao | Sim |

## Estrutura de Dados

### Categoria

```javascript
{
  id: '1',          // String numerica, usada como input do usuario
  nome: 'Nome',     // Nome exibido na listagem
  emoji: '💊'       // Emoji decorativo
}
```

### Produto

```javascript
{
  id: 'P01',        // Identificador unico (P + 2 digitos)
  cat: '1',         // ID da categoria (foreign key)
  nome: 'Nome',     // Nome do produto
  desc: 'Descricao',// Descricao curta (embalagem/quantidade)
  preco: 8.90,      // Preco unitario em reais (float)
  receita: false,    // Exige receita medica?
  estoque: true      // Disponivel em estoque?
}
```

## Regras de Negocio

### Produtos com Receita (`receita: true`)
- Categorias 2 (Antibioticos) e 5 (Cardiovascular) possuem produtos com receita
- O bot solicita envio de foto/documento da receita antes de adicionar ao carrinho
- Mensagem de contexto IA explica a obrigatoriedade da receita
- Somente imagens e documentos sao aceitos como prova de receita

### Produtos sem Estoque (`estoque: false`)
- Apenas P05 (Azitromicina 500mg) esta sem estoque
- O bot informa indisponibilidade e sugere alternativas
- Nao permite adicionar ao carrinho

### Frete
- Valor fixo: R$ 5,90 em todos os pedidos
- Somado ao total no carrinho e na finalizacao

### Desconto PIX
- 5% sobre o subtotal dos produtos (nao sobre o frete)
- Aplicado somente quando forma de pagamento = PIX

## Como Alterar o Catalogo

O catalogo esta definido na constante `CATALOGO` dentro do node "Logica do Bot" (Code node). Para modificar:

1. Abra o workflow no editor n8n
2. Clique no node "Logica do Bot"
3. Localize o objeto `CATALOGO` no inicio do codigo
4. Adicione/remova/edite categorias em `categorias[]`
5. Adicione/remova/edite produtos em `produtos[]`
6. Mantenha consistencia nos IDs (categoria `id` deve bater com produto `cat`)
7. Salve e teste o workflow

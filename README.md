# 🛍️ Loja Completa — Multi-página + Pagamentos

Site de vendas profissional com **páginas separadas**, **carrinho**, **checkout com PIX/cartão/dinheiro** e **ambiente de teste de pagamento** — tudo configurável por arquivos `.txt`.

## ▶️ Como rodar

```bash
python -m http.server 8000
```

Abra **http://localhost:8000**

> Também funciona em **Netlify, Vercel, GitHub Pages** (arraste a pasta).

## 🧪 Como testar o pagamento PIX

1. Acesse `produtos.html` → adicione itens → vá para `checkout.html`
2. Preencha **nome, WhatsApp e endereço**
3. Escolha **PIX** como método e **"Pagar agora pelo site"**
4. Aparecerá um **QR Code simulado** + código copia-e-cola
5. Clique em **"Simular pagamento aprovado"**
6. Clique em **"Confirmar pedido"** → abre o WhatsApp com o pedido formatado para **+55 (19) 92001-8893**

> O número de destino já está configurado em `data/config.txt` (`whatsapp=5519920018893`).

## 💳 Formas de pagamento suportadas

| Método       | Quando                                    |
| ------------ | ----------------------------------------- |
| **PIX**      | Pelo site (com QR simulado) ou na entrega |
| **Crédito**  | Pelo site (simulado) ou na entrega        |
| **Débito**   | Pelo site (simulado) ou na entrega        |
| **Dinheiro** | Apenas na entrega                         |

## 🎨 Customização (via `data/config.txt`)

```txt
nome_loja=Minha Loja
slogan=Frase de destaque
cor_primaria=#4f46e5
cor_secundaria=#4338ca
whatsapp=5519920018893
whatsapp_display=(19) 92001-8893
email=contato@loja.com
pix_chave=teste@minhaloja.com
```

## 📦 Adicionar produtos

Em `data/produtos.txt`:

```
7|Nome|99.90|Categoria|url-da-imagem|Descrição|10|sim
```

Campos: `id | nome | preço | categoria | imagem | descrição | estoque | destaque`

## ✍️ Adicionar post no blog

Em `data/blog.txt`:

```
Título do post|2025-03-01|Resumo curto|Conteúdo completo.\nUse \\n para quebrar linha.
```

## 🔒 Segurança

- **Escape HTML** em todo conteúdo dinâmico (previne XSS)
- **Validação** nos formulários e no checkout
- **Estoque limitado** — não deixa adicionar além do disponível
- **`rel="noopener"`** em links externos
- **Nenhum dado sensível** armazenado (carrinho apenas em `localStorage`)
- Recomendado usar **HTTPS** em produção

## 💰 Integração real de pagamentos

Este site **não processa pagamentos reais** — o botão "Simular pagamento" existe para testar o fluxo com segurança. Para cobrar de verdade:

1. **PIX real**: integre **Mercado Pago PIX** ou **Gerencianet/Efí** (geram o BR Code verdadeiro via API)
2. **Cartão**: **Stripe** ou **Mercado Pago Checkout**
3. Backend necessário (Node/PHP) para nunca expor chaves de API no frontend

O fluxo atual já envia o pedido completo para o WhatsApp do lojista — modelo **muito usado** por pequenos negócios no Brasil.

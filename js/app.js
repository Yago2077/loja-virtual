const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (n) => (isNaN(n) ? 0 : n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CART_KEY = "loja_cart_v4";
const PAGE = document.body.dataset.page || "home";

let CONFIG = {};
let PRODUTOS = [];
let BLOG = [];
let CART = [];

/* ==================== HELPERS ==================== */
function parseConfig(txt) {
  const cfg = {};
  txt.split(/\r?\n/).forEach((l) => {
    l = l.trim();
    if (!l || l.startsWith("#")) return;
    const i = l.indexOf("=");
    if (i < 0) return;
    cfg[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  });
  return cfg;
}
function parseLinhas(txt, campos) {
  return txt.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => {
    const p = l.split("|").map((x) => x.trim());
    const o = {};
    campos.forEach((c, i) => (o[c] = p[i] ?? ""));
    return o;
  });
}
async function carregarTxt(path) {
  const r = await fetch(path, { cache: "no-store" });
  if (!r.ok) throw new Error(path);
  return r.text();
}

/* ==================== CARRINHO ==================== */
function loadCart() { try { CART = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { CART = []; } }
function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(CART)); }
function getCartItens() { return CART.map((i) => { const p = PRODUTOS.find((x) => x.id === i.id); return p ? { ...p, qty: i.qty } : null; }).filter(Boolean); }
function cartTotal() { return getCartItens().reduce((s, i) => s + (parseFloat(i.preco) || 0) * i.qty, 0); }
function cartQtd() { return getCartItens().reduce((s, i) => s + i.qty, 0); }

function addCarrinho(id, qty = 1) {
  const p = PRODUTOS.find((x) => x.id === id);
  if (!p) return;
  const max = parseInt(p.estoque) || 0;
  if (max <= 0) return alert("Produto esgotado.");
  const item = CART.find((i) => i.id === id);
  if (item) {
    if (item.qty + qty > max) return alert("Estoque máximo atingido.");
    item.qty += qty;
  } else {
    CART.push({ id, qty });
  }
  saveCart();
  renderCartDrawer();
  renderCartBadge();
  abrirCarrinho();
  fecharModal();
}

function alterarQtd(id, delta) {
  const item = CART.find((i) => i.id === id);
  if (!item) return;
  const p = PRODUTOS.find((x) => x.id === id);
  const max = p ? parseInt(p.estoque) || 0 : 999;
  item.qty += delta;
  if (item.qty > max) item.qty = max;
  if (item.qty < 1) CART = CART.filter((i) => i.id !== id);
  saveCart();
  renderCartDrawer();
  renderCartBadge();
  if (PAGE === "checkout" && typeof renderCheckout === "function") renderCheckout();
}

/* ==================== HEADER / FOOTER ==================== */
function renderHeader() {
  const el = $("#app-header");
  if (!el) return;
  const menu = [
    { href: "index.html", label: "Início", page: "home" },
    { href: "produtos.html", label: "Produtos", page: "produtos" },
    { href: "sobre.html", label: "Sobre", page: "sobre" },
    { href: "blog.html", label: "Blog", page: "blog" },
    { href: "contato.html", label: "Contato", page: "contato" },
  ];
  el.className = "header";
  el.innerHTML = `
    <div class="container header-inner">
      <a href="index.html" class="logo">${esc(CONFIG.nome_loja || "Loja")}</a>
      <nav class="nav">
        ${menu.map((m) => `<a href="${m.href}" class="${PAGE === m.page ? "active" : ""}">${m.label}</a>`).join("")}
      </nav>
      <a href="checkout.html" class="cart-btn">🛒 <span class="cart-count" id="cartCount">0</span></a>
    </div>`;
}

function renderFooter() {
  const el = $("#app-footer");
  if (!el) return;
  const c = CONFIG;
  const waDisplay = c.whatsapp_display || c.whatsapp || "";
  el.className = "footer";
  el.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div><h4>${esc(c.nome_loja || "Loja")}</h4><p>${esc(c.descricao || "")}</p></div>
        <div><h4>Navegue</h4><ul><li><a href="index.html">Início</a></li><li><a href="produtos.html">Produtos</a></li><li><a href="sobre.html">Sobre</a></li><li><a href="blog.html">Blog</a></li><li><a href="contato.html">Contato</a></li></ul></div>
        <div><h4>Atendimento</h4><ul><li>${esc(c.email || "")}</li><li>${esc(waDisplay)}</li><li>${esc(c.horario || "")}</li></ul></div>
        <div><h4>Pagamento</h4><ul><li>🔷 PIX Online</li><li>💳 Cartão na entrega</li><li>💵 Dinheiro na entrega</li></ul></div>
      </div>
      <div class="footer-bottom">&copy; ${new Date().getFullYear()} ${esc(c.nome_loja || "")} — Todos os direitos reservados.</div>
    </div>`;
}

/* ==================== DRAWER ==================== */
function renderCartBadge() { const el = $("#cartCount"); if (el) el.textContent = cartQtd(); }
function renderCartDrawer() {
  const el = $("#cartDrawer");
  if (!el) return;
  const itens = getCartItens();
  el.innerHTML = `
    <div class="cart-header"><h3>Meu carrinho</h3><button id="cartClose">✕</button></div>
    <div class="cart-items">
      ${itens.length ? itens.map((i) => `
        <div class="cart-item">
          <div><strong>${esc(i.nome)}</strong><small>${money(parseFloat(i.preco) || 0)} × ${i.qty}</small></div>
          <div class="qty"><button data-dec="${esc(i.id)}">−</button><span>${i.qty}</span><button data-inc="${esc(i.id)}">+</button><button class="del" data-del="${esc(i.id)}">🗑</button></div>
        </div>`).join("") : '<p class="vazio" style="text-align:center;">Seu carrinho está vazio.</p>'}
    </div>
    <div class="cart-footer">
      <div class="summary-row" style="padding:0;border:0;color:var(--texto);font-weight:700;"><span>Total</span><strong>${money(cartTotal())}</strong></div>
      <a href="checkout.html" class="btn btn-block">Ir para o checkout</a>
    </div>`;
  el.querySelector("#cartClose").onclick = fecharCarrinho;
  el.querySelectorAll("[data-inc]").forEach((b) => (b.onclick = () => alterarQtd(b.dataset.inc, +1)));
  el.querySelectorAll("[data-dec]").forEach((b) => (b.onclick = () => alterarQtd(b.dataset.dec, -1)));
  el.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => alterarQtd(b.dataset.del, -9999)));
}
function abrirCarrinho() { $("#cartDrawer")?.classList.add("open"); $("#overlay")?.classList.add("show"); }
function fecharCarrinho() { $("#cartDrawer")?.classList.remove("open"); $("#overlay")?.classList.remove("show"); }

/* ==================== CARDS E MODAL ==================== */
function cardHTML(p) {
  const preco = parseFloat(p.preco) || 0;
  const esgotado = (parseInt(p.estoque) || 0) <= 0;
  const inicial = (p.nome || "?").charAt(0).toUpperCase();
  return `
    <article class="card" data-detalhe="${esc(p.id)}">
      <div class="card-img">
        <div class="ph" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:3rem;font-weight:800;color:var(--primaria);opacity:.3;">${esc(inicial)}</div>
        ${p.imagem ? `<img src="${esc(p.imagem)}" alt="${esc(p.nome)}" loading="lazy" onerror="this.remove()">` : ""}
        ${esgotado ? '<span class="tag">Esgotado</span>' : ""}
      </div>
      <div class="card-body">
        <span class="cat" style="font-size:.75rem;text-transform:uppercase;color:var(--primaria);font-weight:700;">${esc(p.categoria)}</span>
        <h3>${esc(p.nome)}</h3>
        <div class="card-foot"><strong>${money(preco)}</strong></div>
      </div>
    </article>`;
}

function bindCards(container) {
  container.querySelectorAll("[data-detalhe]").forEach((c) => (c.onclick = () => abrirProdutoModal(c.dataset.detalhe)));
}

function abrirProdutoModal(id) {
  const p = PRODUTOS.find((x) => x.id === id);
  if (!p) return;
  const preco = parseFloat(p.preco) || 0;
  const esgotado = (parseInt(p.estoque) || 0) <= 0;
  const modal = $("#modal"), box = $("#modalBox");
  if (!modal || !box) return;

  box.innerHTML = `
    <button class="modal-close" data-close>✕</button>
    <div class="modal-img-wrap">
      ${p.imagem ? `<img src="${esc(p.imagem)}" alt="${esc(p.nome)}">` : `<div class="ph" style="display:flex;align-items:center;justify-content:center;height:100%;font-size:5rem;font-weight:800;color:var(--primaria);opacity:.2;">${esc(p.nome.charAt(0))}</div>`}
    </div>
    <div class="modal-info">
      <span style="font-size:.8rem;font-weight:700;color:var(--primaria);text-transform:uppercase;">${esc(p.categoria)}</span>
      <h2>${esc(p.nome)}</h2>
      <p class="desc">${esc(p.descricao)}</p>
      <p class="preco" id="modalPreco">${money(preco)}</p>
      
      ${!esgotado ? `
      <div class="qty-selector">
        <button id="modalDec">−</button>
        <input type="number" id="modalQty" value="1" min="1" max="${p.estoque}" readonly>
        <button id="modalInc">+</button>
      </div>
      <button class="btn btn-block" id="modalAdd" data-id="${p.id}">Adicionar ao carrinho</button>
      ` : `<p style="color:var(--perigo);font-weight:700;">Produto indisponível no momento.</p>`}
    </div>`;

  if (!esgotado) {
    let qty = 1;
    const input = box.querySelector("#modalQty");
    const btnAdd = box.querySelector("#modalAdd");
    
    const updateBtn = () => {
      input.value = qty;
      btnAdd.textContent = `Adicionar • ${money(preco * qty)}`;
    };

    box.querySelector("#modalInc").onclick = () => { if (qty < p.estoque) { qty++; updateBtn(); } };
    box.querySelector("#modalDec").onclick = () => { if (qty > 1) { qty--; updateBtn(); } };
    btnAdd.onclick = () => addCarrinho(p.id, qty);
    updateBtn();
  }

  modal.classList.add("open");
}
function fecharModal() { $("#modal")?.classList.remove("open"); }

/* ==================== INITS ==================== */
function initHome() {
  const grid = $("#homeGrid"); if (!grid) return;
  const destaques = PRODUTOS.filter((p) => (p.destaque || "").toLowerCase() === "sim").slice(0, 4);
  grid.innerHTML = (destaques.length ? destaques : PRODUTOS.slice(0, 4)).map(cardHTML).join("");
  bindCards(grid);
  $("#heroTitulo").textContent = CONFIG.nome_loja || "Bem-vindo";
  $("#heroSlogan").textContent = CONFIG.descricao || "Produtos de qualidade.";
}

function initProdutos() {
  const grid = $("#produtosGrid"); if (!grid) return;
  const cats = [...new Set(PRODUTOS.map((p) => p.categoria).filter(Boolean))];
  $("#categoria").innerHTML = '<option value="">Todas as categorias</option>' + cats.map((c) => `<option>${esc(c)}</option>`).join("");
  
  function render() {
    const busca = $("#busca").value.toLowerCase().trim();
    const cat = $("#categoria").value;
    const lista = PRODUTOS.filter((p) => {
      const okCat = !cat || p.categoria === cat;
      const alvo = (p.nome + " " + p.descricao + " " + p.categoria).toLowerCase();
      return okCat && (!busca || alvo.includes(busca));
    });
    grid.innerHTML = lista.map(cardHTML).join("");
    bindCards(grid);
    $("#vazio").hidden = lista.length > 0;
  }
  $("#busca").addEventListener("input", render);
  $("#categoria").addEventListener("change", render);
  render();
}

function initBlog() {
  const grid = $("#blogGrid"); if (!grid) return;
  if (!BLOG.length) { grid.innerHTML = '<p class="vazio">Nenhum post.</p>'; return; }
  grid.innerHTML = BLOG.map((b, i) => `
    <article class="post" style="background:#fff;border:1px solid var(--borda);border-radius:16px;padding:32px;">
      <div style="font-size:.8rem;color:var(--muted);margin-bottom:12px;">${esc(b.data)}</div>
      <h3 style="font-size:1.3rem;margin-bottom:12px;">${esc(b.titulo)}</h3>
      <p style="color:var(--muted);font-size:.95rem;margin-bottom:16px;">${esc(b.resumo)}</p>
      <button data-post="${i}" style="background:none;border:0;color:var(--primaria);font-weight:700;cursor:pointer;">Ler mais →</button>
    </article>`).join("");
  grid.querySelectorAll("[data-post]").forEach((b) => (b.onclick = () => {
    const post = BLOG[+b.dataset.post];
    $("#modalBox").innerHTML = `<button class="modal-close" data-close>✕</button><div class="modal-info"><h2>${esc(post.titulo)}</h2><p>${esc(post.conteudo).replace(/\\n/g, "<br>")}</p></div>`;
    $("#modal").classList.add("open");
  }));
}

function initContato() {
  const c = CONFIG;
  const waNum = (c.whatsapp || "").replace(/\D/g, "");
  if ($("#infoWhats")) { $("#infoWhats").onclick = () => window.open(`https://wa.me/${waNum}`, "_blank"); $("#infoWhats small").textContent = c.whatsapp_display || c.whatsapp; }
  if ($("#infoEmail")) { $("#infoEmail").onclick = () => (location.href = `mailto:${c.email}`); $("#infoEmail small").textContent = c.email; }
  if ($("#infoInsta")) { $("#infoInsta").onclick = () => window.open(`https://instagram.com/${(c.instagram||'').replace('@','')}`, "_blank"); $("#infoInsta small").textContent = c.instagram; }
  if ($("#infoEnd")) { $("#infoEnd").onclick = () => window.open(`https://maps.google.com/?q=${encodeURIComponent(c.endereco)}`, "_blank"); $("#infoEnd small").textContent = c.endereco; }
  if ($("#infoHorario")) { $("#infoHorario small").textContent = c.horario; }
  
  $("#contatoForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const texto = `*Contato*\nNome: ${e.target.nome.value}\nEmail: ${e.target.email.value}\nAssunto: ${e.target.assunto.value}\n\n${e.target.msg.value}`;
    window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(texto)}`, "_blank");
    e.target.reset();
  });
}

/* ==================== CHECKOUT (Nova Lógica) ==================== */
let checkoutState = { timing: null, method: null };
let cupomAplicado = null;

function initCheckout() {
  if (!$(".checkout-main")) return;
  renderCheckout();

  // Listener para QUANDO PAGAR
  $$('input[name="payTiming"]').forEach((r) => r.addEventListener("change", (e) => {
    checkoutState.timing = e.target.value;
    checkoutState.method = null; // Reseta o método
    renderPaymentMethods();
    updateConfirmBtn();
  }));

  // Cupom
  $("#cupomBtn")?.addEventListener("click", async () => {
    const codigo = $("#cupomInput").value.trim();
    if (!codigo) return;
    const res = await API.validarCupom(codigo, cartTotal(), $("#cEmail")?.value || "");
    if (res.ok) { cupomAplicado = res; $("#cupomMsg").textContent = `✓ Aplicado: -${money(calcularDesconto(res))}`; $("#cupomMsg").style.color = "var(--sucesso)"; }
    else { cupomAplicado = null; $("#cupomMsg").textContent = `✗ ${res.erro}`; $("#cupomMsg").style.color = "var(--perigo)"; }
    renderCheckout();
  });

  // Campos do formulário
  ["#cNome", "#cEmail", "#cFone", "#cCep", "#cCidade", "#cUF", "#cBairro", "#cEnd", "#cNum"].forEach((sel) => $(sel)?.addEventListener("input", updateConfirmBtn));
  $("#confirmBtn")?.addEventListener("click", finalizarPedido);
}

function renderPaymentMethods() {
  const container = $("#methodContainer");
  const section = $("#methodSection");
  if (!checkoutState.timing) { section.style.display = "none"; return; }
  section.style.display = "block";

  let methods = [];
  if (checkoutState.timing === "online") {
    // REGRA: No site, apenas PIX
    methods = [{ id: "pix", label: "PIX", icon: "🔷", desc: "Aprovação imediata" }];
  } else {
    // REGRA: Na entrega, tudo disponível
    methods = [
      { id: "pix", label: "PIX", icon: "🔷", desc: "Na entrega" },
      { id: "credito", label: "Crédito", icon: "💳", desc: "Maquininha na entrega" },
      { id: "debito", label: "Débito", icon: "💳", desc: "Maquininha na entrega" },
      { id: "dinheiro", label: "Dinheiro", icon: "💵", desc: "Na entrega" }
    ];
  }

  container.innerHTML = methods.map(m => `
    <label class="pay-opt">
      <input type="radio" name="payMethod" value="${m.id}">
      <span class="pay-ico">${m.icon}</span>
      <div><strong>${m.label}</strong><small>${m.desc}</small></div>
    </label>
  `).join("");

  container.querySelectorAll('input[name="payMethod"]').forEach(radio => {
    radio.addEventListener("change", (e) => { checkoutState.method = e.target.value; updateConfirmBtn(); });
  });
}

function calcularDesconto(c) { return c.tipo === "percentual" ? cartTotal() * (c.valor / 100) : Number(c.valor); }

function renderCheckout() {
  const itens = getCartItens();
  if (!itens.length) {
    $(".checkout-main").innerHTML = '<div class="checkout-card" style="text-align:center;padding:60px;"><h2>Carrinho Vazio</h2><a href="produtos.html" class="btn" style="margin-top:20px;">Ver produtos</a></div>';
    $("#summaryItems").innerHTML = ""; $("#subTotal").textContent = money(0); $("#summaryTotal").textContent = money(0);
    $("#confirmBtn").disabled = true;
    return;
  }

  $("#checkoutItems").innerHTML = itens.map(i => `
    <div class="co-item" style="display:flex;gap:16px;align-items:center;border-bottom:1px solid var(--bg-soft);padding:16px 0;">
      <div style="width:60px;height:60px;border-radius:12px;background:var(--bg-soft);overflow:hidden;">${i.imagem ? `<img src="${esc(i.imagem)}" style="width:100%;height:100%;object-fit:cover;">` : ""}</div>
      <div style="flex:1;"><strong>${esc(i.nome)}</strong><br><small class="muted">${money(i.preco)} × ${i.qty}</small></div>
      <div style="font-weight:700;">${money(i.preco * i.qty)}</div>
    </div>
  `).join("");

  const sub = cartTotal();
  const desc = cupomAplicado ? calcularDesconto(cupomAplicado) : 0;
  
  $("#summaryItems").innerHTML = itens.map(i => `<div class="summary-row"><span>${i.qty}× ${esc(i.nome)}</span><span>${money(i.preco * i.qty)}</span></div>`).join("");
  $("#subTotal").textContent = money(sub);
  $("#descontoRow").hidden = desc <= 0; $("#descontoVal").textContent = `- ${money(desc)}`;
  $("#summaryTotal").textContent = money(Math.max(0, sub - desc));
  updateConfirmBtn();
}

function updateConfirmBtn() {
  const ok = checkoutState.timing && checkoutState.method && $("#cNome")?.value.trim() && $("#cEmail")?.value.trim() && $("#cFone")?.value.trim() && $("#cCep")?.value.trim() && $("#cUF")?.value.trim() && $("#cEnd")?.value.trim() && $("#cNum")?.value.trim() && getCartItens().length > 0;
  $("#confirmBtn").disabled = !ok;
}

async function finalizarPedido() {
  const btn = $("#confirmBtn"); btn.disabled = true; btn.textContent = "Processando...";
  try {
    const payload = {
      itens: getCartItens().map((i) => ({ id: i.id, qty: i.qty })),
      cliente: { nome: $("#cNome").value.trim(), email: $("#cEmail").value.trim(), telefone: $("#cFone").value.trim(), cpf: $("#cCpf").value.trim(), observacoes: $("#cObs").value.trim() },
      endereco: { cep: $("#cCep").value.trim(), logradouro: $("#cEnd").value.trim(), numero: $("#cNum").value.trim(), complemento: $("#cComp").value.trim(), bairro: $("#cBairro").value.trim(), cidade: $("#cCidade").value.trim(), estado: $("#cUF").value.trim().toUpperCase() },
      pagamento: { metodo: checkoutState.method, quando: checkoutState.timing },
      cupom_codigo: cupomAplicado?.codigo || null,
    };
    const res = await API.criarPedido(payload);
    CART = []; saveCart();
    if (res.init_point) location.href = res.init_point;
    else location.href = `pedido.html?id=${res.pedido_id}`;
  } catch (err) {
    alert("Erro ao processar: " + err.message);
    btn.disabled = false; btn.textContent = "Confirmar pedido";
  }
}

/* ==================== INIT ==================== */
async function init() {
  loadCart();
  $("#overlay")?.addEventListener("click", fecharCarrinho);
  $("#modal")?.addEventListener("click", (e) => { if (e.target.id === "modal" || e.target.dataset.close !== undefined) fecharModal(); });

  try {
    CONFIG = parseConfig(await carregarTxt("data/config.txt"));
    PRODUTOS = (await API.getProdutos()).map(p => ({ id: p.id, nome: p.nome, preco: p.preco, categoria: p.categoria_nome || "", imagem: p.imagem_url || "", descricao: p.descricao_curta || p.descricao || "", estoque: p.estoque, destaque: p.destaque ? "sim" : "nao" }));
    BLOG = parseLinhas(await carregarTxt("data/blog.txt"), ["titulo", "data", "resumo", "conteudo"]);
  } catch (err) {
    document.body.innerHTML = `<div style="background:#fee2e2;color:#991b1b;padding:20px;text-align:center;">⚠️ Erro de conexão com o servidor. ${err.message}</div>`;
    return;
  }

  if (CONFIG.cor_primaria) document.documentElement.style.setProperty("--primaria", CONFIG.cor_primaria);
  if (CONFIG.cor_secundaria) document.documentElement.style.setProperty("--primaria-dark", CONFIG.cor_secundaria);

  renderHeader(); renderFooter(); renderCartDrawer(); renderCartBadge();

  if (PAGE === "home") initHome();
  if (PAGE === "produtos") initProdutos();
  if (PAGE === "blog") initBlog();
  if (PAGE === "contato") initContato();
  if (PAGE === "checkout") initCheckout();
}

const APP_READY = new Promise((r) => document.addEventListener("DOMContentLoaded", () => init().then(r).catch(r)));
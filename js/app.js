const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (n) =>
  (isNaN(n) ? 0 : n).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const CART_KEY = "loja_cart_v4";
const PAGE = document.body.dataset.page || "home";
let CONFIG = {},
  PRODUTOS = [],
  BLOG = [],
  CART = [];

/* ==================== TEMA (LIGHT/DARK/AUTO) ==================== */
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "auto";
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  const root = document.documentElement;
  const icon = $("#themeIcon");

  if (theme === "auto") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", isDark ? "dark" : "light");
    if (icon) icon.textContent = "🌓";
  } else {
    root.setAttribute("data-theme", theme);
    if (icon) icon.textContent = theme === "dark" ? "🌙" : "☀️";
  }
}

function toggleTheme() {
  const current = localStorage.getItem("theme") || "auto";
  let next =
    current === "auto" ? "light" : current === "light" ? "dark" : "auto";
  localStorage.setItem("theme", next);
  applyTheme(next);
}

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    if ((localStorage.getItem("theme") || "auto") === "auto")
      applyTheme("auto");
  });

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
  return txt
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
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
function loadCart() {
  try {
    CART = JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    CART = [];
  }
}
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(CART));
}
function getCartItens() {
  return CART.map((i) => {
    const p = PRODUTOS.find((x) => x.id === i.id);
    return p ? { ...p, qty: i.qty } : null;
  }).filter(Boolean);
}
function cartTotal() {
  return getCartItens().reduce(
    (s, i) => s + (parseFloat(i.preco) || 0) * i.qty,
    0,
  );
}
function cartQtd() {
  return getCartItens().reduce((s, i) => s + i.qty, 0);
}

function addCarrinho(id, qty = 1) {
  const p = PRODUTOS.find((x) => x.id === id);
  if (!p) return;
  const max = parseInt(p.estoque) || 0;
  if (max <= 0) return alert("Esgotado.");
  const item = CART.find((i) => i.id === id);
  if (item) {
    if (item.qty + qty > max) return alert("Estoque máximo.");
    item.qty += qty;
  } else CART.push({ id, qty });
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
  item.qty += delta;
  if (item.qty > (parseInt(p?.estoque) || 999)) item.qty = parseInt(p.estoque);
  if (item.qty < 1) CART = CART.filter((i) => i.id !== id);
  saveCart();
  renderCartDrawer();
  renderCartBadge();
  if (PAGE === "checkout") renderCheckout();
}

/* ==================== HEADER / FOOTER / DRAWER ==================== */
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
      <nav class="nav">${menu.map((m) => `<a href="${m.href}" class="${PAGE === m.page ? "active" : ""}">${m.label}</a>`).join("")}</nav>
      <div style="display:flex; align-items:center; gap:12px;">
        <button class="theme-toggle" onclick="toggleTheme()" title="Alternar Tema"><span id="themeIcon">🌓</span></button>
        <a href="checkout.html" class="cart-btn">🛒 <span class="cart-count" id="cartCount">0</span></a>
      </div>
    </div>`;
}

function renderFooter() {
  const el = $("#app-footer");
  if (!el) return;
  el.className = "footer"; // (Adicione estilos de footer no CSS se desejar)
  el.innerHTML = `
    <div class="container" style="padding:40px 0; text-align:center; border-top:1px solid var(--borda); margin-top:40px;">
      <p class="muted small">&copy; ${new Date().getFullYear()} ${esc(CONFIG.nome_loja || "")} — Todos os direitos reservados.</p>
    </div>`;
}

function renderCartBadge() {
  const el = $("#cartCount");
  if (el) el.textContent = cartQtd();
}
function renderCartDrawer() {
  const el = $("#cartDrawer");
  if (!el) return;
  const itens = getCartItens();
  el.innerHTML = `
    <div class="cart-header"><h3>Carrinho</h3><button onclick="fecharCarrinho()">✕</button></div>
    <div class="cart-items">
      ${
        itens.length
          ? itens
              .map(
                (i) => `
        <div class="recibo-item" style="align-items:center;">
          <div><strong>${esc(i.nome)}</strong><br><small class="muted">${money(i.preco)} x ${i.qty}</small></div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button onclick="alterarQtd('${i.id}', -1)" class="btn-ghost" style="padding:4px 8px;">−</button>
            <span>${i.qty}</span>
            <button onclick="alterarQtd('${i.id}', 1)" class="btn-ghost" style="padding:4px 8px;">+</button>
            <button onclick="alterarQtd('${i.id}', -999)" style="color:var(--perigo); margin-left:8px;">🗑</button>
          </div>
        </div>`,
              )
              .join("")
          : '<p class="muted text-center">Vazio.</p>'
      }
    </div>
    <div class="cart-footer">
      <div style="display:flex; justify-content:space-between; font-weight:800; margin-bottom:16px;"><span>Total</span><span>${money(cartTotal())}</span></div>
      <a href="checkout.html" class="btn btn-block">Ir para o checkout</a>
    </div>`;
}
function abrirCarrinho() {
  $("#cartDrawer")?.classList.add("open");
  $("#overlay")?.classList.add("show");
}
function fecharCarrinho() {
  $("#cartDrawer")?.classList.remove("open");
  $("#overlay")?.classList.remove("show");
}

/* ==================== PRODUTOS ==================== */
function cardHTML(p) {
  const esgotado = (parseInt(p.estoque) || 0) <= 0;
  return `
    <article class="checkout-card" style="padding:0; overflow:hidden; cursor:pointer; margin-bottom:0;" onclick="abrirProdutoModal('${p.id}')">
      <div style="aspect-ratio:1; background:var(--bg-alt); position:relative;">
        ${p.imagem ? `<img src="${esc(p.imagem)}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="display:flex; align-items:center; justify-content:center; height:100%; font-size:3rem; opacity:0.2;">${esc(p.nome.charAt(0))}</div>`}
        ${esgotado ? '<span style="position:absolute; top:10px; right:10px; background:var(--perigo); color:#fff; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700;">Esgotado</span>' : ""}
      </div>
      <div style="padding:20px;">
        <span class="muted" style="font-size:0.75rem; font-weight:700; text-transform:uppercase;">${esc(p.categoria)}</span>
        <h3 style="font-size:1.1rem; margin:8px 0;">${esc(p.nome)}</h3>
        <strong style="font-size:1.3rem; color:var(--primaria);">${money(p.preco)}</strong>
      </div>
    </article>`;
}
function bindCards(c) {
  c.querySelectorAll("[data-id]").forEach((el) => {});
} // simplificado

function abrirProdutoModal(id) {
  const p = PRODUTOS.find((x) => x.id === id);
  if (!p) return;
  const esgotado = (parseInt(p.estoque) || 0) <= 0;
  const modal = $("#modal"),
    box = $("#modalBox");
  if (!modal || !box) return;

  box.innerHTML = `
    <button class="modal-close" onclick="fecharModal()">✕</button>
    <div style="text-align:center;">
      ${p.imagem ? `<img src="${esc(p.imagem)}" style="width:100%; height:200px; object-fit:cover; border-radius:12px; margin-bottom:20px;">` : ""}
      <h2 style="font-size:1.5rem; margin-bottom:8px;">${esc(p.nome)}</h2>
      <p class="muted" style="margin-bottom:16px;">${esc(p.descricao)}</p>
      <p style="font-size:1.8rem; font-weight:800; color:var(--primaria); margin-bottom:24px;">${money(p.preco)}</p>
      
      ${
        !esgotado
          ? `
      <div style="display:flex; justify-content:center; gap:16px; margin-bottom:24px; align-items:center;">
        <button onclick="document.getElementById('modalQty').value = Math.max(1, parseInt(document.getElementById('modalQty').value) - 1)" class="btn-ghost" style="width:40px; height:40px; padding:0;">−</button>
        <input type="number" id="modalQty" value="1" min="1" style="width:60px; text-align:center; padding:10px; font-size:1.2rem; background:var(--bg-soft); border:1px solid var(--borda); border-radius:8px; color:var(--texto);">
        <button onclick="document.getElementById('modalQty').value = Math.min(${p.estoque}, parseInt(document.getElementById('modalQty').value) + 1)" class="btn-ghost" style="width:40px; height:40px; padding:0;">+</button>
      </div>
      <button class="btn btn-block" onclick="addCarrinho('${p.id}', parseInt(document.getElementById('modalQty').value))">Adicionar ao Carrinho</button>
      `
          : `<p style="color:var(--perigo); font-weight:700;">Produto Indisponível</p>`
      }
    </div>`;
  modal.classList.add("open");
}
function fecharModal() {
  $("#modal")?.classList.remove("open");
}

/* ==================== CHECKOUT ==================== */
let checkoutState = { timing: null, method: null };
let pedidoPixIdGlobal = null,
  pixCheckInterval = null;

function initCheckout() {
  if (!$(".checkout-grid")) return;
  renderCheckout();
  $$('input[name="payTiming"]').forEach((r) =>
    r.addEventListener("change", (e) => {
      checkoutState.timing = e.target.value;
      checkoutState.method = null;
      renderPaymentMethods();
      updateConfirmBtn();
    }),
  );
  [
    "#cNome",
    "#cEmail",
    "#cFone",
    "#cCpf",
    "#cCep",
    "#cCidade",
    "#cUF",
    "#cBairro",
    "#cEnd",
    "#cNum",
  ].forEach((sel) => $(sel)?.addEventListener("input", updateConfirmBtn));
  $("#confirmBtn")?.addEventListener("click", finalizarPedido);
}

function renderPaymentMethods() {
  const container = $("#methodContainer"),
    section = $("#methodSection");
  if (!checkoutState.timing) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";

  const methods =
    checkoutState.timing === "online"
      ? [{ id: "pix", label: "PIX", icon: "🔷", desc: "Aprovação imediata" }]
      : [
          { id: "pix", label: "PIX", icon: "🔷", desc: "Na entrega" },
          { id: "credito", label: "Crédito", icon: "💳", desc: "Maquininha" },
          { id: "debito", label: "Débito", icon: "💳", desc: "Maquininha" },
          { id: "dinheiro", label: "Dinheiro", icon: "💵", desc: "Na entrega" },
        ];

  container.innerHTML = methods
    .map(
      (m) =>
        `<label class="checkout-card" style="padding:16px; margin:0; display:flex; gap:16px; align-items:center; cursor:pointer;"><input type="radio" name="payMethod" value="${m.id}" style="width:auto;"><div><strong>${m.label}</strong><br><small class="muted">${m.desc}</small></div></label>`,
    )
    .join("");
  container.querySelectorAll('input[name="payMethod"]').forEach((radio) =>
    radio.addEventListener("change", (e) => {
      checkoutState.method = e.target.value;
      updateConfirmBtn();
    }),
  );
}

function renderCheckout() {
  const itens = getCartItens();
  if (!itens.length) {
    $(".checkout-grid").innerHTML =
      '<div class="checkout-card text-center"><h2>Carrinho Vazio</h2><a href="produtos.html" class="btn" style="margin-top:20px;">Voltar às compras</a></div>';
    return;
  }

  $("#checkoutItems").innerHTML = itens
    .map(
      (i) => `
    <div class="recibo-item" style="align-items:center;">
      <div><strong>${esc(i.nome)}</strong><br><small class="muted">${money(i.preco)} x ${i.qty}</small></div>
      <div style="display:flex; align-items:center; gap:8px;">
        <strong>${money(i.preco * i.qty)}</strong>
        <button onclick="alterarQtd('${i.id}', -999)" style="color:var(--perigo); font-size:1.2rem; margin-left:10px;">🗑</button>
      </div>
    </div>`,
    )
    .join("");

  $("#summaryItems").innerHTML = itens
    .map(
      (i) =>
        `<div class="recibo-item"><span>${i.qty}x ${esc(i.nome)}</span><span>${money(i.preco * i.qty)}</span></div>`,
    )
    .join("");
  $("#subTotal").textContent = money(cartTotal());
  $("#summaryTotal").textContent = money(cartTotal());
  updateConfirmBtn();
}

function updateConfirmBtn() {
  const ok =
    checkoutState.timing &&
    checkoutState.method &&
    $("#cNome")?.value.trim() &&
    $("#cEmail")?.value.trim() &&
    $("#cFone")?.value.trim() &&
    $("#cCpf")?.value.trim() &&
    getCartItens().length > 0;
  $("#confirmBtn").disabled = !ok;
}

async function finalizarPedido() {
  const btn = $("#confirmBtn");
  btn.disabled = true;
  btn.textContent = "Processando...";
  try {
    const payload = {
      itens: getCartItens().map((i) => ({ id: i.id, qty: i.qty })),
      cliente: {
        nome: $("#cNome").value.trim(),
        email: $("#cEmail").value.trim(),
        telefone: $("#cFone").value.trim(),
        cpf: $("#cCpf").value.trim(),
      },
      endereco: {
        cep: $("#cCep").value.trim(),
        logradouro: $("#cEnd").value.trim(),
        numero: $("#cNum").value.trim(),
        complemento: $("#cComp")?.value.trim(),
        bairro: $("#cBairro").value.trim(),
        cidade: $("#cCidade").value.trim(),
        estado: $("#cUF").value.trim().toUpperCase(),
      },
      pagamento: { metodo: checkoutState.method, quando: checkoutState.timing },
    };

    const res = await API.criarPedido(payload);
    CART = [];
    saveCart();

    if (res.pix) abrirModalPix(res.pedido_id, res.pix);
    else location.href = `pedido.html?id=${res.pedido_id}`;
  } catch (err) {
    alert("Erro: " + err.message);
    btn.disabled = false;
    btn.textContent = "Confirmar";
  }
}

/* ==================== PIX ==================== */
function abrirModalPix(pedidoId, pixData) {
  pedidoPixIdGlobal = pedidoId;
  $("#pixQRCode").src = `data:image/jpeg;base64,${pixData.qr_code_base64}`;
  $("#pixCopiaCola").value = pixData.qr_code;
  $("#pixModal").classList.add("open");
  if (pixCheckInterval) clearInterval(pixCheckInterval);

  pixCheckInterval = setInterval(async () => {
    const pedido = await API.getPedido(pedidoId);
    if (pedido.status === "pago" || pedido.status === "em_separacao") {
      clearInterval(pixCheckInterval);
      $("#pixStatus").textContent = "✅ Aprovado!";
      $("#pixStatus").style.color = "var(--sucesso)";
      setTimeout(() => {
        location.href = `pedido.html?id=${pedidoId}`;
      }, 2000);
    }
  }, 2000);
}
function copiarPix() {
  const input = $("#pixCopiaCola");
  input.select();
  document.execCommand("copy");
  const btn = event.target;
  const txt = btn.textContent;
  btn.textContent = "Copiado!";
  setTimeout(() => {
    btn.textContent = txt;
  }, 2000);
}
function fecharModalPix() {
  if (pixCheckInterval) clearInterval(pixCheckInterval);
  $("#pixModal").classList.remove("open");
  if (pedidoPixIdGlobal) location.href = `pedido.html?id=${pedidoPixIdGlobal}`;
}

/* ==================== CONTATO ==================== */
function initContato() {
  const c = CONFIG;
  const waNum = (c.whatsapp || "").replace(/\D/g, "");
  if ($("#infoWhats")) {
    $("#infoWhats").onclick = () =>
      window.open(`https://wa.me/${waNum}`, "_blank");
    $("#infoWhats small").textContent = c.whatsapp_display;
  }
  if ($("#infoEmail")) {
    $("#infoEmail").onclick = () => (location.href = `mailto:${c.email}`);
    $("#infoEmail small").textContent = c.email;
  }

  $("#contatoForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.textContent = "Enviando...";
    btn.disabled = true;

    const payload = {
      nome: e.target.nome.value,
      email: e.target.email.value,
      assunto: e.target.assunto.value,
      msg: e.target.msg.value,
    };

    try {
      const res = await fetch(`${API_URL}/api/contato`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Falha no envio");
      alert("Mensagem enviada com sucesso!");
      e.target.reset();
    } catch (err) {
      alert("Erro ao enviar. Tente novamente mais tarde.");
    } finally {
      btn.textContent = "Enviar mensagem";
      btn.disabled = false;
    }
  });
}

/* ==================== INIT ==================== */
async function init() {
  initTheme();
  loadCart();
  $("#overlay")?.addEventListener("click", fecharCarrinho);
  $("#modal")?.addEventListener("click", (e) => {
    if (e.target.id === "modal") fecharModal();
  });

  try {
    CONFIG = parseConfig(await carregarTxt("data/config.txt"));
    PRODUTOS = (await API.getProdutos()).map((p) => ({
      id: p.id,
      nome: p.nome,
      preco: p.preco,
      categoria: p.categoria_nome || "",
      imagem: p.imagem_url || "",
      descricao: p.descricao_curta || p.descricao || "",
      estoque: p.estoque,
      destaque: p.destaque ? "sim" : "nao",
    }));
    BLOG = parseLinhas(await carregarTxt("data/blog.txt"), [
      "titulo",
      "data",
      "resumo",
      "conteudo",
    ]);
  } catch (err) {
    document.body.innerHTML = `<p class="text-center" style="padding:40px;">Erro de conexão com o servidor.</p>`;
    return;
  }

  renderHeader();
  renderFooter();
  renderCartDrawer();
  renderCartBadge();

  if (PAGE === "home") {
    const grid = $("#homeGrid");
    if (grid) {
      grid.innerHTML = PRODUTOS.slice(0, 4).map(cardHTML).join("");
    }
    $("#heroTitulo").textContent = CONFIG.nome_loja;
    $("#heroSlogan").textContent = CONFIG.descricao;
  }
  if (PAGE === "produtos") {
    const grid = $("#produtosGrid");
    if (grid) {
      grid.innerHTML = PRODUTOS.map(cardHTML).join("");
    }
  }
  if (PAGE === "blog") {
    const grid = $("#blogGrid");
    if (grid) {
      grid.innerHTML = BLOG.map(
        (b) =>
          `<div class="checkout-card"><small class="muted">${b.data}</small><h3>${esc(b.titulo)}</h3><p>${esc(b.resumo)}</p></div>`,
      ).join("");
    }
  }
  if (PAGE === "contato") initContato();
  if (PAGE === "checkout") initCheckout();
}

const APP_READY = new Promise((r) =>
  document.addEventListener("DOMContentLoaded", () => init().then(r).catch(r)),
);

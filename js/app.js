const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (n) => (isNaN(n) ? 0 : n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CART_KEY = "loja_cart_v5";
const PAGE = document.body.dataset.page || "home";
let CONFIG = {}, PRODUTOS = [], BLOG = [], CART = [];

/* ==================== TOAST (Notificações) ==================== */
function showToast(msg, type = "success") {
  let container = $("#toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `${type === "success" ? "✅" : "⚠️"} ${msg}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 3000);
}

/* ==================== TEMA ==================== */
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
    if (icon) icon.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`;
  } else {
    root.setAttribute("data-theme", theme);
    if (icon) icon.innerHTML = theme === "dark" ? `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>` : `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`;
  }
}
function toggleTheme() {
  const current = localStorage.getItem("theme") || "auto";
  let next = current === "auto" ? "light" : current === "light" ? "dark" : "auto";
  localStorage.setItem("theme", next);
  applyTheme(next);
}

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
  const p = PRODUTOS.find((x) => x.id === id); if (!p) return;
  const max = parseInt(p.estoque) || 0; if (max <= 0) return showToast("Produto esgotado.", "error");
  const item = CART.find((i) => i.id === id);
  if (item) {
    if (item.qty + qty > max) return showToast("Estoque máximo atingido.", "error");
    item.qty += qty;
  } else CART.push({ id, qty });
  saveCart(); renderCartDrawer(); renderCartBadge(); abrirCarrinho(); fecharModal();
  showToast("Adicionado ao carrinho!");
}

function alterarQtd(id, delta) {
  const item = CART.find((i) => i.id === id); if (!item) return;
  const p = PRODUTOS.find((x) => x.id === id);
  item.qty += delta;
  if (item.qty > (parseInt(p?.estoque) || 999)) item.qty = parseInt(p.estoque);
  if (item.qty < 1) CART = CART.filter((i) => i.id !== id);
  saveCart(); renderCartDrawer(); renderCartBadge();
  if (PAGE === "checkout") renderCheckout();
}

/* ==================== HEADER / FOOTER ==================== */
function renderHeader() {
  const el = $("#app-header"); if (!el) return;
  const menu = [
    { href: "index.html", label: "Início", page: "home" }, { href: "produtos.html", label: "Produtos", page: "produtos" },
    { href: "sobre.html", label: "Sobre", page: "sobre" }, { href: "blog.html", label: "Blog", page: "blog" }, { href: "contato.html", label: "Contato", page: "contato" },
  ];
  el.className = "header";
  el.innerHTML = `
    <div class="container header-inner">
      <a href="index.html" class="logo">${esc(CONFIG.nome_loja || "Loja")}</a>
      <nav class="nav">${menu.map((m) => `<a href="${m.href}" class="${PAGE === m.page ? "active" : ""}">${m.label}</a>`).join("")}</nav>
      <div class="header-actions">
        <button class="icon-btn" onclick="toggleTheme()" title="Alternar Tema"><span id="themeIcon"></span></button>
        <a href="checkout.html" class="cart-btn">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          <span class="cart-count" id="cartCount">0</span>
        </a>
      </div>
    </div>`;
  applyTheme(localStorage.getItem("theme") || "auto");
}

function renderFooter() {
  const el = $("#app-footer"); if (!el) return;
  el.className = "footer";
  el.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div><h4>${esc(CONFIG.nome_loja || "Loja")}</h4><p>${esc(CONFIG.descricao || "Qualidade e preço justo.")}</p></div>
        <div><h4>Navegue</h4><ul><li><a href="index.html">Início</a></li><li><a href="produtos.html">Produtos</a></li><li><a href="sobre.html">Sobre</a></li></ul></div>
        <div><h4>Atendimento</h4><ul><li>${esc(CONFIG.email || "")}</li><li>${esc(CONFIG.whatsapp_display || "")}</li></ul></div>
        <div><h4>Pagamento</h4><ul><li>🔷 PIX Online</li><li>💳 Cartão</li><li>💵 Dinheiro</li></ul></div>
      </div>
      <div class="footer-bottom">&copy; ${new Date().getFullYear()} ${esc(CONFIG.nome_loja || "")} — Todos os direitos reservados.</div>
    </div>`;
}

/* ==================== DRAWER / CART ==================== */
function renderCartBadge() { const el = $("#cartCount"); if (el) el.textContent = cartQtd(); }
function renderCartDrawer() {
  const el = $("#cartDrawer"); if (!el) return;
  const itens = getCartItens();
  el.innerHTML = `
    <div class="cart-header"><h3>Carrinho</h3><button class="icon-btn" onclick="fecharCarrinho()">✕</button></div>
    <div class="cart-items">
      ${itens.length ? itens.map((i) => `
        <div class="recibo-item" style="align-items:center;">
          <div><strong>${esc(i.nome)}</strong><br><small class="muted">${money(i.preco)} x ${i.qty}</small></div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button onclick="alterarQtd('${i.id}', -1)" class="btn-ghost" style="padding:4px 8px;">−</button>
            <span>${i.qty}</span>
            <button onclick="alterarQtd('${i.id}', 1)" class="btn-ghost" style="padding:4px 8px;">+</button>
            <button onclick="alterarQtd('${i.id}', -999)" class="del-btn" style="padding:6px;">🗑</button>
          </div>
        </div>`).join("") : '<p class="muted text-center">Seu carrinho está vazio.</p>'}
    </div>
    <div class="cart-footer">
      <div style="display:flex; justify-content:space-between; font-weight:800; margin-bottom:16px;"><span>Total</span><span>${money(cartTotal())}</span></div>
      <a href="checkout.html" class="btn btn-block">Finalizar Compra</a>
    </div>`;
}
function abrirCarrinho() { $("#cartDrawer")?.classList.add("open"); $("#overlay")?.classList.add("show"); }
function fecharCarrinho() { $("#cartDrawer")?.classList.remove("open"); $("#overlay")?.classList.remove("show"); }

/* ==================== PRODUTOS ==================== */
function cardHTML(p) {
  const esgotado = (parseInt(p.estoque) || 0) <= 0;
  return `
    <article class="card" onclick="abrirProdutoModal('${p.id}')">
      <div class="card-img">
        ${p.imagem ? `<img src="${esc(p.imagem)}" alt="${esc(p.nome)}" loading="lazy">` : `<div style="display:flex; align-items:center; justify-content:center; height:100%; font-size:3rem; opacity:0.2;">${esc(p.nome.charAt(0))}</div>`}
        ${esgotado ? '<span class="tag">Esgotado</span>' : ""}
      </div>
      <div class="card-body">
        <span class="card-cat">${esc(p.categoria)}</span>
        <h3>${esc(p.nome)}</h3>
        <div class="card-foot"><strong>${money(p.preco)}</strong></div>
      </div>
    </article>`;
}

function abrirProdutoModal(id) {
  const p = PRODUTOS.find((x) => x.id === id); if (!p) return;
  const esgotado = (parseInt(p.estoque) || 0) <= 0;
  const modal = $("#modal"), box = $("#modalBox"); if (!modal || !box) return;

  box.innerHTML = `
    <button class="modal-close" onclick="fecharModal()">✕</button>
    <div style="flex:1; background:var(--bg-alt); position:relative; min-height:250px;">
      ${p.imagem ? `<img src="${esc(p.imagem)}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;">` : ""}
    </div>
    <div class="modal-info">
      <span class="card-cat">${esc(p.categoria)}</span>
      <h2>${esc(p.nome)}</h2>
      <p class="muted">${esc(p.descricao)}</p>
      <p class="preco">${money(p.preco)}</p>
      ${!esgotado ? `
      <div style="display:flex; align-items:center; gap:16px; margin-top:16px;">
        <div class="qty-selector" style="border:1px solid var(--borda); border-radius:var(--raio); display:flex; overflow:hidden;">
          <button onclick="document.getElementById('mQty').value = Math.max(1, parseInt(document.getElementById('mQty').value) - 1)" style="padding:10px 16px; background:var(--bg-soft);">−</button>
          <input type="number" id="mQty" value="1" min="1" style="width:50px; text-align:center; border:none; background:transparent; font-weight:700; color:var(--texto);">
          <button onclick="document.getElementById('mQty').value = Math.min(${p.estoque}, parseInt(document.getElementById('mQty').value) + 1)" style="padding:10px 16px; background:var(--bg-soft);">+</button>
        </div>
        <button class="btn btn-block" onclick="addCarrinho('${p.id}', parseInt(document.getElementById('mQty').value))">Adicionar</button>
      </div>
      ` : `<p style="color:var(--perigo); font-weight:700; margin-top:16px;">Indisponível</p>`}
    </div>`;
  modal.classList.add("open");
}
function fecharModal() { $("#modal")?.classList.remove("open"); }

/* ==================== CHECKOUT ==================== */
let checkoutState = { timing: null, method: null };
let pedidoPixIdGlobal = null, pixCheckInterval = null;

function initCheckout() {
  if (!$(".checkout-grid")) return;
  renderCheckout();
  $$('input[name="payTiming"]').forEach((r) => r.addEventListener("change", (e) => {
    checkoutState.timing = e.target.value; checkoutState.method = null; renderPaymentMethods(); updateConfirmBtn();
  }));
  ["#cNome", "#cEmail", "#cFone", "#cCpf", "#cCep", "#cCidade", "#cUF", "#cBairro", "#cEnd", "#cNum"].forEach((sel) => $(sel)?.addEventListener("input", updateConfirmBtn));
  $("#confirmBtn")?.addEventListener("click", finalizarPedido);
}

function renderPaymentMethods() {
  const container = $("#methodContainer"), section = $("#methodSection");
  if (!checkoutState.timing) { section.style.display = "none"; return; }
  section.style.display = "block";
  
  const methods = checkoutState.timing === "online" ? [{ id: "pix", label: "PIX", desc: "Aprovação Imediata" }] : [
    { id: "pix", label: "PIX", desc: "Na entrega" }, { id: "credito", label: "Crédito", desc: "Maquininha" },
    { id: "debito", label: "Débito", desc: "Maquininha" }, { id: "dinheiro", label: "Dinheiro", desc: "Na entrega" }
  ];
  
  container.innerHTML = methods.map(m => `<label class="pay-opt"><input type="radio" name="payMethod" value="${m.id}"><div><strong>${m.label}</strong><br><small class="muted">${m.desc}</small></div></label>`).join("");
  container.querySelectorAll('input[name="payMethod"]').forEach(radio => radio.addEventListener("change", (e) => { checkoutState.method = e.target.value; updateConfirmBtn(); }));
}

function renderCheckout() {
  const itens = getCartItens();
  if (!itens.length) {
    $(".checkout-grid").innerHTML = '<div class="checkout-card text-center" style="grid-column:1/-1;"><h2>Carrinho Vazio</h2><a href="produtos.html" class="btn" style="margin-top:20px;">Voltar às compras</a></div>';
    return;
  }
  
  $("#checkoutItems").innerHTML = itens.map(i => `
    <div class="co-item">
      <div class="co-item-img">${i.imagem ? `<img src="${esc(i.imagem)}">` : ""}</div>
      <div style="flex:1;"><strong>${esc(i.nome)}</strong><br><small class="muted">${money(i.preco)} x ${i.qty}</small></div>
      <strong style="margin-right:16px;">${money(i.preco * i.qty)}</strong>
      <button onclick="alterarQtd('${i.id}', -999)" class="del-btn">🗑</button>
    </div>`).join("");

  $("#summaryItems").innerHTML = itens.map(i => `<div class="summary-row"><span>${i.qty}x ${esc(i.nome)}</span><span>${money(i.preco * i.qty)}</span></div>`).join("");
  $("#subTotal").textContent = money(cartTotal());
  $("#summaryTotal").textContent = money(cartTotal());
  updateConfirmBtn();
}

function updateConfirmBtn() {
  const ok = checkoutState.timing && checkoutState.method && $("#cNome")?.value.trim() && $("#cEmail")?.value.trim() && $("#cFone")?.value.trim() && $("#cCpf")?.value.trim() && getCartItens().length > 0;
  $("#confirmBtn").disabled = !ok;
}

async function finalizarPedido() {
  const btn = $("#confirmBtn"); btn.disabled = true; btn.textContent = "Processando...";
  try {
    const payload = {
      itens: getCartItens().map((i) => ({ id: i.id, qty: i.qty })),
      cliente: { nome: $("#cNome").value.trim(), email: $("#cEmail").value.trim(), telefone: $("#cFone").value.trim(), cpf: $("#cCpf").value.trim() },
      endereco: { cep: $("#cCep").value.trim(), logradouro: $("#cEnd").value.trim(), numero: $("#cNum").value.trim(), complemento: $("#cComp")?.value.trim(), bairro: $("#cBairro").value.trim(), cidade: $("#cCidade").value.trim(), estado: $("#cUF").value.trim().toUpperCase() },
      pagamento: { metodo: checkoutState.method, quando: checkoutState.timing }
    };
    
    const res = await API.criarPedido(payload);
    CART = []; saveCart();

    if (res.pix) abrirModalPix(res.pedido_id, res.pix);
    else { showToast("Pedido realizado!"); setTimeout(() => location.href = `pedido.html?id=${res.pedido_id}`, 1500); }
    
  } catch (err) {
    showToast(err.message, "error"); btn.disabled = false; btn.textContent = "Confirmar Pedido";
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
    if (pedido.status === 'pago' || pedido.status === 'em_separacao') {
      clearInterval(pixCheckInterval);
      $("#pixStatus").textContent = "✅ Pagamento Aprovado!"; $("#pixStatus").style.color = "var(--sucesso)";
      setTimeout(() => { location.href = `pedido.html?id=${pedidoId}`; }, 2000);
    }
  }, 2000); 
}
function copiarPix() {
  const input = $("#pixCopiaCola"); input.select(); document.execCommand("copy");
  showToast("Código PIX copiado!");
}
function fecharModalPix() {
  if (pixCheckInterval) clearInterval(pixCheckInterval);
  $("#pixModal").classList.remove("open");
  if (pedidoPixIdGlobal) location.href = `pedido.html?id=${pedidoPixIdGlobal}`;
}

/* ==================== CONTATO ==================== */
function initContato() {
  $("#contatoForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button'); btn.textContent = "Enviando..."; btn.disabled = true;
    try {
      const res = await fetch(`${API_URL}/api/contato`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ nome: e.target.nome.value, email: e.target.email.value, assunto: e.target.assunto.value, msg: e.target.msg.value }) });
      if(!res.ok) throw new Error('Falha no envio');
      showToast('Mensagem enviada com sucesso!'); e.target.reset();
    } catch (err) { showToast('Erro ao enviar. Tente novamente.', 'error'); } finally { btn.textContent = "Enviar mensagem"; btn.disabled = false; }
  });
}

/* ==================== INIT ==================== */
async function init() {
  initTheme(); loadCart();
  $("#overlay")?.addEventListener("click", fecharCarrinho);
  $("#modal")?.addEventListener("click", (e) => { if (e.target.id === "modal") fecharModal(); });

  try {
    CONFIG = parseConfig(await carregarTxt("data/config.txt"));
    PRODUTOS = (await API.getProdutos()).map(p => ({ id: p.id, nome: p.nome, preco: p.preco, categoria: p.categoria_nome || "", imagem: p.imagem_url || "", descricao: p.descricao_curta || p.descricao || "", estoque: p.estoque }));
  } catch (err) { document.body.innerHTML = `<p class="text-center" style="padding:40px;">Erro ao conectar ao servidor.</p>`; return; }

  renderHeader(); renderFooter(); renderCartDrawer(); renderCartBadge();

  if (PAGE === "home") {
    const grid = $("#homeGrid"); if(grid) grid.innerHTML = PRODUTOS.slice(0,4).map(cardHTML).join("");
    $("#heroTitulo").textContent = CONFIG.nome_loja; $("#heroSlogan").textContent = CONFIG.descricao;
  }
  if (PAGE === "produtos") {
    const grid = $("#produtosGrid"); if(grid) grid.innerHTML = PRODUTOS.map(cardHTML).join("");
  }
  if (PAGE === "contato") initContato();
  if (PAGE === "checkout") initCheckout();
}

const APP_READY = new Promise((r) => document.addEventListener("DOMContentLoaded", () => init().then(r).catch(r)));
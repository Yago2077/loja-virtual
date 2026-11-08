const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (n) => (isNaN(n) ? 0 : n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CART_KEY = "loja_cart_v9";
const PAGE = document.body.dataset.page || "home";
let CONFIG = {}, PRODUTOS = [], CART = [];
let descontoAplicado = 0;
let pixIntervalCheck = null, pixIntervalTimer = null;

const ICONS = {
  success: `<svg width="24" height="24" fill="none" stroke="var(--sucesso)" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  error: `<svg width="24" height="24" fill="none" stroke="var(--perigo)" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
  trash: `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  cart: `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`,
  pix: `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="12" cy="12" r="3"></circle><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>`,
  card: `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`,
  cash: `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>`
};

function showToast(msg, type = "success") {
  let container = $("#toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `${ICONS[type]} <span style="font-weight:600;">${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = "toastIn 0.3s reverse forwards"; setTimeout(() => toast.remove(), 300); }, 3000);
}

/* ==================== TEMA ==================== */
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(savedTheme);
}
function applyTheme(theme) {
  const icon = $("#themeIcon");
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  if (icon) {
    icon.innerHTML = theme === "dark" 
      ? `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`
      : `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  }
}
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
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
  
  saveCart(); 
  renderCartDrawer(); 
  renderCartBadge(); 
  fecharModal();
  setTimeout(() => abrirCarrinho(), 300);
}

function alterarQtd(id, delta) {
  const item = CART.find((i) => i.id === id); if (!item) return;
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
  const el = $("#app-header"); if (!el) return;
  const menu = [
    { href: "index.html", label: "Início", page: "home" }, 
    { href: "produtos.html", label: "Produtos", page: "produtos" },
    { href: "sobre.html", label: "Sobre", page: "sobre" }
  ];
  
  // O contador do carrinho agora é calculado no momento que desenha o header
  const qtdAtual = cartQtd();

  el.className = "header";
  el.innerHTML = `
    <div class="container header-inner">
      <a href="index.html" class="logo">${esc(CONFIG.nome_loja || "Loja")}</a>
      <nav class="nav">${menu.map((m) => `<a href="${m.href}" class="${PAGE === m.page ? "active" : ""}">${m.label}</a>`).join("")}</nav>
      <div class="header-actions">
        <button class="icon-btn" onclick="toggleTheme()"><span id="themeIcon"></span></button>
        <a href="checkout.html" class="cart-btn">
          ${ICONS.cart}
          <span class="cart-count" id="cartCount">${qtdAtual}</span>
        </a>
      </div>
    </div>`;
  applyTheme(localStorage.getItem("theme") || "light");
}

function renderCartBadge() { 
  const el = $("#cartCount"); 
  if (el) el.textContent = cartQtd(); 
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
      </div>
      <div class="footer-bottom">&copy; ${new Date().getFullYear()} ${esc(CONFIG.nome_loja || "")}.</div>
    </div>`;
}

function renderCartDrawer() {
  const el = $("#cartDrawer"); if (!el) return;
  const itens = getCartItens();
  el.innerHTML = `
    <div class="cart-header"><h3>Carrinho</h3><button class="icon-btn" onclick="fecharCarrinho()">✕</button></div>
    <div class="cart-items">
      ${itens.length ? itens.map((i) => `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--borda); padding-bottom:16px;">
          <div><strong>${esc(i.nome)}</strong><br><small class="muted">${money(i.preco)} x ${i.qty}</small></div>
          <div class="qty-checkout">
            <button onclick="alterarQtd('${i.id}', -1)">−</button>
            <span>${i.qty}</span>
            <button onclick="alterarQtd('${i.id}', 1)">+</button>
            <button onclick="alterarQtd('${i.id}', -999)" class="del-btn" style="padding:4px; margin-left:4px;">${ICONS.trash}</button>
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
      </div>
      <div class="card-body">
        <span class="card-cat">${esc(p.categoria)}</span>
        <h3 style="font-size:1.1rem;">${esc(p.nome)}</h3>
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
    <div class="modal-img-wrap">${p.imagem ? `<img src="${esc(p.imagem)}">` : ""}</div>
    <div class="modal-info">
      <span class="card-cat">${esc(p.categoria)}</span>
      <h2>${esc(p.nome)}</h2>
      <p class="muted">${esc(p.descricao)}</p>
      <p style="font-size:1.8rem; font-weight:800; color:var(--primaria);">${money(p.preco)}</p>
      
      ${!esgotado ? `
      <div style="display: flex; gap: 16px; margin-top: 16px; align-items: stretch;">
        <div class="qty-checkout">
          <button onclick="document.getElementById('mQty').value = Math.max(1, parseInt(document.getElementById('mQty').value) - 1)">−</button>
          <input type="number" id="mQty" value="1" min="1" readonly>
          <button onclick="document.getElementById('mQty').value = Math.min(${p.estoque}, parseInt(document.getElementById('mQty').value) + 1)">+</button>
        </div>
        <button class="btn" style="flex:1;" onclick="addCarrinho('${p.id}', parseInt(document.getElementById('mQty').value))">Adicionar</button>
      </div>
      ` : `<p style="color:var(--perigo); font-weight:700; margin-top:16px;">Indisponível</p>`}
    </div>`;
  modal.classList.add("open");
}
function fecharModal() { $("#modal")?.classList.remove("open"); }

function initProdutos() {
  const grid = $("#productsGrid"), search = $("#searchInput"), catSelect = $("#categorySelect"), noProducts = $("#noProducts");
  if (!grid) return;
  const cats = [...new Set(PRODUTOS.map(p => p.categoria).filter(Boolean))].sort();
  catSelect.innerHTML = `<option value="">Todas as categorias</option>` + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  const renderFilter = () => {
    const termo = search.value.toLowerCase().trim();
    const cat = catSelect.value;
    const list = PRODUTOS.filter(p => (p.nome.toLowerCase().includes(termo) || p.descricao.toLowerCase().includes(termo)) && (cat === "" || p.categoria === cat));
    grid.innerHTML = list.length ? list.map(cardHTML).join("") : "";
    noProducts.style.display = list.length ? "none" : "block";
  };
  search.addEventListener("input", renderFilter);
  catSelect.addEventListener("change", renderFilter);
  renderFilter();
}

/* ==================== CHECKOUT ==================== */
let checkoutState = { metodo: null, quando: null };
let pedidoPixIdGlobal = null;

function initCheckout() {
  const containerOnline = $("#methodOnline");
  const containerDelivery = $("#methodDelivery");
  if (!containerOnline || !containerDelivery) return;
  
  renderCheckout();
  
  const methodsOnline = [
    { value: "pix_online", label: "PIX Online", desc: "Aprovação imediata", icon: ICONS.pix }
  ];
  const methodsDelivery = [
    { value: "pix_entrega", label: "PIX na Entrega", desc: "Pague na entrega", icon: ICONS.pix },
    { value: "credito_entrega", label: "Crédito", desc: "Maquininha na entrega", icon: ICONS.card },
    { value: "debito_entrega", label: "Débito", desc: "Maquininha na entrega", icon: ICONS.card },
    { value: "dinheiro_entrega", label: "Dinheiro", desc: "Pague na entrega", icon: ICONS.cash }
  ];

  const renderHTML = (m) => `
    <label class="pay-opt">
      <input type="radio" name="payMethod" value="${m.value}">
      <div class="pay-icon">${m.icon}</div>
      <div class="pay-info"><strong>${m.label}</strong><small>${m.desc}</small></div>
    </label>
  `;

  containerOnline.innerHTML = methodsOnline.map(renderHTML).join("");
  containerDelivery.innerHTML = methodsDelivery.map(renderHTML).join("");

  $$('input[name="payMethod"]').forEach((r) => r.addEventListener("change", (e) => {
    const [metodo, quando] = e.target.value.split('_');
    checkoutState = { metodo, quando };
    updateConfirmBtn();
  }));

  ["#cNome", "#cEmail", "#cFone", "#cCpf", "#cCep", "#cCidade", "#cUF", "#cBairro", "#cEnd", "#cNum"].forEach((sel) => $(sel)?.addEventListener("input", updateConfirmBtn));
  $("#confirmBtn")?.addEventListener("click", finalizarPedido);
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
      <div style="flex:1;"><strong>${esc(i.nome)}</strong><br><small class="muted">${money(i.preco)}</small></div>
      <div class="qty-checkout">
        <button onclick="alterarQtd('${i.id}', -1)">−</button>
        <span>${i.qty}</span>
        <button onclick="alterarQtd('${i.id}', 1)">+</button>
      </div>
      <strong style="margin: 0 16px;">${money(i.preco * i.qty)}</strong>
      <button onclick="alterarQtd('${i.id}', -999)" class="del-btn">${ICONS.trash}</button>
    </div>`).join("");

  $("#summaryItems").innerHTML = itens.map(i => `<div class="summary-row"><span>${i.qty}x ${esc(i.nome)}</span><span>${money(i.preco * i.qty)}</span></div>`).join("");
  
  const sub = cartTotal();
  $("#subTotal").textContent = money(sub);
  
  if (descontoAplicado > 0) {
    $("#descontoRow").style.display = "flex";
    $("#descontoVal").textContent = `- ${money(descontoAplicado)}`;
    $("#summaryTotal").textContent = money(Math.max(0, sub - descontoAplicado));
  } else {
    $("#descontoRow").style.display = "none";
    $("#summaryTotal").textContent = money(sub);
  }
  
  updateConfirmBtn();
}

async function aplicarCupom() {
  const codigo = $("#cupomInput").value.trim();
  if (!codigo) return showToast("Digite um cupom válido.", "error");
  
  try {
    const res = await API.validarCupom(codigo, cartTotal(), $("#cEmail")?.value || "");
    if (res.ok) {
      descontoAplicado = res.tipo === 'percentual' ? cartTotal() * (res.valor / 100) : Number(res.valor);
      showToast("Cupom aplicado com sucesso!");
      renderCheckout();
    } else {
      showToast(res.erro || "Cupom inválido.", "error");
    }
  } catch (err) {
    showToast("Erro ao validar cupom.", "error");
  }
}

function updateConfirmBtn() {
  const ok = checkoutState.metodo && $("#cNome")?.value.trim() && $("#cEmail")?.value.trim() && $("#cFone")?.value.trim() && $("#cCpf")?.value.trim() && getCartItens().length > 0;
  $("#confirmBtn").disabled = !ok;
}

async function finalizarPedido() {
  const btn = $("#confirmBtn"); btn.disabled = true; btn.textContent = "Processando...";
  try {
    const payload = {
      itens: getCartItens().map((i) => ({ id: i.id, qty: i.qty })),
      cliente: { nome: $("#cNome").value.trim(), email: $("#cEmail").value.trim(), telefone: $("#cFone").value.trim(), cpf: $("#cCpf").value.trim() },
      endereco: { cep: $("#cCep").value.trim(), logradouro: $("#cEnd").value.trim(), numero: $("#cNum").value.trim(), complemento: $("#cComp")?.value.trim(), bairro: $("#cBairro").value.trim(), cidade: $("#cCidade").value.trim(), estado: $("#cUF").value.trim().toUpperCase() },
      pagamento: { metodo: checkoutState.metodo, quando: checkoutState.quando },
      cupom_codigo: $("#cupomInput")?.value.trim() || null
    };
    const res = await API.criarPedido(payload);
    CART = []; saveCart();
    
    if (res.pix) {
      abrirModalPix(res.pedido_id, res.pix);
    } else {
      document.getElementById("checkoutMain").style.display = "none";
      document.getElementById("thankYouScreen").style.display = "flex";
    }
  } catch (err) { showToast(err.message, "error"); btn.disabled = false; btn.textContent = "Confirmar Pedido"; }
}

/* ==================== PIX ==================== */
function abrirModalPix(pedidoId, pixData) {
  pedidoPixIdGlobal = pedidoId;
  $("#pixQRCode").src = `data:image/jpeg;base64,${pixData.qr_code_base64}`;
  $("#pixCopiaCola").value = pixData.qr_code;
  $("#pixModal").classList.add("open");
  
  if (pixIntervalCheck) clearInterval(pixIntervalCheck);
  if (pixIntervalTimer) clearInterval(pixIntervalTimer);

  let tempoRestante = 900;
  const timerElement = $("#pixTimer");
  
  const atualizarTimer = () => {
    const minutos = Math.floor(tempoRestante / 60);
    const segundos = tempoRestante % 60;
    timerElement.textContent = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  };
  atualizarTimer();

  pixIntervalTimer = setInterval(() => {
    tempoRestante--;
    atualizarTimer();
    if (tempoRestante <= 0) {
      clearInterval(pixIntervalTimer);
      clearInterval(pixIntervalCheck);
      $("#pixModal").classList.remove("open");
      document.getElementById("checkoutMain").style.display = "none";
      const telaErro = document.getElementById("thankYouScreen");
      telaErro.innerHTML = `<h1 style="color:var(--perigo)">TEMPO EXCEDIDO</h1><p>O tempo para pagamento expirou.</p><a href="checkout.html" class="btn" style="margin-top:24px;">Tentar Novamente</a>`;
      telaErro.style.display = "flex";
    }
  }, 1000);

  pixIntervalCheck = setInterval(async () => {
    const pedido = await API.getPedido(pedidoId);
    if (pedido.status === 'pago' || pedido.status === 'em_separacao') {
      clearInterval(pixIntervalCheck);
      clearInterval(pixIntervalTimer);
      $("#pixModal").classList.remove("open");
      document.getElementById("checkoutMain").style.display = "none";
      document.getElementById("thankYouScreen").style.display = "flex";
    }
  }, 2000); 
}

function copiarPix() { const input = $("#pixCopiaCola"); input.select(); document.execCommand("copy"); showToast("Código PIX copiado!"); }
function fecharModalPix() { 
  if (pixIntervalCheck) clearInterval(pixIntervalCheck); 
  if (pixIntervalTimer) clearInterval(pixIntervalTimer);
  $("#pixModal").classList.remove("open"); 
  document.getElementById("checkoutMain").style.display = "none";
  document.getElementById("thankYouScreen").style.display = "flex";
}

/* ==================== INIT ==================== */
function initContato() {
  const form = $("#contatoForm"); if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button'); btn.textContent = "Enviando..."; btn.disabled = true;
    try {
      const res = await fetch(`${API_URL}/api/contato`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ nome: e.target.nome.value, email: e.target.email.value, assunto: e.target.assunto.value, msg: e.target.msg.value }) });
      if(!res.ok) throw new Error('Falha');
      showToast('Mensagem enviada!'); e.target.reset();
    } catch (err) { showToast('Erro ao enviar.', 'error'); } finally { btn.textContent = "Enviar mensagem"; btn.disabled = false; }
  });
}

async function init() {
  initTheme(); loadCart();
  renderHeader(); renderFooter(); renderCartDrawer(); 

  $("#overlay")?.addEventListener("click", fecharCarrinho);
  $("#modal")?.addEventListener("click", (e) => { if (e.target.id === "modal") fecharModal(); });

  try {
    CONFIG = parseConfig(await carregarTxt("data/config.txt"));
    PRODUTOS = (await API.getProdutos()).map(p => ({ id: p.id, nome: p.nome, preco: p.preco, categoria: p.categoria_nome || "", imagem: p.imagem_url || "", descricao: p.descricao_curta || p.descricao || "", estoque: p.estoque }));
    
    renderHeader(); renderFooter();

    if (PAGE === "home") {
      const grid = $("#homeGrid"); if(grid) grid.innerHTML = PRODUTOS.slice(0,4).map(cardHTML).join("");
      $("#heroTitulo").textContent = CONFIG.nome_loja; $("#heroSlogan").textContent = CONFIG.descricao;
    }
    if (PAGE === "produtos") initProdutos(); 
    if (PAGE === "sobre") initContato();
    if (PAGE === "checkout") initCheckout();
  } catch (err) { showToast("Erro ao conectar ao servidor.", "error"); }
}

const APP_READY = new Promise((r) => document.addEventListener("DOMContentLoaded", () => init().then(r).catch(r)));
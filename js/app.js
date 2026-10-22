/* ============================================================
   LOJA — Lógica completa do frontend
   - Produtos: via API (backend no Railway)
   - Config + Blog: via arquivos locais (.txt)
   ============================================================ */

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

function addCarrinho(id) {
  const p = PRODUTOS.find((x) => x.id === id);
  if (!p) return;
  const max = parseInt(p.estoque) || 0;
  if (max <= 0) return alert("Produto esgotado.");
  const item = CART.find((i) => i.id === id);
  if (item) {
    if (item.qty >= max) return alert("Estoque máximo atingido.");
    item.qty++;
  } else {
    CART.push({ id, qty: 1 });
  }
  saveCart();
  renderCartDrawer();
  renderCartBadge();
  abrirCarrinho();
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
  if (PAGE === "checkout" && typeof renderCheckout === "function")
    renderCheckout();
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
      <a href="checkout.html" class="cart-btn">
        🛒 <span class="cart-count" id="cartCount">0</span>
      </a>
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
        <div>
          <h4>${esc(c.nome_loja || "Loja")}</h4>
          <p>${esc(c.descricao || "")}</p>
        </div>
        <div>
          <h4>Navegue</h4>
          <ul>
            <li><a href="index.html">Início</a></li>
            <li><a href="produtos.html">Produtos</a></li>
            <li><a href="sobre.html">Sobre</a></li>
            <li><a href="blog.html">Blog</a></li>
            <li><a href="contato.html">Contato</a></li>
          </ul>
        </div>
        <div>
          <h4>Atendimento</h4>
          <ul>
            <li>${esc(c.email || "")}</li>
            <li>${esc(waDisplay)}</li>
            <li>${esc(c.horario || "")}</li>
          </ul>
        </div>
        <div>
          <h4>Pagamento</h4>
          <ul>
            <li>💳 Crédito e Débito</li>
            <li>🔷 PIX</li>
            <li>💵 Dinheiro na entrega</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        &copy; ${new Date().getFullYear()} ${esc(c.nome_loja || "")} — Todos os direitos reservados.
      </div>
    </div>`;
}

/* ==================== BADGE / DRAWER ==================== */
function renderCartBadge() {
  const el = $("#cartCount");
  if (el) el.textContent = cartQtd();
}

function renderCartDrawer() {
  const el = $("#cartDrawer");
  if (!el) return;
  const itens = getCartItens();
  el.innerHTML = `
    <div class="cart-header">
      <h3>Meu carrinho</h3>
      <button id="cartClose" aria-label="Fechar">✕</button>
    </div>
    <div class="cart-items">
      ${
        itens.length
          ? itens
              .map(
                (i) => `
        <div class="cart-item">
          <div>
            <strong>${esc(i.nome)}</strong>
            <small>${money(parseFloat(i.preco) || 0)} × ${i.qty}</small>
          </div>
          <div class="qty">
            <button data-dec="${esc(i.id)}">−</button>
            <span>${i.qty}</span>
            <button data-inc="${esc(i.id)}">+</button>
            <button class="del" data-del="${esc(i.id)}">🗑</button>
          </div>
        </div>`,
              )
              .join("")
          : '<p class="vazio">Seu carrinho está vazio.</p>'
      }
    </div>
    <div class="cart-footer">
      <div class="summary-row" style="padding:0;border:0">
        <span>Total</span><strong>${money(cartTotal())}</strong>
      </div>
      <a href="checkout.html" class="btn btn-block">Ir para o checkout</a>
      <button class="btn btn-ghost btn-block" id="continuarComprando">Continuar comprando</button>
    </div>`;

  el.querySelector("#cartClose").onclick = fecharCarrinho;
  el.querySelector("#continuarComprando").onclick = fecharCarrinho;
  el.querySelectorAll("[data-inc]").forEach(
    (b) => (b.onclick = () => alterarQtd(b.dataset.inc, +1)),
  );
  el.querySelectorAll("[data-dec]").forEach(
    (b) => (b.onclick = () => alterarQtd(b.dataset.dec, -1)),
  );
  el.querySelectorAll("[data-del]").forEach(
    (b) => (b.onclick = () => alterarQtd(b.dataset.del, -9999)),
  );
}

function abrirCarrinho() {
  $("#cartDrawer")?.classList.add("open");
  $("#overlay")?.classList.add("show");
}
function fecharCarrinho() {
  $("#cartDrawer")?.classList.remove("open");
  $("#overlay")?.classList.remove("show");
}

/* ==================== CARD DE PRODUTO ==================== */
function cardHTML(p) {
  const preco = parseFloat(p.preco) || 0;
  const esgotado = (parseInt(p.estoque) || 0) <= 0;
  const inicial = (p.nome || "?").charAt(0).toUpperCase();
  const nota =
    p.nota_media > 0 ? `★ ${p.nota_media} (${p.total_avaliacoes})` : "";
  return `
    <article class="card" data-detalhe="${esc(p.id)}">
      <div class="card-img">
        <div class="ph">${esc(inicial)}</div>
        ${p.imagem ? `<img src="${esc(p.imagem)}" alt="${esc(p.nome)}" loading="lazy" onerror="this.remove()">` : ""}
        ${esgotado ? '<span class="tag">Esgotado</span>' : ""}
        ${nota ? `<span class="tag" style="background:#fbbf24;color:#78350f">${nota}</span>` : ""}
      </div>
      <div class="card-body">
        <span class="cat">${esc(p.categoria)}</span>
        <h3>${esc(p.nome)}</h3>
        <p class="desc">${esc(p.descricao)}</p>
        <div class="card-foot">
          <strong>${money(preco)}</strong>
          <button class="btn btn-sm" data-add="${esc(p.id)}" ${esgotado ? "disabled" : ""}>Adicionar</button>
        </div>
      </div>
    </article>`;
}

function bindCards(container) {
  container.querySelectorAll("[data-add]").forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        addCarrinho(b.dataset.add);
      }),
  );
  container
    .querySelectorAll("[data-detalhe]")
    .forEach((c) => (c.onclick = () => abrirProdutoModal(c.dataset.detalhe)));
}

function abrirProdutoModal(id) {
  const p = PRODUTOS.find((x) => x.id === id);
  if (!p) return;
  const preco = parseFloat(p.preco) || 0;
  const esgotado = (parseInt(p.estoque) || 0) <= 0;
  const modal = $("#modal"),
    box = $("#modalBox");
  if (!modal || !box) return;

  box.innerHTML = `
    <button class="modal-close" data-close>✕</button>
    ${p.imagem ? `<img src="${esc(p.imagem)}" alt="${esc(p.nome)}" onerror="this.remove()">` : ""}
    <span class="cat">${esc(p.categoria)}</span>
    <h2>${esc(p.nome)}</h2>
    <p>${esc(p.descricao)}</p>
    <p class="preco">${money(preco)}</p>
    <p class="estoque">${esgotado ? "Indisponível no momento" : "Em estoque: " + esc(p.estoque)}</p>
    <button class="btn" data-add="${esc(p.id)}" ${esgotado ? "disabled" : ""}>Adicionar ao carrinho</button>`;
  box
    .querySelector("[data-add]")
    ?.addEventListener("click", () => addCarrinho(p.id));
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function fecharModal() {
  $("#modal")?.classList.remove("open");
  $("#modal")?.setAttribute("aria-hidden", "true");
}

/* ==================== PAGE: HOME ==================== */
function initHome() {
  const grid = $("#homeGrid");
  if (!grid) return;
  const destaques = PRODUTOS.filter(
    (p) => (p.destaque || "").toLowerCase() === "sim",
  ).slice(0, 4);
  const lista = destaques.length ? destaques : PRODUTOS.slice(0, 4);
  grid.innerHTML = lista.map(cardHTML).join("");
  bindCards(grid);

  $("#heroTitulo").textContent = CONFIG.nome_loja || "Bem-vindo";
  $("#heroSlogan").textContent =
    CONFIG.descricao ||
    "Produtos de qualidade, entrega rápida e pagamento seguro.";
}

/* ==================== PAGE: PRODUTOS ==================== */
function initProdutos() {
  const grid = $("#produtosGrid");
  if (!grid) return;

  const cats = [...new Set(PRODUTOS.map((p) => p.categoria).filter(Boolean))];
  $("#categoria").innerHTML =
    '<option value="">Todas as categorias</option>' +
    cats.map((c) => `<option>${esc(c)}</option>`).join("");

  function render() {
    const busca = $("#busca").value.toLowerCase().trim();
    const cat = $("#categoria").value;
    const lista = PRODUTOS.filter((p) => {
      const okCat = !cat || p.categoria === cat;
      const alvo = (
        p.nome +
        " " +
        p.descricao +
        " " +
        p.categoria
      ).toLowerCase();
      return okCat && (!busca || alvo.includes(busca));
    });
    grid.innerHTML = lista.map(cardHTML).join("");
    bindCards(grid);
    $("#vazio").hidden = lista.length > 0;
    $("#contador").textContent =
      `${lista.length} produto${lista.length === 1 ? "" : "s"} encontrado${lista.length === 1 ? "" : "s"}`;
  }
  $("#busca").addEventListener("input", render);
  $("#categoria").addEventListener("change", render);
  render();
}

/* ==================== PAGE: BLOG ==================== */
function initBlog() {
  const grid = $("#blogGrid");
  if (!grid) return;
  if (!BLOG.length) {
    grid.innerHTML = '<p class="vazio">Nenhum post ainda.</p>';
    return;
  }
  grid.innerHTML = BLOG.map(
    (b, i) => `
    <article class="post">
      <div class="post-meta">
        <span>${esc(b.data)}</span><span class="dot"></span><span>Leitura rápida</span>
      </div>
      <h3>${esc(b.titulo)}</h3>
      <p>${esc(b.resumo)}</p>
      <div class="post-actions"><button data-post="${i}">Ler mais →</button></div>
    </article>`,
  ).join("");

  grid
    .querySelectorAll("[data-post]")
    .forEach((b) => (b.onclick = () => abrirPostModal(BLOG[+b.dataset.post])));
}

function abrirPostModal(post) {
  const modal = $("#modal"),
    box = $("#modalBox");
  if (!modal || !box) return;
  box.innerHTML = `
    <button class="modal-close" data-close>✕</button>
    <small class="muted">${esc(post.data)}</small>
    <h2>${esc(post.titulo)}</h2>
    <p>${esc(post.conteudo).replace(/\\n/g, "<br>")}</p>`;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

/* ==================== PAGE: CONTATO ==================== */
function initContato() {
  const c = CONFIG;
  const waNum = (c.whatsapp || "").replace(/\D/g, "");
  const waDisp = c.whatsapp_display || c.whatsapp || "";

  if ($("#infoWhats")) {
    $("#infoWhats").onclick = () =>
      window.open(`https://wa.me/${waNum}`, "_blank");
    $("#infoWhats small").textContent = waDisp;
  }
  if ($("#infoEmail")) {
    $("#infoEmail").onclick = () => (location.href = `mailto:${c.email}`);
    $("#infoEmail small").textContent = c.email || "";
  }
  if ($("#infoInsta")) {
    $("#infoInsta").onclick = () =>
      window.open(
        `https://instagram.com/${(c.instagram || "").replace("@", "")}`,
        "_blank",
      );
    $("#infoInsta small").textContent = c.instagram || "";
  }
  if ($("#infoEnd")) {
    $("#infoEnd").onclick = () =>
      window.open(
        `https://maps.google.com/?q=${encodeURIComponent(c.endereco || "")}`,
        "_blank",
      );
    $("#infoEnd small").textContent = c.endereco || "";
  }
  if ($("#infoHorario")) {
    $("#infoHorario small").textContent = c.horario || "";
  }

  $("#contatoForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const nome = f.nome.value.trim();
    const mail = f.email.value.trim();
    const assunto = f.assunto.value;
    const msg = f.msg.value.trim();
    if (!nome || !mail || !msg) return alert("Preencha todos os campos.");

    const texto = `*Contato pelo site*\n\nNome: ${nome}\nE-mail: ${mail}\nAssunto: ${assunto}\n\n${msg}`;
    if (waNum) {
      window.open(
        `https://wa.me/${waNum}?text=${encodeURIComponent(texto)}`,
        "_blank",
      );
    } else if (c.email) {
      location.href = `mailto:${c.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(texto)}`;
    }
    f.reset();
  });
}

/* ==================== PAGE: CHECKOUT ==================== */
let checkoutState = { method: null, timing: null };
let cupomAplicado = null;

function initCheckout() {
  if (!$(".checkout-main")) return;

  renderCheckout();

  $$('input[name="payMethod"]').forEach((r) =>
    r.addEventListener("change", () => {
      checkoutState.method = r.value;
      checkoutState.timing = null;
      $$('input[name="payTiming"]').forEach((x) => (x.checked = false));

      const timingSection = $("#timingSection");
      timingSection.hidden = false;

      if (r.value === "dinheiro") {
        const online = timingSection.querySelector('input[value="online"]');
        if (online) {
          online.disabled = true;
          online.closest("label").style.opacity = 0.4;
          online.closest("label").style.pointerEvents = "none";
        }
        const entrega = timingSection.querySelector('input[value="entrega"]');
        if (entrega) {
          entrega.checked = true;
          checkoutState.timing = "entrega";
        }
      } else {
        const online = timingSection.querySelector('input[value="online"]');
        if (online) {
          online.disabled = false;
          online.closest("label").style.opacity = 1;
          online.closest("label").style.pointerEvents = "auto";
        }
      }
      updateConfirmBtn();
    }),
  );

  $$('input[name="payTiming"]').forEach((r) =>
    r.addEventListener("change", () => {
      checkoutState.timing = r.value;
      updateConfirmBtn();
    }),
  );

  [
    "#cNome",
    "#cEmail",
    "#cFone",
    "#cCep",
    "#cCidade",
    "#cUF",
    "#cBairro",
    "#cEnd",
    "#cNum",
  ].forEach((sel) => {
    $(sel)?.addEventListener("input", updateConfirmBtn);
  });

  $("#cupomBtn")?.addEventListener("click", async () => {
    const codigo = $("#cupomInput").value.trim();
    if (!codigo) return;
    const email = $("#cEmail")?.value.trim() || "";
    const msg = $("#cupomMsg");

    msg.textContent = "Validando...";
    msg.style.color = "var(--muted)";

    try {
      const res = await API.validarCupom(codigo, cartTotal(), email);
      if (res.ok) {
        cupomAplicado = res;
        msg.textContent = `✓ Cupom aplicado: -${money(calcularDesconto(res))}`;
        msg.style.color = "var(--sucesso)";
        renderCheckout();
      } else {
        cupomAplicado = null;
        msg.textContent = `✗ ${res.erro}`;
        msg.style.color = "var(--perigo)";
        renderCheckout();
      }
    } catch {
      msg.textContent = "✗ Erro ao validar cupom";
      msg.style.color = "var(--perigo)";
    }
  });

  $("#confirmBtn")?.addEventListener("click", finalizarPedido);
}

function calcularDesconto(cupom) {
  const subtotal = cartTotal();
  if (cupom.tipo === "percentual") return subtotal * (cupom.valor / 100);
  if (cupom.tipo === "fixo") return Number(cupom.valor);
  return 0;
}

function renderCheckout() {
  const itens = getCartItens();

  if (!itens.length) {
    $(".checkout-main").innerHTML = `
      <div class="checkout-card" style="text-align:center;padding:40px">
        <h2>Seu carrinho está vazio</h2>
        <p class="muted" style="margin-bottom:16px">Adicione produtos para continuar.</p>
        <a href="produtos.html" class="btn">Ver produtos</a>
      </div>`;
    $("#summaryItems").innerHTML = "";
    $("#subTotal").textContent = money(0);
    $("#summaryTotal").textContent = money(0);
    $("#confirmBtn").disabled = true;
    return;
  }

  const box = $("#checkoutItems");
  if (box) {
    box.innerHTML = itens
      .map((i) => {
        const sub = (parseFloat(i.preco) || 0) * i.qty;
        const inicial = (i.nome || "?").charAt(0).toUpperCase();
        return `
        <div class="co-item">
          <div class="co-item-img">${i.imagem ? `<img src="${esc(i.imagem)}" alt="" onerror="this.remove()">` : esc(inicial)}</div>
          <div class="co-item-info">
            <strong>${esc(i.nome)}</strong>
            <small>${money(parseFloat(i.preco) || 0)} × ${i.qty}</small>
            <div class="co-item-actions">
              <button class="btn btn-sm btn-ghost" data-dec="${esc(i.id)}">−</button>
              <button class="btn btn-sm btn-ghost" data-inc="${esc(i.id)}">+</button>
              <button class="btn btn-sm btn-ghost" data-del="${esc(i.id)}" style="color:var(--perigo)">Remover</button>
            </div>
          </div>
          <div class="co-item-price">${money(sub)}</div>
        </div>`;
      })
      .join("");

    box
      .querySelectorAll("[data-inc]")
      .forEach((b) => (b.onclick = () => alterarQtd(b.dataset.inc, +1)));
    box
      .querySelectorAll("[data-dec]")
      .forEach((b) => (b.onclick = () => alterarQtd(b.dataset.dec, -1)));
    box
      .querySelectorAll("[data-del]")
      .forEach((b) => (b.onclick = () => alterarQtd(b.dataset.del, -9999)));
  }

  const summary = $("#summaryItems");
  if (summary) {
    summary.innerHTML = itens
      .map(
        (i) => `
      <div class="summary-row">
        <span>${i.qty}× ${esc(i.nome)}</span>
        <span>${money((parseFloat(i.preco) || 0) * i.qty)}</span>
      </div>`,
      )
      .join("");
  }

  const subtotal = cartTotal();
  const desconto = cupomAplicado ? calcularDesconto(cupomAplicado) : 0;
  const total = Math.max(0, subtotal - desconto);

  $("#subTotal").textContent = money(subtotal);
  $("#descontoRow").hidden = desconto <= 0;
  $("#descontoVal").textContent = "- " + money(desconto);
  $("#summaryTotal").textContent = money(total);

  updateConfirmBtn();
}

function updateConfirmBtn() {
  const btn = $("#confirmBtn");
  if (!btn) return;
  const ok =
    checkoutState.method &&
    checkoutState.timing &&
    $("#cNome")?.value.trim() &&
    $("#cEmail")?.value.trim() &&
    $("#cFone")?.value.trim() &&
    $("#cCep")?.value.trim() &&
    $("#cCidade")?.value.trim() &&
    $("#cUF")?.value.trim() &&
    $("#cBairro")?.value.trim() &&
    $("#cEnd")?.value.trim() &&
    $("#cNum")?.value.trim() &&
    getCartItens().length > 0;
  btn.disabled = !ok;
}

async function finalizarPedido() {
  const itens = getCartItens();
  if (!itens.length) return alert("Carrinho vazio.");

  const btn = $("#confirmBtn");
  btn.disabled = true;
  btn.textContent = "Processando...";

  try {
    const payload = {
      itens: itens.map((i) => ({ id: i.id, qty: i.qty })),
      cliente: {
        nome: $("#cNome").value.trim(),
        email: $("#cEmail").value.trim(),
        telefone: $("#cFone").value.trim(),
        cpf: $("#cCpf")?.value.trim() || "",
        observacoes: $("#cObs")?.value.trim() || "",
      },
      endereco: {
        cep: $("#cCep").value.trim(),
        logradouro: $("#cEnd").value.trim(),
        numero: $("#cNum").value.trim(),
        complemento: $("#cComp")?.value.trim() || "",
        bairro: $("#cBairro").value.trim(),
        cidade: $("#cCidade").value.trim(),
        estado: $("#cUF").value.trim().toUpperCase(),
      },
      pagamento: {
        metodo: checkoutState.method,
        quando: checkoutState.timing,
      },
      cupom_codigo: cupomAplicado?.codigo || null,
    };

    const res = await API.criarPedido(payload);

    CART = [];
    saveCart();

    if (res.init_point) {
      location.href = res.init_point;
    } else {
      location.href = `pedido.html?id=${res.pedido_id}`;
    }
  } catch (err) {
    alert("Erro ao processar pedido: " + err.message);
    btn.disabled = false;
    btn.textContent = "Confirmar pedido";
  }
}

/* ==================== INIT ==================== */
async function init() {
  loadCart();

  $("#overlay")?.addEventListener("click", fecharCarrinho);
  $("#modal")?.addEventListener("click", (e) => {
    if (e.target.id === "modal" || e.target.dataset.close !== undefined)
      fecharModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      fecharModal();
      fecharCarrinho();
    }
  });

  try {
    const cfgTxt = await carregarTxt("data/config.txt");
    CONFIG = parseConfig(cfgTxt);

    const produtosApi = await API.getProdutos();
    PRODUTOS = produtosApi.map((p) => ({
      id: p.id,
      nome: p.nome,
      slug: p.slug,
      preco: p.preco,
      preco_antigo: p.preco_antigo,
      categoria: p.categoria_nome || "",
      imagem: p.imagem_url || "",
      descricao: p.descricao_curta || p.descricao || "",
      estoque: p.estoque,
      destaque: p.destaque ? "sim" : "nao",
      nota_media: p.nota_media,
      total_avaliacoes: p.total_avaliacoes,
    }));

    const blogTxt = await carregarTxt("data/blog.txt");
    BLOG = parseLinhas(blogTxt, ["titulo", "data", "resumo", "conteudo"]);
  } catch (err) {
    document.body.insertAdjacentHTML(
      "afterbegin",
      `
      <div style="background:#fee2e2;color:#991b1b;padding:14px;text-align:center;font-weight:600">
        ⚠️ Erro ao conectar: ${esc(err.message)}<br>
        <small>Verifique se o backend está rodando e se a URL em <code>js/api.js</code> está correta.</small>
      </div>`,
    );
    console.error(err);
    return;
  }

  if (CONFIG.cor_primaria)
    document.documentElement.style.setProperty(
      "--primaria",
      CONFIG.cor_primaria,
    );
  if (CONFIG.cor_secundaria)
    document.documentElement.style.setProperty(
      "--primaria-dark",
      CONFIG.cor_secundaria,
    );

  renderHeader();
  renderFooter();
  renderCartDrawer();
  renderCartBadge();

  if (PAGE === "home") initHome();
  if (PAGE === "produtos") initProdutos();
  if (PAGE === "blog") initBlog();
  if (PAGE === "contato") initContato();
  if (PAGE === "checkout") initCheckout();

  window.addEventListener("storage", () => {
    loadCart();
    renderCartDrawer();
    renderCartBadge();
    if (PAGE === "checkout") renderCheckout();
  });
}

// Promessa global para páginas que dependem do init completo
const APP_READY = new Promise((resolve) => {
  document.addEventListener("DOMContentLoaded", () =>
    init().then(resolve).catch(resolve),
  );
});

/* ============================================================
   Cliente da API do backend
   Troque API_URL pela URL do seu backend no Railway
   ============================================================ */

const API_URL = "https://loja-backend-production-e7f4.up.railway.app";

const API = {
  async getProdutos() {
    const r = await fetch(`${API_URL}/api/produtos`);
    if (!r.ok) throw new Error("Erro ao buscar produtos");
    return r.json();
  },

  async getProduto(slug) {
    const r = await fetch(`${API_URL}/api/produtos/${slug}`);
    if (!r.ok) throw new Error("Produto não encontrado");
    return r.json();
  },

  async getCategorias() {
    const r = await fetch(`${API_URL}/api/categorias`);
    return r.json();
  },

  async validarCupom(codigo, subtotal, email) {
    const r = await fetch(`${API_URL}/api/cupom/validar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo, subtotal, email }),
    });
    return r.json();
  },

  async criarPedido(payload) {
    const r = await fetch(`${API_URL}/api/pedidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.erro || "Erro ao criar pedido");
    return data;
  },

  async getPedido(id) {
    const r = await fetch(`${API_URL}/api/pedidos/${id}`);
    if (!r.ok) throw new Error("Pedido não encontrado");
    return r.json();
  },
};

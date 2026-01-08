// Panel de carrito para producto
(function(){
  function safeSrc(u){ try { if (!u) return 'img/thumb-placeholder.svg'; const s=String(u).trim().replace(/\\/g,'/'); return encodeURI(s); } catch { return 'img/thumb-placeholder.svg'; } }
  const CART_KEY = 'cart_summary';
  const $ = (s)=>document.querySelector(s);
  const panel = document.getElementById('cart-panel');
  if (!panel) return;

  const listEl = document.createElement('div');
  listEl.id = 'cart-items';
  listEl.className = 'cart-list';
  const totalEl = document.createElement('div');
  totalEl.id = 'cart-total';
  totalEl.style.marginTop = '8px';
  panel.appendChild(listEl);
  panel.appendChild(totalEl);

  async function loadCart(){
    try {
      const res = await fetch('api/cart.php?action=get', { cache:'no-store', credentials:'same-origin' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Error al cargar carrito');
      try { localStorage.setItem(CART_KEY, JSON.stringify({ count: data.count||0, total: data.total||0 })); } catch {}
      render(data.items || [], data.total || 0);
    } catch (e) {
      listEl.innerHTML = `<em style="color:var(--danger)">${e.message}</em>`;
      totalEl.textContent = '';
    }
  }

  function render(items, total){
    if (!items.length) {
      listEl.innerHTML = `
        <div class="cart-empty">
          <span>Tu carrito está vacío</span>
          <a href="productos.html" class="btn btn-primary">Ver productos</a>
        </div>`;
      totalEl.textContent = '';
      return;
    }
    listEl.innerHTML = items.map(it=>{
      const price = Number(it.precio||0);
      const qty = Number(it.cantidad||1);
      const sub = price*qty;
      const img = it.imagen ? `<img class="cart-thumb" src="${safeSrc(it.imagen)}" alt="${it.titulo}" onerror="this.src='img/thumb-placeholder.svg'">` : '';
      return `
      <div class="cart-item" data-id="${it.id}">
        ${img}
        <div class="cart-info">
          <h3 class="cart-title">${it.titulo}</h3>
          ${it.variante ? `<div class="cart-variant">${it.variante}</div>` : ''}
          <div class="cart-meta">
            <span class="cart-price">$${price.toFixed(2)}</span>
            <span>×</span>
            <div class="qty-ctrl" role="group" aria-label="Cantidad">
              <button class="btn" data-dec aria-label="Disminuir">−</button>
              <span class="qty" aria-live="polite">${qty}</span>
              <button class="btn" data-inc aria-label="Aumentar">+</button>
            </div>
          </div>
        </div>
        <div class="cart-actions">
          <div class="cart-subtotal" aria-label="Subtotal">$${sub.toFixed(2)}</div>
          <button class="btn cart-remove" data-del aria-label="Eliminar">Eliminar</button>
        </div>
      </div>`;
    }).join('');
    totalEl.textContent = `Total: $${Number(total).toFixed(2)}`;
  }

  let updating = false;
  listEl.addEventListener('click', async (e)=>{
    const row = e.target.closest('.cart-row');
    const item = e.target.closest('.cart-item');
    const holder = item || row; // compat por si hay restos antiguos
    if (!holder) return;
    if (updating) return;
    const id = Number(holder.getAttribute('data-id'));
    const qtyEl = holder.querySelector('.qty');
    const curQty = Number(qtyEl?.textContent || 1);
    let nextQty = curQty;

    if (e.target.matches('[data-del]')) {
      updating = true; await send('remove', { item_id: id }); updating = false; return;
    }
    if (e.target.matches('[data-inc]')) { nextQty = curQty + 1; }
    if (e.target.matches('[data-dec]')) { nextQty = Math.max(0, curQty - 1); }
    if (nextQty === curQty) return;
    updating = true;
    if (nextQty === 0) { await send('remove', { item_id: id }); }
    else { await send('update', { item_id: id, qty: nextQty }); }
    updating = false;
  });

  async function send(action, body){
    const res = await fetch('api/cart.php', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify({ action, ...body }) });
    const out = await res.json();
    if (!res.ok || out.error) {
      alert(out.detail || out.error || 'Error en carrito');
      return;
    }
    try { localStorage.setItem(CART_KEY, JSON.stringify({ count: out.count||0, total: out.total||0 })); } catch {}
    render(out.items || [], out.total || 0);
    try { document.dispatchEvent(new CustomEvent('cart:updated')); } catch {}
  }

  document.addEventListener('cart:updated', loadCart);
  loadCart();
})();

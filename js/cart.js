// Panel de carrito para producto
(function(){
  const CART_KEY = 'cart_summary';
  const $ = (s)=>document.querySelector(s);
  const panel = document.getElementById('cart-panel');
  if (!panel) return;

  const listEl = document.createElement('div');
  listEl.id = 'cart-items';
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
      listEl.innerHTML = '<em>Carrito vacío</em>';
      totalEl.textContent = '';
      return;
    }
    listEl.innerHTML = items.map(it=>`
      <div class="cart-row" data-id="${it.id}" style="display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid var(--border)">
        ${it.imagen ? `<img src="${it.imagen}" alt="${it.titulo}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">` : ''}
        <div style="flex:1">
          <div><strong>${it.titulo}</strong> ${it.variante ? `• ${it.variante}` : ''}</div>
          <div style="color:var(--muted)">$${Number(it.precio).toFixed(2)}</div>
        </div>
        <div style="display:flex; align-items:center; gap:6px">
          <button class="btn" data-dec>-</button>
          <span class="qty">${it.cantidad}</span>
          <button class="btn" data-inc>+</button>
          <button class="btn" data-del>Eliminar</button>
        </div>
      </div>
    `).join('');
    totalEl.textContent = `Total: $${Number(total).toFixed(2)}`;
  }

  listEl.addEventListener('click', async (e)=>{
    const row = e.target.closest('.cart-row');
    if (!row) return;
    const id = Number(row.getAttribute('data-id'));
    if (e.target.matches('[data-del]')) {
      await send('remove', { item_id: id });
    } else if (e.target.matches('[data-inc]')) {
      const qty = Number(row.querySelector('.qty').textContent) + 1;
      await send('update', { item_id: id, qty });
    } else if (e.target.matches('[data-dec]')) {
      const qty = Math.max(0, Number(row.querySelector('.qty').textContent) - 1);
      await send('update', { item_id: id, qty });
    }
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

'use strict';

function safeSrc(u, placeholder){
  try {
    if (!u) return placeholder || 'img/large-placeholder.svg';
    const s = String(u).trim().replace(/\\/g,'/');
    return encodeURI(s);
  } catch { return placeholder || 'img/large-placeholder.svg'; }
}

function getIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function setThumbs(thumbnails, mainImgEl) {
  const thumbsWrap = document.getElementById('detail-thumbs');
  if (!thumbsWrap) return;
  thumbsWrap.innerHTML = '';
  const imgs = Array.isArray(thumbnails) ? thumbnails : [];
  imgs.forEach((src) => {
    const url = safeSrc(src, 'img/thumb-placeholder.svg');
    const btn = document.createElement('button');
    btn.className = 'thumb';
    btn.type = 'button';
    btn.innerHTML = `<img alt="Miniatura" src="${url}" loading="lazy" onerror="this.src='img/thumb-placeholder.svg'">`;
    btn.addEventListener('click', () => {
      if (mainImgEl) mainImgEl.src = url;
    });
    thumbsWrap.appendChild(btn);
  });
}

async function renderProduct() {
  const id = getIdFromQuery();
  const emptyEl = document.getElementById('detail-empty');
  const titleEl = document.getElementById('detail-title');
  const priceEl = document.getElementById('detail-price');
  const imgEl = document.getElementById('detail-image');
  const descEl = document.getElementById('detail-descripcion');
  const specsEl = document.getElementById('detail-especificaciones');
  const addBtn = document.getElementById('btn-add-cart');
  const colorSel = document.getElementById('opt-color');
  const cartMsg = document.getElementById('cart-msg');

  if (!id) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }

  // Helper para mostrar mensajes de estado/errores
  function showMsg(text) {
    if (!emptyEl) return;
    emptyEl.textContent = text;
    emptyEl.classList.remove('hidden');
  }

  // 1) Intentar obtener desde la API (base de datos) con detalle de error
  async function fetchFromApi() {
    const res = await fetch(typeof API_URL !== 'undefined' ? API_URL : 'api/products.php', { cache: 'no-store' });
    if (!res.ok) {
      let detail = '';
      try {
        const j = await res.json();
        if (j && (j.detail || j.error)) detail = ` - ${j.detail || j.error}`;
      } catch {}
      throw new Error(`HTTP ${res.status}${detail}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Formato inválido en API');
    return data;
  }

  let p = null;
  try {
    const apiList = await fetchFromApi();
    p = apiList.find(x => String(x.id) === String(id));
    if (!p) {
      showMsg('No se encontró el producto en la base de datos.');
      return;
    }
  } catch (apiErr) {
    // Mostrar el error real de la API y luego intentar respaldo local
    showMsg(`Error al consultar la base de datos: ${apiErr.message}`);
    try {
      const list = await getProducts(); // puede usar JSON local como respaldo
      p = list.find(x => String(x.id) === String(id));
      // Si no está ni siquiera en el respaldo, dejamos el mensaje de error visible
      if (!p) return;
    } catch {
      return; // No hay nada que mostrar
    }
  }

  document.title = `Página 3D | ${p.title}`;
  titleEl.textContent = p.title || '';
  // Mostrar precio con descuento si aplica (estilo minimalista)
  if (p.oferta_activa && (p.oferta_pct||0) > 0) {
    priceEl.innerHTML = `<span class="price-old">${money(p.precioBase)}</span> <strong class="price-new">${money(p.precio)}</strong> <span class="discount-badge" style="margin-left:6px">-${Number(p.oferta_pct||0)}%</span>`;
  } else {
    priceEl.innerHTML = `<span class="price-new">${money(p.precio)}</span>`;
  }
  const primary = safeSrc(p.imagenInterna || (p.imagenesPeque && p.imagenesPeque[0]), 'img/large-placeholder.svg');
  imgEl.src = primary;
  imgEl.alt = p.title || 'Producto';
  imgEl.loading = 'eager';
  imgEl.onerror = function(){
    const att = parseInt(this.getAttribute('data-attempt')||'0',10);
    if(att === 0){ this.setAttribute('data-attempt','1'); this.src = (primary||'').replace(/%20/g,' '); return; }
    if(att === 1){ this.setAttribute('data-attempt','2'); this.src = (primary||'').replace(/ /g,'%20'); return; }
    this.src = 'img/large-placeholder.svg';
  };
  descEl.textContent = p.descripcion || '';

  if (Array.isArray(p.especificaciones)) {
    specsEl.innerHTML = p.especificaciones.map(li => `<li>${li}</li>`).join('');
  } else {
    specsEl.innerHTML = '';
  }

  const thumbs = Array.isArray(p.imagenesPeque) ? p.imagenesPeque.slice() : [];
  if (p.imagenInterna) thumbs.unshift(p.imagenInterna);
  setThumbs(thumbs, imgEl);

  // Estado de stock
  const stockState = p.stockState || 'stock_ok';
  if (stockState === 'sin_stock') {
    if (addBtn) { addBtn.disabled = true; addBtn.textContent = 'Sin stock'; }
    if (emptyEl) { emptyEl.textContent = 'Sin stock disponible'; emptyEl.classList.remove('hidden'); }
  } else if (stockState === 'poco_stock') {
    if (emptyEl) { emptyEl.textContent = '¡Quedan pocas unidades!'; emptyEl.classList.remove('hidden'); }
  }

  // Agregar al carrito
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      try {
        if (cartMsg) { cartMsg.textContent = ''; }
        const variant = (colorSel?.value || 'Blanco');
        const body = { action: 'add', product_id: p.id, variant, qty: 1 };
        const res = await fetch('api/cart.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
        const out = await res.json();
        if (!res.ok || out.error) {
          if (cartMsg) {
            cartMsg.textContent = out.detail || out.error || 'No se pudo agregar al carrito';
            cartMsg.style.color = 'var(--danger)';
          }
          return;
        }
        try { showToast('Artículo añadido con éxito'); } catch {}
        // Guardar resumen en localStorage y notificar
        try { localStorage.setItem('cart_summary', JSON.stringify({ count: out.count||0, total: out.total||0 })); } catch {}
        try { document.dispatchEvent(new CustomEvent('cart:updated')); } catch {}
      } catch (err) {
        if (cartMsg) {
          cartMsg.textContent = 'Error: ' + err.message;
          cartMsg.style.color = 'var(--danger)';
        }
      }
    });
  }
}

window.addEventListener('DOMContentLoaded', renderProduct);

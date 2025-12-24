(function(){
  const $ = (s)=>document.querySelector(s);
  async function status(){
    try { const r = await fetch('api/auth.php?action=status',{cache:'no-store',credentials:'same-origin'}); return await r.json(); } catch { return {user:null}; }
  }
  async function loadSummary(){
    try { const r = await fetch('api/cart.php?action=get',{cache:'no-store',credentials:'same-origin'}); const d=await r.json();
      const items = Array.isArray(d.items)? d.items : [];
      const sub = items.reduce((acc,it)=> acc + Number(it.precio_original||it.precio||0) * Number(it.cantidad||0), 0);
      const tot = items.reduce((acc,it)=> acc + Number(it.precio||0) * Number(it.cantidad||0), 0);
      const save = Math.max(0, sub - tot);
      $('#summary-count').textContent = `Artículos: ${d.count||0}`;
      $('#summary-sub').textContent = `Subtotal sin descuento: $${sub.toFixed(2)}`;
      $('#summary-total').textContent = `Total final: $${tot.toFixed(2)}`;
      $('#summary-save').textContent = save>0 ? `Ahorro por descuentos: $${save.toFixed(2)}` : 'Sin descuentos aplicados';
      try { localStorage.setItem('cart_summary', JSON.stringify({count:d.count||0,total:tot||0})); } catch {}
    } catch {}
  }
  // Ya no guardamos en localStorage: usamos API real
  async function loadAddresses(){
    try { const r = await fetch('api/profile.php?action=addr_list',{credentials:'same-origin'}); if(!r.ok) return [];
      return await r.json();
    } catch { return []; }
  }
  function renderAddressSelect(list){
    const box = $('#addr-select'); if(!box) return;
    if(!list.length){ box.innerHTML = '<em>No tienes direcciones. Añade una desde Direcciones.</em>'; return; }
    const opts = list.map(d=>`<label style="display:flex; gap:8px; align-items:center; margin:8px 0"><input type="radio" name="addr" value="${d.id}" ${d.principal? 'checked': ''}> <div><strong>${d.etiqueta||'Dirección'}</strong><div>${d.linea1}${d.linea2?(', '+d.linea2):''}</div><div>${d.ciudad||''} ${d.provincia?(', '+d.provincia):''}</div></div></label>`).join('');
    box.innerHTML = opts;
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    applySavedTheme(); injectThemeSwitcher(); initMobileNav();
    await loadSummary();
    const st = await status();
    const note = $('#checkout-status');
    const guest = $('#checkout-guest');
    const addrBox = $('#checkout-address');
    if(st.user){
      note.textContent = `Comprando como ${st.user.nombre} (${st.user.email})`;
      guest.classList.add('hidden');
      addrBox.classList.remove('hidden');
      const addrs = await loadAddresses();
      renderAddressSelect(addrs);
    } else {
      note.textContent = 'Compra como invitado (sin iniciar sesión)';
      guest.classList.remove('hidden');
      addrBox.classList.add('hidden');
    }

    $('#place-order')?.addEventListener('click', async ()=>{
      const msg = $('#place-msg'); msg.textContent = '';
      // Validaciones básicas
      const st2 = await status();
      if(!st2.user){
        const nombre = $('#g-nombre')?.value.trim();
        const email  = $('#g-email')?.value.trim();
        if(!nombre || !email){ msg.style.color='var(--danger)'; msg.textContent='Completa nombre y email para continuar.'; return; }
      }
      // Crear pedido real en la base de datos
      try {
          // Dirección seleccionada (si aplica)
          const addrSelected = document.querySelector('input[name="addr"]:checked');
          const direccion_id = addrSelected ? Number(addrSelected.value) : undefined;
        let dirId = null; const sel = document.querySelector('input[name="addr"]:checked'); if (sel) dirId = Number(sel.value||'0')||null;
        const res = await fetch('api/orders.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
            body: JSON.stringify({ action: 'create', notas: $('#p-notas')?.value || '', direccion_id })
        });
        const out = await res.json();
        if(!res.ok || out.error){
          msg.style.color='var(--danger)';
          msg.textContent = out.detail || out.error || 'No se pudo crear el pedido.';
          return;
        }
        msg.style.color='var(--accent)';
        msg.textContent = `Pedido #${out.id} creado. ¡Gracias por tu compra!`;
        // Actualizar badge del carrito (el backend ya lo limpió)
        try { document.dispatchEvent(new CustomEvent('cart:updated')); } catch {}
        await loadSummary();
      } catch (e) {
        msg.style.color='var(--danger)';
        msg.textContent = 'Error creando el pedido: ' + (e?.message||e);
      }
    });
  });
})();

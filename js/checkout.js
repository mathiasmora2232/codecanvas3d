(function(){
  const $ = (s)=>document.querySelector(s);
  async function status(){
    try { const r = await fetch('api/auth.php?action=status',{cache:'no-store',credentials:'same-origin'}); return await r.json(); } catch { return {user:null}; }
  }
  async function loadSummary(){
    try { const r = await fetch('api/cart.php?action=get',{cache:'no-store',credentials:'same-origin'}); const d=await r.json();
      $('#summary-count').textContent = `Artículos: ${d.count||0}`;
      $('#summary-total').textContent = `Total: $${Number(d.total||0).toFixed(2)}`;
      try { localStorage.setItem('cart_summary', JSON.stringify({count:d.count||0,total:d.total||0})); } catch {}
    } catch {}
  }
  function saveOrder(payload){
    try {
      const key='orders';
      const list = JSON.parse(localStorage.getItem(key)||'[]');
      list.push(payload);
      localStorage.setItem(key, JSON.stringify(list));
    } catch {}
  }
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
      // Obtener items actuales antes de limpiar
      let snapshot = { items: [], count: 0, total: 0 };
      try { const r = await fetch('api/cart.php?action=get',{cache:'no-store',credentials:'same-origin'}); const d = await r.json(); snapshot = { items: d.items||[], count: d.count||0, total: d.total||0 }; } catch {}
      msg.style.color='var(--accent)';
      msg.textContent = 'Pedido simulado creado. ¡Gracias por tu compra!';
      // Guardar pedido simulado
      const order = {
        id: Date.now(),
        date: new Date().toISOString(),
        userId: st2.user?.id || null,
        guest: st2.user? null : { nombre: $('#g-nombre')?.value.trim(), email: $('#g-email')?.value.trim() },
        items: snapshot.items,
        count: snapshot.count,
        total: snapshot.total,
        notas: $('#p-notas')?.value || ''
      };
      saveOrder(order);
      // Limpiar carrito (simulación)
      try { await fetch('api/cart.php', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify({action:'clear'}) });
        document.dispatchEvent(new CustomEvent('cart:updated'));
      } catch {}
    });
  });
})();

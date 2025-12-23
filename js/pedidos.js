(function(){
  const ORDERS_KEY='orders';
  async function status(){ try{ const r=await fetch('api/auth.php?action=status',{cache:'no-store',credentials:'same-origin'}); return await r.json(); } catch { return {user:null}; } }
  function toggle(user){ const g=document.getElementById('orders-guest'); const u=document.getElementById('orders-user'); if(user){ g.classList.add('hidden'); u.classList.remove('hidden'); } else { g.classList.remove('hidden'); u.classList.add('hidden'); } }
  async function apiOrders(){
    try{ const r=await fetch('api/orders.php?action=list',{cache:'no-store',credentials:'same-origin'}); if(!r.ok) return null; return await r.json(); } catch { return null; }
  }
  function localOrders(user){ try{ const all=JSON.parse(localStorage.getItem(ORDERS_KEY)||'[]'); return user? all.filter(o=>String(o.userId||'')===String(user.id||'')) : []; } catch { return []; } }
  async function renderOrders(user){
    const box=document.getElementById('orders-list'); if(!box) return;
    let list = [];
    if(user){ list = await apiOrders() || []; }
    if(!list.length && user){ list = localOrders(user); }
    if(!list.length){ box.innerHTML='<em>No tienes pedidos todavía.</em>'; return; }
    box.innerHTML = list.map(o=>{
      const fecha = o.creado ? new Date(o.creado) : (o.date? new Date(o.date) : new Date());
      const items = (o.items||[]).map(it=>{
        const base = Number(it.precio_original||0);
        const final = Number(it.precio||0);
        const pct   = Number(it.descuento_pct||0);
        const priceHtml = pct>0 ? `<span style="text-decoration:line-through; color:var(--muted)">$${base.toFixed(2)}</span> <strong>$${final.toFixed(2)}</strong> <span class="pill" style="background:var(--accent); color:#fff; margin-left:6px">-${pct}%</span>` : `$${final.toFixed(2)}`;
        return `<li>#${it.producto_id} — ${it.titulo||it.title||'Producto'} × ${it.cantidad||it.qty||1} — ${priceHtml}</li>`;
      }).join('');
      const count = (o.items||[]).reduce((a,x)=>a + (Number(x.cantidad||x.qty||1)),0);
      const who = o.usuario_nombre ? `${o.usuario_nombre} (${o.usuario_email||''})` : '';
      const dir = o.direccion_id ? `• Dirección #${o.direccion_id}` : '';
      return `<div class="account-block" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center"><strong>Pedido #${o.id}</strong><span>${fecha.toLocaleString()}</span></div><div>${who} ${dir}</div><div>Total: <strong>$${Number(o.total||0).toFixed(2)}</strong> — ${count} artículo(s)</div><details style="margin-top:6px"><summary>Ver items</summary><ul class="spec-list">${items}</ul></details></div>`;
    }).join('');
  }
  document.addEventListener('DOMContentLoaded', async ()=>{
    applySavedTheme(); injectThemeSwitcher(); initMobileNav();
    const st=await status(); toggle(st.user); if(st.user) await renderOrders(st.user);
  });
})();

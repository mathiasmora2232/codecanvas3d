(function(){
  const ORDERS_KEY='orders';
  async function status(){ try{ const r=await fetch('api/auth.php?action=status',{cache:'no-store',credentials:'same-origin'}); return await r.json(); } catch { return {user:null}; } }
  function toggle(user){ const g=document.getElementById('orders-guest'); const u=document.getElementById('orders-user'); if(user){ g.classList.add('hidden'); u.classList.remove('hidden'); } else { g.classList.remove('hidden'); u.classList.add('hidden'); } }
  function getOrders(){ try{ return JSON.parse(localStorage.getItem(ORDERS_KEY)||'[]'); } catch { return []; } }
  function renderOrders(user){ const box=document.getElementById('orders-list'); if(!box) return; const all=getOrders(); const list = user? all.filter(o=>String(o.userId||'')===String(user.id||'')) : []; if(!list.length){ box.innerHTML='<em>No tienes pedidos todavía.</em>'; return; } box.innerHTML = list.map(o=>{
      const items = (o.items||[]).map(it=>`<li>${it.titulo||it.title||'Producto'} × ${it.cantidad||it.qty||1} — $${Number(it.precio||0).toFixed(2)}</li>`).join('');
      return `<div class="account-block" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center"><strong>Pedido #${o.id}</strong><span>${new Date(o.date).toLocaleString()}</span></div><div>Total: <strong>$${Number(o.total||0).toFixed(2)}</strong> — ${o.count||0} artículo(s)</div><details style="margin-top:6px"><summary>Ver items</summary><ul class="spec-list">${items}</ul></details></div>`;
    }).join(''); }
  document.addEventListener('DOMContentLoaded', async ()=>{
    applySavedTheme(); injectThemeSwitcher(); initMobileNav();
    const st=await status(); toggle(st.user); if(st.user) renderOrders(st.user);
  });
})();

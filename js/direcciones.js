(function(){
  async function status(){ try { const r=await fetch('api/auth.php?action=status',{cache:'no-store',credentials:'same-origin'}); return await r.json(); } catch { return {user:null}; } }
  function toggle(u){ const g=document.getElementById('account-guest'); const a=document.getElementById('account-user'); if(u){ g.classList.add('hidden'); a.classList.remove('hidden'); } else { g.classList.remove('hidden'); a.classList.add('hidden'); } }
  function renderAddresses(list){ const box=document.getElementById('addr-list'); if(!box) return; box.innerHTML = list.map(d=>`<div data-id="${d.id}" style="padding:8px;border:1px solid var(--border);border-radius:8px;margin:6px 0;display:flex;justify-content:space-between;align-items:center"><div><strong>${d.etiqueta||'Dirección'}</strong><div>${d.linea1}${d.linea2?(', '+d.linea2):''}</div><div>${d.ciudad||''} ${d.provincia?(', '+d.provincia):''} ${d.pais?(', '+d.pais):''} ${d.codigo_postal||''}</div></div><div style="display:flex; gap:6px"><a class="btn" href="direccion-nueva.html?id=${d.id}">Editar</a><button class="btn" data-del>Eliminar</button></div></div>`).join('') || '<em>Sin direcciones</em>'; }
  async function fetchList(){ const r=await fetch('api/profile.php?action=addr_list',{credentials:'same-origin'}); if(!r.ok) return []; return r.json(); }
  document.addEventListener('DOMContentLoaded', async ()=>{
    applySavedTheme(); injectThemeSwitcher(); initMobileNav();
    const st = await status(); toggle(st.user);
    if(!st.user) return;
    const list = await fetchList(); renderAddresses(list);
    document.getElementById('addr-list')?.addEventListener('click', async (e)=>{
      const b=e.target.closest('[data-del]'); if(!b) return; const id=b.closest('[data-id]')?.getAttribute('data-id');
      await fetch('api/profile.php?action=addr_del&id='+encodeURIComponent(id),{credentials:'same-origin'});
      const l = await fetchList(); renderAddresses(l);
    });
  });
})();

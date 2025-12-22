(function(){
  async function status(){ try { const r=await fetch('api/auth.php?action=status',{cache:'no-store',credentials:'same-origin'}); return await r.json(); } catch { return {user:null}; } }
  function toggle(u){ const g=document.getElementById('account-guest'); const a=document.getElementById('account-user'); if(u){ g.classList.add('hidden'); a.classList.remove('hidden'); } else { g.classList.remove('hidden'); a.classList.add('hidden'); } }
  async function loadCities(){ const r=await fetch('api/profile.php?action=cities',{credentials:'same-origin'}); if(!r.ok) return []; return r.json(); }
  async function loadProvinces(){ const r=await fetch('api/profile.php?action=provinces',{credentials:'same-origin'}); if(!r.ok) return []; return r.json(); }
  async function loadIfEditing(){ const params = new URLSearchParams(location.search); const id = params.get('id'); if(!id) return; const r = await fetch('api/profile.php?action=addr_list',{credentials:'same-origin'}); const list = await r.json(); const d = list.find(x=>String(x.id)===String(id)); if(!d) return; document.getElementById('af-etiqueta').value=d.etiqueta||''; document.getElementById('af-linea1').value=d.linea1||''; document.getElementById('af-linea2').value=d.linea2||''; document.getElementById('af-ciudad').value=d.ciudad_id||''; document.getElementById('af-provincia').value=d.provincia||''; document.getElementById('af-pais').value=d.pais||''; document.getElementById('af-cp').value=d.codigo_postal||''; }
  document.addEventListener('DOMContentLoaded', async ()=>{
    applySavedTheme(); injectThemeSwitcher(); initMobileNav();
    const st = await status(); toggle(st.user); if(!st.user) return;
    const cities = await loadCities(); const citySel=document.getElementById('af-ciudad'); citySel.innerHTML = '<option value="">--</option>' + cities.map(c=>`<option value="${c.id}">${c.nombre}${c.provincia?(', '+c.provincia):''}</option>`).join('');
    const provs = await loadProvinces(); const provSel=document.getElementById('af-provincia'); provSel.innerHTML = '<option value="">--</option>' + (Array.isArray(provs)?provs:[]).map(p=>`<option value="${p}">${p}</option>`).join('');
    // Sync provincia on city change
    citySel.addEventListener('change', ()=>{ const cid=citySel.value; const city=cities.find(c=>String(c.id)===String(cid)); if(city && city.provincia){ provSel.value = city.provincia; } });
    await loadIfEditing();
    document.getElementById('addr-form')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const payload={ etiqueta:document.getElementById('af-etiqueta').value||'', linea1:document.getElementById('af-linea1').value||'', linea2:document.getElementById('af-linea2').value||'', ciudad_id:document.getElementById('af-ciudad').value||null, provincia:document.getElementById('af-provincia').value||'', pais:document.getElementById('af-pais').value||'', codigo_postal:document.getElementById('af-cp').value||'' };
      const r = await fetch('api/profile.php?action=addr_add',{method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify(payload)});
      const out = await r.json(); if(out.error){ alert(out.error); return; }
      alert('Dirección guardada'); window.location.href='direcciones.html';
    });
  });
})();

(function(){
  async function authStatus(){ const r=await fetch('api/auth.php?action=status',{cache:'no-store',credentials:'same-origin'}); if(!r.ok) return {user:null}; return r.json(); }
  function toggle(user){
    const g=document.getElementById('account-guest');
    const u=document.getElementById('account-user');
    if(user){ g.classList.add('hidden'); u.classList.remove('hidden'); } else { g.classList.remove('hidden'); u.classList.add('hidden'); }
  }
  async function loadProfile(){
    const r = await fetch('api/profile.php?action=get',{cache:'no-store',credentials:'same-origin'}); if(!r.ok) return;
    const d = await r.json(); const u=d.user||{}; const c=d.cliente||{};
    document.getElementById('pf-nombre').value = u.nombre||c.nombre||'';
    document.getElementById('pf-apellido').value = c.apellido||'';
    document.getElementById('pf-usuario').value = u.usuario||'';
    document.getElementById('pf-email').value = u.email||'';
    document.getElementById('pf-doc').value = c.documento||'';
    document.getElementById('pf-genero').value = c.genero||'';
    document.getElementById('pf-fnac').value = c.fecha_nacimiento||'';
    // Ciudades
    const rc = await fetch('api/profile.php?action=cities',{credentials:'same-origin'}); if(rc.ok){ const list=await rc.json(); const sel=document.getElementById('pf-ciudad'); sel.innerHTML='<option value="">--</option>' + list.map(ci=>`<option value="${ci.id}">${ci.nombre}${ci.provincia?(', '+ci.provincia):''}</option>`).join(''); if(c.ciudad_id) sel.value=String(c.ciudad_id); }
  }
  document.addEventListener('DOMContentLoaded', async ()=>{
    applySavedTheme(); injectThemeSwitcher(); initMobileNav();
    const st = await authStatus(); toggle(st.user);
    if(st.user) await loadProfile();
    document.getElementById('profile-form')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const payload={ nombre:document.getElementById('pf-nombre').value.trim(), apellido:document.getElementById('pf-apellido').value.trim(), usuario:document.getElementById('pf-usuario').value.trim(), email:document.getElementById('pf-email').value.trim(), documento:document.getElementById('pf-doc').value.trim(), genero:document.getElementById('pf-genero').value||null, fecha_nacimiento:document.getElementById('pf-fnac').value||null, ciudad_id:document.getElementById('pf-ciudad').value||null };
      const r = await fetch('api/profile.php?action=update',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});
      const out = await r.json(); if(out.error){ alert(out.error); return; }
      alert('Datos guardados'); window.location.href='account.html';
    });
  });
})();

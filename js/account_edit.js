(function(){
  async function authStatus(){ const r=await fetch('api/auth.php?action=status',{cache:'no-store',credentials:'same-origin'}); if(!r.ok) return {user:null}; return r.json(); }
  function toggle(user){
    const g=document.getElementById('account-guest');
    const u=document.getElementById('account-user');
    if(user){ g.classList.add('hidden'); u.classList.remove('hidden'); } else { g.classList.remove('hidden'); u.classList.add('hidden'); }
  }
  async function loadProfile(){
    const r = await fetch('api/profile.php?action=get',{cache:'no-store',credentials:'same-origin'}); if(!r.ok) return;
    const d = await r.json(); const u=d.user||{};
    document.getElementById('pf-nombre').value = u.nombre||'';
    document.getElementById('pf-usuario').value = u.usuario||'';
    document.getElementById('pf-email').value = u.email||'';
  }
  document.addEventListener('DOMContentLoaded', async ()=>{
    applySavedTheme(); injectThemeSwitcher(); initMobileNav();
    const st = await authStatus(); toggle(st.user);
    if(st.user) await loadProfile();
    document.getElementById('profile-form')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const payload={ nombre:document.getElementById('pf-nombre').value.trim(), usuario:document.getElementById('pf-usuario').value.trim(), email:document.getElementById('pf-email').value.trim() };
      const r = await fetch('api/profile.php?action=update',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});
      const out = await r.json(); if(out.error){ alert(out.error); return; }
      alert('Datos guardados'); window.location.href='account.html';
    });
  });
})();

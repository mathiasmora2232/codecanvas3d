'use strict';

async function authStatus() {
  const res = await fetch('api/auth.php?action=status', { cache: 'no-store', credentials: 'same-origin' });
  if (!res.ok) return { user: null };
  return res.json();
}

async function authLogout() {
  const res = await fetch('api/auth.php', { method: 'POST', credentials: 'same-origin', body: new URLSearchParams({ action: 'logout' }) });
  return res.json();
}

function toggleAccountUI(user) {
  const guest = document.getElementById('account-guest');
  const logged = document.getElementById('account-user');
  if (!guest || !logged) return;
  if (user) {
    const nameEl = document.getElementById('acc-name');
    const userEl = document.getElementById('acc-user');
    const emailEl = document.getElementById('acc-email');
    if (nameEl) nameEl.textContent = user.nombre || '';
    if (userEl) userEl.textContent = user.usuario || '';
    if (emailEl) emailEl.textContent = user.email || '';
    guest.classList.add('hidden');
    logged.classList.remove('hidden');
  } else {
    guest.classList.remove('hidden');
    logged.classList.add('hidden');
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  applySavedTheme();
  injectThemeSwitcher();
  initMobileNav();

  const status = await authStatus();
  toggleAccountUI(status.user);
  if (status.user) { await loadProfile(); }

  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn?.addEventListener('click', async ()=>{
    await authLogout();
    const st = await authStatus();
    toggleAccountUI(st.user);
  });


  // Perfil: completar encabezados
  async function loadProfile(){
    const res = await fetch('api/profile.php?action=get', { cache:'no-store', credentials:'same-origin' });
    if (!res.ok) return;
    const data = await res.json();
    const u = data.user || {};
    const nameEl = document.getElementById('acc-name');
    const userEl = document.getElementById('acc-user');
    const emailEl = document.getElementById('acc-email');
    if (nameEl) nameEl.textContent = u.nombre || '';
    if (userEl) userEl.textContent = u.usuario || '';
    if (emailEl) emailEl.textContent = u.email || '';

    // Extra: Perfil Personal mostrado directamente
    const name2 = document.getElementById('acc-name2');
    const user2 = document.getElementById('acc-user2');
    const cityEl = document.getElementById('acc-city');
    const genderEl = document.getElementById('acc-gender');
    if (name2) name2.textContent = u.nombre || '';
    if (user2) user2.textContent = u.usuario || '';
    const cliente = data.cliente || {};
    // Ciudad: intentar tomar de dirección principal, si existe
    let ciudad = '';
    const dprs = (data.direcciones||[]).find(d=>d.principal==1);
    if (dprs && dprs.ciudad) ciudad = dprs.ciudad;
    else if (cliente && cliente.ciudad_id) ciudad = `ID ${cliente.ciudad_id}`;
    if (cityEl) cityEl.textContent = ciudad || '—';
    const genero = cliente?.genero || '';
    if (genderEl) genderEl.textContent = genero || '—';
  }
});

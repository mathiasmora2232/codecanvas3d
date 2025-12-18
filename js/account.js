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
  if (status.user) { await loadProfile(); await loadCities(); }

  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn?.addEventListener('click', async ()=>{
    await authLogout();
    const st = await authStatus();
    toggleAccountUI(st.user);
  });

  // Perfil
  async function loadProfile(){
    const res = await fetch('api/profile.php?action=get', { cache:'no-store', credentials:'same-origin' });
    if (!res.ok) return;
    const data = await res.json();
    const u = data.user || {};
    const pfNombre = document.getElementById('pf-nombre');
    const pfUsuario = document.getElementById('pf-usuario');
    const pfEmail = document.getElementById('pf-email');
    if (pfNombre) pfNombre.value = u.nombre || '';
    if (pfUsuario) pfUsuario.value = u.usuario || '';
    if (pfEmail) pfEmail.value = u.email || '';
    renderAddresses(data.direcciones || []);
    renderCards(data.tarjetas || []);
  }

  document.getElementById('profile-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const payload = {
      nombre: document.getElementById('pf-nombre').value.trim(),
      usuario: document.getElementById('pf-usuario').value.trim(),
      email: document.getElementById('pf-email').value.trim()
    };
    const res = await fetch('api/profile.php?action=update', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), credentials:'same-origin' });
    const out = await res.json();
    if (out.error) { alert(out.error); return; }
    alert('Datos guardados');
  });

  // Ciudades
  async function loadCities(){
    const res = await fetch('api/profile.php?action=cities', { credentials:'same-origin' });
    if (!res.ok) return;
    const list = await res.json();
    const sel = document.getElementById('af-ciudad');
    if (!sel) return;
    sel.innerHTML = '<option value="">--</option>' + list.map(c=>`<option value="${c.id}">${c.nombre}${c.provincia?(', '+c.provincia):''}</option>`).join('');
  }

  // Direcciones
  function renderAddresses(list){
    const box = document.getElementById('addr-list');
    if (!box) return;
    box.innerHTML = list.map(d=>`<div data-id="${d.id}" style="padding:8px;border:1px solid var(--border);border-radius:8px;margin:6px 0;display:flex;justify-content:space-between;align-items:center"><div><strong>${d.etiqueta||'Dirección'}</strong><div>${d.linea1}${d.linea2?(', '+d.linea2):''}</div><div>${d.ciudad||''} ${d.provincia?(', '+d.provincia):''} ${d.pais?(', '+d.pais):''} ${d.codigo_postal||''}</div></div><button class="btn" data-del="addr">Eliminar</button></div>`).join('') || '<em>Sin direcciones</em>';
  }
  document.getElementById('addr-list')?.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button[data-del="addr"]');
    if (!btn) return;
    const id = btn.closest('[data-id]')?.getAttribute('data-id');
    await fetch('api/profile.php?action=addr_del&id='+encodeURIComponent(id), { credentials:'same-origin' });
    const res = await fetch('api/profile.php?action=addr_list', { credentials:'same-origin' });
    const list = await res.json();
    renderAddresses(list);
  });
  document.getElementById('addr-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const payload = { etiqueta: af_etiqueta.value, linea1: af_linea1.value, linea2: af_linea2.value, ciudad_id: af_ciudad.value||null, provincia: af_provincia.value, pais: af_pais.value, codigo_postal: af_cp.value };
    await fetch('api/profile.php?action=addr_add', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify(payload) });
    (e.target).reset();
    const res = await fetch('api/profile.php?action=addr_list', { credentials:'same-origin' });
    const list = await res.json();
    renderAddresses(list);
  });

  // Tarjetas
  function renderCards(list){
    const box = document.getElementById('card-list');
    if (!box) return;
    box.innerHTML = list.map(c=>`<div data-id="${c.id}" style="padding:8px;border:1px solid var(--border);border-radius:8px;margin:6px 0;display:flex;justify-content:space-between;align-items:center"><div>${c.marca||'Tarjeta'} •••• ${c.numero_4||'????'}  exp ${c.exp_mes||'??'}/${c.exp_anio||'????'} - ${c.titular||''}</div><button class="btn" data-del="card">Eliminar</button></div>`).join('') || '<em>Sin tarjetas</em>';
  }
  document.getElementById('card-list')?.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button[data-del="card"]');
    if (!btn) return;
    const id = btn.closest('[data-id]')?.getAttribute('data-id');
    await fetch('api/profile.php?action=card_del&id='+encodeURIComponent(id), { credentials:'same-origin' });
    const res = await fetch('api/profile.php?action=card_list', { credentials:'same-origin' });
    const list = await res.json();
    renderCards(list);
  });
  document.getElementById('card-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const payload = { marca: cf_marca.value, titular: cf_titular.value, numero: cf_numero.value, exp_mes: cf_mm.value, exp_anio: cf_yy.value };
    await fetch('api/profile.php?action=card_add', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify(payload) });
    (e.target).reset();
    const res = await fetch('api/profile.php?action=card_list', { credentials:'same-origin' });
    const list = await res.json();
    renderCards(list);
  });
});

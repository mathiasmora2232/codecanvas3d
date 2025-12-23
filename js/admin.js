'use strict';
(function(){
  const $ = (s)=>document.querySelector(s);
  const $$ = (s)=>Array.from(document.querySelectorAll(s));

  async function status(){ try{ const r=await fetch('api/auth.php?action=status',{cache:'no-store',credentials:'same-origin'}); return await r.json(); } catch { return {user:null}; } }

  async function requireAdmin(){
    const st = await status();
    const note = $('#admin-note');
    if(!st.user){ note.textContent='Debes iniciar sesión.'; note.style.color='var(--danger)'; return false; }
    if(st.user.role!=='admin'){ note.textContent='Acceso solo para administradores.'; note.style.color='var(--danger)'; return false; }
    note.textContent = `Sesión: ${st.user.nombre} (${st.user.email}) — Administrador`;
    return true;
  }

  async function api(action, payload, opts={}){
    const method = opts.method || 'POST';
    const url = method==='GET' ? `api/admin.php?action=${encodeURIComponent(action)}${opts.query||''}` : 'api/admin.php';
    const res = await fetch(url, {
      method,
      headers: method==='POST' ? {'Content-Type':'application/json'} : undefined,
      credentials: 'same-origin',
      body: method==='POST' ? JSON.stringify({ action, ...(payload||{}) }) : undefined
    });
    const out = await res.json();
    if(!res.ok || out.error) throw new Error(out.detail||out.error||`HTTP ${res.status}`);
    return out;
  }

  function switchView(id){
    $$('#view-dash, #view-products, #view-orders, #view-users').forEach(el=>el.classList.add('hidden'));
    $(`#view-${id}`)?.classList.remove('hidden');
    $$('.admin-nav a').forEach(a=>a.classList.toggle('active', a.dataset.view===id));
  }

  async function loadStats(){ try{ const s=await api('stats', null, {method:'GET'}); $('#st-products').textContent=s.productos; $('#st-orders').textContent=s.pedidos; $('#st-users').textContent=s.usuarios; $('#st-sales').textContent = Number(s.ventas||0).toLocaleString('es-EC',{style:'currency',currency:'USD'}); } catch(e){}}

  // Productos
  function renderProducts(rows){ const tb=$('#tbl-products tbody'); tb.innerHTML = rows.map(r=>{ const activo=(r.activo||r.Activo)?1:0; const btnToggle = activo? `<button class="btn btn-small btn-danger" data-del="${r.id}">🛑 Desactivar</button>` : `<button class="btn btn-small" data-activate="${r.id}">✅ Activar</button>`; const estado = activo? '<span class="pill">Activo</span>' : '<span class="pill">Inactivo</span>'; return `<tr><td>${r.id}</td><td>${r.nombre||r.Nombre||''}</td><td>$${Number(r.precio||r.Precio||0).toFixed(2)}</td><td>${estado}</td><td>${r.stock||r.Stock||0}</td><td>${r.oferta_pct||r.Oferta_pct||0}</td><td><button class="btn btn-small" data-edit="${r.id}">✏️ Editar</button> ${btnToggle} <button class="btn btn-small" data-remove="${r.id}">🗑 Eliminar</button> <button class="btn btn-small" data-restock="${r.id}">➕ Re-stock</button></td></tr>`; }).join(''); }
  async function loadProducts(){ try{ const list=await api('products_list', null, {method:'GET'}); renderProducts(list); } catch(e){}}
  function openProductDialog(data){
    const dlg = $('#dlg-product'); const form=$('#frm-product'); dlg.returnValue='';
    form.dataset.id = data?.id||'';
    $('#dlg-title').textContent = data?.id? `Editar #${data.id}` : 'Nuevo producto';
    const val = (obj, keys)=>{ for(const k of keys){ if(obj && obj[k] !== undefined && obj[k] !== null) return obj[k]; } return ''; };
    $('#p-nombre').value = String(val(data,['nombre','Nombre'])||'');
    $('#p-precio').value = String(val(data,['precio','Precio'])||'');
    $('#p-activo').checked = !!(val(data,['activo','Activo']) ?? 1);
    $('#p-stock').value = Number(val(data,['stock','Stock'])||0);
    $('#p-oferta').value = Number(val(data,['oferta_pct','Oferta_pct'])||0);
    $('#p-odesde').value = (val(data,['oferta_desde','Oferta_desde']) ? String(val(data,['oferta_desde','Oferta_desde'])).replace(' ','T') : '');
    $('#p-ohasta').value = (val(data,['oferta_hasta','Oferta_hasta']) ? String(val(data,['oferta_hasta','Oferta_hasta'])).replace(' ','T') : '');
    $('#p-descripcion').value = String(val(data,['descripcion','Descripcion'])||'');
    const espec = (()=>{ try{ const raw=val(data,['especificaciones','Especificaciones'])||'[]'; const j=JSON.parse(raw); return Array.isArray(j)? j.join('\n') : (raw||''); } catch { return String(val(data,['especificaciones','Especificaciones'])||''); } })();
    $('#p-espec').value = espec;
    $('#p-img-main').value = String(val(data,['imagenInterna','ImagenInterna'])||'');
    const thumbs = (()=>{ try{ const raw=val(data,['imagenesPeque','ImagenesPeque'])||'[]'; const j=JSON.parse(raw); return Array.isArray(j)? j: []; } catch { return []; } })();
    const tbox = $('#thumbs'); tbox.innerHTML = thumbs.map(p=>`<img src="${encodeURI(p)}" alt="thumb">`).join(''); tbox.dataset.paths = JSON.stringify(thumbs);
    dlg.showModal();
  }
  async function saveProduct(){
    const id = $('#frm-product').dataset.id ? Number($('#frm-product').dataset.id) : undefined;
    const payload = {
      id,
      nombre: $('#p-nombre').value.trim(),
      precio: Number($('#p-precio').value||0),
      activo: $('#p-activo').checked ? 1 : 0,
      stock: Number($('#p-stock').value||0),
      oferta_pct: Number($('#p-oferta').value||0),
      oferta_desde: $('#p-odesde').value ? $('#p-odesde').value.replace('T',' ') : null,
      oferta_hasta: $('#p-ohasta').value ? $('#p-ohasta').value.replace('T',' ') : null,
      descripcion: $('#p-descripcion').value,
      especificaciones: $('#p-espec').value.split(/\n+/).map(s=>s.trim()).filter(Boolean),
      imagenInterna: $('#p-img-main').value,
      imagenesPeque: JSON.parse($('#thumbs').dataset.paths||'[]')
    };
    if (payload.precio > 1000) { alert('El precio no puede superar $1000.'); return; }
    if (payload.precio < 0) { alert('El precio no puede ser negativo.'); return; }
    await api('products_save', payload);
    $('#dlg-product').close();
    await loadProducts(); await loadStats();
  }
  async function delProduct(id){ await api('products_delete', {id}); await loadProducts(); }
  async function activateProduct(id){ await api('products_activate', {id}); await loadProducts(); }
  async function removeProduct(id){ if(!confirm('Eliminar definitivamente este producto?')) return; await api('products_remove', {id}); await loadProducts(); }

  // Uploads
  async function uploadFile(file){
    const fd = new FormData(); fd.append('file', file);
    const r = await fetch('api/admin.php?action=upload', { method:'POST', body: fd, credentials:'same-origin' });
    const out = await r.json(); if(!r.ok || out.error) throw new Error(out.error||'Upload falló');
    return out.path; // relativo como img/... 
  }
  function addThumbPath(p){ const box=$('#thumbs'); const arr=JSON.parse(box.dataset.paths||'[]'); arr.push(p); box.dataset.paths=JSON.stringify(arr); const img=document.createElement('img'); img.src=encodeURI(p); img.alt='thumb'; box.appendChild(img); }

  // Pedidos
  function renderOrders(rows){ const tb=$('#tbl-orders tbody'); tb.innerHTML = rows.map(r=>`<tr><td>${r.id}</td><td>${r.user_id??''}</td><td>${r.usuario_nombre||''}</td><td>${r.estado}</td><td>$${Number(r.total).toFixed(2)}</td><td>${r.creado}</td><td>${r.direccion_id??''}</td><td><button class="btn btn-small" data-odetail="${r.id}">Ver</button></td></tr>`).join(''); }
  async function loadOrders(){ try{ const list=await api('orders_list', null, {method:'GET'}); renderOrders(list); renderSalesChart(list); } catch(e){} }

    // Detalle de pedido (modal)
    async function openOrderDetail(id){ try{ const d=await api('orders_detail', null, {method:'GET', query:`&id=${id}`}); const dlg=document.getElementById('dlg-order'); if(!dlg) return; document.getElementById('od-id').textContent = `#${d.id}`; document.getElementById('od-meta').textContent = `${d.usuario_nombre||''} ${d.usuario_email?('('+d.usuario_email+')'):''} • Dirección ${d.direccion_id??''}`; const tb=document.getElementById('od-items'); tb.innerHTML = (d.items||[]).map(it=>{ const pct=Number(it.descuento_pct||0); const base=Number(it.precio_original||it.precio||0); const final=Number(it.precio||0); const price = pct>0 ? `<span style="text-decoration:line-through; color:var(--muted)">$${base.toFixed(2)}</span> <strong>$${final.toFixed(2)}</strong> <span class="pill" style="background:var(--accent); color:#fff">-${pct}%</span>` : `$${final.toFixed(2)}`; return `<tr><td>${it.producto_id}</td><td>${it.titulo}</td><td>${it.variante||''}</td><td>${price}</td><td>${it.cantidad}</td></tr>`; }).join(''); dlg.showModal(); } catch(err){ alert(err.message); } }

    // Dashboard: gráfico de ventas por día
    function renderSalesChart(rows){ const el=document.getElementById('chart-sales'); if(!el || !window.Chart) return; const byDay={}; rows.forEach(r=>{ const d=(r.creado||'').substring(0,10); const tot=Number(r.total||0); if(!d) return; byDay[d]=(byDay[d]||0)+tot; }); const days=Object.keys(byDay).sort(); const data=days.map(d=>byDay[d]); const ctx=el.getContext('2d'); if(el._chart){ el._chart.destroy(); } el._chart = new Chart(ctx,{ type:'line', data:{ labels:days, datasets:[{ label:'Ventas (USD)', data, borderColor:getComputedStyle(document.documentElement).getPropertyValue('--accent')||'#ff6b6b', tension:.25 }]}, options:{ plugins:{legend:{display:true}}, scales:{ y:{ ticks:{ callback:(v)=>'$'+Number(v).toFixed(0) } } } } }); }

    // Dashboard: stock bajo
    async function renderLowStock(){ try{ const list=await api('products_list',null,{method:'GET'}); const low=list.filter(r=>Number(r.stock||0)<=5); const ul=document.getElementById('low-stock-list'); if(!ul) return; ul.innerHTML = low.length? low.map(r=>`<li>#${r.id} ${r.nombre||''} — stock ${r.stock||0}</li>`).join('') : '<em>Todo con stock adecuado</em>'; } catch{} }

  // Usuarios
  function renderUsers(rows){ const tb=$('#tbl-users tbody'); tb.innerHTML = rows.map(r=>`<tr><td>${r.id}</td><td>${r.nombre}</td><td>${r.usuario||''}</td><td>${r.email}</td><td>${r.role}</td><td>${r.role==='admin'?'':'<button class="btn btn-small" data-mkadmin="'+r.id+'">⭐ Hacer admin</button>'}</td></tr>`).join(''); }
  async function loadUsers(){ try{ const list=await api('users_list', null, {method:'GET'}); renderUsers(list); } catch(e){} }

  document.addEventListener('DOMContentLoaded', async ()=>{
    applySavedTheme(); injectThemeSwitcher(); initMobileNav();
    if(!await requireAdmin()) return;

    // Navegación
    $$('.admin-nav a').forEach(a=>a.addEventListener('click', (e)=>{ e.preventDefault(); switchView(a.dataset.view); }));
    switchView('dash');

    await loadStats(); await loadProducts(); await loadOrders(); await loadUsers();

    // Productos eventos
    $('#btn-new')?.addEventListener('click', ()=>openProductDialog(null));
    $('#tbl-products').addEventListener('click', async (e)=>{
      const btn = e.target.closest('button'); if(!btn) return; 
      if(btn.hasAttribute('data-edit')){ const id=Number(btn.getAttribute('data-edit')); const data=await api('products_get', null, {method:'GET', query:`&id=${id}`}); openProductDialog(data); }
      if(btn.hasAttribute('data-del')){ const id=Number(btn.getAttribute('data-del')); await delProduct(id); }
      if(btn.hasAttribute('data-activate')){ const id=Number(btn.getAttribute('data-activate')); await activateProduct(id); }
      if(btn.hasAttribute('data-remove')){ const id=Number(btn.getAttribute('data-remove')); await removeProduct(id); }
      if(btn.hasAttribute('data-restock')){ const id=Number(btn.getAttribute('data-restock')); const add=Number(prompt('Cantidad a agregar a stock','5')||'0'); if(add>0){ try{ await api('products_restock',{id, add}); await loadProducts(); await loadStats(); await renderLowStock(); } catch(err){ alert(err.message); } } }
    });
    $('#frm-product')?.addEventListener('submit', async (e)=>{ e.preventDefault(); try{ await saveProduct(); } catch(err){ alert(err.message); } });
    $('#btn-cancel')?.addEventListener('click', ()=>{ $('#dlg-product')?.close(); });
    $('#up-main')?.addEventListener('change', async (e)=>{ const f=e.target.files?.[0]; if(!f) return; try{ const p=await uploadFile(f); $('#p-img-main').value=p; } catch(err){ alert(err.message); } });
    $('#up-thumbs')?.addEventListener('change', async (e)=>{ const files=Array.from(e.target.files||[]); for(const f of files){ try{ const p=await uploadFile(f); addThumbPath(p); } catch(err){ alert(err.message); } } });

    // Ver detalle de pedido
    $('#tbl-orders').addEventListener('click', async (e)=>{ const b=e.target.closest('button[data-odetail]'); if(!b) return; const id=Number(b.getAttribute('data-odetail')); await openOrderDetail(id); });

    // Usuarios eventos
    $('#tbl-users').addEventListener('click', async (e)=>{ const b=e.target.closest('button[data-mkadmin]'); if(!b) return; const id=Number(b.getAttribute('data-mkadmin')); await api('users_set_role', {id, role:'admin'}); await loadUsers(); });

    // Dashboard extras
    await renderLowStock();
  });
})();

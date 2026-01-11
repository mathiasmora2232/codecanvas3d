'use strict';
(function(){
  const $ = (s)=>document.querySelector(s);
  const $$ = (s)=>Array.from(document.querySelectorAll(s));

  async function status(){ try{ const r=await fetch('api/auth.php?action=status',{cache:'no-store',credentials:'same-origin'}); return await r.json(); } catch { return {user:null}; } }

  async function requireAdmin(){
    const st = await status();
    const note = $('#admin-note');
    if(!st.user){
      if (note) { note.textContent='Debes iniciar sesión.'; note.style.color='var(--danger)'; }
      const next = encodeURIComponent('admin.html');
      window.location.href = `login.html?next=${next}`;
      return false;
    }
    if(st.user.role!=='admin'){
      if (note) { note.textContent='Acceso solo para administradores.'; note.style.color='var(--danger)'; }
      window.location.href = 'account.html';
      return false;
    }
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

  async function loadStats(){ try{ const s=await api('stats', null, {method:'GET'}); $('#st-products').textContent=s.productos; $('#st-orders').textContent=s.pedidos; $('#st-users').textContent=s.usuarios; $('#st-sales').textContent = Number(s.ventas||0).toLocaleString('es-EC',{style:'currency',currency:'USD', minimumFractionDigits:2}); const itemsEl=document.getElementById('st-items'); if(itemsEl) itemsEl.textContent = s.items_vendidos||0; const subOrigEl=document.getElementById('st-suboriginal'); if(subOrigEl) subOrigEl.textContent = Number(s.subtotal_original||0).toLocaleString('es-EC',{style:'currency',currency:'USD', minimumFractionDigits:2}); const discEl=document.getElementById('st-discount'); if(discEl) discEl.textContent = Number(s.ahorro_total||0).toLocaleString('es-EC',{style:'currency',currency:'USD', minimumFractionDigits:2}); const aov=document.getElementById('st-aov'); if(aov) aov.textContent = Number(s.aov||0).toLocaleString('es-EC',{style:'currency',currency:'USD', minimumFractionDigits:2}); const s7=document.getElementById('st-sales7'); if(s7) s7.textContent = Number(s.ventas_7d||0).toLocaleString('es-EC',{style:'currency',currency:'USD', minimumFractionDigits:2}); const o7=document.getElementById('st-orders7'); if(o7) o7.textContent = s.pedidos_7d||0; const i7=document.getElementById('st-items7'); if(i7) i7.textContent = s.items_7d||0; } catch(e){} }

  // Productos
  let productsData = []; let productsPage = 1; const pageSize = 10;
  function renderProducts(rows){ const tb=$('#tbl-products tbody'); tb.innerHTML = rows.map(r=>{ const activo=(r.activo||r.Activo)?1:0; const btnToggle = activo? `<button class="btn btn-small btn-danger" data-del="${r.id}">Desactivar</button>` : `<button class="btn btn-small" data-activate="${r.id}">Activar</button>`; const estado = activo? '<span class="pill">Activo</span>' : '<span class="pill">Inactivo</span>'; const base=Number(r.precio||r.Precio||0); const pct=Number(r.oferta_pct||r.Oferta_pct||0); const final=pct>0 ? base*(1-pct/100) : base; const price = pct>0 ? `<span style="text-decoration:line-through;color:var(--muted)">$${base.toFixed(2)}</span> <strong>$${final.toFixed(2)}</strong> <span class="pill" style="background:var(--accent);color:#fff">-${pct}%</span>` : `$${final.toFixed(2)}`; const img = r.imagenInterna ? `<img src="${encodeURI(r.imagenInterna)}" alt="img" style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">` : '<span class="pill">N/A</span>'; return `<tr>
      <td data-label="ID">${r.id}</td>
      <td data-label="Imagen">${img}</td>
      <td data-label="Nombre">${r.nombre||r.Nombre||''}</td>
      <td data-label="Precio">${price}</td>
      <td data-label="Estado">${estado}</td>
      <td data-label="Stock">${r.stock||r.Stock||0}</td>
      <td data-label="Oferta%">${pct||0}</td>
      <td data-label="Acciones"><button class="btn btn-small" data-edit="${r.id}">Editar</button> ${btnToggle} <button class="btn btn-small" data-remove="${r.id}">Eliminar</button> <button class="btn btn-small" data-restock="${r.id}">Re-stock</button></td>
    </tr>`; }).join(''); }
  function renderProductsPagination(){ const total = productsData.length; const pages = Math.max(1, Math.ceil(total / pageSize)); const cont = document.getElementById('products-pagination'); if(!cont) return; const btn = (p, label, disabled=false)=>`<button class="btn btn-small" data-page="${p}" ${disabled?'disabled':''}>${label}</button>`; let html = btn(Math.max(1, productsPage-1),'←'); for(let i=1;i<=pages;i++){ html += `<button class="btn btn-small ${i===productsPage?'active':''}" data-page="${i}">${i}</button>`; } html += btn(Math.min(pages, productsPage+1),'→'); cont.innerHTML = html; }
  function renderProductsPage(page=1){ productsPage = page; const start = (page-1)*pageSize; const rows = productsData.slice(start, start+pageSize); renderProducts(rows); renderProductsPagination(); }
  async function loadProducts(){ try{ const list=await api('products_list', null, {method:'GET'}); productsData = Array.isArray(list)? list : []; renderProductsPage(1); } catch(e){} }
  function openProductDialog(data){
    const dlg = $('#dlg-product'); const form=$('#frm-product'); dlg.returnValue='';
    form.dataset.id = data?.id||'';
    $('#dlg-title').textContent = data?.id? `Editar #${data.id}` : 'Nuevo producto';
    const val = (obj, keys)=>{ for(const k of keys){ if(obj && obj[k] !== undefined && obj[k] !== null) return obj[k]; } return ''; };
    $('#p-nombre').value = String(val(data,['nombre','Nombre'])||'');
    (function(){ const pv = val(data,['precio','Precio']); $('#p-precio').value = (pv!=='' && pv!==undefined) ? Number(pv).toFixed(2) : ''; })();
    $('#p-activo').checked = !!(val(data,['activo','Activo']) ?? 1);
    $('#p-stock').value = Number(val(data,['stock','Stock'])||0);
    $('#p-oferta').value = Number(val(data,['oferta_pct','Oferta_pct'])||0);
    $('#p-odesde').value = (val(data,['oferta_desde','Oferta_desde']) ? String(val(data,['oferta_desde','Oferta_desde'])).replace(' ','T') : '');
    $('#p-ohasta').value = (val(data,['oferta_hasta','Oferta_hasta']) ? String(val(data,['oferta_hasta','Oferta_hasta'])).replace(' ','T') : '');
    $('#p-descripcion').value = String(val(data,['descripcion','Descripcion'])||'');
    const espec = (()=>{ try{ const raw=val(data,['especificaciones','Especificaciones'])||'[]'; const j=JSON.parse(raw); return Array.isArray(j)? j.join('\n') : (raw||''); } catch { return String(val(data,['especificaciones','Especificaciones'])||''); } })();
    $('#p-espec').value = espec;
    (function(){ const main = String(val(data,['imagenInterna','ImagenInterna'])||''); $('#p-img-main').value = main; const prev = document.getElementById('img-main-preview'); if(prev){ prev.src = main ? encodeURI(main) : ''; } })();
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
  function renderOrders(rows){ const tb=$('#tbl-orders tbody'); tb.innerHTML = rows.map(r=>`<tr>
    <td data-label="ID">${r.id}</td>
    <td data-label="UserID">${r.user_id??''}</td>
    <td data-label="Nombre">${r.usuario_nombre||''}</td>
    <td data-label="Estado">${r.estado}</td>
    <td data-label="Total">$${Number(r.total).toFixed(2)}</td>
    <td data-label="Creado">${r.creado}</td>
    <td data-label="Dirección">${r.direccion_id??''}</td>
    <td data-label="Acciones"><button class="btn btn-small" data-odetail="${r.id}">Ver</button></td>
  </tr>`).join(''); }
  async function loadOrders(){ try{ const list=await api('orders_list', null, {method:'GET'}); renderOrders(list); renderSalesChart(list); } catch(e){} }

    // Detalle de pedido (modal)
    async function openOrderDetail(id){ try{ const d=await api('orders_detail', null, {method:'GET', query:`&id=${id}`}); const dlg=document.getElementById('dlg-order'); if(!dlg) return; document.getElementById('od-id').textContent = `#${d.id}`; document.getElementById('od-meta').textContent = `${d.usuario_nombre||''} ${d.usuario_email?('('+d.usuario_email+')'):''} • Dirección ${d.direccion_id??''}`; const tb=document.getElementById('od-items'); let subOriginal=0, subFinal=0; tb.innerHTML = (d.items||[]).map(it=>{ const pct=Number(it.descuento_pct||0); const base=Number(it.precio_original||it.precio||0); const final=Number(it.precio||0); const price = pct>0 ? `<span style="text-decoration:line-through; color:var(--muted)">$${base.toFixed(2)}</span> <strong>$${final.toFixed(2)}</strong> <span class="pill" style="background:var(--accent); color:#fff">-${pct}%</span>` : `$${final.toFixed(2)}`; const img = it.imagen ? `<img src="${encodeURI(it.imagen)}" alt="img" style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">` : '<span class="pill">N/A</span>'; subOriginal += base * Number(it.cantidad||0); subFinal += final * Number(it.cantidad||0); return `<tr><td>${img}</td><td>${it.producto_id}</td><td>${it.titulo}</td><td>${it.variante||''}</td><td>${price}</td><td>${it.cantidad}</td></tr>`; }).join(''); const ahorro = Math.max(0, subOriginal - subFinal); const container = dlg.querySelector('div'); if(container){ const old=document.getElementById('od-summary'); if(old) old.remove(); const resumen = document.createElement('div'); resumen.id='od-summary'; resumen.style.marginTop='8px'; resumen.innerHTML = `<div><strong>Subtotal sin descuento:</strong> $${subOriginal.toFixed(2)}</div><div><strong>Total final:</strong> $${subFinal.toFixed(2)}</div><div><strong>Ahorro:</strong> $${ahorro.toFixed(2)}</div>`; container.appendChild(resumen); } dlg.showModal(); } catch(err){ alert(err.message); } }

    // Dashboard: gráfico de ventas por día
    function renderSalesChart(rows){ const el=document.getElementById('chart-sales'); if(!el || !window.Chart) return; const byDay={}; rows.forEach(r=>{ const d=(r.creado||'').substring(0,10); const tot=Number(r.total||0); if(!d) return; byDay[d]=(byDay[d]||0)+tot; }); const days=Object.keys(byDay).sort(); const data=days.map(d=>byDay[d]); const ctx=el.getContext('2d'); if(el._chart){ el._chart.destroy(); } el._chart = new Chart(ctx,{ type:'line', data:{ labels:days, datasets:[{ label:'Ventas (USD)', data, borderColor:getComputedStyle(document.documentElement).getPropertyValue('--accent')||'#ff6b6b', tension:.25 }]}, options:{ plugins:{legend:{display:true}}, scales:{ y:{ ticks:{ callback:(v)=>'$'+Number(v).toFixed(0) } } } } }); }

    // Dashboard: stock bajo
    async function renderLowStock(){ try{ const list=await api('products_list',null,{method:'GET'}); const low=list.filter(r=>Number(r.stock||0)<=5); const ul=document.getElementById('low-stock-list'); if(!ul) return; ul.innerHTML = low.length? low.map(r=>`<li>#${r.id} ${r.nombre||''} — stock ${r.stock||0}</li>`).join('') : '<em>Todo con stock adecuado</em>'; } catch{} }

  // Usuarios
  function renderUsers(rows){ const tb=$('#tbl-users tbody'); tb.innerHTML = rows.map(r=>`<tr>
    <td data-label="ID">${r.id}</td>
    <td data-label="Nombre">${r.nombre}</td>
    <td data-label="Usuario">${r.usuario||''}</td>
    <td data-label="Email">${r.email}</td>
    <td data-label="Rol">${r.role}</td>
    <td data-label="Acciones">${r.role==='admin'?'':'<button class="btn btn-small" data-mkadmin="'+r.id+'">Hacer admin</button>'}</td>
  </tr>`).join(''); }
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
      if(btn.hasAttribute('data-del')){ const id=Number(btn.getAttribute('data-del')); try { await delProduct(id); 
          const tr = btn.closest('tr'); if(tr){ tr.querySelector('td:nth-child(4)').innerHTML = '<span class="pill">Inactivo</span>'; btn.textContent='✅ Activar'; btn.classList.remove('btn-danger'); btn.removeAttribute('data-del'); btn.setAttribute('data-activate', String(id)); }
        } catch(err){ alert(err.message); } }
      if(btn.hasAttribute('data-activate')){ const id=Number(btn.getAttribute('data-activate')); try { await activateProduct(id);
          const tr = btn.closest('tr'); if(tr){ tr.querySelector('td:nth-child(4)').innerHTML = '<span class="pill">Activo</span>'; btn.textContent='🛑 Desactivar'; btn.classList.add('btn-danger'); btn.removeAttribute('data-activate'); btn.setAttribute('data-del', String(id)); }
        } catch(err){ alert(err.message); } }
      if(btn.hasAttribute('data-remove')){ const id=Number(btn.getAttribute('data-remove')); await removeProduct(id); }
      if(btn.hasAttribute('data-restock')){ const id=Number(btn.getAttribute('data-restock')); const add=Number(prompt('Cantidad a agregar a stock','5')||'0'); if(add>0){ try{ await api('products_restock',{id, add}); await loadProducts(); await loadStats(); await renderLowStock(); } catch(err){ alert(err.message); } } }
    });
    $('#frm-product')?.addEventListener('submit', async (e)=>{ e.preventDefault(); try{ await saveProduct(); } catch(err){ alert(err.message); } });
    $('#btn-cancel')?.addEventListener('click', ()=>{ $('#dlg-product')?.close(); });
    $('#up-main')?.addEventListener('change', async (e)=>{ const f=e.target.files?.[0]; if(!f) return; try{ const p=await uploadFile(f); $('#p-img-main').value=p; const prev=document.getElementById('img-main-preview'); if(prev){ prev.src = p ? encodeURI(p) : ''; } } catch(err){ alert(err.message); } });
    $('#up-thumbs')?.addEventListener('change', async (e)=>{ const files=Array.from(e.target.files||[]); for(const f of files){ try{ const p=await uploadFile(f); addThumbPath(p); } catch(err){ alert(err.message); } } });

    // Paginación productos
    document.getElementById('products-pagination')?.addEventListener('click', (e)=>{ const b=e.target.closest('button[data-page]'); if(!b) return; const p=Number(b.getAttribute('data-page'))||1; renderProductsPage(p); });

    // Ver detalle de pedido
    $('#tbl-orders').addEventListener('click', async (e)=>{ const b=e.target.closest('button[data-odetail]'); if(!b) return; const id=Number(b.getAttribute('data-odetail')); await openOrderDetail(id); });

    // Usuarios eventos
    $('#tbl-users').addEventListener('click', async (e)=>{ const b=e.target.closest('button[data-mkadmin]'); if(!b) return; const id=Number(b.getAttribute('data-mkadmin')); await api('users_set_role', {id, role:'admin'}); await loadUsers(); });

    // Dashboard extras
    await renderLowStock();
  });
})();

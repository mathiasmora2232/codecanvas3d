'use strict';

function getIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function setThumbs(thumbnails, mainImgEl) {
  const thumbsWrap = document.getElementById('detail-thumbs');
  if (!thumbsWrap) return;
  thumbsWrap.innerHTML = '';
  const imgs = Array.isArray(thumbnails) ? thumbnails : [];
  imgs.forEach((src) => {
    const btn = document.createElement('button');
    btn.className = 'thumb';
    btn.type = 'button';
    btn.innerHTML = `<img alt="Miniatura" src="${src}">`;
    btn.addEventListener('click', () => {
      if (mainImgEl) mainImgEl.src = src;
    });
    thumbsWrap.appendChild(btn);
  });
}

async function renderProduct() {
  const id = getIdFromQuery();
  const emptyEl = document.getElementById('detail-empty');
  const titleEl = document.getElementById('detail-title');
  const priceEl = document.getElementById('detail-price');
  const imgEl = document.getElementById('detail-image');
  const descEl = document.getElementById('detail-descripcion');
  const specsEl = document.getElementById('detail-especificaciones');

  if (!id) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }

  const list = await getProducts();
  const p = list.find(x => String(x.id) === String(id));
  if (!p) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }

  document.title = `Página 3D | ${p.title}`;
  titleEl.textContent = p.title || '';
  priceEl.textContent = money(p.precio);
  imgEl.src = p.imagenInterna || (p.imagenesPeque && p.imagenesPeque[0]) || 'img/large-placeholder.svg';
  imgEl.alt = p.title || 'Producto';
  descEl.textContent = p.descripcion || '';

  if (Array.isArray(p.especificaciones)) {
    specsEl.innerHTML = p.especificaciones.map(li => `<li>${li}</li>`).join('');
  } else {
    specsEl.innerHTML = '';
  }

  const thumbs = Array.isArray(p.imagenesPeque) ? p.imagenesPeque.slice() : [];
  if (p.imagenInterna) thumbs.unshift(p.imagenInterna);
  setThumbs(thumbs, imgEl);
}

window.addEventListener('DOMContentLoaded', renderProduct);

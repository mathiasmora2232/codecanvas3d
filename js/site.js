'use strict';

const API_URL = 'api/products.php';
const FALLBACK_JSON_URL = 'data/products.json';
let PRODUCTS_CACHE = [];

async function getProducts() {
  if (PRODUCTS_CACHE.length) return PRODUCTS_CACHE;

  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // 1) Intentar API PHP (MySQL)
  try {
    const data = await fetchJson(API_URL);
    if (Array.isArray(data) && data.length) {
      PRODUCTS_CACHE = data;
      return PRODUCTS_CACHE;
    }
    throw new Error('API sin datos');
  } catch (apiErr) {
    console.warn('Fallo API, usando JSON local:', apiErr?.message || apiErr);
  }

  // 2) Respaldo: JSON local
  try {
    const data = await fetchJson(FALLBACK_JSON_URL);
    PRODUCTS_CACHE = Array.isArray(data) ? data : [];
    return PRODUCTS_CACHE;
  } catch (jsonErr) {
    console.error('También falló el JSON de respaldo:', jsonErr?.message || jsonErr);
    return [];
  }
}

const money = (n) => {
  try {
    return (n ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  } catch {
    return `$${n}`;
  }
};

function productCard(p) {
  const thumb = (p.imagenesPeque && p.imagenesPeque[0]) || 'img/thumb-placeholder.svg';
  return `
    <article class="product-card" data-id="${p.id}">
      <img class="product-media" src="${thumb}" alt="${p.title}" loading="lazy"/>
      <div class="product-body">
        <h3 class="product-title">${p.title}</h3>
        <div class="price">${money(p.precio)}</div>
        <div class="card-actions">
          <button class="btn" data-action="view" data-id="${p.id}">Ver detalles</button>
        </div>
      </div>
    </article>`;
}

function renderList(list, container) {
  if (!container) return;
  container.innerHTML = list.map(productCard).join('');
}

function wireCardClicks(container) {
  if (!container) return;
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="view"][data-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    // Navegar a la página de detalle
    window.location.href = `producto.html?id=${encodeURIComponent(id)}`;
  });
}

// Modal
let modalEl, modalTitle, modalImg, modalDesc, modalSpecs, modalPrice;

function initModal() {
  modalEl = document.getElementById('product-modal');
  if (!modalEl) return;
  modalTitle = document.getElementById('modal-title');
  modalImg = document.getElementById('modal-image');
  modalDesc = document.getElementById('modal-descripcion');
  modalSpecs = document.getElementById('modal-especificaciones');
  modalPrice = document.getElementById('modal-precio');

  modalEl.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close') || e.target.classList.contains('modal-backdrop')) closeModal();
  });
  const closeBtn = modalEl.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

function openProductModal(p) {
  if (!modalEl) return;
  modalTitle.textContent = p.title || '';
  modalImg.src = p.imagenInterna || (p.imagenesPeque && p.imagenesPeque[0]) || 'img/large-placeholder.svg';
  modalImg.alt = p.title || 'Producto';
  modalDesc.textContent = p.descripcion || '';
  if (Array.isArray(p.especificaciones)) {
    modalSpecs.innerHTML = p.especificaciones.map(li => `<li>${li}</li>`).join('');
  } else {
    modalSpecs.innerHTML = '';
  }
  modalPrice.textContent = money(p.precio);
  modalEl.classList.remove('hidden');
  modalEl.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  if (!modalEl) return;
  modalEl.classList.add('hidden');
  modalEl.setAttribute('aria-hidden', 'true');
}

// Bootstrap por página
window.addEventListener('DOMContentLoaded', async () => {
  applySavedTheme();
  injectThemeSwitcher();
  initModal();
  initMobileNav();
  const featuredGrid = document.getElementById('featured-grid');
  const productsGrid = document.getElementById('products-grid');
  const products = await getProducts();

  if (featuredGrid) {
    const destacados = products.filter(p => !!p.destacado).slice(0, 8);
    renderList(destacados, featuredGrid);
    wireCardClicks(featuredGrid);
  }
  if (productsGrid) {
    renderList(products, productsGrid);
    wireCardClicks(productsGrid);
  }
});

// Menú móvil
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('main-nav');
  if (!toggle || !nav) return;

  function close() {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  function open() {
    nav.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
  }
  function isOpen() { return nav.classList.contains('open'); }

  toggle.addEventListener('click', () => {
    isOpen() ? close() : open();
  });

  document.addEventListener('click', (e) => {
    if (!isOpen()) return;
    const isInside = e.target.closest('#main-nav') || e.target.closest('.nav-toggle');
    if (!isInside) close();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900 && isOpen()) close();
  });
}

// THEME SWITCHER
const THEME_KEY = 'site_theme';
const THEMES = [
  { id: 'light-coral', name: 'Claro Coral', sw: ['#ff6b6b', '#ff9800'] },
  { id: 'light-mint', name: 'Claro Menta', sw: ['#2dd4bf', '#0ea5e9'] },
  { id: 'light-violet', name: 'Claro Violeta', sw: ['#8b5cf6', '#f97316'] },
  { id: 'light-blue',  name: 'Claro Azul',   sw: ['#3b82f6', '#06b6d4'] },
  { id: 'light-rose',  name: 'Claro Rosa',   sw: ['#f43f5e', '#f59e0b'] },
  { id: 'light-olive', name: 'Claro Oliva',  sw: ['#84cc16', '#f59e0b'] },
  { id: 'dark-coral',  name: 'Oscuro Coral', sw: ['#ff6b6b', '#ffb703'] },
  { id: 'dark-emerald',name: 'Oscuro Esmeralda', sw: ['#34d399', '#22d3ee'] },
  { id: 'dark-violet', name: 'Oscuro Violeta', sw: ['#a78bfa', '#f59e0b'] },
  { id: 'dark-slate',  name: 'Oscuro Pizarra', sw: ['#60a5fa', '#22d3ee'] },
];

function applyTheme(themeId) {
  if (!themeId) return;
  document.documentElement.setAttribute('data-theme', themeId);
  try { localStorage.setItem(THEME_KEY, themeId); } catch {}
}

function applySavedTheme() {
  let t = null;
  try { t = localStorage.getItem(THEME_KEY); } catch {}
  if (!t) {
    // Si el usuario prefiere oscuro y tenemos tema oscuro, se puede elegir por defecto
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    t = prefersDark ? 'dark-coral' : 'light-coral';
  }
  applyTheme(t);
}

function injectThemeSwitcher() {
  const header = document.querySelector('.site-header .header-inner');
  const nav = header?.querySelector('.main-nav');
  if (!header || !nav) return;

  const wrap = document.createElement('div');
  wrap.style.position = 'relative';

  const btn = document.createElement('button');
  btn.className = 'theme-toggle icon';
  btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('title', 'Cambiar tema');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a5 5 0 0 1 5 5 3 3 0 0 0 3 3 5 5 0 1 1-5 5 3 3 0 0 0-3-3 5 5 0 0 1 0-10Z"/><circle cx="6.5" cy="12.5" r="1.5"/><circle cx="9.5" cy="9.5" r="1.5"/><circle cx="6.5" cy="6.5" r="1.5"/></svg>`;

  const menu = document.createElement('div');
  menu.className = 'theme-menu';
  menu.setAttribute('role', 'menu');

  const panel = document.createElement('div');
  panel.className = 'theme-panel';

  const current = (localStorage.getItem(THEME_KEY) || 'light-coral');

  const groups = [
    { label: 'Claros', filter: (t)=>t.id.startsWith('light-') },
    { label: 'Oscuros', filter: (t)=>t.id.startsWith('dark-') },
  ];

  groups.forEach(g => {
    const title = document.createElement('h4');
    title.textContent = g.label;
    const grid = document.createElement('div');
    grid.className = 'swatch-grid';
    THEMES.filter(g.filter).forEach(t => {
      const b = document.createElement('button');
      b.className = 'swatch-btn';
      b.type = 'button';
      b.setAttribute('data-theme', t.id);
      b.setAttribute('title', t.name);
      if (t.id === current) b.classList.add('selected');
      b.innerHTML = `<span class="sw1" style="background:${t.sw[0]}"></span><span class="sw2" style="background:${t.sw[1]}"></span>`;
      b.addEventListener('click', () => {
        applyTheme(t.id);
        // actualizar selección
        grid.parentElement?.querySelectorAll('.swatch-btn.selected').forEach(x=>x.classList.remove('selected'));
        menu.querySelectorAll('.swatch-btn.selected').forEach(x=>x.classList.remove('selected'));
        b.classList.add('selected');
        close();
      });
      grid.appendChild(b);
    });
    panel.appendChild(title);
    panel.appendChild(grid);
  });

  menu.appendChild(panel);

  function open() { menu.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
  function close() { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }

  btn.addEventListener('click', () => { menu.classList.contains('open') ? close() : open(); });
  document.addEventListener('click', (e) => {
    if (!menu.classList.contains('open')) return;
    if (e.target.closest('.theme-menu') || e.target.closest('.theme-toggle')) return;
    close();
  });

  wrap.appendChild(btn);
  wrap.appendChild(menu);
  // Insertar al inicio del nav, cerca de "Inicio"
  nav.prepend(wrap);
}

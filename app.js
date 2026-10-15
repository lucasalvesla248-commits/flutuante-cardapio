const INSTAGRAM_URL = 'https://www.instagram.com/flutuanterestaurante/';
const productGrid = document.querySelector('#product-grid');
const categoryFilters = document.querySelector('#category-filters');
const searchInput = document.querySelector('#search-input');
const resultCount = document.querySelector('#result-count');
const emptyState = document.querySelector('#empty-state');
const productDialog = document.querySelector('#product-dialog');
let products = [];
let activeCategory = 'Todos';
const SIGNALS = {
  ovolacto: { label: 'Ovolactovegetariano', color: 'ovolacto' },
  'sem-lactose': { label: 'Sem lactose', color: 'sem-lactose' },
  'contem-lactose': { label: 'Contém lactose', color: 'contem-lactose' },
  'frutos-do-mar': { label: 'Contém frutos do mar', color: 'frutos-do-mar' }
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

function moneyLabel(value) {
  if (typeof value === 'number') return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return String(value ?? '');
}

function validSignals(signals) {
  return (Array.isArray(signals) ? signals : []).filter((signal) => SIGNALS[signal]);
}

function renderSignalPills(signals) {
  return validSignals(signals).map((signal) => `
    <span class="signal-pill signal-${SIGNALS[signal].color}">
      <span class="signal-dot" aria-hidden="true"></span>${escapeHtml(SIGNALS[signal].label)}
    </span>
  `).join('');
}

function renderCategories() {
  const categories = ['Todos', ...new Set(products.map((product) => product.category))];
  categoryFilters.innerHTML = categories.map((category) => `
    <button class="category-chip" type="button" data-category="${escapeHtml(category)}" aria-pressed="${category === activeCategory}">
      ${escapeHtml(category)}
    </button>
  `).join('');
}

function getFilteredProducts() {
  const query = normalize(searchInput.value.trim());
  return products.filter((product) => {
    const categoryMatches = activeCategory === 'Todos' || product.category === activeCategory;
    const signalTerms = validSignals(product.signals).map((signal) => SIGNALS[signal].label).join(' ');
    const searchMatches = !query || normalize(`${product.name} ${product.category} ${product.description || ''} ${signalTerms}`).includes(query);
    return categoryMatches && searchMatches;
  });
}

function productCard(product) {
  const description = product.description || '';
  const signals = validSignals(product.signals);
  const signalLabels = signals.map((signal) => SIGNALS[signal].label);
  return `
    <article class="product-card">
      <button class="product-main" type="button" data-open-product="${escapeHtml(product.id)}" aria-label="Ver detalhes de ${escapeHtml(product.name)}${signalLabels.length ? `. Sinalizações: ${escapeHtml(signalLabels.join(', '))}` : ''}">
        <span class="product-art" aria-hidden="true">
          <span class="art-mark">F</span>
          <span class="art-brand">Flutuante Restaurante</span>
          <span class="art-years">1963 · 2019</span>
        </span>
        <span class="product-info">
          <span class="product-category">${escapeHtml(product.category)}</span>
          <span class="product-name">${escapeHtml(product.name)}</span>
          ${signals.length ? `<span class="product-signals" aria-label="Sinalizações: ${escapeHtml(signalLabels.join(', '))}">${renderSignalPills(signals)}</span>` : ''}
          ${description ? `<span class="product-description">${escapeHtml(description)}</span>` : ''}
          <span class="product-bottom">
            <span class="product-price">${escapeHtml(moneyLabel(product.price))}</span>
            <span class="details-label">Ver detalhes <span aria-hidden="true">＋</span></span>
          </span>
        </span>
      </button>
    </article>
  `;
}

function renderProducts() {
  const filtered = getFilteredProducts();
  resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'item' : 'itens'}`;
  emptyState.hidden = filtered.length !== 0;
  productGrid.hidden = filtered.length === 0;
  productGrid.innerHTML = filtered.map(productCard).join('');
}

function openProduct(productId) {
  const product = products.find((item) => String(item.id) === String(productId));
  if (!product) return;
  document.querySelector('#dialog-category').textContent = product.category;
  document.querySelector('#dialog-title').textContent = product.name;
  document.querySelector('#dialog-description').textContent = product.description || 'O PDF enviado não traz uma descrição para este item.';
  const dialogSignals = document.querySelector('#dialog-signals');
  const signals = validSignals(product.signals);
  dialogSignals.hidden = signals.length === 0;
  dialogSignals.innerHTML = signals.length
    ? `<p class="signal-heading">Sinalizações do PDF</p><div class="dialog-signal-list">${renderSignalPills(signals)}</div>`
    : '';
  document.querySelector('#dialog-price').textContent = moneyLabel(product.price);
  document.querySelector('#dialog-contact').href = INSTAGRAM_URL;
  productDialog.showModal();
}

categoryFilters.addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  activeCategory = button.dataset.category;
  renderCategories();
  renderProducts();
  requestAnimationFrame(() => { productGrid.scrollLeft = 0; });
});

searchInput.addEventListener('input', renderProducts);
productGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-open-product]');
  if (button) openProduct(button.dataset.openProduct);
});
document.querySelector('.dialog-close').addEventListener('click', () => productDialog.close());
productDialog.addEventListener('click', (event) => {
  if (event.target === productDialog) productDialog.close();
});
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
  }
});

fetch('data/products.json')
  .then((response) => {
    if (!response.ok) throw new Error(`Falha ao carregar o cardápio (${response.status}).`);
    return response.json();
  })
  .then((data) => {
    products = data;
    renderCategories();
    renderProducts();
  })
  .catch((error) => {
    resultCount.textContent = 'Não foi possível carregar o cardápio.';
    emptyState.hidden = false;
    emptyState.querySelector('h2').textContent = 'Cardápio indisponível';
    emptyState.querySelector('p').textContent = `${error.message} Tente novamente mais tarde.`;
  });

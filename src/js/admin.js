const AUTH_KEY = 'arteafeto_admin_logged';
const ORDER_KEY = 'arteafeto_admin_orders';

const ADMIN_USER = 'luana';
const ADMIN_PASS = 'qrobeijinhohj';

const loginCard = document.getElementById('loginCard');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const logoutBtn = document.getElementById('logoutBtn');
const openOrderModalBtn = document.getElementById('openOrderModalBtn');
const orderModal = document.getElementById('orderModal');
const orderModalBackdrop = document.getElementById('orderModalBackdrop');
const closeOrderModalBtn = document.getElementById('closeOrderModalBtn');

const orderForm = document.getElementById('orderForm');
const ordersTableBody = document.getElementById('ordersTableBody');
const emptyTableMessage = document.getElementById('emptyTableMessage');
const produtoSelect = document.getElementById('produtoSelect');
const sizeField = document.getElementById('sizeField');
const sizeSelect = document.getElementById('sizeSelect');
const flavorField = document.getElementById('flavorField');
const flavorSelect = document.getElementById('flavorSelect');
const quantityInput = orderForm?.querySelector('[name="quantidade"]');
const valueInput = orderForm?.querySelector('[name="valor"]');

const kpiPedidos = document.getElementById('kpiPedidos');
const kpiValor = document.getElementById('kpiValor');
const kpiLavras = document.getElementById('kpiLavras');
const kpiCampoBelo = document.getElementById('kpiCampoBelo');

const PRODUCTS_WITH_SIZE = ['ovo de colher', 'ovos trufados'];

const FLAVORS_BY_PRODUCT = {
  'ovo de colher': [
    'Ferrero rocher',
    'Kinder bueno',
    'Ninho e nutela',
    'Ninho com geleia de morango',
    'Maracuja com chocolate',
    'Dois amores',
    'Brigadeiro',
    "Cookies n' cream",
    'Pistache',
    'Matilda',
    'Bolo de cenoura'
  ],
  'ovos trufados': [
    'Ferreiro rocher',
    'Cocada',
    'Brigadeiro',
    'Maracujá',
    'Maracujá com chocolate',
    'Pistache de Dubai',
    "Cookies n' cream"
  ],
  'ovos tradicionais': [
    'Chocolate ao leite',
    'Chocolate branco',
    'Tipo kinder',
    'Ao leite crocante'
  ]
};

const PRICE_BY_PRODUCT = {
  'ovo de colher': { P: 69.9, G: 122.9 },
  'kit mini confeiteiro': 60,
  'caça aos ovos': 35,
  'kit degustação': 50,
  'ovos trufados': { P: 89.9, G: 135.9 },
  'ovos tradicionais': 60
};

function formatCurrency(value) {
  return 'R$ ' + value.toFixed(2).replace('.', ',');
}

function formatDate(dateValue) {
  if (!dateValue) return '-';
  const [year, month, day] = dateValue.split('-');
  if (!year || !month || !day) return dateValue;
  return `${day}/${month}/${year}`;
}

function normalize(value) {
  return (value || '').trim().toLowerCase();
}

function getUnitPrice(product, size) {
  const normalizedProduct = normalize(product);
  const normalizedSize = String(size || '').trim().toUpperCase();
  const priceRule = PRICE_BY_PRODUCT[normalizedProduct];
  if (typeof priceRule === 'number') return priceRule;
  if (!priceRule || !normalizedSize) return null;
  return priceRule[normalizedSize] ?? null;
}

function updateAutoValue() {
  if (!valueInput) return;
  const unitPrice = getUnitPrice(produtoSelect?.value, sizeSelect?.value);
  const quantity = Math.max(Number(quantityInput?.value || 0), 0);
  if (unitPrice === null || quantity <= 0) {
    valueInput.value = '';
    return;
  }
  valueInput.value = (unitPrice * quantity).toFixed(2);
}

function setSelectOptions(selectElement, values) {
  if (!selectElement) return;

  selectElement.innerHTML = '<option value="">Selecione...</option>';
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  });
}

function updateOrderConditionalFields() {
  const selectedProduct = normalize(produtoSelect?.value || '');
  const showSize = PRODUCTS_WITH_SIZE.includes(selectedProduct);
  const availableFlavors = FLAVORS_BY_PRODUCT[selectedProduct] || [];
  const showFlavor = availableFlavors.length > 0;

  if (sizeField && sizeSelect) {
    sizeField.classList.toggle('hidden', !showSize);
    sizeSelect.required = showSize;
    if (!showSize) sizeSelect.value = '';
  }

  if (flavorField && flavorSelect) {
    flavorField.classList.toggle('hidden', !showFlavor);
    flavorSelect.required = showFlavor;
    setSelectOptions(flavorSelect, availableFlavors);
  }

  if (valueInput) {
    valueInput.readOnly = true;
    valueInput.placeholder = 'Calculado automaticamente';
  }

  updateAutoValue();
}

function getOrders() {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
}

function renderKpis(orders) {
  const activeOrders = orders.filter((order) => !order.canceled);
  const totalPedidos = activeOrders.length;
  const totalValor = activeOrders.reduce((sum, order) => sum + Number(order.valor || 0), 0);
  const lavras = activeOrders.filter((order) => normalize(order.cidade) === 'lavras').length;
  const campoBelo = activeOrders.filter((order) => normalize(order.cidade) === 'campo belo').length;

  kpiPedidos.textContent = String(totalPedidos);
  kpiValor.textContent = formatCurrency(totalValor);
  kpiLavras.textContent = String(lavras);
  kpiCampoBelo.textContent = String(campoBelo);
}

function renderTable(orders) {
  ordersTableBody.innerHTML = '';

  if (orders.length === 0) {
    emptyTableMessage.classList.remove('hidden');
    return;
  }

  emptyTableMessage.classList.add('hidden');

  orders.forEach((order) => {
    const row = document.createElement('tr');
    const isCanceled = Boolean(order.canceled);
    if (isCanceled) row.classList.add('is-canceled');
    row.innerHTML = `
      <td>${order.cliente}</td>
      <td>${formatDate(order.dataEntrega)}</td>
      <td>${order.produto}</td>
      <td>${order.tamanho}</td>
      <td>${order.sabor}</td>
      <td>${order.quantidade}</td>
      <td>${order.cidade}</td>
      <td>${order.formaPagamento}</td>
      <td>${formatCurrency(Number(order.valor || 0))}</td>
      <td>${isCanceled ? 'Cancelado' : 'Ativo'}</td>
      <td>
        <button
          class="btn-cancel"
          type="button"
          data-action="cancel-order"
          data-id="${order.id}"
          ${isCanceled ? 'disabled' : ''}
        >
          ${isCanceled ? 'Cancelado' : 'Cancelar'}
        </button>
      </td>
    `;
    ordersTableBody.appendChild(row);
  });
}

function cancelOrderById(orderId) {
  const orders = getOrders();
  const target = orders.find((order) => String(order.id) === String(orderId));
  if (!target || target.canceled) return;

  target.canceled = true;
  saveOrders(orders);
  refreshDashboard();
}

function refreshDashboard() {
  const orders = getOrders();
  renderKpis(orders);
  renderTable(orders);
}

function showDashboard() {
  loginCard.classList.add('hidden');
  dashboard.classList.remove('hidden');
  closeOrderModal();
  refreshDashboard();
}

function showLogin() {
  dashboard.classList.add('hidden');
  loginCard.classList.remove('hidden');
  closeOrderModal();
}

function openOrderModal() {
  if (!orderModal) return;
  orderModal.classList.remove('hidden');
  orderModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const firstInput = orderForm?.querySelector('input, select');
  firstInput?.focus();
}

function closeOrderModal() {
  if (!orderModal) return;
  orderModal.classList.add('hidden');
  orderModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function isLoggedIn() {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

loginForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  const username = String(loginForm.username.value || '').trim();
  const password = String(loginForm.password.value || '').trim();

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    localStorage.setItem(AUTH_KEY, 'true');
    loginMessage.textContent = '';
    showDashboard();
    loginForm.reset();
    return;
  }

  loginMessage.textContent = 'Usuario ou senha invalidos.';
});

logoutBtn?.addEventListener('click', () => {
  localStorage.removeItem(AUTH_KEY);
  showLogin();
});

orderForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  const selectedProduct = normalize(produtoSelect?.value || '');
  const expectsSize = PRODUCTS_WITH_SIZE.includes(selectedProduct);
  const expectsFlavor = (FLAVORS_BY_PRODUCT[selectedProduct] || []).length > 0;

  const formData = new FormData(orderForm);
  const order = {
    cliente: String(formData.get('cliente') || '').trim(),
    dataEntrega: String(formData.get('dataEntrega') || ''),
    produto: String(formData.get('produto') || '').trim(),
    tamanho: expectsSize ? String(formData.get('tamanho') || '').trim() : '-',
    sabor: expectsFlavor ? String(formData.get('sabor') || '').trim() : '-',
    quantidade: Number(formData.get('quantidade') || 0),
    cidade: String(formData.get('cidade') || '').trim(),
    formaPagamento: String(formData.get('formaPagamento') || '').trim(),
    valor: Number(formData.get('valor') || 0),
    id: Date.now(),
    canceled: false
  };

  const hasInvalidField =
    !order.cliente ||
    !order.dataEntrega ||
    !order.produto ||
    (expectsSize && !order.tamanho) ||
    (expectsFlavor && !order.sabor) ||
    order.quantidade <= 0 ||
    !order.cidade ||
    !order.formaPagamento ||
    order.valor <= 0;

  if (hasInvalidField) {
    return;
  }

  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);
  orderForm.reset();
  updateOrderConditionalFields();
  closeOrderModal();
  refreshDashboard();
});

ordersTableBody?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="cancel-order"]');
  if (!button) return;

  const shouldCancel = window.confirm('Deseja cancelar este pedido?');
  if (!shouldCancel) return;

  cancelOrderById(button.dataset.id);
});

openOrderModalBtn?.addEventListener('click', openOrderModal);
closeOrderModalBtn?.addEventListener('click', closeOrderModal);
orderModalBackdrop?.addEventListener('click', closeOrderModal);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && orderModal && !orderModal.classList.contains('hidden')) {
    closeOrderModal();
  }
});

produtoSelect?.addEventListener('change', updateOrderConditionalFields);
sizeSelect?.addEventListener('change', updateAutoValue);
quantityInput?.addEventListener('input', updateAutoValue);
updateOrderConditionalFields();

if (isLoggedIn()) {
  showDashboard();
} else {
  showLogin();
}

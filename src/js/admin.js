const AUTH_KEY = 'arteafeto_admin_logged';
const ORDER_KEY = 'arteafeto_admin_orders';
const EXTERNAL_ORDER_ENDPOINT = 'https://x8ki-letl-twmt.n7.xano.io/api:i2tKJnG4/orders_post';
const EXTERNAL_ORDER_LIST_ENDPOINT = 'https://x8ki-letl-twmt.n7.xano.io/api:i2tKJnG4/orders';
const XANO_LOGIN_ENDPOINT = 'https://x8ki-letl-twmt.n7.xano.io/api:_unQI8OU/auth/login';
const XANO_AUTH_ME_ENDPOINT = 'https://x8ki-letl-twmt.n7.xano.io/api:_unQI8OU/auth/me';
const AUTO_SYNC_INTERVAL_MS = 15000;
const ADMIN_ORDER_GUARD_KEY = 'arteafeto_admin_order_guard';
const ADMIN_ORDER_GUARD_TTL_MS = 180000;
const ADMIN_ORDER_INFLIGHT_KEY = 'arteafeto_admin_order_inflight';
const ADMIN_ORDER_INFLIGHT_TTL_MS = 90000;
const ADMIN_DELIVERY_STATUS_KEY = 'arteafeto_admin_delivery_status';
const TOKEN_KEY = 'token';

const loginCard = document.getElementById('loginCard');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const dashKicker = document.getElementById('dashKicker');
const logoutBtn = document.getElementById('logoutBtn');
const openOrderModalBtn = document.getElementById('openOrderModalBtn');
const orderModal = document.getElementById('orderModal');
const orderModalBackdrop = document.getElementById('orderModalBackdrop');
const closeOrderModalBtn = document.getElementById('closeOrderModalBtn');
const confirmDeleteModal = document.getElementById('confirmDeleteModal');
const confirmDeleteModalBackdrop = document.getElementById('confirmDeleteModalBackdrop');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const confirmDeleteCancelBtn = document.getElementById('confirmDeleteCancelBtn');

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
const addOrderItemBtn = document.getElementById('addOrderItemBtn');
const pendingItemsList = document.getElementById('pendingItemsList');
const pendingItemsEmpty = document.getElementById('pendingItemsEmpty');
const pendingItemsCount = document.getElementById('pendingItemsCount');
const ordersCityFilter = document.getElementById('ordersCityFilter');
const panelTabs = Array.from(document.querySelectorAll('.panel-tab'));
const ordersPanelView = document.getElementById('ordersPanelView');
const detailsPanelView = document.getElementById('detailsPanelView');
const managementPanelView = document.getElementById('managementPanelView');
const detailsTableBody = document.getElementById('detailsTableBody');
const flavorDetailsTableBody = document.getElementById('flavorDetailsTableBody');
const topProductLabel = document.getElementById('topProductLabel');
const topFlavorLabel = document.getElementById('topFlavorLabel');
const topCityLabel = document.getElementById('topCityLabel');
const topPaymentLabel = document.getElementById('topPaymentLabel');
const detailsTotalItemsLabel = document.getElementById('detailsTotalItemsLabel');
const managementTableBody = document.getElementById('managementTableBody');
const readyOrdersCount = document.getElementById('readyOrdersCount');
const pendingOrdersCount = document.getElementById('pendingOrdersCount');

const kpiPedidos = document.getElementById('kpiPedidos');
const kpiValor = document.getElementById('kpiValor');
const kpiItens = document.getElementById('kpiItens');
const kpiLavras = document.getElementById('kpiLavras');
const kpiCampoBelo = document.getElementById('kpiCampoBelo');
const kpiCristais = document.getElementById('kpiCristais');
const kpiCoqueiral = document.getElementById('kpiCoqueiral');

let pendingDeleteOrderId = null;
let syncIntervalId = null;
let isSyncInProgress = false;
let isAdminSubmitting = false;
let pendingOrderItems = [];
let currentAuthenticatedUser = null;

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

function humanizeUserLabel(value) {
  return String(value || '')
    .trim()
    .replace(/^[^@]+@/, (match) => match.slice(0, -1))
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase());
}

function getAuthenticatedUserLabel(user) {
  if (!user || typeof user !== 'object') return 'Olá 👋';

  const rawLabel = user.nome || user.name || user.login || user.username || user.email || '';
  const label = humanizeUserLabel(rawLabel) || 'Olá';
  return `Olá, ${label} 👋`;
}

function updateDashboardGreeting() {
  if (!dashKicker) return;
  dashKicker.textContent = getAuthenticatedUserLabel(currentAuthenticatedUser);
}

function setAuthenticatedUser(user) {
  currentAuthenticatedUser = user && typeof user === 'object' ? user : null;
  updateDashboardGreeting();
}

function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(AUTH_KEY, 'true');
}

function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AUTH_KEY);
}

function redirectToLogin() {
  loginMessage.textContent = 'Faça login para acessar o painel.';
  showLogin();
}

async function authFetch(url, options = {}) {
  const token = getAuthToken();
  if (!token) {
    redirectToLogin();
    throw new Error('Token ausente');
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401 || response.status === 403) {
    clearAuthToken();
    redirectToLogin();
    throw new Error('Sessão expirada ou não autorizada');
  }

  return response;
}

async function loginWithXano(email, password) {
  const attempts = [
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    },
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({ email, password }).toString()
    },
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_value: email, password })
    },
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: email, senha: password })
    }
  ];

  let lastResponseData = {};

  for (const attempt of attempts) {
    const response = await fetch(XANO_LOGIN_ENDPOINT, {
      method: 'POST',
      headers: attempt.headers,
      body: attempt.body
    });

    const data = await response.json().catch(() => ({}));
    lastResponseData = data;
    const authToken = data?.authToken || data?.auth_token || data?.token;

    if (response.ok && authToken) {
      return { ...data, authToken };
    }

    if (data?.code !== 'ERROR_CODE_INPUT_ERROR') {
      break;
    }
  }

  const errorMessage = typeof lastResponseData?.message === 'string'
    ? lastResponseData.message
    : 'Login inválido';
  throw new Error(errorMessage);
}

async function fetchAuthenticatedUser() {
  const response = await authFetch(XANO_AUTH_ME_ENDPOINT, { method: 'GET' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error('Não foi possível validar a sessão atual.');
  }
  return data;
}

function setActivePanel(panelName) {
  const panelMap = {
    orders: ordersPanelView,
    details: detailsPanelView,
    management: managementPanelView
  };

  panelTabs.forEach((tab) => {
    const isActive = tab.dataset.panel === panelName;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  Object.entries(panelMap).forEach(([key, view]) => {
    if (!view) return;
    view.classList.toggle('hidden', key !== panelName);
  });
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

function parseDecimal(value) {
  const normalizedValue = String(value ?? '').replace(',', '.').trim();
  const parsedValue = Number.parseFloat(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
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

function getCurrentProductDraft() {
  const selectedProduct = normalize(produtoSelect?.value || '');
  const expectsSize = PRODUCTS_WITH_SIZE.includes(selectedProduct);
  const expectsFlavor = (FLAVORS_BY_PRODUCT[selectedProduct] || []).length > 0;

  const produto = String(produtoSelect?.value || '').trim();
  const tamanho = expectsSize ? String(sizeSelect?.value || '').trim() : '-';
  const sabor = expectsFlavor ? String(flavorSelect?.value || '').trim() : '-';
  const quantidade = Number(quantityInput?.value || 0);
  const valor = parseDecimal(valueInput?.value);

  const isBlank = !produto && !quantidade && !valor;
  if (isBlank) return { isBlank: true, item: null, error: null };

  const hasInvalidField =
    !produto ||
    (expectsSize && !tamanho) ||
    (expectsFlavor && !sabor) ||
    quantidade <= 0 ||
    valor <= 0;

  if (hasInvalidField) {
    return {
      isBlank: false,
      item: null,
      error: 'Preencha produto, tamanho/sabor (quando necessario), quantidade e valor para adicionar.'
    };
  }

  return {
    isBlank: false,
    error: null,
    item: { produto, tamanho, sabor, quantidade, valor }
  };
}

function clearCurrentProductFields() {
  if (produtoSelect) produtoSelect.value = '';
  if (sizeSelect) sizeSelect.value = '';
  if (flavorSelect) flavorSelect.value = '';
  if (quantityInput) quantityInput.value = '';
  if (valueInput) valueInput.value = '';
  updateOrderConditionalFields();
}

function renderPendingItems() {
  if (!pendingItemsList || !pendingItemsEmpty || !pendingItemsCount) return;

  pendingItemsCount.textContent = `${pendingOrderItems.length} ${pendingOrderItems.length === 1 ? 'item' : 'itens'}`;

  if (pendingOrderItems.length === 0) {
    pendingItemsList.innerHTML = '';
    pendingItemsEmpty.classList.remove('hidden');
    return;
  }

  pendingItemsEmpty.classList.add('hidden');
  pendingItemsList.innerHTML = pendingOrderItems.map((item, index) => `
    <div class="pending-item-row">
      <div class="pending-item-info">
        <strong>${item.produto}</strong>
        <span>Tam: ${item.tamanho} | Sabor: ${item.sabor} | Qtd: ${item.quantidade} | ${formatCurrency(item.valor)}</span>
      </div>
      <button class="btn-remove-item" type="button" data-action="remove-pending-item" data-index="${index}">Remover</button>
    </div>
  `).join('');
}

function addCurrentProductToPending() {
  const draft = getCurrentProductDraft();
  if (draft.error) {
    showToast(draft.error, 'error');
    return false;
  }
  if (!draft.item) return false;

  pendingOrderItems.push(draft.item);
  renderPendingItems();
  clearCurrentProductFields();
  showToast('Produto adicionado ao pedido.', 'success');
  return true;
}

function groupOrdersByClient(orders) {
  const groups = new Map();

  orders.forEach((order) => {
    const key = normalize(order.cliente) || `cliente-sem-nome-${order.id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        cliente: order.cliente,
        items: [],
        totalQuantidade: 0,
        totalValor: 0,
        latestEntrega: order.dataEntrega || '',
        cidades: new Set(),
        pagamentos: new Set()
      });
    }

    const group = groups.get(key);
    group.items.push(order);
    group.totalQuantidade += Number(order.quantidade || 0);
    group.totalValor += Number(order.valor || 0);
    if (order.dataEntrega && String(order.dataEntrega).localeCompare(String(group.latestEntrega)) > 0) {
      group.latestEntrega = order.dataEntrega;
    }
    if (order.cidade) group.cidades.add(order.cidade);
    if (order.formaPagamento) group.pagamentos.add(order.formaPagamento);
  });

  return Array.from(groups.values()).sort((a, b) => String(b.latestEntrega).localeCompare(String(a.latestEntrega)));
}

function getOrderDedupKey(order) {
  if (order?.externalId) {
    return `external:${order.externalId}`;
  }

  return [
    normalize(order?.cliente),
    String(order?.dataEntrega || '').trim(),
    normalize(order?.produto),
    String(order?.tamanho || '-').trim(),
    String(order?.sabor || '-').trim(),
    Number(order?.quantidade || 0),
    normalize(order?.cidade),
    normalize(order?.formaPagamento),
    parseDecimal(order?.valor || 0)
  ].join('|');
}

function dedupeOrders(orders) {
  const seen = new Set();
  const unique = [];

  orders.forEach((order) => {
    const key = getOrderDedupKey(order);
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(order);
  });

  return unique;
}

function getOrders() {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const orders = Array.isArray(parsed) ? parsed : [];
    const deduped = dedupeOrders(orders);
    if (deduped.length !== orders.length) {
      saveOrders(deduped);
    }
    return deduped;
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
}

function populateOrdersCityFilter(orders) {
  if (!ordersCityFilter) return;

  const currentValue = ordersCityFilter.value;
  const cities = Array.from(new Set(
    orders
      .map((order) => String(order.cidade || '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  ));

  ordersCityFilter.innerHTML = '<option value="">Todas as cidades</option>';
  cities.forEach((city) => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    ordersCityFilter.appendChild(option);
  });

  if (cities.includes(currentValue)) {
    ordersCityFilter.value = currentValue;
  }
}

function filterOrdersBySelectedCity(orders) {
  const selectedCity = String(ordersCityFilter?.value || '').trim();
  if (!selectedCity) return orders;
  return orders.filter((order) => String(order.cidade || '').trim() === selectedCity);
}

function getDeliveryStatusMap() {
  try {
    const raw = localStorage.getItem(ADMIN_DELIVERY_STATUS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveDeliveryStatusMap(map) {
  try {
    localStorage.setItem(ADMIN_DELIVERY_STATUS_KEY, JSON.stringify(map));
  } catch {
    // ignore storage failures
  }
}

function normalizeDeliveryStatusEntry(entry) {
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    return {
      units: entry.units && typeof entry.units === 'object' ? entry.units : {},
      expanded: Boolean(entry.expanded)
    };
  }

  return {
    units: {},
    expanded: Boolean(entry)
  };
}

function getDeliveryGroupKey(group) {
  return [
    normalize(group.cliente),
    String(group.dataEntrega || '').trim(),
    normalize(group.cidade)
  ].join('|');
}

function buildDeliveryUnits(group) {
  const units = [];

  group.items.forEach((item) => {
    const quantity = Math.max(1, Number(item.quantidade || 0));
    const sizeLabel = item.tamanho && item.tamanho !== '-' ? ` ${item.tamanho}` : '';
    const flavorLabel = item.sabor && item.sabor !== '-' ? ` - ${item.sabor}` : '';
    const baseLabel = `${item.produto}${sizeLabel}${flavorLabel}`;

    for (let index = 0; index < quantity; index += 1) {
      units.push({
        key: `${item.id || group.key}:${index + 1}`,
        label: quantity > 1 ? `${baseLabel} • item ${index + 1}` : baseLabel,
        orderId: item.id
      });
    }
  });

  return units;
}

function getDeliveryGroupStatus(group, statusMap) {
  const entry = normalizeDeliveryStatusEntry(statusMap[group.key]);
  const units = buildDeliveryUnits(group);
  const readyUnits = units.filter((unit) => Boolean(entry.units[unit.key])).length;

  return {
    entry,
    units,
    readyUnits,
    totalUnits: units.length,
    isReady: units.length > 0 && readyUnits === units.length,
    isPartial: readyUnits > 0 && readyUnits < units.length
  };
}

function setDeliveryGroupReady(group, isReady) {
  const statusMap = getDeliveryStatusMap();
  const units = buildDeliveryUnits(group);
  const entry = normalizeDeliveryStatusEntry(statusMap[group.key]);
  entry.units = {};
  if (isReady) {
    units.forEach((unit) => {
      entry.units[unit.key] = true;
    });
  }
  statusMap[group.key] = entry;
  saveDeliveryStatusMap(statusMap);
}

function setDeliveryUnitReady(groupKey, unitKey, isReady) {
  const statusMap = getDeliveryStatusMap();
  const entry = normalizeDeliveryStatusEntry(statusMap[groupKey]);
  entry.units[unitKey] = Boolean(isReady);
  statusMap[groupKey] = entry;
  saveDeliveryStatusMap(statusMap);
}

function setDeliveryGroupExpanded(groupKey, isExpanded) {
  const statusMap = getDeliveryStatusMap();
  const entry = normalizeDeliveryStatusEntry(statusMap[groupKey]);
  entry.expanded = Boolean(isExpanded);
  statusMap[groupKey] = entry;
  saveDeliveryStatusMap(statusMap);
}

function groupOrdersForDelivery(orders) {
  const groups = new Map();

  orders.forEach((order) => {
    const groupKey = [normalize(order.cliente), String(order.dataEntrega || '').trim(), normalize(order.cidade)].join('|');
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        cliente: order.cliente,
        dataEntrega: order.dataEntrega,
        cidade: order.cidade,
        items: [],
        totalQuantidade: 0
      });
    }

    const group = groups.get(groupKey);
    group.items.push(order);
    group.totalQuantidade += Number(order.quantidade || 0);
  });

  return Array.from(groups.values()).sort((a, b) => String(a.dataEntrega).localeCompare(String(b.dataEntrega)));
}

function buildLeaderboard(entries) {
  if (!entries || entries.length === 0) return '-';
  return entries.reduce((top, current) => current.count > top.count ? current : top).label;
}

function buildFlavorLabel(order) {
  const productLabel = String(order?.produto || '-').trim() || '-';
  const flavorLabel = String(order?.sabor || '-').trim() || '-';

  if (flavorLabel === '-' || !flavorLabel) {
    return productLabel;
  }

  return `${productLabel} - ${flavorLabel}`;
}

function renderDetailsView(orders) {
  if (!detailsTableBody || !flavorDetailsTableBody || !topProductLabel || !topFlavorLabel || !topCityLabel || !topPaymentLabel) return;

  const productMap = new Map();
  const flavorMap = new Map();
  const cityMap = new Map();
  const paymentMap = new Map();

  orders.forEach((order) => {
    const productKey = normalize(order.produto) || '-';
    const existingProduct = productMap.get(productKey) || {
      label: order.produto || '-',
      pedidos: 0,
      itens: 0,
      valor: 0
    };
    existingProduct.pedidos += 1;
    existingProduct.itens += Number(order.quantidade || 0);
    existingProduct.valor += Number(order.valor || 0);
    productMap.set(productKey, existingProduct);

    const flavorLabel = buildFlavorLabel(order);
    const flavorKey = `${normalize(order.produto)}|${normalize(order.sabor) || '-'}`;
    const existingFlavor = flavorMap.get(flavorKey) || {
      label: flavorLabel,
      pedidos: 0,
      itens: 0
    };
    existingFlavor.pedidos += 1;
    existingFlavor.itens += Number(order.quantidade || 0);
    flavorMap.set(flavorKey, existingFlavor);

    const cityKey = normalize(order.cidade) || '-';
    cityMap.set(cityKey, {
      label: order.cidade || '-',
      count: (cityMap.get(cityKey)?.count || 0) + 1
    });

    const paymentKey = normalize(order.formaPagamento) || '-';
    paymentMap.set(paymentKey, {
      label: order.formaPagamento || '-',
      count: (paymentMap.get(paymentKey)?.count || 0) + 1
    });
  });

  const productRows = Array.from(productMap.values()).sort((a, b) => b.itens - a.itens || b.valor - a.valor);
  const flavorRows = Array.from(flavorMap.values()).sort((a, b) => b.itens - a.itens || b.pedidos - a.pedidos);
  const totalItems = orders.reduce((sum, order) => sum + Number(order.quantidade || 0), 0);
  topProductLabel.textContent = productRows[0]?.label || '-';
  topFlavorLabel.textContent = flavorRows[0]?.label || '-';
  topCityLabel.textContent = buildLeaderboard(Array.from(cityMap.values()));
  topPaymentLabel.textContent = buildLeaderboard(Array.from(paymentMap.values()));
  if (detailsTotalItemsLabel) {
    detailsTotalItemsLabel.textContent = String(totalItems);
  }

  if (productRows.length === 0) {
    detailsTableBody.innerHTML = '<tr><td colspan="4" class="empty-row">Nenhum dado para detalhar ainda.</td></tr>';
    flavorDetailsTableBody.innerHTML = '<tr><td colspan="3" class="empty-row">Nenhum sabor registrado ainda.</td></tr>';
    return;
  }

  detailsTableBody.innerHTML = productRows.map((item) => `
    <tr>
      <td>${item.label}</td>
      <td>${item.pedidos}</td>
      <td>${item.itens}</td>
      <td>${formatCurrency(item.valor)}</td>
    </tr>
  `).join('');

  flavorDetailsTableBody.innerHTML = flavorRows.length === 0
    ? '<tr><td colspan="3" class="empty-row">Nenhum sabor registrado ainda.</td></tr>'
    : flavorRows.map((item) => `
      <tr>
        <td>${item.label}</td>
        <td>${item.pedidos}</td>
        <td>${item.itens}</td>
      </tr>
    `).join('');
}

function renderManagementView(orders) {
  if (!managementTableBody || !readyOrdersCount || !pendingOrdersCount) return;

  const deliveryGroups = groupOrdersForDelivery(orders);
  const statusMap = getDeliveryStatusMap();
  let readyCount = 0;

  if (deliveryGroups.length === 0) {
    managementTableBody.innerHTML = '<tr><td colspan="6" class="empty-row">Nenhuma entrega para gerenciar ainda.</td></tr>';
    readyOrdersCount.textContent = '0';
    pendingOrdersCount.textContent = '0';
    return;
  }

  managementTableBody.innerHTML = deliveryGroups.map((group) => {
    const groupStatus = getDeliveryGroupStatus(group, statusMap);
    const isExpandable = groupStatus.totalUnits > 1;
    const isExpanded = groupStatus.entry.expanded && isExpandable;
    if (groupStatus.isReady) readyCount += 1;
    const productsLabel = group.items.map((item) => `${item.produto} x${item.quantidade}`).join(' | ');
    const statusClass = groupStatus.isReady
      ? 'status-badge--ready'
      : groupStatus.isPartial
        ? 'status-badge--partial'
        : 'status-badge--pending';
    const statusLabel = groupStatus.isReady
      ? 'Pronto'
      : groupStatus.isPartial
        ? 'Parcial'
        : 'Pendente';
    const actionButton = isExpandable
      ? `<button class="btn-expand" type="button" data-action="toggle-management-group" data-group-key="${group.key}" aria-expanded="${isExpanded}">${isExpanded ? 'Recolher itens' : 'Expandir itens'}</button>`
      : `<button class="btn-status-toggle" type="button" data-action="toggle-delivery-status" data-group-key="${group.key}" data-unit-key="${groupStatus.units[0]?.key || ''}">${groupStatus.isReady ? 'Marcar pendente' : 'Marcar pronto'}</button>`;
    const detailRow = isExpandable ? `
      <tr class="management-details-row ${isExpanded ? '' : 'hidden'}">
        <td colspan="6">
          <div class="management-details-list">
            ${groupStatus.units.map((unit) => {
              const unitReady = Boolean(groupStatus.entry.units[unit.key]);
              return `
                <div class="management-detail-item">
                  <div class="management-detail-main">
                    <strong>${unit.label}</strong>
                    <span>Status individual da entrega</span>
                  </div>
                  <div class="management-detail-meta">
                    <span class="status-badge ${unitReady ? 'status-badge--ready' : 'status-badge--pending'}">${unitReady ? 'Pronto' : 'Pendente'}</span>
                    <button class="btn-status-toggle" type="button" data-action="toggle-delivery-status" data-group-key="${group.key}" data-unit-key="${unit.key}">${unitReady ? 'Marcar pendente' : 'Marcar pronto'}</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </td>
      </tr>` : '';
    return `
      <tr>
        <td>${group.cliente}</td>
        <td>${formatDate(group.dataEntrega)}</td>
        <td>${productsLabel}</td>
        <td>${group.cidade}</td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        <td>${actionButton}</td>
      </tr>
      ${detailRow}
    `;
  }).join('');

  readyOrdersCount.textContent = String(readyCount);
  pendingOrdersCount.textContent = String(deliveryGroups.length - readyCount);
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `admin-toast admin-toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('is-visible');
  });

  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 220);
  }, 3000);
}

function buildExternalOrderPayload(order) {
  return {
    cliente: order.cliente,
    data_entrega: order.dataEntrega,
    produto: order.produto,
    tamanho: order.tamanho,
    sabor: order.sabor,
    quantidade: Number(order.quantidade),
    cidade: order.cidade,
    forma_pagamento: order.formaPagamento,
    valor: parseDecimal(order.valor)
  };
}

function buildAdminOrderSignature(order) {
  return [
    order.cliente,
    order.dataEntrega,
    order.produto,
    order.tamanho,
    order.sabor,
    Number(order.quantidade || 0),
    order.cidade,
    order.formaPagamento,
    Number(order.valor || 0).toFixed(2)
  ].join('|').toLowerCase();
}

function getAdminOrderGuardMap() {
  try {
    const raw = localStorage.getItem(ADMIN_ORDER_GUARD_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveAdminOrderGuardMap(guardMap) {
  try {
    localStorage.setItem(ADMIN_ORDER_GUARD_KEY, JSON.stringify(guardMap));
  } catch {
    // ignore storage failures
  }
}

function getAdminOrderInflightMap() {
  try {
    const raw = localStorage.getItem(ADMIN_ORDER_INFLIGHT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveAdminOrderInflightMap(map) {
  try {
    localStorage.setItem(ADMIN_ORDER_INFLIGHT_KEY, JSON.stringify(map));
  } catch {
    // ignore storage failures
  }
}

function cleanupAdminOrderInflightMap(map) {
  const now = Date.now();
  Object.keys(map).forEach((key) => {
    const ageMs = now - Number(map[key] || 0);
    if (!map[key] || ageMs < 0 || ageMs > ADMIN_ORDER_INFLIGHT_TTL_MS) {
      delete map[key];
    }
  });
}

function acquireAdminOrderInflightLock(order) {
  const signature = buildAdminOrderSignature(order);
  const inflightMap = getAdminOrderInflightMap();
  cleanupAdminOrderInflightMap(inflightMap);
  if (inflightMap[signature]) return false;
  inflightMap[signature] = Date.now();
  saveAdminOrderInflightMap(inflightMap);
  return true;
}

function releaseAdminOrderInflightLock(order) {
  const signature = buildAdminOrderSignature(order);
  const inflightMap = getAdminOrderInflightMap();
  if (!inflightMap[signature]) return;
  delete inflightMap[signature];
  saveAdminOrderInflightMap(inflightMap);
}

function wasAdminOrderSentRecently(order) {
  const signature = buildAdminOrderSignature(order);
  const guardMap = getAdminOrderGuardMap();
  const lastSentAt = Number(guardMap[signature] || 0);
  if (!lastSentAt) return false;
  const ageMs = Date.now() - lastSentAt;
  return ageMs >= 0 && ageMs < ADMIN_ORDER_GUARD_TTL_MS;
}

function markAdminOrderAsSent(order) {
  const signature = buildAdminOrderSignature(order);
  const guardMap = getAdminOrderGuardMap();
  guardMap[signature] = Date.now();
  saveAdminOrderGuardMap(guardMap);
}

async function sendOrderToExternalApi(order) {
  const payload = buildExternalOrderPayload(order);
  const response = await authFetch(EXTERNAL_ORDER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Falha ao enviar pedido. Status: ${response.status}`);
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function deleteOrderFromExternalApi(orderId) {
  const response = await authFetch(`${EXTERNAL_ORDER_LIST_ENDPOINT}/${orderId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error(`Falha ao deletar pedido. Status: ${response.status}`);
  }
}

async function listarPedidos() {
  try {
    const response = await authFetch(EXTERNAL_ORDER_LIST_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Falha ao listar pedidos. Status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    return null;
  }
}

window.listarPedidos = listarPedidos;

function mapExternalOrderToLocal(order) {
  const externalId = order?.id ?? order?.order_id ?? order?.externalId ?? null;
  const cliente = String(order?.cliente ?? '').trim();
  const dataEntrega = String(order?.data_entrega ?? order?.dataEntrega ?? '');
  const produto = String(order?.produto ?? '').trim();
  const tamanho = String(order?.tamanho ?? '-').trim() || '-';
  const sabor = String(order?.sabor ?? '-').trim() || '-';
  const quantidade = Number(order?.quantidade ?? 0);
  const cidade = String(order?.cidade ?? '').trim();
  const formaPagamento = String(order?.forma_pagamento ?? order?.formaPagamento ?? '').trim();
  const valor = parseDecimal(order?.valor ?? 0);

  return {
    id: externalId ?? Date.now(),
    externalId,
    cliente,
    dataEntrega,
    produto,
    tamanho,
    sabor,
    quantidade,
    cidade,
    formaPagamento,
    valor
  };
}

function isValidMappedOrder(order) {
  return Boolean(
    order.cliente &&
    order.produto &&
    order.quantidade >= 0 &&
    order.cidade &&
    order.formaPagamento &&
    order.valor >= 0
  );
}

async function syncOrdersFromExternal(options = {}) {
  const { silent = true } = options;
  if (isSyncInProgress) return;

  isSyncInProgress = true;
  try {
    const data = await listarPedidos();
    if (!Array.isArray(data)) {
      throw new Error('Formato de resposta invalido ao listar pedidos.');
    }

    const mappedOrders = data
      .map(mapExternalOrderToLocal)
      .filter(isValidMappedOrder)
      .filter((order, index, arr) => arr.findIndex((candidate) => getOrderDedupKey(candidate) === getOrderDedupKey(order)) === index)
      .sort((a, b) => String(b.dataEntrega).localeCompare(String(a.dataEntrega)));

    saveOrders(mappedOrders);
    refreshDashboard();

    if (!silent) {
      showToast('Pedidos sincronizados com o banco de dados.', 'success');
    }
  } catch (error) {
    console.error('Erro ao sincronizar pedidos:', error);
    if (!silent) {
      showToast('Nao foi possivel sincronizar com o banco agora.', 'error');
    }
  } finally {
    isSyncInProgress = false;
  }
}

function startAutoSync() {
  if (syncIntervalId) return;
  syncIntervalId = window.setInterval(() => {
    syncOrdersFromExternal({ silent: true });
  }, AUTO_SYNC_INTERVAL_MS);
}

function stopAutoSync() {
  if (!syncIntervalId) return;
  window.clearInterval(syncIntervalId);
  syncIntervalId = null;
}

window.syncOrdersFromExternal = syncOrdersFromExternal;

function renderKpis(orders) {
  const groupedOrders = groupOrdersByClient(orders);
  const totalPedidos = groupedOrders.length;
  const totalValor = orders.reduce((sum, order) => sum + Number(order.valor || 0), 0);
  const totalItens = orders.reduce((sum, order) => sum + Number(order.quantidade || 0), 0);
  const groupedCities = groupedOrders.map((group) => {
    const cities = Array.from(group.cidades).map((city) => normalize(city)).filter(Boolean);
    return cities[0] || '';
  });
  const lavras = groupedCities.filter((city) => city === 'lavras').length;
  const campoBelo = groupedCities.filter((city) => city === 'campo belo').length;
  const cristais = groupedCities.filter((city) => city === 'cristais').length;
  const coqueiral = groupedCities.filter((city) => city === 'coqueiral').length;

  kpiPedidos.textContent = String(totalPedidos);
  kpiValor.textContent = formatCurrency(totalValor);
  if (kpiItens) {
    kpiItens.textContent = String(totalItens);
  }
  kpiLavras.textContent = String(lavras);
  kpiCampoBelo.textContent = String(campoBelo);
  kpiCristais.textContent = String(cristais);
  kpiCoqueiral.textContent = String(coqueiral);
}

function renderTable(orders) {
  ordersTableBody.innerHTML = '';

  if (orders.length === 0) {
    emptyTableMessage.classList.remove('hidden');
    return;
  }

  emptyTableMessage.classList.add('hidden');

  const groupedOrders = groupOrdersByClient(orders);

  groupedOrders.forEach((group) => {
    const summaryRow = document.createElement('tr');
    const hasMultipleOrders = group.items.length > 1;
    const firstItem = group.items[0];
    summaryRow.className = hasMultipleOrders ? 'group-row' : '';

    const cityLabel = group.cidades.size === 1 ? Array.from(group.cidades)[0] : `${group.cidades.size} cidades`;
    const paymentLabel = group.pagamentos.size === 1 ? Array.from(group.pagamentos)[0] : `${group.pagamentos.size} formas`;

    if (!hasMultipleOrders) {
      summaryRow.innerHTML = `
        <td>${group.cliente}</td>
        <td>${formatDate(firstItem.dataEntrega)}</td>
        <td>${firstItem.produto}</td>
        <td>${firstItem.tamanho}</td>
        <td>${firstItem.sabor}</td>
        <td>${firstItem.quantidade}</td>
        <td>${firstItem.cidade}</td>
        <td>${firstItem.formaPagamento}</td>
        <td>${formatCurrency(Number(firstItem.valor || 0))}</td>
        <td>
          <button class="btn-cancel" type="button" data-action="cancel-order" data-id="${firstItem.id}">Cancelar</button>
        </td>
      `;
      ordersTableBody.appendChild(summaryRow);
      return;
    }

    summaryRow.innerHTML = `
      <td>${group.cliente}</td>
      <td>${formatDate(group.latestEntrega)}</td>
      <td>${group.items.length} produtos</td>
      <td>-</td>
      <td>-</td>
      <td>${group.totalQuantidade}</td>
      <td>${cityLabel}</td>
      <td>${paymentLabel}</td>
      <td>${formatCurrency(group.totalValor)}</td>
      <td>
        <button class="btn-expand" type="button" data-action="toggle-group" aria-expanded="false">Expandir</button>
      </td>
    `;

    const detailsRow = document.createElement('tr');
    detailsRow.className = 'order-details-row hidden';

    const detailsCell = document.createElement('td');
    detailsCell.colSpan = 10;
    detailsCell.innerHTML = `
      <div class="order-details-list">
        ${group.items.map((item) => `
          <div class="order-detail-item">
            <div class="order-detail-main">
              <strong>${item.produto}</strong>
              <span>Entrega: ${formatDate(item.dataEntrega)} | Tam: ${item.tamanho} | Sabor: ${item.sabor}</span>
            </div>
            <div class="order-detail-meta">
              <span>Qtd: ${item.quantidade}</span>
              <span>${item.cidade}</span>
              <span>${item.formaPagamento}</span>
              <strong>${formatCurrency(Number(item.valor || 0))}</strong>
              <button class="btn-cancel" type="button" data-action="cancel-order" data-id="${item.id}">Cancelar</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    detailsRow.appendChild(detailsCell);
    ordersTableBody.appendChild(summaryRow);
    ordersTableBody.appendChild(detailsRow);
  });
}

async function cancelOrderById(orderId) {
  const orders = getOrders();
  const targetIndex = orders.findIndex((order) => String(order.id) === String(orderId));
  if (targetIndex < 0) return;

  const target = orders[targetIndex];
  const externalId = target.externalId ?? null;

  if (!externalId) {
    showToast('Pedido removido do painel, mas sem ID de banco para deletar no Xano.', 'error');
    orders.splice(targetIndex, 1);
    saveOrders(orders);
    refreshDashboard();
    return;
  }

  await deleteOrderFromExternalApi(externalId);

  orders.splice(targetIndex, 1);
  saveOrders(orders);
  refreshDashboard();
  showToast('Pedido deletado com sucesso!', 'success');
}

function refreshDashboard() {
  const orders = getOrders();
  populateOrdersCityFilter(orders);
  const filteredOrders = filterOrdersBySelectedCity(orders);
  renderKpis(orders);
  renderTable(filteredOrders);
  renderDetailsView(filteredOrders);
  renderManagementView(filteredOrders);
}

function showDashboard() {
  loginCard.classList.add('hidden');
  dashboard.classList.remove('hidden');
  closeOrderModal();
  updateDashboardGreeting();
  refreshDashboard();
  startAutoSync();
  syncOrdersFromExternal({ silent: true });
}

function showLogin() {
  dashboard.classList.add('hidden');
  loginCard.classList.remove('hidden');
  closeOrderModal();
  stopAutoSync();
  setActivePanel('orders');
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
  if (confirmDeleteModal?.classList.contains('hidden')) {
    document.body.style.overflow = '';
  }
}

function openConfirmDeleteModal(orderId) {
  if (!confirmDeleteModal) return;
  pendingDeleteOrderId = orderId;
  confirmDeleteModal.classList.remove('hidden');
  confirmDeleteModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  confirmDeleteBtn?.focus();
}

function closeConfirmDeleteModal() {
  if (!confirmDeleteModal) return;
  confirmDeleteModal.classList.add('hidden');
  confirmDeleteModal.setAttribute('aria-hidden', 'true');
  pendingDeleteOrderId = null;
  if (orderModal?.classList.contains('hidden')) {
    document.body.style.overflow = '';
  }
}

function isLoggedIn() {
  return Boolean(getAuthToken());
}

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = String(document.getElementById('email')?.value || '').trim();
  const password = String(loginForm.password.value || '').trim();

  try {
    const data = await loginWithXano(email, password);
    setAuthToken(data.authToken);
    const authenticatedUser = await fetchAuthenticatedUser();
    setAuthenticatedUser(authenticatedUser);
    loginMessage.textContent = '';
    showDashboard();
    loginForm.reset();
  } catch (error) {
    console.error(error);
    clearAuthToken();
    setAuthenticatedUser(null);
    loginMessage.textContent = 'Login inválido.';
  }
});

logoutBtn?.addEventListener('click', () => {
  clearAuthToken();
  setAuthenticatedUser(null);
  showLogin();
});

orderForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isAdminSubmitting) return;

  const formData = new FormData(orderForm);
  const baseOrder = {
    cliente: String(formData.get('cliente') || '').trim(),
    dataEntrega: String(formData.get('dataEntrega') || ''),
    cidade: String(formData.get('cidade') || '').trim(),
    formaPagamento: String(formData.get('formaPagamento') || '').trim()
  };

  const hasInvalidBase =
    !baseOrder.cliente ||
    !baseOrder.dataEntrega ||
    !baseOrder.cidade ||
    !baseOrder.formaPagamento;

  if (hasInvalidBase) {
    showToast('Preencha os dados do cliente e pagamento antes de salvar.', 'error');
    return;
  }

  const draft = getCurrentProductDraft();
  if (draft.error) {
    showToast(draft.error, 'error');
    return;
  }

  const itemsToCreate = [...pendingOrderItems];
  if (draft.item) {
    itemsToCreate.push(draft.item);
  }

  if (itemsToCreate.length === 0) {
    showToast('Adicione pelo menos um produto antes de salvar.', 'error');
    return;
  }

  const baseId = Date.now();
  const newOrders = itemsToCreate.map((item, index) => ({
    ...baseOrder,
    ...item,
    id: baseId + index
  }));

  const unsentOrders = newOrders.filter((order) => !wasAdminOrderSentRecently(order));
  if (unsentOrders.length === 0) {
    showToast('Pedido duplicado recente detectado. Envio bloqueado para evitar duplicidade.', 'error');
    return;
  }

  isAdminSubmitting = true;
  const submitBtn = orderForm.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.textContent || '';
    submitBtn.textContent = 'Enviando...';
  }
  if (addOrderItemBtn) {
    addOrderItemBtn.disabled = true;
  }

  try {

  const orders = getOrders();
  orders.unshift(...unsentOrders);
  saveOrders(orders);
  closeOrderModal();
  refreshDashboard();

  let sentCount = 0;
  const externalIdLinks = [];

  for (const order of unsentOrders) {
    if (!acquireAdminOrderInflightLock(order)) {
      console.warn('Pedido em envio simultaneo detectado no admin. POST ignorado para evitar duplicidade.');
      continue;
    }

    try {
      const createdOrder = await sendOrderToExternalApi(order);
      const createdExternalId = createdOrder?.id ?? createdOrder?.order_id ?? null;
      if (createdExternalId) {
        externalIdLinks.push({ localId: order.id, externalId: createdExternalId });
      }
      sentCount += 1;
      markAdminOrderAsSent(order);
    } catch (error) {
      console.error(error);
    } finally {
      releaseAdminOrderInflightLock(order);
    }
  }

  if (externalIdLinks.length > 0) {
    const latestOrders = getOrders();
    externalIdLinks.forEach((link) => {
      const localOrder = latestOrders.find((item) => String(item.id) === String(link.localId));
      if (localOrder) {
        localOrder.externalId = link.externalId;
      }
    });
    saveOrders(latestOrders);
  }

  const failedCount = unsentOrders.length - sentCount;
  try {
    if (failedCount === 0) {
      showToast(`${unsentOrders.length} ${unsentOrders.length === 1 ? 'pedido enviado' : 'pedidos enviados'} com sucesso!`, 'success');
    } else {
      showToast(`${sentCount} enviados e ${failedCount} pendentes de envio para o Xano.`, 'error');
    }
  } finally {
    pendingOrderItems = [];
    renderPendingItems();
    orderForm.reset();
    updateOrderConditionalFields();
  }

  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.originalText || 'Salvar pedidos';
      delete submitBtn.dataset.originalText;
    }
    if (addOrderItemBtn) {
      addOrderItemBtn.disabled = false;
    }
    isAdminSubmitting = false;
  }
});

ordersTableBody?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action="cancel-order"]');
  if (button) {
    openConfirmDeleteModal(button.dataset.id);
    return;
  }

  const toggleButton = event.target.closest('[data-action="toggle-group"]');
  if (!toggleButton) return;

  const summaryRow = toggleButton.closest('tr');
  const detailsRow = summaryRow?.nextElementSibling;
  if (!detailsRow || !detailsRow.classList.contains('order-details-row')) return;

  const isExpanded = !detailsRow.classList.contains('hidden');
  detailsRow.classList.toggle('hidden', isExpanded);
  toggleButton.setAttribute('aria-expanded', String(!isExpanded));
  toggleButton.textContent = isExpanded ? 'Expandir' : 'Recolher';
});

managementTableBody?.addEventListener('click', (event) => {
  const expandButton = event.target.closest('[data-action="toggle-management-group"]');
  if (expandButton) {
    const groupKey = String(expandButton.dataset.groupKey || '').trim();
    if (!groupKey) return;

    const statusMap = getDeliveryStatusMap();
    const entry = normalizeDeliveryStatusEntry(statusMap[groupKey]);
    setDeliveryGroupExpanded(groupKey, !entry.expanded);
    renderManagementView(filterOrdersBySelectedCity(getOrders()));
    return;
  }

  const toggleButton = event.target.closest('[data-action="toggle-delivery-status"]');
  if (!toggleButton) return;

  const groupKey = String(toggleButton.dataset.groupKey || '').trim();
  const unitKey = String(toggleButton.dataset.unitKey || '').trim();
  if (!groupKey || !unitKey) return;

  const statusMap = getDeliveryStatusMap();
  const entry = normalizeDeliveryStatusEntry(statusMap[groupKey]);
  const nextValue = !Boolean(entry.units[unitKey]);
  setDeliveryUnitReady(groupKey, unitKey, nextValue);
  renderManagementView(filterOrdersBySelectedCity(getOrders()));
});

panelTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    setActivePanel(tab.dataset.panel || 'orders');
  });
});

ordersCityFilter?.addEventListener('change', () => {
  refreshDashboard();
});

addOrderItemBtn?.addEventListener('click', addCurrentProductToPending);

pendingItemsList?.addEventListener('click', (event) => {
  const removeButton = event.target.closest('[data-action="remove-pending-item"]');
  if (!removeButton) return;

  const index = Number(removeButton.dataset.index);
  if (!Number.isInteger(index) || index < 0 || index >= pendingOrderItems.length) return;

  pendingOrderItems.splice(index, 1);
  renderPendingItems();
});

confirmDeleteBtn?.addEventListener('click', async () => {
  if (!pendingDeleteOrderId) return;

  const targetOrderId = pendingDeleteOrderId;
  confirmDeleteBtn.disabled = true;
  confirmDeleteCancelBtn.disabled = true;

  try {
    await cancelOrderById(targetOrderId);
    closeConfirmDeleteModal();
  } catch (error) {
    console.error(error);
    showToast('Erro ao deletar pedido no banco de dados.', 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteCancelBtn.disabled = false;
  }
});

confirmDeleteCancelBtn?.addEventListener('click', closeConfirmDeleteModal);
confirmDeleteModalBackdrop?.addEventListener('click', closeConfirmDeleteModal);

openOrderModalBtn?.addEventListener('click', openOrderModal);
closeOrderModalBtn?.addEventListener('click', closeOrderModal);
orderModalBackdrop?.addEventListener('click', closeOrderModal);
document.querySelectorAll('.js-close-modal').forEach(el => el.addEventListener('click', closeOrderModal));

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;

  if (confirmDeleteModal && !confirmDeleteModal.classList.contains('hidden')) {
    closeConfirmDeleteModal();
    return;
  }

  if (orderModal && !orderModal.classList.contains('hidden')) {
    closeOrderModal();
  }
});

produtoSelect?.addEventListener('change', updateOrderConditionalFields);
sizeSelect?.addEventListener('change', updateAutoValue);
quantityInput?.addEventListener('input', updateAutoValue);
updateOrderConditionalFields();
renderPendingItems();
setActivePanel('orders');
updateDashboardGreeting();

if (isLoggedIn()) {
  fetchAuthenticatedUser()
    .then((user) => {
      setAuthenticatedUser(user);
      loginMessage.textContent = '';
      showDashboard();
    })
    .catch((error) => {
      console.error(error);
      clearAuthToken();
      setAuthenticatedUser(null);
      showLogin();
    });
} else {
  showLogin();
}

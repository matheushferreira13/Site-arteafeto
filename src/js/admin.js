const AUTH_KEY = 'arteafeto_admin_logged';
const ORDER_KEY = 'arteafeto_admin_orders';
const EXTERNAL_ORDER_ENDPOINT = 'https://x8ki-letl-twmt.n7.xano.io/api:i2tKJnG4/orders_post';
const EXTERNAL_ORDER_LIST_ENDPOINT = 'https://x8ki-letl-twmt.n7.xano.io/api:i2tKJnG4/orders';
const XANO_LOGIN_ENDPOINT = 'https://SEU_XANO/users/login';
const AUTO_SYNC_INTERVAL_MS = 15000;
const ADMIN_ORDER_GUARD_KEY = 'arteafeto_admin_order_guard';
const ADMIN_ORDER_GUARD_TTL_MS = 180000;
const ADMIN_ORDER_INFLIGHT_KEY = 'arteafeto_admin_order_inflight';
const ADMIN_ORDER_INFLIGHT_TTL_MS = 90000;
const TOKEN_KEY = 'token';

const loginCard = document.getElementById('loginCard');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
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

const kpiPedidos = document.getElementById('kpiPedidos');
const kpiValor = document.getElementById('kpiValor');
const kpiLavras = document.getElementById('kpiLavras');
const kpiCampoBelo = document.getElementById('kpiCampoBelo');
const kpiCristais = document.getElementById('kpiCristais');
const kpiCoqueiral = document.getElementById('kpiCoqueiral');

let pendingDeleteOrderId = null;
let syncIntervalId = null;
let isSyncInProgress = false;
let isAdminSubmitting = false;
let pendingOrderItems = [];

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
  const response = await fetch(XANO_LOGIN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.authToken) {
    throw new Error('Login inválido');
  }

  return data;
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
  const totalPedidos = new Set(
    orders
      .map((order) => normalize(order.cliente))
      .filter(Boolean)
  ).size;
  const totalValor = orders.reduce((sum, order) => sum + Number(order.valor || 0), 0);
  const lavras = orders.filter((order) => normalize(order.cidade) === 'lavras').length;
  const campoBelo = orders.filter((order) => normalize(order.cidade) === 'campo belo').length;
  const cristais = orders.filter((order) => normalize(order.cidade) === 'cristais').length;
  const coqueiral = orders.filter((order) => normalize(order.cidade) === 'coqueiral').length;

  kpiPedidos.textContent = String(totalPedidos);
  kpiValor.textContent = formatCurrency(totalValor);
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
  renderKpis(orders);
  renderTable(orders);
}

function showDashboard() {
  loginCard.classList.add('hidden');
  dashboard.classList.remove('hidden');
  closeOrderModal();
  refreshDashboard();
  startAutoSync();
  syncOrdersFromExternal({ silent: true });
}

function showLogin() {
  dashboard.classList.add('hidden');
  loginCard.classList.remove('hidden');
  closeOrderModal();
  stopAutoSync();
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
    loginMessage.textContent = '';
    showDashboard();
    loginForm.reset();
  } catch (error) {
    console.error(error);
    loginMessage.textContent = 'Login inválido.';
  }
});

logoutBtn?.addEventListener('click', () => {
  clearAuthToken();
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

if (isLoggedIn()) {
  showDashboard();
} else {
  showLogin();
}

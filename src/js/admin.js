const AUTH_KEY = 'arteafeto_admin_logged';
const ORDER_KEY = 'arteafeto_admin_orders';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'arteafeto123';

const loginCard = document.getElementById('loginCard');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const logoutBtn = document.getElementById('logoutBtn');

const orderForm = document.getElementById('orderForm');
const ordersTableBody = document.getElementById('ordersTableBody');
const clearOrdersBtn = document.getElementById('clearOrdersBtn');
const emptyTableMessage = document.getElementById('emptyTableMessage');

const kpiPedidos = document.getElementById('kpiPedidos');
const kpiValor = document.getElementById('kpiValor');
const kpiLavras = document.getElementById('kpiLavras');
const kpiCampoBelo = document.getElementById('kpiCampoBelo');

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
  const totalPedidos = orders.length;
  const totalValor = orders.reduce((sum, order) => sum + Number(order.valor || 0), 0);
  const lavras = orders.filter((order) => normalize(order.cidade) === 'lavras').length;
  const campoBelo = orders.filter((order) => normalize(order.cidade) === 'campo belo').length;

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
    row.innerHTML = `
      <td>${order.cliente}</td>
      <td>${formatDate(order.dataEntrega)}</td>
      <td>${order.produto}</td>
      <td>${order.tamanho}</td>
      <td>${order.sabor}</td>
      <td>${order.quantidade}</td>
      <td>${order.cidade}</td>
      <td>${order.entrega}</td>
      <td>${formatDate(order.dataDaEntrega)}</td>
      <td>${order.formaPagamento}</td>
      <td>${formatCurrency(Number(order.valor || 0))}</td>
    `;
    ordersTableBody.appendChild(row);
  });
}

function refreshDashboard() {
  const orders = getOrders();
  renderKpis(orders);
  renderTable(orders);
}

function showDashboard() {
  loginCard.classList.add('hidden');
  dashboard.classList.remove('hidden');
  refreshDashboard();
}

function showLogin() {
  dashboard.classList.add('hidden');
  loginCard.classList.remove('hidden');
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

  const formData = new FormData(orderForm);
  const order = {
    cliente: String(formData.get('cliente') || '').trim(),
    dataEntrega: String(formData.get('dataEntrega') || ''),
    produto: String(formData.get('produto') || '').trim(),
    tamanho: String(formData.get('tamanho') || '').trim(),
    sabor: String(formData.get('sabor') || '').trim(),
    quantidade: Number(formData.get('quantidade') || 0),
    cidade: String(formData.get('cidade') || '').trim(),
    entrega: String(formData.get('entrega') || '').trim(),
    dataDaEntrega: String(formData.get('dataDaEntrega') || ''),
    formaPagamento: String(formData.get('formaPagamento') || '').trim(),
    valor: Number(formData.get('valor') || 0),
    id: Date.now()
  };

  const hasInvalidField =
    !order.cliente ||
    !order.dataEntrega ||
    !order.produto ||
    !order.tamanho ||
    !order.sabor ||
    order.quantidade <= 0 ||
    !order.cidade ||
    !order.entrega ||
    !order.dataDaEntrega ||
    !order.formaPagamento ||
    order.valor < 0;

  if (hasInvalidField) {
    return;
  }

  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);
  orderForm.reset();
  refreshDashboard();
});

clearOrdersBtn?.addEventListener('click', () => {
  const shouldClear = window.confirm('Deseja limpar todos os pedidos cadastrados?');
  if (!shouldClear) return;

  saveOrders([]);
  refreshDashboard();
});

if (isLoggedIn()) {
  showDashboard();
} else {
  showLogin();
}

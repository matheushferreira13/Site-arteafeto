const slides = Array.from(document.querySelectorAll('.slide'));
const dots = Array.from(document.querySelectorAll('.dot'));
const prevBtn = document.querySelector('.carousel-btn.prev');
const nextBtn = document.querySelector('.carousel-btn.next');

const heroSlideImages = Array.from(document.querySelectorAll('.carousel-track img[data-desktop-src]'));

function updateHeroSlideImageByViewport() {
  if (heroSlideImages.length === 0) return;
  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  heroSlideImages.forEach((img) => {
    const desktopSrc = img.dataset.desktopSrc || img.getAttribute('src');
    const mobileSrc = img.dataset.mobileSrc;
    const nextSrc = isMobile && mobileSrc ? mobileSrc : desktopSrc;
    if (nextSrc && img.getAttribute('src') !== nextSrc) {
      img.setAttribute('src', nextSrc);
    }
  });
}

heroSlideImages.forEach((img) => {
  img.addEventListener('error', () => {
    const desktopSrc = img.dataset.desktopSrc;
    if (desktopSrc && img.getAttribute('src') !== desktopSrc) {
      img.setAttribute('src', desktopSrc);
    }
  });
});

updateHeroSlideImageByViewport();
window.addEventListener('resize', updateHeroSlideImageByViewport);

if (slides.length > 0 && dots.length === slides.length) {
  let current = 0;
  let timer;

  const setActiveSlide = (index) => {
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
    });

    current = index;
  };

  const nextSlide = () => {
    const next = (current + 1) % slides.length;
    setActiveSlide(next);
  };

  const prevSlide = () => {
    const prev = (current - 1 + slides.length) % slides.length;
    setActiveSlide(prev);
  };

  const restartTimer = () => {
    window.clearInterval(timer);
    timer = window.setInterval(nextSlide, 5000);
  };

  nextBtn?.addEventListener('click', () => {
    nextSlide();
    restartTimer();
  });

  prevBtn?.addEventListener('click', () => {
    prevSlide();
    restartTimer();
  });

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      setActiveSlide(index);
      restartTimer();
    });
  });

  setActiveSlide(0);
  restartTimer();
}

// ── Cart ──────────────────────────────────────────────────────────────────────

const cart = [];

const cartBtn     = document.getElementById('cartBtn');
const cartBadge   = document.getElementById('cartBadge');
const cartDrawer  = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose   = document.getElementById('cartClose');
const cartList    = document.getElementById('cartList');
const cartEmpty   = document.getElementById('cartEmpty');
const cartFoot    = document.getElementById('cartFoot');
const cartTotal   = document.getElementById('cartTotal');
const cartSend    = document.getElementById('cartSend');

function formatPrice(value) {
  return 'R$ ' + value.toFixed(2).replace('.', ',');
}

function renderCart() {
  cartList.innerHTML = '';

  const isEmpty  = cart.length === 0;
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const total    = cart.reduce((s, i) => s + i.price * i.qty, 0);

  cartEmpty.style.display = isEmpty ? 'block' : 'none';
  cartFoot.style.display  = isEmpty ? 'none'  : 'flex';
  cartBadge.classList.toggle('hidden', isEmpty);
  cartBadge.textContent = totalQty;
  cartTotal.textContent = formatPrice(total);

  cart.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <div class="cart-item-name">${item.name}</div>
      <div class="cart-qty">
        <button aria-label="Diminuir quantidade" data-action="dec" data-idx="${idx}">−</button>
        <span>${item.qty}</span>
        <button aria-label="Aumentar quantidade" data-action="inc" data-idx="${idx}">+</button>
      </div>
      <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
    `;
    cartList.appendChild(li);
  });
}

const ADMIN_ORDER_KEY = 'arteafeto_admin_orders';
const API_BASE_URL = window.ARTEAFETO_API_BASE_URL || 'http://localhost:3000/api';
const ORDER_POST_ENDPOINT = `${API_BASE_URL}/orders`;
const CART_SUBMISSION_GUARD_KEY = 'arteafeto_cart_submission_guard';
const CART_SUBMISSION_GUARD_TTL_MS = 120000;
const CART_ORDER_GUARD_KEY = 'arteafeto_cart_order_guard';
const CART_ORDER_GUARD_TTL_MS = 180000;
const CART_ORDER_INFLIGHT_KEY = 'arteafeto_cart_order_inflight';
const CART_ORDER_INFLIGHT_TTL_MS = 90000;
let isCartSubmitting = false;

function buildXanoOrderPayload(order) {
  return {
    cliente: order.cliente,
    data_entrega: order.dataEntrega,
    produto: order.produto,
    tamanho: order.tamanho,
    sabor: order.sabor,
    quantidade: Number(order.quantidade),
    cidade: order.cidade,
    forma_pagamento: order.formaPagamento,
    valor: Number(order.valor)
  };
}

async function sendOrderToXano(order) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(ORDER_POST_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(buildXanoOrderPayload(order))
  });

  if (!response.ok) {
    throw new Error(`Falha ao enviar pedido para Xano. Status: ${response.status}`);
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildCartSubmissionSignature({ cliente, cidade, dataEntrega, formaPagamento, cartItems }) {
  const itemsSignature = cartItems
    .map((item) => `${item.product || item.name}|${item.size || '-'}|${item.flavor || '-'}|${item.qty}|${Number(item.price).toFixed(2)}`)
    .sort()
    .join('||');

  return `${cliente}|${cidade}|${dataEntrega}|${formaPagamento}|${itemsSignature}`;
}

function isDuplicateCartSubmission(signature) {
  try {
    const raw = localStorage.getItem(CART_SUBMISSION_GUARD_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return false;

    const ageMs = Date.now() - Number(parsed.ts || 0);
    return parsed.signature === signature && ageMs >= 0 && ageMs < CART_SUBMISSION_GUARD_TTL_MS;
  } catch {
    return false;
  }
}

function saveCartSubmissionGuard(signature) {
  try {
    localStorage.setItem(CART_SUBMISSION_GUARD_KEY, JSON.stringify({ signature, ts: Date.now() }));
  } catch {
    // ignore storage failures
  }
}

function buildOrderSignature(order) {
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

function getOrderGuardMap() {
  try {
    const raw = localStorage.getItem(CART_ORDER_GUARD_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveOrderGuardMap(guardMap) {
  try {
    localStorage.setItem(CART_ORDER_GUARD_KEY, JSON.stringify(guardMap));
  } catch {
    // ignore storage failures
  }
}

function getOrderInflightMap() {
  try {
    const raw = localStorage.getItem(CART_ORDER_INFLIGHT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveOrderInflightMap(map) {
  try {
    localStorage.setItem(CART_ORDER_INFLIGHT_KEY, JSON.stringify(map));
  } catch {
    // ignore storage failures
  }
}

function cleanupOrderInflightMap(map) {
  const now = Date.now();
  Object.keys(map).forEach((key) => {
    const ageMs = now - Number(map[key] || 0);
    if (!map[key] || ageMs < 0 || ageMs > CART_ORDER_INFLIGHT_TTL_MS) {
      delete map[key];
    }
  });
}

function acquireOrderInflightLock(order) {
  const signature = buildOrderSignature(order);
  const inflightMap = getOrderInflightMap();
  cleanupOrderInflightMap(inflightMap);
  if (inflightMap[signature]) return false;
  inflightMap[signature] = Date.now();
  saveOrderInflightMap(inflightMap);
  return true;
}

function releaseOrderInflightLock(order) {
  const signature = buildOrderSignature(order);
  const inflightMap = getOrderInflightMap();
  if (!inflightMap[signature]) return;
  delete inflightMap[signature];
  saveOrderInflightMap(inflightMap);
}

function wasOrderSentRecently(order) {
  const signature = buildOrderSignature(order);
  const guardMap = getOrderGuardMap();
  const lastSentAt = Number(guardMap[signature] || 0);
  if (!lastSentAt) return false;
  const ageMs = Date.now() - lastSentAt;
  return ageMs >= 0 && ageMs < CART_ORDER_GUARD_TTL_MS;
}

function markOrderAsSent(order) {
  const signature = buildOrderSignature(order);
  const guardMap = getOrderGuardMap();
  guardMap[signature] = Date.now();
  saveOrderGuardMap(guardMap);
}

function addToCart(name, price, meta = {}) {
  const existing = cart.find(i => i.name === name);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ name, price, qty: 1, ...meta });
  }
  renderCart();
  openCart();
}

function openCart() {
  cartDrawer.classList.add('is-open');
  cartDrawer.setAttribute('aria-hidden', 'false');
  cartClose.focus();
}

function closeCart() {
  cartDrawer.classList.remove('is-open');
  cartDrawer.setAttribute('aria-hidden', 'true');
  cartBtn.focus();
}

cartBtn?.addEventListener('click', openCart);
cartClose?.addEventListener('click', closeCart);
cartOverlay?.addEventListener('click', closeCart);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && cartDrawer.classList.contains('is-open')) {
    closeCart();
  }
});

cartList?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const idx = parseInt(btn.dataset.idx, 10);
  if (btn.dataset.action === 'inc') {
    cart[idx].qty++;
  } else {
    cart[idx].qty--;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
  }
  renderCart();
});

cartSend?.addEventListener('click', async () => {
  if (isCartSubmitting) return;
  if (cart.length === 0) return;

  const cliente       = document.getElementById('cartCliente')?.value.trim() || '';
  const cidade        = document.getElementById('cartCidade')?.value || '';
  const dataEntrega   = document.getElementById('cartDataEntrega')?.value || '';
  const formaPagamento = document.getElementById('cartFormaPagamento')?.value || '';
  const errorEl       = document.getElementById('cartFieldsError');

  if (!cliente || !cidade || !dataEntrega || !formaPagamento) {
    errorEl?.classList.remove('hidden');
    document.getElementById('cartCliente')?.focus();
    return;
  }
  errorEl?.classList.add('hidden');

  const submissionSignature = buildCartSubmissionSignature({
    cliente,
    cidade,
    dataEntrega,
    formaPagamento,
    cartItems: cart
  });

  if (isDuplicateCartSubmission(submissionSignature)) {
    console.warn('Pedido muito recente com os mesmos dados. Bloqueado para evitar duplicidade.');
    return;
  }

  isCartSubmitting = true;
  if (cartSend) {
    cartSend.disabled = true;
    cartSend.dataset.originalText = cartSend.textContent || '';
    cartSend.textContent = 'Enviando...';
  }

  try {

  // Salvar no localStorage para aparecer no dashboard admin
  try {
    const existing = JSON.parse(localStorage.getItem(ADMIN_ORDER_KEY) || '[]');
    const batchTs  = Date.now();
    const newOrders = cart.map((item, idx) => ({
      id:             batchTs + idx,
      cliente,
      dataEntrega,
      produto:        item.product || item.name,
      tamanho:        item.size    || '-',
      sabor:          item.flavor  || '-',
      quantidade:     item.qty,
      cidade,
      formaPagamento,
      valor:          parseFloat((item.price * item.qty).toFixed(2))
    }));

    let successCount = 0;
    const failedOrders = [];
    for (const order of newOrders) {
      if (wasOrderSentRecently(order)) {
        console.warn('Pedido duplicado recente detectado. POST ignorado para evitar duplicidade no Xano.');
        continue;
      }

      if (!acquireOrderInflightLock(order)) {
        console.warn('Pedido em envio simultaneo detectado. POST ignorado para evitar duplicidade no Xano.');
        continue;
      }

      try {
        const created = await sendOrderToXano(order);
        const externalId = created?.id ?? created?.order_id ?? null;
        if (externalId) {
          order.externalId = externalId;
        }
        successCount += 1;
        markOrderAsSent(order);
      } catch (error) {
        console.error('Erro ao enviar pedido do carrinho para Xano:', error);
        failedOrders.push(order);
      } finally {
        releaseOrderInflightLock(order);
      }
    }

    if (failedOrders.length > 0) {
      localStorage.setItem(ADMIN_ORDER_KEY, JSON.stringify([...failedOrders, ...existing]));
    }

    const failedCount = newOrders.length - successCount;
    if (failedCount > 0) {
      console.warn(`${failedCount} pedido(s) do carrinho não foram enviados ao Xano.`);
    }
  } catch (_) { /* localStorage indisponível */ }

  const dateFormatted = dataEntrega ? dataEntrega.split('-').reverse().join('/') : '';
  const lines = cart.map(i => `• ${i.name} x${i.qty} — ${formatPrice(i.price * i.qty)}`).join('\n');
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const msg   = `Olá! Gostaria de fazer o seguinte pedido:\n\nNome: ${cliente}\nCidade: ${cidade}\nData de entrega: ${dateFormatted}\nPagamento: ${formaPagamento}\n\n${lines}\n\nTotal: ${formatPrice(total)}`;
  const url   = `https://wa.me/5535999597652?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank', 'noopener,noreferrer');

  saveCartSubmissionGuard(submissionSignature);

  cart.length = 0;
  renderCart();

  const cartClienteInput = document.getElementById('cartCliente');
  const cartCidadeInput = document.getElementById('cartCidade');
  const cartDataEntregaInput = document.getElementById('cartDataEntrega');
  const cartFormaPagamentoInput = document.getElementById('cartFormaPagamento');
  if (cartClienteInput) cartClienteInput.value = '';
  if (cartCidadeInput) cartCidadeInput.value = '';
  if (cartDataEntregaInput) cartDataEntregaInput.value = '';
  if (cartFormaPagamentoInput) cartFormaPagamentoInput.value = '';

  } finally {
    if (cartSend) {
      cartSend.disabled = false;
      cartSend.textContent = cartSend.dataset.originalText || 'Enviar pedido';
      delete cartSend.dataset.originalText;
    }
    isCartSubmitting = false;
  }
});

// Size chip selection
document.querySelectorAll('.size-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const sizePicker = chip.closest('.size-picker');
    sizePicker.querySelectorAll('.size-chip').forEach(c => c.classList.remove('is-selected'));
    chip.classList.add('is-selected');
    sizePicker.classList.remove('has-error');

    // Update price display and add-to-cart button
    const card = chip.closest('.product-card');
    const priceDisplay = card.querySelector('.ovo-price');
    const addBtn = card.querySelector('.btn-add-cart');
    const price = chip.dataset.price;
    const size  = chip.dataset.size;
    if (priceDisplay) {
      priceDisplay.textContent = 'R$ ' + parseFloat(price).toFixed(2).replace('.', ',');
    }
    if (addBtn) {
      addBtn.dataset.price = price;
      addBtn.dataset.size  = size;
    }
  });
});

// Flavor chip selection
document.querySelectorAll('.flavor-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const picker = chip.closest('.flavor-picker');
    picker.querySelectorAll('.flavor-chip').forEach(c => c.classList.remove('is-selected'));
    chip.classList.add('is-selected');
    picker.classList.remove('has-error');
  });
});

document.querySelectorAll('.btn-add-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    const card       = btn.closest('.product-card');
    const sizePicker = card?.querySelector('.size-picker');
    const picker     = card?.querySelector('.flavor-picker');
    const hasFlavorOptions = Boolean(picker?.querySelector('.flavor-chip'));

    // Validate size if card has a size picker
    if (sizePicker) {
      const selectedSize = sizePicker.querySelector('.size-chip.is-selected');
      if (!selectedSize) {
        sizePicker.classList.remove('has-error');
        void sizePicker.offsetWidth;
        sizePicker.classList.add('has-error');
        return;
      }
    }

    if (hasFlavorOptions) {
      let selected = picker.querySelector('.flavor-chip.is-selected');
      if (!selected && btn.dataset.name === 'Kit Mini Confeiteiro') {
        const firstFlavor = picker.querySelector('.flavor-chip');
        if (firstFlavor) {
          firstFlavor.classList.add('is-selected');
          selected = firstFlavor;
        }
      }
      if (!selected) {
        picker.classList.remove('has-error');
        void picker.offsetWidth;
        picker.classList.add('has-error');
        return;
      }
      const size = btn.dataset.size ? ` ${btn.dataset.size}` : '';
      const itemName = selected.dataset.cartLabel || `${btn.dataset.name}${size} — ${selected.dataset.flavor}`;
      addToCart(itemName, parseFloat(btn.dataset.price), {
        product: btn.dataset.name,
        size:    btn.dataset.size  || '-',
        flavor:  selected.dataset.flavor || '-'
      });
    } else {
      addToCart(btn.dataset.name, parseFloat(btn.dataset.price), {
        product: btn.dataset.name,
        size:    '-',
        flavor:  '-'
      });
    }
  });
});

renderCart();

// Menu scrollspy
const menuLinks = Array.from(document.querySelectorAll('.menu-links a[href^="#"]'));
const menuSections = menuLinks
  .map(link => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

function setActiveMenuLink(id) {
  menuLinks.forEach(link => {
    const isActive = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('is-active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

if (menuLinks.length > 0 && menuSections.length > 0) {
  const updateActiveSection = () => {
    const menu = document.querySelector('.menu');
    const menuHeight = menu?.offsetHeight || 0;
    const y = window.scrollY + menuHeight + 40;

    let current = menuSections[0];
    menuSections.forEach(section => {
      if (section.offsetTop <= y) {
        current = section;
      }
    });

    setActiveMenuLink(current.id);
  };

  window.addEventListener('scroll', updateActiveSection, { passive: true });
  window.addEventListener('resize', updateActiveSection);
  updateActiveSection();
}

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

function addToCart(name, price) {
  const existing = cart.find(i => i.name === name);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ name, price, qty: 1 });
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

cartSend?.addEventListener('click', () => {
  if (cart.length === 0) return;
  const lines = cart.map(i => `• ${i.name} x${i.qty} — ${formatPrice(i.price * i.qty)}`).join('\n');
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const msg   = `Olá! Gostaria de fazer o seguinte pedido:\n\n${lines}\n\nTotal: ${formatPrice(total)}`;
  const url   = `https://wa.me/5535999597652?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
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

    if (picker) {
      const selected = picker.querySelector('.flavor-chip.is-selected');
      if (!selected) {
        picker.classList.remove('has-error');
        void picker.offsetWidth;
        picker.classList.add('has-error');
        return;
      }
      const size = btn.dataset.size ? ` ${btn.dataset.size}` : '';
      const itemName = selected.dataset.cartLabel || `${btn.dataset.name}${size} — ${selected.dataset.flavor}`;
      addToCart(itemName, parseFloat(btn.dataset.price));
    } else {
      addToCart(btn.dataset.name, parseFloat(btn.dataset.price));
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

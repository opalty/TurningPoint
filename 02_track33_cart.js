async function loadCart() {
  try {
    const response = await fetch('02_track33_cart.html');
    const html = await response.text();

    document.getElementById('cart-container').innerHTML = html;

    initCartActions();
    initCartManager();
  } catch (error) {
    console.error('장바구니 로드 실패:', error);
  }
}


function initCartActions() {
  const cartIcon = document.querySelector('.header-right .icons a[aria-label="장바구니"]');
  const cartSidebar = document.querySelector('.cart-sidebar');
  const cartOverlay = document.querySelector('.cart-overlay');
  const closeBtn = document.querySelector('.cart-close-btn');

  function openCart(e) {
    if (e) e.preventDefault();
    cartSidebar.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    updateSubtotal(); // 열 때 가격 갱신
  }

  function closeCart() {
    cartSidebar.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (cartIcon) cartIcon.addEventListener('click', openCart);
  if (closeBtn) closeBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
}


function initCartManager() {
  const cartList = document.querySelector(".cart-item-list");

  cartList.addEventListener("click", (e) => {
    const target = e.target;
    const btn = target.closest("button");
    if (!btn) return;

    const item = btn.closest(".cart-item");
    
    if (btn.classList.contains("cart-item-delete")) {
      item.remove();
      updateSubtotal();
      return;
    }

    const qtyValue = item.querySelector(".qty-value");
    let quantity = parseInt(qtyValue.textContent);

    if (btn.classList.contains("cart-plus")) {
      quantity++;
    }

    if (btn.classList.contains("cart-minus") && quantity > 1) {
      quantity--;
    }

    qtyValue.textContent = quantity;
    updateSubtotal();
  });
}

function updateSubtotal() {
  const finalPriceEl = document.querySelector(".cart-final-price");
  const shippingEl = document.querySelector(".shipping-cost");
  
  if (!finalPriceEl || !shippingEl) return;

  let itemTotal = 0;
  const items = document.querySelectorAll(".cart-item");

  items.forEach((item) => {
    const priceText = item.querySelector(".cart-item-price").textContent;
    const price = parseInt(priceText.replace(/[^0-9]/g, "")); 
    const qty = parseInt(item.querySelector(".qty-value").textContent);
    
    itemTotal += price * qty;
  });

  let shippingCost = 0;
  if (itemTotal > 0) {
    shippingCost = 2500;
  }

  const finalTotal = itemTotal + shippingCost;

  shippingEl.textContent = "₩" + shippingCost.toLocaleString();
  finalPriceEl.textContent = "₩" + finalTotal.toLocaleString();
}

document.addEventListener("DOMContentLoaded", loadCart);

window.updateCartSubtotal = updateSubtotal;
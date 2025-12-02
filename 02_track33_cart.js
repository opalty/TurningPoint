// 파일명: 02_track33_cart.js

// 1. HTML 불러오기 및 초기화
async function loadCart() {
  try {
    const response = await fetch('02_track33_cart.html');
    const html = await response.text();

    document.getElementById('cart-container').innerHTML = html;

    // HTML 로드 후 기능 초기화
    initCartActions();    // 열기/닫기
    initCartManager();    // 수량 조절, 삭제, 합계 계산
  } catch (error) {
    console.error('장바구니 로드 실패:', error);
  }
}

// 2. 장바구니 열기/닫기 기능
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

// 3. 장바구니 관리 (수량 조절 + 삭제 + 합계)
function initCartManager() {
  const cartList = document.querySelector(".cart-item-list");

  // 이벤트 위임
  cartList.addEventListener("click", (e) => {
    const target = e.target;
    const btn = target.closest("button");
    if (!btn) return;

    const item = btn.closest(".cart-item");
    
    // A. 삭제 버튼
    if (btn.classList.contains("cart-item-delete")) {
      item.remove();
      updateSubtotal();
      return;
    }

    const qtyValue = item.querySelector(".qty-value");
    let quantity = parseInt(qtyValue.textContent);

    // B. 플러스 버튼
    if (btn.classList.contains("cart-plus")) {
      quantity++;
    }

    // C. 마이너스 버튼
    if (btn.classList.contains("cart-minus") && quantity > 1) {
      quantity--;
    }

    qtyValue.textContent = quantity;
    updateSubtotal();
  });
}

// 4. 가격 합계 계산 함수 (배송비 포함 수정됨)
function updateSubtotal() {
  const finalPriceEl = document.querySelector(".cart-final-price");
  const shippingEl = document.querySelector(".shipping-cost");
  
  // HTML 로드 전이라 요소가 없으면 중단
  if (!finalPriceEl || !shippingEl) return;

  let itemTotal = 0;
  const items = document.querySelectorAll(".cart-item");

  // 1. 상품 금액 합계 계산
  items.forEach((item) => {
    const priceText = item.querySelector(".cart-item-price").textContent;
    const price = parseInt(priceText.replace(/[^0-9]/g, "")); 
    const qty = parseInt(item.querySelector(".qty-value").textContent);
    
    itemTotal += price * qty;
  });

  // 2. 배송비 계산 (상품이 없으면 배송비도 0원)
  let shippingCost = 0;
  if (itemTotal > 0) {
    shippingCost = 2500;
  }

  // 3. 최종 결제 금액
  const finalTotal = itemTotal + shippingCost;

  // 4. 화면 업데이트
  shippingEl.textContent = "₩" + shippingCost.toLocaleString();
  finalPriceEl.textContent = "₩" + finalTotal.toLocaleString();
}

// DOM 로드 시 실행
document.addEventListener("DOMContentLoaded", loadCart);

// 외부(productDetail.js)에서 호출 가능하도록 전역 등록
window.updateCartSubtotal = updateSubtotal;
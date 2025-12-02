// productDetail.js

// 1. 유틸리티: "₩39,000" 같은 문자열에서 숫자만 쏙 빼내는 함수
function parseCurrencyToInt(text) {
  if (!text) return 0;
  return parseInt(text.replace(/[^0-9]/g, ""), 10) || 0;
}

// 2. 전역 변수들
// JSON 로드를 기다리기 위해 0으로 초기화
let productPrice = 0; 
let shippingCost = 2500;
let quantity = 1;
const minQuantity = 1;

// 3. 화면 가격/수량 업데이트 함수
function updateTotalPrice() {
  const quantityValueEl = document.querySelector(".product-quantity-value");
  const quantityInfo = document.querySelector("#product-quantity-info");
  const totalPriceText = document.querySelector("#product-total-price");
  const productPriceEl = document.querySelector(".product-price"); // 상품 가격 표시 요소 추가

  // productPrice가 0이면 JSON 로딩이 안 된 상태이므로 계산하지 않음
  if (productPrice === 0) return; 
  
  // 최소 수량 1 유지
  quantity = Math.max(minQuantity, quantity);

  const itemsTotal = productPrice * quantity;
  const grandTotal = itemsTotal + shippingCost;

  // 화면에 반영
  if (quantityValueEl) quantityValueEl.textContent = quantity;
  if (quantityInfo) quantityInfo.textContent = `수량 ${quantity}`;
  
  // 상품 가격 업데이트
  if (productPriceEl) {
      productPriceEl.textContent = `₩${productPrice.toLocaleString()}`;
  }

  // 결제 가격 표시
  if (totalPriceText) {
    totalPriceText.textContent = `결제 가격 ₩${grandTotal.toLocaleString()}`;
  }
}

// 4. [핵심] JSON 데이터 불러오기 함수 (ID 동적 처리)
async function loadProductData() {
  // --- ID 동적 추출 로직 시작 ---
  const urlParams = new URLSearchParams(window.location.search);
  const idFromUrl = urlParams.get('id');
  
  // URL에서 추출한 ID를 사용합니다. ID가 없거나 유효한 숫자가 아니면 0을 기본값으로 사용합니다.
  const productId = parseInt(idFromUrl) || 0; 
  // --- ID 동적 추출 로직 끝 ---
  
  const jsonFile = 'track33_products_detail.json'; 

  try {
    const response = await fetch(jsonFile);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // ID에 맞는 상품 찾기
    const product = data.products.find(p => p.id === productId);

    if (product) {
      // 1. 전역 가격 업데이트
      productPrice = product.price;

      // 2. HTML 메타 정보 업데이트
      document.querySelector(".product-album-img").src = product.frontImage;
      document.querySelector(".product-album-img").alt = product.title;
      document.querySelector(".product-album-title").textContent = product.title;
      document.querySelector(".product-artist").textContent = product.artist;
      document.querySelector(".product-name").textContent = product.title; // 오른쪽 상단 이름도 업데이트

      // 3. 상세 설명 컨테이너 찾기
      const detailContainer = document.querySelector("#product-dynamic-details-container");
      
      // 기존의 복잡한 하드코딩 삭제 로직을 제거하고, 컨테이너만 사용
      if (detailContainer) {
          let detailHtml = '';

          // 트랙리스트 삽입
          if (product.tracklist && product.tracklist.length > 0) {
            detailHtml += '<hr>'; // 구분을 위해 추가
            detailHtml += '<p class="product-section-title">Tracklist</p>';
            product.tracklist.forEach((track, index) => {
              detailHtml += `<p class="product-track">${index + 1}. ${track}</p>`;
            });
            detailHtml += '<br><br>';
          }

          // 유튜브 삽입
          if (product.youtubeEmbedUrl) {
              detailHtml += `
                <iframe width="560" height="315" src="${product.youtubeEmbedUrl}"
                  title="YouTube video player" frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
              `;
          }
          
          // 일반 상품 설명 삽입 (JSON에 descriptionHtml 필드가 있다면)
          if (product.descriptionHtml) {
              detailHtml += '<hr>' + product.descriptionHtml;
          }
          
          // HTML 내용 삽입
          detailContainer.innerHTML = detailHtml;
      }
      
      // 5. 최종 가격 업데이트
      updateTotalPrice();
      
    } else {
      console.error(`Product with ID ${productId} not found.`);
      // 상품이 없을 경우 사용자에게 메시지를 표시하는 로직 추가 가능
      // 예: document.querySelector(".product-album-title").textContent = "상품을 찾을 수 없습니다.";
      productPrice = 39000; // 기본값으로 대체
      updateTotalPrice();
    }

  } catch (error) {
    console.error('Error loading product data:', error);
    // JSON 로드 실패 시, 기본값으로 가격 업데이트
    productPrice = 39000; 
    updateTotalPrice();
  }
}


// 5. 페이지가 다 열리면 실행되는 코드들
document.addEventListener("DOMContentLoaded", () => {
  // (1) 초기 상품 설정 및 가격 업데이트 시작
  loadProductData(); // JSON 로딩 함수 호출

  // (2) 수량 + - 버튼 기능
  const minusBtn = document.querySelector(".minus");
  const plusBtn = document.querySelector(".plus");

  if (plusBtn) {
    plusBtn.addEventListener("click", () => {
      quantity++;
      updateTotalPrice();
    });
  }

  if (minusBtn) {
    minusBtn.addEventListener("click", () => {
      if (quantity > 1) quantity--;
      updateTotalPrice();
    });
  }

  // (3) 찜하기(하트) 버튼
  const favoriteBtn = document.getElementById("product-favorite");
  if (favoriteBtn) {
    favoriteBtn.addEventListener("click", () => {
      const active = favoriteBtn.classList.toggle("active");
      favoriteBtn.textContent = active ? "favorite" : "favorite_border";
    });
  }

  // (4) 장바구니 담기 버튼
  const addToCartBtn = document.querySelector(".add-to-cart");
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", (e) => {
      e.preventDefault();
      addItemToCart();
    });
  }
});

// 6. 장바구니 추가 함수 (생략되지 않음)
function addItemToCart() {
  // JSON 로드가 완료된 후의 전역 변수와 HTML 요소를 사용
  const title = document.querySelector(".product-album-title") ? document.querySelector(".product-album-title").textContent : "기본 상품명";
  const artist = document.querySelector(".product-artist") ? document.querySelector(".product-artist").textContent : "기본 아티스트";
  
  // JSON에서 로드된 productPrice를 활용하여 가격 텍스트 생성
  const priceText = "₩" + productPrice.toLocaleString(); 
  const imgSrc = document.querySelector(".product-album-img") ? document.querySelector(".product-album-img").src : "기본 이미지 경로";
  
  // 현재 화면의 수량 전역 변수 사용
  const quantityToAdd = quantity; 

  const cartList = document.querySelector(".cart-item-list");
  const existingItems = cartList ? cartList.querySelectorAll(".cart-item") : [];
  let itemExists = false;

  // 장바구니 중복 검사
  existingItems.forEach((item) => {
    const itemTitle = item.querySelector(".cart-item-title").textContent;
    if (itemTitle === title) {
      const qtyElement = item.querySelector(".qty-value");
      if(qtyElement) {
        let currentQty = parseInt(qtyElement.textContent);
        qtyElement.textContent = currentQty + quantityToAdd;
      }
      itemExists = true;
    }
  });

  // 새 상품 추가
  if (!itemExists && cartList) {
    const newItem = document.createElement("li");
    newItem.classList.add("cart-item");

    newItem.innerHTML = `
      <div class="cart-item-img">
        <img src="${imgSrc}" alt="${title}">
      </div>
      <div class="cart-item-info">
        <div class="cart-item-top">
          <span class="cart-item-title">${title}</span>
          <button class="cart-item-delete">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
        <p class="cart-item-price">${priceText}</p>
        <div class="cart-item-options">
          <span class="artist-name">Artist: ${artist}</span>
        </div>
        <div class="cart-quantity-control">
          <button class="qty-btn cart-minus">−</button>
          <span class="qty-value">${quantityToAdd}</span>
          <button class="qty-btn cart-plus">+</button>
        </div>
      </div>
    `;
    cartList.appendChild(newItem);
  }

  // 장바구니 열기
  const cartSidebar = document.querySelector(".cart-sidebar");
  const cartOverlay = document.querySelector(".cart-overlay");

  if (cartSidebar) cartSidebar.classList.add("active");
  if (cartOverlay) cartOverlay.classList.add("active");
  document.body.style.overflow = "hidden";

  // 가격 업데이트 호출
  if (window.updateCartSubtotal) {
    window.updateCartSubtotal();
  }
}
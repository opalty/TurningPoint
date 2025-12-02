import { products } from "./products.js";

// 렌더 함수 (carousel에 들어갈 카드만 렌더)
function renderCarouselCards(productList, track) {
  track.innerHTML = ""; // 초기화
  productList.forEach((p) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="wish">
        <input type="checkbox" id="w${p.id}" />
        <label for="w${p.id}"><span class="material-symbols-outlined">favorite</span></label>
      </div>
      <a href="${p.link}">
        <div class="pic">
          <img class="front" src="${p.frontImg}" alt="${p.title} front" />
          <img class="back" src="${p.backImg}" alt="${p.title} back" />
        </div>
        <div class="title">${p.title}</div>
        <div class="price">₩${p.price.toLocaleString()}</div>
      </a>
    `;
    track.appendChild(card);
  });
}

// 초기화 및 이벤트 바인딩
const recommendedIds = [1, 2, 3, 4, 5]; // 필요시 변경
const track = document.querySelector(".product-carousel-track");
const prevBtn = document.querySelector(".product-carousel-btn.prev");
const nextBtn = document.querySelector(".product-carousel-btn.next");
const dotsContainer = document.querySelector(".product-carousel-dots");

if (track && prevBtn && nextBtn && dotsContainer) {
  const recommended = products.filter(p => recommendedIds.includes(p.id));
  renderCarouselCards(recommended, track);

  // 상태값
  let currentIndex = 0;
  const itemsToShow = 3;
  const totalItems = recommended.length;
  let itemWidth = 0;
  let gap = 0;
  let maxIndex = Math.max(0, totalItems - itemsToShow);

  // Dots 생성
  function createDots() {
    dotsContainer.innerHTML = "";
    const pages = maxIndex + 1;
    for (let i = 0; i < pages; i++) {
      const b = document.createElement("button");
      if (i === 0) b.classList.add("active");
      b.dataset.index = i;
      b.addEventListener("click", () => {
        currentIndex = i;
        updateCarousel();
      });
      dotsContainer.appendChild(b);
    }
  }

  // 실제 itemWidth와 gap을 계산
  function calcSizes() {
    const first = track.querySelector(".card");
    if (!first) return;
    const rect = first.getBoundingClientRect();
    itemWidth = rect.width;
    // gap 읽기 (브라우저 지원: getComputedStyle(track).gap)
    const cs = getComputedStyle(track);
    gap = parseFloat(cs.gap || cs.columnGap || 0);
    maxIndex = Math.max(0, totalItems - itemsToShow);
    // 재생성: dots 갯수는 maxIndex+1
    createDots();
    updateCarousel();
  }

  // 트랙 이동
  function updateCarousel() {
    // 이동 거리 = (itemWidth + gap) * currentIndex
    const distance = (itemWidth + gap) * currentIndex;
    track.style.transform = `translateX(-${distance}px)`;

    // dots active 동기화
    const dots = dotsContainer.querySelectorAll("button");
    dots.forEach(d => d.classList.remove("active"));
    if (dots[currentIndex]) dots[currentIndex].classList.add("active");
  }

  // 버튼 이벤트 (무한 루프: 끝→처음, 처음→끝)
  nextBtn.addEventListener("click", () => {
    if (currentIndex < maxIndex) currentIndex++;
    else currentIndex = 0;
    updateCarousel();
  });

  prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) currentIndex--;
    else currentIndex = maxIndex;
    updateCarousel();
  });

  // 이미지 로드 이후와 윈도우 리사이즈 시 다시 계산
  // (이미지 때문에 card width가 변할 수 있으니 안전하게 계산)
  window.addEventListener("resize", () => {
    // small delay to allow layout to settle
    setTimeout(calcSizes, 50);
  });

  // 이미지가 늦게 로드되는 경우 대비
  const imgs = track.querySelectorAll("img");
  let loaded = 0;
  if (imgs.length === 0) {
    calcSizes();
  } else {
    imgs.forEach(img => {
      if (img.complete) {
        loaded++;
      } else {
        img.addEventListener("load", () => {
          loaded++;
          if (loaded === imgs.length) calcSizes();
        });
        img.addEventListener("error", () => {
          loaded++;
          if (loaded === imgs.length) calcSizes();
        });
      }
    });
    // 만약 모두 이미 로드된 상태면 계산
    if (loaded === imgs.length) calcSizes();
  }

  // 초기 계산 (타이밍 문제를 줄이기 위해 약간의 딜레이)
  setTimeout(calcSizes, 40);
}

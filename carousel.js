const track = document.querySelector(".product-carousel-track");
const items = document.querySelectorAll(".product-recommend-item");
const prevBtn = document.querySelector(".product-carousel-btn.prev");
const nextBtn = document.querySelector(".product-carousel-btn.next");
const dotsContainer = document.querySelector(".product-carousel-dots");

const itemsPerPage = 3; // 한 번에 보여줄 개수
const totalPages = Math.ceil(items.length / itemsPerPage);

let currentIndex = 0;

// 점(Dots) 생성
for (let i = 0; i < totalPages; i++) {
  const dot = document.createElement("button");
  if (i === 0) dot.classList.add("active");
  dotsContainer.appendChild(dot);

  dot.addEventListener("click", () => {
    currentIndex = i;
    updateCarousel();
  });
}

const dots = dotsContainer.querySelectorAll("button");

// 슬라이드 업데이트 함수
function updateCarousel() {
  const distance = -(100 * currentIndex);
  track.style.transform = `translateX(${distance}%)`;

  dots.forEach(dot => dot.classList.remove("active"));
  dots[currentIndex].classList.add("active");
}

// 버튼 클릭 이벤트
nextBtn.addEventListener("click", () => {
  if (currentIndex < totalPages - 1) {
    currentIndex++;
  } else {
    currentIndex = 0; // 마지막 → 처음으로
  }
  updateCarousel();
});

prevBtn.addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
  } else {
    currentIndex = totalPages - 1; // 처음 → 마지막으로
  }
  updateCarousel();
});

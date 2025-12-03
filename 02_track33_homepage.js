/* ============================
   스크롤 시 헤더 등장 (homepage 전용)
============================ */
document.addEventListener("scroll", () => {
  const header = document.getElementById("header");
  const scrollY = window.scrollY;

  if (scrollY > window.innerHeight) {
    header.classList.add("show");
  } else {
    header.classList.remove("show");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // 스크롤 리빌 애니메이션 (나타났다 사라지기)
  const revealElements = document.querySelectorAll(".js-reveal");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      } else {
        entry.target.classList.remove("is-visible");
      }
    });
  }, { threshold: 0.15 }); 

  revealElements.forEach((el) => observer.observe(el));
});

/* ============================================================
   Hero Gradient Control (스크롤에 따라 안개 등장)
   ============================================================ */
document.addEventListener("scroll", () => {
  const gradient = document.querySelector(".hero-gradient");
  
  if (gradient) {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;

    let opacity = Math.min(scrollY / 500, 1);
    
    gradient.style.opacity = opacity;
  }
});


/* ============================================================
   Selection Section (Digging) Animation
   ============================================================ */
const selectionSection = document.querySelector(".selection-visual");
const selectionText = document.querySelector(".selection-text-wrapper");

if (selectionSection && selectionText) {
  const selectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {

      if (entry.isIntersecting) {
        selectionSection.classList.add("is-visible");
        selectionText.classList.add("is-visible");
      } 

      else {
        selectionSection.classList.remove("is-visible");
        selectionText.classList.remove("is-visible");
      }
    });
  }, { threshold: 0.2 }); 


  selectionObserver.observe(selectionSection); 
}

/* ============================
   playlist 캐러셀 (무한 루프)
============================ */
document.addEventListener("DOMContentLoaded", () => {
  const track = document.querySelector(".nice-track");
  const prevBtn = document.querySelector(".nice-arrow.prev");
  const nextBtn = document.querySelector(".nice-arrow.next");

  const gap = 16;
  let cards = Array.from(track.children);
  let cardWidth = cards[0].getBoundingClientRect().width + gap;
  let isMoving = false;

  const DURATION = 600; 
  const EASING = "cubic-bezier(.45, .05, .55, .95)";

  function moveNext() {
    if (isMoving) return;
    isMoving = true;

    track.style.transition = `transform ${DURATION}ms ${EASING}`;
    track.style.transform = `translateX(${-cardWidth}px)`;

    track.addEventListener("transitionend", function handler() {
      track.style.transition = "none";
      track.style.transform = "translateX(0)";
      track.appendChild(track.firstElementChild);

      isMoving = false;
      track.removeEventListener("transitionend", handler);
    });
  }

  function movePrev() {
    if (isMoving) return;
    isMoving = true;

    track.style.transition = "none";
    track.insertBefore(track.lastElementChild, track.firstElementChild);
    track.style.transform = `translateX(${-cardWidth}px)`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        track.style.transition = `transform ${DURATION}ms ${EASING}`;
        track.style.transform = "translateX(0)";
      });
    });

    track.addEventListener("transitionend", function handler() {
      track.style.transition = "none";
      isMoving = false;
      track.removeEventListener("transitionend", handler);
    });
  }

  prevBtn.addEventListener("click", () => {
    movePrev();
    resetAutoSlide();
  });

  nextBtn.addEventListener("click", () => {
    moveNext();
    resetAutoSlide();
  });

  let autoSlide = setInterval(() => {
    if (!isMoving) moveNext();
  }, 3000);

  function resetAutoSlide() {
    clearInterval(autoSlide);
    autoSlide = setInterval(() => {
      if (!isMoving) moveNext();
    }, 3000);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const revealElements = document.querySelectorAll(".js-reveal");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {

      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      } 
     
      else {
        entry.target.classList.remove("is-visible");
      }
    });
  }, { threshold: 0.15 }); 

  revealElements.forEach((el) => observer.observe(el));
});

/* ============================
   WOW Reviews Infinite Slide
============================ */
document.addEventListener("DOMContentLoaded", () => {
  const track = document.querySelector(".wow-track");
  const cards = Array.from(track.children);

  const prevBtn = document.querySelector(".wow-arrow.prev");
  const nextBtn = document.querySelector(".wow-arrow.next");

  const VISIBLE = 4;      
  const TOTAL = cards.length;

  const clonesBefore = cards.slice(TOTAL - VISIBLE).map(c => c.cloneNode(true));
  const clonesAfter = cards.slice(0, VISIBLE).map(c => c.cloneNode(true));

  clonesBefore.forEach(c => track.insertBefore(c, track.firstChild));
  clonesAfter.forEach(c => track.appendChild(c));

  const allCards = Array.from(track.children);

  function getCardWidth() {
    const card = allCards[0];

    const cardWidth = card.getBoundingClientRect().width;

    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.gap);

    const padding = 20; 

    return cardWidth + gap;
  }

  let index = VISIBLE; 
  let isMoving = false;

  function updatePosition(animate = true) {
    const moveX = -(getCardWidth() * index);

    const finalX = moveX;

    track.style.transition = animate
      ? "transform 0.45s cubic-bezier(.45, .05, .55, .95)"
      : "none";

    track.style.transform = `translateX(${finalX}px)`;
  }

  updatePosition(false);

  track.addEventListener("transitionend", () => {
    if (index >= TOTAL + VISIBLE) {
      index = VISIBLE;
      updatePosition(false);
    }
    if (index < VISIBLE) {
      index = TOTAL + VISIBLE - 1;
      updatePosition(false);
    }
    isMoving = false;
  });

  function moveNext() {
    if (isMoving) return;
    isMoving = true;
    index++;
    updatePosition(true);
  }

  function movePrev() {
    if (isMoving) return;
    isMoving = true;
    index--;
    updatePosition(true);
  }

  nextBtn.addEventListener("click", moveNext);
  prevBtn.addEventListener("click", movePrev);

  let auto = setInterval(moveNext, 3000);

  function resetAuto() {
    clearInterval(auto);
    auto = setInterval(moveNext, 3000);
  }

  nextBtn.addEventListener("click", resetAuto);
  prevBtn.addEventListener("click", resetAuto);
});


/* =================================
    Scroll Reveal 애니메이션
================================= */
const revealElements = document.querySelectorAll(".story, .nice-section-title, .oh, .wow-section-title, .wow");

function scrollReveal() {
  revealElements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85) {
      el.classList.add("reveal");
    }
  });
}

window.addEventListener("scroll", scrollReveal);
scrollReveal(); 

/* =================================
   Scroll Reveal 애니메이션(OH + WoW section)
================================= */

document.addEventListener("DOMContentLoaded", () => {
  const revealElements = document.querySelectorAll(".js-reveal");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      } else {
        entry.target.classList.remove("is-visible");
      }
    });
  }, { threshold: 0.15 });

  revealElements.forEach((el) => observer.observe(el));
});

/* ============================================================
   Audio Exclusive Play (하나 재생 시 다른 곡 중지)
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const audioPlayers = document.querySelectorAll("audio");

  audioPlayers.forEach((player) => {
    player.addEventListener("play", (event) => {
      
      const currentAudio = event.target;

      audioPlayers.forEach((otherAudio) => {

        if (otherAudio !== currentAudio) {
          otherAudio.pause();
          
        }
      });
      
    });
  });
});
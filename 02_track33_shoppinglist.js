/* ============================================================
 * 02_track33_shoppinglist.js
 *  - 쇼핑리스트 페이지(vinyl / turntable 등) 공용 스크립트
 *  - 각 섹션(툴바 + 상품 리스트)을 "독립적으로" 제어하도록 수정
 *  - 요구사항:
 *    1) EventListener 를 사용한 사용자 상호작용
 *    2) Fetch + JSON 으로 데이터 연동
 *    3) localStorage 로 사용자 상태(위시리스트, 정렬, 검색어) 저장
 * ============================================================ */

'use strict';

// DOM 이 모두 준비된 후 실행
document.addEventListener('DOMContentLoaded', function () {
  /* ------------------------------------------------------------
   * 0. 페이지 안의 "카탈로그 섹션"을 모두 찾아서 각각 초기화
   *    - 구조 가정:
   *      <div class="catalog-toolbar"> ... 정렬/검색 ... </div>
   *      <section class="list" data-storage="vinyl" data-json="02_track33_products_vinyl.json">
   *        ... 상품 카드들 ...
   *      </section>
   * ------------------------------------------------------------ */

  // 모든 툴바(각각이 하나의 섹션의 시작점)를 찾는다.
  const toolbars = document.querySelectorAll('.catalog-toolbar');

  toolbars.forEach(function (toolbarEl, sectionIndex) {
    // 이 툴바 바로 아래(또는 근처)에 있는 .list 요소를 찾는다.
    let listEl = toolbarEl.nextElementSibling;
    while (listEl && !listEl.classList.contains('list')) {
      listEl = listEl.nextElementSibling;
    }
    if (!listEl) return; // 방어 코드: 리스트가 없으면 이 섹션은 무시

    // 각 섹션별로 localStorage prefix 와 JSON URL 을 정한다.
    // HTML 에서 data-storage / data-json 으로 지정해주면 그 값을 사용하고,
    // 없으면 기본값을 사용한다.
    const storagePrefix = listEl.dataset.storage || ('section' + sectionIndex);
    const jsonUrl = listEl.dataset.json || '02_track33_products.json';

    // 이 툴바 + 리스트 조합을 하나의 카탈로그 섹션으로 초기화
    initCatalogSection(toolbarEl, listEl, storagePrefix, jsonUrl);
  });
});

/**
 * 하나의 "카탈로그 섹션"(툴바 + 상품 리스트)에 대한 모든 기능을 초기화하는 함수
 *
 * @param {HTMLElement} toolbarEl  - 정렬/검색 UI 를 담고 있는 요소(.catalog-toolbar)
 * @param {HTMLElement} listEl     - 상품 카드들을 담고 있는 요소(.list)
 * @param {string} storagePrefix   - localStorage 키 앞에 붙일 섹션별 prefix (예: "vinyl")
 * @param {string} jsonUrl         - 이 섹션의 상품 부가정보를 담은 JSON 파일 경로
 */

function initCatalogSection(toolbarEl, listEl, storagePrefix, jsonUrl) {
  /* ------------------------------------------------------------
   * 1. localStorage 키 정의 및 헬퍼
   * ------------------------------------------------------------ */
  const STORAGE_KEYS = {
    wishlist: storagePrefix + '-wishlist',
    sort: storagePrefix + '-sort-option',
    lastSearch: storagePrefix + '-last-search'
  };

  function loadJSON(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('localStorage 파싱 오류:', key, e);
      return defaultValue;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage 저장 오류:', key, e);
    }
  }

  /* ------------------------------------------------------------
   * 2. 이 섹션에서 사용할 상태 변수들
   * ------------------------------------------------------------ */
  let products = [];              // JSON 에서 읽어온 모든 상품 데이터
  const isVinyl = storagePrefix === 'vinyl';
  const isTurntable = storagePrefix === 'turntable';

  const itemsPerPage = isVinyl ? 15 : (isTurntable ? 5 : Infinity);
  let visibleCount = itemsPerPage;

  let wishlist = loadJSON(STORAGE_KEYS.wishlist, []);
  let currentSort = loadJSON(STORAGE_KEYS.sort, 'latest');
  let lastSearch = loadJSON(STORAGE_KEYS.lastSearch, '');
  let currentCategory = 'ALL';

  // 위시리스트 개수 표시 요소
  const wishlistCountEl = toolbarEl.querySelector('[data-role="wishlist-count"]');

  // 검색 인풋(툴바 안에 한 개 이상 있을 수 있으므로 모두 가져옴)
  const searchInputs = toolbarEl.querySelectorAll('form.search input[type="search"]');
  searchInputs.forEach(function (input) {
    input.value = lastSearch || '';
  });

  // 섹션 하단의 "더보기" 버튼 (각 섹션별로 자기 바로 아래 .more-btn만 찾도록 수정)
  let moreBtn = null;
  let moreBtnWrapper = listEl.nextElementSibling;

  // ⭐ listEl 바로 다음 형제들 중에서 .more-btn 을 찾는다
  while (moreBtnWrapper && !moreBtnWrapper.classList.contains('more-btn')) {
    moreBtnWrapper = moreBtnWrapper.nextElementSibling;
  }

  if (moreBtnWrapper) {
    moreBtn = moreBtnWrapper.querySelector('button');
  }


  // 카테고리 네비게이션(nav.cats)을 이 섹션 근처에서 탐색
  // ⭐ Vinyl 섹션일 때만 카테고리 네비게이션을 사용하도록 제한
  let categoryNav = null;
  if (isVinyl) {
    let parent = listEl.parentElement;
    while (parent && !categoryNav) {
      categoryNav = parent.querySelector('nav.cats');
      parent = parent.parentElement;
    }
  }


  /* ------------------------------------------------------------
   * 3. 카드 생성 / 렌더링 유틸
   * ------------------------------------------------------------ */
  function formatPrice(price) {
    if (typeof price !== 'number') return price || '';
    try {
      return '₩' + price.toLocaleString('ko-KR');
    } catch (e) {
      return '₩' + String(price);
    }
  }

  function createCardElement(product, index) {
    const article = document.createElement('article');
    article.className = 'card';
    article.dataset.productIndex = String(index);
    article.dataset.category = product.category || 'ALL';

    // 🔢 카드 순번 박스 (초기 값은 index+1, 실제 표시는 updateVisibility에서 다시 세팅)
    const indexBadge = document.createElement('div');
    indexBadge.className = 'card-index';
    indexBadge.textContent = String(index + 1);
    article.appendChild(indexBadge);

    // 위시 (하트)
    const wishDiv = document.createElement('div');
    wishDiv.className = 'wish';

    const checkbox = document.createElement('input');
    const checkboxId = storagePrefix + '-wish-' + index;
    checkbox.type = 'checkbox';
    checkbox.id = checkboxId;
    checkbox.dataset.productIndex = String(index);
    checkbox.checked = Array.isArray(wishlist) && wishlist.indexOf(index) !== -1;

    const label = document.createElement('label');
    label.htmlFor = checkboxId;
    const iconSpan = document.createElement('span');
    iconSpan.className = 'material-symbols-outlined';
    iconSpan.textContent = 'favorite';
    label.appendChild(iconSpan);

    wishDiv.appendChild(checkbox);
    wishDiv.appendChild(label);

    // 링크 및 썸네일, 텍스트
    const link = document.createElement('a');
    link.href = product.detailUrl || '#';
    const ariaTitle = product.title ? product.title + ' 상세보기' : '상품 상세보기';
    link.setAttribute('aria-label', ariaTitle);

    const picDiv = document.createElement('div');
    picDiv.className = 'pic';

    if (product.frontImage) {
      const frontImg = document.createElement('img');
      frontImg.className = 'front';
      frontImg.src = product.frontImage;
      frontImg.alt = product.title ? product.title + ' 앞면' : '상품 앞면';
      picDiv.appendChild(frontImg);
    }

    if (product.backImage) {
      const backImg = document.createElement('img');
      backImg.className = 'back';
      backImg.src = product.backImage;
      backImg.alt = product.title ? product.title + ' 뒷면' : '상품 뒷면';
      picDiv.appendChild(backImg);
    }

    const titleDiv = document.createElement('div');
    titleDiv.className = 'title';
    titleDiv.textContent = product.title || '';

    const priceDiv = document.createElement('div');
    priceDiv.className = 'price';
    priceDiv.textContent = formatPrice(product.price);

    link.appendChild(picDiv);
    link.appendChild(titleDiv);
    link.appendChild(priceDiv);

    article.appendChild(wishDiv);
    article.appendChild(link);

    if (product.isRare) {
      article.classList.add('rare');
    }
    if (product.isOutOfStock) {
      article.classList.add('out-of-stock');
    }

    return article;
  }

  function rebuildList() {
    listEl.innerHTML = '';
    products.forEach(function (p, index) {
      p.index = index;
      const card = createCardElement(p, index);
      p.element = card;
      listEl.appendChild(card);
    });
  }

  /* ------------------------------------------------------------
   * 4. 필터/정렬/더보기 로직
   * ------------------------------------------------------------ */
function matchesFilters(product) {
  // ⭐ 희귀판 정렬일 때는 희귀판이 아닌 상품은 아예 제외
  if (currentSort === 'rare' && !product.isRare) {
    return false;
  }

  // 카테고리
  if (currentCategory && currentCategory !== 'ALL') {
    if ((product.category || '').toUpperCase() !== currentCategory) {
      return false;
    }
  }

  // 검색어 (제목 기준)
  if (lastSearch) {
    const keyword = lastSearch.toLowerCase();
    const title = (product.title || '').toLowerCase();
    if (title.indexOf(keyword) === -1) {
      return false;
    }
  }
  return true;
}

  function updateWishlistUI() {
    if (wishlistCountEl) {
      wishlistCountEl.textContent = String(Array.isArray(wishlist) ? wishlist.length : 0);
    }

    // 카드 위의 체크박스 상태 동기화
    listEl.querySelectorAll('.wish input[type="checkbox"]').forEach(function (checkbox) {
      const idx = parseInt(checkbox.dataset.productIndex, 10);
      checkbox.checked = Array.isArray(wishlist) && wishlist.indexOf(idx) !== -1;
    });
  }

  function applySort() {
    if (!products || products.length === 0) return;

    let sorted = products.slice();

    if (currentSort === 'popular') {
      sorted.sort(function (a, b) {
        return (b.popularity || 0) - (a.popularity || 0);
      });
    } else if (currentSort === 'lowprice') {
      sorted.sort(function (a, b) {
        return (a.price || 0) - (b.price || 0);
      });
    } else if (currentSort === 'rare') {
      // 희귀판 우선, 그 다음 인기순
      sorted.sort(function (a, b) {
        const ra = a.isRare ? 1 : 0;
        const rb = b.isRare ? 1 : 0;
        if (ra !== rb) return rb - ra;
        return (b.popularity || 0) - (a.popularity || 0);
      });
    } else {
      // latest(기본): id 또는 index 기준 오름차순
      sorted.sort(function (a, b) {
        const av = typeof a.id === 'number' ? a.id : a.index;
        const bv = typeof b.id === 'number' ? b.id : b.index;
        return av - bv;
      });
    }

    // 정렬된 순서대로 DOM 재배치
    sorted.forEach(function (p, newIndex) {
      p.index = newIndex;
      if (p.element) {
        p.element.dataset.productIndex = String(newIndex);
        listEl.appendChild(p.element);
      }
    });

    products = sorted;
  }

 function updateVisibility() {
    if (!products) return;

    let shown = 0;
    const totalMatched = products.reduce(function (acc, p) {
      return acc + (matchesFilters(p) ? 1 : 0);
    }, 0);

    products.forEach(function (p) {
      const el = p.element;
      if (!el) return;

      if (!matchesFilters(p)) {
        el.style.display = 'none';
        return;
      }

      if (shown < visibleCount) {
        shown += 1;
        el.style.display = '';

        // 🔢 현재 화면에 보이는 순서대로 번호 업데이트
        const indexBadge = el.querySelector('.card-index');
        if (indexBadge) {
          indexBadge.textContent = String(shown);
        }
      } else {
        el.style.display = 'none';
      }
    });

    if (moreBtn) {
      // ⭐ 더보기 버튼 표시 여부는 "보여줄 수 있는 개수(visibleCount)" vs "조건 통과한 전체 개수(totalMatched)" 비교
      moreBtn.style.display = (visibleCount >= totalMatched) ? 'none' : '';
    }
 }


  function applyStoredState() {
    // 정렬 라디오 버튼
    const sortRadios = toolbarEl.querySelectorAll('input[name="sort"]');
    sortRadios.forEach(function (radio) {
      radio.checked = (radio.value === currentSort);
    });

    // 검색 인풋은 이미 load 시 값 주입

    // 카테고리 네비게이션
    if (categoryNav) {
      const links = categoryNav.querySelectorAll('a[data-category]');
      links.forEach(function (link) {
        const cat = (link.dataset.category || '').toUpperCase();
        link.classList.toggle('is-active', cat === currentCategory);
      });
    }
  }

  /* ------------------------------------------------------------
   * 5. 이벤트 리스너 등록
   * ------------------------------------------------------------ */
  function initEventListeners() {
    // 정렬 옵션
    const sortRadios = toolbarEl.querySelectorAll('input[name="sort"]');
    sortRadios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (!radio.checked) return;
        currentSort = radio.value;
        saveJSON(STORAGE_KEYS.sort, currentSort);
        applySort();
        // 정렬이 바뀌면 첫 페이지부터 다시 보여주기
        visibleCount = itemsPerPage;
        updateVisibility();
      });
    });

    // 검색
    searchInputs.forEach(function (input) {
      input.addEventListener('input', function () {
        lastSearch = input.value.trim();
        saveJSON(STORAGE_KEYS.lastSearch, lastSearch);
        visibleCount = itemsPerPage;
        updateVisibility();
      });
    });

    // 카테고리 네비게이션
    if (categoryNav) {
      categoryNav.addEventListener('click', function (event) {
        const link = event.target.closest('a[data-category]');
        if (!link) return;

        event.preventDefault();
        const cat = (link.dataset.category || 'ALL').toUpperCase();
        currentCategory = cat;

        const links = categoryNav.querySelectorAll('a[data-category]');
        links.forEach(function (a) {
          a.classList.toggle('is-active', a === link);
        });

        visibleCount = itemsPerPage;
        updateVisibility();
      });
    }

    // 위시리스트 체크박스 (이벤트 위임)
    listEl.addEventListener('change', function (event) {
      const target = event.target;
      if (!target.matches || !target.matches('.wish input[type="checkbox"]')) return;

      const index = parseInt(target.dataset.productIndex, 10);
      if (isNaN(index)) return;

      if (!Array.isArray(wishlist)) {
        wishlist = [];
      }

      const pos = wishlist.indexOf(index);
      if (target.checked) {
        if (pos === -1) wishlist.push(index);
      } else {
        if (pos !== -1) wishlist.splice(pos, 1);
      }

      saveJSON(STORAGE_KEYS.wishlist, wishlist);
      updateWishlistUI();
    });

    // 더보기 버튼
    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        visibleCount += itemsPerPage;
        updateVisibility();
      });
    }
  }

  /* ------------------------------------------------------------
   * 6. JSON 로딩 후 초기 렌더링
   * ------------------------------------------------------------ */
  fetch(jsonUrl)
    .then(function (response) {
      if (!response.ok) {
        throw new Error('상품 JSON을 불러오는 데 실패했습니다: ' + jsonUrl);
      }
      return response.json();
    })
    .then(function (jsonData) {
      if (!jsonData || !Array.isArray(jsonData.products)) {
        console.warn('JSON 형식이 예상과 다릅니다. "products" 배열이 필요합니다.', jsonData);
        return;
      }

      products = jsonData.products.map(function (item, index) {
        return {
          id: typeof item.id === 'number' ? item.id : index,
          title: item.title || '',
          price: typeof item.price === 'number' ? item.price : 0,
          category: (item.category || 'ALL').toUpperCase(),
          frontImage: item.frontImage || '',
          backImage: item.backImage || '',
          detailUrl: item.detailUrl || '#',
          popularity: typeof item.popularity === 'number' ? item.popularity : 0,
          isRare: !!item.isRare,
          isOutOfStock: !!item.isOutOfStock,
          element: null,
          index: index
        };
      });

      // DOM 에 카드 생성
      rebuildList();

      // 기본 위시리스트가 비어 있다면 첫 상품을 기본 찜으로 설정 (선택 사항)
      if (!Array.isArray(wishlist) || wishlist.length === 0) {
        if (products.length > 0) {
          wishlist = [0];
          saveJSON(STORAGE_KEYS.wishlist, wishlist);
        } else {
          wishlist = [];
        }
      }

      updateWishlistUI();
      applyStoredState();
      applySort();       // 정렬 적용
      updateVisibility(); // 필터 + 더보기 적용
      initEventListeners();
    })
    .catch(function (error) {
      console.error('[', storagePrefix, '] 상품 JSON 로드 실패:', error);
    });

    
}


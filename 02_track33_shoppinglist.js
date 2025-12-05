'use strict';

document.addEventListener('DOMContentLoaded', function () {
  const toolbars = document.querySelectorAll('.catalog-toolbar');

  toolbars.forEach(function (toolbarEl, sectionIndex) {
    let listEl = toolbarEl.nextElementSibling;
    while (listEl && !listEl.classList.contains('list')) {
      listEl = listEl.nextElementSibling;
    }
    if (!listEl) return;

    const storagePrefix = listEl.dataset.storage || ('section' + sectionIndex);
    const jsonUrl = listEl.dataset.json || '02_track33_products.json';

    initCatalogSection(toolbarEl, listEl, storagePrefix, jsonUrl);
  });

  initBackInStockSection();
});


/**
 *
 *
 * @param {HTMLElement} toolbarEl  - 정렬/검색 UI 를 담고 있는 요소(.catalog-toolbar)
 * @param {HTMLElement} listEl     - 상품 카드들을 담고 있는 요소(.list)
 * @param {string} storagePrefix   - localStorage 키 앞에 붙일 섹션별 prefix 
 * @param {string} jsonUrl         - 이 섹션의 상품 부가정보를 담은 JSON 파일 경로
 */

function initCatalogSection(toolbarEl, listEl, storagePrefix, jsonUrl) {
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

  let products = [];            
  const isVinyl = storagePrefix === 'vinyl';
  const isTurntable = storagePrefix === 'turntable';

  const itemsPerPage = isVinyl ? 15 : (isTurntable ? 5 : Infinity);
  let currentPage = 1;   // 1, 2, 3...

  let wishlist = loadJSON(STORAGE_KEYS.wishlist, []);
  let currentSort = loadJSON(STORAGE_KEYS.sort, 'latest');
  let lastSearch = loadJSON(STORAGE_KEYS.lastSearch, '');
  let currentCategory = 'ALL';

  // 위시리스트 개수 표시 요소
  const wishlistCountEl = toolbarEl.querySelector('[data-role="wishlist-count"]');

  // 검색 인풋
  const searchInputs = toolbarEl.querySelectorAll('form.search input[type="search"]');
  searchInputs.forEach(function (input) {
    input.value = lastSearch || '';
  });

  // 섹션 하단의 페이지네이션 영역
  let paginationEl = null;
  let paginationWrapper = listEl.nextElementSibling;

  while (paginationWrapper && !paginationWrapper.classList.contains('more-btn')) {
    paginationWrapper = paginationWrapper.nextElementSibling;
  }

  if (paginationWrapper) {
    paginationEl = paginationWrapper.querySelector('.pagination') || paginationWrapper;
  }



  // Vinyl 섹션일 때만 카테고리 네비게이션을 사용하도록 제한
  let categoryNav = null;
  if (isVinyl) {
    let parent = listEl.parentElement;
    while (parent && !categoryNav) {
      categoryNav = parent.querySelector('nav.cats');
      parent = parent.parentElement;
    }
  }


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

  /* 필터/정렬/더보기 로직 */
function matchesFilters(product) {
  // 희귀판 정렬일 때는 희귀판이 아닌 상품은 아예 제외
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

      sorted.sort(function (a, b) {
        const ra = a.isRare ? 1 : 0;
        const rb = b.isRare ? 1 : 0;
        if (ra !== rb) return rb - ra;
        return (b.popularity || 0) - (a.popularity || 0);
      });
    } else {
      sorted.sort(function (a, b) {
        const av = typeof a.id === 'number' ? a.id : a.index;
        const bv = typeof b.id === 'number' ? b.id : b.index;
        return av - bv;
      });
    }

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

    const matchedIndices = [];
    products.forEach(function (p, idx) {
      if (matchesFilters(p)) {
        matchedIndices.push(idx);
      }
    });

    const totalMatched = matchedIndices.length;

    // 페이지 수 계산 
    const totalPages = (itemsPerPage === Infinity || totalMatched === 0)
      ? 1
      : Math.max(1, Math.ceil(totalMatched / itemsPerPage));

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const end = (itemsPerPage === Infinity) ? totalMatched : (start + itemsPerPage);


    const rankMap = {};
    matchedIndices.forEach(function (prodIndex, pos) {
      rankMap[prodIndex] = pos;
    });

    let shown = 0;

    products.forEach(function (p, idx) {
      const el = p.element;
      if (!el) return;

      if (!matchesFilters(p)) {
        el.style.display = 'none';
        return;
      }

      const pos = rankMap[idx];  // 필터된 리스트 안에서의 순서

      if (pos >= start && pos < end) {
        shown += 1;
        el.style.display = '';

        const indexBadge = el.querySelector('.card-index');
        if (indexBadge) {
          indexBadge.textContent = String(pos + 1); // 전체 중 몇 번째인지
        }
      } else {
        el.style.display = 'none';
      }
    });

    renderPagination(totalPages, totalMatched);
 }

   function renderPagination(totalPages, totalMatched) {
    if (!paginationEl || itemsPerPage === Infinity || totalMatched === 0) {
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    paginationEl.innerHTML = '';

    // 버튼 생성 
    function makePageBtn(label, page, options) {
      const btn = document.createElement('button');
      btn.textContent = label;

      if (options && options.className) {
        btn.classList.add(options.className);
      }

      if (options && options.disabled) {
        btn.disabled = true;
      } else {
        btn.addEventListener('click', function () {
          if (page === currentPage) return;
          currentPage = page;
          updateVisibility();
        });
      }

      if (options && options.active) {
        btn.classList.add('is-active');
      }

      paginationEl.appendChild(btn);
    }

    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === totalPages;

    // « (첫 페이지)
    makePageBtn('«', 1, { disabled: isFirstPage });

    // ‹ (이전 페이지)
    makePageBtn('‹', Math.max(1, currentPage - 1), { disabled: isFirstPage });

    // 숫자 버튼
    for (let p = 1; p <= totalPages; p++) {
      makePageBtn(String(p), p, {
        className: 'page-number',
        active: p === currentPage
      });
    }

    // › (다음 페이지)
    makePageBtn('›', Math.min(totalPages, currentPage + 1), { disabled: isLastPage });

    // » (마지막 페이지)
    makePageBtn('»', totalPages, { disabled: isLastPage });
  }



  function applyStoredState() {

    const sortRadios = toolbarEl.querySelectorAll('input[name="sort"]');
    sortRadios.forEach(function (radio) {
      radio.checked = (radio.value === currentSort);
    });


    if (categoryNav) {
      const links = categoryNav.querySelectorAll('a[data-category]');
      links.forEach(function (link) {
        const cat = (link.dataset.category || '').toUpperCase();
        link.classList.toggle('is-active', cat === currentCategory);
      });
    }
  }

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
        currentPage = 1;
        updateVisibility();
      });
    });

    // 검색
    searchInputs.forEach(function (input) {
      input.addEventListener('input', function () {
        lastSearch = input.value.trim();
        saveJSON(STORAGE_KEYS.lastSearch, lastSearch);
        currentPage = 1;
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

        currentPage = 1;
        updateVisibility();
      });
    }

    // 위시리스트 체크박스
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

    
  }

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

      rebuildList();


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
      applySort();
      updateVisibility();
      initEventListeners();
    })
    .catch(function (error) {
      console.error('[', storagePrefix, '] 상품 JSON 로드 실패:', error);
    });
}
// ================= BACK IN STOCK 섹션 =================
function initBackInStockSection() {
  const container = document.querySelector('.back-in-stock-list');
  if (!container) return;


  const vinylListEl = document.querySelector('.list[data-storage="vinyl"]');
  const jsonUrl = vinylListEl
    ? (vinylListEl.dataset.json || '02_track33_products_vinyl.json')
    : '02_track33_products_vinyl.json';

  fetch(jsonUrl)
    .then(function (response) {
      if (!response.ok) {
        throw new Error('BACK IN STOCK: Vinyl JSON 로드 실패: ' + jsonUrl);
      }
      return response.json();
    })
    .then(function (data) {
      const products = Array.isArray(data.products) ? data.products : [];
      if (products.length === 0) {
        console.warn('BACK IN STOCK: products 배열이 비어 있습니다.');
        return;
      }


      const candidates = products.filter(function (p) {
        return p.isOutOfStock === false || p.isOutOfStock === undefined;
      }).slice(0, 10);

      candidates.forEach(function (product) {
        const article = document.createElement('article');
        article.className = 'card';

        const link = document.createElement('a');
        link.href = product.detailUrl || '#';
        link.setAttribute(
          'aria-label',
          (product.title || '상품') + ' 상세 보기'
        );

        const picDiv = document.createElement('div');
        picDiv.className = 'pic';

        if (product.frontImage) {
          const imgFront = document.createElement('img');
          imgFront.className = 'front';
          imgFront.src = product.frontImage;
          imgFront.alt = (product.title || '상품') + ' 앞면';
          picDiv.appendChild(imgFront);
        }

        if (product.backImage) {
          const imgBack = document.createElement('img');
          imgBack.className = 'back';
          imgBack.src = product.backImage;
          imgBack.alt = (product.title || '상품') + ' 뒷면';
          picDiv.appendChild(imgBack);
        }

        const titleDiv = document.createElement('div');
        titleDiv.className = 'title';
        titleDiv.textContent = product.title || '';

        const priceDiv = document.createElement('div');
        priceDiv.className = 'price';
        if (typeof product.price === 'number') {
          priceDiv.textContent =
            '₩' + product.price.toLocaleString('ko-KR');
        } else if (product.price) {
          priceDiv.textContent = product.price;
        }

        link.appendChild(picDiv);
        link.appendChild(titleDiv);
        link.appendChild(priceDiv);

        article.appendChild(link);

        if (product.isRare) {
          article.classList.add('rare');
        }

        container.appendChild(article);
      });
    })
    .catch(function (error) {
      console.error('BACK IN STOCK 섹션 오류:', error);
    });
}

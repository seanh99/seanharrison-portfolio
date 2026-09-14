// ============================================================
// Sean Harrison — Projects page (editorial index + viewer)
//
// Reads the project dataset embedded by build-project-pages.mjs
// (script#projects-data, already localized to this page's language)
// and drives the whole index/main-image/info experience client-side.
//
// Desktop/tablet: shared main-image + info panels, with prev/next
// controls under the image, driven by hover (preview) and click
// (select). The currently *displayed* project — hovered project if
// any, else the selected one — always drives both the image and the
// info panel together, so they never show two different projects.
// On load, the first visible project is pre-selected so the page
// never opens with an empty state.
//
// Mobile (<700px): no hover, so each tap expands that project's
// gallery + info inline, accordion-style, directly under its row.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const dataEl = document.getElementById('projects-data');
  if (!dataEl) return; // not on the Projects page

  const PROJECTS = JSON.parse(dataEl.textContent);
  const i18nEl = document.getElementById('projects-i18n');
  const I18N = i18nEl ? JSON.parse(i18nEl.textContent) : {
    developedAt: 'Developed at', prevImage: 'Previous image', nextImage: 'Next image', independentGroup: 'Independent',
  };

  const indexEl = document.getElementById('projIndex');
  const stageEl = document.getElementById('projImageStage');
  const mainImgEl = document.getElementById('projMainImage');
  const emptyEl = document.getElementById('projImageEmpty');
  const navEl = document.getElementById('projImageNav');
  const prevBtn = document.getElementById('projImagePrev');
  const nextBtn = document.getElementById('projImageNext');
  const countEl = document.getElementById('projImageCount');
  const infoEl = document.getElementById('projInfo');
  const filterBtns = document.querySelectorAll('[data-filter]');
  const sortBtns = document.querySelectorAll('[data-sort]');

  const mobileQuery = window.matchMedia('(max-width: 699px)');
  function isMobile(){ return mobileQuery.matches; }

  let filter = 'featured';
  let sort = 'default';
  let hoveredSlug = null;
  let selectedSlug = null;
  let activeImageIndex = 0;
  let mobileOpenSlug = null;
  let mobileActiveIndex = 0;
  const collapsedGroups = new Set();

  function byYearDesc(a, b){ return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0); }
  function byTitleAsc(a, b){ return a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }); }

  function visibleProjects(){
    let list = filter === 'all' ? PROJECTS.slice() : PROJECTS.filter(p => p.featured);
    if (sort === 'year') list = list.slice().sort(byYearDesc);
    else if (sort === 'title') list = list.slice().sort(byTitleAsc);
    return list;
  }

  function findProject(slug){ return PROJECTS.find(p => p.slug === slug) || null; }

  // The hover preview always shows the hero image, so once a project is
  // selected/expanded, start the gallery there instead of at image 0.
  function heroIndex(p){
    if (!p || !p.hero || !p.images.length) return 0;
    const i = p.images.findIndex(img => img.src === p.hero);
    return i === -1 ? 0 : i;
  }

  function infoHTML(p, opts){
    const skipTitle = opts && opts.skipTitle;
    const metaLine = [p.location, p.year].filter(Boolean).join(', ');
    const typeLines = [p.category, p.status].filter(Boolean);
    const developedBlock = p.developedAt
      ? `<div class="proj-info-block"><span class="proj-info-label">${I18N.developedAt}</span><p>${p.developedAt}</p></div>`
      : (p.independentLabel ? `<div class="proj-info-block"><p>${p.independentLabel}</p></div>` : '');
    const bodyParas = [p.description, p.involvement].filter(Boolean);
    const descBlock = bodyParas.map(para => `<p class="proj-info-desc">${para}</p>`).join('');
    return `
      ${skipTitle ? '' : `<p class="proj-info-title">${p.title}</p>`}
      <div class="proj-info-meta">
        ${metaLine ? `<p>${metaLine}</p>` : ''}
        ${typeLines.map(t => `<p>${t}</p>`).join('')}
      </div>
      ${developedBlock}
      ${descBlock}
    `;
  }

  // ---------------- Desktop / tablet: shared panels ----------------

  // The project currently shown in both the image stage and the info
  // panel — hover takes priority as a live preview, falling back to the
  // selected project, and finally to the first visible project so the
  // page never opens empty.
  function displayProject(){
    return findProject(hoveredSlug) || findProject(selectedSlug) || visibleProjects()[0] || null;
  }

  function currentGalleryImages(){
    const sel = selectedSlug ? findProject(selectedSlug) : null;
    return sel ? sel.images : [];
  }

  function renderMainImage(){
    const proj = displayProject();
    const viewingSelected = !!(proj && selectedSlug && proj.slug === selectedSlug);
    const images = viewingSelected ? proj.images : [];
    const src = viewingSelected
      ? (images[activeImageIndex] ? images[activeImageIndex].src : '')
      : (proj ? proj.hero : '');
    const alt = viewingSelected
      ? (images[activeImageIndex] ? images[activeImageIndex].alt : '')
      : (proj ? proj.title : '');

    if (src){
      mainImgEl.src = src;
      mainImgEl.alt = alt;
      mainImgEl.hidden = false;
      emptyEl.hidden = true;
    } else {
      mainImgEl.hidden = true;
      emptyEl.hidden = false;
    }

    if (viewingSelected && images.length > 1){
      navEl.hidden = false;
      countEl.textContent = `${String(activeImageIndex + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')}`;
    } else {
      navEl.hidden = true;
    }
  }

  function renderInfo(){
    const proj = displayProject();
    infoEl.innerHTML = proj ? infoHTML(proj) : '';
  }

  function stepImage(dir){
    const images = currentGalleryImages();
    if (images.length < 2) return;
    activeImageIndex = (activeImageIndex + dir + images.length) % images.length;
    renderMainImage();
  }

  if (prevBtn) prevBtn.addEventListener('click', () => stepImage(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => stepImage(1));

  document.addEventListener('keydown', (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (isMobile()){
      if (!mobileOpenSlug) return;
      if (e.key === 'ArrowLeft') stepMobileImage(-1);
      if (e.key === 'ArrowRight') stepMobileImage(1);
      return;
    }
    if (!selectedSlug) return;
    if (e.key === 'ArrowLeft') stepImage(-1);
    if (e.key === 'ArrowRight') stepImage(1);
  });

  let touchStartX = null;
  if (stageEl){
    stageEl.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    stageEl.addEventListener('touchend', (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) stepImage(dx < 0 ? 1 : -1);
      touchStartX = null;
    }, { passive: true });
  }

  // ---------------- Mobile: inline accordion ----------------

  function stepMobileImage(dir){
    const proj = mobileOpenSlug ? findProject(mobileOpenSlug) : null;
    if (!proj || proj.images.length < 2) return;
    mobileActiveIndex = (mobileActiveIndex + dir + proj.images.length) % proj.images.length;
    renderIndex();
  }

  function buildAccordionPanel(p){
    const panel = document.createElement('div');
    panel.className = 'proj-accordion-panel';

    const stage = document.createElement('div');
    stage.className = 'proj-accordion-stage';
    if (p.images.length){
      const img = document.createElement('img');
      img.src = p.images[mobileActiveIndex].src;
      img.alt = p.images[mobileActiveIndex].alt;
      stage.appendChild(img);

      let sx = null;
      stage.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
      stage.addEventListener('touchend', (e) => {
        if (sx === null) return;
        const dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 40) stepMobileImage(dx < 0 ? 1 : -1);
        sx = null;
      }, { passive: true });
    }
    panel.appendChild(stage);

    if (p.images.length > 1){
      const nav = document.createElement('div');
      nav.className = 'proj-image-nav';
      const prev = document.createElement('button');
      prev.type = 'button'; prev.textContent = '←'; prev.setAttribute('aria-label', I18N.prevImage);
      prev.addEventListener('click', () => stepMobileImage(-1));
      const count = document.createElement('span');
      count.className = 'proj-image-count';
      count.textContent = `${String(mobileActiveIndex + 1).padStart(2, '0')} / ${String(p.images.length).padStart(2, '0')}`;
      const next = document.createElement('button');
      next.type = 'button'; next.textContent = '→'; next.setAttribute('aria-label', I18N.nextImage);
      next.addEventListener('click', () => stepMobileImage(1));
      nav.append(prev, count, next);
      panel.appendChild(nav);
    }

    const info = document.createElement('div');
    info.className = 'proj-info';
    info.innerHTML = infoHTML(p, { skipTitle: true });
    panel.appendChild(info);

    return panel;
  }

  // ---------------- Index list (shared render, mobile-aware) ----------------

  // Grouped by studio (EFC / ID / Independent) — only meaningful in the
  // curated "default" order, since projects.json is authored in exactly
  // that grouped sequence. Year/A–Z sort flattens the list instead.
  function groupOf(p){
    if (p.developedAt === 'EFC Holdings') return 'EFC';
    if (p.developedAt === 'ID Construcciones') return 'ID';
    if (p.developedAt === 'Cordogan Clark & Associates') return 'Cordogan Clark';
    if (p.developedAt === 'Beriot+Bernardini Arquitectos') return 'Beriot+Bernardini';
    return I18N.independentGroup;
  }

  function renderIndex(){
    const list = visibleProjects();
    indexEl.innerHTML = '';
    const mobile = isMobile();
    const showGroups = sort === 'default';
    let lastGroup = null;

    list.forEach(p => {
      let currentGroup = null;
      if (showGroups){
        const g = groupOf(p);
        currentGroup = g;
        if (g !== lastGroup){
          const expanded = !collapsedGroups.has(g);
          const header = document.createElement('button');
          header.type = 'button';
          header.className = 'proj-group-header';
          header.setAttribute('aria-expanded', String(expanded));
          const label = document.createElement('span');
          label.textContent = g;
          const chevron = document.createElement('span');
          chevron.className = 'proj-group-chevron';
          chevron.textContent = '▾';
          chevron.setAttribute('aria-hidden', 'true');
          header.append(label, chevron);
          header.addEventListener('click', () => {
            if (collapsedGroups.has(g)) collapsedGroups.delete(g);
            else collapsedGroups.add(g);
            renderIndex();
          });
          indexEl.appendChild(header);
          lastGroup = g;
        }
      }

      if (showGroups && collapsedGroups.has(currentGroup)) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      const isOpenOnMobile = mobile && p.slug === mobileOpenSlug;
      btn.className = 'proj-index-item'
        + (p.slug === selectedSlug ? ' is-selected' : '')
        + (isOpenOnMobile ? ' is-selected' : '');
      btn.textContent = p.title;
      btn.dataset.slug = p.slug;

      if (!mobile){
        btn.addEventListener('mouseenter', () => { hoveredSlug = p.slug; renderMainImage(); renderInfo(); });
        btn.addEventListener('focus', () => { hoveredSlug = p.slug; renderMainImage(); renderInfo(); });
        btn.addEventListener('mouseleave', () => { hoveredSlug = null; renderMainImage(); renderInfo(); });
        btn.addEventListener('blur', () => { hoveredSlug = null; renderMainImage(); renderInfo(); });
      }
      btn.addEventListener('click', () => selectProject(p.slug));
      indexEl.appendChild(btn);

      if (isOpenOnMobile){
        indexEl.appendChild(buildAccordionPanel(p));
      }
    });
  }

  function selectProject(slug){
    if (isMobile()){
      const opening = mobileOpenSlug !== slug;
      mobileOpenSlug = opening ? slug : null;
      mobileActiveIndex = opening ? heroIndex(findProject(slug)) : 0;
      renderIndex();
      return;
    }
    selectedSlug = slug;
    activeImageIndex = heroIndex(findProject(slug));
    hoveredSlug = null;
    renderIndex();
    renderMainImage();
    renderInfo();
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      filterBtns.forEach(b => b.classList.toggle('is-active', b === btn));
      const list = visibleProjects();
      if (!selectedSlug || !list.some(p => p.slug === selectedSlug)){
        selectedSlug = list[0] ? list[0].slug : null;
        activeImageIndex = selectedSlug ? heroIndex(findProject(selectedSlug)) : 0;
      }
      renderIndex();
      renderMainImage();
      renderInfo();
    });
  });

  sortBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.sort;
      sort = (sort === key) ? 'default' : key;
      sortBtns.forEach(b => b.classList.toggle('is-active', sort === b.dataset.sort));
      renderIndex();
      renderMainImage();
    });
  });

  mobileQuery.addEventListener('change', () => {
    mobileOpenSlug = null;
    renderIndex();
    renderMainImage();
    renderInfo();
  });

  // Pre-select the first visible project so the page never opens with
  // an empty image/info state on desktop.
  const initial = visibleProjects()[0];
  if (initial && !isMobile()){
    selectedSlug = initial.slug;
    activeImageIndex = heroIndex(initial);
  }

  renderIndex();
  renderMainImage();
  renderInfo();

  // Preload every project's cover image in the background once the page
  // is idle. Without this, hovering quickly down the list triggers a
  // fresh, uncached image request per project, and the resulting decode
  // jank/flicker can read as the whole stage "shaking" or briefly
  // showing the wrong project while an older request is still resolving.
  function preloadHeroImages(){
    const seen = new Set();
    PROJECTS.forEach(p => {
      if (!p.hero || seen.has(p.hero)) return;
      seen.add(p.hero);
      const img = new Image();
      img.src = p.hero;
    });
  }
  if (!isMobile()){
    if ('requestIdleCallback' in window) requestIdleCallback(preloadHeroImages, { timeout: 3000 });
    else setTimeout(preloadHeroImages, 500);
  }
});

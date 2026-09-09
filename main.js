// ============================================================
// Sean Harrison — shared site behavior
// ============================================================

// Access is now gated server-side by middleware.js + api/login.js (see
// gate.html) — a visitor can no longer reach this script, or any page
// content, without a valid auth cookie. Nothing password-related runs here.

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Header solid-on-scroll ---------- */
  const header = document.getElementById('siteHeader');
  const isHome = document.body.classList.contains('page-home');

  function onScroll(){
    if (!header) return;
    if (isHome){
      header.classList.toggle('is-solid', window.scrollY > window.innerHeight * 0.85);
    } else {
      header.classList.add('is-solid');
    }
  }
  window.addEventListener('scroll', onScroll, { passive:true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileClose');
  function openMenu(){ mobileMenu && mobileMenu.classList.add('is-open'); menuToggle && menuToggle.setAttribute('aria-expanded','true'); }
  function closeMenu(){ mobileMenu && mobileMenu.classList.remove('is-open'); menuToggle && menuToggle.setAttribute('aria-expanded','false'); }
  if (menuToggle) menuToggle.addEventListener('click', openMenu);
  if (mobileClose) mobileClose.addEventListener('click', closeMenu);
  if (mobileMenu) mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  }

  /* ---------- Home hero: crossfade rotation + manual nav ---------- */
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length){
    let i = Array.from(slides).findIndex(s => s.classList.contains('is-active'));
    if (i < 0) i = 0;
    const total = slides.length;
    const captionTitle = document.getElementById('heroCaptionTitle');
    const captionIndex = document.getElementById('heroCaptionIndex');
    let timer;

    function show(next){
      slides[i].classList.remove('is-active');
      i = (next + total) % total;
      slides[i].classList.add('is-active');
      if (captionIndex) captionIndex.textContent = `${String(i + 1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`;
      if (captionTitle) captionTitle.textContent = slides[i].dataset.caption || '';
    }
    function next(){ show(i + 1); }
    function prev(){ show(i - 1); }
    function restart(){
      clearInterval(timer);
      timer = setInterval(next, 8000);
    }
    restart();

    const prevZone = document.querySelector('.hero-nav-zone.is-prev');
    const nextZone = document.querySelector('.hero-nav-zone.is-next');
    if (prevZone) prevZone.addEventListener('click', () => { prev(); restart(); });
    if (nextZone) nextZone.addEventListener('click', () => { next(); restart(); });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight'){ next(); restart(); }
      if (e.key === 'ArrowLeft'){ prev(); restart(); }
    });

    let touchStartX = null;
    const stage = document.querySelector('.hero-stage');
    if (stage){
      stage.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive:true });
      stage.addEventListener('touchend', (e) => {
        if (touchStartX === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 40){
          if (dx < 0) { next(); restart(); } else { prev(); restart(); }
        }
        touchStartX = null;
      }, { passive:true });
    }

    if (captionIndex) captionIndex.textContent = `${String(i + 1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`;
    if (captionTitle) captionTitle.textContent = slides[i].dataset.caption || '';
  }

  /* ---------- Plans overlay ---------- */
  const plansTrigger = document.getElementById('viewPlansBtn');
  const plansOverlay = document.getElementById('plansOverlay');
  const plansClose = document.getElementById('plansClose');
  const plansTabs = document.querySelectorAll('.plans-tabs button');
  const plansPlates = document.querySelectorAll('.plans-plate');

  function openPlans(){
    if (!plansOverlay) return;
    plansOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closePlans(){
    if (!plansOverlay) return;
    plansOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  if (plansTrigger) plansTrigger.addEventListener('click', openPlans);
  if (plansClose) plansClose.addEventListener('click', closePlans);
  if (plansOverlay) plansOverlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePlans(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePlans(); });

  plansTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      plansTabs.forEach(t => t.classList.remove('is-active'));
      plansPlates.forEach(p => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      document.getElementById(tab.dataset.plate)?.classList.add('is-active');
    });
  });

  /* ---------- Project page: full-bleed continuous carousel ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.carousel-wrap').forEach(wrap => {
    const track = wrap.querySelector('.carousel-track');
    if (!track) return;
    const originals = Array.from(track.children);
    if (!originals.length){ wrap.classList.add('no-images'); return; }

    // Duplicate the sequence once for a seamless loop.
    originals.forEach(node => track.appendChild(node.cloneNode(true)));

    let setWidth = 0;
    let offset = 0;
    let isPaused = reduceMotion;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartOffset = 0;
    let resumeTimer = null;
    const VELOCITY = 26; // px/sec
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0');

    function measure(){
      setWidth = 0;
      originals.forEach((img, i) => {
        setWidth += img.getBoundingClientRect().width;
        if (i < originals.length - 1) setWidth += gap;
      });
      setWidth += gap;
    }
    function applyTransform(){ track.style.transform = `translateX(${-offset}px)`; }
    function wrapOffset(){
      if (setWidth <= 0) return;
      offset = ((offset % setWidth) + setWidth) % setWidth;
    }

    let lastT = null;
    function tick(t){
      if (lastT === null) lastT = t;
      const dt = (t - lastT) / 1000;
      lastT = t;
      if (!isPaused && !isDragging && setWidth > 0){
        offset += VELOCITY * dt;
        wrapOffset();
        applyTransform();
      }
      requestAnimationFrame(tick);
    }
    function scheduleResume(){
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { isPaused = reduceMotion ? true : false; }, 1400);
    }

    wrap.addEventListener('mouseenter', () => { isPaused = true; });
    wrap.addEventListener('mouseleave', () => { if (!isDragging) scheduleResume(); });
    wrap.addEventListener('focusin', () => { isPaused = true; });
    wrap.addEventListener('focusout', () => scheduleResume());

    wrap.addEventListener('pointerdown', (e) => {
      isDragging = true; isPaused = true;
      dragStartX = e.clientX; dragStartOffset = offset;
      wrap.classList.add('is-dragging');
      wrap.setPointerCapture(e.pointerId);
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      offset = dragStartOffset - (e.clientX - dragStartX);
      wrapOffset(); applyTransform();
    });
    function endDrag(){
      if (!isDragging) return;
      isDragging = false;
      wrap.classList.remove('is-dragging');
      scheduleResume();
    }
    wrap.addEventListener('pointerup', endDrag);
    wrap.addEventListener('pointercancel', endDrag);

    wrap.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      isPaused = true;
      offset += e.deltaX;
      wrapOffset(); applyTransform();
      scheduleResume();
    }, { passive: false });

    wrap.setAttribute('tabindex', '0');
    wrap.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      isPaused = true;
      const step = originals[0] ? originals[0].getBoundingClientRect().width + gap : 300;
      track.style.transition = 'transform .4s cubic-bezier(.4,0,.2,1)';
      offset += (e.key === 'ArrowRight') ? step : -step;
      wrapOffset(); applyTransform();
      setTimeout(() => { track.style.transition = ''; }, 420);
      scheduleResume();
    });

    const imgs = Array.from(track.querySelectorAll('img'));
    Promise.all(imgs.map(img => img.decode ? img.decode().catch(() => {}) : Promise.resolve()))
      .then(() => { measure(); requestAnimationFrame(tick); });
    window.addEventListener('resize', () => measure());
  });

});

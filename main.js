// ============================================================
// Sean Harrison — shared site behavior
// ============================================================

// Client-side password gate. Not real security — this is a soft gate to
// keep casual visitors out of a private preview, not to protect sensitive
// data (the password is readable in this file's source).
const SITE_PASSWORD = 'seanharrisonportfolio';
const GATE_STORAGE_KEY = 'sh_site_unlocked';

(function initGate(){
  const gate = document.getElementById('passwordGate');
  if (!gate) return;

  if (sessionStorage.getItem(GATE_STORAGE_KEY) === '1'){
    gate.remove();
    return;
  }

  document.documentElement.style.overflow = 'hidden';
  const form = document.getElementById('gateForm');
  const input = document.getElementById('gatePassword');
  const error = document.getElementById('gateError');
  const toggle = document.getElementById('gateToggle');

  if (toggle){
    toggle.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      toggle.classList.toggle('is-showing', !showing);
      toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      input.focus({ preventScroll: true });
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value === SITE_PASSWORD){
      sessionStorage.setItem(GATE_STORAGE_KEY, '1');
      document.documentElement.style.overflow = '';
      gate.remove();
    } else {
      error.classList.add('is-visible');
      input.value = '';
      input.focus();
    }
  });
})();

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

  /* ---------- Home hero slideshow ---------- */
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length > 1){
    let i = 0;
    setInterval(() => {
      slides[i].classList.remove('is-active');
      i = (i + 1) % slides.length;
      slides[i].classList.add('is-active');
    }, 5000);
  }

  /* ---------- Work gallery: grid/list view toggle ---------- */
  const viewButtons = document.querySelectorAll('.view-toggle button');
  const galleryGrid = document.querySelector('.gallery-grid');
  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      viewButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      if (galleryGrid) galleryGrid.classList.toggle('is-list', btn.dataset.view === 'list');
    });
  });

  /* ---------- Studio tabs ---------- */
  const studioTabs = document.querySelectorAll('.studio-tabs button');
  const studioPanels = document.querySelectorAll('.studio-panel');
  studioTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      studioTabs.forEach(t => t.classList.remove('is-active'));
      studioPanels.forEach(p => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      document.getElementById(tab.dataset.panel)?.classList.add('is-active');
    });
  });

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

});

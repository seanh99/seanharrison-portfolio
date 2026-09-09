// ============================================================
// Sean Harrison — static site generator
//
// Regenerates, from projects.json + assets/images/<folder>/, for
// each language (en at site root, es under /es/):
//   - [LANG/]projects/<slug>.html   full-bleed carousel + info page
//   - [LANG/]index.html             home hero carousel (marker region only)
//   - [LANG/]work.html              project index data (marker region only)
//
// index.html / work.html / profile.html / contact.html are hand-authored
// shells (in both / and /es/) — this script only replaces the marker
// blocks inside index.html and work.html. Project detail pages are
// fully generated.
//
// Bilingual schema (projects.json): shared fields (slug, folder, title,
// developedAt, year, area, featured, hidden) plus paired per-language
// fields (location_en/es, category_en/es, status_en/es, description_en/es,
// involvement_en/es). independentLabel_en/es shows instead of "Developed
// at" for independent work.
//
// hidden:true projects are excluded from ALL generated output (no page
// is written, no index entry, no homepage image) — data stays in
// projects.json for later enabling.
//
// Image ordering / curation convention:
//   assets/images/<folder>/NN-description.ext    -> gallery order; the
//                                                    lowest-numbered image
//                                                    (00 or 01) is always
//                                                    the cover shown on
//                                                    hover/click in the
//                                                    Projects index
//   assets/images/<folder>/NN-description-c.ext  -> eligible for HERO_CURATION
// A project's optional "excludeImages" array (filenames) removes images
// from the published gallery without deleting them from disk.
//
// The homepage carousel is a curated, explicit list (HERO_CURATION
// below) — not automatic. Edit that list to change it.
//
// Rerun after editing projects.json or adding/removing/reordering images.
// No npm dependencies — safe to run anywhere Node runs.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';

const allProjects = JSON.parse(fs.readFileSync('projects.json', 'utf8'));
const projects = allProjects.filter(p => !p.hidden);

const LANGS = ['en', 'es'];

const IMG_RE = /^(\d+)-(.+?)(-c)?\.(jpe?g|png|webp)$/i;

// ---------------- Curated homepage carousel ----------------
// Explicit, intentional selection — not every project's auto hero.
const HERO_CURATION = [
  'assets/images/tramuntana/02-aerial-c.jpg',
  'assets/images/tramuntana/04-road-into-property-c.jpg',
  'assets/images/serrano-heights/03-entrance-c.jpg',
  'assets/images/serrano-heights/06-living-room.jpg',
  'assets/images/casa-porreres/01-salon-render-c.jpg',
  'assets/images/corales-80/03-pool-terrace-render.jpg',
  'assets/images/ramsay-1850/01-street-facade.jpg',
  'assets/images/ramsay-1850/04-aerial-rooftop.jpg',
  'assets/images/casa-porreres/05-kitchen-render.jpg',
  'assets/images/canoa-15/01-front-exterior-c.jpg',
  'assets/images/casa-jungla/00-aerial-distant-c.jpg',
  'assets/images/humlebaek-house/01-exterior-street-c.jpg',
];

const UI = {
  en: {
    logo: 'SEAN HARRISON',
    nav: { work: 'Projects', profile: 'About', contact: 'Contact' },
    gateLabel: 'Portfolio Access', showPw: 'Show password',
    enter: 'Enter', gateError: 'Incorrect password. Please try again.', requestAccess: 'Request access',
    footerTag: 'Architect / Project Lead', lockPortfolio: 'Lock portfolio',
    previous: 'Previous', next: 'Next', projectIndex: 'Project Index',
    developedAt: 'Developed at', status: 'Status', langLabel: 'ES', langName: 'Español',
    prevImage: 'Previous image', nextImage: 'Next image', independentGroup: 'Independent',
  },
  es: {
    logo: 'SEAN HARRISON',
    nav: { work: 'Proyectos', profile: 'Sobre mí', contact: 'Contacto' },
    gateLabel: 'Acceso al portfolio', showPw: 'Mostrar contraseña',
    enter: 'Entrar', gateError: 'Contraseña incorrecta. Inténtalo de nuevo.', requestAccess: 'Solicitar acceso',
    footerTag: 'Arquitecto / Director de proyecto', lockPortfolio: 'Bloquear portfolio',
    previous: 'Anterior', next: 'Siguiente', projectIndex: 'Índice de proyectos',
    developedAt: 'Desarrollado en', status: 'Estado', langLabel: 'EN', langName: 'English',
    prevImage: 'Imagen anterior', nextImage: 'Imagen siguiente', independentGroup: 'Independiente',
  },
};

function getImageDimensions(filePath){
  const buf = fs.readFileSync(filePath);
  if (buf[0] === 0x89 && buf[1] === 0x50){ // PNG
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xFF && buf[1] === 0xD8){ // JPEG
    let offset = 2;
    while (offset < buf.length){
      if (buf[offset] !== 0xFF) { offset++; continue; }
      const marker = buf[offset + 1];
      const isSOF = (marker >= 0xC0 && marker <= 0xCF) && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC;
      const segLength = buf.readUInt16BE(offset + 2);
      if (isSOF) return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      offset += 2 + segLength;
    }
  }
  return { width: 0, height: 0 };
}
function formatFor(width, height){
  if (!width || !height) return 'vertical';
  if (Math.abs(width - height) / Math.max(width, height) < 0.05) return 'square';
  return width > height ? 'horizontal' : 'vertical';
}
function toAlt(description){
  const words = description.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function listImages(project){
  const dir = path.join('assets', 'images', project.folder);
  if (!fs.existsSync(dir)) return [];
  const exclude = new Set(project.excludeImages || []);
  const files = fs.readdirSync(dir).filter(f => IMG_RE.test(f) && !exclude.has(f));
  return files
    .map(file => {
      const [, num, description, flag] = file.match(IMG_RE);
      return {
        file, num: parseInt(num, 10), description,
        isCarousel: !!flag,
        alt: toAlt(description)
      };
    })
    .sort((a, b) => a.num - b.num);
}

const HEAD_FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Work+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">`;

// prefix: relative path from this page back to its own language root (e.g. "../")
// altHref: relative href to the equivalent page in the other language
function gateAndHeader(lang, prefix, active, altHref){
  const t = UI[lang];
  return `<header class="site-header is-solid" id="siteHeader">
  <div class="header-inner">
    <a href="${prefix}index.html" class="logo-mark">
      <span class="logo-name">${t.logo}</span>
    </a>
    <nav class="nav-links">
      <a href="${prefix}work.html"${active === 'work' ? ' class="is-active"' : ''}>${t.nav.work}</a>
    </nav>
    <div class="nav-right">
      <nav class="nav-links">
        <a href="${prefix}profile.html">${t.nav.profile}</a>
        <a href="${prefix}contact.html">${t.nav.contact}</a>
        <a href="${altHref}" class="lang-switch">${t.langLabel}</a>
      </nav>
      <button class="menu-toggle" id="menuToggle" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span>
      </button>
    </div>
  </div>
</header>

<div class="mobile-menu" id="mobileMenu">
  <button class="mobile-close" id="mobileClose" aria-label="Close menu">&times;</button>
  <a href="${prefix}work.html">${t.nav.work}</a>
  <a href="${prefix}profile.html">${t.nav.profile}</a>
  <a href="${prefix}contact.html">${t.nav.contact}</a>
  <a href="${altHref}">${t.langName}</a>
</div>`;
}

function footer(lang, prefix){
  const t = UI[lang];
  return `<footer class="site-footer">
  <div class="wrap footer-top">
    <div class="footer-col">
      <span class="logo-name">${t.logo}</span>
      <p style="margin-top:10px; opacity:0.6;">${t.footerTag}</p>
    </div>
    <div class="footer-col">
      <p>Madrid, Spain</p>
      <p><a href="mailto:seanharrison.coelho@gmail.com" class="link-arrow" style="padding-bottom:0;">seanharrison.coelho@gmail.com</a></p>
    </div>
    <div class="footer-col">
      <p><a href="${prefix}profile.html">${t.nav.profile}</a></p>
      <p><a href="${prefix}contact.html">${t.nav.contact}</a></p>
      <p><a href="https://www.linkedin.com/in/sharrison92/" class="link-arrow" style="padding-bottom:0;" target="_blank" rel="noopener">LinkedIn</a></p>
    </div>
  </div>
  <div class="wrap footer-bottom">
    <span>&copy; 2026 Sean Harrison</span>
    <a href="/api/logout" style="opacity:0.8;">${t.lockPortfolio}</a>
  </div>
</footer>`;
}

function projectPage(lang, project, prevProject, nextProject){
  const t = UI[lang];
  const title = project.title;
  const location = project[`location_${lang}`] || '';
  const year = project.year || '';
  const category = project[`category_${lang}`] || '';
  const status = project[`status_${lang}`] || '';
  const area = project.area || '';
  const description = project[`description_${lang}`] || '';
  const involvement = project[`involvement_${lang}`] || '';
  const imagePrefix = lang === 'en' ? '../' : '../../'; // /projects/ sits one level below root; /es/projects/ sits two levels below root

  const imgs = listImages(project);
  const carouselImgs = imgs.map(img =>
    `      <img src="${imagePrefix}assets/images/${project.folder}/${img.file}" alt="${title}: ${img.alt}" draggable="false">`
  ).join('\n');
  const carouselClass = imgs.length ? '' : ' no-images';

  const developedRow = project.developedAt
    ? { split: true, html: `<span>${t.developedAt}</span><span>${project.developedAt}</span>` }
    : (project[`independentLabel_${lang}`] || null);

  const metaRows = [
    status ? { split: true, html: `<span>${t.status}</span><span>${status}</span>` } : null,
    `${location}${year ? ', ' + year : ''}`,
    category || null,
    developedRow,
    area || null,
  ].filter(Boolean).map(row =>
    typeof row === 'object'
      ? `        <div class="meta-row meta-row--split">${row.html}</div>`
      : `        <div class="meta-row">${row}</div>`
  ).join('\n');

  const descHTML = [description, involvement].filter(Boolean).map(p => `<p>${p}</p>`).join('\n        ');

  const altHref = lang === 'en' ? `../es/projects/${project.slug}.html` : `../../projects/${project.slug}.html`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} – Sean Harrison</title>
<meta name="robots" content="noindex, nofollow">
${HEAD_FONTS}
<link rel="stylesheet" href="${imagePrefix}styles.css">
</head>
<body>

${gateAndHeader(lang, imagePrefix, 'work', altHref)}

<main class="project-main">
  <div class="carousel-wrap${carouselClass}" aria-label="${title} gallery">
    <div class="carousel-track">
${carouselImgs}
    </div>
  </div>

  <div class="wrap project-info">
    <div class="project-info-grid">
      <div>
        <p class="project-title project-info-title">${title}</p>
        ${descHTML}
      </div>
      <div class="project-meta-list">
${metaRows}
      </div>
    </div>
  </div>

  <nav class="project-nav wrap">
    <a href="${prevProject ? prevProject.slug + '.html' : '#'}">${prevProject ? t.previous + ': ' + prevProject.title : ''}</a>
    <a href="${imagePrefix}work.html" class="nav-center">${t.projectIndex}</a>
    <a href="${nextProject ? nextProject.slug + '.html' : '#'}">${nextProject ? t.next + ': ' + nextProject.title : ''}</a>
  </nav>
</main>

${footer(lang, imagePrefix)}

<script src="${imagePrefix}main.js"></script>
</body>
</html>
`;
}

function heroSlides(lang){
  const imagePrefix = lang === 'en' ? '' : '../'; // /index.html vs /es/index.html — both reference the root-level assets/ folder
  const slides = HERO_CURATION.map(imgPath => {
    const folder = imgPath.split('/')[2];
    const project = projects.find(p => p.folder === folder);
    if (!project) return null;
    const file = imgPath.split('/').pop();
    const m = file.match(IMG_RE);
    const alt = m ? toAlt(m[2]) : project.title;
    const loc = project[`location_${lang}`] || '';
    const caption = loc ? `${project.title}, ${loc}` : project.title;
    return { imgPath, alt, caption };
  }).filter(Boolean);

  return slides.map((s, i) => {
    const { width, height } = getImageDimensions(path.join(...s.imgPath.split('/')));
    return `    <div class="hero-slide${i === 0 ? ' is-active' : ''}" data-format="${formatFor(width, height)}" data-caption="${s.caption}">
      <img src="${imagePrefix}${s.imgPath}" alt="${s.caption}: ${s.alt}">
    </div>`;
  }).join('\n');
}

function projectRecord(lang, project){
  const imagePrefix = lang === 'en' ? '' : '../'; // /work.html vs /es/work.html — both reference the root-level assets/ folder
  const imgs = listImages(project);
  const cover = imgs[0] || null; // lowest-numbered image (00 or 01) is always the hover/click cover
  const images = imgs.map(img => ({
    src: `${imagePrefix}assets/images/${project.folder}/${img.file}`,
    alt: `${project.title}: ${img.alt}`
  }));

  return {
    slug: project.slug,
    title: project.title,
    location: project[`location_${lang}`] || '',
    year: project.year || '',
    area: project.area || '',
    category: project[`category_${lang}`] || '',
    status: project[`status_${lang}`] || '',
    developedAt: project.developedAt || '',
    independentLabel: project[`independentLabel_${lang}`] || '',
    description: project[`description_${lang}`] || '',
    involvement: project[`involvement_${lang}`] || '',
    featured: !!project.featured,
    hero: cover ? `${imagePrefix}assets/images/${project.folder}/${cover.file}` : '',
    images
  };
}

function projectsDataScript(lang){
  const t = UI[lang];
  const i18n = {
    developedAt: t.developedAt,
    prevImage: t.prevImage,
    nextImage: t.nextImage,
    independentGroup: t.independentGroup,
  };
  return `<script id="projects-data" type="application/json">${JSON.stringify(projects.map(p => projectRecord(lang, p)))}</script>
    <script id="projects-i18n" type="application/json">${JSON.stringify(i18n)}</script>`;
}

function replaceBetweenMarkers(filePath, startMarker, endMarker, newContent){
  const html = fs.readFileSync(filePath, 'utf8');
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) throw new Error(`Markers ${startMarker}/${endMarker} not found in ${filePath}`);
  const before = html.slice(0, startIdx + startMarker.length);
  const after = html.slice(endIdx);
  fs.writeFileSync(filePath, `${before}\n${newContent}\n    ${after}`);
}

function build(){
  LANGS.forEach(lang => {
    const base = lang === 'en' ? '.' : 'es';
    const projectsDir = path.join(base, 'projects');
    fs.mkdirSync(projectsDir, { recursive: true });

    projects.forEach((project, i) => {
      const prev = projects[i - 1] || null;
      const next = projects[i + 1] || null;
      fs.writeFileSync(path.join(projectsDir, `${project.slug}.html`), projectPage(lang, project, prev, next));
    });

    const indexPath = path.join(base, 'index.html');
    const workPath = path.join(base, 'work.html');
    replaceBetweenMarkers(indexPath, '<!-- HERO_SLIDES:START -->', '<!-- HERO_SLIDES:END -->', heroSlides(lang));
    replaceBetweenMarkers(workPath, '<!-- PROJECTS_DATA:START -->', '<!-- PROJECTS_DATA:END -->', projectsDataScript(lang));
  });

  console.log(`Built ${projects.length} visible projects (of ${allProjects.length} total) x ${LANGS.length} languages.`);
}

build();

// ============================================================
// Sean Harrison — static site generator
//
// Regenerates, from projects.json + assets/images/<folder>/:
//   - projects/<slug>.html      (full-bleed carousel + info template)
//   - index.html                (home hero carousel, "-c" tagged images only)
//   - work.html                 (project index cards, sortable client-side)
//
// Image ordering / curation convention:
//   assets/images/<folder>/NN-description.ext         -> gallery order
//   assets/images/<folder>/NN-description-c.ext        -> also eligible for
//                                                          the homepage hero carousel
//   assets/images/<folder>/NN-description-f.ext        -> used as this project's
//                                                          cover/hero image in the
//                                                          Projects index (hover
//                                                          preview + click-start)
//   assets/images/<folder>/NN-description-c-f.ext      -> both at once
// (NN is just the sort order — rename files to reorder. Without any "-f"
// image, the cover falls back to the "-c" image, then to the first image.)
//
// Optional per-project field "status" (e.g. "In Progress", "Under
// Construction", "Pending Approval") renders as a "Status" row in the
// project page's meta list (alongside location/role/area) — not on the
// work index. Omit/leave blank for completed, photographed projects.
//
// Rerun after editing projects.json or adding/removing/reordering images.
// No npm dependencies — safe to run anywhere Node runs.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';

const projects = JSON.parse(fs.readFileSync('projects.json', 'utf8'));

const IMG_RE = /^(\d+)-(.+?)((?:-[cf])*)\.(jpe?g|png|webp)$/i;

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
  const files = fs.readdirSync(dir).filter(f => IMG_RE.test(f));
  return files
    .map(file => {
      const [, num, description, flags] = file.match(IMG_RE);
      return {
        file, num: parseInt(num, 10), description,
        isCarousel: flags.includes('-c'),
        isFeaturedImage: flags.includes('-f'),
        alt: toAlt(description)
      };
    })
    .sort((a, b) => a.num - b.num);
}

const ENTITIES = { '&aacute;':'á', '&eacute;':'é', '&iacute;':'í', '&oacute;':'ó', '&uacute;':'ú', '&ntilde;':'ñ', '&uuml;':'ü' };
function plainText(html){
  return html.replace(/&[a-z]+;/gi, m => ENTITIES[m.toLowerCase()] || m);
}

const HEAD_FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Work+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">`;

function gateAndHeader(prefix, active){
  return `<div class="password-gate" id="passwordGate">
  <form class="gate-form" id="gateForm">
    <p class="gate-logo">SEAN HARRISON</p>
    <label class="eyebrow gate-label" for="gatePassword">Portfolio Access</label>
    <input type="password" id="gatePassword" class="gate-input" autocomplete="current-password" required>
    <button type="button" class="gate-toggle" id="gateToggle">Show password</button>
    <button type="submit" class="link-arrow gate-submit">Enter</button>
    <p class="gate-error" id="gateError">Incorrect password. Please try again.</p>
    <a class="gate-request" href="mailto:seanharrison.coelho@gmail.com?subject=Portfolio%20Access%20Request&body=Hi%20Sean%2C%0A%0AI%27d%20like%20to%20request%20access%20to%20your%20portfolio.%0A%0AName%3A%20%0AHow%20I%20found%20you%3A%20">Request access</a>
  </form>
</div>

<header class="site-header is-solid" id="siteHeader">
  <div class="header-inner">
    <a href="${prefix}index.html" class="logo-mark">
      <span class="logo-name">SEAN HARRISON</span>
    </a>
    <nav class="nav-links">
      <a href="${prefix}work.html"${active === 'work' ? ' class="is-active"' : ''}>Projects</a>
    </nav>
    <div class="nav-right">
      <nav class="nav-links">
        <a href="${prefix}profile.html">About</a>
        <a href="${prefix}contact.html">Contact</a>
      </nav>
      <button class="menu-toggle" id="menuToggle" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span>
      </button>
    </div>
  </div>
</header>

<div class="mobile-menu" id="mobileMenu">
  <button class="mobile-close" id="mobileClose" aria-label="Close menu">&times;</button>
  <a href="${prefix}work.html">Projects</a>
  <a href="${prefix}profile.html">About</a>
  <a href="${prefix}contact.html">Contact</a>
</div>`;
}

function footer(){
  return `<footer class="site-footer">
  <div class="wrap footer-top">
    <div class="footer-col">
      <span class="logo-name">SEAN HARRISON</span>
      <p style="margin-top:10px; opacity:0.6;">Architect &middot; Project Lead</p>
    </div>
    <div class="footer-col">
      <p>Madrid, Spain</p>
      <p><a href="mailto:seanharrison.coelho@gmail.com" class="link-arrow" style="padding-bottom:0;">seanharrison.coelho@gmail.com</a></p>
    </div>
    <div class="footer-col">
      <p><a href="../profile.html">About</a></p>
      <p><a href="../contact.html">Contact</a></p>
      <p><a href="https://www.linkedin.com/in/sharrison92/" class="link-arrow" style="padding-bottom:0;" target="_blank" rel="noopener">LinkedIn</a></p>
    </div>
  </div>
  <div class="wrap footer-bottom">
    <span>&copy; 2026 Sean Harrison</span>
    <a href="#" id="lockPortfolio" style="opacity:0.8;">Lock portfolio</a>
  </div>
</footer>`;
}

function projectPage(project, prevProject, nextProject){
  const imgs = listImages(project);
  const carouselImgs = imgs.map(img =>
    `      <img src="../assets/images/${project.folder}/${img.file}" alt="${plainText(project.title)} — ${img.alt}" draggable="false">`
  ).join('\n');
  const carouselClass = imgs.length ? '' : ' no-images';

  const roleLine = project.role && project.role.length
    ? project.role.join(', ')
    : (project.studio ? '' : 'Architect / Independent Project');

  const metaRows = [
    project.status ? { split: true, html: `<span>Status</span><span>${project.status}</span>` } : null,
    `${project.location}${project.year ? ' &middot; ' + project.year : ''}`,
    roleLine || null,
    project.studio ? { split: true, html: `<span>Developed at</span><span>${project.studio}</span>` } : null,
    project.area || null,
  ].filter(Boolean).map(row =>
    typeof row === 'object'
      ? `        <div class="meta-row meta-row--split">${row.html}</div>`
      : `        <div class="meta-row">${row}</div>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${plainText(project.title)} — Sean Harrison</title>
${HEAD_FONTS}
<link rel="stylesheet" href="../styles.css">
</head>
<body>

${gateAndHeader('../', 'work')}

<main class="project-main">
  <div class="carousel-wrap${carouselClass}" aria-label="${plainText(project.title)} gallery">
    <div class="carousel-track">
${carouselImgs}
    </div>
  </div>

  <div class="wrap project-info">
    <div class="project-info-grid">
      <div>
        <p class="project-title project-info-title">${project.title}</p>
        <p class="project-info-desc">${project.description}</p>
      </div>
      <div class="project-meta-list">
${metaRows}
      </div>
    </div>
  </div>

  <nav class="project-nav wrap">
    <a href="${prevProject ? prevProject.slug + '.html' : '#'}">${prevProject ? '&larr; ' + prevProject.title : ''}</a>
    <a href="../work.html" class="nav-center">Project Index</a>
    <a href="${nextProject ? nextProject.slug + '.html' : '#'}">${nextProject ? nextProject.title + ' &rarr;' : ''}</a>
  </nav>
</main>

${footer()}

<script src="../main.js"></script>
</body>
</html>
`;
}

function heroSlides(){
  const slides = [];
  projects.forEach(project => {
    listImages(project).filter(img => img.isCarousel).forEach(img => {
      const fullPath = path.join('assets', 'images', project.folder, img.file);
      const { width, height } = getImageDimensions(fullPath);
      slides.push(`    <div class="hero-slide" data-format="${formatFor(width, height)}" data-caption="${project.caption}">
      <img src="assets/images/${project.folder}/${img.file}" alt="${plainText(project.title)} — ${img.alt}">
    </div>`);
    });
  });
  if (slides.length) slides[0] = slides[0].replace('class="hero-slide"', 'class="hero-slide is-active"');
  return slides.join('\n');
}

function projectRecord(project){
  const imgs = listImages(project);
  const cover = (imgs.find(i => i.isFeaturedImage) || imgs.find(i => i.isCarousel) || imgs[0] || null);
  const images = imgs.map(img => ({
    src: `assets/images/${project.folder}/${img.file}`,
    alt: `${plainText(project.title)} — ${img.alt}`
  }));
  const roleLine = project.role && project.role.length
    ? project.role
    : (project.studio ? [] : ['Architect / Independent Project']);

  return {
    slug: project.slug,
    title: plainText(project.title),
    location: plainText(project.location || ''),
    year: project.year || '',
    category: project.category || '',
    status: project.status || '',
    studio: project.studio || '',
    role: roleLine,
    description: plainText(project.description || ''),
    featured: !!project.featured,
    caseStudy: !!project.caseStudy,
    hero: cover ? `assets/images/${project.folder}/${cover.file}` : '',
    images
  };
}

function projectsDataScript(){
  return `<script id="projects-data" type="application/json">${JSON.stringify(projects.map(projectRecord))}</script>`;
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
  fs.mkdirSync('projects', { recursive: true });
  projects.forEach((project, i) => {
    const prev = projects[i - 1] || null;
    const next = projects[i + 1] || null;
    fs.writeFileSync(path.join('projects', `${project.slug}.html`), projectPage(project, prev, next));
  });

  replaceBetweenMarkers('index.html', '<!-- HERO_SLIDES:START -->', '<!-- HERO_SLIDES:END -->', heroSlides());
  replaceBetweenMarkers('work.html', '<!-- PROJECTS_DATA:START -->', '<!-- PROJECTS_DATA:END -->', projectsDataScript());

  console.log(`Built ${projects.length} project pages + hero + index.`);
}

build();

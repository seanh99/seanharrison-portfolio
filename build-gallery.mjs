// ============================================================
// Sean Harrison — gallery / hero carousel builder
//
// Naming convention for files in assets/images/<project-folder>/:
//   NN-description.jpg      -> included in the project's gallery, in NN order
//   NN-description-c.jpg    -> also included in the homepage hero carousel
//
// Usage:
//   node build-gallery.mjs gallery <slug>   regenerate one project's gallery
//   node build-gallery.mjs hero             regenerate the homepage hero carousel
//   node build-gallery.mjs all              regenerate every gallery + the hero
//
// Rerun after adding, removing, or renumbering images. Captions/copy/meta
// text are untouched — only the content between the marker comments below
// is replaced.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_RE = /^(\d+)-(.+?)(-c)?\.(jpe?g|png|webp)$/i;

function loadProjects(){
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'projects.json'), 'utf8'));
}

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
      if (isSOF){
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
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

function listProjectImages(project){
  const dir = path.join(__dirname, 'assets', 'images', project.folder);
  const files = fs.readdirSync(dir).filter(f => IMG_RE.test(f));
  const images = files.map(file => {
    const [, num, description, carouselFlag, ext] = file.match(IMG_RE);
    const abs = path.join(dir, file);
    const { width, height } = getImageDimensions(abs);
    return {
      file, num: parseInt(num, 10), description,
      isCarousel: !!carouselFlag,
      alt: toAlt(description),
      format: formatFor(width, height),
    };
  });
  images.sort((a, b) => a.num - b.num);
  return images;
}

function replaceBetweenMarkers(filePath, startMarker, endMarker, newContent){
  const html = fs.readFileSync(filePath, 'utf8');
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1){
    throw new Error(`Markers ${startMarker} / ${endMarker} not found in ${filePath}`);
  }
  const before = html.slice(0, startIdx + startMarker.length);
  const after = html.slice(endIdx);
  fs.writeFileSync(filePath, `${before}\n${newContent}\n    ${after}`);
}

function buildProjectGallery(slug){
  const projects = loadProjects();
  const project = projects.find(p => p.slug === slug);
  if (!project) throw new Error(`No project "${slug}" in projects.json`);

  const images = listProjectImages(project).filter(img => img.description !== 'cover');
  const block = images.map(img =>
    `    <img src="../assets/images/${project.folder}/${img.file}" alt="${img.alt}" loading="lazy">`
  ).join('\n');

  const filePath = path.join(__dirname, 'projects', `${slug}.html`);
  replaceBetweenMarkers(filePath, '<!-- GALLERY:START -->', '<!-- GALLERY:END -->', block);
  console.log(`Gallery updated: ${slug} (${images.length} images)`);
}

function buildHero(){
  const projects = loadProjects();
  const slides = [];
  projects.forEach(project => {
    const images = listProjectImages(project).filter(img => img.isCarousel);
    images.forEach(img => {
      slides.push(`    <div class="hero-slide" data-format="${img.format}" data-caption="${project.caption}">
      <img src="assets/images/${project.folder}/${img.file}" alt="${project.title} — ${img.alt}">
    </div>`);
    });
  });
  if (slides.length) slides[0] = slides[0].replace('class="hero-slide"', 'class="hero-slide is-active"');

  const filePath = path.join(__dirname, 'index.html');
  replaceBetweenMarkers(filePath, '<!-- HERO_SLIDES:START -->', '<!-- HERO_SLIDES:END -->', slides.join('\n'));
  console.log(`Hero carousel updated: ${slides.length} slides across ${projects.length} project(s)`);
}

const [, , cmd, arg] = process.argv;
if (cmd === 'gallery' && arg){
  buildProjectGallery(arg);
} else if (cmd === 'hero'){
  buildHero();
} else if (cmd === 'all'){
  loadProjects().forEach(p => buildProjectGallery(p.slug));
  buildHero();
} else {
  console.log('Usage:\n  node build-gallery.mjs gallery <slug>\n  node build-gallery.mjs hero\n  node build-gallery.mjs all');
}

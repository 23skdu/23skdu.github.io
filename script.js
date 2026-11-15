import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Hero 3D scene ---------- */
const canvas = document.getElementById('hero-canvas');
const heroSection = document.getElementById('hero');

let renderer, scene, camera, composer, controls;
let animId = null;
const clock = new THREE.Clock();

function initScene() {
  if (!canvas) return;
  const w = heroSection.clientWidth;
  const h = heroSection.clientHeight;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07070f, 0.045);

  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
  camera.position.set(0, 1.6, 6);

  // Lights
  scene.add(new THREE.AmbientLight(0x222244, 0.6));
  const l1 = new THREE.PointLight(0x00f0ff, 2.5, 30);
  l1.position.set(4, 3, 2);
  scene.add(l1);
  const l2 = new THREE.PointLight(0xff2bd6, 2.5, 30);
  l2.position.set(-4, -2, -2);
  scene.add(l2);
  const l3 = new THREE.PointLight(0xffe600, 1.2, 20);
  l3.position.set(0, 4, -3);
  scene.add(l3);

  // Grid floor
  const grid = new THREE.GridHelper(40, 40, 0x00f0ff, 0x1a1a3a);
  grid.position.y = -2;
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  scene.add(grid);

  // Particles
  const pCount = reducedMotion ? 400 : 1200;
  const pGeom = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 30;
    pPos[i * 3 + 1] = (Math.random() - 0.5) * 16;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }
  pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0x00f0ff, size: 0.05, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(pGeom, pMat);
  scene.add(points);

  // Floating objects
  const objs = [];
  const mk = (geom, color, pos) => {
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.4,
      wireframe: true, transparent: true, opacity: 0.85
    });
    const m = new THREE.Mesh(geom, mat);
    m.position.set(...pos);
    scene.add(m);
    objs.push(m);
    return m;
  };
  mk(new THREE.TorusKnotGeometry(0.9, 0.28, 120, 16), 0x00f0ff, [0, 0.5, 0]);
  mk(new THREE.IcosahedronGeometry(1.1, 1), 0xff2bd6, [-2.6, 0.8, -1]);
  mk(new THREE.OctahedronGeometry(0.9, 0), 0xffe600, [2.6, -0.2, -0.5]);
  mk(new THREE.TorusGeometry(1.2, 0.05, 8, 40), 0x00f0ff, [0, -0.5, -2]);

  // Post-processing bloom
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.9, 0.4, 0.2);
  composer.addPass(bloom);

  // Controls (auto-rotate, no user zoom on mobile-ish)
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 0.6;
  controls.enablePan = false;
  controls.minDistance = 4;
  controls.maxDistance = 10;

  // Resize
  window.addEventListener('resize', onResize);

  // Animate
  if (reducedMotion) {
    composer.render();
    return;
  }
  animate();
}

function onResize() {
  if (!renderer || !heroSection) return;
  const w = heroSection.clientWidth;
  const h = heroSection.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}

function animate() {
  animId = requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  // gentle floating
  scene.children.forEach((c, i) => {
    if (c.isMesh && c.geometry && c.geometry.type !== 'BufferGeometry') {
      c.rotation.x = t * 0.3 + i;
      c.rotation.y = t * 0.5 + i;
      c.position.y += Math.sin(t + i) * 0.0008;
    }
  });
  controls.update();
  composer.render();
}

// Lazy init via IntersectionObserver-ish: init on load but only animate when visible
if (canvas) {
  // Defer slightly to let page render
  requestAnimationFrame(() => initScene());
}

/* ---------- Data loading ---------- */
const FALLBACK_URL = '/data/projects.json';

async function fetchAllRepos() {
  const pages = [1, 2, 3, 4, 5];
  const results = await Promise.allSettled(pages.map(p =>
    fetch(`https://api.github.com/users/23skdu/repos?per_page=100&page=${p}&sort=pushed`, {
      headers: { 'Accept': 'application/vnd.github+json' }
    }).then(r => r.ok ? r.json() : [])
  ));
  const combined = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) combined.push(...r.value);
  }
  // dedup by id
  const seen = new Set();
  const uniq = combined.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
  return uniq
    .filter(r => !r.fork && r.name !== '23skdu.github.io')
    .map(r => ({
      name: r.name,
      description: r.description || '',
      language: r.language || 'Other',
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      topics: r.topics || [],
      pushed_at: r.pushed_at,
      html_url: r.html_url,
      homepage: r.homepage || ''
    }))
    .sort((a, b) => (b.pushed_at || '').localeCompare(a.pushed_at || ''));
}

async function loadProjects() {
  const cacheKey = 'skdu_repos_v2';
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }
  try {
    const owned = await fetchAllRepos();
    if (owned.length) {
      sessionStorage.setItem(cacheKey, JSON.stringify(owned));
      return owned;
    }
  } catch (e) {
    // fall through
  }
  try {
    const res = await fetch(FALLBACK_URL);
    if (res.ok) return await res.json();
  } catch (e) {}
  return [];
}

async function loadUser() {
  try {
    const res = await fetch('https://api.github.com/users/23skdu');
    if (res.ok) return await res.json();
  } catch (e) {}
  return null;
}

/* ---------- Render projects ---------- */
const grid = document.getElementById('projects-grid');
const filtersEl = document.getElementById('filters');
const statusEl = document.getElementById('projects-status');

let allProjects = [];
let activeFilter = 'All';

function langColor(lang) {
  const map = {
    Go:'#00add8', Python:'#3776ab', Rust:'#dea584', 'C++':'#f34b7d',
    TypeScript:'#3178c6', Java:'#b07219', HCL:'#844fba', Perl:'#0298c3',
    Shell:'#89e051', Makefile:'#427819', Dockerfile:'#384d54', Other:'#8a8aa8'
  };
  return map[lang] || '#8a8aa8';
}

function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 86400) return 'today';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + 'd ago';
  if (diff < 86400 * 30) return Math.floor(diff / (86400 * 7)) + 'w ago';
  if (diff < 86400 * 365) return Math.floor(diff / (86400 * 30)) + 'mo ago';
  return Math.floor(diff / (86400 * 365)) + 'y ago';
}

function isActive(iso) {
  if (!iso) return false;
  return (Date.now() - new Date(iso).getTime()) < 86400 * 180 * 1000;
}

function renderFilters(projects) {
  const langs = ['All', ...Array.from(new Set(projects.map(p => p.language))).sort()];
  filtersEl.innerHTML = '';
  langs.forEach(l => {
    const b = document.createElement('button');
    b.className = 'filter-btn' + (l === activeFilter ? ' active' : '');
    b.textContent = l;
    b.addEventListener('click', () => {
      activeFilter = l;
      document.querySelectorAll('.filter-btn').forEach(x => x.classList.toggle('active', x.textContent === l));
      renderGrid();
    });
    filtersEl.appendChild(b);
  });
}

function renderGrid() {
  if (!grid) return;
  const filtered = activeFilter === 'All' ? allProjects : allProjects.filter(p => p.language === activeFilter);
  grid.innerHTML = '';
  filtered.forEach(p => {
    const card = document.createElement('article');
    card.className = 'project-card';
    const topics = (p.topics || []).slice(0, 4).map(t => `<span class="topic">${escapeHtml(t)}</span>`).join('');
    const activeBadge = isActive(p.pushed_at) ? '<span class="topic" style="border-color:var(--cyan);color:var(--cyan)">active</span>' : '';
    card.innerHTML = `
      <h3><a href="${escapeAttr(p.html_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.name)}</a></h3>
      <p class="project-desc">${escapeHtml(p.description || 'No description.')}</p>
      <div class="project-meta">
        <span><span class="lang-dot lang-${escapeAttr(p.language)}" style="background:${langColor(p.language)}"></span>${escapeHtml(p.language)}</span>
        <span>★ ${p.stars}</span>
        <span>pushed ${timeAgo(p.pushed_at)}</span>
      </div>
      <div class="project-topics">${activeBadge}${topics}</div>
      <div class="project-links">
        <a href="${escapeAttr(p.html_url)}" target="_blank" rel="noopener noreferrer">repo ↗</a>
        ${p.homepage ? `<a href="${escapeAttr(p.homepage)}" target="_blank" rel="noopener noreferrer">live ↗</a>` : ''}
      </div>
    `;
    grid.appendChild(card);
  });
  if (statusEl) {
    statusEl.textContent = `Showing ${filtered.length} of ${allProjects.length} projects`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

/* ---------- Boot ---------- */
async function boot() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const [projects, user] = await Promise.all([loadProjects(), loadUser()]);
  allProjects = projects;
  renderFilters(allProjects);
  renderGrid();

  // Stats
  const reposEl = document.getElementById('stat-repos');
  const starsEl = document.getElementById('stat-stars');
  const followersEl = document.getElementById('stat-followers');
  if (user) {
    if (reposEl) reposEl.textContent = user.public_repos ?? allProjects.length;
    if (followersEl) followersEl.textContent = user.followers ?? '—';
  } else {
    if (reposEl) reposEl.textContent = allProjects.length;
  }
  if (starsEl) {
    const totalStars = allProjects.reduce((s, p) => s + (p.stars || 0), 0);
    starsEl.textContent = totalStars;
  }

  // Nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }
}

boot();

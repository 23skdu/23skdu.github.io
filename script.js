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
let saucerState = null;

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
  const l1 = new THREE.PointLight(0xff3b3b, 2.5, 30);
  l1.position.set(4, 3, 2);
  scene.add(l1);
  const l2 = new THREE.PointLight(0x39ff14, 2.5, 30);
  l2.position.set(-4, -2, -2);
  scene.add(l2);
  const l3 = new THREE.PointLight(0x0080ff, 1.2, 20);
  l3.position.set(0, 4, -3);
  scene.add(l3);

  // Grid floor
  const grid = new THREE.GridHelper(40, 40, 0xff3b3b, 0x1a1a3a);
  grid.position.y = -2;
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  scene.add(grid);

  // Particles
  const pCount = reducedMotion ? 80 : 250;
  const pGeom = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 30;
    pPos[i * 3 + 1] = (Math.random() - 0.5) * 16;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }
  pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

  // Little yellow smiley-face sprite for the particles
  const smileyCanvas = document.createElement('canvas');
  smileyCanvas.width = smileyCanvas.height = 64;
  const sctx = smileyCanvas.getContext('2d');
  // Yellow face
  sctx.fillStyle = '#ffff00';
  sctx.beginPath();
  sctx.arc(32, 32, 30, 0, Math.PI * 2);
  sctx.fill();
  // Cut out eyes and smile so they are transparent (see-through)
  sctx.globalCompositeOperation = 'destination-out';
  sctx.fillStyle = 'rgba(0,0,0,1)';
  sctx.beginPath();
  sctx.arc(22, 26, 5, 0, Math.PI * 2);
  sctx.fill();
  sctx.beginPath();
  sctx.arc(42, 26, 5, 0, Math.PI * 2);
  sctx.fill();
  sctx.lineWidth = 6;
  sctx.strokeStyle = 'rgba(0,0,0,1)';
  sctx.beginPath();
  sctx.arc(32, 34, 15, 0.15 * Math.PI, 0.85 * Math.PI);
  sctx.stroke();
  sctx.globalCompositeOperation = 'source-over';

  const smileyTex = new THREE.CanvasTexture(smileyCanvas);
  const pMat = new THREE.PointsMaterial({
    map: smileyTex,
    color: 0xffffff,
    size: 0.32,
    transparent: true,
    opacity: 0.85,
    alphaTest: 0.3,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
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
  mk(new THREE.TorusKnotGeometry(0.9, 0.28, 120, 16), 0xff3b3b, [0, 0.5, 0]);
  mk(new THREE.IcosahedronGeometry(1.1, 1), 0x39ff14, [-2.6, 0.8, -1]);
  mk(new THREE.OctahedronGeometry(0.9, 0), 0x0080ff, [2.6, -0.2, -0.5]);
  mk(new THREE.TorusGeometry(1.2, 0.05, 8, 40), 0x0080ff, [0, -0.5, -2]);

  // Classic 1950s flying saucer
  const saucer = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xb8b8b8, metalness: 0.9, roughness: 0.2 });
  // Tapered saucer body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.2, 0.25, 48), metalMat);
  saucer.add(body);
  // Lower rim ring
  const lowerRim = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.12, 12, 48), metalMat);
  lowerRim.rotation.x = Math.PI / 2;
  lowerRim.position.z = 0.05;
  saucer.add(lowerRim);
  // Glass dome
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x224466, emissiveIntensity: 0.3, transparent: true, opacity: 0.55, metalness: 0.1, roughness: 0.05 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glassMat);
  dome.position.y = 0.18;
  saucer.add(dome);
  // Dome ring
  const domeRing = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 8, 32), metalMat);
  domeRing.rotation.x = Math.PI / 2;
  domeRing.position.y = 0.18;
  saucer.add(domeRing);
  // Antenna
  const antennaMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.3 });
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8), antennaMat);
  antenna.position.y = 0.55;
  saucer.add(antenna);
  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xff3b3b, emissiveIntensity: 1 }));
  antennaTip.position.y = 0.88;
  saucer.add(antennaTip);
  // Porthole lights around rim
  const portColors = [0xff3b3b, 0x39ff14, 0x0080ff];
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const col = portColors[i % portColors.length];
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.2 }));
    light.position.set(Math.cos(ang) * 1.15, -0.05, Math.sin(ang) * 1.15);
    saucer.add(light);
  }
  // Under-glow light
  const sLight = new THREE.PointLight(0x39ff14, 1.4, 14);
  sLight.position.y = -0.4;
  saucer.add(sLight);
  saucer.position.set(0, 2.2, 0);
  scene.add(saucer);
  saucerState = { mesh: saucer, target: new THREE.Vector3(0, 2.2, 0), timer: 1 };

  // Moon texture (procedural pale cratered surface)
  const moonCanvas = document.createElement('canvas');
  moonCanvas.width = moonCanvas.height = 256;
  const mctx = moonCanvas.getContext('2d');
  mctx.fillStyle = '#f2f2f2';
  mctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 2 + Math.random() * 14;
    const g = 180 + Math.random() * 40;
    mctx.fillStyle = `rgb(${g},${g},${g})`;
    mctx.beginPath();
    mctx.arc(x, y, r, 0, Math.PI * 2);
    mctx.fill();
  }
  const moonTex = new THREE.CanvasTexture(moonCanvas);

  // Glowing smiley face that orbits the moon
  const smileySprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: smileyTex,
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  smileySprite.scale.set(0.35, 0.35, 1);
  scene.add(smileySprite);
  window.__smileySprite = smileySprite;

  // Moon in a fixed orbit
  const moonMat = new THREE.MeshStandardMaterial({ map: moonTex, color: 0xffffff, roughness: 0.95, metalness: 0.05 });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), moonMat);
  scene.add(moon);
  window.__moon = moon;

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
  const moon = window.__moon;
  scene.children.forEach((c, i) => {
    if (c === moon) return;
    if (c.isMesh && c.geometry && c.geometry.type !== 'BufferGeometry') {
      c.rotation.x = t * 0.3 + i;
      c.rotation.y = t * 0.5 + i;
      c.position.y += Math.sin(t + i) * 0.0008;
    }
  });
  // Moon: fixed orbit, rotating at the same speed as the axes (0.5 rad/s on Y)
  if (moon) {
    const angle = t * 0.5;
    const radius = 2.2;
    moon.position.set(Math.cos(angle) * radius, 0.8 + Math.sin(t * 0.2) * 0.1, Math.sin(angle) * radius);
    moon.rotation.y = angle;
  }

  // Glowing smiley face orbiting the moon
  const smileySprite = window.__smileySprite;
  if (smileySprite && moon) {
    const a = t * 1.6;
    const r = 0.9;
    smileySprite.position.set(
      moon.position.x + Math.cos(a) * r,
      moon.position.y + Math.sin(a * 0.8) * 0.35,
      moon.position.z + Math.sin(a) * r
    );
  }
  // Flying saucer random flight
  if (saucerState) {
    const s = saucerState;
    s.timer -= 0.016;
    if (s.timer <= 0) {
      s.target.set((Math.random() - 0.5) * 14, 1.2 + Math.random() * 3, (Math.random() - 0.5) * 14);
      s.timer = 2.5 + Math.random() * 4;
    }
    s.mesh.position.lerp(s.target, 0.012);
    s.mesh.rotation.y += 0.025;
    s.mesh.rotation.z = Math.sin(clock.getElapsedTime() * 1.5) * 0.15;
  }
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
    .filter(r => !r.fork && r.name !== '23skdu' && r.name !== '23skdu.github.io')
    .map(r => ({
      name: r.name,
      description: r.description || '',
      language: r.language || 'Other',
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      topics: r.topics || [],
      pushed_at: r.pushed_at,
      created_at: r.created_at,
      html_url: r.html_url,
      homepage: r.homepage || ''
    }))
    .sort((a, b) => (b.pushed_at || '').localeCompare(a.pushed_at || ''));
}

async function firstCommitDate(repo) {
  try {
    const url = `https://api.github.com/repos/23skdu/${encodeURIComponent(repo.name)}/commits?per_page=1`;
    const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } });
    if (!res.ok) return repo.created_at || null;
    const link = res.headers.get('Link') || '';
    const m = link.match(/<([^>]+)>;\s*rel="last"/);
    let target = url;
    if (m) target = m[1];
    const r2 = await fetch(target, { headers: { 'Accept': 'application/vnd.github+json' } });
    if (!r2.ok) return repo.created_at || null;
    const arr = await r2.json();
    if (Array.isArray(arr) && arr.length) {
      const last = arr[arr.length - 1];
      return last.commit?.committer?.date || last.commit?.author?.date || repo.created_at || null;
    }
    return repo.created_at || null;
  } catch (e) {
    return repo.created_at || null;
  }
}

async function loadProjects() {
  const cacheKey = 'skdu_repos_v6';
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }
  try {
    const owned = await fetchAllRepos();
    if (owned.length) {
      const enriched = await Promise.all(owned.map(async r => ({
        ...r,
        first_commit_at: await firstCommitDate(r)
      })));
      sessionStorage.setItem(cacheKey, JSON.stringify(enriched));
      return enriched;
    }
  } catch (e) {
    // fall through
  }
  try {
    const res = await fetch(FALLBACK_URL);
    if (res.ok) {
      const data = await res.json();
      return data.map(p => ({ ...p, first_commit_at: p.first_commit_at || p.created_at || null }));
    }
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

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toISOString().slice(0, 10); } catch (e) { return iso; }
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
    const activeBadge = isActive(p.pushed_at) ? '<span class="topic" style="border-color:var(--red);color:var(--red)">active</span>' : '';
    card.innerHTML = `
      <h3><a href="${escapeAttr(p.html_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.name)}</a></h3>
      <p class="project-desc">${escapeHtml(p.description || 'No description.')}</p>
      <div class="project-meta">
        <span><span class="lang-dot lang-${escapeAttr(p.language)}" style="background:${langColor(p.language)}"></span>${escapeHtml(p.language)}</span>
        <span>★ ${p.stars}</span>
        <span>pushed ${timeAgo(p.pushed_at)}</span>
        <span title="${escapeAttr(p.first_commit_at || '')}">first commit ${escapeHtml(formatDate(p.first_commit_at))} · ${escapeHtml(timeAgo(p.first_commit_at))}</span>
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

/* ---------- Theremin sound throughout the site ---------- */
(function setupThereminSound() {
  const snd = new Audio('/audio/alien-loading.mp3');
  snd.loop = true;
  snd.volume = 0.15;
  const tryPlay = () => { snd.play().catch(() => {}); };
  tryPlay();
  ['click', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, tryPlay, { once: true });
  });
})();

/* ---------- Auto-scroll through sections ---------- */
(function setupAutoScroll() {
  const sectionIds = ['hero', 'about', 'special-projects', 'projects', 'contact'];
  const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
  if (sections.length < 2) return;

  let idx = 0;
  let enabled = true;
  let timer = null;

  const disable = () => {
    if (!enabled) return;
    enabled = false;
    if (timer) clearTimeout(timer);
  };

  const tick = () => {
    if (!enabled) return;
    idx = (idx + 1) % sections.length;
    sections[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
    timer = setTimeout(tick, 20000);
  };

  timer = setTimeout(tick, 20000);

  ['click', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, disable, { once: true, passive: true });
  });
})();

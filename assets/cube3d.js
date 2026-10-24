/* Platino Cube: the 3D platinum cube (Home) and the 3D logo mark (About).
 * Loaded on demand by main.js. Uses the self-hosted three.js in ./vendor/.
 */
import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

// The four logo bars, same geometry as build.py (MARK_BARS), in a 1012 x 1388 box.
const MARK_BARS = [
  [[0, 293], [215, 185], [215, 1280], [0, 1388]],
  [[320, 108], [537, 0], [537, 925], [320, 1033]],
  [[643, 545], [1012, 360], [1012, 588], [643, 773]],
  [[537, 1128], [1012, 890], [1012, 1120], [537, 1358]],
];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const isMobile = () => window.matchMedia('(max-width: 860px)').matches;

function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile() ? 1.75 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

function makeEnvironment(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  pmrem.dispose();
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xcfdcff, 0x0a1224, 0.6));
  const key = new THREE.DirectionalLight(0xc9d8ff, 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);
  const sky = new THREE.PointLight(0x6f93cc, 18, 14);
  sky.position.set(-3, 2.5, 2);
  scene.add(sky);
  const red = new THREE.PointLight(0xed1c24, 9, 7);
  red.position.set(2.6, -2.2, -1.2);
  scene.add(red);
}

function platinum() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xf1f3f6, metalness: 1, roughness: 0.16,
    clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.35,
  });
}

function barGeometry(bar, depth) {
  const shape = new THREE.Shape();
  bar.forEach(([x, y], i) => {
    const px = (x - 506) / 1388;
    const py = -(y - 694) / 1388;
    if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py);
  });
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.012, bevelSegments: 4, curveSegments: 4,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

function makeMark(material) {
  const group = new THREE.Group();
  const bars = MARK_BARS.map((b) => {
    const m = new THREE.Mesh(barGeometry(b, 0.12), material);
    group.add(m);
    return m;
  });
  return { group, bars };
}

function svgImage(svg, color, size) {
  const src = svg
    .replace(/<svg\b[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">`)
    .replace('<g class="duo"', '<g class="duo" opacity="0.22"')
    .replace(/currentColor/g, color);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
  });
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((w) => {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  });
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* One face panel: smoked navy glass, silver border, engraved icon, number, name and line. */
async function facePanel(face, rtl, fonts) {
  const S = 1024;
  const pad = 92;
  const make = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  const color = make();
  const glow = make();
  const a = color.getContext('2d');
  const g = glow.getContext('2d');

  // Glass background
  const bg = a.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, '#22345e');
  bg.addColorStop(0.5, '#121c38');
  bg.addColorStop(1, '#080f22');
  a.fillStyle = bg;
  a.fillRect(0, 0, S, S);
  const sheen = a.createLinearGradient(0, 0, S, S * 0.7);
  sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
  sheen.addColorStop(0.35, 'rgba(255,255,255,0.02)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  a.fillStyle = sheen;
  a.fillRect(0, 0, S, S);
  g.fillStyle = '#000';
  g.fillRect(0, 0, S, S);

  // Fine silver frame
  [a, g].forEach((ctx, i) => {
    ctx.strokeStyle = i ? 'rgba(255,255,255,0.35)' : 'rgba(216,220,228,0.55)';
    ctx.lineWidth = 3;
    roundRect(ctx, 40, 40, S - 80, S - 80, 26);
    ctx.stroke();
  });

  const start = rtl ? S - pad : pad;
  const end = rtl ? pad : S - pad;
  [a, g].forEach((ctx) => { ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.textAlign = rtl ? 'right' : 'left'; });

  // Number (with a small red tick)
  [a, g].forEach((ctx, i) => {
    ctx.font = `400 46px ${fonts.latin}`;
    ctx.fillStyle = i ? '#9aa3b5' : '#aeb5c2';
    ctx.textBaseline = 'top';
    ctx.fillText(face.num, rtl ? start - 56 : start + 56, pad + 4);
    ctx.fillStyle = '#ed1c24';
    ctx.fillRect(rtl ? start - 40 : start, pad + 26, 40, 5);
  });

  // Icon in a ring
  const iconSize = 132;
  const ix = rtl ? pad : S - pad - iconSize - 40;
  const iy = pad - 20;
  [a, g].forEach((ctx, i) => {
    ctx.beginPath();
    ctx.arc(ix + iconSize / 2 + 20, iy + iconSize / 2 + 20, iconSize / 2 + 30, 0, Math.PI * 2);
    ctx.strokeStyle = i ? 'rgba(160,190,255,0.5)' : 'rgba(186,190,196,0.45)';
    ctx.lineWidth = 3;
    ctx.stroke();
  });
  const iconLight = await svgImage(face.icon, '#F2F4F8', iconSize);
  const iconGlow = await svgImage(face.icon, '#9DB8EA', iconSize);
  if (iconLight) a.drawImage(iconLight, ix + 20, iy + 20, iconSize, iconSize);
  if (iconGlow) g.drawImage(iconGlow, ix + 20, iy + 20, iconSize, iconSize);

  // Service name + line, anchored to the bottom
  const maxW = S - pad * 2;
  a.font = `${fonts.nameWeight} ${fonts.nameSize}px ${fonts.name}`;
  const nameLines = wrap(a, face.name, maxW);
  a.font = `400 ${fonts.lineSize}px ${fonts.body}`;
  const lineLines = wrap(a, face.line, maxW).slice(0, 3);
  const lineH = fonts.lineSize * 1.45;
  const nameH = fonts.nameSize * 1.15;
  let y = S - pad - lineLines.length * lineH - 26 - nameLines.length * nameH;
  [a, g].forEach((ctx, i) => {
    let yy = y;
    ctx.textBaseline = 'top';
    ctx.font = `${fonts.nameWeight} ${fonts.nameSize}px ${fonts.name}`;
    ctx.fillStyle = i ? '#ffffff' : '#ffffff';
    nameLines.forEach((l) => { ctx.fillText(l, start, yy); yy += nameH; });
    yy += 26;
    ctx.font = `400 ${fonts.lineSize}px ${fonts.body}`;
    ctx.fillStyle = i ? '#5d6678' : '#c3c8d0';
    lineLines.forEach((l) => { ctx.fillText(l, start, yy); yy += lineH; });
  });
  void end;

  const toTex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { map: toTex(color, true), emissive: toTex(glow, true) };
}

function dustTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const r = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.3, 'rgba(220,230,255,0.5)');
  r.addColorStop(1, 'rgba(220,230,255,0)');
  x.fillStyle = r;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  const r = x.createRadialGradient(128, 128, 0, 128, 128, 126);
  r.addColorStop(0, 'rgba(140,170,225,0.7)');
  r.addColorStop(0.45, 'rgba(62,95,148,0.22)');
  r.addColorStop(1, 'rgba(10,18,36,0)');
  x.fillStyle = r;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/* ------------------------------------------------------------------ */
/* Home hero cube                                                       */
/* ------------------------------------------------------------------ */
export async function initHeroCube({ pin, anchor, endAnchor, endSection, faces, rtl }) {
  const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  const fonts = lang === 'ar'
    ? { name: 'Cairo', nameWeight: 700, nameSize: 108, body: 'Cairo', lineSize: 50, latin: 'Questrial' }
    : { name: 'Questrial', nameWeight: 400, nameSize: 118, body: 'Questrial', lineSize: 50, latin: 'Questrial' };
  try {
    await Promise.all([
      document.fonts.load(`${fonts.nameWeight} 40px ${fonts.name}`),
      document.fonts.load(`400 40px ${fonts.body}`),
      document.fonts.load('400 40px Questrial'),
    ]);
  } catch (e) { /* fonts are optional */ }

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-gl';
  canvas.setAttribute('aria-hidden', 'true');
  // one canvas fixed to the screen, so the pieces can fly from the hero into the 'Your brand' section below
  canvas.classList.add('hero-gl-fixed');
  document.body.appendChild(canvas);

  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 8);
  makeEnvironment(renderer, scene);
  addLights(scene);

  const metal = platinum();

  // Cube = platinum rounded body + six glass panels
  const root = new THREE.Group();        // positioned on the page anchor
  const tilt = new THREE.Group();        // cursor tilt + resting angle
  const spin = new THREE.Group();        // scroll rotation
  root.add(tilt);
  tilt.add(spin);
  scene.add(root);

  const body = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 6, 0.085), metal);
  spin.add(body);

  // Panel placement: [face index, position, rotation]
  const R = 0.5015;
  const right = rtl ? 3 : 1;
  const left = rtl ? 1 : 3;
  const placements = [
    [0, [0, 0, R], [0, 0, 0]],
    [right, [R, 0, 0], [0, Math.PI / 2, 0]],
    [2, [0, 0, -R], [0, Math.PI, 0]],
    [left, [-R, 0, 0], [0, -Math.PI / 2, 0]],
    [4, [0, R, 0], [-Math.PI / 2, 0, 0]],
    [5, [0, -R, 0], [Math.PI / 2, 0, 0]],
  ];
  const panelGeo = new THREE.PlaneGeometry(0.86, 0.86);
  // Build the six face textures one by one, letting the page breathe in between (smoother on phones)
  const panels = [];
  for (const f of faces) {
    panels.push(await facePanel(f, rtl, fonts));
    await new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 120 }) : setTimeout(r, 0)));
  }
  placements.forEach(([i, p, r]) => {
    const mat = new THREE.MeshPhysicalMaterial({
      map: panels[i].map, emissiveMap: panels[i].emissive, emissive: 0xffffff, emissiveIntensity: 0.55,
      metalness: 0.35, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.9,
    });
    const m = new THREE.Mesh(panelGeo, mat);
    m.position.set(p[0], p[1], p[2]);
    m.rotation.set(r[0], r[1], r[2]);
    spin.add(m);
  });

  // Glow under the cube
  const floor = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, opacity: 0.9 }));
  scene.add(floor);

  // The logo mark the cube turns into
  const markRoot = new THREE.Group();
  const mark = makeMark(metal);
  markRoot.add(mark.group);
  scene.add(markRoot);
  const seeds = mark.bars.map((_, i) => ({
    off: new THREE.Vector3((i % 2 ? 1 : -1) * (0.6 + i * 0.15), (i < 2 ? 1 : -1) * 0.5, 0.4),
    rot: new THREE.Euler(i * 1.3 + 0.8, i * 2.1 + 1.2, i * 0.7),
  }));

  // Silver dust
  const count = isMobile() ? 110 : 260;
  const pos = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 9;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 5;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 3 - 0.5;
    speed[i] = 0.04 + Math.random() * 0.1;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.03, map: dustTexture(), transparent: true, opacity: 0.6, depthWrite: false,
    blending: THREE.AdditiveBlending, color: 0xd6e0f5,
  }));
  scene.add(dust);

  // State: targets come from main.js (scroll) and the pointer
  const target = { rx: 0, ry: 0, q: 0, tx: 0, ty: 0 };
  const cur = { rx: 0, ry: 0, q: 0, tx: 0, ty: 0 };
  const baseTiltY = rtl ? 0.42 : -0.42;

  let W = 0, H = 0, k = 1;
  const anchorWorld = new THREE.Vector3();
  const endWorld = new THREE.Vector3();
  let cubeSize = 1, markSize = 1;

  // the canvas covers the screen; anchors are read every frame because they move as the page scrolls
  function measure() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    k = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z) / H;
  }
  function track() {
    const a = anchor.getBoundingClientRect();
    anchorWorld.set((a.left + a.width / 2 - W / 2) * k, -(a.top + a.height / 2 - H / 2) * k, 0);
    cubeSize = a.width * k * 0.86;
    const e = endAnchor.getBoundingClientRect();
    endWorld.set((e.left + e.width / 2 - W / 2) * k, -(e.top + e.height / 2 - H / 2) * k, 0);
    markSize = e.height * k;
  }
  measure();
  track();
  window.addEventListener('resize', measure);
  let running = true;
  let last = performance.now();
  let raf = 0;
  let readyAt = 0;
  // draw only while the hero or the 'Your brand' section is on screen; hide the canvas otherwise
  const seen = new Map();
  const io = new IntersectionObserver((en) => {
    en.forEach((x) => seen.set(x.target, x.isIntersecting));
    const vis = [...seen.values()].some(Boolean);
    canvas.style.visibility = vis ? '' : 'hidden';
    if (vis && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    if (!vis) running = false;
  });
  io.observe(pin.parentElement);
  if (endSection) io.observe(endSection);

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    const f = 1 - Math.exp(-dt * 7);
    for (const key in cur) cur[key] += (target[key] - cur[key]) * (key === 'q' ? Math.min(1, f * 1.6) : f);
    track();

    // First frame: reveal the canvas, then grow the cube in with a short turn
    if (!readyAt) { readyAt = now; canvas.classList.add('ready'); }
    const intro = clamp((now - readyAt) / 1200);
    const pop = 1 - Math.pow(1 - intro, 3);

    // Cube
    const q = cur.q;
    const shrink = 1 - smooth(clamp(q / 0.55));
    root.position.copy(anchorWorld);
    root.position.y += Math.sin(t * 0.9) * 0.03 * cubeSize;
    root.scale.setScalar(cubeSize * Math.max(0.001, shrink) * (0.55 + 0.45 * pop));
    tilt.rotation.x = 0.3 + cur.ty * 0.25;
    tilt.rotation.y = baseTiltY + cur.tx * 0.45 + Math.sin(t * 0.5) * 0.04;
    spin.rotation.x = THREE.MathUtils.degToRad(cur.rx) + q * 2.4;
    spin.rotation.y = THREE.MathUtils.degToRad(cur.ry) + q * 3.2 * (rtl ? -1 : 1) + (1 - pop) * 1.6 * (rtl ? 1 : -1);
    root.visible = shrink > 0.01;

    floor.position.set(anchorWorld.x, anchorWorld.y - cubeSize * 0.95, -0.5);
    floor.scale.set(cubeSize * 2.4 * Math.max(0.2, shrink), cubeSize * 0.6 * Math.max(0.2, shrink), 1);
    floor.material.opacity = 0.85 * shrink;

    // Mark assembles from the cube's pieces
    const m = clamp((q - 0.12) / 0.88);
    markRoot.visible = m > 0.001;
    markRoot.position.copy(endWorld);
    markRoot.scale.setScalar(markSize);
    mark.group.rotation.y = Math.sin(t * 0.6) * 0.32 * smooth(m) + (1 - smooth(m)) * 1.2;
    mark.group.rotation.x = Math.sin(t * 0.45) * 0.08;
    const fromLocal = anchorWorld.clone().sub(endWorld).divideScalar(markSize);
    mark.bars.forEach((bar, i) => {
      const s = smooth(clamp((m - i * 0.08) / 0.62));
      bar.position.set(
        lerp(fromLocal.x + seeds[i].off.x, 0, s),
        lerp(fromLocal.y + seeds[i].off.y, 0, s),
        lerp(seeds[i].off.z, 0, s),
      );
      bar.rotation.set(seeds[i].rot.x * (1 - s), seeds[i].rot.y * (1 - s), seeds[i].rot.z * (1 - s));
      bar.scale.setScalar(lerp(0.25, 1, s));
    });

    // Dust drifts upward slowly
    const p = dustGeo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      p[i * 3 + 1] += speed[i] * dt;
      p[i * 3] += Math.sin(t * 0.3 + i) * 0.0008;
      if (p[i * 3 + 1] > 2.6) p[i * 3 + 1] = -2.6;
    }
    dustGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    set(s) { Object.assign(target, s); },
    measure,
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}

/* ------------------------------------------------------------------ */
/* About page: slowly turning platinum logo mark                        */
/* ------------------------------------------------------------------ */
export async function initMark(host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'mark-gl';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 4.2);
  makeEnvironment(renderer, scene);
  addLights(scene);
  const mark = makeMark(platinum());
  scene.add(mark.group);
  const floor = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, opacity: 0.8 }));
  floor.position.set(0, -0.78, -0.4);
  floor.scale.set(2.2, 0.5, 1);
  scene.add(floor);

  const pointer = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  host.closest('section').addEventListener('pointermove', (e) => {
    pointer.x = e.clientX / window.innerWidth - 0.5;
    pointer.y = e.clientY / window.innerHeight - 0.5;
  });

  function size() {
    const r = host.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  size();
  window.addEventListener('resize', size);

  let running = true;
  new IntersectionObserver((en) => {
    const vis = en[0].isIntersecting;
    if (vis && !running) { running = true; requestAnimationFrame(frame); }
    if (!vis) running = false;
  }).observe(host);

  const startT = performance.now();
  function frame(now) {
    if (!running) return;
    const t = (now - startT) / 1000;
    cur.x += (pointer.x - cur.x) * 0.06;
    cur.y += (pointer.y - cur.y) * 0.06;
    const intro = smooth(clamp(t / 1.6));
    mark.group.rotation.y = Math.sin(t * 0.5) * 0.5 + cur.x * 0.6 + (1 - intro) * 2.4;
    mark.group.rotation.x = Math.sin(t * 0.35) * 0.08 + cur.y * 0.3;
    mark.group.position.y = Math.sin(t * 0.8) * 0.03;
    mark.bars.forEach((b, i) => {
      const s = smooth(clamp((t - i * 0.15) / 1.2));
      b.position.set((1 - s) * (i % 2 ? 0.8 : -0.8), (1 - s) * (i < 2 ? 0.7 : -0.7), 0);
      b.scale.setScalar(0.4 + 0.6 * s);
    });
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

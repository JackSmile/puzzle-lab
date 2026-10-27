import { stats, RARE_MODIFIERS } from './core.mjs';
import { SkillVFX } from './skill-vfx.mjs';
import { BestiaryRenderer } from './bestiary-render.mjs';

const TAU = Math.PI * 2;
const hash = (x, y = 0) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
const palette = { warden: '#9ce7cf', witch: '#d4b0f0', seer: '#e9c781' };
const atlas = new Image(); atlas.src = new URL('./assets/sprite-atlas.png', import.meta.url).href;
const atlasFrames = { marauder: 0, duelist: 1, ranger: 2, shadow: 3, witch: 4, templar: 5, scion: 6, chest: 7, skull: 8, bat: 9, ghoul: 10, cultist: 11, knight: 12, boss: 13, spectral: 14, gem: 15, warden: 0, seer: 5 };
function atlasSprite(context, name, x, y, width, height) {
  if (!atlas.complete || !atlas.naturalWidth || !(name in atlasFrames)) return false;
  const cell = atlas.naturalWidth / 4, frame = atlasFrames[name];
  context.imageSmoothingEnabled = true;
  context.drawImage(atlas, frame % 4 * cell, Math.floor(frame / 4) * cell, cell, cell, x, y, width, height);
  return true;
}

function makeSprite(kind, hero = 'warden') {
  const canvas = document.createElement('canvas'); canvas.width = 48; canvas.height = 56;
  const c = canvas.getContext('2d');
  const rect = (color, x, y, w, h) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
  const poly = (color, points) => { c.fillStyle = color; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); };
  if (kind === 'hero') {
    const robe = hero === 'witch' ? '#584268' : hero === 'seer' ? '#5e6541' : '#3b6560';
    const light = hero === 'witch' ? '#9272a3' : hero === 'seer' ? '#9a9c64' : '#78a092';
    rect('#101b1b', 15, 46, 8, 7); rect('#101b1b', 26, 46, 8, 7);
    poly('#1a2d2c', [[16, 19], [32, 19], [39, 48], [8, 48]]);
    poly(robe, [[16, 21], [31, 21], [35, 46], [12, 46]]);
    poly(light, [[16, 23], [21, 22], [19, 43], [13, 45]]);
    rect('#253e3b', 25, 24, 5, 20); rect('#c4ad78', 15, 36, 17, 3);
    rect('#d9b983', 22, 35, 4, 6); rect('#f3d6a4', 23, 36, 2, 2);
    poly('#172a2a', [[12, 19], [16, 7], [23, 2], [31, 7], [35, 20], [30, 25], [16, 24]]);
    poly(robe, [[13, 18], [18, 7], [23, 4], [30, 8], [33, 19], [28, 17], [19, 17]]);
    poly(light, [[15, 16], [19, 8], [23, 6], [21, 12], [18, 18]]);
    rect('#0b1617', 18, 17, 13, 9); rect('#cbb992', 20, 18, 9, 6);
    rect('#132627', 19, 20, 11, 3); rect(palette[hero], 20, 20, 3, 2); rect(palette[hero], 27, 20, 3, 2);
    rect(robe, 11, 27, 7, 10); rect('#ccb78f', 12, 35, 5, 4);
    rect(robe, 30, 27, 7, 10); rect('#ccb78f', 33, 33, 5, 5);
    rect('#5b4930', 38, 15, 3, 32); rect('#c2a867', 37, 18, 5, 3);
    poly('#a1d9c1', [[34, 12], [39, 4], [44, 12], [39, 19]]);
    poly(palette[hero], [[36, 11], [39, 6], [41, 11], [39, 16]]);
    rect('#efffe1', 38, 8, 2, 4);
  } else if (kind === 'skull') {
    poly('#303d36', [[12, 32], [18, 27], [31, 27], [37, 39], [32, 47], [15, 47], [10, 41]]);
    rect('#586455', 16, 32, 16, 10); rect('#2c372f', 20, 39, 4, 11); rect('#434e40', 29, 39, 4, 10);
    rect('#919987', 10, 30, 6, 12); rect('#8b917f', 33, 29, 6, 13);
    poly('#adb09a', [[14, 14], [19, 10], [29, 10], [35, 16], [34, 27], [30, 31], [18, 31], [13, 26]]);
    rect('#d1d0b1', 18, 12, 11, 5); rect('#8a927f', 14, 21, 4, 6);
    rect('#222e29', 17, 20, 6, 6); rect('#222e29', 27, 20, 6, 6);
    rect('#a4cf91', 18, 21, 3, 2); rect('#a4cf91', 28, 21, 3, 2);
    rect('#57604f', 23, 26, 3, 3); rect('#4c5746', 20, 30, 11, 2);
    rect('#d1ceb0', 19, 28, 3, 4); rect('#d1ceb0', 25, 28, 3, 4);
  } else if (kind === 'bat') {
    poly('#3b344b', [[22, 24], [12, 13], [2, 11], [5, 23], [1, 32], [12, 29], [18, 36], [24, 31]]);
    poly('#3b344b', [[26, 24], [36, 13], [46, 11], [43, 23], [47, 32], [36, 29], [30, 36], [24, 31]]);
    poly('#79647e', [[18, 26], [7, 16], [9, 24], [5, 28], [13, 26]]);
    poly('#79647e', [[30, 26], [41, 16], [39, 24], [43, 28], [35, 26]]);
    rect('#504554', 19, 22, 11, 13); rect('#8d7182', 21, 26, 7, 8);
    poly('#65505f', [[19, 23], [19, 15], [24, 21], [29, 15], [30, 24]]);
    rect('#f1baaf', 20, 24, 3, 2); rect('#f1baaf', 27, 24, 3, 2);
  } else if (kind === 'ghoul') {
    poly('#354d3f', [[15, 23], [31, 22], [39, 44], [31, 43], [27, 38], [21, 42], [12, 45], [8, 42]]);
    poly('#57745a', [[15, 25], [30, 26], [33, 36], [17, 38], [11, 35]]);
    rect('#69846a', 9, 31, 6, 15); rect('#69846a', 34, 30, 6, 16);
    rect('#28392e', 17, 40, 6, 11); rect('#28392e', 29, 38, 7, 13);
    poly('#769477', [[14, 14], [20, 9], [30, 12], [34, 22], [30, 30], [17, 27], [12, 22]]);
    rect('#93a383', 17, 14, 11, 5); rect('#182e26', 16, 20, 5, 5); rect('#182e26', 27, 19, 5, 5);
    rect('#e3d58d', 17, 21, 3, 2); rect('#e3d58d', 28, 20, 3, 2); rect('#b1ae87', 19, 28, 11, 3);
  } else if (kind === 'cultist') {
    poly('#372b49', [[17, 19], [31, 19], [40, 49], [10, 49]]);
    poly('#65506f', [[17, 24], [23, 23], [18, 46], [12, 47]]);
    poly('#8a6585', [[11, 23], [18, 26], [15, 35], [5, 36]]);
    poly('#8a6585', [[31, 25], [36, 23], [44, 35], [34, 36]]);
    poly('#4c3a58', [[12, 21], [19, 6], [27, 4], [35, 21], [30, 26], [18, 26]]);
    rect('#121c23', 18, 18, 13, 8); rect('#e29eae', 19, 20, 4, 2); rect('#e29eae', 27, 20, 4, 2);
    rect('#b59c6c', 20, 33, 9, 2); rect('#d1b68c', 23, 29, 3, 11);
  } else if (kind === 'knight') {
    poly('#363b43', [[11, 23], [36, 23], [41, 42], [8, 42]]);
    rect('#656c6e', 14, 24, 21, 16); rect('#9b9d94', 16, 25, 4, 14);
    rect('#34383e', 17, 40, 7, 12); rect('#34383e', 29, 40, 7, 12);
    rect('#838b85', 9, 20, 9, 10); rect('#838b85', 32, 20, 9, 10);
    rect('#333b41', 16, 8, 18, 18); rect('#7d8886', 18, 8, 14, 12); rect('#a6b09e', 18, 9, 3, 10);
    rect('#1a2528', 16, 18, 18, 5); rect('#e19388', 20, 19, 10, 2);
    rect('#6d3839', 23, 26, 4, 16); rect('#a35650', 16, 30, 18, 3);
    rect('#9b9b84', 42, 20, 3, 26); rect('#d0c8a5', 40, 15, 6, 7);
  } else if (kind === 'boss') {
    poly('#352a39', [[15, 18], [33, 18], [44, 49], [5, 49]]);
    poly('#5d4358', [[15, 20], [23, 20], [15, 46], [8, 46]]);
    poly('#886975', [[14, 24], [9, 22], [3, 39], [11, 41], [17, 31]]);
    poly('#886975', [[33, 24], [38, 22], [46, 39], [38, 41], [31, 31]]);
    poly('#a19d8d', [[15, 10], [19, 5], [29, 5], [34, 11], [32, 24], [25, 28], [17, 23]]);
    poly('#c0b89b', [[17, 11], [22, 7], [29, 9], [30, 15], [18, 16]]);
    poly('#c0a56c', [[15, 13], [9, 8], [7, 0], [11, 4], [20, 8]]);
    poly('#c0a56c', [[31, 12], [38, 7], [41, 0], [40, 10], [32, 16]]);
    rect('#3a2838', 17, 17, 6, 4); rect('#3a2838', 27, 17, 6, 4);
    rect('#ff9c99', 18, 18, 4, 2); rect('#ff9c99', 28, 18, 4, 2);
    rect('#d8b47a', 22, 30, 5, 12); rect('#d8b47a', 17, 33, 15, 4);
  }
  return canvas;
}

export function drawPortrait(canvas, character) {
  canvas.width = 80; canvas.height = 92;
  const paint = () => { const c = canvas.getContext('2d'); c.clearRect(0, 0, 80, 92); if (!atlasSprite(c, character, -5, -1, 92, 100)) { c.imageSmoothingEnabled = false; c.drawImage(makeSprite('hero', character), -4, -4, 88, 103); } };
  paint(); if (!atlas.complete) atlas.addEventListener('load', paint, { once: true });
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.sprites = new Map(); this.width = 0; this.height = 0; this.lowEffects = false;
    for (const kind of ['skull', 'bat', 'ghoul', 'cultist', 'knight', 'boss']) this.sprites.set(kind, makeSprite(kind));
    for (const hero of ['warden', 'witch', 'seer']) this.sprites.set(hero, makeSprite('hero', hero));
    this.vfx = new SkillVFX(this.ctx); this.bestiary = new BestiaryRenderer(this.ctx); this.spectralSprite = null;
    this.ground = this.makeGround(); this.resize();
    const floor = new Image(); floor.onload = () => {
      const tile = document.createElement('canvas'); tile.width = tile.height = 640;
      const ctx = tile.getContext('2d'); ctx.drawImage(floor, 0, 0, 640, 640); ctx.fillStyle = '#09130d77'; ctx.fillRect(0, 0, 640, 640);
      this.ground = this.ctx.createPattern(tile, 'repeat');
    }; floor.src = new URL('./assets/ground.png', import.meta.url).href;
  }
  resize() {
    this.width = this.canvas.clientWidth; this.height = this.canvas.clientHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.width < 700 ? 1.5 : 2);
    this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
    this.zoom = this.width < 700 ? 1.05 : 1.32;
    this.ctx.imageSmoothingEnabled = false;
  }
  makeGround() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const c = canvas.getContext('2d'); c.fillStyle = '#1a2a22'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 850; i++) {
      const x = hash(i, 2) * 256, y = hash(i, 3) * 256;
      c.fillStyle = ['#203127', '#17271f', '#21332a', '#1c2d24', '#16251e'][i % 5];
      c.fillRect(x, y, 2 + hash(i) * 9, 1 + hash(i, 1) * 5);
    }
    for (let i = 0; i < 35; i++) {
      const x = hash(i, 17) * 256, y = hash(i, 18) * 256;
      c.strokeStyle = '#3b4d323c'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y - 4); c.moveTo(x, y); c.lineTo(x + 3, y - 3); c.stroke();
    }
    return this.ctx.createPattern(canvas, 'repeat');
  }
  glow(x, y, radius, color, opacity = 1) {
    const c = this.ctx; c.save(); c.globalAlpha = opacity;
    const gradient = c.createRadialGradient(x, y, 0, x, y, radius); gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent');
    c.fillStyle = gradient; c.fillRect(x - radius, y - radius, radius * 2, radius * 2); c.restore();
  }
  terrain(cameraX, cameraY, time) {
    const c = this.ctx, w = this.width / this.zoom, h = this.height / this.zoom;
    const left = cameraX - w / 2 - 100, top = cameraY - h / 2 - 120;
    c.fillStyle = this.ground; c.fillRect(left, top, w + 200, h + 240);
    // World-fixed decoration moves with the camera, unlike the screen-space fog.
    for (let gx = Math.floor(left / 160); gx <= Math.ceil((left + w + 200) / 160); gx++) {
      for (let gy = Math.floor(top / 160); gy <= Math.ceil((top + h + 240) / 160); gy++) {
        const n = hash(gx, gy), x = gx * 160 + 30 + hash(gx + 13, gy) * 90, y = gy * 160 + 30 + hash(gx, gy + 18) * 85;
        if (Math.hypot(x, y) < 145) continue;
        c.save(); c.translate(x, y);
        if (n > .79) this.drawTree(n);
        else if (n > .61) this.drawGravestone(n);
        else if (n > .46) this.drawPillar(n);
        else this.drawStones(n);
        c.restore();
      }
    }
    c.save(); c.translate(0, 0);
    this.glow(0, 0, 190, '#8cd8a30e');
    c.strokeStyle = '#8fac7b36'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, 100, 0, TAU); c.stroke();
    c.strokeStyle = '#7e93602b'; c.beginPath(); c.arc(0, 0, 116, 0, TAU); c.stroke();
    c.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 - Math.PI / 2; const x = Math.cos(a) * 94, y = Math.sin(a) * 94; i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.closePath(); c.stroke();
    c.beginPath(); for (let i = 0; i < 5; i++) { const a = i * TAU * 2 / 5 - Math.PI / 2; i ? c.lineTo(Math.cos(a) * 66, Math.sin(a) * 66) : c.moveTo(Math.cos(a) * 66, Math.sin(a) * 66); } c.closePath(); c.stroke();
    c.font = '13px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#b1bd7d66';
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.save(); c.translate(Math.cos(a) * 108, Math.sin(a) * 108); c.rotate(a + Math.PI / 2); c.fillText('ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ'[i], 0, 0); c.restore(); }
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; this.drawCandle(Math.cos(a) * 132, Math.sin(a) * 132, time + i); }
    c.restore();
    // A broken ceremonial path anchors the starting arena.
    for (let i = -4; i <= 4; i++) {
      if (Math.abs(i) < 2) continue;
      c.fillStyle = '#45504038'; c.fillRect(i * 44 - 17, -19, 34, 37); c.strokeStyle = '#87916c20'; c.strokeRect(i * 44 - 17, -19, 34, 37);
    }
  }
  drawStones(n) {
    const c = this.ctx;
    for (let i = 0; i < 3; i++) { const x = i * 10 - 10, y = hash(i, n) * 16; c.fillStyle = '#101d17'; c.fillRect(x, y + 3, 13, 6); c.fillStyle = '#3c493a'; c.fillRect(x, y, 10, 5); c.fillStyle = '#556048'; c.fillRect(x + 1, y, 6, 2); }
  }
  drawGravestone(n) {
    const c = this.ctx; c.fillStyle = '#0b1815a0'; c.beginPath(); c.ellipse(0, 7, 23, 8, 0, 0, TAU); c.fill();
    c.rotate((n - .7) * .3); c.fillStyle = '#313e36'; c.fillRect(-12, -28, 24, 33); c.fillStyle = '#55604c'; c.fillRect(-11, -30, 20, 31); c.fillRect(-7, -35, 13, 7);
    c.fillStyle = '#69715a'; c.fillRect(-10, -27, 3, 27); c.fillStyle = '#2b3a30'; c.fillRect(-2, -25, 3, 19); c.fillRect(-7, -20, 14, 3);
    c.fillStyle = '#435a3d'; c.fillRect(-15, 0, 28, 5); c.fillStyle = '#8292604a'; c.fillRect(4, -3, 10, 6);
  }
  drawPillar(n) {
    const c = this.ctx; c.fillStyle = '#0b181780'; c.beginPath(); c.ellipse(0, 7, 25, 10, 0, 0, TAU); c.fill();
    c.fillStyle = '#35443a'; c.fillRect(-14, -32, 29, 36); c.fillStyle = '#4e5a48'; c.fillRect(-14, -32, 9, 35); c.fillStyle = '#626b50'; c.fillRect(-13, -31, 3, 34);
    c.fillStyle = '#26392e'; c.fillRect(8, -30, 7, 34); c.fillStyle = '#526048'; c.fillRect(-19, -4, 37, 9);
    c.fillStyle = '#70805b'; c.fillRect(-18, -4, 34, 2); c.fillStyle = '#748268'; c.fillRect(-13, -35, 9, 4); c.fillRect(-3, -30, 8, 3);
    c.strokeStyle = '#182e24'; c.beginPath(); c.moveTo(-2, -28); c.lineTo(2, -20); c.lineTo(-3, -16); c.stroke();
    if (n > .56) { c.fillStyle = '#5f7546'; c.fillRect(8, -6, 8, 4); }
  }
  drawTree(n) {
    const c = this.ctx; c.fillStyle = '#091a16a0'; c.beginPath(); c.ellipse(0, 10, 42, 14, 0, 0, TAU); c.fill();
    c.strokeStyle = '#293b2b'; c.lineCap = 'square'; c.lineWidth = 11;
    c.beginPath(); c.moveTo(0, 7); c.lineTo(2, -40); c.lineTo(-8, -68); c.moveTo(1, -29); c.lineTo(-26, -43); c.lineTo(-34, -62); c.moveTo(0, -39); c.lineTo(23, -60); c.lineTo(24, -83); c.stroke();
    c.strokeStyle = '#3b4931'; c.lineWidth = 4; c.beginPath(); c.moveTo(-3, 4); c.lineTo(-3, -38); c.lineTo(-12, -64); c.moveTo(-5, -30); c.lineTo(-25, -44); c.stroke();
    c.strokeStyle = '#263c2b'; c.lineWidth = 3; c.beginPath(); c.moveTo(23, -62); c.lineTo(40, -68); c.moveTo(-22, -41); c.lineTo(-20, -62); c.moveTo(-7, -65); c.lineTo(-22, -76); c.moveTo(1, 2); c.lineTo(-18, 10); c.moveTo(1, 1); c.lineTo(20, 9); c.stroke();
    c.fillStyle = '#597345'; for (let i = 0; i < 5; i++) c.fillRect(-10 + hash(i, n) * 20, -7 + hash(i + 5, n) * 15, 3, 2);
  }
  drawCandle(x, y, t) {
    const c = this.ctx; this.glow(x, y - 10, 40 + Math.sin(t * 6) * 3, '#e5bc5820');
    c.fillStyle = '#323d2b'; c.fillRect(x - 5, y, 10, 3); c.fillStyle = '#b2a071'; c.fillRect(x - 3, y - 9, 6, 10);
    c.fillStyle = '#ffdf86'; c.beginPath(); c.ellipse(x, y - 13, 2, 4 + Math.sin(t * 4), 0, 0, TAU); c.fill();
  }
  unit(unit, player, time, character) {
    const c = this.ctx, hero = unit === player;
    if (!hero && this.bestiary.unit(unit, player, time, this.lowEffects)) {
      if (unit.elite && unit.rareMods?.length) {
        c.save(); c.textAlign = 'center'; c.font = '8px Georgia'; c.fillStyle = '#e4c579'; c.shadowColor = '#000'; c.shadowBlur = 4;
        c.fillText(unit.rareMods.map(id => RARE_MODIFIERS[id]?.name || '').filter(Boolean).join(' · '), unit.x, unit.y - 76); c.restore();
      }
      return;
    }
    const sprite = this.sprites.get(hero ? character : unit.kind) || this.sprites.get(hero ? 'warden' : 'skull');
    const scale = hero ? 1.05 : unit.kind === 'boss' ? 2.25 : unit.kind === 'knight' ? 1.28 : unit.kind === 'ghoul' ? 1.2 : unit.kind === 'bat' ? .78 : .96;
    const bob = unit.freezeUntil > time ? 0 : Math.sin(time * (hero ? 9 : unit.kind === 'bat' ? 14 : 7) + (unit.id || 0)) * (unit.kind === 'bat' ? 3 : 1.3);
    const facing = hero ? (player.facingX < 0 ? -1 : 1) : (unit.x > player.x ? -1 : 1);
    c.fillStyle = hero ? '#050c0ba6' : '#08150e99'; c.beginPath(); c.ellipse(unit.x, unit.y + 8, 16 * scale, 7 * scale, 0, 0, TAU); c.fill();
    if (hero) { this.glow(unit.x, unit.y - 10, 77, `${palette[character] || palette.warden}17`); c.strokeStyle = '#b5cf9b40'; c.lineWidth = 1; c.beginPath(); c.ellipse(unit.x, unit.y + 4, 18, 8, 0, 0, TAU); c.stroke(); }
    if (unit.elite) { this.glow(unit.x, unit.y, 38, '#e6c87c19'); c.strokeStyle = '#e4c57999'; c.beginPath(); c.ellipse(unit.x, unit.y + 5, 21 * scale, 9 * scale, 0, 0, TAU); c.stroke(); }
    c.save(); c.translate(unit.x, unit.y + bob); c.scale(facing, 1);
    if (unit.telegraph > 0) c.globalAlpha = .3;
    if (unit.chill > 0) { c.shadowColor = '#8fdbff'; c.shadowBlur = 7; }
    if (unit.elite) { c.shadowColor = '#e2c47a'; c.shadowBlur = 5; }
    if (hero && player.invulnerable > 0) c.globalAlpha = .55 + Math.sin(time * 50) * .25;
    const painted = atlasSprite(c, hero ? character : unit.kind, -34 * scale, -58 * scale, 68 * scale, 72 * scale);
    if (!painted) c.drawImage(sprite, -24 * scale, -43 * scale, 48 * scale, 56 * scale);
    if (unit.hit > 0) { c.globalCompositeOperation = 'screen'; c.globalAlpha = .4; if (painted) atlasSprite(c, unit.kind, -34 * scale, -58 * scale, 68 * scale, 72 * scale); else c.drawImage(sprite, -24 * scale, -43 * scale, 48 * scale, 56 * scale); }
    c.restore();
    if (!hero && !this.lowEffects) {
      c.save(); c.lineWidth = 1.2;
      if (unit.freezeUntil > time) { c.strokeStyle = '#a8e3eca6'; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; const x = unit.x + Math.cos(a) * 24 * scale, y = unit.y - 19 * scale + Math.sin(a) * 35 * scale; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); c.stroke(); }
      if (unit.igniteUntil > time) { c.fillStyle = '#f1ad5966'; for (let i = 0; i < 3; i++) { const x = unit.x + (i - 1) * 9, y = unit.y + 4; c.beginPath(); c.moveTo(x - 4, y); c.quadraticCurveTo(x - 7, y - 9, x + Math.sin(time * 8 + i) * 4, y - 16); c.quadraticCurveTo(x + 5, y - 7, x + 4, y); c.fill(); } }
      if (unit.shockUntil > time) { c.strokeStyle = '#e7cd82bb'; c.beginPath(); c.moveTo(unit.x + 22 * scale, unit.y - 35 * scale); c.lineTo(unit.x + 16 * scale, unit.y - 22 * scale); c.lineTo(unit.x + 24 * scale, unit.y - 24 * scale); c.lineTo(unit.x + 18 * scale, unit.y - 9 * scale); c.stroke(); }
      if (unit.poisons?.length) { c.strokeStyle = '#89b87999'; c.beginPath(); c.ellipse(unit.x, unit.y + 5, 21 * scale, 8 * scale, 0, 0, TAU); c.stroke(); }
      c.restore();
    }
    if (unit.elite && unit.rareMods?.length) {
      c.save(); c.textAlign = 'center'; c.font = '8px Georgia'; c.fillStyle = '#e4c579'; c.shadowColor = '#000'; c.shadowBlur = 4;
      c.fillText(unit.rareMods.map(id => RARE_MODIFIERS[id]?.name || '').filter(Boolean).join(' · '), unit.x, unit.y - 69 * scale); c.restore();
    }
    if (!hero && unit.hp < unit.maxHp && unit.kind !== 'boss') {
      c.fillStyle = '#17271a'; c.fillRect(unit.x - 13 * scale, unit.y - 43 * scale, 26 * scale, 3);
      c.fillStyle = unit.kind === 'cultist' ? '#c693b0' : '#b5bd80'; c.fillRect(unit.x - 13 * scale, unit.y - 43 * scale, Math.max(0, unit.hp / unit.maxHp) * 26 * scale, 2);
    }
  }
  spectreSprite(x, y, width, height) {
    const loaded = atlas.complete && atlas.naturalWidth > 0;
    if (!this.spectralSprite || this.spectralAtlasLoaded !== loaded) {
      const canvas = document.createElement('canvas'); canvas.width = 112; canvas.height = 120;
      const c = canvas.getContext('2d');
      if (!atlasSprite(c, 'spectral', 0, 0, 112, 120)) c.drawImage(this.sprites.get('cultist'), 0, 0, 112, 120);
      // Tint the cached creature's alpha mask, never the world behind the live sprite.
      c.globalCompositeOperation = 'source-atop'; c.fillStyle = '#96cfff80'; c.fillRect(0, 0, 112, 120);
      this.spectralSprite = canvas; this.spectralAtlasLoaded = loaded;
    }
    this.ctx.drawImage(this.spectralSprite, x, y, width, height);
  }
  bossPointer(run, cameraX, cameraY) {
    const boss = run.enemies.find(enemy => enemy.kind === 'boss' && enemy.hp > 0);
    if (!boss) return;
    const w = this.width, h = this.height, dx = (boss.x - cameraX) * this.zoom, dy = (boss.y - cameraY) * this.zoom;
    if (Math.abs(dx) < w / 2 - 30 && Math.abs(dy) < h / 2 - 60) return;
    const ratio = Math.min(Math.max(20, w / 2 - 40) / Math.max(1, Math.abs(dx)), Math.max(25, h / 2 - 125) / Math.max(1, Math.abs(dy)));
    const x = w / 2 + dx * ratio, y = h / 2 + dy * ratio, c = this.ctx;
    c.save(); c.translate(x, y); c.rotate(Math.atan2(dy, dx)); c.fillStyle = '#ebcf91'; c.shadowColor = '#000'; c.shadowBlur = 5;
    c.beginPath(); c.moveTo(9, 0); c.lineTo(-5, -6); c.lineTo(-2, 0); c.lineTo(-5, 6); c.closePath(); c.fill(); c.restore();
    c.save(); c.font = '10px Georgia'; c.fillStyle = '#e8d7b0'; c.textAlign = x > w / 2 ? 'right' : 'left'; c.shadowColor = '#000'; c.shadowBlur = 4;
    c.fillText(boss.name || 'Босс', x + (x > w / 2 ? -13 : 13), y + 20); c.restore();
  }
  render(run, { menu = false, clock = 0, character = 'warden', focus = null } = {}) {
    const c = this.ctx, w = this.width, h = this.height, p = run.player;
    const t = menu ? clock : run.time;
    const cameraX = focus?.x ?? p.x - (menu ? w / this.zoom * (w < 700 ? .15 : .21) : 0), cameraY = focus?.y ?? p.y + (menu ? -15 : -25);
    const inView = unit => Math.abs(unit.x - cameraX) < w / this.zoom / 2 + 100 && Math.abs(unit.y - cameraY) < h / this.zoom / 2 + 100;
    this.vfx.begin(run, t, this.lowEffects, inView);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.fillStyle = '#14231c'; c.fillRect(0, 0, w, h);
    c.save(); c.translate(w / 2, h / 2); c.scale(this.zoom, this.zoom); c.translate(-cameraX, -cameraY);
    this.terrain(cameraX, cameraY, t);
    this.glow(p.x, p.y, p.lightRadius || 120, '#d2c29420');
    const combat = run.classState?.combat;
    if (!this.lowEffects && combat) {
      if (run._stationary > 0 && run.classState.allocatedTreeNodeIds.includes('39790')) { this.glow(p.x, p.y, 120, '#dfc57822'); c.save(); c.strokeStyle = '#d8c08855'; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, 220, 0, TAU); c.stroke(); c.restore(); }
      if (combat.adrenalineUntil > t || combat.unboundUntil > t || combat.rage > 0) { const unbound = combat.unboundUntil > t; this.glow(p.x, p.y - 20, 65 + Math.sin(t * 5) * 5, unbound ? '#b3dce133' : '#dc705a29'); }
    }
    for (const corpse of run.corpses || []) { c.save(); c.globalAlpha = .2; c.strokeStyle = '#aa9c80'; c.lineWidth = 1; c.beginPath(); c.ellipse(corpse.x, corpse.y, 12, 5, -.3, 0, TAU); c.moveTo(corpse.x - 8, corpse.y - 3); c.lineTo(corpse.x + 9, corpse.y + 3); c.stroke(); c.restore(); }
    for (const obelisk of run.terrain || []) {
      c.save(); c.translate(obelisk.x, obelisk.y); c.scale((obelisk.radius || 24) / 16, (obelisk.radius || 24) / 16); this.drawPillar(.55); this.glow(0, -20, 20, '#a4c8f52a'); c.strokeStyle = '#9abadd55'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 3, 17, 8, 0, 0, TAU); c.stroke(); c.restore();
    }
    for (const gem of run.gems) {
      const pulse = .75 + Math.sin(t * 3 + gem.x) * .2;
      if (!this.lowEffects) this.glow(gem.x, gem.y, 15, '#a6e3c026', pulse);
      c.fillStyle = gem.value >= 5 ? '#e5c577' : '#9ddfc2'; c.beginPath(); c.moveTo(gem.x, gem.y - 5); c.lineTo(gem.x + 3, gem.y); c.lineTo(gem.x, gem.y + 5); c.lineTo(gem.x - 3, gem.y); c.closePath(); c.fill();
      c.fillStyle = '#e4ffe0'; c.fillRect(gem.x - 1, gem.y - 3, 1, 3);
    }
    const s = stats(run);
    this.bestiary.ground(run, t, this.lowEffects, { x: cameraX - w / this.zoom / 2, y: cameraY - h / this.zoom / 2, width: w / this.zoom, height: h / this.zoom });
    this.vfx.ground(s);
    for (const effect of run.effects) if (!this.vfx.effect(effect)) this.effect(effect);
    for (const drop of run.loot || []) {
      const item = drop.item; if (!item) continue;
      const color = item.color || '#d6bd7c'; this.glow(drop.x, drop.y, 45, `${color}25`);
      c.save(); c.globalAlpha = .45; const beam = c.createLinearGradient(drop.x, drop.y - 80, drop.x, drop.y); beam.addColorStop(0, 'transparent'); beam.addColorStop(1, color); c.fillStyle = beam; c.fillRect(drop.x - 4, drop.y - 80, 8, 80); c.restore();
      c.fillStyle = color; c.font = '20px Georgia'; c.textAlign = 'center'; c.fillText(item.icon || '♜', drop.x, drop.y + Math.sin(t * 3) * 2);
      c.font = '9px -apple-system,sans-serif'; c.fillStyle = '#101a12dc'; const width = c.measureText(item.name).width; c.fillRect(drop.x - width / 2 - 6, drop.y + 8, width + 12, 16); c.fillStyle = color; c.fillText(item.name, drop.x, drop.y + 19);
    }
    for (const minion of [...(run.minions || []), ...(run.mercenaryMinions || [])]) {
      if (minion.hp <= 0) continue;
      this.vfx.spectre(minion, (x, y, width, height) => this.spectreSprite(x, y, width, height));
    }
    if (run.mercenary?.hp > 0) { const ally = run.mercenary; c.save(); this.glow(ally.x, ally.y, 34, '#ebc17919'); if (!atlasSprite(c, ally.kind === 'sentinel' ? 'templar' : 'duelist', ally.x - 34, ally.y - 58, 68, 72)) this.unit(ally, p, t, character); c.fillStyle = '#b9d197'; c.fillRect(ally.x - 15, ally.y - 60, Math.max(0, ally.hp / ally.maxHp) * 30, 3); c.restore(); }
    if (run.sentinel?.hp > 0) { const ally = run.sentinel; this.glow(ally.x, ally.y - 15, 50, '#e8c57825'); atlasSprite(c, 'templar', ally.x - 40, ally.y - 68, 80, 84); c.fillStyle = '#d7bc7d'; c.fillRect(ally.x - 18, ally.y - 68, Math.max(0, ally.hp / ally.maxHp) * 36, 3); }
    for (const totem of run.totems || []) { c.save(); c.translate(totem.x, totem.y); this.drawPillar(.5); this.glow(0, -20, 26, '#d5bd6d33'); c.fillStyle = '#d3bb80'; c.font = '20px Georgia'; c.fillText('✦', 0, -22); c.restore(); }
    const visible = run.enemies.filter(inView);
    const ordered = [...visible, p].sort((a, b) => a.y - b.y);
    for (const unit of ordered) this.unit(unit, p, t, character);
    if (combat) {
      const charges = [['power', '#83b4ed'], ['frenzy', '#9dc875'], ['endurance', '#e7ac68']].flatMap(([key, color]) => Array.from({ length: Math.min(8, Math.floor(combat[key] || 0)) }, () => color));
      c.save(); for (let i = 0; i < charges.length; i++) { const a = t * .7 + i * TAU / charges.length, x = p.x + Math.cos(a) * 25, y = p.y - 18 + Math.sin(a) * 12; c.fillStyle = charges[i]; c.beginPath(); c.moveTo(x, y - 3); c.lineTo(x + 2.5, y); c.lineTo(x, y + 3); c.lineTo(x - 2.5, y); c.closePath(); c.fill(); } c.restore();
    }
    this.vfx.overhead();
    this.bestiary.overhead(run, t, this.lowEffects);
    for (const shot of run.projectiles) {
      if (this.vfx.projectile(shot) || !inView(shot)) continue;
      if (this.bestiary.projectile(shot)) continue;
      const color = shot.color || (shot.hostile ? '#db8d99' : '#a2ebcf');
      this.glow(shot.x, shot.y, shot.hostile ? 16 : 21, `${color}38`);
      c.save(); c.translate(shot.x, shot.y); c.rotate(Math.atan2(shot.vy || 0, shot.vx || 1));
      c.fillStyle = color; c.beginPath(); c.ellipse(0, 0, (shot.radius || 4) * 1.8, shot.radius || 4, 0, 0, TAU); c.fill();
      c.fillStyle = '#f3ffe5'; c.fillRect(-3, -1, 6, 2); c.restore();
    }
    if (!this.lowEffects) {
      c.textAlign = 'center'; c.font = 'bold 12px -apple-system, sans-serif';
      for (const text of run.texts) { c.globalAlpha = Math.min(1, text.life * 2); c.fillStyle = text.color || '#ebdec0'; const label = typeof text.value === 'string' && /^−[\d.]+$/.test(text.value) ? `−${Math.ceil(Number(text.value.slice(1)))}` : String(text.value); c.fillText(label, text.x, text.y - (1 - Math.min(1, text.life)) * 24 - 24); }
      c.globalAlpha = 1;
    }
    c.restore();
    // Moonlight and fog use screen coordinates so the world remains legible while moving.
    this.glow(w * .72, h * .15, w * .7, '#b3c8b00c');
    if (!this.lowEffects) {
      for (let i = 0; i < 24; i++) {
        const x = (hash(i, 41) * w + Math.sin(t * .14 + i) * 30 + w) % w, y = (hash(i, 42) * h - t * (2 + hash(i) * 4) % h + h) % h;
        c.globalAlpha = .15 + (Math.sin(t * .7 + i * 3) + 1) * .15; c.fillStyle = i % 3 ? '#c6c89a' : '#95d1b6'; c.fillRect(x, y, 1.5, 1.5);
      }
      c.globalAlpha = 1;
      for (let i = 0; i < 3; i++) { const x = w * (.2 + i * .35) + Math.sin(t * .04 + i) * 70; this.glow(x, h * (.5 + i * .15), w * .33, '#859b8d06'); }
    }
    const vignette = c.createRadialGradient(w * .5, h * .5, Math.min(w, h) * .22, w * .5, h * .5, Math.max(w, h) * .68);
    vignette.addColorStop(0, '#020b0500'); vignette.addColorStop(.65, '#030c0730'); vignette.addColorStop(1, '#020804bc'); c.fillStyle = vignette; c.fillRect(0, 0, w, h);
    if (!menu && p.invulnerable > .4) { c.fillStyle = '#c54a3510'; c.fillRect(0, 0, w, h); }
    if (!menu && !focus) this.bossPointer(run, cameraX, cameraY);
  }
  effect(e) {
    const c = this.ctx, progress = 1 - Math.max(0, e.life) / (e.maxLife || 1), color = e.color || '#a7e6c2';
    c.save(); c.globalAlpha = Math.min(1, e.life / (e.maxLife || 1) * 1.5);
    if (e.kind === 'lightning') {
      c.strokeStyle = color; c.lineWidth = 2; c.beginPath(); c.moveTo(e.x, e.y);
      const endX = e.x2 ?? e.x, endY = e.y2 ?? e.y;
      for (let i = 1; i <= 5; i++) { const f = i / 5; c.lineTo(e.x + (endX - e.x) * f + (i < 5 ? Math.sin(i * 22) * 10 : 0), e.y + (endY - e.y) * f); } c.stroke();
      if (!this.lowEffects) this.glow(endX, endY, 30, '#e9d19b38');
    } else if (e.kind === 'nova' || e.kind === 'spawn') {
      const radius = Math.max(3, (e.radius || 110) * (.2 + progress * .8)); c.strokeStyle = color; c.lineWidth = e.kind === 'nova' ? 3 * (1 - progress) + 1 : 1;
      c.beginPath(); c.arc(e.x, e.y, radius, 0, TAU); c.stroke();
      if (!this.lowEffects) { this.glow(e.x, e.y, radius, `${color}0b`); c.lineWidth = 1; c.beginPath(); c.arc(e.x, e.y, radius * .83, 0, TAU); c.stroke(); }
    } else if (e.kind === 'death' || e.kind === 'hit') {
      const count = this.lowEffects ? 3 : e.kind === 'death' ? 9 : 5;
      for (let i = 0; i < count; i++) { const a = i * TAU / count + e.x, r = (e.kind === 'death' ? 28 : 15) * progress; c.fillStyle = color; c.fillRect(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 2 + (1 - progress) * 2, 2); }
    } else if (e.kind === 'heal') {
      c.strokeStyle = '#a1dfb3'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, 20 + progress * 20, 0, TAU); c.stroke();
    }
    c.restore();
  }
}

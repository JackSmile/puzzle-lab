const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const noise = (i, salt = 0) => { const n = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return n - Math.floor(n); };
const supported = shot => !shot.hostile && ['cold', 'kinetic', 'spectral'].includes(shot.element);

// Renderer-owned presentation state; never part of the combat simulation.
export class VfxHistory {
  constructor() { this.shots = new Map(); this.allies = new Map(); this.seen = new Set(); this.run = null; this.time = -Infinity; }
  update(run, visible = () => true) {
    if (this.run !== run || run.time < this.time) {
      this.shots.clear(); this.allies.clear(); this.seen.clear(); this.time = -Infinity; this.run = run;
    }
    if (run.time === this.time) return;
    this.time = run.time;
    const liveAllies = [...(run.minions || []), ...(run.mercenaryMinions || [])].filter(ally => !(ally.hp <= 0)).slice(0, 32);
    const allyIds = new Set(liveAllies.map(ally => ally.id));
    for (const id of this.allies.keys()) if (!allyIds.has(id)) this.allies.delete(id);
    for (const ally of liveAllies) {
      let state = this.allies.get(ally.id);
      if (!state) { state = { bornAt: run.time, castAt: -Infinity, direction: 1, points: [] }; this.allies.set(ally.id, state); }
      this.sample(state, ally, run.time);
    }
    const shots = run.projectiles.filter(supported).slice(0, 512);
    const currentIds = new Set(shots.map(shot => shot.id));
    for (const shot of shots) {
      if (!this.seen.has(shot.id) && shot.element === 'spectral' && shot.life > 1.35) {
        const state = this.allies.get(shot.context?.actor?.id);
        if (state) { state.castAt = run.time; state.direction = shot.vx < 0 ? -1 : 1; }
      }
    }
    this.seen = currentIds;
    const detailed = shots.filter(visible).slice(0, 160), detailedIds = new Set(detailed.map(shot => shot.id));
    for (const id of this.shots.keys()) if (!detailedIds.has(id)) this.shots.delete(id);
    for (const shot of detailed) {
      let state = this.shots.get(shot.id);
      if (!state) { state = { points: [] }; this.shots.set(shot.id, state); }
      this.sample(state, shot, run.time);
    }
  }
  sample(state, unit, time) {
    const last = state.points.at(-1);
    if (!last || time - last.time >= 1 / 30 - 1e-8) {
      state.points.push({ x: unit.x, y: unit.y, time });
      if (state.points.length > 6) state.points.shift();
    }
  }
}

function polygon(c, points, fill) {
  c.fillStyle = fill; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill();
}
function line(c, points, color, width) {
  c.strokeStyle = color; c.lineWidth = width; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
}

// All gradients and noisy cloud detail are baked once, then composited as small stamps.
function makeStamps() {
  const stamps = new Map();
  for (const [name, color] of [['ice', '148,216,255'], ['mint', '146,255,224'], ['fire', '255,121,27'], ['gold', '255,215,117'], ['kinetic', '115,180,255'], ['ghost', '130,199,255']]) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const c = canvas.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(${color},.65)`); g.addColorStop(.3, `rgba(${color},.3)`); g.addColorStop(1, `rgba(${color},0)`);
    c.fillStyle = g; c.fillRect(0, 0, 128, 128); stamps.set(name, canvas);
  }
  const cloud = document.createElement('canvas'); cloud.width = cloud.height = 128;
  const c = cloud.getContext('2d');
  for (let i = 0; i < 30; i++) {
    const a = noise(i, 1) * TAU, r = Math.sqrt(noise(i, 2)) * 34, size = 8 + noise(i, 3) * 18;
    const x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r;
    const g = c.createRadialGradient(x, y, 0, x, y, size);
    g.addColorStop(0, '#effaff75'); g.addColorStop(.42, '#bdeeff44'); g.addColorStop(1, '#82d1ff00'); c.fillStyle = g; c.fillRect(x - size, y - size, size * 2, size * 2);
  }
  stamps.set('cloud', cloud); return stamps;
}

export class SkillVFX {
  constructor(context) { this.c = context; this.history = new VfxHistory(); this.stamps = makeStamps(); }
  begin(run, time, lowEffects, visible) {
    this.run = run; this.t = time; this.low = lowEffects; this.visible = visible; this.detailBudget = lowEffects ? 40 : 100;
    this.history.update(run, visible);
  }
  stamp(name, x, y, radius, alpha = 1) {
    const c = this.c; c.save(); c.globalAlpha *= alpha; c.drawImage(this.stamps.get(name), x - radius, y - radius, radius * 2, radius * 2); c.restore();
  }
  ground(stats) {
    if (this.run.upgrades.nova) this.fire(stats.fireRadius);
    if (this.run.upgrades.orbit) this.blades(stats.orbitRadius, stats.orbitCount);
  }
  overhead() {
    if (this.run.upgrades.bolt) this.winterOrb();
    if (this.run.upgrades.lightning) this.kineticBank();
  }
  fire(radius) {
    const c = this.c, p = this.run.player, t = this.t, n = this.low ? 40 : 80;
    c.save(); c.translate(p.x, p.y); c.lineJoin = 'round';
    // The continuous hot lip is the actual damage radius; tongues decorate its outside.
    for (const [width, color] of [[19, '#8c291e36'], [10, '#f36a2460'], [3, '#ffd28cc4']]) {
      c.strokeStyle = color; c.lineWidth = width; c.beginPath();
      for (let i = 0; i <= n; i++) { const a = i / n * TAU, r = radius + Math.sin(a * 13 + t * 7) * 1.8; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(r, 0); } c.closePath(); c.stroke();
    }
    const tongues = this.low ? 26 : 72;
    for (let i = 0; i < tongues; i++) {
      const a = (i + noise(i, 4) * .65) / tongues * TAU, pulse = (t * (1.6 + noise(i) * .8) + noise(i, 2)) % 1;
      const height = 3 + Math.sin(pulse * Math.PI) * (5 + noise(i, 3) * 15), width = 1.4 + noise(i, 5) * 2.8;
      const x = Math.cos(a) * radius, y = Math.sin(a) * radius;
      if (i % (this.low ? 3 : 2) === 0) this.stamp('fire', x, y, 17 + height * .35, .42);
      c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2);
      c.globalAlpha = .2 + Math.sin(pulse * Math.PI) * (.3 + noise(i, 6) * .25);
      c.fillStyle = i % 3 ? '#ff8e37' : '#ffca70'; c.beginPath(); c.moveTo(-width, 3);
      c.bezierCurveTo(-width * 1.4, -height * .5, width, -height * .5, Math.sin(t * 9 + i) * 4, -height);
      c.quadraticCurveTo(width * 2, -height * .25, width, 3); c.closePath(); c.fill();
      if (!this.low) { c.fillStyle = '#fff0b5'; c.beginPath(); c.moveTo(-width * .35, 2); c.quadraticCurveTo(0, -height * .55, width * .5, -height * .42); c.lineTo(width * .35, 2); c.fill(); }
      c.restore();
    }
    if (!this.low) for (let i = 0; i < 24; i++) {
      const age = (t * .65 + noise(i, 8)) % 1, a = noise(i, 9) * TAU, r = radius * (.82 + noise(i, 10) * .22);
      c.globalAlpha = Math.sin(age * Math.PI) * .8; c.fillStyle = i % 3 ? '#ffbc67' : '#ffe5aa';
      c.fillRect(Math.cos(a) * r + Math.sin(age * 5 + i) * 3, Math.sin(a) * r - age * 20, 1.4, 3);
    }
    c.restore();
  }
  blades(radius, count) {
    const c = this.c, p = this.run.player, t = this.t;
    c.save(); c.translate(p.x, p.y); c.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      // This primary blade center exactly matches core.attack's collision center.
      const a = this.run.time * 2.6 + i * TAU / count;
      const segments = this.low ? 5 : 12;
      for (let j = 0; j < segments; j++) {
        const f = j / segments, start = a - .95 + f * .95;
        c.strokeStyle = `rgba(157,255,222,${.025 + f * .24})`; c.lineWidth = 1 + f * 5;
        c.beginPath(); c.arc(0, 0, radius, start, start + .95 / segments + .012); c.stroke();
        if (!this.low) { c.strokeStyle = `rgba(199,255,240,${f * .16})`; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, radius + Math.sin(t * 8 + i) * 3, start - .16, start); c.stroke(); }
      }
      const x = Math.cos(a) * radius, y = Math.sin(a) * radius;
      if (!this.low) this.stamp('mint', x, y, 23, .5);
      c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2);
      polygon(c, [[-4, 10], [-3, -9], [0, -22], [4, -8], [3, 9], [0, 13]], '#a4e9d9b8');
      polygon(c, [[0, -21], [4, -8], [1, 10], [0, 5]], '#edfff4ed');
      line(c, [[-3, 7], [0, 11], [4, 7]], '#d4ffeb', 1.4);
      line(c, [[0, 11], [0, 16]], '#77c9b9', 2); c.restore();
    }
    c.restore();
  }
  winterOrb() {
    const c = this.c, p = this.run.player, t = this.t;
    const x = p.x + 18 + Math.sin(t * 1.7) * 3, y = p.y - 64 + Math.sin(t * 2.4) * 3, pulse = 1 + Math.sin(t * 6) * .045;
    c.save(); this.stamp('ice', x, y, 45, .8); c.translate(x, y); c.scale(pulse, pulse);
    c.fillStyle = '#416f9b55'; c.beginPath(); c.arc(0, 0, 18, 0, TAU); c.fill();
    for (let layer = 0; layer < (this.low ? 1 : 3); layer++) {
      c.save(); c.rotate(t * (layer % 2 ? -.8 : .6) + layer * 2); c.scale(1, .85 + layer * .06);
      this.stamp('cloud', 0, 0, 28 - layer * 3, .95 - layer * .16); c.restore();
    }
    const facets = this.low ? 5 : 10;
    for (let i = 0; i < facets; i++) {
      const a = t * (i % 2 ? .9 : -1.2) + i * TAU / facets, r = 14 + Math.sin(t * 2 + i) * 4;
      const fx = Math.cos(a) * r, fy = Math.sin(a) * r * .8;
      c.save(); c.translate(fx, fy); c.rotate(a + .5); c.globalAlpha = .4 + .3 * Math.sin(a + t);
      polygon(c, [[-3, 0], [0, -7], [3, 0], [0, 4]], '#ddf9ff'); c.restore();
    }
    c.strokeStyle = '#c9efffac'; c.lineWidth = 1.6;
    for (let i = 0; i < (this.low ? 2 : 4); i++) { c.save(); c.rotate(t * .9 + i * 1.8); c.beginPath(); c.ellipse(0, 0, 22 + i, 7 + i, .3, .3, Math.PI * 1.25); c.stroke(); c.restore(); }
    c.restore();
    // Thin channel wisps join the player and globe; shots retain their true model coordinates.
    if (!this.low) { c.save(); c.strokeStyle = '#8ac8eb48'; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x + 7, p.y - 23); c.bezierCurveTo(x - 18, y + 29, x + Math.sin(t * 3) * 14, y + 25, x, y + 18); c.stroke(); c.restore(); }
  }
  corona(x, y, size, phase, alpha = 1) {
    const c = this.c; c.save(); c.translate(x, y); c.rotate(phase); c.globalAlpha *= alpha;
    polygon(c, [[-size, 0], [-size * .22, -size * .2], [0, -size], [size * .2, -size * .2], [size, 0], [size * .22, size * .2], [0, size], [-size * .2, size * .22]], '#b9eaffc9');
    c.rotate(.65); polygon(c, [[-size * .6, 0], [0, -2], [size * .6, 0], [0, 2]], '#f5fdff');
    c.fillStyle = '#f5fdff'; c.beginPath(); c.arc(0, 0, 2.2, 0, TAU); c.fill(); c.restore();
  }
  kineticBank() {
    const c = this.c, p = this.run.player, t = this.t;
    // Existing cooldown is only a visual gather cue; the simulation still releases every volley.
    const remaining = this.run._weaponTimers?.lightning ?? 0, gather = clamp(1 - remaining / .55);
    const count = this.low ? 3 : 5;
    for (let i = 0; i < count; i++) {
      const amount = clamp((gather - i * .11) * 2.3); if (!amount) continue;
      const a = Math.PI + .35 + i / (count - 1) * (Math.PI - .7);
      const x = p.x + Math.cos(a) * 34, y = p.y - 31 + Math.sin(a) * 20 + Math.sin(t * 3 + i) * 2;
      c.save(); c.globalAlpha = amount;
      c.fillStyle = '#15273cb0'; c.beginPath(); c.ellipse(x, y, 9, 8, 0, 0, TAU); c.fill();
      this.stamp('kinetic', x, y, 23, .8);
      this.corona(x, y, 7 + Math.sin(t * 7 + i) * 1.3, t * .8 + i);
      if (!this.low) { c.strokeStyle = '#83caff55'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, 10, 4, -t + i, .4, 4.5); c.stroke(); }
      c.restore();
    }
  }
  spectre(ally, sprite) {
    if (!this.visible(ally)) return;
    const c = this.c, t = this.t, state = this.history.allies.get(ally.id);
    const fade = state ? .4 + .6 * clamp((this.run.time - state.bornAt) / .35) : 1;
    const cast = state ? clamp(1 - (this.run.time - state.castAt) / .28) : 0;
    const bob = Math.sin(t * 4 + ally.id) * 2.5, direction = state?.direction || 1;
    c.save(); c.globalAlpha = fade;
    this.stamp('ghost', ally.x, ally.y - 18, 36, .48);
    if (!this.low && state) for (const point of state.points.slice(0, -1).filter((_, i) => i % 2 === 0)) {
      const age = this.run.time - point.time; if (age > .22 || Math.hypot(point.x - ally.x, point.y - ally.y) < 1) continue;
      c.save(); c.globalAlpha *= .12 * (1 - age / .22); sprite(point.x - 28, point.y - 46 + bob, 56, 60); c.restore();
    }
    c.save(); c.globalAlpha *= .66 + Math.sin(t * 2 + ally.id) * .06; c.translate(ally.x, ally.y + bob); c.transform(1, 0, direction * cast * .055, 1, direction * cast * 2, -cast * 2);
    sprite(-28, -46, 56, 60); c.restore();
    if (cast > 0) {
      const x = ally.x + direction * (18 + cast * 3), y = ally.y - 23 + bob;
      this.stamp('ghost', x, y, 18, cast); line(c, [[ally.x + direction * 5, ally.y - 28 + bob], [x, y]], `rgba(206,239,255,${cast * .8})`, 2.5);
      this.corona(x, y, 5 * cast + 2, -t, cast);
    }
    c.restore();
  }
  projectile(shot) {
    if (!supported(shot)) return false;
    if (!this.visible(shot)) return true;
    const c = this.c, detail = this.detailBudget-- > 0, state = this.history.shots.get(shot.id);
    const cold = shot.element === 'cold', kinetic = shot.element === 'kinetic';
    const angle = Math.atan2(shot.vy || 0, shot.vx || 1), r = Math.max(3, Math.min(9, shot.radius || 5));
    c.save(); c.lineCap = 'round';
    if (detail && !this.low && state?.points.length > 1) {
      const points = state.points.filter(point => this.run.time - point.time < .2);
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        line(c, [[a.x, a.y], [b.x, b.y]], cold ? `rgba(167,226,255,${i / points.length * .35})` : kinetic ? `rgba(111,188,255,${i / points.length * .3})` : `rgba(163,202,244,${i / points.length * .2})`, 1 + i / points.length * 3);
      }
    }
    if (detail) this.stamp(cold ? 'ice' : kinetic ? 'kinetic' : 'ghost', shot.x, shot.y, kinetic ? 25 : 19, .65);
    c.translate(shot.x, shot.y); c.rotate(angle);
    if (cold) {
      polygon(c, [[-r * 5, 0], [-r, -r * .65], [r * 2, 0], [-r, r * .7]], '#bceaff65');
      polygon(c, [[-r * 1.5, -r * .7], [r * 2.1, 0], [-r, r * .75], [-r * .3, 0]], '#ddf8ffd9');
      line(c, [[-r * 1.7, -r * .2], [r * 1.9, 0]], '#fbffff', 1.2);
      if (detail && !this.low) { this.stamp('cloud', -r, 0, 14, .6); polygon(c, [[-r * 2.4, -r], [-r * 3.3, -r * 1.6], [-r * 2.7, -r * .2]], '#bceaff9c'); }
    } else if (kinetic) {
      polygon(c, [[-r * 7, 0], [-r, -r], [r, 0], [-r, r]], '#5b9dff58');
      polygon(c, [[-r * 4, 0], [-r, -1.8], [r * 1.6, 0], [-r, 1.8]], '#e1f7ffcf');
      this.corona(0, 0, r * 1.7, this.t * 2 + (shot.id || 0));
    } else {
      // The selected Duskbound caster has a neutral ghost lance; RS itself has no universal shot.
      c.strokeStyle = '#a4cff5a8'; c.lineWidth = 2; c.beginPath(); c.moveTo(-r * 4, 0); c.quadraticCurveTo(-r * 2, -r * 1.2, r, 0); c.stroke();
      polygon(c, [[-r * 1.4, 0], [0, -r * .7], [r * 2.1, 0], [0, r * .7]], '#cfebffb8');
      line(c, [[-r, 0], [r * 1.8, 0]], '#f4faffb0', 1);
    }
    c.restore(); return true;
  }
  effect(effect) {
    if (!['frost', 'kinetic', 'burn'].includes(effect.kind)) return false;
    if (!this.visible(effect)) return true;
    const c = this.c, progress = clamp(1 - effect.life / (effect.maxLife || 1)), alpha = 1 - progress;
    const radius = Math.max(3, effect.radius || 24);
    c.save(); c.translate(effect.x, effect.y); c.globalAlpha = alpha;
    if (effect.kind === 'burn') {
      c.strokeStyle = '#ffbe7338'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, radius * (.94 + progress * .06), 0, TAU); c.stroke();
    } else if (effect.kind === 'frost') {
      if (!this.low) this.stamp('cloud', 0, 0, radius * (1 + progress), .7);
      const count = this.low ? 6 : 11;
      for (let i = 0; i < count; i++) {
        const a = i / count * TAU + noise(i, effect.x), reach = radius * (.2 + progress * .8);
        c.save(); c.rotate(a); c.translate(reach, 0); c.rotate(-.2);
        polygon(c, [[-2, -2], [6 + alpha * 8, 0], [-3, 3], [0, 0]], i % 2 ? '#b8e8ff' : '#f1fcff'); c.restore();
      }
      c.strokeStyle = '#bceeff70'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, 0, radius * (.4 + progress * .6), radius * (.3 + progress * .3), 0, 0, TAU); c.stroke();
    } else {
      const cast = effect.maxLife > .25;
      if (!this.low) this.stamp('kinetic', 0, 0, radius * (1 + progress), .8);
      const count = this.low ? 6 : 10;
      for (let i = 0; i < count; i++) {
        const a = i / count * TAU + noise(i, effect.y), inner = radius * progress * .5, outer = radius * (.4 + progress * .9);
        line(c, [[Math.cos(a) * inner, Math.sin(a) * inner], [Math.cos(a) * outer, Math.sin(a) * outer]], i % 2 ? '#daefff' : '#84bfff', alpha * (cast ? 1.5 : 2.2));
      }
      this.corona(0, 0, radius * .45 * alpha, .3, alpha);
    }
    c.restore(); return true;
  }
}

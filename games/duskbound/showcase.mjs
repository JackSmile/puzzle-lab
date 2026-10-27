import { createRun, tick, UPGRADES } from './core.mjs';
import { Renderer } from './render.mjs';

const $ = id => document.getElementById(id);
const renderer = new Renderer($('previewCanvas'));
const skills = [
  ['bolt', 'ЛЁД', 'Ледяная сфера, холодные следы и осколки при попадании.'],
  ['orbit', 'ФИЗИЧЕСКИЙ УРОН', 'Призрачные клинки в непрерывном круговом вихре.'],
  ['nova', 'ОГОНЬ', 'Живое огненное кольцо: жар, пламя и искры.'],
  ['lightning', 'КИНЕТИКА', 'Накопление аномалий перед энергетическим залпом.'],
  ['minion', 'ПРИСПЕШНИКИ', 'Призрачные существа движутся и атакуют самостоятельно.'],
  ['all', 'СВЯЗКА', 'Пять умений на одном поле.'],
];
let selected = 'bolt', run, paused = false, lastFrame = 0;

function resetScene() {
  run = createRun({ classId: 'witch', seed: 1027 });
  run.upgrades = Object.fromEntries((selected === 'all' ? skills.slice(0, 5).map(item => item[0]) : [selected]).map(id => [id, 4]));
  // Stationary preview targets keep actual attacks visible without progression or meaningful incoming damage.
  run._spawnTimer = Infinity; run._nextElite = Infinity; run.xpNeeded = Infinity; run.terrain = [];
  run.enemies = Array.from({ length: 9 }, (_, index) => {
    const angle = index * Math.PI * 2 / 9, radius = index % 3 === 0 ? 156 : 86;
    return { id: run._nextId++, kind: 'ghoul', x: Math.cos(angle) * radius, y: Math.sin(angle) * radius,
      radius: 15, hp: 1e6, maxHp: 1e6, speed: 0, damage: .0001, xp: 0, shotTimer: Infinity, telegraph: 0, regen: 0 };
  });
}

function updateSelection() {
  for (const button of $('skillPicker').children) button.setAttribute('aria-pressed', String(button.dataset.skill === selected));
  const definition = skills.find(item => item[0] === selected);
  $('previewTitle').textContent = selected === 'all' ? 'Сила связки' : UPGRADES[selected].name;
  $('previewDescription').textContent = definition[2];
  $('previewAnnouncer').textContent = $('previewTitle').textContent;
  resetScene();
}

for (const [id, tag] of skills) {
  const button = document.createElement('button'); button.type = 'button'; button.dataset.skill = id;
  button.append(document.createTextNode(id === 'all' ? 'Все умения' : UPGRADES[id].name));
  const label = document.createElement('span'); label.textContent = tag; button.append(label);
  button.onclick = () => { selected = id; updateSelection(); };
  $('skillPicker').append(button);
}

function updatePause() {
  $('previewPause').textContent = paused ? 'Продолжить' : 'Пауза';
  $('previewPause').setAttribute('aria-pressed', String(paused));
}
$('previewPause').onclick = () => { paused = !paused; updatePause(); };
$('previewLowEffects').checked = matchMedia('(prefers-reduced-motion: reduce)').matches;
renderer.lowEffects = $('previewLowEffects').checked;
$('previewLowEffects').onchange = () => { renderer.lowEffects = $('previewLowEffects').checked; };
window.addEventListener('resize', () => renderer.resize());
document.addEventListener('visibilitychange', () => { if (document.hidden) { paused = true; updatePause(); } });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !event.repeat) { paused = !paused; updatePause(); } });

function frame(now) {
  const dt = lastFrame ? Math.min(.05, Math.max(0, (now - lastFrame) / 1000)) : 0; lastFrame = now;
  if (!paused) {
    const moving = $('previewMovement').checked;
    tick(run, dt, moving ? { x: Math.cos(run.time * .7) * .07, y: Math.sin(run.time * .7) * .07 } : {});
    if (run.time > 24) resetScene();
  }
  // This isolated visual preview omits floating damage numbers so the skill silhouettes remain visible.
  run.texts.length = 0;
  renderer.render(run, { character: 'witch' });
  requestAnimationFrame(frame);
}
updateSelection(); updatePause(); requestAnimationFrame(frame);

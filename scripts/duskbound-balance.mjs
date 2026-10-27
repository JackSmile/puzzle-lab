// Diagnostic bot, not a gameplay assertion: ordinary createRun stats, public decisions only.
// Run: node scripts/duskbound-balance.mjs [--stationary] [--seeds=1,12,71]
import { CHARACTERS, UPGRADES, createRun, tick, chooseUpgrade, supportTargets, equipLoot, stats } from '../games/duskbound/core.mjs';

const args = new Set(process.argv.slice(2));
const seedsArg = process.argv.find(arg => arg.startsWith('--seeds='));
const seeds = seedsArg ? seedsArg.slice(8).split(',').map(Number) : [1, 12, 71];
if (!seeds.length || seeds.some(seed => !Number.isSafeInteger(seed))) throw new Error('Seeds must be integers');
const stationary = args.has('--stationary');
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const nearest = (items, origin) => items.reduce((best, item) => !best || distance(item, origin) < distance(best, origin) ? item : best, null);

function optionScore(run, id, target) {
  const level = run.upgrades[id] || 0;
  const missing = 1 - run.player.hp / run.player.maxHp;
  if (UPGRADES[id].type === 'support') {
    const rank = run.links[target]?.[id] || 0;
    const weights = { burning: 34, minion_damage: 33, infused: 20, volley: 32, pierce: 25, unleash: 28, area: 24, critical: 10 };
    return weights[id] * (1 + (run.upgrades[target] || 0) * .08) / (1 + rank * .3);
  }
  const damageSkills = ['bolt', 'nova', 'minion', 'lightning', 'orbit'].filter(id => run.upgrades[id]).length;
  const weapons = {
    bolt: level ? 25 : 42,
    nova: level ? 31 : 33,
    minion: level === 2 || level === 4 ? 48 : level ? 28 : 44,
    lightning: level ? 27 : 43,
    orbit: level ? 25 : 34,
  };
  if (id in weapons) return weapons[id];
  if (id === 'might') return 28 + damageSkills * 4 - level * 2;
  if (id === 'haste') return 30 + damageSkills * 3 + level * 2;
  if (id === 'regen') return 18 + missing * 55 + ((run.upgrades.nova || 0) > 0 && stats(run).regen < stats(run).maxHp * .0025 ? 16 : 0) - level * 2;
  if (id === 'vitality') return 18 + missing * 75 - level;
  if (id === 'magnet') return level < 2 ? 35 - level * 5 : 18;
  if (id === 'stride') return level < 2 ? 25 - level * 3 : 10;
  return 0;
}

function pickUpgrade(run) {
  const options = run.offered.flatMap(id => UPGRADES[id].type === 'support'
    ? supportTargets(run, id).map(target => ({ id, target, score: optionScore(run, id, target) }))
    : [{ id, target: undefined, score: optionScore(run, id) }]);
  options.sort((a, b) => b.score - a.score);
  if (!options[0]) throw new Error('No eligible upgrade');
  const picked = options[0];
  chooseUpgrade(run, picked.id, picked.target);
  return { time: +run.time.toFixed(2), id: picked.id, target: picked.target };
}

function itemScore(item, run) {
  if (!item) return 0;
  const m = item.mods;
  const missing = 1 - run.player.hp / run.player.maxHp;
  return (m.damage || 0) * (item.damageType === 'elemental' ? 55 : 90)
    + (m.cooldown || 0) * 120 + (m.speed || 0) * 55 + (m.maxHp || 0) * (.45 + missing * .3)
    + (m.regen || 0) * (18 + missing * 8) + (m.pickup || 0) * .25
    + (m.projectiles || 0) * 23 + (m.area || 0) * 75 + (m.damageReduction || 0) * 130;
}

function movement(run) {
  const player = run.player;
  const loot = nearest(run.loot, player);
  const gem = nearest(run.gems, player);
  const destination = loot && distance(loot, player) < 900 ? loot : gem || player;
  const nearby = run.enemies.filter(enemy => enemy.hp > 0 && !enemy.telegraph && distance(enemy, player) < 330);
  const hostile = run.projectiles.filter(p => p.hostile && distance(p, player) < 250);
  const choices = [{ x: 0, y: 0 }];
  for (let i = 0; i < 24; i++) choices.push({ x: Math.cos(i * Math.PI / 12), y: Math.sin(i * Math.PI / 12) });
  const dx = destination.x - player.x, dy = destination.y - player.y;
  if (dx || dy) { const length = Math.hypot(dx, dy); choices.push({ x: dx / length, y: dy / length }); }
  let selected = choices[0], best = Infinity;
  for (const input of choices) {
    let cost = 0;
    for (const horizon of [.18, .45]) {
      const position = { x: player.x + input.x * player.speed * horizon, y: player.y + input.y * player.speed * horizon };
      cost += distance(position, destination) * .015;
      for (const enemy of nearby) {
        const length = distance(enemy, player) || 1;
        const speed = enemy.speed * (enemy.chill > 0 ? .75 : 1);
        const future = { x: enemy.x + (player.x - enemy.x) / length * speed * horizon, y: enemy.y + (player.y - enemy.y) / length * speed * horizon };
        const clearance = distance(position, future) - player.radius - enemy.radius;
        cost += Math.max(0, 44 - clearance) ** 2 / 120;
        if (clearance < 5) cost += 25;
      }
      for (const projectile of hostile) {
        const future = { x: projectile.x + projectile.vx * horizon, y: projectile.y + projectile.vy * horizon };
        cost += Math.max(0, 30 - distance(position, future)) ** 2 / 90;
      }
    }
    if (input.x || input.y) cost += .05;
    if (cost < best) { best = cost; selected = input; }
  }
  return selected;
}

function simulate(character, seed) {
  const run = createRun({ character, seed });
  const choices = [], items = [];
  let firstLevelAt = null, firstLootAt = null, ticks = 0, input = { x: 0, y: 0 };
  let lowestHp = run.player.hp, contactFrames = 0, snapshots = [], receivedHits = [];
  while (!['dead', 'won'].includes(run.phase) && run.time < 600 && ticks < 20000) {
    while (run.phase === 'upgrade') {
      firstLevelAt ??= +run.time.toFixed(2);
      choices.push(pickUpgrade(run));
    }
    if (run.phase === 'loot') {
      firstLootAt ??= +run.time.toFixed(2);
      const item = run.pendingItem;
      const take = itemScore(item, run) > itemScore(run.equipment[item.slot], run);
      items.push({ time: +run.time.toFixed(2), name: item.name, take });
      equipLoot(run, take);
      continue;
    }
    if (run.phase !== 'playing') throw new Error(`Unexpected phase ${run.phase}`);
    if (!stationary && ticks % 3 === 0) input = movement(run);
    if (run.enemies.some(e => e.hp > 0 && !e.telegraph && distance(e, run.player) < e.radius + run.player.radius)) contactFrames++;
    tick(run, .05, input);
    for (const text of run.texts.filter(text => text.life === .7 && typeof text.value === 'string' && text.value.startsWith('−'))) {
      const enemy = nearest(run.enemies.filter(e => e.hp > 0 && !e.telegraph), run.player);
      receivedHits.push({ time: +run.time.toFixed(2), damage: Number(text.value.slice(1)), hp: +run.player.hp.toFixed(2), nearestEnemyClearance: enemy ? +(distance(enemy, run.player) - enemy.radius - run.player.radius).toFixed(1) : null });
    }
    ticks++;
    lowestHp = Math.min(lowestHp, run.player.hp);
    if (ticks % 1200 === 0) snapshots.push({ time: +run.time.toFixed(2), hp: +run.player.hp.toFixed(1), level: run.level, kills: run.kills, enemies: run.enemies.length });
  }
  return {
    character: CHARACTERS.find(c => c.id === character).name, seed, mode: stationary ? 'stationary' : 'collector-avoidance',
    result: run.phase === 'playing' ? '600s timeout' : run.phase, time: +run.time.toFixed(2),
    hp: +run.player.hp.toFixed(2), maxHp: run.player.maxHp, lowestHp: +lowestHp.toFixed(2), level: run.level,
    kills: run.kills, bossSpawned: run.bossSpawned, bossDefeated: run.bossDefeated,
    firstLevelAt, firstLootAt, contactFrames, receivedHits, upgrades: run.upgrades, links: run.links,
    equipment: Object.fromEntries(Object.entries(run.equipment).map(([slot, item]) => [slot, item?.name || null])), choices, items, snapshots,
  };
}

const results = [];
for (const character of CHARACTERS) for (const seed of seeds) results.push(simulate(character.id, seed));
console.log(JSON.stringify({ protocol: 'Normal createRun, bonuses omitted, no run mutations; bot uses public upgrade and loot APIs, 50ms steps, movement recomputed each 150ms. 600s time cap.', results }, null, 2));

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const moduleUrl = new URL('../games/duskbound/core.mjs', import.meta.url);
const engine = existsSync(moduleUrl) ? await import(moduleUrl) : null;

test('Duskbound exposes the independent simulation module', () => {
  assert.ok(engine, 'The Duskbound simulation module must exist');
});

if (engine) {
  const { createRun, tick, stats, setPaused, chooseUpgrade, UPGRADES, CHARACTERS, DURATION } = engine;
  const advance = (run, seconds, input) => {
    for (let i = 0; i < Math.ceil(seconds / 0.05); i++) {
      tick(run, Math.min(0.05, seconds - i * 0.05), input);
    }
    return run;
  };
  const enemy = (id, overrides = {}) => ({
    id, kind: 'skull', x: 100, y: 0, radius: 12, hp: 20, maxHp: 20,
    speed: 0, hit: 0, ...overrides,
  });

  test('initial state and upgrade catalog satisfy the renderer contract', () => {
    assert.equal(DURATION, 480);
    assert.deepEqual(CHARACTERS.map(c => c.id), ['warden', 'witch', 'seer']);
    assert.deepEqual(CHARACTERS.map(c => c.weapon), ['nova', 'bolt', 'minion']);
    assert.equal(Object.keys(UPGRADES).length, 19);
    for (const definition of Object.values(UPGRADES)) {
      for (const key of ['id', 'name', 'description', 'icon', 'type', 'max', 'color']) assert.ok(definition[key]);
      assert.equal(definition.max, definition.type === 'weapon' ? 6 : definition.type === 'support' ? 3 : 5);
    }
    for (const character of CHARACTERS) {
      const run = createRun({ character: character.id });
      assert.equal(run.phase, 'playing');
      assert.equal(run.time, 0);
      assert.equal(run.player.radius, 12);
      assert.equal(run.level, 1);
      assert.equal(run.xpNeeded, 8);
      assert.equal(run.upgrades[character.weapon], 1);
      assert.equal(run.player.hp, run.player.maxHp);
      for (const value of Object.values(stats(run))) assert.ok(Number.isFinite(value) && value >= 0);
    }
  });

  test('movement covers 225 units in a second and caps diagonal input', () => {
    const straight = createRun();
    advance(straight, 1, { x: 1, y: 0 });
    assert.ok(Math.abs(straight.player.x - 225) < 1e-8);
    assert.equal(straight.player.y, 0);
    const diagonal = createRun();
    advance(diagonal, 1, { x: 20, y: 20 });
    assert.ok(Math.abs(Math.hypot(diagonal.player.x, diagonal.player.y) - 225) < 1e-8);
    const analog = createRun();
    tick(analog, 0.05, { x: 0.5, y: 0 });
    assert.equal(analog.player.x, 5.625);
  });

  test('dt bounds prevent negative, non-finite and large simulation steps', () => {
    const run = createRun();
    tick(run, -1, { x: 1, y: 0 });
    tick(run, NaN, { x: 1, y: 0 });
    tick(run, Infinity, { x: 1, y: 0 });
    assert.equal(run.time, 0);
    tick(run, 10, { x: 1, y: 0 });
    assert.equal(run.time, 0.05);
    assert.equal(run.player.x, 11.25);
  });

  test('pause and terminal phases freeze every simulated field', () => {
    for (const phase of ['paused', 'upgrade', 'loot', 'dead', 'won']) {
      const run = createRun();
      run.phase = phase;
      const before = structuredClone(run);
      tick(run, 0.05, { x: 1, y: 1 });
      assert.deepEqual(run, before);
      setPaused(run, true);
      assert.equal(run.phase, phase);
      if (phase !== 'paused') {
        setPaused(run, false);
        assert.equal(run.phase, phase);
      }
    }
    const run = createRun();
    setPaused(run, true);
    assert.equal(run.phase, 'paused');
    setPaused(run, false);
    assert.equal(run.phase, 'playing');
  });

  test('each starting weapon kills a nearby target and rewards it exactly once', () => {
    for (const character of ['warden', 'witch', 'seer']) {
      const run = createRun({ character });
      run.enemies.push(enemy(900, { x: character === 'witch' ? 64 : 100, hp: 1 }));
      advance(run, 2);
      assert.equal(run.kills, 1, character);
      assert.ok(run.score > 0);
      const score = run.score;
      advance(run, 0.5);
      assert.equal(run.kills, 1);
      assert.equal(run.score, score);
      assert.ok(run.gems.length || run.xp > 0);
    }
  });

  test('bolts aim at the nearest enemy', () => {
    const run = createRun({ character: 'witch' });
    run.enemies.push(enemy(901, { x: 180, hp: 100 }), enemy(902, { x: 0, y: -100, hp: 100 }));
    tick(run, 0.05);
    const bolt = run.projectiles.find(p => !p.hostile);
    assert.ok(bolt);
    assert.ok(Math.abs(bolt.vx) < 1e-8);
    assert.ok(bolt.vy < 0);
  });

  test('contact damage has a 0.7 second invulnerability window', () => {
    const run = createRun();
    run.upgrades = {};
    run.enemies.push(enemy(903, { x: 0, hp: 1000 }));
    const initial = run.player.hp;
    tick(run, 0.05);
    const damaged = run.player.hp;
    assert.ok(damaged < initial);
    advance(run, 0.6);
    assert.ok(run.player.hp >= damaged);
    tick(run, 0.05);
    tick(run, 0.05);
    assert.ok(run.player.hp < damaged);
  });

  test('collecting eight XP offers three distinct upgrades and freezes until choice', () => {
    const run = createRun();
    run.gems.push({ x: 0, y: 0, radius: 4, value: 8 });
    tick(run, 0.05);
    assert.equal(run.phase, 'upgrade');
    assert.equal(run.level, 2);
    assert.equal(run.xp, 0);
    assert.equal(run.offered.length, 3);
    assert.equal(new Set(run.offered).size, 3);
    assert.equal(run.gems.length, 0);
    const time = run.time;
    tick(run, 0.05);
    assert.equal(run.time, time);
    const choice = run.offered[0];
    const selected = UPGRADES[choice].type === 'support' ? engine.supportTargets(run, choice)[0] : null;
    const level = selected ? run.links[selected]?.[choice] || 0 : run.upgrades[choice] || 0;
    chooseUpgrade(run, choice, selected);
    assert.equal(selected ? run.links[selected][choice] : run.upgrades[choice], level + 1);
    assert.equal(run.phase, 'playing');
  });

  test('invalid and capped choices do not mutate state; banked XP immediately offers next level', () => {
    const run = createRun();
    chooseUpgrade(run, 'nova');
    assert.equal(run.upgrades.nova, 1);
    run.xp = 100;
    tick(run, 0.05);
    const before = structuredClone(run);
    chooseUpgrade(run, 'missing');
    assert.deepEqual(run, before);
    const selected = run.offered[0];
    const time = run.time;
    chooseUpgrade(run, selected, engine.supportTargets(run, selected)[0]);
    assert.equal(run.phase, 'upgrade');
    assert.equal(run.level, 3);
    assert.equal(run.time, time);
    run.upgrades = Object.fromEntries(Object.values(UPGRADES).filter(u => u.type !== 'support').map(u => [u.id, u.max]));
    run.links = { bolt: { infused: 3, pierce: 3 }, orbit: { unleash: 3, area: 3 }, nova: { burning: 3, area: 3 }, lightning: { volley: 3, critical: 3 }, minion: { minion_damage: 3, pierce: 3 } };
    run.offered = ['might'];
    const snapshot = structuredClone(run);
    chooseUpgrade(run, 'might');
    assert.deepEqual(run, snapshot);
  });

  test('maxed upgrades are excluded and exhausted pool cannot softlock the run', () => {
    const run = createRun();
    run.upgrades = Object.fromEntries(Object.values(UPGRADES).filter(u => u.type !== 'support').map(u => [u.id, u.max]));
    run.links = { bolt: { infused: 3, pierce: 3 }, orbit: { unleash: 3, area: 3 }, nova: { burning: 3, area: 3 }, lightning: { volley: 3, critical: 3 }, minion: { minion_damage: 3, pierce: 3 } };
    run.upgrades.nova = 5;
    run.xp = 8;
    tick(run, 0.05);
    assert.deepEqual(run.offered, ['nova']);
    chooseUpgrade(run, 'nova');
    assert.equal(run.phase, 'playing');
    run.xp = 100;
    tick(run, 0.05);
    assert.equal(run.phase, 'playing');
    assert.ok(run.xp < run.xpNeeded);
  });

  test('vitality adds 25 max HP and heals exactly 25 HP', () => {
    const run = createRun();
    run.player.hp = 30;
    run.phase = 'upgrade';
    run.offered = ['vitality'];
    chooseUpgrade(run, 'vitality');
    assert.equal(run.player.maxHp, 145);
    assert.equal(run.player.hp, 55);
    assert.equal(stats(run).maxHp, 145);
  });

  test('magnet attracts gems while distant gems persist without expiring', () => {
    const run = createRun();
    run.gems.push({ x: 80, y: 0, value: 1, radius: 4 }, { x: 2000, y: 0, value: 3, radius: 4 });
    tick(run, 0.05);
    assert.ok(run.gems[0].x < 80);
    advance(run, 4);
    assert.ok(run.gems.some(gem => gem.value === 3 && gem.x === 2000));
    assert.equal(run.xp, 1);
  });

  test('orbit blades use their actual positions and cannot hit an enemy every frame', () => {
    const run = createRun();
    run.upgrades = { orbit: 1 };
    const target = enemy(1100, { x: 64, hp: 1000, maxHp: 1000 });
    const distant = enemy(1101, { x: 400, hp: 1000, maxHp: 1000 });
    run.enemies.push(target, distant);
    tick(run, 0.05);
    assert.ok(target.hp < 1000);
    const firstHit = target.hp;
    advance(run, 0.1);
    assert.equal(target.hp, firstHit);
    assert.equal(distant.hp, 1000);
    advance(run, 1);
    assert.ok(target.hp < firstHit);
  });

  test('enemy projectiles damage the player and expired visual objects are removed', () => {
    const run = createRun();
    run.projectiles.push({ id: 1200, kind: 'hex', hostile: true, x: -20, y: 0, vx: 400, vy: 0, radius: 6, life: 1, color: '#f00', damage: 9 });
    run.projectiles.push({ id: 1201, kind: 'bolt', x: 500, y: 500, vx: 0, vy: 0, radius: 5, life: 0.01, color: '#fff' });
    run.effects.push({ kind: 'nova', x: 0, y: 0, radius: 100, color: '#fff', life: 0.01, maxLife: 0.01 });
    run.texts.push({ x: 0, y: 0, value: 1, color: '#fff', life: 0.01 });
    tick(run, 0.05);
    assert.ok(run.player.hp > 111 && run.player.hp < 112);
    assert.equal(run.projectiles.length, 0);
    assert.ok(run.effects.every(item => item.life > 0));
    assert.ok(run.texts.every(item => item.life > 0));
    assert.ok(!run.effects.some(item => item.kind === 'nova'));
  });

  test('gem compaction preserves every point of uncollected experience', () => {
    const run = createRun();
    run.gems = Array.from({ length: 1800 }, (_, i) => ({ x: 2000 + i * 200, y: 2000, radius: 4, value: i % 2 + 1 }));
    tick(run, 0.05);
    assert.ok(run.gems.length <= 600);
    assert.equal(run.gems.reduce((total, gem) => total + gem.value, 0), 2700);
    assert.equal(run.xp, 0);
  });

  test('boss appears at 450 seconds once, remains telegraphed and never respawns after death', () => {
    const run = createRun();
    run.time = 449.96;
    tick(run, 0.05);
    assert.equal(run.bossSpawned, true);
    const boss = run.enemies.find(e => e.kind === 'boss');
    assert.ok(boss);
    const position = [boss.x, boss.y];
    tick(run, 0.05);
    assert.deepEqual([boss.x, boss.y], position);
    boss.hp = 0;
    tick(run, 0.05);
    assert.equal(run.bossDefeated, true);
    advance(run, 1);
    assert.equal(run.enemies.filter(e => e.kind === 'boss').length, 0);
  });

  test('victory requires duration and defeated boss; lethal damage takes precedence', () => {
    const early = createRun();
    early.bossSpawned = true;
    early.bossDefeated = true;
    early.time = 479;
    tick(early, 0.05);
    assert.equal(early.phase, 'playing');
    early.time = 479.99;
    tick(early, 0.05);
    assert.equal(early.phase, 'won');
    const aliveBoss = createRun();
    aliveBoss.time = 480;
    aliveBoss.bossSpawned = true;
    tick(aliveBoss, 0.05);
    assert.equal(aliveBoss.phase, 'playing');
    const dying = createRun();
    dying.time = 479.99;
    dying.bossSpawned = true;
    dying.bossDefeated = true;
    dying.upgrades = {};
    dying.player.hp = 1;
    dying.enemies.push(enemy(999, { x: 0 }));
    tick(dying, 0.05);
    assert.equal(dying.phase, 'dead');
  });

  test('spawns surround player, vary over time and stop regular enemies at 480 seconds', () => {
    const run = createRun({ seed: 12 });
    run.player.x = 3000;
    run.player.y = -2000;
    advance(run, 1);
    assert.ok(run.enemies.length > 0);
    for (const e of run.enemies) {
      const distance = Math.hypot(e.x - run.player.x, e.y - run.player.y);
      assert.ok(distance > 500 && distance < 860);
      assert.ok(e.speed < run.player.speed);
    }
    run.time = 300;
    advance(run, 4);
    assert.ok(run.enemies.some(e => e.kind !== 'skull'));
    run.time = 480;
    run.enemies = [];
    run.bossSpawned = true;
    advance(run, 2);
    assert.equal(run.enemies.length, 0);
  });

  test('RF burns multiple nearby enemies and kinetic volley reaches a cluster', () => {
    for (const weapon of ['nova', 'lightning']) {
      const run = createRun();
      run.upgrades = { [weapon]: 1 };
      run.enemies.push(enemy(1001, { x: 80 }), enemy(1002, { x: 90, y: 20 }));
      advance(run, 0.6);
      assert.equal(run.kills, 2, weapon);
      assert.ok(run.effects.every(effect => Number.isFinite(effect.radius)));
    }
  });

  test('same seed and inputs produce identical complete state', () => {
    const first = createRun({ seed: 71 });
    const second = createRun({ seed: 71 });
    advance(first, 12, { x: 1, y: 0.2 });
    advance(second, 12, { x: 1, y: 0.2 });
    assert.deepEqual(first, second);
  });

  test('early XP progression gives each hero a first choice around 15–25 seconds', () => {
    for (const character of ['warden', 'witch', 'seer']) {
      const run = createRun({ seed: 1, character });
      while (run.phase === 'playing' && run.time < 30) {
        const gem = run.gems.toSorted((a, b) =>
          Math.hypot(a.x - run.player.x, a.y - run.player.y) - Math.hypot(b.x - run.player.x, b.y - run.player.y))[0];
        const dx = gem ? gem.x - run.player.x : 0;
        const dy = gem ? gem.y - run.player.y : 0;
        const length = Math.hypot(dx, dy) || 1;
        tick(run, 0.05, { x: dx / length, y: dy / length });
      }
      assert.equal(run.phase, 'upgrade', character);
      assert.ok(run.time >= 15 && run.time <= 25, `${character}: first upgrade at ${run.time.toFixed(2)}s`);
      assert.ok(run.player.hp > 0);
    }
  });

  test('long simulation keeps bounded objects and preserves uncollected XP value', () => {
    const run = createRun({ seed: 88, bonuses: { maxHp: 100000, regen: 1000 } });
    run.gems = Array.from({ length: 1800 }, (_, i) => ({ x: 2000 + i, y: 2000, radius: 4, value: 1 }));
    for (let i = 0; i < 10400; i++) {
      if (run.phase === 'upgrade') chooseUpgrade(run, run.offered[0], engine.supportTargets(run, run.offered[0])[0]);
      if (run.phase === 'loot') engine.equipLoot(run);
      tick(run, 0.05, { x: Math.cos(i / 250), y: Math.sin(i / 250) });
      assert.ok(run.enemies.filter(e => e.kind !== 'boss').length <= 180);
      assert.ok(run.projectiles.length <= 500);
      assert.ok(run.effects.length <= 250);
      assert.ok(run.texts.length <= 150);
      assert.ok(run.gems.length <= 600);
    }
    assert.ok(run.time >= 480);
    assert.ok(run.gems.reduce((total, gem) => total + gem.value, 0) + run.xp >= 1800);
  });
}

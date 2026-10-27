import test from 'node:test';
import assert from 'node:assert/strict';
import { VfxHistory } from '../games/duskbound/skill-vfx.mjs';

const shot = (id, actorId = 7) => ({ id, x: id, y: 4, vx: 450, vy: 0, life: 1.49, element: 'spectral', context: { actor: { kind: 'minion', id: actorId } } });
const runAt = time => ({ time, projectiles: [], minions: [{ id: 7, x: 0, y: 0, hp: 80 }], mercenaryMinions: [] });

test('VFX observations freeze on repeated simulation time and reset on new run identity', () => {
  const history = new VfxHistory(), run = runAt(1);
  run.projectiles = [shot(1)]; history.update(run);
  assert.ok(history.allies.has(7), 'live ally is observed');
  const before = structuredClone([...history.allies]);
  run.minions[0].x = 99; history.update(run);
  assert.deepEqual([...history.allies], before);
  const next = runAt(1); history.update(next);
  assert.equal(history.shots.size, 0);
  assert.equal(history.allies.get(7).castAt, -Infinity);
  assert.equal(history.allies.get(7).points[0].x, 0);
});

test('VFX history prunes removed actors and bounds projectile, ally and point histories', () => {
  const history = new VfxHistory(), run = runAt(0);
  run.minions = Array.from({ length: 60 }, (_, id) => ({ id, x: id, y: 0, hp: 1 }));
  run.projectiles = Array.from({ length: 900 }, (_, id) => shot(id));
  for (let frame = 0; frame < 100; frame++) { run.time = frame / 30; run.minions[0].x++; history.update(run); }
  assert.ok(history.shots.size > 0 && history.shots.size <= 160);
  assert.ok(history.seen.size <= 512);
  assert.ok(history.allies.size > 0 && history.allies.size <= 32);
  for (const state of [...history.shots.values(), ...history.allies.values()]) assert.ok(state.points.length <= 6);
  run.time += .1; run.minions = []; run.projectiles = []; history.update(run);
  assert.equal(history.shots.size, 0); assert.equal(history.allies.size, 0); assert.equal(history.seen.size, 0);
});

test('actual new spectral actor shots trigger one cast and observation does not mutate frozen model', () => {
  const history = new VfxHistory(), run = runAt(4);
  run.projectiles = [shot(1)];
  const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } };
  freeze(run); const before = JSON.stringify(run); history.update(run);
  assert.ok(history.allies.has(7), 'actual casting ally is observed');
  assert.equal(history.allies.get(7).castAt, 4);
  assert.equal(JSON.stringify(run), before);
  // Same visible shot is not another cast in a continuous run.
  const continuous = runAt(5); continuous.projectiles = [shot(2)]; history.update(continuous);
  continuous.time = 5.2; history.update(continuous);
  assert.equal(history.allies.get(7).castAt, 5);
  continuous.projectiles.push(shot(3)); continuous.time = 5.3; history.update(continuous);
  assert.equal(history.allies.get(7).castAt, 5.3);
});

test('offscreen projectiles do not allocate trail detail and dead allies cannot retain cast state', () => {
  const history = new VfxHistory(), run = runAt(1);
  run.projectiles = [shot(1)]; history.update(run, () => false);
  assert.equal(history.shots.size, 0);
  run.minions[0].hp = 0; run.time += .1; history.update(run);
  assert.equal(history.allies.size, 0);
  run.minions[0].hp = 80; run.time += .1; history.update(run);
  assert.ok(history.allies.has(7), 'respawned ally is observed');
  assert.equal(history.allies.get(7).bornAt, run.time);
  assert.equal(history.allies.get(7).castAt, -Infinity);
});

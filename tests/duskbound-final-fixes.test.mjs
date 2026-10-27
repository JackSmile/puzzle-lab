import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../games/duskbound/core.mjs';
import {refreshClassResources} from '../games/duskbound/classes.mjs';
import {combatState} from '../games/duskbound/uniques.mjs';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
function fresh(classed = true) {
  const run = core.createRun(classed ? {classId: 'witch', seed: 42} : {character: 'witch', seed: 42});
  run._spawnTimer = 1e8;
  return run;
}
function equip(run, item, take = true) {
  run.pendingItem = item;
  run.phase = 'loot';
  core.equipLoot(run, take);
}
function rolledLifeFlask(run) {
  for (let i = 0; i < 500; i++) {
    const item = core.rollItem(run, 'magic');
    if (item.slot === 'flask' && item.mods.maxHp === 20) return item;
  }
  assert.fail('seed42 must produce a real magic flask with +20 maximum life');
}
function expire(run) {
  const until = combatState(run).flaskUntil;
  combatState(run).flaskCharges = 0;
  while (run.time < until) core.tick(run, .05);
}
for (const classed of [true, false]) {
  const label = classed ? 'class' : 'legacy';
  test(`F1 ${label}: rolled +20 life flask applies on activation, expires and clamps current HP`, () => {
    const run = fresh(classed), base = run.player.maxHp;
    equip(run, rolledLifeFlask(run));
    near(core.stats(run).maxHp, base);
    near(run.player.maxHp, base);
    core.tick(run, .05);
    assert.ok(combatState(run).flaskUntil > run.time);
    near(run.player.maxHp, base + 20);
    near(run.player.hp, base + 20);
    expire(run);
    near(core.stats(run).maxHp, base);
    near(run.player.maxHp, base);
    near(run.player.hp, base);
  });
  test(`F1 ${label}: an upgrade during the flask effect cannot leave sticky maximum life`, () => {
    const run = fresh(classed), base = run.player.maxHp;
    equip(run, rolledLifeFlask(run));
    core.tick(run, .05);
    run.phase = 'upgrade'; run.offered = ['might'];
    core.chooseUpgrade(run, 'might');
    assert.equal(run.upgrades.might, 1);
    near(run.player.maxHp, base + 20);
    expire(run);
    near(run.player.maxHp, base);
  });
  test(`F1 ${label}: paused time preserves an active flask and live resources`, () => {
    const run = fresh(classed);
    equip(run, rolledLifeFlask(run));
    core.tick(run, .05);
    const before = {time: run.time, until: combatState(run).flaskUntil, maxHp: run.player.maxHp, hp: run.player.hp};
    core.setPaused(run, true);
    for (let i = 0; i < 100; i++) core.tick(run, .05);
    assert.deepEqual({time: run.time, until: combatState(run).flaskUntil, maxHp: run.player.maxHp, hp: run.player.hp}, before);
  });
  test(`F1 ${label}: zero HP and dead phase cannot be revived by a flask transition`, () => {
    for (const phase of ['playing', 'dead']) {
      const run = fresh(classed);
      equip(run, rolledLifeFlask(run));
      run.player.hp = 0; run.phase = phase;
      core.tick(run, .05);
      assert.equal(run.player.hp, 0);
      assert.equal(run.phase, 'dead');
      assert.equal(combatState(run).flaskUntil, 0);
    }
  });
}
test('F1 class: direct resource refresh never resurrects zero HP or a dead player', () => {
  for (const [phase, hp] of [['playing', 0], ['dead', 0], ['dead', 7]]) {
    const run = fresh(); run.phase = phase; run.player.hp = hp;
    run.upgrades.vitality = 1;
    refreshClassResources(run);
    assert.equal(run.player.hp, hp);
    near(run.player.maxHp, 82);
  }
});
test('F1 class: lethal damage before automatic flask activation stays lethal', () => {
  const run = fresh(); equip(run, rolledLifeFlask(run));
  run.player.hp = 1;
  run.player.ailments.ignite = {dps: 100, until: 10};
  core.tick(run, .05);
  assert.equal(run.player.hp, 0);
  assert.equal(run.phase, 'dead');
});
const gear = (slot, name) => ({slot, name, rarity: 'magic', mods: {}});
for (const [oldSlot, newSlot] of [['shield', 'offhand'], ['offhand', 'shield'], ['weapon', 'weapon']]) {
  test(`F2: ${oldSlot} → ${newSlot} resolves the exact lost item and equips it consistently`, () => {
    const run = fresh(), old = gear(oldSlot, 'Старый предмет'), next = gear(newSlot, 'Находка');
    equip(run, old); run.pendingItem = next; run.phase = 'loot';
    assert.equal(typeof core.lootReplacement, 'function', 'UI and equip must share an exported replacement resolver');
    assert.deepEqual(core.lootReplacement(run), {slot: oldSlot, item: old, items: [{slot: oldSlot,item: old}]});
    core.equipLoot(run);
    assert.equal(run.equipment[newSlot], next);
    if (oldSlot !== newSlot) assert.equal(run.equipment[oldSlot], null);
  });
}
test('F2: declining an opposite-slot find preserves the compared item', () => {
  const run = fresh(), shield = gear('shield', 'Щит'), offhand = gear('offhand', 'Клинок');
  equip(run, shield); run.pendingItem = offhand; run.phase = 'loot';
  assert.equal(typeof core.lootReplacement, 'function');
  assert.equal(core.lootReplacement(run).item, shield);
  core.equipLoot(run, false);
  assert.equal(run.equipment.shield, shield);
  assert.equal(run.equipment.offhand, null);
  assert.equal(run.pendingItem, null);
});
test('F2: genuinely empty slot has no lost item and can be equipped', () => {
  const run = fresh(), offhand = gear('offhand', 'Клинок');
  run.pendingItem = offhand; run.phase = 'loot';
  assert.equal(typeof core.lootReplacement, 'function');
  assert.deepEqual(core.lootReplacement(run), {slot: 'offhand', item: null,items: []});
  core.equipLoot(run);
  assert.equal(run.equipment.offhand, offhand);
  assert.equal(run.equipment.shield, null);
});

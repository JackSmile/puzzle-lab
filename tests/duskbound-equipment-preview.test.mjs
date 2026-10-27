import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../games/duskbound/core.mjs';
import {makeUnique} from '../games/duskbound/uniques.mjs';
import {equipmentProjection,SLOT_NAMES} from '../games/duskbound/item-ui.mjs';

function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
test('two-handed preview includes every displaced slot and reports real lost life/armour without changing the run',()=>{
  const run=createRun({classId:'marauder',seed:42});
  run.equipment.weapon={id:100,slot:'weapon',mods:{maxHp:10}};
  run.equipment.shield={id:101,slot:'shield',mods:{maxHp:20,armour:300}};
  run.equipment.quiver={id:102,slot:'quiver',mods:{armour:50}};
  const original=JSON.stringify(run);freeze(run);
  const result=equipmentProjection(run,makeUnique('terminus-est',200,()=>0));
  assert.equal(result.before.life,96);assert.equal(result.after.life,66);
  assert.equal(result.before.armour,350);assert.equal(result.after.armour,0);
  assert.deepEqual(result.replacement.items.map(e=>e.slot).sort(),['quiver','shield','weapon']);
  assert.equal(JSON.stringify(run),original,'comparison cannot equip, heal, roll or advance live state');
});
test('shield preview evaluates local Aegis defence and intelligence scaling on the clone',()=>{
  const run=createRun({classId:'marauder',seed:7});
  const result=equipmentProjection(freeze(run),makeUnique('aegis-aurora',201,()=>0));
  assert.equal(result.before.armour,0);assert.equal(result.after.armour,320);
  assert.equal(result.before.energyShield,0);assert.ok(Math.abs(result.after.energyShield-48.672)<1e-9);
  assert.equal(run.equipment.shield,null);assert.equal(run.player.energyShield,0);
});
test('gloves and boots are reachable labels for the added equipment slots',()=>{
  const run=createRun({classId:'witch'});
  for(const [id,slot] of [['asenaths-gentle-touch','gloves'],['ralakeshs-impatience','boots']]){
    assert.ok(Object.hasOwn(run.equipment,slot));assert.ok(SLOT_NAMES[slot]);
    const item=makeUnique(id,202,()=>0),result=equipmentProjection(run,item);
    assert.equal(result.replacement.slot,slot);assert.equal(run.equipment[slot],null);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../games/duskbound/core.mjs';
const { createRun, tick, stats, chooseUpgrade, UPGRADES } = game;
const target = (id, x = 90, extras = {}) => ({ id, kind: 'skull', x, y: 0, radius: 12, hp: 1000, maxHp: 1000, speed: 0, damage: 10, ...extras });
const advance = (run, seconds, input) => { for (let i = 0; i < Math.round(seconds / .05); i++) tick(run, .05, input); };
const withSkills = upgrades => { const run = createRun({ character: 'witch' }); run.upgrades = upgrades; run._spawnTimer = 999; return run; };
const choose = (run, id, skill) => { run.phase = 'upgrade'; run.offered = [id]; chooseUpgrade(run, id, skill); };

test('PoE catalog keeps IDs, supplies five named skills and three distinct starts', () => {
  assert.deepEqual(['bolt','orbit','nova','lightning','minion'].map(id => UPGRADES[id]?.name), ['Winter Orb','Blade Vortex','Righteous Fire','Kinetic Fusillade','Raise Spectre']);
  assert.deepEqual(game.CHARACTERS.map(c => [c.name,c.weapon]), [['Chieftain','nova'], ['Elementalist','bolt'], ['Necromancer','minion']]);
  const run = createRun();
  assert.deepEqual(run.links, {});
  assert.deepEqual(run.equipment, { weapon: null, body: null, flask: null, belt: null, ring: null });
  assert.deepEqual(run.loot, []);
  assert.equal(run.pendingItem, null);
});

test('support choice requires offered compatible owned target and stores only local links', () => {
  assert.equal(typeof game.supportTargets, 'function');
  assert.equal(typeof game.skillStats, 'function');
  const run = withSkills({ bolt: 1, minion: 1, nova: 1 });
  assert.deepEqual(game.supportTargets(run, 'pierce'), ['bolt','minion']);
  const beforeMinion = game.skillStats(run, 'minion');
  run.phase = 'upgrade'; run.offered = ['pierce'];
  for (const invalid of [undefined, 'nova', 'lightning', 'missing']) {
    const before = structuredClone(run);
    chooseUpgrade(run, 'pierce', invalid);
    assert.deepEqual(run, before);
  }
  chooseUpgrade(run, 'pierce', 'bolt');
  assert.deepEqual(run.links, { bolt: { pierce: 1 } });
  assert.equal(run.upgrades.pierce, undefined);
  assert.equal(game.skillStats(run,'bolt').pierce, 1);
  assert.deepEqual(game.skillStats(run,'minion'), beforeMinion);
  assert.equal(run.phase, 'playing');
});

test('links cap at two distinct supports per skill and rank three; unavailable links are not offered', () => {
  assert.equal(typeof game.supportTargets, 'function');
  const run = withSkills({ bolt: 1 });
  choose(run, 'pierce','bolt'); choose(run,'area','bolt');
  assert.deepEqual(game.supportTargets(run,'infused'), []);
  for (let i = 0; i < 2; i++) choose(run,'pierce','bolt');
  assert.equal(run.links.bolt.pierce,3);
  run.phase = 'upgrade'; run.offered=['pierce'];
  const before = structuredClone(run); chooseUpgrade(run,'pierce','bolt'); assert.deepEqual(run,before);
  run.phase='playing'; run.xp=100; tick(run,.05);
  for (const id of run.offered.filter(id => UPGRADES[id].type === 'support')) assert.ok(game.supportTargets(run,id).length);
});

test('all eight source-backed supports have meaningful normalized skill modifiers', () => {
  assert.equal(typeof game.skillStats, 'function');
  for (const [id, skill, property, expected] of [
    ['burning','nova','damage',1.3], ['minion_damage','minion','damage',1.3],
    ['area','nova','area',1.2], ['pierce','minion','pierce',1],
    ['volley','lightning','projectiles',5], ['unleash','orbit','projectiles',4],
    ['critical','lightning','critMultiplier',1.9], ['infused','bolt','damage',1.15],
  ]) {
    const run = withSkills({ [skill]: 1 });
    const before = game.skillStats(run,skill);
    choose(run,id,skill);
    const after = game.skillStats(run,skill);
    if (property === 'damage' || property === 'area') assert.ok(Math.abs(after[property] / before[property] - expected) < 1e-8, id);
    else assert.equal(after[property],expected,id);
    assert.ok(UPGRADES[id].description.length > 30);
    assert.equal(UPGRADES[id].type,'support');
  }
});

test('Greater Volley fires five actual kinetic projectiles with less damage', () => {
  const run=withSkills({lightning:1});
  run.enemies=[target(900,300)];
  choose(run,'volley','lightning'); tick(run,.05);
  assert.equal(run.projectiles.length,5);
  assert.ok(run.projectiles.every(p => p.element === 'kinetic'));
  assert.equal(run.projectiles[0].damage,24*1.25*.85);
  assert.equal(stats(run).kineticCount,5);
  assert.ok(run.effects.some(e => e.kind === 'kinetic'));
});

test('RF is a persistent short-radius aura with quarter-second ticks and nonlethal self drain', () => {
  const run=withSkills({nova:1});
  run._bonuses.maxHp=120; run.player.maxHp=240; run.player.hp=50;
  const near=target(901,60), far=target(902,180); run.enemies=[near,far];
  tick(run,.05); const hit=near.hp;
  assert.ok(hit < 1000);
  advance(run,.15); assert.equal(near.hp,hit);
  advance(run,.1); assert.ok(near.hp < hit);
  assert.equal(far.hp,1000);
  assert.ok(Math.abs(run.player.hp - (50-(240*.0025-.3)*.3)) < 1e-8);
  run.player.hp=1; advance(run,.5); assert.ok(run.player.hp>=1&&run.player.hp<1.02);
  run.enemies=[target(903,0)]; run.player.invulnerable=0; tick(run,.05); assert.equal(run.phase,'dead');
});

test('cold hit chills enemy movement by 25% and wears off', () => {
  const run=withSkills({}); const foe=target(904,100,{speed:100}); run.enemies=[foe];
  run.projectiles=[{id:905,x:100,y:0,vx:0,vy:0,radius:5,life:2,damage:1,pierce:0,hitIds:[],element:'cold'}];
  tick(run,.05); assert.ok(foe.chill > 0);
  const x=foe.x; tick(run,.05); assert.ok(Math.abs(x-foe.x-3.75)<1e-8);
  foe.x=500; advance(run,1.1); assert.equal(foe.chill,0);
  const restored=foe.x; tick(run,.05); assert.ok(Math.abs(restored-foe.x-5)<1e-8);
});

test('spectres follow the player, fire spectral attacks and remain bounded to three', () => {
  const run=withSkills({minion:6}); run.enemies=[target(906,250)];
  tick(run,.05);
  assert.ok(Array.isArray(run.minions)); assert.equal(run.minions.length,3); assert.equal(stats(run).minionCount,3);
  assert.ok(run.minions.every(m=>Number.isFinite(m.id)&&Number.isFinite(m.shotTimer)));
  assert.equal(run.projectiles.filter(p=>p.element==='spectral').length,3);
  const before=run.minions.map(m=>m.x); advance(run,.1,{x:1,y:0});
  assert.ok(run.minions.some((m,i)=>m.x!==before[i]));
  advance(run,1); assert.ok(run.enemies[0].hp<1000); assert.equal(run.minions.length,3);
});

test('item rolls are seeded and valid; five source-backed uniques expose their rolled modifiers', () => {
  assert.equal(typeof game.rollItem,'function');
  const a=createRun({seed:51}),b=createRun({seed:51});
  const allowed=new Set(['damage','cooldown','speed','maxHp','regen','pickup','projectiles','area','damageReduction']);
  const uniques=new Set();
  for(let i=0;i<100;i++) {
    const rarity=['magic','rare','unique'][i%3];
    const item=game.rollItem(a,rarity); assert.deepEqual(item,game.rollItem(b,rarity));
    assert.equal(item.rarity,rarity); assert.ok(['weapon','body','flask','belt','ring'].includes(item.slot));
    assert.ok(item.id && item.name && item.icon && item.description && item.color);
    for(const [key,value] of Object.entries(item.mods)) { if(rarity!=='unique')assert.ok(allowed.has(key)); assert.ok(Number.isFinite(value)&&value>0); }
    if(rarity!=='unique') assert.ok(Object.keys(item.mods).length>=1&&Object.keys(item.mods).length<=3);
    else { uniques.add(item.name); assert.ok(item.sourceStats.length>=3);assert.ok(item.requiredLevel>1); }
  }
  assert.deepEqual([...uniques].sort(),['Cloak of Flame','Death Rush','Dying Sun','Headhunter','Nebulis']);
});

test('loot pickup freezes simulation and equipment decisions are atomic and idempotent', () => {
  assert.equal(typeof game.equipLoot,'function');
  const run=withSkills({}); const item={id:950,name:'Life body',slot:'body',rarity:'rare',mods:{maxHp:40,speed:.1},description:'x'};
  run.player.hp=30; run.loot=[{x:0,y:0,item}]; run.xp=8;
  tick(run,.05); assert.equal(run.phase,'loot'); assert.equal(run.pendingItem,item); assert.equal(run.loot.length,0);
  assert.equal(run.level,1,'banked level waits for item decision');
  const frozen=structuredClone(run); tick(run,.05,{x:1,y:1}); game.setPaused(run,true); game.setPaused(run,false); assert.deepEqual(run,frozen);
  game.equipLoot(run); assert.equal(run.equipment.body,item); assert.equal(run.pendingItem,null); assert.equal(run.player.maxHp,160);
  assert.ok(run.player.hp>=70&&run.player.hp<70.1); assert.ok(Math.abs(run.player.speed-247.5)<1e-8); assert.equal(run.phase,'upgrade');
  const decided=structuredClone(run); game.equipLoot(run); assert.deepEqual(run,decided);
  run.phase='loot'; run.pendingItem={...item,id:951,mods:{maxHp:10}}; run.player.hp=150;
  game.equipLoot(run); assert.equal(run.player.maxHp,130); assert.equal(run.player.hp,130);
  run.phase='loot'; run.pendingItem={...item,id:952,mods:{maxHp:90}};
  const equipment=structuredClone(run.equipment); game.equipLoot(run,false); assert.deepEqual(run.equipment,equipment); assert.equal(run.pendingItem,null);
});

test('equipment damage, cooldown, projectile, area, defense and regen mods affect combat stats', () => {
  const run=withSkills({bolt:1,nova:1,lightning:1,minion:1});
  run.equipment={ weapon:{mods:{damage:.2,cooldown:.1}}, body:{mods:{maxHp:30,regen:1,damageReduction:.15}},flask:{mods:{projectiles:1,area:.2,pickup:20,speed:.1}} };
  assert.ok(Math.abs(stats(run).damage-28.8)<1e-8); assert.equal(stats(run).cooldown,.9); assert.equal(stats(run).maxHp,150);
  assert.equal(stats(run).regen,1.3); assert.equal(stats(run).pickup,120); assert.equal(stats(run).damageReduction,.15);
  assert.equal(game.skillStats(run,'bolt').projectiles,2); assert.equal(stats(run).kineticCount,4); assert.equal(stats(run).fireRadius,108);
  run.upgrades={}; run.enemies=[target(970,0)]; tick(run,.05);
  assert.ok(run.player.hp>111.5&&run.player.hp<111.6);
});

test('first elite appears around 35s; each death rewards one item and the next elite is 60s later', () => {
  const run=withSkills({}); run.time=34.96; tick(run,.05);
  const elite=run.enemies.find(e=>e.elite); assert.ok(elite); assert.ok(elite.hp>20);
  elite.x=300; elite.hp=0; tick(run,.05); assert.equal(run.loot.length,1); assert.equal(run.kills,1);
  tick(run,.05); assert.equal(run.loot.length,1); assert.equal(run.kills,1);
  run.time=94.96; tick(run,.05); assert.equal(run.enemies.filter(e=>e.elite).length,1);
});

test('long run handles support and loot decisions without exceeding object limits', () => {
  const run=createRun({seed:88,bonuses:{regen:100,maxHp:10000}});
  let supportDecisions=0,lootDecisions=0;
  for(let i=0;i<10500;i++) {
    if(run.phase==='upgrade') {
      const id=run.offered.find(id=>UPGRADES[id].type==='support')||run.offered[0];
      if(UPGRADES[id].type==='support') supportDecisions++;
      chooseUpgrade(run,id,game.supportTargets(run,id)[0]);
    }
    if(run.phase==='loot') { lootDecisions++; game.equipLoot(run,i%2===0); }
    const destination=run.loot[0]||run.gems.toSorted((a,b)=>Math.hypot(a.x-run.player.x,a.y-run.player.y)-Math.hypot(b.x-run.player.x,b.y-run.player.y))[0];
    const dx=destination?destination.x-run.player.x:Math.cos(i/250),dy=destination?destination.y-run.player.y:Math.sin(i/250);
    const length=Math.hypot(dx,dy)||1;
    tick(run,.05,{x:dx/length,y:dy/length});
    assert.ok(Array.isArray(run.minions)); assert.ok(Array.isArray(run.loot)); assert.ok(run.minions.length<=3); assert.ok(run.loot.length<=12); assert.ok(run.projectiles.length<=500); assert.ok(run.enemies.filter(e=>e.kind!=='boss').length<=180);
  }
  assert.ok(run.time>=480); assert.notEqual(run.phase,'dead');
  assert.ok(supportDecisions>0); assert.ok(lootDecisions>0);
});

test('Burning Damage and Minion Damage increase actual hits only from the linked skill', () => {
  for (const [support,skill,x,seconds] of [['burning','nova',60,.05],['minion_damage','minion',220,.7]]) {
    const plain=withSkills({[skill]:1}),linked=withSkills({[skill]:1});
    plain.enemies=[target(990,x)]; linked.enemies=[target(990,x)];
    choose(linked,support,skill); advance(plain,seconds); advance(linked,seconds);
    const base=1000-plain.enemies[0].hp,boost=1000-linked.enemies[0].hp;
    assert.ok(base>0,support); assert.ok(Math.abs(boost/base-1.3)<1e-8,support);
  }
});

test('Pierce carries a spectral projectile through the first target into the second', () => {
  const run=withSkills({minion:1}); choose(run,'pierce','minion');
  run.enemies=[target(991,200),target(992,300)]; advance(run,.85);
  assert.ok(run.enemies[0].hp<1000); assert.ok(run.enemies[1].hp<1000);
});

test('Unleash extra orbiting blade and Area enlarged orbit change actual contacts', () => {
  for (const [support,point] of [['unleash',{x:0,y:64}],['area',{x:100,y:0}]]) {
    const plain=withSkills({orbit:1}),linked=withSkills({orbit:1});
    plain.enemies=[target(993,point.x,{y:point.y})]; linked.enemies=[target(993,point.x,{y:point.y})];
    choose(linked,support,'orbit'); tick(plain,.05); tick(linked,.05);
    assert.equal(plain.enemies[0].hp,1000,support); assert.ok(linked.enemies[0].hp<1000,support);
  }
});

test('Infused stationary focus shortens actual orb fire interval and breaks immediately on movement', () => {
  const run=withSkills({bolt:1}); choose(run,'infused','bolt');
  advance(run,.55); run.enemies=[target(994,400)]; tick(run,.05);
  assert.ok(Math.abs(run._weaponTimers.bolt-.54)<1e-8);
  assert.ok(Math.abs(game.skillStats(run,'bolt').cooldown-.54)<1e-8);
  tick(run,.05,{x:1,y:0}); assert.equal(game.skillStats(run,'bolt').cooldown,.6);
});

test('critical hit decisions use seed and apply the linked multiplier at kinetic impact', () => {
  const impacts=()=>{
    const run=withSkills({lightning:1}); run._rng=1972; choose(run,'critical','lightning');
    const enemy=target(995,400);run.enemies=[enemy];const damage=[];
    for(let i=0;i<100;i++){const hp=enemy.hp;tick(run,.05);if(enemy.hp<hp)damage.push(hp-enemy.hp);}
    return damage;
  };
  const damage=impacts();
  assert.ok(damage.includes(30*1.9));assert.ok(damage.includes(30));
  assert.ok(damage.every(d=>d===30||d===30*1.9));
  assert.deepEqual(impacts(),damage);
});

test('Nebulis only scales elemental damage above actual75 resistance, leaving physical and minions alone', () => {
  assert.equal(typeof game.rollItem,'function');
  const run=withSkills({bolt:1,nova:1,orbit:1,lightning:1,minion:1});
  const before=Object.fromEntries(Object.keys(run.upgrades).map(id=>[id,game.skillStats(run,id).damage]));
  let item; for(let i=0;i<30&&!item;i++) { const candidate=game.rollItem(run,'unique'); if(candidate.name==='Nebulis') item=candidate; }
  assert.ok(item); run.equipment.weapon=item;
  for(const id of ['bolt','nova']) assert.equal(game.skillStats(run,id).damage,before[id]);
  run.equipment.body={mods:{fireResistance:1,maxFireResistance:.15}};
  for(const id of ['bolt','nova']) assert.ok(Math.abs(game.skillStats(run,id).damage/before[id]-(1+15*item.mods.elementalPerResistance))<1e-8,id);
  for(const id of ['orbit','lightning','minion']) assert.equal(game.skillStats(run,id).damage,before[id],id);
  assert.match(item.description,/Стихий/);
});

const shot = (overrides = {}) => ({ id: 2000, x: 0, y: 0, vx: 500, vy: 0, radius: 5, life: 1, damage: 10, pierce: 0, hitIds: [], ...overrides });

test('nonpiercing projectile hits the first physical intersection regardless of enemy array order', () => {
  for (const reverse of [false, true]) {
    const run=withSkills({});
    const front=target(2001,20),back=target(2002,40);
    run.enemies=reverse?[front,back]:[back,front]; run.projectiles=[shot()];
    tick(run,.05);
    assert.equal(front.hp,990); assert.equal(back.hp,1000); assert.equal(run.projectiles.length,0);
  }
});

test('pierce consumes targets in physical order and preserves the unhit rear target', () => {
  for (const order of [[0,1,2],[2,1,0],[1,2,0]]) {
    const run=withSkills({});
    const enemies=[target(2003,20),target(2004,40),target(2005,60)];
    run.enemies=order.map(index=>enemies[index]); run.projectiles=[shot({vx:1000,pierce:1})];
    tick(run,.05);
    assert.deepEqual(enemies.map(enemy=>enemy.hp),[990,990,1000]);
    assert.equal(run.projectiles.length,0);
  }
});

test('first intersection uses hitbox entry rather than sorting enemy centers', () => {
  const run=withSkills({});
  const small=target(2006,25,{radius:1}),large=target(2007,40,{radius:30});
  run.enemies=[small,large]; run.projectiles=[shot()]; tick(run,.05);
  assert.equal(large.hp,990); assert.equal(small.hp,1000);
});

test('last partial projectile lifetime still deals damage and agrees with split frames', () => {
  for (const steps of [[.05],[.01,.04]]) {
    const run=withSkills({}); const foe=target(2008,20);
    run.enemies=[foe]; run.projectiles=[shot({life:.04})];
    for (const dt of steps) tick(run,dt);
    assert.equal(foe.hp,990); assert.equal(run.projectiles.length,0);
  }
});

test('expired projectile travel stops at its lifetime and cannot hit a target farther down the frame', () => {
  const run=withSkills({}); const foe=target(2009,38);
  run.enemies=[foe]; run.projectiles=[shot({life:.04})]; tick(run,.05);
  assert.equal(foe.hp,1000); assert.equal(run.projectiles.length,0);
});

test('hostile projectile also hits during its final partial lifetime', () => {
  const run=withSkills({}); run.player.x=20;
  run.projectiles=[shot({hostile:true,life:.04})]; tick(run,.05);
  assert.ok(Math.abs(run.player.hp-110.015)<1e-8); assert.equal(run.projectiles.length,0);
});

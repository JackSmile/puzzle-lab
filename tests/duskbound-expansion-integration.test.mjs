import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,tick,equipLoot,makeUnique,stats,rollItem} from '../games/duskbound/core.mjs';
import {spawnPoeEnemy,startBossEncounter,BOSS_SCHEDULE} from '../games/duskbound/encounters.mjs';
import {classHit,classEnemyChill,classEnemySpeed,classIncomingDamage} from '../games/duskbound/classes.mjs';

function run(){const r=createRun({classId:'witch',seed:41});r.upgrades={};r._spawnTimer=Infinity;r._nextElite=Infinity;r.classState.trialsCompleted=4;r.player.maxHp=r.player.hp=10000;return r;}
function step(r,n=1,input){for(let i=0;i<n;i++)tick(r,.05,input);return r;}
function equip(r,id){r.phase='loot';r.pendingItem=makeUnique(id,r._nextId++,()=>.5);equipLoot(r);r.phase='playing';r.player.maxHp=r.player.hp=10000;}
function boss(r,id){const e=startBossEncounter(r,id,{x:300,y:0});e.telegraph=0;e.shotTimer=Infinity;return e;}
function shot(r,target,damage=100,context={}){r.projectiles.push({id:r._nextId++,x:target.x,y:target.y,vx:0,vy:0,radius:1,life:1,damage,hitIds:[],context:{type:'physical',critChance:0,random:()=>.5,...context}});}
function shield(r){const e=spawnPoeEnemy(r,'evangelist',{x:0,y:0});e.shotTimer=Infinity;e.shieldUntil=100;e.shieldRadius=110;return e;}

test('class construction initializes clean encounter state and class waves; legacy retains old waves',()=>{
 const a=createRun({classId:'witch'}),b=createRun({classId:'witch'});assert.deepEqual(a.encounters.defeatedBosses,[]);assert.deepEqual(a.hazards,[]);assert.notEqual(a.encounters,b.encounters);assert.ok(Object.values(a.equipment).every(x=>x===null));a.upgrades={};a._spawnTimer=0;step(a);assert.equal(a.enemies[0].poeKind,'drowned');
 const legacy=createRun();legacy._spawnTimer=0;step(legacy);assert.equal(legacy.encounters,undefined);assert.equal(legacy.enemies[0].kind,'skull');assert.equal(legacy.enemies[0].poeKind,undefined);
});
test('new AI moves exactly once, while manually inserted old fixtures still move',()=>{const r=run(),e=spawnPoeEnemy(r,'drowned',{x:500,y:0});e.shotTimer=Infinity;r.enemies.push({id:999,kind:'skull',x:600,y:0,hp:100,maxHp:100,speed:100,radius:13,shotTimer:Infinity});step(r);assert.equal(e.x,497.25);assert.equal(r.enemies[1].x,595);});
test('overdue schedule waits for actual death, drops one actual unique per boss, wins only after all four',()=>{
 const r=run();r.time=481;step(r);assert.equal(r.encounters.activeBossId,'brutus');assert.deepEqual(r.encounters.queue,['merveil','dominus','kitava']);
 for(const {id} of BOSS_SCHEDULE){const e=r.enemies.find(e=>e.bossId===id);assert.ok(e);assert.equal(r.phase,'playing');e.elite=true;e.hp=0;step(r);assert.equal(r.loot.length,r.encounters.defeatedBosses.length);assert.equal(r.loot.at(-1).item.rarity,'unique');assert.ok(r.loot.at(-1).item.name&&r.loot.at(-1).item.mods);if(id!=='kitava')step(r);}
 assert.equal(r.phase,'won');assert.deepEqual(r.encounters.defeatedBosses,BOSS_SCHEDULE.map(b=>b.id));const rewards=r.loot.length;step(r);assert.equal(r.loot.length,rewards);
});
test('legacy single-boss victory survives while class bossDefeated flag alone cannot win',()=>{const legacy=createRun();legacy.time=480;legacy.bossSpawned=legacy.bossDefeated=true;step(legacy);assert.equal(legacy.phase,'won');const r=run();r.time=480;r.bossDefeated=true;step(r);assert.equal(r.phase,'playing');});
for(const id of ['merveil','dominus','kitava'])for(const dot of [false,true])test(`${id} lethal ${dot?'DoT':'projectile'} stops at half until transition`,()=>{const r=run(),e=boss(r,id);if(dot){e.bleedDps=1e8;e.bleedUntil=10;e.bleedActor={kind:'player',ownerId:'player'};}else shot(r,e,1e8);step(r);assert.equal(e.hp,e.maxHp/2);assert.ok(r.enemies.includes(e));if(dot)e.bleedUntil=0;step(r);assert.equal(e.phase,id==='kitava'?'heart':2);});
test('reflect cannot bypass Kitava threshold or heart invulnerability',()=>{const r=run();r.equipment.body={slot:'body',mods:{reflectFire:1e8}};const e=boss(r,'kitava');classIncomingDamage(r,10,{enemy:e,spell:false,melee:true,random:()=>1});assert.equal(e.hp,e.maxHp/2);step(r);assert.equal(e.phase,'heart');classIncomingDamage(r,10,{enemy:e,spell:false,melee:true,random:()=>1});assert.equal(e.hp,e.maxHp/2);});
test('heart redirects player and ally targeting, gets no kill/XP/corpse/loot reward, resumes body',()=>{const r=run(),e=boss(r,'kitava');e.hp=e.maxHp/2;step(r);const h=r.enemies.find(e=>e.kind==='heart');assert.ok(h);r.enemies=[e,h];r.player.x=e.x-5;r.upgrades={bolt:1};r._weaponTimers.bolt=0;step(r);assert.ok(r.projectiles.some(p=>Math.abs(p.vy)>0));r.projectiles=[];r.upgrades={};shot(r,e,99999);step(r);assert.equal(e.hp,e.maxHp/2);const before={kills:r.kills,gems:r.gems.length,loot:r.loot.length,corpses:r.corpses.length};h.hp=0;step(r);assert.equal(e.phase,2);assert.deepEqual({kills:r.kills,gems:r.gems.length,loot:r.loot.length,corpses:r.corpses.length},before);assert.ok(!r.enemies.includes(h));});
for(const [kind,liveX,originX,remove,blocked] of [['player',200,0,false,true],['player',0,200,false,false],['minion',0,200,false,false],['totem',200,0,false,true],['proxy',0,200,false,false],['minion',0,200,true,true]])test(`shield source ${kind} live=${liveX} fallback=${remove}`,()=>{const r=run();shield(r);r.player.x=200;const e=spawnPoeEnemy(r,'drowned',{x:20,y:0});e.shotTimer=Infinity;const actor={kind,id:800,ownerId:'player'};if(kind==='minion'&&!remove)r.upgrades={minion:1};if(kind==='player')r.player.x=liveX;else if(!remove)r[kind==='minion'?'minions':'totems'].push({id:800,kind,x:liveX,y:0,hp:100,maxHp:100,life:10,shotTimer:Infinity});shot(r,e,100,{actor,origin:{x:originX,y:0}});const hp=e.hp;step(r);assert.equal(e.hp===hp,blocked);});
test('shield zero hit keeps curse/critical events and pierce but no cold ailment, impale or leech',()=>{const r=run();shield(r);equip(r,'asenaths-gentle-touch');equip(r,'terminus-est');r.player.x=200;const e=spawnPoeEnemy(r,'drowned',{x:20,y:0});e.shotTimer=Infinity;shot(r,e,100,{type:'cold',critical:true,isAttack:true,actor:{kind:'player',ownerId:'player'},origin:{x:200,y:0}});const p=r.projectiles.at(-1);p.element='cold';p.pierce=1;const hp=e.hp;step(r);assert.equal(e.hp,hp);assert.ok(e.temporalChains);assert.equal(r.classState.combat.frenzy,1);assert.equal(e.chill||0,0);assert.equal(r.classState.combat.leech.length,0);assert.ok(p.hitIds.includes(e.id));assert.equal(p.pierce,0);});
test('shield permits DoT from outside',()=>{const r=run();shield(r);r.player.x=200;const e=spawnPoeEnemy(r,'drowned',{x:20,y:0});e.shotTimer=Infinity;e.bleedDps=100;e.bleedUntil=10;e.bleedActor={kind:'player',ownerId:'player'};const hp=e.hp;step(r);assert.equal(e.hp,hp-5);});
test('Temporal Chains chill clock reaches new AI once and preserves boundary overlap',()=>{const r=run(),e=spawnPoeEnemy(r,'drowned',{x:500,y:0});e.chill=.06;e.chillEffect=.25;e.temporalChains={until:.04,appliedAt:0,effect:1,actor:{kind:'player',ownerId:'player'}};const expected=classEnemyChill({...r,time:.05},e,.05);step(r);assert.ok(Math.abs(e.chill-expected)<1e-12);assert.ok(e.chill>0);assert.ok(Math.abs(e.x-(500-55*.75*.05))<1e-10);});
test('Ice Storm marker slows through class action speed, expires, respects chill immunity',()=>{const r=run();const base=stats(r).speed;r.player.chillUntil=1;assert.equal(stats(r).speed,base*.75);step(r,1,{x:1,y:0});assert.equal(r.player.x,base*.75*.05);r.time=1;assert.equal(stats(r).speed,base);r.player.chillUntil=2;r.classState.allocatedTreeNodeIds.push('47630');assert.equal(stats(r).speed,base);});
for(const immune of [false,true])test(`real Rain CB callback ${immune?'Ralakesh immunity':'one class-owned stack clock'}`,()=>{const r=run();if(immune)equip(r,'ralakeshs-impatience');const e=boss(r,'dominus');e.hp=e.maxHp/2;step(r);r.player.x=e.x+240;e.shotTimer=0;step(r,40);assert.equal(r.player.corruptedBlood,undefined);if(immune)assert.equal(r.player.ailments.corruptedBlood,undefined);else assert.ok(r.player.ailments.corruptedBlood?.stacks>0);});
test('pause phases freeze all model clocks; fresh run resets; death takes victory precedence',()=>{const r=run();boss(r,'brutus');for(const phase of ['paused','upgrade','loot','ascendancy']){r.phase=phase;const before=JSON.stringify(r);step(r,20);assert.equal(JSON.stringify(r),before);}const fresh=createRun({classId:'witch'});assert.equal(fresh.time,0);assert.deepEqual(fresh.encounters.defeatedBosses,[]);assert.deepEqual(fresh.hazards,[]);r.phase='playing';r.time=481;r.encounters.defeatedBosses=BOSS_SCHEDULE.map(b=>b.id);r.player.hp=0;step(r);assert.equal(r.phase,'dead');});

for(const kind of ['minion','totem','mercenary','sentinel'])test(`${kind} selects exposed heart instead of closer invulnerable body`,()=>{
 const r=run(),b=boss(r,'kitava');b.hp=b.maxHp/2;step(r);const h=r.enemies.find(e=>e.kind==='heart');r.enemies=[b,h];r.player.x=b.x-60;
 const a={id:900,kind,x:b.x-20,y:b.y,hp:150,maxHp:150,life:10,shotTimer:0,equipment:{},recoup:[]};
 if(kind==='minion'){r.minions=[a];r.upgrades={minion:1};}else if(kind==='totem')r.totems=[a];else r[kind]=a;
 const hp=b.hp;step(r,10);assert.equal(b.hp,hp);assert.ok(h.hp<h.maxHp||r.projectiles.some(p=>p.context?.actor?.id===a.id&&p.vy>0));
});
for(const weapon of ['orbit','nova'])test(`${weapon} excludes invulnerable body but damages exposed heart`,()=>{
 const r=run(),b=boss(r,'kitava');b.hp=b.maxHp/2;step(r);const h=r.enemies.find(e=>e.kind==='heart');r.enemies=[b,h];r.player.x=b.x;r.player.y=b.y+50;r.upgrades={[weapon]:6};const hp=b.hp;step(r,10);assert.equal(b.hp,hp);assert.ok(h.hp<h.maxHp);
});
test('actual friendly projectile captures fallback source coordinates and actor without sharing metadata',()=>{
 const r=run();r.upgrades={bolt:1};r.player.x=200;const e=spawnPoeEnemy(r,'drowned',{x:0,y:-24});e.shotTimer=Infinity;step(r);const p=r.projectiles[0];assert.deepEqual(p.context.origin,{x:200,y:-24});assert.equal(p.context.actor.kind,'player');r.player.x=0;shield(r);const hp=e.hp;step(r,10);assert.ok(e.hp<hp,'live player has entered bubble since cast');
});
for(const inside of [false,true])test(`secondary explosion uses ${inside?'inside':'outside'} center independently from player location`,()=>{
 const r=run();equip(r,'inpulsas-broken-heart');shield(r);r.player.x=inside?300:0;
 const dead=spawnPoeEnemy(r,'drowned',{x:inside?70:130,y:0}),target=spawnPoeEnemy(r,'drowned',{x:80,y:0});dead.hp=0;dead.maxHp=1000;dead.shockUntil=100;dead.killActor={kind:'player',ownerId:'player'};target.shotTimer=Infinity;const hp=target.hp;step(r);assert.equal(target.hp===hp,!inside);
});
function hostile(r,context,damage=20){r.projectiles.push({id:r._nextId++,hostile:true,x:r.player.x,y:r.player.y,vx:0,vy:0,radius:2,life:1,damage,context});}
for(const spell of [false,true])test(`hostile ${spell?'spell':'attack'} projectile honors explicit block channel and non-melee reflect`,()=>{
 const r=run();r.equipment.shield={mods:{block:.75,spellBlock:0}};r.equipment.body={mods:{reflectFire:100}};const e=spawnPoeEnemy(r,'ancientArcher',{x:500,y:0});e.shotTimer=Infinity;const hp=r.player.hp,enemyHp=e.hp;hostile(r,{enemyId:e.id,type:'physical',spell,isAttack:!spell,melee:false,area:false,random:()=>.1});step(r);assert.equal(r.player.hp<hp,spell);assert.equal(e.hp,enemyHp);
});
test('mixed hostile projectile uses shared avoidance and one ES/MoM spend with both typed components',()=>{
 const r=run();r.classState.allocatedTreeNodeIds.push('922');r.equipment.body={mods:{energyShield:5,coldResistance:.5}};r.player.energyShield=r.player.maxEnergyShield=5;r.player.mana=100;r.player.maxMana=100;let rolls=0;const hp=r.player.hp,mana=r.player.mana;
 hostile(r,{type:'physical',components:{physical:10,cold:10},spell:true,isAttack:false,area:false,melee:false,random:()=>{rolls++;return 1;}});step(r);
 assert.equal(rolls,2,'one block and one elusive roll for the whole mixed hit');assert.equal(r.player.energyShield,0);assert.ok(Math.abs(r.player.hp-(hp-9+.3*.05))<1e-8);assert.ok(Math.abs(r.player.mana-(mana-1+100*.018*.05))<1e-8);
});
test('real Ice Storm hazard sets slow and immunity follows the existing class rule',()=>{
 const r=run(),b=boss(r,'merveil');b.x=0;b.attackCycle=1;b.shotTimer=0;r.player.x=0;r.player.invulnerable=100;step(r,32);assert.ok(r.player.chillUntil>r.time);assert.equal(stats(r).speed,225*.75);r.hazards=[];b.shotTimer=Infinity;b.action=null;step(r,25);assert.equal(stats(r).speed,225);
});
test('CB completed damage ticks cannot refresh stacks or create fallback state',()=>{
 const r=run(),b=boss(r,'dominus');b.hp=b.maxHp/2;step(r);r.player.x=b.x+240;b.shotTimer=0;step(r,31);const blood=r.player.ailments.corruptedBlood;assert.ok(blood);r.hazards=[];b.action=null;b.shotTimer=Infinity;const stacks=blood.stacks,until=blood.until,hp=r.player.hp;step(r,10);assert.equal(blood.stacks,stacks);assert.equal(blood.until,until);assert.equal(r.player.corruptedBlood,undefined);assert.ok(r.player.hp<hp);
});
test('class regulars, daughters, hazard/projectile/effect/corpse queues remain bounded and real reap removes dead',()=>{
 const r=run();r.time=230;r._spawnTimer=0;r._nextElite=0;for(let i=0;i<180;i++){const e=spawnPoeEnemy(r,i<80?'evangelist':i<90?'carrionQueen':'drowned',{x:80,y:0});e.shotTimer=0;}assert.equal(spawnPoeEnemy(r,'carrionMinion',{x:0,y:0}),null);
 for(let i=0;i<700;i++)r.projectiles.push({id:1000+i,x:2000,y:0,vx:0,vy:0,radius:1,life:10,damage:1,hitIds:[],context:{}});
 for(let i=0;i<300;i++)r.effects.push({kind:'hit',x:0,y:0,life:10});step(r,40);assert.ok(r.enemies.filter(e=>e.hp>0&&e.kind!=='boss'&&e.kind!=='heart').length<=180);assert.ok(r.hazards.length<=64);assert.ok(r.projectiles.length<=500);assert.ok(r.effects.length<=250);assert.ok(r.enemies.some(e=>e.elite&&e.rareMods?.length===2));
 r.upgrades={};r.enemies.forEach(e=>{if(e.kind!=='boss')e.hp=0;});step(r);assert.ok(r.enemies.every(e=>e.hp>0));assert.ok(r.corpses.length<=180);
});
test('all four scheduled bosses can be killed through real projectile phases and separate heart before victory',()=>{
 const r=run();r.time=481;step(r);
 for(const {id} of BOSS_SCHEDULE){const b=r.enemies.find(e=>e.bossId===id&&e.kind==='boss');assert.ok(b);b.telegraph=0;b.shotTimer=Infinity;r.enemies=[b];shot(r,b,1e8);step(r);
  if(id!=='brutus'){assert.equal(b.hp,b.maxHp/2);step(r);if(id==='kitava'){const heart=r.enemies.find(e=>e.kind==='heart');assert.ok(heart);r.enemies=[b,heart];shot(r,heart,1e8);step(r);assert.equal(b.phase,2);assert.equal(r.encounters.defeatedBosses.includes('kitava'),false);}shot(r,b,1e8);step(r);}
  assert.ok(r.encounters.defeatedBosses.includes(id));if(id!=='kitava'){assert.equal(r.phase,'playing');step(r);}
 }
 assert.equal(r.phase,'won');assert.equal(r.loot.length,4);
});
test('real minion projectile retains launch origin after source removal',()=>{
 const r=run();r.player.x=200;r.upgrades={minion:1};const target=spawnPoeEnemy(r,'drowned',{x:0,y:0});target.shotTimer=Infinity;r.minions=[{id:500,kind:'minion',ownerId:'player',x:200,y:0,hp:80,maxHp:80,shotTimer:0}];step(r);const p=r.projectiles.find(p=>p.context?.actor?.id===500);assert.ok(p);assert.ok(p.context.origin.x>110);shield(r);r.upgrades={};const hp=target.hp;step(r,15);assert.equal(r.minions.length,0);assert.equal(target.hp,hp);assert.ok(p.hitIds.includes(target.id));
});
test('projectile splash and chain ignore invulnerable body but windups remain targetable',()=>{
 const r=run(),b=boss(r,'kitava');b.hp=b.maxHp/2;step(r);const h=r.enemies.find(e=>e.kind==='heart');r.enemies=[b,h];const e=spawnPoeEnemy(r,'drowned',{x:b.x+10,y:b.y+60});e.action={kind:'meleeWindup',phase:'windup',until:100,targetX:0,targetY:0};e.shotTimer=Infinity;const hp=b.hp;shot(r,e,1000);const p=r.projectiles.at(-1);p.splashRadius=150;p.chain=1;p.vx=1;step(r);assert.equal(e.hp<=0,true);assert.equal(b.hp,hp);assert.ok(h.hp<h.maxHp);assert.equal(p.hitIds.includes(b.id),false);assert.ok(p.vy>0,'chain aims toward exposed heart');
});
test('PoE orbit hit cooldown expires once under new AI so repeated blade passes keep damaging',()=>{const r=run();r.upgrades={orbit:1};const e=spawnPoeEnemy(r,'drowned',{x:64,y:0});e.hp=e.maxHp=1000;e.speed=0;e.shotTimer=Infinity;step(r);const afterFirst=e.hp;assert.ok(afterFirst<1000);step(r,24);assert.ok(e.hp<afterFirst,'orbit wait must decrement for poeKind enemies');});

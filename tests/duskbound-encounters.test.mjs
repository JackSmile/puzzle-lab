import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {classEnemySpeed,classEnemyCooldown} from '../games/duskbound/classes.mjs';
const url=new URL('../games/duskbound/encounters.mjs',import.meta.url);
const engine=existsSync(url)?await import(url):null;
test('standalone encounter model exists',()=>assert.ok(engine,'encounters.mjs must implement the approved roster'));
if(engine){
const {MONSTERS,BOSSES,BOSS_SCHEDULE,initEncounters,spawnPoeEnemy,startBossEncounter,tickEncounters,recordEncounterKill,enemyTargetable,proximityBlocks}=engine;
function fixture(){const run={phase:'playing',time:0,_nextId:1,_rng:7,_spawnTimer:Infinity,_nextElite:Infinity,player:{x:0,y:0,hp:1000,radius:12},enemies:[],minions:[],totems:[],mercenaryMinions:[]};initEncounters(run);return run;}
function apiFor(run){const hits=[],shots=[],effects=[];return {hits,shots,effects,random:()=>.25,damagePlayer:(amount,context)=>hits.push({target:run.player,amount,context}),damageAlly:(target,amount,context)=>hits.push({target,amount,context}),projectile:(origin,target,options)=>shots.push({origin:{...origin},target:{...target},...options}),effect:(...args)=>effects.push(args),enemySpeed:()=>1,enemyCooldown:()=>1};}
function step(run,api,seconds=.05){run.time+=seconds;tickEncounters(run,seconds,api);}
function advance(run,api,seconds){for(let t=0;t<seconds-1e-9;t+=.05)step(run,api,Math.min(.05,seconds-t));}
function spawn(run,kind,x=150,y=0){const e=spawnPoeEnemy(run,kind,{x,y});e.shotTimer=0;return e;}
function boss(run,id){const b=startBossEncounter(run,id,{x:0,y:0});b.telegraph=0;b.shotTimer=0;return b;}

test('catalog exposes eight distinct archetypes and local balance',()=>{assert.equal(Object.keys(MONSTERS).length,8);assert.deepEqual(Object.keys(BOSSES),['brutus','merveil','dominus','kitava']);assert.deepEqual(BOSS_SCHEDULE.map(b=>b.at),[120,240,360,450]);for(const d of Object.values(MONSTERS)){assert.ok(d.name&&d.artKey&&d.hp>0&&d.damage>0);assert.equal(d.balance,'Duskbound');}});
test('all archetypes start distinct targetable actions, never spawn telegraphs',()=>{const actions=[];for(const kind of Object.keys(MONSTERS)){const r=fixture(),a=apiFor(r),e=spawn(r,kind,kind==='drowned'?35:150);step(r,a);assert.equal(e.telegraph,0);assert.ok(enemyTargetable(e));assert.equal(e.kind,kind);assert.equal(e.poeKind,kind);assert.equal(e.action.phase,'windup');actions.push(e.action.kind);}assert.equal(new Set(actions).size,8);});
test('Drowned windup hits in melee once and misses an escaped player',()=>{for(const escape of [false,true]){const r=fixture(),a=apiFor(r);spawn(r,'drowned',35);step(r,a);if(escape)r.player.x=300;advance(r,a,.65);assert.equal(a.hits.length,escape?0:1);if(!escape){assert.equal(a.hits[0].amount,10);assert.equal(a.hits[0].context.spell,false);assert.equal(a.hits[0].context.melee,true);}}});
test('Rhoa locks its line and uses swept collision without repeated damage',()=>{const r=fixture(),a=apiFor(r),e=spawn(r,'rhoa',-150);step(r,a);r.player.y=60;advance(r,a,.8);assert.equal(e.action.targetY,0);r.player.y=0;step(r,a,.5);assert.equal(a.hits.filter(h=>h.context.skill==='rhoaCharge').length,1);step(r,a,.1);assert.equal(a.hits.filter(h=>h.context.skill==='rhoaCharge').length,1);});
test('Rhoa misses a target outside its locked corridor',()=>{const r=fixture(),a=apiFor(r);spawn(r,'rhoa',-150);step(r,a);r.player.y=100;advance(r,a,1.5);assert.equal(a.hits.length,0);});
test('Goatman locks landing, exposes jump arc and uses circle at landing',()=>{const r=fixture(),a=apiFor(r),e=spawn(r,'goatman',180);step(r,a);r.player.x=250;advance(r,a,.9);assert.equal(e.action.kind,'leapSlam');assert.equal(e.action.phase,'airborne');assert.ok(e.jumpHeight>0);advance(r,a,.6);assert.equal(e.x,0);assert.equal(a.hits.length,0);const r2=fixture(),a2=apiFor(r2);spawn(r2,'goatman',180);advance(r2,a2,1.5);assert.equal(a2.hits.length,1);assert.equal(a2.hits[0].context.area,true);});
test('Ancient Archer arrow is physical attack and Sentinel fan is fire spell',()=>{for(const [kind,count,type,spell] of [['ancientArcher',1,'physical',false],['flameSentinel',3,'fire',true]]){const r=fixture(),a=apiFor(r);spawn(r,kind);advance(r,a,1.1);assert.equal(a.shots.length,count);for(const shot of a.shots){assert.equal(shot.context.type,type);assert.equal(shot.context.spell,spell);assert.equal(shot.context.isAttack,!spell);assert.equal(shot.hostile,true);assert.ok(shot.context.enemyId);}}});
test('Evangelist physical spell warns at locked position then damages circle',()=>{const r=fixture(),a=apiFor(r);spawn(r,'evangelist');advance(r,a,.9);const h=r.hazards.find(h=>h.kind==='evangelistBlast');assert.ok(h);assert.equal(h.geometry,'circle');assert.equal(h.x,0);assert.equal(a.hits.length,0);r.player.x=400;advance(r,a,1);assert.equal(a.hits.length,0);});
test('Evangelist bubble protects allies by actual origin, passes DoT and vanishes on death',()=>{const r=fixture(),a=apiFor(r),e=spawn(r,'evangelist',0),ally=spawn(r,'drowned',80);step(r,a);assert.equal(proximityBlocks(r,ally,{x:200,y:0}),true);assert.equal(proximityBlocks(r,ally,{x:30,y:0,kind:'minion'}),false);assert.equal(proximityBlocks(r,ally,{x:200,y:0},{isDot:true}),false);assert.equal(proximityBlocks(r,{...ally,x:200},{x:300,y:0}),false);assert.equal(proximityBlocks(r,ally,{x:200,y:0,actor:{x:25,y:0}}),false);e.hp=0;recordEncounterKill(r,e);assert.equal(proximityBlocks(r,ally,{x:200,y:0}),false);});
test('Carrion Queen spawns nearby capped daughters and alternates physical spit',()=>{const r=fixture(),a=apiFor(r),e=spawn(r,'carrionQueen');advance(r,a,1.2);const adds=r.enemies.filter(x=>x.parentId===e.id);assert.equal(adds.length,3);assert.ok(adds.every(x=>x.poeKind==='carrionMinion'&&Math.hypot(x.x-e.x,x.y-e.y)<=70));advance(r,a,4);assert.ok(a.shots.some(s=>s.context.skill==='carrionSpit'&&s.context.type==='physical'));advance(r,a,14);assert.ok(r.enemies.filter(x=>x.parentId===e.id&&x.hp>0).length<=4);});
test('Tentacle sends two separate three-spine volleys with 50/50 physical/fire components',()=>{const r=fixture(),a=apiFor(r);spawn(r,'tentacleMiscreation');advance(r,a,1.3);assert.equal(a.shots.length,6);for(const s of a.shots){assert.deepEqual(s.context.components,{physical:6,fire:6});assert.equal(s.context.spell,false);assert.equal(s.context.isAttack,true);}});
test('regular cap excludes boss and heart, daughters obey same 180 cap',()=>{const r=fixture();for(let i=0;i<180;i++)assert.ok(spawnPoeEnemy(r,'drowned',{x:0,y:0}));assert.equal(spawnPoeEnemy(r,'carrionMinion',{x:0,y:0}),null);const b=boss(r,'kitava');b.hp=b.maxHp*.49;step(r,apiFor(r));assert.equal(r.enemies.length,182);assert.equal(r.enemies.filter(e=>e.kind==='heart').length,1);});
test('wave timer and elite timer preserve Infinity overrides, elite callback uses real integration hook',()=>{const r=fixture(),a=apiFor(r);advance(r,a,2);assert.equal(r.enemies.length,0);r._spawnTimer=0;r._nextElite=0;const assigned=[];a.assignRareModifiers=e=>{assigned.push(e.id);e.rareModifiers=['fixture'];};step(r,a);assert.ok(r.enemies.length>=2);assert.equal(assigned.length,1);assert.deepEqual(r.enemies.find(e=>e.elite).rareModifiers,['fixture']);});
test('schedule queues overdue bosses singly, survives 480 and rewards each once',()=>{const r=fixture(),a=apiFor(r);r.time=481;tickEncounters(r,.05,a);assert.equal(r.encounters.activeBossId,'brutus');assert.deepEqual(r.encounters.queue,['merveil','dominus','kitava']);assert.equal(r.enemies.filter(e=>e.kind!=='boss').length,0);for(const id of ['brutus','merveil','dominus','kitava']){const e=r.enemies.find(e=>e.bossId===id&&e.kind==='boss');assert.ok(e);e.hp=0;assert.deepEqual(recordEncounterKill(r,e),{boss:true,uniqueReward:true,final:id==='kitava'});assert.deepEqual(recordEncounterKill(r,e),{boss:false,uniqueReward:false,final:false});tickEncounters(r,.05,a);}assert.equal(r.bossDefeated,true);assert.deepEqual(r.encounters.defeatedBosses,['brutus','merveil','dominus','kitava']);assert.equal(r.encounters.activeBossId,null);});
test('boss fixture rejects concurrent boss and duplicate defeated schedule IDs',()=>{const r=fixture(),b=boss(r,'brutus');assert.equal(startBossEncounter(r,'merveil',{x:0,y:0}),null);b.hp=0;recordEncounterKill(r,b);assert.equal(startBossEncounter(r,'brutus',{x:0,y:0}),null);});
test('Brutus chain has locked line, physical pull and distinct three slams plus wave',()=>{const r=fixture(),a=apiFor(r),b=boss(r,'brutus');r.player.x=160;step(r,a);assert.equal(b.action.kind,'chainPull');advance(r,a,1.1);assert.ok(r.player.x<160);assert.ok(a.hits.some(h=>h.context.skill==='chainPull'&&h.context.type==='physical'));advance(r,a,6);const effectKinds=new Set(a.effects.map(e=>e[6]?.skill));assert.equal(a.effects.filter(e=>e[6]?.skill==='brutusSlam').length,3);assert.ok(effectKinds.has('brutusWave'));assert.ok(b.encounterCenter);});
test('Merveil humanoid cold fan/storm changes at half HP to siren geysers and adds',()=>{const r=fixture(),a=apiFor(r),b=boss(r,'merveil');advance(r,a,1);assert.ok(a.shots.some(s=>s.context.type==='cold'));advance(r,a,3.5);assert.ok(a.effects.some(e=>e[6]?.skill==='iceStorm'));b.hp=b.maxHp*.49;b.shotTimer=0;step(r,a);assert.equal(b.phase,2);assert.equal(b.phaseLabel,'The Twisted');advance(r,a,1.5);assert.ok(r.enemies.some(e=>e.summonedBy===b.id));assert.ok(a.effects.some(e=>e[6]?.skill==='coldGeyser'));});
test('Dominus human has lightning souls and mixed Touch, Ascendant rain uses safe zone and distinct Corrupted Blood',()=>{const r=fixture(),a=apiFor(r),b=boss(r,'dominus');advance(r,a,1.1);assert.ok(a.shots.some(s=>s.context.skill==='lightningSouls'&&s.context.type==='lightning'));advance(r,a,3.5);assert.ok(a.hits.every(h=>h.context.skill!=='touchOfGod'||h.context.components.physical>0&&h.context.components.lightning>0));b.hp=b.maxHp*.49;b.shotTimer=0;step(r,a);assert.equal(b.phase,2);r.player.x=240;advance(r,a,2.2);const rain=r.hazards.find(h=>h.kind==='bloodRain');assert.ok(rain&&rain.geometry==='safeZone');assert.ok(r.player.corruptedBlood?.stacks>0);assert.ok(a.hits.some(h=>h.context.ailment==='corruptedBlood'&&h.context.hit===false));r.player.x=b.x;r.player.y=b.y;r.player.corruptedBlood=null;advance(r,a,1);assert.equal(r.player.corruptedBlood,null);assert.equal(r.player.bleedUntil,undefined);});
test('Kitava body is anchored, heart is separate target and death resumes body without reward',()=>{const r=fixture(),a=apiFor(r),b=boss(r,'kitava');r.player.x=500;advance(r,a,1);assert.equal(b.x,0);b.hp=b.maxHp*.49;step(r,a);const heart=r.enemies.find(e=>e.kind==='heart');assert.ok(heart);assert.equal(enemyTargetable(b),false);assert.equal(enemyTargetable(heart),true);assert.equal(b.phase,'heart');assert.ok(heart.cannotBeSlowed);heart.hp=0;assert.deepEqual(recordEncounterKill(r,heart),{boss:false,uniqueReward:false,final:false});assert.equal(b.phase,2);assert.equal(enemyTargetable(b),true);assert.equal(r.encounters.defeatedBosses.length,0);step(r,a);assert.equal(r.enemies.filter(e=>e.kind==='heart').length,1);b.hp=0;assert.equal(recordEncounterKill(r,b).uniqueReward,true);});
test('Kitava swipe and breath expose cone warnings with physical and fire contexts',()=>{const r=fixture(),a=apiFor(r),b=boss(r,'kitava');r.player.x=180;advance(r,a,1.5);assert.ok(a.effects.some(e=>e[6]?.skill==='kitavaSwipe'));advance(r,a,4);assert.ok(a.effects.some(e=>e[6]?.skill==='fireBreath'));assert.ok(a.hits.some(h=>h.context.type==='physical'));assert.ok(a.hits.some(h=>h.context.type==='fire'));});
test('hazard geometry includes allies and deals one hit per pulse; death cancels pending owner attack',()=>{const r=fixture(),a=apiFor(r),e=spawn(r,'evangelist');r.minions.push({id:999,x:0,y:0,hp:100,radius:10});advance(r,a,1.8);assert.equal(a.hits.filter(h=>h.target.id===999).length,1);assert.equal(a.hits.filter(h=>h.target===r.player).length,1);const r2=fixture(),a2=apiFor(r2),e2=spawn(r2,'evangelist');advance(r2,a2,1);assert.ok(r2.hazards.length);e2.hp=0;recordEncounterKill(r2,e2);advance(r2,a2,1);assert.equal(a2.hits.length,0);assert.equal(r2.hazards.length,0);});
test('hazards stay bounded, pause is stable, state serializable and identical seeded runs deterministic',()=>{const create=()=>{const r=fixture(),a=apiFor(r);for(let i=0;i<80;i++)spawn(r,'evangelist',i,0);advance(r,a,1.1);assert.ok(r.hazards.length<=64);return r;};const r=create(),r2=create();assert.equal(JSON.stringify(r),JSON.stringify(r2));const before=JSON.stringify(r);r.phase='paused';tickEncounters(r,.5,apiFor(r));r.phase='playing';assert.equal(JSON.stringify(r),before);assert.ok(JSON.parse(before));initEncounters(r);assert.equal(r.hazards.length,0);assert.deepEqual(r.encounters.defeatedBosses,[]);});
test('freeze pauses normal action; Kitava ignores slowing and freeze',()=>{const r=fixture(),a=apiFor(r),e=spawn(r,'drowned',30);step(r,a);e.freezeUntil=runTime(r)+2;advance(r,a,1);assert.equal(a.hits.length,0);assert.equal(e.action.phase,'windup');const bRun=fixture(),ba=apiFor(bRun),b=boss(bRun,'kitava');b.freezeUntil=100;ba.enemySpeed=()=>0;advance(bRun,ba,1.5);assert.ok(ba.effects.some(e=>e[6]?.skill==='kitavaSwipe'));});
for(const [status,fields,expectedSpeed,expectedCooldown] of [
  ['freeze',{freezeUntil:100},0,100],
  ['chill',{chill:100,chillEffect:.5},.5,2],
])test(`Kitava swipe keeps base timing with real class ${status} callbacks`,()=>{
  const r=fixture(),a=apiFor(r),b=boss(r,'kitava');r.classState={allocatedTreeNodeIds:[]};r.player.x=180;Object.assign(b,fields);
  a.enemySpeed=e=>classEnemySpeed(r,e);a.enemyCooldown=e=>classEnemyCooldown(r,e);
  assert.equal(a.enemySpeed(b),expectedSpeed);assert.equal(a.enemyCooldown(b),expectedCooldown);
  step(r,a);assert.equal(b.action.until,1.05);advance(r,a,1.45);
  assert.equal(a.hits.filter(h=>h.context.skill==='kitavaSwipe').length,1);
});
test('Kitava keeps faster action timing instead of clamping it to base speed',()=>{
  const r=fixture(),a=apiFor(r),b=boss(r,'kitava');r.player.x=180;a.enemyCooldown=()=>.5;
  step(r,a);assert.equal(b.action.until,.55);advance(r,a,.5);
  assert.equal(a.hits.filter(h=>h.context.skill==='kitavaSwipe').length,1);
});
test('non-finite boss cooldown falls back to a finite base windup',()=>{
  for(const cooldown of [NaN,Infinity,-Infinity]){
    const r=fixture(),a=apiFor(r),b=boss(r,'kitava');r.player.x=180;a.enemyCooldown=()=>cooldown;
    step(r,a);assert.equal(b.action.until,1.05);advance(r,a,1.45);
    assert.equal(a.hits.filter(h=>h.context.skill==='kitavaSwipe').length,1);
  }
});
test('threshold damage guard forces living Merveil/Dominus/Kitava phases even against lethal hits',()=>{for(const id of ['merveil','dominus','kitava']){const r=fixture(),a=apiFor(r),b=boss(r,id);assert.equal(typeof engine.prepareEncounterDamage,'function');const amount=engine.prepareEncounterDamage(r,b,100000);assert.equal(amount,b.maxHp/2);b.hp-=amount;assert.equal(engine.prepareEncounterDamage(r,b,100000),0);step(r,a);assert.equal(b.phase,id==='kitava'?'heart':2);if(id==='kitava')assert.equal(engine.prepareEncounterDamage(r,b,100),0);else assert.equal(engine.prepareEncounterDamage(r,b,100),100);}});
test('external Corrupted Blood authority receives stack policy once without duplicate local damage',()=>{const r=fixture(),a=apiFor(r),b=boss(r,'dominus'),applied=[];a.applyCorruptedBlood=(target,opts)=>{applied.push({target,opts});};b.hp=b.maxHp*.49;r.player.x=240;advance(r,a,2.5);assert.ok(applied.length>0);assert.equal(applied[0].target,r.player);assert.equal(applied[0].opts.count,1);assert.equal(applied[0].opts.duration,3);assert.equal(applied[0].opts.dps,4);assert.equal(r.player.corruptedBlood,undefined);assert.equal(a.hits.filter(h=>h.context.ailment==='corruptedBlood').length,0);});
test('normal windup has renderable warning geometry',()=>{for(const kind of Object.keys(MONSTERS)){const r=fixture(),a=apiFor(r),e=spawn(r,kind,kind==='drowned'?30:150);step(r,a);assert.ok(['circle','line','cone'].includes(e.action.geometry),kind);assert.ok(Number.isFinite(e.action.radius)||Number.isFinite(e.action.width));}});
test('Brutus delayed ground wave is a growing ring with distinct hit and miss geometry',()=>{const r=fixture(),a=apiFor(r),b=boss(r,'brutus');b.attackCycle=1;r.player.x=300;advance(r,a,.8);const h=r.hazards.find(h=>h.kind==='brutusWave');assert.ok(h);assert.equal(h.geometry,'ring');assert.ok(h.innerRadius<h.radius);advance(r,a,4);assert.equal(a.hits.filter(h=>h.context.skill==='brutusWave').length,1);});
test('melee boundary includes hitbox edge and excludes one unit beyond it',()=>{
  for(const [x,expected] of [[66,1],[67,0]]){
    const r=fixture(),a=apiFor(r);spawn(r,'drowned',0);step(r,a);r.player.x=x;advance(r,a,.6);
    assert.equal(a.hits.length,expected,`player at ${x}`);
  }
});
test('cold geysers miss locked target after escape and Kitava cone misses behind body',()=>{
  const r=fixture(),a=apiFor(r),b=boss(r,'merveil');b.hp=b.maxHp*.49;step(r,a);r.player.x=500;r.player.y=500;advance(r,a,1.5);
  assert.equal(a.hits.filter(h=>h.context.skill==='coldGeyser').length,0);
  const r2=fixture(),a2=apiFor(r2);boss(r2,'kitava');r2.player.x=160;step(r2,a2);r2.player.x=-160;advance(r2,a2,1.2);
  assert.equal(a2.hits.filter(h=>h.context.skill==='kitavaSwipe').length,0);
});
test('Touch of God carries independently specified physical/lightning amounts in one hit',()=>{
  const r=fixture(),a=apiFor(r),b=boss(r,'dominus');b.attackCycle=1;advance(r,a,1.2);
  const touch=a.hits.filter(h=>h.context.skill==='touchOfGod');assert.equal(touch.length,1);assert.equal(touch[0].amount,56);
  assert.deepEqual(touch[0].context.components,{physical:28,lightning:28});assert.equal(touch[0].context.spell,false);assert.equal(touch[0].context.area,true);
});
test('chill multiplier reduces normal travel and boss pursuit remains inside stored arena',()=>{
  const r=fixture(),a=apiFor(r),e=spawn(r,'rhoa',600);a.enemySpeed=()=>.25;step(r,a,1);assert.equal(e.x,580);
  const r2=fixture(),a2=apiFor(r2),b=boss(r2,'brutus');r2.player.x=10000;advance(r2,a2,12);assert.equal(b.x,0);assert.equal(b.y,0);
});
test('shield boundary uses centres inclusively, live actor identity and removed-actor fallback',()=>{
  const r=fixture(),a=apiFor(r),e=spawn(r,'evangelist',0),victim=spawn(r,'drowned',80);step(r,a);
  assert.equal(proximityBlocks(r,victim,{x:110,y:0}),false);assert.equal(proximityBlocks(r,victim,{x:111,y:0}),true);
  r.totems.push({id:1000,x:50,y:0,hp:1});assert.equal(proximityBlocks(r,victim,{x:500,y:0,actor:{id:1000,kind:'totem'}}),false);
  r.totems=[];assert.equal(proximityBlocks(r,victim,{x:500,y:0,actor:{id:1000,kind:'totem'}}),true);
});
test('shield resolves player actor without an ID at impact in both movement directions',()=>{
  const r=fixture(),a=apiFor(r);spawn(r,'evangelist',0);const victim=spawn(r,'drowned',80);step(r,a);
  const actor={kind:'player',ownerId:'player'};
  r.player.x=50;assert.equal(proximityBlocks(r,victim,{x:500,y:0,actor}),false);
  r.player.x=500;assert.equal(proximityBlocks(r,victim,{x:50,y:0,actor}),true);
});
test('shield resolves a minion with ID zero and retains removed-source fallback',()=>{
  const r=fixture(),a=apiFor(r);spawn(r,'evangelist',0);const victim=spawn(r,'drowned',80);step(r,a);
  const actor={id:0,kind:'minion'};r.minions.push({id:0,x:50,y:0,hp:1});
  assert.equal(proximityBlocks(r,victim,{x:500,y:0,actor}),false);
  r.minions[0].x=500;assert.equal(proximityBlocks(r,victim,{x:50,y:0,actor}),true);
  r.minions=[];assert.equal(proximityBlocks(r,victim,{x:500,y:0,actor}),true);
});
test('in-place encounter reset removes fallback Corrupted Blood from all retained actors',()=>{
  const r=fixture(),a=apiFor(r),b=boss(r,'dominus');b.hp=b.maxHp*.49;
  const ally=kind=>({id:1000+['minion','totem','mercenaryMinion','mercenary','sentinel'].indexOf(kind),kind,x:240,y:0,hp:100,radius:12});
  r.minions=[ally('minion')];r.totems=[ally('totem')];r.mercenaryMinions=[ally('mercenaryMinion')];r.mercenary=ally('mercenary');r.sentinel=ally('sentinel');r.player.x=240;
  advance(r,a,2.5);const retained=[r.player,...r.minions,...r.totems,...r.mercenaryMinions,r.mercenary,r.sentinel];
  for(const target of retained)assert.ok(target.corruptedBlood?.stacks>0);
  r.minions[0].hp=0;const hitsBeforeReset=a.hits.length;initEncounters(r);
  for(const target of retained)assert.equal(target.corruptedBlood,undefined,`${target.kind||'player'} reset`);
  advance(r,a,1);assert.equal(a.hits.length,hitsBeforeReset);
});
test('spawn warning is the only timed targetability gate and fresh reset removes old encounter actors',()=>{
  const r=fixture(),a=apiFor(r),b=startBossEncounter(r,'brutus',{x:0,y:0});assert.equal(enemyTargetable(b),false);advance(r,a,1.6);assert.equal(enemyTargetable(b),true);
  const generic={id:999,kind:'fixture',hp:1};r.enemies.push(generic);initEncounters(r);assert.deepEqual(r.enemies,[generic]);assert.equal(r.bossDefeated,false);
});
test('fallback RNG preserves a legitimate zero seed rather than replacing it',()=>{
  const r=fixture();r._rng=0;r._nextElite=0;
  tickEncounters(r,.05,{assignRareModifiers:()=>{}});
  // Elite ring consumes exactly two LCG values from seed zero.
  assert.equal(r._rng,1196435762);
});
test('wave roster unlocks progressively rather than spawning late archetypes at level one',()=>{
  const gates=[[0,'drowned'],[20,'ancientArcher'],[35,'rhoa'],[65,'goatman'],[100,'flameSentinel'],[150,'evangelist'],[190,'carrionQueen'],[220,'tentacleMiscreation']];
  for(const [at,kind] of gates){
    const r=fixture(),a=apiFor(r);r.time=at;r._spawnTimer=0;a.random=()=>.9999;tickEncounters(r,.05,a);
    assert.equal(r.enemies.filter(e=>e.kind!=='boss').at(-1).poeKind,kind,`unlock at ${at}`);
  }
});
test('boss projectile warning matches fan direction; Touch and Brutus slams stay at the body',()=>{
  for(const id of ['merveil','dominus']){
    const r=fixture(),a=apiFor(r),b=boss(r,id);r.player.x=300;step(r,a);
    assert.equal(b.action.geometry,'cone');assert.ok(b.action.arc>0);assert.ok(b.action.radius>=600);
  }
  for(const [id,skill] of [['dominus','touchOfGod'],['brutus','brutusSlam']]){
    const r=fixture(),a=apiFor(r),b=boss(r,id);b.attackCycle=1;r.player.x=300;advance(r,a,1.2);
    assert.equal(a.hits.filter(h=>h.context.skill===skill).length,0,`${skill} cannot hit a remote target`);
    const h=r.hazards.find(h=>h.kind===skill);if(h){assert.equal(h.x,b.x);assert.equal(h.y,b.y);}
    assert.equal(b.action.x,b.x);assert.equal(b.action.y,b.y);
  }
});
test('Sentinel receives encounter area hits and is resolved as a shield hit actor',()=>{
  const r=fixture(),a=apiFor(r);r.sentinel={id:1001,kind:'sentinel',x:0,y:0,hp:200,radius:12};spawn(r,'evangelist',0);advance(r,a,1.8);
  assert.equal(a.hits.filter(h=>h.target===r.sentinel).length,1);
  assert.equal(proximityBlocks(r,r.enemies[0],{x:500,y:0,actor:{id:1001,kind:'minion'}}),false);
});
test('locked landing/rune/storm warnings expose the actual target centre, while melee warnings use body',()=>{
  for(const kind of ['goatman','evangelist']){
    const r=fixture(),a=apiFor(r),e=spawn(r,kind,150);step(r,a);assert.equal(e.action.x,0);assert.equal(e.action.y,0);
  }
  const r=fixture(),a=apiFor(r),b=boss(r,'merveil');b.attackCycle=1;r.player.x=100;step(r,a);assert.equal(b.action.x,100);assert.equal(b.action.y,0);
});
function runTime(r){return r.time;}
}

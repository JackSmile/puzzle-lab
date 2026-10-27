import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,tick} from '../games/duskbound/core.mjs';
import {spawnPoeEnemy,startBossEncounter} from '../games/duskbound/encounters.mjs';
import {chooseAscendancy,chooseAscendancyNode,classAllyStats,classAllyDamage} from '../games/duskbound/classes.mjs';

function fresh(seed=77){const r=createRun({classId:'scion',seed});r.upgrades={};r.terrain=[];r._spawnTimer=Infinity;r._nextElite=Infinity;r.classState.trialsCompleted=4;return r;}
function step(r,n=1){for(let i=0;i<n;i++)tick(r,.05);}
const dist=(e,p)=>Math.hypot(e.x-p.x,e.y-p.y);
function luminary(){const r=fresh();r.phase='ascendancy';r.classState.ascendancyPoints=8;chooseAscendancy(r,'Luminary');chooseAscendancyNode(r,'56292');assert.ok(r.classState.allocatedNodeIds.includes('56292'));r.phase='playing';r.mercenary.shotTimer=Infinity;return r;}

test('F1 public tick recycles far ordinary enemies into the seeded 650–850 ring and cancels stale action/jump/hazards',()=>{
 function sample(seed){const r=fresh(seed),parent=spawnPoeEnemy(r,'carrionQueen',{x:2100,y:0}),e=spawnPoeEnemy(r,'carrionMinion',{x:2200,y:0});e.parentId=parent.id;e.action={kind:'leapSlam',phase:'airborne',startedAt:0,until:2,originX:2200,originY:0,targetX:0,targetY:0};e.jumpHeight=50;e.shieldUntil=10;r.hazards.push({ownerId:e.id,expiresAt:100,nextHitAt:100});step(r);assert.ok(dist(e,r.player)>=650&&dist(e,r.player)<=850,`distance ${dist(e,r.player)}`);assert.equal(e.action,null);assert.equal(e.jumpHeight,0);assert.equal(e.shieldUntil,0);assert.equal(r.hazards.some(h=>h.ownerId===e.id),false);assert.equal(e.parentId,parent.id);assert.equal(parent.hp>0,true);return [parent.x,parent.y,e.x,e.y];}
 assert.deepEqual(sample(77),sample(77));assert.notDeepEqual(sample(77),sample(78));
});
test('F3 actual taunted Tentacle spine mitigates physical6/fire6 independently and ignites from the fire portion',()=>{
 const r=luminary(),e=spawnPoeEnemy(r,'tentacleMiscreation',{x:210,y:0});r.mercenary.x=180;r.mercenary.y=0;e.shotTimer=0;e.mercenaryTauntUntil=3;step(r,17);
 const p=r.projectiles.filter(p=>p.hostile).sort((a,b)=>Math.abs(a.vy)-Math.abs(b.vy))[0];assert.ok(p);assert.deepEqual(p.context.components,{physical:6,fire:6});assert.equal(p.hostileTargetId,r.mercenary.id);r.projectiles=[p];e.action=null;e.shotTimer=Infinity;
 const a=r.mercenary;a.x=p.x-18;a.y=p.y;a.equipment={body:{mods:{armour:100}}};const hp=a.hp,playerHp=r.player.hp;step(r);
 assert.ok(Math.abs((hp-a.hp)-96/13)<1e-8,`actual ${hp-a.hp}, expected96/13`);assert.equal(a.ailments.ignite.dps,.48);assert.equal(a.ailments.ignite.until,r.time+3);assert.equal(a.ailments.ignite.applications.length,1);assert.equal(r.projectiles.includes(p),false);assert.equal(r.player.hp,playerHp);
});
for(const [type,mods,expected,ignite] of [['physical',{armour:100},4.5,0],['fire',{armour:100,fireResistance:.5},6,.48],['cold',{armour:100,coldResistance:.25},9,0]])test(`F3 pure ${type} ally hit keeps its mitigation and ailment policy`,()=>{
 const r=luminary(),a=r.mercenary;a.equipment={body:{mods}};const hp=a.hp;let rolls=0;classAllyDamage(r,a,12,{type,random:()=>{rolls++;return 1;}});assert.equal(hp-a.hp,expected);assert.equal(a.ailments?.ignite?.dps||0,ignite);assert.equal(rolls,1);
});
for(const blocked of [false,true])test(`F3 mixed ally hit shares one block roll and ${blocked?'one Aegis recovery without ignite':'one total ES spend and one recoup entry'}`,()=>{
 const r=luminary(),a=r.mercenary;r.player.hp=r.player.maxHp=1000;a.equipment={body:{mods:{armour:100,fireResistance:.5,energyShield:5,block:.5,aegisRecovery:.02}}};classAllyStats(r,a);a.maxEnergyShield=5;a.energyShield=blocked?0:5;const hp=a.hp;let rolls=0;
 classAllyDamage(r,a,12,{components:{physical:6,fire:6},random:()=>{rolls++;return blocked?.1:.9;}});
 assert.equal(rolls,1);assert.ok(Math.abs(a.energyShield-(blocked?2:8/13))<1e-8);assert.equal(a.hp,hp);
 if(blocked){assert.equal(a.ailments?.ignite,undefined);assert.equal(a.recoup.length,0);assert.equal(a.blockUntil,r.time+.35);}
 else {assert.equal(a.ailments.ignite.dps,.24);assert.equal(a.recoup.length,1);assert.equal(a.recoup[0].remaining,0);}
});
test('F3 mixed ally hit spends ES once before HP and queues one recoup from total HP loss',()=>{
 const r=luminary(),a=r.mercenary;r.player.hp=r.player.maxHp=1000;a.equipment={body:{mods:{armour:100,fireResistance:.5,energyShield:2}}};a.maxEnergyShield=2;a.energyShield=2;const hp=a.hp;
 classAllyDamage(r,a,12,{components:{physical:6,fire:6},random:()=>1});assert.equal(a.energyShield,0);assert.ok(Math.abs((hp-a.hp)-31/13)<1e-8);assert.equal(a.recoup.length,1);assert.ok(Math.abs(a.recoup[0].remaining-62/65)<1e-8);assert.ok(Math.abs(a.recoup[0].rate-31/130)<1e-8);assert.equal(a.ailments.ignite.dps,.24);
});
for(const mode of ['dot','selfHit'])test(`F3 mixed ${mode} bypasses block and cannot ignite the ally`,()=>{
 const r=luminary(),a=r.mercenary;a.equipment={body:{mods:{armour:100,fireResistance:.5,block:.75}}};const hp=a.hp;let rolls=0;
 classAllyDamage(r,a,12,{components:{physical:6,fire:6},...(mode==='dot'?{hit:false}:{selfHit:true}),random:()=>{rolls++;return 0;}});assert.equal(rolls,0);assert.ok(Math.abs((hp-a.hp)-(mode==='dot'?9:57/13))<1e-8);assert.equal(a.ailments?.ignite,undefined);
});
test('F1 threshold is strictly greater than1800; bosses and exposed heart stay anchored',()=>{
 const r=fresh(),e=spawnPoeEnemy(r,'drowned',{x:1800,y:0});e.speed=0;step(r);assert.equal(e.x,1800);e.x=1800.01;step(r);assert.ok(dist(e,r.player)<=850);
 const b=startBossEncounter(r,'kitava',{x:3000,y:0});b.telegraph=0;b.hp=b.maxHp/2;step(r);const h=r.enemies.find(e=>e.kind==='heart');assert.ok(h);step(r,5);assert.deepEqual([b.x,b.y,h.x,h.y],[3000,0,3000,105]);
});
test('F1 occupied cap regains nearby waves and new roster members after recycled deaths',()=>{
 const r=fresh();r.time=230;r.encounters.scheduled=['brutus','merveil'];r._spawnTimer=0;for(let i=0;i<180;i++)spawnPoeEnemy(r,'drowned',{x:5000+i,y:0});step(r);assert.equal(r.enemies.length,180);assert.ok(r.enemies.every(e=>dist(e,r.player)<=850));
 for(let i=0;i<80;i++)r.enemies[i].hp=0;step(r);step(r,100);assert.ok(r.enemies.some(e=>e.poeKind!=='drowned'),'unlocked roster replenishes the recovered local wave');assert.ok(r.enemies.length<=180);
});
test('F2 real Bestowed Knighthood hit taunts for3 seconds and new melee AI chooses mercenary range',()=>{
 const r=luminary(),e=spawnPoeEnemy(r,'drowned',{x:210,y:0});e.hp=e.maxHp=1000;e.shotTimer=0;r.mercenary.x=180;r.mercenary.y=0;r.mercenary.shotTimer=0;step(r);assert.equal(e.mercenaryTauntUntil,r.time+3);r.mercenary.shotTimer=Infinity;r.mercenary.x=180;r.mercenary.y=0;step(r);assert.equal(e.action?.kind,'meleeWindup');assert.deepEqual([e.action.targetX,e.action.targetY],[180,0]);
});
for(const state of ['active','expired','dead'])test(`F2 ${state} taunt drives chase and ranged windup target`,()=>{
 const r=luminary();r.mercenary.x=600;r.mercenary.y=100;const e=spawnPoeEnemy(r,'drowned',{x:300,y:0});e.mercenaryTauntUntil=state==='expired'?0:3;if(state==='dead')r.mercenary.hp=0;step(r);assert.equal(e.x>300,state==='active');
 r.enemies=[];const a=spawnPoeEnemy(r,'ancientArcher',{x:210,y:0});a.shotTimer=0;a.mercenaryTauntUntil=state==='expired'?r.time:3;r.mercenary.x=180;r.mercenary.y=30;const target=state==='active'?r.mercenary:r.player,expected=[target.x,target.y];step(r);assert.deepEqual([a.action.targetX,a.action.targetY],expected);
});
test('F2 taunt expiry cannot retarget an existing windup',()=>{
 const r=luminary(),e=spawnPoeEnemy(r,'ancientArcher',{x:210,y:0});r.mercenary.x=180;r.mercenary.y=100;e.shotTimer=0;e.mercenaryTauntUntil=.1;step(r);assert.deepEqual([e.action.targetX,e.action.targetY],[180,100]);const aim=[e.action.targetX,e.action.targetY,e.action.angle];step(r,3);assert.deepEqual([e.action.targetX,e.action.targetY,e.action.angle],aim);assert.equal(e.mercenaryTauntUntil<=r.time,true);
});
for(const end of ['expired','dead'])test(`F2 released arrow keeps its selected mercenary after taunt ${end}`,()=>{
 const r=luminary(),e=spawnPoeEnemy(r,'ancientArcher',{x:210,y:0});r.mercenary.x=180;r.mercenary.y=0;e.shotTimer=0;e.mercenaryTauntUntil=3;step(r,14);const p=r.projectiles.find(p=>p.hostile);assert.ok(p);assert.equal(p.hostileTargetId,r.mercenary.id);assert.equal(p.context.enemyId,e.id);assert.equal(p.context.type,'physical');assert.equal(p.context.spell,false);assert.equal(p.context.melee,false);assert.ok(p.vx<0);e.action=null;e.shotTimer=Infinity;
 e.mercenaryTauntUntil=0;const playerHp=r.player.hp;r.player.invulnerable=0;
 if(end==='dead'){r.mercenary.hp=0;r.mercenary.respawn=0;const direction=[p.vx,p.vy];step(r,5);assert.deepEqual([p.vx,p.vy],direction);assert.equal(r.mercenary.hp,0);}
 else {r.mercenary.x=p.x-18;r.mercenary.y=p.y;r.mercenary.equipment={body:{mods:{armour:100}}};const hp=r.mercenary.hp;assert.equal(classAllyStats(r,r.mercenary).armour,100);step(r);assert.ok(Math.abs((hp-r.mercenary.hp)-10/3)<1e-8,`actual damage ${hp-r.mercenary.hp}, expected10/3`);assert.equal(r.projectiles.includes(p),false);assert.equal(r.player.hp,playerHp);}
});
test('F2 boss pursuit and a new boss windup honor the same living taunter',()=>{
 const r=luminary(),b=startBossEncounter(r,'merveil',{x:300,y:0});b.telegraph=0;b.shotTimer=0;b.mercenaryTauntUntil=3;r.mercenary.x=600;r.mercenary.y=0;step(r);assert.ok(b.x>300);assert.deepEqual([b.action.targetX,b.action.targetY],[600,0]);
});
test('F2 applying taunt cannot redirect a windup already aimed at the player',()=>{
 const r=luminary(),e=spawnPoeEnemy(r,'ancientArcher',{x:210,y:0});e.shotTimer=0;step(r);const aim=[e.action.targetX,e.action.targetY,e.action.angle];e.mercenaryTauntUntil=3;r.mercenary.x=180;r.mercenary.y=100;step(r,13);assert.deepEqual([e.action.targetX,e.action.targetY,e.action.angle],aim);const p=r.projectiles.find(p=>p.hostile);assert.ok(p);assert.equal(p.hostileTargetId,null);
});
for(const obstacle of ['terrain','player','unselectedMercenary'])test(`F2 selected mercenary routing preserves ${obstacle} collision behavior`,()=>{
 const r=luminary(),e=spawnPoeEnemy(r,'ancientArcher',{x:210,y:0});r.mercenary.x=180;r.mercenary.y=0;e.shotTimer=0;e.mercenaryTauntUntil=3;step(r,14);const p=r.projectiles.find(p=>p.hostile);assert.ok(p);e.action=null;e.shotTimer=Infinity;
 const hp=r.mercenary.hp,playerHp=r.player.hp;r.mercenary.x=p.x-30;r.mercenary.y=p.y;
 if(obstacle==='terrain')r.terrain=[{x:p.x-6,y:p.y,radius:2}];
 if(obstacle==='player'){r.player.x=p.x-5;r.player.y=p.y;r.player.invulnerable=0;r.player.energyShield=0;}
 if(obstacle==='unselectedMercenary'){p.hostileTargetId=null;r.mercenary.x=p.x-12;}
 step(r);
 // Bestowed Knighthood's path includes Bodyguard: a player hit redirects20% to the mercenary.
 if(obstacle==='player')assert.ok(hp-r.mercenary.hp>0&&hp-r.mercenary.hp<=2);
 else assert.equal(r.mercenary.hp,hp);
 assert.equal(r.player.hp<playerHp,obstacle==='player');assert.equal(r.projectiles.includes(p),obstacle==='unselectedMercenary');
});

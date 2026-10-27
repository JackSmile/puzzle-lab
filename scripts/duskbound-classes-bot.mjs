// Smoke diagnostic: public decisions, ordinary class stats, no bonuses or invulnerability.
// One seed and one policy cannot establish class balance or human playability.
import {createRun,tick,chooseUpgrade,equipLoot,supportTargets} from '../games/duskbound/core.mjs';
import {smokeInput,takeSmokeLoot} from './duskbound-bot-policy.mjs';
import {CLASSES,chooseAscendancy,chooseAscendancyNode,finishAscendancy,allocateAttribute,getNotables} from '../games/duskbound/classes.mjs';
const seedArg=process.argv.find(arg=>arg.startsWith('--seed='));
const seed=seedArg?Number(seedArg.slice(7)):42;
if(!Number.isSafeInteger(seed))throw new Error('Seed must be an integer');
const results=[];
for(const c of CLASSES)for(const asc of c.ascendancies){
 const r=createRun({classId:c.id,seed});
 for(let step=0;step<16000&&!['dead','won'].includes(r.phase);step++){
  if(r.phase==='upgrade'){const priorities=['bolt','nova','minion','lightning','orbit','might','regen','vitality','haste','stride'];const id=priorities.find(x=>r.offered.includes(x))||r.offered[0];chooseUpgrade(r,id,supportTargets(r,id)[0]);}
  if(r.phase==='loot')equipLoot(r,takeSmokeLoot(r));
  if(r.phase==='ascendancy'){if(!r.classState.ascendancyId)chooseAscendancy(r,asc.id);const n=getNotables(asc.id,r).find(n=>!r.classState.allocatedNodeIds.includes(n.id)&&n.pointCost<=r.classState.ascendancyPoints);if(n)chooseAscendancyNode(r,n.id);else finishAscendancy(r);}
  if(r.classState.passivePoints)allocateAttribute(r,'strength');
  tick(r,.05,smokeInput(r));
  for(const value of [r.player.hp,r.player.mana,r.player.energyShield,r.player.x,r.player.y])if(!Number.isFinite(value))throw Error(`${asc.id}: nonfinite player state`);
  for(const ally of [r.mercenary,r.sentinel,...(r.minions||[]),...(r.mercenaryMinions||[]),...(r.totems||[])].filter(Boolean))for(const value of [ally.x,ally.y,ally.hp,ally.maxHp])if(!Number.isFinite(value))throw Error(`${asc.id}: nonfinite ally state`);
  if(r.enemies.filter(e=>!['boss','heart'].includes(e.kind)&&e.hp>0).length>180||r.enemies.filter(e=>e.kind==='boss'&&e.hp>0).length>1||r.enemies.filter(e=>e.kind==='heart'&&e.hp>0).length>1||r.projectiles.length>500||r.effects.length>250||(r.hazards?.length||0)>64||(r.mercenaryMinions?.length||0)>1)throw Error(`${asc.id}: entity cap`);
 }
 const result={seed,classId:c.id,ascendancy:asc.name,phase:r.phase,time:Math.round(r.time*10)/10,level:r.level,kills:r.kills,nodes:r.classState.allocatedNodeIds.length,trials:r.classState.trialsCompleted,hp:Math.round(r.player.hp),bossDefeated:r.bossDefeated,defeatedBosses:r.encounters?.defeatedBosses||[],bossRewards:r.encounters?.rewardedBosses?.length||0};results.push(result);console.log(JSON.stringify(result));
}
console.log('SUMMARY',JSON.stringify({runs:results.length,won:results.filter(r=>r.phase==='won').length,dead:results.filter(r=>r.phase==='dead').length,playing:results.filter(r=>r.phase==='playing').length}));

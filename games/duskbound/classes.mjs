import {enemyTargetable} from './encounters.mjs';
import {combatState,stolenStat,uniqueSummary,flaskSpec,tickFlask,uniqueKilled,reflectMelee,nebulisIncrease,legacyResistances,rawGear} from './uniques.mjs';
import tree from './data/poe-classes-source.json' with {type:'json'};
import signatures from './data/poe-signatures-source.json' with {type:'json'};

const COLORS={scion:'#e4c58c',marauder:'#ef9277',ranger:'#a4d49b',witch:'#b6b0f7',duelist:'#d9a571',templar:'#eee0aa',shadow:'#9ccbd6'};
const START={scion:'bolt',marauder:'nova',ranger:'lightning',witch:'bolt',duelist:'orbit',templar:'minion',shadow:'orbit'};
const TRIALS=[90,180,300,420];
const signatureMap=new Map(signatures.ascendancies.map(a=>[a.ascendancyId,a]));
const allNodes=new Map(signatures.ascendancies.flatMap(a=>a.nodes.map(n=>[n.nodeId,n])));
export const CLASSES=tree.classes.map(c=>({...c,color:COLORS[c.id],weapon:START[c.id],description:`${c.baseAttributes.strength} STR · ${c.baseAttributes.dexterity} DEX · ${c.baseAttributes.intelligence} INT`,ascendancies:c.ascendancies.map(a=>({...a,color:COLORS[c.id],description:signatureMap.get(a.id).adaptationCaveat,nodeIds:signatureMap.get(a.id).nodes.map(n=>n.nodeId)}))}));
export const getAscendancies=id=>CLASSES.find(c=>c.id===id)?.ascendancies||[];
const NOTE={Ascendant:'Путь даёт исходные атрибуты и пассивные очки; выбранный подкласс открывает соответствующую механику.',Reliquarian:'Эффекты уникальных предметов действуют как пассивы. Заряды силы и ярости приобретаются в бою.',Luminary:'Наёмник с жизнью, оружием и аурой сопровождает героя; уникальные находки усиливают его экипировку.',Juggernaut:'Точность применяется к Kinetic Fusillade, броня уменьшает физический урон, регенерация восстанавливает жизнь.',Berserker:'Ярость набирается попаданиями атак; похищение жизни требует соответствующего свойства оружия.',Chieftain:'Огненное сопротивление, взрывы при убийстве и стационарная огненная аура.',Raider:'Стихийные попадания накладывают ожог, шок и заморозку; 100 ярости стихий автоматически включает Unbound на 10 с.',Deadeye:'Дополнительные снаряды, настоящие цепи и бонус за пройденное снарядом расстояние.',Pathfinder:'Флакон автоматически расходует заряды, активирует усиление; отравление наносит отдельный хаос-урон.',Occultist:'Ближайшие враги автоматически проклинаются; Withered усиливает хаос-урон, холод замедляет и замораживает.',Elementalist:'Поджог, шок, охлаждение и воздействие на сопротивления применяются реальными попаданиями.',Necromancer:'Призраки имеют жизнь и энергощит. Автоподношение поглощает трупы; аура усиливает союзников.',Slayer:'Добивание, похищение жизни, критические атаки и бонус после убийств.',Gladiator:'Кровотечение от атак, взрывы и блок; редкие враги накапливают уязвимость в присутствии героя.',Champion:'Атаки провоцируют, пронзают и устрашают. Фортификация снижает урон попаданий.',Inquisitor:'Криты учитывают сопротивления и меньший STR/INT. Стояние создаёт освящённую землю.',Hierophant:'Мана поглощает часть урона; тайный всплеск усиливает заклинания, тотемы атакуют самостоятельно.',Guardian:'Страж с жизнью принимает часть попаданий; периодическое восстановление и блок защищают героя.',Assassin:'Криты, неуловимость и отравление; редкие враги меняют защиту и урон.',Trickster:'Чередование защиты от попаданий/DoT. Выбранные типы пассивных характеристик служат мастерствами этого режима.',Saboteur:'Вероятностный урон по области, ослепление, восстановление перезарядки и возвращающиеся снаряды.'};
// Weighted original graph search: already allocated nodes and choice options are free.
// Nodes are connected in either direction, as in the passive tree; choice leaves never form shortcuts.
function path(n,run){
 const allocated=new Set(run?.classState?.allocatedTreeNodeIds||[]),start=n.originalShortestGraphPath[0];
 const asc=tree.nodes[start].ascendancyName;
 const allowed=id=>{const node=tree.nodes[id];if(!node||node.ascendancyName!==asc)return false;if(!node.isMultipleChoiceOption)return true;return !(node.in||[]).some(hub=>(tree.nodes[hub]?.out||[]).some(other=>other!==id&&tree.nodes[other]?.isMultipleChoiceOption&&allocated.has(other)));};
 const queue=[{id:start,cost:0,nodes:[]}],best=new Map();
 while(queue.length){queue.sort((a,b)=>a.cost-b.cost||a.nodes.length-b.nodes.length||a.nodes.filter(i=>tree.nodes[i]?.isMultipleChoice).join().localeCompare(b.nodes.filter(i=>tree.nodes[i]?.isMultipleChoice).join()));const current=queue.shift();if(best.has(current.id))continue;best.set(current.id,current.cost);if(current.id===n.nodeId)return current.nodes;
  const node=tree.nodes[current.id];if(node.isMultipleChoiceOption)continue;
  for(const id of [...(node.out||[]),...(node.in||[])])if(allowed(id)&&!best.has(id))queue.push({id,cost:current.cost+(!allocated.has(id)&&payable(id)?1:0),nodes:[...current.nodes,id]});
 }
 return null;
}
function payable(id){return !tree.nodes[id]?.isMultipleChoiceOption && !tree.nodes[id]?.isAscendancyStart;}
export function getNotables(id,run){return (signatureMap.get(id)?.nodes||[]).map(n=>{const route=path(n,run);return {id:n.nodeId,name:n.name,stats:[...n.stats],description:NOTE[id],icon:'✦',color:COLORS[signatureMap.get(id).classId],pointCost:route?route.filter(i=>payable(i)&&!run?.classState?.allocatedTreeNodeIds.includes(i)).length:Infinity,prerequisiteIds:route?.slice(0,-1)||[],reminderText:n.reminderText};});}
const has=(run,id)=>!!run.classState?.allocatedTreeNodeIds.includes(String(id));
const nearby=(run,e,r=220)=>Math.hypot(e.x-run.player.x,e.y-run.player.y)<=r;
const recent=(run,key,d=4)=>run.time-(run.classState?.combat[key]??-1e9)<d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const gear=(run,key)=>Object.values(run.equipment||{}).reduce((s,g)=>s+classEquipmentModifier(run,g,key),stolenStat(run,key));
export function classEquipmentModifier(run,item,key){
 const value=Number(item?.mods?.[key])||0;
 if(item?.slot!=='flask')return value;
 if(!run.classState)return combatState(run).flaskUntil>run.time?value:0;
 if(!(run.classState.combat.flaskUntil>run.time))return 0;
 const m=smallModifiers(run);
 return value*(1+(m.flaskEffect||0)+(has(run,65296)&&item.rarity==='magic'&&item.utility?.3:0));
}
export function maxChargeCount(run,type){return type==='frenzy'&&has(run,47058)?2:['power','endurance'].includes(type)&&has(run,25651)?4:3;}
export function effectiveChargeCount(run,type){const actual=run.classState?.combat[type]||0;return Object.values(run.equipment).some(g=>g?.countsAsMaximumChargeType===type)?maxChargeCount(run,type):['power','endurance'].includes(type)&&has(run,25651)?Math.max(4,actual):actual;}
const onslaughtIncrease=run=>run.classState?.combat.onslaughtUntil>run.time?.2*(1+gear(run,'onslaughtEffect')):0;
export function applyCorruptedBlood(run,{stacks=1,dps=2,duration=3,sourceId=null}={}){
 if(!run.classState||gear(run,'corruptedBloodImmune'))return false;
 const previous=run.player.ailments.corruptedBlood,active=previous?.until>run.time?previous.stacks:0;
 const count=Math.min(10,Math.max(0,active+stacks));
 run.player.ailments.corruptedBlood={stacks:count,dps:Math.max(0,dps)*count,until:run.time+Math.max(0,duration),sourceId};return true;
}
const ownedAilment=actor=>actor?.ownerId==='player'&&['player','totem','proxy'].includes(actor.kind);
export function ownedAilmentTypes(run,enemy,owner=null){
 const belongs=owner?actor=>actor?.kind==='mercenary'&&actor.id===owner.id:ownedAilment;
 const types=['ignite','shock','freeze','bleed','scorch'].filter(type=>enemy[type+'Until']>run.time&&belongs(enemy[type+'Actor']));
 if(enemy.chill>0&&belongs(enemy.chillActor))types.push('chill');
 if((enemy.poisons||[]).some(p=>p.until>run.time&&belongs(p.actor)))types.push('poison');return types;
}
// Keep concurrent non-stacking ailments: only the strongest deals damage/applies its effect,
// but a weaker, longer application can become active after the stronger one expires.
function ailmentApplications(enemy,type,time){
 const field=type==='ignite'?'Dps':'Effect',key=type+'Applications';
 if(!enemy[key])enemy[key]=Number.isFinite(enemy[type+'Until'])?[{power:enemy[type+field]||0,until:enemy[type+'Until'],actor:enemy[type+'Actor']}]:[];
 return enemy[key];
}
function strongestApplication(applications,time){
 return applications.reduce((best,a)=>a.until>time&&(a.appliedAt??-Infinity)<=time&&(!best||a.power>best.power||a.power===best.power&&a.until>best.until)?a:best,null);
}
function integrateIgniteApplications(applications,time,dt,deal){
 const start=time-dt;
 const boundaries=[...new Set([start,time,...applications.flatMap(a=>[a.until,a.appliedAt]).filter(t=>t>start&&t<time)])].sort((a,b)=>a-b);
 for(let i=0;i<boundaries.length-1;i++){
  const active=strongestApplication(applications,boundaries[i]);
  if(active&&deal(active.power*(boundaries[i+1]-boundaries[i]),active)===false)break;
 }
}
function allyIgniteApplications(ailment){
 return ailment?.applications||(ailment?[{power:ailment.dps||0,until:ailment.until,appliedAt:ailment.appliedAt}]:[]);
}
function currentAllyIgnite(run,ally){return strongestApplication(allyIgniteApplications(ally?.ailments?.ignite),run.time);}
function publishAllyIgnite(run,ally,applications){
 const current=strongestApplication(applications,run.time);
 if(current)ally.ailments.ignite={dps:current.power,until:current.until,appliedAt:current.appliedAt,applications};
 else delete ally.ailments.ignite;
}
function applyAllyIgnite(run,ally,dps){
 ally.ailments||={};
 // Incoming hits happen before classTick too: keep prior applications until
 // their pending interval is integrated, including weak effects that may resume.
 const applications=[...allyIgniteApplications(ally.ailments.ignite),{power:dps,until:run.time+3,appliedAt:run.time}].slice(-100);
 publishAllyIgnite(run,ally,applications);
}
function selectAilment(enemy,type,time,prune=false){
 const field=type==='ignite'?'Dps':'Effect',applications=ailmentApplications(enemy,type,time);
 const active=applications.filter(a=>a.until>time&&(a.appliedAt??-Infinity)<=time);
 const strongest=strongestApplication(active,time);
 if(strongest){enemy[type+field]=strongest.power;enemy[type+'Until']=strongest.until;enemy[type+'Actor']=strongest.actor;}
 else {enemy[type+field]=0;if(type==='shock')enemy.shockStacks=0;}
 if(prune){
  const sameOwner=(a,b)=>a.actor?.kind===b.actor?.kind&&a.actor?.id===b.actor?.id&&a.actor?.ownerId===b.actor?.ownerId;
  // Only discard dominated applications after the previous frame has been integrated.
  enemy[type+'Applications']=active.filter((a,i)=>!active.some((b,j)=>i!==j&&sameOwner(a,b)&&b.power>=a.power&&b.until>=a.until&&(b.power>a.power||b.until>a.until||j>i)));
 }
 return strongest;
}
function applyAilment(enemy,type,application,time){
 // Core applies end-of-frame hits before classTick. An expired or dominated old
 // application may still own damage in that pending interval, so retain it here.
 const applications=ailmentApplications(enemy,type,time);
 applications.push({appliedAt:time,...application});
 enemy[type+'Applications']=applications.slice(-100);
 selectAilment(enemy,type,time);
}
function setEnemyTimer(run,enemy,key,until){
 enemy[key]=until;(enemy.effectAppliedAt||={})[key]=run.time;
}
function applyTemporalChains(run,enemy,actor,effect){
 const previous=enemy.temporalChains,history=[...(previous?.history||[])];
 if(previous)history.push({appliedAt:previous.appliedAt??-Infinity,until:Math.min(run.time,previous.until),effect:previous.effect});
 // Keep disjoint source intervals, including gaps and effect changes. They are
 // consumed by all effect clocks before pruning, never by TC's own duration.
 enemy.temporalChains={until:run.time+5,appliedAt:run.time,actor:{kind:actor.kind,ownerId:actor.ownerId},effect,history:history.slice(-100)};
}
function rememberBleed(enemy,time){
 if(enemy.bleedUntil!=null)(enemy.bleedHistory||=[]).push({until:enemy.bleedUntil,appliedAt:enemy.effectAppliedAt?.bleedUntil??-Infinity,endedAt:time,base:enemy.bleedBase,dps:enemy.bleedDps,aggravated:enemy.bleedAggravated,actor:enemy.bleedActor});
 enemy.bleedHistory=(enemy.bleedHistory||[]).slice(-100);
}
const heal=(run,n)=>{if(run.player.hp<=0)return;run.player.hp=Math.min(run.player.maxHp,run.player.hp+n);};
function rng(run){run._rng=(Math.imul(run._rng,1664525)+1013904223)>>>0;return run._rng/4294967296;}

export function initializeClass(run,classId){
 const c=CLASSES.find(c=>c.id===classId)||CLASSES.find(c=>c.id==='witch');
 run.classState={classId:c.id,ascendancyId:null,allocatedNodeIds:[],allocatedTreeNodeIds:[],passivePoints:0,ascendancyPoints:0,attributesAllocated:{strength:0,dexterity:0,intelligence:0},trialsCompleted:0,combat:{rage:0,power:0,frenzy:0,endurance:0,gale:0,fury:0,leech:[],prevented:[],poisons:[],flaskCharges:30,flaskUntil:0,offeringUntil:0,auras:1,reservedFraction:0,masteries:[],lastHit:-1e9}};
 Object.assign(run.equipment,{helmet:null,shield:null,offhand:null,quiver:null,amulet:null,gloves:null,boots:null});
 run.corpses=[];run.totems=[];run.mercenaryMinions=[];run.terrain=[{x:320,y:150,radius:24},{x:-320,y:-150,radius:24},{x:160,y:-340,radius:24},{x:-160,y:340,radius:24}];
 Object.assign(run.player,{mana:0,maxMana:0,energyShield:0,maxEnergyShield:0,ailments:{},curses:[]});
 refreshClassResources(run,true);
}

// Only original small-node modifiers are parsed here. Notable mechanics are explicit hooks below.
const modifierCache=new WeakMap();
function smallModifiers(run){
 const cached=modifierCache.get(run);
 if(cached?.count===run.classState?.allocatedTreeNodeIds.length)return cached.value;
 const m={strength:0,dexterity:0,intelligence:0};
 const add=(k,n)=>{m[k]=(m[k]||0)+n;};
 for(const id of run.classState?.allocatedTreeNodeIds||[]){
  const n=tree.nodes[id];if(n.isNotable||n.isAscendancyStart||n.isMultipleChoiceOption)continue;
  for(const raw of n.stats){const s=raw.replaceAll('\n',' ');let x;
   if((x=s.match(/^\+(\d+) to (Strength|Dexterity|Intelligence)(?: and (Strength|Dexterity|Intelligence))?$/))){add(x[2].toLowerCase(),+x[1]);if(x[3])add(x[3].toLowerCase(),+x[1]);continue;}
   if((x=s.match(/^Regenerate ([\d.]+)% of Life per second/)))add('regen',+x[1]/100);
   if((x=s.match(/^\+([\d.]+)% to (?:all )?(Fire|Chaos|Elemental) Resistances?$/)))add(`${x[2].toLowerCase()}Resistance`,+x[1]/100);
   if((x=s.match(/^\+([\d.]+)% to Critical Strike Multiplier$/)))add('critMultiplier',+x[1]/100);
   if((x=s.match(/^\+([\d.]+)% Chance to Block Attack Damage/)))add('block',+x[1]/100);
   if((x=s.match(/^([\d.]+)% chance to (Ignite|Shock|Freeze|Poison on Hit)/)))add(x[2].split(' ')[0].toLowerCase(),+x[1]/100);
   if((x=s.match(/^Attacks have ([\d.]+)% chance to cause Bleeding/)))add('bleed',+x[1]/100);
   if((x=s.match(/^([\d.]+)% chance to Impale/)))add('impale',+x[1]/100);
   if((x=s.match(/^([\d.]+)% of Attack Damage Leeched as Life/)))add('leech',+x[1]/100);
   if(s==='Gain 1 Rage on Attack Hit')add('rageOnHit',1);
   if((x=s.match(/^(?:Minions deal |Your Mercenary and their Minions deal |Minions have |Your Mercenary and their Minions have |Flasks applied to you have )?([\d.]+)% increased (.+)$/))){
    const val=+x[1]/100, what=x[2];const prefix=s.startsWith('Your Mercenary')?'mercenary':s.startsWith('Minions')?'minion':s.startsWith('Flasks')?'flask':'';
    const keys={'Armour':['armour'],'Evasion Rating':['evasion'],'Evasion Rating and Armour':['evasion','armour'],'maximum Energy Shield':['energyShield'],'maximum Mana':['mana'],'Mana Regeneration Rate':['manaRegen'],'Movement Speed':['speed'],'Attack Speed':['attackSpeed'],'Cast Speed':['castSpeed'],'Attack and Cast Speed':['attackSpeed','castSpeed'],'Physical Damage':['physicalDamage'],'Attack Damage':['attackDamage'],'Damage with Attack Skills while Fortified':['fortifiedAttackDamage'],'Fire Damage':['fireDamage'],'Cold Damage':['coldDamage'],'Chaos Damage':['chaosDamage'],'Elemental Damage':['elementalDamage'],'Damage':['damage'],'maximum Life':['life'],'Projectile Damage':['projectileDamage'],'Projectile Speed':['projectileSpeed'],'Accuracy Rating':['accuracy'],'Critical Strike Chance':['critChance'],'Area Damage':['areaDamage'],'Area of Effect':['area'],'Effect':['effect'],'Flask Effect Duration':['flaskDuration'],'Flask Charges gained':['flaskCharges'],'Poison Duration':['poisonDuration'],'Duration of Elemental Ailments on Enemies':['ailmentDuration'],'Effect of Arcane Surge on you':['arcaneEffect'],'Elusive Effect':['elusiveEffect'],'Blind Effect':['blindEffect'],'effect of Non-Curse Auras from your Skills':['auraEffect'],'Effect of your Curses':['curseEffect'],'Totem Placement speed':['totemSpeed'],'Light Radius':['lightRadius'],'Block Recovery':['blockRecovery'],'total Recovery per second from Life Leech':['leechRate'],'Effect of Lightning Ailments':['shockEffect'],'Effect of Cold Ailments':['chillEffect'],'Taunt Duration':['tauntDuration']};
    for(const key of keys[what]||[])add(prefix?prefix+key[0].toUpperCase()+key.slice(1):key,val);
   }
   if((x=s.match(/^\+([\d.]+)% to Fire Damage over Time Multiplier/)))add('fireDot',+x[1]/100);
  }
 }
 modifierCache.set(run,{count:run.classState?.allocatedTreeNodeIds.length,value:m});
 return m;
}
export function classStats(run){
 if(!run.classState)return null;
 const state=run.classState,c=CLASSES.find(c=>c.id===state.classId),m=smallModifiers(run),b=state.combat;
 const strength=c.baseAttributes.strength+state.attributesAllocated.strength*10+m.strength+gear(run,'strength')+(has(run,53884)?50:0);
 const dexterity=c.baseAttributes.dexterity+state.attributesAllocated.dexterity*10+m.dexterity+gear(run,'dexterity');
 const intelligence=c.baseAttributes.intelligence+state.attributesAllocated.intelligence*10+m.intelligence+gear(run,'intelligence')+(has(run,53884)?50:0);
 const maxMana=(34+6*run.level+intelligence/2+gear(run,'mana'))*(1+(m.mana||0)+(has(run,922)?.3:0));
 const mana=maxMana*(1-b.reservedFraction);
 let armour=(gear(run,'armour')+(has(run,13374)&&recent(run,'impaled')?1000:0)+(has(run,42264)?maxMana*b.reservedFraction*.25:0));
 if(has(run,53816))armour+=run.equipment.body?.mods?.armour||0;
 armour*=1+(m.armour||0);
 const energyShield=(gear(run,'energyShield')+(has(run,29825)?(run.equipment.body?.mods?.evasion||0)/8:0)+(has(run,42264)?maxMana*b.reservedFraction*.1:0))*(1+intelligence*.001+(m.energyShield||0));
 let evasion=(15+gear(run,'evasion')+(has(run,29825)?4*(run.equipment.helmet?.mods?.energyShield||0):0))*(1+Math.ceil(dexterity/5)/100+(m.evasion||0));
 let accuracy=(2*run.level+2*dexterity+gear(run,'accuracy')+(has(run,44297)?500+2*strength:0)+(has(run,61072)?1000:0))*(1+(m.accuracy||0));
 if(run.player.ailments?.blind?.until>run.time&&!has(run,5087)){accuracy*=.8;evasion*=.8;}
 if(has(run,47058)&&effectiveChargeCount(run,'frenzy')>=2)accuracy*=1.2;
 const life=(38+12*run.level+strength/2+(has(run,35448)?100:0)+gear(run,'maxHp')+(run.upgrades.vitality||0)*25+(Number(run._bonuses?.maxHp)||0));
 const maxRes=Math.min(.9,.75+gear(run,'maxFireResistance'));
 const fire=clamp(gear(run,'fireResistance')+(m.fireResistance||0)+(m.elementalResistance||0)+(has(run,36017)?.3:0),-.6,maxRes);
 const shared=(has(run,48480)?(gear(run,'fireResistance')+(m.fireResistance||0))*.5:0);
 const otherMax=has(run,32249)?maxRes:.75;
 const cold=clamp(gear(run,'coldResistance')+(m.elementalResistance||0)+shared+(has(run,36017)?.3:0),-.6,Math.min(.9,Math.max(otherMax,.75+gear(run,'maxColdResistance'))));
 const lightning=clamp(gear(run,'lightningResistance')+(m.elementalResistance||0)+shared+(has(run,36017)?.3:0),-.6,Math.min(.9,Math.max(otherMax,.75+gear(run,'maxLightningResistance'))));
 const chaos=clamp(gear(run,'chaosResistance')+(m.chaosResistance||0)+(has(run,25309)?.6:0),-.6,Math.min(.9,.75+gear(run,'maxChaosResistance')));
 return {strength,dexterity,intelligence,life,mana,maxMana,energyShield,evasion,accuracy,armour,fire,cold,lightning,chaos,m};
}
export function refreshClassResources(run,full=false){
 if(!run.classState)return;
 const s=classStats(run),p=run.player;
 p.lightRadius=120*(1+(s.m.lightRadius||0));
 for(const [current,max,value] of [['hp','maxHp',s.life],['mana','maxMana',s.mana],['energyShield','maxEnergyShield',s.energyShield]]){
  const deadLife=current==='hp'&&!full&&(p.hp<=0||run.phase==='dead');
  p[current]=full?value:Math.max(0,Math.min(value,(p[current]||0)+(deadLife?0:Math.max(0,value-(p[max]||0)))));p[max]=value;
 }
}
export function classSummary(run){const s=classStats(run);if(!s)return {uniques:uniqueSummary(run)};const c=run.classState;return {...s,classId:c.classId,className:CLASSES.find(x=>x.id===c.classId).name,ascendancyName:getAscendancies(c.classId).find(a=>a.id===c.ascendancyId)?.name||null,passivePoints:c.passivePoints,ascendancyPoints:c.ascendancyPoints,allocatedNodeIds:[...c.allocatedNodeIds],nextTrial:TRIALS[c.trialsCompleted]??null,charges:{rage:c.combat.rage,power:c.combat.power,frenzy:c.combat.frenzy,endurance:c.combat.endurance},flaskCharges:c.combat.flaskCharges,uniques:uniqueSummary(run)};}
export function allocateAttribute(run,attribute){const c=run.classState;if(!c||!['strength','dexterity','intelligence'].includes(attribute)||c.passivePoints<1||['dead','won'].includes(run.phase))return run;c.passivePoints--;c.attributesAllocated[attribute]++;if(!c.combat.masteries.includes(attribute))c.combat.masteries.push(attribute);refreshClassResources(run);return run;}
export function classLevelUp(run){if(!run.classState)return;run.classState.passivePoints++;refreshClassResources(run);}
export function checkAscendancyTrial(run){const c=run.classState;if(!c||c.trialsCompleted>=TRIALS.length||run.phase!=='playing'||run.player.hp<=0||run.time<TRIALS[c.trialsCompleted])return false;c.trialsCompleted++;c.ascendancyPoints+=2;run.phase='ascendancy';return true;}
export function chooseAscendancy(run,id){const c=run.classState;if(run.phase==='ascendancy'&&c&&!c.ascendancyId&&getAscendancies(c.classId).some(a=>a.id===id)){c.ascendancyId=id;setupArchetype(run);}return run;}
export function finishAscendancy(run){if(run.phase==='ascendancy'&&run.classState){run.phase='playing';run._resumeProgress?.(run);}return run;}
export function chooseAscendancyNode(run,id){const c=run.classState;if(run.phase!=='ascendancy'||!c||!c.ascendancyId)return run;const n=signatureMap.get(c.ascendancyId)?.nodes.find(n=>n.nodeId===String(id));if(!n||c.allocatedNodeIds.includes(String(id)))return run;const route=path(n,run);if(!route)return run;const missing=route.filter(i=>!c.allocatedTreeNodeIds.includes(i));const cost=missing.filter(payable).length;if(c.ascendancyPoints<cost)return run;c.ascendancyPoints-=cost;for(const i of missing){c.allocatedTreeNodeIds.push(i);if(allNodes.has(i))c.allocatedNodeIds.push(i);for(const stat of tree.nodes[i]?.stats||[]){const m=stat.match(/^Grants (\d+) Passive Skill Point/);if(m)c.passivePoints+=Number(m[1]);}}setupArchetype(run);refreshClassResources(run);return finishAscendancy(run);}
function setupArchetype(run){
 const c=run.classState,b=c.combat;
 // Survivor starting gear enables conditions that otherwise require the full PoE item/skill system.
 const defaults={weapon:{id:'class-weapon',name:'Оружие изгнанника',slot:'weapon',rarity:'normal',icon:'⚒',mods:{leech:.01,poisonChance:.15,powerChargeChance:.1,frenzyChargeOnKill:.1}},body:{id:'class-body',name:'Доспех изгнанника',slot:'body',rarity:'normal',icon:'♜',mods:{armour:80,evasion:80,energyShield:12,fireResistance:.15,maxFireResistance:.01}},flask:{id:'class-flask',name:'Магический флакон',slot:'flask',rarity:'magic',icon:'◉',utility:true,mods:{speed:.1}},helmet:{id:'class-helmet',name:'Шлем изгнанника',slot:'helmet',rarity:'normal',mods:{energyShield:10}},shield:{id:'class-shield',name:'Щит изгнанника',slot:'shield',rarity:'normal',mods:{block:.2}}};
 for(const [slot,item] of Object.entries(defaults)){if(slot==='shield'&&(run.equipment.offhand||run.equipment.weapon?.twoHanded))continue;if(!run.equipment[slot])run.equipment[slot]={...item,mods:{...item.mods},description:'Стартовые характеристики нашего survivor-режима; не оригинальный предмет PoE.'};}
 if(c.ascendancyId==='Raider'&&run.equipment.weapon.id==='class-weapon')Object.assign(run.equipment.weapon.mods,{addedFire:5,addedCold:5,addedLightning:5});
 if(has(run,42264))b.reservedFraction=.5;
 if(has(run,46479)&&!run.mercenary)run.mercenary={id:run._nextId++,kind:'mercenary',x:run.player.x+35,y:run.player.y,hp:150,maxHp:150,shotTimer:0,equipment:{},recoup:[],radius:12,color:'#e4c58c'};
 if(has(run,4494)&&!run.sentinel)run.sentinel={id:run._nextId++,kind:'sentinel',level:20,x:run.player.x+35,y:run.player.y,hp:200,maxHp:200,shotTimer:0};
}
export function classBaseModifiers(run){
 if(!run.classState)return {speed:1,regen:0};const s=classStats(run),b=run.classState.combat;
 let speed=1+stolenStat(run,'speed')+(s.m.speed||0)+(has(run,5819)?.1:0)+(has(run,3184)&&recent(run,'killed',20)?.1:0)+(b.adrenalineUntil>run.time?.25:0);
 if(has(run,24848)||has(run,34567))speed*=1+.08*(1+(has(run,24848)?b.gale*.1:0));
 if(b.elusive>0)speed+=.3*b.elusive;
 speed+=onslaughtIncrease(run);
 let regen=run.player.maxHp*(s.m.regen||0);
 if(has(run,39790)&&run._stationary>0)regen+=run.player.maxHp*.05;
 if(has(run,17988))regen+=b.prevented.filter(x=>run.time-x.time<10).reduce((n,x)=>n+x.damage,0)*.015;
 if(has(run,55146)&&run.time%4<1)regen+=run.player.maxHp;
 if(has(run,17988))regen*=1.4;
 const lifeLoss=has(run,57560)&&b.rage>0&&!b.losingRage?run.player.maxHp*.001*b.rage:0;
 speed*=classActionSpeed(run);
 return {speed,regen,lifeLoss};
}
function classActionSpeed(run){
 const a=run.player.ailments||{};
 if(has(run,5819)||has(run,35448))return 1;
 if(run.classState.combat.blockUntil>run.time)return 0;
 const stunImmune=has(run,61072);
 if(a.stun?.until>run.time&&!stunImmune)return 0;
 if(a.freeze?.until>run.time&&!has(run,47630))return has(run,23225)?.9:0;
 // Ice Storm uses the same chill immunity and action-speed floor; local magnitude is 25%.
 const chill=Math.max(a.chill?.until>run.time?a.chill.effect:0,run.player.chillUntil>run.time?.25:0);
 let speed=!has(run,61072)&&!has(run,47630)?1-chill:1;
 const curse=run.player.curses?.filter(c=>c.until>run.time).reduce((v,c)=>Math.max(v,c.effect),0)||0;
 speed*=1-curse*(has(run,39790)&&run._stationary>0?.5:1);
 return has(run,23225)?Math.max(.9,speed):speed;
}
export function classSkillModifiers(run,id,values,ally=run.player){
 if(!run.classState)return values;
 if(id==='minion'){
  const buffs=classAllyStats(run,{...ally,kind:'minion'}),m=smallModifiers(run),b=run.classState.combat;
  values.damage*= (1+buffs.damageIncrease)*buffs.moreDamage;
  values.cooldown/=Math.max(.001,(1+buffs.castRate)*buffs.actionSpeed);
  values.area*=Math.sqrt(1+((has(run,11490)||has(run,10099))&&recent(run,'consumed')?.3:0));
  Object.assign(values,{damageType:'physical',skillId:id,isMinion:true,actor:{kind:'minion',id:ally.id,ownerId:'player'},chain:0,projectileSpeed:1});return values;
 }
 const s=classStats(run),m=s.m,b=run.classState.combat,attack=id==='lightning',minion=id==='minion',physical=['orbit','lightning','minion'].includes(id),elemental=['bolt','nova'].includes(id),projectile=['bolt','lightning','minion'].includes(id);
 let increased=(m.damage||0)+(physical?(m.physicalDamage||0):0)+(elemental?(m.elementalDamage||0):0)+(id==='bolt'?(m.coldDamage||0):id==='nova'?(m.fireDamage||0):0)+(attack?(m.attackDamage||0):0)+(projectile?(m.projectileDamage||0):0)+(m.areaDamage||0)+(has(run,36017)?.3:0);
 if(minion)increased=(m.minionDamage||0)+(has(run,10099)?.3:0)+(has(run,36017)?.3:0);
 const spellIncrease=(m.spellDamage||0)+gear(run,'spellDamage');
 increased+=attack?spellIncrease*Math.max(0,gear(run,'arcaneMight')):spellIncrease;
 increased+=(physical?gear(run,'physicalDamage'):0)+(elemental?gear(run,'elementalDamage'):0)+(id==='bolt'?gear(run,'coldDamage'):id==='nova'?gear(run,'fireDamage'):0);
 if(recent(run,'shocked'))increased+=gear(run,'recentShockDamage');
 if(run.player.ailments.ignite?.until>run.time)increased+=gear(run,'ignitedDamage');
 if(attack&&has(run,31700))increased+=m.fortifiedAttackDamage||0;
 if(has(run,61072))increased+=effectiveChargeCount(run,'endurance')*.05;
 if(has(run,922))increased+=((m.mana||0)+.3)*.3;
 if(!minion&&b.adrenalineUntil>run.time)increased+=1;
 if(!minion)increased+=stolenStat(run,'damage')+(elemental?nebulisIncrease(run,s):0);
 let more=has(run,59920)&&!minion?1.4:1;
 if(!minion)more*=1+effectiveChargeCount(run,'frenzy')*.04;
 if(has(run,47630)&&id==='bolt')more*=1.15;
 if(has(run,54159)&&minion)more*=1.1;
 if(!minion&&has(run,62817)&&recent(run,'killed'))more*=1.1;
 if(!minion&&has(run,55867))more*=1+.02*b.masteries.length;
 if(!minion&&has(run,19083)&&run.enemies.filter(e=>e.hp>0&&(e.elite||e.kind==='boss')&&nearby(run,e)).length<=1)more*=1.25;
 if(has(run,11490)&&run.corpses.some(e=>nearby(run,e)))more*=1.1;
 if(has(run,40510)&&b.arcaneUntil>run.time&&!attack&&!minion&&ally.kind!=='totem')more*=1+.2*(1+(m.arcaneEffect||0));
 if(b.unboundUntil>run.time&&elemental)more*=2;
 if(attack&&b.rage>0)more*=1+b.rage*.01*(has(run,57560)?1.5:1);
 const baseIncrease=(run.upgrades.might||0)*.2+(Number(run._bonuses?.damage)||0)+gear(run,'damage')-stolenStat(run,'damage');
 values.increasedDamageTotal=baseIncrease+increased;
 values.damage*=Math.max(0,1+baseIncrease+increased)/(1+baseIncrease)*more;
 if(attack&&run.equipment.weapon?.localModifiers)values.damage*=1+(run.equipment.weapon.localModifiers.physicalDamage||0);
 let rate=(attack?(m.attackSpeed||0):(m.castSpeed||0))+(has(run,36017)?.03*b.auras*(1+(m.auraEffect||0)):0)+(has(run,10099)?.02*b.auras*(1+(m.auraEffect||0)):0)+(has(run,10099)&&b.offeringUntil>run.time?.1:0);
 if(attack){values.cooldown/=1+(run.equipment.weapon?.localModifiers?.attackSpeed||0);rate+=(has(run,44297)?Math.floor(s.accuracy/150)*.01:0)+(has(run,24528)?b.rage*.01*(has(run,57560)?1.5:1):0)+(has(run,3184)&&recent(run,'rareKilled',20)?.1:0);}
 if(b.arcaneUntil>run.time&&!attack&&!minion)rate+=.2*(1+(m.arcaneEffect||0));
 if(!minion&&b.adrenalineUntil>run.time)rate+=.25;
 if(!attack&&!minion)rate+=gear(run,'castSpeed');
 if(!minion)rate+=effectiveChargeCount(run,'frenzy')*.04+onslaughtIncrease(run);
 if(minion&&b.offeringUntil>run.time)rate+=.2;
 const dualWield=!!run.equipment.offhand&&!run.equipment.shield&&attack;
 if(dualWield)values.cooldown/=1+(has(run,8419)?.2:.1);
 const tailwind=ally.kind==='totem'?classAllyStats(run,ally).actionSpeed:(has(run,24848)||has(run,34567))?1+.08*(1+(has(run,24848)?b.gale*.1:0)):1;
 if(id!=='nova')values.cooldown/=Math.max(.1,1+rate)*(has(run,51462)?1.5:1)*tailwind*Math.max(.001,ally.kind==='totem'?1:classActionSpeed(run));
 values.area*=Math.sqrt(1+(!minion?gear(run,'uniqueArea'):0)+(m.area||0)+((has(run,11490)||has(run,10099))&&recent(run,'consumed')?.3:0));
 if(projectile)values.projectiles+=(has(run,26067)?2:0)+(has(run,34567)?1:0);
 values.chain=projectile?((has(run,61627)?1:0)+(has(run,36072)?1:0)):0;
 values.projectileSpeed=1+(m.projectileSpeed||0);
 const power=effectiveChargeCount(run,'power');
 if(id!=='nova'){
  values.critChance=Math.max(values.critChance,attack&&has(run,17315)?.08:attack&&run.equipment.weapon?.localBase?.critChance?run.equipment.weapon.localBase.critChance*(1+(run.equipment.weapon.localModifiers?.critChance||0)):.05)+(has(run,43122)?.0075:0)+(has(run,40276)?.003*power:0);
  values.critChance*=1+(m.critChance||0)+power*.5+(has(run,53884)?Math.min(s.strength,s.intelligence)*.01:0);
  values.critMultiplier+=(m.critMultiplier||0)+(has(run,40276)?.08*power:0)+(has(run,47058)&&effectiveChargeCount(run,'frenzy')===0?1:0)+(has(run,17315)?Math.min(1,run.enemies.filter(e=>e.hp>0&&nearby(run,e)).length*.1):0);
 }
 if(id!=='nova'){
  const mainTypedIncrease=(physical?(m.physicalDamage||0)+gear(run,'physicalDamage'):0)+(elemental?(m.elementalDamage||0)+gear(run,'elementalDamage')+nebulisIncrease(run,s):0)+(id==='bolt'?(m.coldDamage||0)+gear(run,'coldDamage'):id==='nova'?(m.fireDamage||0)+gear(run,'fireDamage'):0);
  const sharedIncrease=baseIncrease+increased-mainTypedIncrease;
  values.components={[attack?'physical':id==='bolt'?'cold':'physical']:values.damage};
  for(const type of ['fire','cold','lightning']){
   const added=gear(run,(attack?'added':'addedSpell')+type[0].toUpperCase()+type.slice(1));
   if(added)values.components[type]=(values.components[type]||0)+added*Math.max(0,1+sharedIncrease+(attack?gear(run,'elementalAttackDamage'):0)+(m.elementalDamage||0)+gear(run,'elementalDamage')+(m[type+'Damage']||0)+gear(run,type+'Damage')+nebulisIncrease(run,s))*more*(b.unboundUntil>run.time&&!elemental?2:1);
  }
  values.damage=Object.values(values.components).reduce((a,b)=>a+b,0);
 }
 values.damageType=id==='bolt'?'cold':id==='nova'?'fire':'physical';values.skillId=id;values.isAttack=attack;values.isMinion=minion;
 return values;
}

export function classIncomingDamage(run,damage,{type='physical',hit=true,spell=false,area=false,enemy=null,random=()=>rng(run),reflected=false,critical=false,melee=true,components=null,cannotBlock=false,selfHit=false,sourceId=null}={}){
 if(!run.classState){
  const dexterity=rawGear(run,'dexterity');
  const evasion=dexterity>0?15*(1+Math.ceil(dexterity/5)/100):0;
  if(hit&&!spell&&random()<evasion/(evasion+(enemy?.accuracy||100)*10))return 0;
  const r=legacyResistances(run),converted=type==='physical'?damage*rawGear(run,'physicalTakenAsFire'):0;
  reflectMelee(run,enemy,{hit,spell,reflected,melee});
  const physicalReduction=combatState(run).adrenalineUntil>run.time?.1:0;
  const armour=hit?rawGear(run,'armour')+stolenStat(run,'armour'):0;
  const physical=(damage-converted)*(1-Math.min(.9,armour/(armour+5*Math.max(.001,damage-converted))));
  return type==='physical'?physical*(1-physicalReduction)+converted*(1-r.fire):damage*(1-(r[type]||0));
 }
 const s=classStats(run),b=run.classState.combat,p=run.player;
 const incoming={...(components||{[type]:damage})};const total=Object.values(incoming).reduce((a,b)=>a+b,0);
 for(const key of Object.keys(incoming))incoming[key]*=total?damage/total:0;
 if(reflected&&(has(run,19083)||has(run,43122)||(type==='physical'&&has(run,62817))))return 0;
 if(critical&&b.elusive>0&&has(run,28782))critical=false;
 if(critical)damage*=Math.max(1,1.5-(has(run,17315)&&enemy&&nearby(run,enemy)?.3:0));
 let block=(spell?gear(run,'spellBlock'):gear(run,'block'))+(spell&&has(run,40276)?effectiveChargeCount(run,'power')*.03:0)+(spell?0:s.m.block||0);
 if(!spell&&run.equipment.offhand&&!run.equipment.shield)block+=has(run,8419)?.4:.2;
 if(!spell&&has(run,8419)&&run.equipment.shield)block=.5+(s.m.block||0);
 if(has(run,39728)&&recent(run,spell?'cast':'attacked'))block+=.25;
 if(!spell&&gear(run,'cannotBlockAttacks'))block=0;
 if(hit&&!cannotBlock&&!selfHit&&random()<Math.min(.75,block)){b.blockUntil=run.time+.35/(1+(s.m.blockRecovery||0));p.energyShield=Math.min(p.maxEnergyShield,p.energyShield+s.armour*gear(run,'aegisRecovery'));return 0;}
 if(hit&&!selfHit&&random()<.15*(b.elusive||0))return 0;
 // Adapted accuracy/evasion: spells never miss; Kaom's Roots explicitly disables attack evasion.
 if(hit&&!spell&&!selfHit&&!has(run,35448)){
  const accuracy=(enemy?.accuracy||100)*(enemy?.blindUntil>run.time?1-(enemy.blindEffect||.2):1);
  if(random()<s.evasion/(s.evasion+accuracy*10))return 0;
 }
 if(has(run,59920))damage*=1.1;
 if(has(run,31700)&&hit)damage*=.8;
 if(has(run,28884)&&((run.time%10<5&&hit)||(run.time%10>=5&&!hit)))damage*=.5;
 if(has(run,47778)&&area&&hit&&random()<.3)damage*=.5;
 if(has(run,19083)&&run.enemies.filter(e=>e.hp>0&&(e.elite||e.kind==='boss')&&nearby(run,e)).length>=2)damage*=.65;
 if(has(run,5087)&&enemy&&(enemy.blindUntil>run.time||nearby(run,enemy)))damage*=.85;
 if(has(run,47630)&&enemy?.chill>0&&hit)damage*=.9;
 if(has(run,11490)&&run.corpses.some(c=>nearby(run,c))&&enemy&&nearby(run,enemy))damage*=.9;
 if(has(run,10143)&&b.leech.length)damage*=.9;

 if(enemy?.chill>0&&has(run,40810))damage*=1-(enemy.chillEffect||.25)/2;
 if(enemy?.hinderedUntil>run.time&&!hit&&has(run,25309))damage*=.85;
 const conversion=Math.min(1,gear(run,'physicalTakenAsFire')+(enemy?.igniteUntil>run.time&&(!enemy.igniteActor||['player','totem'].includes(enemy.igniteActor.kind))&&has(run,53123)?.4:0));
 const mitigatedScale=total?damage/total:0,portions=[];
 for(const [kind,raw] of Object.entries(components||{[type]:total})){
  const amount=raw*mitigatedScale;
  if(kind==='physical'&&conversion)portions.push({type:'physical',amount:amount*(1-conversion)},{type:'fire',amount:amount*conversion});
  else portions.push({type:kind,amount});
 }
 damage=portions.reduce((sum,part)=>{
  let amount=part.amount;
  if(has(run,40059)&&elementalType(part.type)&&enemy&&nearby(run,enemy))amount*=.92;
  if(part.type==='physical'||(part.type==='chaos'&&has(run,53816))){
   const armour=hit?s.armour*(part.type==='chaos'?.15:1):0;
   const before=amount;amount*=1-Math.min(.9,armour/(armour+5*Math.max(.001,amount)));
   if(part.type==='physical'){
    const endurance=effectiveChargeCount(run,'endurance');
    amount*=1-Math.min(.9,endurance*.04+(b.adrenalineUntil>run.time?.1:0)+(has(run,14603)?Math.min(.1,run.minions.filter(m=>m.hp>0).length*.01):0));
    if(hit)b.prevented.push({time:run.time,damage:before-amount});
   }
  }
  if(part.type!=='physical')amount*=1-(s[part.type]||0);
  return sum+amount;
 },0);
 if(!selfHit)reflectMelee(run,enemy,{hit,spell,reflected,melee});
 if(p.ailments.shock?.until>run.time&&!gear(run,'unaffectedByShock'))damage*=1+(p.ailments.shock.effect||.1);
 if(hit){
  b.lastHit=run.time;b.rageHit=run.time;
  if(gear(run,'daresso')){const count=effectiveChargeCount(run,'endurance');if(count>0)b.onslaughtUntil=run.time+5*count;b.endurance=0;}

  if(!selfHit&&(incoming.fire||0)>0&&!has(run,48480))p.ailments.ignite={until:run.time+3,dps:damage*.08};
  if(!selfHit&&(incoming.cold||0)>0&&!has(run,47630)&&!has(run,61072))p.ailments.chill={until:run.time+2,effect:.25};
  if(!selfHit&&enemy?.kind==='knight'&&!has(run,5819)&&!has(run,35448)&&!has(run,61072))p.ailments.stun={until:run.time+.25};
  if(!selfHit&&enemy?.kind==='knight'&&!has(run,35448)){const angle=Math.atan2(p.y-enemy.y,p.x-enemy.x);p.x+=Math.cos(angle)*20;p.y+=Math.sin(angle)*20;}
  if(!selfHit&&enemy?.kind==='bat'){p.ailments.bleed={until:run.time+3,dps:damage*.04,enemyId:enemy.id};if(!has(run,5087))p.ailments.blind={until:run.time+2};}
  if(!selfHit&&enemy?.kind==='cultist')p.curses=[{until:run.time+4,effect:.15}];
  if(run.mercenary?.hp>p.hp&&has(run,1564)){const share=Math.min(run.mercenary.hp,damage*.2);run.mercenary.hp-=share;damage-=share;}
  if(run.sentinel?.hp>0&&has(run,4494)){const share=Math.min(run.sentinel.hp,damage*.2);run.sentinel.hp-=share;damage-=share;}
 }
 const shield=Math.min(p.energyShield,damage);p.energyShield-=shield;damage-=shield;
 if(has(run,922)){const mana=Math.min(p.mana,damage*.1);p.mana-=mana;damage-=mana;}
 if(has(run,27604)&&p.hp-damage>0&&p.hp-damage<=p.maxHp*.5&&p.hp>p.maxHp*.5&&!(b.adrenalineUntil>run.time)){
  b.adrenalineUntil=run.time+20;b.pendingRecovery=p.maxHp*.25;p.ailments={};p.curses=[];
 }
 return Math.max(0,damage);
}
function leech(run,amount){
 if(!(amount>0))return;
 const b=run.classState.combat,instant=has(run,29630)?.3:0;
 heal(run,amount*instant);b.leech.push({remaining:Math.min(run.player.maxHp*(has(run,10143)?.2:.1),amount*(1-instant)),rate:run.player.maxHp*.02*(1+(classStats(run).m.leechRate||0))});b.leech=b.leech.slice(-100);
}
// Hit and ailment ownership stay with the acting entity; kill attribution is classified separately.
export function classActor(context={}){return context.actor||{kind:context.isTotem?'totem':context.isMinion?'minion':'player',ownerId:'player'};}
export function classKillActor(context={}){
 const actor=classActor(context);
 // The source-backed ignite kill exception does not change hits, poison or the ailment owner.
 return context.isDot&&context.ailment==='ignite'&&actor.ownerId==='player'&&['minion','totem','proxy'].includes(actor.kind)?{kind:'player',ownerId:'player'}:actor;
}
export function actorOrigin(run,actor){return actor.kind==='player'?run.player:[...run.minions,run.mercenary,run.sentinel,...(run.totems||[]),...(run.mercenaryMinions||[])].find(a=>a?.id===actor.id);}
const elementalType=t=>['fire','cold','lightning'].includes(t);
export function classHit(run,enemy,damage,context={}){
 const actor=classActor(context),personal=actor.kind==='player',skillOwner=personal||actor.kind==='totem'||actor.kind==='proxy';
 const mercenary=actor.kind==='mercenary'?actorOrigin(run,actor):null;
 const itemOwner=skillOwner||!!mercenary,itemGear=key=>mercenary?allyGear(mercenary,key):skillOwner?gear(run,key):0;
 const {type='physical',isAttack=false,isDot=false,area=true,travel=0,chained=false}=context;
 const random=context.random||(()=>rng(run));
 const s=classStats(run),m=s?.m||{},b=run.classState?.combat||{},own=id=>skillOwner&&has(run,id);
 const pieces={...(context.components||{[type]:damage})};
 const total=Object.values(pieces).reduce((a,b)=>a+b,0),scale=total?damage/total:0;
 for(const key of Object.keys(pieces))pieces[key]*=scale;
 if(!isDot&&skillOwner&&enemy.elite){const extra=run.classState?gear(run,'rareHitDamage'):rawGear(run,'rareHitDamage');for(const key of Object.keys(pieces))pieces[key]*=1+extra/(1+(context.increasedDamageTotal||0));}
 if(!isDot&&has(run,13374)&&enemy.impales?.length&&(personal||actorOrigin(run,actor)&&nearby(run,actorOrigin(run,actor))))pieces.physical=(pieces.physical||0)+(6+random()*6)*enemy.impales.length;
 if(skillOwner&&!isDot){
  if(context.secondary){for(const key of Object.keys(pieces))pieces[key]*=Math.max(0,1+gear(run,'damage')+(run.upgrades.might||0)*.2+(Number(run._bonuses?.damage)||0)+(m.damage||0)+(m.areaDamage||0)+gear(run,'areaDamage')+(m[key+'Damage']||0)+gear(run,key+'Damage')+(elementalType(key)?(m.elementalDamage||0)+gear(run,'elementalDamage')+nebulisIncrease(run,s):0)+(recent(run,'shocked')?gear(run,'recentShockDamage'):0)+(run.player.ailments.ignite?.until>run.time?gear(run,'ignitedDamage'):0));}
 }
 if(mercenary&&context.secondary&&!isDot){const buffs=classAllyStats(run,mercenary);for(const type of Object.keys(pieces))pieces[type]*=(1+buffs.damageIncrease+(elementalType(type)?buffs.elementalDamage:0))*buffs.moreDamage;}
 if(itemOwner&&!isDot)pieces.chaos=(pieces.chaos||0)+(pieces.physical||0)*itemGear('physicalExtraChaos');
 // Extra chaos is derived before target resistance, not from the mitigated hit.
 if(own(36072)&&chained)pieces.chaos=(pieces.chaos||0)+Object.entries(pieces).reduce((n,[t,d])=>n+(t==='chaos'?0:d*.2),0);
 let critical=false;
 if(!isDot){
  if(isAttack&&mercenary){const accuracy=classAllyStats(run,mercenary).accuracy,evasion=(enemy.evasion||5)*(enemy.blindUntil>run.time?1-(enemy.blindEffect||.2):1);if(random()>clamp(accuracy/(accuracy+evasion),.05,1))return 0;}
  if(isAttack&&skillOwner&&run.classState){if(personal)b.attacked=run.time;const evasion=(enemy.evasion||5)*(enemy.blindUntil>run.time?1-(enemy.blindEffect||.2):1);if(!(own(56967)&&enemy.tauntUntil>run.time)&&random()>clamp(s.accuracy/(s.accuracy+evasion),.05,1))return 0;}
  else if(personal&&run.classState&&!context.secondary)b.cast=run.time;
  let chance=context.critChance??(context.secondary?0:.05);if(own(21264)&&enemy.hp>enemy.maxHp*.5)chance*=2;
  critical=context.critical??random()<Math.min(1,chance);
  if(critical&&mercenary&&itemGear('frenzyOnCrit')){const combat=mercenary.combat;combat.frenzy=Math.min(3,(combat.frenzy||0)+1);combat.frenzyUntil=run.time+10;}
  if(critical&&personal&&run.classState){
   if(gear(run,'frenzyOnCrit')&&enemy.hp>0){b.frenzy=Math.min(maxChargeCount(run,'frenzy'),b.frenzy+1);b.frenzyUntil=run.time+10;}
   if((has(run,43122)&&random()<.1)||random()<gear(run,'powerChargeChance')){b.power=Math.min(has(run,25651)?4:3,b.power+1);b.powerUntil=run.time+10;}
   if(!(b.elusive>0)&&(has(run,28782)||(has(run,43122)&&random()<.1)))b.elusive=1+(has(run,28782)?1:0)+(m.elusiveEffect||0);
  }
  if(skillOwner&&!context.secondary&&has(run,40510)&&!isAttack)b.arcaneUntil=run.time+4;
  if(skillOwner&&gear(run,'asenath'))applyTemporalChains(run,enemy,actor,1+(m.curseEffect||0));
  if(own(5087)){setEnemyTimer(run,enemy,'blindUntil',run.time+4);enemy.blindEffect=.2*(1+(m.blindEffect||0));}
  if(own(56967))setEnemyTimer(run,enemy,'tauntUntil',run.time+3*(1+(m.tauntDuration||0)));
  if(own(27604)&&enemy.hp===enemy.maxHp)enemy.intimidated=true;
  if(personal&&isAttack&&m.rageOnHit&&run.time-(b.rageGained??-1e9)>=.5){b.rage=Math.min(30,b.rage+m.rageOnHit);b.rageGained=run.time;}
 }
 let offensive=1;
 if(own(47778)&&area&&!isDot&&random()<.3)offensive*=1.5;
 const travelMore=own(45313)&&context.projectile&&!context.prepared?1+.3*Math.min(1,travel/600):1;
 offensive*=travelMore;
 if(own(62817)&&enemy.kind==='boss')offensive*=1.2;
 if(own(758)&&(enemy.elite||enemy.kind==='boss'))offensive*=1+Math.min(1,(enemy.presence||0)*.01);
 // Ailment bases exclude hit-only critical, resistance and damage-taken stages.
 // Far Shot explicitly affects ailments; snapshot its travel multiplier once, before live target mitigation.
 const ailmentBase=Object.fromEntries(Object.entries(pieces).map(([type,amount])=>[type,amount*travelMore]));
 const criticalMultiplier=critical?(context.critMultiplier??1.5)+(own(21264)&&enemy.hp<=enemy.maxHp*.5?1:0):1;
 let taken=1;
 if(enemy.tauntUntil>run.time&&has(run,56967))taken*=1.15;
 if(enemy.intimidated&&isAttack&&!isDot)taken*=1.1;
 taken*=1+(enemy.shockUntil>run.time?enemy.shockEffect||0:0)+gear(run,'yokeTaken')*ownedAilmentTypes(run,enemy).length+(run.mercenary?allyGear(run.mercenary,'yokeTaken')*ownedAilmentTypes(run,enemy,run.mercenary).length:0);
 if(enemy.marked)taken*=1+.1*(has(run,34567)?1.25:1);
 if(has(run,39790)&&run._stationary>0&&nearby(run,enemy))taken*=1.15;
 const dealtComponents={};
 damage=Object.entries(pieces).reduce((sum,[component,base])=>{
  let value=base*offensive*criticalMultiplier*taken;
  if(component==='physical'&&!isDot&&enemy.armour)value*=1-Math.min(.9,enemy.armour/(enemy.armour+5*Math.max(.001,value)));
  if(elementalType(component)&&has(run,40059)&&nearby(run,enemy))value*=1.16;
  let resistance=enemy.resistances?.[component]||0;
  if(has(run,27096)&&['cold','chaos'].includes(component)&&nearby(run,enemy))resistance-=.2;
  if(has(run,61355)&&component==='fire'&&isDot&&run._stationary>0&&nearby(run,enemy))resistance=-.2;
  if(enemy.exposure?.type===component&&enemy.exposure.until>run.time)resistance-=enemy.exposure.amount;
  if(enemy.scorchUntil>run.time&&elementalType(component))resistance-=.15*(enemy.scorchStacks||1);
  if(component!=='physical'){
   if(own(48214)&&elementalType(component)&&!isDot)resistance=critical?0:resistance-.1;
   value*=1-clamp(resistance,-2,.9);
  }
  if(component==='chaos')value*=(skillOwner&&!context.prepared&&!context.secondary?(1+(m.chaosDamage||0))*(has(run,25309)?1.15:1):1)*(1+(enemy.witherStacks||0)*.06*(has(run,40813)?1.5:1));
  dealtComponents[component]=value;return sum+value;
 },0);
 if(context.preventDamage&&!isDot)damage=0;
 if(isDot||!run.classState)return damage;
 if(own(40813)&&random()<.25){enemy.witherStacks=Math.min(15,(enemy.witherStacks||0)+1);setEnemyTimer(run,enemy,'witherUntil',run.time+2);}
 const largest=Object.entries(pieces).sort((a,b)=>b[1]-a[1])[0]?.[0]||type;
 if(own(61259)&&elementalType(largest)){enemy.exposure={type:largest,amount:.35,until:run.time+4,appliedAt:run.time};b.exposed=run.time;}
 if(!(damage>0))return 0;
 if(enemy.reflect&&skillOwner&&!context.noReflect){const reflected=classIncomingDamage(run,damage*enemy.reflect,{type,components:dealtComponents,reflected:true,random});run.player.hp=Math.max(0,run.player.hp-reflected);classAfterPlayerHit(run);}
 const storedImpale=(ailmentBase.physical||0)*.1;
 if(enemy.impales?.length){for(const impale of enemy.impales){damage+=impale.damage;impale.hits--;}enemy.impales=enemy.impales.filter(i=>i.hits>0);}
 if(skillOwner&&isAttack&&(m.impale||0)>random()){enemy.impales||=[];enemy.impales.push({damage:storedImpale,hits:has(run,13374)?6:5});b.impaled=run.time;}
 if(skillOwner&&isAttack&&random()<(m.bleed||0)){rememberBleed(enemy,run.time);setEnemyTimer(run,enemy,'bleedUntil',run.time+5*Math.max(.01,1+gear(run,'ailmentDuration')));enemy.bleedBase=(ailmentBase.physical||0)*.7;enemy.bleedAggravated=has(run,15616);enemy.bleedDps=enemy.bleedBase*(enemy.bleedAggravated||enemy.moving&&!(enemy.freezeUntil>run.time)?3:1);enemy.bleedActor=actor;}
 const poisonChance=skillOwner?(m.poison||0)+gear(run,'poisonChance'):(context.poisonChance||0);
 const poisonBase=(ailmentBase.physical||0)+(ailmentBase.chaos||0);
 if(poisonBase&&random()<poisonChance){
  if(personal){b.poisons=b.poisons.filter(t=>run.time-t<4);b.poisons.push(run.time);}
  const duration=2*Math.max(.01,1+(skillOwner?gear(run,'ailmentDuration')+(m.poisonDuration||0):0)+(own(19598)?Math.min(1,b.poisons.length*.05):0));
  let dps=poisonBase*.3*(own(19598)&&critical?1.2:1)*(skillOwner?1+(m.chaosDamage||0):1)*(own(25309)?1.15:1);
  if(own(1697)&&b.flaskUntil>run.time&&random()<.2)dps*=2;
  (enemy.poisons||=[]).push({dps,until:run.time+duration,appliedAt:run.time,actor});enemy.poisons=enemy.poisons.slice(-100);
 }
 const unbound=skillOwner&&b.unboundUntil>run.time;
 const ignite=own(53123)||unbound||((ailmentBase.fire||0)>0&&(critical||random()<(itemOwner?(skillOwner?m.ignite||0:0)+itemGear('igniteChance'):context.igniteChance||0)));
 const shock=!context.cannotShock&&(own(27038)||unbound||(((ailmentBase.lightning||0)+(itemOwner&&itemGear('elementalCanShock')?(ailmentBase.fire||0)+(ailmentBase.cold||0):0))>0&&(critical||random()<(itemOwner?(skillOwner?m.shock||0:0)+itemGear('shockChance'):0)))||(own(31364)&&random()<(m.shock||0)));
 const chill=own(40810)||(ailmentBase.cold||0)>0;
 const freeze=unbound||((ailmentBase.cold||0)>0&&(critical||random()<(skillOwner?m.freeze||0:0)));
 const inflicted=[],durationScale=Math.max(.01,1+(skillOwner?m.ailmentDuration||0:0)+itemGear('ailmentDuration'));
 if(ignite){
  if(own(33645)){enemy.scorchStacks=Math.min(2,(enemy.scorchStacks||0)+1);setEnemyTimer(run,enemy,'scorchUntil',run.time+4*durationScale);enemy.scorchActor=actor;inflicted.push('scorch');}
  else {const dps=(own(53123)||unbound?Object.values(ailmentBase).reduce((a,b)=>a+b,0):ailmentBase.fire||0)*.9*(skillOwner?1+(m.fireDot||0):1);applyAilment(enemy,'ignite',{power:dps,actor,until:run.time+4*(durationScale+(skillOwner?gear(run,'igniteDuration'):0))},run.time);inflicted.push('ignite');if(personal)eyeIgnited(run,random);else if(mercenary&&itemGear('eyeSelfHit'))classAllyDamage(run,mercenary,itemGear('eyeSelfHit'),{type:'fire',selfHit:true,cannotBlock:true,random});}
 }
 if(shock){if(personal)b.shocked=run.time;let power;if(own(31364)){enemy.shockStacks=Math.min(50,(enemy.shockStacks||0)+1);power=.02*enemy.shockStacks;}else power=(own(27038)?.25:.1)*(1+(skillOwner?(m.shockEffect||0)+gear(run,'shockEffect'):0));applyAilment(enemy,'shock',{power,actor,until:run.time+2*durationScale},run.time);inflicted.push('shock');}
 if(chill){enemy.chillAppliedAt=run.time;enemy.chillActor=actor;enemy.chill=2*durationScale;enemy.chillEffect=own(40810)?Math.min(.4,.25*(1+(m.chillEffect||0))):.25;inflicted.push('chill');}
 if(freeze){
  if(enemy.hoarfrostUntil<=run.time)enemy.hoarfrost=0;
  // Freeze threshold is adapted to survivor life totals; original Warden minimum is two seconds.
  const duration=(unbound?Object.values(ailmentBase).reduce((a,b)=>a+b,0):ailmentBase.cold||0)/enemy.maxHp*6*(1+(enemy.hoarfrost||0)*.2)*durationScale;
  if(duration>.3||unbound){setEnemyTimer(run,enemy,'freezeUntil',run.time+Math.max(own(16848)?2:0,Math.min(3*durationScale,duration)));enemy.hoarfrost=0;enemy.freezeActor=actor;inflicted.push('freeze');}
  else if(own(16848)){enemy.hoarfrost=(enemy.hoarfrost||0)+1;setEnemyTimer(run,enemy,'hoarfrostUntil',run.time+10);}
 }
 if(own(55509)&&!unbound){for(const ailment of inflicted){if(run.time-(b[`fury_${ailment}`]??-1e9)>=.2){b.fury++;b[`fury_${ailment}`]=run.time;}}if(b.fury>=100){b.fury=0;b.unboundUntil=run.time+10;}}
 if(personal){
  leech(run,damage*((isAttack?(m.leech||0)+gear(run,'attackLeech'):0)+gear(run,'leech')));
  if(isAttack&&gear(run,'attackManaLeech'))(b.manaLeech||=[]).push({remaining:damage*gear(run,'attackManaLeech'),rate:run.player.maxMana*.02});
  if(run.player.ailments.ignite?.until>run.time&&gear(run,'ignitedFireLeech'))leech(run,(dealtComponents.fire||0)*gear(run,'ignitedFireLeech'));
 }
 else if(mercenary&&currentAllyIgnite(run,mercenary)&&itemGear('ignitedFireLeech')){const amount=(dealtComponents.fire||0)*itemGear('ignitedFireLeech');if(amount>0)mercenary.combat.leech.push({remaining:amount,rate:mercenary.maxHp*.02});}
 else if(actor.kind==='minion'&&actor.ownerId==='player'&&has(run,14603))leech(run,damage*.01);
 if(skillOwner&&((has(run,3184)&&enemy.hp-damage<=enemy.maxHp*.2)||(has(run,21264)&&critical&&enemy.hp-damage<=enemy.maxHp*.1)))damage=Math.max(damage,enemy.hp);
 return damage;
}

function eyeIgnited(run,random=()=>rng(run)){
 const amount=gear(run,'eyeSelfHit');if(!amount||run.player.hp<=0)return;
 const damage=classIncomingDamage(run,amount,{type:'fire',hit:true,selfHit:true,cannotBlock:true,melee:false,random,sourceId:'eye-of-innocence'});
 run.player.hp=Math.max(0,run.player.hp-damage);classAfterPlayerHit(run);
}
export function classKilled(run,enemy,damageEnemy,random=()=>rng(run)){
 uniqueKilled(run,enemy);
 if(!run.classState){const b=combatState(run);b.flaskCharges=Math.min(flaskSpec(run).capacity,b.flaskCharges+1);return;}
 const b=run.classState.combat,actor=enemy.killActor||{kind:enemy.killedByMinion?'minion':'player',ownerId:'player'},personal=actor.kind==='player',totem=actor.kind==='totem';
 const mercenary=actor.kind==='mercenary'?actorOrigin(run,actor):null;
 if(mercenary)mercenary.mana=Math.min(mercenary.maxMana,mercenary.mana+allyGear(mercenary,'manaOnKill'));
 const cursedNearby=gear(run,'asenath')&&run.corpses.some(c=>c.until>run.time&&c.curses?.some(curse=>curse.until>run.time&&ownedAilment(curse.actor))&&Math.hypot(c.x-enemy.x,c.y-enemy.y)<=100);
 if(personal&&gear(run,'daresso')){b.endurance=Math.min(maxChargeCount(run,'endurance'),b.endurance+1);b.enduranceUntil=run.time+10;}
 if(personal)run.player.mana=Math.min(run.player.maxMana,run.player.mana+gear(run,'manaOnKill'));
 if(personal&&rng(run)<gear(run,'frenzyChargeOnKill')){b.frenzy=Math.min(has(run,47058)?2:3,b.frenzy+1);b.frenzyUntil=run.time+10;}
 if(personal){b.killed=run.time;if(enemy.elite||enemy.kind==='boss')b.rareKilled=run.time;}
 b.flaskCharges=Math.min(flaskSpec(run).capacity,b.flaskCharges+1*(1+(classStats(run).m.flaskCharges||0)));
 if(personal&&has(run,55867)){const amount=.01*b.masteries.length;heal(run,run.player.maxHp*amount);run.player.mana=Math.min(run.player.maxMana,run.player.mana+run.player.maxMana*amount);run.player.energyShield=Math.min(run.player.maxEnergyShield,run.player.energyShield+run.player.maxEnergyShield*amount);}
 if(personal&&has(run,19598))heal(run,run.player.maxHp*.005*(enemy.poisons?.length||0));
 if(personal&&has(run,1697)&&b.flaskUntil>run.time&&enemy.poisons?.length){for(const other of run.enemies){if(other!==enemy&&enemyTargetable(other)&&Math.hypot(other.x-enemy.x,other.y-enemy.y)<=60)(other.poisons||=[]).push({...enemy.poisons[0],until:run.time+2,appliedAt:run.time});}}
 const explosions=[];
 if((personal||totem)&&has(run,1731)&&random()<.1)explosions.push({damage:enemy.maxHp*2.5,type:'fire',id:'hinekora'});
 const bloom=(personal||actor.kind==='minion'&&actor.ownerId==='player')&&has(run,37127)&&(enemy.cursed||enemy.temporalChains?.until>run.time)?.5:0;
 const chaosChance=bloom+(personal?gear(run,'obliterationChance'):mercenary?allyGear(mercenary,'obliterationChance'):0);
 if(chaosChance>0&&random()<chaosChance)explosions.push({damage:enemy.maxHp*.25,type:'chaos',id:'obliteration',actor:mercenary?actor:undefined});
 if(personal&&has(run,27864)&&enemy.bleedUntil>run.time)explosions.push({damage:enemy.maxHp*.2,type:'physical',id:'gratuitous-violence'});
 if(personal&&gear(run,'inpulsaExplosion')&&enemy.shockUntil>run.time)explosions.push({damage:enemy.maxHp*.05,type:'lightning',id:'inpulsa',cannotShock:true,noReflect:true});
 if(cursedNearby)explosions.push({damage:enemy.maxHp*.03,type:'physical',id:'asenath'});
 // Local conservative destruction policy: any successful explosion removes the corpse before Berek spread.
 // Each kind retains its own hit and cannot overwrite another kind. Death cleanup processes each enemy once.
 if(!explosions.length){
  const curses=gear(run,'asenath')&&enemy.temporalChains?.until>run.time?[{...enemy.temporalChains,type:'temporalChains'}]:[];
  run.corpses.push({x:enemy.x,y:enemy.y,until:run.time+8,curses,sourceId:enemy.id});run.corpses=run.corpses.slice(-180);
  if(personal&&gear(run,'berek'))for(const other of run.enemies.slice(0,180)){
   if(other===enemy||!enemyTargetable(other)||Math.hypot(other.x-enemy.x,other.y-enemy.y)>90)continue;
   if(enemy.igniteUntil>run.time){
    applyAilment(other,'ignite',{until:enemy.igniteUntil,power:enemy.igniteDps,actor:{kind:'player',ownerId:'player'}},run.time);
    eyeIgnited(run,random);
   }
   if(enemy.shockUntil>run.time){applyAilment(other,'shock',{until:enemy.shockUntil,power:enemy.shockEffect,actor:{kind:'player',ownerId:'player'}},run.time);b.shocked=run.time;}
  }
 }
 for(const explosion of explosions){
  const radius=(explosion.id==='inpulsa'?100:100)*Math.sqrt(Math.max(.01,1+(classStats(run).m.area||0)+gear(run,'uniqueArea')));
  run.effects.push({kind:'nova',x:enemy.x,y:enemy.y,radius,color:explosion.type==='fire'?'#ff9955':'#ba94e8',life:.35,maxLife:.35});
  for(const other of run.enemies.slice(0,180))if(other!==enemy&&enemyTargetable(other)&&Math.hypot(other.x-enemy.x,other.y-enemy.y)<=radius)damageEnemy?.(other,explosion.damage,{type:explosion.type,secondary:true,area:true,critChance:0,cannotShock:!!explosion.cannotShock,noReflect:!!explosion.noReflect,actor:explosion.actor||{kind:'player',ownerId:'player'},origin:{x:enemy.x,y:enemy.y},sourceId:explosion.id});
 }

}

export function classEnemySpeed(run,enemy){
 if(!run.classState)return 1;
 if(enemy.freezeUntil>run.time)return 0;
 let speed=enemy.chill>0?1-(enemy.chillEffect||.25):1;
 if(has(run,23225)&&nearby(run,enemy))speed=Math.min(speed,.9);
 if(enemy.hinderedUntil>run.time)speed*=.7;
 if(enemy.cursed)speed*=1-(enemy.curseEffect||0);
 if(enemy.temporalChains?.until>run.time)speed*=1-Math.min(.75,(enemy.elite||enemy.kind==='boss'||enemy.kind==='heart'?.09:.15)*enemy.temporalChains.effect);
 return speed;
}
export function classEnemyCooldown(run,enemy){return (has(run,51462)&&nearby(run,enemy)?1/.9:1)/Math.max(.01,classEnemySpeed(run,enemy));}
export function classProjectile(run,item){
 if(!run.classState||item.hostile)return;
 if(has(run,61627))item.terrainChain=true;
 if(has(run,57175)&&['player','totem'].includes(classActor(item.context).kind)){const speed=Math.hypot(item.vx,item.vy),angle=rng(run)*Math.PI*2;item.vx=Math.cos(angle)*speed;item.vy=Math.sin(angle)*speed;item.canReturn=rng(run)<.5;}
}
// One live expiry rule for every supported finite enemy effect. Temporal Chains itself
// is excluded. Cap each extension at the effect's own expiry within this frame.
function slowEnemyEffect(run,tc,dt,object,key,appliedAt=object?.appliedAt){
 if(!tc||!object)return;
 const start=run.time-dt;
 for(const interval of [...(tc.history||[]),tc]){
  const from=Math.max(start,interval.appliedAt??start,appliedAt??start);
  const active=Math.max(0,Math.min(run.time,interval.until)-from),slow=clamp(.25*interval.effect,0,.75);
  if(object[key]>from)object[key]+=slow*Math.min(active,(object[key]-from)/(1-slow));
 }
}
export function classEnemyChill(run,enemy,dt){
 // Core owns the remaining chill clock; slow it before subtraction can erase it.
 const clock={until:Math.max(run.time-dt,enemy.chillAppliedAt??-Infinity)+(enemy.chill||0),appliedAt:enemy.chillAppliedAt};
 slowEnemyEffect(run,enemy.temporalChains,dt,clock,'until');
 return Math.max(0,clock.until-run.time);
}
function advanceEnemyEffects(run,enemy,dt){
 const extend=(object,key)=>slowEnemyEffect(run,enemy.temporalChains,dt,object,key,object===enemy?enemy.effectAppliedAt?.[key]:object?.appliedAt);
 for(const key of ['igniteUntil','shockUntil','freezeUntil','bleedUntil','scorchUntil','witherUntil','blindUntil','tauntUntil','mercenaryTauntUntil','hinderedUntil','hoarfrostUntil']){
  if((key==='igniteUntil'&&enemy.igniteApplications)||(key==='shockUntil'&&enemy.shockApplications))continue;
  extend(enemy,key);
 }
 extend(enemy.exposure,'until');
 for(const effect of [...(enemy.poisons||[]),...(enemy.igniteApplications||[]),...(enemy.shockApplications||[]),...(enemy.bleedHistory||[])])extend(effect,'until');
}
export function classTick(run,dt,{damageEnemy,projectile,skillStats}={}){
 if(!run.classState){tickFlask(run);return;}
 const b=run.classState.combat,s=classStats(run),p=run.player;
 for(const [ailment,value] of Object.entries(p.ailments)){
  if(value.until<=run.time){delete p.ailments[ailment];continue;}
  if(value.dps){if(ailment==='ignite'&&has(run,48480))continue;const taken=classIncomingDamage(run,value.dps*dt,{type:ailment==='ignite'?'fire':'physical',hit:false,enemy:run.enemies.find(e=>e.id===value.enemyId)});p.hp=Math.max(0,p.hp-taken);classAfterPlayerHit(run);}
 }
 b.prevented=b.prevented.filter(x=>run.time-x.time<10);b.poisons=b.poisons.filter(t=>run.time-t<4);
 b.elusive=Math.max(0,(b.elusive||0)-.2*dt);
 b.galeInstances=(b.galeInstances||[]).filter(until=>until>run.time);b.gale=b.galeInstances.length;
 if(b.frenzyUntil<=run.time)b.frenzy=0;if(b.powerUntil<=run.time)b.power=0;if(b.enduranceUntil<=run.time)b.endurance=0;
 if(has(run,25651)){b.power=Math.max(4,b.power);b.endurance=Math.max(4,b.endurance);}
 if(has(run,34567)&&run._stationary===0){b.moving=(b.moving||0)+dt;if(b.moving>=3-1e-8){b.moving-=3;b.frenzy=Math.min(has(run,47058)?2:3,b.frenzy+1);b.frenzyUntil=run.time+10;}}
 if(has(run,61072)&&recent(run,'lastHit')){b.enduranceTimer=(b.enduranceTimer||0)+dt;if(b.enduranceTimer>=1-1e-8){b.enduranceTimer-=1;b.endurance=Math.min(3,b.endurance+1);}}
 b.losingRage=run.time-Math.max(b.rageHit??-1e9,b.rageGained??-1e9)>2+(has(run,24528)?2:0);
 if(b.losingRage)b.rage=Math.max(0,b.rage-10*dt);
 if(has(run,51101)){b.flaskTimer=(b.flaskTimer||0)+dt;if(b.flaskTimer>=3-1e-8){b.flaskTimer-=3;b.flaskCharges=Math.min(flaskSpec(run).capacity,b.flaskCharges+3*(1+(s.m.flaskCharges||0)));}}
 tickFlask(run,s.m.flaskDuration||0);
 p.mana=Math.min(p.maxMana,p.mana+p.maxMana*.018*(1+(s.m.manaRegen||0)+(b.arcaneUntil>run.time?.3*(1+(s.m.arcaneEffect||0)):0))*dt+(has(run,61259)&&recent(run,'exposed')?p.maxMana*.01*dt:0));
 if(!recent(run,'lastHit',2))p.energyShield=Math.min(p.maxEnergyShield,p.energyShield+p.maxEnergyShield*.2*dt);
 for(const l of b.leech){const gain=Math.min(l.remaining,l.rate*dt);l.remaining-=gain;heal(run,gain);}
 for(const l of b.manaLeech||[]){const gain=Math.min(l.remaining,l.rate*dt);l.remaining-=gain;p.mana=Math.min(p.maxMana,p.mana+gain);}b.manaLeech=(b.manaLeech||[]).filter(l=>l.remaining>0).slice(-100);
 b.leech=b.leech.filter(l=>l.remaining>0&&(has(run,10143)||p.hp<p.maxHp));
 run.corpses=run.corpses.filter(c=>c.until>run.time);
 if((run.classState.ascendancyId==='Necromancer'||has(run,10099))&&run.corpses.length&&!recent(run,'consumed',4)){run.corpses.shift();b.consumed=run.time;b.offeringUntil=run.time+4;}
 if(has(run,55146)&&Math.floor(run.time/4)!==b.cleanseCycle){b.cleanseCycle=Math.floor(run.time/4);p.ailments={};p.curses=[];}
 for(const enemy of run.enemies){
  if(enemy.hp<=0||(enemy.telegraph||0)>0)continue;
  ailmentApplications(enemy,'ignite',run.time-dt);
  advanceEnemyEffects(run,enemy,dt);
  if(gear(run,'asenath')&&run.corpses.some(c=>c.until>run.time&&c.curses?.some(curse=>curse.until>run.time&&ownedAilment(curse.actor))&&Math.hypot(c.x-enemy.x,c.y-enemy.y)<=100)){setEnemyTimer(run,enemy,'blindUntil',run.time+.1);enemy.blindEffect=.2;}
  if(nearby(run,enemy)){enemy.presence=(enemy.presence||0)+dt;if(has(run,5087)){setEnemyTimer(run,enemy,'blindUntil',run.time+4);enemy.blindEffect=.2*(1+(s.m.blindEffect||0));}if(has(run,37127)){enemy.cursed=true;enemy.curseEffect=.1*(1+(s.m.curseEffect||0));}if(has(run,34567))enemy.marked=true;if(has(run,25309))setEnemyTimer(run,enemy,'hinderedUntil',run.time+1);}
  if(has(run,25309)&&nearby(run,enemy)&&run.time-(enemy.lastWither??-1e9)>=1){enemy.lastWither=run.time;enemy.witherStacks=Math.min(15,(enemy.witherStacks||0)+1);setEnemyTimer(run,enemy,'witherUntil',run.time+15);}
  if(enemy.witherUntil<=run.time)enemy.witherStacks=0;
  if(enemy.hoarfrostUntil<=run.time)enemy.hoarfrost=0;
  selectAilment(enemy,'shock',run.time,true);
  if(has(run,47630)&&nearby(run,enemy)&&Math.floor(run.time/4)!==enemy.frigidCycle){enemy.frigidCycle=Math.floor(run.time/4);if(!(enemy.freezeUntil>run.time)&&rng(run)<.5)setEnemyTimer(run,enemy,'freezeUntil',run.time+.4);}
  integrateIgniteApplications(enemy.igniteApplications,run.time,dt,(damage,active)=>{
   if(enemy.hp<=0)return false;
   damageEnemy?.(enemy,damage,{type:'fire',isDot:true,prepared:true,ailment:'ignite',actor:active.actor});
   return enemy.hp>0;
  });
  selectAilment(enemy,'ignite',run.time,true);
  const duration=effect=>Math.max(0,Math.min(run.time,effect.until,effect.endedAt??Infinity)-Math.max(run.time-dt,effect.appliedAt??-Infinity));
  const currentBleed={until:enemy.bleedUntil,appliedAt:enemy.effectAppliedAt?.bleedUntil,base:enemy.bleedBase,dps:enemy.bleedDps,aggravated:enemy.bleedAggravated,actor:enemy.bleedActor};
  for(const bleed of [...(enemy.bleedHistory||[]),currentBleed]){
   const active=duration(bleed),dps=(bleed.base??bleed.dps)*(bleed.base!=null&&(bleed.aggravated||enemy.moving&&!(enemy.freezeUntil>run.time))?3:1);
   if(active>0&&enemy.hp>0)damageEnemy?.(enemy,dps*active,{type:'physical',isDot:true,prepared:true,actor:bleed.actor});
   if(bleed===currentBleed&&enemy.bleedUntil>run.time)enemy.bleedDps=dps;
  }
  enemy.bleedHistory=[];
  for(const poison of enemy.poisons||[]){const active=duration(poison);if(active>0&&enemy.hp>0)damageEnemy?.(enemy,poison.dps*active,{type:'chaos',isDot:true,prepared:true,actor:poison.actor});}
  enemy.poisons=(enemy.poisons||[]).filter(poison=>poison.until>run.time);
  if(enemy.temporalChains)enemy.temporalChains.history=[];
  if(enemy.hp>0&&enemy.regen&&!(has(run,27096)&&nearby(run,enemy)))enemy.hp=Math.min(enemy.maxHp,enemy.hp+enemy.regen*dt);
 }
 if(has(run,1105)){
  b.totemTimer=(b.totemTimer||0)-dt;
  const maximum=2,duration=16; // Adapted base: one totem for eight seconds; original notable doubles duration and adds one.
  run.totems=run.totems.filter(t=>t.life>0&&t.hp>0);
  if(b.totemTimer<=0&&run.totems.length<maximum){run.totems.push({id:run._nextId++,kind:'totem',x:p.x+40,y:p.y,hp:60,maxHp:60,life:duration,shotTimer:0});b.totemTimer=1/(2+(s.m.totemSpeed||0));}
 }
 // Copy the current loadout by slot, never acquisition history. One bounded owned summon exercises their Minions.
 if(run.mercenary){
  const ally=run.mercenary;ally.equipment={};
  for(const item of Object.values(run.equipment))if(item?.rarity==='unique'&&((has(run,25944)&&['weapon','shield','offhand','quiver'].includes(item.slot))||(has(run,32669)&&item.slot==='amulet')))ally.equipment[item.slot]=structuredClone(item);
  ally.combat||={frenzy:0,leech:[]};ally.ailments||={};
  if(ally.combat.frenzyUntil<=run.time)ally.combat.frenzy=0;
  const maxMana=50+allyGear(ally,'mana')+allyGear(ally,'intelligence')/2;ally.mana=Math.min(maxMana,(ally.mana||0)+Math.max(0,maxMana-(ally.maxMana||0)));ally.maxMana=maxMana;
  const max=150*(1+(s.m.mercenaryLife||0))+allyGear(ally,'maxHp')+allyGear(ally,'strength')/2;ally.hp=Math.min(max,ally.hp+(ally.hp>0?Math.max(0,max-ally.maxHp):0));ally.maxHp=max;
  if(!run.mercenaryMinions.length)run.mercenaryMinions.push({id:run._nextId++,ownerId:ally.id,kind:'mercenaryMinion',x:ally.x+20,y:ally.y,hp:60,maxHp:60,shotTimer:0,radius:9,color:'#d7c29a'});
  for(const minion of run.mercenaryMinions){const max=60*(1+(s.m.mercenaryLife||0));minion.hp=Math.min(max,minion.hp+(minion.hp>0?Math.max(0,max-minion.maxHp):0));minion.maxHp=max;}
 }
 for(const ally of [...run.minions,run.mercenary,run.sentinel,...run.totems,...run.mercenaryMinions].filter(Boolean)){
  if(ally.life!=null)ally.life-=dt;
  if(ally.hp<=0){ally.respawn=(ally.respawn||0)+dt;if(ally.respawn>=5){ally.hp=ally.maxHp;ally.respawn=0;}else continue;}
  const buffs=refreshClassAlly(run,ally);ally.hp=Math.min(ally.maxHp,ally.hp+buffs.regen*dt);
  if(run.minions.includes(ally))continue; // Spectres move and fire in the ordinary skill loop.
  if(ally.kind!=='totem'){ally.x+=(p.x+35-ally.x)*Math.min(1,dt*4*buffs.movementSpeed);ally.y+=(p.y+15-ally.y)*Math.min(1,dt*4*buffs.movementSpeed);}
  if(ally.kind==='mercenary'){
   for(const [type,ailment] of Object.entries(ally.ailments)){
    if(type==='ignite'){
     const applications=allyIgniteApplications(ailment);
     integrateIgniteApplications(applications,run.time,dt,damage=>{
      if(ally.hp<=0)return false;
      classAllyDamage(run,ally,damage,{type:'fire',hit:false});return ally.hp>0;
     });
     publishAllyIgnite(run,ally,applications.filter(a=>a.until>run.time));
    }else{
     const active=Math.max(0,Math.min(run.time,ailment.until)-Math.max(run.time-dt,ailment.appliedAt??-Infinity));
     if(active>0&&ailment.dps)classAllyDamage(run,ally,ailment.dps*active,{type:'physical',hit:false});
     if(ailment.until<=run.time)delete ally.ailments[type];
    }
   }
   if(ally.hp<=0)continue; // Death must reach the ordinary respawn path before any recovery or action.
   for(const entry of ally.combat.leech){const amount=Math.min(entry.remaining,entry.rate*dt);entry.remaining-=amount;if(ally.hp>0)ally.hp=Math.min(ally.maxHp,ally.hp+amount);}ally.combat.leech=ally.combat.leech.filter(l=>l.remaining>0).slice(-100);
   for(const recoup of ally.recoup){const recovery=Math.min(recoup.remaining,recoup.rate*dt);recoup.remaining-=recovery;ally.hp=Math.min(ally.maxHp,ally.hp+recovery);}ally.recoup=ally.recoup.filter(r=>r.remaining>0);
  }
  if(ally.hp<=0)continue;
  ally.shotTimer-=dt;
  const target=run.enemies.filter(e=>enemyTargetable(e)&&Math.hypot(e.x-ally.x,e.y-ally.y)<600).sort((a,c)=>Math.hypot(a.x-ally.x,a.y-ally.y)-Math.hypot(c.x-ally.x,c.y-ally.y))[0];
  if(ally.shotTimer<=0&&target&&buffs.actionSpeed>0){
   const actor={kind:ally.kind==='sentinel'?'minion':ally.kind==='mercenaryMinion'?'minion':ally.kind,id:ally.id,ownerId:ally.ownerId||'player'};
   ally.shotTimer=.8/((1+buffs.castRate)*Math.max(.001,buffs.actionSpeed));
   const amount=(raw,type)=>raw*(1+buffs.damageIncrease+(elementalType(type)?buffs.elementalDamage:0))*buffs.moreDamage;
   if(ally.kind==='mercenary'||ally.kind==='mercenaryMinion'){
    const merc=ally.kind==='mercenary',weapon=ally.equipment?.weapon,type=merc?(weapon?.localBase?.physical?'physical':'cold'):'physical';
    // The mercenary retains the survivor base 18 and .8s cadence; equipped local weapon
    // modifiers apply to its own attack, rather than becoming global minion modifiers.
    const local=weapon?.localModifiers||{};
    if(merc)ally.shotTimer/=(1+(local.attackSpeed||0))*(1+(ally.combat.frenzy||0)*.04);
    const increase=merc&&elementalType(type)?allyGear(ally,'elementalAttackDamage'):0;
    const damage=merc?18*(1+buffs.damageIncrease+increase+(elementalType(type)?buffs.elementalDamage:0))*buffs.moreDamage*(type==='physical'?1+(local.physicalDamage||0):1):amount(8,type);
    damageEnemy?.(target,damage,{type,actor,isAttack:merc,critChance:merc?(weapon?.localBase?.critChance||0)*(1+(local.critChance||0)):0});if(merc&&has(run,56292))setEnemyTimer(run,target,'mercenaryTauntUntil',run.time+3);
   }else if(ally.kind==='sentinel'){
    for(const e of run.enemies)if(enemyTargetable(e)&&Math.hypot(e.x-ally.x,e.y-ally.y)<100)damageEnemy?.(e,amount(16,'fire'),{type:'fire',isDot:true,actor});
    damageEnemy?.(target,amount(24,'physical'),{type:'physical',actor,critChance:0});
   }else {const skill=skillStats?.(run,'bolt',ally);if(skill){ally.shotTimer=skill.cooldown;projectile?.(ally,target,{damage:skill.damage,element:'cold',context:{...skill,type:'cold',isTotem:true,actor},color:'#dab980'});}}
  }
 }
}

function allyGear(ally,key){return Object.values(ally.equipment||{}).reduce((n,item)=>n+(Number(item?.mods?.[key])||0),0);}
export function classAllyStats(run,ally){
 const s=classStats(run),m=s?.m||{},b=run.classState?.combat||{},close=nearby(run,ally);
 const merc=ally.kind==='mercenary',mercMinion=ally.kind==='mercenaryMinion',minion=ally.kind==='minion'||ally.kind==='sentinel'||(!ally.kind&&!mercMinion);
 const owner=mercMinion?run.mercenary:ally;
 const auraEffect=1+(m.auraEffect||0),mercAura=merc||mercMinion?1+(has(run,56292)?.5:0):1;
 const aura=close&&has(run,36017)?auraEffect:0;
 const curse=Math.max(0,...(ally.curses||[]).filter(x=>x.until>run.time).map(x=>x.effect));
 const ground=close&&has(run,39790)&&run._stationary>0;
 const actionSpeed=(1+(close&&(has(run,24848)||has(run,34567))?.08:0))*(1-curse*(ground?.5:1))*(ally.freezeUntil>run.time||ally.blockUntil>run.time?0:1);
 const uniqueCount=Object.values(owner?.equipment||{}).filter(x=>x?.rarity==='unique').length;
 let damageIncrease=(currentAllyIgnite(run,ally)?allyGear(ally,'ignitedDamage'):0)+allyGear(ally,'damage')+(minion?(m.minionDamage||0)+(has(run,10099)?.3:0):0)+((merc||mercMinion)?m.mercenaryDamage||0:0)+(aura?.3:0);
 // The permanent companion's modest damage aura is a named survivor adaptation.
 if((merc||mercMinion)&&Math.hypot(ally.x-(run.mercenary?.x??0),ally.y-(run.mercenary?.y??0))<=220)damageIncrease+=.2*mercAura;
 let moreDamage=(1+(ally.combat?.frenzy||0)*.04)*(minion&&has(run,54159)?1.1:1)*((merc||mercMinion)&&has(run,25944)?1+.08*uniqueCount:1);
 if(has(run,11490)&&run.corpses.some(e=>nearby(run,e))&&close)moreDamage*=1.1;
 const castRate=allyGear(ally,'castSpeed')+(minion?m.minionCastSpeed||0:0)+((merc||mercMinion)?m.mercenaryCastSpeed||0:0)+aura*.03*(b.auras||1)+(minion&&b.offeringUntil>run.time?.2:0)+(close&&has(run,10099)?.02*(b.auras||1)*auraEffect:0);
 const armour=allyGear(ally,'armour')+(close&&has(run,42264)?s.maxMana*b.reservedFraction*.25:0)+(close&&has(run,13374)&&recent(run,'impaled')?1000:0);
 const energyShield=(ally.baseEnergyShield||0)+allyGear(ally,'energyShield')+(close&&has(run,42264)?s.maxMana*b.reservedFraction*.1:0);
 const regen=allyGear(ally,'regen')+(ground?(ally.maxHp||0)*.05:0);
 const resistances=Object.fromEntries(['fire','cold','lightning','chaos'].map(type=>[type,clamp(allyGear(ally,type+'Resistance')+(elementalType(type)&&aura?.3:0),-.6,Math.min(.9,.75+allyGear(ally,'max'+type[0].toUpperCase()+type.slice(1)+'Resistance')))]));
 const elementalDamage=allyGear(ally,'elementalPerResistance')*Object.entries(resistances).reduce((n,[t,v])=>n+(elementalType(t)?Math.max(0,v*100-75):0),0);
 return {accuracy:100+allyGear(ally,'accuracy')+2*allyGear(ally,'dexterity'),damageIncrease,elementalDamage,moreDamage,castRate,actionSpeed,movementSpeed:actionSpeed*(1+allyGear(ally,'speed')+(minion?m.minionSpeed||0:0)+((merc||mercMinion)?m.mercenarySpeed||0:0)),armour,energyShield,regen,resistances,block:allyGear(ally,'cannotBlockAttacks')?0:Math.min(.75,allyGear(ally,'block')),spellBlock:Math.min(.75,allyGear(ally,'spellBlock'))};
}
export function refreshClassAlly(run,ally){
 const s=classAllyStats(run,ally),previous=ally.maxEnergyShield||0;
 ally.energyShield=Math.min(s.energyShield,(ally.energyShield||0)+Math.max(0,s.energyShield-previous));ally.maxEnergyShield=s.energyShield;
 return s;
}
export function classAllyDamage(run,ally,amount,{type='physical',components=null,hit=true,spell=false,enemy=null,cannotBlock=false,selfHit=false,random=()=>rng(run)}={}){
 if(!(ally?.hp>0))return;
 const s=refreshClassAlly(run,ally);
 const block=spell?s.spellBlock:s.block;
 const guardianBlock=has(run,39728)&&nearby(run,ally)&&recent(run,spell?'cast':'attacked')&&(spell||!allyGear(ally,'cannotBlockAttacks'))?.25:0;
 if(hit&&!cannotBlock&&!selfHit&&random()<Math.min(.75,block+guardianBlock)){
  ally.energyShield=Math.min(ally.maxEnergyShield,ally.energyShield+s.armour*allyGear(ally,'aegisRecovery'));
  ally.blockUntil=run.time+.35;return;
 }
 if(has(run,31700)&&nearby(run,ally))amount*=.8;
 const incoming=components||{[type]:amount},total=Object.values(incoming).reduce((sum,value)=>sum+value,0),scale=total?amount/total:0;
 let fireDamage=0;
 // One hit shares avoidance and resource spending; armour/resistance apply to each typed portion.
 amount=Object.entries(incoming).reduce((sum,[kind,raw])=>{
  let portion=raw*scale;
  if(kind==='physical'&&hit)portion*=1-Math.min(.9,s.armour/(s.armour+5*Math.max(.001,portion)));
  if(kind!=='physical')portion*=1-(s.resistances[kind]||0);
  if(kind==='fire')fireDamage+=portion;
  return sum+portion;
 },0);
 if(hit&&!selfHit&&fireDamage>0)applyAllyIgnite(run,ally,fireDamage*.08);
 if(hit&&enemy?.kind==='cultist')ally.curses=[{until:run.time+4,effect:.15}];
 const es=Math.min(ally.energyShield||0,amount);ally.energyShield=(ally.energyShield||0)-es;amount-=es;
 ally.hp=Math.max(0,ally.hp-amount);
 if(hit&&ally.kind==='mercenary'&&has(run,1564)&&ally.hp<run.player.hp)ally.recoup.push({remaining:amount*.4,rate:amount*.1});
}

export function openAscendancy(run){if(['playing','paused'].includes(run.phase)&&run.classState?.ascendancyPoints>0)run.phase='ascendancy';return run;}

export function classSkillUsed(run,id){if(!run.classState)return;const b=run.classState.combat;if(id==='minion')return;if(id==='lightning')b.attacked=run.time;else b.cast=run.time;if(has(run,24848)){b.galeInstances=(b.galeInstances||[]).filter(until=>until>run.time);b.galeInstances.push(run.time+4);if(b.galeInstances.length>10)b.galeInstances.shift();b.gale=b.galeInstances.length;}}

export function classAfterPlayerHit(run){const b=run.classState?.combat;if(b?.pendingRecovery){if(run.player.hp>0)heal(run,b.pendingRecovery);b.pendingRecovery=0;}}

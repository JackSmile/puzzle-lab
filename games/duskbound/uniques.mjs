import {prepareEncounterDamage,proximityBlocks} from './encounters.mjs';
import {EXPANSION_UNIQUE_IDS,makeExpansionUnique} from './expansion-uniques.mjs';
const OLD_UNIQUE_IDS=['dying-sun','nebulis','cloak-of-flame','headhunter','death-rush'];
const OLD_UNIQUE_NAMES=['Dying Sun','Nebulis','Cloak of Flame','Headhunter','Death Rush'];
export const UNIQUE_IDS=Object.freeze([...OLD_UNIQUE_IDS,...EXPANSION_UNIQUE_IDS]);
export function makeUnique(uniqueId,id,random=()=>.5){
 if(EXPANSION_UNIQUE_IDS.includes(uniqueId))return makeExpansionUnique(uniqueId,id,random);
 const index=OLD_UNIQUE_IDS.indexOf(uniqueId);if(index<0)throw new RangeError('Unknown unique '+uniqueId);
 let first=true;return rollUnique({},id,()=>{if(first){first=false;return (index+.5)/5;}return random();});
}
// Source values: data/poe-unique-source.json. Monster balance and synthesis pool below are survivor adaptations.
export const RARE_MODIFIERS=Object.freeze({
 swift:{name:'Стремительный',stats:{speed:.25},description:'+25% скорости передвижения'},
 powerful:{name:'Могучий',stats:{damage:.3},description:'30% увеличения урона'},
 armoured:{name:'Бронированный',stats:{armour:300},description:'+300 брони'},
 flameward:{name:'Огнестойкий',stats:{fireResistance:.3,maxFireResistance:.05},description:'+30% сопротивления огню, +5% максимального сопротивления огню'},
});
export function combatState(run){return run.classState?.combat||(run.uniqueCombat||={flaskCharges:30,flaskUntil:0});}
export function stolenModifiers(run){return (combatState(run).stolenModifiers||[]).filter(m=>m.until>run.time&&RARE_MODIFIERS[m.id]);}
export function stolenStat(run,key){return stolenModifiers(run).reduce((sum,m)=>sum+(RARE_MODIFIERS[m.id].stats[key]||0),0);}
export function rawGear(run,key){return Object.values(run.equipment||{}).reduce((sum,item)=>sum+(item?.slot==='flask'&&!(combatState(run).flaskUntil>run.time)?0:Number(item?.mods?.[key])||0),0);}
export function flaskSpec(run){return run.equipment.flask?.flask||{capacity:60,chargesUsed:20,duration:4};}
export function uniqueSummary(run){const b=combatState(run),f=flaskSpec(run);return {flask:{name:run.equipment.flask?.name||null,charges:b.flaskCharges,capacity:f.capacity,chargesUsed:f.chargesUsed,active:!!run.equipment.flask&&b.flaskUntil>run.time,remaining:run.equipment.flask?Math.max(0,b.flaskUntil-run.time):0},adrenalineRemaining:Math.max(0,(b.adrenalineUntil||0)-run.time),stolenModifiers:stolenModifiers(run).map(m=>({...m,...RARE_MODIFIERS[m.id],remaining:m.until-run.time}))};}
export function tickFlask(run,durationIncrease=0){const b=combatState(run),f=flaskSpec(run);b.flaskCharges=Math.min(f.capacity,b.flaskCharges);if(run.equipment.flask&&b.flaskUntil<=run.time&&b.flaskCharges>=f.chargesUsed){b.flaskCharges-=f.chargesUsed;b.flaskUntil=run.time+f.duration*(1+durationIncrease);}}
export function uniqueKilled(run,enemy){
 const b=combatState(run),p=run.player;
 const personal=(enemy.killActor?.kind||(enemy.killedByMinion?'minion':'player'))==='player';
 if(personal&&p.hp>0)p.hp=Math.min(p.maxHp,p.hp+p.maxHp*rawGear(run,'lifeOnKill'));
 const duration=rawGear(run,'adrenalineDuration');if(personal&&duration>0&&!(b.adrenalineUntil>run.time))b.adrenalineUntil=run.time+duration;
 if(rawGear(run,'stealRareModifiers')&&enemy.elite){
  b.stolenModifiers=stolenModifiers(run);
  // Conservative local policy: an active duplicate does not refresh. It can be gained again after expiry.
  for(const id of enemy.rareMods||[])if(RARE_MODIFIERS[id]&&!b.stolenModifiers.some(m=>m.id===id))b.stolenModifiers.push({id,until:run.time+60});
 }
}
export function assignRareModifiers(enemy,random){const pool=Object.keys(RARE_MODIFIERS);enemy.rareMods=[];for(let i=0;i<2;i++)enemy.rareMods.push(pool.splice(Math.floor(random()*pool.length),1)[0]);for(const id of enemy.rareMods){const s=RARE_MODIFIERS[id].stats;enemy.speed*=1+(s.speed||0);enemy.damage*=1+(s.damage||0);enemy.armour=(enemy.armour||0)+(s.armour||0);if(s.fireResistance)enemy.resistances={...enemy.resistances,fire:Math.min(.75+(s.maxFireResistance||0),(enemy.resistances?.fire||0)+s.fireResistance)};}}
export function reflectMelee(run,enemy,{hit=true,spell=false,reflected=false,melee=true}={}){const amount=rawGear(run,'reflectFire');if(amount&&hit&&!spell&&!reflected&&melee&&enemy?.hp>0&&!proximityBlocks(run,enemy,run.player)){enemy.hp-=prepareEncounterDamage(run,enemy,amount*(1-Math.max(-2,Math.min(.9,enemy.resistances?.fire||0))));if(enemy.hp<=0){enemy.killActor={kind:'player',ownerId:'player'};enemy.damageActor=enemy.killActor;enemy.killCause='reflect';}}}
export function legacyResistances(run){const cap=k=>Math.min(.9,.75+rawGear(run,`max${k}Resistance`)+stolenStat(run,`max${k}Resistance`));return Object.fromEntries(['Fire','Cold','Lightning','Chaos'].map(k=>[k.toLowerCase(),Math.max(-.6,Math.min(cap(k),rawGear(run,`${k.toLowerCase()}Resistance`)+stolenStat(run,`${k.toLowerCase()}Resistance`)))]));}
export function nebulisIncrease(run,resistances){return rawGear(run,'elementalPerResistance')*['fire','cold','lightning'].reduce((n,k)=>n+Math.max(0,Math.round(resistances[k]*1e8)/1e6-75),0);}
export function rollUnique(run,id,random){
 const names=[...OLD_UNIQUE_NAMES,...(run.classState?[...EXPANSION_UNIQUE_IDS,'Duskbound: Колчан дозорного','Duskbound: Обет спутника','Duskbound: Щит рассвета']:[])];const name=names[Math.floor(random()*names.length)];
 if(EXPANSION_UNIQUE_IDS.includes(name))return makeExpansionUnique(name,id,random);
 if(name.startsWith('Duskbound:')){
  const quiver=name.includes('Колчан'),amulet=name.includes('Обет'),slot=quiver?'quiver':amulet?'amulet':'shield';
  const mods=quiver?{damage:.2}:amulet?{maxHp:20,regen:1}:{armour:150,block:.2};
  return {id,name,slot,rarity:'unique',sourceKind:'duskbound',adapted:true,icon:quiver?'➶':amulet?'◈':'◇',color:'#e99a55',mods,description:'Оригинальная реликвия Duskbound; адаптированные свойства, не предмет PoE.',sourceStats:quiver?['20% увеличения собственного урона']:amulet?['+20 максимума здоровья','Восстанавливает 1 здоровье в секунду']:['+150 брони','20% шанс блокировать атаки']};
 }
 const roll=(a,b)=>a+Math.floor(random()*(b-a+1));const g={id,name,sourceKind:'poe',rarity:'unique',color:'#e99a55',mods:{},sourceStats:[]};const m=g.mods,s=g.sourceStats;
 if(name==='Dying Sun'){
  const charges=roll(125,150),less=roll(40,60),area=roll(10,20);
  Object.assign(g,{uniqueId:'dying-sun',slot:'flask',icon:'◉',requiredLevel:68,flask:{capacity:50,chargesUsed:Math.floor(20*(1+charges/100)),duration:8*(1-less/100)}});
  Object.assign(m,{fireResistance:.4,maxFireResistance:.05,projectiles:2,uniqueArea:area/100});
  s.push('+40% сопротивления огню во время действия','+5% максимального сопротивления огню во время действия',`${charges}% увеличения расхода зарядов`,`${less}% меньше длительности`,`${area}% увеличения области действия во время действия`,'Умения выпускают 2 дополнительных снаряда во время действия');g.description='Автоматически расходует заряды: усиливает огненную защиту, область и снаряды.';
 }else if(name==='Headhunter'){
  const implicit=roll(25,40),life=roll(50,60),str=roll(40,55),dex=roll(40,55),rare=roll(20,30);
  Object.assign(g,{uniqueId:'headhunter',slot:'belt',icon:'∞',requiredLevel:40});Object.assign(m,{maxHp:implicit+life,strength:str,dexterity:dex,rareHitDamage:rare/100,stealRareModifiers:1});
  s.push(`+${implicit} максимума здоровья (собственное свойство)`,`+${str} силы`,`+${dex} ловкости`,`+${life} максимума здоровья`,`${rare}% увеличения урона попаданий по редким врагам`,'При убийстве редкого врага его свойства переходят к вам на 60 с');g.description='Присваивает свойства убитых редких врагов на минуту.';
 }else if(name==='Death Rush'){
  const chaos=roll(17,23),life=roll(3,5),duration=roll(1,3);Object.assign(g,{uniqueId:'death-rush',slot:'ring',icon:'◌',requiredLevel:30});Object.assign(m,{chaosResistance:chaos/100,lifeOnKill:life/100,adrenalineDuration:duration});
  s.push(`+${chaos}% сопротивления хаосу`,`Восстанавливает ${life}% здоровья при убийстве`,`Дарует Адреналин на ${duration} с при убийстве`);g.description='Убийства восстанавливают здоровье и дают Адреналин. Активный Адреналин не обновляется.';
 }else if(name==='Cloak of Flame'){
  const fire=roll(50,75),ignite=roll(40,75);Object.assign(g,{uniqueId:'cloak-of-flame',slot:'body',icon:'♜',requiredLevel:18});Object.assign(m,{fireResistance:fire/100,igniteDuration:ignite/100,reflectFire:100,physicalTakenAsFire:.4});
  s.push(`+${fire}% сопротивления огню`,`${ignite}% увеличения длительности поджога врагов`,'Отражает 100 урона огнём атакующим в ближнем бою','40% получаемого физического урона становится уроном огнём');g.description='Преобразует часть входящего физического урона в огонь до применения защиты.';
 }else{
  const magnitude=roll(60,120),cast=roll(15,20),per=roll(6,8);Object.assign(g,{uniqueId:'nebulis',slot:'weapon',icon:'⚒',requiredLevel:68,implicitMagnitude:magnitude/100});Object.assign(m,{castSpeed:cast/100,elementalPerResistance:per/100});
  // Compact invented synthesis pool; values are not claimed as PoE synthesis rolls.
  const pool=[['maxHp',12,'максимума здоровья'],['regen',.3,'восстановления здоровья в секунду'],['fireResistance',.12,'сопротивления огню'],['coldResistance',.12,'сопротивления холоду'],['lightningResistance',.12,'сопротивления молнии']];g.synthesisImplicits=[];
  for(let i=0;i<3;i++){const [stat,baseValue,label]=pool.splice(Math.floor(random()*pool.length),1)[0];m[stat]=baseValue*(1+magnitude/100);g.synthesisImplicits.push({stat,baseValue,value:m[stat],adapted:true});s.push(`Синтез: +${(m[stat]*(stat.endsWith('Resistance')?100:1)).toFixed(2)}${stat.endsWith('Resistance')?'%':''} ${label}`);}
  s.push(`${magnitude}% увеличения величины собственных свойств`,`${cast}% увеличения скорости сотворения чар`,`${per}% увеличения урона стихиями за каждый пункт сопротивления огню, холоду или молнии выше 75%`);g.description='Стихийный урон растёт от фактических сопротивлений выше 75%; три свойства синтеза усиливают характеристики.';
 }
 return g;
}

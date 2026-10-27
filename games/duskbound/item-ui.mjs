import { equipLoot, lootReplacement, skillStats, stats } from './core.mjs';
import { classSummary } from './classes.mjs';

export const SLOT_NAMES = Object.freeze({weapon:'ОРУЖИЕ',body:'ДОСПЕХ',flask:'ФЛАКОН',belt:'ПОЯС',ring:'КОЛЬЦО',helmet:'ШЛЕМ',shield:'ЩИТ',offhand:'ВТОРОЕ ОРУЖИЕ',quiver:'КОЛЧАН',amulet:'АМУЛЕТ',gloves:'ПЕРЧАТКИ',boots:'САПОГИ'});
const ART = Object.freeze({
  'Aegis Aurora':'aegis-aurora', "Saffell's Frame":'saffells-frame', "Inpulsa's Broken Heart":'inpulsas-broken-heart', "Daresso's Defiance":'daressos-defiance',
  'Crown of Eyes':'crown-of-eyes','Yoke of Suffering':'yoke-of-suffering','Eye of Innocence':'eye-of-innocence',"Berek's Respite":'bereks-respite',
  Obliteration:'obliteration','Terminus Est':'terminus-est',"Asenath's Gentle Touch":'asenaths-gentle-touch',"Ralakesh's Impatience":'ralakeshs-impatience',
});
const rarities={normal:'ОБЫЧНЫЙ',magic:'МАГИЧЕСКИЙ',rare:'РЕДКИЙ',unique:'УНИКАЛЬНЫЙ'};
const flavour={
  'aegis-aurora':'Блок восстанавливает энергощит. Чем выше броня, тем сильнее восстановление.',
  'saffells-frame':'Защита от чар и повышенные максимумы сопротивлений ценой невозможности блокировать атаки.',
  'inpulsas-broken-heart':'Убитые вами шокированные враги взрываются. Сам взрыв не накладывает шок.',
  'daressos-defiance':'Убийства копят заряды выносливости. Полученное попадание расходует их и дарует усиленный Боевой раж.',
  'crown-of-eyes':'Увеличения и уменьшения урона чар усиливают урон атак со 150% эффективностью.',
  'yoke-of-suffering':'Сочетай разные состояния: каждый тип усиливает получаемый целью урон.',
  'eye-of-innocence':'Каждое наложение поджога наносит вам 100 урона огнём. Наступательные бонусы требуют поджога самого героя.',
  'bereks-respite':'Поджог и шок переходят с убитых врагов на соседей, сохраняя силу и оставшееся время.',
  'obliteration':'Часть физического урона добавляется в виде хаоса. Убитые вами враги могут взрываться.',
  'terminus-est':'Критические попадания дают заряд ярости даже против босса. Двуручный меч занимает обе руки.',
  'asenaths-gentle-touch':'Проклятые трупы ослепляют соседей и превращают новые смерти рядом с ними во взрывы.',
  'ralakeshs-impatience':'Даёт преимущества максимума одного вида зарядов. Сами расходуемые заряды при этом не создаются.',
};
const signed=(value,suffix='')=>`${value>0?'+':''}${value}${suffix}`;
const percent=value=>signed(Math.round(value*100),'%');
const modLabels={damage:v=>`${percent(v)} к урону`,cooldown:v=>`${percent(v)} сокращения перезарядки`,speed:v=>`${percent(v)} скорости`,maxHp:v=>`${signed(Math.round(v))} здоровья`,regen:v=>`${signed(Number(v.toFixed(1)))} здоровья/с`,pickup:v=>`${signed(Math.round(v))} радиуса подбора`,projectiles:v=>`${signed(v)} снарядов`,area:v=>`${percent(v)} радиуса умений`,damageReduction:v=>`${percent(v)} снижения входящего урона`,armour:v=>`${signed(Math.round(v))} брони`,evasion:v=>`${signed(Math.round(v))} уклонения`,energyShield:v=>`${signed(Math.round(v))} энергощита`,block:v=>`${percent(v)} шанса блока атак`,spellBlock:v=>`${percent(v)} шанса блока чар`,leech:v=>`${percent(v)} урона атак похищается в виде здоровья`,poisonChance:v=>`${percent(v)} шанса отравить`,powerChargeChance:v=>`${percent(v)} шанса заряда энергии`,frenzyChargeOnKill:v=>`${percent(v)} шанса заряда ярости при убийстве`};
for(const [type,label] of [['fire','огню'],['cold','холоду'],['lightning','молнии'],['chaos','хаосу']]){
  modLabels[`${type}Resistance`]=v=>`${percent(v)} сопротивления ${label}`;
  modLabels[`max${type[0].toUpperCase()+type.slice(1)}Resistance`]=v=>`${percent(v)} максимального сопротивления ${label}`;
  modLabels[`added${type[0].toUpperCase()+type.slice(1)}`]=v=>`${signed(v)} урона ${label}`;
}

export function paintItemImage(element,item,fallback){
  element.replaceChildren();
  const id=ART[item?.name];
  if(!id){
    if(fallback)fallback(element,item);
    else {
      const frame={Nebulis:0,'Cloak of Flame':1,'Dying Sun':2,Headhunter:4,'Death Rush':15}[item?.name];
      if(frame!==undefined){element.classList.add('painted-icon');element.style.setProperty('--art-x',`${frame%4*100/3}%`);element.style.setProperty('--art-y',`${Math.floor(frame/4)*100/3}%`);}
      else element.textContent=item?.icon||'◈';
    }
    return;
  }
  element.classList.add('unique-item-art');
  const image=document.createElement('img'); image.alt='';image.decoding='async';image.src=new URL(`./assets/uniques/${id}.png`,import.meta.url).href;element.append(image);
}

export function renderItemCard(target,item,{fallbackIcon}={}){
  target.replaceChildren();target.style.setProperty('--item-color',item?.color||'#8b9a7d');
  if(!item){const empty=document.createElement('p');empty.className='empty-item';empty.textContent='Пустой слот';target.append(empty);return;}
  const icon=document.createElement('span');icon.className='item-icon';paintItemImage(icon,item,fallbackIcon);
  const rarity=document.createElement('div');rarity.className='item-rarity';rarity.textContent=`${rarities[item.rarity]||'ПРЕДМЕТ'} · ${SLOT_NAMES[item.slot]||''}${item.twoHanded?' · ДВУРУЧНОЕ':''}`;
  const title=document.createElement('h4');title.textContent=item.name;
  const description=document.createElement('p');description.textContent=item.rarity==='unique'?flavour[item.uniqueId]||item.description||'':item.slot==='flask'?'Бонусы действуют во время эффекта. Флакон используется автоматически.':item.rarity==='normal'?'Снаряжение изгнанника.':'';
  const mods=document.createElement('ul');
  const lines=Array.isArray(item.sourceStats)?item.sourceStats:Object.entries(item.mods||{}).map(([key,value])=>Number.isFinite(value)?modLabels[key]?.(value):null).filter(Boolean);
  for(const text of lines){const li=document.createElement('li');li.textContent=text;mods.append(li);}
  target.append(icon,rarity,title,description,mods);
}

// Project both sides on independent clones: opening a comparison must not equip, roll or advance the live run.
export function equipmentProjection(run,item){
  const before=structuredClone(run),after=structuredClone(run);
  after.phase='loot';after.pendingItem=structuredClone(item);equipLoot(after,true);
  const read=current=>({ ...classSummary(current),speed:stats(current).speed,
    ...Object.fromEntries(['bolt','orbit','nova','lightning','minion'].map(id=>[id,skillStats(current,id).damage])) });
  return {before:read(before),after:read(after),replacement:lootReplacement(run,item)};
}

export function renderEquipmentDelta(target,run,item){
  target.replaceChildren();const {before,after}=equipmentProjection(run,item);
  const title=document.createElement('strong');title.textContent='СРАЗУ ПОСЛЕ ЭКИПИРОВКИ';target.append(title);
  const list=document.createElement('div');list.className='equipment-deltas';
  const fields=[['life','Жизнь'],['mana','Мана'],['energyShield','Энергощит'],['armour','Броня'],['evasion','Уклонение'],['accuracy','Меткость'],['speed','Скорость'],['fire','Огонь','%'],['cold','Холод','%'],['lightning','Молния','%'],['chaos','Хаос','%']];
  for(const [key,label,unit] of fields){
    const previous=Math.round((before[key]||0)*(unit?100:1)),next=Math.round((after[key]||0)*(unit?100:1));
    if(previous===next)continue;
    const row=document.createElement('span');row.className=next>previous?'gain':'loss';row.textContent=`${label} ${previous}${unit||''} → ${next}${unit||''}`;list.append(row);
  }
  for(const [key,label] of [['bolt','Winter Orb'],['orbit','Blade Vortex'],['nova','Righteous Fire'],['lightning','Kinetic Fusillade'],['minion','Raise Spectre']]){
    if(!run.upgrades[key])continue;
    const a=Math.round(before[key]),b=Math.round(after[key]);if(a===b)continue;
    const row=document.createElement('span');row.className=b>a?'gain':'loss';row.textContent=`${label}: ${a} → ${b} урона`;list.append(row);
  }
  const note=document.createElement('p');note.textContent=list.childElementCount?'Условные эффекты срабатывают в бою, как указано в свойствах предмета.':'Постоянные характеристики не меняются. Особые эффекты указаны в свойствах предмета.';
  target.append(list,note);
}

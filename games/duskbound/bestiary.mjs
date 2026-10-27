import {createRun,tick,equipLoot,stats,uniqueSummary} from './core.mjs';
import {refreshClassResources,classSummary} from './classes.mjs';
import {UNIQUE_IDS,makeUnique,assignRareModifiers} from './uniques.mjs';
import {MONSTERS,BOSSES,spawnPoeEnemy,startBossEncounter} from './encounters.mjs';
import {Renderer} from './render.mjs';
import {renderItemCard} from './item-ui.mjs';

const $=id=>document.getElementById(id),renderer=new Renderer($('bestiaryCanvas'));
const bossText={brutus:'Цепь притягивает к тюремщику. Отойди от серии ударов и наземной волны.',merveil:'Сирена обрушивает ледяной дождь. Вторая форма открывает холодные гейзеры и зовёт потомство.',dominus:'Уклонись от потока душ и «Касания бога». Во второй форме пережди кровавый дождь внутри безопасного круга.',kitava:'Голодный бог бьёт широкими размахами и огненным дыханием. Когда появится сердце, атаковать нужно его.'};
const monsterText={drowned:'Медленный утопленник. От его ближнего удара можно отойти во время замаха.',rhoa:'Опасен по прямой: направление рывка фиксируется заранее. Уходи в сторону.',goatman:'Прыгает в отмеченную точку. Круг и тень показывают место приземления.',ancientArcher:'Стреляет физическими стрелами после натяжения лука. Держись в движении.',flameSentinel:'Парящие ленты выпускают огненный веер. Между снарядами есть проходы.',evangelist:'Золотой купол защищает от попаданий снаружи. Войди внутрь или используй урон со временем; следи за отложенными взрывами.',carrionQueen:'Порождает мелких Carrion Minions рядом с собой и плюётся издалека.',tentacleMiscreation:'Две последовательные серии шипов с физическим и огненным уроном. После залпа уязвима во время восстановления.'};
const moves={meleeWindup:'ближний удар',rhoaCharge:'рывок',leapSlam:'прыжок',bowDraw:'выстрел',fireFan:'огненный веер',physicalRune:'физический взрыв',broodSpawn:'выводок',carrionSpit:'плевок',spineVolley:'серию шипов',chainPull:'цепь',brutusSlams:'серию ударов',iceFan:'ледяной залп',iceStorm:'ледяной дождь',coldGeysers:'гейзеры',lightningSouls:'поток душ',touchOfGod:'Касание бога',bloodRain:'кровавый дождь',kitavaSwipe:'размах',fireBreath:'огненное дыхание'};
const schedule={brutus:'02:00',merveil:'04:00',dominus:'06:00',kitava:'07:30'};
const relics=UNIQUE_IDS.map((id,index)=>makeUnique(id,1000+index,()=>.5));
let tab='bosses',selected='brutus',run,paused=false,last=0,primaryId=null,lastReadout=-1;
const companions={'inpulsas-broken-heart':'yoke-of-suffering','crown-of-eyes':'obliteration','yoke-of-suffering':'bereks-respite','eye-of-innocence':'bereks-respite','bereks-respite':'eye-of-innocence','ralakeshs-impatience':'daressos-defiance'};
function practicePack(){
  for(const [kind,x,y] of [['drowned',60,70],['ancientArcher',160,-50],['flameSentinel',-70,-80],['drowned',70,-70]]){
    const target=spawnPoeEnemy(run,kind,{x:run.player.x+x,y:run.player.y+y});
    if(!target)continue;target.hp=target.maxHp=600;target.damage=6;
    if(kind==='drowned'&&y<0){target.elite=true;assignRareModifiers(target,()=>.4);}
  }
}

function resetScene(){
  // This independent demonstration uses extra life/recovery; all attacks still pass through the real battle model.
  run=createRun({classId:'witch',seed:1027,bonuses:{maxHp:5000,regen:180}});
  run._spawnTimer=Infinity;run._nextElite=Infinity;run.xpNeeded=Infinity;run.terrain=[];run.upgrades={};
  run.player.x=-90;run.player.y=30;
  if(tab==='bosses')primaryId=startBossEncounter(run,selected,{x:90,y:0})?.id;
  if(tab==='monsters')primaryId=spawnPoeEnemy(run,selected,{x:90,y:30})?.id;
  if(tab==='uniques'){
    run.upgrades={bolt:4,orbit:3,nova:2,lightning:3,minion:1};
    run.links.lightning={critical:3};
    if(companions[selected]){run.pendingItem=makeUnique(companions[selected],run._nextId++,()=>.5);run.phase='loot';equipLoot(run,true);}
    run.pendingItem=makeUnique(selected,run._nextId++,()=>.5);run.phase='loot';equipLoot(run,true);
    if(selected==='aegis-aurora')run.equipment.body={id:'preview-body',slot:'body',rarity:'normal',mods:{armour:1500,energyShield:100}};
    practicePack();
    primaryId=null;
  }
  refreshClassResources(run);lastReadout=-1;updatePhaseButton();
}
function entries(){return tab==='bosses'?Object.values(BOSSES):tab==='monsters'?Object.values(MONSTERS):relics.map(r=>({id:r.uniqueId,name:r.name,slot:r.slot}));}
function updatePicker(){
  const picker=$('bestiaryPicker'),items=entries(),buttons=[...picker.children];
  // Selection changes retain the focused button and the picker's scroll position.
  if(buttons.length===items.length&&buttons.every((button,index)=>button.dataset.entry===items[index].id)){
    for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.entry===selected));
    return;
  }
  picker.replaceChildren(...items.map((item,index)=>{
    const b=document.createElement('button');b.type='button';b.dataset.entry=item.id;b.setAttribute('aria-pressed',String(item.id===selected));
    const name=document.createElement('span');name.textContent=item.name;const small=document.createElement('small');
    small.textContent=tab==='bosses'?`${schedule[item.id]} · УНИКАЛЬНЫЙ ТРОФЕЙ`:tab==='monsters'?`${String(index+1).padStart(2,'0')} · ${item.id==='evangelist'?'ЩИТ И ВЗРЫВЫ':item.id==='rhoa'?'РЫВОК':item.id==='goatman'?'ПРЫЖОК':'ПРИЁМЫ ПРОТИВНИКА'}`:'СВОЙСТВА И ДЕМОНСТРАЦИЯ';
    b.append(name,small);b.onclick=()=>{selected=item.id;updateSelection();};return b;
  }));
}
function updateSelection(){
  updatePicker();const entry=entries().find(e=>e.id===selected);
  $('sceneKicker').textContent=tab==='bosses'?`${schedule[selected]} · БОСС НОЧИ`:tab==='monsters'?'ПРОТИВНИК РЭКЛАСТА':'УНИКАЛЬНАЯ РЕЛИКВИЯ';
  $('sceneTitle').textContent=entry.name;
  const companion=companions[selected]?relics.find(r=>r.uniqueId===companions[selected])?.name:null;
  $('sceneDescription').textContent=tab==='bosses'?bossText[selected]:tab==='monsters'?monsterText[selected]:companion?`Демонстрационная связка: ${entry.name} + ${companion}. Свойства одного из возможных экземпляров.`:'Один из возможных экземпляров в демонстрационной сборке. Особые свойства зависят от условий боя.';
  $('selectedRelic').hidden=tab!=='uniques';
  if(tab==='uniques')renderItemCard($('selectedRelic'),relics.find(r=>r.uniqueId===selected));
  $('bestiaryAnnouncer').textContent=entry.name;resetScene();
}
function updatePhaseButton(){
  const boss=run?.enemies.find(e=>e.id===primaryId);
  $('scenePhase').hidden=tab!=='bosses'||selected==='brutus';
  $('scenePhase').disabled=!boss||boss.phase===2;
  $('scenePhase').textContent=boss?.phase==='heart'?'Уничтожить сердце':'Следующая форма';
}
$('scenePhase').onclick=()=>{
  const boss=run.enemies.find(e=>e.id===primaryId);if(!boss)return;
  // A visible gallery control advances its fixture to the next real model transition, outside the player's run.
  if(boss.phase===1)boss.hp=boss.maxHp*.5;
  else if(boss.phase==='heart'){const heart=run.enemies.find(e=>e.kind==='heart'&&e.bodyId===boss.id);if(heart)heart.hp=0;}
  // The explicit fixture control also works while paused during the arrival warning.
  boss.telegraph=0;
  tick(run,.001,{});lastReadout=-1;updatePhaseButton();
};
for(const button of document.querySelectorAll('[data-tab]'))button.onclick=()=>{
  tab=button.dataset.tab;selected=tab==='bosses'?'brutus':tab==='monsters'?'drowned':UNIQUE_IDS[0];
  for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-pressed',String(b===button));updateSelection();
};
function pauseLabel(){$('scenePause').textContent=paused?'Продолжить':'Пауза';$('scenePause').setAttribute('aria-pressed',String(paused));}
$('scenePause').onclick=()=>{paused=!paused;pauseLabel();};
$('sceneLow').checked=matchMedia('(prefers-reduced-motion:reduce)').matches;renderer.lowEffects=$('sceneLow').checked;
$('sceneLow').onchange=()=>{renderer.lowEffects=$('sceneLow').checked;};
window.addEventListener('resize',()=>renderer.resize());
document.addEventListener('visibilitychange',()=>{if(document.hidden){paused=true;pauseLabel();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.repeat){paused=!paused;pauseLabel();}});
function frame(now){
  const dt=last?Math.min(.05,Math.max(0,(now-last)/1000)):0;last=now;
  const primary=run.enemies.find(e=>e.id===primaryId),center=primary?.encounterCenter||primary||{x:0,y:0};
  if(!paused){
    const moving=$('sceneMovement').checked,goal={x:center.x+Math.cos(run.time*.65)*165,y:center.y+Math.sin(run.time*.65)*140};
    const input=moving?{x:(goal.x-run.player.x)/90,y:(goal.y-run.player.y)/90}:{};
    tick(run,dt,input);
    // Loot/progression choices belong to the real game; demonstrations keep their original setup.
    if(run.phase==='loot')equipLoot(run,false);
    if(tab==='uniques'&&run.enemies.filter(e=>e.hp>0).length<2)practicePack();
    if(run.phase==='dead'||run.phase==='won'||run.time>35)resetScene();
  }
  run.texts.length=0;
  const actor=run.enemies.find(e=>e.id===primaryId),focus={x:actor?(run.player.x+actor.x)/2:run.player.x,y:actor?(run.player.y+actor.y)/2-(selected==='kitava'?95:40):run.player.y-25};
  renderer.zoom=Math.min(renderer.width<700?.83:1.05,renderer.width/(Math.abs((actor?.x||0)-run.player.x)+260));
  renderer.render(run,{character:'witch',focus});
  if(run.time-lastReadout>.12||lastReadout<0){
    const a=actor?.action,phase=actor?.phase==='heart'?'Сердце открыто':actor?.phase===2?'Вторая форма':a?.phase==='windup'?`Готовит ${moves[a.kind]||'атаку'}`:a?.phase==='airborne'?'В прыжке':a?.phase==='recover'?'Восстанавливается':actor?.name||'Реликвия в бою';
    const b=run.classState.combat,u=uniqueSummary(run),s=stats(run);
    const statuses=[phase,`Жизнь ${Math.ceil(run.player.hp)}/${Math.ceil(run.player.maxHp)}`];
    if(run.player.maxEnergyShield>0)statuses.push(`ES ${Math.ceil(run.player.energyShield)}/${Math.ceil(run.player.maxEnergyShield)}`);
    if(b.onslaughtUntil>run.time)statuses.push('Боевой раж');
    if(b.adrenalineUntil>run.time)statuses.push('Адреналин');
    if(u.stolenModifiers.length)statuses.push(`Украдено ${u.stolenModifiers.length}`);
    if(tab==='uniques'&&s.damage)statuses.push(`Броня ${Math.round(classSummary(run).armour)}`);
    $('sceneReadout').textContent=statuses.join(' · ');updatePhaseButton();lastReadout=run.time;
  }
  requestAnimationFrame(frame);
}
updateSelection();pauseLabel();requestAnimationFrame(frame);

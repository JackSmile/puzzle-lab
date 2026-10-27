import { createRun, tick, chooseUpgrade, setPaused, stats, UPGRADES, CHARACTERS, DURATION, supportTargets, equipLoot, lootReplacement, uniqueSummary } from './core.mjs';
import { Renderer, drawPortrait } from './render.mjs';
import { SLOT_NAMES, renderItemCard, renderEquipmentDelta } from './item-ui.mjs';
import { spawnPoeEnemy } from './encounters.mjs';
import { Soundscape } from './audio.mjs';
import { readProfile, saveProfile } from './profile.mjs';
import { CLASSES, getAscendancies as originalAscendancies, getNotables as originalNotables, classSummary, chooseAscendancy, chooseAscendancyNode, allocateAttribute, finishAscendancy, openAscendancy } from './classes.mjs';

import russianTree from './data/poe-russian-source.json' with { type: 'json' };

const localizedClasses = new Map(russianTree.classes.map(item => [item.id, item]));
const localizedAscendancies = new Map(russianTree.classes.flatMap(item => item.ascendancies.map(asc => [asc.id, asc])));
const fixSourceTypo = text => text.replaceAll('Lарует', 'Дарует');
const className = id => localizedClasses.get(id)?.name || id;
const ascendancyName = id => localizedAscendancies.get(id)?.name || id;
const ascendancyDescriptions = {
  Juggernaut: 'Непоколебимая защита, броня, меткость и восстановление после ударов.', Berserker: 'Ярость, сокрушительные атаки и похищение жизни ценой уязвимости.', Chieftain: 'Огонь, сопротивления и взрывы поверженных врагов.',
  Raider: 'Ожог, шок и заморозка. Высвободи накопленную силу стихий.', Deadeye: 'Дальние залпы, дополнительные снаряды и рикошеты.', Pathfinder: 'Флаконы, восстановление зарядов и смертоносное отравление.',
  Occultist: 'Проклятия, холод, хаос и взрывы нечестивой силы.', Elementalist: 'Стихийные состояния и разрушительная магия огня и холода.', Necromancer: 'Призраки, подношения и сила павших врагов.',
  Slayer: 'Критические удары, добивание и неутолимое похищение жизни.', Gladiator: 'Кровотечение, блок и кровавые взрывы.', Champion: 'Стойкость, провокация и пронзание. Подавляй врагов вблизи.',
  Inquisitor: 'Критические заклинания и освящённая земля под ногами.', Hierophant: 'Запас маны, тайный всплеск и боевые тотемы.', Guardian: 'Могучий страж, защитные ауры и восстановление.',
  Assassin: 'Смертельные критические удары, неуловимость и яд.', Trickster: 'Скорость, энергощит и восстановление за поверженных врагов.', Saboteur: 'Ослепление, урон по области и возвращающиеся снаряды.',
  Ascendant: 'Соедини пути других классов и получи дополнительные пассивные очки.', Reliquarian: 'Воплоти свойства легендарных реликвий в собственных пассивных умениях.', Luminary: 'Усиливай наёмника и вместе владейте силой найденных реликвий.'
};
const getAscendancies = id => originalAscendancies(id).map(item => ({ ...item, name: ascendancyName(item.id), description: ascendancyDescriptions[item.id] || '' }));
const getNotables = (id, currentRun) => originalNotables(id, currentRun).map(item => {
  const translated = russianTree.nodes[String(item.id)];
  return { ...item, name: translated?.name || item.name, stats: (translated?.stats || item.stats).map(fixSourceTypo),
    originalPathNodeNames: item.prerequisiteIds?.map(nodeId => russianTree.nodes[String(nodeId)]?.name).filter(Boolean) };
});
const $ = id => document.getElementById(id);
let storage; try { storage = window.localStorage; } catch { storage = null; }
const profile = readProfile(storage);
const renderer = new Renderer($('arena'));
const audio = new Soundscape(profile.sound);
renderer.lowEffects = profile.lowEffects || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
$('lowEffects').checked = renderer.lowEffects;
let selectedClass = profile.classId, run = null, preview, screen = 'menu', helpReturn = 'menu', buildReturn = 'playing';
let pendingSupport = null, lastFrame = 0, lastHUD = 0, lastKills = 0, lastHP = 0, lastXP = 0, lastWave = 0, noticeUntil = 0, savedRun = false;
const keys = new Set(), stick = { x: 0, y: 0, pointer: null };
const overlayIds = { upgrade: 'upgradeScreen', pause: 'pauseScreen', result: 'resultScreen', help: 'helpScreen', loot: 'lootScreen', build: 'buildScreen', ascendancy: 'ascendancyScreen' };
const classLabels = Object.fromEntries(russianTree.classes.map(item => [item.id, item.name]));
const starterSkills = { marauder: 'nova', ranger: 'lightning', witch: 'bolt', shadow: 'orbit', duelist: 'orbit', templar: 'minion', scion: 'bolt' };
const slotNames = SLOT_NAMES;
const formatTime = time => `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
const gemFrames = { bolt: 10, orbit: 9, nova: 8, lightning: 11, minion: 9 };
function paintIcon(element, frame) {
  element.classList.add('painted-icon'); element.style.setProperty('--art-x', `${frame % 4 * 100 / 3}%`); element.style.setProperty('--art-y', `${Math.floor(frame / 4) * 100 / 3}%`);
}
function itemFrame(item) {
  return ({ Nebulis: 0, 'Cloak of Flame': 1, 'Dying Sun': 2, Mageblood: 3, Headhunter: 4, 'Death Rush': 15 })[item.name] ?? ({ weapon: 7, body: 6, flask: 2, belt: 4, ring: 15, helmet: 6, shield: 13, offhand: 7, quiver: 7, amulet: 5 })[item.slot] ?? 5;
}
const persist = () => saveProfile(storage, profile);
const announce = text => { $('announcer').textContent = text; };

function resetInput() {
  keys.clear(); stick.x = stick.y = 0; stick.pointer = null; $('joystickThumb').style.transform = '';
}
function syncScreens(focus = true) {
  $('menu').hidden = screen !== 'menu';
  $('hud').hidden = !run || screen === 'menu' || (screen === 'help' && helpReturn === 'menu');
  for (const [name, id] of Object.entries(overlayIds)) $(id).hidden = name !== screen;
  $('pauseButton').hidden = !run || screen === 'menu'; $('buildButton').hidden = !run || screen === 'menu';
  const locked = !run || !['playing', 'paused'].includes(run.phase);
  $('pauseButton').disabled = locked; $('buildButton').disabled = locked;
  $('game').classList.toggle('in-run', Boolean(run && screen !== 'menu'));
  $('joystick').hidden = !run || screen !== 'playing' || !(innerWidth <= 700 || matchMedia('(pointer: coarse)').matches);
  if (screen !== 'playing') resetInput();
  if (focus) {
    const first = screen === 'menu' ? $('startButton') : overlayIds[screen] ? $(overlayIds[screen]).querySelector('button:not([disabled])') : $('arena');
    first?.focus({ preventScroll: true });
  }
}
function updateSound() {
  $('soundButton').textContent = audio.enabled ? '♫' : '♪';
  $('soundButton').setAttribute('aria-label', audio.enabled ? 'Выключить звук' : 'Включить звук');
  $('soundButton').title = audio.enabled ? 'Выключить звук' : 'Включить звук';
  $('soundButton').setAttribute('aria-pressed', String(audio.enabled));
}
function makePreview() {
  preview = createRun({ seed: 14, classId: selectedClass }); preview.phase = 'paused';
  preview.enemies = [];
  for (const [kind,x,y] of [['drowned',-115,-140],['goatman',155,80],['ancientArcher',105,-125],['flameSentinel',-120,135],['rhoa',187,-95]]) spawnPoeEnemy(preview,kind,{x,y});
  preview.gems = Array.from({ length: 8 }, (_, i) => ({ x: Math.cos(i * 1.1) * (70 + i * 4), y: Math.sin(i * 1.1) * (70 + i * 3), value: 1, radius: 4 }));
}
function updateMenu() {
  const hero = CLASSES.find(h => h.id === selectedClass) || CLASSES[0];
  const attrs = hero.baseAttributes;
  $('heroName').textContent = `${className(hero.id)} · ${hero.name}`;
  $('heroDescription').textContent = `${UPGRADES[starterSkills[hero.id]].name} · Восхождения: ${getAscendancies(hero.id).map(a => a.name).join(', ')}`;
  $('heroCount').textContent = `0${CLASSES.indexOf(hero) + 1} / 07`;
  $('baseAttributes').replaceChildren(...[['СИЛ', attrs.strength], ['ЛОВ', attrs.dexterity], ['ИНТ', attrs.intelligence]].map(([name, value]) => { const span = document.createElement('span'); span.textContent = `${name} ${value}`; return span; }));
  $('personalBest').textContent = profile.runs ? `Твой рекорд: ${formatTime(profile.bestTime)} · ${profile.bestKills} повержено${profile.wins ? ` · побед: ${profile.wins}` : ''}` : 'Первый рассвет начинается с одного шага';
  $('heroOptions').replaceChildren(...CLASSES.map(item => {
    const button = document.createElement('button'); button.type = 'button'; button.className = `hero-option${item.id === selectedClass ? ' selected' : ''}`;
    button.setAttribute('aria-label', `${classLabels[item.id]} — ${item.name}`); button.setAttribute('aria-pressed', String(item.id === selectedClass));
    const portrait = document.createElement('canvas'); portrait.setAttribute('aria-hidden', 'true'); drawPortrait(portrait, item.id);
    const label = document.createElement('span'); label.textContent = className(item.id); button.append(portrait, label);
    button.onclick = () => { selectedClass = item.id; profile.classId = selectedClass; persist(); updateMenu(); makePreview(); };
    return button;
  }));
}
function startRun() {
  resetInput(); audio.unlock(); audio.play('start');
  run = createRun({ seed: Date.now() >>> 0, classId: selectedClass });
  screen = 'playing'; pendingSupport = null; savedRun = false; lastKills = lastXP = lastWave = 0; lastHP = run.player.hp;
  noticeUntil = 4; $('waveNotice').textContent = 'Пусть ночь запомнит твоё имя';
  $('firstTip').style.opacity = '1'; syncScreens(); updateHUD(); announce('Забег начался. Собирай кристаллы опыта.');
}
function returnMenu() {
  run = null; screen = 'menu'; resetInput(); updateMenu(); makePreview(); syncScreens();
}
function pauseRun() {
  if (!run || run.phase !== 'playing') return;
  setPaused(run, true); screen = 'pause'; syncScreens(); announce('Игра на паузе.');
}
function resumeRun() {
  if (!run || run.phase !== 'paused') return;
  setPaused(run, false); screen = 'playing'; syncScreens(); announce('Забег продолжен.');
}
function renderWeaponBar() {
  $('weaponBar').replaceChildren(...Object.entries(run.upgrades).filter(([id, level]) => level && UPGRADES[id]).map(([id, level]) => {
    const def = UPGRADES[id], slot = document.createElement('div'); slot.className = `weapon-slot${def.type === 'passive' ? ' passive' : ''}`;
    slot.style.setProperty('--slot-color', def.color); slot.title = `${def.name} · уровень ${level}`; slot.setAttribute('aria-label', slot.title);
    if (def.type === 'weapon') paintIcon(slot, gemFrames[id] ?? 10); else slot.append(document.createTextNode(def.icon));
    const number = document.createElement('small'); number.textContent = level; slot.append(number);
    const count = Object.keys(run.links?.[id] || {}).length;
    if (count) { const links = document.createElement('span'); links.className = 'slot-links'; links.textContent = '◆'.repeat(count); slot.append(links); }
    return slot;
  }));
}
function updateHUD() {
  if (!run) return;
  const p = run.player;
  $('healthText').textContent = `${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`; $('healthFill').style.width = `${Math.max(0, p.hp / p.maxHp * 100)}%`;
  $('lifeGlobeFill').style.height = `${Math.max(0, p.hp / p.maxHp * 100)}%`; $('lifeGlobeText').textContent = `${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`;
  $('manaGlobeFill').style.height = `${Math.max(0, Math.min(100, (p.mana || 0) / (p.maxMana || 1) * 100))}%`; $('manaGlobeText').textContent = `${Math.ceil(p.mana || 0)} / ${Math.ceil(p.maxMana || 0)}`;
  $('energyShieldText').textContent = p.energyShield > 0 ? ` · ES ${Math.ceil(p.energyShield)}` : '';
  $('timer').textContent = formatTime(run.time); $('killCount').textContent = run.kills;
  $('xpFill').style.width = `${Math.min(100, run.xp / run.xpNeeded * 100)}%`; $('levelLabel').textContent = `УРОВЕНЬ ${run.level}`;
  const labels = ['НОЧЬ НАЧИНАЕТСЯ', 'ТЬМА СГУЩАЕТСЯ', 'ПРОБУЖДЕНИЕ ТЕНЕЙ', 'ПРОКЛЯТЫЕ ПРИШЛИ', 'БЕЗДНА СМОТРИТ', 'ПОСЛЕДНИЙ РУБЕЖ', 'НАВСТРЕЧУ РАССВЕТУ', 'ХРАНИТЕЛЬ БЕЗДНЫ', 'СЛОМИ ХРАНИТЕЛЯ'];
  const wave = Math.min(8, Math.floor(run.time / 60)); $('waveLabel').textContent = labels[wave];
  if (wave !== lastWave) { lastWave = wave; $('waveNotice').textContent = labels[wave]; noticeUntil = run.time + 4; }
  $('waveNotice').style.opacity = run.time < noticeUntil ? '1' : '0';
  $('firstTip').style.opacity = run.time > 22 ? '0' : '1';
  const body = run.enemies.find(e => e.kind === 'boss' && e.hp > 0);
  const boss = body?.invulnerable ? run.enemies.find(e => e.kind === 'heart' && e.hp > 0) || body : body;
  $('bossPanel').hidden = !boss;
  if (boss) { $('bossFill').style.width = `${Math.max(0, boss.hp / boss.maxHp) * 100}%`; $('bossHealthText').textContent = `${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`; $('bossName').textContent = boss.name || 'Хранитель бездны'; $('bossPhase').textContent = `${boss.kind === 'heart' ? 'Уничтожь сердце' : boss.phase === 2 ? 'Вторая форма' : 'Первая форма'} · Боссы ${run.encounters?.defeatedBosses.length || 0}/4`; }
  const combat = run.classState?.combat;
  const uniques = uniqueSummary(run);
  const statuses = [];
  if (uniques.flask.name) statuses.push(`◉ ${Math.floor(uniques.flask.charges)}/${uniques.flask.capacity}${uniques.flask.active ? ` · ${Math.ceil(uniques.flask.remaining)}с` : ''}`);
  if (uniques.stolenModifiers.length) statuses.push(`Присвоено свойств: ${uniques.stolenModifiers.length}`);
  if (combat?.adrenalineUntil > run.time) statuses.push(`Адреналин ${Math.ceil(combat.adrenalineUntil - run.time)}с`);
  if (combat?.onslaughtUntil > run.time) statuses.push(`Боевой раж ${Math.ceil(combat.onslaughtUntil - run.time)}с`);
  if (p.ailments?.corruptedBlood?.until > run.time) statuses.push(`Осквернённая кровь ×${p.ailments.corruptedBlood.stacks}`);
  for (const [id, label] of [['rage', 'Свирепость'], ['power', 'Энергия'], ['frenzy', 'Ярость'], ['endurance', 'Выносливость']]) if (combat?.[id] > 0) statuses.push(`${label} ${Math.floor(combat[id])}`);
  $('combatStatus').textContent = statuses.join(' · ');
  renderWeaponBar();
}
function upgradeCard(id, index, targetMode = false) {
  const def = UPGRADES[id], current = run.upgrades[id] || 0, button = document.createElement('button');
  button.className = 'upgrade-card'; button.type = 'button'; button.dataset.upgrade = id;
  const number = document.createElement('span'); number.className = 'card-number'; number.textContent = index + 1;
  const icon = document.createElement('span'); icon.className = 'upgrade-icon'; icon.textContent = def.icon; icon.style.color = def.color;
  if (def.type === 'weapon' || def.type === 'support') { paintIcon(icon, def.type === 'support' ? 12 : gemFrames[id] ?? 10); icon.textContent = ''; }
  const type = document.createElement('span'); type.className = 'upgrade-type'; type.textContent = targetMode ? 'СВЯЗАТЬ ПОДДЕРЖКУ' : def.type === 'weapon' ? current ? 'УЛУЧШЕНИЕ УМЕНИЯ' : 'НОВЫЙ КАМЕНЬ УМЕНИЯ' : def.type === 'support' ? 'КАМЕНЬ ПОДДЕРЖКИ' : 'ПАССИВНЫЙ ДАР';
  const title = document.createElement('h3'); title.textContent = def.name;
  const description = document.createElement('p'); description.textContent = targetMode ? `${UPGRADES[pendingSupport].name} изменит только это умение.` : def.description.replace(/^(Адаптация: |Наш баланс: )/, '');
  const level = document.createElement('div'); level.className = 'upgrade-level';
  const levelText = document.createElement('span'); levelText.textContent = targetMode ? `${UPGRADES[pendingSupport].name}` : def.type === 'support' ? 'ВЫБОР СВЯЗАННОГО УМЕНИЯ →' : `УРОВЕНЬ ${current} → ${current + 1}`;
  const detail = document.createElement('span'); detail.textContent = targetMode ? 'СВЯЗАТЬ →' : def.type === 'support' ? '◆—◆' : `ИЗ ${def.max}`;
  level.append(levelText, detail); button.append(number, icon, type, title, description, level);
  button.onclick = () => {
    if (targetMode) { if (chooseUpgrade(run, pendingSupport, id)) finishChoice(); }
    else if (def.type === 'support') { pendingSupport = id; showUpgrades(true); }
    else if (chooseUpgrade(run, id)) finishChoice();
  };
  return button;
}
function showUpgrades(targetMode = false) {
  screen = 'upgrade';
  $('upgradeTitle').textContent = targetMode ? 'Свяжи камни' : 'Выбери дар';
  $('upgradeScreen').querySelector('.dialog-subtitle').textContent = targetMode ? `К какому умению добавить ${UPGRADES[pendingSupport].name}?` : 'Ночь подождёт. Какой станет твоя магия?';
  const ids = targetMode ? supportTargets(run, pendingSupport) : run.offered;
  $('upgradeCards').replaceChildren(...ids.map((id, i) => upgradeCard(id, i, targetMode)));
  if (targetMode) {
    const back = document.createElement('button'); back.className = 'text-button support-back'; back.textContent = '← Вернуться к выбору дара'; back.onclick = () => { pendingSupport = null; showUpgrades(); };
    $('upgradeCards').append(back);
  }
  syncScreens();
}
function finishChoice() {
  pendingSupport = null; audio.play('choose');
  if (run.phase === 'upgrade') showUpgrades();
  else if (run.phase === 'loot') showLoot();
  else if (run.phase === 'ascendancy') showAscendancy();
  else { screen = 'playing'; syncScreens(); }
  updateHUD();
}

function itemCard(target, item) {
  renderItemCard(target,item,{fallbackIcon:(element,gear)=>paintIcon(element,itemFrame(gear))});
}
function showLoot() {
  if (!run.pendingItem) return;
  screen = 'loot';
  const replacement=lootReplacement(run),removed=(replacement.items||[replacement]).filter(entry=>entry.item),current=$('currentItem');
  current.classList.toggle('replacement-stack',removed.length>1);
  if(removed.length>1){
    current.replaceChildren(...removed.map(entry=>{const card=document.createElement('div');card.className='item-card replaced-item-card';itemCard(card,entry.item);return card;}));
  }else itemCard(current,removed[0]?.item);
  $('replacementCaption').textContent=removed.length>1?'БУДЕТ СНЯТО':'НАДЕТО';
  itemCard($('newItem'), run.pendingItem);renderEquipmentDelta($('equipmentDelta'),run,run.pendingItem);
  syncScreens(); announce(`Найден предмет ${run.pendingItem.name}.`);
}
function resolveLoot(take) {
  if (!run || run.phase !== 'loot') return;
  equipLoot(run, take); audio.play('choose');
  if (run.phase === 'upgrade') showUpgrades();
  else if (run.phase === 'loot') showLoot();
  else if (run.phase === 'ascendancy') showAscendancy();
  else { screen = 'playing'; syncScreens(); }
  updateHUD();
}
function showBuild() {
  if (!run || !['playing', 'paused'].includes(run.phase)) return;
  buildReturn = screen; if (run.phase === 'playing') setPaused(run, true);
  screen = 'build'; const skills = $('buildSkills'); skills.replaceChildren();
  renderCharacterSheet();
  for (const [id, level] of Object.entries(run.upgrades).filter(([id]) => UPGRADES[id]?.type === 'weapon')) {
    const block = document.createElement('div'); block.className = 'skill-link-block';
    const title = document.createElement('h4'); title.style.color = UPGRADES[id].color; title.textContent = `${UPGRADES[id].icon} ${UPGRADES[id].name} · ${level}`;
    const links = document.createElement('div'); links.className = 'linked-supports';
    for (const [support, rank] of Object.entries(run.links?.[id] || {})) { const label = document.createElement('span'); label.textContent = `◆ ${UPGRADES[support].name} ${rank}`; links.append(label); }
    if (!links.childElementCount) { const label = document.createElement('span'); label.className = 'empty-link'; label.textContent = '◇ Два свободных гнезда поддержки'; links.append(label); }
    block.append(title, links); skills.append(block);
  }
  const values = stats(run), attributes = document.createElement('p'); attributes.className = 'build-attributes';
  attributes.textContent = `Урон: ${Math.round(values.damage)} · Скорость: ${Math.round(values.speed)} · Восстановление: ${values.regen.toFixed(1)}/с`; skills.append(attributes);
  const uniqueEffects = uniqueSummary(run);
  if (uniqueEffects.flask.name) {
    const label = document.createElement('p'); label.className = 'build-attributes';
    label.textContent = `${uniqueEffects.flask.name}: ${Math.floor(uniqueEffects.flask.charges)}/${uniqueEffects.flask.capacity} зарядов · расход ${uniqueEffects.flask.chargesUsed}${uniqueEffects.flask.active ? ` · действует ещё ${Math.ceil(uniqueEffects.flask.remaining)}с` : ' · набирает заряды'}`; skills.append(label);
  }
  for (const effect of uniqueEffects.stolenModifiers) {
    const label = document.createElement('p'); label.className = 'build-attributes'; label.textContent = `✦ ${effect.name} · ${Math.ceil(effect.remaining)}с — ${effect.description}`; skills.append(label);
  }
  $('buildEquipment').replaceChildren(...Object.keys(slotNames).map(slot => {
    const wrapper = document.createElement('div'), caption = document.createElement('div'); caption.className = 'item-caption'; caption.textContent = slotNames[slot];
    const card = document.createElement('div'); card.className = 'item-card compact'; itemCard(card, run.equipment?.[slot]); wrapper.append(caption, card); return wrapper;
  }));
  if (run.mercenary) {
    const companion = document.createElement('div'); companion.className = 'companion-loadout';
    const title = document.createElement('h3'); title.textContent = 'СНАРЯЖЕНИЕ НАЁМНИКА';
    const life = document.createElement('p'); life.className = 'build-attributes'; life.textContent = `Жизнь: ${Math.ceil(run.mercenary.hp)} / ${Math.ceil(run.mercenary.maxHp)}`;
    companion.append(title, life);
    const items = Object.values(run.mercenary.equipment || {}).filter(Boolean);
    if (!items.length) { const hint = document.createElement('p'); hint.className = 'build-attributes'; hint.textContent = 'Уникальные реликвии для наёмника откроются на его пути восхождения.'; companion.append(hint); }
    for (const item of items) { const card = document.createElement('div'); card.className = 'item-card compact'; itemCard(card, item); companion.append(card); }
    $('buildEquipment').append(companion);
  }
  syncScreens();
}
function renderCharacterSheet() {
  const summary = classSummary(run);
  $('buildTitle').textContent = `${classLabels[summary.classId] || summary.className}${summary.ascendancyName ? ` · ${ascendancyName(run.classState.ascendancyId)}` : ''}`;
  $('characterSheet').replaceChildren(...[['УРОВЕНЬ', run.level], ['СИЛА', summary.strength], ['ЛОВКОСТЬ', summary.dexterity], ['ИНТЕЛЛЕКТ', summary.intelligence], ['ЗДОРОВЬЕ', Math.round(summary.life)], ['МАНА', Math.round(summary.mana)], ['МЕТКОСТЬ', Math.round(summary.accuracy)], ['УКЛОНЕНИЕ', Math.round(summary.evasion)], ['БРОНЯ', Math.round(summary.armour)], ['ЭНЕРГОЩИТ', Math.round(summary.energyShield)], ['СОПР. ОГНЮ', `${Math.round(summary.fire * 100)}%`], ['СОПР. ХОЛОДУ', `${Math.round(summary.cold * 100)}%`], ['СОПР. МОЛНИИ', `${Math.round(summary.lightning * 100)}%`], ['СОПР. ХАОСУ', `${Math.round(summary.chaos * 100)}%`]].map(([name, value]) => { const block = document.createElement('div'); const number = document.createElement('strong'); number.textContent = value; const label = document.createElement('span'); label.textContent = name; block.append(number, label); return block; }));
  const actions = $('attributeActions');
  const focusedAttribute = actions.contains(document.activeElement) ? document.activeElement.dataset.attribute : null;
  actions.replaceChildren();
  const points = document.createElement('span'); points.textContent = `Очки пассивных умений: ${summary.passivePoints}`; actions.append(points);
  for (const [id, label] of [['strength', '+10 силы'], ['dexterity', '+10 ловкости'], ['intelligence', '+10 интеллекта']]) {
    const button = document.createElement('button'); button.className = 'secondary-button'; button.textContent = label; button.disabled = summary.passivePoints < 1; button.dataset.attribute = id;
    button.onclick = () => { allocateAttribute(run, id); renderCharacterSheet(); updateHUD(); }; actions.append(button);
  }
  if (summary.ascendancyPoints > 0) {
    const button = document.createElement('button'); button.className = 'secondary-button asc-points-button'; button.textContent = `Восхождение · ${summary.ascendancyPoints} очк.`;
    button.onclick = () => { openAscendancy(run); if (run.phase === 'ascendancy') showAscendancy(); }; actions.append(button);
  }
  const allocated = new Set(summary.allocatedNodeIds.map(String));
  $('allocatedAscendancy').replaceChildren(...(run.classState.ascendancyId ? getNotables(run.classState.ascendancyId, run).filter(node => allocated.has(String(node.id))).map(node => {
    const block = document.createElement('div'); block.className = 'allocated-node'; const title = document.createElement('strong'); title.textContent = node.name; const text = document.createElement('span'); text.textContent = node.stats.join(' · '); block.append(title, text); return block;
  }) : []));
  if (focusedAttribute) {
    const nextButton = actions.querySelector(`[data-attribute="${focusedAttribute}"]:not([disabled])`);
    (nextButton || $('buildCloseButton')).focus();
  }
}
function showAscendancy() {
  screen = 'ascendancy'; const selected = run.classState.ascendancyId, summary = classSummary(run);
  $('ascendancyTitle').textContent = selected ? ascendancyName(selected) : 'Выбери восхождение';
  $('ascendancyDescription').textContent = selected ? 'Исходные свойства узлов PoE 1. Малые узлы на пути выделяются вместе с ключевым.' : `${classLabels[summary.classId] || summary.className}. Этот путь определит твою силу до конца забега.`;
  $('ascendancyPoints').textContent = `ОЧКОВ ВОСХОЖДЕНИЯ: ${summary.ascendancyPoints} / 8`;
  const nodes = selected ? getNotables(selected, run) : getAscendancies(summary.classId);
  $('ascendancyOptions').classList.toggle('choosing-class', !selected);
  const allocated = new Set(summary.allocatedNodeIds.map(String));
  $('ascendancyOptions').replaceChildren(...nodes.map((node, index) => {
    const button = document.createElement('button'); button.className = `ascendancy-card${allocated.has(String(node.id)) ? ' allocated' : ''}`; button.type = 'button';
    const icon = document.createElement('span'); icon.className = 'ascendancy-sigil'; icon.textContent = node.icon || ['✧', '♜', '❖', '✦'][index % 4];
    const title = document.createElement('h3'); title.textContent = node.name;
    const description = document.createElement('p'); description.textContent = selected ? '' : node.description;
    button.append(icon, title, description);
    if (selected) {
      const effects = document.createElement('ul'); for (const stat of node.stats) { const item = document.createElement('li'); item.textContent = stat; effects.append(item); } button.append(effects);
      const cost = document.createElement('small'); const pointCost = node.pointCost ?? 2;
      cost.textContent = allocated.has(String(node.id)) ? 'ВЫДЕЛЕНО' : `${pointCost} ОЧК. · ${node.originalPathNodeNames?.join(' → ') || 'ВМЕСТЕ С УЗЛАМИ НА ПУТИ'}`;
      button.append(cost); button.disabled = allocated.has(String(node.id)) || pointCost > summary.ascendancyPoints;
    }
    button.onclick = () => {
      if (!selected) { chooseAscendancy(run, node.id); audio.play('choose'); showAscendancy(); }
      else { chooseAscendancyNode(run, node.id); audio.play('choose'); if (run.phase === 'ascendancy') showAscendancy(); else routeRunPhase(); }
      updateHUD();
    };
    return button;
  }));
  $('ascendancyContinue').textContent = selected ? 'Сохранить очки и продолжить →' : 'Выбрать позже →'; syncScreens();
}
function routeRunPhase() {
  if (run.phase === 'upgrade') showUpgrades(); else if (run.phase === 'loot') showLoot(); else if (run.phase === 'ascendancy') showAscendancy();
  else if (run.phase === 'dead' || run.phase === 'won') showResults(); else { screen = 'playing'; syncScreens(); }
}
function closeBuild() {
  if (buildReturn === 'playing') { setPaused(run, false); screen = 'playing'; } else screen = 'pause';
  syncScreens();
}
function showResults() {
  screen = 'result'; const won = run.phase === 'won';
  const record = run.score > profile.bestScore;
  if (!savedRun) {
    profile.runs++; if (won) profile.wins++;
    profile.bestScore = Math.max(profile.bestScore, Math.round(run.score)); profile.bestKills = Math.max(profile.bestKills, run.kills); profile.bestTime = Math.max(profile.bestTime, Math.floor(run.time));
    persist(); savedRun = true;
  }
  $('resultRune').textContent = won ? '☀' : '☾'; $('resultKicker').textContent = won ? 'ТЫ ВЕРНУЛ РАССВЕТ' : 'КАЖДАЯ НОЧЬ УЧИТ';
  $('resultTitle').textContent = won ? 'Тьма отступила' : 'До следующей искры';
  $('resultDescription').textContent = won ? 'Brutus, Merveil, Dominus и Kitava повержены. Руины снова увидят солнце.' : 'Твоя магия ещё не угасла. Попробуй другую связку камней и вернись сильнее.';
  $('resultTime').textContent = formatTime(run.time); $('resultKills').textContent = run.kills; $('resultLevel').textContent = run.level;
  $('recordBanner').hidden = !record; audio.play(won ? 'won' : 'dead'); syncScreens(); announce(won ? 'Победа! Все четыре босса повержены.' : `Забег окончен. Прожито ${formatTime(run.time)}.`);
}

$('startButton').onclick = startRun; $('retryButton').onclick = startRun;
$('restartButton').onclick = startRun; $('resumeButton').onclick = resumeRun;
$('menuButton').onclick = returnMenu; $('resultMenuButton').onclick = returnMenu;
$('pauseButton').onclick = () => screen === 'pause' ? resumeRun() : pauseRun();
$('buildButton').onclick = showBuild; $('buildCloseButton').onclick = closeBuild;
$('equipButton').onclick = () => resolveLoot(true); $('skipItemButton').onclick = () => resolveLoot(false);
$('ascendancyContinue').onclick = () => { finishAscendancy(run); routeRunPhase(); updateHUD(); };
$('soundButton').onclick = () => { audio.enabled = !audio.enabled; profile.sound = audio.enabled; audio.unlock(); audio.play('choose'); updateSound(); persist(); };
$('lowEffects').onchange = event => { renderer.lowEffects = event.target.checked; profile.lowEffects = renderer.lowEffects; persist(); };
$('helpButton').onclick = () => {
  if (!['menu', 'playing', 'pause'].includes(screen)) return;
  helpReturn = screen; if (run?.phase === 'playing') setPaused(run, true); screen = 'help'; syncScreens();
};
$('helpCloseButton').onclick = () => { if (helpReturn === 'playing') { screen = 'pause'; } else screen = helpReturn; syncScreens(); };

document.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (event.key === 'Tab' && overlayIds[screen]) {
    const focusable = [...$(overlayIds[screen]).querySelectorAll('button:not([disabled]), a[href], input:not([disabled])')].filter(e => e.tabIndex >= 0 && e.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (!focusable.includes(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  if (key === 'escape' || key === 'p') {
    if (screen === 'playing') pauseRun(); else if (screen === 'pause') resumeRun(); else if (screen === 'help') $('helpCloseButton').click(); else if (screen === 'build') closeBuild();
    event.preventDefault(); return;
  }
  if (key === 'b' && screen === 'playing') { showBuild(); event.preventDefault(); return; }
  if (screen === 'upgrade' && /^[1-5]$/.test(key) && !event.repeat) {
    $('upgradeCards').querySelectorAll('.upgrade-card')[Number(key) - 1]?.click(); event.preventDefault(); return;
  }
  if (screen === 'playing' && ['w', 'a', 's', 'd', 'ц', 'ф', 'ы', 'в', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) { event.preventDefault(); keys.add(key); }
});
document.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { resetInput(); if (screen === 'playing') pauseRun(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { resetInput(); if (screen === 'playing') pauseRun(); } });

function updateStick(event) {
  const rect = $('joystick').getBoundingClientRect(), max = rect.width * .36;
  const dx = event.clientX - rect.left - rect.width / 2, dy = event.clientY - rect.top - rect.height / 2;
  const length = Math.hypot(dx, dy), scale = length > max ? max / length : 1;
  stick.x = dx * scale / max; stick.y = dy * scale / max;
  $('joystickThumb').style.transform = `translate(${dx * scale}px,${dy * scale}px)`;
}
$('joystick').addEventListener('pointerdown', event => {
  if (screen !== 'playing' || stick.pointer !== null) return;
  stick.pointer = event.pointerId; $('joystick').setPointerCapture(event.pointerId); updateStick(event); event.preventDefault();
});
$('joystick').addEventListener('pointermove', event => { if (event.pointerId === stick.pointer) updateStick(event); });
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) $('joystick').addEventListener(name, event => {
  if (event.pointerId === stick.pointer) { stick.pointer = null; stick.x = stick.y = 0; $('joystickThumb').style.transform = ''; }
});
window.addEventListener('resize', () => { renderer.resize(); syncScreens(false); });
$('arena').tabIndex = 0;

function frame(now) {
  const dt = lastFrame ? Math.max(0, Math.min(.05, (now - lastFrame) / 1000)) : 0; lastFrame = now;
  if (run && screen === 'playing') {
    const has = (...values) => values.some(value => keys.has(value));
    const input = { x: (has('d', 'в', 'arrowright') ? 1 : 0) - (has('a', 'ф', 'arrowleft') ? 1 : 0) + stick.x, y: (has('s', 'ы', 'arrowdown') ? 1 : 0) - (has('w', 'ц', 'arrowup') ? 1 : 0) + stick.y };
    tick(run, dt, input);
    if (run.kills > lastKills) { audio.play('kill'); lastKills = run.kills; }
    if (run.player.hp < lastHP - 1) audio.play('hurt'); lastHP = run.player.hp;
    if (run.xp > lastXP) audio.play('pickup'); lastXP = run.xp;
    if (run.phase !== 'playing') { updateHUD(); if (run.phase === 'upgrade' || run.phase === 'ascendancy') audio.play('level'); routeRunPhase(); }
    if (now - lastHUD > 100) { updateHUD(); lastHUD = now; }
  }
  const inMenu = !run || screen === 'menu' || (screen === 'help' && helpReturn === 'menu');
  renderer.render(inMenu ? preview : run, { menu: inMenu, clock: now / 1000, character: inMenu ? selectedClass : run.classState?.classId || run.character });
  requestAnimationFrame(frame);
}
updateSound(); updateMenu(); makePreview(); syncScreens(false); requestAnimationFrame(frame);

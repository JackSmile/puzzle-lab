import {initEncounters,tickEncounters,enemyTargetable,prepareEncounterDamage,proximityBlocks,recordEncounterKill,BOSS_SCHEDULE} from './encounters.mjs';
import {rollUnique,combatState,flaskSpec,assignRareModifiers,stolenStat,rawGear,legacyResistances,nebulisIncrease} from './uniques.mjs';
export {uniqueSummary,RARE_MODIFIERS,UNIQUE_IDS,makeUnique} from './uniques.mjs';
import {CLASSES,initializeClass,classStats,refreshClassResources,classLevelUp,checkAscendancyTrial,classBaseModifiers,classSkillModifiers,classIncomingDamage,classHit,classKilled,classTick,classEnemyChill,classEnemySpeed,classEnemyCooldown,classProjectile,classAllyDamage,classEquipmentModifier,classSkillUsed,classAfterPlayerHit,classActor,classKillActor,classAllyStats,refreshClassAlly,actorOrigin,applyCorruptedBlood} from './classes.mjs';
export const DURATION = 480;
export const UPGRADES = Object.fromEntries([
  ['bolt', 'Winter Orb', 'Адаптация: парящая сфера автоматически стреляет в ближайшего врага. Ледяные попадания замедляют на 25% на секунду и задевают ближайших врагов.', '❄', 'weapon', '#a7dfff'],
  ['orbit', 'Blade Vortex', 'Адаптация: клинки вращаются вокруг героя и бьют при соприкосновении. Уровни добавляют клинки и урон.', '◈', 'weapon', '#79dbdd'],
  ['nova', 'Righteous Fire', 'Адаптация: постоянная огненная аура обжигает врагов каждые 0,25 с. Теряет 0,25% максимального здоровья в секунду, оставляя не менее 1 HP.', '✺', 'weapon', '#ffad64'],
  ['lightning', 'Kinetic Fusillade', 'Адаптация: заряженный залп из трёх кинетических снарядов с небольшим взрывом при попадании. Уровни увеличивают урон и число снарядов.', 'ϟ', 'weapon', '#d9b5ff'],
  ['minion', 'Raise Spectre', 'Адаптация: 1–3 призрака следуют за героем и сами стреляют во врагов. Уровни усиливают урон и добавляют союзников.', '♙', 'weapon', '#a4e8ce'],
  ['might', 'Сила', '+20% к урону за уровень.', '✦', 'passive', '#f4a17d'],
  ['haste', 'Ритм', 'Атаки перезаряжаются на 9% быстрее за уровень.', '⌛', 'passive', '#d8b8ff'],
  ['vitality', 'Жизненная сила', '+25 к запасу здоровья и восстановление 25 здоровья.', '♥', 'passive', '#f094a1'],
  ['magnet', 'Притяжение', '+35 к радиусу притяжения опыта за уровень.', '⊙', 'passive', '#b0e497'],
  ['stride', 'Лёгкий шаг', '+8% к скорости движения за уровень.', '»', 'passive', '#95d6e7'],
  ['regen', 'Возрождение', '+0,6 здоровья в секунду за уровень.', '✚', 'passive', '#9ee0bb'],
  ['infused', 'Infused Channelling', 'Адаптация: +15% урона сферы за ранг; после 0,5 с без движения её перезарядка на 10% короче за ранг.', '◎', 'support', '#a7dfff', ['bolt']],
  ['burning', 'Burning Damage', '+30% урона огненной ауры за ранг. Усиливает только связанную Righteous Fire.', '♨', 'support', '#ffad64', ['nova']],
  ['volley', 'Greater Volley', 'Адаптация: +2 снаряда кинетического залпа за ранг; на 15% меньше урона каждого снаряда за ранг.', '⋙', 'support', '#d9b5ff', ['lightning']],
  ['unleash', 'Greater Unleash', 'Адаптация повторных применений: +1 вращающийся клинок Blade Vortex за ранг.', '◈', 'support', '#79dbdd', ['orbit']],
  ['minion_damage', 'Minion Damage', '+30% урона снарядов призраков за ранг. Усиливает только связанную Raise Spectre.', '♙', 'support', '#a4e8ce', ['minion']],
  ['pierce', 'Pierce', '+1 пробиваемая цель за ранг для призраков или сферы. Связь со сферой — адаптация её снарядов.', '➶', 'support', '#c7b9ff', ['bolt', 'minion']],
  ['area', 'Increased Area of Effect', 'Наш баланс: +20% радиуса за ранг для огненной ауры, орбиты клинков или ледяного взрыва сферы.', '⊙', 'support', '#ffbd75', ['orbit', 'nova', 'bolt']],
  ['critical', 'Increased Critical Damage', 'Наш баланс: 10% шанс критического попадания; +0,4 к множителю критического урона за ранг (база ×1,5).', '✦', 'support', '#f4a17d', ['orbit', 'lightning']],
].map(([id, name, description, icon, type, color, compatible]) => [id, Object.freeze({
  id, name, description, icon, type, max: type === 'weapon' ? 6 : type === 'support' ? 3 : 5, color,
  ...(compatible ? { compatible: Object.freeze(compatible) } : {}),
})]));

export const CHARACTERS = [
  { id: 'warden', name: 'Chieftain', title: 'Хранитель последнего огня', description: 'Постоянная Righteous Fire обжигает врагов вблизи. Дополнительное восстановление компенсирует собственное горение.', weapon: 'nova', color: '#ffad64' },
  { id: 'witch', name: 'Elementalist', title: 'Повелительница зимней сферы', description: 'Winter Orb автоматически стреляет в ближайшие цели и замедляет врагов ледяными попаданиями.', weapon: 'bolt', color: '#a7dfff' },
  { id: 'seer', name: 'Necromancer', title: 'Голос призрачного легиона', description: 'Raise Spectre призывает союзника: он следует за героем и атакует самостоятельно.', weapon: 'minion', color: '#a4e8ce' },
];

export function createRun({ seed = 1, character, classId, bonuses = {} } = {}) {
  const useClass = classId !== undefined;
  const chosenClass = CLASSES.find(c => c.id === classId) || CLASSES.find(c => c.id === 'witch');
  character ||= useClass ? ({marauder:'warden',templar:'seer'}[chosenClass.id] || 'witch') : 'warden';
  const hero = CHARACTERS.find(item => item.id === character) || CHARACTERS[0];
  const run = {
    phase: 'playing', time: 0, seed, character: hero.id,
    player: { x: 0, y: 0, hp: 120, maxHp: 120, speed: 225, radius: 12, invulnerable: 0, facingX: 1, facingY: 0 },
    enemies: [], projectiles: [], gems: [], effects: [], texts: [], minions: [],
    links: {}, equipment: { weapon: null, body: null, flask: null, belt: null, ring: null }, loot: [], pendingItem: null,
    kills: 0, level: 1, xp: 0, xpNeeded: 8, score: 0,
    upgrades: { [hero.weapon]: 1, ...(hero.id === 'warden' ? { regen: 1 } : {}) }, offered: [], bossSpawned: false, bossDefeated: false,
    _rng: Number(seed) >>> 0, _nextId: 1, _spawnTimer: 0.3, _nextElite: 35, _stationary: 0,
    _weaponTimers: { bolt: 0, nova: 0, lightning: 0 },
    _bonuses: { ...bonuses },
  };
  if (useClass) {
    run.upgrades = {[chosenClass.weapon]:1, ...(chosenClass.id === 'marauder' ? {regen:1} : {})};
    initializeClass(run, chosenClass.id);
    initEncounters(run);
    Object.defineProperty(run, '_resumeProgress', {value:offerLevel, enumerable:false});
  }
  const values = stats(run);
  run.player.maxHp = values.maxHp;
  run.player.hp = values.maxHp;
  run.player.speed = values.speed;
  return run;
}
const TAU = Math.PI * 2;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const weaponLevel = (run, id) => Math.min(6, Math.max(0, run.upgrades[id] || 0));

function random(run) {
  run._rng = (Math.imul(run._rng, 1664525) + 1013904223) >>> 0;
  return run._rng / 4294967296;
}

function effect(run, kind, x, y, radius, color, life = 0.3, extra = {}) {
  run.effects.push({ kind, x, y, radius, color, life, maxLife: life, ...extra });
}

function text(run, x, y, value, color) {
  run.texts.push({ x, y, value, color, life: 0.7 });
}

function hurtEnemy(run, enemy, damage, context = {}) {
  if (!enemyTargetable(enemy)) return 0;
  const origin = context.secondary ? context.origin : actorOrigin(run,classActor(context)) || context.origin;
  const prevented = proximityBlocks(run,enemy,origin,{isDot:context.isDot});
  damage = classHit(run, enemy, damage, {...context,preventDamage:context.preventDamage||prevented});
  damage = prepareEncounterDamage(run,enemy,damage);
  if (damage <= 0) return;
  enemy.hp -= damage;
  if(enemy.hp<=0){enemy.killActor=classKillActor(context);enemy.damageActor=classActor(context);enemy.killCause=context.isDot?(context.ailment||'dot'):'hit';enemy.killedByMinion=enemy.killActor.kind!=='player';}
  enemy.hit = 0.12;
  text(run, enemy.x, enemy.y - enemy.radius, Math.round(damage), '#f1e6cf');
  effect(run, 'hit', enemy.x, enemy.y, enemy.radius + 4, '#eee4ff', 0.12);
  return damage;
}

function hurtPlayer(run, damage, context = {}) {
  const hit=context.hit!==false;
  if ((hit&&!context.selfHit&&run.player.invulnerable > 1e-8) || run.player.hp <= 0) return;
  damage *= 1 - stats(run).damageReduction;
  damage = classIncomingDamage(run, damage, context);
  run.player.hp = Math.max(0, run.player.hp - damage);
  if(hit)classAfterPlayerHit(run);
  if(hit&&!context.selfHit)run.player.invulnerable = 0.7;
  effect(run, 'hit', run.player.x, run.player.y, 23, '#ef7b87', 0.3);
  text(run, run.player.x, run.player.y - 24, `−${damage}`, '#ff8a99');
}

function nearest(run, origin, range, excluded) {
  let target = null;
  let closest = range;
  for (const enemy of run.enemies) {
    if (!enemyTargetable(enemy) || excluded?.has(enemy.id)) continue;
    const d = distance(origin, enemy);
    if (d < closest) {
      closest = d;
      target = enemy;
    }
  }
  return target;
}

function spawnPosition(run, min = 650, max = 850) {
  const angle = random(run) * TAU;
  const radius = min + random(run) * (max - min);
  return { x: run.player.x + Math.cos(angle) * radius, y: run.player.y + Math.sin(angle) * radius };
}

const ENEMY_TYPES = {
  skull: { hp: 20, radius: 13, speed: 74, xp: 1, damage: 10 },
  bat: { hp: 14, radius: 10, speed: 120, xp: 1, damage: 8 },
  ghoul: { hp: 48, radius: 17, speed: 58, xp: 3, damage: 15 },
  cultist: { hp: 40, radius: 14, speed: 66, xp: 3, damage: 12 },
  knight: { hp: 110, radius: 21, speed: 48, xp: 5, damage: 20 },
  boss: { hp: 2800, radius: 46, speed: 50, xp: 80, damage: 28 },
};

function spawnEnemy(run, kind) {
  const definition = ENEMY_TYPES[kind];
  const scale = kind === 'boss' ? 1 : 1 + run.time / 180;
  const hp = Math.round(definition.hp * scale);
  const enemy = {
    id: run._nextId++, kind, ...spawnPosition(run), radius: definition.radius,
    hp, maxHp: hp, speed: definition.speed + (kind === 'boss' ? 0 : Math.min(20, run.time * 0.025)),
    hit: 0, damage: definition.damage + (kind === 'boss' ? 0 : Math.floor(run.time / 90) * 2),
    ...(run.classState ? {accuracy:100,evasion:5,regen:kind==='ghoul'?hp*.01:0} : {}),
    xp: definition.xp, shotTimer: 2, telegraph: kind === 'boss' ? 2.4 : 0,
  };
  run.enemies.push(enemy);
  if (kind === 'boss') effect(run, 'spawn', enemy.x, enemy.y, 95, '#f49a91', 2.4);
  return enemy;
}

function spawnWaves(run, dt) {
  if (run.time < DURATION && run.time >= run._nextElite) {
    run._nextElite += 60;
    let elite;
    if (run.enemies.filter(e => e.kind !== 'boss').length >= 180) elite = run.enemies.find(e => e.kind !== 'boss' && !e.elite && e.hp > 0);
    else elite = spawnEnemy(run, 'skull');
    if (elite) {
      elite.elite = true;
      elite.hp *= 4;
      elite.maxHp = elite.hp;
      elite.radius *= 1.3;
      elite.xp *= 4;
      elite.damage *= 1.3;
      assignRareModifiers(elite,()=>random(run));
    }
  }
  if (run.time >= 450 && !run.bossSpawned) {
    run.bossSpawned = true;
    spawnEnemy(run, 'boss');
  }
  if (run.time >= DURATION) return;
  run._spawnTimer -= dt;
  if (run._spawnTimer > 0) return;
  run._spawnTimer += Math.max(0.18, 1.1 - run.time * 0.0019);
  const count = Math.min(4, 1 + Math.floor(run.time / 80));
  const regulars = run.enemies.filter(enemy => enemy.kind !== 'boss').length;
  for (let i = 0; i < Math.min(count, 180 - regulars); i++) {
    const roll = random(run);
    let kind = 'skull';
    if (run.time > 20 && roll < 0.28) kind = 'bat';
    if (run.time > 65 && roll > 0.74) kind = 'ghoul';
    if (run.time > 130 && roll > 0.53 && roll <= 0.74) kind = 'cultist';
    if (run.time > 220 && roll > 0.88) kind = 'knight';
    spawnEnemy(run, kind);
  }
}

function projectile(run, origin, target, { hostile = false, damage = 1, color, speed = 500, angle = 0, pierce = 0, element, splashRadius = 0, radius = 5, context = {} } = {}) {
  context={...context,actor:context.actor?{...context.actor}:undefined,origin:context.origin?{...context.origin}:{x:origin.x,y:origin.y}};
  speed *= context.projectileSpeed || 1;
  const direction = Math.atan2(target.y - origin.y, target.x - origin.x) + angle;
  run.projectiles.push({
    id: run._nextId++, kind: hostile ? 'hex' : 'bolt', x: origin.x, y: origin.y,
    vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed,
    radius: hostile ? 6 : radius, element, splashRadius, color: color || (hostile ? '#ed8a9e' : UPGRADES.bolt.color),
    life: hostile ? 6 : 1.5, damage, pierce, hitIds: [], context, chain:context.chain || 0, travel:0, ...(hostile ? { hostile: true, hostileTargetId:target.id } : {}),
  });
  classProjectile(run, run.projectiles.at(-1));
}

function moveEnemies(run, dt) {
  for (const enemy of run.enemies) {
    if (enemy.hp <= 0 || enemy.poeKind) continue;
    enemy.moving=false;
    enemy.hit = Math.max(0, enemy.hit - dt);
    enemy._orbitWait = Math.max(0, (enemy._orbitWait || 0) - dt);
    enemy.chill = run.classState ? classEnemyChill(run,enemy,dt) : Math.max(0, (enemy.chill || 0) - dt);
    if ((enemy.telegraph || 0) > 0) {
      enemy.telegraph = Math.max(0, enemy.telegraph - dt);
      continue;
    }
    if (enemy.kind !== 'boss' && distance(enemy, run.player) > 1800) Object.assign(enemy, spawnPosition(run));
    if (run.classState && classEnemySpeed(run,enemy)<=0) continue;
    const chase = enemy.mercenaryTauntUntil > run.time && run.mercenary?.hp > 0 ? run.mercenary : run.player;
    const dx = chase.x - enemy.x;
    const dy = chase.y - enemy.y;
    const d = Math.hypot(dx, dy);
    enemy.moving=false;
    const step = Math.min(d, enemy.speed * (run.classState ? classEnemySpeed(run, enemy) : (enemy.chill > 0 ? 0.75 : 1)) * dt);
    if (d > 0) {
      enemy.moving=step>0.00001;
      enemy.x += dx / d * step;
      enemy.y += dy / d * step;
    }
    if (distance(enemy, chase) < enemy.radius + run.player.radius) {
      if (chase !== run.player) classAllyDamage(run,chase,(enemy.damage||10)*dt,{enemy});
      else hurtPlayer(run, enemy.damage || ENEMY_TYPES[enemy.kind]?.damage || 10, {enemy, type:'physical',critical:run.classState&&enemy.elite&&random(run)<.1});
    }
    for (const ally of [...run.minions,...(run.totems||[]),...(run.mercenaryMinions||[])]) if (ally.hp>0 && distance(enemy,ally)<enemy.radius+12) classAllyDamage(run,ally,(enemy.damage||10)*dt,{enemy});
    if (enemy.kind === 'cultist' || enemy.kind === 'boss') {
      enemy.shotTimer = (enemy.shotTimer ?? 2) - dt;
      if (enemy.shotTimer <= 0 && d < 650) {
        enemy.shotTimer = (enemy.kind === 'boss' ? 2.2 : 3.2) * classEnemyCooldown(run, enemy);
        const angles = enemy.kind === 'boss' ? [-0.25, 0, 0.25] : [0];
        for (const angle of angles) projectile(run, enemy, run.player, { hostile: true, damage: enemy.kind === 'boss' ? 18 : 9, speed: 165, angle, context:{enemyId:enemy.id,type:enemy.kind==='boss'?'cold':'fire'} });
      }
    }
  }
}

// Critical rolls and typed mitigation belong to the hit pipeline in both run formats.
function rolledDamage(run, values) { return values.damage; }

function attack(run, values, dt) {
  const player = run.player;
  for (const id of ['bolt', 'nova', 'lightning']) run._weaponTimers[id] = Math.max(0, run._weaponTimers[id] - dt);
  if (weaponLevel(run, 'bolt') && run._weaponTimers.bolt <= 1e-8) {
    const origin = { x: player.x, y: player.y - 24 };
    const target = nearest(run, player, 600);
    if (target) {
      const skill = skillStats(run, 'bolt');
      run._weaponTimers.bolt = skill.cooldown;
      classSkillUsed(run,'bolt');
      for (let i = 0; i < skill.projectiles; i++) projectile(run, origin, target, {
        damage: rolledDamage(run, skill), context:{...skill,type:skill.damageType,projectile:true}, element: 'cold', color: UPGRADES.bolt.color,
        angle: (i - (skill.projectiles - 1) / 2) * 0.09, pierce: skill.pierce,
        splashRadius: 20 * skill.area, radius: 5 * skill.area,
      });
    }
  }
  if (weaponLevel(run, 'orbit')) {
    const skill = skillStats(run, 'orbit');
    if (run.time >= (run._orbitCast||0)) {classSkillUsed(run,'orbit');run._orbitCast=run.time+skill.cooldown;}
    for (let i = 0; i < values.orbitCount; i++) {
      const angle = run.time * 2.6 + i * TAU / values.orbitCount;
      const blade = { x: player.x + Math.cos(angle) * values.orbitRadius, y: player.y + Math.sin(angle) * values.orbitRadius };
      for (const enemy of run.enemies) {
        if ((enemy._orbitWait || 0) <= 1e-8 && enemyTargetable(enemy) && distance(blade, enemy) < enemy.radius + 15) {
          hurtEnemy(run, enemy, rolledDamage(run, skill), {...skill,type:skill.damageType});
          enemy._orbitWait = skill.cooldown;
        }
      }
    }
  }
  if (weaponLevel(run, 'nova')) {
    if (player.hp > 0) {
      const selfDamage = run.classState ? classIncomingDamage(run,player.maxHp*.0025*dt,{type:'fire',hit:false}) : player.maxHp*.0025*dt;
      player.hp = Math.max(1, player.hp-selfDamage);
    }
    if (run._weaponTimers.nova <= 1e-8) {
      const skill = skillStats(run, 'nova');
      run._weaponTimers.nova = skill.cooldown;
      effect(run, 'burn', player.x, player.y, values.fireRadius, UPGRADES.nova.color, 0.24);
      for (const enemy of run.enemies) {
        if (enemyTargetable(enemy) && distance(player, enemy) <= values.fireRadius + enemy.radius) hurtEnemy(run, enemy, rolledDamage(run, skill), {...skill,type:skill.damageType,isDot:true});
      }
    }
  }
  if (weaponLevel(run, 'lightning') && run._weaponTimers.lightning <= 1e-8) {
    const target = nearest(run, player, 600);
    if (target) {
      const skill = skillStats(run, 'lightning');
      run._weaponTimers.lightning = skill.cooldown;
      classSkillUsed(run,'lightning');
      effect(run, 'kinetic', player.x, player.y, 30, UPGRADES.lightning.color, 0.3);
      for (let i = 0; i < skill.projectiles; i++) projectile(run, player, target, {
        damage: rolledDamage(run, skill), context:{...skill,type:skill.damageType,projectile:true}, element: 'kinetic', color: UPGRADES.lightning.color,
        angle: run.classState?.allocatedTreeNodeIds.includes('45313') ? 0 : (i - (skill.projectiles - 1) / 2) * 0.12, pierce: skill.pierce, splashRadius: 24 * skill.area,
      });
    }
  }
  const count = values.minionCount;
  if (run.minions.length > count) run.minions.length = count;
  while (run.minions.length < count) {
    const index = run.minions.length;
    run.minions.push({ id: run._nextId++, x: player.x + Math.cos(index * TAU / Math.max(1, count)) * 42, y: player.y + Math.sin(index * TAU / Math.max(1, count)) * 42, shotTimer: 0 });
  }
  for (let i = 0; i < count; i++) {
    const ally = run.minions[i];
    if (run.classState) {
      const modifiers = classStats(run).m;
      const allocated = run.classState.allocatedTreeNodeIds;
      const maxHp = 80 * (1+(modifiers.minionLife||0)) * (allocated.includes('54159')?1.2:1);
      if (ally.maxHp == null) {ally.hp=maxHp;ally.maxHp=maxHp;ally.energyShield=0;ally.maxEnergyShield=0;}
      ally.hp=Math.min(maxHp,ally.hp+Math.max(0,maxHp-ally.maxHp));ally.maxHp=maxHp;
      ally.kind='minion';ally.ownerId='player';ally.baseEnergyShield=allocated.includes('14603')?maxHp*.4:0;refreshClassAlly(run,ally);
      if (ally.hp<=0) {ally.respawn=(ally.respawn||0)+dt;if(ally.respawn<5)continue;ally.hp=maxHp;ally.respawn=0;}
    }
    const angle = i * TAU / count - Math.PI / 2;
    const movement=run.classState?classAllyStats(run,ally).movementSpeed:1;
    ally.x += (player.x + Math.cos(angle) * 42 - ally.x) * Math.min(1, dt * 7 * movement);
    ally.y += (player.y + Math.sin(angle) * 42 - ally.y) * Math.min(1, dt * 7 * movement);
    ally.shotTimer = Math.max(0, ally.shotTimer - dt);
    if (ally.shotTimer > 1e-8) continue;
    const target = nearest(run, ally, 620);
    if (!target) continue;
    const skill = skillStats(run, 'minion', ally);
    ally.shotTimer = skill.cooldown;
    for (let j = 0; j < skill.projectiles; j++) projectile(run, ally, target, {
      damage: rolledDamage(run, skill), context:{...skill,type:skill.damageType,projectile:true}, element: 'spectral', color: UPGRADES.minion.color,
      speed: 450, pierce: skill.pierce, angle: (j - (skill.projectiles - 1) / 2) * 0.08,
    });
  }
}

function segmentHitTime(target, x, y, x2, y2, radius) {
  const dx = x2 - x;
  const dy = y2 - y;
  const ox = x - target.x;
  const oy = y - target.y;
  const c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (!a) return null;
  const b = 2 * (ox * dx + oy * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const time = (-b - Math.sqrt(discriminant)) / (2 * a);
  return time >= 0 && time <= 1 ? time : null;
}

function moveProjectiles(run, dt) {
  for (const item of run.projectiles) {
    const x = item.x;
    const y = item.y;
    const travelTime = Math.min(dt, Math.max(0, item.life));
    if (!travelTime) continue;
    item.travel = (item.travel||0) + Math.hypot(item.vx,item.vy)*travelTime;
    item.x += item.vx * travelTime;
    item.y += item.vy * travelTime;
    item.life = Math.max(0, item.life - dt);
    if (!item.hostile && item.life<=0 && item.canReturn && !item.returning) {
      const angle=Math.atan2(run.player.y-item.y,run.player.x-item.x), speed=Math.hypot(item.vx,item.vy);
      item.vx=Math.cos(angle)*speed;item.vy=Math.sin(angle)*speed;item.returning=true;item.hitIds=[];item.life=1.5;
    }
    const terrainHits=(run.terrain||[]).map(obstacle=>({obstacle,time:segmentHitTime(obstacle,x,y,item.x,item.y,obstacle.radius+item.radius)})).filter(h=>h.time!==null&&h.obstacle!==item.lastTerrain).sort((a,b)=>a.time-b.time);
    const terrainHit=terrainHits[0];
    if (item.hostile) {
      // A taunted shot keeps its launch direction and may collide with its selected living mercenary.
      const mercenary=run.mercenary?.hp>0&&run.mercenary.id===item.hostileTargetId?run.mercenary:null;
      const hit=[run.player,mercenary].filter(Boolean).map(target=>({target,time:segmentHitTime(target,x,y,item.x,item.y,(target.radius||12)+item.radius)})).filter(h=>h.time!==null&&(!terrainHit||h.time<terrainHit.time)).sort((a,b)=>a.time-b.time)[0];
      if (hit) {
        const context={...item.context,type:run.classState?(item.context?.type||'fire'):'physical',spell:item.context?.spell??true,area:item.context?.area??true,melee:item.context?.melee??false,enemy:run.enemies.find(e=>e.id===item.context?.enemyId)};
        if(hit.target===run.player)hurtPlayer(run,item.damage||9,context);
        else classAllyDamage(run,hit.target,item.damage||9,context);
        item.life = 0;
      }
    } else {
      const collisions = run.enemies
        .filter(enemy => enemyTargetable(enemy) && !item.hitIds?.includes(enemy.id))
        .map(enemy => ({ enemy, time: segmentHitTime(enemy, x, y, item.x, item.y, enemy.radius + item.radius) }))
        .filter(hit => hit.time !== null && (!terrainHit || hit.time <= terrainHit.time))
        .sort((first, second) => first.time - second.time || first.enemy.id - second.enemy.id);
      for (const { enemy } of collisions) {
        if (enemy.hp > 0) {
          const dealt=hurtEnemy(run, enemy, item.damage || 24, {...item.context,travel:item.travel,chained:item.chained});
          if (dealt>0 && item.element === 'cold') enemy.chill = Math.max(enemy.chill||0,1);
          if (item.splashRadius > 0) {
            effect(run, item.element === 'cold' ? 'frost' : 'kinetic', enemy.x, enemy.y, item.splashRadius, item.color, 0.18);
            for (const other of run.enemies) {
              if (other === enemy || !enemyTargetable(other) || distance(other, enemy) > item.splashRadius + other.radius) continue;
              const splashDealt=hurtEnemy(run, other, item.damage * 0.5, {...item.context,travel:item.travel,chained:item.chained});
              if (splashDealt>0 && item.element === 'cold') other.chill = Math.max(other.chill||0,1);
            }
          }
          (item.hitIds ||= []).push(enemy.id);
          if ((item.pierce || 0) <= 0) {
            const chainTarget = item.chain > 0 ? nearest(run,enemy,300,new Set(item.hitIds)) : null;
            if (chainTarget) {
              const angle=Math.atan2(chainTarget.y-enemy.y,chainTarget.x-enemy.x), speed=Math.hypot(item.vx,item.vy);
              item.x=enemy.x;item.y=enemy.y;item.vx=Math.cos(angle)*speed;item.vy=Math.sin(angle)*speed;item.chain--;item.chained=true;item.life=Math.max(.7,item.life);break;
            }
            if (item.canReturn && !item.returning) {
              const angle=Math.atan2(run.player.y-enemy.y,run.player.x-enemy.x), speed=Math.hypot(item.vx,item.vy);
              item.x=enemy.x;item.y=enemy.y;item.vx=Math.cos(angle)*speed;item.vy=Math.sin(angle)*speed;item.returning=true;item.hitIds=[];item.life=1.5;break;
            }
            item.life = 0;
            break;
          }
          item.pierce--;
        }
      }
    }
    if (terrainHit && item.life>0) {
      const impact={x:x+(item.x-x)*terrainHit.time,y:y+(item.y-y)*terrainHit.time};
      const target=item.terrainChain&&item.chain>0&&random(run)<.3?nearest(run,impact,300,new Set(item.hitIds)):null;
      if(target){const speed=Math.hypot(item.vx,item.vy),angle=Math.atan2(target.y-impact.y,target.x-impact.x);item.x=impact.x;item.y=impact.y;item.vx=Math.cos(angle)*speed;item.vy=Math.sin(angle)*speed;item.chain--;item.chained=true;item.lastTerrain=terrainHit.obstacle;}
      else item.life=0;
    }
  }
  run.projectiles = run.projectiles.filter(item => item.life > 0).slice(-500);
}

function rewardDead(run) {
  run.enemies = run.enemies.filter(enemy => {
    if (enemy.hp > 0) return true;
    if (!enemy._rewarded) {
      const encounterReward=run.encounters?recordEncounterKill(run,enemy):null;
      enemy._rewarded = true;
      if(enemy.kind==='heart')return false;
      run.kills++;
      classKilled(run,enemy,(target,damage,context)=>hurtEnemy(run,target,damage,context));
      const xp = enemy.xp || ENEMY_TYPES[enemy.kind]?.xp || 2;
      run.score += enemy.kind === 'boss' ? 5000 : xp * 10;
      run.gems.push({ x: enemy.x, y: enemy.y, value: xp, radius: enemy.kind === 'boss' ? 9 : 4 });
      effect(run, 'death', enemy.x, enemy.y, enemy.radius * 1.6, enemy.kind === 'boss' ? '#ffbc8f' : '#a9a0cb', 0.45);
      if (enemy.kind === 'boss' && !run.encounters) run.bossDefeated = true;
      if (encounterReward?.uniqueReward) run.loot.push({x:enemy.x,y:enemy.y,item:rollItem(run,'unique')});
      else if (enemy.elite && !encounterReward?.boss) run.loot.push({ x: enemy.x, y: enemy.y, item: rollItem(run) });
      run.loot = run.loot.slice(-12);
    }
    return false;
  });
}

function collectGems(run, values, dt) {
  const remaining = [];
  for (const gem of run.gems) {
    const d = distance(gem, run.player);
    if (d <= values.pickup && d > 0) {
      const step = Math.min(d, (220 + (values.pickup - d) * 3) * dt);
      gem.x += (run.player.x - gem.x) / d * step;
      gem.y += (run.player.y - gem.y) / d * step;
    }
    if (distance(gem, run.player) <= run.player.radius + gem.radius + 4) run.xp += gem.value;
    else remaining.push(gem);
  }
  // Merge nearby gems without discarding any earned XP when a long run fills the map.
  if (remaining.length > 600) {
    const cells = new Map();
    for (const gem of remaining) {
      const key = `${Math.floor(gem.x / 160)},${Math.floor(gem.y / 160)}`;
      const existing = cells.get(key);
      if (existing) {
        const sum = existing.value + gem.value;
        existing.x = (existing.x * existing.value + gem.x * gem.value) / sum;
        existing.y = (existing.y * existing.value + gem.y * gem.value) / sum;
        existing.value = sum;
        existing.radius = Math.min(10, 4 + Math.log2(sum));
      } else cells.set(key, { ...gem });
    }
    const compacted = [...cells.values()];
    while (compacted.length > 600) {
      const gem = compacted.pop();
      let closest = compacted[0];
      let best = Infinity;
      for (const candidate of compacted) {
        const d = distance(gem, candidate);
        if (d < best) {
          best = d;
          closest = candidate;
        }
      }
      closest.value += gem.value;
      closest.radius = Math.min(10, 4 + Math.log2(closest.value));
    }
    run.gems = compacted;
  } else run.gems = remaining;
}

function offerLevel(run) {
  while (run.xp >= run.xpNeeded && run.level < 100) {
    run.xp -= run.xpNeeded;
    run.level++;
    classLevelUp(run);
    run.xpNeeded = Math.floor(8 + (run.level - 1) * 6 + (run.level - 1) ** 1.5 * 1.5);
    const eligible = Object.values(UPGRADES).filter(item => item.type === 'support' ? supportTargets(run, item.id).length > 0 : (run.upgrades[item.id] || 0) < item.max).map(item => item.id);
    if (eligible.length) {
      run.offered = [];
      while (eligible.length && run.offered.length < 3) run.offered.push(eligible.splice(Math.floor(random(run) * eligible.length), 1)[0]);
      run.phase = 'upgrade';
      return;
    }
    run.player.hp = Math.min(run.player.maxHp, run.player.hp + 25);
    effect(run, 'heal', run.player.x, run.player.y, 28, '#a9e9b6', 0.6);
  }
}

export function tick(run, dt, input = { x: 0, y: 0 }) {
  if (run.phase !== 'playing') return run;
  dt = Number.isFinite(dt) ? Math.max(0, Math.min(0.05, dt)) : 0;
  if (run.player.hp <= 0) {
    run.phase = 'dead';
    return run;
  }
  if (!dt) return run;
  const flaskWasActive = combatState(run).flaskUntil > run.time;
  run.time += dt;
  // Expired resource bonuses must leave before this frame's incoming damage.
  if (flaskWasActive && !(combatState(run).flaskUntil > run.time)) refreshPlayer(run, {maxHp: run.player.maxHp});
  const values = stats(run);
  const player = run.player;
  player.speed = values.speed;
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  let x = Number.isFinite(input?.x) ? input.x : 0;
  let y = Number.isFinite(input?.y) ? input.y : 0;
  const length = Math.hypot(x, y);
  if (length > 1) {
    x /= length;
    y /= length;
  }
  if (length > 0) {
    player.facingX = x / Math.hypot(x, y);
    player.facingY = y / Math.hypot(x, y);
  }
  run._stationary = length > 0 ? 0 : run._stationary + dt;
  player.x += x * values.speed * dt;
  player.y += y * values.speed * dt;
  for (const item of run.effects) item.life -= dt;
  for (const item of run.texts) {
    item.life -= dt;
    item.y -= dt * 24;
  }
  if(run.encounters)tickEncounters(run,dt,{
    random:()=>random(run),projectile:(origin,target,options)=>projectile(run,origin,target,options),
    effect:(...args)=>effect(run,...args),damagePlayer:(amount,context)=>hurtPlayer(run,amount,context),
    damageAlly:(target,amount,context)=>classAllyDamage(run,target,amount,context),
    enemySpeed:enemy=>classEnemySpeed(run,enemy),enemyCooldown:enemy=>classEnemyCooldown(run,enemy),
    enemyChill:(enemy,elapsed)=>classEnemyChill(run,enemy,elapsed),assignRareModifiers,
    applyCorruptedBlood:(target,options)=>{if(target!==run.player)return false;applyCorruptedBlood(run,options);return true;},
  });
  else spawnWaves(run, dt);
  moveEnemies(run, dt);
  attack(run, values, dt);
  moveProjectiles(run, dt);
  const flaskBeforeTick = combatState(run).flaskUntil > run.time;
  classTick(run,dt,{damageEnemy:(target,damage,context)=>hurtEnemy(run,target,damage,context),projectile:(origin,target,options)=>projectile(run,origin,target,options),skillStats});
  if (!flaskBeforeTick && combatState(run).flaskUntil > run.time) refreshPlayer(run, values);
  rewardDead(run);
  collectGems(run, values, dt);
  run.effects = run.effects.filter(item => item.life > 0).slice(-250);
  run.texts = run.texts.filter(item => item.life > 0).slice(-150);
  if (player.hp <= 0) {
    run.phase = 'dead';
    return run;
  }
  player.hp = Math.max(0,Math.min(player.maxHp, player.hp + (values.regen-(classBaseModifiers(run).lifeLoss||0)) * dt));
  if (player.hp<=0) {run.phase='dead';return run;}
  if (run.time >= DURATION && (run.encounters?BOSS_SCHEDULE.every(b=>run.encounters.defeatedBosses.includes(b.id)):run.bossDefeated)) run.phase = 'won';
  else if (!checkAscendancyTrial(run) && !collectLoot(run)) offerLevel(run);
  return run;
}

function refreshPlayer(run, previous) {
  if (run.classState) {refreshClassResources(run);run.player.speed=stats(run).speed;return;}
  const values = stats(run);
  run.player.maxHp = values.maxHp;
  const lifeGain = run.player.hp > 0 && run.phase !== 'dead' ? Math.max(0, values.maxHp - previous.maxHp) : 0;
  run.player.hp = Math.max(0, Math.min(values.maxHp, run.player.hp + lifeGain));
  run.player.speed = values.speed;
}

export function supportTargets(run, id) {
  const support = UPGRADES[id];
  if (support?.type !== 'support') return [];
  return support.compatible.filter(skill => {
    const links = run.links[skill] || {};
    return weaponLevel(run, skill) > 0 && (links[id] || 0) < support.max && (links[id] || Object.keys(links).length < 2);
  });
}

export function chooseUpgrade(run, id, target) {
  const definition = UPGRADES[id];
  if (run.phase !== 'upgrade' || !run.offered.includes(id) || !definition) return run;
  if (definition.type === 'support') {
    if (!supportTargets(run, id).includes(target)) return run;
  } else if ((run.upgrades[id] || 0) >= definition.max) return run;
  const previous = stats(run);
  if (definition.type === 'support') {
    const links = run.links[target] ||= {};
    links[id] = (links[id] || 0) + 1;
  } else run.upgrades[id] = (run.upgrades[id] || 0) + 1;
  refreshPlayer(run, previous);
  if (id === 'vitality') effect(run, 'heal', run.player.x, run.player.y, 28, '#a9e9b6', 0.6);
  run.offered = [];
  run.phase = 'playing';
  offerLevel(run);
  return run;
}

const ITEM_MODS = {
  damage: { text: 'урон', value: 0.15, percent: true },
  cooldown: { text: 'сокращение перезарядки', value: 0.06, percent: true },
  speed: { text: 'скорость', value: 0.06, percent: true },
  maxHp: { text: 'максимальное здоровье', value: 20 },
  regen: { text: 'HP/с', value: 0.6 },
  pickup: { text: 'радиус сбора опыта', value: 25 },
  projectiles: { text: 'снаряды (сфера, залп, призраки)', value: 1 },
  area: { text: 'радиус ауры, орбиты и взрывов', value: 0.2, percent: true },
  damageReduction: { text: 'снижение входящего урона', value: 0.15, percent: true },
};
function describeMods(mods) {
  return Object.entries(mods).map(([id, value]) => `+${ITEM_MODS[id]?.percent ? Math.round(value * 100) + '%' : Number(value.toFixed(2))} ${ITEM_MODS[id]?.text || ({armour:'брони',evasion:'уклонения',energyShield:'энергощита',block:'шанса блока',leech:'доли похищения жизни',poisonChance:'шанса отравления'}[id] || id)}`).join('; ');
}

export function rollItem(run, rarity) {
  if (!['magic', 'rare', 'unique'].includes(rarity)) {
    const roll = random(run);
    rarity = roll < 0.15 ? 'unique' : roll < 0.65 ? 'rare' : 'magic';
  }
  const id = run._nextId++;
  if (rarity === 'unique') {
    return rollUnique(run,id,()=>random(run));
  }
  const slots = run.classState ? ['weapon','body','flask','helmet','shield','offhand','quiver','amulet','gloves','boots','belt','ring'] : ['weapon', 'body', 'flask'];
  const slot = slots[Math.floor(random(run) * slots.length)];
  const pool = Object.keys(ITEM_MODS).filter(key => !['area', 'damageReduction'].includes(key));
  const count = rarity === 'magic' ? 1 + Math.floor(random(run) * 2) : 2 + Math.floor(random(run) * 2);
  const mods = {};
  for (let i = 0; i < count; i++) {
    const key = pool.splice(Math.floor(random(run) * pool.length), 1)[0];
    const multiplier = rarity === 'rare' && key !== 'projectiles' ? 1.5 : 1;
    mods[key] = ITEM_MODS[key].value * multiplier;
  }
  if(run.classState){
    if(slot==='body')Object.assign(mods,{armour:80+(rarity==='rare'?40:0),evasion:80,energyShield:12});
    if(slot==='helmet')mods.energyShield=20;
    if(slot==='shield')mods.block=.25;
    if(['weapon','offhand'].includes(slot))Object.assign(mods,{leech:.01,poisonChance:.15,powerChargeChance:.1,frenzyChargeOnKill:.1});
  }
  const names = { weapon: 'Осколок сумерек', body: 'Покров пепла', flask: 'Флакон рассвета',helmet:'Венец сумерек',shield:'Круглый щит',offhand:'Второй клинок',quiver:'Колчан',amulet:'Амулет',gloves:'Перчатки',boots:'Сапоги',belt:'Пояс',ring:'Кольцо' };
  return { id, name: `${rarity === 'rare' ? 'Редкий' : 'Магический'}: ${names[slot]}`, slot, rarity,
    ...(run.classState&&slot==='flask'?{utility:true}:{}),
    icon: { weapon: '⚒', body: '♜', flask: '◉',helmet:'♛',shield:'◇',offhand:'⚔',quiver:'➶',amulet:'◈',gloves:'✋',boots:'♟',belt:'∞',ring:'◌' }[slot], color: rarity === 'rare' ? '#ecd377' : '#8faeff',
    mods, description: describeMods(mods) };
}

function collectLoot(run) {
  const index = run.loot.findIndex(drop => distance(drop, run.player) <= 40);
  if (index < 0) return false;
  run.pendingItem = run.loot.splice(index, 1)[0].item;
  run.phase = 'loot';
  return true;
}

export function lootReplacement(run, item = run.pendingItem) {
  const opposite = {offhand: 'shield', shield: 'offhand'}[item?.slot];
  const slot = opposite && run.equipment[opposite] ? opposite : item?.slot;
  const slots=new Set([item?.slot,slot]);
  if(item?.twoHanded)for(const incompatible of ['shield','offhand','quiver'])slots.add(incompatible);
  if(['shield','offhand','quiver'].includes(item?.slot)&&run.equipment.weapon?.twoHanded)slots.add('weapon');
  const items=[...slots].filter(s=>run.equipment[s]).map(s=>({slot:s,item:run.equipment[s]}));
  return {slot, item: run.equipment[slot] || null,items};
}

export function equipLoot(run, take = true) {
  if (run.phase !== 'loot' || !run.pendingItem || !Object.hasOwn(run.equipment, run.pendingItem.slot)) return run;
  const previous = stats(run);
  if (take) {
    const replaced = lootReplacement(run);
    for(const removed of replaced.items)run.equipment[removed.slot]=null;
    run.equipment[run.pendingItem.slot] = run.pendingItem;
    if(run.pendingItem.slot==='flask'){const b=combatState(run);b.flaskUntil=0;b.flaskCharges=Math.min(b.flaskCharges,flaskSpec(run).capacity);}
  }
  run.pendingItem = null;
  refreshPlayer(run, previous);
  run.phase = 'playing';
  offerLevel(run);
  return run;
}

export function setPaused(run, paused) {
  if (paused && run.phase === 'playing') run.phase = 'paused';
  else if (!paused && run.phase === 'paused') run.phase = 'playing';
  return run;
}
function baseStats(run) {
  const level = id => Math.max(0, Math.min(UPGRADES[id].max, run.upgrades[id] || 0));
  const bonus = id => Math.max(0, Number(run._bonuses[id]) || 0);
  const item = id => Object.values(run.equipment).reduce((total, gear) => total + (id === 'damage' && gear?.damageType === 'elemental' ? 0 : Math.max(0, classEquipmentModifier(run,gear,id))), 0);
  const classValues = classStats(run);
  const classMods = classBaseModifiers(run);
  if(!run.classState){classMods.speed+=stolenStat(run,'speed')+(combatState(run).adrenalineUntil>run.time?.25:0);}
  return {
    damage: 24 * (1 + level('might') * 0.2 + bonus('damage') + item('damage')),
    cooldown: Math.max(0.35, 1 - level('haste') * 0.09 - bonus('cooldown') - item('cooldown')),
    speed: 225 * (1 + level('stride') * 0.08 + bonus('speed') + item('speed')) * classMods.speed,
    pickup: 100 + level('magnet') * 35 + bonus('pickup') + item('pickup'),
    maxHp: classValues ? classValues.life : 120 + level('vitality') * 25 + bonus('maxHp') + item('maxHp')+rawGear(run,'strength')/2,
    regen: (0.3 + level('regen') * 0.6 + bonus('regen') + item('regen')) * (run.classState?.allocatedTreeNodeIds.includes('17988')?1.4:1) + classMods.regen,
    projectiles: Math.floor(item('projectiles')),
    area: 1 + item('area'),
    damageReduction: Math.min(0.6, item('damageReduction')),
  };
}

export function skillStats(run, id, actor) {
  const base = baseStats(run);
  const rank = weaponLevel(run, id);
  const links = run.links[id] || {};
  const level = support => Math.max(0, Math.min(3, links[support] || 0));
  const elementalBonus = ['bolt', 'nova'].includes(id) ? Object.values(run.equipment).reduce((sum, item) => sum + (item?.damageType === 'elemental' ? Number(item.mods?.damage) || 0 : 0), 0) : 0;
  const minion=id==='minion';
  const genericIncrease=(run.upgrades.might||0)*.2+(Number(run._bonuses?.damage)||0);
  const values = { damage: minion?24*(1+genericIncrease):base.damage + 24 * elementalBonus, cooldown:minion?Math.max(.35,1-(run.upgrades.haste||0)*.09-(Number(run._bonuses?.cooldown)||0)):base.cooldown, area: minion?1:base.area, projectiles: minion?1:1+base.projectiles, pierce: 0, critChance: 0, critMultiplier: 1.5 };
  Object.assign(values,{damageType:id==='bolt'?'cold':id==='nova'?'fire':'physical',skillId:id,isAttack:id==='lightning',isMinion:minion,actor:{kind:minion?'minion':'player',id:actor?.id,ownerId:'player'},increasedDamageTotal:genericIncrease+(!minion?rawGear(run,'damage'):0)+elementalBonus});
  if (id === 'bolt') {
    values.damage *= (1 + Math.max(0, rank - 1) * 0.32) * (1 + level('infused') * 0.15);
    values.cooldown *= 0.6 * (run._stationary >= 0.5 ? 1 - level('infused') * 0.1 : 1);
    values.projectiles += Math.floor(rank / 3);
    values.pierce = (rank >= 4 ? 1 : 0) + level('pierce');
  } else if (id === 'orbit') {
    values.damage *= 0.9 + Math.max(0, rank - 1) * 0.28;
    values.cooldown *= 0.48;
    values.projectiles = 3 + Math.floor(rank / 2) + level('unleash');
  } else if (id === 'nova') {
    values.damage *= (0.55 + Math.max(0, rank - 1) * 0.17) * (1 + level('burning') * 0.3);
    // Burn cadence stays fixed; haste scales damage to preserve a continuous, bounded aura.
    values.damage /= base.cooldown;
    values.cooldown = 0.25;
    values.projectiles = 0;
  } else if (id === 'lightning') {
    values.damage *= (1.25 + Math.max(0, rank - 1) * 0.35) * 0.85 ** level('volley');
    values.cooldown *= 1.1;
    values.projectiles += 2 + Math.floor(Math.max(0, rank - 1) / 2) + level('volley') * 2;
  } else if (id === 'minion') {
    values.damage *= (0.8 + Math.max(0, rank - 1) * 0.24) * (1 + level('minion_damage') * 0.3);
    values.cooldown *= 0.9;
    values.pierce = level('pierce');
  }
  if (['bolt', 'orbit', 'nova'].includes(id)) values.area *= 1 + level('area') * 0.2;
  if (['orbit', 'lightning'].includes(id) && level('critical')) {
    values.critChance = 0.1;
    values.critMultiplier += level('critical') * 0.4;
  }

  if(!run.classState){
    const b=combatState(run),inc=stolenStat(run,'damage')+(b.adrenalineUntil>run.time&&id!=='minion'?1:0)+(['bolt','nova'].includes(id)?nebulisIncrease(run,legacyResistances(run)):0);
    if(id!=='minion')values.damage*=1+inc/(1+values.increasedDamageTotal);values.increasedDamageTotal+=inc;
    if(!['nova','minion'].includes(id))values.cooldown/=1+(id!=='lightning'?rawGear(run,'castSpeed'):0)+(b.adrenalineUntil>run.time?.25:0);
    if(id!=='minion')values.area*=Math.sqrt(1+classEquipmentModifier(run,run.equipment.flask,'uniqueArea'));
  }
  return classSkillModifiers(run,id,values,actor);
}

export function stats(run) {
  return {
    ...baseStats(run),
    orbitCount: skillStats(run, 'orbit').projectiles,
    orbitRadius: (64 + Math.max(0, weaponLevel(run, 'orbit') - 1) * 3) * skillStats(run, 'orbit').area,
    fireRadius: (90 + Math.max(0, weaponLevel(run, 'nova') - 1) * 15) * skillStats(run, 'nova').area,
    minionCount: weaponLevel(run, 'minion') > 0 ? Math.min(3, 1 + Math.floor((weaponLevel(run, 'minion') - 1) / 2)) : 0,
    kineticCount: skillStats(run, 'lightning').projectiles,
  };
}

# Task 2 — самостоятельная модель встреч

Дата: 27.10.2026. Изменены только `games/duskbound/encounters.mjs`, `tests/duskbound-encounters.test.mjs` и этот отчёт. Core, classes, uniques, UI и браузер не изменялись; интеграция относится к Task 3. Коммитов нет.

## Реализованное поведение

- Постепенный roster unlock (локальный баланс): 0s Drowned, 20s Archer, 35s Rhoa, 65s Goatman, 100s Sentinel, 150s Evangelist, 190s Queen, 220s Tentacle. Публичный fixture spawn доступен независимо от unlock.
- Восемь обычных архетипов и дочерний Carrion Minion: физический замах Drowned; фиксированный swept charge Rhoa; прыжок Goatman с дугой и locked landing; одиночная physical attack Archer; три fire spell снаряда Sentinel; отложенная physical spell руна Evangelist и пузырь, защищающий находящихся внутри союзников; ограниченный вывод Carrion Minions рядом с Queen и отдельный physical spit; две серии по три physical/fire 50/50 шипа Tentacle.
- Замахи используют `action`, не `telegraph`, и доступны для наведения/урона. `telegraph` используется для появления босса. Действия, прыжковая высота, щиты и hazards — данные модели, а не draw calls.
- Brutus: направленный physical Chain Pull с реальным перемещением попавших целей; три отдельных body-centred slams; отложенная расширяющаяся кольцевая ground wave.
- Merveil: cold fan и пульсирующий Ice Storm с локальной отметкой chill; при 50% единого HP — форма The Twisted, отдельный artKey, три geysers и ограниченные adds.
- Dominus: lightning souls, один body-centred Touch of God hit с physical/lightning компонентами; Ascendant при 50%, Rain of Blood с безопасной областью и distinct Corrupted Blood.
- Kitava: неподвижное тело, physical cone swipe и fire cone breath. При 50% тело становится неуязвимым и недоступным для наведения; отдельное сердце получает HP/ID/цель, появляются adds. Убийство сердца один раз возвращает уязвимость тела, не отмечает убийство босса и не выдаёт unique.
- Очередь 120/240/360/450: один активный босс, просроченные ждут. После 480 новые обычные волны/элиты не появляются, очередь боссов продолжает работать. `recordEncounterKill` гарантирует один reward flag на босса; `bossDefeated` становится true после всех четырёх.
- Пределы: 180 живых обычных врагов с дочерними; плюс тело и сердце; 64 hazards; до четырёх дочерних Queen / до шести boss adds. Смерть владельца убирает ожидающие атаки. Очереди и списки босса ограничены четырьмя ID. Удаление мёртвых сущностей остаётся ответственностью общего reap-прохода core.

## Публичный контракт интеграции

Экспорты: `MONSTERS`, `BOSSES`, `BOSS_SCHEDULE`, `initEncounters`, `spawnPoeEnemy`, `startBossEncounter`, `tickEncounters`, `recordEncounterKill`, `enemyTargetable`, `proximityBlocks`, **`prepareEncounterDamage`**.

`initEncounters` запускается при создании нового class run; он сбрасывает subsystem state, удаляет старые `poeKind` сущности, сохраняет посторонние fixture-сущности. `tickEncounters` получает уже продвинутый `run.time`, `dt` в секундах и API. Не вызывает wall clock, не продвигает время самостоятельно и не работает вне `playing`. Вызов заменяет старые class-run spawn/move paths, иначе появятся двойные волны/атаки. Legacy run оставляет прежний путь.

```js
initEncounters(run);
// В live tick: после продвижения run.time, вместо legacy spawnWaves/moveEnemies:
tickEncounters(run, dt, {
  random: () => random(run),
  projectile: (origin, target, options) => projectile(run, origin, target, options),
  damagePlayer: (amount, context) => hurtPlayer(run, amount, context),
  damageAlly: (ally, amount, context) => classAllyDamage(run, ally, amount, context),
  effect: (...args) => effect(run, ...args),
  enemySpeed: enemy => classEnemySpeed(run, enemy),
  enemyCooldown: enemy => classEnemyCooldown(run, enemy),
  assignRareModifiers: (enemy, random) => assignRareModifiers(enemy, random),
  applyCorruptedBlood: (target, options) => {
    if (target !== run.player) return false;
    applyCorruptedBlood(run, options);
    return true;
  },
});
// После classHit/расчёта окончательного урона; до enemy.hp -= damage:
damage = prepareEncounterDamage(run, enemy, damage);
// На смерти до удаления сущности:
const result = recordEncounterKill(run, enemy);
if (result.uniqueReward) { /* core гарантированно rollItem unique ровно один раз */ }
```

`prepareEncounterDamage` нужен **для каждого источника damage, включая DoT**: неуязвимое тело получает 0; живые Merveil/Dominus/Kitava в первой форме не опускаются ниже 50% одним ударом/DoT. Следующий tick открывает форму/сердце. Без guard lethal hit способен обойти фазу. `enemyTargetable` нужно применить ко всем selectors/auto-target и прямым AoE, а не только `nearest`. Пузырь удаляет hit damage, не сам hit: non-ailment on-hit события должны сохраняться в hit pipeline; damage-derived ailments/leech от нулевого damage не возникают.

`assignRareModifiers` технически optional для fixture API, но **обязателен в production wiring**: модуль масштабирует элиту, а реальные `rareMods` назначает существующий механизм через callback; упрощённая копия его не создаётся.

`applyCorruptedBlood(target,{count:1,stacks:1,dps:4,duration:3,sourceId})`: dps — на один stack. При callback модуль передаёт наложение внешней authority; callback, вернувший `false`, включает локальный fallback для этой цели. Любой другой return означает, что caller владеет иммунитетами и ticking. Для player production использует `classes.applyCorruptedBlood`, включая Ralakesh; модуль не держит второй player CB. Без callback standalone fallback хранит `target.corruptedBlood` (max 10, 3s) и каждые 0,5s отправляет `hit:false,isDot:true,ailment:'corruptedBlood'`. Готовый DoT callback не запускает повторное наложение CB.

Контексты снарядов сохраняют `hostile:true`, `enemyId`, `type`, `spell`, `isAttack`, `area`, `melee`, `skill`; mixed attacks несут **абсолютные суммы** в `components`, например 12 damage = `{physical:6,fire:6}`. Общий projectile pipeline должен сохранять эти поля и не превращать каждую hostile arrow в spell/area. Один mixed hit передаётся одним callback, чтобы block/evasion не бросались отдельно на каждый компонент.

В списки targets и actor resolution включены minions, totems, mercenary/minions и Sentinel.

Для fixture: `startBossEncounter(run,'kitava',{x,y})`, затем при необходимости `boss.telegraph=0`; `spawnPoeEnemy(run,'evangelist',{x,y})`; `enemy.shotTimer=0` для немедленного старта замаха. API не использует импортов core/classes/uniques.

## Renderer state

`run.encounters`: `activeBossId`, `queue`, `scheduled`, `defeatedBosses`, `rewardedBosses`, `center`, `nextHazardId`.

`enemy`: `poeKind`, `name`, `artKey`, `phase`, `phaseLabel`, `encounterCenter`, `invulnerable`, `cannotBeSlowed`; для сердца `kind:'heart'`, `poeKind/artKey:'kitavaHeart'`, `bodyId`. `action` содержит `kind`, `phase`, `startedAt`, `until`, `targetX/Y`, `angle`, `x/y` — фактический центр warning (body для melee, locked target для landing/rune/storm), warning `geometry/radius/arc/width/x2/y2`, для leap — `originX/Y`, для charge — locked endpoint/travel/hit IDs. `jumpHeight` задаёт видимую дугу. `shieldUntil/shieldRadius` — реальные границы пузыря.

Art keys: drowned, rhoa, goatman, ancientArcher, flameSentinel, evangelist, carrionQueen, tentacleMiscreation, carrionMinion, brutus, merveil, merveilTwisted, dominus, dominusAscendant, kitava, kitavaHeart.

`run.hazards`: `id/ownerId/bossId/kind/geometry`, `x/y/radius`, `warningUntil`, `expiresAt`, `nextHitAt`, `damage/context`; line — `x2/y2/width`; cone — `angle/arc`; ring — `innerRadius/baseRadius/ringWidth/growSpeed/maxRadius`; safeZone — `safeRadius`. `followOwner` привязывает blood rain к Dominus. Warning geometry должна рисоваться и в reduced-effects; эффекты `api.effect` служат дополнительной подсветкой, не источником gameplay.

## Источники и локальные адаптации

Основание: согласованный `2026-10-27-duskbound-poe-expansion-design.md`, source-файлы монстров/боссов/unique, дополнительный shield contract в brief. Все HP, speed, damage, radii, cooldown, thresholds, caps, count, форма одной общей HP полосы, расписание и unique reward — Duskbound balance. У Queen physical spit — явно локальный нейтральный выбор: источник не устанавливает элемент. Sentinel реализует Multiple Projectiles, без Fork/beam.

Proximity Shield сравнивает центры: внутри включает точную границу radius110; source проверяется по **актуальной actor entity**, по ID разрешает minions/totems и использует stored source fallback для удалённого actor. DoT не блокирует. Impact-time/live position и fallback — локальная политика, не установленный PoE snapshot. Вторичные взрывы должны подавать свой explosion center по согласованной локальной политике. Функция не уничтожает projectile и не удаляет hit event.

Merveil не имеет animated weapons/statues/полного набора второй формы. Dominus не имеет шести minibosses/totems/teleport/полного набора Ascendant атак. Kitava не имеет всех X/beam/darkness атак и постоянного penalty сопротивлений. Brutus не переносит исторические spike traps/skeletons; bleed Chain Hook не реализован. Замедление Kitava body/heart игнорируется как явно выбранное локальное исключение; сохранённый source прямо подтверждает heart speed floor, но не всю эту gameplay политику тела. Ice Storm помечает `chillUntil`; реальное изменение player скорости потребует чтения этого поля в core (Task 3), поэтому эффект замедления игрока самостоятельная модель не заявляет.

## Проверка

`node --check games/duskbound/encounters.mjs` — exit 0.

`node --test tests/duskbound-encounters.test.mjs` — **39 tests, 39 passed, 0 failed**, exit 0. Реальный запуск 27.10.2026. Проверены различимые состояния всех восьми, targetability замаха, hit/miss и boundary геометрии, swept crossing, lock landing/направления, attack/spell и mixed компоненты, пузырь/DoT/actor/fallback, caps и rare hook, queue/reward/idempotence, все формы/сердце, lethal damage guard, safe-zone/CB authority, pause, freeze/chill, arena anchor, reset, bounded hazards и deterministic RNG включая seed0.

Red→green наблюдался: исходный тест отсутствующего subsystem — 1 failure по отсутствию `encounters.mjs`; после реализации 24/24 green. Затем 4 новых проверки guard/CB authority/render geometry/ring — 4 failures до реализации и 28/28 после. Seed0 regression — отдельный observed failure (1586005467 вместо независимого ожидаемого1196435762), после nullish fallback 35/35. После адресного ревью добавлены progression/fan-body geometry/Sentinel проверки: 3 failures, затем 38/38; дополнительная проверка locked warning centre выявила 150 вместо0 до исправления, итог39/39. Остальные boundary/miss assertions добавлены к существующему green поведению как расширенная проверка.

Полный suite, wiring class damage/CB, реальные unique drops, визуальная читаемость, browser/mobile/reduced-effects, simulation matrix и run victory проверяются Task 3 после интеграции; этот отчёт не объявляет их выполненными.

## Исправления по независимому ревью Task 2

27.10.2026 исправлены оба P2 из `task-2-review.md`. Для `cannotBeSlowed` множитель длительности замаха теперь ограничен сверху 1: freeze/chill не растягивают атаку Kitava, ускорение `.5` сохраняется. Прежний нижний предел `.2` сохранён; нечисловой/бесконечный cooldown возвращает базовую длительность. Production-модуль остаётся без импортов core/classes; только новые тесты вызывают реальные `classEnemySpeed`/`classEnemyCooldown` на fixture с пустым списком выделенных узлов.

`proximityBlocks` разрешает `{kind:'player',ownerId:'player'}` через текущий `run.player`, даже когда ID отсутствует. ID `0` союзника обрабатывается как допустимый. Проверены оба направления перемещения внутрь/наружу пузыря и прежний fallback координат после удаления actor; отдельная политика explosion center не менялась.

Дополнительно закрыто замечание о повторном `initEncounters` на том же объекте: fallback `corruptedBlood` удаляется у player, minions, totems, mercenaryMinions, mercenary и Sentinel, включая сохранённого мёртвого союзника. Тест предварительно получает эти debuffs настоящим Rain of Blood, затем подтверждает отсутствие debuffs и новых DoT hits после reset. Поля `encounterBleed` в текущей самостоятельной модели нет; чужие поля дебаффов правка не затрагивает.

Выполненный red→green: **7 новых тестов, сначала 7 failed**, затем **7 passed**. Наблюдаемые исходные ошибки: windup `100.05` при freeze / `2.05` при chill вместо `1.05`, ускоренный windup `1.05` вместо `.55`, `NaN` deadline, shield ошибочно блокирует живого player/minion с ID 0 внутри, у minion остаётся 3 CB stacks после reset. На green проверяются также фактические `kitavaSwipe` hits в пределах ожидаемого времени.

Финальная адресная регрессия:

```sh
node --test --test-name-pattern='Kitava|shield|bubble|Corrupted Blood|reset|freeze|chill|Touch|Brutus|Merveil|Dominus|boss projectile|non-finite boss|cold geysers' tests/duskbound-encounters.test.mjs
```

**24 tests, 24 passed, 0 failed**, exit 0. `node --check games/duskbound/encounters.mjs` и `node --check tests/duskbound-encounters.test.mjs` — exit 0. Это выбранные 24 проверки, полный suite повторно не запускался. UI/browser, core wiring и остальные проверки Task 3 в эту правку не входили. Изменены только два переданных файла и это дополнение; состояние правки заморожено для интеграции родительским агентом, без коммитов.

# Task 2 — независимое ревью encounters

Дата: 27.10.2026. Область: новый `games/duskbound/encounters.mjs`, автономные `tests/duskbound-encounters.test.mjs`, brief/report и переданный diff. Production wiring, UI и полный suite относятся к Task 3 и здесь не объявляются проверенными. Код не изменялся.

## Вердикт

**Нужны исправления двух P2 перед приёмкой модели.** Основной объём самостоятельной модели соответствует согласованному дизайну: 8 различных archetypes плюс daughter, типизированные attack/spell/mixed contexts, очередь четырёх боссов, отдельное сердце, threshold damage guard, однократный reward flag, ограничение живых normals и hazards реализованы. Числа и сокращения исходных boss movesets честно обозначены как локальные адаптации. Недостатки ниже воспроизведены отдельными маленькими Node probes; отсутствие Task 3 wiring не считается дефектом Task 2.

### [P2] Kitava принимает замедление через длительность замаха

**Место:** `games/duskbound/encounters.mjs:226` (применение к duration на строке 232); неполная проверка — `tests/duskbound-encounters.test.mjs:38`.

Для `cannotBeSlowed` используется `Math.max(1, api.enemyCooldown(e))`. В реальном классовом API `classEnemyCooldown` обратно пропорционален `classEnemySpeed` (`classes.mjs:518`), поэтому freeze даёт cooldown 100, chill — значение больше 1. Перемещение и freeze gate Kitava обходят замедление, а новый windup всё равно растягивается до 100 секунд. Это противоречит объявленному в report локальному исключению тела Kitava и binding brief про явное cannot-be-slowed поведение.

**Воспроизведение:** fresh fixture с Infinity wave/elite timers; Kitava в (0,0), `telegraph=0`, `shotTimer=0`, `freezeUntil=100`; player в (180,0). API `enemySpeed:()=>0`, `enemyCooldown:()=>100`; 30 live ticks по 0,05 с. На 1,5 с фактически `action.phase='windup'`, `action.until=100.05`, попаданий нет. Контроль с `enemyCooldown:()=>1` даёт `kitavaSwipe` и recover к тому же времени. Значение 100 соответствует существующему callback, а не придуманному диапазону.

**Исправление:** исключить замедляющую часть cooldown для `cannotBeSlowed` и проверить реальные согласованные пары speed/cooldown для freeze/chill. Имеющийся тест меняет только speed, оставляя cooldown равным 1, поэтому дефект не замечает.

### [P2] Live position игрока не разрешается по текущему actor contract

**Место:** `games/duskbound/encounters.mjs:65–67`; тесты `tests/duskbound-encounters.test.mjs:64–68` покрывают ID тотема, но не player actor без ID.

Helper ищет живую entity только при truthy `actor.id`. У существующего `run.player` ID нет (`core.mjs:43`), а обычная метаинформация игрока имеет вид `{kind:'player',ownerId:'player'}` (`classes.mjs:340`, `core.mjs:706`). С таким actor helper берёт сохранённую `origin.x/y` вместо текущей позиции игрока, нарушая согласованную локальную политику live position at impact.

**Воспроизведение:** активировать Evangelist shield в (0,0), radius 110; атакуемая цель внутри; передать `origin={x:500,y:0,actor:{kind:'player',ownerId:'player'}}`, пока живой `run.player` уже стоит в (50,0). `proximityBlocks` возвращает **true**, хотя source entity сейчас внутри и hit damage должен проходить. Прямой Node probe выполнен; результат `{playerX:50,shield:4.05,blocked:true}`. Обратное перемещение также способно пропустить hit снаружи по старому origin внутри.

**Исправление:** разрешать player actor через `run.player` с сохранением отдельной локальной политики вторичных взрывов, либо сделать явный adapter contract, который всегда передаёт live entity игрока. При втором варианте нужны точное документирование shape и автономный тест adapter semantics; текущий обычный class actor metadata helper сам не поддерживает. Это конкретный недостаток интерфейса разрешения источника, а не замечание о ещё не подключённом core.

## Проверенные по коду сильные стороны и границы

- `action`, а не spawn `telegraph`, хранит windup; `enemyTargetable` не исключает windups. Rhoa использует swept segment и hit IDs; Goatman хранит locked landing и видимую дугу; Evangelist rune хранит locked circle. Queen daughters используют общий cap.
- Очередь строится из фиксированных 120/240/360/450; `scheduled` предотвращает повтор; после 480 прекращаются только regular waves. Heart не считается boss kill; body возвращается в phase 2; `prepareEncounterDamage` останавливает lethal hit/DoT на половине HP до перехода. Повторный kill не возвращает новый reward.
- `context.components` содержит абсолютные суммы; mixed Touch передаётся единым callback. Shield не уничтожает hit/projectile; DoT helper пропускает. Сохранение on-hit событий и запрет damage-derived ailments требуют правильного общего damage pipeline в Task 3.
- Rain использует геометрию safe zone и отдельный Corrupted Blood. Внешний callback получает authority; wrapper из report намеренно возвращает true после player callback, даже при immunity. Нельзя возвращать наружу его `false` как есть: это включает standalone fallback и обходит immunity.
- RNG — callback или serializable LCG state; wall clock не используется. Вне playing tick ничего не меняет. Живые normals ограничены 180, hazards — 64; мёртвые entities должен удалять reap core. Это заявленная ответственность интеграции, не бесконечный самостоятельный despawn.
- Дополнительное замечание к reset contract: `initEncounters` удаляет fallback CB только у player (строка 35). При повторной инициализации того же объекта с сохранёнными союзниками их `corruptedBlood` остаётся (маленький probe подтвердил). Для production fresh run, создающего новые ally objects, это не доказанный пользовательский дефект; если Task 3 переиспользует allies, нужно очистить и их subsystem debuffs.

## Качество тестов и объём проверки

По report выполнено **39/39 автономных тестов**; я не повторял их и не выдаю это за собственный запуск. Прочитал все tests и сопоставил assertions с моделью: есть независимые позиции/границы и ожидаемые суммы, реальные callbacks для hit/miss, targetability, threshold guard, очередь/reward/heart, заморозка и pause. Проверка эффектов в отдельных boss тестах слабее проверки попаданий, но целевые geometry/hit tests частично дополняют её. Пропуски, приводящие к двум найденным дефектам: несогласованная заглушка cooldown при freeze и отсутствие live player actor без ID.

Собственная исполняемая проверка: два адресных Node probes для findings, контрольный Kitava probe с cooldown 1 и probe reset союзника. Browser, полный suite и gameplay не запускались в этой области ревью.

## Контракты приёмки Task 3

1. Только class runs: заменить старые spawn/move paths, исключить двойные атаки и волны, сохранить Infinity overrides и общий reap.
2. Все источники damage, включая DoT и прямые AoE, должны применять `prepareEncounterDamage`; selectors должны исключать invulnerable body. Иначе one-shot может обойти настоящее сердце.
3. Shield должен получать фактический источник: player/minion/proxy, live coordinates, stored fallback для исчезнувшего actor; explosion center — отдельная заявленная адаптация. Нулевой hit сохраняет hit event/non-ailment debuffs, не порождает damage-derived ailments/leech.
4. Projectile pipeline должен сохранять attack/spell/area/melee/components; rare callback — вызывать существующий механизм; CB callback — сохранять immunity authority без двойного ticking.
5. Настоящий unique drop ровно один раз на reward flag; victory только при `time>=480` и всех четырёх defeated; HUD/phases, reduced-effects geometry и live-time pause/reset — проверять после подключения.

Таким образом, report правильно не объявляет standalone модуль готовой игровой интеграцией. После устранения двух P2 модель можно передавать Task 3 с перечисленными контрактами.

## Повторное ревью после исправлений — 27.10.2026

**Актуальный вердикт: APPROVED для самостоятельной модели Task 2. Оба P2 закрыты, reset caveat устранён.** Этот вердикт заменяет исходный «нужны исправления» выше; первоначальные findings оставлены как история проверки.

Сравнил live module/tests с пакетом `/tmp/duskbound-expansion-task2-review.diff`. Изменения production-модуля ограничены тремя рассмотренными областями: cooldown в `bossStart` (теперь строки 227–228), разрешение player/ID 0 в `proximityBlocks` (66–67), очистка fallback CB у всех actor sources в `initEncounters`/`targets` (35/90). Production imports core/classes не появились.

- Kitava: верхнее ограничение cooldown 1 устраняет растягивание замаха; ускорение и прежний нижний предел сохранены. Два новых regression cases используют реальные `classEnemySpeed`/`classEnemyCooldown`, подтверждают исходные speed/cooldown и проверяют конечное попадание, а не только deadline. Есть отдельные проверки ускорения и non-finite callback.
- Shield: `{kind:'player',ownerId:'player'}` разрешается через текущий `run.player`; отдельные tests проверяют перемещение в обе стороны. ID 0 и fallback удалённого minion также покрыты.
- Reset: `targets(run,true)` очищает subsystem fallback CB у player, всех трёх списков allies, mercenary и Sentinel, включая мёртвого сохранённого союзника. Тест получает CB из настоящего Rain of Blood, затем проверяет очистку и отсутствие последующих DoT hits.

Собственная повторная исполняемая проверка: короткий Node probe с реальными class callbacks подтвердил по одному `kitavaSwipe` к 1,5 с и при freeze, и при chill; shield probe подтвердил правильные результаты для обоих направлений перемещения player; reset probe подтвердил очистку всех шести actor sources, включая dead minion. Все assertions прошли, exit 0.

Дополненный report фиксирует observed red 7/7 → green 7/7 и последующую адресную регрессию **24/24**, плюс два syntax checks; эти команды повторно не запускал. Полный suite/browser не запускал. Нерешённых findings в повторно рассмотренной области нет; контракты Task 3 из предыдущего раздела сохраняются, включая отдельную подготовку shield source для secondary explosion center.

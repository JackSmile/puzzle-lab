# Task 3 — подключение encounters к живой модели

Дата: 27.10.2026. Production freeze передан родителю для независимого review. Работал только с четырьмя model modules, новым integration test/report и отдельно разрешённой одной строкой старого victory fixture. UI, browser, art, bot scripts, commit/push не выполнял.

## Реализовано

- `createRun({classId})` инициализирует новые encounters/hazards. Legacy `createRun()` сохраняет старые волны, single-boss victory и старый unique pool. Свежие class runs имеют пустую экипировку, нулевую историю боссов и отдельные объекты состояния.
- Core передаёт в `tickEncounters` seeded RNG, настоящие projectile/effect/damage hooks, ally damage, class speed/cooldown/chill, rare-modifier assignment. Старый `moveEnemies` обрабатывает только non-PoE fixtures; PoE entities не получают повторное движение/AI/chill decrement. Temporal Chains считает оставшийся chill единым чистым `classEnemyChill` до `classTick`, standalone fallback сохранён.
- Дополнительный собственный RED обнаружил потерю `_orbitWait` при переключении AI: Blade Vortex после первого попадания больше не повреждал ту же PoE цель. Таймер теперь уменьшается один раз в `tickEncounters`; реальная повторная атака проверена.
- Общие nearest/orbit/RF/projectile/splash/chain и ally selectors используют `enemyTargetable`. Minion, totem, Mercenary и Sentinel перенаправляются на сердце; обычные windups остаются доступны для попаданий. Berek, poison propagation и secondary explosion selectors исключают invulnerable body.
- Core применяет `prepareEncounterDamage` после `classHit` перед HP subtraction для прямых попаданий и DoT. Прямое melee-reflect subtraction в uniques тоже защищено threshold/body/shield guard и сохраняет attribution при смерти. Merveil/Dominus/Kitava нельзя убить через первую границу 50%; Kitava создаёт отдельное сердце.
- Shield использует live `actorOrigin` для player/minion/proxy, сохранённый launch `context.origin` после удаления actor; secondary explosion использует свой центр. Friendly projectile сохраняет отдельные actor/origin snapshots. Предотвращённый урон передаётся как `context.preventDamage`: curse/critical charge и collision/pierce/chain остаются, damage-derived ailments/leech/impales не создаются. Дополнительный cold chill в core также требует положительного фактического урона.
- Hostile projectile сохраняет явные attack/spell/area/melee/hit/components; смешанный hit проходит одну avoidance sequence и один ES/MoM расход. Reviewed исходные типы атак не переопределены.
- Player Corrupted Blood callback всегда возвращает authority `true`, даже когда Ralakesh запретил application; только allies получают standalone fallback. Completed DoT callbacks не накладывают CB повторно. В публичных сценариях проверены настоящая Rain of Blood, immunity, отсутствие fallback и сохранность stack/expiry после остановки дождя.
- `recordEncounterKill` вызывается до удаления. Сердце не даёт kill/XP/gem/corpse/loot и возобновляет тело. Каждый boss выдаёт один настоящий `rollItem(run,'unique')`, без второго elite drop. Очередь запускает следующего после reap предыдущего. Победа class run требует все четыре ID и `time>=480`; смерть сохраняет приоритет.
- Ice Storm `chillUntil` проходит существующий class action-speed rule: локальная величина **25% less action speed**, максимум с обычным chill, существующие immunity и минимальный action-speed floor сохранены. Expiry восстанавливает движение/skill cadence. Brutus chain bleed не добавлялся и не заявляется.
- Сохранены штатные caps: 180 regulars вместе с daughters, одно тело/сердце, 64 hazards, 500 projectiles, 250 effects, 180 corpses, существующие bounded ailment/history queues. Cleanup выполняет core. Pause/upgrade/loot/ascendancy полностью останавливают tick.

## Проверка и RED → GREEN

Новый `tests/duskbound-expansion-integration.test.mjs`: **44 selected /44 passed /0 failed /0 skipped**. Команда: `node --test tests/duskbound-expansion-integration.test.mjs`. Лог `/tmp/duskbound-integration-targeted-final.txt`.

- До production wiring первоначальные 25 cases: **8 passed /17 failed**, `/tmp/duskbound-integration-red.txt`. Это адресные отсутствующие wiring/guards/origin/slow/reward contracts, не 17 независимых причин.
- После первого wiring: 22/25. Три оставшихся failures были ошибками моих fixtures: Ascendancy имеет четыре trials, а не три; Kitava adds объективно ближе, чем сердце, и их нужно исключить для отдельного теста переключения с invulnerable body. Исправлены только isolation/preconditions, assertions о поведении сохранены. Получено 25/25.
- Расширенные mixed-hit expectations сначала использовали fire component, которая штатно создаёт дополнительный player ignite в том же frame. Для независимого арифметического ES/MoM ожидания fixture использует physical10+cold10, cold resistance50%: incoming15, ES5, mana1, life9; ожидаемая регенерация учтена отдельно. Проверка остаётся двумя типами урона с двумя shared avoidance calls, одним расходом ресурсов.
- При расширении до44 получен настоящий **43 passed /1 failed**: PoE `_orbitWait` не истекал. Лог `/tmp/duskbound-integration-orbit-red.txt`. После добавления единственного decrement —44/44.
- Полный окончательный файл44 дополнительно выполнен против неизменённой reviewed baseline в отдельной `/tmp/duskbound-integration-baseline` (production не откатывался): **14 passed /30 failed**, `/tmp/duskbound-integration-baseline-red44.txt`. Это подтверждает, какие сценарии обнаруживают отсутствие интеграции; часть class phase cases закономерно останавливается на отсутствии самого heart/encounter state. Переданное текущее baseline дерево — `/tmp/duskbound-expansion-preintegration`.

Сценарии44 включают: class/legacy roster и reset; однократное движение; queued четырёх боссов; реальные projectile kills всех фаз и сердца; однократный actual unique; class/legacy victory/death; direct/DoT/reflect threshold; тело/сердце и все четыре ally selectors; RF/orbit/повторный orbit/splash/chain; live/fallback player/minion/totem/proxy source; настоящий minion launch snapshot после удаления; inside/outside secondary centers; сохранённые curse/crit/pierce события нулевого shield-hit; DoT через shield; typed attack/spell и mixed mitigation; CB authority/immunity/no refresh; Temporal Chains boundary clock; настоящий Ice Storm и marker immunity/expiry; pause и caps/reap/rare modifiers.

Полная команда `node --test tests/*.test.mjs`: **431 selected /431 passed /0 failed /0 skipped**, `/tmp/duskbound-integration-full-final.txt`. Сюда входят все существующие tests и44 новых. Отдельно повторил `node --test tests/duskbound-items-review-regressions.test.mjs`: **64/64**, `/tmp/duskbound-integration-item64.txt`. Оригинальные tests на21×4 selectable notables и их original paths продолжают проходить. `poe-classes-source.json` и `poe-signatures-source.json` byte-identical reviewed baseline.

`node --check` для `core.mjs`, `classes.mjs`, `uniques.mjs`, `encounters.mjs`: все exit0.

## Единственная разрешённая адаптация старого теста

`tests/duskbound-classes.test.mjs:36`, test `death and victory take precedence over trial menus`: parent явно разрешил добавить только literal:

```js
r.encounters.defeatedBosses=['brutus','merveil','dominus','kitava'];
```

Это precondition к прежнему `r.time=480;r.bossDefeated=true`. Исходный `assert.equal(r.phase,dead?'dead':'won')` и весь цикл сохранены. Прежний fixture утверждал superseded single-boss victory для нового class run. Legacy single-boss отдельно остаётся GREEN в новом public integration case. Другие существующие tests/expectations не менял.

## Freeze / SHA-256

```text
7da54783dada1ed0c12b39e7b116cac79e263caf0273f586da557b66481369fa  games/duskbound/core.mjs
46f6fcc995c42e72195445157885739ddef4e73b82a79afd51cb1a4217c21037  games/duskbound/classes.mjs
d5e0956e672ad3be7e4543965a0b289cc73f088fe348d6e371135076c0e6d1c3  games/duskbound/uniques.mjs
08d46f94f147a19ce3137cfdc5e661a04971e9c91d0ee8b6aa010596d92515a7  games/duskbound/encounters.mjs
a597cbe28d65cd9ec83fa944d093bf9a5e36f8a3ca3a034799f9332824677071  tests/duskbound-expansion-integration.test.mjs
b23e9567b2d10a8f05c360f237edeb2eb448bb23f0ab5a228d1e449a9d974061  tests/duskbound-classes.test.mjs
```

Модель заморожена на этих hashes. Browser validation, UI/hazard readability, actual desktop/mobile/reduced effects, simulation matrix и игровой баланс переданы родителю и здесь не объявляются проверенными. Нагрузочные model cap cases не доказывают FPS и не заменяют естественное прохождение8минут. Новых source item values/новых notables не вводил.

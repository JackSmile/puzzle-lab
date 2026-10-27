# Task 1: предметы и входящий урон

Реализовано 27 октября 2026 года. Проверка ограничена Node-моделью; браузер, интерфейс, полный encounter wiring и simulation matrix выполняются родительской задачей.

## Изменения

- `uniques.mjs` экспортирует 17 стабильных `UNIQUE_IDS` и `makeUnique(uniqueId, id, random)`. Каталог 12 новых предметов — `expansion-uniques.mjs`. Сохранены прежние пять PoE unique и три явно обозначенные Duskbound relic. Class loot включает все 20; legacy остаётся на прежних пяти.
- Gloves/boots добавлены к equipment и обычному loot. Belt/ring также доступны в обычном class loot. `lootReplacement()` сохраняет `.slot/.item` и добавляет `.items: [{slot,item}]` со всеми вытесняемыми вещами. Terminus вытесняет оружие, shield, offhand, quiver; обратная экипировка вытесняет двуручное оружие. Последующее распределение Ascendancy не возвращает несовместимый стартовый shield.
- Aegis восстанавливает 2% фактической armour, capped ES, при успешном attack/spell block; recovery lock сохранён. Saffell запрещает итоговый attack block, даёт отдельный spell block и +4% всех максимумов, включая chaos.
- Daresso: personal kill даёт actual endurance, hit сохраняет effective count, затем обнуляет actual count и даёт 5 секунд Onslaught за charge; 100% increased effect превращает 20% в 40%. Attack leech работает на elemental attack, не на spell/DoT.
- Crown: 150% increased/reduced spell conversion в attack, local ES, accuracy, отрицательный fire resistance, раздельное timed life/mana attack leech. Flat spell и spell more не переносятся.
- Yoke: активные принадлежащие игроку/proxy типы ailments, отдельная additive target-taken стадия с shock; minion ailments исключены, собственный debuff усиливает также последующий minion damage. Fire/cold получают shock eligibility с шансом/критом. 30% reduced duration применяется к ignite/chill/freeze/shock/scorch/bleed/poison.
- Eye: 100 fire unblockable/unevadable self-hit при personal ignite, включая Berek spread; не создаёт self-ignite автоматически, не отражается в случайного врага. Условные damage/fire-only leech требуют активного ignite игрока. Fatal hit не воскрешает игрока.
- Inpulsa: personal shocked kill создаёт 5%-life secondary lightning hit, `cannotShock`, `noReflect`. Recent shock buff длится четыре секунды. Unaffected by Shock сохраняет состояние без damage penalty.
- Berek: переносит DPS/effect и оставшийся timer на соседей, учитывает сильнейший уже активный ignite/shock; вызывает on-ignite/on-shock hooks. Не переумножает сохранённый DPS.
- Obliteration: 30–40% physical as extra chaos до target mitigation; 20%-chance 25%-life chaos explosion. Одинаковая explosion chance складывается с Profane Bloom без удвоения размера; minion kill сам по себе не включает Obliteration.
- Terminus: two-handed metadata, local physical/speed/crit только на attack skill; frenzy на critical strike по живому boss, actual cap/expiry; 10 mana на personal kill.
- Asenath: level-1 Temporal Chains on hit, non-aura curse на corpse, blind в радиусе уже существующего cursed corpse и 3%-life physical explosion при смерти соседней цели. TC: 15% less action speed normal/magic, 9% rare/unique, duration 5s; другие эффекты истекают на 25% медленнее, DPS не меняется, сам TC истекает обычно. Generic curse effect масштабирует замедления; cap 75%. Учтён неполный последний tick до окончания TC.
- Ralakesh: ровно один случайный effective maximum (endurance/frenzy/power), actual counters не создаются. `effectiveChargeCount` и `maxChargeCount` экспортированы. Corrupted Blood immunity не снимает bleed.
- Incoming `components` проходят одну avoidance-стадию, отдельную typed mitigation и один расход ES/MoM. `selfHit`/`cannotBlock` исключают block/evasion и случайный melee reflect. DoT проходит через runtime hit-invulnerability, не продлевает её и не регистрирует hit. Hostile projectile передаёт явные spell/area/melee/components/hit поля.
- `context.preventDamage` сохраняет critical/on-hit curse/Wither/Exposure и charge события, но не создаёт damage-derived ailments/leech и не позволяет impale/Master of Metal восстановить предотвращённый урон. Это контракт для последующего Proximity Shield wiring, а не заявление о подключённом щите.

## API для интеграции

```js
makeUnique(uniqueId, id, random); // random: [0,1)
lootReplacement(run, item); // {slot, item, items:[{slot,item}]}
effectiveChargeCount(run, 'endurance');
applyCorruptedBlood(run, {stacks:1, dps:2, duration:3, sourceId:'dominus'});
```

`dps` в `applyCorruptedBlood` задаётся на один stack. State: `player.ailments.corruptedBlood = {stacks,dps,until,sourceId}`, максимум 10; повторное наложение обновляет срок, expiry обрабатывается classTick. Метод возвращает false при Ralakesh immunity. HP списывает classTick; encounter module не должен тикать тот же внешний player state повторно.

`actorOrigin(run, actor)` экспортирован. Secondary explosions передают `context.origin` равным центру взрыва и `sourceId`; projectile live-actor/fallback origin integration остаётся родителю. `classKilled` имеет optional fourth `random` для независимой проверки exact chance boundaries; обычная модель использует seeded RNG.

## Проверка

- Созданы 43 targeted tests в `tests/duskbound-expansion-items.test.mjs`, включая source values, negatives, ownership, expiry, caps, local/global, mixed damage, spread/explosion interaction и zero-damage hit.
- Начальный RED: 18/18 failed, в основном отсутствующий `makeUnique`/новые APIs, а также mixed incoming contract. Лог: `/tmp/duskbound-items-red.txt`. Это не 18 отдельных причин дефекта; общий отсутствующий каталог блокировал большинство hook fixtures.
- Второй RED: 38 selected, 34 passed, 4 failed: Yoke target vulnerability for minion damage, additive poison duration, weaker propagated shock overwrite, partial TC expiry. После исправлений 38/38 passed.
- Третий RED: 41 selected, 39 passed, 2 failed: prevented damage восстанавливался через impale/Master of Metal; secondary chaos increased применялся дважды. После исправлений 41/41 passed.
- Четвёртый RED: 42 selected, 41 passed, 1 failed: runtime DoT блокировался hit-invulnerability. Исправлена точка входа и сохранение projectile context.
- Пятый RED: 43 selected, 42 passed, 1 failed: новые sourceStats оставались английскими. После перевода 43/43 passed; проверена сохранность originalSourceStats.
- Полная команда `node --test tests/*.test.mjs`: **313 selected / 313 passed / 0 skipped / 0 failed** на момент передачи. Лог `/tmp/duskbound-items-final-suite.txt`; сюда входят исходные 231, 43 item tests и параллельно добавленные encounter tests.
- Обновлены только пять устаревших expectations из старых тестов: четыре exact-object проверки теперь включают обязательный `.items`; поиск трёх Duskbound relic явно выбирает sourceKind, поскольку новые PoE amulet/shield делают прежнее предположение «все такие слоты Duskbound» неверным. Старые assertions экипировки и sourceKind сохранены.
- При первом полном прогоне найден и исправлен настоящий regression: ранее attack-only flat modifiers Warden попали в spells. Berek теперь имеет отдельный spell-flat modifier; исходный Avatar of the Wilds test сохранён.

## Явные адаптации и ограничения

Источники: approved design и `docs/poe-expansion-unique-sources.md`, включая дополнение Temporal Chains revision 1681627. Local defensive bases, attack base 24, радиусы explosions 100 / Berek 90, corpse lifetime 8s, bounded corpse count 180 / poison/leech histories 100 — баланс Duskbound. Для flat fire Berek в compact runtime берётся среднее бросенного диапазона; сам диапазон хранится в `addedFireRange`. Local Terminus modifiers усиливают существующий Kinetic Fusillade attack model, исходные APS не заменяют баланс его cadence. Source rows сохранены английскими в `originalSourceStats`; `sourceStats` и пояснения карточек русские, перевод вынесен в `unique-modifier-text.mjs`.

Консервативная локальная политика destruction: успешный explosion любого из подключённых видов удаляет исходный corpse до Berek spread. Разные виды explosions исполняются отдельными hits, без overwrite; каждый death получает reward один раз существующим bounded cleanup. Это явная политика сочетания, а не утверждение о всех тонкостях PoE corpse destruction.

Поддержаны семь enemy ailment types; brittle/sap не заявлены. Legacy режим не получает новые предметы. Существующая Duskbound автоматическая player ignite от внешнего fire hit сохранена; Eye self-hit из неё исключён, поскольку оригинальный Eye не гарантирует self-ignite. Существующая общая модель ES absorb также сохранена, chaos bypass этим расширением не добавлялся.

Unflinching node 1734 отсутствует среди 84 selectable notables (Juggernaut: 5819/44297/17988/53816); roster не расширялся скрыто. Existing Ascendant Juggernaut 61072 продолжает получать endurance по своему timer после hit. Daresso синхронно snapshots доступный actual/effective state до потери. Отдельный gem-trigger ordering не симулируется.

UI/art, encounter scheduling/wiring, фактический Proximity Shield, simulation matrix, desktop/mobile/reduced-effects browser проверка — вне данного worker ownership. Commit/push/PR не выполнялись.

## Исправления независимого ревью R1–R5 — 27.10.2026

Все пять замечаний исправлены в текущей модели; файлы переданы на повторное независимое ревью. Изменены `games/duskbound/classes.mjs`, `games/duskbound/core.mjs`; добавлен `tests/duskbound-items-review-regressions.test.mjs` (34 теста). Исходные таблицы предметов, их сохранённые sourceStats, roster 7/21/84 и expectations существующих тестов этим исправлением не изменялись. Encounter/UI/browser/art/commit не выполнялись.

- **R1.** Добавленная elemental-компонента теперь использует ту же общую increased-стадию, что основная, с отдельными type-specific добавками. Crown + Saffell + Berek дают physical 39 / fire 32.5; Inpulsa + Berek — 36 / 30; Eye + Berek при actual ignite — 45 / 37.5. Generic, reduced spell, conditional expiry и исключение spell-only flat/more проверены отдельно. При совпадении типа added damage с основной компонентой она суммируется, а не заменяет основную.
- **R2.** Ignite/shock хранят конкурирующие applications; действующим выбирается сильнейший, при равенстве — самый долгий. Более слабый долгий эффект возобновляется после сильного короткого независимо от порядка наложения. Общий путь используется direct hits и Berek. Хранятся actor, appliedAt, power и until; доминируемые applications одного владельца удаляются, остаток ограничен 100. Runtime интегрирует ignite по интервалам смены сильнейшего внутри кадра: 100 DPS первые .5s + 20 DPS следующие .5s = 60 damage до mitigation. TC продлевает также ожидающие applications.
- **R3.** `classKillActor` отдельно классифицирует только `isDot + ailment: 'ignite'` от player-owned minion/totem/proxy как personal kill. `damageActor` и исходный `igniteActor` сохраняют исполнителя, `killCause` сохраняет причину. Actual `tick` проверяет Berek, Daresso, Terminus mana-on-kill и Death Rush; poison, direct minion hit и foreign-owned ignite остаются неперсональными. Ownership ailments для Yoke не подменяется kill attribution.
- **R4.** Единая формула live expiry применяется к поддержанным enemy timers, Exposure, poison и конкурирующим ignite/shock. Учитываются собственный конец эффекта внутри frame, конец TC, позднее наложение и снятие; `appliedAt` исключает продление за время до наложения. TC не продлевает себя. Remaining-clock chill использует ту же формулу в `classEnemyChill`, которую core вызывает до вычитания времени: эффект не теряется на границе expiry и не тикает дважды.
- **R5.** Aegis на собственной экипировке Mercenary восстанавливает 2% его actual armour с cap ES; Saffell блокирует spell, запрещает attack block, сохраняет все максимумы сопротивлений, включая chaos. Recovery lock действует на движение/атаку, DoT и unblockable self-hit исключены. Собственный attack pipeline Mercenary применяет local physical/speed/crit Terminus, accuracy, frenzy-on-crit и mana-on-kill; Aegis elemental attack increase. Obliteration даёт own physical-as-extra-chaos и own 20%-chance explosion с сохранённым actor; secondary increases применяются один раз. Yoke учитывает собственные ailments Mercenary, их duration/chance и создаваемую target vulnerability. Eye self-hit, while-Ignited damage и timed fire leech относятся к Mercenary, без переноса на player/minions и без self-ignite recursion. Ordinary minions не получают его items.

Уточнённые локальные адаптации Mercenary: сохранены survivor base attack 18 и cadence .8s; оружие с physical local base переводит его атаку в physical и применяет local modifiers, без переноса исходных weapon APS в survivor cadence. Его base accuracy 100, base mana 50; item Dexterity добавляет 2 accuracy за пункт, Strength — .5 maximum life, Intelligence — .5 maximum mana. Frenzy использует существующие Duskbound cap 3 / expiry 10s / 4% damage-more и attack-speed за charge. Внешний fire hit может поджечь союзника по существующей survivor-политике; Eye self-hit этого не делает. Это не заявление о полном переносе всех правил базовых характеристик/ресурсов PoE.

### Доказательства проверки исправлений

- Первый **RED**: 21 selected / 3 passed / **18 failed**, все падения assertion по R1–R5, не import/runtime errors. Лог `/tmp/duskbound-items-review-red.txt`.
- Второй **RED**: 27 selected / 21 passed / **6 failed** — собственные Obliteration/Terminus/Aegis attack/Yoke/Eye и cross-frame ignite overlap. Лог `/tmp/duskbound-items-review-red2.txt`. После исправления 27/27 passed.
- Третий **RED**: 31 selected / 27 passed / **4 failed** — retroactive TC extension новых effects, own secondary scaling, Terminus accuracy, actual block recovery. Лог `/tmp/duskbound-items-review-red3.txt`. После исправления 31/31 passed (`/tmp/duskbound-items-review-green3.txt`).
- Четвёртый **RED**: 1 selected / **1 failed** — actual chill .04s при TC в frame .05s ошибочно исчезал вместо remaining .0025s. Лог `/tmp/duskbound-items-review-red4.txt`. Исправлен общий expiry calculation на оставшемся clock до subtraction.
- Два дополнительных подтверждающих теста проверяют bounded histories/expiry и actual personal on-kill hooks при сохранении damageActor. Они сразу прошли после исправлений; отдельный RED для них не заявляю.
- Финальный targeted: `node --test tests/duskbound-expansion-items.test.mjs tests/duskbound-items-review-regressions.test.mjs tests/duskbound-classes.test.mjs tests/duskbound-class-fixes.test.mjs tests/duskbound-uniques.test.mjs` — **235 selected / 235 passed / 0 failed / 0 skipped**. Лог `/tmp/duskbound-items-review-targeted.txt`.
- Полный suite запущен один раз после завершения кода: `node --test tests/*.test.mjs` — **357 selected / 357 passed / 0 failed / 0 skipped**, exit 0. Лог `/tmp/duskbound-items-review-full-suite.txt`. В него входят также тесты остальных частей текущего workspace; это не отдельная simulation matrix или браузерная проверка.

После этого полного прогона production/test-файлы не менялись. Ожидается повторное ревью родителем перед его encounter integration.

## Исправления повторного ревью R6–R8 — 27.10.2026

Исправлены подтверждённые ошибки границ кадров и alive→dead. Дополнены `classes.mjs` и regression tests; `core.mjs` в этом раунде не менялся. В regression-файле теперь 58 тестов: прежние 34 сохранены и добавлены 24. Source data, item values и ожидаемые численные результаты прежних тестов не менялись.

- **R6:** выбор текущего сильнейшего ailment больше не удаляет данные для ещё не интегрированного frame. `applyAilment` сохраняет предыдущие applications, в том числе уже истёкшие относительно текущего времени; удаление expired/dominated перенесено после интеграции. Проверены stronger/equal/weaker refresh, несколько application times и actors, partial expiry старого scalar state и настоящий projectile hit перед classTick. Пример 9 DPS на `[0,.05]` даёт .45, хотя в конце frame уже наложен 18 DPS; новый эффект не начисляется задним числом. Существующий предел хранения 100 applications сохранён.
- **R7:** TC refresh хранит непересекающиеся прежние интервалы curse effect до завершения обработки clocks. Учтены непрерывный refresh, gap после expiry, изменение curse effect и собственная неизменённая duration TC. Все поддержанные finite scalar enemy effects записывают application time через единый setter: blind, taunt, wither, bleed, scorch, freeze, hoarfrost, hinder и mercenary taunt. Poison и propagated poison также получают appliedAt. Bleed сохраняет заменённое состояние до расчёта прошлого интервала. Poison/bleed начисляются только за пересечение `[t-dt,t]` с их фактическим lifetime; partial expiry не теряется, новый DoT не получает предыдущий frame. Общая TC expiry формула использует те же интервалы и для scalar, object и application-list effects. Реальный projectile test одновременно подтверждает сохранение старого Exposure clock при refresh Asenath и отсутствие ретроактивного poison damage.
- **R8:** смерть Mercenary от DoT немедленно прерывает recovery/action в этом проходе; recoup/leech не воскрешают его. Увеличение maximum life при копировании предметов также не восстанавливает dead entity. Existing respawn остаётся 5 секунд. Собственный fire ignite Mercenary получает appliedAt и начисляет только живую часть интервала, включая последний partial frame. Проверены HP=0, отсутствие выстрела в кадр смерти, отсутствие раннего respawn, возобновление после 5s и equipment-change negative.

### Уточнение старых тестовых fixtures

Изменены только два clock setup в **одном** старом файле `tests/duskbound-class-fixes.test.mjs`:

1. `repair 6: bleed depends on actual movement; aggravated works frozen or stationary` — добавлено `r.time += .1` перед `classTick(r,.1)`.
2. `re-review Far Shot: poison snapshots travel more once and target shock remains live` — добавлено `r.time += .1` перед соответствующим classTick в каждой итерации.

Все assertions и expected damage (21/7 для bleed, expectedPoison × .1 × 1.5 для Far Shot) сохранены. Раньше fixtures накладывали ailment в t=0 и просили начислить `.1` секунды без продвижения time, то есть за `[-.1,0]`. Это противоречит actual core: `run.time += dt`, затем attack/projectiles, затем `classTick` за `[t-dt,t]`. Изолированный diff этих двух правок: `/tmp/duskbound-items-followup-fixture-clock.diff`. Прежние 34 regression tests не правились.

### Проверка и freeze

- RED1: **53 selected / 35 passed / 18 failed**. `/tmp/duskbound-items-followup-red.txt`. Подтверждены первоначальные R6–R8 и sibling clocks; negatives слабого ignite refresh уже проходили.
- После общих исправлений: 53/53 passed. Более широкий targeted обнаружил ровно два некорректных clock fixtures, описанных выше; исправлены setup, не expected values.
- RED2: **57 selected / 55 passed / 2 failed**: expired scalar ignite, новый Mercenary ignite. `/tmp/duskbound-items-followup-red2.txt`. Propagated poison и partial poison expiry уже прошли после общего исправления; отдельный RED для них не заявляется.
- Последний actual-projectile TC/poison тест добавлен как подтверждающий после исправления. Финальный regression: **58/58 passed**, `/tmp/duskbound-items-followup-regressions.txt`.
- Финальный targeted той же командой пяти файлов: **259 selected / 259 passed / 0 failed / 0 skipped**, `/tmp/duskbound-items-followup-targeted.txt`.
- Полный suite после завершения всех изменений, один запуск в этом раунде: `node --test tests/*.test.mjs` — **381 selected / 381 passed / 0 failed / 0 skipped**, exit 0. `/tmp/duskbound-items-followup-full-suite.txt`.

Production/test-файлы после полного прогона заморожены для scoped rereview. Браузер, encounter wiring, UI, публикации и commits не выполнялись.

### Контракт предстоящей интеграции encounter movement

`classEnemyChill(run, enemy, dt)` возвращает **готовое remaining chill**, не меняет `enemy.chill` сам. `run.time` должен уже означать конец текущего frame. В текущем core единственная операция — `enemy.chill = classEnemyChill(run, enemy, dt)` вместо обычного `chill -= dt`; `classTick` второй раз chill не изменяет. Encounter movement, если он заменит core movement, должен использовать эту же функцию (например, переданный API hook) **ровно один раз на врага за frame**, до classTick. Нельзя оставлять параллельно собственный `enemy.chill -= dt`, иначе часы снова расходятся или тикают дважды. TC interval history доступна до classTick и очищается после обработки остальных effects; этот порядок также следует сохранить.

## Исправление R9 — собственный ignite Mercenary, 27.10.2026

Исправлена потеря предыдущего DoT-интервала при повторном внешнем fire hit наёмника. Общие `strongestApplication` и `integrateIgniteApplications` теперь используются enemy ignite и own Mercenary ignite: выбор текущей силы отделён от сохранённой истории; пересечения application/expiry границ интегрируются до очистки. Собственный state наёмника сохраняет bounded applications (100), published dps/until отражают сильнейший текущий эффект; слабый более долгий возобновляется после сильного короткого. Conditional Eye damage/fire leech учитывают живые applications. Survivor-политика внешнего fire hit (ignite 8% от mitigated hit, 3s) сохранена, Self-hit по-прежнему не создаёт ignite.

Добавлено шесть R9 regressions, прежние 58 сохранены без правок:

- равный/более сильный/слабый refresh сохраняют прошлый `.8 × .05 = .04` damage, не начисляя новый DPS задним числом;
- слабый долгий эффект возобновляется после сильного, включая смену внутри кадра и окончательное expiry;
- обновление не удаляет смертельный старый интервал: HP0, без recoup/leech/атаки, до штатного пятисекундного respawn;
- несколько fire hits в одном pending frame учитывают отдельные интервалы `.4 × .02 + .8 × .03 = .032`.

**RED:** 64 selected / 58 passed / 6 failed, `/tmp/duskbound-items-r9-red.txt`. **GREEN:** 64/64 passed, `/tmp/duskbound-items-r9-green.txt`. Финальные covering tests пяти прежних файлов: **265 selected / 265 passed / 0 failed / 0 skipped**, `/tmp/duskbound-items-r9-targeted.txt`. `node --check games/duskbound/classes.mjs` и `node --check tests/duskbound-items-review-regressions.test.mjs` завершились с exit 0. Полный suite в этом раунде не повторялся: parent выполнит его после интеграции; прежние 381/381 относятся к предыдущему freeze.

Изменены только `classes.mjs`, regression test и это приложение к отчёту. `core.mjs`, encounters, UI и source data не менялись. Production/tests заморожены после проверок для короткого re-review.

SHA-256 `classes.mjs`: `fff6d6150d9b4f149511b3dcbfec1356f26b50a701f9a1cff8c4e4217bf14b78`; regression test: `0dbc31157e36469a4bba9871233cfb463f2f741d0fcad640dba93998dc2b0da7`.

# Task 1 — независимое ревью предметов и урона

Дата: 27.10.2026. **Вердикт по спецификации: нужны исправления. Вердикт по качеству: основа и разделение событий пригодны, но пять P2 ниже мешают считать перенос завершённым. P1 не найдено.**

Проверил brief, согласованный design, `docs/poe-expansion-unique-sources.md` вместе с дополнением Temporal Chains, отчёт исполнителя, переданный diff, модель и 43 новых теста. Числа/условия проверял по сохранённому источнику, без нового веб-исследования. Исполнил восемь узких проверок на неизменяемой копии `/tmp/duskbound-expansion-task1-frozen`; скрипт `/tmp/duskbound-task1-review-probes.mjs`. Ни браузер, ни полный suite повторно не запускал. 43/43 и 313/313 — результаты отчёта исполнителя, а не моего повторного запуска. Production-файлы не менял.

Номера строк относятся к версии из переданного diff/frozen copy; на момент ревью `classes.mjs` совпадал с frozen copy.

## Подтверждённые замечания

### R1 — [P2] Общие increased и Arcane Might теряются на добавленной стихии

**Место:** `games/duskbound/classes.mjs:240` (основная ветка применяет эти бонусы на строках 190–194).

Основная physical-компонента Kinetic Fusillade получает Crown, recent-Shock Inpulsa и while-Ignited Eye, но отдельная формула added fire/cold/lightning их пропускает. Это воспроизводится с реально доступными предметами, без искусственного gear-модификатора:

- Crown + Saffell с 20% increased Spell Damage + Berek с 25 flat fire: фактически `{physical:39, fire:25}`; по исходному 150% Arcane Might добавленный огонь тоже получает 30% increased, то есть `32.5`.
- Inpulsa с 20% recent increased + Berek: `{physical:36, fire:25}`, ожидаемый fire `30`.
- Eye с 50% while-Ignited increased + Berek при активном player ignite: `{physical:45, fire:25}`, ожидаемый fire `37.5`.

Основание: разделы 3, 5, 7 источника; ограничения этих modifiers не исключают добавленный урон атаки. Это не адаптация weapon base/radius. Нужна согласованная increased-стадия по каждой компоненте; не умножать generic increased повторно. В новых тестах Crown проверен только на физической атаке, Eye/Inpulsa — на базовом spell damage.

### R2 — [P2] Berek сокращает уже действующий ignite/shock равной силы

**Место:** `games/duskbound/classes.mjs:494`, аналогично строка 497.

Условия `>=` заменяют не только силу, но и абсолютный timer. В probe у соседа ignite DPS 50 / shock 20% действуют до `t=8`; убитый источник несёт те же величины до `t=5`. После `classKilled` оба timer соседа становятся `5`. Новый equivalent ailment не должен удалять оставшиеся три секунды уже наложенного эффекта той же силы. Более сильный короткий эффект также требует сохранения ещё живого слабого, если после его окончания тот должен стать действующим; текущая единственная запись вообще не хранит такую комбинацию.

Основание: раздел 8 — наложение equivalent ailments, а не удаление существующих. Минимальный обязательный regression — равная сила при более коротком новом сроке; для полного совмещения проверить слабый долгий/сильный короткий в обоих порядках. Тест на «weaker cannot overwrite stronger» этого не обнаруживает.

### R3 — [P2] Не учтено особое приписывание игроку убийства от ignite миньона/proxy

**Место:** `games/duskbound/classes.mjs:491`; причина также `games/duskbound/core.mjs:85` и передача `igniteActor` из `classes.mjs:565`.

Раздел 8 источника отдельно отмечает player attribution ignite kills от proxies/minions. Сейчас runtime переносит actor состояния в killActor без отдельного типа причины смерти, а Berek требует строго `actor.kind === 'player'`. В реальном `tick(.05)` цель с 1 HP и ignite 100 DPS от owned minion умирает, `kills=1`, `killActor.kind='minion'`, но сосед не получает ignite вообще. Это не случай прямого minion hit, для которого personal hooks должны оставаться выключены.

Нужно различать владельца наложенного ailment и attribution события убийства и проверить исключение на actual death cleanup. Сохранять старый poison/minion ownership invariant: тест `player-owned minion DoT preserves owner...` использует poison, а не ignite. Не превращать все minion hits/DoT в личные убийства. Аналогичные personal on-kill hooks проверить после исправления общей классификации.

### R4 — [P2] Temporal Chains пропускает действующий Exposure

**Место:** `games/duskbound/classes.mjs:554–556`.

В списке сдвигаемых timer нет `enemy.exposure.until`. Exposure уже существует в модели, создаётся Mastermind of Discord и участвует в resistance стадии. С активным TC default effect и одинаковым исходным `until=4` за одну секунду ignite переносится до `4.25`, а Exposure остаётся `4`. В результате два конечных debuff ошибочно используют разные expiry clocks.

Основание: дополнение источника «Other effects: live clocks», формула 25% slower expiry и явное указание на debuffs; если перенос ограничен ailments, это должно быть обозначено. Отчёт заявляет «другие эффекты истекают на 25% медленнее», ограничения для Exposure нет. Нужен единый обход поддержанных duration effects с исключением самого TC, а также regression на раннее наложение/снятие TC и завершение Exposure внутри frame.

### R5 — [P2] Новые shields копируются на Mercenary, но их build hooks не действуют

**Место:** `games/duskbound/classes.mjs:643–644`; связанные `classAllyStats` на 633 и копирование экипировки на 580.

Сохраняемый Luminary Legendary Arms (`25944`) разрешает Mercenary Unique Weapons/Shields/Quivers; runtime действительно копирует новые щиты. Однако `classAllyDamage` знает только прежний attack block и сразу возвращается при блоке: Aegis recovery и Saffell spell block не обрабатываются.

Две проверки с действительным копированием через `classTick`:

- Mercenary получил Aegis, его ES обнулён, attack block успешно проходит при `random=.1`: HP остаётся 150, ES остаётся 0 вместо `320 armour × 2% = 6.4`.
- Mercenary получил Saffell с 20% spell block: при spell hit и `random=.1` HP становится 74 вместо сохранения 150.

Это не передача личных player modifiers обычным minions: предмет находится в собственной экипировке Mercenary. Основание — source строки щитов и существующий контракт Legendary Arms в `data/poe-signatures-source.json`. Нужно либо реализовать поддержанные modifiers собственных предметов в ally pipeline, либо согласовать и явно показать ограничение; сейчас новых silent unsupported effects отчёт не перечисляет. Дополнительно проверить собственные Obliteration/Terminus/amulet modifiers Mercenary: текущие item tests проверяют только отсутствие утечки player gear на minions.

## Что проверено без обнаруженного нарушения

- Каталог содержит 17 PoE ID, плюс сохранены три Duskbound relic; legacy roll остаётся на прежних пяти. Роллы и строки 12 новых предметов соответствуют сохранённым диапазонам; defensive bases, радиусы и оружейная база обозначены адаптацией.
- Aegis: player block использует actual armour, cap ES, сохраняет recovery lock. Saffell: player spell block отдельный, полный запрет attack block, chaos maximum включён.
- Daresso: actual/effective snapshot перед loss, 5s/count, ×2 effect Onslaught, attack-only leech и no-DoT trigger. Crown: физическая часть преобразуется через 150%, negative fire resistance сохранён, life/mana leech timed.
- Yoke: отдельная additive target-taken стадия, distinct active owned types, minion ailments исключены, созданная уязвимость действует и на minion damage. Eye: исходные 100 fire, нельзя блокировать/уклониться, нет автоматического self-ignite/reflect recursion, lethal hit не лечит мёртвого.
- Inpulsa: personal shocked kill, 5% lightning secondary, cannotShock/noReflect. Obliteration: 20% chance и 25% life, chance складывается с Bloom, виды explosions не затирают друг друга. Berek destruction-before-spread явно обозначен локальной политикой.
- Terminus: 2h incompatibility, local attack stats, frenzy on critical без kill, mana-on-kill. Asenath: existing cursed corpse условие, 3% physical hit, TC level-1 slow 15%/9%, partial TC expiry. Ralakesh: один из трёх effective maximum, actual ресурсы не создаёт, CB immunity отдельно от bleed.
- Входящий mixed damage: единая avoidance-стадия, typed mitigation, единый расход ES/MoM; self hit не запускает случайный melee reflect. `.items` отражает все вытесненные слоты, обратная замена 2h предусмотрена.
- Изменений roster 7/21/84 в переданном patch нет; статические source data не менялись. Это не повторная simulation matrix всех Ascendancies.

## Старые expectations и пределы доказательств

Описанные пять обновлений ожиданий легитимны по смыслу: четыре exact-object результата `lootReplacement` должны включать новый обязательный `.items`; фильтр `sourceKind==='duskbound'` в поиске трёх relic устраняет ошибочное предположение, что каждый новый unique в shield/amulet слотах — relic. В текущих файлах остаются строгие проверки старых slot/item, фактического equip/decline и наличия всех трёх relic. Ослабления assertions ради green в этих изменениях не увидел. Базовая копия не содержит старые test files, поэтому утверждение «изменены ровно эти пять и больше ничего» независимо по ней не доказано.

43 новых теста дают полезные независимые численные примеры, отрицательные случаи и event boundaries; основные найденные проблемы — именно сочетания, не отсутствие положительного hook. Помимо regression для R1–R5, существенно недостаёт actual-runtime проверок ailment overlap/attribution и новых items на Luminary. Проверку UI, encounters, Proximity Shield wiring, 21-Ascendancy simulation matrix и браузер оставляю родительской задаче, как требует brief. Report 313/313 не закрывает перечисленные непроверенные пути.

## Повторное ревью исправлений R1–R5 — 27.10.2026

**Новый вердикт: исходные пять воспроизведений исправлены, но ревью ещё не чистое — подтверждены три P2 ниже.** Проверил `/tmp/duskbound-expansion-task1-fixes-review.diff`, текущие `core.mjs`/`classes.mjs`, все 34 новые regression tests и дополнение отчёта. Независимо запустил только `node --test tests/duskbound-items-review-regressions.test.mjs`: **34 selected / 34 passed / 0 failed / 0 skipped**, лог `/tmp/duskbound-task1-rereview-tests.txt`. Четыре дополнительных узких probes ниже выполнены отдельно. 235 targeted / 357 full suite остаются evidence исполнителя; полный suite и браузер не повторял, production/test-файлы не менял.

Что закрыто: общие increases теперь распространяются на added components (R1); равная сила не сокращает срок и слабые applications возобновляются (исходный R2); actual owned minion/totem/proxy ignite kill отделён от poison, hit и foreign ownership (R3); Exposure участвует в expiry calculation (исходный R4); реальные скопированные Aegis/Saffell обрабатывают собственный block/recovery и не передают предметные hooks обычным minions (исходный R5). Расширение own Mercenary offensive hooks документировано и имеет численные regression tests. Остаточные проблемы обнаружены на порядке событий внутри кадра и переходе alive→dead.

### R6 — [P2] Обновление ignite удаляет его ещё не начисленный урон за текущий кадр

**Место:** `games/duskbound/classes.mjs:73–78`, последующая интеграция на строках 623–630.

`applyAilment` удаляет доминируемый прежний application сразу при попадании, а core выполняет attacks/projectiles **до** `classTick`. Поэтому после обновления новым сильным или равным ignite интегратор больше не видит старый эффект, действовавший между предыдущим и текущим simulation time. Probe: fire hit 10 в `t=0` даёт ignite 9 DPS; fire hit 20 в `t=.05` заменяет его на 18 DPS; затем `classTick(.05)` передаёт `damageEnemy` **0**, хотя за `[0,.05]` полагалось **9 × .05 = .45**. Новый application с `appliedAt=.05` правильно ещё не наносит урон за прошлый интервал; ошибка в преждевременном удалении старого.

Тест cross-frame из исправлений проверяет естественный expiry без нового hit внутри кадра и потому проходит. Нужно сохранить историю, необходимую для ещё не интегрированного интервала, отдельно от выбора текущего strongest, либо начислять предыдущий интервал до мутаций. Не исправлять начислением нового DPS за весь предыдущий frame.

### R7 — [P2] Время наложения TC и других effects учтено непоследовательно

**Место:** `games/duskbound/classes.mjs:407`, `:464`, формула `:567`.

Два подтверждённых случая одного неполного lifetime-контракта:

1. Asenath при каждом refresh TC заменяет `appliedAt` текущим временем. Если TC уже действовал, формула после refresh теряет весь его вклад за предыдущую часть frame. Probe: TC наложен в `t=0`, Exposure действует до `4`; в `t=1` следующий hit обновляет TC, затем `classTick(1)` оставляет Exposure до **4** вместо **4.25**. Следует сохранять непрерывный активный интервал при refresh либо заранее учитывать его предыдущую часть; первое наложение по-прежнему не должно действовать задним числом.
2. Новый poison вообще не получает `appliedAt`. При уже активном TC physical hit в `t=1` создаёт poison `until=3`; последующий `classTick(1)` делает **3.25**, будто poison существовал и за `[0,1]`. Правильно оставить **3** на этом шаге. В коде аналогично отсутствуют отдельные timestamps создания у ряда scalar timers; проверить все effects общего обхода, а не только ignite/Exposure.

Источник остаётся тем же: live clocks из TC appendix. Новые tests покрывают первое наложение TC и новые ignite/Exposure, но не повторное TC и появление poison в кадре. Речь не о разрешённой адаптации длительности.

### R8 — [P2] Новый DoT tick Mercenary позволяет recoup воскресить его после смертельного урона

**Место:** `games/duskbound/classes.mjs:660–662`.

После списания его ignite DoT `leech` проверяет `ally.hp>0`, но следующий recoup-loop прибавляет жизнь без такой проверки. Поэтому проверка смерти на строке 664 видит уже положительное HP и пропускает обычную задержку respawn. Probe на реально инициализированном Mercenary: HP 1, active ignite 10000 DPS, recoup `{remaining:10,rate:10}`, `dt=.05` → итог **HP .5**, ожидается **0** до предусмотренного respawn. Recoup естественно появляется у Loyal Bodyguard после внешнего hit, который теперь также может зажечь наёмника, поэтому сочетание достижимо в игре.

Нужно после смертельного DoT сохранить dead state до обычного respawn; recoup/leech/прочая recovery не должны подменять переход смерти. Regression должен проверить не только HP, но и отсутствие атаки в тот же кадр и соблюдение existing 5s respawn.

## Второе повторное ревью — R6–R8, 27.10.2026

Проверенная версия `classes.mjs`: SHA-256 `9daf877c8b6ec3e869e2cca5b4e2bcd0626126193e84777f175f70f1e3be0d26`. Проверил пакет `/tmp/duskbound-expansion-task1-rereview2.diff`, текущий код и 24 добавленных проверки поверх прежних 34. Независимый запуск regression-файла: **58 selected / 58 passed / 0 failed / 0 skipped**, лог `/tmp/duskbound-task1-rereview2-tests.txt`. Полный suite и браузер не запускал; production/test-файлы не менял.

**R6, R7, R8 закрыты по исходным воспроизведениям.** Старые enemy ignite applications сохраняются до интеграции; TC хранит предыдущие интервалы с их силой и разрывами; новые scalar/object effects получают время возникновения; смертельный Mercenary DoT прекращает recovery/action, respawn сохраняет задержку. Уточнения двух старых fixtures законны: `r.time += .1` приводит их к фактическому end-of-frame контракту core, численные expected values и assertions не ослаблены. Контракт `classEnemyChill` проверен по коду: чистое вычисление remaining, присваивать один раз до `classTick`.

**Общий вердикт пока не clean: один оставшийся P2 на соседнем пути обновления Mercenary ignite.** Это обнаружено отдельным probe, а не падением 58 регрессий. Заявленные 259 targeted / 381 full-suite здесь не выдаю за свой запуск.

### R9 — [P2] Повторный внешний fire hit удаляет ещё не начисленный ignite Mercenary

**Место:** `games/duskbound/classes.mjs:760` и `:690`.

Для enemy ignite R6 теперь хранит старую application до расчёта frame. Но собственный ignite Mercenary всё ещё заменяется одним присваиванием при следующем внешнем fire hit. Новая запись имеет `appliedAt=run.time`, поэтому последующий `classTick` правильно не начисляет её за прошлое время, однако старый ignite уже потерян вместе с причитавшимся за этот interval уроном.

Независимый probe без предметов/recoup/регенерации: инициализированный Mercenary HP150 получает fire hit10 в `t=0` (ignite .8 DPS), затем ещё fire hit10 в `t=.05`, затем `classTick(.05)`. Фактическое HP **130**, ожидаемое **129.96**: старые `.8 × .05 = .04` пропали. Если перед вторым hit оставить HP10.02, это меняет исход: после hit остаётся .02, тогда как прошедший ignite interval должен завершить смерть. Новый regression на первое наложение ignite и partial expiry не содержит его обновления вторым ударом.

Нужно сохранить прежний собственный ignite до интеграции интервала (как минимум историю замен с временем окончания), затем применить текущую локальную политику нового fire-hit ignite. Проверить refresh равной/иной силы, отсутствие заднего начисления нового DPS, lethal переход и отсутствие recoup/атаки после него. Это продолжение уже исправленного временного контракта, без изменения исходных item values или локальной политики автоматического ignite.

Точный воспроизводящий probe R9 (запуск из корня `puzzle-lab`):

```js
import {createRun} from './games/duskbound/core.mjs';
import * as c from './games/duskbound/classes.mjs';
const r=createRun({classId:'witch',seed:42});
r.mercenary={id:88,kind:'mercenary',x:0,y:0,hp:150,maxHp:150,shotTimer:1,recoup:[],equipment:{}};
c.classTick(r,0);
const a=r.mercenary;
c.classAllyDamage(r,a,10,{type:'fire',random:()=>1});
a.hp=10.02;
r.time=.05;
c.classAllyDamage(r,a,10,{type:'fire',random:()=>1});
c.classTick(r,.05);
console.log({actualHP:a.hp,expectedHP:0});
// Выполнено: { actualHP: 0.019999999999999574, expectedHP: 0 }
```

Итог scoped review этого freeze: **R1–R8 закрыты, R9 открыт; других подтверждённых P1/P2 в проверенных исправлениях не выявлено.** Следующий шаг — общий interval lifecycle собственных ailments Mercenary и адресная повторная проверка R9.

## Финальное scoped review R9 — Task 1 принят к интеграции

Проверенная версия `classes.mjs`: SHA-256 `fff6d6150d9b4f149511b3dcbfec1356f26b50a701f9a1cff8c4e4217bf14b78`. Прочитал общий `strongestApplication` / `integrateIgniteApplications`, вызовы для enemy и Mercenary, хранение/удаление applications, актуальные условия Eye и шесть новых регрессий. Проверка ограничена R9 и влиянием общего helper на ранее закрытые пути.

**Итоговый вердикт Task 1: R1–R9 закрыты; открытых подтверждённых P1/P2 в проверенной области нет. Модель предметов принята к следующему этапу интеграции encounters.** Это итог текущей версии; предыдущие отрицательные вердикты выше относятся к сохранённым промежуточным версиям.

- Самостоятельно запустил regression-файл: **64 selected / 64 passed / 0 failed / 0 skipped**, лог `/tmp/duskbound-task1-r9-rereview-tests.txt`. Прежние 58 тестов сохранены.
- Повторил точный lethal probe R9 из предыдущего раздела: теперь `{actualHP:0, expectedHP:0}`.
- Старый ignite сохраняет pending interval, новый не наносит урон задним числом; более слабый долгий effect возобновляется после сильного; expiry внутри кадра разделяет интервал. Shared helper сохраняет actor для enemy callbacks и останавливает дальнейшее начисление после смерти. Mercenary не получает recovery/атаку после lethal DoT до штатного respawn.
- Full suite, simulation matrix, encounter wiring и браузер в этом scoped review не запускались. 265/265 covering — evidence исполнителя. Последний полный 381/381 относится к предыдущему freeze; свежий полный integration suite остаётся задачей родителя после подключения encounters. Production/test-файлы ревьюер не изменял.

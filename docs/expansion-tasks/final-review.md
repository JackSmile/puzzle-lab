# Итоговое независимое ревью PoE expansion

27.10.2026. **Вердикт по спецификации: нужны исправления интеграции. Вердикт по качеству: With fixes; два подтверждённых Important/P2, Critical не найдено.** Production-код, tests и Git state не менял; единственная запись — этот отчёт.

## Область и сильные стороны

Прочитал согласованный `docs/superpowers/specs/2026-10-27-duskbound-poe-expansion-design.md`, пакет `/tmp/duskbound-expansion-final-review.diff`, Task 3 report, предыдущие предметные/encounter/UI reviews с дополнениями, текущие core/encounters/classes и релевантные UI/render/item paths. Сохранённые source JSON/документы использовал как основание требований, без нового веб-исследования.

- Собственный вызов публичных API подтвердил 7 классов, 21 Ascendancy, 84 selectable notables, 17 PoE unique IDs, 8 основных монстров и расписание Brutus120/Merveil240/Dominus360/Kitava450. Три исходные Duskbound-реликвии сохранены в отдельном пути генерации.
- По коду: queue исключает одновременные boss encounters, threshold guards сохраняют формы и сердце, selectors исключают invulnerable body, reward flags однократны, победа требует всех четырёх ID и времени480. Legacy `createRun()` остаётся отдельным путём. Typed projectile contexts, mixed-hit pipeline и live actor origins подключены к core.
- UI показывает имя/HP/форму босса и переключает панель на сердце. Equipment projection работает на независимых clones и перечисляет вытесняемые предметы. Reduced-effects не выключает слой hazard geometry. Ранее исправленные capsule warnings и сохранение кнопок picker присутствуют в текущем коде.
- Проверка полного suite **431/431** — результат, переданный родителем, а не мой повторный запуск. Сам выполнил только узкие публичные API probes ниже. Полный suite, браузер и bot matrix намеренно не повторял.

## Important / P2

### F1. Удалённые обычные PoE-враги занимают лимит и прекращают пополнение волн

**Место:** `games/duskbound/core.mjs:206`; недостающая интеграция в `games/duskbound/encounters.mjs:266–288`, ограничение новых волн — `:167`.

Новый early-continue исключает всех `poeKind` из прежнего `moveEnemies`. Вместе с двойным движением отключилось восстановление обычных врагов вокруг игрока при расстоянии больше1800 (`core.mjs:215`). В `tickEncounters` аналога нет: отставшие враги бесконечно идут к игроку и продолжают занимать общий cap180. Когда cap занят оставленными далеко позади врагами, новые волны, включая уже открывшиеся archetypes, не появляются. Это потеря прежнего жизненного цикла волн при замене AI, а не вывод о желаемом балансе скорости/урона.

**Собственное воспроизведение через реальный `core.tick`:**

1. `createRun({classId:'scion',seed:77})`, отключён посторонний spawn (`_spawnTimer=Infinity`, `_nextElite=Infinity`), `upgrades={}`, `terrain=[]`; `spawnPoeEnemy(run,'drowned',{x:2100,y:0})`; `tick(run,.05)`. Фактическая координата **2097.25**, враг не возвращён к игроку. Контроль на legacy `createRun({seed:2})` с обычным skull на x2100 после того же tick даёт расстояние **738.2948877766728**.
2. Изолированный cap fixture: time230, trialsCompleted4, scheduled Brutus/Merveil, `_spawnTimer=0`, `_nextElite=Infinity`,180 Drowned на x5000…5179. После200 ticks по.05: **time240, phase playing, count180, minDistance4450, единственный вид drowned**. Восемь archetypes уже доступны по unlock time, но ни один новый не появился. Это контролируемое воспроизведение cap starvation, не заявление о частоте достижения такого состояния человеком.

**Исправление:** вернуть lifecycle для дальних обычных PoE-врагов — перенос в spawn ring либо согласованное освобождение cap с пополнением. При переносе очистить незавершённые actions/owned hazards и явно обработать parent/child связь; не переносить закреплённые boss/body/heart. Нужен регрессионный сценарий публичного tick: offscreen normals → восстановление близких волн, включая заполненный cap.

### F2. Bestowed Knighthood продолжает записывать taunt, но новый AI его игнорирует

**Место:** `games/duskbound/encounters.mjs:175` и `:286–287`; применение эффекта — `games/duskbound/classes.mjs:751`.

Прежний chase (`core.mjs:217`) выбирает живого наёмника при активном `mercenaryTauntUntil`. Все новые обычные противники исключены из этого пути, а новый AI всегда использует `run.player` и для дистанции/преследования, и для фиксации цели замаха. Поэтому реальная способность Luminary56292 перестала перенаправлять противников, хотя timer создаётся и старый unit test на его наличие проходит.

**Основание:** сохранённый `games/duskbound/data/poe-classes-source.json:2498–2508`: `Your Mercenary Taunts on Hit`, enemy can only target the taunter, duration3s. Согласованный design сохраняет существующие21Ascendancy; прежняя рабочая ветка задаёт независимый регрессионный контроль.

**Собственное воспроизведение через реальный `core.tick`:** публичными `chooseAscendancy`/`chooseAscendancyNode` выбран Luminary/56292; игрок(0,0), живой mercenary(180,0), enemy(210,0), `mercenaryTauntUntil=3`. Waves/upgrades выключены только для изоляции, mercenary.shotTimer=Infinity.

- Drowned после `tick(.05)` идёт к игроку: **x207.25**, action null. Перед AI рядом с mercenary30 единиц, то есть он уже находится в melee range65 и должен обрабатывать именно эту цель. Mercenary позже в том же tick штатно смещается к игроку доx151; это не объясняет решение enemy AI, которое исполняется раньше.
- Ancient Archer с shotTimer0 после того же tick фиксирует **action.targetX=0, targetY=0**, хотя taunt активен и наёмник жив. Это отдельно подтверждает неверную цель windup, без опоры только на знак движения.

**Исправление:** общий resolver цели с существующим taunt contract для range/chase и начала новой атаки; сохранить уже зафиксированное направление/landing point текущих действий. Для направленных projectile атак потребуется корректная collision/damage обработка выбранного союзника: текущая hostile projectile ветка core проверяет только player. Regression должен проверять реальное решение AI/адресата атаки при active/expired taunt и мёртвом mercenary, а не только наличие timer.

## Итог и ограничения

Оба дефекта возникли на границе замены старого AI новым и не закрываются успешным выполнением автономных item/encounter tests. Остальных подтверждённых Critical/Important в просмотренных связях не обнаружил; это не заявление о полной корректности всех сочетаний предметов и Ascendancy.

Перед приёмкой нужно исправить F1/F2 и проверить их через production tick. Браузерные desktop/mobile/reduced-effects, реальные assets и основной run остаются отдельной проверкой родителя. Переданный результат новой21Ascendancy-матрицы **3wins/18deaths** при восстановленной прежней политике бота сам по себе не доказывает дефект баланса; дополнительных утверждений о причине ранних смертей здесь нет.

## Повторное ревью F1/F2 — 27.10.2026

**F1 и исходный F2 закрыты. Актуальный итоговый вердикт: With fixes — остаётся новый подтверждённый P2/F3 на добавленном пути урона наёмнику.** Этот раздел заменяет исходный список открытых F1/F2, сохраняя историю проверки выше.

Прочитал `final-fixes-report.md`, `/tmp/duskbound-expansion-final-rereview.diff`, новый regression-файл и текущие изменённые paths. Собственная проверка SHA-256 подтвердила core `f34fa8a329f01a8b1cf3ffd17be63243ff578622da4ff089dc262fe41d2fcb66`, encounters `02b0f6c30e7aaf1813fabaee30fb16d973338d06dd9bc6a4e1f59795090fe5a5`. Повторно выполнил только `node --test --test-reporter=dot tests/duskbound-expansion-final-regressions.test.mjs`: **15/15, exit0**. Full suite, браузер и21Ascendancy matrix не дублировал.

- F1: проверил перенос строго после1800 в seeded ring650–850, исключение boss/heart, отмену старых owned hazards/action/jump/shield и сохранение parent links. Перенос происходит до freeze/action gates; шаг переноса не исполняет старую атаку. Cap test теперь проверяет локальные180врагов, reap и реальное последующее появление другого открытого типа. Исходная причина starvation устранена.
- F2: единый `attackTarget` используется при range/chase и начале normal/boss windup. Уже начатая атака сохраняет координаты/ID цели. Core сравнивает swept intersections с выбранным живым mercenary, player и terrain; expiry не меняет trajectory. Tests используют настоящее выделение node56292 и настоящий taunt hit, затем наблюдают AI/arrow, а не только timer. Исходная потеря перенаправления устранена.
- Малое UI-исправление `bestiary.mjs:74–81`: кнопка явно меняет только отдельный gallery fixture, снимает arrival telegraph перед `tick(.001)` и инвалидирует readout. Из кода не следует влияние на основной run/обычную паузу. Переданный родителем browser result свежей paused Merveil не выдаю за собственный браузерный запуск; новых замечаний к правке нет.
- Bot-policy изменяет только diagnostic controller, сохраняет базовый pursuit/separation и добавляет реакцию на уже существующую imminent geometry. Это не изменение difficulty модели и не доказательство человеческого win rate.

### F3 — [P2] Новый маршрут в наёмника превращает смешанный Tentacle hit в чисто физический

**Место:** `games/duskbound/core.mjs:378`; несовместимый получатель — `games/duskbound/classes.mjs:789–801`.

Добавленный collision path передаёт выбранному mercenary настоящий projectile context с `components`, но `classAllyDamage` не принимает это поле и применяет единственный `context.type` ко всей сумме. Для Tentacle Miscreation это physical6+fire6, ошибочно обрабатываемые как physical12. Требование смешанного physical/fire signature есть в согласованном design; на пути к player компоненты уже учитываются. Наличие прежнего ограничения ally helper, отмеченного в fixes report, не делает новый вызов совместимым с контрактом mixed projectile.

**Собственное воспроизведение:** fresh Scion→Luminary56292; отключены waves/skills только для изоляции. Настоящий `spawnPoeEnemy('tentacleMiscreation',{x:210,y:0})`, tauntUntil3 на живого mercenary, shotTimer0;17 шагов `core.tick(.05)` дают настоящий выпущенный spineVolley. Центральный projectile сохранён, соседние снаряды убраны для проверки одного hit; новых синтетических damage contexts не создавал. Его поля: `damage=12`, `components={physical:6,fire:6}`, `type='physical'`, `hostileTargetId=mercenary.id`. Перед следующим tick наёмник поставлен в траекторию, его проверенные характеристики armour100/fireResistance0. Полученный урон **4.5**, то есть ровно `12 × (1−100/(100+5×12))`. Независимое ожидание для исходных двух компонентов: `6 × (1−100/(100+5×6)) + 6 = 7.384615384615384`. Fire-часть также не создаёт предусмотренный этим же ally pipeline ignite.

**Исправление:** поддержать components в общем ally damage pipeline: одна avoidance/block sequence, mitigation каждой компоненты своим armour/resistance, затем единый расход ES/HP и hit callbacks. Не разбивать смешанный hit на два независимых вызова с повторным block/recoup. Добавить public-tick регрессию настоящего mixed projectile и контроль mixed hazard, поскольку тот же helper обслуживает Touch of God. Новый15-case файл проверяет physical Archer и потому закономерно остаётся зелёным.

Других подтверждённых Critical/Important в повторно просмотренных правках не обнаружил. Production-код оставлен неизменным.

## Заключительное ревью F3 — 27.10.2026

**F3 закрыт. Актуальный вердикт по рассмотренному расширению и исправлениям: APPROVED; открытых Critical/Important из этого ревью нет.** Исходные F1/F2 и последующий F3 выше сохранены как история. Этот вердикт относится к проверенному коду/контрактам; итоговые full suite, browser и smoke matrix остаются самостоятельными свидетельствами родителя.

Проверил обновлённый `classAllyDamage`, дополнительные F3 tests и отчёт исправлений. SHA-256 classes совпал с frozen handoff: `456c6e98ae922af4746c37c523b16a8684fe8beab2e6c6ff1f7996ce8ac28601`. Общее снижение корректно масштабирует исходные компоненты до их отдельной mitigation. Block выполняется один раз до разделения; ES/HP/recoup — один раз после суммирования. Ignite использует только mitigated fire portion; прежние selfHit/DoT exclusions сохранены. Разделения одного hit на независимые block rolls нет.

Собственный адресный запуск нового regression-файла: **24/24** (`node --test --test-reporter=dot tests/duskbound-expansion-final-regressions.test.mjs`). Реальная направленная Tentacle arrow теперь проверяется на **96/13 урона и0.48DPS ignite**; отдельные cases имеют независимые ожидания для resistance, ES, HP, recoup, single block/Aegis и pure typed controls.

Дополнительно исполнил свой public `core.tick` probe настоящего **Dominus Touch of God** по наёмнику: physical28+lightning28, armour100/lightningResistance50%, цель удержана на месте fixture freeze. Наблюдаемый урон **30.333333333333343**, независимое ожидание `28×(1−100/(100+5×28))+14 = 91/3`. Probe прошёл. Первая версия моей fixture ошибочно сняла исходное HP до штатного обновления mercenary maxHP150→195; после отдельного setup tick проверял разность HP уже от195. Это исправление precondition проверки, не изменение модели или expected damage.

Новых подтверждённых Critical/Important в изменённом typed ally pipeline не обнаружил. Production/tests не редактировал; полный suite, браузер и bots не повторял.

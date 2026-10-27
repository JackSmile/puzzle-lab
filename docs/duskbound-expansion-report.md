# Duskbound — расширение PoE: результат и проверка

27.10.2026. Локальная ветка `feat/duskbound-survivor`. Изменения не закоммичены и не опубликованы.

## Реализовано

- 12 новых уникальных предметов, итого17 PoE +3 прежние реликвии Duskbound. Работают условия блокирования/ES, зарядов/Onslaught, проклятий/слепоты, взрывов, shock/ignite spread, self-hit, effective charges и Corrupted Blood immunity. Два новых слота: перчатки и сапоги. Сравнение показывает все вытесняемые вещи и показатели на независимой копии run.
- 8 семейств монстров: Drowned, Rhoa Mare, Goatman, Ancient Archer, Flame Sentinel, Undying Evangelist, Carrion Queen, Tentacle Miscreation; отдельно выводок Carrion Minion. У каждого собственная атака и предупреждение, у Evangelist — настоящий Proximity Shield.
- Brutus120с → Merveil240с → Dominus360с → Kitava450с. Один активный босс; следующие ждут в очереди. Merveil/Dominus меняют форму, у Kitava отдельное сердце. За каждого — уникальный предмет ровно один раз. Победа требует всех четырёх убийств и времени≥480с; после480с новые обычные волны прекращаются, оставшиеся встречи продолжаются.
- Сохранены7классов/21Ascendancy/84ключевых узла,5умений/8поддержек, reset с уровня1 и отдельный legacy mode.
- Новая2Dграфика, позы/эффекты атак, геометрия предупреждений, HUD боссов/сердца и стрелка к боссу за экраном. Иконки12новых предметов — оригинальные inventoryPNG с Wiki. Исходные3Dмодели/анимации PoE не извлекались.
- Изолированная галерея `duskbound-bestiary.html`:17карточек предметов, все8противников,4босса и формы, пауза, манёвр, уменьшенные эффекты. Усиленная защита её героя явно подписана; профиль и основной забег не меняются.

## Основание свойств

[Предметы](./poe-expansion-unique-sources.md), [монстры](./poe-expansion-monster-sources.md), [боссы](./poe-expansion-boss-sources.md). Сохранены текущие source rows/revisions, original EN и RU modifiers. HP/урон/радиусы/тайминги противников — баланс Duskbound, не исходные значения PoE. Ralakesh даёт один случайный effective maximum-charge вариант, а не три actual charges. Temporal Chains использует live intervals; Proximity Shield блокирует damage hits снаружи, сохраняя hit events, и пропускает non-ailment DoT. Source positions — реальные actor/proxy с documented fallback; это политика адаптации, а не заявленная полная эмуляция PoE.

## Автоматические проверки

Финальный `node --test tests/*.test.mjs`: **455selected /455pass /0fail /0skip /0cancelled**,2.23с. Отдельные meaningful red→green волны описаны в task reports; существующие ожидания не ослаблялись ради зелёного результата. Покрыты свойства/отрицательные условия/ownership/duration всех12предметов, typed hit/DoT/secondary sources, несовместимые слоты, all4queue/victory/drop/heart/phase thresholds, shield source, caps, pause/reset и сохранённые class contracts.

Финальное ревью выявило и привело к исправлению трёх интеграционных дефектов:

1. Далёкие обычные враги теперь возвращаются в seeded кольцо650–850; очищаются action/jump/owned hazards, сохраняются parent IDs, boss/heart не перемещаются.
2. Провокация56292 Luminary выбирает наёмника для chase/range/new windup. Направленные снаряды хранят выбранную цель и реально повреждают её через defence pipeline.
3. Смешанный урон наёмнику сохраняет компоненты: один block roll, раздельная mitigation, fire-only ignite, общий расход ES/HP/recoup. Реальная Tentacle spine physical6+fire6 при armour100/fireRes0 даёт96/13≈7.384615 hit и0.48igniteDPS; прежняя ошибка давала4.5безignite.

Полный независимый review и окончательный verdict: [final-review](./expansion-tasks/final-review.md). Исправления и RED/GREEN evidence: [final-fixes-report](./expansion-tasks/final-fixes-report.md). Task reviews: [предметы](./expansion-tasks/task-1-review.md), [встречи](./expansion-tasks/task-2-review.md), [UI](./expansion-tasks/task-4-review.md).

## Браузер: фактически проверено

Встроенный браузер на компьютере. Desktop1280×720 и mobile viewport390×844; ширина DOM подтверждена отдельно от размеров снимка.

- Все8монстров выбраны в галерее, наблюдались реальные windup states и соответствующая геометрия: melee circle, Rhoa capsule, Goatman landing circle, Archer line, Sentinel cone, Evangelist rune/bubble, Queen spawn и Tentacle volley. Reduced effects сохраняет предупреждения.
- Все4босса отображаются. Проверены Brutus chain warning, вторая форма Merveil с cold circles, вторая форма Dominus с blood rain safe circle, Kitava heart и переход обратно в форму2. Это gallery fixture на реальной модели, не естественное ручное прохождение кампании.
- Пауза галереи: два снимка совпали побайтово. Исправлен дополнительный UI defect: Next form сразу после выбора на паузе игнорировался из-за arrival warning; explicit fixture control теперь снимает warning, вызывает publictick и обновляет readout. Свежая Merveil на паузе сразу показывает форму2/disabled button.
- Каталог17предметов; Aegis и Asenath показывают русский текст и загруженный оригинальный PNG. На390px длинная карточка Asenath читается полностью, document.scrollWidth=innerWidth=390. Новые слоты видны в основном персонаже; все12слотов пусты после restart.
- На desktop основная игра: start/movement/автоматические убийства Drowned/кристаллы опыта, level2 и выбор настоящего Kinetic Fusillade; death/result/retry; новый Witch run00:00/level1/14-14-32/57HP/56mana/пустая экипировка. Игрок не модифицировался через evaluate.
- Console warn/error на проверенных перезагрузках/gallery — пустой список.

[Desktop](./screenshots/duskbound-expansion-desktop.jpg), [mobile](./screenshots/duskbound-expansion-mobile.jpg), [карточка предмета mobile](./screenshots/duskbound-expansion-item-mobile.jpg). Формат файлов проверен: JPEG,1280×720 /390×844 /390×844. Это реальные browser captures, не нарисованные макеты.

## Границы проверки

Естественная первая встреча/боссовая добыча в основном браузерном забеге вручную не достигнуты; ручные попытки завершились смертью до первой встречи. Расписание, boss HUD wiring и награды проверены соответственно модельными интеграционными тестами/чтением кода/галереей. Полное ручное прохождение8минут не заявляется. Три прежние стадии227/231/431 и старые21победа относятся к прежним состояниям и не считаются финальной проверкой этого расширения.

Реальные телефоны, Safari/Firefox, измерение FPS/нагрузки в браузере и полный перебор сочетаний всех предметов/Ascendancy не проводились. Бот с одним seed и одной политикой — smoke diagnosis, не доказательство общего баланса или человеческой проходимости. Ни тесты, ни баланс не изменялись для принудительного получения21победы.

## Статические проверки

7HTMLpages:0broken local src/href;18модулей (игра+скрипты):node--check exit0; JSON source data читаются; whitespace check source files и gitdiff--check без ошибок. Страница/галерея не требуют внешней сети во время игры. Источники изображений/alpha/атласа: [provenance](./duskbound-expansion-assets.md), [иконки](./poe-expansion-item-art.md).


## Финальная smoke-матрица21Ascendancy

Команда: `node scripts/duskbound-classes-bot.mjs --seed=42`, обычные характеристики, без invulnerability/bonuses. Модель соответствует [frozen hashes](./duskbound-expansion-model-hashes.json). Проверяются конечность ресурсов/координат player+allies и caps180normal/1boss/1heart/500projectiles/250effects/64hazards/1mercenaryMinion. Ошибок этих инвариантов не получено, процесс завершился exit0.

Политика: прежнее pursuit/separation + escape от imminent видимой геометрии; при выборе loot используется real equipment projection, опасный Eye of Innocence не берётся вслепую. Ранее попробованная прогнозная политика отброшена: отдельный controlled comparison показал, что она убивала персонажа и на старой модели. Итоговые HP/урон/спавн игры ради побед бота не менялись.

**Итог:12won /8dead /1playing.** Победы578.1–795.9с: все4босса/4награды/4испытания. Elementalist остался playing на800с с399HP, не убив Brutus; прогон остановлен по лимиту16,000steps, а не засчитан победой. Ранние смерти всех трёх Templar при61.4с относятся к общему старту до Ascendancy; нельзя интерпретировать их как отдельную проверку каждого его узла. Это выявляет ограничения единой политики и оставляет баланс предварительным; не доказывает равную сложность классов или баг по одному seed.

| Класс | Ascendancy | Результат | Время, с | Уровень | Боссов | Наград |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| scion | Ascendant | won | 578.1 | 19 | 4 | 4 |
| scion | Reliquarian | won | 609 | 24 | 4 | 4 |
| scion | Luminary | won | 721.4 | 18 | 4 | 4 |
| marauder | Juggernaut | won | 590.4 | 21 | 4 | 4 |
| marauder | Berserker | won | 602.3 | 17 | 4 | 4 |
| marauder | Chieftain | won | 596.7 | 17 | 4 | 4 |
| ranger | Warden | won | 653.7 | 15 | 4 | 4 |
| ranger | Deadeye | won | 755.1 | 26 | 4 | 4 |
| ranger | Pathfinder | won | 746.1 | 19 | 4 | 4 |
| witch | Occultist | won | 686.9 | 18 | 4 | 4 |
| witch | Elementalist | playing | 800 | 17 | 0 | 0 |
| witch | Necromancer | won | 795.9 | 18 | 4 | 4 |
| duelist | Slayer | dead | 387.9 | 11 | 0 | 0 |
| duelist | Gladiator | dead | 132.9 | 7 | 0 | 0 |
| duelist | Champion | dead | 160.4 | 8 | 0 | 0 |
| templar | Inquisitor | dead | 61.4 | 3 | 0 | 0 |
| templar | Hierophant | dead | 61.4 | 3 | 0 | 0 |
| templar | Guardian | dead | 61.4 | 3 | 0 | 0 |
| shadow | Assassin | dead | 184 | 8 | 0 | 0 |
| shadow | Trickster | won | 599.2 | 18 | 4 | 4 |
| shadow | Saboteur | dead | 215.6 | 9 | 0 | 0 |

[Полный исходный вывод](./duskbound-expansion-bots-final.txt). Числа12/8/1 являются фактическим результатом, не целевой нормой приёмки. Ручная сложность и комфорт8-минутного забега требуют отдельного игрового плейтеста.

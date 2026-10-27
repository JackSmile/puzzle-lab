# Ревью пяти уникальных предметов Duskbound

> Сводка координатора: Это ревью первоначального frozen unique snapshot. Три найденные legacy-проблемы впоследствии исправлены и независимо проверены в addenda `duskbound-class-review.md`; итоговая объединённая версия одобрена в `duskbound-final-review.md`.

**Spec verdict: нужны исправления. Quality verdict: нужны адресные regression checks и исправления трёх P2 ниже. P1 не найдено.** Основные механики class-run реализованы; подтверждённые расхождения относятся к новым unique-механикам в поддерживаемом legacy-run.

Проверен неизменяемый snapshot `/tmp/duskbound-unique-review/{core.mjs,classes.mjs,uniques.mjs,duskbound-uniques.test.mjs}` после чтения brief/report, `games/duskbound/data/poe-unique-source.json` и `docs/poe-unique-sources.md`. Номера строк ниже относятся именно к snapshot. Live core/classes параллельно изменяются другим исполнителем; их исправления здесь не проверялись. Известные общие 13 class findings не повторяются.

Повторно запустил только **19 unique tests на frozen modules: 19 passed, 0 failed**. Импорты перенаправлены в памяти на snapshot через data URLs, JSON — на сохранённые source files проекта. Полный suite не запускал; 175 passing — результат автора. Дополнительно выполнил указанные ниже focused probes. Production files не менял, браузер и коммиты не использовал.

## 1. P2 — Death Rush ошибочно срабатывает от настоящего Spectre kill в legacy-run

**Snapshot:** classes 149 и 194; core 322–324, 85; uniques 17–18.

`classSkillModifiers` возвращает legacy values до присваивания `isMinion` и `damageType`. Поэтому фактический снаряд Spectre получает context без `isMinion`, а `hurtEnemy` помечает его убийство как `killedByMinion=false`. Новая проверка Death Rush принимает его за личное убийство игрока: выдаёт Life recovery и Adrenaline. Та же потеря scope разрешает личный Headhunter rare-hit bonus снаряду Spectre. Исключение Headhunter для **переноса rare modifiers** должно при этом сохраниться — оно явно разрешено источником.

**Probe:** `createRun({character:'seer',seed:42})`, Death Rush + Headhunter, HP=1, только Spectre, враг 1 HP в 100px; обычные `tick(.05)` до первого убийства. Получено `kills=1`, `killedByMinion=false`, `adrenalineRemaining=2`, HP=13.07 (включая обычную регенерацию за время прогона). Ожидается отсутствие Life-on-Kill/Adrenaline кольца при сохранении переноса редких свойств поясом.

**Исправить:** заполнять тип и владельца умения независимо от наличия classState. Добавить реальный legacy projectile regression с Death Rush + Headhunter, проверяющий и запрет личных эффектов, и разрешённое исключение переноса. Существующий тест реального Spectre kill создаёт class-run и этот путь не покрывает.

## 2. P2 — новые защитные rare modifiers не действуют на врага в legacy combat

**Snapshot:** uniques 5–6, 25; classes 278; core 249, 263, 279, 291, 323.

Новый `assignRareModifiers` выдаёт реальные `armour` и `resistances.fire` для Armoured/Flameward, но legacy `classHit` возвращает результат до elemental resistance mitigation. Кроме того, условие применения armour требует `context.type==='physical'`, а реальные legacy emitters передают отсутствующий `skill.damageType`. В итоге Flameward не уменьшает огненный урон, Armoured не уменьшает физические попадания обычных legacy умений. Это нарушает требование о реально работающем каталоге свойств врага, который затем переносится Headhunter.

**Probes:** legacy enemy с `resistances.fire=.3` принимает fire DoT100 → **100**, ожидается70. Enemy с `armour=300` принимает physical100 с реальным контекстом `skillStats(run,'lightning')` → **100**, ожидается62.5 при принятой здесь формуле `100 × (1 − 300/(300+5×100))`. Оба свойства реализованы на стороне украденных player stats, но это не доказывает эффект на их первоначальном носителе.

**Исправить:** обеспечить typed context legacy skills и применять защиту цели в legacy path, сохранив hit/DoT различие. Проверить настоящие физические попадания и RF против редких врагов с/без соответствующего свойства; отдельно проверить, что armour не уменьшает DoT. Простого assertion наличия `rareMods`/полей недостаточно.

## 3. P2 — legacy unique increased damage перемножается с частью других increased modifiers

**Snapshot:** core 666, 716–717; classes 278.

Legacy Nebulis/Adrenaline/украденный Powerful компенсируют только `might` в знаменателе, хотя исходный damage уже включает `_bonuses.damage` и `equipment.mods.damage`. Эти вклады ошибочно перемножаются. Legacy Headhunter rare-hit bonus вообще умножает уже увеличенный итог на `1+rareHitDamage`. Class-run содержит `increasedDamageTotal` и складывает соответствующие вклады; legacy-run нарушает исходный тип **increased**, который brief/report отдельно обещают сохранить.

**Probes:** legacy Witch с `_bonuses.damage=.5`, Nebulis roll8% и фактическим fire resistance90% получает bolt damage **79.2**, ожидается `24 × (1 + .5 + 15×.08) = 64.8`. Отдельно тот же generic bonus и Headhunter roll28% против rare дают **46.08**, ожидается `24 × (1 + .5 + .28) = 42.72`. Оба сценария используют публичный `createRun` и обычный rolled/equipped unique.

**Исправить:** использовать единый полный increased total для базового урона и unique-вкладов в обоих режимах, сохраняя отдельные more/support multipliers. Добавить независимые численные expectations с одновременными might, generic gear/bonus, Adrenaline, Nebulis и rare-hit bonus; проверить их отсутствие для недопустимых типов и minions.

## Проверенные части без отдельного замечания

- Все пять предметов создаются seeded RNG, имеют новые belt/ring slots, sourceStats и requiredLevel; legal ranges видны в roll code. Повторный прогон подтвердил воспроизводимость и source-range checks из focused suite.
- Headhunter хранит точные ID из `rareMods`; разные свойства сосуществуют, одинаковые не складываются, активный duplicate не продлевает таймер, expiry60s. Политика refresh и локальный баланс четырёх свойств прямо обозначены адаптацией. Class-run настоящий Spectre kill переносит свойства без эффекта Death Rush.
- Death Rush использует один `adrenalineUntil`, не обновляет активный баф; heal вызывается независимо от lockout. Class-run repeated/expired kill tests проходят.
- Dying Sun имеет capacity50, chargesUsed45–50, duration3.2–4.8s; resistance, max resistance, projectiles и AoE gated активностью. Duration/effect/charge gain масштабируются раздельно, magic-only bonus исключает unique. Replacement сбрасывает active timer; эффект не передаёт projectile/AoE minion. Focused tests проверяют эти состояния и cap90%.
- Cloak разделяет физический и огненный компоненты перед armour/resistance, armour исключён из DoT, затем ES/MoM проходят один раз. Reflection реально уменьшает enemy HP, учитывает fire resistance, исключает ranged/spell/DoT/reflected contexts. Ignite duration применяется к player ignite. Не найдено отдельного подтверждённого unique-дефекта в этих ветках.
- Nebulis class-run использует сумму фактических capped resistances выше75%, ограниченных90%; физический/minion damage исключены. Cast speed и все три выбранных synthesis implicit действительно меняют поддерживаемые stats. Придуманный synthesis pool отделён от исходных explicit модификаторов.

## Граница вывода

19 зелёных тестов не закрывают перечисленные legacy ветки; сейчас нельзя считать выполнение brief полным. После исправлений нужны три focused regression группы выше и общий suite на итоговом объединённом дереве. Визуальные подписи/UI и интеграция параллельных class fixes остаются частью последующего общего review.

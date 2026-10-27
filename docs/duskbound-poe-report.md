# Duskbound: PoE 1 adaptation report

> Исторический отчёт первоначального переноса пяти умений. Старые три героя и упрощённые unique-моды ниже заменены текущими7/21/84 и пятью source-backed уникальными предметами; актуальные границы — в `duskbound-design.md`, `duskbound-uniques-report.md`, `duskbound-verification.md`.

Дата: 27 октября 2026. Изменены только `games/duskbound/core.mjs`, `tests/duskbound.test.mjs`, новый `tests/duskbound-poe.test.mjs` и этот отчёт. Browser/UI интеграция находится у основного агента.

## Основание выбора

Переданная основным агентом проверенная фактура записана в `docs/duskbound-poe-brief.md`. Повторно самостоятельно poe.ninja в этой подзадаче не открывал. Срезы: Allflame latest, Experience ladder и Mirage. Доли описывают выбор билдов на этом срезе, а не универсальную популярность среди всех игроков.

| Умение | Срез и доля | Подтверждённые в brief связанные supports |
| --- | --- | --- |
| Winter Orb | Allflame 7% | Infused Channelling 86%, Focused Channelling 82%, Power Charge On Critical 73%, Inspiration 58%, Cold Penetration 46%, Hypothermia 20%, Multiple Projectiles 11% |
| Righteous Fire | Allflame 5%; Mirage 5% | Burning Damage 99%, Elemental Focus 95%, Swift Affliction 78%, Lifetap 76%, Efficacy 63%, Increased Area of Effect 39%, Concentrated Effect 35% |
| Blade Vortex | Mirage 7% | Minion Pact 94%, Greater Unleash 88%, Lifetap 62%, Added Fire Damage 46%, Elemental Focus 34%, Increased Critical Damage 33%, Increased Area of Effect 14% |
| Kinetic Fusillade | Mirage 7% | Less Duration 99%, Greater Volley 96%, Ballista Totem 91%, Increased Critical Damage 85%, Elemental Damage with Attacks 49% |
| Raise Spectre | Allflame 4% | Minion Damage 58%, Greater Spell Echo 42%, Pierce 42%, Returning Projectiles 40%, Controlled Destruction 40%, Empower 39% |

Подтверждённые связи предметов: Dying Sun — Winter Orb/Allflame 44%; Nebulis и Cloak of Flame — Righteous Fire/Allflame по 67%. Watcher's Eye 44% и Mageblood 33% общего Allflame среза не добавлялись.

Все числа боевой симуляции ниже — собственный баланс Duskbound, не утверждения о механиках или аффиксах оригинальной PoE. Умения и уникальные предметы прямо помечены адаптациями. Физическое вращение Blade Vortex, бессмертные Spectres, автоматическая стрельба Winter Orb без ручного ченнелинга и залп Kinetic Fusillade без тотема сознательно упрощены.

## Действующий контракт

Сохранены существующие exports `DURATION`, `UPGRADES`, `CHARACTERS`, `createRun`, `tick`, `chooseUpgrade`, `setPaused`, `stats`. Сохранены внутренние ID `bolt`, `orbit`, `nova`, `lightning`; добавлен `minion`. Стартовые character IDs прежние:

- `warden` = Chieftain, `nova:1`, `regen:1`. Регенерация 0,9 HP/с перекрывает исходные 0,3 HP/с самогорения.
- `witch` = Elementalist, `bolt:1`.
- `seer` = Necromancer, `minion:1`.

Новые exports:

- `supportTargets(run, supportId)` → массив совместимых экипированных skill IDs, где есть свободная связь или можно повысить существующую до ранга 3. Для неизвестного ID и других типов возвращает `[]`.
- `skillStats(run, skillId)` → `{damage,cooldown,area,projectiles,pierce,critChance,critMultiplier}`. Damage — урон прямого попадания/одного тика, cooldown — секунды, area — множитель радиуса. Крит вычисляется seeded RNG при создании снаряда или ударе клинка. База без крит-поддержки: chance 0, multiplier 1,5.
- `chooseUpgrade(run,id,target)` теперь принимает третий аргумент для support. Без предложенной карты или допустимой цели остаётся полное прежнее состояние. Support записывается только в `links[target]`, глобальные upgrades его не содержат. После успешного выбора сразу обрабатывается накопленный следующий уровень.
- `rollItem(run, rarity?)` → новый предмет, использует тот же seeded RNG и `_nextId`. Опциональная rarity `magic|rare|unique`; прочие значения запускают обычный выбор: 15% unique, 50% rare, 35% magic. Magic содержит 1–2, rare 2–3 разных положительных модификатора.
- `equipLoot(run,take=true)` действует только в `loot` с корректным pendingItem. Заменяет предмет одного слота, сбрасывает pendingItem, пересчитывает HP/скорость и обрабатывает накопленный уровень. Увеличение максимума лечит только на положительную разницу; уменьшение максимума ограничивает HP новым максимумом. При skip оборудование не меняется. Повторный вызов без нового предмета ничего не делает.

Новые поля run:

```js
links: { [skillId]: { [supportId]: rank } }
minions: [{ id, x, y, shotTimer }]
equipment: { weapon: null, body: null, flask: null }
loot: [{ x, y, item }]
pendingItem: null // либо item
```

Предмет: `{id,name,slot,rarity,icon,color,description,mods}`. Дополнительное `damageType:'elemental'` есть у Nebulis: его `mods.damage` относится только к Winter Orb и RF. Rarity цвета: magic синий `#8faeff`, rare жёлтый `#ecd377`, unique оранжевый `#e99a55`. Моды `damage/cooldown/speed/maxHp/regen/pickup/projectiles`, дополнительно `area` и `damageReduction` для Dying Sun/Cloak of Flame. Fraction-моды складываются с соответствующими бонусами; projectiles добавляет целые снаряды сферы, залпа и каждого призрака; area масштабирует RF, орбиту и радиусы взрывов. Reduction ограничен 60%, cooldown множитель снизу 0,35.

Новая фаза `loot`: подбор в радиусе 40 ставит игру на паузу и переносит один предмет в pendingItem. Игра не тикает, `setPaused` её не меняет. Если одновременно хватает XP для уровня, предложение уровня появляется после решения о предмете. Смерть и победа имеют приоритет.

`stats` сохраняет прежние поля и добавляет `fireRadius`, `minionCount`, `kineticCount`, `projectiles`, `area`, `damageReduction`. MinionCount равен 0, если skill не получен. Orbit positions: `time*2.6 + i*2π/orbitCount`, radius из stats — прежний контракт сохранён.

Боевые/визуальные дополнения:

- Projectile `element`: `cold`, `kinetic`, `spectral`; hostile сохраняет прежний контракт. Дополнительные `splashRadius`, collision radius.
- Enemy `chill`: оставшееся время замедления в секундах, движение ×0,75 пока >0. Попадание cold обновляет до 1 с.
- Enemy `elite:true`: исходный обычный враг с ×4 HP/XP, ×1,3 radius/damage. Первый в 35 с, следующие через 60 с до окончания времени. На заполненной карте усиливается существующий обычный враг; лимит 180 соблюдается.
- Смерть элиты один раз создаёт предмет; `_rewarded` и удаление врага предотвращают дубли. После убийства первой элиты награда доступна сразу, отдельного ожидания до 80 с нет.
- Effect kinds `burn`, `frost`, `kinetic` сохраняют поля `x,y,radius,color,life,maxLife`. Остальные эффекты прежние. Для постоянной RF renderer может использовать `stats.fireRadius`; burn-эффект обновляется раз в 0,25 с.
- Массивы ограничены: обычные враги 180, projectiles 500, effects 250, texts 150, gems 600 (XP не теряется при слиянии), minions 3, loot 12. Старейший неподобранный предмет удаляется при переполнении loot.

## Фактические боевые адаптации

| Skill | Реализовано |
| --- | --- |
| Winter Orb / bolt | Автоприцел в ближайшую цель до 600, парящая точка выстрела на 24 выше героя, cold-снаряды; базовый интервал 0,6 с, небольшой взрыв радиуса 20 с половиной урона по соседям и chill. Уровни добавляют урон, снаряды и базовый pierce с уровня 4. |
| Blade Vortex / orbit | Базовые 3 клинка на radius64. Урон только от реального пересечения с клинком; повторный удар по врагу через 0,48 с × cooldown. Уровни увеличивают число, radius и урон. |
| Righteous Fire / nova | Постоянный radius90 (+15 за уровень); тик раз в 0,25 с, базовый урон13,2; каждую симуляцию теряет 0,25% maxHP/с, не ниже1. Реген применяется отдельно. Haste увеличивает урон при фиксированном ритме тиков для сохранения ограниченного числа эффектов. Вражеский контакт может убить. |
| Kinetic Fusillade / lightning | Заряженный залп 3 снарядов, базовый урон30, интервал1,1 с, kinetic-взрыв radius24 с половиной урона по соседям. Цепной молнии нет. |
| Raise Spectre / minion | 1 призрак на уровне1, 2 на3, 3 на5. Неуязвимы; следуют к точкам вокруг героя и стреляют в ближайшую цель до620. Базовый урон19,2, интервал0,9 с, spectral-снаряды. |

Поддержки максимум ранга3, максимум две разные на skill. Совместимость/эффект:

| ID | English name | Skill | Эффект каждого ранга |
| --- | --- | --- | --- |
| infused | Infused Channelling | bolt | +15% урона; после0,5с неподвижности на10% короче интервал. Движение сразу сбрасывает фокус. |
| burning | Burning Damage | nova | +30% урона ауры. |
| volley | Greater Volley | lightning | +2 снаряда, урон каждого ×0,85 за ранг. |
| unleash | Greater Unleash | orbit | +1 вращающийся клинок; адаптация повторных применений. |
| minion_damage | Minion Damage | minion | +30% урона призраков. |
| pierce | Pierce | bolt/minion | +1 пробиваемая цель. Связь с bolt — собственное механическое расширение; в переданном срезе подтверждена связь с Raise Spectre. |
| area | Increased Area of Effect | bolt/orbit/nova | +20% радиуса взрыва/орбиты/ауры. Radius-множитель — собственный баланс; связь с bolt — собственное расширение. |
| critical | Increased Critical Damage | orbit/lightning | Шанс критического попадания10%, множитель1,5 +0,4 за ранг. |

Предметы: Dying Sun даёт +1 снаряд и +20% radius; Nebulis +35% урона стихиями только Winter Orb/RF; Cloak of Flame +35 maxHP, +0,7HP/с и −15% получаемого урона. Эти эффекты прямо названы упрощёнными адаптациями и не копируют оригинальные PoE affixes.

## Проверка

TDD: новый набор изначально показал 13 failing tests на отсутствующих данных/API/механиках; после реализации все прошли. Затем тест отдельного elemental scope для Nebulis показал ошибочное усиление физических skills; исправлено с проверкой Winter Orb/RF и исключением orbit/lightning/minion. Часть дополнительных проверок фактических попаданий добавлена как характеристические тесты после реализации.

Финальный запуск `node --test` 27 октября 2026:

```text
ℹ tests 45
ℹ suites 0
ℹ pass 45
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1468.102167
```

Включает 19 новых PoE tests, 23 прежних tests симуляции, 3 profile tests. Покрыты локальность/совместимость/лимиты links, фактическое число kinetic projectiles, RF cadence/drain/lethal contact, chill и окончание slow, движение/атаки Spectres, seeded rolls/critical hits, все восемь supports в бою, rarity/mod bounds, atomic equip/skip/repeated decision/HP clamp, loot freeze и отложенный levelup, элиты и отсутствие дублей, две длительные симуляции больше480 секунд с bounds (новая проверка дополнительно требует фактический выбор хотя бы одного support и хотя бы одного предмета). Прежние требования стартовых IDs/каталога/вспышки/молнии актуализированы под новый brief; сохранены проверки движения, урона, XP, boss, победы, воспроизводимости, раннего выбора15–25 с и сохранности XP.

Не проверялись в этой подзадаче: браузерный renderer/controller, интерактивный UX выбора support target и предмета, визуальная читаемость/баланс на реальном прохождении. Длительные tests используют повышенные HP/regen для проверки состояния симуляции, а не для доказательства баланса обычного полного прохождения.

## Исправления двух P2 после ревью ядра

По `docs/duskbound-core-review.md` подтвердил оба дефекта, добавив регрессии **до** production-правок. Пять новых проверок упали на прежнем коде с ожидаемым отсутствием урона/уроном не той цели; шестая проверка защиты от попадания за пределом life уже проходила и защищает от слишком широкого исправления.

1. **Порядок столкновений.** Проверка минимального расстояния от отрезка до центра не определяла первое время контакта; перебор `run.enemies` отдавал попадание ранее добавленной, более дальней цели. Теперь `segmentHitTime` решает пересечение отрезка движения с кругом суммарного радиуса снаряда и цели. Дружественные столкновения сортируются по времени входа в hitbox, при совпадении — по стабильному enemy ID. Исходный массив enemies не переставляется; пробивания тратятся в пространственном порядке. Отдельно проверен большой hitbox с более дальним центром, чтобы сортировка только по центрам не прошла регрессию.
2. **Последний частичный шаг жизни.** Раньше `life -= dt; if (life <= 0) continue` пропускал все столкновения последнего кадра. Теперь движение ограничено `min(dt, remainingLife)`, столкновения проверяются на этом фактически существовавшем участке, затем истёкший снаряд удаляется. Общий путь работает и для hostile, и для friendly. Цель за пределом оставшегося lifetime не получает урон. Проверено совпадение урона при одном шаге0,05с и дроблении0,01+0,04с для снаряда с life0,04с.

Новые шесть тестов: ближайший hit при двух перестановках enemies; pierce1 при трёх порядках трёх целей; порядок по входу в hitbox разных радиусов; последний частичный friendly-step и разделение кадров; отсутствие урона после life; hostile-hit в последнем частичном шаге. Адресные прогоны после каждого исправления: **3/3** и **3/3**. API/state, контроллер, renderer и константы баланса не менялись.

Финальный полный `node --test` после обоих исправлений:

```text
ℹ tests 51
ℹ suites 0
ℹ pass 51
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1151.254334
```

Прежний блок45/45 выше относится к состоянию до этого ревью. Ранее записанные результаты диагностического бота в `docs/duskbound-balance-report.md` также были получены до исправления collision-порядка/последнего шага жизни и не считаются повторной проверкой текущего ядра.

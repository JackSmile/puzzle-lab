# Пять уникальных предметов — реализация

Источник исходных строк и диапазонов: `games/duskbound/data/poe-unique-source.json`, точные ссылки и версии — `docs/poe-unique-sources.md`. В этой работе браузер повторно не открывался: использованы подготовленные первичные выдержки. Текущий код реализует обычные, не legacy/Ruthless/Foulborn версии из указанного снимка.

## Что действует в бою

- **Headhunter:** отдельно бросаются implicit Life 25–40, explicit Life 50–60, STR/DEX 40–55 и 20–30% increased hit damage against rares. Атрибуты входят в ресурсы/точность/уклонение, жизнь не дублируется. Бонус rare damage не действует на DoT и попадания minion. Смерть rare передаёт его фактические `rareMods` на 60 секунд, включая убийство настоящим снарядом Spectre. Разные свойства сосуществуют, одинаковое не складывается. При повторном получении активного свойства таймер **не обновляется**; после истечения его можно получить вновь. Это явно выбранное локальное правило, потому что источник не подтвердил правило refresh.
- **Death Rush:** 17–23% chaos resistance; 3–5% maximum Life восстанавливаются при каждом собственном убийстве; Adrenaline на 1–3 секунды появляется только при отсутствии активного эффекта. Общий `combat.adrenalineUntil` переиспользован, поэтому Champion и кольцо не создают второй множитель. Повторное убийство лечит независимо от lockout Adrenaline. Личные эффекты кольца не выдаются за minion kill; исключение для переноса Headhunter отдельно соблюдено.
- **Dying Sun:** настоящий timed flask: capacity 50; базовый расход 20 умножается на 125–150% increased charges used с округлением вниз до целых charges (45–50); длительность `8 × (1 − lessDuration)` с roll 40–60%, то есть 3.2–4.8 с. Только во время действия: +40% Fire Resistance, +5% maximum Fire Resistance, +2 projectiles, 10–20% increased Area of Effect. Area переводится в радиус через квадратный корень. Class flask effect, duration и charge gain применяются по одному разу. Magic-only Nature's Boon не усиливает unique. Projectile effect округляется вниз после масштабирования, включая +3 при 50% effect. Minion projectiles не получают эффект фляги игрока. Замена фляги обнуляет активный таймер; заряды ограничиваются новым capacity.
- **Cloak of Flame:** 50–75% fire resistance, 40–75% increased ignite duration; 40% physical taken as fire применяется к hits и DoT. После единственной проверки avoidance физическая и огненная части проходят свою mitigation; ES, redirect и MoM применяются к сумме один раз. Armour теперь применяется только к hits. Мelee reflect фактически вычитает 100 fire damage с сопротивлением атакующего; spell/ranged/DoT/reflected damage не запускают повторное отражение. Старые выдуманные Life/regen/generic DR удалены.
- **Nebulis:** cast speed 15–20%; increased elemental damage 6–8% за каждый фактический пункт capped Fire/Cold/Lightning Resistance выше 75%, сумма трёх типов, глобальный cap 90%. Физический урон и minion damage исключены. Increased бонусы складываются с существующими increased damage (в том числе Adrenaline), а не образуют дополнительный more multiplier. Magnitude 60–120% усиливает все три реально действующих synthesis implicit.

## Границы адаптации

- `uniques.mjs` содержит компактный **наш** rare-mod catalog: Swift (+25% movement speed), Powerful (30% increased damage), Armoured (+300 armour), Flameward (+30% fire resistance и +5% maximum fire resistance). Это не заявление о полном/оригинальном PoE rare-mod catalog. Генерация врага и украденное свойство используют один ID и один набор чисел. Базовые множители rarity и базовые характеристики вида врага не считаются explicit rareMods.
- Synthesis pool **придуман для survivor**, а не извлечён из PoE synthesis datamine: три разных случайных свойства из +12 Life, +0.3 Life regen/s, +12% fire/cold/lightning resistance; каждое масштабируется оригинальным magnitude roll. `synthesisImplicits[].adapted === true` явно отделяет их от source-backed explicit lines. Нет обычного базового 40% elemental implicit поверх этих трёх.
- Все пять предметов имеют `requiredLevel` для справки; восьмиминутный режим позволяет drop/equip с первого уровня. Campaign attribute requirements, качество/крафт/полная система баз предметов не добавлялись.
- Фляга активируется автоматически, когда закончился эффект и хватает charges. Один flask slot и один ring slot — существующее ограничение режима. В старых character-run сохранены слоты belt/ring и работа timed flask, resistance, life, cast/damage, rare transfer; полноценные class/ailment mechanics принадлежат новому class-run, отдельная новая система классов старым сохранениям не навязывается.
- Damage model и skill execution остаются survivor-адаптациями. Эти изменения не заявляют полную эквивалентность PoE для всех conversion, proxy kill, ailment, reflect и modifier interactions за пределами реализованных сценариев.

## Контракт UI

`uniqueSummary(run)` экспортирован из `core.mjs`; тот же объект находится в `classSummary(run).uniques` (включая legacy-run без classState):

```js
{
  flask: {name, charges, capacity, chargesUsed, active, remaining},
  adrenalineRemaining,
  stolenModifiers: [{id, name, description, stats, until, remaining}]
}
```

Время — секунды игрового времени. `stolenModifiers` содержит только активные свойства. Charges могут быть дробными после class charge gain; HUD может округлить отображение, но не модель. `sourceStats` — русские строки с фактическими бросками, `mods` — рабочие значения, `uniqueId`, `requiredLevel`, стандартные name/slot/rarity/color/icon сохранены. Не выводить только постоянные raw flask mods без условия активного эффекта.

## Проверка

Новые тесты записывались до production code: первый прогон 10/10 RED; после основного внедрения 10/10 GREEN. Следующий набор нашёл четыре реальные ошибки scope/legacy/reflection (11 GREEN, 4 RED), исправленные адресно. Отдельный RED выявил отсутствие украденной брони/DEX-уклонения в legacy incoming path; исправлено.

`tests/duskbound-uniques.test.mjs`: 19 GREEN — диапазоны/seed, equip/слоты, ресурсы, Adrenaline lockout/stacking, flask расход/expiry/effect/duration/charges/cap/replacement, conversion hits/DoT/ES/MoM, reflection/ignite, Nebulis capped/uncapped/bad scopes/implicits, actual rare generation/expiry/nonstack, настоящий Spectre projectile kill.

В `tests/duskbound-poe.test.mjs` обновлены три явно устаревших ожидания: три слота → пять, три simplified unique → пять source-backed, постоянные 35% Nebulis → capped-resistance scaling. Сохранены остальные equipment, simulation и projectile collision проверки, включая near-first collision и final partial step. Полный финальный `node --test`: **175 тестов, 175 passed, 0 failed**. Это проверка Node simulation; визуальная проверка интерфейса и общий последующий review выполняются основной задачей отдельно.

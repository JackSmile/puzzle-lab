# Class audit repair wave — итог реализации

Исправлены 13 групп из `docs/duskbound-class-review.md` и три legacy P2 из `docs/duskbound-unique-review.md`. Модель заморожена после **212/212 passing** в полном `node --test`; targeted class/unique suites — **161/161 passing**. Коммитов, браузерных проверок и повторного прогона 21 bots в этой подзадаче не было. Последний bot smoke выполняет координатор на объединённом дереве.

## Что изменилось

| Группа review | Реализация и независимая проверка |
| --- | --- |
| 1. Original graph | Поиск минимального payable маршрута по исходному графу от текущих allocations; starts/options бесплатны, hubs/small nodes оплачиваются. UI cost и allocation используют одну функцию. Соседний option того же choice hub блокируется. Проверены Ahn → Gloom: 6 + 2 points; Gloom → Ahn: 8 + 0 points. При равной стоимости маршрут выбирается детерминированно по choice hubs. |
| 2. Resources | INT ES `0.001 × INT`; mana regen `0.018`; DEX evasion `ceil(DEX / 5) / 100`. Независимые значения для Witch: 100 base ES → 103.2, 14 DEX → 15 × 1.03 evasion, 56 mana → 1.008 mana/s. Исправлены старые Radiant Faith/Escape Artist expectations. |
| 3. Actor ownership | Serializable actor `{kind, id, ownerId}` проходит hit → ailment → death cleanup. Разделены player, minion, mercenary и totem. Личные Shapers, cull, gear poison, charges, Elusive, crit/cast-speed/damage и on-kill recovery не наследуются minions. Profane Bloom разрешает собственных minions; Hinekora разрешает player/totem; Headhunter сохраняет source-backed исключение для proxy transfer. Проверены настоящий delayed minion poison kill и legacy Spectre kill. |
| 4. Hit-only armour | Сохранён unique-writer фикс: armour/Unbreakable работают только для hits. Physical damage reduction отдельно действует на допустимые DoT. Проверены physical/chaos hit и DoT; 11% chaos resistance prerequisite учтён отдельно в expected value. |
| 5. Ailment base | Hit делится на компоненты; ailment base сохраняется до crit, target resistance, shock и damage-taken стадий. В poison сохраняются offensive poison modifiers и owner; на ticks target mitigation применяется один раз и читает текущую цель. Cold resistance/crit multiplier не уменьшают Shaper ignite; poison base30 при shock50% даёт tick45, после смены shock20%/chaosRes50% —18. |
| 6. Bleed | В движении сохраняется фактический `enemy.moving`, freeze исключает движение. Bleed хранит базовый DPS и aggravated flag, а тройной множитель вычисляется при tick. Проверены moving/frozen/stationary с Jagged и без него. |
| 7. Dual wield | Inherent block20%, Determined Survivor40%; отдельный исходный +3% paid small node остаётся сверх inherent. Граничные проверки изолируют inherent20/40, существующие shield/speed проверки сохранены. |
| 8. Untiring | Base regeneration, prevented-damage contribution и периодическая regeneration суммируются до ×1.4. 100 prevented damage добавляет2.1HP/s. Rite of Ruin вынесен в отдельный `lifeLoss` и не масштабируется regeneration rate. |
| 9. Nearby allies | `classAllyStats` и `refreshClassAlly` — общий живой слой armour, ES, damage, movement/action/cast speed, regeneration, resistance, curse reduction. Faith, Metal, Sanctuary, Commander, Plaguebringer и Tailwind проверяют расстояние. Tailwind союзника —8%, Gale усиливает только игрока. Cultist hits реально накладывают ally curse; Sanctuary уменьшает её effect и лечит HP в радиусе. Проверены actual mitigation/heal, nearby/distant переходы и исчезновение Plaguebringer вне радиуса. |
| 10. Summon emission | Sentinel strike24 и burning pulse16 проходят minion/ally modifiers: обязательный10% small даёт26.4 и17.6. Totem shotTimer использует фактический spell cooldown, включая собственный allied action speed; player Gale не умножает его отдельно. |
| 11. Durations | Gale хранит независимые timestamps, максимум10; t0×10 плюс use3.9 даёт один stack в4.1. Hoarfrost имеет refreshable10s expiry и сбрасывается при freeze. Общий elemental duration multiplier применяется к ignite/scorch/shock/chill/freeze. |
| 12. Typed damage | Warden Kinetic Fusillade хранит physical/fire/cold/lightning отдельно; Unbound усиливает elemental components. Проверка: physical30 + три elemental10, сопротивления50% только стихиям →45. Gloomfang cold100/coldRes50%/chaosRes0 →70, поскольку extra chaos20 создаётся до resistance. Shaper incoming conversion разделяет physical60/fire40 до armour/resistance и требует ignite подходящего владельца. |
| 13. Mercenary | Equipment — объект slot→item, синхронизируется с текущим допустимым unique loadout игрока, заменяет старое оружие, не хранит историю. Item mods действуют на mercenary: damage/cast-speed/resistance/ES/life/regen/armour/block. Legendary Arms считает только реально занятые unique slots. Один реальный mercenary-owned minion получает mercenary damage/life modifiers, aura и8%-per-unique multiplier; respawn не добавляет сущностей. Quiver/amulet/shield доступны через явно обозначенные Duskbound relics. |

Уточнение graph стоимости: старые11 — union сохранённых `originalShortestGraphPath`, а не минимум динамического графа. Для всех четырёх выбранных Reliquarian options новый реальный порядок Ahn6 → Gloom2 → Kaom0 → Shimmeron2 требует10 points и всё ещё не помещается в8. Каталог по-прежнему содержит ровно7/21/84 source-backed entries; source JSON не менялся.

## Сохранённые unique эффекты и legacy repairs

Все19 прежних unique tests проходят. Roll ranges и пять source-backed предметов Dying Sun, Nebulis, Cloak of Flame, Headhunter, Death Rush сохранены. Сохранён `uniqueSummary(run)` и `classSummary(run).uniques`.

Три дополнительных regression tests проверяют:

- Реальный legacy Spectre projectile kill сохраняет minion actor, не выдаёт Death Rush life/adrenaline или личный rare-hit bonus; Headhunter переносит фактический rare modifier.
- Legacy RF учитывает fire resistance:100 →70 при30%; physical100 при armour300 →62.5; physical DoT остаётся100.
- Legacy increased bonuses складываются по полному total: might, generic bonus, gear, Adrenaline, Powerful, Nebulis и rare-hit; more/support modifiers остаются отдельными. Негативные hit/DoT scopes сохранены.

Снятая reviewer гипотеза о Cloak/Augury не реализовывалась: Augury изменяет исходящий elemental damage врага, а Cloak меняет damage taken as на получателе.

## UI/serialization контракт

- `run.equipment.quiver` и `.amulet` инициализируются как `null`; обычный class loot также может занимать эти слоты.
- `run.mercenary.equipment` — объект `{weapon?, shield?, offhand?, quiver?, amulet?}` со стандартными полными item objects. Автоматически копируется текущая допустимая экипировка; старые предметы удаляются при замене/снятии, history array отсутствует.
- `run.mercenaryMinions` — массив с максимум **одной** сущностью `{id, ownerId: mercenary.id, kind:'mercenaryMinion', x, y, hp, maxHp, shotTimer, radius:9, color}`. Использует обычные hp/death/respawn, damage и nearby buff mechanics. Миньон действительно атакует и может погибнуть.
- Companion spell — адаптированный cold bolt с base18; собственный minion — physical hit с base8/base life60. Эти базовые величины, companion20% damage aura, follow/respawn cadence — баланс Duskbound. Исходные paid small/Notable modifiers применяются поверх них.
- Три новых relics: `Duskbound: Колчан дозорного` (20% increased собственный damage), `Duskbound: Обет спутника` (+20life, +1regen/s), `Duskbound: Щит рассвета` (+150armour,20%attack block). Все имеют `sourceKind:'duskbound'`, `adapted:true`, явное описание происхождения. Пять PoE uniques имеют `sourceKind:'poe'`.
- Критический roll выполняется один раз при impact. `projectile.damage` хранит до-критическую величину; соответствующий старый тест теперь проверяет фактические потери HP30/57 и повторяемость seed вместо внутреннего precomputed поля.

## Verification evidence

Новые tests создавались до основных fixes. Первые19 scenarios дали RED; при чтении результата скорректированы preconditions/expected values, пропускавшие исходные paid small bonuses (+4% fire DoT, +11% chaos resistance, +3% block) и реальные freeze/accuracy условия. Armour уже был исправлен unique writer и проверялся как сохранённая регрессия. Дополнительные scope regressions поймали Shaper minion-ignite conversion, mercenary-minion life, allied Metal и distant Plaguebringer до их адресных исправлений.

Три legacy tests отдельно дали3 RED на неизменяемых модулях `/tmp/duskbound-unique-review` (изолированные копии `/tmp/duskbound-legacy-regression`) и3 GREEN на текущих файлах.

Финальные команды:

```sh
node --test tests/duskbound-class-fixes.test.mjs tests/duskbound-classes.test.mjs tests/duskbound-uniques.test.mjs tests/duskbound-legacy-unique-fixes.test.mjs
# 161 passed, 0 failed
node --test
# 212 passed, 0 failed
node --check games/duskbound/core.mjs
node --check games/duskbound/classes.mjs
node --check games/duskbound/uniques.mjs
# exit 0
```

В полном suite сохранены projectile collision regressions near-first и final partial step. Логи последнего прогона после re-review: `/tmp/duskbound-rereview-targeted.log`, `/tmp/duskbound-rereview-full.log`. Предыдущая заморозка13 групп:207/207; её логи сохранены в `/tmp/duskbound-targeted-final.log`, `/tmp/duskbound-full-final.log`.

В пределах13 перечисленных findings не оставлено намеренно неработающих selected stat lines. Сохраняются согласованные survivor-адаптации8min XP/trials/autocasting, базовых summon параметров, nearby220px, corpse offering, automatic reservation и mastery substitutes. Новая волна не меняет исходные84 stat lines и не вводит новые PoE значения. Полный browser/bot smoke на объединённой версии остаётся работой координатора, а212 model tests сами по себе его не заменяют.


## Re-review addendum — три дополнительных P2

После первой заморозки207/207 координатор передал три подтверждённых расхождения. Повторно прочитаны точные строки40510,45313,57175 из `games/duskbound/data/poe-classes-source.json`. Изменены только соответствующие участки `classes.mjs`, пять regression tests и этот отчёт; другие pipeline участки не менялись.

1. **Arcane Blessing40510.** Spell hit игрока **или его totem** теперь выдаёт игроку Arcane Surge на4s. Minion/mercenary, attack и DoT этого не делают. Отдельное «20% more Spell Damage to you» применяется к игроку, без передачи этого more множителя в totem damage; существующий paid20% Arcane Surge effect даёт в независимом expected value player damage×1.24. Проверены все actor×spell/attack/DoT комбинации, minion damage и отсутствие more buff на totem.
2. **Far Shot45313.** Исходный30% more распространяется на Hits **и Ailments**. Travel multiplier сохраняется в ailment base один раз; prepared DoT не применяет его повторно. Проверки: travel0/300/600/1200 → hit100/115/130/130, poison DPS30/34.5/39/39. На последующем tick shock50% применяется к сохранённому DPS один раз, даже если DoT context дополнительно содержит projectile/travel metadata. Nonprojectile и minion poison остаются30.
3. **Shrapnel Specialist57175.** Random direction/50% return допускаются только для player/totem projectile actors. Minion и mercenary сохраняют исходный вектор500/0, не получают canReturn и не расходуют RNG этого hook. Player projectile сохраняет скорость500, случайное направление и исходную return-ветку; hostile projectile остаётся неизменным.

TDD evidence: `node --test --test-name-pattern='re-review' tests/duskbound-class-fixes.test.mjs` **до исправлений:4 failed,1 passed** (уже корректный отрицательный Far Shot scope); **после:5 passed,0 failed**. RED log: `/tmp/duskbound-rereview-red.log`.

После фиксов повторены targeted suites: **161/161 PASS**, полный `node --test`: **212/212 PASS**, `node --check games/duskbound/classes.mjs`: exit0. После этого объявлена новая заморозка.21 bots и browser в этом цикле не запускались: координатор повторяет свои checks на новой версии. Ни один из трёх подтверждённых re-review P2 не оставлен открытым.

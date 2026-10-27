# Duskbound classes: независимое ревью frozen snapshot

> Сводка координатора: Итоговый статус: все 13 исходных групп, три legacy unique исправления и последующие R1–R3 проверены; финальный **APPROVED** находится в последнем addendum. Начальные замечания сохранены как история проверки.

Вердикт: **требует исправлений перед приёмкой**. Каталог 7/21/84, сброс прогрессии, основные формулы life/mana/accuracy и trial state machine реализованы. Требование «оригинальные числа и работающие выбранные эффекты» пока не выполнено: ниже конкретные P2, включая недействующий Jagged Technique и недоступный легальный путь Reliquarian. Подтверждённых P1 в проверенном объёме не нашёл.

Объект ревью: `/tmp/duskbound-class-review/{classes.mjs,core.mjs,duskbound-classes.test.mjs}`. **Все номера строк ниже относятся к этому неизменяемому snapshot**, а не к параллельно изменяемым рабочим файлам. Требования прочитаны из snapshot brief; источники — checked-in `poe-classes-source.json`, `poe-signatures-source.json`, `poe-progression-source.json`, `docs/poe-classes-sources.md`; прочитан финальный `docs/duskbound-classes-report.md`. Исходники не изменял.

Полный suite не перезапускал по указанию координатора. 156 passing / 21 bot runs — результаты автора, а не мой повторный запуск. Для отмеченных ниже воспроизведений отдельно импортировал frozen modules через data URLs с исходными JSON и вызвал публичные функции. UI/browser в объём не входили. Legacy unique modifiers исключены из этого ревью.

## Подтверждённые замечания

### 1. P2 — путь Reliquarian рассчитывается только от старта и блокирует легальный 8-point build

**Строки:** classes 12–14, 110.

После Ahn's Might (`47058`) остаются 2 points, но Gloomfang (`36072`) показывается за 5: используется единственный `originalShortestGraphPath` через Caster Weapon Display. Исходный граф разрешает путь от уже взятого Martial Weapon Display `12003 → 9258 → 35989 → 36072`; payable только `9258` и `35989`, то есть **2 points**. Точечный probe: `remaining=2`, `Gloomfang.pointCost=5`. Это влияет на реальный выбор игрока, не только на описание.

**Исправить:** искать минимальный допустимый недостающий путь в исходном графе от allocated nodes с учётом бесплатных options и платных hubs. Одну и ту же функцию использовать для UI cost и allocation. Проверить Ahn→Gloomfang и Gloomfang→Ahn, а также ограничения choice groups.

### 2. P2 — три исходных ресурсных коэффициента заменены другими

**Строки:** classes 81–82, 397; tests 106 содержит ожидание, закрепляющее неверный INT.

- ES использует `INT * .002`, хотя источник задаёт **1% за 10 INT**, то есть `.001 * INT`.
- Базовая регенерация mana `.0175`, источник `regenerationFractionPerSecond = .018`.
- Evasion использует непрерывный `DEX * .002`, тогда как сохранённая исходная формула `ceil(DEX / 5) / 100`. Например, 14 DEX даёт 2.8% вместо 3%.

**Исправить:** брать коэффициенты из проверенной спецификации; обновить независимые expected values, включая ES Radiant Faith и Escape Artist. Не объявлять passing прежних зеркальных ожиданий проверкой исходных чисел.

### 3. P2 — личные эффекты игрока срабатывают от minions; kills теряют владельца

**Строки:** classes 148–185, 255–343, 347–361; core 78–85, 409–415.

`isMinion` ограничивает только отдельные ветви. Shaper ailments, Assassin crit/elusive/charges, Slayer culling, Champion player on-hit effects, poison history и ряд личных критических модификаторов проходят через общий hook. `classKilled` вообще не получает владельца убийства: «you kill»/«you or your totems kill» нельзя отличить от minion kill. Конкретный probe: Slayer Headsman + minion hit 100 по врагу с 210/1000 HP возвращает **210 damage** вместо обычного minion hit, хотя source говорит «Hit by your Skills». Аналогично player-only poison gear/crit proc доступны minion damage.

**Исправить:** явный actor/owner в hit, ailment и kill context; разделить player, minion, mercenary, totem и persistent ailment. Применять только разрешённые source scope; поддержать явно разрешённые `you or Minions`/`you or Totems`. Для minions не наследовать личные STR/crit/cast-speed/on-hit bonuses; aura bonuses применить отдельно. Контекст владельца должен сохраняться до позднего DoT kill.

### 4. P2 — armour уменьшает DoT, включая ветку Unbreakable, обещающую только Hits

**Строки:** classes 222–230.

Ветка armour не проверяет `hit`: физический bleed уменьшается armour, chaos DoT попадает под 15% armour Unbreakable. В source `53816` явно «Chaos Damage taken **from Hits**». Автор отдельно подтвердил этот дефект; повторный probe не нужен.

**Исправить:** применять armour только к hits, оставив отдельно легальные physical damage reduction modifiers. Проверить physical hit/DoT и chaos hit/DoT при неизменных иных защитах. Координатор сообщил, что item writer затрагивает эту ветку: согласовать единственный фикс.

### 5. P2 — ailment damage наследует уже применённую защиту и повторно умножается на damage taken

**Строки:** classes 284–300, 313–330, 411–414.

Poison/ignite/bleed создаются из `damage` после crit, shock, resistance и других hit-only стадий, а их ticks снова проходят `classHit`. Подтверждено probes:

- Shaper of Flames, одинаковый cold hit 100: при cold resistance 0 igniteDps=93.6; при cold resistance 50% igniteDps=46.8, хотя fire resistance одинаковый. Cold resistance ошибочно снижает будущий fire ignite.
- Physical poison, shock=50%: hit 100→150, poisonDps=45, фактический chaos tick=67.5. Shock применён дважды: ×2.25 вместо одной текущей ×1.5 к DoT.

**Исправить:** сохранять независимую базу ailments до hit mitigation/damage-taken; отдельно применять разрешённые ailment modifiers и однократно target mitigation на tick. Не требуется полный PoE simulator, но исходные проценты не должны удваиваться от порядка функций. Проверить изменение resist/shock после наложения.

### 6. P2 — Jagged Technique не меняет bleeding замороженных/неподвижных врагов

**Строки:** classes 313, 364–371; core 203–209.

Условие `has(Jagged) || enemy.speed > 0` даёт повышенный moving bleed всем обычным врагам с положительной базовой speed. Freeze и фактическое отсутствие перемещения это поле не обнуляют. Probe без Jagged: frozen enemy, `classEnemySpeed=0`, но hit 100 даёт bleedDps=210. Поэтому выбранный notable «Bleeding you inflict is Aggravated» теряет отличающий эффект в основной модели врагов.

**Исправить:** определять действительное перемещение/состояние цели; обычный bleed наносит базовый урон неподвижной цели, aggravated — повышенный независимо от движения. Проверить moving, frozen и стоящего у героя врага с/без notable.

### 7. P2 — исходный dual-wield block Gladiator занижен

**Строки:** classes 198–200.

Код задаёт 15% inherent block и 30% с Determined Survivor. Сохранённый reminder `8419` явно задаёт **20% inherent block**; удвоение должно дать **40%**. Probe с offhand без shield и random=.35 получает 10 damage, хотя 40% block должен остановить hit. Attack-speed doubling отдельно реализован.

**Исправить:** 20%/40%, тестировать граничные броски по source, не только cooldown ratio.

### 8. P2 — Untiring не усиливает собственную регенерацию от prevented damage

**Строки:** classes 126–128; core 672; tests 95.

`regen *= 1.4` выполняется до добавления `prevented * .015`. Поэтому 40% increased Life Regeneration rate не действует на вторую строку того же notable. Probe с 100 prevented damage: прибавка ровно **1.5 HP/s**, должна быть **2.1 HP/s** при единственном +40% rate. Тест 95 закрепляет 1.5.

**Исправить:** собрать базовую regeneration, включая recently-prevented contribution, затем применить regeneration-rate modifiers один раз. Отдельно сохранить life loss Rite of Ruin, это не отрицательная регенерация для масштабирования.

### 9. P2 — часть эффектов «you and nearby Allies» не доведена до союзников

**Строки:** classes 78–81, 127, 167–176, 435–452; core 301–312.

- Radiant Faith даёт armour/ES только `player`; ally path не получает ни reserved-mana armour, ни ES. Probe рядом стоящего ally с 100 HP/0 ES после physical10: 90HP/0ES при активном notable.
- Master of Metal +1000 armour существует только в `classStats(player)`; ally mitigation вообще не читает armour.
- Sanctuary регенерирует только player; allies на Consecrated Ground не восстанавливаются и не получают явно указанное уменьшение curse effect.
- Tailwind на minion cooldown получает также Gale multiplier (`10% increased Effect ... **on you**`), а не базовые 8%; фактическое движение companions не использует Tailwind. Это одновременно утечка player modifier и отсутствующая allied часть.

**Исправить:** общий расчёт живых nearby ally buffs с проверкой расстояния, применяемый к movement/action speed, armour/ES, regeneration и curse handling. Проверить те же параметры при входе/выходе из радиуса. Не выдавать весь player stats object minion как замену этому слою.

### 10. P2 — Sentinel игнорирует даже свой обязательный малый minion-damage node

**Строки:** classes 435–443; source path `4494` включает `40010: Minions deal 10% increased Damage`.

Sentinel атакует константами 24 и 16, минуя `classSkillModifiers` и minion damage. Probe после обычного выбора Radiant Crusade показывает `s.m.minionDamage=.1`, но emitted raw damage остаётся 24/16. Этот малый узел оплачен по настоящему пути, однако не усиливает предоставленного тем же путём Sentinel. Аналогично дальнейшие applicable ally damage buffs не проходят этот emitter.

**Исправить:** отдельный summon damage calculator с исходными minion/ally modifiers; не наследовать личные player effects. Проверить и strike, и burning aura. Для totems также использовать applicable skill stats для фактической cadence: сейчас `ally.shotTimer=.8` не использует рассчитанный spell cooldown.

### 11. P2 — исходные длительности стеков и elemental ailment duration не выполняются

**Строки:** classes 329–338, 388, 409, 459.

- Gathering Winds source: **каждый** Gale Force instance живёт 4 секунды. Код хранит только последний skill time. Probe: 10 stacks в t=0, одно skill use в t=3.9, tick t=4.1 → остаются 10 вместо одного.
- Oath of Winter reminder: Hoarfrost живёт **10 секунд**, новые приложения обновляют duration. Поля expiry нет. Probe: один stack в t=0 остаётся в t=11 без повторного наложения.
- Оплаченный Warden small node `63940` даёт 10% increased Duration of Elemental Ailments; `m.ailmentDuration` читается только для ignite. Shock/scorch/chill/freeze используют фиксированные длительности. Автор также отметил этот недоделанный пункт в handoff.

**Исправить:** timestamps для независимых Gale instances, refreshable Hoarfrost expiry, единый applicable ailment duration multiplier. Не продлевать все существующие stacks последним событием, если source говорит о каждом instance.

### 12. P2 — damage types смешиваются до исходных elemental/chaos эффектов

**Строки:** classes 164, 187–188, 221–224, 289–299.

- Warden class weapon добавляет fire/cold/lightning, но сумма добавляется к единому `damage`, который Kinetic Fusillade помечает physical. Unbound's **100% more Elemental Damage** работает лишь для id bolt/nova и не усиливает элементальные компоненты своей же стартовой атаки Warden. Elemental resistances тоже их не видят.
- Gloomfang вычисляет extra chaos из значения после исходной elemental resistance: при cold100/coldRes50%/chaosRes0 chained hit становится60, хотя компоненты дают cold50 + chaos20=70. Это не сохраняет 20% исходного non-chaos damage как отдельный chaos component.
- Shaper of Flames сначала сворачивает 40% conversion в множитель, затем применяет physical armour ко всему остатку, включая якобы converted fire.

**Исправить:** достаточно компактного damage-by-type объекта, без полного дерева PoE. Применить усиления и сопротивления к своим компонентам; отдельно передать ailment base. Это связано с пунктом5 и лучше исправляется одним pipeline pass, но требует отдельных assertions.

### 13. P2 — Legendary Arms хранит историю unique находок вместо реально экипированных слотов; часть разрешённых слотов недостижима

**Строки:** classes 429, 438; source `25944` и prerequisite `32669`.

`ally.equipment.push` добавляет каждый новый id предмета и никогда не снимает прежний. Последовательные замены оружия героя дают mercenary несколько одновременно «equipped» weapons; все навсегда увеличивают 8%-per-equipped-item multiplier. Mods предметов при этом не читаются mercenary stats. Source разрешает equip unique weapons/shields/quivers, prerequisite — unique amulets; quiver и amulet в обычном loot/UI отсутствуют (подтверждено handoff). Это отдельная проблема выбранного class effect, не ревью чисел legacy uniques.

**Исправить минимально:** slot-based mercenary loadout с заменой предмета, счётчик реально занятых unique slots и применение поддержанных item effects именно владельцу. Добавить достижимые quiver/amulet и mercenary slot flow. Допустимы явно названные **Duskbound** unique предметы с прозрачными адаптированными modifiers, без выдачи их за оригинальные PoE uniques. Не нужно добавлять ещё один неподтверждённый импортированный уник. Для source clauses о mercenary-owned minions либо реализовать минимальный summon данного mercenary с общими buffs, либо согласованно выбрать другой полностью поддерживаемый source-backed путь; простая оговорка не выполняет исходное требование рабочих строк.

## Что проверено без найденного блокирующего расхождения

- Catalog напрямую читает 7 classes, 21 ascendancies, 84 exact source stats; original display/internal Warden mapping сохранён.
- Явный class run стартует с level1 и пустыми allocated/point counters; class-specific life/mana/accuracy и отсутствие автоматического роста attributes видны в коде.
- Trials 90/180/300/420, grant2, max4; tick прекращает combat вне playing, death/win проверяются до очередного trial. Repeated/foreign node и insufficient-point checks есть.
- Autoallocation включает payable small nodes, prerequisite selected notables и granted passive points; проблема1 касается поиска альтернативного пути, а не полного отсутствия path costs.
- Исключение полного PoE skill/mana/XP simulator обоснованно. Оно не оправдывает ошибки оригинальных коэффициентов, actor scopes, inactive statlines и закреплённые source durations.

## Следующий verification scope

Исправить пункты выше единым согласованным владельцем после item handoff. Добавить focused regression checks с независимыми source expectations и отрицательными случаями (minion vs player, hit vs DoT, moving vs frozen, nearby vs distant, time before/after expiry, оба маршрута Reliquarian). Затем запуск targeted suite и общий suite владельцем изменений. Исправления текущего live tree в этом отчёте не проверены: вывод относится только к snapshot.

## Повторное ревью repair wave

**Вердикт: ещё нужны три адресных P2 ниже. Подтверждённых P1 нет.** Проверен новый frozen package `/tmp/duskbound-repaired-review/`, включая core/classes/uniques и новые tests. Прочитаны `docs/duskbound-class-fixes-report.md` и три legacy findings в `docs/duskbound-unique-review.md`. Номера строк этого дополнения относятся **только к новому snapshot**.

Полный suite не перезапускал. Автор сообщает207/207, координатор независимо подтвердил207/207 и21/21 bot wins; это не мои повторные прогоны. Мои targeted probes импортировали именно snapshot в память с checked-in source JSON.

### Что исправлено

| Исходная группа | Результат повторной проверки |
| --- | --- |
| 1. Reliquarian graph | Исправлено: weighted search не проходит сквозь option leaves, блокирует sibling choice, одинаково используется для cost/allocation. Probe Ahn6→Gloom2 тратит ровно8 и содержит реальный узел9258. После этого Shimmeron требует2, поэтому бюджет не обойдён. |
| 2. Resources | Исправлены все три коэффициента; probes дали ES103.2, evasion15.45, mana regeneration1.008 для описанных исходных данных Witch. |
| 3. Ownership | Hit/ailment/kill actor сохранён, minion cull/личные poison/charges изолированы. Probe minion hit100 против210/1000HP вернул100. **Осталась утечка в отдельном projectile hook — R3 ниже.** |
| 4. Armour | Hit guard находится непосредственно перед расчётом armour; physical reductions отделены от armour. Сохранён unique-writer фикс. |
| 5. Ailment base | Cold-resistance/ignite и double-shock исправлены: probe одинакового cold hit при0/50%coldRes дал одинаковый ignite; poison base30 приshock50% дал45. **Не вся применимая offensive information сохранена — R2 ниже.** |
| 6. Bleed | Tick использует actual moving/freeze и aggravated flag; базовый DPS отделён от текущего ×3. Прочитаны положительные/отрицательные regression cases. |
| 7. Dual wield | Исходные20/40% присутствуют в коде, independent threshold cases изолируют малый+3%node. |
| 8. Untiring | Prevented contribution включён до×1.4; life loss Rite отделён от regeneration. Expected2.1 основан на source, прежнее зеркальное1.5 исправлено. |
| 9. Nearby allies | Реальные ally stats/mitigation/movement/heal подключены. Probe Faith рядом снижает loss ниже10, вне радиуса loss=10 и ES снимается. Tailwind союзника не получает player Gale multiplier. |
| 10. Summons | Sentinel emission читает minion/ally modifiers, totem cadence читает skill cooldown. **При actor refactor потерян предусмотренный источник Arcane Surge — R1 ниже.** |
| 11. Durations | Gale хранит individual expiry; Hoarfrost refresh/expiry есть; общий elemental duration multiplier используется для пяти ailments. Прочитаны before/after expiry tests. |
| 12. Components | Warden смешанная атака, Gloomfang pre-resistance extra chaos, incoming Shaper conversion разделены по типам. **Far Shot ailments остаётся неполным — R2.** |
| 13. Mercenary | Slot object заменяет history, копируются текущие разрешённые items, mods влияют на владельца, есть один реально атакующий/повреждаемый owned minion, явно Duskbound quiver/amulet/shield доступны в loot. Прочитаны bounded respawn/slot replacement tests. |
| Три legacy unique P2 | Исправлены соответствующие пути: type/actor назначается до legacy return; общий impact pipeline применяет target armour/resistance; increased total учитывает generic gear/bonus. Независимые probes fire100→70, physical100→62.5 и Nebulis+generic bonus→64.8 прошли. Реальный Spectre kill regression и explicit source-backed Headhunter exception прочитаны в tests/code. |

Уточнение к первоначальной документации стоимости: число11 в исходном source report — union выбранных **сохранённых** путей, не минимум графа. Новый поиск допускает Ahn6→Gloom2→Kaom0→Shimmeron2, всего10, что по-прежнему больше8. Бесплатный option при уже оплаченном hub легален; использовать option как мост для сокращения payable path новый код не разрешает. Это уточнение следует сохранить и в пользовательском описании.

### R1. P2 — Totem Spell Hit больше не выдаёт Arcane Surge

**New snapshot:** classes330, totem emitter517; source notable40510.

Source прямо требует `Gain Arcane Surge when you or your Totems Hit an Enemy with a Spell`. После refactor условие стало `personal && has(40510) && !isAttack`. `actor.kind='totem'` не проходит. Probe обычного Hierophant с40510: cold spell hit с `{kind:'totem',ownerId:'player'}` оставляет `combat.arcaneUntil` отсутствующим. Вместе с Pursuit of Faith это достижимый штатный build; обычный удар тотема не активирует предусмотренный баф, если сам герой сейчас не попадает spell.

**Исправить:** разрешить player и player-owned totem spell hits в trigger40510; minion/mercenary и attack hits должны остаться исключёнными. Проверить сам trigger и последующее увеличение spell damage/cadence, желательно через actual emitted totem projectile.

### R2. P2 — Far Shot усиливает hit, но теряет обещанный бонус к ailments

**New snapshot:** classes338,342,374,380,392,475–479; source notable45313.

Исходная строка явно обещает до30%more `with Hits and Ailments`. Travel multiplier записывается в локальный `offensive`, тогда как ailmentBase копируется из pieces до него; в delayed context остаются только type/prepared/actor. Поэтому neither snapshot nor later tick получает Far Shot distance. Probe Deadeye45313 с гарантированным poison: travel0/600 даёт hit100/130, но **poisonDps30/30**. При отсутствии target mitigation для600 ожидается39. Дефект также затрагивает остальные накладываемые projectile ailments.

**Исправить:** сохранить применимый к ailments Far Shot multiplier от originating projectile в ailment snapshot/context и применить один раз. Не переносить туда target resistance/shock и hit-only modifiers — уже исправленную double-dipping проблему нельзя вернуть. Добавить0/intermediate/600 distance и delayed tick после исчезновения originating projectile.

### R3. P2 — Shrapnel Specialist продолжает изменять minion projectiles

**New snapshot:** classes438–441; core324–327; source notable57175.

`classProjectile` проверяет только classState/hostile и без проверки actor задаёт random direction и return шанс любому дружественному снаряду. Теперь `skillStats` корректно создаёт minion actor, но отдельный hook его игнорирует. Probe Saboteur57175: minion projectile `(vx=500,vy=0)` превращается в `(42.49987855267359,498.19048598202676)` и получает `canReturn=true`. Таким образом Raise Spectre по-прежнему наследует личное projectile свойство игрока, хотя весь repair3 обещает разделить этих владельцев.

**Исправить:** использовать единый actor scope и в projectile hook; применить исходные player/proxy skill modifiers к допустимому владельцу, не к minion/mercenary. Проверить настоящий Spectre projectile: сохранение направления, отсутствие return и отсутствие terrain-chain наследования; отдельно player projectile должен сохранить50%return/random direction.

После этих трёх исправлений нужен короткий focused повтор проверки соответствующих отрицательных/положительных веток. Новый полный suite здесь не запускался; заключение не является финальным approval всего UI/игры.

## Финальная адресная проверка R1–R3

**APPROVED в проверенном scope: R1, R2 и R3 закрыты. Новых P1/P2 в этих трёх изменениях не выявлено.** Финальный объект — frozen `/tmp/duskbound-repaired-212/`; это заключение заменяет предыдущий отрицательный вердикт именно для R1–R3. Whole-branch/UI acceptance остаётся отдельной проверкой координатора.

Прочитаны diff относительно предыдущего frozen package, исходные40510/45313/57175, пять добавленных regression tests и re-review addendum автора. Дополнительно независимо выполнил probes на финальных frozen modules:

- **R1:**12 сочетаний player/totem/minion/mercenary × spell/attack/DoT. Arcane Surge получает игрок только после player/totem spell hit; остальные сочетания не срабатывают. Source-specific more Spell Damage ветка отдельно ограничена игроком; её positive/negative assertions прочитаны в regression tests.
- **R2:** travel0/300/600/1200 сохраняет poison DPS30/34.5/39/39. Затем реально вызван `classTick` с обработкой emitted poison event через `classHit`: shock50% применяется один раз; искусственно оставленные projectile/travel metadata в prepared event не повторяют Far Shot. Все численные assertions прошли.
- **R3:** minion и mercenary projectile сохраняют500/0, не получают canReturn и не расходуют RNG hook. Player projectile сохраняет speed500, меняет направление и получает return при выбранном seeded броске. Assertions прошли.

Полный suite, bots и browser повторно не запускал;212/212 и161/161 — данные автора из его отчёта. В этом проходе изменён только данный review report.

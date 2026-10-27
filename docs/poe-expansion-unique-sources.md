# Duskbound: 12 дополнительных unique из PoE 1

Исследование выполнено 27 октября 2026 года. Прочитаны текущие обычные карточки PoE Wiki и указанные ниже разделы Mechanics/Interactions/Version history. Числа ниже относятся к обычным актуальным вариантам, без Replica, Foulborn, corruption, legacy и Ruthless. Permanent links фиксируют прочитанную редакцию Wiki, а не версию игры. Медиа не скачивались. Production code и тесты этим исследованием не менялись.

Предложение расширяет уже существующие Dying Sun, Nebulis, Cloak of Flame, Headhunter и Death Rush. В исходных строках сохранён английский текст, чтобы будущая реализация и тестовые ожидания имели независимый источник. Перенос радиусов, базовых защит, уровней и чисел урона в масштаб survivor требует явно обозначенной адаптации.

## Возможности и ограничения текущего движка

Проверены `games/duskbound/uniques.mjs`, `classes.mjs` и `core.mjs`:

- Уже есть armour, evasion, ES, сопротивления, attack block, physical/fire/cold/lightning/chaos damage, разделение hit/DoT, critical, ailments, leech, frenzy/power/endurance charges, принадлежность урона player/totem/minion, kill hook и corpses.
- `classIncomingDamage` имеет одну точку успешного block, но не обрабатывает gear spell block. Поддержка запрета attack block и восстановления ES по block отсутствует. Chaos maximum в `classStats` пока жёстко ограничен 75%; это существенно для Saffell.
- `classKilled` создаёт corpse с координатами и временем, без owner/curses. Несколько ascendancy explosions пишут в одну переменную; последующее присваивание может затереть предыдущее. Они вызывают damage с `isDot:true`. Это нельзя без изменений переиспользовать для настоящего explosion hit: будут потеряны крит, ailments и часть on-hit правил.
- Состояния shock/ignite/chill/freeze/bleed/poison уже есть. Полная атрибуция источника присутствует не у всех ailments; Yoke требует её. Предметные chances/effects для ignite/shock и spell/elemental/attack damage не все подключены к соответствующим формулам.
- Имеются слоты helmet/shield/offhand/quiver/amulet, общий ring, но нет gloves и boots. Для двух последних понадобится расширить equipment, loot, UI и сравнение предметов. Для Terminus Est нужно учесть two-handed, сейчас shield/offhand исключают только друг друга.
- В классовом режиме fire hit автоматически поджигает игрока. Это существующее упрощение, не доказательство того, что Eye of Innocence в оригинале сам гарантирует self-ignite.
- У выбранных 12 нет свойства «Chaos Damage does not bypass Energy Shield», поэтому отдельный chaos-bypass механизм этим пулом не требуется. Текущий входящий урон списывается из ES независимо от типа — это обнаруженное ограничение существующей модели, не повод приписывать selected uniques свойство Shavronne's Wrappings.
- Успешный block сейчас задаёт `blockUntil`, а `classActionSpeed` на это время возвращает 0. Aegis/Saffell не содержат stun immunity: их перенос не должен случайно отключать существующий block recovery/action lock. Точный PoE stun/block-stun расчёт здесь отдельно не исследовался.

## 1. Aegis Aurora — shield: armour превращается в ES при block

[Карточка](https://www.poewiki.net/wiki/Aegis_Aurora) · [прочитанная редакция 1674825](https://www.poewiki.net/index.php?title=Aegis_Aurora&oldid=1674825).

Champion Kite Shield; required level 62. На карточке 32% block, уже с учётом explicit +6%; нельзя прибавлять его второй раз.

```text
(300-400)% increased Armour and Energy Shield
+10% to all Elemental Resistances
+5% to maximum Cold Resistance
+6% Chance to Block
Recover Energy Shield equal to 2% of Armour when you Block
(10-20)% increased Elemental Damage with Attack Skills
```

Это local increased для защиты самого щита, не умножение всей брони персонажа.

**Механика.** Recover ES на 2% текущей брони при успешном block — мгновенная recovery; Energy Shield Recovery Rate не усиливает эту мгновенную величину. Результат ограничен недостающим ES. Нужны одновременно armour, запас ES и шанс блока; щит не создаёт ES сверх максимума.

**Build hook.** Гибридный block/armour/ES персонаж; cold cap дополнительно сочетается с Nebulis. Не заменять восстановление плоской регенерацией или снижением урона.

**Перенос.** Hook в успешный block до `return 0`, фактическая броня из `classStats`, ES capped. Учесть attack и spell blocks, если они доступны от других источников. На исходном Aegis нет 4% recovery: это legacy до 1.1.0. Foulborn «Damage cannot be Reflected» исключён.

## 2. Saffell's Frame — shield: защита от spells ценой attack block

[Карточка](https://www.poewiki.net/wiki/Saffell%27s_Frame) · [редакция 1674981](https://www.poewiki.net/index.php?title=Saffell%27s_Frame&oldid=1674981).

Branded Kite Shield; level 59. Implicit и explicit различаются:

```text
+4% to all Elemental Resistances [implicit]
(20-30)% Chance to Block Spell Damage
(20-30)% increased Spell Damage
+(20-30)% to all Elemental Resistances
+4% to all maximum Resistances
Cannot Block Attack Damage
```

**Механика.** Максимум всех сопротивлений включает chaos; ordinary elemental resistance не даёт chaos resistance. Запрет attack block действует независимо от других источников attack block; базовые 24% block на карточке не отменяют этот запрет.

**Build hook.** Кастер, который переживает spells и elemental bosses, но теряет блок melee/ranged attacks. Максимумы сочетаются с Nebulis; фактические capped resistances ещё надо набрать.

**Перенос.** Нужны отдельные `spellBlock`, `cannotBlockAttacks`, `maxChaosResistance`, spell-only increased. Сейчас `classIncomingDamage` складывает некоторые ascendancy blocks после исходного значения; запрет должен примениться к итоговому шансу, а не обнулять только щит. Foulborn scaling ES от chaos resistance и старые +5% max не брать.

## 3. Inpulsa's Broken Heart — body: убитые shocked враги взрываются

[Карточка](https://www.poewiki.net/wiki/Inpulsa%27s_Broken_Heart) · [редакция 1674919](https://www.poewiki.net/index.php?title=Inpulsa%27s_Broken_Heart&oldid=1674919).

Sadist Garb; level 68.

```text
+(60-80) to maximum Life
(20-50)% increased Damage if you have Shocked an Enemy Recently
(15-25)% increased Effect of Shock
Shocked Enemies you Kill Explode, dealing 5% of
their Life as Lightning Damage which cannot Shock
Unaffected by Shock
```

**Механика.** Recently = последние 4 секунды. Explosion — lightning secondary damage, является hit, имеет base radius 2.2 m, base crit 0, масштабируется global/lightning/elemental/area damage и AoE; урон не отражается. Может накладывать другие ailments, но именно shock запрещён. Поэтому самостоятельная цепная shock-propagation от этих взрывов не гарантирована. «Unaffected» следует моделировать отдельно от невозможности получить shock: состояние может существовать без его штрафа.

**Build hook.** Shock специализация, уничтожающая плотные пачки; Warden/Elementalist и Yoke. Для запуска нужен реальный shock на убитом, а не просто lightning damage.

**Перенос.** Kill check активного shock + personal kill, explosion context с запретом shock и отражения; отдельный timestamp последнего наложения shock. Радиус в игровых координатах — адаптация. Legacy explosion 5-10% и shock effect25-40% исключены. Foulborn Purity reservation исключена.

## 4. Daresso's Defiance — body: заряды защиты меняются на усиленный Onslaught

[Карточка](https://www.poewiki.net/wiki/Daresso%27s_Defiance) · [редакция 1550084](https://www.poewiki.net/index.php?title=Daresso%27s_Defiance&oldid=1550084).

Full Dragonscale; level 63.

```text
(180-220)% increased Armour and Evasion
+(60-90) to maximum Life
2% of Attack Damage Leeched as Life
You lose all Endurance Charges when Hit
You gain an Endurance Charge on Kill
You gain Onslaught for 5 seconds per Endurance Charge when Hit
100% increased Effect of Onslaught on you
```

**Механика.** Длительность считается по текущему количеству endurance charges в момент hit, включая minimum/effective-count взаимодействия, а не по числу действительно потерянных зарядов. Trigger gems и Unflinching получают приоритет до модификаторов Daresso. Onslaught — non-stackable, базовые 20% increased attack/cast/movement speed; только собственные 100% effect Daresso дают по 40% increased этих скоростей. Повторное получение Onslaught может обновлять длительность; это не ограничение Adrenaline.

**Build hook.** Убийства копят защиту; полученный hit превращает её в темп. Хорошая пара для endurance-варианта Ralakesh. Требование Attack Damage leech не усиливает чистый spell/DoT.

**Перенос.** Настоящее событие hit, не tick DoT; snapshot количества до потери; порядок с Juggernaut; timed Onslaught. Armour/Evasion modifier local. Текущий leech — весь Attack Damage, не только physical (3.26.0); старые0.4-0.6%, dodge и Onslaught2s не брать.

## 5. Crown of Eyes — helmet: spell increased усиливает attacks

[Карточка](https://www.poewiki.net/wiki/Crown_of_Eyes) · [редакция 1674324](https://www.poewiki.net/index.php?title=Crown_of_Eyes&oldid=1674324).

Hubris Circlet; level 69.

```text
+(300-350) to Accuracy Rating
(120-150)% increased Energy Shield
-30% to Fire Resistance
(0.4-0.8)% of Attack Damage Leeched as Life
(0.2-0.4)% of Attack Damage Leeched as Mana
Attacks have 150% Arcane Might
```

**Механика.** В 3.29.0 введено текущее название Arcane Might без функционального изменения: increased/reduced Spell Damage применяется к Attack Damage в150% своей величины. Пример: 10% increased Spell Damage →15% increased Attack Damage. More/less Spell Damage и flat «Damage to Spells» не переносятся. Несколько источников Arcane Might не суммируются: берётся наибольший. Общий increased Damage не должен примениться дважды.

**Build hook.** Кастерские источники increased превращаются в атакующую сборку; Saffell/Obliteration могут быть источниками Spell Damage. Цена — fire resistance и необходимость атаковать.

**Перенос.** Нужен отдельный spellDamage increase, корректное преобразование его в attack increase, mana leech и сохранение отрицательного fire modifier. Local ES усиливает сам helmet, не весь ES. Нельзя заменить эффект общим +150% damage. Не путать со старым100% Arcane Might.

## 6. Yoke of Suffering — amulet: разнообразие ailments увеличивает входящий урон

[Карточка](https://www.poewiki.net/wiki/Yoke_of_Suffering) · [редакция 1550600](https://www.poewiki.net/index.php?title=Yoke_of_Suffering&oldid=1550600).

Onyx Amulet; level70.

```text
+(10-16) to all Attributes [implicit]
+(10-20)% to Fire Resistance
+(10-20)% to Cold Resistance
+(20-40)% to Lightning Resistance
30% reduced Duration of Ailments on Enemies
(5-10)% chance to Shock
Enemies take (5-10)% increased Damage for each type of Ailment you have inflicted on them
Your Elemental Damage can Shock
```

**Механика.** Fire/cold damage теперь тоже может создать shock, но требуется chance to shock либо critical; «can» не означает100%. Считаются различные активные типы ailments, не количество poison stacks. В оригинале9 типов: ignite/chill/freeze/shock/scorch/brittle/sap/bleed/poison. Для строки «you have inflicted» подходят собственные и proxy skills, не ailments от minions; имеются дополнительные исключения indirect grounds, перечисленные в Wiki. Бонус — increased damage taken на цели, а не increased damage героя.

**Build hook.** Rainbow ailments, а не один тип урона. Есть полезная конкуренция: больше дебаффов, но они короче. Сочетается с Inpulsa и Berek.

**Перенос.** Подсчёт поддерживаемых типов с owner/actor, проверка актуальной длительности, включение fire/cold в shock eligibility, additive damage-taken стадия. Новые brittle/sap не обязательны для первой адаптации; не заявлять поддержку всех9, если реализованы6-7. Текущий roll5-10% за тип; фиксированные5% — legacy до3.24.0.

## 7. Eye of Innocence — amulet: self-hit при ignite

[Карточка](https://www.poewiki.net/wiki/Eye_of_Innocence) · [редакция 1598134](https://www.poewiki.net/index.php?title=Eye_of_Innocence&oldid=1598134).

Citrine Amulet; level68.

```text
+(16-24) to Strength and Dexterity [implicit]
10% chance to Ignite
(50-70)% increased Damage while Ignited
Take 100 Fire Damage when you Ignite an Enemy
2% of Fire Damage Leeched as Life while Ignited
```

**Механика.** On-ignite вызывает fire self-hit100 до соответствующей mitigation. Он запускает on-hit эффекты вроде Unflinching, но его нельзя block: Aegis recovery не срабатывает. «While Ignited» требует ignite на самом игроке, а не на цели; предмет не содержит отдельной гарантии self-ignite. Это принципиальная граница двух условий.

**Build hook.** Осмысленный риск: частые ignite питают hit-based механики, но требуют fire resistance/recovery и отдельного способа поддерживать self-ignite для наступательных бонусов.

**Перенос.** Контекст self-hit с `cannotBlock` и запретом случайной рекурсии; не пропускать через melee reflect по случайной цели. Damage/leech условно от player ignite; leech только fire. Сырые100 весьма опасны при базовом здоровье survivor — изменение числа надо пометить адаптацией, а не выдавать за оригинал. Текущий автоматический self-ignite от fire hit в Duskbound тоже надо явно учитывать как локальное упрощение.

## 8. Berek's Respite — ring: перенос существующего ignite/shock после kill

[Карточка](https://www.poewiki.net/wiki/Berek%27s_Respite) · [редакция 1702813](https://www.poewiki.net/index.php?title=Berek%27s_Respite&oldid=1702813).

Two-Stone Ring (fire/lightning); level20.

```text
+(12-16)% to Fire and Lightning Resistances [implicit]
Adds (20-25) to (30-50) Fire Damage to Spells and Attacks
(25-30)% increased Lightning Damage
+(30-40) to maximum Mana
When you Kill a Shocked Enemy, inflict an equivalent Shock on each nearby Enemy
When you Kill an Ignited Enemy, inflict an equivalent Ignite on each nearby Enemy
```

**Механика.** Диапазон2m, не масштабируется area modifiers. Equivalent означает ту же силу/DPS и **оставшуюся** длительность, не полный новый timer. Это наложение ailments на каждого соседа, не explosion и не постоянно действующая aura proliferation. Работает с «when you Ignite/Shock» эффектами. Большинство explosions предотвращает spread; специфическое сочетание с Inpulsa/Obliteration нельзя считать работающим по умолчанию. Wiki отдельно отмечает особую player attribution ignite kills от proxies/minions.

**Build hook.** Одна сильная ignite переносится через плотную пачку; поддерживает self-hit Eye при каждом перенесённом ignite. Отличается от Inpulsa тем, что сохраняет ailment вместо расчёта damage от жизни трупа.

**Перенос.** Snapshot source ailment/DPS/remaining duration + bounded spread по alive nearby; не изменять DPS повторным применением damage increased. Развести «наложил ailment» и «нанёс hit», согласовать порядок explosion/corpse destruction. Конкретное правило сочетания всех explosion источников остаётся отдельной интеграционной задачей. Foulborn explode вместо shock-spread исключён.

## 9. Obliteration — weapon: extra chaos и вероятностные chaos explosions

[Карточка](https://www.poewiki.net/wiki/Obliteration) · [редакция 1702294](https://www.poewiki.net/index.php?title=Obliteration&oldid=1702294).

**Текущая база Omen Wand**, level53. Implicit базы и два explicit:

```text
(27-31)% increased Spell Damage [implicit]
Gain (30-40)% of Physical Damage as Extra Chaos Damage
Enemies you Kill have a 20% chance to Explode, dealing a quarter of their maximum Life as Chaos Damage
```

**Механика.** Chance одинакового explosion modifier складывается с Profane Bloom/Unspeakable Gifts, размер explosion остаётся25%, не складывается. Wiki даёт пример: Profane Bloom50% + две Obliteration20%+20% =90% по cursed personal kill. Условие Obliteration не включает minion kills. Extra chaos берётся из physical damage до target resistance, это gain-as-extra, а не conversion.

**Build hook.** Physical → chaos/poison и зачистка packs. Occultist повышает надёжность explosions, Crown переиспользует spell implicit для attack.

**Перенос.** В `classHit` уже есть пример extra chaos до resistance; не копировать post-mitigation damage. При суммировании одного explosion вида не выполнять несколько независимых damage взрывов и не перезаписывать случайно другой kind. Для оружия нужен base/local/global слой. Старые Demon's Horn/Imbued Wand, added physical25-50→85-125 и extra chaos13-15% исключены.

## 10. Terminus Est — two-handed weapon: frenzy charges на crit, в том числе на boss

[Карточка](https://www.poewiki.net/wiki/Terminus_Est) · [редакция 1497031](https://www.poewiki.net/index.php?title=Terminus_Est&oldid=1497031).

Tiger Sword; level51.

```text
+360 to Accuracy Rating [implicit]
(180-220)% increased Physical Damage
20% increased Attack Speed
(50-75)% increased Critical Strike Chance
Gain 10 Mana per Enemy Killed
10% increased Movement Speed
Gain a Frenzy Charge on Critical Strike
```

**Механика.** Crit создаёт charge без требования kill, поэтому работает против одиночной живой цели. Physical Damage / Attack Speed / crit chance на таком оружии — local weapon modifiers; нельзя механически трактовать их как global бонусы всех skills. На карточке итоговые APS1.68 и crit7.50-8.75%; это уже с local модификаторами.

**Build hook.** Attack/crit персонаж с устойчивыми frenzy на boss, противоположность on-kill ring. Mana-on-kill помогает в пачках, но не даёт такой recovery в одиночной фазе.

**Перенос.** Добавить on-critical frenzy с существующим cap/expiry, не подменять шансом frenzy-on-kill. Существующий `critical` вычисляется в `classHit`, но local weapon attack model и запрет shield/offhand при two-handed ещё нужны. Если действие local параметров упрощается до отдельного attack skill, это явно адаптация. Старые220-260% physical исключены.

## 11. Asenath's Gentle Touch — gloves: cursed corpses образуют зоны blind/explosion

[Карточка](https://www.poewiki.net/wiki/Asenath%27s_Gentle_Touch) · [редакция 1702217](https://www.poewiki.net/index.php?title=Asenath%27s_Gentle_Touch&oldid=1702217).

Silk Gloves; level25, drop level75.

```text
+(20-30) to Intelligence
+(60-80) to maximum Life
+(60-80) to maximum Mana
Curse Enemies with Temporal Chains on Hit
Non-Aura Curses you inflict are not removed from Dying Enemies
Enemies near corpses affected by your Curses are Blinded
Enemies Killed near corpses affected by your Curses explode, dealing
3% of their Life as Physical Damage
```

**Механика.** Curse-on-hit имеет значения уровня1 Temporal Chains; сейчас нет старого «40% increased Effect». Explosion требует смерти около **уже существующего cursed corpse**, а не просто любого cursed kill. Нужны сохранение non-aura curse на corpse и proximity. Source строка не требует, чтобы погибший сосед был cursed или лично убит игроком: не добавлять такое ограничение без отдельной проверки.

**Build hook.** Зачистка строится от первого cursed corpse; зона blind и subsequent kill explosions формирует пространственную тактику. Отличается от Obliteration (случайный25% chaos на personal kill) и Inpulsa (5% lightning по shocked).

**Перенос.** Новый gloves slot; corpses хранят curse owner/type; настоящий Temporal Chains debuff отдельно от текущего универсального `enemy.cursed` slow. Нужны решение масштаба proximity и корректные slow/expiry clocks. Исходные величины Temporal Chains дополнительно проверены в приложении ниже; исходное исследование предмета само по себе не подтверждает готовность runtime. Foulborn Punishment исключён.

## 12. Ralakesh's Impatience — boots: максимум одного выбранного типа charge без создания charges

[Карточка](https://www.poewiki.net/wiki/Ralakesh%27s_Impatience) · [редакция 1674049](https://www.poewiki.net/index.php?title=Ralakesh%27s_Impatience&oldid=1674049).

Riveted Boots; level36.

```text
+(15-25)% to Cold Resistance
+(15-25)% to Chaos Resistance
(15-25)% increased Movement Speed
Corrupted Blood cannot be inflicted on you
<one random charge modifier>
```

Ровно одна из трёх строк:

```text
Count as having maximum number of Endurance Charges
Count as having maximum number of Frenzy Charges
Count as having maximum number of Power Charges
```

**Механика.** Даёт stats и «while at maximum» условие выбранного charge типа, но **не создаёт actual charges**. Тратить можно только фактически накопленные; gain/loss и «when you reach maximum» работают по actual state. Случайный выбор одного типа введён3.26.0. Тройной максимум — legacy, даже если он известнее. Corrupted Blood immunity не означает bleed immunity.

**Build hook.** Три различимых варианта лута: постоянные frenzy bonuses, power crit или endurance defence. Endurance-вариант сохраняет effective defence при потере actual charges с Daresso и влияет на его Onslaught duration, как прямо отмечено в Interactions Wiki.

**Перенос.** Новый boots slot, одно поле `countsAsMaximumChargeType`; общая функция effectiveChargeCount для stats/conditions, actual counters для gain/spend/expire/events. Нельзя присвоить `b.frenzy=b.power=b.endurance=max`: появятся лишние resources и события. Corrupted Blood отдельно от имеющегося bleed; без такого источника вреда immunity может быть честно неактивным свойством, а не скрытым bleed immunity.

## Дополнительные прочитанные определения

- [Arcane might, редакция1702775](https://www.poewiki.net/index.php?title=Arcane_might&oldid=1702775): ratio, increased/reduced only, highest source, исключение flat spell damage и more/less; keyword с3.29.0.
- [Onslaught, редакция1493254](https://www.poewiki.net/index.php?title=Onslaught&oldid=1493254):20% increased attack/cast/movement, non-stackable, increased effect и refresh; Ruthless вариант без movement не использован.
- [Recently, редакция1397426](https://www.poewiki.net/index.php?title=Recently&oldid=1397426):4 секунды.

## Приоритеты реализации и проверки

Ближе всего к существующим hooks: Aegis, Saffell, Inpulsa, Obliteration, Daresso. Следом Berek/Yoke после выравнивания ailment ownership и explosion contexts. Crown требует отдельного spell increased/local weapon слоя; Terminus — two-handed правил. Eye требует корректного self-hit и осторожного численного масштаба. Asenath/Ralakesh добавляют слоты и richer corpse/effective-charge state.

Независимые проверки, существенные для этого пула:

- Block восстанавливает ES только Aegis, не DoT и не unblockable Eye; ES не превышает максимум. Saffell блокирует spells, attack block запрещён даже с ascendancy.
- Inpulsa без shock не взрывает; его explosion не создаёт shock; death actor minion не подменяет personal kill.
- Daresso snapshot charges до потери; DoT не запускает hit; усиленный Onslaught даёт скорости только пока активен.
- Yoke считает типы только активных принадлежащих источнику ailments; несколько poison stacks дают один тип; cold/fire shock всё ещё требует шанс/crit.
- Berek копирует оставшееся время и силу, не полный timer и не пересчитанный damage; radius не растёт от AoE. Порядок с corpse destruction проверяется отдельно.
- Obliteration складывает chance одноимённого explosion, не его величину; minion kill не получает личный explosion случайно.
- Crown не переносит more/less или flat spell-only damage, не применяет generic increased повторно; local weapon modifiers Terminus не превращаются в global.
- Asenath не взрывает первый изолированный cursed corpse без предыдущего подходящего corpse; его blind/explode сохраняются только при наличии нужной corpse зоны.
- Ralakesh даёт только один type, не меняет actual charge counters, не снабжает расходуемыми ресурсами и не запускает reached-maximum event экипировкой.

Это список рисков для будущей реализации, не отчёт о запущенных тестах. Полный item acquisition и полная эмуляция PoE не входят в задачу; один current boss restriction Yoke подтверждён карточкой (Nightmare of the Unbreakable), но таблица дропа Duskbound должна быть обозначена собственным дизайном.

## Допроверка Temporal Chains для Asenath: level 1, default effect, expiry

Повторно прочитано 27 октября 2026 года, при начале реализации. Ниже фактура для runtime, без изменений игровой модели.

Источники:

- [Temporal Chains](https://www.poewiki.net/wiki/Temporal_Chains), [редакция 1681627](https://www.poewiki.net/index.php?title=Temporal_Chains&oldid=1681627): текущая карточка, Skill functions and interactions, таблица level progression, Version history.
- [Curse](https://www.poewiki.net/wiki/Curse), [редакция 1675786](https://www.poewiki.net/index.php?title=Curse&oldid=1675786): default debuffs, non-skill on-hit, curse effect, curse limit и отмена общей boss penalty.
- [Expiration rate](https://www.poewiki.net/wiki/Expiration_rate), [редакция 1673449](https://www.poewiki.net/index.php?title=Expiration_rate&oldid=1673449): формулы rate и effective duration, global cap.
- [Asenath's Gentle Touch](https://www.poewiki.net/wiki/Asenath%27s_Gentle_Touch), [редакция 1702217](https://www.poewiki.net/index.php?title=Asenath%27s_Gentle_Touch&oldid=1702217): on-hit debuff имеет values equivalent to level 1 Temporal Chains; 40% increased Effect убраны в 3.20.0.

### Базовые значения

| Свойство | Текущее значение при level 1 / default effect |
|---|---:|
| Собственная base duration Temporal Chains | 5.00 секунд |
| Normal/Magic: less Action Speed | 15% |
| Rare/Unique: less Action Speed | 9% |
| Other effects expire slower | 25% |
| Against Players | 50% less Effect of Curse |
| Quality у default non-skill curse | Эквивалент skill level 1 без quality |

В level 20 соответствующие slow — 29% / 18%; эти значения **не** относятся к Asenath. Текущая gem-card base duration level 20 — 8.80 секунды; старое краткое описание в Version history «5-8» не заменяет текущую карточку. Для Asenath нужна базовая длительность 5 секунд, без добавления gem quality. В общем описании Curse прямо сказано: default curse values эквивалентны level 1 curse skill **without quality**; on-hit modifier накладывает debuff, а не создаёт прокачиваемый gem или cast.

У Temporal Chains gem quality 1–20% сейчас даёт 1–20% **increased Curse Duration**. Это не increased effect и не встроенные +20% duration у Asenath. Поддержки, +gem levels или quality лежащего в перчатках gem автоматически не усиливают non-skill on-hit curse.

### Curse effect и action speed

Пусть `C` — итоговый множитель применимого curse effect. Без добавочных more/less: `C = 1 + increasedCurseEffect - reducedCurseEffect`. Отдельные more/less curse-effect modifiers перемножаются. Для базового монстра без иных свойств `C = 1`.

```text
tcActionSlow = min(0.75, baseSlow * C)
baseSlow = 0.15 for Normal/Magic; 0.09 for Rare/Unique
tcActionSpeedMultiplier = 1 - tcActionSlow
```

При `C=1` это `0.85` action speed у normal/magic и `0.91` у rare/unique. Ограничение 75% local: касается именно Temporal Chains, не общей суммы всех эффектов скорости. Нельзя складывать TC и chill в одно число slow; в Version history Temporal Chains 2.0.2 явно указан multiplicative stacking с chill. Например, normal target с TC 15% и chill 25% имеет множитель `0.85 * 0.75 = 0.6375`, если нет иных ограничений.

Action speed влияет на темп действий, включая движение и атаки/касты; это не только movement slow. Cooldown recovery — отдельная механика: нельзя автоматически менять независимый cooldown recovery timer только потому, что изменился action speed. Подстройка survivor attack cadence возможна, но её необходимо отличать от всех cooldowns оригинала.

Generic `increased Effect of your Curses` применим к default on-hit curse. **Curse-specific** строка вроде `increased Temporal Chains Curse Effect` по текущей странице Curse относится к соответствующему curse **skill**, не к non-skill on-hit modifier. В Wiki дано это правило на примере Frostbite. При ограниченном наборе generic пассивов движка достаточно generic множителя; не расширять автоматически его семантику до skill-only источников.

У map/pinnacle bosses с 3.20.0 убрана старая общая penalty 33%/66% less curse effect. Для базового unique target уже применяется отдельная строка Temporal Chains 9%; не умножать её повторно на исторические boss penalties. Конкретные modifiers отдельного врага, hexproof/immunity и action-speed floors требуют своих условий. Hexproof target может считаться cursed без применения debuff stats; Immune to Curses не получает curse.

`50% less Effect of Curse against Players` не относится к монстрам. Temporal Chains Version history 3.20.0 отдельно фиксирует прежний баг, когда non-skill curse-on-hit ошибочно применял эту penalty ко всем target. Для игрока эта penalty умножает эффекты на 0.5; на baseline self-curse slower expiry получается 12.5%.

### Other effects: live clocks, не изменение DPS

```text
tcSlowerExpiry = min(0.75, 0.25 * C)
expirationRate = max(0.25, 1 + sum(fasterExpiry) - sum(slowerExpiry))
effectiveDuration = durationBeforeExpiryRate / expirationRate
```

Все доли в этих формулах записаны десятичными значениями. Slower/faster источники суммируются на rate стадии; общий slower-expiry cap 75% глобальный для всех таких источников. Базовые 25% slower дают rate `0.75` и эффективную длительность `1 / 0.75 = 4/3`, то есть +33⅓%, **не** +25%. На cap rate `0.25` получаем `4x` duration (+300%).

Curse effect усиливает 25% slower expiry, но это отдельная от action speed строка. Уникальность цели сама по себе не заменяет её на 9%: rarity меняет только указанную строку action slow. Например, `C=2` даёт 50% slower expiry и `2x` duration для других effects, независимо от того, normal это или unique.

**Temporal Chains не замедляет собственную duration.** Его baseline curse timer истекает за 5 реальных секунд, если нет отдельно применимых duration/expiry modifiers. Для обычного curse skill собственная длительность и её increased/reduced/more/less duration modifiers считаются отдельно от curse effect. Skill-only duration/support modifiers нельзя автоматически переносить на non-skill Asenath; полный список допустимых duration modifiers этого on-hit debuff отдельно не установлен настоящей проверкой.

Для runtime важно считать **живое** течение времени эффекта, пока TC действует. Не присваивать каждому ailment навсегда `duration *= 4/3` при наложении. Если TC появился позже, сохранившийся timer начинает убывать медленнее; при снятии/истечении TC снова идёт обычным темпом. При использовании абсолютного `until` вместо remaining-time clock можно сдвигать его вперёд на `dt * (1 - expirationRate)` только за время активного TC; учитывать пересечение границы его expiry внутри frame. Не сдвигать `Temporal Chains.until` самим же TC.

Ignite/bleed/poison и другие duration effects истекают медленнее без снижения их DPS. Поэтому увеличивается итоговый damage одного damaging ailment; число одновременно живущих poison stacks тоже может вырасти. Это не произвольное увеличение силы текущего shock/ignite. Страница также включает debuffs/Brands и некоторые recovery buffs; recoup и фиксированная over-time recovery из перечисленных item sources не затрагиваются. Если survivor переносит только ailments, ограничение надо обозначить явно.

Проверочные примеры с `C=1`, без других modifiers:

- 4 секунды remaining ignite под TC всё время → 5⅓ реальных секунды, DPS прежний.
- 4 секунды ignite: 2 секунды без TC оставляют 2 секунды; затем TC до конца → ещё 2⅔ секунды. Всего 4⅔, а не 5⅓.
- 4 секунды ignite: первые 2 секунды под TC расходуют 1.5 секунды remaining; TC снят → ещё 2.5 реальные секунды. Всего 4.5 секунды.
- Normal и unique при одинаковом `C=1`: различный action-speed multiplier `0.85/0.91`, одинаковый expiry rate `0.75`.
- При `C=4`: slower expiry capped 75%, action slow normal 60%, unique 36%; cap expiry не означает cap action slow.

Первые четыре строки таблицы основаны непосредственно на текущей карточке Temporal Chains и level progression, default/no-quality — на совместном чтении Asenath и Curse. Арифметические примеры вычислены из опубликованной формулы Expiration rate; игровые проверки runtime этим дополнением не выполнялись.

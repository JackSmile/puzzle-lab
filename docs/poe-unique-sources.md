# Узнаваемые уникальные предметы PoE 1: проверенные эффекты

Прочитано 27 октября 2026 года. Использованы текущие карточки обычных предметов на PoE Wiki, их разделы Mechanics/Modifiers и Version history. Legacy, Foulborn, Replica и Ruthless не смешаны с текущими обычными вариантами. Revision ID — версия страницы Wiki, а не номер версии игры. Медиа не скачивались.

Все исходные строки модификаторов, диапазоны, длительности, правила и ссылки сохранены в `games/duskbound/data/poe-unique-source.json`. Ниже — существенные детали для реализации; это исследование, не заявление о готовых игровых эффектах.

## Headhunter

[Текущая карточка](https://www.poewiki.net/wiki/Headhunter) · [редакция 1674910](https://www.poewiki.net/index.php?title=Headhunter&oldid=1674910).

Leather Belt, требуемый уровень 40. Implicit: `+(25-40) to maximum Life`. Explicit:

- `+(40-55) to Strength`
- `+(40-55) to Dexterity`
- `+(50-60) to maximum Life`
- `(20-30)% increased Damage with Hits against Rare monsters`
- `When you Kill a Rare monster, you gain its Modifiers for 60 seconds`

**60 секунд подтверждены чтением текущего источника**, а не предположены. Version history явно указывает патч **3.18.0e**, когда 20 секунд заменили на 60, включая существующие экземпляры.

Mechanics уточняет: передаются все explicit modifiers убитого rare; убийства minion/proxy также запускают этот эффект. Один и тот же украденный modifier не складывается с собой. Разные модификаторы могут сосуществовать. Страница не дала проверенного здесь точного правила обновления таймера при повторном получении того же модификатора — не следует придумывать его из правила отсутствия стэкинга. Украденные модификаторы не обязательно являются buffs; отдельные из них дают buff-ауры.

Для Duskbound интересная механика — получать реальные временные свойства убитого редкого врага. Если редкие враги имеют собственный упрощённый набор свойств, перенос именно этого набора можно реализовать как адаптацию. Фиксированный бонус после любого убийства не воспроизводит исходное правило.

## Death Rush и Adrenaline

[Death Rush](https://www.poewiki.net/wiki/Death_Rush) · [редакция 1674871](https://www.poewiki.net/index.php?title=Death_Rush&oldid=1674871).

Amethyst Ring, уровень 30. Implicit `+(17-23)% to Chaos Resistance`. Два текущих explicit:

- `Recover (3-5)% of Life on Kill`
- `Gain Adrenaline for (1-3) seconds on Kill`

Life recovery и получение Adrenaline — два отдельных эффекта. **Adrenaline нельзя получить или обновить, пока он уже активен.** Два Death Rush складывают длительности: 2–6 секунд вместо 1–3; сила самого buff не удваивается. Текущие свойства заменили старые в **3.19.0**. Onslaught, Armour и physical-attack leech из старых карточек — legacy.

[Adrenaline](https://www.poewiki.net/wiki/Adrenaline) · [редакция 1673488](https://www.poewiki.net/index.php?title=Adrenaline&oldid=1673488) подтверждает:

- `100% increased Damage`
- `25% increased Attack, Cast, and Movement Speed`
- `10% additional Physical Damage Reduction`

`100% increased` — исходный тип модификатора; он складывается с другими increased Damage, поэтому не является безусловным удвоением финального урона. Ограничение повторного получения также явно записано в истории Adrenaline для **3.19.0**.

## Dying Sun

[Карточка](https://www.poewiki.net/wiki/Dying_Sun) · [редакция 1597033](https://www.poewiki.net/index.php?title=Dying_Sun&oldid=1597033).

Ruby Flask, уровень 68. Во время действия базовая фляга даёт **+40% Fire Resistance и +5% maximum Fire Resistance**. Текущие explicit:

- `(125-150)% increased Charges per use`
- `(60-40)% less Duration`
- `(10-20)% increased Area of Effect during Effect`
- `Skills fire 2 additional Projectiles during Effect`

Текущая обычная Ruby Flask имеет базовую длительность **8 секунд**, использует **20 из 50 charges**. С модификаторами Dying Sun карточка показывает **3.20–4.80 секунды**, расход **45–50 из 50 charges** без других модификаторов и при нулевом качестве. `less Duration` перемножается с соответствующими модификаторами длительности/качества. Это не постоянная экипировочная прибавка. Wiki отдельно приводит пример: 50% increased Flask Effect увеличивает +2 projectiles до +3.

История: **3.15.0** установила текущие диапазоны area/charges; **3.16.0** заменила reduced Duration на less Duration. Старые исторические строки о прежней базовой Ruby Flask не заменяют текущую карточку; Ruthless с иной длительностью исключён.

В исследованном снимке `games/duskbound/core.mjs` Dying Sun имел `{ projectiles: 1, area: 0.2 }` как постоянные модификаторы экипировки. **+1 projectile отличается от оригинальных +2**. 20% area соответствует одному из допустимых роллов, но постоянное действие не соответствует условию during Effect. Система без charges/времени/активации/сопротивлений остаётся адаптацией.

## Cloak of Flame

[Карточка](https://www.poewiki.net/wiki/Cloak_of_Flame) · [редакция 1701278](https://www.poewiki.net/index.php?title=Cloak_of_Flame&oldid=1701278).

Scholar's Robe, уровень 18, 55 INT; базовый Energy Shield 43–53. Explicit:

- `+(50-75)% to Fire Resistance`
- `(40-75)% increased Ignite Duration on Enemies`
- `Reflects 100 Fire Damage to Melee Attackers`
- `40% of Physical Damage taken as Fire Damage`

Ключевая защита — **40% входящего physical damage получает тип fire до mitigation**. Эту часть затем снижает соответствующая защита от fire. Модификатор действует на **hits и physical damage over time**, включая Bleed/Corrupted Blood. Это не безусловные 40% damage reduction. В **3.19.0** прежние 20% Physical Damage **from Hits** заменены на текущие 40% без ограничения hits; убрана старая 10% chance to Ignite, обновлены остальные указанные диапазоны и reflect.

В исследованном снимке Duskbound: `{ maxHp: 35, regen: 0.7, damageReduction: 0.15 }`. **Ни один из этих трёх модификаторов не является текущим исходным explicit Cloak of Flame**. Реальный интересный эффект требует различать типы входящего урона и damage taken as.

## Nebulis

[Текущая synthesised карточка](https://www.poewiki.net/wiki/Nebulis) · [редакция 1675563](https://www.poewiki.net/index.php?title=Nebulis&oldid=1675563).

Void Sceptre, уровень 68, 104 STR/122 INT. **Три случайных synthesis implicit modifiers** заменяют обычный implicit базы `40% increased Elemental Damage`. Текущие explicit:

- `(60-120)% increased Implicit Modifier magnitudes`
- `(15-20)% increased Cast Speed`
- `(6-8)% increased Elemental Damage per 1% Fire, Cold, or Lightning Resistance above 75%`

Используются **фактические capped** Fire/Cold/Lightning Resistance, не uncapped/overcapped resistance. При базовом cap 75% этот damage-модификатор не даёт бонуса, сколько бы лишнего uncapped resistance ни было. Бонус для ролла `r`:

`r × (max(0, cappedFire − 75) + max(0, cappedCold − 75) + max(0, cappedLightning − 75))% increased Elemental Damage`.

При 90% во всех трёх сопротивлениях получается 45 суммарных пунктов выше 75 и **270–360% increased Elemental Damage** в зависимости от ролла 6–8. Глобальный cap maximum Resistance — 90%; значение maximum выше него не поднимает этот предел.

Диапазон **6–8%** подтверждён текущей карточкой и историей **3.29.0**: он заменил 5–10%. В **3.27.0** старые отдельные строки 15–20% increased Cold/Lightning Damage заменены общей Elemental Damage и добавлен implicit magnitude. На той же странице есть отдельная **fractured** карточка со старыми Cold/Lightning строками: она не является текущим synthesised вариантом. Replica также исключена.

В исследованном снимке Duskbound Nebulis давал `{ damage: 0.35 }`. Постоянные 35% общего урона не воспроизводят исходные cast speed, scaling implicit modifiers и зависимость Elemental Damage от capped resistance.

## Проверка и границы

Для всех пяти предметов строки implicit/explicit и базовых эффектов фляги сопоставлены с видимым текстом полученного HTML; JSON сохраняет SHA-256 страниц, revision IDs и прямые ссылки. Adrenaline проверен по отдельной странице. Временные/численные значения приведены для указанных обычных текущих вариантов, без legacy, corruption, Foulborn и внешних усилителей.

Сопоставление с Duskbound описывает код в момент этого исследования; последующие изменения игры этим документом автоматически не проверяются. Production code не менялся, игровой перенос и его тесты в эту работу не входили.

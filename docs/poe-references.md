# Источники PoE 1 для Duskbound

Срез прочитан 27 октября 2026 года. Источник — интерфейс poe.ninja, раздел **PoE 1 Builds**, лестница **Experience**, **Latest snapshot**, обычные лиги Allflame и Mirage. HC, SSF, Ruthless и PoE 2 в эти цифры не входят. Значения округлены так, как их показывает сайт. Это доля персонажей в выборке poe.ninja, а не доля всех игроков. Персонаж может использовать несколько основных умений.

## Выбор архетипов

| Умение | Лига | Доля в разделе Main Skills | Реализация в Duskbound |
| --- | --- | --- | --- |
| Winter Orb | Allflame | 7% | Парящая ледяная сфера, автоматические снаряды и охлаждение |
| Righteous Fire | Allflame / Mirage | 5% / 5% | Постоянная огненная аура и небольшой расход здоровья |
| Raise Spectre | Allflame / Mirage | 4% / 5% | Призрачные союзники, автоматически атакующие врагов |
| Blade Vortex | Mirage | 7% | Вращающиеся клинки вокруг героя |
| Kinetic Fusillade | Mirage | 7% | Кинетические залпы снарядов |

[Allflame](https://poe.ninja/poe1/builds/allflame) · [Mirage](https://poe.ninja/poe1/builds/mirage)

В разделе Main Skills текущей Allflame также есть Animate Guardian 5% и Ethereal Knives 3%. Выбор пяти умений выше учитывает пригодность разных механик для survivor и не является утверждением, что это первые пять мест единого рейтинга.

## Поддержки в связанных умениях

Проценты ниже взяты именно из секций **[название умения] Support Gems** после фильтрации по умению, а не из общего списка всех камней персонажа.

| Сборка | Камни поддержки в выборке |
| --- | --- |
| [Winter Orb, Allflame](https://poe.ninja/poe1/builds/allflame?skills=Winter+Orb) | Infused Channelling 86%; Focused Channelling 82%; Power Charge On Critical 73%; Inspiration 58%; Cold Penetration 46%; Hypothermia 20%; Multiple Projectiles 11% |
| [Righteous Fire, Allflame](https://poe.ninja/poe1/builds/allflame?skills=Righteous+Fire) | Burning Damage 99%; Elemental Focus 95%; Swift Affliction 78%; Lifetap 76%; Efficacy 63%; Increased Area of Effect 39%; Concentrated Effect 35% |
| [Blade Vortex, Mirage](https://poe.ninja/poe1/builds/mirage?skills=Blade+Vortex) | Minion Pact 94%; Greater Unleash 88%; Lifetap 62%; Added Fire Damage 46%; Elemental Focus 34%; Increased Critical Damage 33%; Increased Area of Effect 14% |
| [Kinetic Fusillade, Mirage](https://poe.ninja/poe1/builds/mirage?skills=Kinetic+Fusillade) | Less Duration 99%; Greater Volley 96%; Ballista Totem 91%; Increased Critical Damage 85%; Elemental Damage with Attacks 49% |
| [Raise Spectre, Allflame](https://poe.ninja/poe1/builds/allflame?skills=Raise+Spectre) | Minion Damage 58%; Greater Spell Echo 42%; Pierce 42%; Returning Projectiles 40%; Controlled Destruction 40%; Empower 39% |

Для первой версии выбраны поддержки, позволяющие показать заметные и понятные отличия в коротком забеге. В игре они связываются с конкретным умением. Совместимость, число гнёзд и численные эффекты упрощены. Полный набор наиболее используемых поддержек каждой сборки не переносится автоматически: например, Minion Pact требует отдельной системы жертвы приспешников.

## Предметы

В Items отфильтрованных сборок найдены:

- Winter Orb / Allflame: Ralakesh's Impatience 63%, Malachai's Loop 60%, Badge of the Brotherhood 50%, Dying Sun 44%.
- Righteous Fire / Allflame: Nebulis 67%, Cloak of Flame 67%, Watcher's Eye 44%, Mageblood 44%.
- Blade Vortex / Mirage: The Light of Meaning 85%, Unnatural Instinct 83%, Watcher's Eye 49%, Enmity's Embrace 47%, Nebulis 46%.

Текущая версия содержит **Dying Sun, Nebulis, Cloak of Flame, Headhunter и Death Rush**. Диапазоны исходных явных свойств и ключевые механики проверены по карточкам Wiki с сохранёнными revision links: [источники предметов](./poe-unique-sources.md), [реализация и границы переноса](./duskbound-uniques-report.md). Первые три также встречались в срезах сборок выше; для Headhunter/Death Rush доля популярности здесь не утверждается.

Каталог свойств редких монстров, три свойства синтеза Nebulis и правило повторного получения активного свойства Headhunter адаптированы и описаны отдельно. Случайные магические/редкие предметы и три реликвии с префиксом Duskbound имеют собственные названия и баланс; они не выдаются за исходные предметы PoE.

## Классы и восхождения

Семь классов, 21 Ascendancy и четыре выбранных ключевых узла для каждого взяты из официального дерева **3.29.3b**. Русские имена и свойства сверены с [официальным RU деревом](https://ru.pathofexile.com/passive-skill-tree), IDs и численные значения — с [EN деревом](https://www.pathofexile.com/passive-skill-tree). Подробности и воспроизводимые данные: [источники классов](./poe-classes-sources.md). Исходные пути оплачиваются из восьми очков; четыре варианта Scion требуют выбора и не обязаны помещаться одновременно.

Темп опыта, испытания на90/180/300/420секундах, автоматические применения и геометрия боя предназначены для восьмиминутного survivor. Они не объявляются исходной кампанией или полной боевой симуляцией PoE.

## Границы адаптации

Это самостоятельная игра в жанре survivor. Исходная логика камней, затрат ресурсов, зарядов, сопротивлений, предметных баз и связей PoE не переносится полностью. Например, призраки автоматически призываются, а ченнелинг поддерживается автоматикой боя. Графика, интерфейс и звук оригинальные. Статистика популярности использована для выбора узнаваемых архетипов; она не доказывает их эффективность в нашей игре.

Общие принципы камней и поддержек сверены с [официальным обзором Path of Exile](https://www.pathofexile.com/game), секциями Skill Gem System и Item System. Принцип короткого забега, опыта и повторных попыток сопоставлен с [официальной страницей Vampire Survivors](https://store.steampowered.com/app/1794680/Vampire_Survivors/).

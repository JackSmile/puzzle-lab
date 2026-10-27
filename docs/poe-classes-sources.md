# Классы и восхождения PoE 1: источники Duskbound

Срез получен 27 октября 2026 года прямыми HTTP-запросами к публичным страницам. Это исследование исходных правил, не утверждение об уже реализованных игровых эффектах Duskbound.

## Официальные данные

Прочитаны точные адреса:

- [Passive Skill Tree, Normal](https://www.pathofexile.com/passive-skill-tree): встроенный объект `passiveSkillTreeData`, `tree: "Default"`, версия страницы **3.29.3b**, realm `pc`. Вера в актуальность основана на текущем ответе официальной страницы, а не на памяти о прошлых лигах.
- [Ascendancy Classes](https://www.pathofexile.com/ascendancy/classes): видимый список всех восхождений, сопоставленный с `classes[].ascendancies` дерева.

В обзорном тексте до сих пор написано **“There are 20 Ascendancy classes”**, но сама страница перечисляет **21**. Текущее дерево независимо подтверждает 7 классов × 3 восхождения = **21**. В данных используется фактический список из дерева. Scion имеет **Ascendant, Reliquarian, Luminary**. Старые списки из 19/20 восхождений для этого среза неполны.

Важно: отображаемый **Warden** у Ranger имеет внутренний `id: "Raider"`, а его узлы — `ascendancyName: "Raider"`. Это не старый игровой Raider и не отдельное двадцать второе восхождение. Внешний `alternate_ascendancies` содержит Bloodline/Wildwood классы; они не входят в 21 обычное классовое восхождение и в эту выгрузку не включены. Ruthless и PoE 2 не использованы.

`games/duskbound/data/poe-classes-source.json` содержит:

- 7 классов с исходным индексом дерева и базовыми STR/DEX/INT;
- 21 восхождение со всеми **411** принадлежащими им узлами;
- точные английские `stats`, `reminderText`, типы выбора и исходные связи `in/out`;
- 19 внешних узлов, на которые непосредственно ссылается граф восхождений: только справочные поля для разрешения ссылок, без полного обычного дерева;
- источник, версию и SHA-256 полученных HTML.

Узлы сохраняют оригинальную разметку вроде `[SpiritInfusion|Spirit Infusion]`. Поле `icon` и координаты удалены; изображения не скачивались. `in/out` — связи графа, их направление не является направлением обязательной прокачки: для поиска путей используются обе стороны. Дополнительные выдаваемые passive points/атрибуты сохранены как поля узлов. Числа `points.totalPoints = 123` и `ascendancyPoints = 8` сохранены из дерева; первое не следует трактовать как безусловно доступное число обычных очков любому персонажу без учёта решений в игре.

## Начальные атрибуты

| Класс | STR | DEX | INT | Восхождения |
| --- | ---: | ---: | ---: | --- |
| Scion | 20 | 20 | 20 | Ascendant, Reliquarian, Luminary |
| Marauder | 32 | 14 | 14 | Juggernaut, Berserker, Chieftain |
| Ranger | 14 | 32 | 14 | Warden, Deadeye, Pathfinder |
| Witch | 14 | 14 | 32 | Occultist, Elementalist, Necromancer |
| Duelist | 23 | 23 | 14 | Slayer, Gladiator, Champion |
| Templar | 23 | 14 | 23 | Inquisitor, Hierophant, Guardian |
| Shadow | 14 | 23 | 23 | Assassin, Trickster, Saboteur |

## Уровень и ресурсы

`games/duskbound/data/poe-progression-source.json` хранит формулы и ссылки на зафиксированные редакции Wiki. При отсутствии снаряжения, пассивных и других модификаторов:

- Life = `38 + 12 × level + STR / 2` — на первом уровне 50 до бонуса STR.
- Mana = `34 + 6 × level + INT / 2` — на первом уровне 40 до бонуса INT; базовая регенерация 1.8% максимальной маны в секунду.
- Accuracy Rating = `2 × level + 2 × DEX`.
- Базовое Evasion Rating = **15**, автоматического роста за уровень **нет**. DEX даёт 1% increased Evasion за 5; Evasion Wiki указывает округление DEX вверх до кратного 5 для этого бонуса. Это рейтинг, не готовый процент уклонения.
- Повышение уровня даёт **12 maximum Life, 6 maximum Mana, 2 Accuracy, 1 обычное passive point**. STR/DEX/INT автоматически за уровень не прибавляются.
- За 10 STR: +5 maximum Life и 2% increased melee physical damage; за 10 DEX: +20 Accuracy и 2% increased Evasion; за 10 INT: +5 maximum Mana и **1% increased maximum Energy Shield** в текущей редакции Attribute Wiki.
- Стартовый уровень 1, максимальный 100. Таблица Experience заканчивается уровнем 100, суммарным XP 4,250,334,444 и нулём до следующего уровня.

В Life/Mana возможны половинки от нечётного атрибута. Окончательное округление отображаемого целого этими страницами независимо не подтверждено. JSON намеренно не объявляет такое округление оригинальным правилом.

В Wiki Experience обнаружены противоречия внутри таблицы: разность суммарных XP для уровней 33→34, 34→35 и 89→90 не совпадает с её же колонкой XP до следующего уровня (расхождения +36,000, −36,000 и −431). Таблица в JSON сохранена буквально вместе с перечнем несоответствий; **её нельзя выдавать за проверенную исполняемую XP-кривую**. Для survivor темп XP и сброс до уровня 1 — отдельная адаптация Duskbound, не правило оригинальной PoE.

Точные редакции, реально полученные при чтении:

| Страница | Revision ID | Источник |
| --- | ---: | --- |
| Character | 1698839 | [Зафиксированная редакция](https://www.poewiki.net/index.php?title=Character&oldid=1698839) |
| Life | 1701298 | [Зафиксированная редакция](https://www.poewiki.net/index.php?title=Life&oldid=1701298) |
| Mana | 1673464 | [Зафиксированная редакция](https://www.poewiki.net/index.php?title=Mana&oldid=1673464) |
| Accuracy | 1612031 | [Зафиксированная редакция](https://www.poewiki.net/index.php?title=Accuracy&oldid=1612031) |
| Evasion | 1611557 | [Зафиксированная редакция](https://www.poewiki.net/index.php?title=Evasion&oldid=1611557) |
| Attribute | 1698836 | [Зафиксированная редакция](https://www.poewiki.net/index.php?title=Attribute&oldid=1698836) |
| Experience | 1700851 | [Зафиксированная редакция](https://www.poewiki.net/index.php?title=Experience&oldid=1700851) |
| Ascendancy class | 1697030 | [Зафиксированная редакция](https://www.poewiki.net/index.php?title=Ascendancy_class&oldid=1697030) |

## Восхождения: очки и выбранные эффекты

Оригинальная PoE даёт 2 Ascendancy points за первое завершение каждой из четырёх сложностей Labyrinth и касание финального Altar — всего **8**. Выбирается одно восхождение из трёх своего базового класса. В нормальном дереве сильный узел обычно требует малый перед ним; некоторые требуют и предыдущий сильный. Возврат одного Ascendancy point требует 5 обычных refund points. Источник — Ascendancy_class Wiki; предел 8 дополнительно подтверждён официальным деревом.

Компактный `games/duskbound/data/poe-signatures-source.json` содержит **ровно 84 записи: по 4 реальных эффекта для всех 21 восхождений**. В каждой записи точные оригинальные строки stats/reminderText, исходный ID и путь от начала дерева. Это редакционный выбор для переноса в survivor; не рейтинг популярности и не результат измерения эффективности в Duskbound. Данные популярности лиг остаются в `docs/poe-references.md` и не доказывают свойства восхождений.

Для 19 восхождений вне Ascendant/Reliquarian выбранный набор достижим за 8 исходных очков с малыми узлами. У Assassin Knife in the Back — выбор внутри Assassination Style; его hub включён в путь, а опция не считается отдельным очком. Для Ascendant и Reliquarian по четыре записи означают **четыре варианта эффектов для отбора**, а не легальный одновременный набор: общие пути требуют 12 и 11 очков соответственно. Одновременная выдача всех четырёх — адаптация и должна быть так обозначена. Ascendant в типичном оригинальном наборе выбирает до двух классовых эффектов; Reliquarian обычно выбирает armour, weapon, jewellery, по одному эффекту на соответствующий Display.

| Восхождение | Четыре исходных эффекта |
| --- | --- |
| Ascendant | Deadeye (`34567`), Necromancer (`10099`), Juggernaut (`61072`), Assassin (`43122`) |
| Reliquarian | Gloomfang (`36072`), Kaom's Roots (`35448`), Ahn's Might (`47058`), Shimmeron (`40276`) |
| Luminary | Noble Blood (`46479`), Loyal Bodyguard (`1564`), Bestowed Knighthood (`56292`), Legendary Arms (`25944`) |
| Juggernaut | Unstoppable (`5819`), Undeniable (`44297`), Untiring (`17988`), Unbreakable (`53816`) |
| Berserker | Aspect of Carnage (`59920`), Gore Dancer (`29630`), Crave the Slaughter (`24528`), Rite of Ruin (`57560`) |
| Chieftain | Hinekora, Death's Fury (`1731`), Tasalio, Cleansing Water (`48480`), Ramako, Sun's Light (`61355`), Valako, Storm's Embrace (`32249`) |
| Warden | Oath of Summer (`33645`), Oath of Spring (`31364`), Oath of Winter (`16848`), Avatar of the Wilds (`55509`) |
| Deadeye | Endless Munitions (`26067`), Ricochet (`61627`), Far Shot (`45313`), Gathering Winds (`24848`) |
| Pathfinder | Nature's Reprisal (`40813`), Master Toxicist (`1697`), Nature's Adrenaline (`51101`), Nature's Boon (`65296`) |
| Occultist | Profane Bloom (`37127`), Void Beacon (`27096`), Frigid Wake (`47630`), Withering Presence (`25309`) |
| Elementalist | Shaper of Flames (`53123`), Shaper of Storms (`27038`), Shaper of Winter (`40810`), Mastermind of Discord (`61259`) |
| Necromancer | Mindless Aggression (`54159`), Commander of Darkness (`36017`), Bone Barrier (`14603`), Plaguebringer (`11490`) |
| Slayer | Headsman (`3184`), Bane of Legends (`62817`), Brutal Fervour (`10143`), Overwhelm (`17315`) |
| Gladiator | Gratuitous Violence (`27864`), Jagged Technique (`15616`), War of Attrition (`758`), Determined Survivor (`8419`) |
| Champion | Worthy Foe (`56967`), Fortitude (`31700`), Master of Metal (`13374`), First to Strike, Last to Fall (`27604`) |
| Inquisitor | Inevitable Judgement (`48214`), Righteous Providence (`53884`), Augury of Penitence (`40059`), Sanctuary (`39790`) |
| Hierophant | Arcane Blessing (`40510`), Divine Guidance (`922`), Pursuit of Faith (`1105`), Conviction of Power (`25651`) |
| Guardian | Radiant Crusade (`4494`), Time of Need (`55146`), Bastion of Hope (`39728`), Radiant Faith (`42264`) |
| Assassin | Opportunistic (`19083`), Mistwalker (`28782`), Knife in the Back (`21264`), Toxic Delivery (`19598`) |
| Trickster | One Step Ahead (`23225`), Polymath (`55867`), Heartstopper (`28884`), Escape Artist (`29825`) |
| Saboteur | Bomb Specialist (`47778`), Born in the Shadows (`5087`), Like Clockwork (`51462`), Shrapnel Specialist (`57175`) |

### Ограничения переноса

Точные числа означают точные исходные строки, но не автоматически полную оригинальную боевую модель. `increased/reduced` складываются внутри соответствующей категории, `more/less` перемножаются; Damage taken, Attack Damage, Spell Damage, Minion Damage и Elemental Damage нельзя без пояснений свести к одному бонусу урона. Полные исходные строки, в том числе негативные стороны, необходимо показать и обработать.

Особенно заметные зависимости:

- **Luminary:** четыре выбранных узла требуют отдельного **Mercenary**. Noble Blood разрешает постоянный найм. Legendary Arms разрешает Unique weapons/shields/quivers и даёт наёмнику и его minions **8% more Damage за каждый Unique item наёмника**. Loyal Bodyguard сравнивает именно Life наёмника и владельца, перенаправляет **20% Hit Damage** до владельца при большем Life и даёт **40% Recoup** получаемого наёмником урона при меньшем. Равенство не удовлетворяет ни одному условию. Bestowed Knighthood даёт наёмнику Taunt on Hit и **50% increased effect Non-Curse Auras from Skills**. Обычный spectre не является Mercenary в исходном правиле.
- **Warden:** четыре узла требуют Scorch, Shock, Freeze/Hoarfrost и Unbound Fury/Unbound Avatar. Avatar of the Wilds включает и получаемое умение, и все ограничения накопления; один стат `100% more Elemental Damage` не воспроизводит узел.
- **Berserker:** Aspect of Carnage содержит **40% more Damage и 10% increased Damage taken**. Rite of Ruin требует Rage и реального самоурона **0.1% Life/second per Rage**, пока Rage не теряется. Gore Dancer делает мгновенными **30% Life Leech**, а не даёт самостоятельное лечение.
- **Chieftain/Occultist/Gladiator:** взрывы требуют исходные условия убийства и тип урона. Значения от maximum Life убитого врага нельзя заменить фиксированным уроном и назвать оригинальными.
- **Champion/Hierophant/Assassin:** Fortification/Impale, Arcane Surge/Charges, Elusive/Poison/Marks требуют собственных состояний. Нельзя считать скрытые отсутствующие механики уже работающими только потому, что в UI написан исходный текст.
- **Slayer:** Headsman исполняет врагов при **20% или менее Life при Hit by your Skills**; разные бонусы скорости имеют разные условия и время. Overleech требует экземпляров leech, а не постоянной регенерации.
- **Trickster:** Heartstopper чередует два вида защиты по 5 секунд в цикле 10 секунд. Polymath считает **разные типы выделенных Mastery**, не количество любых навыков.
- **Saboteur:** Bomb Specialist — случайные 30% события с 50% more/less Area Damage, а не постоянные ±15%. Shrapnel Specialist требует возвращающихся снарядов **и случайных направлений выстрела**.

`adaptationCaveat` каждой записи в JSON отмечает дополнительные адресные условия. Если новая система упрощена, интерфейс и документация должны отделять оригинальный текст источника от того, что фактически исполняет Duskbound.

## Воспроизведение и выполненные проверки

Сохранить публичные HTML официальных двух страниц, затем запустить `python3 games/duskbound/data/extract-poe-classes.py /tmp/poe-tree.html /tmp/poe-ascendancy.html` и `python3 games/duskbound/data/extract-poe-signatures.py`. Для Wiki сохранить страницы под именами `poewiki-character.html`, `poewiki-life.html`, `poewiki-mana.html`, `poewiki-accuracy.html`, `poewiki-evasion.html`, `poewiki-attribute.html`, `poewiki-experience.html`, `poewiki-ascendancy.html` и запустить `python3 games/duskbound/data/extract-poe-progression.py /tmp`.

Проверены: 7 классов; 21 восхождение; непустые наборы узлов; все выбранные ID принадлежат соответствующему восхождению и имеют непустые stats; ровно 4 эффекта на восхождение; пути существуют; строки stats/reminderText компактной выборки совпадают с полной официальной выгрузкой; внешние ссылки графа разрешаются справочником. Это проверка исследовательских данных, не тест работающего игрового переноса.

## Официальный русский текст для интерфейса

Дополнительно прочитаны [RU Normal Passive Skill Tree](https://ru.pathofexile.com/passive-skill-tree) и [RU Ascendancy Classes](https://ru.pathofexile.com/ascendancy/classes). Версия русского дерева — **3.29.3b**, как у английского среза; `tree: Default`, realm `pc`. `games/duskbound/data/poe-russian-source.json` содержит официальный русский текст всех **411** классовых узлов, включая малые; `signatureNodeIds` отмечает те же 84 ключевых эффекта. Runtime должен продолжать использовать английские строки и стабильные IDs; русский файл предназначен для отображения.

Схема: `classes[]` содержит прежний английский `id`, официальный русский `name`, справочный `nameEnglish`, `baseAttributes` и три локализованных `ascendancies[]` с прежними `id`. `nodes` — словарь по исходному node ID; поля `skill`, `name`, `nameEnglish`, `ascendancyName`, `stats[]`, `reminderText[]`. `source` хранит точные URL, дату, версию и SHA-256 HTML; `verification` — границы сверки. Связи графа в русский UI-файл не дублируются: сравнение подтвердило их равенство английскому источнику для всех 411 узлов.

Подтверждены официальные названия базовых классов: **Дворянка, Дикарь, Охотница, Ведьма, Дуэлянт, Жрец, Бандит**. Восхождения Scion официально **Вознесшаяся, Реликварианка, Светоч**; Warden официально **Хранитель** с прежним внутренним ID `Raider`.

Проверены совпадение версии, всех 411 node IDs, Ascendancy IDs, флагов типов узлов, связей `in/out`, исходных атрибутов классов и чисел в `stats`. У четырёх узлов буквальный набор цифровых токенов отличается только из-за языкового раскрытия единиц: `24528` Every Rage → «за 1 свирепости»; `55146` и `30919` one second → «1 секунды»; `55509` once → «1 раза». После этих явно перечисленных нормализаций численные значения совпадают. Десятичная запятая нормализуется только при сравнении, сами исходные строки не меняются. `reminderText` сохранён буквально; полная смысловая редактура всего официального перевода отдельно не проводилась.

В исходном RU `55509` / Avatar of the Wilds / «Воплощение лесов» есть опечатка: начало `stats[1]` — **`Lарует 1 Безудержной ярости`** с латинской `L`. В источнике JSON она намеренно сохранена. Согласованная корректировка пользовательского отображения **`Lарует` → `Дарует`** является редакторским исправлением опечатки, а не изменением сырых исходных данных или ручным переводом. Исходные переносы, макроразметка и окончания вроде `секунд(-ы)` также сохранены.

Воспроизведение: сохранить две RU страницы как `/tmp/poe-tree-ru.html` и `/tmp/poe-ascendancy-ru.html`, затем `python3 games/duskbound/data/extract-poe-russian.py /tmp/poe-tree-ru.html /tmp/poe-ascendancy-ru.html`. Скрипт проверяет сопоставимость с уже сохранённым английским срезом и не обращается к медиа.

### Дополнительная сверка базовых состояний

Для реализации связанных узлов отдельно прочитана [Consecrated ground, редакция 1660567](https://www.poewiki.net/index.php?title=Consecrated_ground&oldid=1660567): базовый эффект — **Regenerate 5% of maximum life per second** и **50% reduced effect of curses on you**. Сам официальный tooltip Sanctuary/Inquisitor численного процента регенерации не даёт, поэтому значение 5% подтверждено этой отдельной страницей. Официальные reminderText текущего дерева подтверждают **Tailwind: 8% increased Action Speed**, а **Unbound Avatar: требуется 100 Unbound Fury, состояние Unbound длится 10 секунд**. Это базовые исходные правила; дополнительные modifiers применяются отдельно.

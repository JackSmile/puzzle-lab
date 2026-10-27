# Исправления итогового ревью PoE expansion

27.10.2026. Исправлены F1/F2 из `final-review.md` и подтверждённый при re-review F3 mixed projectile → mercenary. Изменял `games/duskbound/core.mjs`, `games/duskbound/encounters.mjs`, `games/duskbound/classes.mjs`; добавил `tests/duskbound-expansion-final-regressions.test.mjs` и этот отчёт. Uniques, source JSON, существующие tests/expectations и UI не менял. Коммит/push не выполнял.

## F1: lifecycle удалённых обычных противников

В `tickEncounters` обычный живой PoE-враг при расстоянии строго больше1800 возвращается в кольцо650–850 вокруг игрока через существующий seeded RNG. Перенос выполняется до действия/заморозки: отменяются старый action, jumpHeight, shieldUntil и owned hazards; cooldown атаки начинается заново с существующих0.8s. В кадре переноса враг больше не двигается, поэтому фактическая дистанция остаётся в указанном кольце. HP, identity, parentId и summonedBy сохраняются: дочери продолжают занимать brood cap матери, а boss/heart по ссылкам не переносятся. Это восстановление прежнего lifecycle, без изменения лимита180.

Регрессии проходят через публичный `core.tick`: детерминизм одного seed/различие seed; активный airborne action и owner hazard у удалённой дочери; граница1800/1800.01; неподвижные Kitava/body/heart; заполненный180 удалёнными Drowned cap → локальные волны → убийства → пополнение открывшимся roster.

## F2: Bestowed Knighthood

Общий resolver новой цели сохраняет прежний контракт: активный `mercenaryTauntUntil` и живой mercenary выбирают наёмника, иначе игрока. Resolver используется для chase/range и нового normal/boss windup. Геометрия уже начатого действия остаётся зафиксированной. В action сохраняется выбранный ID, который переходит в `hostileTargetId` при выпуске стрелы. Направление снаряда не меняется при expiry/death цели.

В hostile projectile collision добавлен только выбранный живой mercenary; произвольного interception другими союзниками нет. Сохраняются player collision и ближайшая terrain collision. Попадание проходит через существующий `classAllyDamage`, с исходным enemy/type/spell/melee context. Настоящая Ancient Archer arrow с10physical против100armour наносит10/3урона; игрок не получает этот прямой hit. Истечение taunt после выпуска не мешает попасть в выбранного mercenary; мёртвая цель не получает урон. Если игрок физически пересекает уже выпущенную стрелу первым, сохраняется его collision и штатный Bodyguard redirect.

Основание: сохранённый `poe-classes-source.json`, node56292: `Your Mercenary Taunts on Hit`, reminder duration3s; исходные class numbers не изменены. Тест использует реальное выделение Luminary/56292 и настоящий hit наёмника, а не только ручную запись таймера. Контроли охватывают active/expired/dead taunt, chase, melee range, ranged aim, boss chase/aim, сохранение ранее выбранного направления и отсутствие interception невыбранным mercenary.

## F3: смешанный hit выбранного наёмника

Первый F2 handoff проверял physical Archer arrow, но недооценивал обязательную целостность mixed Tentacle hit на новой reachable ally-ветке. Re-review воспроизвёл реальный Spine Volley: `physical6 + fire6` против100armour/fireRes0 ошибочно превращались в physical12 с уроном4.5, ignite отсутствовал. Это дефект интеграции сигнатуры, его исправление включено в итоговый handoff.

В `classAllyDamage` добавлен `components`: общий block roll и существующее общее снижение урона выполняются один раз, затем armour/resistance применяются к каждой типизированной порции. Fire portion отдельно вызывает существующий ignite; общий итог один раз расходует ES/HP и создаёт recoup. Прежние правила selfHit/DoT сохраняются, новые cold/chaos ailments не изобретались. Политика ignite сохранена от прежнего чистого fire hit:8%от mitigated fire portion,3s. Числа источников/предметов/классов не менялись.

Реальная направленная Tentacle spine в regression теперь наносит **96/13≈7.384615** (18/13physical +6fire) и накладывает ignite0.48DPS. Дополнительные независимые ожидаемые значения при50%fire resistance:57/13общего урона; с2ES —31/13HP loss, recoup62/65 и rate31/130. Проверены чистые physical/fire/cold hits, единственный block roll, единственное Aegis recovery, отсутствие ignite при block/selfHit/DoT и общий расход ES без двойного учёта компонентов.

## Выполненная проверка

TDD до production changes: `node --test tests/duskbound-expansion-final-regressions.test.mjs` — первоначальные10tests: **2pass/8fail**. F1 падал на ring (2030.769 вместо650–850), threshold и cap; F2 — отсутствие melee windup, движение к игроку, aim(0,0) вместо(180,100), отсутствующий selected projectile ID. Это assertion failures по воспроизводимым дефектам. После исправления те же10tests —10/10. Затем добавлены ещё5контрольных проверок boss/locked aim/terrain/player/unselected collision. В дополнительных fixtures уточнены существующие Bodyguard и ES, без изменения production и существующих expectations.

Первый F1/F2 handoff (до F3): новый файл **15/15**,0skip. Покрывающий запуск:

```sh
node --test --test-reporter=tap tests/duskbound-expansion-integration.test.mjs tests/duskbound-encounters.test.mjs tests/duskbound-classes.test.mjs tests/duskbound-expansion-final-regressions.test.mjs > /tmp/duskbound-expansion-final-covering.tap
```

Фактически **210tests/210pass/0fail/0skip**, exit0; этот TAP относится к предыдущей версии classes и остаётся историческим.

F3 TDD: после исправления только новых fixtures, до production fix — **24tests/19pass/5fail**. Реальная Tentacle arrow падала с `actual4.5, expected96/13`; остальные четыре failures — typed ES/HP/recoup и смешанные DoT/selfHit. Pure typed и единичный block controls уже проходили. После production fix новый файл **24/24**,0skip.

Финальный covering запуск включает также существующие прямые ally defence/ignite и copied unique регрессии:

```sh
node --test --test-reporter=tap tests/duskbound-expansion-integration.test.mjs tests/duskbound-encounters.test.mjs tests/duskbound-classes.test.mjs tests/duskbound-expansion-final-regressions.test.mjs tests/duskbound-class-fixes.test.mjs tests/duskbound-items-review-regressions.test.mjs > /tmp/duskbound-expansion-final-mixed-covering.tap
```

Фактически **317tests/317pass/0fail/0skip**, exit0; TAP сохранён по указанному пути. Полный suite, браузер, bot matrix и UI fixes проверяет родитель; их результаты здесь не заявляю.

## Frozen SHA-256

| Файл | SHA-256 после проверки |
| --- | --- |
| `games/duskbound/core.mjs` | `f34fa8a329f01a8b1cf3ffd17be63243ff578622da4ff089dc262fe41d2fcb66` |
| `games/duskbound/encounters.mjs` | `02b0f6c30e7aaf1813fabaee30fb16d973338d06dd9bc6a4e1f59795090fe5a5` |
| `games/duskbound/classes.mjs` | `456c6e98ae922af4746c37c523b16a8684fe8beab2e6c6ff1f7996ce8ac28601` |
| `games/duskbound/uniques.mjs` (не менялся) | `d5e0956e672ad3be7e4543965a0b289cc73f088fe348d6e371135076c0e6d1c3` |
| `games/duskbound/data/poe-classes-source.json` (не менялся) | `de83ceda0068c2f0e99473532bc33e46eb15571412e474e7296816ff757377ac` |
| `games/duskbound/data/poe-signatures-source.json` (не менялся) | `7f38a4eadc22cbcb9631ec9621cfb174c867666f8f7a7b34f3691dc4c4c8a9e9` |
| `tests/duskbound-expansion-final-regressions.test.mjs` | `3ca2f1197d84fc8dcf0df691583f5d7e359819b08f1841e7d4eabda899208ba8` |

До изменений core: `7da54783dada1ed0c12b39e7b116cac79e263caf0273f586da557b66481369fa`; encounters: `08d46f94f147a19ce3137cfdc5e661a04971e9c91d0ee8b6aa010596d92515a7`; classes до F3: `46f6fcc995c42e72195445157885739ddef4e73b82a79afd51cb1a4217c21037`. Оба source JSON сверены до/после и совпали.

Итоговый frozen handoff включает F3; прежнее ограничение mixed components устранено. Изменения модели после этого handoff остановлены.

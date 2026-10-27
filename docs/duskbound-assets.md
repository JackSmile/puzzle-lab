# Duskbound: графика

Дата: 27.10.2026. Создано встроенным ImageGen, без CLI/API-ключей. Изображения оригинальные; игровые файлы PoE и иллюстрации GGG не копировались. Исходники генерации сохранены в каталоге Codex generated_images этой сессии, рабочие копии находятся в репозитории.

| Файл | Назначение |
| --- | --- |
| `games/duskbound/assets/sprite-atlas.png` | Прозрачный атлас 4×4: семь героев, сундук, шесть врагов, призрак, кристалл |
| `games/duskbound/assets/ground.png` | Повторяемый каменный пол разрушенного святилища |
| `games/duskbound/assets/item-atlas.png` | Прозрачный атлас 4×4: оружие, доспехи, флакон, пояса, камни и кольцо |

Ниже сохранены воспроизводимые постановки для трёх ассетов. Это восстановленные спецификации после сжатия контекста; дословный текст исходных вызовов здесь не заявляется.

## Спрайты

Use case: stylized-concept. Asset type: transparent 4×4 game sprite atlas. Dark fantasy survivor, high detail painted rendered top-down characters. Row 1: rugged red-armoured warrior, duelist, green ranger, shadow assassin. Row 2: pale violet witch, golden templar, noble scion, treasure chest. Row 3: floating skull, bat, ghoul, cultist. Row 4: dark knight, imposing undead boss, spectral minion, luminous experience gem. Equal isolated cells, consistent camera and light, dark bronze and worn metal, readable silhouettes, generous transparent padding. No labels, grid lines, text or logos.

## Пол

Use case: stylized-concept. Asset type: seamless top-down game ground texture. Ancient dark fantasy ruins: worn stone slabs, cracks, subtle moss, desaturated charcoal and green, subdued moonlight. Flat overhead view, even detail, no perspective, no characters or objects that would prevent repetition, no text or logos.

## Вещи

Use case: stylized-concept. Asset type: transparent 4×4 inventory icon atlas. Original dark fantasy equipment icons in consistent painted style, equal isolated square cells. Row 1: ornate pale sceptre, burning scholar robe, ruby sun flask, luxurious leather belt. Row 2: trophy skull belt, ancient amulet, heavy armour, wand. Row 3: red, green, blue and violet skill gems. Row 4: orange support gem, shield, boots, ring. Worn bronze, engraved metal, deep shadows, restrained jewel glow, readable at small sizes. Transparent padding, no text, logos or grid.

Canvas добавляет живые тени, подсветку, эффекты навыков и декор. Отдельно показаны сферы зарядов, вспышки Adrenaline/Unbound, заморозка, горение, шок, яд, освящённая земля и останки врагов; режим сокращённых эффектов убирает декоративные вспышки. Сетка спрайтов приблизительная: края крыльев летучей мыши немного обрезаются. Текстура приглушена для читаемости боя. Это 2D survivor, а не воспроизведение 3D-графики PoE.

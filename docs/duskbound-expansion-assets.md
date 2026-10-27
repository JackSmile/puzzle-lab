# Duskbound: графика расширения PoE

27.10.2026. Игровые изображения существ — новая2Dреконструкция по описанным в source-файлах образам PoE1; исходные3Dмодели/анимации из клиента не извлекались. Использован встроенный ImageGen. Иконки12новых предметов — оригинальные публичные inventoryPNG с PoE Wiki, отдельная provenance ниже.

## Изображения существ

Основной файл: `games/duskbound/assets/poe-creatures-atlas-v2.png`,1254×1254,RGBA, alpha0–255,1685567bytes, SHA256 `bbfb68bb2a0b89b9407d53bc0f3467034d0a3476076cd2cceea3de547ae98a08`. Отображается модулем `bestiary-render.mjs`, равномерная4×4сетка. Обе версии просмотрены;16предусмотренных форм присутствуют. Прозрачность подтверждена чтениемalpha, а не расширениемPNG.

Порядок по строкам:

1. Drowned / Rhoa Mare / Goatman / Ancient Archer.
2. Flame Sentinel / Undying Evangelist / Carrion Queen / Tentacle Miscreation.
3. Brutus / Merveil Siren / Merveil Twisted / Dominus High Templar.
4. Dominus Ascendant / Kitava / Kitava’s Heart / Carrion Minion.

Первая генерация — `poe-creatures-atlas.png` (2210858bytes,SHA256 `9099c1fc80134e5049ccc96ac9e29ea5910360050bc3ab399e66ffce08ed7849`). Вторая генерация по первой меняла размер/отступы, чтобы формы лучше разделялись. Первая сохранена как исходник, renderer ссылается наv2. Итоговые файлы скопированы вworkspace из локального каталога generated_images, runtime не обращается в него.

Точные отправленные промпты: [генерация](./asset-prompts/poe-expansion-creatures.txt), [изменение отступов](./asset-prompts/poe-expansion-creatures-spacing.txt). Built-in tool, transparent_background=true; второй вызов с referenced_image_paths первой версии. Это source-informed иллюстрации, не заявление о pixel-perfect совпадении с исходной моделью PoE. Перемещение, дуги прыжков, поза подготовки, рывковые следы, купола и области опасности рисуются отдельно по реальным полям модели.

## Иконки предметов

`games/duskbound/assets/uniques/<uniqueId>.png` —12файлов, оригинальные bytes без генеративной перерисовки. [Полные URLs/редакции/metadata/SHA256 и метод загрузки](./poe-expansion-item-art.md). В интерфейсе сохраняются пропорции черезobject-fit:contain; не выдаются за оригинальные анимации предметов.

## Проверка интеграции

Metadata проверены, код синтаксически читается. Браузерная проверка после завершения model integration фиксируется отдельно в итоговом отчёте; этот документ не заменяет visualQA.

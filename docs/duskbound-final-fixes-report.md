# Duskbound — исправления итогового ревью F1–F2

27.10.2026. Scope: два подтверждённых P2 из `docs/duskbound-final-review.md`. Изменены только `core.mjs`, `classes.mjs`, `app.mjs`; добавлен `tests/duskbound-final-fixes.test.mjs`. Исходные roll values, class pipeline, старые assertions и unique-механики не переписывались.

## F1 — временный максимум здоровья

Общий `tick` теперь синхронизирует live resources через существующие `refreshPlayer` / `refreshClassResources` при двух переходах: expiry обрабатывается до входящего урона текущего кадра, автоматическая активация — после `classTick`, до death cleanup/recovery. При увеличении максимума сохранён существующий контракт добавления положительной разницы к текущему HP; при уменьшении HP ограничивается новым максимумом. Повторный пересчёт от выбора улучшения посреди действия не оставляет повышенный максимум после expiry.

Пересчёт ресурсов не добавляет HP при HP≤0 или фазе `dead`; полная стартовая инициализация class resources сохранена. Legacy ordinary rolled flask теперь использует тот же временной gate по `slot:'flask'`, что и классовый; раньше gate для legacy проверял только наличие unique-поля `item.flask` и ошибочно делал обычные модификаторы постоянными. Путь импорта остался прежним: core → classes → uniques, без обратного импорта.

В карточке обычного флакона показано: «Бонусы действуют только во время эффекта. Флакон используется автоматически.» Unique descriptions, включая Dying Sun, сохранены.

## F2 — фактически заменяемая экипировка

Экспортированный из core `lootReplacement(run, item = run.pendingItem)` возвращает `{slot, item}` реально теряемого предмета с учётом взаимного исключения shield/offhand. `showLoot` передаёт его `item` в карточку «НАДЕТО», а `equipLoot` освобождает возвращённый `slot` перед надеванием находки. Таким образом один resolver задаёт и сравнение, и фактическую замену. При пустых обоих слотах возвращается null; отказ оставляет экипировку прежней. Остальные слоты, русские подписи, иконки и focus handling сохранены.

## Проверка

Новый suite написан до production edits. Первый запуск на исходных модулях: **10 failed / 5 passed** (`/tmp/duskbound-finalfix-red.log`): воспроизведены class activation57→ожидаемые77, sticky77 после expiry, legacy постоянные140 вместо120, воскрешение refresh25 вместо0; пять resolver checks падают на отсутствующем общем API. Сохранённые guards паузы/смерти проходят уже до исправления.

После исправлений: **15/15 PASS** (`/tmp/duskbound-finalfix-green.log`). Проверяются настоящие выпавшие magic-флаконы seed42 с ровно +20 maxHp, отсутствие бонуса до включения, activation/expiry с HP clamp, upgrade во время действия, paused clock, HP0/dead, lethal ignite в кадре активации, shield→offhand, offhand→shield, тот же слот, отказ и пустой слот.

Первый полный прогон выявил нарушение прежнего legacy resource-call контракта на старой fixture с напрямую присвоенной бронёй: activation должен передавать previous **stats**, а не stored player max. Исправлен аргумент production-вызова, старый тест сохранён. Последующий полный прогон:

```sh
node --test tests/duskbound-final-fixes.test.mjs
# 15 passed, 0 failed
node --test
# 227 passed, 0 failed (212 прежних + 15 новых)
node --check games/duskbound/core.mjs
node --check games/duskbound/classes.mjs
node --check games/duskbound/app.mjs
node --check tests/duskbound-final-fixes.test.mjs
# exit 0
```

Полный лог: `/tmp/duskbound-finalfix-full.log`. Изменения просмотрены относительно `/tmp/duskbound-before-finalfix`. Коммитов и browser/bot runs в этой подзадаче не было; фактическую отрисовку сравнения и финальные bots проверяет координатор. Модель и UI-модули после указанной проверки заморожены для re-review.

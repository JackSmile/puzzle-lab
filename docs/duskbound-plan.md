# Duskbound implementation plan

Goal: playable dark fantasy survivor, eight-minute run, automatic combat, five PoE-inspired skills, linked supports, equipment, seven base classes and all 21 Ascendancies with four selected source-backed notables each.

Architecture: deterministic simulation (`core.mjs`), class hooks (`classes.mjs`), Canvas renderer, DOM UI, synthesized audio and local profile. Static HTTP; no build or external runtime services.

Global constraints: Russian UI; original graphics; keyboard/touch; preserve existing puzzle rules; relative URLs; hidden-tab pause; each attempt starts at level1 with no Ascendancy/equipment progress carried over. Original selected notable values and resource formulas are source-backed; survivor mechanics and timing are explicitly adapted. Eight Ascendancy points pay original paths, including small nodes. Scion offers four alternatives, not four simultaneously free nodes.

- [x] Base engine: TDD, movement, combat, pickups, waves, choices, death, boss and win; initial task review and projectile regressions.
- [x] PoE research: skill/support slices on poe.ninja; official EN/RU classes/tree; progression formulas; five unique item source cards and revision links.
- [x] Presentation: original sprite/item atlases and ground, Canvas effects, bronze UI, resource globes, character sheet, menu, upgrades, pause, loot, results, profile, touch input.
- [x] Integration: third card on index, local README instructions, existing games preserved.
- [x] Class runtime handoff and task review: all84 notables, real path costs, resources and conditional combat hooks; model test matrix and21 run bots.
- [x] Unique item task: source-backed Headhunter, Death Rush, Dying Sun, Cloak of Flame and Nebulis effects with activation/expiry/scope regression tests.
- [x] UI review fixes: modal focus after rerender, short landscape sizing; verify resulting behavior in browser.
- [x] Final broad review, required tests/static checks, updated final bot matrix, browser checks, saved screenshots and playable preview.

Work is in dedicated clone branch `feat/duskbound-survivor`. Local playable result only; publication is not part of this plan. Progress/handoffs are recorded in `.superpowers/sdd/progress.md`.

Completed locally:227/227modeltests,21/21classbots,all reviewP2closed,browser/staticchecks andscreenshots in `duskbound-verification.md`. No commit/push/publication performed.

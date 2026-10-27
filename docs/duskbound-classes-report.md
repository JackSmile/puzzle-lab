# Duskbound: classes runtime handoff

> Исторический handoff до audit repairs. Перечисленные в нём дефекты затем исправлялись и проверялись: см. `duskbound-class-fixes-report.md` и финальные addenda `duskbound-class-review.md`.

Snapshot: 2026-10-27. Scope: `games/duskbound/classes.mjs`, integration in `core.mjs`, and `tests/duskbound-classes.test.mjs`. No commit. UI/render/profile owned separately by the parent agent. The next item pass is intentionally separate; the old three unique items still have their earlier explicitly adapted modifiers at this handoff.

## Implemented

- Seven canonical base classes, all 21 current Default-tree Ascendancies, four selected source-backed notables per Ascendancy. `Raider` remains the original internal ID; the displayed name is Warden. Original English stat lines are copied from the checked-in official-tree source, not translated/rebalanced in the catalog.
- Exact level-one attributes and level/attribute life, mana and accuracy formulas. Attributes do not grow on level-up. Each level after one grants one freely allocated +10 attribute node; level cap 100. Skill XP progression remains the survivor progression, not PoE XP.
- Trials at 90/180/300/420 seconds grant two points exactly once. Combat pauses during selection. A trial can be postponed without choosing an Ascendancy. `openAscendancy` reopens stored points; finishing restores banked XP choices.
- Original path costs: start nodes and multiple-choice options cost zero; actual small nodes and choice hubs cost points. Allocation includes prerequisite notables and small-node stats. Ordinary selections fit eight points. Ascendant's four options require twelve points, Reliquarian's require eleven: four available choices do **not** mean all four can be purchased in one eight-point run.
- Fresh `createRun({classId})` resets level, attributes, points, resources and nodes. For regression compatibility `createRun()` / explicit legacy `character` still select the old simulation path; the actual app passes `classId`.
- Live mana and energy shield, armour/evasion/accuracy, capped resistances, charges, critical hits, leech, poison/bleed/ignite/shock/chill/freeze, curses, taunt, impale, cooldown recovery, damage-over-time defence cycles, explosions, flasks, corpses/automatic offerings, mercenary, Sentinel and totems.
- Ordinary class gear provides actual conditions for the conditional nodes: initial armour/evasion/ES, shield, leech/poison/charge-generating weapon, magic utility flask; Warden's initial weapon adds small amounts of all three elements. These are **survivor items**, not claimed original PoE item rolls. Class loot includes helmet/shield/offhand; offhand and shield replace each other.
- Enemy contact/projectile events exercise stuns, knockback, blind, curses, ignition/chill, critical hits, regeneration and rare-enemy reflection. Their magnitudes are encounter tuning for this game, not imported monster stats.
- Four visible ethereal obelisks in `run.terrain` stop friendly and hostile projectiles. Heroes/enemies pass through them. Ricochet can redirect a projectile from terrain with the original 30% chance while a chain remains. The first physical collision still wins; existing collision regression tests remain passing.

## Public integration contract

Exports used by UI: `CLASSES`, `getAscendancies`, `getNotables(ascendancyId, run?)`, `classSummary`, `chooseAscendancy`, `chooseAscendancyNode`, `allocateAttribute`, `finishAscendancy`, `openAscendancy`. `getNotables(..., run)` gives the remaining real point cost after already allocated prerequisites.

Class state lives in `run.classState`; temporary mechanics in `run.classState.combat`. `player.mana/maxMana`, `energyShield/maxEnergyShield`, and `lightRadius` are real live values. Light radius has adapted base 120 pixels and applies the source small-node percentages; renderer integration was supplied by the parent.

Companions: `run.mercenary`, `run.sentinel`, `run.totems[]`, and existing `run.minions[]`. Objects carry `x/y/hp/maxHp`; Sentinel has `kind:'sentinel', level:20`, totems have `life`. Mercenary and Sentinel respawn after five seconds. Spectres have HP/ES in class runs.

Flasks: `combat.flaskCharges`, `combat.flaskUntil`. Current generic auto-flask costs 20 charges for four seconds, refills from kills and source notables; `classEquipmentModifier(run,item,key)` gates flask effects on activity and applies magic utility flask effect modifiers. The forthcoming original Dying Sun pass must override its own costs/duration instead of treating these generic values as PoE values.

Adrenaline: `combat.adrenalineUntil` timestamp; currently +100% increased damage, +25% attack/cast/movement speed and 10% additional physical reduction. `First to Strike` queues recovery after the triggering nonlethal hit, so it cannot prevent lethal damage or resurrect the character.

## Verification

`node --test tests/*.test.mjs`: **156/156 passing** at handoff: 105 new class tests plus the 51 prior tests. Tests check all 84 source selections/paths and independently asserted numeric/conditional effects across every Ascendancy. This is broader than metadata coverage, but is **not** proof of every possible combination or complete parity with PoE.

Confirmed regression fixes during this pass: double vitality healing, fifth phantom trial, payable choice-hub semantics, return projectiles expiring without returning, existing minion HP/ES not refreshing, impales triggering on their own application hit, lethal damage triggering Adrenaline recovery, recovery resurrecting a dead player, uncapped maximum elemental resistance.

A deterministic bot ran all 21 Ascendancies, seed 42, no extra bonuses or invulnerability. It chose offered skills/supports, equipped loot, allocated Strength, collected XP, avoided nearby enemies and spent only legally earned points. The preliminary completed run produced 20 wins and one Berserker death at 461 seconds; all 21 reached all four trials, with no NaN, entity-limit violation or stuck menu. A final rerun of the frozen module is recorded below once complete. The bot is a smoke test, not a balance guarantee; it uses one seed and one simple decision policy.

## Explicit adaptation boundaries and remaining acceptance concerns

The source catalog's percentages, flat modifiers, point costs and conditional descriptions are original. The surrounding survivor systems are adapted: nearby = 220 pixels; 1.5 metres = 60 pixels; base totem duration eight seconds; summon HP/DPS, offering/aura baselines, cooldowns, ailment thresholds and projectile distances are game tuning. Unbound is automatically used at 100 Fury for ten seconds. Consecrated Ground's 5% life regeneration is source-backed (PoE Wiki revision 1660567); the simplified movement-slowing curse is this mode's automatic curse.

Specific incomplete fidelity to keep visible during acceptance:

1. **Known scoping issue at freeze:** several player-only `classHit` effects can still also reach `isMinion:true` hits. Skill-stat modifiers already keep Aspect of Carnage and several other player damage bonuses off minions, but the hit hook needs a complete actor-scope pass (especially Shapers, poison/critical triggers and culling). Do not describe this as exact PoE ownership semantics.
2. **Known armour issue at freeze:** `classIncomingDamage` currently applies the armour formula to physical damage over time and the Unbreakable chaos branch without requiring a hit. Armour must be restricted to hits; endurance/other actual damage-over-time reductions must remain separate. Reported to the parent for correction before acceptance.
3. Ailment damage is based on the simplified damage event, not the complete PoE damage-component/critical/ailment pipeline. Warden's mixed damage uses a compact trigger model. Physical-to-fire conversion is a compact mitigation model rather than separate independently mitigated components. Multiple shock/wither expirations use aggregate state.
4. Mercenary has its own HP, attacks, aura, taunt, recoup and unique-item damage multiplier. **Mercenary-owned minions do not exist.** Unique weapons/shields can be equipped/copied through normal loot. **Quiver and amulet item generation/UI are absent**, despite preserving the source permission lines and prerequisite data; these slot clauses are not exercised in the ordinary run.
5. Mana has defensive consumption and regeneration; automatic skills do not reproduce individual PoE mana costs/reservations. Radiant Faith automatically reserves half the mana pool. The three types of manually allocated attribute passives are the mode's explicit substitute for distinct Mastery types used by Polymath.
6. Some original small-node ailment-duration detail is only applied to ignition/poison rather than an exhaustive separate clock for every ailment. Full global leech-instance limits, minion ownership combinations and all conversion/resistance interactions are not a PoE simulator.

These concerns are concrete limits, not a claim that all original stat lines are fully verified. All 84 choices have an active defining mechanic, but the remaining actor-scope/armour defects should be resolved before asserting full correctness of the selected effects.

## Handoff addendum

The parent reviewer identified another acceptance defect: Intelligence currently uses `0.002 * INT` for increased maximum Energy Shield, while the original modifier is `0.001 * INT`. Several corresponding expectations currently mirror the incorrect 0.002 and must be corrected against the source. It is **not** verified correct by the passing suite.

Saved bot artifacts from this session:
- Runner: `/private/tmp/duskbound-classes-bot.mjs`.
- Completed 21-run result (20 wins / one Berserker death): `/private/tmp/duskbound-classes-bot-final.txt`.
- Previous completed result: `/private/tmp/duskbound-classes-bot-results.txt`.
- Last rerun output, started before the parent's stop instruction: `/private/tmp/duskbound-classes-bot-frozen.txt`; not inspected after that instruction and not used to strengthen the verification claim.
- Full test output at freeze: `/private/tmp/duskbound-suite-results.txt` (156 passing).

Core/classes/test ownership is released. No further code changes from this agent after handoff; follow-up review fixes and original uniques belong to the parent-coordinated next pass.

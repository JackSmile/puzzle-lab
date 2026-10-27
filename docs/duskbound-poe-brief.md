# Duskbound PoE 1 extension

User explicitly changed requirement: use popular skills and linked support gems from recent PoE1 leagues based on poe.ninja, not our arbitrary four classic spells. Extend ONLY `games/duskbound/core.mjs`, `tests/duskbound.test.mjs` and optionally `tests/duskbound-poe.test.mjs`. Own report `docs/duskbound-poe-report.md`. Parent owns renderer/app/HTML. No commits. Use TDD on new behaviors. Existing numeric balance can change if new explicit rules require it; retain meaningful earlier tests adjusted to new requirements rather than weaken them.

## Verified sources 27 Oct 2026

poe.ninja Allflame latest snapshot Experience ladder: Winter Orb 7%, Righteous Fire 5%, Raise Spectre 4%. Mirage: Blade Vortex 7%, Kinetic Fusillade 7%, Righteous Fire 5%. Filtered support-gem sections:

- Winter Orb: Infused Channelling86%, Focused Channelling82%, Power Charge On Critical73%, Inspiration58%, Cold Penetration46%, Hypothermia20%, Multiple Projectiles11%.
- Righteous Fire: Burning Damage99%, Elemental Focus95%, Swift Affliction78%, Lifetap76%, Efficacy63%, Increased Area of Effect39%, Concentrated Effect35%.
- Blade Vortex: Minion Pact94%, Greater Unleash88%, Lifetap62%, Added Fire Damage46%, Elemental Focus34%, Increased Critical Damage33%, Increased Area of Effect14%.
- Kinetic Fusillade: Less Duration99%, Greater Volley96%, Ballista Totem91%, Increased Critical Damage85%, Elemental Damage with Attacks49%.
- Raise Spectre: Minion Damage58%, Greater Spell Echo42%, Pierce42%, Returning Projectiles40%, Controlled Destruction40%, Empower39%.

These are selection evidence only. All actual gameplay numbers below are our adaptation, NOT assertions about PoE.

## Active skill API

Keep existing internal IDs to avoid breaking parent integration: bolt becomes Winter Orb, orbit becomes Blade Vortex, nova becomes Righteous Fire, lightning becomes Kinetic Fusillade, add minion=Raise Spectre. All names English as above, Russian descriptions. type remains weapon, add `sourceName` optional. Character IDs unchanged: warden Chieftain (nova); witch Elementalist (bolt); seer Necromancer (minion). Descriptions explain actual new behavior. Three distinct starts all viable. warden may start regen1 to offset RF drain. Weapon max6.

- bolt: floating orb shoots ice projectiles toward nearby enemies; hits cause modest chill (slow~25% for~1s). Preserve baseline auto-aim. Projectiles set `element:'cold'`.
- orbit: existing spinning blade position contract unchanged.
- nova: constant fire aura, not periodic burst; `stats(run).fireRadius` ~90+levels; enemy periodic burns at ~0.25s, drain owner health ~0.25% maxHP/sec but never below1. Regular enemy contact can still kill. Give starting Chieftain enough regen for playability. Burn hit texts/effects rate-limited.
- lightning: charged kinetic volley of several projectiles; no lightning chain. projectiles `element:'kinetic'`. Splash radius on impact is acceptable. stats `kineticCount` default3. It need not be full totem simulation unless supported.
- minion: 1-3 spectral allies follow the player, auto fire projectiles at enemies. `run.minions: [{id,x,y,shotTimer}]`, bounded. Element spectral. Minions invulnerable adaptation. `stats.minionCount` positive if active.

## Genuine per-skill support links

Add `run.links = {}` with each weapon entry a map `{[supportId]:level}`. Supports max3, maximum TWO distinct supports per weapon. `UPGRADES` also contains supports type='support', compatible array. Export `supportTargets(run,id)` (array eligible equipped weaponIDs), `skillStats(run,id)` returns `{damage,cooldown,area,projectiles,pierce,critChance,critMultiplier}` with neutral defaults and normalized meaningful modifiers.

`chooseUpgrade(run,id,target)` must require offered support + a valid target if support selected, reject invalid/unowned targets with no phase changes. Only links[target] benefits; unrelated skillStats unchanged. Supports not stored in global upgrades, only run.links. Only offer support if supportTargets nonempty. UI first chooses support card then selects a target skill; phase stays upgrade during target selection. Normal weapon/passive choice unchanged.

Include these source-confirmed supports with Russian explanation and English name:
- `infused`: Infused Channelling (bolt): increased orb damage with brief stationary focus; if full channelling awkward, bonus damage plus extra orb firing rate while stationary, explicitly describe adaptation.
- `burning`: Burning Damage (nova): +30% burning damage per rank.
- `volley`: Greater Volley (lightning): +2 projectiles per rank with~15% less damage.
- `unleash`: Greater Unleash (orbit): +1 orbiting blade per rank (adaptation explained).
- `minion_damage`: Minion Damage (minion): +30% minion damage per rank.
- `pierce`: Pierce (minion and bolt): +1 piercing target per rank (source confirms minion linkage; bolt compatible by projectile mechanics).
- `area`: Increased Area of Effect (orbit/nova/bolt): +20% area radius per rank, explain radius as own balance.
- `critical`: Increased Critical Damage (orbit/lightning): add crit chance baseline~10%, +0.4 crit multiplier per rank. Seeded randomness, test deterministic outcomes or stats independently.

Infused and critical optional if difficult; at least six distinct linked supports from the proven lists must affect actual combat, not only descriptions. Existing passive definitions retained.

## Equipment

Add run.equipment={weapon:null,body:null,flask:null}, run.loot=[], run.pendingItem=null. New phase loot. Exports `equipLoot(run,take=true)`, `rollItem(run, rarity?)` (normal gameplay factory, useful tests). Items `{id,name,slot,rarity,icon,color,description,mods:{damage,cooldown,speed,maxHp,regen,pickup,projectiles}}`; rarity magic blue, rare yellow, unique orange. Random magic/rare items 1-3 modifiers; bounded no invented UI claims. Every60s spawn elite by enhancing a normal enemy with `elite:true`; killing elite drops one loot. The first elite should be at~35s for early reward. Force at least first loot before80s if killed. Loot object `{x,y,item}`; pickup within~40worldunits pauses phase loot and moves item to pendingItem. equipLoot validates state, swaps slot atomically, recalculates player stats, increases HP only by positive maxHp delta and clamps to new max; skip doesn't mutate equipment. Resolve banked levelup after loot. Reject repeated decisions safely. Bound loot to12.

Verified item associations: WinterOrb/Allflame Dying Sun44%; RighteousFire/Allflame Nebulis67%, Cloak of Flame67%; overall Allflame Watcher's Eye44%, Mageblood33%. Use Dying Sun flask (extra projectile and area), Nebulis weapon (elemental damage bonus), Cloak of Flame body (maxHP/regen/less received damage) as explicitly SIMPLIFIED adaptations, not exact original affixes. Random rare names can be original Russian. These unique names/source associations are confirmed; mod magnitudes are our gameplay. Do not implement unrelated uniques or claiming original stats.

## Render/controller contract additions

stats adds fireRadius,minionCount,kineticCount and maintains old fields. Rendering uses run.minions, run.links, run.loot and run.pendingItem. All original phase checks extend for loot. All arrays bounded. setPaused does not override loot. Golden outlines mark elites. Enemy slow state optional fields `chill`/`chilledUntil` documented in report. All particles keep previous contract.

## Tests and report

Run previous suite plus tests for per-skill support isolation, compatibility/max links/ranks, volley actual projectile count, aura continuous damage and self drain, cold slowing, minion attack, item roll reproducibility/valid mods, equip/skip idempotence and maxHP clamping, loot pause and choice, no duplicate elite rewards, longrun with automated support and loot handling. Report exact exports/state additions and test output. No browser work necessary.

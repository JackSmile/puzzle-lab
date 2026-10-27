# PoE 1 Skill Animation Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development. The user has directly requested PoE 1 skill animations as a continuation of the already approved PoE visual direction; no new gameplay design is being proposed.

**Goal:** make the five Duskbound skills visually recognizable from observed PoE 1 references.

**Architecture:** dedicated Canvas VFX module, integrated into the existing Renderer. It reads live projectiles, skill levels, weapon timers, minions and impact effects; it must not modify the battle model. Cached procedural textures and bounded visual history provide smoke, trails and layered animation without external runtime dependencies.

**Tech Stack:** existing vanilla ES modules, Canvas 2D, static HTTP.

## Global constraints

- Preserve core.mjs/classes.mjs/uniques.mjs and gameplay rules, counts, damage, collision geometry, seed/RNG and timing.
- Baseline before this task: 227 Node tests passed; reference and verification reports are historical evidence, not a claim new VFX have been checked.
- Read actual video/reference frames. Distinguish observed base visuals, historical visuals, MTX ambiguity and local animation adaptations.
- Recreate reference behavior for this 2D renderer; do not claim imported original 3D assets, extracted shaders or exact frame-for-frame copying.
- Animations freeze with run.time on pause/upgrade/loot/Ascendancy; menu preview may continue using its existing presentation clock.
- Keep real collision positions legible. Blade positions use the model's angle time*2.6+i*2π/count and orbit radius; extra trails may add motion without changing hits.
- Distinguish hostile red projectiles. Respect reduced-effects mode, cull offscreen details and bound visual state under projectile cap500.
- All assets/URLs relative; no libraries, network runtime, or unrequested publication/commit.

## Task 1: References and concrete design

Files: docs/duskbound-vfx-sources.md and research addendum docs/duskbound-vfx-sources-extra.md.

- [x] Inspect existing renderer and live model contracts.
- [x] Observe Winter Orb in Peuget2 PoE3.29 video https://www.youtube.com/watch?v=62JkpZ4VtCk (opening gameplay and ~0:26). White/ice cloud-like globe above the character, blue-white ice projectiles and large pale ground bursts. The video's MTX inventory is not confirmed; do not claim guaranteed base skin.
- [x] Read Kinetic Fusillade current Wiki and original official announcement https://www.pathofexile.com/forum/view-thread/3869068. A bank of hovering anomalies releases after a short wait; not chain lightning. Current text source https://www.poewiki.net/wiki/Kinetic_Fusillade.
- [x] Investigate Kinetic visual appearance: official Keepers Panel8 at2.60s supplies the blue-white kinetic motif. The montage does not label individual segments, so precise isolated Fusillade attribution remains unproven and is documented in sources. DireGray ~3:10 contains Spellslinger and is excluded as isolated evidence.
- [x] Integrate observed RF/BV/Raise Spectre source research, noting uncertainty where applicable.

## Task 2: VFX implementation

Files: create games/duskbound/skill-vfx.mjs, modify games/duskbound/render.mjs, write docs/duskbound-vfx-report.md. Implementation owner receives a focused brief after source inspection.

- [x] Add a fixed-palette cached glow/particle stamp layer and bounded visual history. Reset per-run identity; prune dead projectile IDs; avoid Math.random/model RNG calls and any writes to run/entities.
- [x] Winter Orb: larger layered ice globe, continuous rotating wisps/facets, channel pulse, frost projectile tails and distinct fragmented ice impact. Keep projected ground landing/collision legible.
- [x] Blade Vortex: translucent pale mint/cyan spectral blades and swept circular trails at actual model blade positions. Replace purple rectangular toy-swords.
- [x] Righteous Fire: continuous turbulent fire boundary, hot inner edge, darker red outer flame and embers; preserve the actual radius. Replace dashed geometric circle. Do not inherit Celestial starfield MTX.
- [x] Kinetic Fusillade: show a hovering bank before the next real volley, then energetic projectiles/impact with observed palette and shape. Wind-up is presentation tied to existing weapon timer, no added attack delay or changed damage. Reduced mode retains the bank/shot silhouette with fewer decorative particles.
- [x] Raise Spectre: use observed pale blue translucent full monster silhouette, subtle ghost-motion/cast pose and read actual new minion/projectile events. Its projectile is an adaptation of the selected ranged spectre; RS does not have a universal original projectile. Do not invent an observed summon glyph/burst.
- [x] Replace the current generic friendly-dot drawing with skill-specific bodies/trails. Keep hostile danger styling stable. Remove superseded skill blocks rather than stacking duplicate auras/effects.
- [x] Check syntax and preserve comments. No mechanical unit tests mirroring drawing commands; relevant verification is visual inspection plus unchanged-model hashes/full existing tests. Add only meaningful bounded-state/pause checks if the implementation introduces persistent state.

## Task 3: Visual verification and handoff

- [x] Add a separate local skill showcase using the actual Renderer and controlled model fixtures, allowing each skill to be inspected without random upgrades. Keep it outside the main user flow; clearly a skill preview.
- [x] Review integration and bounded-state behavior independently; address concrete findings.
- [x] Run node --test and syntax checks; compare core/classes/uniques checksums with before-task values.
- [x] Browser-check all five effects, normal/reduced mode, pause frame stability, 1280x720 and390x844. Save before/after or gallery screenshots with real JPEG metadata; inspect console.
- [x] Restore viewport, preserve the playable game/showcase tab, update sources/provenance/verification without overstating fidelity or reusing old balance results as new VFX evidence.

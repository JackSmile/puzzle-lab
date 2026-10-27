# Duskbound: PoE-reference skill animation implementation

Implementation and final verification date: 2026-10-27. Initial implementation evidence and the final independent/browser verification are recorded separately below.

## Scope and sources

Recreated Canvas2D presentation from the observed references in [sources](./duskbound-vfx-sources.md) and [research addendum](./duskbound-vfx-sources-extra.md). No original PoE models, animation clips, shaders or game files were imported. No runtime network dependencies were added.

- **Winter Orb:** a larger white-blue cloud globe, three counter-rotating cloud layers, orbiting facets/wisps, channel pulse; sharp ice-cloud shots with tapered tails and fragmented ground impacts. The globe remains an elevated presentation above the player. Shots stay at their actual `x,y`; no invented ballistic path, target prediction or displaced collision point. This intentionally preserves the existing straight-shot adaptation rather than pretending it implements PoE ground-targeted ballistics.
- **Blade Vortex:** mint/cyan translucent pointed blades, pale edges, fading swept ribbons and secondary glints. Every primary blade uses exactly `run.time * 2.6 + i * 2π / orbitCount` and `stats(run).orbitRadius`. The extra ribbons do not move the primary blade or alter hit geometry.
- **Righteous Fire:** continuous uneven orange/gold hot lip, darker red outer heat, animated outward flame tongues and rising embers; transparent center. The boundary is anchored to `stats(run).fireRadius`; its edge shimmer is cosmetic. No starfield/Celestial interpretation.
- **Kinetic Fusillade:** dark-blue haze with white-blue sharp coronas gathers near/behind the player during the final 0.55s of the existing lightning timer. The actual existing cast effect and projectiles show release/impact bursts and short comet tails. The gather is cosmetic and adds no delay. The five decorative bank anomalies (three reduced) are a visual motif, not a promise about projectile count. No chain-lightning replacement.
- **Raise Spectre:** the existing full spectral creature sprite is cached with a pale-blue tint and drawn translucently with bobbing and actual movement afterimages. A subtle lean and hand flash are triggered by newly observed, recent `spectral` projectiles whose `context.actor.id` matches the minion. First observation/respawn has a brief fade; neither fade nor hand flash is claimed to reproduce an observed summon animation. The selected Duskbound ranged caster uses a neutral spectral lance; Raise Spectre has no universal original projectile. Mercenary minions remain supported.

Historical official BV is the strongest base-visual reference. RF and Winter Orb cosmetic inventories were not verified; RS is historical creature-dependent footage. The official Kinetic montage's blue-white energy segment is used with its documented per-skill attribution limit. Procedural timing, exact shapes and 2D posing are local adaptations.

## API and integration

External `Renderer(canvas)`, `resize()`, `render(run, options)` and `drawPortrait` remain unchanged. Internal module `games/duskbound/skill-vfx.mjs` exports:

- `VfxHistory`: simulation-clock observation with renderer-owned bounded maps.
- `SkillVFX(context)`: `begin(run, time, lowEffects, visible)`, `ground(stats)`, `overhead()`, `spectre(ally, drawSprite)`, `projectile(shot)`, `effect(effect)`.

`projectile`/`effect` return whether the skill layer handled the object, so existing hostile/other rendering remains available. Ground auras render below actors; elevated globe/bank and real projectiles render above them. Existing environment, loot, hero/enemy, mercenary, sentinel, totem and non-skill effects remain in the renderer. Superseded generic skill blocks were removed. Existing comments describing unchanged code were preserved.

## State, time and cost

- No writes to model entities, timers, RNG or combat arrays. No `Math.random`, wall-clock scheduling or model-RNG calls.
- Live animation uses `run.time`; paused/upgrade/loot/Ascendancy frames cannot advance it. The existing menu presentation clock is used for decorative animation; collision-primary BV positions still use `run.time`.
- State resets on run object identity change or simulation rewind. Repeated simulation time does not append samples or retrigger cast flashes.
- Seen projectile IDs: maximum 512 (above the current 500 model cap). Detailed visible projectile histories: maximum 160. Ally histories: maximum 32. Each point history: at most six snapshots, sampled at most 30 times per simulation second. Removed/offscreen projectiles and dead/removed allies are pruned; respawn starts fresh.
- Detailed projectile glows/tails are budgeted to 100 visible shots per frame (40 reduced). All other visible supported projectiles retain their distinct skill silhouettes. Offscreen projectiles, spectres and skill impacts skip drawing. Renderer camera culling includes a 100-unit margin.
- Soft glows/cloud textures are small procedural 128×128 canvases cached on VFX construction. Spectral body tint is cached offscreen and rebuilt only when the existing atlas becomes available. There are no per-frame gradients in the new skill layer.
- Reduced effects retain the globe, blades, fire boundary/tongues, kinetic bank/coronas, spectre bodies/cast flash and different projectile heads. They reduce globe layers/facets, ribbon segments, flame tongues and impact shards; omit embers, movement afterimages, sampled projectile tails and extra cloud overlays.
- Cast observation only accepts newly seen shots with `life > 1.35`, avoiding a late flash for an old projectile when attaching a renderer mid-flight. Very low frame rates can miss an ephemeral shot/cast; presentation does not synthesize attacks absent from the observed model.

## Verification performed

- Added `tests/duskbound-vfx-state.test.mjs`: four meaningful tests for repeated-time freeze and new-run reset; bounded/pruned history; actual actor cast with frozen-model immutability; offscreen exclusion and death/respawn. All four first failed against an empty observation implementation, then passed after implementation. No drawing-call mirror tests.
- `node --check games/duskbound/skill-vfx.mjs` — passed.
- `node --check games/duskbound/render.mjs` — passed.
- `node --test` — **231 tests passed, 0 failed, 0 skipped**, including the original 227 tests and four new state tests.
- SHA-256 comparison with `/tmp/duskbound-vfx-model-before.json` — all three model files byte-identical:
  - `core.mjs`: `7578e31267cd5fbf3e6e234e397de0c5019c56a11adc9ea19e9a74b82b7a5ea3`
  - `classes.mjs`: `ae58fda665e647b8c9a4c7967707107f4759d3a8125fd725acbed92a56d41865`
  - `uniques.mjs`: `d727256d385fe10a442cb8ccc84231a107cf103d54962868a6fb2991b9433e01`

At implementation handoff, browser appearance, integration, mobile and pause checks were still pending. They were subsequently performed as recorded below. Node tests alone do not establish visual fidelity or measured frame performance.


## Final review and browser verification

The coordinator independently reran the full final suite after visual polish: **231 passed, 0 failed, 0 skipped/cancelled** (1.463s). Syntax checks passed for skill-vfx.mjs, render.mjs and showcase.mjs. All three model SHA-256 values above still match the pre-VFX baseline. The earlier 21-class bot matrix was not repeated because those model files are byte-identical; it is historical balance evidence, not a new VFX test.

An independent reviewer inspected the implementation, renderer diff, state tests and gallery fixtures. No confirmed P1/P2 findings. The reviewer ran the four state tests and simulated all six gallery fixtures for24s: each stayed playing at level1 with9 targets and no loot. Actual minion casts occurred in minion/all fixtures. A second scoped review approved the final RF visual polish and preview-only damage-number suppression. This code review does not claim visual similarity or frame performance.

Browser checks in the in-app browser:

- All five solo selections and the combined scene displayed distinct effects: ice globe/shots, mint blades/ribbons, fire boundary, kinetic bank/impacts, blue full-body spectres. Multiple captured Kinetic phases showed the bank building from partial to full; movement-preview frames showed spectres following the moving hero.
- Normal and reduced combined scenes retained the core silhouettes. Reduced mode visibly removed detail. RF was refined after visual inspection: shorter irregular translucent flame tongues and cached diffuse fire glow replace a visually repetitive toothed ring. Radius/clock remain unchanged.
- Final combined-scene screenshots on pause were byte-identical. Resume changes the frame. State tests separately cover repeated simulation time and run reset.
- Gallery at1280×720 and390×844: all six choices and controls visible; mobile document scrollWidth equals390 (no horizontal overflow). JPEG files independently identified as1280×720 and390×844.
- Main game reloaded, Marauder started with the new RF; after a real level-up Blade Vortex was selected and appeared with RF. Pause/resume and return to class selection worked. Final model rules were not changed by the RF polish.
- No warn/error console messages captured from the inspected game/gallery pages. Viewport override was reset and game/gallery retained as deliverables.

The separate [skill gallery](../duskbound-skills.html) uses actual createRun/tick/Renderer with stationary high-HP targets, no spawning/progression and preview-only suppression of floating damage numbers. It does not touch profile/storage. The main game still shows damage numbers.

Screenshots: [desktop](./screenshots/duskbound-vfx-desktop.jpg), [mobile](./screenshots/duskbound-vfx-mobile.jpg).

Limits: no original PoE animation files imported; this is a procedural2D reconstruction from the linked references. Exact current base-skin identity is not proven for every source (see source caveats). No measured FPS benchmark, real-device mobile test, Safari/Firefox pass or new full manual eight-minute run is claimed.

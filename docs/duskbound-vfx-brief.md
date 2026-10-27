# Duskbound PoE VFX implementation

Read docs/duskbound-vfx-sources.md and docs/duskbound-vfx-sources-extra.md FIRST: observed references, palettes, source URLs and uncertainty. User specifically requested that skill animations also come from PoE. We have authorization to recreate the visual reference in the approved2Dsurvivor; do not claim imported original3Dassets.

## Ownership and boundary

Own NEW games/duskbound/skill-vfx.mjs and games/duskbound/render.mjs, plus docs/duskbound-vfx-report.md. Parent owns local preview/gallery and docs. Do not edit core.mjs/classes.mjs/uniques.mjs/app/profile/UI CSS/gameplay tests. No commits/browser. Preserve existing comments or accurately update when replacing their code. Existing227tests passed. All actual combat geometry/timing/damage/seed must remain unchanged.

Implement a substantial polished animation upgrade for ALL5skills, not a palette-only adjustment. Current renderer has tiny orb, dashed fire ring, purple rectangular BV swords and identical ellipsoid friendly projectiles. Replace those duplicated blocks with a focused VFX module; keep other environment/hostile/equipment/allied/boss rendering working.

## Required visuals

1. Winter Orb: large pale/white-blue turbulent ice globe above player (current model shot origin player.x,y-24; current visual orb y-58). Multiple orbiting wisps/facets and channel pulse; compact icicle/ice-cloud shot heads with tails, cold shards/ground impacts. If projecting height/arc, keep actual ground position/shadow and end impact readable; don't falsify collision or read hidden future model state. Can track initial visible trajectory/nearby target only as cosmetic projection, document approximation.
2. Blade Vortex: pale mint/cyan translucent spectral blades, swept circular ribbons/afterimages, glinting metal-edge shapes. ACTUAL blade center angles MUSTstay run.time*2.6+i*2π/count and radius stats(run).orbitRadius; never move primary blade independently from actual hit. Rich trails may imply faster swirl. Remove purple toy-sword rectangles and geometric thin outline as sole effect.
3. Righteous Fire: continuous uneven orange/gold fire annulus, hot inner lip, darker red outer flame/heat, moving tongues and embers, visible ground/player center. Radius is stats(run).fireRadius. No Celestial starfield. Reduced mode still unmistakable fire boundary with fewer layers.
4. Kinetic Fusillade: white-blue energetic anomaly bank hovering near/behind player before next REALvolley; use existing run._weaponTimers.lightning and actual new kinetic shots/cast effects, no attack delay/mutation. Blue-white sharp coronas/dark haze/short comet tails, distinct kinetic burst. This is not chain lightning and not the unrelated orange/gold segment of official montage.
5. Raise Spectre: pale blue translucent whole creature/caster silhouettes using existing spectral sprite, ghost motion trails and subtle cast pose/hand-flash tied to ACTUAL new minion projectile actor.id. Existing selected ranged spectre has its own neutral spectral projectile, not a universal claimed RSprojectile. First-seen/respawn fade may be local presentation, no invented 'observed PoE summon rune'. Mercenary minion rendering remains supported (can share a restrained ghost style).

## State/performance/API

Use live run.time; paused/upgrade/loot/Ascendancy do not animate forward. Existing menu preview clock remains allowed. No Math.random or model RNG, no writes to run/player/enemies/projectiles/minions/effects. Renderer-local history resets on run identity change; prune removed IDs and cap visual histories/trail points. Reduced-effects mode must preserve core silhouettes and actual attack indications. Budget expensive layered effects for visible projectiles rather than all500; hostile projectiles remain legible red/original existing path. Cull offscreen details. Prefer cached procedural stamps/textures and ordinary Canvas2D blending over per-frame massive gradients or image generation.

Can choose clean helper API between render.mjs and skill-vfx.mjs; report it. Keep Renderer constructor/render/resize/drawPortrait external interface unchanged. Core producers: projectile fields {id,x,y,vx,vy,travel,life,element:'cold'|'kinetic'|'spectral',context:{skillId,actor:{kind,id,ownerId}}}; effect.kind frost(.18s),kinetic cast(.3s)/impact(.18s),burn(.24s),hit/death/heal etc. run.minions[].hp/maxHp/shotTimer; mercenaryMinions[] at most1. Newly observed projectile actors can trigger local cast flash without changing model.

Parent will add a separate visual skill preview page using actual Renderer/model fixtures, then inspect all5 atdesktop/mobile and reduced mode. No mechanical unit tests that merely mirror draw calls. If persistent state is introduced, add only meaningful isolated tests for state bounds/reset/pause/no-model-mutation if feasible without large fakeDOM. Existing fullsuite and unchanged-model hashes plus actual browser visual checks are required. You may create tests/duskbound-vfx-state.test.mjs ONLY if covering those real invariants, not 'called arc()' assertions.

## Handoff

Run node--check changed modules and full node--test; report actual counts and caveats, not claims of visual fidelity without screenshots(parent owns browserQA). Write docs/duskbound-vfx-report.md with changed mechanisms, history/budget limits, low-effects behavior, any approximations, and tests. Return short status and freeze files for parent/reviewer. No unfinished placeholders. Model sources must remain byte-identical.

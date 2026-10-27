# Duskbound simulation task

Implement ONLY `games/duskbound/core.mjs` and `tests/duskbound.test.mjs` in `/Users/artemetoya/Documents/zxc/puzzle-lab`. Other files are owned by the parent agent. No external libraries. Use test-first for meaningful gameplay rules and run `node --test tests/duskbound.test.mjs`. Do not commit (shared checkout). Report test evidence and any limitations to `docs/duskbound-engine-report.md`.

## Fixed module contract

Export `DURATION = 480`, `UPGRADES` (object of upgrade definitions), `CHARACTERS` (array), `createRun({seed=1, character='warden', bonuses={}}={})`, `tick(run, dt, input={x:0,y:0})`, `chooseUpgrade(run, id)`, `setPaused(run, paused)` and `stats(run)`.

Each character has `{id,name,title,description,weapon,color}`. IDs `warden` (bolt), `witch` (orbit), `seer` (lightning). Russian strings. Weapon IDs `bolt`, `orbit`, `nova`, `lightning`; passive IDs `might`, `haste`, `vitality`, `magnet`, `stride`, `regen`. UPGRADES entries `{id,name,description,icon,type,max,color}` with type weapon/passive, icon string symbol. Maximum weapon level 6, passive level 5.

createRun returns mutable state with `phase:'playing'`, `time:0`, `seed`, `character`, `player:{x:0,y:0,hp,maxHp,speed,radius:12,invulnerable:0,facingX:1,facingY:0}`, `enemies:[]`, `projectiles:[]`, `gems:[]`, `effects:[]`, `texts:[]`, `kills:0`, `level:1`, `xp:0`, `xpNeeded:8`, `score:0`, `upgrades:{[startingWeapon]:1}`, `offered:[]` (IDs), `bossSpawned:false`, `bossDefeated:false`. Extra private state is fine. Phase values `playing`, `paused`, `upgrade`, `dead`, `won`.

Enemy objects `{id,kind,x,y,radius,hp,maxHp,speed,hit:0}` with kinds `skull`, `bat`, `ghoul`, `cultist`, `knight`, `boss`. Additional fields okay. Player projectiles `{id,kind,x,y,vx,vy,radius,color,life}`; enemy projectiles also have `hostile:true`. Gems `{x,y,value,radius}`. Effects `{kind,x,y,life,maxLife,color,radius}` optional `{x2,y2}` for lightning; supported kinds `hit`, `death`, `nova`, `lightning`, `spawn`, `heal`. Texts `{x,y,value,color,life}`. stats returns `{damage,cooldown,speed,pickup,maxHp,regen,orbitCount,orbitRadius}` with positive useful defaults.

## Rules

tick mutates and returns state. Clamp dt to [0,0.05]; normalize diagonal movement and cap input length 1. Stop all simulated time in non-playing states. Input independent of resolution; world unbounded, player-centered camera. Spawn enemies offscreen around player (distance about 650-850 world units); progressively denser waves (cap 180 regular enemies) and different types, telegraphed slower boss appears at 450 seconds. Victory only when time >= 480 AND boss defeated. Player zero hp causes death and never victory in the same tick. Stop new regular enemies after 480. Boss must spawn exactly once even if previous boss dies. Enemies move toward player, contact damage with ~0.7 sec invulnerability. Automatically aim bolts at nearest enemy, orbit blades damage enemies by position with per-enemy cooldown, periodic nova AoE and chain lightning select nearby targets. Health pickups occasionally from kills are optional, no requirement.

Dead enemies reward exactly once, drop XP gems, score and effects; arrays are bounded / expired objects removed. Gems persist (merge/compact if many) until collected, magnet range pulls them toward player. Player xp >= xpNeeded pauses game in upgrade phase and offers three distinct eligible upgrade IDs (or fewer only if pool exhausted). chooseUpgrade accepts ONLY offered IDs, increments capped upgrade, resumes play; if enough banked xp for another level it offers next choice without simulating. Never offer maxed upgrades. Vitality increases maxHp and heals by the same amount; all-passives-max fallback may heal when all options exhausted to avoid softlock. setPaused only changes playing↔paused, never override upgrade/dead/won.

Balance for a satisfying playable first run: early kills should yield first upgrade in ~15-25 seconds while moving to collect gems. Starting attacks should be viable for all three heroes; enemy speed below player speed and good initial health buffer. Later enemies should become stronger and more varied. Derive stat multipliers from upgrades in one place. Seeded random generator; no DOM or performance clock dependencies. Browser controller consumes state directly; no test-only hooks.

## Verification

Test observable rules: movement distance and diagonal cap; pause time frozen; autoattack kills nearby enemy and awards once; damage invulnerability; gem collection triggers choice; invalid/capped choices rejected and banking xp handled; vitality health; boss single spawn; victory timing and death precedence; dt bounds; reasonable object counts in a simulated long run. Independent expected numeric values, not copied implementation algorithms. Expose public state in tests as normal simulation inputs, not a separate developer API.

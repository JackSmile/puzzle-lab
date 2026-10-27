# Requirements:  standalone monster/boss subsystem (parallel withTask1)

Own NEW games/duskbound/encounters.mjs, NEW tests/duskbound-encounters.test.mjs and docs/duskbound-expansion-encounters-report.md only. Core/classes/uniques are exclusively Task1 until frozen; integration is Task3.

Exports stable APIs:
```js
export const MONSTERS; // map of8normal definitions with names, local balance, artKey
export const BOSSES; // brutus, merveil, dominus, kitava definitions
export const BOSS_SCHEDULE; // [{id:'brutus',at:120},...,kitava450]
export function initEncounters(run); // run.encounters + run.hazards, only class runs wired byTask3
export function spawnPoeEnemy(run, kind, position); // alloc ID/push, normal cap180
export function startBossEncounter(run,bossId,position); // activeboss state/publicpreview fixture
export function tickEncounters(run,dt,api);
export function recordEncounterKill(run,enemy); // returns {boss,uniqueReward,final}; updates queue, phases, defeated; exactlyonce
export function enemyTargetable(enemy); // alive, spawn warningdone, not explicitly invulnerablebody
export function proximityBlocks(run,enemy,origin,{isDot=false}={});
```
`api` callbacks: `random()` returns modelRNG; `projectile(origin,target,options)` uses currentcoreproducer; `damagePlayer(amount,context)` currenthurtPlayer; `damageAlly(ally,amount,context)` currentclassAllyDamage; `effect(kind,x,y,radius,color,life,extra)` currenteffects; `enemySpeed(enemy)`/`enemyCooldown(enemy)` classfactors. Allstate serializable, timer usesrun.time/dt. No imports fromcore/classes. Callback projectile options uses context type/components/spell/area/melee/enemyId and normal hostile=true. `origin` supplied for friendly source tests/barriers.

- [ ] MONSTERS8source archetypes +CarrionMinion daughter: Drowned meleewindup, Rhoa fixedline/sweptcharge, Goatman lockedlandingarc, AncientArcherphysicalattack, FlameSentinelfiremultishotspell, Evangelist delayedphysicalspell+actualbubble, CarrionQueenlimitednearbyadds+neutralphysicalspit(localchoice;sourceelementunknown), Tentacle two spinevolleys50/50physicalfire. Windups do not use spawntelegraph/invulnerability. Actionstate serializedas `enemy.action={kind,phase,startedAt,until,targetX,targetY,angle,...}`; normalrole key `enemy.poeKind` +kind equalsnormalid; bosses `kind:'boss',bossId,poeKind:<bossId>`. Rendererreads action/hazards and source definitions.
- [ ] Each entity retains hp/maxHp/radius/speed/xp/damage/hit/shotTimer/telegraph. Mixedprojectiles use context.components peramount. Active hazards bounded64, model warninggeometry incl circle/line/cone/ring/safeZone and timings; keep ownerId/bossId and damagecontext. On death remove pending owner attacks/hazards as appropriate. Heroandallies damaged through callbacks, onceperhit not repeatedrender. Dead/chilled/frozen handling deterministic; cannot-be-slowed Kitava/heart exceptions explicit.
- [ ] BOSS_SCHEDULE120/240/360/450, oneactiveboss, queued overdue followingdeath, no repeatedspawn. Suppress newregularwavesafter480, butpendingbossqueue survives. Use run._spawnTimer/_nextElite so oldskillpreview overridesInfinitycontinueworking; normalcap180 plusonebody andoneheart ifactive. Elites useapi or internal smallmodassign contract; do not bypass actual raremodifier mechanism (parentintegrationwillcallbackfactory ifneeded).
- [ ] Brutuschainpullphysical +three slams/wave; Merveil twoforms/icefanstorm thengeyseradds; Dominus lightningSouls/typedTouch thenAscendantbloodyrain withsafezone +distinctCorruptedBlood; Kitava stationarylargebody, swipes/firebreath andseparateheartphase. Bodyinvulnerableattargetlayer duringheart; heartdeath resumesbody once, notcountsasbosskill/drop. Bossmustnot runawayoffscreen; encountercenterstored. All numbers are localbalance. Sourcebranchesnotimplemented documented honestly.
- [ ] recordEncounterKill distinguisheshearttransition fromfinalbossdeath and returnsuniqueRewardonceperboss. run.bossDefeated trueonlyafterallfour (corelegacybossflagnotusedclassruns). Bossloot handledTask3actualrollItem unique. On reset cleanstate. Frontend bossHUD contract via run.encounters.activeBossId/defeatedBosses and enemyname/phaseLabel.
- [ ] Tests red→green: all8states distinguishable; windups remain targetable; actualhit/miss geometry; attack/spelltypedcontext; bubbleorigin/in-out andDoT confirmedsourcebehavior; caps; schedulequeue/death/transitions/oneunique; allbossphases; pause throughnotick; deterministicstate. Use independent knownpositions/expectednumbers, no mirroringdrawcalls. Reporttests and integrationnotes.


## Binding global constraints

Read approved spec docs/superpowers/specs/2026-10-27-duskbound-poe-expansion-design.md and three docs/poe-expansion-*-sources.md. Source numbers/conditions and current non-legacy variants are authoritative for item properties. Monster health/damage/radii/timers/local weapon base are explicitly Duskbound balance. Preserve7classes/21Ascendancies/84notables, five skill VFX, eight supports, level1/reset/equipment loss per run, desktop/mobile input. No runtime network. Model RNG only; bounded objects/state; live simulation time only. Reduced-effects retains all gameplay warning geometry. Do not weaken existing tests to obtain green. Separate item actor/hit/DoT/typed-component rules. No original3Dasset/animation extraction claim. No commit/push/PR/publication. Snapshot before this task: /tmp/duskbound-poe-expansion-baseline, baseline231tests pass.


## Additional confirmed shield contract
Proximity Shield removes damage of hits, not the hit event. Non-ailment DoT passes; ailments from zero-damage hit do not arise. Entity performing hit (minion/proxy itself), not owner outside, is source. Precise projectile snapshot and secondary explosion origin not established: our documented local policy is live actor position at impact, with stored source fallback for removed actors; secondary explosion uses explosion center as local adaptation. Read appended source section. Keep on-hit debuffs/events on zero-damage hits while suppressing damage-derived ailments/leech.

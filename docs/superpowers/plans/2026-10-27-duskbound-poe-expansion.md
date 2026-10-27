# Duskbound PoE content expansion implementation plan

> For agentic workers: use superpowers:subagent-driven-development. The user approved four bosses during the eight-minute run. Continue in the existing local feature checkout; retain all uncommitted previous work, no commits/push/publication. Source reference research is complete.

**Goal:** deliver12 additional working PoE uniques, eight distinct PoE monster families and four staged boss encounters in the playable Duskbound game.

**Architecture:** current deterministic core/classes/uniques model gains item hooks; a pure ES-module encounter subsystem owns monster/boss states and hazards via injected battle callbacks. Renderer/UI consume observable state and new local atlases. The parent coordinates core integration after exclusive model writers freeze.

**Tech stack:** existing vanilla JS ES modules/Canvas2D/static HTML/Node test runner.

## Global constraints

Read approved spec docs/superpowers/specs/2026-10-27-duskbound-poe-expansion-design.md and three docs/poe-expansion-*-sources.md. Source numbers/conditions and current non-legacy variants are authoritative for item properties. Monster health/damage/radii/timers/local weapon base are explicitly Duskbound balance. Preserve7classes/21Ascendancies/84notables, five skill VFX, eight supports, level1/reset/equipment loss per run, desktop/mobile input. No runtime network. Model RNG only; bounded objects/state; live simulation time only. Reduced-effects retains all gameplay warning geometry. Do not weaken existing tests to obtain green. Separate item actor/hit/DoT/typed-component rules. No original3Dasset/animation extraction claim. No commit/push/PR/publication. Snapshot before this task: /tmp/duskbound-poe-expansion-baseline, baseline231tests pass.

## Task1: source-backed unique runtime

Owner exclusively owns core.mjs/classes.mjs/uniques.mjs plus new unique runtime helper/data/test files and report docs/duskbound-expansion-items-report.md. Parent owns UI/renderer. Other worker owns encounters.mjs and its standalone tests; do not modify that file.

- [x] Add source-backed creation/catalog for17PoE uniques, preserving old five and three Duskbound relics; expose `UNIQUE_IDS` (17stable IDs) and `makeUnique(uniqueId,id,random)` for deterministic inspectable preview/test creation. Existing rollUnique stays compatible. All17must be naturally obtainable in class runs. Legacy no-class mode may preserve its old pool/behavior; do not silently advertise unsupported new effects there.
- [x] Add gloves/boots equipment slots and loot. Add replacement metadata array `.items` to lootReplacement while retaining existing `.item,.slot`; two-handed Terminus ejects weapon+shield/offhand/quiver as appropriate and reverse equip ejects incompatible2h. Store twoHanded/type/localBase metadata and apply local modifiers only to appropriate item/attack.
- [x] Implement all12build hooks and secondary original modifiers from sources. Aegis2%actualarmour cappedES on successfulblock; Saffell spellblock/allmax inclchaos/noattackblock; Inpulsa personal shockedkill5%lightning explosion cannotshock; Daresso actual/effectivecharge snapshot thenloss→5s/count Onslaught100%effect; Crown150%ArcaneMight increased/reducedspellonly; Yoke separate additive taken stage, eligible active owned types; Eye100fireunblockableselfhit/actualplayerignite conditions; Berek equivalentDPS/remainingduration/spread order; Obliteration20%chance25%lifechaos explosion +physicalextra30–40%; Terminus frenzyoncrit/twohand/localstats; Asenath level1TemporalChains/cursedcorpse proximityblind/explode3%; Ralakesh currentONEtype effective maximum/actualresource split/CorruptedBlood immunity distinctfrombleed.
- [x] Resolve origin/ownership of ailments and distinct secondary hit explosions; bounded death/spread event processing, no explosion variable overwrites. Preserve all previous class/legacy invariants. Read Temporal Chains level1 current formula if needed; document any intentionally adapted base/effects.
- [x] Incoming damage accept context `components`, `cannotBlock`, `melee`, `spell`, `area`, `hit`, `selfHit`; process shared avoidance once then typed mitigation per component and resources once. Do not count spell as melee/attack. Preserve block recovery and existing self-hit/on-hit semantics. Add player Corrupted Blood state support for Dominus (bounded distinctfrombleed, timed expiry; Ralakesh immunity), injectable source IDs and no recursive Eye loops.
- [x] Write meaningful red→green tests with expected values from source rows for each hook/negative/ownership/expiry plus slot incompatibility and interaction boundaries. Run targeted and full suite; report exact selected counts, adaptations and evidence. No browser claim.

## Task2: standalone monster/boss subsystem (parallel withTask1)

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

- [x] MONSTERS8source archetypes +CarrionMinion daughter: Drowned meleewindup, Rhoa fixedline/sweptcharge, Goatman lockedlandingarc, AncientArcherphysicalattack, FlameSentinelfiremultishotspell, Evangelist delayedphysicalspell+actualbubble, CarrionQueenlimitednearbyadds+neutralphysicalspit(localchoice;sourceelementunknown), Tentacle two spinevolleys50/50physicalfire. Windups do not use spawntelegraph/invulnerability. Actionstate serializedas `enemy.action={kind,phase,startedAt,until,targetX,targetY,angle,...}`; normalrole key `enemy.poeKind` +kind equalsnormalid; bosses `kind:'boss',bossId,poeKind:<bossId>`. Rendererreads action/hazards and source definitions.
- [x] Each entity retains hp/maxHp/radius/speed/xp/damage/hit/shotTimer/telegraph. Mixedprojectiles use context.components peramount. Active hazards bounded64, model warninggeometry incl circle/line/cone/ring/safeZone and timings; keep ownerId/bossId and damagecontext. On death remove pending owner attacks/hazards as appropriate. Heroandallies damaged through callbacks, onceperhit not repeatedrender. Dead/chilled/frozen handling deterministic; cannot-be-slowed Kitava/heart exceptions explicit.
- [x] BOSS_SCHEDULE120/240/360/450, oneactiveboss, queued overdue followingdeath, no repeatedspawn. Suppress newregularwavesafter480, butpendingbossqueue survives. Use run._spawnTimer/_nextElite so oldskillpreview overridesInfinitycontinueworking; normalcap180 plusonebody andoneheart ifactive. Elites useapi or internal smallmodassign contract; do not bypass actual raremodifier mechanism (parentintegrationwillcallbackfactory ifneeded).
- [x] Brutuschainpullphysical +three slams/wave; Merveil twoforms/icefanstorm thengeyseradds; Dominus lightningSouls/typedTouch thenAscendantbloodyrain withsafezone +distinctCorruptedBlood; Kitava stationarylargebody, swipes/firebreath andseparateheartphase. Bodyinvulnerableattargetlayer duringheart; heartdeath resumesbody once, notcountsasbosskill/drop. Bossmustnot runawayoffscreen; encountercenterstored. All numbers are localbalance. Sourcebranchesnotimplemented documented honestly.
- [x] recordEncounterKill distinguisheshearttransition fromfinalbossdeath and returnsuniqueRewardonceperboss. run.bossDefeated trueonlyafterallfour (corelegacybossflagnotusedclassruns). Bossloot handledTask3actualrollItem unique. On reset cleanstate. Frontend bossHUD contract via run.encounters.activeBossId/defeatedBosses and enemyname/phaseLabel.
- [x] Tests red→green: all8states distinguishable; windups remain targetable; actualhit/miss geometry; attack/spelltypedcontext; bubbleorigin/in-out andDoT confirmedsourcebehavior; caps; schedulequeue/death/transitions/oneunique; allbossphases; pause throughnotick; deterministicstate. Use independent knownpositions/expectednumbers, no mirroringdrawcalls. Reporttests and integrationnotes.

## Task3: integrate model and independent task review

AfterTask1freeze, parent orfreshintegrationworker exclusivelyowns core/classes andintegrationtests; no concurrentmodelwriters. Take second snapshot, integrateTask2API. Core classrun init+update usesencounters; legacy no-classmode preservesoldfixturepath. SkipnewpoeunitsinlegacymoveEnemies and avoiddoubledai. Legacyfixtures manuallyinserted stillsupported. Every target loop/hurtEnemy/classHit excludesinvulnerableKitavabody; ProximityShield appliescorrectsource rule. Hostilecontext nohardcodedspellarea; componentmitigation一次/shared avoidance. rewardDead consultsrecordEncounterKill, noheartXP/duplicatekill, actualguaranteedrollItemunique onceboss. Fourdefeated conditionplus480 andlethalprecedence. Integrate64hazardlimit and180regular+body+heart caps.

- [x] Add core integration regressions reaching actual public createRun/tick/loot APIs and boss4conditions/ownerkills/proxybarrier.
- [x] Create diff packages against baseline files; independenttaskreview unique andencountercontracts. FixImportantfindings and re-review.

## Task4: art, renderer, UI, inspectable preview

Parent ownsrender/app/style/newartassets/newbestiary.mjs/newexpansionpreviewHTML+CSS+JS/docs throughout, neverconcurrentlyeditmodel. Existing5skillVFX remain.

- [x] Newtransparent raster atlas for8monsters+CarrionMinion, bossbodyformsBrutus/Merveil2/Dominus2/Kitava+heart; imagegen source-informed2Dreconstruction, artkeys andcells documented. Originalmodel extractionnotclaimed. Validatealpha/gridanchors; cacheload; preservegenerated source/prompts/provenance. Uniqueitemicons distinct whereavailable, never fakebrowserruntime screenshot.
- [x] Separatebestiarystamps drawnewforms/proportions andactionposes, leapsheight/shadow, Rhoacharge, bossphaseparticles. Hazards drawwarning/activegeometry identicalmodel fields, reducedstillreadable. Proximitybubblegold, coldstormsblue, Dominuscrimsonsafezone, Kitavafirecones/sweeps/hearttarget. DrawbossHUDname/HP/phase inapp withoutclashingglobes/mobilecontrols.
- [x] Addglovesbootslabels, fullmulti-itemreplacementcards and statdelta preview usingpureprojection/withexplicitsnapshot no mutatingcurrentrun. Uniquepropertiesvisible includingdanger/negative. No hiddenimplementationwarnings inplayerflow.
- [x] Buildisolatedbestiary/items/showcaseusingactualmodelpublicfunctions, perboss andpermonsterinspection/attackplayback/pause/reduced; source-backeditemcatalog withrealrolledstats and optionalfreshpreviewequip only. Do notmutateusercurrentrun viaevaluate. Directnavigationfromgamehelp/gallery.
- [x] UI/browser desktop1280x720/mobile390x844: all8/4/forms/hazards, itemslots/card readability, actualmainrunstart/levelup/death/reset; console0errors. JPEGscreenshots/checkdimensions, resetviewport/keepdeliverables. Pure multi-item comparison is covered by cloned-model tests and independent code review.
- [ ] Remaining manual QA: natural first boss/its unique loot in main browser run. Attempts ended before encounter; model integration tests and isolated gallery cover scheduling/loot/forms, but do not replace full manual playthrough. This limit is recorded in docs/duskbound-expansion-report.md.

## Task5: final verification and handoff

- [x] Fullnode suite/syntax/localHTMLlinks/JSON/whitespace. Runfresh21Ascendancy matrix; botordinarydecisions withnewwarningdodge; no invulnerability/bonuses; reportactualresults, noforceallwinsbytestsweaken.
- [x] Independentbroadreview on mostcapablemodel withfullchangepackageandbindingconstraints; fix/re-reviewallP1/P2.
- [x] UpdateREADME,design,sourceprovenance,verification andledger. Statewhatcompleted/adapted/verifiedandlimits. Workremainslocaluncommitted, noPR/push/publication.


Final implementation complete locally; final review APPROVED after F1/F2/F3;455/455suite. Final matrix seed42:12won8dead1playing, balance preliminary. Detailed evidence and exact remaining manual QA above: docs/duskbound-expansion-report.md. No commit/push/publication.

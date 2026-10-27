# PoE 1: references for skill animations

Observed27.10.2026 through browser screenshots/playback. This is reference-based recreation for Canvas2D, not an import/extraction of PoE3D models, shaders or game files. No original game assets downloaded into the project in this task.

## Winter Orb

- Gameplay: Peuget2, [Winter Orb Elementalist — League Starter Preview | PoE3.29](https://www.youtube.com/watch?v=62JkpZ4VtCk), opening footage and0:26.
- Observed: a substantial pale white/ice-cloud globe above the character, swirling internal detail, blue-white icy projectiles, pale cold bursts on the ground. The scene includes other buffs/explosions; don't reproduce every flash as Winter Orb. MTX inventory wasn't shown, so strict absence of cosmetics isn't verified.
- Mechanics source: [Winter Orb Wiki](https://www.poewiki.net/wiki/Winter_Orb) states projectiles impact the ground and deal area damage. Our existing autochannel/straight collision logic remains an adaptation.
- Chosen presentation: layered icy globe rather than a tiny solid dot; frost streaks and fragmented impact bloom. Keep the actual collision ground point visible.

## Kinetic Fusillade

- [Current Wiki](https://www.poewiki.net/wiki/Kinetic_Fusillade): hovering projectiles follow the player; after not producing more for the duration they release towards enemies. Normal current duration0.5s; our auto-volley cadence stays unchanged.
- [Original official announcement](https://www.pathofexile.com/forum/view-thread/3869068) independently describes hovering anomalies, delayed release, area impact and chaining. This is kinetic projectile motion, not chain lightning.
- Official visual source: [Keepers of the Flame page](https://www.pathofexile.com/keepers), New Skill and Support Gems section, embedded `panels/Panel8.webm` (17.5s). At2.60s the clean arena contains multiple blue-white energy starbursts with sharp coronas, dark blue haze and short trails. The panel is a montage of several new gems: orange/gold effects at7.83s are excluded as another segment; the clip does not label every individual skill. Palette/energy treatment is confirmed for the kinetic showcase, exact per-skill segment assignment is not claimed.
- Supplemental [DireGray gameplay](https://www.youtube.com/watch?v=yrB5cJH1NfY), ~3:10–3:14, includes Spellslinger. Its large blue spell blobs are NOT treated as isolated Fusillade evidence.
- Chosen presentation: a visibly gathered bank of compact white-blue kinetic anomalies before the existing real volley, energetic launched heads with distinct tails and a starburst impact. Precharge timing is presentation-only and cannot delay or change attacks.

## Blade Vortex / Righteous Fire / Raise Spectre

Concrete observed references and timestamps: [research addendum](./duskbound-vfx-sources-extra.md). In brief: historical official BV showcase has pale mint/cyan blades and swept circular traces; Pohx RF gameplay has an uneven orange/gold perimeter with visible ground inside; old Raise Spectre gameplay shows translucent blue full monster silhouettes. RF cosmetic inventory and exact modern unchanged BV skin are not proven. Raise Spectre retains monster-dependent attacks; it has no universal original projectile.

## Fidelity boundary

The five visual identities above guide shape, palette, layering and motion. Frame timings, procedural particle shapes, an existing caster-spectre's shot and automatic wind-up are local adaptations for this game. They are not presented as downloaded original animations. Existing collision positions/radii, damage, counts, seed/RNG and game clocks remain authoritative.

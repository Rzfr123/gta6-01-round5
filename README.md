# Vesper Delta — a night-rain open-world crime game for make.fun gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Rzfr123/gta6-01-round5/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Rzfr123/gta6-01-round5/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Built for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01).

June Calloway is back in Vesper, a river-delta port city drowning in night rain. Seven districts, seven crews to win over, one river about to flood. Take the territory district by district — jobs raise standing, FRIENDLY unlocks a takeover, YOURS pays hourly income and a crew perk — then pull THE FLOOD, a storm-night heist as the river rises. 12 staged story missions in 3 acts with stage counters, NEXT hints and gold/silver/bronze medals; a named VPD response panel (GULL, HERON, EGRET, KITE, CORMORANT, PELICAN) with roles and live distances; a crew of three with callable abilities (Ezra's Hot Swap, Pip's Field Fix, Wren's Eyes Up); title screen with 3 save slots and a pause/stats screen with a completion donut, checklist, mission medals, a full map with district standings and career stats. Side work: 4 street races, 8 stunt jumps, 20 Brass Herons, a 5-car export list, district jobs, taxi fares and shop holdups — all in a low-poly night city with rain, wet neon reflections, a day/night cycle and three synthesized radio stations.

## Play

Serve `game/` with any static server (`node serve.ts`, then http://localhost:8080) and play in desktop Chrome. No network, no build step.

- WASD move / drive · E enter car · F steal car · SPACE handbrake
- Mouse aim · CLICK / J shoot · 1–4 weapons · Z/X/C crew abilities
- M start mission · V radio · U phone · N camera · P pause/stats
- B shop · G garage · H save · R job / race / holdup

## Districts

The Levee (river + flood gates), Port Vesper (docks + cranes), Night Market (stalls), Downtown Vesper (neon tower), Stilt Row (houses on poles), Marsh Edge (reeds + dead trees), Old Foundry (smokestacks).

## Screenshots

`?shot=title|chase|shootout|stats` stages a real running scene for screenshots.

## Files

- `game/index.html` — page shell and HUD
- `game/src/main.js` — boot, loop, camera, input, title screen
- `game/src/city.js` — Vesper: roads, river, levee, port, market, stilt houses, marsh, rain
- `game/src/vehicles.js` — car factory and arcade driving
- `game/src/traffic.js` — traffic cars and pedestrians
- `game/src/police.js` — VPD: named units, helicopter, roadblocks, heat
- `game/src/player.js` — June on foot and behind the wheel, weapons
- `game/src/crew.js` — Ezra, Pip, Wren: abilities and portraits
- `game/src/districts.js` — territory standing, jobs, takeovers, income
- `game/src/missions.js` — 12 story missions in 3 acts + medals
- `game/src/collectibles.js` — the 20 Brass Herons
- `game/src/side.js` — races, stunt jumps, export list, taxi, holdups
- `game/src/hud.js` — HUD, minimap, phone, shops, garage, stats screen
- `game/src/audio.js` — synthesized radio and sound (WebAudio, no files)
- `game/src/save.js` — localStorage saves, 3 slots
- `game/src/shots.js` — screenshot staging
- `game/vendor/three.module.min.js` — vendored Three.js (MIT)

## License

MIT — see LICENSE.

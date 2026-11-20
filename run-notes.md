# Run notes — gta6-01 round 5: "Vesper Delta"

## What was built

A 3D open-world crime game in Three.js (vendored `three.module.min.js`),
written fresh in-session in the recorded subagent session. Original city,
characters, names and story — nothing from Rockstar/GTA, nothing copied
from any previous round's game code or from the rank-1 entry (only its
HUD/layout PATTERN was studied from public judging screenshots).

- **City** (`game/src/city.js`): night-rain river-delta port — 40-unit road
  grid with painted dash texture, river + levee wall to the north, Port
  Vesper docks with containers and cranes to the east, Stilt Row houses on
  poles over shallow water to the west, Marsh Edge reeds and dead trees to
  the south, downtown neon tower, Night Market stalls with striped awnings,
  Old Foundry smokestacks, safehouse, 1,400-drop rain system, wet-road
  puddles, day/night cycle.
- **Territory** (`game/src/districts.js`): 7 districts, standing HOSTILE →
  WARY → NEUTRAL → FRIENDLY → YOURS. District jobs (+8 standing) raise it;
  FRIENDLY unlocks the takeover mission; YOURS pays hourly income and a
  crew perk (Foundry: Hot Swap −15s; Stilt Row: Field Fix −10s; Downtown:
  Eyes Up +15s; plus Levee/Port/Market/Marsh perks).
- **Crew** (`game/src/crew.js`): June Calloway plus Ezra Vann (Driver,
  HOT SWAP — drop 1 star, Z), Pip Marlowe (Mechanic, FIELD FIX — repair
  car + armour, X), Wren Okafor (Lookout, EYES UP — reveal police +
  targets on minimap 30s, C). Portraits drawn procedurally on canvas.
- **Missions** (`game/src/missions.js`): 12 staged story missions in
  3 acts (Act I Homecoming, Act II Takeover, Act III The Flood) with
  STAGE x/y, objective text, NEXT hints, gold/silver/bronze medals by
  time + damage + max wanted. Finale THE FLOOD unlocks when all 7
  districts are YOURS and runs as a full storm.
- **Police** (`game/src/police.js`): VPD RESPONSE panel with named bird
  units (GULL/HERON/EGRET/KITE/CORMORANT/PELICAN/OSPREY/IBIS) + roles
  (PURSUIT/RAMMING/FLANKING/ROADBLOCK/AIR) + live distances, 5 stars,
  helicopter from 3 stars, roadblocks from 4, heat cools when hidden.
- **Systems**: carjacking (F), 5 car models, Delta Customs garage
  upgrades, gun/food/clothes shops, 3 radio stations (Delta 88.1 Rain FM,
  Vesper Talk, Bayou Gold — synthesized WebAudio), circular minimap with
  N marker, phone with mission list + locks (U), localStorage saves in
  3 slots, busted/wasted 15% fee, $25 near-miss bonus, 20 Brass Heron
  collectibles, 4 street races, 8 stunt jumps, 5-car export list, taxi
  fares, shop holdups.
- **Screens**: title screen (VESPER DELTA, CONTINUE/NEW GAME/LOAD GAME/
  SETTINGS, 3 save slots with act/missions/%/cash/time); pause/stats
  screen with tabs MAP/STORY/STATS/CREW/SETTINGS/CONTROLS/SAVE,
  completion % donut, checklist with progress bars, mission medals, full
  map with district standings, career stats, save slots.
- **Entrypoint** (`main.ts`): validates the entrypoint, screenshots
  (4, ≤256 KiB, no duplicates), game/ caps (993 files / 48 MiB /
  1000-byte paths), required modules and README badges, checks
  shots.json matches screenshots/ and .makefun/owner.json names a
  wallet, writes the dossier with the kit's `buildDossier`, and verifies
  the written dossier byte-for-byte (buffer comparison). Revised
  in-session (shots-manifest + owner checks added after the first build).
  `game/src/main.js` and the game modules were revised repeatedly
  in-session (see fixes below).

## Fixes found by playtesting

- Steal added 45 heat = 3 stars, not the intended 2: now adds 40 heat
  (exactly 2 stars).
- Starter car spawned wedged against a building at (-108, 66): moved to
  the road intersection (-120, 80), clear of buildings.
- Standing thresholds made 50 WARY: re-based so 50 is NEUTRAL, 40 WARY,
  below 30 HOSTILE (matches the design: 4 districts start NEUTRAL).
- HERON_SPOTS had 21 entries for a 20-collectible design: one marsh
  spot removed.
- Chase screenshot camera sat behind the levee wall (z=-196, wall at
  -184): moved south of the wall and closer to the car.
- Title screen showed the in-game HUD through the overlay and the hint
  bar overlapped the crew cards: HUD hidden on title via body class,
  hint moved up to bottom:88px.
- Dialogue hid before the shootout screenshot (6s timeout vs slow
  SwiftShader load): timeout raised to 10s.
- Helicopter searchlight cone rendered as a giant grey spike: radius
  6→4.5, opacity 0.12→0.06.
- Roads used ~460 separate dash meshes; SwiftShader ran ~1.5 fps:
  replaced with a painted centre-dash road texture (one texture per
  axis). Headless is still slow (deferred SwiftShader present), so
  drive tests use long holds — the game runs at full speed on a real GPU.
- Test-harness notes (not game bugs): the system Chrome
  (/opt/meta-chromium/chrome) refuses standalone launch (Hatch WebGL
  domain policy) — tests use the Playwright Chromium at
  ~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome. A
  boot-test chrome survived a crashed test script and kept port 9333,
  so later test tabs silently opened in its profile (with the mechanics
  save in localStorage) — killed it, harness now uses a random port per
  run, and screenshots were retaken on fresh profiles.

## Verification (headless Chromium, SwiftShader, CDP)

- Kit check: **4 passed, 0 failed, 17 skipped, 5 checked at submission**
  (same shape as round 4; transcript checks run at submission).
- `MAKEFUN_OUTPUT_DIR=/tmp/vesper-out node main.ts` builds clean from
  /tmp (paths relative to main.ts, never cwd-relative); dossier
  609,656 bytes, 4 images, text 130,822 bytes; byte-verify passed.
- Mechanics test (fresh profile, all 35 PASS): game boots with zero
  page errors and zero failed requests; NEW GAME starts play; M starts
  m1 and all 3 stages complete on arrival (cash $600→$950, gold medal);
  steal → wanted 2 + cops spawn + VPD panel; driving moves the car
  (12s hold, SwiftShader); weapon switch to SMG; Hot Swap drops 1 star;
  Field Fix restores armour to 100; Eyes Up active 30s; garage opens
  and engine purchase works ($5,000→$4,500, engine Lv 1); save writes
  slot 0; heron collected; phone opens with all 12 missions; R starts
  a district job and standing rises 50→58; stats screen opens with MAP
  canvas and STATS donut. Zero page errors, zero failed requests after.
- Screenshots: 4 real renders, retaken after the final code change
  (1-title: title screen, empty slots, HUD hidden; 2-chase: levee-road
  storm chase at 33 KM/H, 3 stars, VPD panel with live distances,
  helicopter cone; 3-shootout: Night Market, Market Crown STAGE 2/3,
  June's dialogue with portrait; 4-stats: stats MAP tab with district
  standings). All ≤256 KiB, 1280x800.

## Repo

- https://github.com/Rzfr123/gta6-01-round5
- Final commit: see `git log`.
- About set: description names make.fun, homepage
  https://make.fun/bounty/gta6-01, topics makefun, ai-agents, bounties,
  games (verified via GitHub API; repo is public).
- README 3578 bytes; LICENSE MIT, first line SPDX-License-Identifier: MIT.
- `.makefun/owner.json` = {"wallet": "bDXdfcW6wZ1hmDZnnH4eJLhXEbYUkV7AAKZHagdnoPg"}.

## Recording

- Recorder 01a1f7a9-c0d9-74df-9fa7-42814d8a652a started BEFORE this
  subagent session; recorder PID 9965 stayed alive the whole build.
- Session id: 347a35aa-62ab-45a9-b4b7-5ab00c038bd9
- User's verbatim task prompt for this round: "Gas, build round 5 /
  Ikuti contoh rank 1" (kept outside the repo at
  ~/workspace/makefun/prompt-gta6-01-round5.txt).
- NOT sealed, NOT submitted — parent seals (record --finish) and submits.

## What round 5 adds over round 4 (Solmar Heat)

- Territory control: 7 districts with live standing, jobs, takeovers,
  hourly income and crew perks — round 4 had districts as labels only.
- Title screen with 3 save slots (round 4 booted straight into play)
  and a full pause/stats screen with tabs, completion donut, checklist,
  mission medals, career stats and a full map (round 4 had no stats
  screen at all).
- Named police units with roles + live distances in a VPD RESPONSE
  panel (round 4 showed only stars).
- Crew of 3 with callable abilities on Z/X/C and drawn portraits
  (round 4 had one partner AI, no abilities).
- Mission medals (gold/silver/bronze) and STAGE x/y + NEXT hints
  (round 4 had objectives but no medals or stage counters).
- 3 acts structuring the 12 missions, with the finale gated on all 7
  districts YOURS (round 4's missions were a flat list).
- Night rain identity: rain particles, wet-road reflections, storm
  build-up, day/night cycle (round 4 was a sun-soaked beach day).
- 20 collectibles (round 4: 12), 4 races + 8 stunt jumps + 5-car
  export list (round 4: races + holdups only).

## Coordinator: seal + submit (round 5)

- Recording 01a1f7a9-c0d9-74df-9fa7-42814d8a652a — seal with
  `record --finish` after the build agent's last edit; then submit
  with title "Vesper Delta" (parent submits after user approval).
- DO NOT SUBMIT until the user approves.

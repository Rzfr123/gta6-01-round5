// Twelve staged story missions in three acts, plus the generic mission
// engine: STAGE x/y, objective text, a NEXT hint, and a medal at the end
// (gold / silver / bronze by time, damage and max wanted).
import * as THREE from '../vendor/three.module.min.js';
import { addRp, damagePlayer } from './player.js';
import { addStanding, takeoverComplete } from './districts.js';
import { setWanted } from './police.js';

export const MISSIONS = [
  { id: 'm1', act: 1, title: 'Homecoming Rain', district: 'market', pay: 300, par: 90,
    intro: 'June: "Vesper never changes. Same rain, same debts. Let\'s go home."',
    stages: [
      { text: 'Drive to the safehouse on Stilt Row edge.', hint: 'Follow the blue marker.', type: 'goto', x: -120, z: 60, r: 10 },
      { text: 'Step inside and meet Ezra, Pip and Wren.', hint: 'On foot — press E near the door.', type: 'goto', x: -120, z: 66, r: 5 },
      { text: 'Take the crew car and get back to the Night Market.', hint: 'The GT is parked outside.', type: 'goto', x: 0, z: 0, r: 12 },
    ] },
  { id: 'm2', act: 1, title: 'Market Debt', district: 'market', pay: 350, par: 120,
    intro: 'Wren: "Three stalls owe the market. Collect — politely, then less politely."',
    stages: [
      { text: 'Collect from the first stall (north row).', hint: 'Marker 1 of 3.', type: 'goto', x: 0, z: -26, r: 8 },
      { text: 'Collect from the second stall (east row).', hint: 'Marker 2 of 3.', type: 'goto', x: 26, z: 0, r: 8 },
      { text: 'Collect from the third stall (west row).', hint: 'Marker 3 of 3.', type: 'goto', x: -26, z: 0, r: 8 },
      { text: 'Bring the take back to the safehouse.', hint: 'Bank it before the VPD notices.', type: 'goto', x: -120, z: 60, r: 10 },
    ] },
  { id: 'm3', act: 1, title: 'First Heron', district: 'stilt', pay: 250, par: 150,
    intro: 'Pip: "Brass Herons — the old crews left twenty of them around Vesper. Find three."',
    stages: [
      { text: 'Find a Brass Heron in Stilt Row.', hint: 'Herons glint gold on the minimap.', type: 'collect', count: 1, district: 'stilt' },
      { text: 'Find a Brass Heron in the Night Market.', hint: 'Check the stalls.', type: 'collect', count: 1, district: 'market' },
      { text: 'Find a Brass Heron in the Marsh Edge.', hint: 'South, past the reeds.', type: 'collect', count: 1, district: 'marsh' },
    ] },
  { id: 'm4', act: 1, title: 'Levee Lights', district: 'levee', pay: 400, par: 120,
    intro: 'Ezra: "The levee crew runs the river. Lose the heat, then show them you can drive."',
    stages: [
      { text: 'Get the VPD to 2 stars — steal a car or make noise.', hint: 'F steals a nearby car.', type: 'wanted', stars: 2 },
      { text: 'Now lose them: stay hidden until the heat cools.', hint: 'Break line of sight — 45 units clear.', type: 'survive', secs: 20, maxStars: 0 },
      { text: 'Race the levee road to the east gate.', hint: 'Flat out, rain or not.', type: 'goto', x: 180, z: -160, r: 12 },
    ] },
  { id: 'm5', act: 2, title: 'Port Claim', district: 'port', pay: 600, par: 180,
    intro: 'June: "Port Vesper answers to the Harlow crew. Tonight it answers to us."',
    stages: [
      { text: 'Reach the container yard.', hint: 'East docks.', type: 'goto', x: 160, z: -40, r: 14 },
      { text: 'Clear the yard — 4 Harlow gunmen.', hint: 'Shoot on foot. Cover is the containers.', type: 'shoot', count: 4, x: 160, z: -40 },
      { text: 'Hold the yard for 20 seconds.', hint: 'Stay inside the marker.', type: 'survive', secs: 20, x: 160, z: -40, r: 14 },
    ],
    takeover: 'port' },
  { id: 'm6', act: 2, title: 'Foundry Fire', district: 'foundry', pay: 650, par: 180,
    intro: 'Wren: "The Foundry crew burns hot. Take their hall and the district follows."',
    stages: [
      { text: 'Reach the furnace hall.', hint: 'South-east industrial.', type: 'goto', x: 150, z: 140, r: 14 },
      { text: 'Clear the hall — 4 Foundry gunmen.', hint: 'Use the smokestacks as cover.', type: 'shoot', count: 4, x: 150, z: 140 },
      { text: 'Hold the hall for 20 seconds.', hint: 'Stay inside the marker.', type: 'survive', secs: 20, x: 150, z: 140, r: 14 },
    ],
    takeover: 'foundry' },
  { id: 'm7', act: 2, title: 'Stilt Row Run', district: 'stilt', pay: 550, par: 150,
    intro: 'Pip: "Stilt Row trusts boats, not promises. Win the boat-run and they\'re ours."',
    stages: [
      { text: 'Reach the stilt docks.', hint: 'West edge, over the water.', type: 'goto', x: -170, z: 20, r: 12 },
      { text: 'Deliver the parcel to the far hut.', hint: 'Don\'t stop — the tide is coming in.', type: 'goto', x: -186, z: -40, r: 8 },
      { text: 'Get back to the safehouse with the signed ledger.', hint: 'Same way back.', type: 'goto', x: -120, z: 60, r: 10 },
    ],
    takeover: 'stilt' },
  { id: 'm8', act: 2, title: 'Market Crown', district: 'market', pay: 700, par: 180,
    intro: 'June: "The Night Market is the heart of Vesper. Take it and the city listens."',
    stages: [
      { text: 'Reach the market square.', hint: 'Centre of the city.', type: 'goto', x: 0, z: 0, r: 12 },
      { text: 'Clear the square — 5 market enforcers.', hint: 'Stalls are cover. Watch the rain.', type: 'shoot', count: 5, x: 0, z: 0 },
      { text: 'Hold the square for 25 seconds.', hint: 'Stay inside the marker.', type: 'survive', secs: 25, x: 0, z: 0, r: 12 },
    ],
    takeover: 'market' },
  { id: 'm9', act: 3, title: 'Downtown Siege', district: 'downtown', pay: 800, par: 200,
    intro: 'Ezra: "Downtown belongs to the towers. We take the tower, we take the skyline."',
    stages: [
      { text: 'Reach the hero tower.', hint: 'The neon crown.', type: 'goto', x: -20, z: -80, r: 14 },
      { text: 'Clear the plaza — 5 tower guards.', hint: 'Expect 2-star heat.', type: 'shoot', count: 5, x: -20, z: -80 },
      { text: 'Hold the plaza for 25 seconds.', hint: 'Stay inside the marker.', type: 'survive', secs: 25, x: -20, z: -80, r: 14 },
    ],
    takeover: 'downtown' },
  { id: 'm10', act: 3, title: 'Marsh Ghosts', district: 'marsh', pay: 750, par: 200,
    intro: 'Wren: "Nobody owns the marsh — that\'s why the ghosts hide there. Flush them out."',
    stages: [
      { text: 'Reach the reed beds.', hint: 'South, past the dead trees.', type: 'goto', x: 40, z: 165, r: 14 },
      { text: 'Clear the camp — 5 marsh ghosts.', hint: 'They shoot from the reeds.', type: 'shoot', count: 5, x: 40, z: 165 },
      { text: 'Hold the camp for 25 seconds.', hint: 'Stay inside the marker.', type: 'survive', secs: 25, x: 40, z: 165, r: 14 },
    ],
    takeover: 'marsh' },
  { id: 'm11', act: 3, title: 'Levee Break', district: 'levee', pay: 850, par: 200,
    intro: 'Pip: "The levee crew will flood the city before they give it up. Stop them first."',
    stages: [
      { text: 'Reach the levee wall.', hint: 'North edge, by the river.', type: 'goto', x: 0, z: -170, r: 14 },
      { text: 'Clear the wall — 6 levee guards.', hint: 'The river is at your back.', type: 'shoot', count: 6, x: 0, z: -170 },
      { text: 'Hold the wall for 30 seconds.', hint: 'The storm is coming.', type: 'survive', secs: 30, x: 0, z: -170, r: 14 },
    ],
    takeover: 'levee' },
  { id: 'm12', act: 3, title: 'THE FLOOD', district: 'levee', pay: 2500, par: 300, finale: true,
    intro: 'June: "The river is rising and every crew in Vesper is coming for us. One last job — then the delta is ours."',
    stages: [
      { text: 'Reach the flood gates as the storm breaks.', hint: 'Rain at full strength.', type: 'goto', x: 0, z: -170, r: 14 },
      { text: 'Hold the gates against 8 flood-runners.', hint: 'The whole city is watching.', type: 'shoot', count: 8, x: 0, z: -170 },
      { text: 'Open the gates and escape to the safehouse.', hint: 'Drive — the water is right behind you.', type: 'goto', x: -120, z: 60, r: 10 },
    ] },
];

export function medalFor(elapsed, par, damageTaken, maxWanted) {
  if (elapsed <= par && damageTaken <= 25 && maxWanted <= 2) return 'gold';
  if (elapsed <= par * 1.5 && damageTaken <= 60) return 'silver';
  return 'bronze';
}

export function startMission(G, def) {
  if (G.mission) return false;
  const P = G.player;
  G.mission = {
    def, stageIdx: 0, elapsed: 0, startDamage: P.damageTaken, maxWanted: P.stars,
    holdT: 0, kills: 0, heronsAtStart: G.heronsFound || 0,
    marker: null, enemiesSpawned: false,
    onKill(e) { this.kills += 1; },
  };
  P.maxWanted = Math.max(P.maxWanted, P.stars);
  if (G.hud) {
    G.hud.notify(`Mission: ${def.title} — ${def.stages.length} stages.`);
    if (def.intro) G.hud.showDialogue(G, def.intro.startsWith('June') ? 'June' : def.intro.split(':')[0], def.intro.replace(/^[^:]+: /, ''));
  }
  if (G.audio) G.audio.sfx('mission');
  spawnStageMarker(G);
  return true;
}

export function nextStoryMission(G) {
  for (const def of MISSIONS) {
    if (def.finale) continue;
    if (!(G.missionsDone || []).includes(def.id)) {
      // Takeover missions need FRIENDLY standing first.
      if (def.takeover) {
        const d = G.districts.find((x) => x.id === def.takeover);
        if (d && d.standing < 80) continue;
      }
      return def;
    }
  }
  const finale = MISSIONS.find((d) => d.finale);
  if (finale && !(G.missionsDone || []).includes(finale.id) && G.districts.every((d) => d.standing >= 100)) return finale;
  return null;
}

function spawnStageMarker(G) {
  const m = G.mission;
  if (!m) return;
  const st = m.def.stages[m.stageIdx];
  if (m.marker) { G.scene.remove(m.marker); m.marker = null; }
  if (st.x === undefined) return;
  const geo = new THREE.CylinderGeometry(st.r || 8, st.r || 8, 0.4, 24, 1, true);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const marker = new THREE.Mesh(geo, mat);
  marker.position.set(st.x, 0.3, st.z);
  G.scene.add(marker);
  m.marker = marker;
  // A beacon pillar so the target reads from far away in the rain.
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 60, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.set(st.x, 30, st.z);
  G.scene.add(beam);
  m.beam = beam;
}

export function clearMissionMarker(G) {
  const m = G.mission;
  if (!m) return;
  if (m.marker) G.scene.remove(m.marker);
  if (m.beam) G.scene.remove(m.beam);
  m.marker = null; m.beam = null;
}

export function spawnEnemies(G, count, x, z) {
  G.enemies = G.enemies || [];
  for (let i = 0; i < count; i++) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.05, 0.36), new THREE.MeshStandardMaterial({ color: 0x6a1a1a, roughness: 0.9 }));
    body.position.y = 1.05; group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 8, 8), new THREE.MeshStandardMaterial({ color: 0xb08060 }));
    head.position.y = 1.82; group.add(head);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.55), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    gun.position.set(0.35, 1.2, 0.3); group.add(gun);
    const ex = x + (Math.random() - 0.5) * 20, ez = z + (Math.random() - 0.5) * 20;
    group.position.set(ex, 0, ez);
    G.scene.add(group);
    G.enemies.push({ group, x: ex, z: ez, hp: 40, shootAt: 0 });
  }
}

export function updateEnemies(G, dt) {
  const P = G.player;
  for (const e of G.enemies || []) {
    if (e.hp <= 0) continue;
    const dx = P.x - e.x, dz = P.z - e.z;
    const dist = Math.hypot(dx, dz) || 1;
    e.group.lookAt(P.x, 0, P.z);
    if (dist < 40 && G.elapsed - e.shootAt > 1.1) {
      e.shootAt = G.elapsed;
      if (Math.random() < 0.55) damagePlayer(G, 5);
      if (G.audio) G.audio.sfx('eshot');
    }
    if (dist > 14) {
      e.x += (dx / dist) * 2.2 * dt;
      e.z += (dz / dist) * 2.2 * dt;
      e.group.position.set(e.x, 0, e.z);
    }
  }
  // Remove the dead from the scene.
  G.enemies = (G.enemies || []).filter((e) => {
    if (e.hp <= 0) { G.scene.remove(e.group); return false; }
    return true;
  });
}

function completeStage(G) {
  const m = G.mission;
  m.stageIdx += 1;
  m.holdT = 0;
  m.enemiesSpawned = false;
  clearMissionMarker(G);
  if (m.stageIdx >= m.def.stages.length) {
    finishMission(G);
    return;
  }
  if (G.hud) G.hud.notify(`Stage ${m.stageIdx + 1}/${m.def.stages.length} — ${m.def.stages[m.stageIdx].text}`);
  // A new collect stage counts fresh from this moment.
  if (m.def.stages[m.stageIdx].type === 'collect') m.heronsAtStart = G.heronsFound || 0;
  spawnStageMarker(G);
}

function finishMission(G) {
  const m = G.mission;
  const def = m.def;
  const P = G.player;
  const medal = medalFor(m.elapsed, def.par, P.damageTaken - m.startDamage, m.maxWanted);
  P.cash += def.pay;
  addRp(G, def.pay / 2);
  if (!def.side) {
    G.missionsDone = G.missionsDone || [];
    if (!G.missionsDone.includes(def.id)) G.missionsDone.push(def.id);
    G.medals = G.medals || {};
    G.medals[def.id] = medal;
  } else {
    addStanding(G, def.district, 8);
  }
  if (def.takeover) takeoverComplete(G, def.takeover);
  if (def.finale) {
    G.gameWon = true;
    if (G.hud) G.hud.notify('THE FLOOD is done — Vesper Delta is yours. The river can rise now.');
  }
  clearMissionMarker(G);
  if (G.hud) G.hud.notify(`Mission complete — ${medal.toUpperCase()} medal. +$${def.pay}, +${Math.round(def.pay / 2)} RP`);
  if (G.audio) G.audio.sfx('complete');
  G.mission = null;
}

export function updateMission(G, dt) {
  const m = G.mission;
  if (!m) return;
  const P = G.player;
  m.elapsed += dt;
  m.maxWanted = Math.max(m.maxWanted, P.stars);
  const st = m.def.stages[m.stageIdx];
  const px = P.car ? P.car.x : P.x, pz = P.car ? P.car.z : P.z;
  if (st.type === 'goto') {
    const d = Math.hypot(px - st.x, pz - st.z);
    if (d < st.r) completeStage(G);
  } else if (st.type === 'collect') {
    const got = (G.heronsFound || 0) - m.heronsAtStart;
    if (got >= st.count) completeStage(G);
  } else if (st.type === 'wanted') {
    if (P.stars >= st.stars) completeStage(G);
  } else if (st.type === 'survive') {
    if (st.x !== undefined) {
      const d = Math.hypot(px - st.x, pz - st.z);
      if (d < (st.r || 12)) m.holdT += dt;
      else m.holdT = Math.max(0, m.holdT - dt);
      if (m.holdT >= st.secs) completeStage(G);
    } else {
      // Timed survive: keep wanted at or below maxStars.
      if (P.stars <= (st.maxStars ?? 0)) m.holdT += dt;
      else m.holdT = 0;
      if (m.holdT >= st.secs) completeStage(G);
    }
  } else if (st.type === 'shoot') {
    if (!m.enemiesSpawned) {
      spawnEnemies(G, st.count, st.x, st.z);
      m.enemiesSpawned = true;
    }
    if (m.kills >= st.count) completeStage(G);
  }
}

export function failMission(G, why) {
  const m = G.mission;
  if (!m) return;
  clearMissionMarker(G);
  G.enemies = (G.enemies || []).filter((e) => { G.scene.remove(e.group); return false; });
  if (G.hud) G.hud.notify(`Mission failed — ${why}. Press M to try again.`);
  G.mission = null;
}

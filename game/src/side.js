// Side work: street races, stunt jumps, the 5-car export list, taxi fares
// and shop holdups — all paid, all feeding RP and district standing.
import * as THREE from '../vendor/three.module.min.js';
import { addRp } from './player.js';
import { addHeat } from './police.js';

export const RACES = [
  { id: 'race-levee', name: 'Levee Sprint', x: 0, z: -160, checkpoints: [[0, -160], [80, -160], [160, -160], [160, -80]], pay: 400 },
  { id: 'race-market', name: 'Market Loop', x: 0, z: 0, checkpoints: [[0, 0], [80, 0], [80, 80], [0, 80], [-80, 80], [-80, 0]], pay: 450 },
  { id: 'race-port', name: 'Dock Dash', x: 160, z: -40, checkpoints: [[160, -40], [160, 40], [120, 120], [160, 120]], pay: 500 },
  { id: 'race-marsh', name: 'Marsh Run', x: 40, z: 165, checkpoints: [[40, 165], [-40, 165], [-80, 120], [40, 120]], pay: 500 },
];

export const JUMPS = [
  { id: 'jump-1', name: 'Levee Launch', x: 120, z: -160, done: false },
  { id: 'jump-2', name: 'Market Flyover', x: 80, z: 40, done: false },
  { id: 'jump-3', name: 'Port Crane Hop', x: 140, z: -20, done: false },
  { id: 'jump-4', name: 'Foundry Ramp', x: 150, z: 100, done: false },
  { id: 'jump-5', name: 'Stilt Skip', x: -140, z: 0, done: false },
  { id: 'jump-6', name: 'Downtown Drop', x: -60, z: -80, done: false },
  { id: 'jump-7', name: 'Marsh Leap', x: 0, z: 160, done: false },
  { id: 'jump-8', name: 'River Jump', x: -80, z: -160, done: false },
];

export const EXPORTS = [
  { model: 'gt', name: 'Vesper GT', done: false },
  { model: 'pickup', name: 'Bayou Pickup', done: false },
  { model: 'van', name: 'Market Van', done: false },
  { model: 'hauler', name: 'Port Hauler', done: false },
  { model: 'runner', name: 'Delta Runner', done: false },
];

export function initSide(G) {
  G.racesWon = G.racesWon || 0;
  G.jumpsDone = G.jumpsDone || 0;
  G.exportsDone = G.exportsDone || 0;
  G.race = null;
  G.taxi = null;
  // Ramps: visible wedges at each jump spot.
  for (const j of JUMPS) {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xd08a2e, roughness: 0.6 }));
    ramp.position.set(j.x, 0.4, j.z);
    ramp.rotation.x = -0.35;
    G.scene.add(ramp);
    j.ramp = ramp;
  }
}

export function startRace(G, id) {
  const def = RACES.find((r) => r.id === id);
  if (!def || G.race) return false;
  if (!G.player.car) { if (G.hud) G.hud.notify('You need a car to race.'); return false; }
  G.race = { def, cp: 0, t: 0, marker: null };
  if (G.hud) G.hud.notify(`Race: ${def.name} — hit every checkpoint, fastest line wins.`);
  placeRaceMarker(G);
  return true;
}

function placeRaceMarker(G) {
  const r = G.race;
  if (r.marker) G.scene.remove(r.marker);
  const [x, z] = r.def.checkpoints[r.cp];
  const marker = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.4, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x37e05a, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
  marker.position.set(x, 0.3, z);
  G.scene.add(marker);
  r.marker = marker;
}

export function updateSide(G, dt) {
  const P = G.player;
  if (G.race) {
    const r = G.race;
    r.t += dt;
    const [x, z] = r.def.checkpoints[r.cp];
    const d = Math.hypot(P.x - x, P.z - z);
    if (d < 10) {
      r.cp += 1;
      if (r.cp >= r.def.checkpoints.length) {
        const pay = r.def.pay + Math.max(0, 200 - Math.floor(r.t));
        P.cash += pay;
        addRp(G, 120);
        G.racesWon += 1;
        if (G.hud) G.hud.notify(`${r.def.name} won in ${Math.round(r.t)}s — +$${pay}, +120 RP`);
        if (G.audio) G.audio.sfx('complete');
        G.scene.remove(r.marker);
        G.race = null;
      } else {
        placeRaceMarker(G);
        if (G.hud) G.hud.notify(`Checkpoint ${r.cp}/${r.def.checkpoints.length}`);
      }
    }
  }
  // Stunt jumps: cross a ramp fast and the game credits the jump.
  if (P.car && Math.abs(P.car.speed) > 18) {
    for (const j of JUMPS) {
      if (j.done) continue;
      const d = Math.hypot(P.x - j.x, P.z - j.z);
      if (d < 6) {
        j.done = true;
        G.jumpsDone += 1;
        P.cash += 150;
        addRp(G, 60);
        if (G.hud) G.hud.notify(`Stunt jump: ${j.name}! +$150, +60 RP`);
        if (G.audio) G.audio.sfx('pickup');
      }
    }
  }
  // Taxi: pick up a fare, drop them at the marker.
  if (G.taxi) {
    const t = G.taxi;
    const d = Math.hypot(P.x - t.x, P.z - t.z);
    if (!t.picked && d < 8) {
      t.picked = true;
      t.x = t.dx; t.z = t.dz;
      if (G.hud) G.hud.notify('Fare picked up — drop them at the marker.');
    } else if (t.picked && d < 8) {
      P.cash += t.pay;
      addRp(G, 30);
      if (G.hud) G.hud.notify(`Fare done — +$${t.pay}, +30 RP`);
      G.taxi = null;
    }
  }
}

export function startTaxi(G) {
  if (G.taxi || !G.player.car) return false;
  const spots = [[80, -80], [-80, 40], [120, 80], [-40, -120], [40, 40]];
  const [x, z] = spots[Math.floor(Math.random() * spots.length)];
  const [dx, dz] = spots[Math.floor(Math.random() * spots.length)];
  G.taxi = { x, z, dx, dz, picked: false, pay: 60 + Math.floor(Math.random() * 60) };
  if (G.hud) G.hud.notify('Taxi fare waiting — drive to the marker.');
  return true;
}

export function holdup(G) {
  const P = G.player;
  if (P.car) { if (G.hud) G.hud.notify('Holdups happen on foot — get out of the car.'); return false; }
  // Near the market square only.
  const d = Math.hypot(P.x, P.z);
  if (d > 45) { if (G.hud) G.hud.notify('No shop to hold up here — try the Night Market.'); return false; }
  const take = 80 + Math.floor(Math.random() * 120);
  P.cash += take;
  addHeat(G, 40);
  addRp(G, 40);
  if (G.hud) G.hud.notify(`Shop held up — +$${take}. The VPD is on its way.`);
  return true;
}

export function exportCar(G) {
  const P = G.player;
  if (!P.car) { if (G.hud) G.hud.notify('You need a car to export.'); return false; }
  const d = Math.hypot(P.x - 175, P.z - 60);
  if (d > 16) { if (G.hud) G.hud.notify('Exports go to the south dock — Port Vesper, x 175, z 60.'); return false; }
  const slot = EXPORTS.find((e) => e.model === P.car.model && !e.done);
  if (!slot) { if (G.hud) G.hud.notify('That model is already exported — or not on the list.'); return false; }
  slot.done = true;
  G.exportsDone += 1;
  P.cash += 900;
  addRp(G, 200);
  if (G.hud) G.hud.notify(`Exported a ${slot.name} — +$900, +200 RP (${G.exportsDone}/5 on the list)`);
  return true;
}

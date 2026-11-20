// June Calloway on foot and behind the wheel: movement, weapons, shooting,
// entering / stealing cars.
import * as THREE from '../vendor/three.module.min.js';
import { makeCar, driveCar, carKmh } from './vehicles.js';
import { collideBuildings } from './city.js';
import { addHeat } from './police.js';

export const WEAPONS = [
  { name: 'Pistol', ammo: Infinity, dmg: 12, rate: 0.28, range: 60 },
  { name: 'SMG', ammo: 120, dmg: 8, rate: 0.09, range: 55 },
  { name: 'Shotgun', ammo: 24, dmg: 30, rate: 0.8, range: 26 },
  { name: 'Rifle', ammo: 60, dmg: 22, rate: 0.22, range: 90 },
];

export function createPlayer(G) {
  const group = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: 0x2a4a6a, roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.05, 0.36), coat);
  body.position.y = 1.05; group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 10), new THREE.MeshStandardMaterial({ color: 0xc89878 }));
  head.position.y = 1.82; group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.29, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: 0x1a1210 }));
  hair.position.y = 1.86; group.add(hair);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1c1c22 });
  const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22), legMat); l1.position.set(-0.15, 0.3, 0); group.add(l1);
  const l2 = l1.clone(); l2.position.x = 0.15; group.add(l2);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.55), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  gun.position.set(0.35, 1.2, 0.3); group.add(gun);
  group.position.set(0, 0, 0);
  G.scene.add(group);
  return {
    group, l1, l2,
    x: 0, z: 0, heading: 0, camYaw: 0, onFoot: true, car: null,
    health: 100, armor: 0, cash: 600, rp: 0, rankIdx: 0,
    stars: 0, heat: 0, weapons: WEAPONS.map((w) => ({ ...w })), weaponIdx: 0,
    lastShot: 0, walk: 0, damageTaken: 0, maxWanted: 0, kills: 0,
  };
}

export function addRp(G, n) {
  const P = G.player;
  P.rp += n;
  const thresholds = [0, 800, 2000, 3600, 5200];
  while (P.rankIdx < 4 && P.rp >= thresholds[P.rankIdx + 1]) {
    P.rankIdx++;
    if (G.hud) G.hud.notify(`Rank up — you are now ${RANKS[P.rankIdx]}!`);
  }
}
export const RANKS = ['GREENHORN', 'RUNNER', 'FIXER', 'SHOT CALLER', 'DELTA KING'];
const RANK_THRESHOLDS = [0, 800, 2000, 3600, 5200];
export function rpProgress(P) {
  const cur = RANK_THRESHOLDS[P.rankIdx];
  const next = P.rankIdx < 4 ? RANK_THRESHOLDS[P.rankIdx + 1] : P.rp;
  return { cur, next, pct: next > cur ? (P.rp - cur) / (next - cur) : 1 };
}

export function updatePlayer(G, dt, input) {
  const P = G.player;
  if (P.car) {
    const spd = driveCar(G, P.car, dt, input);
    P.x = P.car.x; P.z = P.car.z; P.heading = P.car.heading;
    P.group.position.set(P.x, -50, P.z); // hide the on-foot body while driving
    P.group.visible = false;
    if (spd > 12) {
      // Near-miss bonus: threading past a cop car at speed.
      for (const u of G.police.units) {
        if (u.car && !u.paid) {
          const d = Math.hypot(u.car.x - P.car.x, u.car.z - P.car.z);
          if (d < 4.5) { u.paid = true; P.cash += 25; if (G.hud) G.hud.notify('Close call +$25'); }
        } else if (u.car && u.paid) {
          const d = Math.hypot(u.car.x - P.car.x, u.car.z - P.car.z);
          if (d > 12) u.paid = false;
        }
      }
    }
    return carKmh(P.car);
  }
  P.group.visible = true;
  const speed = input.run ? 7.5 : 4.5;
  let mx = 0, mz = 0;
  if (input.forward) { mx += Math.sin(P.camYaw); mz += Math.cos(P.camYaw); }
  if (input.back) { mx -= Math.sin(P.camYaw); mz -= Math.cos(P.camYaw); }
  if (input.left) { mx -= Math.cos(P.camYaw); mz += Math.sin(P.camYaw); }
  if (input.right) { mx += Math.cos(P.camYaw); mz -= Math.sin(P.camYaw); }
  const len = Math.hypot(mx, mz);
  if (len > 0) {
    mx /= len; mz /= len;
    const fixed = collideBuildings(G, P.x + mx * speed * dt, P.z + mz * speed * dt, 0.6);
    P.x = fixed.x; P.z = fixed.z;
    P.heading = Math.atan2(mx, mz);
    P.walk += dt * 9;
  }
  P.group.position.set(P.x, 0, P.z);
  P.group.rotation.y = P.heading;
  P.l1.rotation.x = Math.sin(P.walk) * 0.6;
  P.l2.rotation.x = -Math.sin(P.walk) * 0.6;
  return 0;
}

export function nearestCar(G, maxDist = 6) {
  const P = G.player;
  let best = null, bd = maxDist;
  for (const car of G.cars) {
    if (car.driver === 'police') continue;
    const d = Math.hypot(car.x - P.x, car.z - P.z);
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}

export function enterCar(G, car) {
  const P = G.player;
  if (!car) return false;
  if (car.driver && car.driver !== 'player' && car.kind === 'traffic') {
    car.driver = 'player'; // driver flees on foot
  }
  P.car = car; P.onFoot = false; car.driver = 'player';
  P.x = car.x; P.z = car.z;
  if (G.audio) G.audio.sfx('door');
  return true;
}

export function exitCar(G) {
  const P = G.player;
  if (!P.car) return;
  P.car.driver = null;
  P.x = P.car.x + Math.sin(P.car.heading + Math.PI / 2) * 2.5;
  P.z = P.car.z + Math.cos(P.car.heading + Math.PI / 2) * 2.5;
  P.car = null; P.onFoot = true;
  P.group.position.set(P.x, 0, P.z);
}

export function stealCar(G) {
  const car = nearestCar(G, 7);
  if (!car) { if (G.hud) G.hud.notify('No car close enough to take.'); return false; }
  enterCar(G, car);
  addHeat(G, 40); // stealing is loud: exactly 2 stars, cops spawn
  if (G.hud) G.hud.notify(`Stole a ${car.spec.name} — the VPD is coming.`);
  return true;
}

export function switchWeapon(G, idx) {
  const P = G.player;
  if (idx >= 0 && idx < P.weapons.length) {
    P.weaponIdx = idx;
    if (G.audio) G.audio.sfx('swap');
  }
}

// Hitscan shot from the camera centre; hits enemies first, then cars.
export function shoot(G) {
  const P = G.player;
  const now = G.elapsed;
  const w = P.weapons[P.weaponIdx];
  if (now - P.lastShot < w.rate) return;
  if (w.ammo !== Infinity && w.ammo <= 0) { if (G.hud) G.hud.notify(`${w.name} is empty — buy ammo at a gun shop (B).`); return; }
  P.lastShot = now;
  if (w.ammo !== Infinity) w.ammo -= 1;
  if (G.audio) G.audio.sfx('shot');
  const ox = P.car ? P.car.x : P.x, oz = P.car ? P.car.z : P.z;
  const dirX = Math.sin(P.camYaw), dirZ = Math.cos(P.camYaw);
  let best = null, bd = w.range;
  for (const e of G.enemies || []) {
    if (e.hp <= 0) continue;
    const ex = e.x - ox, ez = e.z - oz;
    const along = ex * dirX + ez * dirZ;
    if (along < 1 || along > bd) continue;
    const perp = Math.abs(ex * dirZ - ez * dirX);
    if (perp < 1.6) { best = e; bd = along; }
  }
  if (best) {
    best.hp -= w.dmg;
    if (G.audio) G.audio.sfx('hit');
    if (best.hp <= 0) {
      P.kills += 1;
      addRp(G, 25);
      if (G.hud) G.hud.notify('Target down. +25 RP');
      if (G.mission) G.mission.onKill?.(best);
    }
    return;
  }
  // Otherwise, plink a car in the line of fire.
  for (const car of G.cars) {
    if (car === P.car) continue;
    const ex = car.x - ox, ez = car.z - oz;
    const along = ex * dirX + ez * dirZ;
    if (along < 1 || along > w.range) continue;
    const perp = Math.abs(ex * dirZ - ez * dirX);
    if (perp < 2) {
      car.damage = Math.min(100, car.damage + w.dmg * 0.4);
      addHeat(G, 4);
      break;
    }
  }
}

export function damagePlayer(G, n) {
  const P = G.player;
  let left = n;
  if (P.armor > 0) { const absorbed = Math.min(P.armor, left); P.armor -= absorbed; left -= absorbed; }
  P.health -= left;
  P.damageTaken += left;
  if (P.health <= 0) {
    P.health = 0;
    if (G.onWasted) G.onWasted();
  }
}

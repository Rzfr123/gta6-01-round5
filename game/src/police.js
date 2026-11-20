// VPD — the Vesper Police Department. Named units with bird callsigns,
// roles and live distances, shown in the VPD RESPONSE panel.
import * as THREE from '../vendor/three.module.min.js';
import { makeCar, driveCar } from './vehicles.js';
import { snapToRoad } from './city.js';

const CALLSIGNS = ['GULL', 'HERON', 'EGRET', 'KITE', 'CORMORANT', 'PELICAN', 'OSPREY', 'IBIS'];
const ROLES = ['PURSUIT', 'RAMMING', 'FLANKING', 'ROADBLOCK', 'AIR'];

export function setWanted(G, stars) {
  const P = G.player;
  const old = P.stars;
  P.stars = Math.max(0, Math.min(5, stars));
  P.heat = P.stars * 20;
  if (P.stars > old) {
    if (G.hud) G.hud.notify(`Wanted level ${P.stars} — VPD units dispatched.`);
    if (G.audio) G.audio.sfx('siren');
  }
  syncUnits(G);
}

export function addHeat(G, n) {
  const P = G.player;
  P.heat = Math.min(100, P.heat + n);
  const level = Math.ceil(P.heat / 20);
  if (level !== P.stars) setWanted(G, level);
}

export function unitDistance(G, unit) {
  const P = G.player;
  const px = P.car ? P.car.x : P.x, pz = P.car ? P.car.z : P.z;
  const ux = unit.car ? unit.car.x : unit.x, uz = unit.car ? unit.car.z : unit.z;
  return Math.round(Math.hypot(px - ux, pz - uz));
}

function spawnUnit(G, idx) {
  const P = G.player;
  const px = P.car ? P.car.x : P.x, pz = P.car ? P.car.z : P.z;
  const s = snapToRoad(G, px + (Math.random() - 0.5) * 90, pz + (Math.random() - 0.5) * 90);
  const car = makeCar(G, 'runner', 0x10204a, { x: s.x, z: s.z, kind: 'police', heading: 0 });
  car.driver = 'police';
  car.speed = 8;
  // Police light bar: red/blue flashing boxes.
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  red.position.set(-0.3, 1.95, 0); car.group.add(red);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
  blue.position.set(0.3, 1.95, 0); car.group.add(blue);
  const role = idx === 0 ? 'PURSUIT' : ROLES[1 + (idx % 4)];
  const unit = { callsign: `${CALLSIGNS[idx % CALLSIGNS.length]}-${(idx % 9) + 1}`, role, car, red, blue, ramAt: 0, blockAt: 0 };
  G.cars.push(car);
  G.police.units.push(unit);
  return unit;
}

function syncUnits(G) {
  const want = G.player.stars === 0 ? 0 : Math.min(6, G.player.stars + 1);
  while (G.police.units.length < want) spawnUnit(G, G.police.units.length);
  while (G.police.units.length > want) {
    const u = G.police.units.pop();
    if (u.car) {
      const ci = G.cars.indexOf(u.car); if (ci >= 0) G.cars.splice(ci, 1);
      G.scene.remove(u.car.group);
    }
    if (u.heli) G.scene.remove(u.heli);
  }
  // Helicopter from 3 stars: a hovering shape with a searchlight cone.
  if (G.player.stars >= 3 && !G.police.heli) {
    const heli = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 5), new THREE.MeshStandardMaterial({ color: 0x1a2a3a }));
    heli.add(body);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    rotor.position.y = 1.1; heli.add(rotor);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4.5, 22, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff8c0, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
    cone.rotation.x = Math.PI; cone.position.y = -12; heli.add(cone);
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff8c0 }));
    spot.position.y = -1; heli.add(spot);
    heli.userData.rotor = rotor;
    G.scene.add(heli);
    G.police.heli = heli;
  } else if (G.player.stars < 3 && G.police.heli) {
    G.scene.remove(G.police.heli);
    G.police.heli = null;
  }
}

export function updatePolice(G, dt) {
  const P = G.player;
  // Heat cools when hidden: no unit within 45 units and player not speeding.
  if (P.stars > 0) {
    let nearest = 1e9;
    for (const u of G.police.units) nearest = Math.min(nearest, unitDistance(G, u));
    const coolRate = (nearest > 45 ? 2.2 : 0.4) * (G.districtStanding?.('marsh') >= 100 && !P.car ? 2 : 1);
    P.heat = Math.max(0, P.heat - coolRate * dt);
    const level = Math.ceil(P.heat / 20);
    if (level !== P.stars) setWanted(G, level);
  }
  const px = P.car ? P.car.x : P.x, pz = P.car ? P.car.z : P.z;
  const now = G.elapsed;
  for (const u of G.police.units) {
    const car = u.car;
    // Light bar flash.
    const on = Math.floor(now * 6) % 2 === 0;
    u.red.material.color.setHex(on ? 0xff2222 : 0x551111);
    u.blue.material.color.setHex(on ? 0x111155 : 0x2244ff);
    const dx = px - car.x, dz = pz - car.z;
    const dist = Math.hypot(dx, dz) || 1;
    const targetHeading = Math.atan2(dx, dz);
    let dh = targetHeading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    const top = 26 + P.stars * 2;
    car.speed = Math.min(top, car.speed + 14 * dt);
    car.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, dh));
    const nx = car.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.z + Math.cos(car.heading) * car.speed * dt;
    car.x = nx; car.z = nz;
    car.group.position.set(car.x, 0, car.z);
    car.group.rotation.y = car.heading;
    // Ram: one shove per 0.8s per unit when close, never a pin.
    if (dist < 5 && now - u.ramAt > 0.8) {
      u.ramAt = now;
      if (P.car) {
        P.car.speed *= 0.82;
        P.car.damage = Math.min(100, P.car.damage + 3);
        if (G.hud) G.hud.notify(`${u.callsign} rammed you!`);
      } else {
        P.health = Math.max(0, P.health - 6);
        if (G.audio) G.audio.sfx('hit');
      }
    }
    // Roadblock role: at 4+ stars, a unit stops ahead of the player.
    if (u.role === 'ROADBLOCK' && P.stars >= 4 && dist > 26 && dist < 70 && now - u.blockAt > 14) {
      u.blockAt = now;
      const bx = px + Math.sin(P.car ? P.car.heading : P.heading) * 24;
      const bz = pz + Math.cos(P.car ? P.car.heading : P.heading) * 24;
      car.x = bx; car.z = bz; car.speed = 0;
      if (G.hud) G.hud.notify(`${u.callsign} set a roadblock ahead!`);
    }
  }
  if (G.police.heli) {
    const heli = G.police.heli;
    heli.position.set(px + 12, 34, pz - 12);
    heli.userData.rotor.rotation.y += dt * 18;
    heli.rotation.y += dt * 0.2;
  }
  if (P.car && P.car.damage >= 100) {
    if (G.hud) G.hud.notify('Your car is wrecked — bail out!');
    P.car.speed = 0;
  }
}

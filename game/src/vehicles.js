// Cars: low-poly box-built models with arcade driving. Five original models.
import * as THREE from '../vendor/three.module.min.js';
import { collideBuildings } from './city.js';

export const CAR_MODELS = {
  runner: { name: 'Delta Runner', top: 30, accel: 16, grip: 2.6, len: 4.4 },
  gt:     { name: 'Vesper GT',    top: 40, accel: 22, grip: 3.2, len: 4.2 },
  pickup: { name: 'Bayou Pickup', top: 28, accel: 14, grip: 2.4, len: 5.0 },
  van:    { name: 'Market Van',   top: 24, accel: 11, grip: 2.0, len: 5.2 },
  hauler: { name: 'Port Hauler',  top: 22, accel: 9,  grip: 1.8, len: 6.4 },
};

export function makeCar(G, model, color, opts = {}) {
  const spec = CAR_MODELS[model] || CAR_MODELS.runner;
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a1420, roughness: 0.15, metalness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.85, spec.len), bodyMat);
  body.position.y = 0.75; group.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, spec.len * 0.45), glassMat);
  cab.position.set(0, 1.45, -spec.len * 0.05); group.add(cab);
  if (model === 'pickup' || model === 'hauler') {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, spec.len * 0.4), bodyMat);
    bed.position.set(0, 1.1, spec.len * 0.28); group.add(bed);
  }
  // Headlights: emissive discs + a pale cone of light on wet road.
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  for (const s of [-0.65, 0.65]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), lightMat);
    hl.position.set(s, 0.8, spec.len / 2); group.add(hl);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4, 7, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
    cone.rotation.x = Math.PI / 2 + 0.35; cone.position.set(s, 0.7, spec.len / 2 + 3.4); group.add(cone);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const s of [-0.65, 0.65]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.1), tailMat);
    tl.position.set(s, 0.85, -spec.len / 2); group.add(tl);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, spec.len * 0.32], [0.95, spec.len * 0.32], [-0.95, -spec.len * 0.32], [0.95, -spec.len * 0.32]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.42, wz); group.add(w); wheels.push(w);
  }
  const car = {
    group, model, spec, color, wheels,
    x: opts.x ?? 0, z: opts.z ?? 0, heading: opts.heading ?? 0,
    speed: 0, engineLv: opts.engineLv ?? 0, armorLv: 0,
    damage: 0, driver: opts.driver ?? null, kind: opts.kind ?? 'traffic',
    underglow: false, steer: 0,
  };
  group.position.set(car.x, 0, car.z);
  group.rotation.y = car.heading;
  G.scene.add(group);
  return car;
}

export function removeCar(G, car) {
  G.scene.remove(car.group);
  const i = G.cars.indexOf(car); if (i >= 0) G.cars.splice(i, 1);
}

// Arcade driving: throttle, brake/reverse, steering that scales with speed.
export function driveCar(G, car, dt, input) {
  const spec = car.spec;
  const top = spec.top * (1 + car.engineLv * 0.18);
  if (input.forward) car.speed += spec.accel * dt;
  else if (input.back) car.speed -= spec.accel * 0.8 * dt;
  else car.speed *= Math.max(0, 1 - 0.9 * dt);
  if (input.handbrake) car.speed *= Math.max(0, 1 - 3.2 * dt);
  car.speed = Math.max(-top * 0.45, Math.min(top, car.speed));
  const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
  const dir = car.speed >= 0 ? 1 : -1;
  car.heading += car.steer * spec.grip * dt * Math.min(1, Math.abs(car.speed) / 8) * dir;
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const fixed = collideBuildings(G, nx, nz, 1.6);
  if (fixed.x !== nx || fixed.z !== nz) {
    car.speed *= 0.55;
    if (car.driver === 'player') car.damage = Math.min(100, car.damage + 1.2);
  }
  car.x = fixed.x; car.z = fixed.z;
  car.group.position.set(car.x, 0, car.z);
  car.group.rotation.y = car.heading;
  for (const w of car.wheels) w.rotation.x += car.speed * dt * 2;
  return Math.abs(car.speed);
}

export function carKmh(car) { return Math.round(Math.abs(car.speed) * 3.6); }

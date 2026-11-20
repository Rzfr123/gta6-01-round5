// Traffic cars and pedestrians wandering Vesper's wet roads.
import * as THREE from '../vendor/three.module.min.js';
import { makeCar, driveCar } from './vehicles.js';
import { snapToRoad, collideBuildings } from './city.js';

const MODELS = ['runner', 'pickup', 'van', 'runner', 'hauler'];
const COLORS = [0x8a2a2a, 0x2a5a8a, 0x5a5a5a, 0x8a6a2a, 0x2a6a4a, 0x6a2a6a];

export function spawnTraffic(G) {
  G.traffic = [];
  G.peds = [];
  for (let i = 0; i < 10; i++) {
    const s = snapToRoad(G, (Math.random() - 0.5) * 360, (Math.random() - 0.5) * 360);
    const along = Math.random() < 0.5;
    const car = makeCar(G, MODELS[i % MODELS.length], COLORS[i % COLORS.length],
      { x: s.x, z: s.z, kind: 'traffic', heading: along ? 0 : Math.PI / 2 });
    car.speed = 6 + Math.random() * 5;
    car.driver = 'traffic';
    car.route = { along, fixed: along ? s.x : s.z };
    G.cars.push(car); G.traffic.push(car);
  }
  for (let i = 0; i < 12; i++) {
    const p = makePed(G, (Math.random() - 0.5) * 340, (Math.random() - 0.5) * 340);
    G.peds.push(p);
  }
}

function makePed(G, x, z) {
  const group = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: [0x8a2a3a, 0x2a4a6a, 0x3a3a3a, 0x6a5a2a][Math.floor(Math.random() * 4)], roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.35), coat);
  body.position.y = 1.05; group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), new THREE.MeshStandardMaterial({ color: 0xc89878 }));
  head.position.y = 1.85; group.add(head);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22), legMat); l1.position.set(-0.15, 0.3, 0); group.add(l1);
  const l2 = l1.clone(); l2.position.x = 0.15; group.add(l2);
  group.position.set(x, 0, z);
  G.scene.add(group);
  return { group, x, z, heading: Math.random() * Math.PI * 2, speed: 1.2 + Math.random(), l1, l2, walk: Math.random() * 6 };
}

export function updateTraffic(G, dt) {
  for (const car of G.traffic) {
    // Simple loop: drive along one road axis, wrap at the city edge.
    const dir = Math.sin(car.heading) >= 0 ? 1 : -1;
    const fwd = { forward: true, back: false, left: false, right: false, handbrake: false };
    driveCar(G, car, dt, fwd);
    if (car.route.along) {
      car.x = car.route.fixed;
      if (car.z > 205) car.z = -205; if (car.z < -205) car.z = 205;
    } else {
      car.z = car.route.fixed;
      if (car.x > 205) car.x = -205; if (car.x < -205) car.x = 205;
    }
    car.group.position.set(car.x, 0, car.z);
    // Keep traffic off the player's car: gentle push-away.
    const P = G.player;
    if (P.car) {
      const dx = car.x - P.car.x, dz = car.z - P.car.z;
      if (dx * dx + dz * dz < 25) { car.x += dx * 0.02; car.z += dz * 0.02; }
    }
  }
  for (const p of G.peds) {
    p.walk += dt * 5;
    p.x += Math.sin(p.heading) * p.speed * dt;
    p.z += Math.cos(p.heading) * p.speed * dt;
    if (Math.random() < dt * 0.1) p.heading = Math.random() * Math.PI * 2;
    const fixed = collideBuildings(G, p.x, p.z, 0.5);
    p.x = fixed.x; p.z = fixed.z;
    p.group.position.set(p.x, 0, p.z);
    p.group.rotation.y = p.heading;
    p.l1.rotation.x = Math.sin(p.walk) * 0.5;
    p.l2.rotation.x = -Math.sin(p.walk) * 0.5;
  }
}

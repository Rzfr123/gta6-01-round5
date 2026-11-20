// Brass Herons — 20 golden collectibles hidden across Vesper's districts.
import * as THREE from '../vendor/three.module.min.js';
import { addRp } from './player.js';

const HERON_SPOTS = [
  [-120, 66], [-170, 20], [-186, -40], [-150, 100], // Stilt Row
  [0, -26], [26, 0], [-26, 0], [14, 14],             // Night Market
  [-20, -80], [-60, -100], [10, -120], [-20, -40],   // Downtown
  [160, -40], [185, -10], [150, -70],                // Port
  [150, 140], [132, 128],                            // Foundry
  [40, 165], [0, 180],                    // Marsh
  [0, -170],                                         // Levee
];

export function spawnHerons(G) {
  G.herons = [];
  G.heronsFound = G.heronsFound || 0;
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8a020, metalness: 0.9, roughness: 0.25, emissive: 0x664400, emissiveIntensity: 0.4 });
  for (const [x, z] of HERON_SPOTS) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 6), gold);
    body.rotation.x = Math.PI / 2; body.position.y = 1.4; group.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.1, 6), gold);
    neck.position.set(0, 1.9, 0.7); neck.rotation.x = 0.5; group.add(neck);
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 5), gold);
    legs.position.y = 0.6; group.add(legs);
    group.position.set(x, 0, z);
    G.scene.add(group);
    G.herons.push({ group, x, z, taken: false });
  }
  // Restore already-collected ones on load.
  for (let i = 0; i < (G.heronsTaken || []).length; i++) {
    const h = G.herons[G.heronsTaken[i]];
    if (h) { h.taken = true; G.scene.remove(h.group); }
  }
}

export function updateCollectibles(G, dt) {
  const P = G.player;
  for (let i = 0; i < G.herons.length; i++) {
    const h = G.herons[i];
    if (h.taken) continue;
    h.group.rotation.y += dt * 1.2;
    h.group.position.y = Math.sin(G.elapsed * 2 + i) * 0.25;
    const d = Math.hypot(P.x - h.x, P.z - h.z);
    if (d < 2.5) {
      h.taken = true;
      G.scene.remove(h.group);
      G.heronsFound = (G.heronsFound || 0) + 1;
      G.heronsTaken = G.heronsTaken || [];
      G.heronsTaken.push(i);
      P.cash += 50;
      addRp(G, 20);
      if (G.hud) G.hud.notify(`Brass Heron ${G.heronsFound}/20 — +$50, +20 RP`);
      if (G.audio) G.audio.sfx('pickup');
    }
  }
}

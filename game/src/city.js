// Vesper — a river-delta port city at night. Original layout: a 40-unit road
// grid, a river and levee to the north, docks to the east, stilt houses to
// the west, marsh to the south, downtown towers in the middle.
import * as THREE from '../vendor/three.module.min.js';

export const DISTRICTS = [
  { id: 'levee',    name: 'The Levee',     cx: 0,    cz: -170, standing: 50, income: 40, perk: 'Rain sheds faster: heat cools 25% quicker.' },
  { id: 'port',     name: 'Port Vesper',   cx: 165,  cz: -40,  standing: 50, income: 55, perk: 'Dock hands tip you off: police spawn 1 fewer unit.' },
  { id: 'market',   name: 'Night Market',  cx: 0,    cz: 0,    standing: 50, income: 45, perk: 'Market stalls pay protection: +$15 per hour.' },
  { id: 'downtown', name: 'Downtown Vesper', cx: -20, cz: -80, standing: 40, income: 60, perk: 'Tower lookouts: Eyes Up lasts +15s.' },
  { id: 'stilt',    name: 'Stilt Row',     cx: -165, cz: 20,   standing: 50, income: 35, perk: 'Stilt runners stash cars: Field Fix cooldown -10s.' },
  { id: 'marsh',    name: 'Marsh Edge',    cx: 40,   cz: 165,  standing: 25, income: 30, perk: 'Marsh boats: wanted stars drop twice as fast off-road.' },
  { id: 'foundry',  name: 'Old Foundry',   cx: 150,  cz: 140,  standing: 15, income: 50, perk: 'Foundry plates: Hot Swap cooldown -15s.' },
];

export function standingState(v) {
  if (v >= 100) return 'YOURS';
  if (v >= 80) return 'FRIENDLY';
  if (v >= 50) return 'NEUTRAL';
  if (v >= 30) return 'WARY';
  return 'HOSTILE';
}
export function standingColor(v) {
  if (v >= 100) return 0x37e05a;
  if (v >= 80) return 0x7dff9a;
  if (v >= 50) return 0xffd23e;
  if (v >= 30) return 0xffb347;
  return 0xff5a5a;
}

export function districtAt(G, x, z) {
  let best = null; let bd = 1e9;
  for (const d of G.districts) {
    const dx = x - d.cx, dz = z - d.cz, dist = dx * dx + dz * dz;
    if (dist < bd) { bd = dist; best = d; }
  }
  return best;
}

export function snapToRoad(G, x, z) {
  const rx = Math.round(x / 40) * 40, rz = Math.round(z / 40) * 40;
  return Math.abs(x - rx) < Math.abs(z - rz) ? { x: rx, z } : { x, z: rz };
}

function windowTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#0b1020'; g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 12) for (let x = 6; x < 58; x += 12) {
    const lit = Math.random() < 0.55;
    g.fillStyle = lit ? (Math.random() < 0.7 ? '#ffd98a' : '#9fd8ff') : '#131a2e';
    g.fillRect(x, y, 8, 8);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildCity(G) {
  const S = G.scene;
  const city = { buildings: [], lamps: [], puddles: [], neon: [] };
  G.city = city;

  // Ground: dark wet asphalt base, then district-tinted ground slabs.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(460, 460),
    new THREE.MeshPhongMaterial({ color: 0x0d1420, shininess: 90, specular: 0x335577 }),
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; S.add(ground);

  // River along the north edge, levee wall in front of it.
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(460, 60),
    new THREE.MeshPhongMaterial({ color: 0x0a2a44, shininess: 140, specular: 0x88bbdd, transparent: true, opacity: 0.92 }),
  );
  river.rotation.x = -Math.PI / 2; river.position.set(0, 0.05, -215); S.add(river);
  const levee = new THREE.Mesh(new THREE.BoxGeometry(460, 6, 4), new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.9 }));
  levee.position.set(0, 3, -184); S.add(levee); city.buildings.push({ x: 0, z: -184, hw: 230, hd: 3 });
  // A few moored boats on the river.
  for (let i = 0; i < 5; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(14, 2, 5), new THREE.MeshStandardMaterial({ color: 0x223344 }));
    hull.position.y = 0.8; boat.add(hull);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), new THREE.MeshStandardMaterial({ color: 0xddddcc }));
    cab.position.set(-2, 3, 0); boat.add(cab);
    boat.position.set(-160 + i * 80, 0, -212); S.add(boat);
  }

  // Roads: dark strips with a painted centre dash (one texture per axis,
  // repeated), on the 40-unit grid. No per-dash meshes — SwiftShader
  // chokes on hundreds of tiny planes.
  const makeRoadTex = (horizontal) => {
    const c = document.createElement('canvas'); c.width = 32; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#11161f'; g.fillRect(0, 0, 32, 128);
    g.fillStyle = '#ccbb66';
    if (horizontal) g.fillRect(4, 62, 20, 4); else g.fillRect(15, 20, 2, 44);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const roadTexV = makeRoadTex(false); roadTexV.repeat.set(1, 21);
  const roadTexH = makeRoadTex(true); roadTexH.repeat.set(21, 1);
  const roadMatV = new THREE.MeshPhongMaterial({ map: roadTexV, shininess: 120, specular: 0x5588aa });
  const roadMatH = new THREE.MeshPhongMaterial({ map: roadTexH, shininess: 120, specular: 0x5588aa });
  for (let i = -5; i <= 5; i++) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(10, 420), roadMatV);
    v.rotation.x = -Math.PI / 2; v.position.set(i * 40, 0, 0); S.add(v);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(420, 10), roadMatH);
    h.rotation.x = -Math.PI / 2; h.position.set(0, 0.01, i * 40); S.add(h);
  }

  // Puddles: pale reflective discs scattered on roads.
  const puddleMat = new THREE.MeshPhongMaterial({ color: 0x2a4a66, shininess: 200, specular: 0xaaccff, transparent: true, opacity: 0.5 });
  for (let i = 0; i < 26; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(2 + Math.random() * 3, 12), puddleMat);
    p.rotation.x = -Math.PI / 2;
    const s = snapToRoad(G, (Math.random() - 0.5) * 380, (Math.random() - 0.5) * 380);
    p.position.set(s.x + (Math.random() - 0.5) * 4, 0.04, s.z + (Math.random() - 0.5) * 4);
    S.add(p); city.puddles.push(p);
  }

  // Buildings: blocks inside each grid cell, kept clear of roads.
  const winTex = windowTexture();
  const wallCols = [0x1a2338, 0x241a30, 0x1a2a24, 0x2a1e16, 0x101826];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const downtown = (x, z) => Math.abs(x + 20) < 70 && Math.abs(z + 80) < 70;
  for (let gx = -5; gx <= 4; gx++) for (let gz = -5; gz <= 4; gz++) {
    const cx = gx * 40 + 20, cz = gz * 40 + 20;
    // Skip port docks, market square, marsh and stilt water areas.
    if (cx > 120 && cz < 20) continue;
    if (Math.abs(cx) < 30 && Math.abs(cz) < 30) continue;
    if (cz > 140) continue;
    if (cx < -140) continue;
    if (cz < -160) continue;
    const tall = downtown(cx, cz);
    const w = 12 + rnd() * 10, d = 12 + rnd() * 10;
    const h = tall ? 30 + rnd() * 55 : 7 + rnd() * 14;
    const mat = tall
      ? new THREE.MeshStandardMaterial({ map: winTex, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.55, roughness: 0.8 })
      : new THREE.MeshStandardMaterial({ color: wallCols[Math.floor(rnd() * wallCols.length)], roughness: 0.85 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(cx + (rnd() - 0.5) * 6, h / 2, cz + (rnd() - 0.5) * 6);
    S.add(b);
    city.buildings.push({ x: b.position.x, z: b.position.z, hw: w / 2 + 1, hd: d / 2 + 1 });
    // Rooftop beacon on the tallest towers.
    if (tall && rnd() < 0.5) {
      const bc = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff4040 }));
      bc.position.set(b.position.x, h + 1, b.position.z); S.add(bc); city.neon.push(bc);
    }
  }

  // Downtown hero tower with a neon crown.
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(22, 78, 22),
    new THREE.MeshStandardMaterial({ map: winTex, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.7, roughness: 0.8 }),
  );
  tower.position.set(-20, 39, -80); S.add(tower);
  city.buildings.push({ x: -20, z: -80, hw: 12, hd: 12 });
  const crown = new THREE.Mesh(new THREE.BoxGeometry(24, 2, 24), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
  crown.position.set(-20, 79, -80); S.add(crown); city.neon.push(crown);

  // Night Market: stalls with striped awnings around the central square.
  const awnCols = [0xff5a7a, 0xffd23e, 0x37e05a, 0x4db8ff, 0xff8a3d];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const sx = Math.cos(a) * 26, sz = Math.sin(a) * 26;
    const stall = new THREE.Group();
    const counter = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 3), new THREE.MeshStandardMaterial({ color: 0x4a3220 }));
    counter.position.y = 1; stall.add(counter);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 4), new THREE.MeshStandardMaterial({ color: awnCols[i % awnCols.length], emissive: awnCols[i % awnCols.length], emissiveIntensity: 0.35 }));
    awn.position.y = 3.4; awn.rotation.z = 0.12; stall.add(awn);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    bulb.position.y = 3; stall.add(bulb); city.neon.push(bulb);
    stall.position.set(sx, 0, sz); stall.rotation.y = -a; S.add(stall);
    city.buildings.push({ x: sx, z: sz, hw: 3.4, hd: 2.4 });
  }
  // Market sign: glowing letters as thin emissive boxes.
  const sign = new THREE.Mesh(new THREE.BoxGeometry(30, 3, 1), new THREE.MeshBasicMaterial({ color: 0xff5a7a }));
  sign.position.set(0, 12, -32); S.add(sign); city.neon.push(sign);

  // Port Vesper: container stacks and two cranes.
  const contCols = [0xb03a2e, 0x2e6db0, 0x3a9e4d, 0xd08a2e, 0x7a4db0];
  for (let i = 0; i < 18; i++) {
    const w = 10, h = 3, d = 3;
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: contCols[i % contCols.length], roughness: 0.7 }));
    const x = 140 + (i % 6) * 12, z = -60 + Math.floor(i / 6) * 14;
    c.position.set(x, 1.5 + (i % 3 === 0 ? 3 : 0), z);
    if (i % 3 === 0) c.position.y = 4.5;
    S.add(c); city.buildings.push({ x, z, hw: 6, hd: 2.4 });
  }
  for (const cx of [150, 185]) {
    const crane = new THREE.Group();
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(2, 26, 2), new THREE.MeshStandardMaterial({ color: 0xd08a2e }));
    leg1.position.set(-4, 13, 0); crane.add(leg1);
    const leg2 = leg1.clone(); leg2.position.x = 4; crane.add(leg2);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(30, 2, 2), new THREE.MeshStandardMaterial({ color: 0xd08a2e }));
    arm.position.set(6, 26, 0); crane.add(arm);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    hook.position.set(18, 20, 0); crane.add(hook);
    crane.position.set(cx, 0, -10); S.add(crane);
    city.buildings.push({ x: cx - 4, z: -10, hw: 2, hd: 2 }, { x: cx + 4, z: -10, hw: 2, hd: 2 });
  }

  // Stilt Row: houses on poles over shallow water, west edge.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 200),
    new THREE.MeshPhongMaterial({ color: 0x0a2438, shininess: 160, specular: 0x77aacc, transparent: true, opacity: 0.9 }),
  );
  water.rotation.x = -Math.PI / 2; water.position.set(-185, 0.06, 20); S.add(water);
  for (let i = 0; i < 8; i++) {
    const hx = -170 + (i % 2) * 16, hz = -60 + Math.floor(i / 2) * 42;
    const hut = new THREE.Group();
    for (const [px, pz] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4, 6), new THREE.MeshStandardMaterial({ color: 0x5a4028 }));
      pole.position.set(px, 2, pz); hut.add(pole);
    }
    const body = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 7), new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.9 }));
    body.position.y = 6; hut.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7, 3, 4), new THREE.MeshStandardMaterial({ color: 0x8a2e2e }));
    roof.position.y = 9.5; roof.rotation.y = Math.PI / 4; hut.add(roof);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    lamp.position.set(0, 5, 4); hut.add(lamp); city.neon.push(lamp);
    hut.position.set(hx, 0, hz); S.add(hut);
    city.buildings.push({ x: hx, z: hz, hw: 5.4, hd: 4.4 });
  }

  // Old Foundry: smokestacks and a furnace hall.
  const hall = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 20), new THREE.MeshStandardMaterial({ color: 0x3a2e26, roughness: 0.9 }));
  hall.position.set(150, 6, 140); S.add(hall); city.buildings.push({ x: 150, z: 140, hw: 16, hd: 11 });
  for (const [sx, sz] of [[132, 128], [168, 128], [150, 156]]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3, 26, 10), new THREE.MeshStandardMaterial({ color: 0x4a4038 }));
    stack.position.set(sx, 13, sz); S.add(stack);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff6a2a }));
    glow.position.set(sx, 26.5, sz); S.add(glow); city.neon.push(glow);
    city.buildings.push({ x: sx, z: sz, hw: 3.4, hd: 3.4 });
  }

  // Marsh Edge: dark ground, reeds and dead trees to the south.
  const marshGround = new THREE.Mesh(new THREE.PlaneGeometry(200, 60),
    new THREE.MeshStandardMaterial({ color: 0x0e2416, roughness: 1 }));
  marshGround.rotation.x = -Math.PI / 2; marshGround.position.set(40, 0.02, 175); S.add(marshGround);
  const reedMat = new THREE.MeshStandardMaterial({ color: 0x1e4a26, roughness: 1 });
  for (let i = 0; i < 60; i++) {
    const reed = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3 + rnd() * 3, 5), reedMat);
    reed.position.set(-50 + rnd() * 180, 1.5, 150 + rnd() * 45); S.add(reed);
  }
  for (let i = 0; i < 6; i++) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 7, 6), new THREE.MeshStandardMaterial({ color: 0x2a2018 }));
    trunk.position.y = 3.5; tree.add(trunk);
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 5, 5), new THREE.MeshStandardMaterial({ color: 0x2a2018 }));
    limb.position.set(1.5, 7, 0); limb.rotation.z = 0.8; tree.add(limb);
    tree.position.set(-40 + rnd() * 160, 0, 150 + rnd() * 40); S.add(tree);
  }

  // Safehouse (player home) at Stilt Row edge, marked with a blue neon V.
  const safe = new THREE.Mesh(new THREE.BoxGeometry(12, 7, 10), new THREE.MeshStandardMaterial({ color: 0x1e3a5a, roughness: 0.8 }));
  safe.position.set(-120, 3.5, 60); S.add(safe); city.buildings.push({ x: -120, z: 60, hw: 7, hd: 6 });
  const vSign = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 0.6), new THREE.MeshBasicMaterial({ color: 0x4db8ff }));
  vSign.position.set(-120, 9, 60); S.add(vSign); city.neon.push(vSign);
  G.safehouse = { x: -120, z: 60 };

  // Street lamps along the main roads.
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j += 2) {
    const x = i * 40 + 6, z = j * 40 + 6;
    if (Math.abs(x) < 30 && Math.abs(z) < 30) continue;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 7, 6), lampMat);
    pole.position.set(x, 3.5, z); S.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), bulbMat);
    bulb.position.set(x, 7.1, z); S.add(bulb);
    city.lamps.push(bulb);
  }

  // Rain: a Points cloud that falls and recycles above the player.
  const rainCount = 1400;
  const pos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 120;
    pos[i * 3 + 1] = Math.random() * 40;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0x9fc8ff, size: 0.28, transparent: true, opacity: 0.65 }));
  S.add(rain);
  city.rain = rain; city.rainCount = rainCount;

  // A few real lights: moon + key area lights (kept few for SwiftShader).
  const moon = new THREE.DirectionalLight(0x8fa8ff, 0.5);
  moon.position.set(60, 120, -40); S.add(moon);
  const marketLight = new THREE.PointLight(0xff8aa8, 60, 70, 1.6);
  marketLight.position.set(0, 12, 0); S.add(marketLight);
  const portLight = new THREE.PointLight(0xffd23e, 50, 80, 1.6);
  portLight.position.set(160, 18, -20); S.add(portLight);
  const downLight = new THREE.PointLight(0x4db8ff, 50, 90, 1.6);
  downLight.position.set(-20, 40, -80); S.add(downLight);
  city.moon = moon;
  S.fog = new THREE.FogExp2(0x0a1224, 0.0038);
  return city;
}

export function updateCity(G, dt) {
  const city = G.city;
  // Rain falls and recycles around the player.
  const pos = city.rain.geometry.attributes.position;
  const speed = 26 + G.rain * 14;
  const px = G.player.x, pz = G.player.z;
  for (let i = 0; i < city.rainCount; i++) {
    let y = pos.getY(i) - speed * dt;
    if (y < 0) {
      y = 30 + Math.random() * 10;
      pos.setX(i, px + (Math.random() - 0.5) * 120);
      pos.setZ(i, pz + (Math.random() - 0.5) * 120);
    }
    pos.setY(i, y);
  }
  pos.needsUpdate = true;
  city.rain.material.opacity = 0.25 + G.rain * 0.45;
  city.rain.visible = G.rain > 0.05;
  // Night deepens as the clock passes midnight, then eases toward dawn.
  const t = G.timeMin; // minutes since 18:00
  const night = t < 360 ? 0.55 + (t / 360) * 0.45 : 1 - ((t - 360) / 360) * 0.35;
  G.scene.background = new THREE.Color(0x060a14).lerp(new THREE.Color(0x0a1428), 1 - night);
  city.moon.intensity = 0.35 + night * 0.35;
  // Neon flicker: one sign stutters.
  const flick = Math.random() < 0.06 ? 0.3 : 1;
  if (city.neon.length) city.neon[Math.floor(Math.random() * city.neon.length)].visible = flick > 0.5;
}

// Circle vs building AABBs: push a moving point out of walls.
export function collideBuildings(G, x, z, r) {
  for (const b of G.city.buildings) {
    const dx = x - b.x, dz = z - b.z;
    if (Math.abs(dx) < b.hw + r && Math.abs(dz) < b.hd + r) {
      const ox = b.hw + r - Math.abs(dx), oz = b.hd + r - Math.abs(dz);
      if (ox < oz) x = b.x + Math.sign(dx || 1) * (b.hw + r);
      else z = b.z + Math.sign(dz || 1) * (b.hd + r);
    }
  }
  x = Math.max(-215, Math.min(215, x));
  z = Math.max(-178, Math.min(215, z));
  return { x, z };
}

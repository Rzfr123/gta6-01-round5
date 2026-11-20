// Vesper Delta — boot, game loop, camera, input and the title screen.
// June Calloway returns to rain-soaked Vesper to take seven districts and
// pull THE FLOOD. Original city, characters, names and story.
import * as THREE from '../vendor/three.module.min.js';
import { buildCity, districtAt, updateCity } from './city.js';
import { makeCar } from './vehicles.js';
import { spawnTraffic, updateTraffic } from './traffic.js';
import { setWanted, updatePolice, unitDistance } from './police.js';
import { createPlayer, updatePlayer, enterCar, exitCar, stealCar, switchWeapon, shoot, nearestCar } from './player.js';
import { initCrew, useAbility } from './crew.js';
import { initDistricts, districtStanding, districtJob, updateDistricts, completionPct } from './districts.js';
import { MISSIONS, startMission, updateMission, updateEnemies, nextStoryMission, failMission } from './missions.js';
import { spawnHerons, updateCollectibles } from './collectibles.js';
import { initSide, startRace, startTaxi, holdup, exportCar, updateSide, RACES, JUMPS, EXPORTS } from './side.js';
import { initHud, refreshHud, openPhone, openShop, openGarage, openStats, closeStats } from './hud.js';
import { initAudio } from './audio.js';
import { readSlots, writeSlot, serialize, applySave, slotSummary } from './save.js';
import { applyShot } from './shots.js';

const $ = (id) => document.getElementById(id);
window.__VESPER_ERRORS__ = [];
window.addEventListener('error', (e) => window.__VESPER_ERRORS__.push(String(e.message || e.error)));

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1');
let seedState = seed * 2654435761 >>> 0;
Math.random = (() => {
  const orig = Math.random;
  return () => {
    seedState = (seedState * 1664525 + 1013904223) >>> 0;
    return seedState / 4294967296;
  };
})();

const G = {
  mode: 'title',
  elapsed: 0,
  timeMin: 200, // minutes since 18:00 — the night opens at 21:20
  rain: 0.65,
  speedKmh: 0,
  missionsDone: [],
  medals: {},
  heronsFound: 0,
  heronsTaken: [],
  racesWon: 0,
  jumpsDone: 0,
  exportsDone: 0,
  mission: null,
  enemies: [],
  cars: [],
  police: { units: [], heli: null },
  gameWon: false,
  selectedSlot: 0,
  camMode: 0,
  bustedT: 0,
  shotMode: null,
  shotCam: null,
};
window.__VESPER__ = G;
G.nextStoryMission = nextStoryMission;
G.storyMissionCount = MISSIONS.length;
G.districtStanding = (id) => districtStanding(G, id);
G.policeDist = (u) => unitDistance(G, u);
G.startMission = startMission;
G.jumpList = JUMPS;
G.exportList = EXPORTS;

// --- Scene ---------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: false });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
G.renderer = renderer;
G.scene = new THREE.Scene();
G.scene.background = new THREE.Color(0x060a14);
G.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);
G.scene.add(new THREE.AmbientLight(0x334466, 1.1));
const hemi = new THREE.HemisphereLight(0x2a3a5a, 0x0a0f18, 0.7);
G.scene.add(hemi);

buildCity(G);
G.player = createPlayer(G);
G.player.x = 0; G.player.z = 60; G.player.heading = Math.PI; G.player.camYaw = Math.PI;
G.player.group.position.set(0, 0, 60);
initCrew(G);
initDistricts(G);
spawnHerons(G);
initSide(G);
initHud(G);
initAudio(G);
spawnTraffic(G);

// A parked starter car on the road by the safehouse so the player can
// drive at once — (-120, 80) is a road intersection, clear of buildings.
const starter = makeCar(G, 'runner', 0x2a6a8a, { x: -120, z: 80, kind: 'player', heading: 0 });
G.cars.push(starter);

// Delta Customs garage hall at (80, 80), with a neon sign and collision.
{
  const hall = new THREE.Mesh(new THREE.BoxGeometry(16, 7, 12), new THREE.MeshStandardMaterial({ color: 0x1e2a3a, roughness: 0.8 }));
  hall.position.set(80, 3.5, 80);
  G.scene.add(hall);
  G.city.buildings.push({ x: 80, z: 80, hw: 9, hd: 7 });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(14, 2, 0.8), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
  sign.position.set(80, 8.4, 80);
  G.scene.add(sign);
  G.garagePos = { x: 80, z: 68 };
  G.gunShopPos = { x: 175, z: -60 };
}

// --- Title screen --------------------------------------------------------
function renderSlots() {
  const slots = readSlots();
  const list = $('slotList');
  list.innerHTML = '';
  slots.forEach((s, i) => {
    const sum = slotSummary(s);
    const row = document.createElement('div');
    row.className = 'slotRow' + (G.selectedSlot === i ? ' sel' : '');
    row.textContent = sum
      ? `Slot ${i + 1} — Act ${sum.act} · ${sum.missions}/12 missions · ${sum.pct}% · $${sum.cash} · ${sum.time}`
      : `Slot ${i + 1} — empty`;
    row.onclick = () => { G.selectedSlot = i; renderSlots(); };
    list.appendChild(row);
  });
  const any = slots.some(Boolean);
  $('continueBtn').disabled = !any;
  $('saveNote').textContent = any ? 'A save exists — CONTINUE resumes the latest slot.' : 'No save yet — NEW GAME starts Act I in the Night Market rain.';
}
renderSlots();

function startPlay() {
  $('overlay').classList.add('hidden');
  G.mode = 'play';
  if (G.audio) G.audio.ensure();
  G.hud.notify('Vesper Delta — press M for your first job. Z/X/C call your crew.');
}
$('continueBtn').onclick = () => {
  const slots = readSlots();
  const idx = slots.findIndex(Boolean);
  if (idx < 0) return;
  G.selectedSlot = idx;
  applySave(G, slots[idx]);
  startPlay();
  G.hud.notify(`Welcome back, June — Act ${slotSummary(slots[idx]).act}, $${G.player.cash}.`);
};
$('newBtn').onclick = () => { startPlay(); };
$('loadBtn').onclick = () => {
  const slots = readSlots();
  const s = slots[G.selectedSlot];
  if (!s) { G.hud.notify('That slot is empty.'); return; }
  applySave(G, s);
  startPlay();
  G.hud.notify(`Loaded slot ${G.selectedSlot + 1}.`);
};
$('settingsBtn').onclick = () => {
  G.audio.muted = !G.audio.muted;
  $('saveNote').textContent = `Sound ${G.audio.muted ? 'muted' : 'on'} — V cycles radio, P opens stats.`;
};

G.onWasted = () => {
  const P = G.player;
  const fee = Math.floor(P.cash * 0.15);
  P.cash -= fee;
  failMission(G, 'you were wasted');
  setWanted(G, 0);
  P.health = 100;
  P.x = G.safehouse.x; P.z = G.safehouse.z + 6;
  if (P.car) { P.car = null; P.onFoot = true; }
  P.group.position.set(P.x, 0, P.z);
  $('bigTitle').textContent = 'WASTED';
  $('bigText').textContent = `The rain washed you out. The VPD took $${fee} (15%) and dumped you at the safehouse.`;
  $('bigmsg').style.display = 'flex';
  G.mode = 'busted';
};
function busted() {
  const P = G.player;
  const fee = Math.floor(P.cash * 0.15);
  P.cash -= fee;
  failMission(G, 'the VPD caught you');
  setWanted(G, 0);
  P.health = 100;
  P.x = G.safehouse.x; P.z = G.safehouse.z + 6;
  if (P.car) { P.car = null; P.onFoot = true; }
  P.group.position.set(P.x, 0, P.z);
  $('bigTitle').textContent = 'BUSTED';
  $('bigText').textContent = `The VPD hauled you in. $${fee} (15%) gone in fines — back to the safehouse.`;
  $('bigmsg').style.display = 'flex';
  G.mode = 'busted';
}

// --- Input ---------------------------------------------------------------
const keys = {};
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys[e.code] = true;
  const k = e.key.toLowerCase();
  if (G.mode === 'title') return;
  if (G.mode === 'busted') return;
  if (k === 'p' || e.key === 'Escape') {
    if (G.mode === 'stats') closeStats(G);
    else if (G.mode === 'play') openStats(G, 'MAP');
    return;
  }
  // Panel keys close their own panel.
  if (G.mode === 'phone' && k === 'u') { $('phone').classList.add('hidden'); G.mode = 'play'; return; }
  if (G.mode === 'shop' && k === 'b') { $('shop').classList.add('hidden'); G.mode = 'play'; return; }
  if (G.mode === 'garage' && k === 'g') { $('garage').classList.add('hidden'); G.mode = 'play'; return; }
  if (G.mode !== 'play') return;
  if (k === 'm') {
    if (G.mission) { G.hud.notify('A mission is already running — finish it or fail it first.'); return; }
    const def = nextStoryMission(G);
    if (def) startMission(G, def);
    else G.hud.notify('No jobs open — take a district job (R) or finish THE FLOOD.');
  } else if (k === 'u') openPhone(G);
  else if (k === 'v') G.audio.cycleStation(G);
  else if (k === 'n') { G.camMode = (G.camMode + 1) % 3; }
  else if (k === 'e') {
    if (G.player.car) exitCar(G);
    else {
      const car = nearestCar(G, 6);
      if (car) enterCar(G, car);
      else G.hud.notify('No car close enough — F steals one.');
    }
  } else if (k === 'f') stealCar(G);
  else if (k === 'b') {
    const P = G.player;
    if (Math.hypot(P.x - G.gunShopPos.x, P.z - G.gunShopPos.z) < 20) openShop(G, 'gun');
    else if (Math.hypot(P.x, P.z) < 45) openShop(G, 'food');
    else openShop(G, 'clothes');
  } else if (k === 'g') {
    const P = G.player;
    if (Math.hypot(P.x - G.garagePos.x, P.z - G.garagePos.z) < 16) openGarage(G);
    else G.hud.notify('Delta Customs is at the south-east market corner (80, 80).');
  } else if (k === 'h') {
    writeSlot(G.selectedSlot, serialize(G));
    G.hud.notify(`Saved to slot ${G.selectedSlot + 1} — ${completionPct(G)}% complete.`);
  } else if (k === 'r') contextAction(G);
  else if (k === 'z') useAbility(G, 0);
  else if (k === 'x') useAbility(G, 1);
  else if (k === 'c') useAbility(G, 2);
  else if (k === 'j') shoot(G);
  else if (['1', '2', '3', '4'].includes(k)) switchWeapon(G, Number(k) - 1);
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('mousedown', (e) => {
  if (G.mode === 'play' && e.target.id === 'game') shoot(G);
});
addEventListener('resize', () => {
  G.camera.aspect = innerWidth / innerHeight;
  G.camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function contextAction(G) {
  const P = G.player;
  // Race first: near a race start, in a car.
  if (P.car) {
    for (const r of RACES) {
      if (Math.hypot(P.x - r.x, P.z - r.z) < 14) { startRace(G, r.id); return; }
    }
    // Export: at the south dock with a listed car.
    if (Math.hypot(P.x - 175, P.z - 60) < 16) { exportCar(G); return; }
    startTaxi(G);
    return;
  }
  // On foot: district job near a district centre, else a holdup in the market.
  for (const d of G.districts) {
    if (Math.hypot(P.x - d.cx, P.z - d.cz) < 16) { districtJob(G, d.id); return; }
  }
  holdup(G);
}

function readInput() {
  return {
    forward: keys.KeyW || keys.ArrowUp,
    back: keys.KeyS || keys.ArrowDown,
    left: keys.KeyA || keys.ArrowLeft,
    right: keys.KeyD || keys.ArrowRight,
    handbrake: keys.Space,
    run: keys.ShiftLeft || keys.ShiftRight,
  };
}

// --- Camera --------------------------------------------------------------
function updateCamera(G, dt) {
  const P = G.player;
  const cam = G.camera;
  if (G.shotCam) {
    cam.position.set(G.shotCam.x, G.shotCam.y, G.shotCam.z);
    cam.lookAt(G.shotCam.lookX, G.shotCam.lookY, G.shotCam.lookZ);
    return;
  }
  if (G.mode === 'title') {
    const a = G.elapsed * 0.03;
    cam.position.set(Math.sin(a) * 90, 26, Math.cos(a) * 90);
    cam.lookAt(0, 8, -20);
    return;
  }
  const dist = [11, 16, 8][G.camMode];
  const height = [4.5, 7, 12][G.camMode];
  const fx = Math.sin(P.camYaw), fz = Math.cos(P.camYaw);
  const tx = P.x, tz = P.z;
  const wantX = tx - fx * dist, wantZ = tz - fz * dist;
  cam.position.x += (wantX - cam.position.x) * Math.min(1, dt * 5);
  cam.position.y += (height - cam.position.y) * Math.min(1, dt * 5);
  cam.position.z += (wantZ - cam.position.z) * Math.min(1, dt * 5);
  cam.lookAt(tx + fx * 8, 2, tz + fz * 8);
  // Camera yaw follows the player's heading while driving.
  if (P.car) P.camYaw = P.heading;
}

// --- Main loop -----------------------------------------------------------
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  G.elapsed += dt;
  const P = G.player;
  if (G.mode === 'play') {
    G.timeMin += dt * 0.5;
    // Rain builds through the night; the finale is a full storm.
    const target = G.mission && G.mission.def.finale ? 1 : 0.55 + 0.25 * Math.sin(G.elapsed * 0.01);
    G.rain += (target - G.rain) * dt * 0.05;
    const input = readInput();
    // On foot, A/D turn the camera; in a car they steer.
    if (!P.car) {
      if (input.left) P.camYaw += 2.4 * dt;
      if (input.right) P.camYaw -= 2.4 * dt;
    }
    G.speedKmh = updatePlayer(G, dt, input);
    updateTraffic(G, dt);
    updatePolice(G, dt);
    updateMission(G, dt);
    updateEnemies(G, dt);
    updateCollectibles(G, dt);
    updateSide(G, dt);
    updateDistricts(G, dt);
    G.currentDistrict = districtAt(G, P.x, P.z);
    P.maxWanted = Math.max(P.maxWanted, P.stars);
    // Busted: a cop car sits on an on-foot player with heat.
    if (!P.car && P.stars > 0) {
      let close = false;
      for (const u of G.police.units) {
        if (u.car && Math.hypot(u.car.x - P.x, u.car.z - P.z) < 3) close = true;
      }
      G.bustedT = close ? G.bustedT + dt : 0;
      if (G.bustedT > 2) { G.bustedT = 0; busted(); }
    } else G.bustedT = 0;
    if (G.audio) G.audio.tick(G, dt);
  }
  if (G.mode === 'title' || G.mode === 'play') {
    // Rain and night keep moving behind every screen.
    updateCity(G, dt);
  }
  updateCamera(G, dt);
  refreshHud(G);
  renderer.render(G.scene, G.camera);
  if (!G.ready) { G.ready = true; window.__VESPER_READY__ = true; }
}

if (shotName) {
  applyShot(G, shotName);
  // Shot scenes render immediately: no title wait. The stats shot keeps
  // its own mode (the panel is the subject).
  if (shotName !== 'title' && G.mode === 'title') {
    $('overlay').classList.add('hidden');
    G.mode = 'play';
  }
}
frame();

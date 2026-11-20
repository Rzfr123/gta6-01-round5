// Screenshot staging: ?shot=title|chase|shootout|stats drops the player into
// a real running scene so the screenshots are honest renders, not mockups.
// Each stage sets a fixed camera preset the main loop holds while the shot
// parameter is present.
import { makeCar } from './vehicles.js';
import { setWanted } from './police.js';
import { startMission, MISSIONS, spawnEnemies } from './missions.js';
import { openStats } from './hud.js';

export function applyShot(G, name) {
  G.shotMode = name;
  const P = G.player;
  if (name === 'title') {
    // Title screen over the night city: rain, market neon, hero tower.
    P.x = 0; P.z = 60; P.heading = Math.PI;
    P.camYaw = Math.PI;
    G.mode = 'title';
    G.shotCam = { x: 26, y: 14, z: 96, lookX: 0, lookY: 6, lookZ: 0 };
    return;
  }
  // All play shots hide the title overlay.
  document.getElementById('overlay').classList.add('hidden');
  G.mode = 'play';
  if (name === 'chase') {
    // Night rain chase on the levee road: June in a Vesper GT, 3 stars,
    // two VPD units closing in, rain at full strength.
    const car = makeCar(G, 'gt', 0x00e5ff, { x: 0, z: -160, kind: 'player', heading: Math.PI / 2 });
    car.speed = 24; // ~86 KM/H
    car.engineLv = 2;
    G.cars.push(car);
    P.car = car; car.driver = 'player'; P.onFoot = false;
    P.x = car.x; P.z = car.z; P.heading = car.heading; P.camYaw = car.heading;
    G.rain = 1;
    setWanted(G, 3);
    G.shotCam = { x: -24, y: 7, z: -136, lookX: 8, lookY: 2, lookZ: -160 };
    if (G.hud) G.hud.notify('Vesper Delta — outrun the VPD on the levee road.');
  } else if (name === 'shootout') {
    // On foot in the Night Market at night, mid-takeover: enforcers ahead,
    // June's dialogue up, stalls glowing.
    P.car = null; P.onFoot = true;
    P.x = 0; P.z = 40; P.heading = Math.PI; P.camYaw = Math.PI;
    P.group.position.set(P.x, 0, P.z);
    P.weapons[1].ammo = 120;
    P.weaponIdx = 1;
    startMission(G, MISSIONS[7]); // Market Crown
    // Fast-forward past the goto stage so the shootout is live.
    G.mission.stageIdx = 1;
    spawnEnemies(G, 5, 0, 0);
    G.mission.enemiesSpawned = true;
    G.mission.kills = 0;
    setWanted(G, 2);
    G.shotCam = { x: -10, y: 6, z: 56, lookX: 0, lookY: 2, lookZ: 20 };
    if (G.hud) G.hud.showDialogue('June', 'The market is the heart of Vesper. Take it — and the city listens.');
  } else if (name === 'stats') {
    // Stats screen over a live city: districts part-won, medals earned.
    G.districts.find((d) => d.id === 'port').standing = 100;
    G.districts.find((d) => d.id === 'market').standing = 80;
    G.districts.find((d) => d.id === 'stilt').standing = 100;
    G.missionsDone = ['m1', 'm2', 'm3', 'm4', 'm5', 'm7'];
    G.medals = { m1: 'gold', m2: 'silver', m3: 'gold', m4: 'bronze', m5: 'silver', m7: 'gold' };
    G.heronsFound = 9;
    G.racesWon = 2;
    G.jumpsDone = 3;
    G.exportsDone = 1;
    P.cash = 2400;
    P.rp = 2450;
    P.rankIdx = 2;
    P.x = 0; P.z = 60; P.heading = Math.PI;
    G.shotCam = { x: 26, y: 14, z: 96, lookX: 0, lookY: 6, lookZ: 0 };
    openStats(G, 'MAP');
  }
}

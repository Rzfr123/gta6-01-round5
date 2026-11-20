// Territory control: 7 districts, standing HOSTILE → WARY → NEUTRAL →
// FRIENDLY → YOURS. Jobs raise standing; FRIENDLY unlocks a takeover;
// taking a district flips it YOURS and pays hourly income.
import { DISTRICTS, standingState } from './city.js';
import { addRp } from './player.js';

export function initDistricts(G) {
  G.districts = DISTRICTS.map((d) => ({ ...d }));
  G.districtIncomeAcc = 0;
}

export function districtById(G, id) { return G.districts.find((d) => d.id === id); }
export function districtStanding(G, id) {
  const d = districtById(G, id);
  return d ? d.standing : 50;
}

export function addStanding(G, id, n) {
  const d = districtById(G, id);
  if (!d) return;
  const before = standingState(d.standing);
  d.standing = Math.max(0, Math.min(100, d.standing + n));
  const after = standingState(d.standing);
  if (after !== before && G.hud) {
    G.hud.notify(`${d.name}: ${before} → ${after} (${d.standing})`);
    if (after === 'FRIENDLY') G.hud.notify(`Takeover unlocked in ${d.name} — check the phone (U).`);
  }
}

export function takeoverComplete(G, id) {
  const d = districtById(G, id);
  if (!d || d.standing >= 100) return;
  d.standing = 100;
  if (G.hud) G.hud.notify(`${d.name} is YOURS now. ${d.perk}`);
  if (G.audio) G.audio.sfx('takeover');
  addRp(G, 150);
  const yours = G.districts.filter((x) => x.standing >= 100).length;
  if (yours >= 7 && G.mission) {
    if (G.hud) G.hud.notify('All seven districts are yours — THE FLOOD is open.');
  }
}

export function districtJob(G, id) {
  const d = districtById(G, id);
  if (!d) return false;
  if (d.standing >= 100) { if (G.hud) G.hud.notify(`${d.name} is already yours — no job left here.`); return false; }
  const jobs = [
    { text: `Collect the night's take from three stalls in ${d.name}.`, pay: 120 },
    { text: `Lean on a fence in ${d.name} — make him talk, then walk away.`, pay: 100 },
    { text: `Run a parcel across ${d.name} before the rain washes the trail.`, pay: 140 },
    { text: `Watch the corner in ${d.name} while the crew moves product.`, pay: 110 },
  ];
  const job = jobs[Math.floor(Math.random() * jobs.length)];
  // A job is a short mission: go to the district centre, then back to the safehouse.
  if (G.mission && G.mission.def && G.mission.def.id === `job-${id}`) return false;
  const def = {
    id: `job-${id}`, act: 0, title: `District job — ${d.name}`,
    district: id, side: true, pay: job.pay, par: 75,
    stages: [
      { text: job.text, hint: 'Drive to the marker.', type: 'goto', x: d.cx, z: d.cz, r: 12 },
      { text: 'Job done — get back to the safehouse to bank it.', hint: 'Safehouse is on Stilt Row edge.', type: 'goto', x: G.safehouse.x, z: G.safehouse.z, r: 10 },
    ],
  };
  if (G.startMission) G.startMission(G, def);
  return true;
}

export function updateDistricts(G, dt) {
  // Hourly income from YOURS districts, paid as game time passes.
  const yours = G.districts.filter((d) => d.standing >= 100);
  if (!yours.length) return;
  const perSec = yours.reduce((s, d) => s + d.income, 0) / 3600 * 60; // 1 game hour = 60 real seconds
  G.districtIncomeAcc += perSec * dt;
  if (G.districtIncomeAcc >= 10) {
    const pay = Math.floor(G.districtIncomeAcc);
    G.districtIncomeAcc -= pay;
    G.player.cash += pay;
  }
}

export function completionPct(G) {
  let total = 0, done = 0;
  total += 12;
  done += (G.missionsDone || []).length;
  total += 7; done += G.districts.filter((d) => d.standing >= 100).length;
  total += 20; done += G.heronsFound || 0;
  total += 4; done += G.racesWon || 0;
  total += 8; done += G.jumpsDone || 0;
  total += 5; done += G.exportsDone || 0;
  return Math.round((done / total) * 100);
}

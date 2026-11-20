// Saves: three localStorage slots, each carrying act, missions, %,
// cash and clock so the title screen can show them.
const KEY = 'vesper-delta-saves-v1';

export function readSlots() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [null, null, null];
    const arr = JSON.parse(raw);
    return [arr[0] ?? null, arr[1] ?? null, arr[2] ?? null];
  } catch { return [null, null, null]; }
}

export function writeSlot(i, data) {
  const slots = readSlots();
  slots[i] = data;
  localStorage.setItem(KEY, JSON.stringify(slots));
}

export function serialize(G) {
  const P = G.player;
  return {
    v: 1,
    cash: P.cash, rp: P.rp, rankIdx: P.rankIdx,
    x: P.x, z: P.z, heading: P.heading,
    health: P.health, armor: P.armor,
    weapons: P.weapons.map((w) => ({ name: w.name, ammo: w.ammo })),
    weaponIdx: P.weaponIdx,
    timeMin: G.timeMin, rain: G.rain,
    districts: G.districts.map((d) => ({ id: d.id, standing: d.standing })),
    missionsDone: G.missionsDone || [],
    medals: G.medals || {},
    heronsFound: G.heronsFound || 0,
    heronsTaken: G.heronsTaken || [],
    racesWon: G.racesWon || 0,
    jumpsDone: G.jumpsDone || 0,
    jumpIds: (G.jumpList || []).filter((j) => j.done).map((j) => j.id),
    exportsDone: G.exportsDone || 0,
    exportModels: (G.exportList || []).filter((e) => e.done).map((e) => e.model),
    kills: P.kills,
    savedAt: new Date().toISOString(),
  };
}

export function actOf(G) {
  const done = (G.missionsDone || []).length;
  if (done >= 8) return 3;
  if (done >= 4) return 2;
  return 1;
}

export function slotSummary(data) {
  if (!data) return null;
  const done = (data.missionsDone || []).length;
  const act = done >= 8 ? 3 : done >= 4 ? 2 : 1;
  const pct = Math.round(((done + (data.districts || []).filter((d) => d.standing >= 100).length + (data.heronsFound || 0)) / 39) * 100);
  const clock = `Day 1 ${String(Math.floor(18 + (data.timeMin || 0) / 60) % 24).padStart(2, '0')}:${String(Math.floor((data.timeMin || 0) % 60)).padStart(2, '0')}`;
  return { act, missions: done, pct, cash: data.cash, time: clock };
}

export function applySave(G, data) {
  const P = G.player;
  P.cash = data.cash ?? 600;
  P.rp = data.rp ?? 0;
  P.rankIdx = data.rankIdx ?? 0;
  P.x = data.x ?? 0; P.z = data.z ?? 0; P.heading = data.heading ?? 0;
  P.health = data.health ?? 100;
  P.armor = data.armor ?? 0;
  if (data.weapons) for (const w of data.weapons) {
    const slot = P.weapons.find((x) => x.name === w.name);
    if (slot) slot.ammo = w.ammo;
  }
  P.weaponIdx = data.weaponIdx ?? 0;
  G.timeMin = data.timeMin ?? 200;
  G.rain = data.rain ?? 0.6;
  if (data.districts) for (const d of data.districts) {
    const t = G.districts.find((x) => x.id === d.id);
    if (t) t.standing = d.standing;
  }
  G.missionsDone = data.missionsDone || [];
  G.medals = data.medals || {};
  G.heronsFound = data.heronsFound || 0;
  G.heronsTaken = data.heronsTaken || [];
  G.racesWon = data.racesWon || 0;
  G.jumpsDone = data.jumpsDone || 0;
  if (data.jumpIds) for (const id of data.jumpIds) {
    const j = (G.jumpList || []).find((x) => x.id === id);
    if (j) j.done = true;
  }
  G.exportsDone = data.exportsDone || 0;
  if (data.exportModels) for (const m of data.exportModels) {
    const e = (G.exportList || []).find((x) => x.model === m);
    if (e) e.done = true;
  }
  P.kills = data.kills || 0;
  P.group.position.set(P.x, 0, P.z);
}

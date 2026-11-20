// HUD: every panel the rank-1 pattern needs — mission stage, VPD response,
// district standing, minimap, crew cards, dialogue, phone, shops, garage,
// and the pause/stats screen with tabs, medals and a full map.
import { RANKS, rpProgress } from './player.js';
import { standingState, standingColor } from './city.js';
import { MISSIONS } from './missions.js';
import { RACES, JUMPS, EXPORTS } from './side.js';
import { drawPortrait, CREW_DEFS } from './crew.js';
import { completionPct } from './districts.js';
import { readSlots, slotSummary } from './save.js';
import { STATIONS } from './audio.js';

const $ = (id) => document.getElementById(id);

export function initHud(G) {
  const hud = {
    toastAt: 0,
    notify(msg) {
      const t = $('toast');
      t.textContent = msg;
      t.style.opacity = '1';
      this.toastAt = G.elapsed;
      const st = $('status');
      if (st) st.textContent = msg;
    },
    showDialogue(name, line) {
      const def = CREW_DEFS.find((c) => c.name.split(' ')[0] === name) || CREW_DEFS[0];
      const portraitDef = name === 'June' ? { ...CREW_DEFS[0], skin: 0xc89878, hair: 0x1a1210, shirt: 0x2a4a6a, bg: 0x0a1a2a } : def;
      drawPortrait($('dlgPortrait'), portraitDef);
      $('dlgName').textContent = name;
      $('dlgText').textContent = line;
      $('dialogue').classList.remove('hidden');
      setTimeout(() => $('dialogue').classList.add('hidden'), 10000);
    },
  };
  G.hud = hud;
  buildCrewCards(G);
  $('phoneClose').onclick = () => { $('phone').classList.add('hidden'); G.mode = 'play'; };
  $('shopClose').onclick = () => { $('shop').classList.add('hidden'); G.mode = 'play'; };
  $('garageClose').onclick = () => { $('garage').classList.add('hidden'); G.mode = 'play'; };
  $('statsClose').onclick = () => { closeStats(G); };
  $('bigBtn').onclick = () => { $('bigmsg').style.display = 'none'; G.mode = 'play'; };
  return hud;
}

function buildCrewCards(G) {
  const bar = $('crewBar');
  bar.innerHTML = '';
  G.crew.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'crewCard';
    card.id = `crew-${i}`;
    const cv = document.createElement('canvas');
    cv.width = 44; cv.height = 44;
    drawPortrait(cv, c);
    card.appendChild(cv);
    const info = document.createElement('div');
    info.innerHTML = `<span class="cname">${c.name}</span> · ${c.role}<br><span class="cabil">[${c.key}] ${c.ability}</span><br><span class="ccd"></span>`;
    card.appendChild(info);
    bar.appendChild(card);
  });
}

export function openPhone(G) {
  const list = $('phoneList');
  list.innerHTML = '';
  const next = G.nextStoryMission ? G.nextStoryMission(G) : null;
  const add = (who, text, cls) => {
    const d = document.createElement('div');
    d.className = 'post';
    d.innerHTML = `<span class="who">${who}</span> <span class="${cls || ''}">${text}</span>`;
    list.appendChild(d);
  };
  add('June Calloway', next ? `Next job: <b>${next.title}</b> (Act ${next.act}) — press M to start.` : 'No jobs open right now. Take a district job (R) or finish THE FLOOD.');
  for (const def of MISSIONS) {
    const done = (G.missionsDone || []).includes(def.id);
    const medal = (G.medals || {})[def.id];
    let lock = '';
    if (!done && def.takeover) {
      const d = G.districts.find((x) => x.id === def.takeover);
      if (d && d.standing < 80) lock = ` — locked until ${d.name} is FRIENDLY (${d.standing}/80)`;
    }
    if (!done && def.finale) {
      const yours = G.districts.filter((x) => x.standing >= 100).length;
      if (yours < 7) lock = ` — locked until all 7 districts are YOURS (${yours}/7)`;
    }
    add(def.title, done ? `done — ${medal ? medal.toUpperCase() + ' medal' : ''}` : `Act ${def.act} · $${def.pay}${lock}`, done ? 'done' : lock ? 'locked' : '');
  }
  add('District jobs', 'Press R near a district centre to work it (+8 standing, +pay). FRIENDLY (80) unlocks its takeover.');
  $('phone').classList.remove('hidden');
  G.mode = 'phone';
}

export function openShop(G, kind) {
  const P = G.player;
  const items = [];
  if (kind === 'gun') {
    $('shopTitle').textContent = '🔫 Harbor Arms';
    $('shopSub').textContent = 'Ammo and armour for the night.';
    items.push(
      { name: 'SMG ammo +60', price: 120, run: () => { P.weapons[1].ammo += 60; } },
      { name: 'Shotgun shells +12', price: 100, run: () => { P.weapons[2].ammo += 12; } },
      { name: 'Rifle rounds +30', price: 150, run: () => { P.weapons[3].ammo += 30; } },
      { name: 'Body armour (100)', price: 200, run: () => { P.armor = 100; } },
    );
  } else if (kind === 'food') {
    $('shopTitle').textContent = '🍜 Night Market Food';
    $('shopSub').textContent = 'Hot food, hot rain.';
    items.push(
      { name: 'Noodle bowl (+40 health)', price: 40, run: () => { P.health = Math.min(100, P.health + 40); } },
      { name: 'Full spread (+100 health)', price: 90, run: () => { P.health = 100; } },
    );
  } else {
    $('shopTitle').textContent = '🧥 Delta Threads';
    $('shopSub').textContent = 'Look the part.';
    items.push(
      { name: 'Rain coat (armour +25)', price: 80, run: () => { P.armor = Math.min(100, P.armor + 25); } },
      { name: 'Fixer suit (armour +50)', price: 160, run: () => { P.armor = Math.min(100, P.armor + 50); } },
    );
  }
  const box = $('shopItems');
  box.innerHTML = '';
  for (const it of items) {
    const b = document.createElement('button');
    b.textContent = `${it.name} — $${it.price}`;
    b.onclick = () => {
      if (P.cash < it.price) { G.hud.notify('Not enough cash.'); return; }
      P.cash -= it.price;
      it.run();
      G.hud.notify(`Bought: ${it.name}`);
      if (G.audio) G.audio.sfx('pickup');
    };
    box.appendChild(b);
  }
  $('shop').classList.remove('hidden');
  G.mode = 'shop';
}

export function openGarage(G) {
  const P = G.player;
  if (!P.car) { G.hud.notify('Drive a car into Delta Customs first.'); return; }
  const box = $('garageItems');
  box.innerHTML = '';
  const car = P.car;
  const items = [
    { name: `Engine Lv ${car.engineLv + 1}`, price: 500 * (car.engineLv + 1), maxed: car.engineLv >= 3, run: () => { car.engineLv += 1; } },
    { name: `Armour Lv ${car.armorLv + 1}`, price: 400 * (car.armorLv + 1), maxed: car.armorLv >= 3, run: () => { car.armorLv += 1; car.damage = Math.max(0, car.damage - 30); } },
    { name: 'Underglow (neon)', price: 250, maxed: !!car.underglow, run: () => { car.underglow = true; } },
  ];
  for (const it of items) {
    const b = document.createElement('button');
    b.textContent = it.maxed ? `${it.name} — MAXED` : `${it.name} — $${it.price}`;
    b.disabled = it.maxed;
    b.onclick = () => {
      if (P.cash < it.price) { G.hud.notify('Not enough cash.'); return; }
      P.cash -= it.price;
      it.run();
      G.hud.notify(`Installed: ${it.name}`);
      if (G.audio) G.audio.sfx('pickup');
      openGarage(G);
    };
    box.appendChild(b);
  }
  $('garage').classList.remove('hidden');
  G.mode = 'garage';
}

function drawDonut(canvas, pct) {
  const g = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  g.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, r = 52;
  g.lineWidth = 16;
  g.strokeStyle = 'rgba(255,255,255,.15)';
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#4db8ff';
  g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (pct / 100) * Math.PI * 2); g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(`${pct}%`, cx, cy);
}

function drawStatsMap(G, canvas) {
  const g = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  g.fillStyle = '#0a1220'; g.fillRect(0, 0, w, h);
  const sx = (x) => ((x + 220) / 440) * w;
  const sz = (z) => ((z + 220) / 440) * h;
  // River.
  g.fillStyle = '#0a2a44'; g.fillRect(0, 0, w, sz(-185));
  // Roads.
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1;
  for (let i = -5; i <= 5; i++) {
    g.beginPath(); g.moveTo(sx(i * 40), 0); g.lineTo(sx(i * 40), h); g.stroke();
    g.beginPath(); g.moveTo(0, sz(i * 40)); g.lineTo(w, sz(i * 40)); g.stroke();
  }
  // Districts coloured by standing.
  for (const d of G.districts) {
    g.fillStyle = `#${standingColor(d.standing).toString(16).padStart(6, '0')}`;
    g.globalAlpha = 0.55;
    g.beginPath(); g.arc(sx(d.cx), sz(d.cz), 26, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    g.fillStyle = '#fff'; g.font = '11px sans-serif'; g.textAlign = 'center';
    g.fillText(d.name, sx(d.cx), sz(d.cz) - 30);
    g.fillText(`${standingState(d.standing)} · ${d.standing}`, sx(d.cx), sz(d.cz) + 34);
  }
  // Player + mission marker.
  g.fillStyle = '#ffd23e';
  g.beginPath(); g.arc(sx(G.player.x), sz(G.player.z), 5, 0, Math.PI * 2); g.fill();
  if (G.mission) {
    const st = G.mission.def.stages[G.mission.stageIdx];
    if (st.x !== undefined) {
      g.fillStyle = '#ff5a5a';
      g.beginPath(); g.arc(sx(st.x), sz(st.z), 6, 0, Math.PI * 2); g.fill();
    }
  }
}

export function openStats(G, tab = 'MAP') {
  G.statsTab = tab;
  const tabs = ['MAP', 'STORY', 'STATS', 'CREW', 'SETTINGS', 'CONTROLS', 'SAVE'];
  const bar = $('statsTabs');
  bar.innerHTML = '';
  for (const t of tabs) {
    const b = document.createElement('button');
    b.textContent = t;
    if (t === tab) b.className = 'on';
    b.onclick = () => openStats(G, t);
    bar.appendChild(b);
  }
  const body = $('statsTabBody');
  const P = G.player;
  if (tab === 'MAP') {
    body.innerHTML = '<canvas id="statsMap" width="780" height="380" style="width:100%;border-radius:8px"></canvas><p>District colours: red HOSTILE, orange WARY, yellow NEUTRAL, green FRIENDLY, bright green YOURS. Gold dot is you; red dot is the mission target.</p>';
    drawStatsMap(G, $('statsMap'));
  } else if (tab === 'STORY') {
    let html = '';
    for (const def of MISSIONS) {
      const done = (G.missionsDone || []).includes(def.id);
      const medal = (G.medals || {})[def.id];
      html += `<div class="row"><span>Act ${def.act} — ${def.title}</span><span>${done ? `<span class="medal ${medal}">${medal ? medal.toUpperCase() : ''} ✓</span>` : '—'}</span></div>`;
    }
    body.innerHTML = html;
  } else if (tab === 'STATS') {
    const pct = completionPct(G);
    body.innerHTML = `<canvas id="donut" width="140" height="140"></canvas><p>Completion</p>
      <div class="row"><span>Cash</span><span>$${P.cash}</span></div>
      <div class="row"><span>Rank</span><span>${RANKS[P.rankIdx]} · ${P.rp} RP</span></div>
      <div class="row"><span>Missions done</span><span>${(G.missionsDone || []).length}/12</span></div>
      <div class="row"><span>Districts yours</span><span>${G.districts.filter((d) => d.standing >= 100).length}/7</span></div>
      <div class="row"><span>Brass Herons</span><span>${G.heronsFound || 0}/20</span><div class="prog"><i style="width:${((G.heronsFound || 0) / 20) * 100}%"></i></div></div>
      <div class="row"><span>Races won</span><span>${G.racesWon || 0}/4</span></div>
      <div class="row"><span>Stunt jumps</span><span>${G.jumpsDone || 0}/8</span></div>
      <div class="row"><span>Exports</span><span>${G.exportsDone || 0}/5</span></div>
      <div class="row"><span>Targets down</span><span>${P.kills}</span></div>
      <div class="row"><span>Time</span><span>${clockText(G)}</span></div>`;
    drawDonut($('donut'), pct);
  } else if (tab === 'CREW') {
    let html = '';
    for (const c of G.crew) {
      html += `<div class="row"><span><b>${c.name}</b> · ${c.role} — [${c.key}] ${c.ability}</span><span>${c.desc}</span></div>`;
    }
    html += `<p>Crew perks unlock when their home district is YOURS. Ezra: Foundry. Pip: Stilt Row. Wren: Downtown.</p>`;
    body.innerHTML = html;
  } else if (tab === 'SETTINGS') {
    body.innerHTML = `<div class="row"><span>Rain intensity</span><span>${Math.round(G.rain * 100)}% (auto — storms build toward THE FLOOD)</span></div>
      <div class="row"><span>Radio</span><span>${STATIONS[G.audio.station].name} — V cycles</span></div>
      <div class="row"><span>Sound</span><span>${G.audio.muted ? 'Muted (click to unmute)' : 'On'}</span></div>
      <button id="muteBtn" style="width:auto;padding:8px 16px">${G.audio.muted ? 'Unmute' : 'Mute'}</button>`;
    $('muteBtn').onclick = () => { G.audio.muted = !G.audio.muted; openStats(G, 'SETTINGS'); };
  } else if (tab === 'CONTROLS') {
    body.innerHTML = `<div class="row"><span>WASD</span><span>Move / drive</span></div>
      <div class="row"><span>E / F</span><span>Enter car / steal car</span></div>
      <div class="row"><span>SPACE</span><span>Handbrake</span></div>
      <div class="row"><span>CLICK / 1–4</span><span>Shoot / switch weapon</span></div>
      <div class="row"><span>Z / X / C</span><span>Crew abilities: Hot Swap / Field Fix / Eyes Up</span></div>
      <div class="row"><span>M / U / P</span><span>Start mission / phone / pause & stats</span></div>
      <div class="row"><span>V / B / G / H / R</span><span>Radio / shop / garage / save / job-race-holdup</span></div>
      <div class="row"><span>N</span><span>Camera angle</span></div>`;
  } else if (tab === 'SAVE') {
    let html = '';
    const slots = readSlots();
    slots.forEach((s, i) => {
      const sum = slotSummary(s);
      html += `<div class="row"><span>Slot ${i + 1}</span><span>${sum ? `Act ${sum.act} · ${sum.missions}/12 · ${sum.pct}% · $${sum.cash} · ${sum.time}` : 'empty'}</span></div>`;
    });
    html += `<p>Press H anywhere near the safehouse to save. Choose a slot on the title screen.</p>`;
    body.innerHTML = html;
  }
  $('statsSub').textContent = `June Calloway · ${RANKS[P.rankIdx]} · $${P.cash} · ${clockText(G)}`;
  $('stats').classList.remove('hidden');
  G.mode = 'stats';
}

export function closeStats(G) {
  $('stats').classList.add('hidden');
  if (G.mode === 'stats') G.mode = 'play';
}

export function clockText(G) {
  const total = 18 * 60 + G.timeMin;
  const hh = Math.floor(total / 60) % 24, mm = Math.floor(total % 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function refreshHud(G) {
  const P = G.player;
  document.body.classList.toggle('title-mode', G.mode === 'title');
  $('cash').textContent = `$${P.cash}`;
  const rainWord = G.rain > 0.8 ? 'STORM' : G.rain > 0.45 ? 'RAIN' : 'DRIZZLE';
  $('clockLine').textContent = `${clockText(G)} · ${rainWord} ${Math.round(G.rain * 100)}%`;
  $('hpFill').style.width = `${P.health}%`;
  $('hpNum').textContent = Math.round(P.health);
  $('arFill').style.width = `${P.armor}%`;
  $('arNum').textContent = Math.round(P.armor);
  // Weapon slots.
  const wbox = $('weapons');
  if (wbox.childElementCount !== P.weapons.length) {
    wbox.innerHTML = P.weapons.map((w, i) => `<span class="slot" data-i="${i}">${i + 1} ${w.name} · ${w.ammo === Infinity ? '∞' : w.ammo}</span>`).join('');
  } else {
    [...wbox.children].forEach((el, i) => {
      const w = P.weapons[i];
      el.textContent = `${i + 1} ${w.name} · ${w.ammo === Infinity ? '∞' : w.ammo}`;
      el.classList.toggle('on', i === P.weaponIdx);
    });
  }
  // Stars + rank.
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < P.stars ? '★' : '<span class="off">★</span>';
  $('starRow').innerHTML = stars;
  const rp = rpProgress(P);
  $('rankLine').innerHTML = `${RANKS[P.rankIdx]} · <span class="bar"><i id="rpFill" style="width:${Math.round(rp.pct * 100)}%"></i></span> <span>${P.rp} RP</span>`;
  // District.
  const d = G.currentDistrict;
  if (d) {
    $('dName').textContent = d.name;
    $('dStand').textContent = `${standingState(d.standing)} · ${d.standing}`;
    $('stFill').style.width = `${d.standing}%`;
    $('stFill').style.background = `#${standingColor(d.standing).toString(16).padStart(6, '0')}`;
  }
  // Objective panel.
  const m = G.mission;
  if (m) {
    $('objective').classList.remove('hidden');
    $('objTitle').textContent = `${m.def.title} — STAGE ${m.stageIdx + 1}/${m.def.stages.length}`;
    $('objText').textContent = m.def.stages[m.stageIdx].text;
    $('objNext').textContent = `NEXT: ${m.def.stages[m.stageIdx].hint}`;
  } else {
    $('objective').classList.add('hidden');
  }
  // VPD panel.
  const vpd = $('vpd');
  if (P.stars > 0 && G.police.units.length) {
    vpd.classList.remove('hidden');
    const rows = G.police.units.slice(0, 4).map((u) => {
      const dist = G.policeDist ? G.policeDist(u) : 0;
      return `<div class="unit"><span>${u.callsign}</span><span class="role">${u.role}</span><span>${dist}m</span></div>`;
    }).join('');
    $('vpdList').innerHTML = rows + `<div class="unit"><span>Air support</span><span class="role">${P.stars >= 3 ? 'HELI-1 AIR' : '—'}</span><span>${P.stars >= 3 ? 'overhead' : ''}</span></div>`;
  } else {
    vpd.classList.add('hidden');
  }
  // Speedo + radio.
  $('kmh').textContent = G.speedKmh || 0;
  $('carname').textContent = P.car ? `${P.car.spec.name} · damage ${Math.round(P.car.damage)}%` : 'On foot';
  $('radio').textContent = `♪ ${STATIONS[G.audio.station].name}`;
  // Crew cards cooldowns.
  G.crew.forEach((c, i) => {
    const card = $(`crew-${i}`);
    if (!card) return;
    const cd = card.querySelector('.ccd');
    const left = Math.max(0, c.readyIn - G.elapsed);
    cd.textContent = left > 0 ? `recharging ${Math.ceil(left)}s` : 'READY';
    card.classList.toggle('ready', left <= 0);
  });
  // Toast fade.
  if (G.elapsed - (G.hud?.toastAt || 0) > 4) $('toast').style.opacity = '0';
  drawMinimap(G);
}

export function drawMinimap(G) {
  const cv = $('minimap');
  const g = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#0a1220';
  g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); g.fill();
  const P = G.player;
  const range = 130; // world units shown across the circle
  const px = (x) => w / 2 + ((x - P.x) / range) * (w / 2);
  const pz = (z) => h / 2 + ((z - P.z) / range) * (h / 2);
  // River strip (z < -185 is water).
  const ry = pz(-185);
  if (ry > 0) { g.fillStyle = '#0a2a44'; g.fillRect(0, 0, w, Math.min(h, ry)); }
  // Roads.
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1;
  for (let i = -5; i <= 5; i++) {
    g.beginPath(); g.moveTo(px(i * 40), 0); g.lineTo(px(i * 40), h); g.stroke();
    g.beginPath(); g.moveTo(0, pz(i * 40)); g.lineTo(w, pz(i * 40)); g.stroke();
  }
  // Districts.
  for (const d of G.districts) {
    g.fillStyle = `#${standingColor(d.standing).toString(16).padStart(6, '0')}`;
    g.beginPath(); g.arc(px(d.cx), pz(d.cz), 5, 0, Math.PI * 2); g.fill();
  }
  // Herons (only with Eyes Up or close by).
  const eyes = G.elapsed < G.eyesUpUntil;
  for (const her of G.herons || []) {
    if (her.taken) continue;
    const d = Math.hypot(P.x - her.x, P.z - her.z);
    if (eyes || d < 40) {
      g.fillStyle = '#ffd23e';
      g.fillRect(px(her.x) - 2, pz(her.z) - 2, 4, 4);
    }
  }
  // Police (only with Eyes Up, or the nearest one always pings red).
  if (eyes) {
    for (const u of G.police.units) {
      if (!u.car) continue;
      g.fillStyle = '#ff4040';
      g.beginPath(); g.arc(px(u.car.x), pz(u.car.z), 4, 0, Math.PI * 2); g.fill();
    }
  }
  // Mission target.
  if (G.mission) {
    const st = G.mission.def.stages[G.mission.stageIdx];
    if (st.x !== undefined) {
      g.fillStyle = '#ff5a5a';
      g.beginPath(); g.arc(px(st.x), pz(st.z), 5, 0, Math.PI * 2); g.fill();
    }
  }
  // Safehouse.
  g.fillStyle = '#4db8ff';
  g.fillRect(px(G.safehouse.x) - 3, pz(G.safehouse.z) - 3, 6, 6);
  // North marker.
  g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center';
  g.fillText('N', w / 2, 16);
  // Player arrow.
  g.save();
  g.translate(w / 2, h / 2);
  g.rotate(P.heading);
  g.fillStyle = '#ffd23e';
  g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 6); g.lineTo(-6, 6); g.closePath(); g.fill();
  g.restore();
}

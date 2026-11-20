import { setWanted } from './police.js';

// The crew: three original people with callable abilities on Z / X / C.
// Portraits are drawn procedurally on small canvases — no copied art.
export const CREW_DEFS = [
  {
    id: 'ezra', name: 'Ezra Vann', role: 'Driver', key: 'Z',
    ability: 'HOT SWAP', desc: 'Swap plates — instantly drop 1 wanted star.',
    cooldown: 60, skin: 0xc89878, hair: 0x2a1a10, shirt: 0x8a2a2a, bg: 0x3a1a1a,
  },
  {
    id: 'pip', name: 'Pip Marlowe', role: 'Mechanic', key: 'X',
    ability: 'FIELD FIX', desc: 'Repair your car to full and restore armour.',
    cooldown: 45, skin: 0xe8b890, hair: 0xd08a2a, shirt: 0x2a5a3a, bg: 0x1a3a2a,
  },
  {
    id: 'wren', name: 'Wren Okafor', role: 'Lookout', key: 'C',
    ability: 'EYES UP', desc: 'Reveal all police units and targets on the minimap for 30s.',
    cooldown: 90, skin: 0x6a4028, hair: 0x0a0a0a, shirt: 0x2a3a6a, bg: 0x1a1a3a,
  },
];

function css(hex) { return `#${hex.toString(16).padStart(6, '0')}`; }

// A small original portrait: face, hair, shoulders — drawn, never an image.
export function drawPortrait(canvas, def) {
  const g = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  g.fillStyle = css(def.bg); g.fillRect(0, 0, w, h);
  // shoulders
  g.fillStyle = css(def.shirt);
  g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * 0.62); g.quadraticCurveTo(w / 2, h * 0.42, w, h * 0.62); g.lineTo(w, h); g.closePath(); g.fill();
  // face
  g.fillStyle = css(def.skin);
  g.beginPath(); g.ellipse(w / 2, h * 0.42, w * 0.26, h * 0.3, 0, 0, Math.PI * 2); g.fill();
  // hair
  g.fillStyle = css(def.hair);
  g.beginPath(); g.ellipse(w / 2, h * 0.2, w * 0.27, h * 0.16, 0, Math.PI, 0); g.fill();
  if (def.id === 'pip') { // headband
    g.fillStyle = '#ffd23e'; g.fillRect(w * 0.24, h * 0.26, w * 0.52, h * 0.05);
  }
  if (def.id === 'wren') { // lookout goggles on forehead
    g.fillStyle = '#111'; g.fillRect(w * 0.26, h * 0.14, w * 0.48, h * 0.07);
  }
  // eyes
  g.fillStyle = '#111';
  g.beginPath(); g.arc(w * 0.4, h * 0.42, w * 0.035, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(w * 0.6, h * 0.42, w * 0.035, 0, Math.PI * 2); g.fill();
  // mouth
  g.strokeStyle = '#5a2a1a'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(w * 0.44, h * 0.58); g.lineTo(w * 0.56, h * 0.58); g.stroke();
}

export function initCrew(G) {
  G.crew = CREW_DEFS.map((d) => ({ ...d, readyIn: 0, activeUntil: 0 }));
  G.eyesUpUntil = 0;
}

export function useAbility(G, idx) {
  const c = G.crew[idx];
  if (!c) return false;
  if (G.elapsed < c.readyIn) {
    if (G.hud) G.hud.notify(`${c.ability} recharging — ${Math.ceil(c.readyIn - G.elapsed)}s left.`);
    return false;
  }
  const P = G.player;
  let cd = c.cooldown;
  if (c.id === 'ezra') {
    if (P.stars <= 0) { if (G.hud) G.hud.notify('No heat to lose — Hot Swap waits.'); return false; }
    // Drop one star: heat falls by 20.
    P.heat = Math.max(0, P.heat - 20);
    const level = Math.ceil(P.heat / 20);
    setWanted(G, level);
    if (G.hud) G.hud.notify(`Ezra swapped the plates — wanted down to ${level} star${level === 1 ? '' : 's'}.`);
    if (G.districtStanding?.('foundry') >= 100) cd -= 15;
  } else if (c.id === 'pip') {
    if (P.car) { P.car.damage = 0; if (G.hud) G.hud.notify('Pip patched the car — good as new.'); }
    P.armor = 100;
    if (G.hud && !P.car) G.hud.notify('Pip topped up your armour.');
    if (G.districtStanding?.('stilt') >= 100) cd -= 10;
  } else if (c.id === 'wren') {
    G.eyesUpUntil = G.elapsed + 30;
    if (G.districtStanding?.('downtown') >= 100) G.eyesUpUntil += 15;
    if (G.hud) G.hud.notify('Wren is watching — police and targets on the minimap for 30s.');
  }
  c.readyIn = G.elapsed + cd;
  if (G.audio) G.audio.sfx('ability');
  return true;
}

export function crewReady(G, idx) { return G.elapsed >= G.crew[idx].readyIn; }

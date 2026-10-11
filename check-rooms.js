// Reachability checker for Dark Soon rooms.
// Usage: node check-rooms.js [path/to/index.html]
// Models where Isaac can stand, how far he can jump and safely fall, moving platforms, jam, swimming,
// the abilities (Umbrella glide, Slipper Boots wall jumps) and friends who open doors or swap keys
// for things you bring them. Enemies and timing are not modelled.
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(process.argv[2] || __dirname + '/index.html', 'utf8');
const a = src.indexOf('const T = 20'), b = src.indexOf('\n', src.indexOf('const isSolid'));
const ctx = { document: { getElementById: () => ({ getContext: () => ({}), getBoundingClientRect: () => ({ width: 1280 }) }) }, matchMedia: () => ({ matches: false }) };
vm.createContext(ctx);
vm.runInContext(src.slice(a, b) + '\nthis.out = { ROOMS, START, T, W, H, tileAt, SWITCH };', ctx);
const { ROOMS, START, T, W, H, tileAt: rawTile, SWITCH } = ctx.out;
let AB = {}; // what Isaac has so far; friends' little doors ('g') open once they've been given what they want
function tileAt(room, c, r) { const ch = rawTile(room, c, r); return ch === 'g' ? (AB['gave:' + room.gateBy] ? '.' : '#') : ch; }

const solidish = ch => '#><mij'.includes(ch);
const support = ch => '#><mij=~cb'.includes(ch);
const MAX_DROP = 8;
function stands(room) {
  const out = new Map(), add = (c, r, kind) => { if (c >= 0 && c < W && r >= 0 && r < H) out.set(c + ',' + r, kind || out.get(c + ',' + r) || 'n'); };
  for (let r = 0; r < H - 1; r++) for (let c = 0; c < W; c++) {
    const here = tileAt(room, c, r), above = tileAt(room, c, r - 1);
    if (solidish(here) || solidish(above) || here === '^' || above === '^' || here === 'v') continue;
    const under = tileAt(room, c, r + 1);
    if (support(under)) add(c, r, under === '~' ? 'bouncy' : under === 'j' ? 'jam' : 'n');
  }
  if (room.pool) for (let r = room.pool; r < H - 1; r++) for (let c = 0; c < W; c++) if (!solidish(tileAt(room, c, r))) out.set(c + ',' + r, 'swim');
  out.pool = room.pool;
  for (const m of room.movers || []) {
    if (m.axis === 'y') { for (let r = m.a; r <= m.b; r++) for (let c = m.c; c < m.c + m.w; c++) add(c, r - 1); }
    else if (m.axis === 'sink') { for (let r = m.r; r <= m.r + Math.floor(m.depth / 2); r++) for (let c = m.c; c < m.c + m.w; c++) add(c, r - 1); }
    else for (let c = m.a; c < m.b + m.w; c++) add(c, m.r - 1, m.bouncy ? 'bouncy' : undefined);
  }
  return out;
}
function canMove(from, to, kind, ab, S) {
  let [c, r] = from; const [c2, r2] = to, toKind = S.get(to.join(','));
  if (kind === 'swim' && toKind === 'swim') return true; // swim anywhere in the water
  if (kind === 'swim') { r = S.pool - 1; kind = 'leap'; } // leap out from the surface
  const dy = r2 - r, dx = Math.abs(c2 - c);
  if (toKind === 'swim') return dy >= 0 && dx <= 8;
  if (dy <= 0) {
    const up = -dy;
    if (kind === 'bouncy') return up <= 12 && dx <= 6;
    if (kind === 'jam') return up <= 1 && dx <= 2; // sticky feet: only a little hop
    if (kind === 'leap') return up <= 3 && dx <= 4;
    if (up > 4) return false;
    return dx <= (up >= 4 ? 3 : up === 3 ? 4 : 5);
  }
  const soft = S.get(to.join(',')) === 'bouncy';
  if (dy > MAX_DROP && !ab.umbrella && !soft) return false;
  return dx <= 5 + Math.floor(dy / 2) + (ab.umbrella ? dy * 2 : 0);
}
// Bean's Tongue (measured by simulating swings in the game): from a stand Isaac can grab a hook up to 9 rows above
// and 6 across; from a hook he can fling to stands from 1 row above it down to 10 rows below, up to 6 across at
// the hook's height and 11 across lower down; hooks within 10 columns and 5 rows of each other chain.
const canGrab = ([c, r], [hr, hc]) => { const dy = r - hr, dx = Math.abs(c - hc); return dy >= 1 && dy <= 9 && dx <= 6 && Math.hypot(dx, Math.max(0, dy - 4)) <= 6; };
const canFling = ([hr, hc], [c, r]) => { const dy = r - hr, dx = Math.abs(c - hc); return dy >= -1 && dy <= 10 && dx <= (dy <= 0 ? 6 : 11); };
const canChain = ([hr, hc], [hr2, hc2]) => Math.abs(hc - hc2) <= 10 && Math.abs(hr - hr2) <= 5;
function bfsRoom(room, starts, ab) {
  const S = stands(room), seen = new Set(), q = [...starts].filter(s => S.has(s));
  q.forEach(s => seen.add(s));
  const shaft = ab.boots && room.shaft;
  const hooks = ab.tongue ? (room.hooks || []).map(h => [(h.y - T / 2) / T, (h.x - T / 2) / T]) : [];
  seen.hooks = [];
  while (q.length) {
    const s = q.pop();
    if (s[0] === 'H') { // swinging from a hook
      const h = hooks[+s.slice(1)];
      for (const [t] of S) if (!seen.has(t) && canFling(h, t.split(',').map(Number))) { seen.add(t); q.push(t); }
      hooks.forEach((h2, j) => { if (!seen.hooks.includes(j) && canChain(h, h2)) { seen.hooks.push(j); q.push('H' + j); } });
      continue;
    }
    const [c, r] = s.split(',').map(Number);
    hooks.forEach((h, j) => { if (!seen.hooks.includes(j) && canGrab([c, r], h)) { seen.hooks.push(j); q.push('H' + j); } });
    for (const [t] of S) {
      if (seen.has(t)) continue;
      const [c2, r2] = t.split(',').map(Number);
      let ok = canMove([c, r], [c2, r2], S.get(s), ab, S);
      if (!ok && shaft && c >= shaft[0] && c <= shaft[1] && c2 >= shaft[0] && c2 <= shaft[1]) ok = true; // wall-jump up the shaft
      if (ok) { seen.add(t); q.push(t); }
    }
  }
  seen.hooks = seen.hooks.map(j => hooks[j]);
  return seen;
}
// The Clockwork Workshop: jump flips gravity, so Isaac walks the floor or the ceiling and falls between them.
function bfsFlip(room, starts) {
  const S = stands(room), hazard = ch => ch === '^' || ch === 'v';
  const ceil = (c, r) => r > 0 && r < H - 2 && solidish(tileAt(room, c, r - 1)) && !solidish(tileAt(room, c, r)) && !solidish(tileAt(room, c, r + 1)) && !hazard(tileAt(room, c, r)) && !hazard(tileAt(room, c, r + 1));
  const floor = (c, r) => S.has(c + ',' + r);
  const seen = new Set(), out = new Set(), q = [];
  const push = (c, r, up) => { const k = c + ',' + r + (up ? 'u' : ''); if (seen.has(k)) return; seen.add(k); q.push([c, r, up]); out.add(c + ',' + (up ? r + 1 : r)); };
  for (const s of starts) if (S.has(s)) { const [c, r] = s.split(',').map(Number); push(c, r, false); }
  const fall = (c0, r0, up) => { // drift up to two columns while falling
    for (let cc = c0 - 2; cc <= c0 + 2; cc++) {
      if (cc < 1 || cc > W - 2) continue;
      const path = [];
      for (let r = up ? r0 - 1 : r0 + 1; r > 0 && r < H - 1; r += up ? -1 : 1) {
        const ch = tileAt(room, cc, r);
        if (solidish(ch) || hazard(ch)) break;
        path.push(cc + ',' + r);
        if (up ? ceil(cc, r) : floor(cc, r)) { path.forEach(p => out.add(p)); push(cc, r, up); break; }
      }
    }
  };
  while (q.length) {
    const [c, r, up] = q.pop();
    for (const d of [-1, 1]) { // walk, or step off the edge
      const c2 = c + d;
      if (up ? ceil(c2, r) : floor(c2, r)) push(c2, r, up);
      else if (!solidish(tileAt(room, c2, r)) && !solidish(tileAt(room, c2, up ? r + 1 : r - 1))) fall(c2, r, up);
    }
    fall(c, r, !up); // flip
  }
  out.hooks = [];
  return out;
}
// Rooms with levers: whatever Isaac reaches with the blocks one way, he can stand on after throwing a lever the other way.
function bfsAny(room, starts, ab) {
  if (room.flipJump) return bfsFlip(room, starts);
  if (!room.swGroup) return bfsRoom(room, starts, ab);
  const g = room.swGroup, pts = new Set(starts), acc = new Set();
  let lever = false;
  for (let i = 0; i < 6; i++) {
    for (const state of lever ? [false, true] : [false]) {
      SWITCH[g] = state;
      const r = bfsRoom(room, [...pts], ab); r.forEach(x => { acc.add(x); pts.add(x); });
      if (room.levers.some(lv => thingReached(r, lv.y / T - 1, Math.floor(lv.x / T)))) lever = true;
    }
  }
  SWITCH[g] = false;
  acc.hooks = [];
  return acc;
}
function exitsReached(room, reach, ab) {
  const ex = room.exits || {}, out = [], list = [...reach].map(s => s.split(',').map(Number));
  const shut = side => !AB['gave:' + room.gateBy] && room.gateCells.some(([c]) => side === 'left' ? c <= 1 : c >= W - 2); // a closed door across the exit
  if (ex.left && !shut('left') && list.some(([c, r]) => c <= 1 && r >= ex.left[0] && r <= ex.left[1])) out.push('left');
  if (ex.right && !shut('right') && list.some(([c, r]) => c >= W - 2 && r >= ex.right[0] && r <= ex.right[1])) out.push('right');
  const shaftTop = ab.boots && room.shaft && list.some(([c]) => c >= room.shaft[0] && c <= room.shaft[1]);
  if (ex.top && (shaftTop || list.some(([c, r]) => r <= 4 && c >= ex.top[0] - 1 && c <= ex.top[1] + 1))) out.push('top');
  if (ex.bottom && list.some(([c, r]) => c >= ex.bottom[0] && c <= ex.bottom[1] && tileAt(room, c, r + 1) === '=')) out.push('bottom');
  return out;
}
function entryStands(room, side) {
  const ex = room.exits, S = stands(room), out = [];
  for (const [s] of S) {
    const [c, r] = s.split(',').map(Number);
    if (side === 'left' && c <= 1 && r >= ex.left[0] - 1 && r <= ex.left[1] + 1) out.push(s);
    if (side === 'right' && c >= W - 2 && r >= ex.right[0] - 1 && r <= ex.right[1] + 1) out.push(s);
    if (side === 'bottom' && c >= ex.bottom[0] && c <= ex.bottom[1] && r >= 12) out.push(s);
  }
  if (side === 'left' || side === 'right') { const c = side === 'left' ? 1 : W - 2; for (let r = ex[side][1]; r < H; r++) if (S.has(c + ',' + r)) { out.push(c + ',' + r); break; } }
  if (side === 'top') for (let c = ex.top[0]; c <= ex.top[1]; c++) for (let r = 0; r < H; r++) if (S.has(c + ',' + r)) { out.push(c + ',' + r); break; }
  return out;
}
const opp = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
const delta = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };
const problems = [];
function run(ab) {
  AB = ab;
  const reach = {}; for (const k in ROOMS) reach[k] = new Set();
  const q = [[START, ['3,15']]];
  while (q.length) {
    const [k, st] = q.pop(), room = ROOMS[k], before = reach[k].size;
    const r = bfsAny(room, [...st, ...reach[k]], ab);
    if (r.size === before && before > 0) continue;
    reach[k] = r;
    for (const side of exitsReached(room, r, ab)) {
      const [gx, gy] = k.split(',').map(Number), [dx, dy] = delta[side], nk = (gx + dx) + ',' + (gy + dy);
      if (!ROOMS[nk]) { problems.push(`exit to nowhere: ${k} ${side}`); continue; }
      const back = (ROOMS[nk].exits || {})[opp[side]], mine = room.exits[side];
      if (!back) { problems.push(`mismatched exit: ${k} ${side} -> ${nk}`); continue; }
      if (back[0] !== mine[0] || back[1] !== mine[1]) problems.push(`exit sizes differ: ${k} ${side} ${mine} vs ${nk} ${back}`);
      q.push([nk, entryStands(ROOMS[nk], opp[side])]);
    }
  }
  return reach;
}
function thingReached(reach, r, c) {
  if ((reach.hooks || []).some(([hr, hc]) => r >= hr - 1 && Math.hypot(r - hr, c - hc) <= 5)) return true; // caught mid-swing
  return [...reach].some(s => { const [c2, r2] = s.split(',').map(Number); return Math.abs(c - c2) <= 2 && r >= r2 - 5 && r <= r2 + 1; });
}
const cellOf = o => [(o.y - T / 2) / T, (o.x - T / 2) / T];

// unlock abilities in the order the house allows
const ab = {}, order = [];
for (;;) {
  const reach = run(ab);
  let gained = false;
  for (const k in ROOMS) for (const it of ROOMS[k].items || []) {
    const name = it.kind === 'key' ? it.id : it.kind;
    if (ab[name] || it.needs && !ab[it.needs]) continue;
    const [r, c] = cellOf(it);
    if (thingReached(reach[k], r, c)) { ab[name] = true; order.push(`${it.kind} (${ROOMS[k].name})`); gained = true; }
  }
  for (const k in ROOMS) for (const n of ROOMS[k].npcs || []) { // friends: bring them what they want
    const keys = Object.keys(ab).filter(a => a.endsWith(':key')).length;
    if (ab['gave:' + n.id] || !(n.wants ? ab[n.wants] : n.kind === 'keypad' || n.kind === 'door' && keys >= 7)) continue;
    if (thingReached(reach[k], n.y / T - 1, Math.floor(n.x / T))) { ab['gave:' + n.id] = true; order.push(`helped ${n.id}`); gained = true; }
  }
  if (!gained) break;
}
console.log('abilities in order:', order.join(', ') || 'none');
const base = run({}), full = run(ab);
let total = 0, miss = 0, gold = 0;
for (const k in ROOMS) {
  const room = ROOMS[k], lines = [];
  for (const f of room.flies) {
    const [r, c] = cellOf(f); total++;
    if (tileAt(room, c, r) !== '.') lines.push(`  fly ${r},${c} sits inside a '${tileAt(room, c, r)}' tile`);
    for (const e of room.enemies || []) // a firefly inside a jar's lid path can never be caught safely
      if (e.kind === 'popper' && Math.abs(f.x - e.x) < 16 && f.y > e.y - 70 && f.y < e.y + 4) { lines.push(`  fly ${r},${c} sits in a popper's lid path`); miss++; }
    if (thingReached(base[k], r, c)) continue;
    if (thingReached(full[k], r, c)) lines.push(`  fly ${r},${c} needs an ability`);
    else { lines.push(`  fly ${r},${c} UNREACHABLE`); miss++; }
  }
  for (const n of room.npcs || []) if (n.kind === 'greatlantern' && !thingReached(full[k], n.y / T - 1, Math.floor(n.x / T))) { lines.push('  great lantern UNREACHABLE'); miss++; }
  for (const it of room.items || []) { const [r, c] = cellOf(it); if (!thingReached(full[k], r, c)) { lines.push(`  item ${it.kind} UNREACHABLE`); miss++; } }
  for (const f of room.gold || []) { const [r, c] = cellOf(f); gold++; if (!thingReached(full[k], r, c)) { lines.push(`  golden fly ${r},${c} UNREACHABLE`); miss++; } }
  if (room.window) { // the window glass must not cut through any tile
    const [wc, wr] = room.window, x0 = wc * T, y0 = wr * T + 6;
    outer: for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      if (room.grid[r][c] === '.') continue;
      if (c * T < x0 + 70 && c * T + T > x0 && r * T < y0 + 84 && r * T + T > y0) { lines.push(`  window overlaps tile ${r},${c}`); break outer; }
    }
  }
  if (room.exits.bottom && ![...Array(room.exits.bottom[1] - room.exits.bottom[0] + 1)].some((_, i) => tileAt(room, room.exits.bottom[0] + i, 14) === '=')) lines.push('  no shelf at row 14 over the floor hole');
  if (full[k].size === 0) { lines.push('  ROOM NEVER REACHED'); miss += room.flies.length; }
  console.log(`${k.padEnd(5)} ${room.name.padEnd(34)} ${room.flies.length} flies ${lines.length ? '\n' + lines.join('\n') : 'ok'}`);
}
[...new Set(problems)].forEach(p => console.log('PROBLEM', p));
console.log(`rooms ${Object.keys(ROOMS).length}, fireflies ${total}, golden ${gold}, unreachable ${miss}`);
process.exitCode = miss ? 1 : 0;
if (process.env.DUMP) for (const k of process.env.DUMP.split(' ')) { // DUMP="5,1 4,1" prints the room with reachable stands as '*'
  AB = ab; const room = ROOMS[k];
  console.log('\n' + k + ' ' + room.name);
  for (let r = 0; r < H; r++) { let s = String(r).padStart(2) + ' '; for (let c = 0; c < W; c++) s += full[k].has(c + ',' + r) ? '*' : tileAt(room, c, r); console.log(s); }
}

'use strict';
// Lector mínimo de fuentes TrueType / OpenType (CFF) / colecciones TTC.
// Da: nombres, métricas, avance, kerning (kern + GPOS) y contornos de glifos.
// Sin dependencias.

function tag4(dv, o) { return String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3)); }

function faceOffsets(buffer) {
  const dv = new DataView(buffer);
  if (tag4(dv, 0) === 'ttcf') {
    const n = dv.getUint32(8);
    const out = [];
    for (let i = 0; i < n; i++) out.push(dv.getUint32(12 + 4 * i));
    return out;
  }
  return [0];
}

function readTables(dv, off) {
  const n = dv.getUint16(off + 4);
  const t = {};
  for (let i = 0; i < n; i++) {
    const r = off + 12 + 16 * i;
    t[tag4(dv, r)] = { offset: dv.getUint32(r + 8), length: dv.getUint32(r + 12) };
  }
  return t;
}

function decodeUtf16(dv, o, len) {
  let s = '';
  for (let i = 0; i + 1 < len; i += 2) s += String.fromCharCode(dv.getUint16(o + i));
  return s;
}
function decodeLatin(dv, o, len) {
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(dv.getUint8(o + i));
  return s;
}

function readNames(dv, t) {
  const out = {};
  if (!t) return out;
  const base = t.offset, count = dv.getUint16(base + 2), strOff = base + dv.getUint16(base + 4);
  const best = {};
  for (let i = 0; i < count; i++) {
    const r = base + 6 + i * 12;
    const pid = dv.getUint16(r), eid = dv.getUint16(r + 2), lid = dv.getUint16(r + 4), nid = dv.getUint16(r + 6);
    const len = dv.getUint16(r + 8), o = strOff + dv.getUint16(r + 10);
    let score = -1, str = null;
    if (pid === 3 && (eid === 1 || eid === 10 || eid === 0)) { score = lid === 0x409 ? 3 : 2; str = () => decodeUtf16(dv, o, len); }
    else if (pid === 0) { score = 1; str = () => decodeUtf16(dv, o, len); }
    else if (pid === 1 && eid === 0) { score = lid === 0 ? 1.5 : 0.5; str = () => decodeLatin(dv, o, len); }
    if (score > (best[nid] || -1)) { best[nid] = score; try { out[nid] = str(); } catch (e) { /* nada */ } }
  }
  return out;
}

// Solo nombres (rápido) para indexar archivos
function listFaces(buffer) {
  const dv = new DataView(buffer);
  const faces = [];
  faceOffsets(buffer).forEach((off, index) => {
    try {
      const t = readTables(dv, off);
      const n = readNames(dv, t.name);
      faces.push({ index, postScriptName: n[6] || '', family: n[16] || n[1] || '', style: n[17] || n[2] || '', fullName: n[4] || '' });
    } catch (e) { /* cara ilegible */ }
  });
  return faces;
}

// ------------------------------------------------------------------ CFF
function cffIndex(dv, o) {
  const count = dv.getUint16(o);
  if (count === 0) return { count: 0, offsets: [], data: o + 2, end: o + 2 };
  const offSize = dv.getUint8(o + 2);
  const rd = p => { let v = 0; for (let k = 0; k < offSize; k++) v = v * 256 + dv.getUint8(p + k); return v; };
  const offsets = [];
  for (let i = 0; i <= count; i++) offsets.push(rd(o + 3 + i * offSize));
  const data = o + 3 + (count + 1) * offSize - 1;
  return { count, offsets, data, end: data + offsets[count] };
}
function cffItem(idx, i) { return [idx.data + idx.offsets[i], idx.data + idx.offsets[i + 1]]; }

function parseDict(dv, start, end) {
  const d = {};
  let ops = [];
  let p = start;
  while (p < end) {
    const b0 = dv.getUint8(p);
    if (b0 <= 21) {
      let op = b0; p++;
      if (b0 === 12) { op = 1200 + dv.getUint8(p); p++; }
      d[op] = ops; ops = [];
    } else if (b0 === 28) { ops.push(dv.getInt16(p + 1)); p += 3; }
    else if (b0 === 29) { ops.push(dv.getInt32(p + 1)); p += 5; }
    else if (b0 === 30) {
      p++;
      let s = '';
      const nib = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', 'E', 'E-', '', '-', ''];
      for (;;) {
        const b = dv.getUint8(p++);
        const n1 = b >> 4, n2 = b & 15;
        if (n1 === 15) break; s += nib[n1];
        if (n2 === 15) break; s += nib[n2];
      }
      ops.push(parseFloat(s));
    } else if (b0 >= 32 && b0 <= 246) { ops.push(b0 - 139); p++; }
    else if (b0 >= 247 && b0 <= 250) { ops.push((b0 - 247) * 256 + dv.getUint8(p + 1) + 108); p += 2; }
    else if (b0 >= 251 && b0 <= 254) { ops.push(-(b0 - 251) * 256 - dv.getUint8(p + 1) - 108); p += 2; }
    else p++;
  }
  return d;
}

function subrBias(n) { return n < 1240 ? 107 : n < 33900 ? 1131 : 32768; }

function parseCFF(dv, base) {
  const hdrSize = dv.getUint8(base + 2);
  const nameIdx = cffIndex(dv, base + hdrSize);
  const topIdx = cffIndex(dv, nameIdx.end);
  const strIdx = cffIndex(dv, topIdx.end);
  const gsubIdx = cffIndex(dv, strIdx.end);
  const [ts, te] = cffItem(topIdx, 0);
  const top = parseDict(dv, ts, te);
  const cs = cffIndex(dv, base + top[17][0]);
  const privOf = (dict) => {
    const pr = dict[18];
    if (!pr) return { subrs: null };
    const [size, off] = pr;
    const pd = parseDict(dv, base + off, base + off + size);
    const subrs = pd[19] ? cffIndex(dv, base + off + pd[19][0]) : null;
    return { subrs };
  };
  let fdSelect = null, fds = null;
  if (top[1230]) {
    const fdArr = cffIndex(dv, base + top[1236][0]);
    fds = [];
    for (let i = 0; i < fdArr.count; i++) { const [s, e] = cffItem(fdArr, i); fds.push(privOf(parseDict(dv, s, e))); }
    const fo = base + top[1237][0];
    const fmt = dv.getUint8(fo);
    const nG = cs.count;
    fdSelect = new Uint8Array(nG);
    if (fmt === 0) { for (let g = 0; g < nG; g++) fdSelect[g] = dv.getUint8(fo + 1 + g); }
    else if (fmt === 3) {
      const nr = dv.getUint16(fo + 1);
      for (let r = 0; r < nr; r++) {
        const first = dv.getUint16(fo + 3 + r * 3), fd = dv.getUint8(fo + 5 + r * 3);
        const next = dv.getUint16(fo + 3 + (r + 1) * 3);
        for (let g = first; g < next && g < nG; g++) fdSelect[g] = fd;
      }
    }
  }
  const priv = privOf(top);
  return { cs, gsubs: gsubIdx, subrsFor: g => (fds ? fds[fdSelect[g]].subrs : priv.subrs) };
}

function cffGlyph(dv, cff, gid) {
  const cmds = [];
  if (gid >= cff.cs.count) return cmds;
  const stack = [];
  let nStems = 0, haveWidth = false, open = false;
  let x = 0, y = 0;
  const subrs = cff.subrsFor(gid);
  const gsubs = cff.gsubs;
  const lsb = subrs ? subrBias(subrs.count) : 0, gb = subrBias(gsubs.count);
  const moveTo = (nx, ny) => { if (open) cmds.push({ t: 'Z' }); cmds.push({ t: 'M', x: nx, y: ny }); open = true; };
  const lineTo = (nx, ny) => cmds.push({ t: 'L', x: nx, y: ny });
  const curveTo = (a, b, c, d, e, f) => cmds.push({ t: 'C', x1: a, y1: b, x2: c, y2: d, x: e, y: f });
  const stems = () => { if (stack.length % 2 !== 0 && !haveWidth) stack.shift(); haveWidth = true; nStems += stack.length >> 1; stack.length = 0; };
  let depth = 0;
  function run(s, e) {
    if (++depth > 12) return true;
    let p = s;
    while (p < e) {
      let v = dv.getUint8(p++);
      if (v < 32) {
        switch (v) {
          case 1: case 3: case 18: case 23: stems(); break;
          case 19: case 20:
            stems();
            p += (nStems + 7) >> 3;
            break;
          case 21: if (stack.length > 2 && !haveWidth) stack.shift(); haveWidth = true; x += stack[0]; y += stack[1]; moveTo(x, y); stack.length = 0; break;
          case 22: if (stack.length > 1 && !haveWidth) stack.shift(); haveWidth = true; x += stack[0]; moveTo(x, y); stack.length = 0; break;
          case 4: if (stack.length > 1 && !haveWidth) stack.shift(); haveWidth = true; y += stack[0]; moveTo(x, y); stack.length = 0; break;
          case 5: for (let i = 0; i + 1 < stack.length; i += 2) { x += stack[i]; y += stack[i + 1]; lineTo(x, y); } stack.length = 0; break;
          case 6: case 7: {
            let horiz = v === 6;
            for (let i = 0; i < stack.length; i++) { if (horiz) x += stack[i]; else y += stack[i]; lineTo(x, y); horiz = !horiz; }
            stack.length = 0; break;
          }
          case 8: for (let i = 0; i + 5 < stack.length; i += 6) { const c1x = x + stack[i], c1y = y + stack[i + 1], c2x = c1x + stack[i + 2], c2y = c1y + stack[i + 3]; x = c2x + stack[i + 4]; y = c2y + stack[i + 5]; curveTo(c1x, c1y, c2x, c2y, x, y); } stack.length = 0; break;
          case 24: {
            let i = 0;
            for (; i + 5 < stack.length - 2; i += 6) { const c1x = x + stack[i], c1y = y + stack[i + 1], c2x = c1x + stack[i + 2], c2y = c1y + stack[i + 3]; x = c2x + stack[i + 4]; y = c2y + stack[i + 5]; curveTo(c1x, c1y, c2x, c2y, x, y); }
            x += stack[i]; y += stack[i + 1]; lineTo(x, y); stack.length = 0; break;
          }
          case 25: {
            let i = 0;
            for (; i + 1 < stack.length - 6; i += 2) { x += stack[i]; y += stack[i + 1]; lineTo(x, y); }
            const c1x = x + stack[i], c1y = y + stack[i + 1], c2x = c1x + stack[i + 2], c2y = c1y + stack[i + 3]; x = c2x + stack[i + 4]; y = c2y + stack[i + 5]; curveTo(c1x, c1y, c2x, c2y, x, y);
            stack.length = 0; break;
          }
          case 26: {
            let i = 0;
            if (stack.length % 2) { x += stack[0]; i = 1; }
            for (; i + 3 < stack.length; i += 4) { const c1x = x, c1y = y + stack[i], c2x = c1x + stack[i + 1], c2y = c1y + stack[i + 2]; x = c2x; y = c2y + stack[i + 3]; curveTo(c1x, c1y, c2x, c2y, x, y); }
            stack.length = 0; break;
          }
          case 27: {
            let i = 0;
            if (stack.length % 2) { y += stack[0]; i = 1; }
            for (; i + 3 < stack.length; i += 4) { const c1x = x + stack[i], c1y = y, c2x = c1x + stack[i + 1], c2y = c1y + stack[i + 2]; x = c2x + stack[i + 3]; y = c2y; curveTo(c1x, c1y, c2x, c2y, x, y); }
            stack.length = 0; break;
          }
          case 30: case 31: {
            let horiz = v === 31;
            let i = 0;
            while (i + 3 < stack.length) {
              const last = stack.length - i === 5;
              if (horiz) {
                const c1x = x + stack[i], c1y = y, c2x = c1x + stack[i + 1], c2y = c1y + stack[i + 2];
                y = c2y + stack[i + 3]; x = c2x + (last ? stack[i + 4] : 0);
                curveTo(c1x, c1y, c2x, c2y, x, y);
              } else {
                const c1x = x, c1y = y + stack[i], c2x = c1x + stack[i + 1], c2y = c1y + stack[i + 2];
                x = c2x + stack[i + 3]; y = c2y + (last ? stack[i + 4] : 0);
                curveTo(c1x, c1y, c2x, c2y, x, y);
              }
              i += last ? 5 : 4;
              horiz = !horiz;
            }
            stack.length = 0; break;
          }
          case 10: case 29: {
            const idx = v === 10 ? subrs : gsubs;
            const n = stack.pop() + (v === 10 ? lsb : gb);
            if (idx && n >= 0 && n < idx.count) { const [ss, se] = cffItem(idx, n); if (run(ss, se)) return true; }
            break;
          }
          case 11: depth--; return false;
          case 14:
            if (stack.length > 0 && !haveWidth) stack.shift();
            if (open) cmds.push({ t: 'Z' });
            open = false;
            return true;
          case 12: {
            const v2 = dv.getUint8(p++);
            const S = stack;
            if (v2 === 35) { // flex
              const c1x = x + S[0], c1y = y + S[1], c2x = c1x + S[2], c2y = c1y + S[3], jx = c2x + S[4], jy = c2y + S[5];
              const c3x = jx + S[6], c3y = jy + S[7], c4x = c3x + S[8], c4y = c3y + S[9]; x = c4x + S[10]; y = c4y + S[11];
              curveTo(c1x, c1y, c2x, c2y, jx, jy); curveTo(c3x, c3y, c4x, c4y, x, y);
            } else if (v2 === 34) { // hflex
              const c1x = x + S[0], c1y = y, c2x = c1x + S[1], c2y = c1y + S[2], jx = c2x + S[3], jy = c2y;
              const c3x = jx + S[4], c3y = c2y, c4x = c3x + S[5], c4y = y; x = c4x + S[6];
              curveTo(c1x, c1y, c2x, c2y, jx, jy); curveTo(c3x, c3y, c4x, c4y, x, y);
            } else if (v2 === 36) { // hflex1
              const c1x = x + S[0], c1y = y + S[1], c2x = c1x + S[2], c2y = c1y + S[3], jx = c2x + S[4], jy = c2y;
              const c3x = jx + S[5], c3y = c2y, c4x = c3x + S[6], c4y = c3y + S[7]; x = c4x + S[8];
              curveTo(c1x, c1y, c2x, c2y, jx, jy); curveTo(c3x, c3y, c4x, c4y, x, y);
            } else if (v2 === 37) { // flex1
              const sx = x, sy = y;
              const c1x = x + S[0], c1y = y + S[1], c2x = c1x + S[2], c2y = c1y + S[3], jx = c2x + S[4], jy = c2y + S[5];
              const c3x = jx + S[6], c3y = jy + S[7], c4x = c3x + S[8], c4y = c3y + S[9];
              if (Math.abs(c4x - sx) > Math.abs(c4y - sy)) { x = c4x + S[10]; y = sy; } else { x = sx; y = c4y + S[10]; }
              curveTo(c1x, c1y, c2x, c2y, jx, jy); curveTo(c3x, c3y, c4x, c4y, x, y);
            }
            stack.length = 0; break;
          }
          case 28: stack.push(dv.getInt16(p)); p += 2; break;
          default: stack.length = 0;
        }
      } else if (v === 255) { stack.push(dv.getInt32(p) / 65536); p += 4; }
      else if (v <= 246) stack.push(v - 139);
      else if (v <= 250) { stack.push((v - 247) * 256 + dv.getUint8(p) + 108); p++; }
      else { stack.push(-(v - 251) * 256 - dv.getUint8(p) - 108); p++; }
    }
    depth--;
    return false;
  }
  const [s, e] = cffItem(cff.cs, gid);
  run(s, e);
  if (open) cmds.push({ t: 'Z' });
  return cmds;
}

// ------------------------------------------------------------------ TrueType
function ttGlyph(dv, f, gid, depth) {
  if (depth > 8 || gid >= f.numGlyphs) return [];
  const o0 = f.loca(gid), o1 = f.loca(gid + 1);
  if (o1 <= o0) return [];
  let p = f.glyf + o0;
  const nc = dv.getInt16(p);
  p += 10;
  if (nc >= 0) {
    const ends = [];
    for (let i = 0; i < nc; i++) ends.push(dv.getUint16(p + i * 2));
    p += nc * 2;
    p += 2 + dv.getUint16(p);
    const n = nc ? ends[nc - 1] + 1 : 0;
    const flags = new Uint8Array(n);
    for (let i = 0; i < n;) {
      const fl = dv.getUint8(p++);
      flags[i++] = fl;
      if (fl & 8) { let r = dv.getUint8(p++); while (r-- > 0 && i < n) flags[i++] = fl; }
    }
    const xs = new Float64Array(n), ys = new Float64Array(n);
    let v = 0;
    for (let i = 0; i < n; i++) {
      const fl = flags[i];
      if (fl & 2) { const d = dv.getUint8(p++); v += fl & 16 ? d : -d; }
      else if (!(fl & 16)) { v += dv.getInt16(p); p += 2; }
      xs[i] = v;
    }
    v = 0;
    for (let i = 0; i < n; i++) {
      const fl = flags[i];
      if (fl & 4) { const d = dv.getUint8(p++); v += fl & 32 ? d : -d; }
      else if (!(fl & 32)) { v += dv.getInt16(p); p += 2; }
      ys[i] = v;
    }
    const cmds = [];
    let st = 0;
    for (let c = 0; c < nc; c++) {
      const en = ends[c];
      const pts = [];
      for (let i = st; i <= en; i++) pts.push({ x: xs[i], y: ys[i], on: !!(flags[i] & 1) });
      st = en + 1;
      if (!pts.length) continue;
      // empezar en un punto "on"
      let k0 = pts.findIndex(q => q.on);
      let start;
      if (k0 < 0) { start = { x: (pts[0].x + pts[1 % pts.length].x) / 2, y: (pts[0].y + pts[1 % pts.length].y) / 2, on: true }; k0 = 0; pts.splice(1, 0, start); k0 = 1; }
      const ring = pts.slice(k0).concat(pts.slice(0, k0));
      start = ring[0];
      cmds.push({ t: 'M', x: start.x, y: start.y });
      let ctrl = null;
      for (let i = 1; i <= ring.length; i++) {
        const q = ring[i % ring.length];
        if (q.on) {
          if (ctrl) { cmds.push({ t: 'Q', x1: ctrl.x, y1: ctrl.y, x: q.x, y: q.y }); ctrl = null; }
          else if (i < ring.length) cmds.push({ t: 'L', x: q.x, y: q.y });
        } else {
          if (ctrl) { const mx = (ctrl.x + q.x) / 2, my = (ctrl.y + q.y) / 2; cmds.push({ t: 'Q', x1: ctrl.x, y1: ctrl.y, x: mx, y: my }); }
          ctrl = q;
        }
      }
      if (ctrl) cmds.push({ t: 'Q', x1: ctrl.x, y1: ctrl.y, x: start.x, y: start.y });
      cmds.push({ t: 'Z' });
    }
    return cmds;
  }
  // compuesto
  const cmds = [];
  for (;;) {
    const fl = dv.getUint16(p), g = dv.getUint16(p + 2);
    p += 4;
    let dx, dy;
    if (fl & 1) { dx = dv.getInt16(p); dy = dv.getInt16(p + 2); p += 4; }
    else { dx = dv.getInt8(p); dy = dv.getInt8(p + 1); p += 2; }
    if (!(fl & 2)) { dx = 0; dy = 0; }
    let a = 1, b = 0, c = 0, d = 1;
    const f2 = q => dv.getInt16(q) / 16384;
    if (fl & 8) { a = d = f2(p); p += 2; }
    else if (fl & 0x40) { a = f2(p); d = f2(p + 2); p += 4; }
    else if (fl & 0x80) { a = f2(p); b = f2(p + 2); c = f2(p + 4); d = f2(p + 6); p += 8; }
    const sub = ttGlyph(dv, f, g, depth + 1);
    const X = (x, y) => a * x + c * y + dx, Y = (x, y) => b * x + d * y + dy;
    for (const m of sub) {
      if (m.t === 'Z') { cmds.push(m); continue; }
      const n = { t: m.t, x: X(m.x, m.y), y: Y(m.x, m.y) };
      if (m.t === 'Q') { n.x1 = X(m.x1, m.y1); n.y1 = Y(m.x1, m.y1); }
      cmds.push(n);
    }
    if (!(fl & 0x20)) break;
  }
  return cmds;
}

// ------------------------------------------------------------------ cmap
function readCmap(dv, t) {
  const base = t.offset, n = dv.getUint16(base + 2);
  let best = null, bestScore = -1;
  for (let i = 0; i < n; i++) {
    const r = base + 4 + i * 8;
    const pid = dv.getUint16(r), eid = dv.getUint16(r + 2), off = base + dv.getUint32(r + 4);
    const fmt = dv.getUint16(off);
    let score = -1;
    if (fmt === 12 && (pid === 3 || pid === 0)) score = 4;
    else if (fmt === 4 && pid === 3 && (eid === 1 || eid === 10)) score = 3;
    else if (fmt === 4 && pid === 0) score = 2;
    else if (fmt === 4 && pid === 3 && eid === 0) score = 1.5;
    else if (fmt === 0) score = 0.5;
    if (score > bestScore) { bestScore = score; best = { off, fmt }; }
  }
  if (!best) return () => 0;
  const { off, fmt } = best;
  if (fmt === 12) {
    const ng = dv.getUint32(off + 12);
    return cp => {
      let lo = 0, hi = ng - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1, g = off + 16 + mid * 12;
        const s = dv.getUint32(g), e = dv.getUint32(g + 4);
        if (cp < s) hi = mid - 1; else if (cp > e) lo = mid + 1; else return dv.getUint32(g + 8) + (cp - s);
      }
      return 0;
    };
  }
  if (fmt === 4) {
    const segX2 = dv.getUint16(off + 6), seg = segX2 / 2;
    const endO = off + 14, startO = endO + segX2 + 2, deltaO = startO + segX2, rangeO = deltaO + segX2;
    return cp => {
      if (cp > 0xffff) return 0;
      for (let i = 0; i < seg; i++) {
        const end = dv.getUint16(endO + i * 2);
        if (cp > end) continue;
        const start = dv.getUint16(startO + i * 2);
        if (cp < start) return 0;
        const delta = dv.getInt16(deltaO + i * 2), ro = dv.getUint16(rangeO + i * 2);
        if (!ro) return (cp + delta) & 0xffff;
        const gAddr = rangeO + i * 2 + ro + (cp - start) * 2;
        const g = dv.getUint16(gAddr);
        return g ? (g + delta) & 0xffff : 0;
      }
      return 0;
    };
  }
  return cp => (cp < 256 ? dv.getUint8(off + 6 + cp) : 0);
}

// ------------------------------------------------------------------ kerning
function readKern(dv, t) {
  const m = new Map();
  if (!t) return m;
  const base = t.offset;
  const ver = dv.getUint16(base);
  if (ver !== 0) return m;
  const n = dv.getUint16(base + 2);
  let p = base + 4;
  for (let s = 0; s < n; s++) {
    const len = dv.getUint16(p + 2), cov = dv.getUint16(p + 4);
    if ((cov >> 8) === 0 && (cov & 1)) {
      const np = dv.getUint16(p + 6);
      for (let i = 0; i < np; i++) {
        const q = p + 14 + i * 6;
        m.set(dv.getUint16(q) * 65536 + dv.getUint16(q + 2), dv.getInt16(q + 4));
      }
    }
    p += len;
  }
  return m;
}

function coverageIndex(dv, o, g) {
  const fmt = dv.getUint16(o);
  if (fmt === 1) {
    const n = dv.getUint16(o + 2);
    let lo = 0, hi = n - 1;
    while (lo <= hi) { const mid = (lo + hi) >> 1, v = dv.getUint16(o + 4 + mid * 2); if (v === g) return mid; if (v < g) lo = mid + 1; else hi = mid - 1; }
    return -1;
  }
  if (fmt === 2) {
    const n = dv.getUint16(o + 2);
    let lo = 0, hi = n - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, r = o + 4 + mid * 6;
      const s = dv.getUint16(r), e = dv.getUint16(r + 2);
      if (g < s) hi = mid - 1; else if (g > e) lo = mid + 1; else return dv.getUint16(r + 4) + g - s;
    }
  }
  return -1;
}
function classOf(dv, o, g) {
  const fmt = dv.getUint16(o);
  if (fmt === 1) { const s = dv.getUint16(o + 2), n = dv.getUint16(o + 4); return g >= s && g < s + n ? dv.getUint16(o + 6 + (g - s) * 2) : 0; }
  if (fmt === 2) {
    const n = dv.getUint16(o + 2);
    let lo = 0, hi = n - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, r = o + 4 + mid * 6;
      const s = dv.getUint16(r), e = dv.getUint16(r + 2);
      if (g < s) hi = mid - 1; else if (g > e) lo = mid + 1; else return dv.getUint16(r + 4);
    }
  }
  return 0;
}
const bitCount = v => { let c = 0; while (v) { c += v & 1; v >>= 1; } return c; };
function xAdvOf(dv, p, vf) { // valor XAdvance dentro de un ValueRecord
  if (!(vf & 4)) return 0;
  const pre = bitCount(vf & 3);
  return dv.getInt16(p + pre * 2);
}

function readGposPairs(dv, t) {
  if (!t) return [];
  const base = t.offset;
  const flO = base + dv.getUint16(base + 6), llO = base + dv.getUint16(base + 8);
  const lookups = new Set();
  const fc = dv.getUint16(flO);
  for (let i = 0; i < fc; i++) {
    const r = flO + 2 + i * 6;
    if (tag4(dv, r) !== 'kern') continue;
    const fo = flO + dv.getUint16(r + 4);
    const n = dv.getUint16(fo + 2);
    for (let k = 0; k < n; k++) lookups.add(dv.getUint16(fo + 4 + k * 2));
  }
  const subs = [];
  const lc = dv.getUint16(llO);
  for (const li of [...lookups].sort((a, b) => a - b)) {
    if (li >= lc) continue;
    const lo = llO + dv.getUint16(llO + 2 + li * 2);
    let type = dv.getUint16(lo);
    const sc = dv.getUint16(lo + 4);
    const list = [];
    for (let s = 0; s < sc; s++) {
      let so = lo + dv.getUint16(lo + 6 + s * 2);
      let ty = type;
      if (ty === 9) { ty = dv.getUint16(so + 2); so = so + dv.getUint32(so + 4); }
      if (ty === 2) list.push(so);
    }
    if (list.length) subs.push(list);
  }
  return subs;
}

function gposKern(dv, lookups, g1, g2) {
  let total = 0;
  for (const list of lookups) {
    for (const so of list) {
      const fmt = dv.getUint16(so);
      const ci = coverageIndex(dv, so + dv.getUint16(so + 2), g1);
      if (ci < 0) continue;
      const vf1 = dv.getUint16(so + 4), vf2 = dv.getUint16(so + 6);
      const s1 = bitCount(vf1) * 2, s2 = bitCount(vf2) * 2;
      if (fmt === 1) {
        const ps = so + dv.getUint16(so + 10 + ci * 2);
        const n = dv.getUint16(ps);
        const rec = 2 + s1 + s2;
        let lo = 0, hi = n - 1, found = -1;
        while (lo <= hi) { const mid = (lo + hi) >> 1, v = dv.getUint16(ps + 2 + mid * rec); if (v === g2) { found = mid; break; } if (v < g2) lo = mid + 1; else hi = mid - 1; }
        if (found >= 0) { total += xAdvOf(dv, ps + 2 + found * rec + 2, vf1); break; }
      } else if (fmt === 2) {
        const c1 = classOf(dv, so + dv.getUint16(so + 8), g1), c2 = classOf(dv, so + dv.getUint16(so + 10), g2);
        const n2 = dv.getUint16(so + 14);
        const rec = s1 + s2;
        total += xAdvOf(dv, so + 16 + (c1 * n2 + c2) * rec, vf1);
        break;
      }
    }
  }
  return total;
}

// ------------------------------------------------------------------ fuente
function parseFont(buffer, faceIndex) {
  const dv = new DataView(buffer);
  const offs = faceOffsets(buffer);
  const off = offs[Math.min(faceIndex || 0, offs.length - 1)];
  const t = readTables(dv, off);
  if (!t.head || !t.hhea || !t.hmtx || !t.cmap) throw new Error('Fuente incompleta');
  const unitsPerEm = dv.getUint16(t.head.offset + 18);
  const locFmt = dv.getInt16(t.head.offset + 50);
  const ascender = dv.getInt16(t.hhea.offset + 4), descender = dv.getInt16(t.hhea.offset + 6);
  const numHM = dv.getUint16(t.hhea.offset + 34);
  const numGlyphs = t.maxp ? dv.getUint16(t.maxp.offset + 4) : 65535;
  let capHeight = 0, xHeight = 0;
  if (t['OS/2'] && t['OS/2'].length >= 90 && dv.getUint16(t['OS/2'].offset) >= 2) {
    xHeight = dv.getInt16(t['OS/2'].offset + 86); capHeight = dv.getInt16(t['OS/2'].offset + 88);
  }
  const names = readNames(dv, t.name);
  const cmap = readCmap(dv, t.cmap);
  const kern = readKern(dv, t.kern);
  const gpos = t.GPOS ? (() => { try { return readGposPairs(dv, t.GPOS); } catch (e) { return []; } })() : [];
  const f = {
    unitsPerEm, ascender, descender, numGlyphs,
    postScriptName: names[6] || '', family: names[16] || names[1] || '', style: names[17] || names[2] || '',
    glyf: t.glyf ? t.glyf.offset : 0,
    loca: null
  };
  if (t.loca) f.loca = locFmt === 0 ? g => dv.getUint16(t.loca.offset + g * 2) * 2 : g => dv.getUint32(t.loca.offset + g * 4);
  const cff = t['CFF '] ? parseCFF(dv, t['CFF '].offset) : null;
  if (!cff && !(t.glyf && t.loca)) throw new Error('Formato de contornos no soportado');
  const gidCache = new Map(), pathCache = new Map(), kernCache = new Map();
  f.glyphIndex = cp => { let g = gidCache.get(cp); if (g === undefined) { g = cmap(cp); gidCache.set(cp, g); } return g; };
  f.advance = g => dv.getUint16(t.hmtx.offset + 4 * Math.min(g, numHM - 1));
  f.kerning = (a, b) => {
    const k = a * 65536 + b;
    let v = kernCache.get(k);
    if (v === undefined) {
      v = 0;
      try { v = gpos.length ? gposKern(dv, gpos, a, b) : 0; } catch (e) { v = 0; }
      if (!v && kern.size) v = kern.get(k) || 0;
      kernCache.set(k, v);
    }
    return v;
  };
  f.glyphPath = g => {
    let c = pathCache.get(g);
    if (!c) { try { c = cff ? cffGlyph(dv, cff, g) : ttGlyph(dv, f, g, 0); } catch (e) { c = []; } pathCache.set(g, c); }
    return c;
  };
  // altura de mayúsculas y x si la tabla OS/2 no la trae
  const bboxOf = g => { let y0 = Infinity, y1 = -Infinity; for (const m of f.glyphPath(g)) if (m.t !== 'Z') { y0 = Math.min(y0, m.y); y1 = Math.max(y1, m.y); } return [y0, y1]; };
  if (!capHeight) capHeight = bboxOf(f.glyphIndex(72))[1] || ascender * 0.7;
  if (!xHeight) xHeight = bboxOf(f.glyphIndex(120))[1] || capHeight * 0.7;
  f.capHeight = capHeight; f.xHeight = xHeight;
  return f;
}

// Convierte comandos en polilíneas (unidades de la fuente, y hacia arriba). tol: tolerancia en unidades.
function flatten(cmds, tol, maxSeg) {
  const out = [];
  let cur = null, sx = 0, sy = 0, x = 0, y = 0;
  const push = (px, py) => {
    if (maxSeg && cur.length) {
      const lx = cur[cur.length - 2], ly = cur[cur.length - 1];
      const d = Math.hypot(px - lx, py - ly);
      if (d > maxSeg) { const n = Math.ceil(d / maxSeg); for (let k = 1; k < n; k++) cur.push(lx + (px - lx) * k / n, ly + (py - ly) * k / n); }
    }
    cur.push(px, py);
  };
  for (const m of cmds) {
    if (m.t === 'M') { if (cur && cur.length > 4) out.push(cur); cur = [m.x, m.y]; sx = x = m.x; sy = y = m.y; }
    else if (m.t === 'L') { push(m.x, m.y); x = m.x; y = m.y; }
    else if (m.t === 'Q') {
      const d = Math.hypot(m.x1 - x, m.y1 - y) + Math.hypot(m.x - m.x1, m.y - m.y1);
      const n = Math.max(2, Math.min(64, Math.ceil(Math.sqrt(d / tol))));
      for (let k = 1; k <= n; k++) { const tt = k / n, u = 1 - tt; push(u * u * x + 2 * u * tt * m.x1 + tt * tt * m.x, u * u * y + 2 * u * tt * m.y1 + tt * tt * m.y); }
      x = m.x; y = m.y;
    } else if (m.t === 'C') {
      const d = Math.hypot(m.x1 - x, m.y1 - y) + Math.hypot(m.x2 - m.x1, m.y2 - m.y1) + Math.hypot(m.x - m.x2, m.y - m.y2);
      const n = Math.max(2, Math.min(96, Math.ceil(Math.sqrt(d / tol) * 1.2)));
      for (let k = 1; k <= n; k++) {
        const tt = k / n, u = 1 - tt;
        push(u * u * u * x + 3 * u * u * tt * m.x1 + 3 * u * tt * tt * m.x2 + tt * tt * tt * m.x,
             u * u * u * y + 3 * u * u * tt * m.y1 + 3 * u * tt * tt * m.y2 + tt * tt * tt * m.y);
      }
      x = m.x; y = m.y;
    } else if (m.t === 'Z') {
      if (cur) { if (x !== sx || y !== sy) push(sx, sy); if (cur.length > 4) out.push(cur); cur = null; }
      x = sx; y = sy;
    }
  }
  if (cur && cur.length > 4) out.push(cur);
  return out;
}

// Métricas de un texto con una fuente (en unidades de em = 1): avance con kerning y tinta
function measureText(f, text) {
  let adv = 0, prev = -1, top = -Infinity, bot = Infinity, left = Infinity, right = -Infinity;
  const glyphs = [];
  for (const ch of text) {
    const g = f.glyphIndex(ch.codePointAt(0));
    if (prev >= 0) adv += f.kerning(prev, g);
    glyphs.push({ ch, g, x: adv });
    const cm = f.glyphPath(g);
    for (const m of cm) {
      if (m.t === 'Z') continue;
      const xs = [m.x], ys = [m.y];
      if (m.x1 !== undefined) { xs.push(m.x1); ys.push(m.y1); }
      if (m.x2 !== undefined) { xs.push(m.x2); ys.push(m.y2); }
      for (const v of ys) { if (v > top) top = v; if (v < bot) bot = v; }
      for (const v of xs) { if (adv + v < left) left = adv + v; if (adv + v > right) right = adv + v; }
    }
    adv += f.advance(g);
    prev = g;
  }
  const u = f.unitsPerEm;
  if (top === -Infinity) { top = 0; bot = 0; left = 0; right = adv; }
  return { adv: adv / u, asc: Math.max(0, top) / u, desc: Math.max(0, -bot) / u, inkL: left / u, inkR: right / u, glyphs };
}

module.exports = { parseFont, listFaces, faceOffsets, flatten, measureText };


'use strict';
// Rasterizador de polígonos con antialiasing exacto (acumulación de área, estilo font-rs).
// Regla de relleno: no nula (los solapes del mismo sentido no se suman más de 1).

class Raster {
  constructor(w, h) {
    this.w = w | 0; this.h = h | 0;
    this.stride = this.w + 3;
    this.acc = new Float32Array(this.stride * this.h);
  }
  line(x0, y0, x1, y1) {
    if (y0 === y1 || !isFinite(x0 + y0 + x1 + y1)) return;
    const W = this.w, H = this.h, acc = this.acc, S = this.stride;
    let dir = 1;
    if (y0 > y1) { dir = -1; let t = x0; x0 = x1; x1 = t; t = y0; y0 = y1; y1 = t; }
    if (y1 <= 0 || y0 >= H) return;
    const dxdy = (x1 - x0) / (y1 - y0);
    let x = x0;
    if (y0 < 0) { x -= y0 * dxdy; y0 = 0; }
    const yEnd = Math.min(H, y1);
    const maxX = W - 0.0001;
    for (let y = Math.floor(y0); y < Math.ceil(yEnd); y++) {
      const ls = y * S;
      const dy = Math.min(y + 1, yEnd) - Math.max(y, y0);
      const xn = x + dxdy * dy;
      const d = dy * dir;
      let xa = Math.min(maxX, Math.max(0, x)), xb = Math.min(maxX, Math.max(0, xn));
      if (xa > xb) { const t = xa; xa = xb; xb = t; }
      const x0f = Math.floor(xa), x0i = x0f | 0;
      const x1c = Math.ceil(xb), x1i = x1c | 0;
      if (x1i <= x0i + 1) {
        const xmf = 0.5 * (xa + xb) - x0f;
        acc[ls + x0i] += d - d * xmf;
        acc[ls + x0i + 1] += d * xmf;
      } else {
        const s = 1 / (xb - xa);
        const fx0 = xa - x0f;
        const a0 = 0.5 * s * (1 - fx0) * (1 - fx0);
        const fx1 = xb - x1c + 1;
        const am = 0.5 * s * fx1 * fx1;
        acc[ls + x0i] += d * a0;
        if (x1i === x0i + 2) acc[ls + x0i + 1] += d * (1 - a0 - am);
        else {
          const a1 = s * (1.5 - fx0);
          acc[ls + x0i + 1] += d * (a1 - a0);
          for (let xi = x0i + 2; xi < x1i - 1; xi++) acc[ls + xi] += d * s;
          const a2 = a1 + (x1i - x0i - 3) * s;
          acc[ls + x1i - 1] += d * (1 - a2 - am);
        }
        acc[ls + x1i] += d * am;
      }
      x = xn;
    }
  }
  // polígono plano [x0,y0,x1,y1,...] ya en píxeles
  poly(p) {
    const n = p.length;
    if (n < 6) return;
    for (let i = 0; i < n; i += 2) {
      const j = (i + 2) % n;
      this.line(p[i], p[i + 1], p[j], p[j + 1]);
    }
  }
  // Devuelve la cobertura 0..1 (Float32Array w*h)
  coverage() {
    const W = this.w, H = this.h, S = this.stride, acc = this.acc;
    const out = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      let s = 0;
      const ls = y * S, lo = y * W;
      for (let x = 0; x < W; x++) {
        s += acc[ls + x];
        const v = s < 0 ? -s : s;
        out[lo + x] = v > 1 ? 1 : v;
      }
    }
    return out;
  }
}

module.exports = { Raster };


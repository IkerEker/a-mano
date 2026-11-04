'use strict';
// Azar reproducible y ruido suave. Sin dependencias de Photoshop.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix, iy, seed) {
  let h = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(seed | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

function fade(t) { return t * t * (3 - 2 * t); }

// Ruido de valor 2D en [-1, 1]
function noise2(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = fade(x - ix), fy = fade(y - iy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  const top = a + (b - a) * fx, bot = c + (d - c) * fx;
  return (top + (bot - top) * fy) * 2 - 1;
}

function fbm2(x, y, seed, octaves) {
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let o = 0; o < (octaves || 2); o++) {
    s += noise2(x * f, y * f, seed + o * 131) * amp;
    norm += amp; amp *= 0.5; f *= 2.03;
  }
  return s / norm;
}

function noise1(x, seed) { return noise2(x, 0.37, seed); }

function gauss(rand) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function newSeed() { return (Math.random() * 0x7fffffff) | 0; }

module.exports = { mulberry32, hash2, noise2, fbm2, noise1, gauss, newSeed };


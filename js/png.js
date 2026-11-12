'use strict';
// PNG RGBA de 8 bits en memoria. Con zlib (node, paneles CEP) comprime; sin zlib, bloques sin comprimir.

let TABLE = null;
function crc32(buf, crc) {
  if (!TABLE) {
    TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; TABLE[n] = c >>> 0; }
  }
  let c = (crc == null ? 0xffffffff : crc) >>> 0;
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c >>> 0;
}
function adler32(buf) {
  let a = 1, b = 0;
  for (let i = 0; i < buf.length;) {
    const end = Math.min(buf.length, i + 3800);
    for (; i < end; i++) { a += buf[i]; b += a; }
    a %= 65521; b %= 65521;
  }
  return ((b << 16) | a) >>> 0;
}
// zlib «almacenado» (sin comprimir): válido para cualquier lector de PNG
function storeDeflate(raw) {
  const nb = Math.max(1, Math.ceil(raw.length / 65535));
  const out = new Uint8Array(2 + raw.length + nb * 5 + 4);
  out[0] = 0x78; out[1] = 0x01;
  let o = 2;
  for (let i = 0, k = 0; k < nb; k++) {
    const n = Math.min(65535, raw.length - i);
    out[o++] = k === nb - 1 ? 1 : 0;
    out[o++] = n & 255; out[o++] = n >>> 8; out[o++] = (~n) & 255; out[o++] = ((~n) >>> 8) & 255;
    out.set(raw.subarray(i, i + n), o); o += n; i += n;
  }
  const ad = adler32(raw);
  out[o++] = ad >>> 24; out[o++] = (ad >>> 16) & 255; out[o++] = (ad >>> 8) & 255; out[o++] = ad & 255;
  return out;
}
function u32(out, o, v) { out[o] = v >>> 24; out[o + 1] = (v >>> 16) & 255; out[o + 2] = (v >>> 8) & 255; out[o + 3] = v & 255; }

// rgba: Uint8Array / Uint8ClampedArray (w*h*4, alfa recta). zlib: módulo de node (opcional)
function encode(w, h, rgba, zlib, level) {
  const stride = w * 4 + 1;
  const raw = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * stride + 1);
  let z;
  if (zlib && zlib.deflateSync) { const d = zlib.deflateSync(raw, { level: level == null ? 3 : level }); z = new Uint8Array(d.buffer, d.byteOffset, d.length); }
  else z = storeDeflate(raw);
  const out = new Uint8Array(8 + 25 + 12 + z.length + 12);
  out.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  let o = 8;
  const chunk = (type, data) => {
    u32(out, o, data.length);
    for (let i = 0; i < 4; i++) out[o + 4 + i] = type.charCodeAt(i);
    out.set(data, o + 8);
    const c = crc32(out.subarray(o + 4, o + 8 + data.length)) ^ 0xffffffff;
    u32(out, o + 8 + data.length, c >>> 0);
    o += 12 + data.length;
  };
  const ihdr = new Uint8Array(13);
  u32(ihdr, 0, w); u32(ihdr, 4, h); ihdr[8] = 8; ihdr[9] = 6;
  chunk('IHDR', ihdr); chunk('IDAT', z); chunk('IEND', new Uint8Array(0));
  return out;
}

module.exports = { encode, crc32 };

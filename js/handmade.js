'use strict';
// "A mano" en modo editable: variación letra a letra que mantiene el TEXTO editable
// (tamaño, línea base, proporción, espaciado y alternativas OpenType, con deriva suave).

const R = require('./rng.js');

const isSpace = ch => /[\s\u0003]/.test(ch);
function styleAt(ranges, i) {
  for (const r of ranges) if (i >= r.from && i < r.to) return r.textStyle;
  return ranges.length ? ranges[ranges.length - 1].textStyle : {};
}
function unitVal(v, def) {
  if (v == null) return def;
  if (typeof v === 'number') return v;
  return typeof v._value === 'number' ? v._value : def;
}

// p: { pulso 0..1, prisa 0..1, alternates bool }
function varyTextStyles(text, ranges, p, seed) {
  const rand = R.mulberry32(seed ^ 0x5bd1e995);
  const L = p.pulso, pr = p.prisa;
  const out = [];
  let wordK = 0, wordS = 1, wordB = 0;
  for (let i = 0; i < text.length; i++) {
    const st = JSON.parse(JSON.stringify(styleAt(ranges, i)));
    delete st.impliedFontSize; delete st.impliedLeading; delete st.impliedBaselineShift;
    const ch = text[i];
    if (isSpace(ch) || i === 0) { // nueva palabra: su propio tamaño y altura
      wordK++;
      wordS = Math.exp(R.gauss(rand) * (0.03 + 0.08 * L));
      wordB = R.gauss(rand) * (0.03 + 0.07 * L);
    }
    if (!isSpace(ch)) {
      const size = unitVal(st.size, null);
      const ds = wordS * Math.exp(0.1 * L * R.noise1(i * 0.31, seed) + 0.09 * L * R.gauss(rand)) - 1;
      if (size != null) st.size = { _unit: (st.size && st.size._unit) || 'pointsUnit', _value: Math.max(0.5, size * (1 + ds)) };
      const sz = size != null ? size : 12;
      const db = sz * (wordB + 0.07 * L * R.noise1(i * 0.17 + 40, seed) + 0.05 * L * R.gauss(rand));
      const bs = unitVal(st.baselineShift, 0);
      st.baselineShift = { _unit: (st.baselineShift && st.baselineShift._unit) || 'pointsUnit', _value: bs + db };
      const hs = typeof st.horizontalScale === 'number' ? st.horizontalScale : 100;
      const vs = typeof st.verticalScale === 'number' ? st.verticalScale : 100;
      st.horizontalScale = Math.max(30, hs * (1 + 0.12 * L * R.gauss(rand) - 0.05 * pr));
      st.verticalScale = Math.max(30, vs * (1 + 0.09 * L * R.gauss(rand)));
      if (p.alternates && rand() < 0.35) st.stylisticAlternates = true;
    }
    const tr = typeof st.tracking === 'number' ? st.tracking : 0;
    st.tracking = Math.round(tr + 70 * L * R.gauss(rand) - 18 * pr + (isSpace(ch) ? 120 + 80 * L * Math.abs(R.gauss(rand)) : 0));
    out.push({ _obj: 'textStyleRange', from: i, to: i + 1, textStyle: st });
  }
  return out;
}

module.exports = { varyTextStyles };


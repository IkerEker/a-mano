// Construye sim.js para el navegador: otf.js + motor de texto falso + Photoshop simulado + fuentes
const fs = require('fs');
const path = require('path');
const otf = fs.readFileSync(path.join(__dirname, '..', 'otf.js'), 'utf8');
let ft = fs.readFileSync(path.join(__dirname, '..', 'fakeText.js'), 'utf8');
ft = ft.replace("const fs = require('fs');\nconst O = require(require('path').join(__dirname, 'otf.js'));", 'const O = window.__otf;');
ft = ft.replace(/if \(!cache\[ps\]\) \{[^\n]*\n/, "if (!cache[ps]) { const b = window.__fontBufs[ps] || window.__fontBufs['Poppins-Bold']; cache[ps] = O.parseFont(b, 0); }\n");
ft = ft.replace('const comps = [];', 'const comps = [], chars = [];');
ft = ft.replace('if (c) comps.push(c);', 'if (c) { comps.push(c); chars.push(i); }');
ft = ft.replace("return { _obj: 'pathClass', pathComponents: comps };", "return { _obj: 'pathClass', pathComponents: comps, chars };");
ft = ft.replace('module.exports = { layout, font, FONTFILES };', 'window.__fakeText = { layout, font, FONTS: FONTFILES };');
if (!/__fontBufs/.test(ft) || !/chars\.push/.test(ft)) throw new Error('reemplazo fallido');
const FONTS = require(path.join(__dirname, '..', 'fakeText.js')).FONTFILES;
let fonts = 'window.__fontBufs = {};\n(function(){ const d = s => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; };\n';
for (const [k, p] of Object.entries(FONTS)) fonts += `window.__fontBufs[${JSON.stringify(k)}] = d(${JSON.stringify(fs.readFileSync(p).toString('base64'))});\n`;
fonts += '})();\n';
const out = [fonts, '(function(){ const module = { exports: {} }; const exports = module.exports;\n' + otf + '\nwindow.__otf = module.exports; })();', '(function(){\n' + ft + '\n})();', fs.readFileSync(path.join(__dirname, 'psim.js'), 'utf8')].join('\n');
fs.writeFileSync(path.join(__dirname, 'sim.js'), out);
console.log('sim.js', (out.length / 1e6).toFixed(2), 'MB');

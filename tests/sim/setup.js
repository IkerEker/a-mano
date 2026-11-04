// Abre el panel real (dist/plugin) en Chromium con Photoshop simulado (psim.js). Uso: const S = await require('./setup.js').open()
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PLUG = path.join(__dirname, '..', '..', 'dist', 'plugin');
const OUT = path.join(__dirname, 'out');

const HOST_CSS = `:root{--uxp-host-text-color:#ddd;--uxp-host-text-color-secondary:#999;--uxp-host-font-size:12px;--uxp-host-font-size-smaller:11px;--uxp-host-background-color:#323232;--uxp-host-border-color:#555;--uxp-host-label-text-color:#aaa;--uxp-host-link-text-color:#6cf;--uxp-host-widget-hover-background-color:#3d3d3d}
body{font-family:sans-serif;width:300px} sp-button{display:block;padding:6px;margin-top:6px;border-radius:12px;background:#4a4a4a;text-align:center;cursor:pointer} sp-button[variant=cta]{background:#1473e6;color:#fff} sp-checkbox{display:block} sp-checkbox::before{content:'☐ '} sp-slider{display:block;font-size:11px;color:#aaa}`;

async function open(docW, docH) {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 330, height: 1250 } });
  const logs = [];
  page.on('console', m => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await page.route('http://sim.local/**', async route => {
    const u = new URL(route.request().url());
    const f = u.pathname.slice(1) || 'index.html';
    if (f === 'index.html') {
      let html = fs.readFileSync(path.join(PLUG, 'index.html'), 'utf8');
      html = html.replace('<script src="main.js"></script>', `<style>${HOST_CSS}</style><script src="sim.js"></script><script>SIM.newDoc(${docW || 3000}, ${docH || 2160}, 300);</script><script src="main.js"></script>`);
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    }
    if (f === 'sim.js') return route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(path.join(__dirname, 'sim.js'), 'utf8') });
    const p = path.join(PLUG, f);
    if (fs.existsSync(p)) return route.fulfill({ status: 200, contentType: f.endsWith('.css') ? 'text/css' : 'application/javascript', body: fs.readFileSync(p, 'utf8') });
    return route.fulfill({ status: 404, body: '' });
  });
  await page.goto('http://sim.local/index.html');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const $ = id => document.getElementById(id);
    window.T = {
      text(v) { const t = $('txt'); t.value = v; t.dispatchEvent(new Event('input')); },
      style(word, tier, nth) {
        const t = $('txt'); const v = t.value; let i = -1, k = 0;
        do { i = v.indexOf(word, i + 1); } while (i >= 0 && k++ < (nth || 0));
        if (i < 0) throw new Error('no está ' + word);
        t.focus(); t.setSelectionRange(i, i + word.length); t.dispatchEvent(new Event('select'));
        $({ bold: 'stBold', hero: 'stHero', small: 'stSmall', normal: 'stNormal', neg: 'stNeg', sub: 'stSub', negv: 'stNegv', clean: 'stClean' }[tier]).click();
      },
      click(id) { $(id).click(); },
      seg(id, v) { $(id).querySelector('[data-v="' + v + '"]').click(); },
      check(id, v) { const e = $(id); e.checked = v; e.dispatchEvent(new Event('change')); },
      slider(id, v) { const e = $(id); e.value = v; e.dispatchEvent(new Event('input')); },
      status() { const e = $('status'); return { text: e.textContent, cls: e.className }; },
      chips() { return Array.from(document.querySelectorAll('#board .chip')).map(c => c.className.replace('chip ', '') + ':' + c.textContent); },
      busy() { const b = $('btnGo'); return b.hasAttribute('disabled'); },
      font(q, which) { const p = which || 'fp1'; $(p + '-btn').click(); const i = $(p + '-q'); i.value = q; i.dispatchEvent(new Event('input')); },
      pickFirst(which) { const r = document.querySelector('#' + (which || 'fp1') + '-list .fp-row'); if (r) r.click(); return r && r.textContent; },
      color(i, hex) { require('photoshop').app.foregroundColor = { rgb: { hexValue: hex.replace('#', '') } }; $('fg' + i).click(); }
    };
  });
  const run = async (fn, arg) => page.evaluate(fn, arg);
  const waitDone = async () => {
    for (let i = 0; i < 600; i++) {
      await page.waitForTimeout(50);
      const s = await run(() => ({ st: T.status(), busy: T.busy() }));
      if (!s.busy && /ok|err/.test(s.st.cls)) return s.st;
    }
    return { text: 'TIEMPO AGOTADO', cls: 'err' };
  };
  const refresh = async () => { await page.evaluate(() => document.body.dispatchEvent(new Event('mouseenter'))); await page.waitForTimeout(400); };
  const snap = async (name, scale) => {
    const url = await run(s => SIM.render(s), scale || 0.3);
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  };
  const newDoc = async (w, h, bits) => run(([w, h, b]) => { SIM.newDoc(w, h, 300); if (b) SIM.doc().bitsPerChannel = b; SIM.calls = 0; }, [w, h, bits]);
  const font = async (q, which) => { await run(([q, w]) => T.font(q, w), [q, which]); await page.waitForTimeout(260); return run(w => T.pickFirst(w), which); };
  const report = [];
  const rec = async (name, st, expectErr) => {
    const info = await run(() => ({ tree: SIM.tree(), errors: SIM.errors.splice(0) }));
    report.push({ name, status: st.text, ok: expectErr ? /err/.test(st.cls) : /ok/.test(st.cls), errors: info.errors });
    console.log('\n== ' + name + ' :: ' + st.text + '\n' + info.tree + (info.errors.length ? '\nERRORES: ' + info.errors.join(' | ') : ''));
  };
  const close = async () => {
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
    const errs = logs.filter(l => /PAGEERROR/.test(l));
    if (errs.length) console.log(errs.join('\n'));
    await browser.close();
    return report;
  };
  return { page, run, waitDone, refresh, snap, newDoc, font, rec, close, logs, OUT };
}

module.exports = { open, OUT };

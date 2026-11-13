#!/usr/bin/env python3
"""Grumos de pintura (solo graffiti).  python3 tools/grumos.py [hoja_de_comprobación.png]

Lee las fotos de superficie pintada de referencias/texturas y recorta de ellas BULTOS SUELTOS (no se usa ninguna
foto entera ni se superpone): pompas y granos de la película, gotas gordas ya secas, grumos y costras. Cada uno se
guarda como un sello pequeño de sombreado —cuánto aclara o oscurece el bulto bajo la luz—, con el borde fundido a
nada, en js/grumosdata.js. render.applyRelief los estampa solo donde la pintura va cargada.

Cómo se saca cada uno:
  1. se quita la luz general de la foto (se divide por la foto muy desenfocada): queda lo que sube o baja;
  2. se buscan sitios donde el relieve se concentra en un redondel de radio R y alrededor está tranquilo;
  3. de dónde viene la luz en la foto se deduce de los propios bultos (el lado claro) y cada recorte se voltea para
     que la luz le venga de arriba a la izquierda, como en el plugin; se descartan los hoyos;
  4. se recorta, se funde el borde con una ventana redonda, se iguala la fuerza y se reduce al tamaño del sello.
"""
import os, sys, base64
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, 'referencias', 'texturas')
OUT = os.path.join(ROOT, 'js', 'grumosdata.js')

# clases de sello: lado en px
CLS = [('S', 20), ('M', 36), ('L', 56)]
# qué se saca de cada foto: (clase, radio del bulto en px de la foto, cuántos, exigir que sea bulto y no hoyo)
PLAN = [
    ('pintura_granos_2.jpg', [('S', 8, 7, True), ('S', 12, 6, True), ('M', 20, 2, True)]),
    ('pared_piel_4.jpg', [('S', 7, 4, True), ('S', 20, 3, False)]),
    ('pintura_grumos_1.jpg', [('S', 11, 4, True), ('M', 22, 5, True), ('M', 32, 5, True), ('L', 48, 4, True), ('L', 68, 4, True)]),
    ('pintura_grumos_3.jpg', [('M', 22, 4, True), ('M', 32, 4, True), ('L', 52, 3, True), ('L', 76, 3, True)]),
]


def smooth01(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def candidates(h, R, coarse=False):
    # (coarse: se busca el relieve de conjunto —la panza de una gota gorda—, no la miga suelta)
    E = ndi.gaussian_filter(h, R / 5.0) ** 2 if coarse else h * h
    score = ndi.gaussian_filter(E, 0.5 * R) - 0.8 * ndi.gaussian_filter(E, 1.7 * R)
    mx = ndi.maximum_filter(score, size=int(3 * R) | 1)
    m = int(1.6 * R) + 2
    ys, xs = np.nonzero((score == mx) & (score > 0))
    out = [(score[y, x], x, y) for y, x in zip(ys, xs) if m <= x < h.shape[1] - m and m <= y < h.shape[0] - m]
    out.sort(reverse=True)
    return out


def patch(h, x, y, R):
    H = int(round(1.45 * R))
    for _ in range(2):          # centrar en el relieve
        p = h[y - H:y + H + 1, x - H:x + H + 1]
        yy, xx = np.mgrid[-H:H + 1, -H:H + 1]
        w = np.abs(p) * (xx * xx + yy * yy < R * R)
        s = w.sum()
        if s < 1e-6: break
        dx, dy = int(round((w * xx).sum() / s)), int(round((w * yy).sum() / s))
        if dx == 0 and dy == 0: break
        x, y = x + dx, y + dy
        if not (H + 1 <= x < h.shape[1] - H - 1 and H + 1 <= y < h.shape[0] - H - 1): return None
    p = h[y - H:y + H + 1, x - H:x + H + 1].astype(np.float32)
    yy, xx = np.mgrid[-H:H + 1, -H:H + 1]
    rho = np.sqrt(xx * xx + yy * yy) / H
    ring = (rho > 0.8) & (rho < 1.0)
    p = p - p[ring].mean()
    inner, outer = (p * p)[rho < 0.62].mean(), (p * p)[ring].mean()
    aw = np.abs(p) * (rho < 0.75)
    dip = np.array([(p * xx * (rho < 0.75)).sum(), (p * yy * (rho < 0.75)).sum()]) / max(1e-6, aw.sum() * R)
    # liso: cuánto del relieve es forma (panza, canto) y cuánto miga suelta
    core = rho < 0.62
    fine = p - ndi.gaussian_filter(p, max(1.0, R / 6.0))
    liso = 1 - min(1.0, (fine * fine)[core].mean() / max(1e-9, (p * p)[core].mean()))
    return dict(x=x, y=y, R=R, p=p * (1 - smooth01(0.6, 1.0, rho)), iso=inner / max(1e-9, outer), dip=dip, liso=liso)


def main():
    rng = np.random.RandomState(7)
    tiles = {c: [] for c, _ in CLS}
    size = dict(CLS)
    for fname, plan in PLAN:
        I = np.asarray(Image.open(os.path.join(REF, fname)).convert('L'), dtype=np.float32) / 255
        got = []          # (x, y, R) ya cogidos en esta foto
        # ---- de dónde viene la luz: el lado claro de los bultos de tamaño medio
        Rm = plan[len(plan) // 2][1]
        hm = I / np.maximum(1e-3, ndi.gaussian_filter(I, 2.5 * Rm)) - 1
        L = np.zeros(2)
        for sc, x, y in candidates(hm, Rm)[:80]:
            q = patch(hm, x, y, Rm)
            if q is not None: L += q['dip']
        L /= max(1e-9, np.hypot(*L))
        flipx, flipy = L[0] > 0.3, L[1] > 0.3
        print('%s  luz desde (%.2f, %.2f)%s%s' % (fname, L[0], L[1], '  ↔' if flipx else '', '  ↕' if flipy else ''))
        for cls, R, n, bump in plan:
            h = I / np.maximum(1e-3, ndi.gaussian_filter(I, 2.5 * R)) - 1
            cand = []
            big = cls != 'S'
            for sc, x, y in candidates(h, R, big)[:n * 30]:
                q = patch(h, x, y, R)
                if q is None or q['iso'] < (1.6 if big else 2.2): continue
                if big and q['liso'] < 0.55: continue          # costra o miga: no es pintura
                along = float(q['dip'] @ L)
                if bump and along < 0.06: continue          # hoyo o plano: fuera
                if any(np.hypot(q['x'] - gx, q['y'] - gy) < 0.9 * (R + gR) for gx, gy, gR in got): continue
                q['q'] = sc * min(6.0, q['iso']) * (0.5 + min(1.0, along * 4) if bump else 1) * (q['liso'] ** 3 if big else 1)
                cand.append(q)
            cand.sort(key=lambda q: -q['q'])
            k = 0
            for q in cand:
                if k >= n: break
                if any(np.hypot(q['x'] - gx, q['y'] - gy) < 0.9 * (R + gR) for gx, gy, gR in got): continue
                got.append((q['x'], q['y'], R)); k += 1
                p = q['p']
                if flipx: p = p[:, ::-1]
                if flipy: p = p[::-1, :]
                p = p / max(0.02, np.percentile(np.abs(p), 98.5))          # todos con la misma fuerza
                T = size[cls]
                im = Image.fromarray(np.clip(p * 0.5 + 0.5, 0, 1) * 255).convert('F').resize((T, T), Image.LANCZOS)
                t = (np.asarray(im, dtype=np.float32) / 255 - 0.5) * 2
                yy, xx = np.mgrid[0:T, 0:T]
                rho = np.hypot(xx - (T - 1) / 2, yy - (T - 1) / 2) / (T / 2)
                t = t * (1 - smooth01(0.86, 1.0, rho))                     # (que el canto del sello sea cero de verdad)
                tiles[cls].append(np.clip(np.round(t * 127), -127, 127).astype(np.int8))
            print('   %s R=%d: %d de %d' % (cls, R, k, n))
    # ---- se barajan dentro de cada clase (para que las fotos queden mezcladas) y se escribe
    raw = b''
    for c, T in CLS:
        order = rng.permutation(len(tiles[c]))
        tiles[c] = [tiles[c][i] for i in order]
        for t in tiles[c]: raw += (t.astype(np.int16) + 128).astype(np.uint8).tobytes()
    b64 = base64.b64encode(raw).decode('ascii')
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write("'use strict';\n")
        f.write('// GRUMOS de pintura: sellos de sombreado de bultos sueltos (pompas, granos, gotas gordas, costras) recortados de\n')
        f.write('// las fotos de referencias/texturas. Generado por tools/grumos.py: no editar a mano.\n')
        f.write('// cls: [lado del sello en px, cuántos]; d: los sellos seguidos, un byte por píxel (128 = nada, más = luz, menos =\n')
        f.write('// sombra; luz desde arriba a la izquierda), en base64\n')
        f.write('module.exports = { cls: %s, d: \'%s\' };\n' % (str([[T, len(tiles[c])] for c, T in CLS]).replace(' ', ''), b64))
    print('%s: %d sellos, %d KB' % (os.path.relpath(OUT, ROOT), sum(len(v) for v in tiles.values()), os.path.getsize(OUT) // 1024))
    if len(sys.argv) > 1:      # hoja de comprobación
        Z, pad = 4, 6
        rows = [tiles[c] for c, _ in CLS]
        Wd = max(len(r) * (size[c] * Z + pad) for r, (c, _) in zip(rows, CLS)) + pad
        Hd = sum(size[c] * Z + pad for c, _ in CLS) + pad
        sheet = Image.new('L', (Wd, Hd), 128)
        y = pad
        for r, (c, T) in zip(rows, CLS):
            x = pad
            for t in r:
                sheet.paste(Image.fromarray(np.clip(128 + t.astype(np.float32) * 0.9, 0, 255).astype(np.uint8)).resize((T * Z, T * Z), Image.BICUBIC), (x, y)); x += T * Z + pad
            y += T * Z + pad
        sheet.save(sys.argv[1])


if __name__ == '__main__':
    main()

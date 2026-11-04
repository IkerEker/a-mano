#!/usr/bin/env python3
"""Saca de TRAZOS/ las «cintas» de textura (cada trazo recto, enderezado) y el grano de papel.

Uso: python3 tools/extract_textures.py [--preview DIR]
Genera js/texdata.js (cintas en 8 bits, base64) que usa el motor de pintado (ink.js).

Cada cinta: filas = a lo largo del trazo (de inicio a final), columnas = a lo ancho.
Se guarda la densidad de tinta (0 = papel, 255 = tinta plena) separada del color y del papel.
"""
import os, sys, json, base64, glob
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TR = os.path.join(ROOT, 'TRAZOS')

# archivo (o patrón) -> familia de textura, orientación del inicio del trazo y ajustes
#   start: 'top' | 'left' | 'auto'  (por dónde empieza el trazo)
#   E: cuánto se toma a cada lado más allá del medio ancho (para bordes rotos y polvo)
SOURCES = [
    ('AGUADAS/*', 'aguada', 'top', 1.55),
    ('CERAS/*', 'cera', 'top', 1.45),
    ('GUACHE/*', 'guache', 'top', 1.4),
    ('OLEO/*', 'oleo', 'top', 1.4),
    ('LAPIZ/Gemini_Generated_Image_dgy3xxdgy3xxdgy3.jpg', 'lapiz', 'top', 1.5),
    ('LAPIZ/Gemini_Generated_Image_fd6so0fd6so0fd6s.jpg', 'lapiz', 'top', 1.5),
    ('LAPIZ/Gemini_Generated_Image_so6zmwso6zmwso6z.jpg', 'lapiz', 'top', 1.5),
    ('LAPIZ/Gemini_Generated_Image_u2c2txu2c2txu2c2.jpg', 'lapiz', 'top', 1.5),
    ('LAPIZ/Gemini_Generated_Image_4vfeh34vfeh34vfe.jpg', 'carbon', 'top', 1.9),
    ('LAPIZ/Gemini_Generated_Image_i1m1v9i1m1v9i1m1.jpg', 'carbon', 'top', 1.9),
    ('LAPIZ/Gemini_Generated_Image_uvge2nuvge2nuvge.jpg', 'carbon', 'top', 1.9),
    ('Gemini_Generated_Image_4k0x3g4k0x3g4k0x.jpg', 'carbon', 'left', 1.9),
    ('Gemini_Generated_Image_1m2vhi1m2vhi1m2v.jpg', 'pincel', 'top', 1.4),
    ('Gemini_Generated_Image_dd9o77dd9o77dd9o.jpg', 'pincel', 'top', 1.4),
    ('Gemini_Generated_Image_fooa8gfooa8gfooa.jpg', 'pincel', 'top', 1.4),
    ('Gemini_Generated_Image_gtyi67gtyi67gtyi.jpg', 'pincel', 'top', 1.4),
    ('Gemini_Generated_Image_i9od48i9od48i9od.jpg', 'pincel', 'top', 1.4),
    ('Gemini_Generated_Image_ogccn5ogccn5ogcc.jpg', 'pincel', 'top', 1.4),
    ('Gemini_Generated_Image_uoqx5fuoqx5fuoqx.jpg', 'pincel', 'top', 1.4),
    ('Gemini_Generated_Image_xw72ktxw72ktxw72.jpg', 'pincel', 'top', 1.4),
    ('Pincelada gris sobre blanco.png', 'brocha', 'top', 1.35),
    ('Pincelada vertical gris sobre blanco.png', 'brocha', 'top', 1.35),
    ('Cuatro pinceladas rojas sobre blanco.png', 'pincel', 'left', 1.4),
    ('Franjas de pintura roja sobre blanco.png', 'pincel', 'left', 1.4),
    ('Pinceladas rojas sobre blanco.png', 'pincel', 'left', 1.4),
    ('Pinceladas azules sobre blanco.png', 'pincel', 'left', 1.4),
    ('Trazos azules sobre fondo blanco.png', 'pincel', 'left', 1.4),
    ('Muestras de pinceladas azules en blanco.png', 'pincel', 'left', 1.4),
    ('Ocho pinceladas azules sobre blanco.png', 'pincel', 'left', 1.4),
    ('Trazos azules sobre fondo blanco (1).png', 'pincelfino', 'left', 1.4),
    ('Cinco trazos azules sobre blanco.png', 'gastado', 'left', 1.45),
    ('Cinco trazos rojos sobre blanco.png', 'gastado', 'left', 1.45),
    ('Cuatro trazos rojos texturizados.png', 'gastado', 'left', 1.45),
    ('Tres trazos azules texturizados.png', 'gastado', 'left', 1.45),
    ('Cinco líneas azules dibujadas a mano.png', 'rotu', 'left', 1.6),
    ('Líneas azules sobre fondo blanco.png', 'rotu', 'left', 1.6),
    ('Cuatro trazos negros horizontales.png', 'rotu', 'left', 1.6),
    ('Tres líneas negras sobre fondo blanco.png', 'rotu', 'left', 1.6),
    ('Cinco líneas azules sobre blanco.png', 'boli', 'left', 2.2),
    ('Líneas azules sobre papel blanco.png', 'boli', 'left', 2.2),
    ('Líneas horizontales dibujadas a mano.png', 'boli', 'left', 2.2),
    ('Líneas rojas sobre papel blanco.png', 'boli', 'left', 2.2),
    ('Cuatro líneas rojas dibujadas a mano*.png', 'boli', 'left', 2.2),
]
# resolución de la cinta: el medio ancho medio del trazo ocupa MH columnas
MH = {'boli': 3.0, 'rotu': 7.0, 'lapiz': 10.0, 'carbon': 11.0, 'cera': 20.0, 'oleo': 16.0, 'aguada': 15.0, 'pincel': 14.0, 'guache': 14.0, 'pincelfino': 12.0}
MH_DEF = 10.0
MAXROWS = 520
# como mucho estas cintas por familia (las más distintas entre sí)
CAP = {'boli': 8, 'rotu': 3, 'gastado': 0, 'oleo': 0, 'lapiz': 10, 'carbon': 10, 'cera': 12, 'aguada': 12, 'guache': 12, 'pincel': 14, 'pincelfino': 5, 'brocha': 2}


def load(path):
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.float32) / 255.0
    return im


def density(im):
    """densidad de tinta 0..1, independiente del color y del papel"""
    # papel: máximo local (lo más claro) suavizado, por canal
    # (a baja resolución, con una ventana grande: las pinceladas anchas no cuentan como papel)
    H, W = im.shape[:2]
    f = 8
    small = im[:H - H % f, :W - W % f].reshape(H // f, f, W // f, f, 3).mean((1, 3))
    bgs = np.stack([ndi.gaussian_filter(ndi.maximum_filter(small[..., c], size=65), 8) for c in range(3)], -1)
    bg = np.stack([ndi.zoom(bgs[..., c], (H / bgs.shape[0], W / bgs.shape[1]), order=1)[:H, :W] for c in range(3)], -1)
    if bg.shape[:2] != (H, W):
        bg = np.pad(bg, ((0, H - bg.shape[0]), (0, W - bg.shape[1]), (0, 0)), mode='edge')
    bg = np.maximum(bg, 0.3)
    rel = np.clip(im / bg, 0, 1)
    d = 1 - rel.min(axis=2)
    # suelo de ruido del papel (grano, JPEG)
    floor = np.percentile(d, 55)
    d = np.clip((d - floor - 0.025) / (1 - floor - 0.025), 0, 1)
    return d


def components(d, start):
    m = d > 0.16
    m = ndi.binary_closing(m, iterations=3)
    m = ndi.binary_opening(m, iterations=2)
    lab, n = ndi.label(m)
    out = []
    H, W = d.shape
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) < 1500:
            continue
        if ys.min() <= 2 or xs.min() <= 2 or ys.max() >= H - 3 or xs.max() >= W - 3:
            continue                         # borde de la hoja o sombra, no un trazo
        pts = np.stack([xs, ys], 1).astype(np.float64)
        c = pts.mean(0)
        cov = np.cov((pts - c).T)
        ev, evec = np.linalg.eigh(cov)
        ax = evec[:, 1]                      # eje largo
        L = 4 * np.sqrt(ev[1]); Wd = 4 * np.sqrt(max(ev[0], 1e-6))
        if L / Wd < 4.5:
            continue                         # no es un trazo recto
        # el eje apunta hacia el final del trazo
        if start == 'top' and ax[1] < 0: ax = -ax
        if start == 'left' and ax[0] < 0: ax = -ax
        out.append({'lab': i, 'c': c, 'ax': ax, 'n': len(ys)})
    return lab, out


def sample(d, x, y):
    return ndi.map_coordinates(d, [y, x], order=1, mode='constant', cval=0.0)


def strip_of(d, lab, comp, E, fam):
    c, ax = comp['c'], comp['ax']
    nrm = np.array([-ax[1], ax[0]])
    own = lab == comp['lab']
    ys, xs = np.nonzero(own)
    t = (xs - c[0]) * ax[0] + (ys - c[1]) * ax[1]
    s = (xs - c[0]) * nrm[0] + (ys - c[1]) * nrm[1]
    t0, t1 = np.percentile(t, 0.2), np.percentile(t, 99.8)
    # medio ancho: mediana de la anchura por tramos
    bins = np.linspace(t0, t1, 60)
    widths = []
    for a, b in zip(bins[:-1], bins[1:]):
        k = (t >= a) & (t < b)
        if k.sum() > 20:
            widths.append(np.percentile(s[k], 95) - np.percentile(s[k], 5))
    mh = float(np.median(widths)) / 2 if widths else 5.0
    if mh < 0.8:
        return None
    # zona propia (para no coger trozos de los trazos vecinos), con margen para polvo y bordes
    near = ndi.binary_dilation(own, iterations=int(max(2, mh * (E - 1) + 3)))
    others = (lab > 0) & ~own
    near &= ~ndi.binary_dilation(others, iterations=3)
    dd = d * ndi.gaussian_filter(near.astype(np.float32), 1.5)
    # centro a lo largo (sigue las curvas suaves del trazo)
    ext = mh * 0.25
    T = np.arange(t0 - ext, t1 + ext, 1.0)
    S = np.arange(-mh * E, mh * E, 1.0)
    X = c[0] + T[:, None] * ax[0] + S[None, :] * nrm[0]
    Y = c[1] + T[:, None] * ax[1] + S[None, :] * nrm[1]
    G = sample(dd, X, Y)
    wsum = G.sum(1) + 1e-6
    cen = (G * S[None, :]).sum(1) / wsum
    good = G.sum(1) > G.sum(1).max() * 0.15
    if good.sum() < 10:
        return None
    cen = np.interp(np.arange(len(T)), np.nonzero(good)[0], cen[good])
    cen = ndi.gaussian_filter1d(cen, max(3, mh * 1.5))
    # cinta enderezada, a la resolución pedida
    mhc = MH.get(fam, MH_DEF)
    step = mh / mhc                                    # px de la imagen por columna
    ncol = int(round(2 * E * mhc))
    cols = (np.arange(ncol) - (ncol - 1) / 2) * step
    rows_len = (T[-1] - T[0])
    nrow = int(rows_len / step)
    ustep = 1.0
    if nrow > MAXROWS:
        ustep = nrow / MAXROWS
        nrow = MAXROWS
    Tr = T[0] + np.arange(nrow) * step * ustep
    cenr = np.interp(Tr, T, cen)
    X = c[0] + Tr[:, None] * ax[0] + (cols[None, :] + cenr[:, None]) * nrm[0]
    Y = c[1] + Tr[:, None] * ax[1] + (cols[None, :] + cenr[:, None]) * nrm[1]
    if ustep > 1.0:
        # promedio a lo largo para no perder información al comprimir
        acc = np.zeros_like(X)
        K = 3
        for k in range(K):
            off = (k / K - 0.5) * step * ustep
            acc += sample(dd, X + off * ax[0], Y + off * ax[1])
        A = acc / K
    else:
        A = sample(dd, X, Y)
    # recorta filas vacías al principio y al final
    rs = A.sum(1)
    on = np.nonzero(rs > rs.max() * 0.02)[0]
    if len(on) < 8:
        return None
    A = A[max(0, on[0] - 2): on[-1] + 3]
    # normaliza: tinta plena = 1 (percentil alto del núcleo)
    core = A[:, ncol // 2 - int(mhc * 0.6): ncol // 2 + int(mhc * 0.6) + 1]
    # se normaliza por arriba del todo: así se conserva la veta (las zonas con más pigmento siguen siendo más oscuras)
    # (ceras y óleo: por la mediana alta, que las barras claras cubran igual que las oscuras)
    p = np.percentile(core, 80 if fam in ('cera', 'oleo') else 99.3)
    if p < 0.05:
        return None
    A = np.clip(A / p, 0, 1)
    # quita colas finas en los extremos (restos del escaneo que hacían «biberones» al final del trazo):
    # el trazo empieza donde la fila ya tiene al menos media anchura, y se deja el redondeo del remate
    wid = (A > 0.3).sum(1).astype(np.float32)
    medw = np.median(wid[wid > 0]) if (wid > 0).any() else 0
    if medw > 0:
        okr = np.nonzero(wid >= medw * 0.5)[0]
        if len(okr) >= 8:
            keep = int(round(mhc * 0.7))
            a0 = max(0, okr[0] - keep); a1 = min(len(A), okr[-1] + 1 + keep)
            A = A[a0:a1]
    # descarta lo que no es un trazo limpio: tinta fuerte en los bordes de la cinta (vecinos, sombras)
    edge = np.concatenate([A[:, :max(1, int(ncol * 0.12))], A[:, -max(1, int(ncol * 0.12)):]], 1).mean()
    if edge > 0.22 * A[:, ncol // 2 - 2: ncol // 2 + 3].mean():
        return None
    return {'fam': fam, 'a': A.astype(np.float32), 'mh': mhc, 'ar': ustep, 'src_mh': mh}


def paper_tile(paths=None, size=256):
    """grano de papel de dibujo, repetible sin costuras: ruido filtrado en frecuencia (dientes de 4-14 px,
    algo alargados en horizontal, como la fibra), más una pizca de poro fino"""
    rng = np.random.default_rng(11)
    fy = np.fft.fftfreq(size)[:, None]; fx = np.fft.fftfreq(size)[None, :]
    r = np.sqrt((fx * 0.8) ** 2 + (fy * 1.15) ** 2) + 1e-9
    band = np.exp(-((np.log(r) - np.log(1 / 7.5)) ** 2) / (2 * 0.45 ** 2))
    fine = 0.25 * np.exp(-((np.log(r) - np.log(1 / 2.6)) ** 2) / (2 * 0.35 ** 2))
    noise = np.fft.fft2(rng.standard_normal((size, size)))
    t = np.real(np.fft.ifft2(noise * (band + fine)))
    t = (t - t.mean()) / (t.std() + 1e-6)
    # dientes: los altos se aplanan (el papel aguanta arriba), los valles son hondos
    t = np.tanh(t * 0.9)
    return np.clip(0.5 + t * 0.48, 0, 1)


def main():
    preview = None
    if '--preview' in sys.argv:
        preview = sys.argv[sys.argv.index('--preview') + 1]
        os.makedirs(preview, exist_ok=True)
    strips = []
    for pat, fam, start, E in SOURCES:
        if CAP.get(fam, 8) == 0:
            continue                      # familia que ya no se usa (p. ej. el rotulador es procedural)
        files = sorted(glob.glob(os.path.join(TR, pat)))
        if not files:
            print('falta', pat); continue
        for f in files:
            d = density(load(f))
            lab, comps = components(d, start)
            got = 0
            for comp in comps:
                s = strip_of(d, lab, comp, E, fam)
                if s is None: continue
                s['src'] = os.path.relpath(f, TR)
                strips.append(s); got += 1
            print('%-60s %-10s %d' % (os.path.relpath(f, TR)[:60], fam, got))
    # papel (de las hojas de acuarela y de lápiz, que tienen grano)
    paper = paper_tile()
    if '--paper-only' in sys.argv:
        Image.fromarray((paper * 255).astype(np.uint8)).save(os.path.join(preview, 'paper.png')); return
    fams = {}
    for s in strips: fams.setdefault(s['fam'], []).append(s)
    # reparto: de cada archivo, por turnos, hasta el tope de la familia
    keep = []
    for fam, ss in fams.items():
        bysrc = {}
        for s in ss: bysrc.setdefault(s['src'], []).append(s)
        order = []
        lists = list(bysrc.values())
        while any(lists):
            for l in lists:
                if l: order.append(l.pop(0))
        fams[fam] = order[:CAP.get(fam, 8)]
        keep += fams[fam]
    strips = keep
    print({k: len(v) for k, v in fams.items()})
    # salida JS
    out = []
    total = 0
    for s in strips:
        a = np.round(s['a'] * 255).astype(np.uint8)
        total += a.size
        out.append({'f': s['fam'], 'w': int(a.shape[1]), 'h': int(a.shape[0]), 'mh': s['mh'], 'ar': round(float(s['ar']), 4),
                    'd': base64.b64encode(a.tobytes()).decode('ascii')})
    pj = None
    if paper is not None:
        pa = np.round(paper * 255).astype(np.uint8)
        pj = {'w': pa.shape[1], 'h': pa.shape[0], 'd': base64.b64encode(pa.tobytes()).decode('ascii')}
    js = "'use strict';\n// Generado por tools/extract_textures.py a partir de TRAZOS/. No editar a mano.\n"
    js += 'module.exports = ' + json.dumps({'strips': out, 'paper': pj}, separators=(',', ':')) + ';\n'
    open(os.path.join(ROOT, 'js', 'texdata.js'), 'w').write(js)
    print('cintas:', len(out), 'bytes crudos:', total, 'js:', len(js))
    if preview:
        for fam, ss in fams.items():
            hmax = max(s['a'].shape[0] for s in ss)
            sheet = np.ones((hmax, sum(s['a'].shape[1] + 6 for s in ss)), np.float32)
            x = 0
            for s in ss:
                h, w = s['a'].shape
                sheet[:h, x:x + w] = 1 - s['a']; x += w + 6
            Image.fromarray((sheet * 255).astype(np.uint8)).save(os.path.join(preview, 'fam_%s.png' % fam))
        if paper is not None:
            Image.fromarray((paper * 255).astype(np.uint8)).save(os.path.join(preview, 'paper.png'))


if __name__ == '__main__':
    main()

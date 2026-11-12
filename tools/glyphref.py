"""Letras de referencia (escritura real) -> esqueletos de trazo para js/refglyphs.js

  python3 tools/glyphref.py annotate IMG OUT.png      piezas de tinta numeradas (para hacer la ficha)
  python3 tools/glyphref.py build                     lee tools/glyphspec.json y escribe js/refglyphs.js
  python3 tools/glyphref.py sheet STYLE OUT.png       hoja de control de un estilo

Ficha (glyphspec.json): por estilo y modo, cada letra con su imagen, piezas (ids) o caja, y la línea a la que
pertenece (base y altura de referencia de esa línea).
"""
import sys, os, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
from skimage.morphology import skeletonize, remove_small_objects, remove_small_holes, binary_closing, disk

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def ink(path):
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.float32) / 255
    d = 1 - im.min(2)                     # tinta de cualquier color (rojo, azul, negro)
    # papel: percentil alto local
    bg = ndi.percentile_filter(d, 20, size=41)
    d = np.clip(d - bg, 0, 1)
    thr = max(0.18, 0.5 * np.percentile(d[d > 0.05], 90)) if (d > 0.05).any() else 0.3
    m = d > thr
    m = remove_small_objects(m, max_size=40)
    return m, d


def annotate(img, out):
    m, d = ink(img)
    lab, n = ndi.label(m)
    objs = ndi.find_objects(lab)
    im = Image.open(img).convert('RGB')
    W, H = im.size
    k = max(1, 1400 / max(W, H))
    im = im.resize((int(W * k), int(H * k)))
    dr = ImageDraw.Draw(im)
    try:
        f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 13)
    except Exception:
        f = None
    for i, sl in enumerate(objs, 1):
        if sl is None: continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        if (lab[sl] == i).sum() < 60: continue
        dr.rectangle([x0 * k, y0 * k, x1 * k, y1 * k], outline=(0, 160, 255))
        dr.text((x0 * k + 1, y0 * k - 13), str(i), fill=(220, 0, 0), font=f)
    im.save(out)
    print(img, 'piezas', n)


def trace(sk):
    """esqueleto -> polilíneas (siguiendo siempre lo más recto en los cruces)"""
    ys, xs = np.nonzero(sk)
    P = set(zip(ys.tolist(), xs.tolist()))
    nb = lambda p: [(p[0] + dy, p[1] + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and (p[0] + dy, p[1] + dx) in P]
    deg = {p: len(nb(p)) for p in P}
    used = set()
    edge = lambda a, b: (a, b) if a < b else (b, a)
    paths = []
    starts = sorted([p for p in P if deg[p] == 1], key=lambda p: (p[0], p[1])) + sorted([p for p in P if deg[p] >= 3]) + sorted(P)
    for s in starts:
        while True:
            free = [q for q in nb(s) if edge(s, q) not in used]
            if not free: break
            path = [s]; cur = s; prev = None
            nxt = free[0]
            while True:
                used.add(edge(cur, nxt)); path.append(nxt); prev, cur = cur, nxt
                cand = [q for q in nb(cur) if edge(cur, q) not in used]
                if not cand: break
                # lo más recto respecto a la dirección de los últimos pasos
                a = path[max(0, len(path) - 6)]
                dv = (cur[0] - a[0], cur[1] - a[1])
                def score(q):
                    v = (q[0] - cur[0], q[1] - cur[1]); l = math.hypot(*v) * (math.hypot(*dv) or 1)
                    return (v[0] * dv[0] + v[1] * dv[1]) / l
                cand.sort(key=score, reverse=True)
                if deg[cur] >= 3 and score(cand[0]) < 0.2: break   # cruce sin continuación recta: se corta
                nxt = cand[0]
            if len(path) > 2: paths.append(path)
    return paths


def rdp(p, eps):
    if len(p) < 3: return p
    a, b = np.array(p[0], float), np.array(p[-1], float)
    ab = b - a; L = np.hypot(*ab)
    if L < 1e-6:     # lazo cerrado: se parte por el punto más lejano del inicio
        i = int(np.argmax([math.hypot(q[0] - a[0], q[1] - a[1]) for q in p]))
        if i == 0 or i == len(p) - 1: return [p[0], p[-1]]
        return rdp(p[:i + 1], eps)[:-1] + rdp(p[i:], eps)
    d = [abs(ab[0] * (q[1] - a[1]) - ab[1] * (q[0] - a[0])) / L for q in p]
    i = int(np.argmax(d))
    if d[i] > eps: return rdp(p[:i + 1], eps)[:-1] + rdp(p[i:], eps)
    return [p[0], p[-1]]


def glyph_strokes(mask, sw):
    # suaviza el borde (textura de cera, fotocopia) y tapa los agujeritos, no los huecos de la letra
    mask = binary_closing(mask, disk(max(1, int(sw * 0.3))))
    mask = ndi.gaussian_filter(mask.astype(np.float32), max(1.0, sw * 0.25)) > 0.5
    mask = remove_small_holes(mask, max_size=int((sw * 1.6) ** 2))
    mask = remove_small_objects(mask, max_size=int(sw * sw * 1.5))
    sk = skeletonize(mask)
    paths = trace(sk)
    # poda: ramitas cortas que salen de un cruce (pelos del trazo)
    out = []
    for p in paths:
        L = sum(math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]) for i in range(1, len(p)))
        if L < sw * 0.75: continue
        out.append(p)
    # une tramos que se tocan en sus extremos y siguen recto
    changed = True
    while changed:
        changed = False
        for i in range(len(out)):
            for j in range(len(out)):
                if i == j or changed: continue
                a, b = out[i], out[j]
                for ra in (False, True):
                    for rb in (False, True):
                        A = a[::-1] if ra else a; B = b[::-1] if rb else b
                        if math.hypot(A[-1][0] - B[0][0], A[-1][1] - B[0][1]) > 2.5: continue
                        da = np.array(A[-1]) - np.array(A[max(0, len(A) - 7)]); db = np.array(B[min(len(B) - 1, 6)]) - np.array(B[0])
                        c = np.dot(da, db) / ((np.linalg.norm(da) * np.linalg.norm(db)) or 1)
                        if c > 0.75:
                            out[i] = A + B[1:]; del out[j]; changed = True; break
                    if changed: break
                if changed: break
    return out


def orient(p):
    """dirección de la mano: verticales de arriba abajo; horizontales de izquierda a derecha; curvas desde arriba"""
    (y0, x0), (y1, x1) = p[0], p[-1]
    if abs(y1 - y0) > abs(x1 - x0) * 0.6:
        return p if y0 <= y1 else p[::-1]
    return p if x0 <= x1 else p[::-1]


def corners(p, win):
    """índices de los vértices cerrados (giro > ~65º medido a una ventana de win píxeles), uno por vértice"""
    n = len(p)
    if n < 2 * win + 3: return []
    a = np.array(p, float)
    ang = np.zeros(n)
    for i in range(win, n - win):
        u = a[i] - a[i - win]; v = a[i + win] - a[i]
        lu, lv = np.hypot(*u), np.hypot(*v)
        if lu < win * 0.6 or lv < win * 0.6: continue
        ang[i] = math.degrees(math.acos(max(-1, min(1, np.dot(u, v) / (lu * lv)))))
    out = []
    i = win
    while i < n - win:
        if ang[i] > 65:
            j = i
            while j + 1 < n - win and ang[j + 1] > 65: j += 1
            k = i + int(np.argmax(ang[i:j + 1]))
            out.append(k); i = j + 1
        else: i += 1
    return out


def smooth_path(p, sig):
    """quita la escalera de píxeles del esqueleto (media gaussiana a lo largo; los extremos se quedan)"""
    if len(p) < 5 or sig < 0.5: return p
    a = np.array(p, float); n = len(a)
    closed = math.hypot(*(a[0] - a[-1])) < 3 and n > 10
    r = int(sig * 2.5); k = np.exp(-np.arange(-r, r + 1) ** 2 / (2 * sig * sig)); k /= k.sum()
    if closed:
        ext = np.concatenate([a[-r - 1:-1], a, a[1:r + 1]])
        sm = np.stack([np.convolve(ext[:, j], k, 'valid') for j in (0, 1)], 1)
        return [tuple(q) for q in sm]
    ext = np.concatenate([np.repeat(a[:1], r, 0), a, np.repeat(a[-1:], r, 0)])
    sm = np.stack([np.convolve(ext[:, j], k, 'valid') for j in (0, 1)], 1)
    # los extremos: sin encogerse (se mezcla poco a poco con el original)
    for i in range(min(r, n // 2)):
        t = i / max(1, r)
        sm[i] = a[i] * (1 - t) + sm[i] * t; sm[n - 1 - i] = a[n - 1 - i] * (1 - t) + sm[n - 1 - i] * t
    return [tuple(q) for q in sm]


def to_dsl(paths, base, cap, x0):
    """px de imagen -> unidades (base 0, altura de referencia 1, y hacia arriba)"""
    parts = []
    allx = []
    for p in paths:
        # esquinas (vértices de A, M, N, V, W, Z): se buscan en el trazo sin suavizar y se conservan en pico; cada
        # tramo entre esquinas se suaviza por separado (si no, el suavizado las redondea)
        win = max(3, int(cap * 0.06))
        cs = corners(p, win)
        segs, a0 = [], 0
        for c in cs + [len(p) - 1]:
            if c - a0 >= 2: segs.append(p[a0:c + 1])
            a0 = c
        if not segs: segs = [p]
        q, cornerPts = [], set()
        for si, sg in enumerate(segs):
            sm = smooth_path(sg, max(1.0, cap * 0.022)) if len(sg) > 6 else sg
            r = rdp(list(sm), max(0.6, cap * 0.01))
            if si: r = r[1:]; cornerPts.add(len(q) - 1)
            q += r
        # puntos: esquina (encontrada o giro > 50º) = L, si no S
        pts = [((x - x0) / cap, (base - y) / cap) for (y, x) in q]
        allx += [a for a, _ in pts]
        s = []
        for k, (x, y) in enumerate(pts):
            if k == 0: s.append('M %.3f %.3f' % (x, y)); continue
            corner = k in cornerPts
            if 0 < k < len(pts) - 1 and not corner:
                a, b, c = np.array(pts[k - 1]), np.array(pts[k]), np.array(pts[k + 1])
                u, v = b - a, c - b
                ang = math.degrees(math.acos(max(-1, min(1, np.dot(u, v) / ((np.linalg.norm(u) * np.linalg.norm(v)) or 1)))))
                corner = ang > 50
            s.append(('L' if corner or k == len(pts) - 1 else 'S') + ' %.3f %.3f' % (x, y))
        closed = len(p) > 10 and math.hypot(p[0][0] - p[-1][0], p[0][1] - p[-1][1]) < 3
        parts.append(' '.join(s) + (' Z' if closed else ''))
    w = (max(allx) - min(allx)) if allx else 0.3
    return ' '.join(parts), w


def cursive_words(S, m, lab, dt, glyphs, dbg, style, mode, imgname):
    """palabras ligadas -> letras: se corta con líneas inclinadas (como la escritura) en los puntos de enlace;
    cada letra se queda con su trozo de enlace a cada lado (así, al juntarlas, se ligan como en el original)"""
    H_, W_ = m.shape
    ka = max(1, 1400 / max(H_, W_))
    over_dir = os.environ.get('WORDS')
    for wi, wd in enumerate(S['words']):
        if 'ids' in wd:
            mk = np.isin(lab, wd['ids'])
            if 'abox' in wd:
                x0, y0, x1, y1 = [int(v / ka) for v in wd['abox']]
                bx = np.zeros_like(m); bx[y0:y1, x0:x1] = True; mk &= bx
        else:
            x0, y0, x1, y1 = [int(v / ka) for v in wd['abox']]
            mk = np.zeros_like(m); mk[y0:y1, x0:x1] = m[y0:y1, x0:x1]
        base, xh, sl = wd['base'] / ka, wd['xh'] / ka, wd['slant']
        if 'cuts' not in wd:      # primera aproximación: reparto igual
            n_ = len(wd['text']); wd['cuts'] = [wd['x0'] + (wd['x1'] - wd['x0']) * i / n_ for i in range(n_ + 1)]
        cuts = [c / ka for c in wd['cuts']]
        sw = 2 * np.median(dt[mk & (dt > 0)]) if (mk & (dt > 0)).any() else 4
        paths = glyph_strokes(mk, sw)
        # palabra que sube o baja: se endereza (la base pasa por (bx, base) con pendiente «tilt»)
        tl, bxi = wd.get('tilt', 0), wd.get('bx', wd['cuts'][0]) / ka
        if tl: paths = [[(y - tl * (x - bxi), x) for (y, x) in p] for p in paths]
        U = lambda y, x: x - (base - y) * sl
        text = wd['text']
        for li, ch in enumerate(text):
            if ch == '_': continue
            a, b = cuts[li], cuts[li + 1]
            pieces = []
            for p in paths:
                cur = []
                for (y, x) in p:
                    if a <= U(y, x) <= b: cur.append((y, x))
                    else:
                        if len(cur) > 2: pieces.append(cur)
                        cur = []
                if len(cur) > 2: pieces.append(cur)
            pieces = [pc for pc in pieces if sum(math.hypot(pc[i][0] - pc[i - 1][0], pc[i][1] - pc[i - 1][1]) for i in range(1, len(pc))) > sw * 0.8]
            # escritura de izquierda a derecha: cada trozo se recorre en el sentido de la mano
            pieces = [pc if U(*pc[0]) <= U(*pc[-1]) else pc[::-1] for pc in pieces]
            pieces.sort(key=lambda pc: U(*pc[0]))
            if not pieces: continue
            dsl, _ = to_dsl(pieces, base, xh, a)
            key = ch
            k = 2
            while key in glyphs: key = ch + '#' + str(k); k += 1
            glyphs[key] = [round((b - a) / xh, 3), dsl, round(sw / xh, 3), 1]
            ys = [q[0] for pc in pieces for q in pc]; xs = [q[1] for pc in pieces for q in pc]
            Y0, X0 = int(min(ys) - 3), int(min(xs) - 3)
            sub = mk[max(0, Y0):int(max(ys)) + 4, max(0, X0):int(max(xs)) + 4]
            dbg.append((style, mode, key, sub, [[(y - max(0, Y0), x - max(0, X0)) for (y, x) in pc] for pc in pieces]))
        if over_dir:
            ys, xs = np.nonzero(mk)
            Y0, Y1, X0, X1 = ys.min() - 10, ys.max() + 10, xs.min() - 10, xs.max() + 10
            im = Image.fromarray(((1 - mk[Y0:Y1, X0:X1] * 0.5) * 255).astype(np.uint8)).convert('RGB')
            z = 3
            im = im.resize((im.width * z, im.height * z))
            dr = ImageDraw.Draw(im)
            for c in cuts:
                # línea de corte inclinada: x = c + (base - y) * sl
                pts = [((c + (base - y) * sl - X0) * z, (y - Y0) * z) for y in (Y0, Y1)]
                dr.line(pts, fill=(255, 0, 0), width=2)
            for yy, col in ((base, (0, 160, 0)), (base - xh, (0, 120, 255))):
                dr.line([(0, (yy + tl * (X0 - bxi) - Y0) * z), (im.width, (yy + tl * (X1 - bxi) - Y0) * z)], fill=col, width=1)
            for li, ch in enumerate(text):
                xm = (cuts[li] + cuts[li + 1]) / 2
                dr.text(((xm - X0) * z, (base - Y0) * z + 20), ch, fill=(255, 0, 0))
            # regla en coordenadas de la anotación, sobre la base
            for av in range(int(X0 * ka) // 10 * 10, int(X1 * ka) + 10, 10):
                X = (av / ka - X0) * z; Yb = (base - Y0) * z
                dr.line([(X, Yb), (X, Yb + (12 if av % 50 == 0 else 5))], fill=(0, 0, 0), width=1)
                if av % 50 == 0: dr.text((X + 1, Yb + 4), str(av), fill=(0, 0, 0))
            for pth in paths:
                dr.line([((x - X0) * z, (y + tl * (x - bxi) - Y0) * z) for (y, x) in pth], fill=(0, 0, 200), width=1)
            im.save(os.path.join(over_dir, '%s_%s_%d.png' % (style, mode, wi)))


def build():
    spec = json.load(open(os.path.join(ROOT, 'tools', 'glyphspec.json')))
    cache = {}
    out = {}
    dbg = []
    only = sys.argv[2] if len(sys.argv) > 2 else None
    old = {}
    try:
        import re
        txt = open(os.path.join(ROOT, 'js', 'refglyphs.js')).read()
        old = json.loads(txt[txt.index('= ') + 2:txt.rindex(';')])
    except Exception:
        pass
    for style, modes in spec['styles'].items():
        if only and style != only:
            out[style] = old.get(style, {}); continue
        out[style] = {}
        for mode, S in modes.items():
            img = os.path.join(ROOT, 'referencias', 'tipos', S['img'])
            if img not in cache:
                m, d = ink(img); lab, n = ndi.label(m); cache[img] = (m, lab)
            m, lab = cache[img]
            dt = ndi.distance_transform_edt(m)
            glyphs = {}
            H_, W_ = m.shape
            if 'words' in S:
                if not os.environ.get('CURSIVA'): continue      # (los cortes de cursiva aún no se usan)
                cursive_words(S, m, lab, dt, glyphs, dbg, style, mode, os.path.basename(img))
                out[style][mode] = glyphs
                print(style, mode, len(glyphs), 'letras (cursiva)')
                continue
            ka = max(1, 1400 / max(H_, W_))     # escala de la imagen anotada
            items = []
            for ch, g in S['glyphs'].items():
                for vi, gg in enumerate(g if isinstance(g, list) else [g]):
                    items.append((ch if vi == 0 else ch + '#' + str(vi + 1), gg))
            for ch, g in items:
                g = dict(g)
                if 'abox' in g: g['box'] = [int(v / ka) for v in g['abox']]
                if 'aline' in g: g['base'] = g['aline'][0] / ka; g['cap'] = g['aline'][1] / ka
                if 'acap' in g: g['cap'] = g['acap'] / ka
                line = dict(S['lines'][g['line']]) if 'line' in g else {'cap': S.get('cap', 'self')}
                if 'cap' in g: line['cap'] = g['cap']
                if 'ids' in g:
                    mk = np.isin(lab, g['ids'])
                else:
                    mk = np.zeros_like(m)
                if 'box' in g:
                    x0, y0, x1, y1 = g['box']
                    bx = np.zeros_like(m); bx[y0:y1, x0:x1] = True
                    mk = (mk & bx) if 'ids' in g else (m & bx)
                ys, xs = np.nonzero(mk)
                if not len(ys): print('vacía', style, mode, ch); continue
                if 'base' in g: line['base'] = g['base']
                elif 'base' not in line: line['base'] = ys.max()
                hh = ys.max() - ys.min()
                k_ = g.get('kind', 'x')
                if line['cap'] == 'self':
                    # asc/desc: la letra mide ~1,55 alturas de x; desc: la base queda a una altura de x del techo
                    line['cap'] = hh / (1.55 if k_ in ('asc', 'desc') else 1)
                    if k_ == 'desc': line['base'] = ys.min() + line['cap']
                sw = 2 * np.median(dt[mk & (dt > 0)]) if (mk & (dt > 0)).any() else 4
                paths = glyph_strokes(mk, sw)
                paths = [orient(p) for p in paths]
                # mayúsculas y números: fuera las motas sueltas (puntos de la lista, salpicaduras)
                if mode in ('mayus', 'mix') and len(paths) > 1:
                    pl = lambda p: sum(math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]) for i in range(1, len(p)))
                    big = [p for p in paths if pl(p) > hh * 0.2]
                    if big: paths = big
                # orden: de izquierda a derecha y de arriba abajo (por el punto inicial)
                paths.sort(key=lambda p: (min(q[1] for q in p) // (line['cap'] * 0.35), p[0][0]))
                x0 = xs.min() + sw / 2
                dsl, w = to_dsl(paths, line['base'] + g.get('dy', 0), line['cap'], x0)
                glyphs[ch] = [round(w, 3), dsl, round(sw / line['cap'], 3)]
                dbg.append((style, mode, ch, mk[ys.min():ys.max() + 1, xs.min():xs.max() + 1], [[(y - ys.min(), x - xs.min()) for (y, x) in p] for p in paths]))
            for k in spec.get('skip', {}).get(style + '/' + mode, []): glyphs.pop(k, None)
            out[style][mode] = glyphs
            print(style, mode, len(glyphs), 'letras')
    js = "'use strict';\n// generado por tools/glyphref.py a partir de referencias/tipos/ (no editar a mano)\n// estilo -> modo -> letra: [anchura, trazos (mini lenguaje de skeleton.js), grosor de la muestra]\nmodule.exports = " + json.dumps(out, ensure_ascii=False) + ';\n'
    open(os.path.join(ROOT, 'js', 'refglyphs.js'), 'w').write(js)
    # hoja de control: cada letra, su tinta en gris y sus trazos en color (verde = inicio)
    if dbg:
        cell = 130
        cols = 10
        rows = (len(dbg) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * cell, rows * cell), 'white')
        dr = ImageDraw.Draw(sheet)
        for i, (st, md, ch, mk, paths) in enumerate(dbg):
            h, w = mk.shape
            k = (cell - 22) / max(h, w)
            ox, oy = (i % cols) * cell + 4, (i // cols) * cell + 18
            im = Image.fromarray(((1 - mk * 0.25) * 255).astype(np.uint8)).resize((max(1, int(w * k)), max(1, int(h * k))))
            sheet.paste(im, (ox, oy))
            cols_ = [(220, 30, 30), (30, 90, 220), (0, 150, 60), (200, 120, 0), (150, 0, 160), (0, 150, 150)]
            for j, p in enumerate(paths):
                pts = [(ox + x * k, oy + y * k) for (y, x) in p]
                dr.line(pts, fill=cols_[j % 6], width=2)
                dr.ellipse([pts[0][0] - 3, pts[0][1] - 3, pts[0][0] + 3, pts[0][1] + 3], fill=(0, 200, 0))
            dr.text((ox, oy - 15), st[:10] + ' ' + md[:3] + ' ' + ch, fill=(0, 0, 0))
        sheet.save(os.environ.get('SHEET', '/tmp/refsheet.png'))


if __name__ == '__main__':
    if sys.argv[1] == 'annotate': annotate(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == 'build': build()

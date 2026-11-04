#!/usr/bin/env python3
"""Tipografías de trazo de A mano -> js/fontdata.js

Parte de fuentes de trazo único libres (EMS: SIL OFL; Hershey: uso libre con aviso, ver
fonts/LICENCIAS.txt) y las convierte en trazos de escritura:
  - une los tramos que en la fuente original están partidos
  - da a cada trazo la dirección en que lo haría una mano (de arriba abajo, de izquierda a derecha,
    los óvalos en sentido antihorario empezando arriba a la derecha) salvo en las cursivas, que ya
    vienen en orden de escritura
  - ordena los trazos (primero el cuerpo de la letra, luego puntos, tildes y travesaños)
  - mide la altura de x, de mayúscula, de ascendente y de descendente

Uso: python3 tools/make_fonts.py  [ruta a la carpeta svg_fonts de hersheytextjs]
"""
import os, re, sys, json, html, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'fonts', 'svg')

# nombre interno -> (archivo, es cursiva en orden de escritura)
# (desde la 2.1 las mayúsculas y minúsculas se dibujan en js/skeleton.js; aquí quedan las cursivas ligadas
#  y una fuente de respaldo para signos raros)
FONTS = {
    'readability': ('EMSReadability', False),
    'script': ('HersheyScript1', True),
    'allure': ('EMSAllure', True),
    'elfin': ('EMSElfin', False),          # la elegante de la 2.0 (la que gustaba)
}
CHARS = ''.join(chr(c) for c in range(33, 127)) + '¡¿ÁÉÍÓÚÜÑáéíóúüñ«»ºª€çÇàèìòùÀÈÌÒÙ·–—“”'

JOIN_TOL = 6.0       # unidades (de 1000 por em) para unir tramos
CLOSE_TOL = 8.0


def parse(path):
    s = open(path, encoding='utf-8').read()
    out = {}
    for m in re.finditer(r'<glyph([^>]*)/>', s):
        a = m.group(1)
        u = re.search(r'unicode="([^"]*)"', a)
        if not u:
            continue
        ch = html.unescape(u.group(1))
        if len(ch) != 1:
            continue
        adv = float(re.search(r'horiz-adv-x="([^"]*)"', a).group(1)) if 'horiz-adv-x' in a else None
        d = re.search(r' d="([^"]*)"', a)
        polys = []
        if d:
            toks = re.findall(r'[MLml]|-?[\d.]+(?:e-?\d+)?', d.group(1))
            i = 0; cur = None; cmd = None
            while i < len(toks):
                t = toks[i]
                if t in 'MLml':
                    cmd = t; i += 1; continue
                x = float(toks[i]); y = float(toks[i + 1]); i += 2
                if cmd in 'ml' and cur:
                    x += cur[-1][0]; y += cur[-1][1]
                if cmd in 'Mm':
                    cur = [(x, y)]; polys.append(cur); cmd = 'L' if cmd == 'M' else 'l'
                else:
                    cur.append((x, y))
        out[ch] = {'adv': adv, 'polys': [p for p in polys if len(p) >= 1]}
    m = re.search(r'<font [^>]*horiz-adv-x="([^"]*)"', s)
    default_adv = float(m.group(1)) if m else 500
    for g in out.values():
        if g['adv'] is None:
            g['adv'] = default_adv
    return out


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def dedupe(p):
    q = [p[0]]
    for pt in p[1:]:
        if dist(pt, q[-1]) > 0.5:
            q.append(pt)
    return q


def join_polys(polys):
    """une tramos cuyos extremos coinciden (solo extremo con extremo, nunca en cruces en T)"""
    P = [dedupe(p) for p in polys if len(p) >= 1]
    P = [p for p in P if len(p) >= 2 or True]
    changed = True
    while changed:
        changed = False
        n = len(P)
        for i in range(n):
            if changed: break
            for j in range(n):
                if i == j or changed: continue
                a, b = P[i], P[j]
                if len(a) < 2 or len(b) < 2: continue
                # en un extremo donde se juntan tres o más tramos no se une (es un cruce)
                def degree(pt):
                    return sum(1 for q in P if len(q) >= 2 and (dist(q[0], pt) < JOIN_TOL or dist(q[-1], pt) < JOIN_TOL))
                for ea, eb, mk in ((a[-1], b[0], lambda: a + b[1:]),
                                   (a[-1], b[-1], lambda: a + b[::-1][1:]),
                                   (a[0], b[0], lambda: a[::-1] + b[1:]),
                                   (a[0], b[-1], lambda: b + a[1:])):
                    if dist(ea, eb) < JOIN_TOL and degree(ea) == 2:
                        # no unir si hacen un pico muy cerrado (son dos trazos distintos, p. ej. la V)
                        new = mk()
                        P = [q for k, q in enumerate(P) if k not in (i, j)] + [new]
                        changed = True
                        break
    return P


def area(p):
    s = 0
    for i in range(len(p)):
        x0, y0 = p[i]; x1, y1 = p[(i + 1) % len(p)]
        s += x0 * y1 - x1 * y0
    return s / 2


def split_sharp(p, ang=118):
    """parte un trazo abierto en sus picos muy cerrados (la V, la W, la M, la N): la mano levanta
    o frena ahí; así cada tramo se pinta con su propia entrada y salida"""
    if len(p) < 3:
        return [p]
    out = [[p[0]]]
    for k in range(1, len(p) - 1):
        a, b, c = p[k - 1], p[k], p[k + 1]
        v1 = (b[0] - a[0], b[1] - a[1]); v2 = (c[0] - b[0], c[1] - b[1])
        n1 = math.hypot(*v1); n2 = math.hypot(*v2)
        out[-1].append(b)
        if n1 > 1e-6 and n2 > 1e-6:
            cosv = (v1[0] * v2[0] + v1[1] * v2[1]) / (n1 * n2)
            turn = math.degrees(math.acos(max(-1, min(1, cosv))))
            if turn > ang:
                out.append([b])
    out[-1].append(p[-1])
    return [q for q in out if len(q) >= 2]


def orient(p, is_script):
    """dirección y punto de arranque como los haría una mano (fuentes de molde)"""
    closed = len(p) > 3 and dist(p[0], p[-1]) < CLOSE_TOL
    if closed:
        q = p[:-1]
        # antihorario (y hacia arriba: área positiva)
        if area(q) < 0:
            q = q[::-1]
        # arranca arriba a la derecha (hacia la 1 del reloj)
        cx = sum(x for x, _ in q) / len(q); cy = sum(y for _, y in q) / len(q)
        best = max(range(len(q)), key=lambda k: math.cos(math.atan2(q[k][1] - cy, q[k][0] - cx) - math.radians(55)))
        q = q[best:] + q[:best]
        return q + [q[0]], True
    if is_script:
        return p, False
    a, b = p[0], p[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    xs = [x for x, _ in p]; ys = [y for _, y in p]
    w = max(xs) - min(xs); h = max(ys) - min(ys)
    if h > w * 1.4:
        # sobre todo vertical: de arriba abajo
        if dy > 0: p = p[::-1]
    elif w > h * 1.4:
        # sobre todo horizontal: de izquierda a derecha
        if dx < 0: p = p[::-1]
    else:
        # curva abierta (c, s, e, 2, 3...): empieza por el extremo más alto; si empatan, el de la izquierda
        if abs(dy) > 25:
            if dy > 0: p = p[::-1]
        elif dx < 0:
            p = p[::-1]
    return p, False


def bbox(polys):
    xs = [x for p in polys for x, _ in p]; ys = [y for p in polys for _, y in p]
    if not xs:
        return [0, 0, 0, 0]
    return [min(xs), min(ys), max(xs), max(ys)]


def process(glyphs, is_script):
    res = {}
    for ch in CHARS:
        g = glyphs.get(ch)
        if g is None:
            continue
        polys = join_polys(g['polys'])
        strokes = []
        for p in polys:
            if len(p) == 1:
                p = [p[0], (p[0][0] + 0.5, p[0][1])]
            q, closed = orient(p, is_script)
            parts = [q] if (closed or is_script) else split_sharp(q)
            for part in parts:
                strokes.append({'p': part, 'c': closed})
        # orden: cuerpo (trazos largos) primero de izquierda a derecha; puntos y tildes al final
        def size(s):
            b = bbox([s['p']]); return max(b[2] - b[0], b[3] - b[1])
        if strokes:
            big = max(size(s) for s in strokes)
            body = [s for s in strokes if size(s) > big * 0.28]
            marks = [s for s in strokes if size(s) <= big * 0.28]
            if not is_script:
                body.sort(key=lambda s: (round(min(x for x, _ in s['p']) / 60), -max(y for _, y in s['p'])))
            strokes = body + marks
        b = bbox([s['p'] for s in strokes])
        res[ch] = {'adv': g['adv'], 'strokes': strokes, 'bbox': b}
    return res


def metrics(G):
    def top(ch):
        return G[ch]['bbox'][3] if ch in G and G[ch]['strokes'] else None
    def bot(ch):
        return G[ch]['bbox'][1] if ch in G and G[ch]['strokes'] else None
    xh = sorted(v for v in [top('x'), top('v'), top('z'), top('u')] if v is not None)
    cap = sorted(v for v in [top('H'), top('E'), top('I')] if v is not None)
    asc = sorted(v for v in [top('l'), top('h'), top('k'), top('b')] if v is not None)
    desc = sorted(v for v in [bot('p'), bot('q'), bot('g')] if v is not None)
    m = lambda a, d: a[len(a) // 2] if a else d
    return {'xh': m(xh, 300), 'cap': m(cap, 500), 'asc': m(asc, 550), 'desc': m(desc, -200)}


def encode(G, met):
    out = {}
    for ch, g in G.items():
        ss = []
        for s in g['strokes']:
            flat = []
            for x, y in s['p']:
                flat += [int(round(x)), int(round(y))]
            ss.append([1 if s['c'] else 0, flat])
        out[ch] = [int(round(g['adv'])), ss]
    return {'m': {k: int(round(v)) for k, v in met.items()}, 'g': out}


def main():
    data = {}
    for name, (fn, is_script) in FONTS.items():
        G = process(parse(os.path.join(SRC, fn + '.svg')), is_script)
        met = metrics(G)
        data[name] = encode(G, met)
        data[name]['script'] = is_script
        missing = [c for c in CHARS if c not in G]
        print(name, len(G), 'glifos', met, 'faltan:', ''.join(missing))
    js = "'use strict';\n// Generado por tools/make_fonts.py (trazos de escritura). No editar a mano.\n"
    js += '// Fuentes base: EMS (SIL Open Font License) y Hershey; ver fonts/LICENCIAS.txt\n'
    js += 'module.exports = ' + json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ';\n'
    open(os.path.join(ROOT, 'js', 'fontdata.js'), 'w', encoding='utf-8').write(js)
    print('fontdata.js', len(js), 'bytes')


if __name__ == '__main__':
    main()

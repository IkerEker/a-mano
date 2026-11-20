#!/usr/bin/env python3
"""Acceso a la biblioteca común de material de Iker (repo IkerEker/TEXTURAS + carpeta Biblioteca/ local).

La biblioteca SOLO se usa al construir: lo que el plugin necesita queda incrustado en js/texdata.js y js/grumosdata.js,
y el .ccx funciona sin ella, sin Claude y sin internet.

    TEXTURAS_ROOT = la carpeta Biblioteca (la que contiene TEXTURAS/, originales/, ACIDBITE/, generadas/)

ruta(id) devuelve el archivo de un id del índice (TEXTURAS/indice/indice.json, campo «archivo»):
    or:<md5>  original bit a bit (se comprueba el md5: si no coincide, se para)
    tx:…      procesado de TEXTURAS          ab:…  AcidBite

    python3 tools/biblioteca.py            comprueba que están todos los originales que usa A mano
"""
import os, sys, json, hashlib

_IDX = None


def raiz():
    r = os.environ.get('TEXTURAS_ROOT')
    if not r:
        sys.exit('Falta la variable TEXTURAS_ROOT (la carpeta Biblioteca de Iker). Ejemplo en Windows:\n'
                 '  set TEXTURAS_ROOT=C:\\Users\\ikerg\\Biblioteca')
    if not os.path.isdir(r):
        sys.exit('TEXTURAS_ROOT no es una carpeta: ' + r)
    return r


def indice():
    global _IDX
    if _IDX is None:
        p = os.path.join(raiz(), 'TEXTURAS', 'indice', 'indice.json')
        if not os.path.isfile(p):
            sys.exit('No encuentro el índice de la biblioteca: ' + p)
        with open(p, encoding='utf-8') as f:
            _IDX = {a['id']: a for a in json.load(f)['assets']}
    return _IDX


def md5(path):
    h = hashlib.md5()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def ruta(id_):
    a = indice().get(id_)
    if a is None:
        sys.exit('El id no está en el índice de la biblioteca: ' + id_)
    p = os.path.join(raiz(), *a['archivo'].split('/'))
    if not os.path.isfile(p):
        sys.exit('Falta en la biblioteca: %s  (%s)' % (p, id_))
    if id_.startswith('or:') and md5(p) != id_[3:]:
        sys.exit('El archivo no es el original (md5 distinto): %s  (%s)' % (p, id_))
    return p


if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import extract_textures as E, grumos as G
    ids = [(s[0], s[1]) for s in E.SOURCES if E.CAP.get(s[2], 8) != 0] + [(p[0], p[1]) for p in G.PLAN]
    for i, n in ids: ruta(i)
    print('biblioteca correcta: %d fuentes (%d archivos distintos), md5 comprobado' % (len(ids), len(set(i for i, _ in ids))))

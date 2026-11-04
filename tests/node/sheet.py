# Hoja de contactos de las vistas previas: python3 sheet.py DIR OUT.png cols [ancho]
import sys, glob, os
from PIL import Image, ImageDraw
d, out, cols = sys.argv[1], sys.argv[2], int(sys.argv[3])
tw = int(sys.argv[4]) if len(sys.argv) > 4 else 700
pat = sys.argv[5] if len(sys.argv) > 5 else '*.png'
fs = sorted(glob.glob(os.path.join(d, pat)))
ims = []
for f in fs:
    im = Image.open(f).convert('RGB'); im = im.resize((tw, int(im.height * tw / im.width))); ims.append((os.path.basename(f)[:-4], im))
th = max(i.height for _, i in ims) + 18
rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * tw, rows * th), 'white')
dr = ImageDraw.Draw(S)
for k, (n, im) in enumerate(ims):
    x, y = (k % cols) * tw, (k // cols) * th
    S.paste(im, (x, y + 16)); dr.text((x + 4, y + 2), n, fill=(200, 0, 0))
S.save(out)

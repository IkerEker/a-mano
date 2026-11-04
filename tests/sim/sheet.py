import sys
from PIL import Image, ImageDraw
out = sys.argv[1]; cols = int(sys.argv[2]); names = sys.argv[3:]
ims = [Image.open(n + '.png').convert('RGB') for n in names]
w, h = ims[0].size; rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (w * cols, h * rows), 'white')
for i, im in enumerate(ims):
    d = ImageDraw.Draw(im); d.rectangle((0, 0, w - 1, h - 1), outline=(220, 220, 220)); d.text((8, 8), names[i], fill=(200, 0, 0)); S.paste(im, ((i % cols) * w, (i // cols) * h))
S.save(out)

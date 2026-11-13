import sys
from PIL import Image,ImageDraw,ImageFont
subs=sys.argv[2].split(','); pres=sys.argv[3].split(','); s=float(sys.argv[4]) if len(sys.argv)>4 else 0.5
N={'a':'Tag','b':'Rabia','c':'Bomba','d':'De un trazo'}
tw,th=int(1100*s),int(620*s);lw=110;hh=30
G=Image.new('RGB',(lw+tw*len(pres),hh+th*len(subs)),'white');d=ImageDraw.Draw(G)
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',17)
for j,p in enumerate(pres): d.text((lw+j*tw+tw//2-30,6),'Spray '+p,fill=(60,60,60),font=f)
for i,sb in enumerate(subs):
  y=hh+i*th; d.text((8,y+th//2-8),N[sb],fill=(20,20,20),font=f); d.line([0,y,G.width,y],fill=(225,225,225))
  for j,p in enumerate(pres): G.paste(Image.open('graf/g_%s_%s.png'%(sb,p)).convert('RGB').resize((tw,th),Image.LANCZOS),(lw+j*tw,y))
G.save(sys.argv[1]);print(G.size)

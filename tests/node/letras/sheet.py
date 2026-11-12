from PIL import Image,ImageDraw,ImageFont
import sys
S=['infantil_a','infantil_b','adulta_a','adulta_b','nerviosa_a','nerviosa_b','elegante_a','elegante_b']
M=['mayus','minus','cursiva'];MN=['MAYÚSCULAS','minúsculas','cursiva']
s=0.5;tw,th=int(1500*s),int(620*s);lw=150;hh=36
G=Image.new('RGB',(lw+tw*3,hh+th*8),'white');d=ImageDraw.Draw(G)
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',20);f2=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
for j,m in enumerate(MN): d.text((lw+j*tw+tw//2-50,8),m,fill=(60,60,60),font=f2)
for i,st in enumerate(S):
  y=hh+i*th; d.text((10,y+th//2-10),st.replace('_',' ').title(),fill=(20,20,20),font=f); d.line([0,y,G.width,y],fill=(225,225,225))
  for j,m in enumerate(M): G.paste(Image.open('one/%s_%s.png'%(st,m)).convert('RGB').resize((tw,th),Image.LANCZOS),(lw+j*tw,y))
G.save(sys.argv[1])
# mitades para mirar de cerca
G.crop((0,0,G.width,hh+th*4)).save('half1.png'); G.crop((0,hh+th*4,G.width,G.height)).save('half2.png')

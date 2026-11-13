// cada firma con su punta, en grande.  node graf2.js [color]
process.argv[2]='graf';
const PV=require('/home/claude/a-mano/tests/node/preview.js');
const FN=require('/home/claude/a-mano/js/fonts.js'),INK=require('/home/claude/a-mano/js/ink.js');
const C=process.argv[3]||'#141414';
for(const s of (process.argv[4]||'a,b,c,d,e,f').split(',')){const k='graffiti_'+s,S=FN.styleOf(k),pk=S.pre;
 PV.render('h_'+s,{text:'Nadie había\ncerrado la puerta',levels:[],shape:'rect',p:{persona:k,mode:S.gmode,tool:'spray',preset:pk,color:C,legib:0.7,goteo:0.5,nube:0.5,inkPad:INK.preset('spray',pk).w*((S.gmode==='cursiva'&&S.weightS)||S.weight)},W:1500,H:760,box:{left:60,top:50,right:1440,bottom:600},showShape:false,seed:21});}

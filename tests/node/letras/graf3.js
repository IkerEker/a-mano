// Borrón y Rodillo: pocas letras grandes (como las muestras) y una frase.  node graf3.js
process.argv[2]='graf';
const PV=require('/home/claude/a-mano/tests/node/preview.js');
const FN=require('/home/claude/a-mano/js/fonts.js'),INK=require('/home/claude/a-mano/js/ink.js');
const one=(name,k,text,W,H,seed,extra)=>{const S=FN.styleOf(k),pk=S.pre;
 PV.render(name,{text,levels:[],shape:'rect',p:Object.assign({persona:k,mode:'mayus',tool:'spray',preset:pk,color:'#111111',legib:0.7,goteo:0.5,nube:0.5,inkPad:INK.preset('spray',pk).w*(INK.preset('spray',pk).padK||1)*S.weight},extra||{}),W,H,box:{left:W*0.1,top:H*0.12,right:W*0.9,bottom:H*0.86},showShape:false,seed});};
const only=process.argv[3]||'ef';
if(only.indexOf('e')>=0){one('e_big','graffiti_e','Gero\nnimo',1300,1300,14);one('e_txt','graffiti_e','Nadie había\ncerrado la puerta',1500,640,21);one('e_small','graffiti_e','Nadie había\ncerrado la puerta',520,230,21);}
if(only.indexOf('f')>=0){one('f_big','graffiti_f','854\nWG2',1300,1300,8);one('f_txt','graffiti_f','Nadie había\ncerrado la puerta',1500,640,21);one('f_small','graffiti_f','Nadie había\ncerrado la puerta',520,230,21);}

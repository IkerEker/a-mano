// Borrón al tamaño de la muestra (600 px) y en grande.  node graf4.js [semilla]
process.argv[2]='graf';
const PV=require('/home/claude/a-mano/tests/node/preview.js');
const FN=require('/home/claude/a-mano/js/fonts.js'),INK=require('/home/claude/a-mano/js/ink.js');
const sd=+(process.argv[3]||14);
const one=(name,text,W,H,seed)=>{const k='graffiti_e',S=FN.styleOf(k),pk=S.pre,P=INK.preset('spray',pk);
 PV.render(name,{text,levels:[],shape:'rect',p:{persona:k,mode:'mayus',tool:'spray',preset:pk,color:'#050505',legib:0.7,goteo:0.5,nube:0.5,inkPad:P.w*(P.padK||1)*S.weight},W,H,box:{left:W*0.1,top:H*0.12,right:W*0.9,bottom:H*0.86},showShape:false,seed});};
one('s_600','Gero\nnimo',600,600,sd); one('s_1400','Gero\nnimo',1400,1400,sd); one('s_txt','Nadie había\ncerrado la puerta',1500,640,21);

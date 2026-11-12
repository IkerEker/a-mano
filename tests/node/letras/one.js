// hoja de un estilo: 3 modos con pangrama. node one.js estilo[,estilo]
const A=process.argv.slice(2);process.argv[2]='one';
const PV=require('/home/claude/a-mano/tests/node/preview.js');
const T='el veloz murciélago hindú comía feliz cardillo y kiwi zarza jaque exige whisky ñu bobo allí';
for(const s of A[0].split(','))for(const m of ['mayus','minus','cursiva'])
 PV.render(s+'_'+m,{text:T,levels:[],shape:'rect',p:{persona:s,mode:m,tool:A[1]||'boli',preset:A[2]||'bic',legib:0.7,inkPad:require('/home/claude/a-mano/js/ink.js').preset(A[1]||'boli',A[2]||'bic').w*((m==='cursiva'&&require('/home/claude/a-mano/js/fonts.js').styleOf(s).weightS)||require('/home/claude/a-mano/js/fonts.js').styleOf(s).weight)},W:1500,H:620,box:{left:30,top:20,right:1470,bottom:600},showShape:false,seed:11});

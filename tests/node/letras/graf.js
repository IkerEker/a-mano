// graffiti: sub-tipografías × boquillas. node graf.js [texto]
const A=process.argv.slice(2);process.argv[2]='graf';
const PV=require('/home/claude/a-mano/tests/node/preview.js');
const FN=require('/home/claude/a-mano/js/fonts.js'),INK=require('/home/claude/a-mano/js/ink.js');
const T=A[0]||'Nadie había cerrado\nla puerta';
const subs=(A[1]||'a,b,c,d').split(','), pres=(A[2]||'gordo,fino,seco,mop').split(',');
for(const s of subs)for(const pk of pres){const k='graffiti_'+s,S=FN.styleOf(k);const t0=Date.now();
 PV.render('g_'+s+'_'+pk,{text:T,levels:[],shape:'rect',p:{persona:k,mode:S.gmode,tool:'spray',preset:pk,color:A[3]||'#141414',legib:0.7,goteo:A[4]==null?0.5:+A[4],nube:0.5,inkPad:INK.preset('spray',pk).w*((S.gmode==='cursiva'&&S.weightS)||S.weight)},W:1100,H:620,box:{left:60,top:40,right:1040,bottom:470},showShape:false,seed:21});}

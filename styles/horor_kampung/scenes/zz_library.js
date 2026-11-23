/* Versioned activity recipes. All motion is evaluated from absolute time. */
(function () {
 const {H}=ENG, lib=window.HOROR_LIBRARY;if(!lib)return;
 const recipes=lib.recipes,assets=window.HOROR_ASSETS.assets,base=ENG.T.komposisi;
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function asset(c,key,name,x,y,k=1){const a=assets[name];if(!a)return '';return `<g id="${c.id(key)}" transform="translate(${x},${y})"><g transform="scale(${k}) translate(-100,-${a.baseline[1]})"><path d="${a.path}" fill="${['uang','kertas','surat','foto','kain','bungkusan'].includes(name)?'#b6a377':'#32291f'}" fill-rule="evenodd" stroke="#b59a6c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${['sepeda','becak','motor','gerobak'].includes(name)?[35,165].map((cx,i)=>`<g id="${c.id(key+'wheel'+i)}"><path d="M${cx-20} 160H${cx+20} M${cx} 140V180 M${cx-14} 146L${cx+14} 174 M${cx+14} 146L${cx-14} 174" stroke="#9a825e" stroke-width="2"/></g>`).join(''):''}</g></g>`;}
 function hand(c,i,side='R'){const e=c.el('person'+i+'_f'+side),cam=document.getElementById('cam_'+c.i);if(!e||!e.getCTM())return {x:500,y:850};const m=cam.getCTM().inverse().multiply(e.getCTM());return{x:+(m.e+m.c*54).toFixed(3),y:+(m.f+m.d*54).toFixed(3)};}
 function profile(r){
  const floor=['sweep','dig','plant','weed','harvest','thresh','split','feed'].includes(r.action);
  const long=['sapu','pel','cangkul','kapak','dayung','pancing','bajak','pikulan'].includes(r.tool);
  let tx=590,ty=surfaces.has(r.action)?875:1040,scale=.7;
  if(['cangkir','baskom','panci','wajan','lesung','talenan','mesin_jahit'].includes(r.target))scale=r.target==='cangkir'?.38:.65;
  if(['door','lock','peek','haunteddoor'].includes(r.action))scale=1.5;
  if(['chop','pound','wash'].includes(r.action))tx=560;
  if(r.action==='pour')tx=580;
  if(r.action==='bridge'){scale=3;ty=1080;}
  if(r.action==='coffin'){tx=560;ty=890;scale=.95;}
  if(r.action==='wash'&&r.location==='sungai'){ty=1040;}
  if(r.action==='row'){tx=590;ty=1080;scale=1.2;}
  return {tx,ty,scale,toolscale:r.action==='pour'?.45:long?1.05:['cerek','payung','keranjang','nampan'].includes(r.tool)?.65:.38,grip:long?35:100,handX:floor?535:surfaces.has(r.action)?540:550,handY:floor?867:surfaces.has(r.action)?820:840};
 }
 const walking=new Set(['walk','carry','bridge','herd','patrol','push','cycle','ride','coffin','lead','search']);
 const pairs=new Set(['transfer','exchange','talk','lead','help','embrace','coffin','eat','patrol','cleanup','wake','rock']);
 const ghost=new Set(['shadow','haunteddoor','slide','swing','mirror','footprints','reveal','hop','descend','vanish']);
 const surfaces=new Set(['chop','pound','stir','boil','pour','serve','eat','fold','weigh','sew','battery','letter','inspect','unwrap','light','extinguish','phone','wash']);
 const moves={sweep:'mengipas',wash:'mengaduk',hang:'menunjuk',fold:'membuka_bungkusan',rock:'berbicara',wake:'menunjuk',door:'menunjuk',lock:'mengaduk',chop:'mengetuk',pound:'mengetuk',stir:'mengaduk',pour:'mengaduk',serve:'membawa',eat:'makan',openstall:'menunjuk',closestall:'menunjuk',weigh:'mengaduk',talk:'berbicara',transfer:'menunjuk',exchange:'menunjuk',sew:'mengaduk',dig:'mengipas',plow:'jalan',plant:'jongkok',weed:'jongkok',harvest:'mengipas',thresh:'mengipas',tap:'mengetuk',pick:'menunjuk',water:'mengaduk',well:'mengaduk',fish:'diam',net:'mengipas',row:'mengipas',feed:'mengipas',washanimal:'mengaduk',wait:'menoleh',lost:'menoleh',strike:'mengetuk',hammer:'mengetuk',split:'mengipas',weave:'mengaduk',lead:'jalan',help:'jongkok',embrace:'berdoa',light:'menunjuk',extinguish:'menunduk',flashlight:'menunjuk',battery:'mengaduk',phone:'minum',read:'menunduk',letter:'membuka_bungkusan',inspect:'menunduk',chest:'menunduk',listen:'diam',turn:'menoleh',peek:'menunduk',hide:'jongkok',searchlow:'jongkok',retreat:'jalan',trip:'lari'};
 Object.entries(recipes).forEach(([id,r])=>ENG.def(id,{
  defaults:{tokoh:'pria',waktu:'malam',hadap:'kanan',era:'tradisional',pemicu:''},focus:[540,810],
  camKeys(c,p){
   // Koreografi: bingkai otomatis tokoh + benda yang disentuh, agar aksi terbaca di layar penuh 9:16.
   const ch=r.choreography;if(!ch||!ch.actors?.length)return [[c.t0,540,720,1],[c.t1,540,720,1.04]];
   const ids=new Set();let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
   const add=(x,y)=>{x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);};
   ch.actors.forEach((a,i)=>{for(const f of [a,...(a.frames||[])]){const x=+(f.x??a.x),y=+(f.y??a.y),k=+(f.scale??a.scale??1);if(Number.isFinite(x)&&Number.isFinite(y)){add(x-70*k,y-330*k);add(x+70*k,y);}}if(a.right_target)ids.add(a.right_target);if(a.left_target)ids.add(a.left_target);});
   for(const o of ch.objects||[])if(ids.has(o.id)||o.attached_to!=null)for(const f of [o,...(o.frames||[])]){const x=+(f.x??o.x),y=+(f.y??o.y),k=+(f.scale??o.scale??1);if(Number.isFinite(x)&&Number.isFinite(y)&&k<=1.6){add(x-60*k,y-120*k);add(x+60*k,y);}}
   if(!(x1>x0))return [[c.t0,540,720,1],[c.t1,540,720,1.04]];
   const pw=x1-x0+260,ph=y1-y0+420,z=H.cl(Math.min(787/pw,1400/ph)*1.0,1,1.45),zf=1+(z-1)/0.55;  // zf: dikompensasi peredam zoom layar penuh
   const cx=(x0+x1)/2,cy=(y0+y1)/2+30;
   return [[c.t0,cx,cy,zf],[c.t1,cx,cy-6,zf*1.04]];
  },
  build(c,p){
   if(r.choreography){c.recipe=r;return H.choreography.build(c,p,r.choreography);}
   const map={kamar:'dalam_rumah',kebun:'lapangan',sumur:'kampung'};
   const bg=map[r.location]||r.location;
   const props=[];
   if(bg==='lapangan'||bg==='jalan')props.push({jenis:'pohon_kelapa',x:5,skala:.7},{jenis:'bambu',x:98,skala:.65});
   if(r.location==='kuburan')props.push({jenis:'makam',x:80,skala:.8});
   c.recipe=r;c.profile=profile(r);const z=c.profile;const layout=p.layout||{};const clamp=(v,lo,hi)=>Number.isFinite(+v)?H.cl(+v,lo,hi):null;for(const [key,field,lo,hi] of [['target_x','tx',450,750],['target_y','ty',700,1100],['target_scale','scale',.2,1.5],['tool_scale','toolscale',.2,1.5],['hand_x','handX',400,700],['hand_y','handY',700,1000]]){if(layout[key]!=null)z[field]=clamp(layout[key],lo,hi)??z[field];} ;c.people=pairs.has(r.action)?2:ghost.has(r.action)&&!['mirror','vanish'].includes(r.action)?0:1;
   c.layout={latar:r.action==='vanish'?'jalan':bg,waktu:p.waktu,cahaya:'lampu_rumah',aktor:[],props,kustom:[],sosok:null};
   let s=base.build(c,c.layout);
   s+=`<g id="${c.id('activity')}">`;
   if(r.location==='sungai'){s+='<rect x="0" y="970" width="1080" height="430" fill="#142432"/>';for(let i=0;i<12;i++)s+=`<path d="M${150+(i%3)*170} ${990+i*28} q70 -8 160 0" stroke="#687f8c" stroke-width="3" opacity=".4" fill="none"/>`;}
   if(r.action==='vanish')s+=H.marketBackdrop(c,{waktu:p.waktu});
   if(['door','haunteddoor','lock','peek'].includes(r.action)&&['pintu','jendela'].includes(r.target)){
    s+='<rect x="550" y="600" width="320" height="450" fill="#302016" stroke="#684b32" stroke-width="8"/><rect x="565" y="685" width="160" height="360" fill="#0a0c12" stroke="#b48a52" stroke-width="8"/>';
    s+=`<g id="${c.id('doorleaf')}"><rect x="565" y="690" width="150" height="350" fill="#5d3e27" stroke="#9b784d" stroke-width="5"/><path d="M585 710V1010 M615 710V1010 M645 710V1010 M675 710V1010" stroke="#35251b" stroke-width="3"/><circle cx="590" cy="870" r="7" fill="#dab87e"/></g>`;
   }
   if(r.action==='swing')s+=`<path d="M470 1040L510 650H760L800 1040" fill="none" stroke="#95734b" stroke-width="14"/><g id="${c.id('seat')}"><path d="M560 650V930 M700 650V930" stroke="#bca47a" stroke-width="4"/><rect x="540" y="930" width="180" height="18" fill="#806341"/></g>`;
   if(r.action==='chest')s+=`<rect x="550" y="920" width="180" height="120" fill="#5b3e26" stroke="#af8752" stroke-width="5"/><g id="${c.id('lid')}"><path d="M550 920L565 860H715L730 920Z" fill="#795331" stroke="#b78c55" stroke-width="5"/></g>`;
   if(r.action==='mirror')s+=`<rect x="565" y="620" width="220" height="380" fill="#141c26" stroke="#a78c60" stroke-width="14"/>`;
   if(r.action==='flashlight'||r.action==='search'||r.action==='searchlow')s+=`<path id="${c.id('beam')}" d="M540 850L850 700L850 1030Z" fill="#d1c59a" opacity="0"/>`;

   if(surfaces.has(r.action)&&!(r.action==='wash'&&r.location==='sungai'))s+=H.meja(610,1040,320,165,'#261b13');
   if(r.action==='rock'||r.action==='wake')s+=H.dipan(655,1040,300,'#291c15');
   if(!['anak','orang','meja','dipan','bungkusan','pepohonan','gelap','hujan','ayunan','cermin'].includes(r.target)&&!(['door','haunteddoor','lock','peek','chest','vanish'].includes(r.action)))s+=asset(c,'target',r.target,z.tx,z.ty,z.scale);
   if(r.location==='pasar')s+=H.dagangan(810,1000,.8,'buah');
   if(r.location==='kebun')for(let i=0;i<5;i++)s+=asset(c,'crop'+i,'tanaman',200+i*170,1100,.55);
   if(r.action==='well')s+=asset(c,'bucket','ember',620,1010,.45);
   if(r.action==='chop')for(let i=0;i<5;i++)s+=`<ellipse id="${c.id('vegetable'+i)}" cx="${545+i*13}" cy="866" rx="13" ry="8" fill="#759353" stroke="#a8ad64" stroke-width="2"/>`;
   if(r.action==='pour')s+=`<path id="${c.id('stream')}" d="M565 800 Q570 830 580 850" fill="none" stroke="#c7914e" stroke-width="4"/>`;
   if(r.action==='unwrap')s+=H.bungkusan(c.id('wrapped'),610,870,.6,'nasi');
   if(r.action==='light'||r.action==='extinguish'||r.action==='boil'||r.action==='stir')s+=`<ellipse id="${c.id('fire')}" cx="620" cy="800" rx="120" ry="170" fill="url(#gWarm)"/><path id="${c.id('flame')}" d="M605 860 Q590 820 620 795 Q650 830 635 860Z" fill="#ffc26a"/>`;
   for(let i=0;i<c.people;i++){
    let jenis=i===0?p.tokoh:(r.action==='lead'||r.action==='rock'?'anak':r.action==='wake'?'wanita':'bapak');
    s+=H.figure(c.id('person'+i),{jenis,rim:'#d1aa74',lentera:r.tool==='lentera',obor:r.tool==='obor'});
   }
   if(!['tangan','lentera','obor','bayangan','pocong','kuntilanak','angin','kabut','jejak'].includes(r.tool))s+=asset(c,'tool',r.tool,500,850,z.toolscale);
   if(['transfer','exchange'].includes(r.action))s+=asset(c,'parcel',r.tool,550,830,.4);
   if(r.action==='exchange')s+=asset(c,'change','uang',600,850,.25);
   if(['reveal','hop','descend','mirror','shadow'].includes(r.action))s+=`<g id="${c.id('ghost')}">${H.sosok(c.id('apparition'),r.tool==='pocong'?'pocong':r.tool==='kuntilanak'?'kuntilanak':'bayangan',1)}</g>`;
   if(r.action==='footprints')for(let i=0;i<6;i++)s+=asset(c,'print'+i,'jejak',350+i*65,1010+i%2*18,.18);
   for(let i=0;i<14;i++)s+=`<circle id="${c.id('particle'+i)}" r="3" fill="${['wash','pour','water','washanimal'].includes(r.action)?'#91b7c7':'#c5ad7c'}"/>`;
   s+='</g>';return s;
  },
  upd(c,t,p){
   if(r.choreography)return H.choreography.upd(c,t,p);
   base.upd(c,t,c.layout);
   const z=c.profile;
   const begin=p.aksi_mulai_t==null?c.t0:p.aksi_mulai_t,finish=p.aksi_selesai_t==null?c.t1:p.aksi_selesai_t;
   const duration=Math.max(.01,finish-begin),u=H.cl((t-begin)/duration),elapsed=H.cl(t-begin,0,duration),active=t>=begin&&t<finish;
   const on=H.ramp(u,0,.15),off=1-H.ramp(u,.85,1),envelope=on*off,phase=elapsed*3.1,travel=walking.has(r.action)?H.ease(u)*120:0;
   const flip=p.hadap==='kiri',direction=flip?-1:1;
   for(let i=0;i<c.people;i++){
    let x=(i===0?(Number.isFinite(+p.layout?.actor_x)?H.cl(+p.layout.actor_x,300,650):470):(r.action==='lead'?580:650))+direction*travel,y=H.cl(+(p.layout?.actor_y??1040),900,1100);
    let pose=moves[r.action]|| (walking.has(r.action)?'jalan':'diam');
    
    if(i===1&&['rock','wake'].includes(r.action)){pose='tidur';x=780;}
    if(i===1&&r.action==='help')pose=u<.65?'duduk_lantai':'diam';
    if(r.action==='trip'&&u>.55)pose='tergeletak';
    if(r.action==='retreat')pose='jalan';
    if(['cycle','ride'].includes(r.action)){pose=r.action==='cycle'?'mengayuh':'duduk';x=600+direction*travel;}
    if(r.action==='row'){pose='duduk';x=570+u*100;}
    if(r.action==='wash'&&r.location==='sungai'){pose='jongkok';x=490;}
    c['person'+i]={x,y,s:i===1&&r.action==='rock'?.7:1,flip:i===0?flip:!flip,jenis:i===0?p.tokoh:(r.action==='lead'||r.action==='rock'?'anak':r.action==='wake'?'wanita':'bapak')};
    let target=['transfer','exchange','help','embrace','lead','coffin'].includes(r.action)?{x:(r.action==='coffin'?(i===0?470:650):r.action==='lead'?520:570)+direction*travel,y:r.action==='lead'?885:830}:surfaces.has(r.action)?{x:z.handX+Math.sin(phase)*8,y:z.handY+Math.cos(phase)*6}:null;
    if(['sweep','dig','split','chop','pound','wash'].includes(r.action))target={x:z.handX+Math.sin(phase)*20,y:z.handY+Math.cos(phase)*5};
    if(['rock','wake'].includes(r.action)&&i===0)target={x:555,y:860};
    if(r.action==='wash'&&r.location==='sungai')target={x:550,y:965};
    if(r.action==='pour')target={x:535,y:810};
    if(['door','lock','peek'].includes(r.action)){x=520+(r.action==='door'?100*H.ramp(u,.2,.75):0);target={x:x+70,y:870};}
    if(r.action==='chest'){x=500;target={x:570,y:875-H.ramp(u,.2,.7)*80};}
    if(r.action==='turn')pose='diam';
    if(r.action==='listen'){pose=u<.25?'jalan':'menoleh';x=430+H.ramp(u,0,.25)*70;}
    if(r.action==='retreat'){x=550-H.ease(u)*130;pose='lari_ketakutan';}
    if(r.action==='bridge'){x=330+H.ease(u)*520;}
    if(r.action==='trip'){x=470+H.ramp(u,.55,.7)*150;}

    H.poseFigure(c.id('person'+i),{...c['person'+i],pose,phase:walking.has(r.action)?H.ease(u)*(r.action==='bridge'?520:120)/100*6.283:phase,head_turn:r.action==='turn'?H.lerp(1,-1,H.ramp(u,.25,.7)):null,two_hands:['sweep','dig','split','row','thresh'].includes(r.action),blend:i===1&&['rock','wake'].includes(r.action)?1:envelope,pose_from:"diam",hand_x:active&&target?target.x:null,hand_y:active&&target?target.y:null,lentera:r.tool==='lentera',obor:r.tool==='obor'});
   }
   if(c.people){
    const h=hand(c,0),tool=c.el('tool');
    if(tool){let angle=['dig','split','sweep','strike','hammer','pound','chop'].includes(r.action)?Math.sin(phase)*(['sweep'].includes(r.action)?15:25)*envelope:r.action==='pour'?-u*65:Math.sin(phase)*8*envelope;
     const offset=(200-z.grip)*z.toolscale;
     tool.setAttribute('transform',`translate(${h.x},${h.y+offset}) rotate(${angle},0,${-offset})`);}
   }
   const wobble=Math.sin(phase)*envelope;
   let tx=z.tx,ty=z.ty,rot=0,sx=1;
   if(['cycle','ride','push','plow','herd','coffin'].includes(r.action))tx+=direction*travel;
   if(r.action==='row'){tx+=u*100;ty+=wobble*5;}
   if(r.action==='retreat')H.att(c.id('tool'),'opacity',0);
   if(['swing','weigh'].includes(r.action))rot=wobble*12;
   if(['door','haunteddoor','chest','openstall','closestall'].includes(r.action))sx=1-H.ramp(u,.15,.8)*.75;
   if(r.action==='slide')tx+=u*120;
   if(r.action==='pick'||r.action==='harvest')ty+=H.ramp(u,.35,.65)*25;
   if(['cycle','ride','push'].includes(r.action))for(let w=0;w<2;w++)H.att(c.id('targetwheel'+w),'transform',`rotate(${direction*travel*2},${w?165:35},160)`);
   H.att(c.id('target'),'transform',`translate(${tx},${ty}) rotate(${rot},0,-130) scale(${sx},1)`);
   H.att(c.id('activity'),'opacity',r.action==='vanish'?1-H.ramp(u,.3,.8):1);
   
   if(['door','haunteddoor'].includes(r.action))H.att(c.id('doorleaf'),'transform',`translate(715,0) scale(${1-H.ramp(u,.2,.8)*.85},1) skewY(${H.ramp(u,.2,.8)*-10}) translate(-715,0)`);
   if(r.action==='chest')H.att(c.id('lid'),'transform',`rotate(${-H.ramp(u,.2,.75)*75},550,920)`);
   if(r.action==='swing')H.att(c.id('seat'),'transform',`rotate(${Math.sin(elapsed*2.3)*16},630,650)`);
   if(['flashlight','search','searchlow'].includes(r.action))H.att(c.id('beam'),'opacity',H.ramp(u,.2,.35)*(.17+.05*Math.sin(elapsed*3)));
   if(['fold','letter'].includes(r.action))H.att(c.id('tool'),'transform',`translate(560,875) scale(${1-H.ramp(u,.2,.8)*.6},1)`);
   if(r.action==='hang')H.att(c.id('tool'),'transform',`translate(${H.lerp(535,620,H.ramp(u,.2,.7))},${H.lerp(850,940,H.ramp(u,.2,.7))})`);
   if(r.action==='serve')H.att(c.id('tool'),'transform',`translate(${H.lerp(535,600,H.ramp(u,.2,.7))},${H.lerp(840,875,H.ramp(u,.2,.7))})`);
   if(r.action==='pour'){const e=c.el('tool'),cam=document.getElementById('cam_'+c.i);if(e&&e.getCTM()){const m=cam.getCTM().inverse().multiply(e.getCTM()),sx=90*z.toolscale,sy=-130*z.toolscale,px=m.a*sx+m.c*sy+m.e,py=m.b*sx+m.d*sy+m.f;H.att(c.id('stream'),'d',`M${px} ${py} Q${px} 820 580 850`);}}
   if(r.action==='pour')H.att(c.id('stream'),'opacity',envelope*H.ramp(u,.2,.35)*(1-H.ramp(u,.7,.85)));
   if(r.action==='chop')for(let i=0;i<5;i++)H.att(c.id('vegetable'+i),'transform',`translate(${u*i*4},0)`);
   if(r.action==='sweep')H.att(c.id('target'),'opacity',1-u*.9);
   if(r.action==='plant')H.att(c.id('target'),'opacity',H.ramp(u,.3,.7));
   if(r.action==='harvest')H.att(c.id('target'),'transform',`translate(${tx},${ty}) scale(1,${1-H.ramp(u,.4,.8)*.7})`);
   if(r.action==='unwrap')H.bungkusUpd(c.id('wrapped'),H.ramp(u,.2,.65));
   if(r.action==='well')H.att(c.id('bucket'),'transform',`translate(620,${1020-H.ramp(u,.15,.85)*200})`);
   if(['transfer','exchange'].includes(r.action)){
    const a=hand(c,0),b=hand(c,1),k=H.ramp(u,.35,.65);
    H.att(c.id('tool'),'opacity',0);H.att(c.id('parcel'),'transform',`translate(${H.lerp(a.x,b.x,k)},${H.lerp(a.y,b.y,k)+30})`);
    if(r.action==='exchange')H.att(c.id('change'),'transform',`translate(${H.lerp(b.x,a.x,H.ramp(u,.65,.85))},${a.y+45})`);
   }
   const flame=r.action==='extinguish'?1-H.ramp(u,.3,.6):H.ramp(u,.2,.4);
   H.att(c.id('fire'),'opacity',flame*(.65+.2*H.nz(t,8)));H.att(c.id('flame'),'opacity',flame);
   for(let i=0;i<14;i++){
    const q=(elapsed*.7+i/14)%1,water=['wash','water','pour','net','washanimal'].includes(r.action),emit=active&&['sweep','wash','chop','pound','dig','thresh','water','washanimal','feed','harvest','boil','stir'].includes(r.action);
    H.att(c.id('particle'+i),'cx',590+Math.sin(i*2.4+phase*.2)*55*q);H.att(c.id('particle'+i),'cy',r.action==='wash'?865+Math.sin(i+phase)*8:(surfaces.has(r.action)?850:1000)+(water?1:-1)*q*90);
    H.att(c.id('particle'+i),'opacity',emit?Math.sin(q*Math.PI)*envelope*.8:0);
   }
   if(ghost.has(r.action)){
    const alpha=['hop','descend'].includes(r.action)?1:H.ramp(u,.2,.45);let gx=650,gy=1030;
    if(r.action==='shadow'){gx=550+u*180;gy=1000;}
    if(r.action==='mirror'){gx=675;gy=970;}
    if(r.action==='descend')gy=H.lerp(350,1030,H.ease(u));
    if(r.action==='hop')gy-=Math.abs(Math.sin(elapsed*2.3))*130*envelope;
    H.att(c.id('ghost'),'transform',`translate(${gx},${gy}) scale(.55)`);H.att(c.id('ghost'),'opacity',alpha);
    if(r.action==='footprints')for(let i=0;i<6;i++)H.att(c.id('print'+i),'opacity',H.ramp(u,i/9,(i+.6)/9));
   }
  }
 }));
})();

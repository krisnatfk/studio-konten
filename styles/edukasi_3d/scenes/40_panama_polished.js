/* Panama repair: consistent axes, draft, water levels and deterministic motion. */
(function(){
 const {lerp,ramp}=ENG.H;
 ENG.def('panama_polished',{build(c,p){
  const s=p.tahap, scene=c.scene;
  scene.background=new THREE.Color('#e7edf0');
  c.stableCamera=true;
  c.shot={target:[0,3,0],dist:94,yaw:52,pitch:37,fov:32};
  function box(w,h,d,color,x,y,z,opacity=1){
   const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.65,transparent:opacity<1,opacity,depthWrite:opacity===1}));
   m.position.set(x,y,z);scene.add(m);return m;
  }
  function vessel(x=0,y=1.8,z=0,scale=1){
   const v=K.kapalKontainer();
   // Replace the old conical bow, which resembled a protruding arrow.
   for(const o of [...v.children])if(o.geometry?.type==='ConeGeometry')v.remove(o);
   const shape=new THREE.Shape();shape.moveTo(6.7,-1.8);shape.lineTo(8.4,0);shape.lineTo(6.7,1.8);shape.closePath();
   const bow=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:1.2,bevelEnabled:false}),K.mat('#1e293b'));
   bow.rotation.x=Math.PI/2;bow.position.y=2.2;v.add(bow);
   v.scale.setScalar(scale);v.rotation.y=Math.PI/2;v.position.set(x,y-.75*scale,z);scene.add(v);return v;
  }
  function label(a,b){c.hud.push(()=>`<rect x="58" y="1390" width="964" height="134" rx="22" fill="#ffffff" fill-opacity=".94"/><rect x="58" y="1390" width="7" height="134" rx="3" fill="#237f9c"/><text x="90" y="1440" font-family="DejaVu Sans" font-size="30" font-weight="700" fill="#123544">${a}</text><text x="90" y="1487" font-family="DejaVu Sans" font-size="24" fill="#4e6571">${b}</text>`);}
  const low=1.8,high=6.3;
  const openSea=['kapal_laut','crane_larangan','mustahil_tanya','tanpa_mesin','rahasia_air','penutup_gravitasi'].includes(s);
  if(openSea){
   box(22,.7,45,'#b0bcc0',0,-1,0);
   box(22,low,45,'#439cb6',0,low/2,0,.82);
   const v=vessel();
   c.upd.push(t=>{v.position.z=lerp(3,-3,ramp(t,c.t0,c.t1));});
   c.shot={target:[0,2,0],dist:84,yaw:55,pitch:24,fov:32};
   if(s==='crane_larangan'){
    const cr=K.cranePelabuhan();cr.position.set(-7,0,0);scene.add(cr);
    c.shot.dist=85;
    c.hud.push(()=>'<circle cx="850" cy="610" r="45" fill="#fff" stroke="#cc4b48" stroke-width="8"/><path d="M820 580L880 640" stroke="#cc4b48" stroke-width="8"/>');
   }
   const text={kapal_laut:['KAPAL RAKSASA','Bagaimana memindahkan kapal ke jalur air yang lebih tinggi?'],crane_larangan:['TANPA DEREK PENGANGKAT','Kapal tetap ditopang oleh daya apung air.'],mustahil_tanya:['BISAKAH KAPAL NAIK?','Kuncinya ada pada permukaan air.'],tanpa_mesin:['TIDAK ADA KABEL PENGANGKAT','Kapal mengapung; air menopang lambungnya.'],rahasia_air:['RAHASIANYA: AIR','Atur tinggi air, kapal ikut berpindah ketinggian.'],penutup_gravitasi:['AIR + GRAVITASI','Prinsip sederhana, rekayasa yang cermat.']}[s];label(...text);return;
  }
  if(s==='lokasi_panama'||s==='tangga_bertingkat'){
   c.shot={target:[0,3,0],dist:132,yaw:38,pitch:43,fov:32};
   box(18,1,48,'#a3ba91',0,-1,0);
   const stepWater=[],stepTop=[];
   for(let i=0;i<3;i++){
    const z=15-i*15,h=low+i*2.25;
    stepWater.push(box(6,1,14.7,'#399db9',0,h/2,z,.87));
    for(const x of [-4.2,4.2])box(2,x<0?8:.4,15,'#a5b2b8',x,x<0?4:0,z);
    stepTop.push(box(6,.12,14,'#81c9d7',0,h,z));
   }
   const v=vessel(0,low,15,.55);
   c.upd.push(t=>{const k=ramp(t,c.t0,c.t1)*2;const i=Math.min(1,Math.floor(k));const f=k-i;stepWater.forEach((w,j)=>{const level=low+j*2.25+(j<i?2.25:j===i?2.25*ramp(f,0,.45):0);w.scale.y=level;w.position.y=level/2;stepTop[j].position.y=level;});v.position.z=15-i*15-15*ramp(f,.45,1);v.position.y=low+2.25*i+2.25*ramp(f,0,.45)-.75*.55;});
   label(s==='lokasi_panama'?'TERUSAN PANAMA':'TANGGA AIR BERTINGKAT','Skema prinsip pintu air • ukuran tidak berskala');return;
  }
  // Longitudinal chamber. Near wall removed as a deliberate cutaway.
  const L=24,W=6.6;
  box(12,1,64,'#899da7',0,-1.2,0);
  box(1.8,8.2,L,'#aebbc0',-4.2,3.5,0);
  box(1.9,.25,L,'#dbe1e1',-4.2,7.75,0);
  box(.45,.3,L,'#d1dadd',4,-.5,0);
  const water=box(W,1,L-.1,'#3eabc5',0,.5,0,.48);
  const upstream=box(W,high,22,'#399db7',0,high/2,-23,.68);
  const downstream=box(W,low,22,'#399db7',0,low/2,23,.68);
  const rear=K.gerbangBaja(W,8),front=K.gerbangBaja(W,8);rear.position.z=12;front.position.z=-12;scene.add(rear,front);
  // Back and front gate pivot leaves stop flush against the side walls.
  for(const gate of [rear,front])gate.setOpen=function(k){const a=lerp(.22,Math.PI/2,k);gate.userData.leftPivot.rotation.y=-a;gate.userData.rightPivot.rotation.y=a;};
  const v=vessel();
  let H=low;
  const highStages=['tanpa_crane','tanya_lanjut','air_selevel','gerbang_depan_buka','kapal_keluar','proses_turun'];
  function height(t){
   if(s==='konsep_lift')return lerp(low,high,ramp(t,c.t0+.4,c.t1-.4));
   if(s==='air_naik'||s==='kapal_terangkat')return lerp(low,high,ramp(t,62.31,71.26));
   if(s==='air_turun')return lerp(high,low,ramp(t,c.t0+.35,c.t1-.35));
   if(s==='kesimpulan_permukaan'){const k=ramp(t,c.t0,c.t1);return k<.5?lerp(low,high,ramp(k,0,.5)):lerp(high,low,ramp(k,.5,1));}
   return highStages.includes(s)?high:low;
  }
  const pipe=box(.65,.65,28,'#155875',5,-.2,0);
  const flow=[];
  for(let i=0;i<12;i++)flow.push(box(.25,.25,.6,'#7ce3ec',5,-.2,0));
  const flowing=['saluran_bawah','air_naik','kapal_terangkat','air_turun'].includes(s);
  pipe.visible=flowing;flow.forEach(o=>o.visible=flowing);
  c.upd.push(t=>{
   H=height(t);water.scale.y=H;water.position.y=H/2;
   v.position.set(0,H-.75,0);
   rear.setOpen(0);front.setOpen(0);
   if(s==='mendekati_gerbang'){v.position.z=lerp(24,21,ramp(t,c.t0,c.t1));}
   if(s==='gerbang_raksasa')v.position.z=21;
   if(s==='gerbang_buka'){v.position.z=21;rear.setOpen(ramp(t,c.t0+.2,c.t1-.2));}
   if(s==='masuk_lock'){rear.setOpen(1);v.position.z=lerp(21,0,ramp(t,c.t0+.1,c.t1-.2));}
   if(s==='ruangan_lock')rear.setOpen(1);
   if(s==='gerbang_tutup')rear.setOpen(1-ramp(t,50.27,54.46));
   if(s==='gerbang_depan_buka')front.setOpen(ramp(t,c.t0+.2,c.t1-.2));
   if(s==='kapal_keluar'){front.setOpen(1);v.position.z=lerp(0,-23,ramp(t,c.t0+.2,c.t1-.2));}
   flow.forEach((o,i)=>{const u=((t-c.t0)*.22+i/12)%1;o.position.z=lerp(-14,10,s==='air_turun'?1-u:u);});
  });
  // Higher overview for travel; side cutaway for explaining buoyancy.
  if(['mendekati_gerbang','gerbang_raksasa','gerbang_buka','masuk_lock'].includes(s)){c.shot.dist=124;c.shot.target=[0,3,9];}
  if(s==='kapal_keluar'){c.shot.dist=125;c.shot.target=[0,3,-10];}
  c.hud.push(t=>{
   const y=1180-(height(t)-low)*37;
   return `<path d="M898 955V1180M888 955H908M888 1180H908" stroke="#496b7b" stroke-width="3"/><path d="M878 ${y}H920" stroke="#167d9e" stroke-width="7"/><text x="920" y="1220" text-anchor="end" font-family="DejaVu Sans" font-size="21" fill="#48616e">ELEVASI AIR • SKEMA</text>`;
  });
  const texts={konsep_lift:['LIFT AIR','Permukaan air naik, kapal mengapung mengikutinya.'],mendekati_gerbang:['01 / MENDEKATI BILIK','Kapal sejajar dengan alur pelayaran.'],gerbang_raksasa:['GERBANG BAJA','Memisahkan dua bagian perairan.'],gerbang_buka:['02 / GERBANG MASUK TERBUKA','Air di sisi masuk dan bilik berada pada level yang sama.'],masuk_lock:['03 / KAPAL MASUK','Gerbang masuk tetap terbuka hingga kapal lewat.'],ruangan_lock:['BILIK PINTU AIR','Penampang terbuka untuk memperlihatkan bagian dalam.'],gerbang_tutup:['04 / GERBANG MASUK DITUTUP','Kapal berhenti di tengah bilik.'],saluran_bawah:['05 / AIR DARI HULU MENGALIR','Jalur biru di bawah menunjukkan saluran pengisian.'],air_naik:['06 / PERMUKAAN AIR NAIK','Kedua gerbang tertutup selama pengisian.'],kapal_terangkat:['KAPAL MENGIKUTI AIR','Jarak lambung terhadap permukaan air tetap.'],tanpa_crane:['DITOPANG DAYA APUNG','Lunas kapal tidak menyentuh lantai bilik.'],tanya_lanjut:['BAGAIMANA KAPAL KELUAR?','Samakan dulu ketinggian air di kedua sisi.'],air_selevel:['07 / KETINGGIAN AIR SAMA','Permukaan air bilik sejajar dengan kanal hulu.'],gerbang_depan_buka:['08 / GERBANG KELUAR DIBUKA','Ketinggian air sudah seimbang.'],kapal_keluar:['09 / KAPAL MELANJUTKAN PELAYARAN','Kapal bergerak setelah gerbang terbuka penuh.'],proses_turun:['UNTUK TURUN: URUTAN DIBALIK','Kapal mulai dari permukaan air yang tinggi.'],air_turun:['AIR KELUAR, KAPAL TURUN','Gerbang tetap tertutup saat air dikurangi.'],kesimpulan_permukaan:['YANG DIATUR ADALAH AIR','Kapal tetap mengapung saat permukaan naik dan turun.']};
  label(...(texts[s]||['PINTU AIR','Skema cara kerja bilik pintu air.']));
 }});
})();

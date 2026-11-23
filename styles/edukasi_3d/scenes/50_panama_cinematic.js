/* Panama repair: consistent axes, draft, water levels and deterministic motion. */
(function(){
 const {lerp,ramp}=ENG.H;
 ENG.def('panama_cinematic',{build(c,p){
  const s=p.tahap, scene=c.scene;c.R=ENG.H.rng(4982);
  scene.background=new THREE.Color('#94c5dc');scene.fog=new THREE.Fog('#94c5dc',100,430);
  c.stableCamera=true;
  c.shot={target:[0,3,0],dist:63,yaw:49,pitch:40,fov:40};
  function texture(kind){
   window.__panamaTextures=window.__panamaTextures||{};if(window.__panamaTextures[kind])return window.__panamaTextures[kind];
   const cv=document.createElement('canvas');cv.width=cv.height=256;const cx=cv.getContext('2d');const img=cx.createImageData(256,256);
   let seed=391;for(let i=0;i<img.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=kind==='grass'?150+(seed%70):185+(seed%40);img.data[i]=img.data[i+1]=img.data[i+2]=n;img.data[i+3]=255;}cx.putImageData(img,0,0);
   const tx=new THREE.CanvasTexture(cv);tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(12,12);window.__panamaTextures[kind]=tx;return tx;
  }
  function box(w,h,d,color,x,y,z,opacity=1){
   const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.65,transparent:opacity<1,opacity,depthWrite:opacity===1}));
   if(['#7f9276','#849879','#829b78'].includes(color)){m.material.map=texture('grass');m.material.color.set('#739665');}else if(['#aebbc0','#899da7','#a4a69b'].includes(color))m.material.map=texture('concrete');
   m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;
  }
  function vessel(x=0,y=1.8,z=0,scale=1){
   const v=K.kapalKontainer();
   // Replace the old conical bow, which resembled a protruding arrow.
   for(const o of [...v.children])if(o.geometry?.type==='ConeGeometry')v.remove(o);
   const shape=new THREE.Shape();shape.moveTo(6.7,-1.8);shape.lineTo(8.4,0);shape.lineTo(6.7,1.8);shape.closePath();
   const bow=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:1.2,bevelEnabled:false}),K.mat('#1e293b'));
   bow.rotation.x=Math.PI/2;bow.position.y=2.2;v.add(bow);
   // Cargo ribs catch the light instead of reading as smooth toy blocks.
   v.userData.containers.children.forEach(o=>{
    const g=o.geometry.parameters;
    for(let j=0;j<7;j++){
     const rib=new THREE.Mesh(new THREE.BoxGeometry(.027,g.height,.025),o.material);
     rib.position.set(o.position.x-g.width/2+(j+.5)*g.width/7,o.position.y,o.position.z+g.depth/2+.012);v.add(rib);
    }
   });
   for(const zrail of [-1.72,1.72]){
    const rail=new THREE.Mesh(new THREE.BoxGeometry(13,.055,.055),K.mat('#d8dddd'));rail.position.set(0,2.65,zrail);v.add(rail);
    for(let q=0;q<18;q++){const post=new THREE.Mesh(new THREE.BoxGeometry(.04,.45,.04),K.mat('#d8dddd'));post.position.set(-6+q*.72,2.43,zrail);v.add(post);}
   }
   v.scale.setScalar(scale);v.rotation.y=Math.PI/2;v.position.set(x,y-.75*scale,z);scene.add(v);
   const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;const ctx=canvas.getContext('2d');
   for(let i=0;i<95;i++){const f=i/95;ctx.strokeStyle=`rgba(222,247,247,${(1-f)*.13})`;ctx.lineWidth=2+f*5;ctx.beginPath();ctx.moveTo(110-f*85,20+f*470);ctx.lineTo(128,8+f*450);ctx.lineTo(146+f*85,20+f*470);ctx.stroke();}
   const tex=new THREE.CanvasTexture(canvas);const wake=new THREE.Mesh(new THREE.PlaneGeometry(8*scale,14*scale),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:.65}));wake.rotation.x=-Math.PI/2;scene.add(wake);
   c.afterUpd=c.afterUpd||[];c.afterUpd.push(t=>{wake.position.set(v.position.x,v.position.y+.75*scale+.065,v.position.z+12*scale);});
   return v;
  }
  function label(){} // Clean picture master; subtitles supplied separately.
  function sea(w,d,x,y,z){
   const mat=new THREE.ShaderMaterial({transparent:false,uniforms:{time:{value:0},base:{value:new THREE.Color('#167d97')}},vertexShader:`
    uniform float time; varying vec3 wp; varying vec3 vn;
    void main(){vec3 p=position;float x=p.x,z=p.z;
    p.y+=.055*sin(x*.8+time*.65)+.035*sin(z*1.3-time*.8)+.018*sin(x*2.8+z*1.9+time);
    wp=(modelMatrix*vec4(p,1.)).xyz;
    vn=normalize(vec3(-.044*cos(x*.8+time*.65)-.05*cos(x*2.8+z*1.9+time),1.,-.045*cos(z*1.3-time*.8)-.034*cos(x*2.8+z*1.9+time)));
    gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}`,fragmentShader:`
    uniform float time; uniform vec3 base; varying vec3 wp;varying vec3 vn;
    void main(){vec3 n=normalize(vn),v=normalize(cameraPosition-wp);float f=pow(1.-max(dot(n,v),0.),3.);
    vec3 col=mix(base,vec3(.46,.72,.80),f*.75);
    vec3 l=normalize(vec3(-.5,1.,.6));float glint=pow(max(dot(reflect(-l,n),v),0.),110.);
    float ripple=(sin(wp.x*3.7+wp.z*4.1+sin(wp.z*.21)+time)+sin(wp.z*9.3-wp.x*1.7-time*.5))*.006;
    col+=glint*vec3(1.,.89,.66)*.85+ripple;
    float fog=1.-exp(-length(cameraPosition-wp)*.0015);col=mix(col,vec3(.58,.77,.86),fog);
    gl_FragColor=vec4(col,1.);}`});
   const geo=new THREE.PlaneGeometry(w,d,Math.min(180,Math.ceil(w*3)),Math.min(180,Math.ceil(d*3)));geo.rotateX(-Math.PI/2);
   const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);scene.add(o);c.upd.push(t=>mat.uniforms.time.value=t);return o;
  }
  if(['kapal_laut','crane_larangan','mustahil_tanya','tanpa_mesin','rahasia_air','penutup_gravitasi'].includes(s))sea(1400,1400,0,1.8,0);
  // Distant terrain and wooded banks give the water a continuous setting.
  function tree(x,z,ground=2.1,scale=1){
   if(x>0&&Math.abs(z)<48)return;
   const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.10,.16,1.5,6),K.mat('#78654c'));trunk.scale.y=scale;trunk.position.set(x,ground+.75*scale,z);trunk.castShadow=true;scene.add(trunk);
   const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.1*scale,1),K.mat(['#427557','#56825a','#356651'][Math.floor(c.R()*3)]));crown.castShadow=true;crown.scale.y=1.3;crown.position.set(x,ground+2*scale,z);scene.add(crown);for(let j=0;j<3;j++){const leaf=crown.clone();leaf.scale.setScalar(.72);leaf.position.x+=Math.sin(j*2.1)*scale*.7;leaf.position.z+=Math.cos(j*2.1)*scale*.7;leaf.position.y+=.3*scale;scene.add(leaf);}
  }
  const low=1.8,high=6.3;
  c.shotAt=t=>{const q=c.shot;const k=ramp(t,c.t0,c.t1);return {...q,target:q.target.map((v,i)=>i===2&&['kapal_laut','crane_larangan','mustahil_tanya','tanpa_mesin','rahasia_air','penutup_gravitasi'].includes(s)?v+lerp(3,-3,k):v),yaw:q.yaw+lerp(-2,2,k),dist:q.dist*lerp(1.025,.985,k)};};

  const openSea=['kapal_laut','crane_larangan','mustahil_tanya','tanpa_mesin','rahasia_air','penutup_gravitasi'].includes(s);
  if(openSea){
   
   
   const v=vessel();
   c.upd.push(t=>{v.position.z=lerp(3,-3,ramp(t,c.t0,c.t1));v.rotation.z=Math.sin(t*.7)*.007;v.position.y=low-.75+Math.sin(t*.8)*.025;});
   c.shot={target:[0,2,0],dist:43,yaw:58,pitch:20,fov:40};
   if(s==='crane_larangan'){
    const cr=K.cranePelabuhan();cr.position.set(-11,1.9,0);scene.add(cr);
    c.shot.dist=66;box(9,4,14,'#869397',-22,3.8,-12);box(9.5,.4,14.5,'#415a65',-22,6,-12);for(let j=0;j<9;j++)box(2,.9,1,'#ae5b38',-14-(j%3)*2.2,2.35,-14+Math.floor(j/3)*2);box(34,4,140,'#a4a69b',-25,-.1,0);for(let i=0;i<12;i++)box(.35,.45,.35,'#374d51',-8.2,2.1,-25+i*4);
    false && c.hud.push(()=>'<circle cx="850" cy="610" r="45" fill="#fff" stroke="#cc4b48" stroke-width="8"/><path d="M820 580L880 640" stroke="#cc4b48" stroke-width="8"/>');
   }
   if(s==='mustahil_tanya')c.shot={target:[0,3,-1],dist:31,yaw:76,pitch:10,fov:42};
   if(s==='rahasia_air')c.shot={target:[0,1.8,-1],dist:35,yaw:64,pitch:17,fov:40};
   if(s==='penutup_gravitasi')c.shot={target:[0,2,0],dist:56,yaw:40,pitch:28,fov:40};
   const text={kapal_laut:['KAPAL RAKSASA','Bagaimana memindahkan kapal ke jalur air yang lebih tinggi?'],crane_larangan:['TANPA DEREK PENGANGKAT','Kapal tetap ditopang oleh daya apung air.'],mustahil_tanya:['BISAKAH KAPAL NAIK?','Kuncinya ada pada permukaan air.'],tanpa_mesin:['TIDAK ADA KABEL PENGANGKAT','Kapal mengapung; air menopang lambungnya.'],rahasia_air:['RAHASIANYA: AIR','Atur tinggi air, kapal ikut berpindah ketinggian.'],penutup_gravitasi:['AIR + GRAVITASI','Prinsip sederhana, rekayasa yang cermat.']}[s];label(...text);return;
  }
  if(s==='lokasi_panama'||s==='tangga_bertingkat'){
   c.shot={target:[0,3,0],dist:83,yaw:30,pitch:50,fov:40};
   box(65,5,180,'#829b78',-40,.5,0);box(65,5,180,'#829b78',40,.5,0);for(let i=0;i<100;i++)tree((i%2?1:-1)*(10+c.R()*55),-65+c.R()*130,3,.8+c.R());
   sea(14,120,0,low,82);sea(14,120,0,high,-82);box(16,2,180,'#697b69',0,-1.5,0);const stepWater=[],stepTop=[];
   for(let i=0;i<3;i++){
    const z=15-i*15,h=low+i*2.25;
    stepWater.push(box(6,1,14.7,'#399db9',0,h/2,z,.87));
    for(const x of [-4.2,4.2])box(2,x<0?8:.4,15,'#a5b2b8',x,x<0?4:0,z);
    stepTop.push(sea(6,14.7,0,h,z));
   }
   const v=vessel(0,low,15,.55);
   c.upd.push(t=>{const k=ramp(t,c.t0,c.t1)*2;const i=Math.min(1,Math.floor(k));const f=k-i;stepWater.forEach((w,j)=>{const level=low+j*2.25+(j<i?2.25:j===i?2.25*ramp(f,0,.45):0);w.scale.y=level-.13;w.position.y=(level-.13)/2;stepTop[j].position.y=level;});v.position.z=15-i*15-15*ramp(f,.45,1);v.position.y=low+2.25*i+2.25*ramp(f,0,.45)-.75*.55;});
   label(s==='lokasi_panama'?'TERUSAN PANAMA':'TANGGA AIR BERTINGKAT','Skema prinsip pintu air • ukuran tidak berskala');return;
  }
  // Longitudinal chamber. Near wall removed as a deliberate cutaway.
  const L=24,W=6.6;
  box(100,10,180,'#7f9276',-57,-2,0);box(100,10,180,'#849879',57,-2,0);
  for(let i=0;i<95;i++){const sign=i%2?1:-1;tree(sign*(10+c.R()*43),-78+c.R()*156,3, .7+c.R()*1.2);}
  box(16,2,180,'#697b69',0,-1.5,0);box(10,1,65,'#8e9d9c',0,-1.2,0);
  box(1.8,8.2,L,'#aebbc0',-4.2,3.5,0);
  box(1.9,.25,L,'#dbe1e1',-4.2,7.75,0);
  box(.45,.3,L,'#d1dadd',4,-.5,0);
  const water=box(W,1,L-.1,'#277f99',0,.5,0,.55);const waterTop=sea(W,L-.1,0,low,0);
  const upstream=box(14,high-.13,140,'#277f99',0,(high-.13)/2,-82,1);sea(14,140,0,high,-82);
  const downstream=sea(14,140,0,low,82);
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
   H=height(t);waterTop.position.y=H;water.scale.y=H-.13;water.position.y=(H-.13)/2;
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
  if(['mendekati_gerbang','gerbang_raksasa','gerbang_buka','masuk_lock'].includes(s)){c.shot.dist=100;c.shot.target=[0,3,13];}
  if(s==='kapal_keluar'){c.shot.dist=85;c.shot.target=[0,3,-10];}
  if(['saluran_bawah','air_naik','kapal_terangkat','tanpa_crane','air_turun','kesimpulan_permukaan'].includes(s))c.shot={target:[0,3.5,0],dist:69,yaw:65,pitch:29,fov:42};
  false && c.hud.push(t=>{
   const y=1180-(height(t)-low)*37;
   return `<path d="M898 955V1180M888 955H908M888 1180H908" stroke="#496b7b" stroke-width="3"/><path d="M878 ${y}H920" stroke="#167d9e" stroke-width="7"/><text x="920" y="1220" text-anchor="end" font-family="DejaVu Sans" font-size="21" fill="#48616e">ELEVASI AIR • SKEMA</text>`;
  });
  const texts={konsep_lift:['LIFT AIR','Permukaan air naik, kapal mengapung mengikutinya.'],mendekati_gerbang:['01 / MENDEKATI BILIK','Kapal sejajar dengan alur pelayaran.'],gerbang_raksasa:['GERBANG BAJA','Memisahkan dua bagian perairan.'],gerbang_buka:['02 / GERBANG MASUK TERBUKA','Air di sisi masuk dan bilik berada pada level yang sama.'],masuk_lock:['03 / KAPAL MASUK','Gerbang masuk tetap terbuka hingga kapal lewat.'],ruangan_lock:['BILIK PINTU AIR','Penampang terbuka untuk memperlihatkan bagian dalam.'],gerbang_tutup:['04 / GERBANG MASUK DITUTUP','Kapal berhenti di tengah bilik.'],saluran_bawah:['05 / AIR DARI HULU MENGALIR','Jalur biru di bawah menunjukkan saluran pengisian.'],air_naik:['06 / PERMUKAAN AIR NAIK','Kedua gerbang tertutup selama pengisian.'],kapal_terangkat:['KAPAL MENGIKUTI AIR','Jarak lambung terhadap permukaan air tetap.'],tanpa_crane:['DITOPANG DAYA APUNG','Lunas kapal tidak menyentuh lantai bilik.'],tanya_lanjut:['BAGAIMANA KAPAL KELUAR?','Samakan dulu ketinggian air di kedua sisi.'],air_selevel:['07 / KETINGGIAN AIR SAMA','Permukaan air bilik sejajar dengan kanal hulu.'],gerbang_depan_buka:['08 / GERBANG KELUAR DIBUKA','Ketinggian air sudah seimbang.'],kapal_keluar:['09 / KAPAL MELANJUTKAN PELAYARAN','Kapal bergerak setelah gerbang terbuka penuh.'],proses_turun:['UNTUK TURUN: URUTAN DIBALIK','Kapal mulai dari permukaan air yang tinggi.'],air_turun:['AIR KELUAR, KAPAL TURUN','Gerbang tetap tertutup saat air dikurangi.'],kesimpulan_permukaan:['YANG DIATUR ADALAH AIR','Kapal tetap mengapung saat permukaan naik dan turun.']};
  label(...(texts[s]||['PINTU AIR','Skema cara kerja bilik pintu air.']));
 }});
})();

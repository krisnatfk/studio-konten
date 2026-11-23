(() => {
  const {ctx,ink,path,oval,box,round,line,gradient,at,hash,clamp,smooth,shadow,landscape,palm,wood,actor,prop,kite} = Stik;
  const scenes=Stik.scenes;
  scenes.halaman=(p,t,u)=>{
    const grove=p.latar==='kebun';
    landscape(t,733,grove,p.waktu==='sore');
    if(!grove)palm(-17,678,1.43,t);
    const x=(p.teman==='sendiri'?246:153)+(p.aksi==='jalan'?smooth(u)*77:0);
    if(p.teman!=='sendiri')actor(394,707,1.42,p.teman,'diam','senang',t+.8,'kosong',true);
    actor(x,746,1.73,p.tokoh,p.aksi,p.ekspresi,t,p.benda);
    for(const item of p.kustom||[]){
      if (!item.path || (item.t!=null && t<item.t) || (item.akhir_t!=null && t>=item.akhir_t))continue;
      const color=/^#[a-f0-9]{3}(?:[a-f0-9]{3})?$/i.test(item.warna)?item.warna:'#c68a58';
      at(item.x??270,item.y??700,Math.max(.05,Math.min(5,item.skala??1)),()=>path(item.path,color,ink,2.5));
    }
  };
  scenes.layang_layang=(p,t,u)=>{
    landscape(t,751);
    if(p.acara==='lomba'||p.acara==='menang'){
      line(259,632,259,518,'#715737',4);line(499,632,499,518,'#715737',4);
      path('M254 525 Q380 536 501 523 V552 Q382 564 254 553Z','#ae5840','#704535',2);
      ctx.font='bold 13px "DejaVu Sans",sans-serif';ctx.fillStyle='#ffe7af';ctx.textAlign='center';ctx.fillText('LOMBA LAYANGAN',380,546);
    }
    if(p.acara==='menang'){
      actor(406,716,1.17,'petani','tunjuk','senang',t,'kosong',true);
      at(323,697,1,()=>{
        round(-32,-2,64,8,2,'#956642',ink,2);line(-24,6,-24,35,ink,3);line(24,6,24,35,ink,3);
        path('M-13 -48 Q-34 -56 -22 -33 L-13 -29 M13 -48 Q33 -56 22 -33 L12 -29',null,'#c29641',4);
        path('M-16 -51 H16 Q17 -28 3 -23 V-12 L13 -8 H-13 L-3 -12 V-23 Q-17 -29 -16 -51Z','#f0c45b',ink,2);
      });
    }
    const fly=smooth(u*1.6),fall=p.aksi==='jatuh';
    const x=318+63*Math.sin(.65*t), y=(fall?204+304*fly:377-175*fly)+14*Math.sin(t*1.8);
    for(let i=0;i<3;i++)kite(50+i*198,135+48*Math.sin(i+t*.56),.17+.04*i,t+i,false,['#e6bb4f','#9d79a9','#e98762'][i],true,.14*Math.sin(t+i));
    const gripX=137+46*1.32,gripY=746+(-156+3*Math.sin(t*3)+Math.sin(t*2)*1.1)*1.32;
    path(`M${gripX} ${gripY} Q${x-27} ${(gripY+y)/2+48} ${x} ${y}`,null,'#584749',2);
    actor(137,746,1.32,p.tokoh,'angkat',fall?'cemas':'senang',t,'gulungan');
    kite(x,y,1.04,t,p.lubang,'#df5244',true,.12*Math.sin(t*1.7)+(fall?.55*fly:0));
  };
  scenes.meja_kerja=(p,t,u)=>{
    wood(-100,-100,740,1100,true);
    round(314,107,205,245,2,'#58432e',ink,5);
    ctx.save();ctx.beginPath();ctx.rect(325,119,181,220);ctx.clip();
    box(325,119,181,220,gradient(119,220,'#8bbfe4','#f1d6a3'));
    palm(473,372,.74,t);ctx.restore();
    line(411,117,411,340,'#6a4c32',8);line(325,235,505,235,'#6a4c32',8);
    // Outils suspendus et établi au premier plan.
    line(26,241,195,241,'#543c2e',8);
    for(let i=0;i<4;i++) {
      const x=42+i*45;round(x,235,8,72+i%2*20,3,'#c99755',ink,2);
      round(x-3,281,14,35,4,i%2?'#718583':'#ab7650',ink,2);
    }
    const lift=p.aksi==='angkat'?smooth(u*1.7)*96:0;
    const x=343+Math.sin(t*2)*3, y=599-lift;
    actor(191,781,1.6,p.tokoh,'pegang','bicara',t,'kosong',false,[x-73,y-17]);
    wood(-100,651,750,420);path('M-100 651 L-50 608 554 608 650 651Z','#e6bd84','#77583c',3);
    kite(x,y,1.22,t,p.lubang,'#d95743',false,-.10+lift*.001);
    oval(x-73,y-15,6,7,'#d39b73',ink,2);
    prop('gulungan',78,622,1.15);line(433,635,504,616,'#886139',4);
    line(436,630,511,602,'#a4793d',3);
  };
  function groveFloor(t) {
    landscape(t,748,true,true);
    // Tanah merah, berkas cahaya dan bayangan pelepah membuat kedalaman kebun.
    path('M-90 701 Q145 625 332 673 T635 625 V1080 H-90Z',gradient(650,365,'#b88a50','#c6864c','#98653e'));
    for(let i=0;i<490;i++){
      const x=hash(i+191)*730-95, y=661+hash(i+82)*350;
      if(y<688+Math.sin(x*.011)*15)continue;
      const k=(y-600)/320;
      oval(x,y,2+(6+hash(i+5)*17)*k,1.2+hash(i+41)*3*k,
           ['#69722f66','#c2774177','#e3ab6690','#7c713d73'][i%4],null,0,-.14);
    }
    // Pagar bambu dekat dan sebuah karung di kaki pohon.
    for(const yy of [628,656])line(-50,yy,580,yy-9,'#b9924d',5);
    for(let i=-1;i<12;i++){const x=i*59;line(x,681-i*.8,x-2,611-i*.8,'#a37b42',7);line(x-1,622-i*.8,x+1,625-i*.8,'#e1ba73',3);}
    for(let i=0;i<6;i++){
      const x=424+32*Math.cos(i*2.3),y=687+i*7;
      prop('kelapa',x,y,.7+i*.041);
    }
    at(86,713,1,()=>{
      path('M-19 -52 Q0 -58 18 -52 L9 -40 Q36 -10 24 4 Q2 14 -25 4 Q-34 -11 -11 -40Z','#d4b280','#695341',2);
      path('M-24 -8 Q0 0 26 -9 L24 0 Q2 9 -24 0Z','#a86149');
      line(-12,-41,12,-41,'#74513d',3);path('M-17 -2q2 -24 9 -30',null,'#e7ca95',2.1);
    });
    palm(43,677,1.65,t+.6);palm(513,666,1.78,t+1);
    palm(-4,839,2.88,t+.4);
    const light=ctx.createRadialGradient(128,265,4,128,265,349);
    light.addColorStop(0,'#fff6b133');light.addColorStop(1,'#ffe6a300');
    box(-100,-70,750,1000,light);

  }
  scenes.kebun_kelapa=(p,t,u)=>{
    groveFloor(t);
    const walk=p.aksi==='jalan',x=walk?167+smooth(u)*110:255;
    actor(x,748,1.78,p.tokoh,p.aksi,p.ekspresi,t,p.benda);
    for(let i=0;i<13;i++){
      const x=(hash(i)*610+t*(2+i%4))%610-35,y=320+hash(i+280)*370+Math.sin(t+i)*4;
      oval(x,y,1.2,1.7,'#ffe59a99');
    }
  };
  scenes.catatan=(p,t,u)=>{
    wood(-100,-100,740,1160,true);
    at(270,490,1.04,()=>{
      round(-173,-244,353,475,11,'#50382c');
      round(-177,-252,350,473,10,'#ab733f',ink,4);
      round(-161,-237,322,442,7,gradient(-237,443,'#f6dfa5','#ffeabd','#e6c785'),'#b69660',3);
      line(-135,-222,-135,187,'#d6a77a',2);
      for(let i=0;i<13;i++)line(-142,-176+i*27,145,-176+i*27,'#b79f732f',1);
      at(1,-49,1,()=>{
        if(p.benda==='layang')kite(0,0,.89,t,false,'#c88d5b',false,-.08);
        else if(p.benda==='kelapa'){prop('kelapa',0,0,1.9);path('M15 -31Q35 -83 66 -58Q56 -29 15 -31Z','#98a253','#756e4a',2);}
        else prop('bibit',0,13,2.1);
      });
      const words=(p.catatan||'').split(/\s+/);
      ctx.fillStyle='#5b4636';ctx.textAlign='center';ctx.font='bold 24px "DejaVu Sans", sans-serif';
      let row='', rows=[];
      for(const word of words){const next=(row+' '+word).trim();if(row&&ctx.measureText(next).width>245){rows.push(row);row=word;}else row=next;}
      if(row)rows.push(row);
      rows.forEach((v,i)=>ctx.fillText(v,0,75+i*29,255));
      path('M-73 164 Q-4 159 74 163',null,'#bb8350',2);
    },-.075+.022*smooth(u));
  };
})();

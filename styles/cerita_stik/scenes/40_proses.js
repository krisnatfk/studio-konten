(() => {
  const {ctx,ink,path,oval,box,round,line,gradient,at,hash,clamp,smooth,landscape,palm,house,actor,prop,kite} = Stik;
  const scenes=Stik.scenes;
  function arrow(x,y,len,color,vertical=false) {
    at(x,y,1,()=>path(`M0 -2.5H${len-12}V-9L${len} 0 ${len-12} 9V2.5H0Z`,color,ink,1.4),vertical?-Math.PI/2:0);
  }
  scenes.diagram_angin=(p,t,u)=>{
    box(-100,-100,740,1160,gradient(0,960,'#82b8e7','#b8ddf1','#e6f4f2'));
    const hole=p.kondisi==='berlubang';
    kite(314,469,2.34,t,hole,'#e75c48',true,-.025);
    for(let i=0;i<5;i++){
      const phase=(t*.75+i*.13)%1;
      const x=10+phase*33;
      arrow(x,350+i*59,112+18*Math.sin(i),'#fff5d6');
    }
    if(hole){
      const x=307+(t*.8%1)*49;
      arrow(x,479,84,'#fff8d6');
      for(let i=0;i<2;i++)path(`M410 ${468+i*15} q35 -12 73 -5`,null,'#fffbed',2.4);
    }else{
      for(const s of [-1,1])path(`M188 477 Q176 ${477+s*40} 203 ${477+s*77}`,null,'#fff8dc',4);
    }
  };
  function ground(y){
    box(-100,y,740,1050-y,gradient(y,1000-y,'#985c38','#854b30','#693c2c'));
    for(let i=0;i<125;i++){
      const x=hash(i)*700-80,yy=y+11+hash(i+47)*(1010-y);
      oval(x,yy,1+hash(i+28)*4,1+hash(i+18)*2,i%3?'#55312342':'#d496594d',null,0,hash(i));
    }
    box(-100,y-5,740,9,'#65482b'); box(-100,y-11,740,7,'#84a653');
  }
  scenes.akar_kelapa=(p,t,u)=>{
    landscape(t,304,true);palm(264,315,1.21,t);ground(307);
    at(271,309,1,()=>{
      path('M-42 -237 Q-14 -131 -25 -4 L-39 18 Q-3 29 37 13 Q14 -126 -5 -237Z',gradient(-237,270,'#9d855b','#8d7048','#b69561'),ink,2);
      for(let i=0;i<9;i++)path(`M${-21-i*1.4} ${-18-i*24} q20 6 36 -2`,null,'#71583f',2);
    });
    for(let i=0;i<15;i++){
      const f=(i-7)/7,ey=640+98*hash(i),ex=270+f*210,start=259+26*hash(i+4);
      path(`M${start} 317 C${270+f*27} 390 ${ex-30*f} 453 ${ex} ${ey}`,null,'#68432d',8);
      path(`M${start} 317 C${270+f*27} 390 ${ex-30*f} 453 ${ex} ${ey}`,null,i%2?'#e4b77a':'#d49e61',4.6);
      for(let j=0;j<3;j++){
        const v=.57+.12*j,xx=270+(ex-270)*v,yy=318+(ey-318)*v;
        path(`M${xx} ${yy} q${f*17+5} 19 ${f*33+4} 26`,null,'#d6ac70',2);
      }
    }
    for(let i=0;i<20;i++){
      const side=i%2?1:-1,phase=(.3+t*.24+i*.113)%1;
      const x=270+side*(205*(1-phase)+24),y=698-phase*289+Math.sin(i)*42;
      const color=p.zat==='air'?'#84cfde':['#c2cf67','#af8ac4','#e2b770'][i%3];
      oval(x,y,5+hash(i)*4,6+hash(i)*4,color,'#704f46',1.4);
    }
  };
  scenes.tangki=(p,t,u)=>{
    landscape(t,414,false,p.waktu==='sore',false);ground(420);
    palm(24,409,.9,t);house(518,410,.66);
    actor(102,407,.83,'petani','tunjuk','senang',t);
    actor(424,407,.8,'warga','diam',p.cuaca==='hujan'?'cemas':'senang',t+.8,'kosong',true);
    const open=p.tahap==='lubang',gas=p.tahap==='gas'||p.tahap==='aliran';
    if(p.tahap==='tertutup')actor(262,407,.76,'pekerja','tunjuk','bicara',t);
    if(open) {
      path('M144 409 H373 L365 724 H151Z','#513624','#654027',4);
      path('M144 410 L173 454 175 691 151 724Z','#67432b');
      line(313,714,338,385,'#b08757',4);line(345,714,370,385,'#b08757',4);
      for(let i=0;i<11;i++)line(314+i*2.3,699-i*29,345+i*2.3,699-i*29,'#ba935e',3);
      actor(235,710,.85,'pekerja','tunjuk','bicara',t);
    } else {
      path('M239 412 V383 H280 V413 Q363 418 366 489 L366 669 Q365 720 323 725 H193 Q152 722 150 673 V494 Q150 429 239 412Z',gas?'#84649d':'#54434c','#493b3b',7);
      path('M166 569 Q212 556 263 569 T350 561 V667 Q350 709 318 710 H198 Q166 709 166 675Z','#644632');
      if(p.tahap==='isi')oval(259,380,19,5,'#372e35','#796a70',3);
      else round(230,366,58,16,3,gas?'#9276a3':'#626067',ink,3);
    }
    for(let i=0;i<22;i++){
      if(open)break;
      const x=185+hash(i)*143,y=697-hash(i+90)*25,fall=p.tahap==='isi'&&i%4===0;
      const phase=(t*.65+i*.31)%1, yy=fall?369+phase*316:y;
      at(fall?259+(x-259)*phase*phase:x,yy,.6+hash(i+30)*.33,()=>path('M-9 0 Q-10 -12 4 -9 L12 -12 Q12 2 3 6Z',['#b5ad51','#cb8651','#7f9849','#b37b48'][i%4],ink,1.3),hash(i)*4);
    }
    if(gas) {
      for(let i=0;i<14;i++){
        const phase=(i*.21+t*.43)%1, r=2+4*Math.sin(phase*Math.PI);
        const x=185+hash(i+29)*142+6*Math.sin(phase*7+i);
        oval(x,676-phase*200,r,r,'#e4ceeb','#bea6cb',1);
      }
    }
    if(gas || p.tahap==='terurai'){
      for(let i=0;i<6;i++){
        at(190+i*25,672+Math.sin(t*2+i)*5,.85,()=>{
          for(let j=0;j<7;j++){const a=j*Math.PI*2/7;line(4*Math.cos(a),4*Math.sin(a),8*Math.cos(a),8*Math.sin(a),'#584b57',1.5);}
          oval(0,0,6,5,i%2?'#dcb171':'#a9bb62','#51434c',1.4);
          oval(-1,-1,1,1,ink);
        },.3*Math.sin(t+i));
      }
      if(p.tahap==='aliran'){
        path('M261 366V356 Q261 348 276 348 H341 Q353 348 353 359 V391 H494',null,ink,15);
        path('M261 366V356 Q261 348 276 348 H341 Q353 348 353 359 V391 H494',null,'#aaa4a3',9);
        for(let i=0;i<3;i++){const u=(t*38+i*72)%204;const x=u<67?274+u:354+u-67;line(x,u<67?348:391,x+6,u<67?348:391,'#f3d6ff',3);}
      }
    }
  };
  scenes.dapur=(p,t,u)=>{
    box(-100,-100,740,1160,gradient(0,960,'#f3d3a0','#d8ba83'));
    box(-100,246,740,293,'#adc3bc');
    for(let i=-1;i<10;i++)line(i*72,246,i*72,539,'#91a9a2',2);
    for(let i=0;i<5;i++)line(-70,246+i*72,640,246+i*72,'#91a9a2',2);
    Stik.wood(281,310,235,15);
    for(let i=0;i<4;i++){round(297+i*53,272-i%2*13,29,39+i%2*13,5,['#c98d49','#a3a95a','#ca7551','#7aa6a8'][i],ink,2);round(297+i*53,267-i%2*13,29,7,2,'#684a3d');}
    actor(113,790,1.44,p.tokoh,'tunjuk','bicara',t);
    Stik.wood(210,594,410,425);
    round(213,576,385,24,5,'#dacba6',ink,3);
    round(254,548,205,29,6,'#667a79',ink,3);
    const burn=p.nyala?smooth(u*4):0;
    if(burn) for(let i=0;i<7;i++)at(292+i*20,548,burn,()=>path(`M-8 0 Q-12 -9 0 ${-27-6*Math.sin(t*7+i)} Q-1 -12 7 -7 Q12 2 -8 0Z`,'#57bee7','#3a8ac2',1.3));
    path('M279 462 Q276 505 295 518 Q346 535 403 517 Q417 495 415 462Z',gradient(462,65,'#c1cbbe','#819491'),ink,3.2);
    round(260,470,22,9,4,'#534c47',ink,2);round(415,470,22,9,4,'#534c47',ink,2);
    path('M272 462 Q281 449 338 444 Q396 445 422 462Z','#b7c3b8',ink,3);round(334,435,24,10,4,'#514e48',ink,2);
    if(burn)for(let i=0;i<3;i++)path(`M${309+i*35} 435 q${15*Math.sin(t*3+i)} -17 0 -31 t2 -26`,null,'#fff9e0bb',3);
  };
})();

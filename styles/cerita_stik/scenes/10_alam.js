Object.assign(Stik, (() => {
  const {ctx,ink,path,oval,box,line,gradient,at,hash} = Stik;
  function cloud(x,y,s) {
    at(x,y,s,()=>path('M-78 9 Q-82 -5 -64 -9 Q-60 -28 -37 -24 Q-19 -54 10 -38 Q35 -42 44 -20 Q70 -22 78 1 Q96 4 94 13 Q18 21 -78 14Z','#fff9e9'));
  }
  function palm(x,y,s,t,far=false) {
    at(x,y,s,()=>{
      path('M-14 0 Q6 -108 0 -218 L9 -220 Q26 -112 10 0Z',far?'#868c61':gradient(-220,220,'#776e45','#ab8860','#69553b'));
      if(!far) for(let i=0;i<17;i++){
        const f=i/17, px=8*Math.sin(f*Math.PI)+6;
        line(px-13+f*8,-i*13,px+7-f*5,-i*13-3,'#6a563c99',2);
      }
      at(5,-217,1,()=>{
        // Tiap pelepah melengkung keluar dan turun. Anak daun selalu menggantung.
        for(const [i,[dx,dy,arch]] of [[-107,14,48],[99,20,44],[-77,-39,44],[72,-43,44],[-107,52,48],[111,50,54],[-42,72,44],[51,78,60],[-27,-47,28],[36,-58,24]].entries()){
          const wind=3*Math.sin(t*1.3+i), tip=dy+wind;
          const color=far?'#798f62':['#376638','#527c3a','#698b3b','#527d3b','#41783d','#6d953c','#668638','#809a42','#899e50','#6d9144'][i];
          const count=far?13:20;
          for(let j=1;j<=count;j++){
            const u=j/(count+1), xx=dx*u, yy=tip*u-arch*4*u*(1-u);
            const side=Math.sign(dx), len=(far?19:27)*(1-u*.42)*Math.sin(Math.PI*(u*.82+.11));
            path(`M${xx} ${yy} q${side*len*.65} ${len*.45} ${side*len*.64} ${len*1.19} q${-side*len*.37} ${-len*.67} ${-side*len*.74} ${-len*1.16}Z`,color);
            path(`M${xx} ${yy} q${side*len*.5} ${-len*.55} ${side*len*.88} ${-len*.58} q${-side*len*.44} ${len*.82} ${-side*len*.88} ${len*.69}Z`,color);
          }
          path(`M0 0 Q${dx/2} ${tip/2-arch*2} ${dx} ${tip}`,null,far?'#72845b':'#7c934a',far?1.4:2.1);
        }
        if(!far) for(let i=0;i<3;i++) oval(-8+i*8,3+i%2*7,7,9,['#7e942d','#90a539','#a4ad3e'][i],'#646d31',1);
      });
    });
  }
  function house(x,y,s) {
    at(x,y,s,()=>{
      path('M-78 0V-91 L-40 -119 74 -91V0Z','#e4cb92','#725e45',2);
      path('M36 0V-88L74 -91V0Z','#bea675');
      path('M-93 -86L-53 -132 60 -132 91 -92 28 -84Z','#a94d35','#703f31',3);
      for(let i=0;i<12;i++) line(-50+i*9,-128,-75+i*10,-94,'#dc8152',2);
      box(-54,-66,27,37,'#547a78');box(-52,-49,24,3,'#ebce9a');box(-41,-65,3,35,'#ebce9a');
      box(-9,-64,26,64,'#775339');oval(11,-31,2,2,'#eaba65');
      box(-80,-4,156,5,'#9d8056');
    });
  }
  function fence(y, color) {
    line(-100,y-27,640,y-33,color,5); line(-100,y-9,640,y-15,color,4);
    for(let i=-2;i<15;i++) line(i*47,y+4,i*47-2,y-43-(i%3)*4,color,5);
  }
  function landscape(t,ground=730,orchard=false,evening=false,withHouse=true) {
    const horizon=ground-165;
    box(-100,-90,750,1150,gradient(0,ground,evening?'#f2ab80':orchard?'#7dbbd3':'#7eb8ed',evening?'#f8d599':'#d3eaf0','#fff1c2'));
    cloud(62+t*1.1%95,horizon-270,.91); cloud(426+t*.7%80,horizon-345,1.12);
    cloud(299+t*.4%46,horizon-160,.62);
    path(`M-100 ${horizon+40} Q30 ${horizon-103} 175 ${horizon-33} Q220 ${horizon-8} 294 ${horizon-66} Q405 ${horizon-155} 650 ${horizon+1} V${ground} H-100Z`,orchard?'#91a278':'#a2bc9c');
    path(`M-100 ${horizon+68} Q95 ${horizon-42} 250 ${horizon+14} Q364 ${horizon+62} 650 ${horizon-53} V${ground} H-100Z`,orchard?'#819052':'#83a36c');
    box(-100,horizon+35,750,1000-horizon+100,gradient(horizon,960-horizon,orchard?'#b5a153':'#a2bf69',orchard?'#c88c4b':'#87a452',orchard?'#99683f':'#749043'));
    if(!orchard&&withHouse){house(456,horizon+36,.61);house(383,horizon+39,.37);}
    else if(orchard) for(let i=0;i<7;i++) palm(i*103-49,horizon+60+9*(i%3),.45+.18*hash(i),t+i,true);
    fence(horizon+65,orchard?'#b59b5d':'#7d8051');
    // Jejak tanah dan rumput membesar ke arah depan.
    for(let i=0;i<125;i++){
      const f=hash(i+90), x=hash(i+400)*720-90,y=horizon+71+f*(995-horizon);
      oval(x,y,2+f*hash(i+3)*22,1+f*2,orchard?'#785a322b':'#48673328');
      if(i%5===0)path(`M${x} ${y} l-4 -7 5 5 2 -10 1 10 6 -5 -3 7Z`,orchard?'#79783d':'#687e43');
    }
    if(orchard){palm(69,ground-87,1.35,t);palm(477,ground-116,1.53,t+.8);}
    else {
      path(`M-80 ${ground+8} Q145 ${ground-39} 433 ${ground-13} Q547 ${ground} 650 ${ground-20} V${ground+76} Q409 ${ground+91} 201 ${ground+55} Q50 ${ground+32} -80 ${ground+67}Z`,gradient(ground-30,108,'#c5a16c','#ae8458'));
      for(let i=0;i<36;i++) oval(hash(i)*650-50,ground+hash(i+70)*38,2+hash(i+33)*9,1.2,'#906f4e65');
    }
  }
  function wood(x,y,w,h,dark=false) {
    box(x,y,w,h,gradient(y,h,dark?'#815739':'#d9ac72',dark?'#67442e':'#bc8754'));
    for(let i=0;i<Math.ceil(h/43);i++){
      const yy=y+43*i;line(x,yy,x+w,yy+1,'#674a34',2);
      for(let j=0;j<4;j++){
        const xx=x+hash(i*5+j)*w, y1=yy+7+hash(i+j)*26;
        path(`M${xx} ${y1} q20 -3 49 -1 t33 -2`,null,'#805b3c68',1.4);
      }
    }
  }
  return {cloud,palm,house,landscape,wood};
})());

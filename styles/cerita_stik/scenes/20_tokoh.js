Object.assign(Stik, (() => {
  const {ctx,ink,path,oval,box,round,line,gradient,at,shadow} = Stik;
  const cast={
    pekerja:{shirt:'#e58442',shade:'#c46938',skin:'#cd936c',pants:'#5c5654',hair:'helm'},
    ibu:    {shirt:'#b47a95',shade:'#98657e',skin:'#c6916c',pants:'#504453',hair:'konde'},
    anak:   {shirt:'#f4bd45',shade:'#d49a30',skin:'#cb9063',pants:'#475e84',hair:'poni'},
    petani: {shirt:'#81a67b',shade:'#5f8665',skin:'#b78058',pants:'#494044',hair:'caping'},
    pemuda: {shirt:'#269e92',shade:'#13786f',skin:'#f0c99a',pants:'#405751',hair:'belah'},
    tetua:  {shirt:'#cc8d41',shade:'#9c5c33',skin:'#dba47d',pants:'#544b45',hair:'peci'},
    warga:  {shirt:'#608ebc',shade:'#466b99',skin:'#deaa80',pants:'#394f73',hair:'ikat'}
  };
  function face(mood,t) {
    const blink=(t+1.1)%3.25<.12;
    for(const side of [-1,1]) {
      const x=side*16;
      if(blink || mood==='senang') path(`M${x-5} -161 q5 -7 11 0`,null,ink,3.3);
      else if(mood==='kaget') {oval(x,-161,6,8,'#fff8dc',ink,2);oval(x+1,-160,2.5,4,ink);}
      else oval(x+1,-160,3.1,4.6,ink);
      if(mood==='cemas'||mood==='kaget') line(x-6,-170-side*2,x+5,-170+side*2,ink,2.4);
    }
    if(mood==='kaget') oval(2,-141,5,7,'#693f39',ink,2);
    else if(mood==='cemas') path('M-7 -137 Q1 -145 9 -137',null,ink,3);
    else if(mood==='bicara' && Math.sin(t*13)>.1) path('M-10 -143 Q0 -140 11 -143 Q7 -127 -5 -135Z','#955449',ink,2);
    else path('M-9 -142 Q0 -133 11 -142',null,ink,3);
  }
  function prop(kind,x,y,s,t=0) {
    at(x,y,s,()=>{
      if(kind==='buku'){
        path('M-25 -25 Q-10 -30 0 -22 Q13 -30 25 -25 L23 12 Q8 11 0 17 Q-10 12 -24 14Z','#f2d496','#654b37',2.5);
        path('M-25 -20 Q-12 -23 0 -17 Q13 -24 25 -20 L23 13 Q8 13 0 19 Q-10 12 -24 16Z','#9c663c','#594338',2);line(0,-17,0,17,'#614634',2);
        line(5,-8,18,-11,'#e8b568',2);
      } else if(kind==='kelapa'){
        oval(0,0,22,24,gradient(-24,48,'#c2ca48','#87a433','#738a2c'),'#68752c',2,-.12);
        path('M-9 -15 Q-16 -4 -13 7',null,'#c6cf54',2);path('M-5 -22q5 -6 11 0l-4 4Z','#837946');
      } else if(kind==='gulungan'){
        round(-10,-13,20,26,6,'#f2ddaf',ink,2.5);
        for(let i=-8;i<10;i+=4)line(-8,i,8,i-2,'#b69872',1);
        line(-12,-12,12,-12,ink,3); line(-12,13,12,13,ink,3);
      } else if(kind==='ember'){
        path('M-21 -18 Q-19 -56 1 -43 Q15 -40 17 -18',null,ink,3);
        path('M-23 -19 L21 -19 16 15 Q0 23 -18 15Z','#699ca0',ink,3);
        oval(-1,-19,22,5,'#a3c4b6',ink,2);
      } else if(kind==='bibit'){
        path('M-12 8 Q-17 -3 -5 -6 Q9 -13 17 3 L14 14Z','#735039',ink,2);
        path('M1 2 Q0 -20 6 -28',null,'#4e753e',3);
        path('M3 -16 Q-16 -12 -18 -30 Q-3 -32 3 -16Z','#6aa050','#486c3d',1.5);
        path('M4 -21 Q4 -38 21 -40 Q20 -23 4 -21Z','#8bb656','#486c3d',1.5);
      }
    },kind==='buku'?-.12+.02*Math.sin(t*2):0);
  }
  // Kaki berada di titik (x,y). Benda dan ujung lengan memakai koordinat tangan yang sama.
  function actor(x,y,s,id,pose,mood,t,held='kosong',flip=false,grip=null) {
    const c=cast[id]||cast.anak, walking=pose==='jalan',step=walking?Math.sin(t*6):0;
    shadow(x,y+1,38*s);
    at(x,y,s,()=>{
      ctx.scale(flip?-1:1,1);
      const bob=walking?-Math.abs(step)*4:Math.sin(t*2)*1.1;
      for(const side of [-1,1]){
        const foot=side*16+step*side*15, lift=walking?Math.max(0,-side*Math.cos(t*6))*8:0;
        path(`M${side*15} ${-57+bob} Q${side*14+step*10} -27 ${foot} ${-4-lift}`,null,c.pants,5);
        round(foot-4,-6-lift,14,6,3,'#574034',ink,1.2);
      }
      ctx.translate(0,bob);
      round(-22,-76,45,23,3,c.pants,ink,3);
      path('M-15 -121 Q-29 -111 -30 -81 Q-32 -60 -14 -59 L15 -59 Q32 -59 30 -79 Q29 -112 15 -121Z',gradient(-123,64,c.shirt,c.shade),ink,3.4);
      path('M-8 -120 L0 -110 7 -120',null,ink,2);
      if(c.hair==='peci'){
        for(let i=0;i<4;i++)for(let j=0;j<3;j++){
          const xx=-17+i*11, yy=-99+j*14+(i%2)*3;
          path(`M${xx} ${yy-4}l3 4 -3 4 -3 -4Z`,'#f9bf60');
        }
      } else for(let i=0;i<3;i++)oval(0,-102+i*15,1.8,1.8,'#fff0c4');
      const swing=Math.sin(t*3)*3;
      const hand=grip?[(grip[0]-x)/s,(grip[1]-y)/s-bob]:pose==='tunjuk'?[65,-119+swing]:pose==='angkat'?[46,-156+swing]:pose==='baca'?[20,-95+swing]:pose==='pegang'?[48,-92+swing]:[33+step*11,-63+swing];
      const other=pose==='baca'?[-17,-91+swing]:[-35-step*12,-69-swing];
      path(`M-21 -107 Q-42 -86 ${other[0]} ${other[1]}`,null,ink,3.6);
      path(`M23 -107 Q${pose==='angkat'?50:40} ${pose==='tunjuk'?-107:-78} ${hand[0]} ${hand[1]}`,null,ink,3.8);
      oval(other[0],other[1],4.8,5,c.skin,ink,1.8);
      oval(0,-161,42,43,gradient(-195,78,c.skin,c.skin,'#b77f5b'),ink,3.5);
      if(c.hair==='caping'){
        path('M-58 -178 Q-31 -192 -3 -217 Q18 -202 59 -183 Q12 -168 -58 -178Z','#e8bc6e',ink,3);
        for(let i=-4;i<=4;i++)line(-3,-215,i*12,-178-Math.abs(i)*.9,'#b88749',1.1);
        path('M-53 -178 Q8 -171 54 -182',null,'#85613e',2);
      } else if(c.hair==='helm'){
        path('M-41 -176 Q-41 -201 -15 -206 Q17 -218 35 -196 L39 -178Z','#f3c84d',ink,2.6);
        path('M-44 -179 Q-10 -184 40 -181 L46 -176 Q6 -168 -44 -173Z','#f6d671',ink,2);
        path('M-9 -204 L-11 -186 M4 -207 L3 -186',null,'#c39740',2);
      } else if(c.hair==='peci'){
        path('M-39 -181 L-37 -207 Q-1 -214 35 -207 L40 -180 Q0 -173 -39 -181Z',gradient(-210,36,'#463d40','#262228'),ink,2.6);
      } else {
        if(c.hair==='konde')oval(-37,-185,15,17,ink);
        if(c.hair==='ikat')oval(-39,-168,11,17,ink);
        path(c.hair==='belah'?'M-41 -166 Q-47 -202 -11 -205 Q25 -213 39 -185 L41 -166 Q24 -174 13 -186 Q0 -173 -13 -176 L-19 -170 -27 -175Z':'M-41 -166 Q-44 -202 -6 -205 Q32 -208 41 -177 L40 -166 Q24 -167 17 -173 Q1 -170 -8 -174 Q-24 -168 -41 -166Z','#30292c',ink,2.2);
        path('M-28 -189 Q-14 -202 3 -201',null,'#59484a',1.8);
      }
      face(mood,t);
      prop(held,hand[0],hand[1],.86,t);
      oval(hand[0]-(held==='kelapa'?13:2),hand[1]+(held==='kelapa'?8:1),4.7,4.9,c.skin,ink,1.7);
    });
  }
  function kite(x,y,s,t,hole=false,color='#dc5540',tail=true,angle=0) {
    at(x,y,s,()=>{
      if(tail){
        path(`M0 78 Q${24+9*Math.sin(t*2)} 113 14 135 T${23+12*Math.sin(t*2.6)} 180`,null,'#f7f0db',3);
        for(const [xx,yy] of [[11,108],[15,142]])path(`M${xx} ${yy} l-9 -4 1 9 8 -5 8 5 1 -10Z`,color,ink,.9);
      }
      path('M0 -78 L63 -14 0 80 -64 -14Z',color,ink,3.4);
      path('M-57 -20 L-49 -29 53 -24 61 -15Z','#fff5d9');
      path('M-6 -70 L1 -77 6 -72 5 69 0 78 -4 70Z','#fff4d3');
      path('M-63 -14 Q-1 -47 63 -14 M0 -78 L0 78',null,'#624938',1.8);
      if(hole) oval(0,5,13,13,'#b6def2',ink,2.5);
    },angle);
  }
  return {actor,prop,kite};
})());

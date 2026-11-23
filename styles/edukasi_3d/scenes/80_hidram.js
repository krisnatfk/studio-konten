/* Pompa hidram: satu instalasi, dari mata air sampai bak desa. */
(() => {
  const E=ENG.edu, {ramp,rng,cl}=ENG.H, V=(a)=>new THREE.Vector3(...a);
  const steel='#24495e', trim='#5f8995', brass='#ebb04a', aqua='#16bade', cream='#f4ebcf';
  const vecY=new THREE.Vector3(0,1,0);
  function object(g,geo,col,x,y,z){
    const m=K.mesh(geo,typeof col==='string'?K.mat(col):col,true,true);
    m.position.set(x,y,z); g.add(m); return m;
  }
  function block(g,x,y,z,w,h,d,col){return object(g,K.geo('hydBox',()=>new THREE.BoxGeometry()),col,x,y,z).scale.set(w,h,d);}
  function cylinder(g,x,y,z,r,h,col,n=24,r2=r){
    return object(g,new THREE.CylinderGeometry(r,r2,h,n),col,x,y,z);
  }
  function rod(g,a,b,r,col,n=12){
    const dir=V(b).sub(V(a)),mid=V(a).lerp(V(b),.5);
    const m=cylinder(g,mid.x,mid.y,mid.z,r,dir.length(),col,n);
    m.quaternion.setFromUnitVectors(vecY,dir.normalize());return m;
  }
  function bead(g,x,y,z,r,col){
    const m=object(g,K.geo('hydBall',()=>new THREE.SphereGeometry(1,12,8)),col,x,y,z);
    m.scale.setScalar(r);return m;
  }
  function torus(g,x,y,z,r,th,col,flat=false){
    const m=object(g,new THREE.TorusGeometry(r,th,8,40),col,x,y,z);
    if(flat)m.rotation.x=Math.PI/2;return m;
  }
  const land=[[-16,3],[-10,3],[-5,.08],[3,.08],[9,8],[17,8]];
  function level(x){for(let j=1;j<land.length;j++){let [b,h]=land[j],[a,l]=land[j-1];if(x<=b)return l+(h-l)*cl((x-a)/(b-a));}return 8;}
  function bed(g,points,bottom,top,z,depth,col){
    const shape=new THREE.Shape();points.forEach(([x,y],i)=>shape[i?'lineTo':'moveTo'](x,bottom(y,x)));
    points.slice().reverse().forEach(([x,y])=>shape.lineTo(x,top(y,x)));shape.closePath();
    return object(g,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),col,0,0,z);
  }
  function house(g,x,z,k,roof){
    const h=new THREE.Group();g.add(h);h.position.set(x,8,z);h.scale.setScalar(k);
    block(h,0,.1,0,3.35,.2,2.95,'#a59b83');block(h,0,1.05,0,3,1.9,2.6,'#f4dfb0');
    const sh=new THREE.Shape();sh.moveTo(-1.76,1.97);sh.lineTo(0,3.07);sh.lineTo(1.76,1.97);sh.closePath();
    object(h,new THREE.ExtrudeGeometry(sh,{depth:3.14,bevelEnabled:false}),roof,0,0,-1.57);
    for(let j=0;j<7;j++){let zz=-1.48+j*.49;rod(h,[-1.76,1.99,zz],[0,3.10,zz],.035,roof);rod(h,[0,3.10,zz],[1.76,1.99,zz],.035,roof);}
    plate(h,.02,1.86,1.313,1.09,.235,'TIRTA','#445d59');
    block(h,-.55,.76,1.32,.68,1.35,.08,'#926b4b');bead(h,-.32,.74,1.38,.05,brass);
    for(const s of [.58,-1.14]){block(h,s,1.23,1.34,.58,.67,.08,'#fff3d0');block(h,s,1.24,1.39,.45,.53,.045,'#437988');block(h,s,1.24,1.42,.045,.53,.02,cream);}
    for(let j=0;j<4;j++)block(h,-1.3+j*.85,.4,1.62,.07,.8,.07,'#846a4a');
    block(h,0,.73,1.62,2.75,.065,.07,'#846a4a');
  }
  function pool(c,x,y,z,w,h,d){
    const g=c.scene;
    block(g,x,y-h/2,z,w,h,d,E.water('#6cdfff',.88));
    const mat=new THREE.MeshStandardMaterial({color:'#80e4eb',map:E.rippleTex(),roughness:.22});
    const s=object(g,new THREE.PlaneGeometry(w,d),mat,x,y+.005,z);s.rotation.x=-Math.PI/2;
    c.upd.push(t=>mat.map.offset.set(t*.024,t*.017));
  }
  function ticker(c,points,count,r,rate,enabled=()=>1,col='#bcffff'){
    const curve=new THREE.CurvePath();
    points.slice(1).forEach((v,j)=>curve.add(new THREE.LineCurve3(V(points[j]),V(v))));
    for(let j=0;j<count;j++){
      const m=bead(c.scene,0,0,0,r,col);
      c.upd.push(t=>{const f=enabled(t);m.visible=f>.01;if(!m.visible)return;
        m.position.copy(curve.getPointAt((rate(t)+j/count)%1));m.scale.setScalar(r*f);});
    }
  }
  function plate(g,x,y,z,w,h,words,color){
    const map=K.tex('hydMark'+words,512,128,(ctx,W,H)=>{
      ctx.fillStyle=color;ctx.fillRect(0,0,W,H);ctx.fillStyle='#f6f9ed';ctx.font='bold 67px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(words,W/2,H/2);});
    const m=object(g,new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map}),x,y,z+.008);
    m.castShadow=false;
  }
  // The installation is cut in section. The inhabited landscape continues behind
  // the cut and the drainage stream irrigates the lower fields in front of it.
  function village(c){
    const g=new THREE.Group(),R=rng(84199);
    const bark='#806044',bamboo='#ae965f',leaf='#518450',straw='#c19a5f';
    const unitBox=K.geo('desaBox',()=>new THREE.BoxGeometry());
    const postGeo=K.geo('desaPost',()=>new THREE.CylinderGeometry(1,1,1,7));
    const blob=K.geo('desaCrown',()=>new THREE.IcosahedronGeometry(1,0));
    function solid(geo,x,y,z,sx,sy,sz,col){
      const m=object(g,geo,col,x,y,z);m.scale.set(sx,sy,sz);return m;
    }
    function box(x,y,z,w,h,d,col,angle=0){
      const m=solid(unitBox,x,y,z,w,h,d,col);m.rotation.y=angle;return m;
    }
    function pole(a,b,r,col){
      const v=V(b).sub(V(a)),mid=V(a).lerp(V(b),.5);
      const m=solid(postGeo,mid.x,mid.y,mid.z,r,v.length(),r,col);
      m.quaternion.setFromUnitVectors(vecY,v.normalize());return m;
    }
    function patch(points,col){
      const p=[],indices=[];
      points.forEach(q=>p.push(...q));
      for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);
      const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
      geom.setIndex(indices);geom.computeVertexNormals();
      if(geom.attributes.normal.getY(0)<0){indices.reverse();geom.setIndex(indices);geom.computeVertexNormals();}
      object(g,geom,col,0,0,0);
    }
    function rear(x,z){
      const u=cl((-z-7)/16);
      return level(x)+u*(1.8*Math.sin(.105*x+.047*z)+.9*Math.cos(.17*z))+Math.max(0,-z-16)*.105;
    }
    function ground(x,z){return z<=-7?rear(x,z):level(x);}
    function path(points,w,col,height){
      for(let i=1;i<points.length;i++){
        const [a,b]=points.slice(i-1,i+1),n= Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.3);
        const ang=Math.atan2(b[1]-a[1],b[0]-a[0]),dx=-Math.sin(ang)*w/2,dz=Math.cos(ang)*w/2;
        for(let k=0;k<n;k++){
          const p=[a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n],q=[a[0]+(b[0]-a[0])*(k+1)/n,a[1]+(b[1]-a[1])*(k+1)/n];
          patch([[p[0]+dx,p[1]+dz],[q[0]+dx,q[1]+dz],[q[0]-dx,q[1]-dz],[p[0]-dx,p[1]-dz]].map(([x,z])=>[x,height(x,z),z]),col);
        }
      }
    }
    const xs=[-82,-60,-43,-30,-20,...land.map(v=>v[0]),24,34,48,65,82];
    for(let i=1;i<xs.length;i++)for(let z=-67;z<-7;z+=3){
      const a=xs[i-1],b=xs[i],d=z+3;
      patch([[a,z],[a,d],[b,d],[b,z]].map(([x,q])=>[x,rear(x,q)-.014,q]),'#91b372');
    }
    const soilY=-5.94;
    function fields(x,z,w,d,mode,y=soilY){
      box(x,y+.025,z,w,.075,d,'#a7a067');
      const col=['#79a853','#aabe67','#82b4a8','#bdba65'][mode%4];box(x,y+.08,z,w-.35,.06,d-.38,col);
      const n=Math.max(3,Math.floor(w/.62));
      for(let i=0;i<n;i++){const xx=x-w/2+.36+i*(w-.72)/(n-1);box(xx,y+.124,z,.07,.045,d-.65,mode%4===2?'#6b965d':'#96ad64');}
    }
    function tree(x,z,y,k,kind){
      if(kind===1){
        pole([x,y,z],[x+.15*k,y+2.65*k,z],.12*k,bark);
        const top=y+2.65*k;
        for(let j=0;j<8;j++){
          const a=j*.785+.21,dx=Math.cos(a)*k,dz=Math.sin(a)*k;
          const verts=[[x,top,z],[x+.58*dx+.21*dz,top+.37*k,z+.58*dz-.21*dx],[x+1.6*dx,top-.3*k,z+1.6*dz],[x+.58*dx-.21*dz,top+.32*k,z+.58*dz+.21*dx]];
          patch(verts,j%2?'#588b59':'#76a35c');
        }
      }else{
        pole([x,y,z],[x,y+2.1*k,z],.14*k,bark);
        for(let k1=0;k1<4;k1++){const a=k1*1.9;const o=solid(blob,x+Math.cos(a)*.48*k,y+(1.93+(k1===3?.44:0))*k,z+Math.sin(a)*.42*k,k*.95,k*(.84+R()*.24),k*.93,['#659758','#81a963','#4f8654','#7ca55e'][k1]);o.rotation.y=a;}
      }
    }
    function cottage(x,z,k,roof,y,open=false){
      const w=1.55*k,d=1.22*k,h=1.53*k;
      box(x,y+.095*k,z,2*w+.18*k,.19*k,2*d+.26*k,'#a6987d');
      if(!open){
        box(x,y+h*.49,z,w*2,h,d*2,'#ead6ae');
        box(x-.4*k,y+.53*k,z+d+.022,.46*k,1.06*k,.064,bark);
        for(const s of [-1,1]){box(x+s*.97*k,y+.89*k,z+d+.025,.55*k,.54*k,.07,'#f4dfb4');box(x+s*.97*k,y+.89*k,z+d+.073,.43*k,.42*k,.05,'#5b8180');}
      }else{
        for(const dx of [-w*.88,w*.88])for(const dz of [-d*.85,d*.85])pole([x+dx,y,z+dz],[x+dx,y+h,z+dz],.072*k,bark);
        box(x,y+.43*k,z,2*w,.12*k,1.3*d,bamboo);
      }
      const pitch=.55,span=w+.27*k,len=span/Math.cos(pitch),ridge=y+h+span*Math.tan(pitch);
      for(const side of [-1,1]){
        const m=box(x+side*span/2,ridge-span*Math.tan(pitch)/2,z,len,.13*k,2*d+.55*k,roof);m.rotation.z=-side*pitch;
      }
      if(!open)for(const side of [-1,1]){
        const shape=new THREE.Shape();shape.moveTo(-w,h-.01*k);shape.lineTo(w,h-.01*k);shape.lineTo(0,ridge-y);shape.closePath();
        const gable=object(g,new THREE.ShapeGeometry(shape),'#ddc59e',x,y,z+side*(d+.008));
        if(side<0)gable.rotation.y=Math.PI;
      }
      pole([x,ridge+.055*k,z-d-.31*k],[x,ridge+.055*k,z+d+.31*k],.075*k,roof);
    }
    function fence(points,h=.68){
      let prev;
      for(const [x,z,y] of points){pole([x,y,z],[x,y+h,z],.045,bark);
        if(prev)for(const frac of [.42,.83])pole([prev[0],prev[2]+h*frac,prev[1]],[x,y+h*frac,z],.031,bamboo);
        prev=[x,z,y];}
    }
    // Lowland paddies: an irregular stream winds between planted and flooded plots.
    const streamX=z=>-4+5.1*Math.sin(z*.062+.9)+.14*(z-8);
    const stream=[];for(let z=4;z<=75;z+=1.3)stream.push([streamX(z),z]);
    path(stream,3.45,'#bbac78',()=>soilY+.095);path(stream,2.85,'#56a9a5',()=>soilY+.13);
    for(let z=6;z<73;z+=5.8){
      const mid=streamX(z);
      for(const side of [-1,1])for(let j=0;j<6;j++){
        let x=mid+side*(7.7+j*9.75);
        fields(x,z,8.9,5.12,(Math.floor(z/5.8)+j+(side>0?1:0))%4);
      }
      for(let j=0;j<4;j++){const zz=z+R()*3,x=streamX(zz)+(R()-.5)*1.7;box(x,soilY+.15,zz,.12+R()*.5,.014,.028,'#a4d9c7');}
    }
    // Bridges, a field shelter, raised bunds and an orchard at the valley edge.
    for(const z of [13,36]){
      const x=streamX(z);
      for(let j=0;j<16;j++)box(x-2.16+j*.29,soilY+.65,z,.276,.12,1.42,'#b2946b');
      for(const side of [-1,1]){let pts=[];for(let j=0;j<5;j++)pts.push([x-2.12+j*1.06,z+side*.65,soilY+.69]);fence(pts,.69);}
      for(const dx of [-1.6,1.6])for(const dz of [-.54,.54])pole([x+dx,soilY,z+dz],[x+dx,soilY+.67,z+dz],.095,bark);
    }
    for(const [x,z,k] of [[-18,10,.9],[19,20,.86],[-29,29,1],[30,7,.82],[-25,3,.72]])cottage(x,z,k,straw,soilY+.13,true);
    for(const x of [-21,22,31,-32])for(let z=5;z<50;z+=6.4)tree(x+R()*1.5,z,soilY,.95+R()*.65,R()>.48?1:0);
    // Settlement on the upper and middle terraces. Roofs follow meandering footpaths.
    const lanes=[[[8,-6],[12,-9],[19,-10],[23,-16],[31,-21],[43,-24]], [[-24,-14],[-16,-15],[-7,-13],[1,-16],[8,-15],[17,-18],[26,-23]], [[-33,-29],[-21,-25],[-8,-24],[2,-27],[17,-29],[32,-31],[48,-36]]];
    for(const lane of lanes)path(lane,1.25,'#d0b68b',(x,z)=>ground(x,z)+.065);
    const roofs=['#a75e44','#af7450','#927455','#637f78','#b96342'];
    for(const [x,z,k] of [[13,-12,1],[17.9,-7.9,.79],[21,-12.7,.98],[25,-16,.83],[29,-17.8,1.05],[32,-24,.81],[-22,-18,.86],[-16,-18,.78],[-10,-16.6,.9],[-5,-17,.72],[1,-20,.86],[6,-19,.7],[11,-23,.88],[18,-22,1],[25,-27,1],[-22,-29,.9],[-15,-28,.94],[-7,-28,.8],[3,-31,.89],[14,-33,.92],[31,-34,.88],[38,-27,.97],[-29,-13,.76]]){
      cottage(x,z,k,roofs[Math.floor(R()*roofs.length)],rear(x,z));
      tree(x+2.1*k,z-1.35,rear(x+2.1*k,z-1.35),.8+R()*.5,1);
    }
    for(let i=0;i<118;i++){let x=-49+R()*105,z=-59+R()*24;tree(x,z,rear(x,z),1.05+R()*1.12,i%4===0?1:0);}
    // Cultivated hillside immediately behind the mechanism, visible in close shots.
    for(let j=0;j<4;j++){
      const x=-2.8+j*1.46,z=-4.1;
      box(x,.15,z,1.19,.18,3.15,'#b19466');box(x,.248,z,1.10,.035,3.05,'#8f7852');
      for(let k=0;k<10;k++)for(let q=0;q<2;q++){
        const xx=x+(q-.5)*.47,zz=z-1.32+k*.296;
        const crown=solid(blob,xx,.31+R()*.04,zz,.135,.11,.13,j%2?'#759548':'#548647');crown.rotation.y=R()*3;
      }
    }
    for(let x=-9;x<9;x+=1.1){const z=-1.68+.12*Math.sin(x);box(x,level(x)+.052,z,.87,.075,.42,'#c0b08d');}
    fence(Array.from({length:11},(_,i)=>{const x=-7.7+i*1.05;return [x,-2.22,level(x)];}),.62);
    cottage(-4.75,-4.5,.74,straw,level(-4.75),true);
    // The source has a timber inlet and a bamboo stand. The upper courtyard has laundry, pots and baskets.
    for(let j=0;j<13;j++){let x=-15.7+R()*1.6,z=-4.7+R()*1.8,y=level(x),h=1.65+R()*1.15;pole([x,y,z],[x+.12,y+h,z],.055,leaf);
      for(let k=1;k<4;k++)solid(blob,x+(k%2?.17:-.13),y+h*k/4,z,.25,.075,.11,'#619151');}
    for(let j=0;j<9;j++)box(-13.75+j*.18,3.49,-1.98,.165,.081,.66,'#b29c73');
    for(const x of [-13.75,-12.32])pole([x,3,-2.21],[x,3.92,-2.21],.055,bark);
    pole([-13.75,3.87,-2.21],[-12.32,3.87,-2.21],.034,bamboo);
    for(const x of [13.75,16.4])pole([x,8,-1.25],[x,9.45,-1.25],.052,bark);
    pole([13.75,9.4,-1.25],[16.4,9.36,-1.25],.018,bark);
    for(let j=0;j<4;j++){const m=box(14.1+j*.55,9.11,-1.25,.38,.52,.03,['#d79367','#77a9a1','#e8d89f','#bb7771'][j]);m.rotation.z=(j-1.7)*.045;}
    for(const [x,z] of [[10.6,.05],[13.7,.3],[14.2,-2.3],[9.1,-2.1]]){
      solid(postGeo,x,8.18,z,.18,.34,.18,'#ba7957');
      for(let j=0;j<5;j++)solid(blob,x+Math.sin(j)*.12,8.46+.025*j,z+Math.cos(j)*.13,.12,.18,.1,'#698953');
    }
    for(const x of [-2.6,-2.22,-1.84])box(x,.15,-.41,.33,.31,.42,'#9b7a50');
    for(let j=0;j<3;j++){const x=-2.62+j*.37;box(x,.15,-.18,.31,.048,.032,bamboo);box(x,.235,-.18,.31,.048,.032,bamboo);}
    // Exposed bank carries gravel, sediment lenses and trailing vegetation.
    for(let i=0;i<330;i++){
      const x=-15.9+R()*32.8,dep=.17+R()*(level(x)+5.6);
      const r=.04+R()*.105,m=solid(blob,x,level(x)-dep,1.212,r*(1+R()*1.7),r*.56,r*.32,i%3?'#bf936a':'#d3ad80');m.rotation.z=R()*.4;
    }
    for(const x of [-15.7,-9.2,-6.4,4.3,7.1,13.2,15.9])for(let k=0;k<7;k++){
      const xx=x+R()*.55,yy=level(xx)-.08-k*.098;solid(blob,xx,yy,1.24,.12,.088,.073,k%2?'#81a253':'#6c914d');}
    // Spillway below the ram returns waste water to the lower irrigation stream.
    const cx=-.77,lip=4.62;
    for(let row=0;row<11;row++)for(let j=0;j<10;j++){
      const x=-3.48+j*.598+(row%2)*.13;
      const m=box(x,-.67-row*.49,lip+.043,.568,.453,.125,['#a6967a','#ae9d7f','#a29679','#b4a487'][(j+row*3)%4]);m.rotation.z=.018*Math.sin(j+row);
    }
    for(let j=0;j<15;j++){let x=-3.51+j*.398;if(Math.abs(x-cx)>.49)box(x,-.36,lip,.384,.18,.25,'#a9997b');}
    for(const x of [-3.72,2.32])for(let j=0;j<7;j++)box(x,-.36,2.12+j*.36,.2,.18,.345,'#aa9e85');
    for(let j=0;j<8;j++){
      const x=cx-.28+.08*j;
      const streak=box(x,-3.16,lip+.152,.082,5.55,.035,['#64b3ba','#79bec2','#8bcacc','#64b3ba'][j%4]);streak.rotation.z=.009*Math.sin(j);
    }
    for(let j=0;j<23;j++){const x=cx+(R()-.5)*.98,z=lip+.29+R()*.44;solid(blob,x,soilY+.18,z,.07+R()*.1,.033,.068,'#c5e3d8');}
    path([[cx,lip+.4],[cx-.09,5.6],[streamX(7),7]],1.28,'#63afac',()=>soilY+.14);
    // Wetland margins and workshop storage are placed away from the pump's moving parts.
    for(const [ax,az,base] of [[-14.9,-1.92,3.34],[-11.15,-1.85,3.34],[-14.7,.66,3.34],[-3.38,3.72,-.35],[1.81,3.84,-.35]]){
      for(let j=0;j<11;j++){const x=ax+(R()-.5)*.45,z=az+(R()-.5)*.42;
        const h=.19+R()*.32;pole([x,base,z],[x+.055,base+h,z],.014,'#6f8845');
        if(j%3===0)solid(blob,x+.055,base+h,z,.028,.08,.029,'#83683f');
      }
    }
    for(let j=0;j<12;j++){const a=j*2.4,x=-14.42+.49*Math.cos(a),z=.24+.37*Math.sin(a);
      solid(postGeo,x,3.378,z,.071+.026*R(),.018,.065+.028*R(),j%2?'#699658':'#80a566');}
    for(let row=0;row<2;row++)for(let j=0;j<4-row;j++){
      const x=13.36+j*.19+row*.08;pole([x,8.15+row*.158,-.45],[x,8.15+row*.158,.11],.098,'#99714f');
      solid(postGeo,x,8.15+row*.158,.115,.083,.012,.083,'#c39b69').rotation.x=Math.PI/2;
    }

    // Bake opaque diorama dressing into one indexed mesh for efficient frame-by-frame rendering.
    g.updateMatrixWorld(true);
    const pos=[],norm=[],colors=[],ix=[],point=new THREE.Vector3(),normal=new THREE.Vector3(),nm=new THREE.Matrix3();
    g.traverse(m=>{
      if(!m.isMesh)return;
      const geo=m.geometry,p=geo.attributes.position,n=geo.attributes.normal,col=m.material.color,base=pos.length/3;
      nm.getNormalMatrix(m.matrixWorld);
      for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);normal.fromBufferAttribute(n,i).applyNormalMatrix(nm);
        pos.push(point.x,point.y,point.z);norm.push(normal.x,normal.y,normal.z);colors.push(col.r,col.g,col.b);}
      if(geo.index){for(const j of geo.index.array)ix.push(base+j);}else{for(let j=0;j<p.count;j++)ix.push(base+j);}
    });
    const geometry=new THREE.BufferGeometry();geometry.setIndex(ix);
    for(const [key,arr] of [['position',pos],['normal',norm],['color',colors]])geometry.setAttribute(key,new THREE.Float32BufferAttribute(arr,3));
    c.scene.add(K.mesh(geometry,K.mat('#ffffff',{vertexColors:true,roughness:.94}),true,true));
    E.pekerja(c,-2.1,.26,-5.54,{pose:'tanam',s:.64,baju:'#648c8a',ry:.6});
    E.pekerja(c,13.1,rear(13.1,-9.1),-9.1,{jalan:.63,s:.74,baju:'#c17856'});
  }

  function landscape(c){
    const g=c.scene,R=rng(721);
    bed(g,land,()=>-6.1,h=>h-4.3,-7,8.2,'#90684f');
    const layers=[[-4.3,-3,'#986147'],[-3,-2.55,'#d2a075'],[-2.55,-1.36,'#b77b50'],[-1.36,-.4,'#d8b481'],[-.4,0,'#83ad54']];
    for(const [a,b,col] of layers)bed(g,land,(h)=>h+a,(h)=>h+b,-7,8.2,col);
    // The cut face is exposed along the pipe route. The hillside forms the pipe supports.
    for(let i=0;i<100;i++){let x=-15.8+R()*32.5,z=-6.8+R()*7.5;if((x<-10&&z>-3)||(x>9&&z>-4)||Math.abs(x)<3)continue;
      const rock=object(g,K.geo('hydRock',()=>new THREE.IcosahedronGeometry(1,0)),i%3?'#89a754':'#b7ad85',x,level(x)+.03,z);rock.scale.set(.12+R()*.28,.08+R()*.18,.15+R()*.2);}
    for(let i=0;i<24;i++){let x=-15+R()*31.5,z=-6.5+R()*2.6;E.pohon(c,R,x,z,level(x),.38+R()*.27);}
    house(g,12,-1.3,1,'#ab4d31');house(g,15,-4,.73,'#497e80');house(g,9.8,-4.6,.64,'#b76939');
    for(let j=0;j<12;j++)block(g,4+j*.42,level(4+j*.42)+.02,-.5,.46,.12,.82,'#d9c695');
    pool(c,-13,3.36,-.7,4.7,.34,3.7);
    for(let j=0;j<11;j++){let x=-15+j*.4;const rock=bead(g,x,3.38,-2.64,.26,'#8e9585');rock.scale.y=.17;}
    for(let i=0;i<22;i++){const m=object(g,K.geo('hydRidge',()=>new THREE.IcosahedronGeometry(1,1)),i%2?'#95b8ad':'#759f97',-208+i*19,-10,-87-R()*16);m.scale.set(24+R()*12,12+R()*10,16);}
    for(let j=0;j<12;j++){let x=-15.4+j*.4;let stone=object(g,K.geo('hydRock',()=>new THREE.IcosahedronGeometry(1,0)),'#8a9c95',x,3.21,1.11);stone.scale.set(.34,.15,.21);}
    for(const side of [-1,1])for(let j=0;j<9;j++){
      let x=side<0?-15.45:-10.61;let stone=object(g,K.geo('hydRock',()=>new THREE.IcosahedronGeometry(1,0)),'#88998d',x,3.17,-2.45+j*.44);stone.scale.set(.24,.22,.32);}
    for(let j=0;j<7;j++) {let x=-15.4+j*.51;block(g,x,3.17,-4.6,.56,.16,4,'#63b8c4');}
    for(let j=0;j<36;j++){
      let x=-15+R()*30,z=-4+R()*4;
      if(x>9||x<-10||Math.abs(x)<4)continue;
      for(let k=0;k<3;k++){const grass=object(g,K.geo('hydGrass',()=>new THREE.ConeGeometry(1,1,3)),k%2?'#699746':'#9ebf53',x+.07*k,level(x)+.1,z);grass.scale.set(.066,.24+.12*R(),.06);grass.rotation.z=k*.22-.22;}}
    
    const ground=object(g,new THREE.PlaneGeometry(750,580), '#9ab68b',0,-6,0);ground.rotation.x=-Math.PI/2;
    // Receiving tank and visible outlet at the village.
    const tank=cylinder(g,10.15,8.55,.55,.72,1.05,new THREE.MeshStandardMaterial({color:'#7ea6a9',transparent:true,opacity:.42,depthWrite:false}));
    const stored=cylinder(g,10.15,8.09,.55,.68,1,E.water('#2fb4dd',.91));
    for(const y of [8.14,8.86,9.07])torus(g,10.15,y,.55,.72,.045,cream,true);
    const surface=cylinder(g,10.15,8.12,.55,.67,.025,aqua);
    c.upd.push(t=>{const h=.15+cl((t-PLAN.tl.reveal)*.007)*.82;stored.scale.y=h;stored.position.y=8.045+h/2;surface.position.y=8.045+h;});
    ticker(c,[[10.15,9.14,.55],[10.15,8.2,.55]],7,.048,t=>t*.8,t=>ramp(t,PLAN.tl.reveal,PLAN.tl.reveal+.3));
    
    const inlet=[[-12,3.28,1],[-10,3.22,1.48],[-4.9,1.05,1.48],[-2.5,1.05,1.48]];
    const delivery=[[1.4,2.02,1.48],[3,2.02,1.48],[9.1,9.45,1.48],[10.15,9.45,1.48],[10.15,9.45,.55],[10.15,9.14,.55]];
    for(const [path,r,color] of [[inlet,.19,steel],[delivery,.115,trim]]){
      path.slice(1).forEach((b,i)=>{let a=path[i];rod(g,a,b,r,color);bead(g,...b,r,color);
        let mid=V(a).lerp(V(b),.5),delta=V(b).sub(V(a)).normalize().multiplyScalar(.07);
        rod(g,mid.clone().sub(delta).toArray(),mid.add(delta).toArray(),r*1.25,brass);
      });
      ticker(c,path.map(([x,y,z])=>[x,y+r*.6,z+r*.86]),path===inlet?14:8,r*.52,t=>t*(path===inlet?.15:.086),t=>path===inlet?1:ramp(t,PLAN.tl.reveal,PLAN.tl.reveal+.5));
    }
    const worker=E.pekerja(c,-3.4,.18,1.03,{s:.87,pose:'pikir',ry:.32});
    c.upd.push(t=>{if(t>PLAN.tl.reveal)K.pose(worker,'tunjuk',t);});
    
    const bucket=cylinder(worker.userData.J.handL,0,-.24,.025,.19,.31,trim,16,.142);
    bucket.position.set(0,-.32,.025);const handle=torus(worker.userData.J.handL,0,-.105,.025,.155,.019,steel);handle.scale.y=1.25;
    torus(worker.userData.J.head,0,.21,0,.168,.021,brass,true);
    E.pekerja(c,12.3,8.12,.6,{jalan:.65,s:.75,baju:'#218885'});
    E.burung(c,1,11,-14,3,rng(30));
    block(g,-.7,-3.4,3.23,6.15,5.85,2.85,'#ab8e6d');
    pool(c,-.7,-.35,3.25,6,.22,2.7);
    plate(g,-.3,.19,2.215,1.49,.21,'HIDRAM   /   01','#294858');
    for(let i=0;i<6;i++)block(g,-2.42+i*.105,.19,2.217,.054,.15,.02,i%2?steel:brass);
    
  }
  function pump(c){
    const g=c.scene,z=1.48,tl=PLAN.tl,st=(k,t)=>E.kf(tl[k],t);
    const auto=t=>ramp(t,tl.repeat,tl.repeat+1.8);
    function values(t){
      const u=((t-tl.repeat)%2.8+2.8)%2.8/2.8,loop=ramp(u,.46,.53)*(1-ramp(u,.75,.85)),mix=auto(t);
      const state=(k,v)=>st(k,t)*(1-mix)+v*mix;
      return [state('shut',loop),state('check',ramp(u,.51,.6)*(1-ramp(u,.68,.8))),state('fill',.34+.48*loop),state('pressure',loop)];
    }
    block(g,-.25,.19,z,4.75,.36,1.46,'#a4afa9');
    for(const x of [-1.92,1.34]){block(g,x,.55,z,.45,.45,.7,steel);for(const dz of [-.48,.48])cylinder(g,x,.41,z+dz,.083,.09,trim,6);}
    const glass=new THREE.MeshStandardMaterial({color:'#a1d5db',transparent:true,opacity:.38,depthWrite:false,roughness:.23});
    const tube=(a,b,r)=>rod(g,a,b,r,glass,32);
    tube([-2.5,1.05,z],[1.4,1.05,z],.31);
    rod(g,[-2.5,1.05,z],[1.4,1.05,z],.207,'#249eb6');
    for(let x of [-2.43,-1.78,-.38,.85,1.52]){
      rod(g,[x-.07,1.05,z],[x+.07,1.05,z],.392,steel,28);
      for(let j=0;j<8;j++){let a=j*Math.PI/4;rod(g,[x+.061,1.05+.325*Math.cos(a),z+.325*Math.sin(a)],[x+.103,1.05+.325*Math.cos(a),z+.325*Math.sin(a)],.038,brass,6);}
    }
    const wx=-.9,cx=1.4;
    for(const [x,top,r] of [[wx,2.05,.4],[cx,1.94,.36]]){
      tube([x,1.05,z],[x,top,z],r);
      for(const y of [1.28,top]){torus(g,x,y,z,r,.072,steel,true);torus(g,x,y+.05,z,r,.03,brass,true);}
    }
    // Waste poppet rises against its seat. Delivery check opens upwards independently.
    const piston=cylinder(g,wx,1.7,z,.33,.13,brass),stem=cylinder(g,wx,1.94,z,.074,.49,steel);
    for(const x of [wx,cx])for(const dx of [-.30,.30])rod(g,[x+dx,1.25,z-.16],[x+dx,1.96,z-.16],.04,trim);
    const check=cylinder(g,cx,1.55,z,.294,.1,'#e1a23a');
    for(const dx of [-.33,.33])rod(g,[wx+dx,2.05,z],[wx+dx,2.55,z],.039,trim);
    rod(g,[wx-.36,2.55,z],[wx+.36,2.55,z],.06,steel);
    const base=2.02,cap=3.65;
    cylinder(g,cx,(base+cap)/2,z,.47,cap-base,glass,40);
    for(let i=0;i<4;i++){const a=Math.PI*.25+i*Math.PI*.5;rod(g,[cx+.485*Math.cos(a),base,z+.485*Math.sin(a)],[cx+.485*Math.cos(a),cap,z+.485*Math.sin(a)],.022,trim);}
    const dome=object(g,new THREE.SphereGeometry(.47,32,10,0,Math.PI*2,0,Math.PI/2),steel,cx,cap,z);
    cylinder(g,cx,cap+.47,z,.105,.15,brass,8);
    for(const y of [base,base+.12,cap])torus(g,cx,y,z,.48,.068,steel,true);
    const liquid=cylinder(g,cx,base,z,.44,1,E.water('#3bbddd',.95),32);
    const skin=cylinder(g,cx,base,z,.44,.03,'#9be4e0',32);
    for(let j=0;j<8;j++)block(g,cx+.41,base+.2+j*.17,z+.27,j%2?.08:.13,.021,.04,cream);
    const bubbles=Array.from({length:12},(_,j)=>bead(g,0,0,0,.037,'#caeef3'));
    // Physical pressure indicator has tick marks and a recorded transient.
    const gx=-.02,gy=2.03,gz=z+.09;
    rod(g,[gx,1.25,z],[gx,gy,z],.09,brass);
    rod(g,[gx,gy,gz-.13],[gx,gy,gz+.1],.34,steel,40);
    rod(g,[gx,gy,gz+.1],[gx,gy,gz+.114],.296,cream,40);
    for(let j=0;j<11;j++){let a=(-140+j*28)*Math.PI/180;
      rod(g,[gx+.221*Math.sin(a),gy+.221*Math.cos(a),gz+.12],[gx+.273*Math.sin(a),gy+.273*Math.cos(a),gz+.12],.009,j>7?'#c95440':steel);}
    const pivot=new THREE.Group();g.add(pivot);pivot.position.set(gx,gy,gz+.138);
    rod(pivot,[0,-.037,0],[0,.23,0],.016,'#ce4c31');bead(pivot,0,0,0,.036,steel);
    // An opaque front casing sinks over 2.8 seconds to expose the wet passage.
    const shell=object(g,new THREE.CylinderGeometry(.314,.314,3.74,32,1,true,0,Math.PI),steel,-.55,1.05,z);
    shell.rotation.z=Math.PI/2;
    const splash=Array.from({length:35},(_,i)=>bead(g,0,0,0,.045+i%3*.008,'#71d8e9'));
    c.upd.push(t=>{
      const [shut,open,fill,pressure]=values(t);piston.position.y=1.65+.34*shut;stem.position.y=piston.position.y+.27;
      check.position.y=1.46+.35*open;liquid.scale.y=.31+fill*1.06; liquid.position.y=base+liquid.scale.y/2;skin.position.y=base+liquid.scale.y;
      pivot.rotation.z=2.2-pressure*4.36;
      const cut=st('cut',t);shell.position.y=1.05-.91*cut;shell.scale.x=1-.985*cut;
      bubbles.forEach((m,j)=>{let a=j*2.4+t*.37; m.position.set(cx+.28*Math.cos(a),skin.position.y+.09+((j*.193+t*.12)%1)*(cap-skin.position.y-.12),z+.28*Math.sin(a));});
      splash.forEach((m,j)=>{let u=(t*(.9+.05*(j%3))+j*.618)%1,a=j*2.4;
        const strength=1-shut;let spread=.24+u*.38;
        m.position.set(wx+Math.cos(a)*spread,1.76+.59*Math.sin(u*Math.PI)-1.98*u*u,z+.34+u*1.2+.16*Math.sin(a));m.scale.setScalar((.042+.013*(j%3))*strength*Math.sin(Math.PI*u));});
    });
    ticker(c,[[-2.6,1.05,z+.22],[wx,1.05,z+.22],[wx,1.8,z+.22]],8,.054,t=>t*.18+.29*Math.max(0,t-PLAN.tl.accel),t=>1-values(t)[0]);
    ticker(c,[[wx,1.05,z+.22],[cx,1.05,z+.22],[cx,2.35,z+.22]],8,.053,t=>t*.32,t=>values(t)[1]);
    for(let j=0;j<4;j++){
      const m=torus(g,0,1.05,z,.29,.018,'#ffba49');m.rotation.y=Math.PI/2;
      c.upd.push(t=>{let u=(t*.86+j/4)%1;m.position.x=wx-u*2.25;m.scale.setScalar(.85+.24*Math.sin(u*Math.PI));m.visible=values(t)[3]>.08;m.scale.multiplyScalar(Math.min(1,values(t)[3]*3));});
    }
  }
  const glyphs={
    rumah:'M9 33 32 12 55 33 M15 30v23h34V30 M28 53V38h9v15',
    air:'M32 6C28 17 14 29 14 39a18 18 0 0 0 36 0C50 29 36 17 32 6Z M21 39q0 9 8 11',
    angkat:'M8 49h12l25-30h10 M38 18h17v17',
    turun:'M8 15h12l25 32h10 M39 48h16V32',
    tanya:'M20 23c0-16 27-16 27 0 0 10-14 11-14 22 M33 52v1',
    listrik:'M24 6v13m16-13v13 M17 20h30v7a15 15 0 0 1-30 0Z M32 43v12 M8 55 56 7',
    bensin:'M13 18h24l13 12v23H13Z M19 18V9h17v9 M36 13l5-5 8 8-5 5 M22 29l17 15m-17 0 17-15',
    ember:'M12 27h40l-5 25H17Z M17 27c0-26 30-26 30 0',
    arus:'M5 18q9-8 18 0t18 0t18 0 M5 34q9-8 18 0t18 0t18 0 M6 49h40m-8-7 9 7-9 7',
    cepat:'M3 16h21 M3 31h16 M3 46h21 M25 16l15 15-15 15 M42 16l15 15-15 15',
    pompa:'M4 44h53V30H37V12a6 6 0 0 1 12 0v18 M14 43V27h10v16 M10 24h18 M7 51h49',
    buang:'M7 48h20V27 M40 48V27 M17 26h30 M32 26V10 M22 12h21 M45 35q12 0 12 16',
    tutup:'M5 46h20V28 M40 46V28 M19 27h27 M32 28V12 M24 11h16 M8 20l6 7 7-7',
    limpas:'M7 42h13V23h10v13 M30 24q19-9 25 17 M31 31q11-4 16 12 M35 51q6-6 12 0t12 0',
    stop:'M4 32h24m-9-9 9 9-9 9 M38 12v40 M49 16v32',
    meter:'M8 47a26 26 0 1 1 48 0Z M32 38l14-16 M14 35h4m29 0h4M32 15v4',
    tekanan:'M4 48h12l8-9 7-27 7 38 7-13h14',
    gelombang:'M4 17h56M4 47h56 M5 33h7q6-21 12 0t12 0t12 0h11',
    katup:'M13 52V39l14-8 M51 52V39l-13-8 M24 27h17 M32 24V8m-6 7 6-7 7 7',
    tabung:'M17 51V24a15 15 0 0 1 30 0v27Z M18 36q7-5 14 0t14 0 M25 17h2m10 6h2',
    kompresi:'M16 52V19a16 13 0 0 1 32 0v33Z M17 30h30 M24 41l8-8 8 8 M32 33v15',
    bak:'M10 23v30h43V23 M12 35q7-5 13 0t13 0t13 0 M9 11h22v14m-5-5 5 6 5-6',
    siklus:'M10 28a22 22 0 0 1 39-11l4 6 M53 11v13H40 M54 37a22 22 0 0 1-39 11l-4-6 M10 54V41h13',
    rendah:'M5 14h10l8 9 7 18 8-9 8 14h13',
    cabang:'M7 33h19l20-18h11 M28 32l17 17h12 M50 9l7 6-7 6 M50 43l7 6-7 6',
    energi:'M5 14h7l17 32h6L53 9 M43 12l11-5 3 12',
    rotor:'M39 29q14-16 4-23-9-4-12 19 M36 39q7 16 19 11 8-8-12-16 M26 37q-18 1-20 14 4 10 22-8 M37 32a5 5 0 1 1-10 0 5 5 0 0 1 10 0'
  };
  const anchors={rumah:[12,9,-1],air:[-13,3.38,-.6],pompa:[0,1.4,1.52],ember:[-3.55,.82,.9],buang:[-.9,1.85,1.55],tutup:[-.9,2,1.55],katup:[1.4,1.67,1.51],tabung:[1.4,3.08,1.52],kompresi:[1.4,3.46,1.52],bak:[10.15,9.1,.55],meter:[-.02,2.02,1.7],limpas:[-.85,1.38,2.1]};
  function diagrams(c,beats){
    c.hud.push(t=>{
      const b=beats.find(b=>t>=b.t0&&t<b.t1);if(!b)return '';
      const op=ramp(t,b.t0,b.t0+.27)*(1-ramp(t,b.t1-.21,b.t1));
      const accent=['stop','tutup','listrik','bensin','tekanan'].includes(b.symbol)?'#ffbf62':'#74e4da';
      let line='';
      const isMeter=['gelombang','tekanan','rendah','kompresi'].includes(b.symbol);
      const isWater=['angkat','bak','cabang','energi'].includes(b.symbol);
      let indicator='';
      if(isMeter||isWater){
        const f=isMeter?(b.symbol==='kompresi'?E.kf(PLAN.tl.fill,t):E.kf(PLAN.tl.pressure,t)):cl(.15+(t-PLAN.tl.reveal)*.007);
        const color=isMeter?'#eaa34a':'#35abd1';
        indicator='<g transform="translate(901,675)"><rect width="112" height="220" rx="19" fill="#f6faf7"/><text x="56" y="31" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="17" fill="#334e56">'+(isMeter?(b.symbol==='kompresi'?'ISI AIR':'TEKANAN'):'BAK DESA')+'</text><rect x="31" y="54" width="30" height="140" rx="10" fill="#d9e5e5"/><rect x="31" y="'+(194-f*140)+'" width="30" height="'+(f*140)+'" rx="6" fill="'+color+'"/><path d="M65 55h14m-14 34h8m-8 36h14m-14 34h8m-8 35h14" stroke="#64808a" stroke-width="3"/></g>';
      }
      if(anchors[b.symbol]){
        const [x,y,depth]=K.toScreen(c,anchors[b.symbol]);
        if(x>65&&x<1015&&y>650&&y<1225&&depth<1){
          line='<path d="M260 578v35L'+x+' '+y+'" fill="none" stroke="#183c47" stroke-opacity=".5" stroke-width="7"/><path d="M260 578v35L'+x+' '+y+'" fill="none" stroke="white" stroke-width="3"/><circle cx="'+x+'" cy="'+y+'" r="9" fill="'+accent+'" stroke="#17384a" stroke-width="4"/>';
        }
      }
      const w=Math.max(360,b.text.length*18+145);
      return '<g opacity="'+op+'">'+line+indicator+'<g transform="translate(58,477)"><rect x="0" y="5" width="'+w+'" height="98" rx="20" fill="#274453" opacity=".18"/><rect width="'+w+'" height="98" rx="20" fill="#183744"/><circle cx="52" cy="49" r="34" fill="#2f505b"/><path d="'+glyphs[b.symbol]+'" transform="translate(28 25) scale(.76)" stroke="'+accent+'" stroke-width="4.4" stroke-linejoin="round" stroke-linecap="round" fill="none"/><text x="104" y="39" font-family="DejaVu Sans,sans-serif" font-size="17" font-weight="bold" letter-spacing="2" fill="'+accent+'">'+(t<PLAN.tl.reveal?'DESA BUKIT':t<PLAN.tl.cut[1][0]?'INSTALASI AIR':'POMPA HIDRAM')+'</text><text x="104" y="75" font-family="DejaVu Sans,sans-serif" font-size="30" font-weight="bold" fill="white">'+ENG.H.esc(b.text)+'</text></g></g>';
    });
  }
  ENG.def('hidram',{gerak:'tetap',build(c,p){
    c.scene.background=K.tex('hydSky',8,512,(ctx,w,h)=>{let gr=ctx.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#68b4e7');gr.addColorStop(.7,'#c5e4ee');gr.addColorStop(1,'#edf4e5');ctx.fillStyle=gr;ctx.fillRect(0,0,w,h);});
    c.scene.fog=new THREE.Fog('#c9e1db',70,183);
    landscape(c);village(c);pump(c); c.shot.target=p.focus;
    c.shotAt=t=>{const [x,y,z,dist,yaw,pitch,fov]=E.spline(PLAN.cams[p.cam],t);return {target:[x,y,z],dist,yaw,pitch,fov};};
    diagrams(c,p.moments); E.hud(c,p.hud);
  }});
})();

/* Declarative stage player: asset/actor keyframes with exact hand targets and ownership. */
(function(){
 const {H}=ENG;
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const num=(v,d=0)=>Number.isFinite(+v)?+v:d;
 const safePath=p=>typeof p==='string'&&p.length<=6000&&/^[MmLlHhVvCcSsQqTtAaZz0-9\s.,+\-eE]+$/.test(p);
 function sample(o,u){const base={x:num(o.x,540),y:num(o.y,1000),scale:H.cl(num(o.scale,1),.1,3),rotation:num(o.rotation),opacity:H.cl(num(o.opacity,1)),pose:o.pose||'diam'};const frames=[{at:0,...base},...(o.frames||[]).map(f=>({...base,...f}))].sort((a,b)=>a.at-b.at);let a=frames[0],b=a;for(let i=1;i<frames.length;i++){b=frames[i];if(u<=b.at)break;a=b;}const k=H.ramp(u,a.at,Math.max(a.at+.00001,b.at));const out={...a};for(const key of ['x','y','scale','rotation','opacity'])out[key]=H.lerp(num(a[key],base[key]),num(b[key],base[key]),k);out.pose=a.pose===b.pose?a.pose:b.pose;out.pose_from=a.pose;out.blend=a.pose===b.pose?1:k;return out;}
 function point(state,obj){const angle=state.rotation*Math.PI/180,dx=(num(obj.grip_x,100)-100)*state.scale,dy=(num(obj.grip_y,200)-200)*state.scale;return{x:state.x+Math.cos(angle)*dx-Math.sin(angle)*dy,y:state.y+Math.sin(angle)*dx+Math.cos(angle)*dy};}
 function hand(c,actor,side){const e=c.el('ch_actor'+actor+(side==='left'?'_fL':'_fR')),cam=document.getElementById('cam_'+c.i);if(!e?.getCTM())return null;const m=cam.getCTM().inverse().multiply(e.getCTM());return{x:+(m.e+m.c*54).toFixed(3),y:+(m.f+m.d*54).toFixed(3)};}
 H.choreography={
  build(c,p,scene){
   scene=JSON.parse(JSON.stringify(scene));
   const layout=p.layout||{},main=scene.actors.find(a=>a.jenis==='tokoh')||scene.actors[0];
   const shift=(o,x,y,scale)=>{
    const dx=Number.isFinite(+x)&&x!=null?+x-num(o.x,540):0,dy=Number.isFinite(+y)&&y!=null?+y-num(o.y,1000):0;
    o.x=num(o.x,540)+dx;o.y=num(o.y,1000)+dy;
    if(scale!=null)o.scale=H.cl(num(scale,1),.1,3);
    for(const f of o.frames||[]){if(f.x!=null)f.x+=dx;if(f.y!=null)f.y+=dy;if(scale!=null)f.scale=o.scale;}
   };
   if(main)shift(main,layout.actor_x,layout.actor_y,null);
   const target=scene.objects.find(o=>o.id===main?.right_target)||scene.objects.find(o=>o.asset===c.recipe?.target)||scene.objects[0];
   if(target)shift(target,layout.target_x??layout.hand_x,layout.target_y??layout.hand_y,layout.target_scale);
   const tool=scene.objects.find(o=>o.attached_to===scene.actors.indexOf(main));
   if(tool&&layout.tool_scale!=null)shift(tool,null,null,layout.tool_scale);
   c.ch=scene;c.chLayout={latar:p.latar||scene.background||'kampung',waktu:p.waktu||'malam',cahaya:scene.light||'lentera',aktor:[],props:scene.scenery||[],sosok:null,kustom:[]};
   let s=ENG.T.komposisi.build(c,c.chLayout);
   const assets=window.HOROR_ASSETS.assets;
   for(const o of scene.objects){const a=assets[o.asset],path=o.path||a?.path;if(!safePath(path))continue;
    s+=`<g id="${c.id('ch_obj_'+o.id)}"><g transform="scale(1) translate(-100,-200)"><path d="${path}" fill="${/^#[a-fA-F0-9]{6}$/.test(o.color||'')?o.color:'#4b3926'}" fill-rule="evenodd" stroke="#ac8e61" stroke-width="${H.cl(num(o.stroke,2),0,5)}" stroke-linejoin="round"/>`;
    if(o.label)s+=`<text x="100" y="100" font-size="18" text-anchor="middle" fill="#e8cf98">${esc(o.label)}</text>`;
    s+='</g></g>';
   }
   for(let i=0;i<scene.actors.length;i++){const a=scene.actors[i];s+=H.figure(c.id('ch_actor'+i),{jenis:a.jenis==='tokoh'?p.tokoh:a.jenis||p.tokoh,rim:'#dab37a'});}
   // Foreground objects are moved after actor nodes, retaining their stable ids.
   c.chForeground=scene.objects.filter(o=>o.foreground).map(o=>o.id);
   for(let i=0;i<(scene.streams||[]).length;i++)s+=`<path id="${c.id('ch_stream'+i)}" fill="none" stroke="#b3a27b" stroke-width="4"/>`;
   return s;
  },
  upd(c,t,p){
   ENG.T.komposisi.upd(c,t,c.chLayout);
   const begin=p.aksi_mulai_t??c.t0,end=p.aksi_selesai_t??c.t1,u=H.cl((t-begin)/Math.max(.01,end-begin));
   const states={};for(const o of c.ch.objects)states[o.id]=sample(o,u);
   for(let i=0;i<c.ch.actors.length;i++){
    const a=c.ch.actors[i],q=sample(a,u),target=(u>=(a.target_window?.[0]??0)&&u<=(a.target_window?.[1]??1)&&states[a.right_target])?point(states[a.right_target],c.ch.objects.find(o=>o.id===a.right_target)):null;
    if(q.pose==='jongkok'&&target&&target.y>=q.y-50)q.pose='meraih_bawah';
    H.poseFigure(c.id('ch_actor'+i),{jenis:a.jenis==='tokoh'?p.tokoh:a.jenis||p.tokoh,pose:q.pose,x:q.x,y:q.y,s:q.scale,flip:!!a.flip,phase:(t-begin)*num(a.speed,3),pose_from:q.pose_from,blend:q.blend,exact_contact:true,hand_x:target?.x,hand_y:target?.y,left_hand_x:states[a.left_target]?point(states[a.left_target],c.ch.objects.find(o=>o.id===a.left_target)).x:null,left_hand_y:states[a.left_target]?point(states[a.left_target],c.ch.objects.find(o=>o.id===a.left_target)).y:null,two_hands:!!a.two_hands,head_turn:a.turn?H.lerp(1,-1,H.ramp(u,.25,.7)):null});
   }
   for(const o of c.ch.objects){const q=states[o.id];
    if(o.attached_to!=null){const h=hand(c,o.attached_to,o.hand||'right');if(h){const pivot=point({...q,x:0,y:0},o);q.x=h.x-pivot.x;q.y=h.y-pivot.y;}}
    if(o.transfer){const {from,to,start=.35,end=.65}=o.transfer,a=hand(c,from,'right'),b=hand(c,to,'right');if(a&&b){const k=H.ramp(u,start,end),pivot=point({...q,x:0,y:0},o);q.x=H.lerp(a.x,b.x,k)-pivot.x;q.y=H.lerp(a.y,b.y,k)-pivot.y;}}
    H.att(c.id('ch_obj_'+o.id),'transform',`translate(${q.x},${q.y}) rotate(${q.rotation}) scale(${q.scale})`);H.att(c.id('ch_obj_'+o.id),'opacity',q.opacity);
   }
   for(let i=0;i<(c.ch.streams||[]).length;i++){
    const line=c.ch.streams[i],a=states[line.from]?point(states[line.from],c.ch.objects.find(o=>o.id===line.from)):null,b=states[line.to]?point(states[line.to],c.ch.objects.find(o=>o.id===line.to)):null;if(!a||!b)continue;
    H.att(c.id('ch_stream'+i),'d',`M${a.x} ${a.y} Q${a.x} ${b.y} ${b.x} ${b.y}`);H.att(c.id('ch_stream'+i),'opacity',H.ramp(u,line.start??.2,(line.start??.2)+.05)*(1-H.ramp(u,line.end??.8,(line.end??.8)+.05)));
   }
   window.__choreographyMetrics=window.__choreographyMetrics||{};
   const metrics=[];
   for(let i=0;i<c.ch.actors.length;i++){
    const a=c.ch.actors[i],o=c.ch.objects.find(o=>o.id===a.right_target),q=states[a.right_target],h=hand(c,i,'right');
    if(o&&q&&h&&u>=(a.target_window?.[0]??0)&&u<=(a.target_window?.[1]??1)){
     const target=point(q,o);metrics.push({actor:i,error:Math.hypot(target.x-h.x,target.y-h.y)});
    }
   }
   window.__choreographyMetrics[c.i]=metrics;
   for(const id of c.chForeground){const e=c.el('ch_obj_'+id);if(e)e.parentNode.appendChild(e);}
  }
 };
})();

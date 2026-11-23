Stik.boot = function(plan) {
  const {ctx,hash,clamp,smooth}=Stik;
  const sub=document.getElementById('sub'), label=document.getElementById('label');
  const title=document.getElementById('title'), wm=document.getElementById('wm');
  const badge=label.firstElementChild, scenes=plan.scenes, cues=plan.cues;
  wm.textContent=plan.watermark||'';
  const paper=document.createElement('canvas');
  paper.width=paper.height=128;
  const pc=paper.getContext('2d'), pixels=pc.createImageData(128,128);
  for(let i=0;i<128*128;i++){
    pixels.data[i*4]=68;pixels.data[i*4+1]=40;pixels.data[i*4+2]=28;
    pixels.data[i*4+3]=Math.floor(hash(i)*13);
  }
  pc.putImageData(pixels,0,0);
  const texture=ctx.createPattern(paper,'repeat');
  const focus={
    halaman:[265,544],layang_layang:[276,427],meja_kerja:[278,518],
    kebun_kelapa:[257,515],catatan:[272,492],diagram_angin:[303,456],
    akar_kelapa:[270,512],tangki:[267,523],dapur:[311,487]
  };
  function render(t){
    const scene=scenes.find(s=>t<s.end)||scenes[scenes.length-1];
    if(!scene)return;
    const p=scene.params, u=clamp((t-scene.start)/Math.max(.001,scene.end-scene.start));
    const shot=(scene.shots||[]).find(s=>t<s.end)||{}, view=shot.view||'utama';
    const move=scene.camera?.gerak, ease=smooth(u);
    let zoom=({utama:1,detail:1.19,samping:1.08,luas:.96})[view]||1;
    zoom+=move==='maju'?.056*ease:move==='mundur'?.056*(1-ease):0;
    const [fx,fy]=focus[scene.template]||[270,480];
    const pan=move==='geser_kanan'?15*(.5-ease):move==='geser_kiri'?15*(ease-.5):0;
    ctx.setTransform(2,0,0,2,0,0);ctx.lineJoin='round';ctx.lineCap='round';
    ctx.save();ctx.translate(fx+pan+(view==='samping'?12:0),fy+(move==='naik'?ease*9:0));
    ctx.scale(zoom,zoom);ctx.translate(-fx,-fy);
    Stik.scenes[scene.template](p,t,u);ctx.restore();
    if(p.cuaca==='hujan'){
      Stik.box(0,0,540,960,'#26334c5c');
      for(let i=0;i<90;i++){
        const y=(hash(i)*1040+t*390)%1040-50;
        const x=(hash(i+31)*650-y*.22+650)%650-45;
        Stik.line(x,y,x-3,y+15,'#e8eff19a',1.1);
      }
    }
    Stik.box(0,0,540,960,texture);
    const cue=cues.find(c=>c.start<=t && t<(c.pe??c.end));
    let caption='';
    if(cue && p.subtitel!==false){
      const words=cue.text.replace(/[*_]/g,'').trim().split(/\s+/);
      const wt=cue.wt?.length===words.length?cue.wt:null;
      const i=wt?wt.filter(time=>time<=t+.00001).length-1:
        Math.min(words.length-1,Math.floor(clamp((t-cue.start)/Math.max(.01,cue.end-cue.start))*words.length));
      caption=words[i]||'';
    }
    sub.textContent=caption;
    sub.style.color=(plan.style?.warna_subtitle||{})[cue?.role]||'#fffdf5';
    const showLabel=p.label && t>=(p.label_t??scene.start);
    label.hidden=!showLabel;badge.textContent=showLabel?p.label:'';
    label.style.setProperty('--badge',({gas:'#d3afe4',air:'#afdef1',peringatan:'#f39372',netral:'#fff6dd'})[p.warna_label]||'#ffcf63');
    title.textContent=scene===scenes[0]&&!showLabel&&t<Math.min(scene.end,1.6)?(plan.title_bar||''):'';
  }
  window.render=render;render(0);window.__ready=true;
};

// Ruang gambar 540 × 960. Semua gerak dihitung dari waktu film agar seek bisa diulang.
const Stik = (() => {
  const ctx = document.querySelector('#art').getContext('2d');
  const ink = '#30242c', tau = Math.PI * 2;
  function paint(fill, stroke, width) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function path(d, fill, stroke = null, width = 2) {
    const p = new Path2D(d);
    if (fill) { ctx.fillStyle = fill; ctx.fill(p); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(p); }
  }
  function oval(x,y,rx,ry,fill,stroke=null,width=2,angle=0) {
    ctx.beginPath(); ctx.ellipse(x,y,rx,ry,angle,0,tau); paint(fill,stroke,width);
  }
  function box(x,y,w,h,fill) { ctx.fillStyle=fill; ctx.fillRect(x,y,w,h); }
  function round(x,y,w,h,r,fill,stroke=null,width=2) {
    ctx.beginPath(); ctx.roundRect(x,y,w,h,r); paint(fill,stroke,width);
  }
  function line(x,y,x2,y2,color,width=2) {
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x2,y2); paint(null,color,width);
  }
  function gradient(y,h,...colors) {
    const g=ctx.createLinearGradient(0,y,0,y+h);
    colors.forEach((col,i)=>g.addColorStop(i/(colors.length-1),col)); return g;
  }
  function at(x,y,scale,draw,rotation=0) {
    ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale); ctx.rotate(rotation);
    draw(); ctx.restore();
  }
  function hash(i) {const v=Math.sin(i*78.233+13.7)*43758.5453;return v-Math.floor(v);}
  function clamp(n) {return Math.min(1, Math.max(0,n));}
  function smooth(n) {n=clamp(n);return n*n*(3-2*n);}
  function shadow(x,y,w) {oval(x+w*.15,y,w,Math.max(2,w*.11),'#39241f36');}
  return {ctx,ink,tau,path,oval,box,round,line,gradient,at,hash,clamp,smooth,shadow,scenes:{}};
})();

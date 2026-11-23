from pathlib import Path
import json
from studio import render,director
root=Path('/home/ai-center/Downloads/horor-studio')
src=root/'data/jobs/20261119-174222-07de'
out=src/'cinematic';out.mkdir(exist_ok=True)
r=json.loads((src/'render_plan.json').read_text())
for s in r['scenes']:
 s['template']='panama_cinematic'
 s['camera']={'gerak':'diam'}
 s['shots']=[]
(out/'render_plan.json').write_text(json.dumps(r,ensure_ascii=False,indent=2))
render.build_page(r,out/'page.html',director.load_style('edukasi_3d'))
p=out/'page.html'
h=p.read_text().replace("const g = c.gerak;","const g = c.stableCamera ? 'diam' : c.gerak;").replace("const view = scenes[c.i].sc.shots?.find", "const view = scenes[c.i].sc.shots?.find")
# Stable camera bypasses generic zoom, sway, and shot overrides entirely.
a=h.index('      const k = ease(c.k(t));',h.index('function camAt'))
b=h.index('      const y = s.yaw',a)
h=h[:a]+'''      let bump = 0;
      if (!c.stableCamera) { s.dist *= 1; }
'''+h[b:]
h=h.replace('top:1300px','top:1580px')
h=h.replace('</style>', '#hdr,#hud,#sub,#wm{display:none!important}#blk{background:#102d3b}</style>')
h=h.replace('      camAt(c, t);', '      for (const f of c.afterUpd || []) f(t);\n      camAt(c, t);')
p.write_text(h)
print(out)

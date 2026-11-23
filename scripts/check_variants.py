"""Exercise duration and character variants without altering the library."""
import sys,json,tempfile,concurrent.futures
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from studio import director as D,render,inspect_render,library
from studio.config import Cfg
cat=D.load_catalog('horor_kampung');st=D.load_style('horor_kampung')

def check(item):
 name,spec=item
 if not spec.get('metadata',{}).get('action'):return None
 cues=[];scenes=[];now=0.
 for i,kind in enumerate(('pria','wanita','bapak','gadis','anak','nenek','kakek')):
  dur=4. if i%2==0 else 12.
  cues.append(dict(i=i,start=now,end=now+dur,pe=now+dur-.1,text=spec['metadata']['examples'][0]))
  scenes.append(dict(dari=i,sampai=i,template=name,params={'tokoh':kind,'aksi_mulai_cue':i,'aksi_selesai_cue':i},kamera={'gerak':'diam'}));now+=dur
 p={'adegan':scenes,'peran':[]};r=D.resolve(p,cues,[],now,st)
 with tempfile.TemporaryDirectory() as tmp:
  html=render.build_page(r,Path(tmp)/'page.html',st)
  issues=inspect_render.inspect(html,r)
 return dict(template=name,variants=7,issues=issues,source_fingerprint=library.source_fingerprint('horor_kampung',[name]))
if __name__=='__main__':
 out=Cfg.DATA_DIR/'library'/library.VERSION/'variants_report.json';results=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  for r in pool.map(check,cat.items()):
   if r:
    results.append(r);print('VARIANTS',r['template'],len(r['issues']),flush=True)
    out.write_text(json.dumps(results,ensure_ascii=False,indent=1))

"""Review rendered references; failed items never become retrieval examples."""
import sys,json,time,hashlib,concurrent.futures,subprocess
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from studio import director as D,review,library,inspect_render
from studio.config import Cfg
out=Cfg.DATA_DIR/'library'/library.VERSION;st=D.load_style('horor_kampung');cat=D.load_catalog(st)

def check(batch):
 items=[]
 for no,(name,spec) in enumerate(batch,1):
  d=out/name
  deadline=time.monotonic()+1800
  def ready():
   if not all((d/file).exists() for file in ('demo.mp4','thumb.jpg','plan.json','fingerprint.txt')):return False
   plan=json.loads((d/'plan.json').read_text());text=spec.get('metadata',{}).get('examples',[spec['desc']])[0]
   r=D.resolve(plan,[dict(i=0,start=0.,end=6.,pe=5.8,text=text)],[],6,st)
   return (d/'fingerprint.txt').read_text()==library.fingerprint(r,'horor_kampung')
  while not ready():
   if time.monotonic()>deadline:raise RuntimeError('Reference render timeout '+name)
   time.sleep(1)
  imgs=[]
  for i,t in enumerate((.25,1.5,3.5,5.7)):
   image=d/f'qa{i}.jpg'
   subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(d/'demo.mp4'),'-vf','crop=880:1000:100:600,scale=720:-1','-frames:v','1',str(image)],check=True)
   imgs.append((t,image))
  text=spec.get('metadata',{}).get('examples',[spec['desc']])[0]
  items.append((no,text,spec['desc'],imgs))
 result=review._ask(items,print)
 rows=[]
 for no,(name,spec) in enumerate(batch,1):
  rating=next((v for v in result if v.get('no')==no),{})
  rows.append(dict(template=name,score=rating.get('skor'),issue=rating.get('masalah'),fix=rating.get('perbaikan'),reviewed=True,page_sha256=hashlib.sha256((out/name/'page.html').read_bytes()).hexdigest()))
 return rows
if __name__=='__main__':
 batches=[list(cat.items())[i:i+3] for i in range(0,len(cat),3)];allrows=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  futures=[pool.submit(check,b) for b in batches]
  for f in concurrent.futures.as_completed(futures):
   try:
    rows=f.result();allrows+=rows
    print('REVIEW',[(r['template'],r['score']) for r in rows],flush=True)
   except Exception as e:print('FAILED',str(e),flush=True)
   (out/'visual_review.json').write_text(json.dumps(allrows,ensure_ascii=False,indent=1))
 print('COMPLETE',len(allrows),flush=True)

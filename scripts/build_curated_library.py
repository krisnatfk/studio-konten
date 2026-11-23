"""Build completed authored recipes while the authoring batch is still running."""
import sys,time,json,concurrent.futures
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from scripts.render_library import one,cat,out
from studio.config import Cfg
root=Cfg.STYLES_DIR/'horor_kampung/library'

def build(item):
 name,spec=item
 if spec.get('metadata',{}).get('category')!='legacy':
  deadline=time.monotonic()+1800
  while not json.loads((root/'manifest.json').read_text())['recipes'][name].get('choreography'):
   if time.monotonic()>deadline:raise RuntimeError('Author timeout '+name)
   time.sleep(2)
 return one(item)
if __name__=='__main__':
 results=[];fail=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  futures={pool.submit(build,item):item[0] for item in cat.items()}
  for f in concurrent.futures.as_completed(futures):
   try:results.append(f.result());print('RENDERED',results[-1],flush=True)
   except Exception as e:fail.append({'template':futures[f],'error':str(e)});print('FAILED',futures[f],str(e),flush=True)
 (out/'render_report.json').write_text(json.dumps({'templates':len(cat),'completed':results,'errors':fail},indent=1));print('COMPLETE',len(results),flush=True)

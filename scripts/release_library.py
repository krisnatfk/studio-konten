"""Render, measure and visually review every current template; repair bounded recipes.

Only measured passing evidence is curated. Failed items remain explicit drafts.
"""
import sys,json,time,hashlib,subprocess,concurrent.futures,fcntl,base64,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from studio import library,review,director as D,inspect_render,choreography
from studio.config import Cfg
from scripts.render_library import one
from scripts.author_choreography import SYSTEM
root=Cfg.STYLES_DIR/'horor_kampung/library';out=Cfg.DATA_DIR/'library'/library.VERSION
assets=json.loads((root/'assets.json').read_text())['assets'];cat=D.load_catalog('horor_kampung')

def manifest():return json.loads((root/'manifest.json').read_text())
def save(name,scene):
 with (root/'manifest.lock').open('w') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX)
  value=manifest();value['recipes'][name]['choreography']=scene
  p=root/'manifest.tmp';p.write_text(json.dumps(value,ensure_ascii=False,indent=1)+'\n');p.replace(root/'manifest.json')

def measure(name):
 d=out/name;spec=cat[name];plan=json.loads((d/'plan.json').read_text());text=spec['metadata']['examples'][0]
 r=D.resolve(plan,[dict(i=0,start=0.,end=6.,pe=5.8,text=text)],[],6,D.load_style('horor_kampung'))
 technical=inspect_render.inspect(d/'page.html',r);imgs=[]
 for i,t in enumerate((.35,1.7,3.4,5.4)):
  path=d/f'release{i}.jpg'
  subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(d/'demo.mp4'),'-vf','crop=880:1000:100:600,scale=720:-1','-frames:v','1',str(path)],check=True)
  full=d/f'release_full{i}.jpg'
  subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(d/'demo.mp4'),'-vf','scale=540:-1','-frames:v','1',str(full)],check=True)
  imgs.extend([(t,full),(t,path)])
 # Production critic already accepts full/context + details. Static atmospheric narration should remain atmospheric.
 result=review._ask([(1,text,spec['desc'],imgs)],print)
 rating=next((v for v in result if v.get('no')==1),{})
 score=rating.get('skor');score=score if isinstance(score,(int,float)) and 1<=score<=10 else None
 return dict(template=name,score=score,issue=rating.get('masalah','Review tidak lengkap'),fix=rating.get('perbaikan',''),technical_issues=technical,reviewed=True,page_sha256=hashlib.sha256((d/'page.html').read_bytes()).hexdigest(),source_fingerprint=library.source_fingerprint('horor_kampung',[name])),imgs

def repair(name,rating,imgs):
 r=manifest()['recipes'][name]
 relevant={k:assets[k] for k in r['assets'] if k in assets}
 prompt=dict(recipe=r,review=rating,asset_metadata=relevant,available_assets=list(assets),instruction='Perbaiki semua masalah yang terlihat. Periksa geometri bahu dan panjang lengan, titik grip, skala dan hubungan objek. Pertahankan kegiatan ini; jangan mengubah narasi agar cocok dengan gambar. Semua frame lengkap. Jangan ubah jenis tokoh utama: jenis tokoh. Jangan jadikan seluruh aktivitas hanya perpindahan kamera. Gunakan IK target terjangkau dan perubahan benda yang jelas. Titik genggaman objek dipakai juga sebagai awal/akhir stream; untuk menuang pisahkan objek cerat tersembunyi jika perlu. Perbaiki pose terlalu jauh dari benda. Pose meraih_bawah sekarang tersedia (bahu x+83,y-198 pada pose penuh, lengan108). Kontak di tanah perlu tokoh yang cukup rendah. Tambahkan transisi yang halus antara pose.')
 content=[{'type':'text','text':json.dumps(prompt,ensure_ascii=False)}]
 for t,p in imgs:content += [{'type':'text','text':f'{t}s'},{'type':'image_url','image_url':{'url':'data:image/jpeg;base64,'+base64.b64encode(p.read_bytes()).decode()}}]
 raw=D.parse_json(D._chat([{'role':'system','content':SYSTEM+'\nPose tambahan: meraih_bawah.'},{'role':'user','content':content}],None,print,max_out=8500))
 return choreography.validate(raw['scene'],assets)

def run(name):
 recipe=manifest()['recipes'].get(name);history=[];best=None;best_scene=copy.deepcopy(recipe.get('choreography')) if recipe else None
 for attempt in range(3 if recipe else 1):
  one((name,cat[name]))
  try:rating,imgs=measure(name)
  except subprocess.CalledProcessError:
   (out/name/'fingerprint.txt').unlink(missing_ok=True);one((name,cat[name]));rating,imgs=measure(name)
  history.append(rating)
  rank=(not rating['technical_issues'],rating['score'] or 0)
  if best is None or rank>(not best['technical_issues'],best['score'] or 0):
   best=copy.deepcopy(rating);best_scene=copy.deepcopy(manifest()['recipes'][name]['choreography']) if recipe else None
  print('QUALITY',name,attempt+1,rating['score'],'technical',len(rating['technical_issues']),flush=True)
  if rating['score'] is not None and rating['score']>=8 and not rating['technical_issues']:break
  if recipe and attempt<2:
   candidate=repair(name,rating,imgs);save(name,candidate)
 if recipe and manifest()['recipes'][name]['choreography']!=best_scene:
  save(name,best_scene);one((name,cat[name]));best,_=measure(name)
 best=copy.deepcopy(best)
 best['history']=history
 (out/name/'review.json').write_text(json.dumps(best,ensure_ascii=False,indent=1))
 return best
if __name__=='__main__':
 names=sys.argv[1:] or list(cat);rows=[];pending=[]
 for name in names:
  path=out/name/'review.json'
  try:
   row=json.loads(path.read_text())
   valid=row.get('source_fingerprint')==library.source_fingerprint('horor_kampung',[name]) and row.get('page_sha256')==hashlib.sha256((out/name/'page.html').read_bytes()).hexdigest()
  except (OSError,ValueError):valid=False
  if valid:rows.append(row)
  else:pending.append(name)
 names=pending
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  futures={pool.submit(run,n):n for n in names}
  for f in concurrent.futures.as_completed(futures):
   try:row=f.result()
   except Exception as e:row=dict(template=futures[f],score=None,technical_issues=[str(e)],reviewed=False);print('FAILED',futures[f],str(e),flush=True)
   rows.append(row)
   p=out/'visual_review.tmp';p.write_text(json.dumps(rows,ensure_ascii=False,indent=1));p.replace(out/'visual_review.json')
 print('COMPLETE',len(rows),'PASS',sum((r.get('score') or 0)>=8 and not r.get('technical_issues') for r in rows),flush=True)

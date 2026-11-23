"""Render reproducible six-second reference clips, thumbs and phase contact sheets."""
import sys,json,shutil,subprocess,concurrent.futures,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from studio import director as D,render,library
from studio.config import Cfg
out=Cfg.DATA_DIR/'library'/library.VERSION
st=D.load_style('horor_kampung');cat=D.load_catalog(st)

def one(item):
 name,spec=item;d=out/name;d.mkdir(parents=True,exist_ok=True)
 cues=[dict(i=0,start=0.,end=6.,pe=5.8,text=spec.get('metadata',{}).get('examples',[spec['desc']])[0])]
 params={}
 if name=='judul_kartu':params={'teks':'Malam Jumat Kliwon','sub':'Kisah kampung'}
 if name=='komposisi':params={'latar':'sawah','aktor':[{'jenis':'pria','pose':'jalan','x':40,'x_akhir':60,'y':73,'skala':.8}]}
 plan=dict(schema_version=2,library_version=library.VERSION,judul=name,adegan=[dict(dari=0,sampai=0,template=name,params=params,kamera=dict(gerak='diam'))],peran=[])
 r=D.resolve(plan,cues,[],6,st)
 fingerprint=library.fingerprint(r,'horor_kampung')
 if (d/'demo.mp4').exists() and (d/'fingerprint.txt').exists() and (d/'fingerprint.txt').read_text()==fingerprint:
  probe=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(d/'demo.mp4')],capture_output=True,text=True)
  if probe.returncode==0 and float(json.loads(probe.stdout).get('format',{}).get('duration',0))>=5.99:return name
 html=render.build_page(r,d/'page.html',st)
 (d/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=1))
 frames=d/'frames';frames.mkdir(exist_ok=True)
 subprocess.run(render._worker_cmd(html,frames,['--fps','30','--start','0','--end','180']),check=True,capture_output=True)
 subprocess.run(['ffmpeg','-v','error','-y','-framerate','30','-i',str(frames/'f%05d.jpg'),'-c:v','libx264','-preset','ultrafast','-crf','24','-pix_fmt','yuv420p','-t','6','-movflags','+faststart',str(d/'pending.mp4')],check=True)
 (d/'pending.mp4').replace(d/'demo.mp4')
 shutil.copy2(frames/'f00090.jpg',d/'thumb.jpg')
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(d/'demo.mp4'),'-vf','fps=1,scale=216:-1,tile=6x1','-frames:v','1',str(d/'contact.jpg')],check=True)
 shutil.rmtree(frames)
 (d/'fingerprint.txt').write_text(fingerprint)
 return name
if __name__=='__main__':
 errors=[]
 if len(sys.argv)>1:cat={n:cat[n] for n in sys.argv[1:]}
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  jobs={pool.submit(one,item):item[0] for item in cat.items()}
  for f in concurrent.futures.as_completed(jobs):
   try:print('OK',f.result(),flush=True)
   except Exception as e:errors.append(dict(template=jobs[f],error=str(e)));print('FAILED',jobs[f],str(e),flush=True)
 (out/'render_report.json').write_text(json.dumps(dict(version=library.VERSION,templates=len(cat),errors=errors),indent=1))
 print('COMPLETE',len(cat)-len(errors),'/',len(cat),flush=True)

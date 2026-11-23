"""Six silent renderer fixtures. These are not claimed as MP3 alignment tests."""
import sys,json,subprocess,concurrent.futures,shutil
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from studio import director as D,render,inspect_render
from studio.config import Cfg
st=D.load_style('horor_kampung');cat=D.load_catalog(st)
scenarios={'rumah':['menyapu_lantai','melipat_pakaian','mengunci_pintu'],'dapur':['memotong_sayuran','menggoreng_makanan','menuang_teh'],'pertanian':['mencangkul_tanah','menanam_padi','memikul_panen'],'pasar':['menimbang_dagangan','menyerahkan_belanjaan','membayar_kembalian'],'perjalanan':['mengendarai_motor','menuntun_motor','menyalakan_senter'],'horor':['berhenti_mendengar','mengintip_pintu','pocong_melompat']}

def run(item):
 name,names=item;out=Cfg.DATA_DIR/'qa_v2'/name;out.mkdir(parents=True,exist_ok=True)
 cues=[dict(i=i,start=i*6.,end=(i+1)*6.,pe=(i+1)*6-.1,text=cat[n]['metadata']['examples'][0]) for i,n in enumerate(names)]
 p=dict(schema_version=2,library_version='2.0.0',judul=name,adegan=[dict(dari=i,sampai=i,template=n,params={'aksi_mulai_cue':i,'aksi_selesai_cue':i},kamera={'gerak':'diam'}) for i,n in enumerate(names)],peran=[])
 r=D.resolve(p,cues,[],18,st);html=render.build_page(r,out/'page.html',st)
 issues=inspect_render.inspect(html,r)
 (out/'fixture.json').write_text(json.dumps(dict(plan=p,cues=cues,issues=issues),ensure_ascii=False,indent=1))
 render.storyboard(html,r,out/'storyboard.jpg',out/'sb')
 frames=out/'frames';subprocess.run(render._worker_cmd(html,frames,['--fps','30','--start','0','--end','540']),check=True,capture_output=True)
 subprocess.run(['ffmpeg','-y','-v','error','-framerate','30','-i',str(frames/'f%05d.jpg'),'-c:v','libx264','-preset','ultrafast','-crf','24','-pix_fmt','yuv420p','-t','18',str(out/'demo.mp4')],check=True)
 shutil.rmtree(frames);return dict(scenario=name,issues=issues,video=str(out/'demo.mp4'))
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(run,scenarios.items()))
 (Cfg.DATA_DIR/'qa_v2/report.json').write_text(json.dumps(results,ensure_ascii=False,indent=1));print(json.dumps(results),flush=True)

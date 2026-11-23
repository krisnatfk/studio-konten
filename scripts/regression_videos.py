"""Local-only compatibility renders using two existing scripts and MP3 alignments."""
import sys,json,shutil,concurrent.futures,subprocess
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from studio import db,pipeline,director
from studio.config import Cfg

def run(source):
 src=Cfg.JOBS_DIR/source
 jid=db.create('local',status='validasi',payload={'audio':'input.mp3','style':'horor_kampung','fps':30})
 d=Cfg.JOBS_DIR/jid
 for name in ('input.mp3','vo.wav','words.json','cues.json','naskah.txt','plan.json'):
  if (src/name).exists():shutil.copy2(src/name,d/name)
 job=db.get(jid);log=pipeline._log(jid);c=json.loads((d/'cues.json').read_text());p=json.loads((d/'plan.json').read_text())
 out=pipeline.produce(job,log,p,c['cues'],c['events'],c['duration'],director.load_style('horor_kampung'),ai_review=True)
 q=json.loads((d/'quality_report.json').read_text());db.update(jid,status='selesai' if q['passed'] else 'draft_review',title=p.get('judul',''),progress=1,error='; '.join(q['issues']))
 result=dict(source=source,job=jid,passed=q['passed'],issues=q['issues'],video=str(out));print(json.dumps(result),flush=True)
 (Cfg.DATA_DIR/('regression-'+source+'.json')).write_text(json.dumps(result,indent=1))
if __name__=='__main__':run(sys.argv[1])

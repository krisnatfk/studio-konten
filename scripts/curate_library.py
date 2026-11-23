"""Promote only references backed by passing, current visual and mechanical evidence."""
import sys,json,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from studio import library,director,inspect_render
from studio.config import Cfg
root=Cfg.STYLES_DIR/'horor_kampung/library';out=Cfg.DATA_DIR/'library'/library.VERSION
rows=json.loads((out/'visual_review.json').read_text()) if (out/'visual_review.json').exists() else []
scores={r['template']:r for r in rows};refs=json.loads((root/'references.json').read_text());results=[]
for name,spec in director.load_catalog('horor_kampung').items():
 row=scores.get(name,{});score=row.get('score');d=out/name
 approved=False;issues=[]
 if isinstance(score,(int,float)) and score>=8 and (d/'page.html').exists():
  # Review is tied to its generated HTML, never silently reuse after source changes.
  if row.get('page_sha256')==hashlib.sha256((d/'page.html').read_bytes()).hexdigest():
   st=director.load_style('horor_kampung');plan=json.loads((d/'plan.json').read_text());text=spec.get('metadata',{}).get('examples',[spec['desc']])[0]
   r=director.resolve(plan,[dict(i=0,start=0.,end=6.,pe=5.8,text=text)],[],6,st)
   if not (d/'fingerprint.txt').exists() or (d/'fingerprint.txt').read_text()!=library.fingerprint(r,'horor_kampung'):
    issues=['Snapshot bukan versi sumber saat ini.']
   else:
    issues=inspect_render.inspect(d/'page.html',r);approved=not issues
 for ref in refs:
  if ref['template']==name and not ref.get('negative'):
   ref['status']='verified' if approved and ref['id'].endswith('-1') else 'authored_pending_visual_review'
   if approved:
    ref['plan']=json.loads((d/'plan.json').read_text())
   ref['evidence']=dict(score=score,version=library.VERSION,source_fingerprint=library.source_fingerprint('horor_kampung',[name]),page_sha256=row.get('page_sha256'),issues=issues or ([row.get('issue','Review belum lengkap atau kedaluwarsa')] if not approved else []))
 results.append(dict(template=name,score=score,verified=approved,issues=issues))
temporary=root/'references.tmp'
temporary.write_text(json.dumps(refs,ensure_ascii=False,indent=1)+'\n');temporary.replace(root/'references.json')
(out/'curation_report.json').write_text(json.dumps(results,ensure_ascii=False,indent=1)+'\n')
print('Verified',sum(r['verified'] for r in results),'/',len(results))

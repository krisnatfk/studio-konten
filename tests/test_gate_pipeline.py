import json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from studio import pipeline,director as D

class GateIntegration(unittest.TestCase):
 def test_runner_keeps_unapproved_preview_as_draft(self):
  for passed,status,kind in [(False,'draft_review','draft'),(True,'selesai','video')]:
   with self.subTest(status=status),tempfile.TemporaryDirectory() as tmp:
    d=Path(tmp);cues={'cues':[dict(i=0,start=0,end=6,text='Aku berada di kampung.')],'events':[],'duration':6}
    (d/'cues.json').write_text(json.dumps(cues));(d/'plan.json').write_text(json.dumps({'adegan':[{'dari':0,'sampai':0,'template':'kampung_malam','params':{},'kamera':{}}]}));(d/'quality_report.json').write_text(json.dumps({'passed':passed,'issues':[] if passed else ['Belum dinilai']}))
    job={'id':'test','task':'render','payload':{'style':'horor_kampung'}}
    with patch.object(pipeline,'jdir',return_value=d),patch.object(pipeline,'_log',return_value=lambda _:None),patch.object(pipeline,'step'),patch.object(pipeline,'produce',return_value=d/'preview.mp4'),patch.object(pipeline.db,'update') as update,patch.object(pipeline.db,'get',return_value=job),patch.object(pipeline,'notify') as notify:
     pipeline.run(job)
     self.assertTrue(any(c.kwargs.get('status')==status for c in update.call_args_list))
     self.assertTrue(any(c.args[1]==kind for c in notify.call_args_list))
     if not passed:self.assertFalse(any(c.args[1]=='video' for c in notify.call_args_list))

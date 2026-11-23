import json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from studio import pipeline,library

class PublishGateTests(unittest.TestCase):
 def test_failed_review_keeps_preview_and_archives_old_final(self):
  with tempfile.TemporaryDirectory() as tmp:
   d=Path(tmp);(d/'vo.wav').write_bytes(b'audio');(d/'final.mp4').write_bytes(b'old final')
   (d/'cues.json').write_text(json.dumps({'alignment':{'reliable':True}}))
   r={'scenes':[{'template':'kampung_malam','start':0.,'end':6.}],'cues':[],'events':[]}
   style={'name':'horor_kampung','_dir':str(d)};job={'id':'local','payload':{}}
   def encode(frames,audio,out,duration):out.write_bytes(b'new video');return out
   with patch.object(pipeline,'jdir',return_value=d),patch.object(pipeline.Cfg,'LLM_ENABLED',False),patch.object(pipeline,'_build',return_value=(r,d/'page.html')),patch.object(pipeline.render,'storyboard',return_value=d/'storyboard.jpg'),patch.object(pipeline.render,'render_frames'),patch.object(pipeline.render,'encode',side_effect=encode),patch.object(pipeline.mix,'mix',return_value=d/'mix.m4a'),patch.object(pipeline,'step'),patch.object(pipeline,'notify'):
    out=pipeline.produce(job,lambda _:None,{'adegan':[]},[],[],6.,style)
   self.assertEqual(out.name,'preview.mp4');self.assertTrue(out.exists());self.assertFalse((d/'final.mp4').exists())
   self.assertEqual(len(list(d.glob('previous_final_*.mp4'))),1)
   self.assertFalse(json.loads((d/'quality_report.json').read_text())['passed'])

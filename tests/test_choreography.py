import json,unittest,tempfile
from pathlib import Path
from studio import choreography,library,director as D,render,inspect_render
from studio.config import Cfg

class ChoreographyTests(unittest.TestCase):
 def test_all_authored_scenes_validate(self):
  root=Cfg.STYLES_DIR/'horor_kampung/library';m=json.loads((root/'manifest.json').read_text());assets=json.loads((root/'assets.json').read_text())['assets']
  for n,r in m['recipes'].items():
   with self.subTest(template=n):self.assertIs(choreography.validate(r['choreography'],assets),r['choreography'])
 def test_invalid_transfer_and_cyclic_contact_rejected(self):
  scene={'actors':[{'right_target':'box'}],'objects':[{'id':'box','asset':'box','attached_to':0}]}
  with self.assertRaises(ValueError):choreography.validate(scene,{'box':{}})
  scene['actors'][0]={};scene['objects'][0]={'id':'box','asset':'box','transfer':{'from':0,'to':5}}
  with self.assertRaises(ValueError):choreography.validate(scene,{'box':{}})
 def test_edukasi_3d_renders_every_template(self):
  st=D.load_style('edukasi_3d');cat=D.load_catalog(st)
  cues=[{'i':i,'start':i*3.0,'end':i*3.0+2.6,'text':'Contoh kalimat edukasi.'} for i in range(len(cat))]
  p={'adegan':[{'dari':i,'sampai':i,'template':n,'params':{},'kamera':{'gerak':'diam'}} for i,n in enumerate(cat)]}
  r=D.resolve(p,cues,[],len(cat)*3.0,st)
  with tempfile.TemporaryDirectory() as tmp:
   html=render.build_page(r,Path(tmp)/'page.html',st)
   self.assertFalse(inspect_render.inspect(html,r))

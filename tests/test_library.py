import json,tempfile,unittest
from pathlib import Path
from studio import director as D,library,quality,render,inspect_render

class LibraryTests(unittest.TestCase):
 def setUp(self):self.st=D.load_style('horor_kampung');self.cat=D.load_catalog(self.st)
 def test_catalog_assets_references_complete(self):
  self.assertEqual(len(self.cat),120)
  root=Path(self.st['_dir'])/'library';m=json.loads((root/'manifest.json').read_text());assets=json.loads((root/'assets.json').read_text())['assets']
  self.assertEqual(len(m['recipes']),100)
  for r in m['recipes'].values():self.assertTrue(all(a in assets for a in r['assets']))
  refs=json.loads((root/'references.json').read_text());self.assertEqual(len(refs),360)
 def test_retrieval_positive_negative_era(self):
  selected=library.shortlist(self.cat,'Ibu menyapu lantai dapur.');self.assertLessEqual(len(selected),12);self.assertIn('menyapu_lantai',selected)
  self.assertIn('menyapu_lantai',library.shortlist(self.cat,'Ibu lagi nyapu lantai rumah.'))
  self.assertIn('mencuci_piring',library.shortlist(self.cat,'Dia nyuci piring di dapur.'))
  self.assertNotIn('menyapu_lantai',library.shortlist(self.cat,'Jangan menyapu lantai.'))
  self.assertNotIn('mengendarai_motor',library.shortlist(self.cat,'Tahun 1975 warga berjalan di kampung tradisional.'))
 def test_gate_fails_closed_on_missing_stale_low_or_audio(self):
  r={'scenes':[{'start':0,'end':6}]};h=library.fingerprint(r,'horor_kampung')
  report={'fingerprint':h,'scenes':[{'no':1,'score':8}]}
  self.assertFalse(quality.verdict(report,r,'horor_kampung',{'reliable':True})['passed'])  # legacy plan lacks shot evidence
  for bad in (None,dict(report,fingerprint='old'),dict(report,scenes=[]),dict(report,scenes=[{'no':1,'score':7}])):self.assertFalse(quality.verdict(bad,r,'horor_kampung')['passed'])
  self.assertFalse(quality.verdict(report,r,'horor_kampung',{'reliable':False})['passed'])
  self.assertFalse(quality.verdict(report,r,'horor_kampung',None)['passed'])
  self.assertFalse(quality.verdict(dict(report,scenes=[{'no':1,'score':float('nan')}]),r,'horor_kampung',{'reliable':True})['passed'])
  self.assertFalse(quality.verdict(dict(report,scenes=[{'no':2,'score':9}]),r,'horor_kampung',{'reliable':True})['passed'])
 def test_source_fingerprints_track_only_used_recipes_and_shared_code(self):
  from unittest.mock import patch
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);engine=root/'engine';engine.mkdir();styles=root/'styles';lib=styles/'test/library';lib.mkdir(parents=True)
   (engine/'core.js').write_text('engine version one')
   manifest=lib/'manifest.json';value={'version':'2','recipes':{'a':{'action':'wash'},'b':{'action':'walk'}}};manifest.write_text(json.dumps(value))
   from studio.config import Cfg
   with patch.object(Cfg,'ENGINE_DIR',engine),patch.object(Cfg,'STYLES_DIR',styles):
    first=library.source_fingerprint('test',['a']);value['recipes']['b']['action']='run';manifest.write_text(json.dumps(value))
    self.assertEqual(first,library.source_fingerprint('test',['a']))
    value['recipes']['a']['action']='pour';manifest.write_text(json.dumps(value))
    second=library.source_fingerprint('test',['a']);self.assertNotEqual(first,second)
    (engine/'core.js').write_text('engine version two');self.assertNotEqual(second,library.source_fingerprint('test',['a']))
 def test_new_recipes_render_and_reproduce_after_seek(self):
  from playwright.sync_api import sync_playwright
  names=['menyerahkan_belanjaan','menuntun_anak','membuka_bungkusan','pocong_melompat','menuang_teh','menyapu_lantai']
  cues=[dict(i=i,start=i*6.,end=i*6.+6,text=self.cat[n]['metadata']['examples'][0]) for i,n in enumerate(names)]
  p=dict(adegan=[dict(dari=i,sampai=i,template=n,params={},kamera={'gerak':'diam'}) for i,n in enumerate(names)],peran=[])
  r=D.resolve(p,cues,[],len(names)*6,self.st)
  with tempfile.TemporaryDirectory() as tmp:
   html=render.build_page(r,Path(tmp)/'page.html',self.st)
   with sync_playwright() as pw:
    br=pw.chromium.launch(args=['--no-sandbox']);pg=br.new_page(viewport={'width':1080,'height':1920});pg.goto(html.as_uri());pg.wait_for_function('window.__ready === true')
    self.assertEqual(pg.evaluate('Object.keys(ENG.T).length'),120)
    pg.evaluate('render',2.5);a=pg.locator('#s0_person0_aR,#s0_ch_actor0_aR').first.get_attribute('transform');pg.evaluate('render',3.2);b=pg.locator('#s0_person0_aR,#s0_ch_actor0_aR').first.get_attribute('transform');self.assertNotEqual(a,b)
    pg.evaluate('render',9.);pg.evaluate('render',3.2);self.assertEqual(b,pg.locator('#s0_person0_aR,#s0_ch_actor0_aR').first.get_attribute('transform'))
    self.assertEqual(pg.locator('[transform*="NaN"]').count(),0);br.close()

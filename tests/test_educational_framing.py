import tempfile
import unittest
from pathlib import Path

from playwright.sync_api import sync_playwright

from studio import director as D, render


class EducationalFramingTests(unittest.TestCase):
    def test_full_height_pole_stays_below_header_during_camera_movement(self):
        style = D.load_style('edukasi_3d')
        names = ['pembuka', 'aktivitas', 'penutup']
        cues = [dict(i=i, start=i*6., end=(i+1)*6., text='Tiang listrik berdiri kokoh.') for i in range(3)]
        plan = {'adegan': [dict(dari=i, sampai=i, template=name,
                               params={'objek': 'tiang_beton', 'jarak': 'dekat', 'aksi': 'tunjuk'},
                               kamera={'gerak': 'maju' if i < 2 else 'mundur'}) for i, name in enumerate(names)]}
        resolved = D.resolve(plan, cues, [], 18, style)
        with tempfile.TemporaryDirectory() as tmp, sync_playwright() as pw:
            path = render.build_page(resolved, Path(tmp)/'page.html', style)
            browser = pw.chromium.launch(args=['--no-sandbox'])
            page = browser.new_page(viewport={'width': 1080, 'height': 1920})
            page.goto(path.as_uri())
            page.wait_for_function('window.__ready===true')
            page.evaluate('''() => {
                const original = K.lights;
                K.lights = (c,p) => { window.testContexts ||= {}; window.testContexts[c.i] = c; original(c,p); };
            }''')
            # Seek away first so the initial scene is rebuilt through the observation hook.
            page.evaluate('render', 17.)
            for i in range(3):
                for f in (.1, .5, .9):
                    page.evaluate('render', i*6+6*f)
                    points = page.evaluate('''i => {
                        const c = window.testContexts[i]; let pole;
                        c.scene.traverse(o => {
                            if(o.geometry?.type==='CylinderGeometry' && o.geometry.parameters.height>10) pole=o;
                        });
                        pole.updateWorldMatrix(true,false);
                        return [0,9].map(y => {
                            const p = pole.getWorldPosition(new THREE.Vector3());
                            p.y=y; p.project(c.cam);
                            return [(p.x+1)*540,(1-p.y)*960];
                        });
                    }''', i)
                    for x,y in points:
                        self.assertGreater(x, 40)
                        self.assertLess(x, 1040)
                        self.assertGreater(y, 270, (names[i],f,points))
                        self.assertLess(y, 1650, (names[i],f,points))
            browser.close()

    def test_buried_pole_is_visible_and_decay_does_not_automatically_topple_it(self):
        style = D.load_style('edukasi_3d')
        cues = [dict(i=i, start=i*6., end=(i+1)*6., text='Pangkal bambu mulai lapuk.') for i in range(3)]
        plan = {'adegan': [
            dict(dari=0,sampai=0,template='bawah_tanah',params={'isi':'tiang_bambu','efek':'lapuk'},kamera={'gerak':'diam'}),
            dict(dari=1,sampai=1,template='masalah',params={'objek':'tiang_bambu','kejadian':'lapuk'},kamera={'gerak':'diam'}),
            dict(dari=2,sampai=2,template='penutup',params={},kamera={'gerak':'diam'})]}
        resolved = D.resolve(plan,cues,[],18,style)
        with tempfile.TemporaryDirectory() as tmp, sync_playwright() as pw:
            path = render.build_page(resolved,Path(tmp)/'page.html',style)
            browser = pw.chromium.launch(args=['--no-sandbox'])
            page = browser.new_page(viewport={'width':1080,'height':1920})
            page.goto(path.as_uri());page.wait_for_function('window.__ready===true')
            page.evaluate('''() => { const original=K.lights;
                K.lights=(c,p)=>{window.testContexts||={};window.testContexts[c.i]=c;original(c,p);}; }''')
            page.evaluate('render',17.)
            page.evaluate('render',2.)
            visible = page.evaluate('''() => {
                const c=window.testContexts[0]; let pole;
                c.scene.traverse(o=>{if(o.geometry?.type==='CylinderGeometry'&&o.geometry.parameters.height>8)pole=o;});
                const target=pole.getWorldPosition(new THREE.Vector3());target.y=-1.4;
                const ray=new THREE.Raycaster(c.cam.position,target.clone().sub(c.cam.position).normalize());
                ray.camera=c.cam;
                const hits=ray.intersectObjects(c.scene.children,true);
                return hits[0]?.object===pole;
            }''')
            self.assertTrue(visible,'The soil face must not hide the buried pole in a cross-section.')
            page.evaluate('render',11.)
            vertical = page.evaluate('''() => {
                const c=window.testContexts[1];let pole;
                c.scene.traverse(o=>{if(o.geometry?.type==='CylinderGeometry'&&o.geometry.parameters.height>8)pole=o;});
                return new THREE.Vector3(0,1,0).transformDirection(pole.matrixWorld).y;
            }''')
            self.assertGreater(vertical,.99,'Decay alone must not animate a collapse that is absent from narration.')
            browser.close()

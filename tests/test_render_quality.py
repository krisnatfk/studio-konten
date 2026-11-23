"""Uji Chromium: gerak sendi, cue audio, properti dan determinisme render."""
import tempfile
import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
from studio import director as D, render
from studio.config import Cfg


class RenderQualityTests(unittest.TestCase):
    def test_actions_timing_depth_and_determinism(self):
        st = D.load_style('horor_kampung')
        cues = [{'i': i, 'start': i * 5., 'end': i * 5. + 4.8, 'pe': i * 5. + 4.6, 'text': 'Bapak mengipas sate.'} for i in range(5)]
        scenes = []
        for i, tpl in enumerate(['pasar_ramai', 'bakar_sate', 'dapur_memasak', 'komposisi', 'komposisi']):
            params = {'aksi_mulai_cue': 1} if i == 1 else {}
            if tpl == 'komposisi':
                params = {'latar': 'pasar', 'latar_gerak': 'menjauh', 'aktor': [{'jenis': 'bapak', 'pose': 'mengipas', 'x': 40, 'y': 78, 'skala': .8, 'alat': 'kipas', 'tangan_x': 50, 'tangan_y': 62, 'cue': 3, 'kata': 'mengipas', 'akhir_cue': 3}, {'jenis': 'nenek', 'pose': 'berjualan', 'x': 75, 'y': 70, 'skala': .5}],
                          'props': [{'jenis': 'panggangan', 'x': 55, 'y': 78, 'cue': 3, 'kata': 'mengipas'},
                                    {'jenis': 'bungkusan_tanah', 'x': 55, 'y': 66, 'di_atas': 4, 'buka_cue': 3, 'kata': 'mengipas'},
                                    {'jenis': 'kalender', 'x': 70, 'y': 65}, {'jenis': 'papan_nama', 'x': 30, 'y': 65, 'teks': 'PASAR SETAN'}, {'jenis': 'meja', 'x': 55, 'y': 78}],
                          'kustom': [{'path': 'M0 200 L100 0 L200 200Z', 'x': 60, 'gerak': 'goyang', 'cue': 3, 'kata': 'mengipas', 'aktor': 0, 'tangan': 'kanan'}]}
            if i == 4:
                params = {'latar': 'kampung', 'aktor': [{'jenis': 'pria', 'pose': 'tergeletak', 'x': 50, 'y': 82, 'skala': .9}]}
            scenes.append({'dari': i, 'sampai': i, 'template': tpl, 'params': params, 'kamera': {'gerak': 'diam'}})
        cues[3]['wt'] = [15., 17., 18.]
        plan, _ = D.normalize({'adegan': scenes}, cues, D.load_catalog(st))
        r = D.resolve(plan, cues, [], 25, st)
        with tempfile.TemporaryDirectory() as tmp, sync_playwright() as pw:
            page_path = render.build_page(r, Path(tmp) / 'page.html', st)
            kw = {'args': ['--no-sandbox', '--disable-gpu']}
            if Cfg.CHROME_PATH: kw['executable_path'] = Cfg.CHROME_PATH
            br = pw.chromium.launch(**kw)
            pg = br.new_page(viewport={'width': 1080, 'height': 1920})
            errors = []
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(page_path.as_uri())
            pg.wait_for_function('window.__ready === true')
            pg.evaluate('document.fonts.ready')
            def at(t, selector, attr):
                pg.evaluate('render', t)
                return pg.locator(selector).get_attribute(attr)
            a = at(5.8, '#s1_cook_aR', 'transform')
            b = at(6.3, '#s1_cook_aR', 'transform')
            self.assertNotEqual(a, b, 'tangan pedagang harus bergerak')
            a = at(10.8, '#s2_cook_fR', 'transform')
            b = at(11.4, '#s2_cook_fR', 'transform')
            self.assertNotEqual(a, b, 'tangan pengaduk harus bergerak')
            self.assertEqual(at(16, '#s3_prop0', 'opacity'), '0')
            before = at(16, '#s3_a0_aR', 'transform')
            self.assertEqual(at(17.1, '#s3_prop0', 'opacity'), '1')
            after = at(17.4, '#s3_a0_aR', 'transform')
            self.assertNotEqual(before, after)
            held_before = at(17.1, '#s3_ku0', 'transform')
            held_after = at(17.4, '#s3_ku0', 'transform')
            self.assertNotEqual(held_before, held_after, 'barang harus mengikuti tangan yang bergerak')
            hand = pg.evaluate("""() => {const a=document.getElementById('s3_a0_fR'),cam=document.getElementById('cam_3');const m=cam.getCTM().inverse().multiply(a.getCTM());return [m.c*54+m.e,m.d*54+m.f]}""")
            self.assertAlmostEqual(hand[0], 540, delta=8)
            self.assertAlmostEqual(hand[1], 868, delta=8)
            self.assertIn('577.5,920', pg.locator('#s3_bungkus1').get_attribute('transform'))
            left_before = at(17.1, '#s3_a1_aL', 'transform')
            left_after = at(17.4, '#s3_a1_aL', 'transform')
            self.assertNotEqual(left_before, left_after, 'tokoh tua yang berjualan tetap harus bergerak')
            folded = at(16, '#s3_bungkus1_left', 'transform')
            unfolded = at(18, '#s3_bungkus1_left', 'transform')
            self.assertNotEqual(folded, unfolded, 'bungkusan membuka mengikuti timestamp kata')
            self.assertIn('JUMAT', pg.locator('#s3_prop2').text_content())
            near = at(15.2, '#s3_backdrop', 'transform')
            far = at(19, '#s3_backdrop', 'transform')
            self.assertNotEqual(near, far, 'latar pasar harus benar-benar menjauh')
            pg.evaluate('render', 22.)
            bounds = pg.locator('#s4_a0').bounding_box()
            self.assertGreater(bounds['x'], 40, 'tubuh tergeletak tidak terpotong kiri')
            self.assertLess(bounds['x'] + bounds['width'], 1040)
            self.assertLess(bounds['y'] + bounds['height'], 1550)
            pg.evaluate('render', 17.4)
            image = pg.screenshot()
            pg.evaluate('render', 2.)
            pg.evaluate('render', 19.7)
            pg.evaluate('render', 17.4)
            self.assertEqual(image, pg.screenshot(), 'frame harus identik setelah seek waktu acak')
            self.assertFalse(pg.locator('[transform*="NaN"], [opacity="NaN"]').count())
            self.assertFalse(errors)
            br.close()


if __name__ == '__main__': unittest.main()

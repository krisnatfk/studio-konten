"""Mechanical checks on the actual Chromium SVG, independent of AI scores."""
from playwright.sync_api import sync_playwright
from .config import Cfg


def inspect(html,rplan):
    issues=[]
    with sync_playwright() as pw:
        kw={'args':['--no-sandbox','--disable-gpu']}
        if Cfg.CHROME_PATH:kw['executable_path']=Cfg.CHROME_PATH
        br=pw.chromium.launch(**kw);pg=br.new_page(viewport={'width':1080,'height':1920})
        errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
        pg.goto(html.resolve().as_uri());pg.wait_for_function('window.__ready === true')
        for i,s in enumerate(rplan['scenes']):
            times = {s['start']+(s['end']-s['start'])*f for f in (.1,.5,.9)}
            times.update(m["t"] for shot in s.get("shots", []) for m in shot["moments"])
            for t in sorted(times):
                try:pg.evaluate('render',t)
                except Exception as e:issues.append(f'Adegan {i+1}: animasi gagal {str(e)[:120]}');continue
                invalid=pg.locator('[transform*="NaN"],[transform*="Infinity"],[opacity="NaN"]').count()
                if invalid:issues.append(f'Adegan {i+1}: koordinat animasi tidak valid.')
                for j in range(6):
                    loc=pg.locator(f'#s{i}_person{j},#s{i}_ch_actor{j}')
                    if loc.count():
                        b=loc.bounding_box()
                        if b and (b['x']<0 or b['x']+b['width']>1080 or b['y']<0 or b['y']+b['height']>1700):issues.append(f'Adegan {i+1}: tokoh terpotong/keluar area aksi.')
                contacts=pg.evaluate('window.__choreographyMetrics || {}')
                for row in contacts.get(str(i),[]):
                    if row.get('error',0)>8:issues.append(f'Adegan {i+1}: tangan tidak menjangkau objek ({row["error"]:.0f} unit).')
        issues.extend(errors);br.close()
    return list(dict.fromkeys(issues))

from pathlib import Path
import json,subprocess,time
from PIL import Image,ImageDraw
from studio import render
from studio.config import Cfg
src=Path('data/jobs/20261119-174222-07de');out=src/'polished'
r=json.loads((out/'render_plan.json').read_text());dur=r['duration']
times=[s['start']+(s['end']-s['start'])*k for s in r['scenes'] for k in [.1,.5,.9]]
subprocess.run(render._worker_cmd(out/'page.html',out/'preview',['--times',','.join(map(str,times)),'--prefix','shot']),check=True)
w,h=216,384
sheet=Image.new('RGB',(w*9,(h+24)*9),'#e7edf0');d=ImageDraw.Draw(sheet)
for i,t in enumerate(times):
 im=Image.open(out/'preview'/f'shot{i:03d}.jpg');im=im.resize((w,h));x=(i%9)*w;y=(i//9)*(h+24);sheet.paste(im,(x,y));d.text((x+5,y+h+3),f'{t:.2f}s',fill='#123544')
sheet.save(out/'storyboard_polished.jpg',quality=92)
print('Preview complete',flush=True)
Cfg.RENDER_WORKERS=8
render.render_frames(out/'page.html',out/'frames',dur,lambda p:print(f'Render {p:.0%}',flush=True))
render.encode(out/'frames',src/'mix.m4a',out/'terusan_panama_polished.mp4',dur)
print('ENCODE COMPLETE',flush=True)

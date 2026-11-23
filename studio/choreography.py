"""Validate declarative activity choreography. No executable code from model outputs."""
import math,re
POSES={'diam','jalan','lari','duduk','duduk_lantai','jongkok','tidur','tergeletak','menoleh','menunduk','mengetuk','menunjuk','berdoa','mengipas','membalik_sate','mengaduk','berjualan','membeli','berbicara','membawa','makan','minum','mengangguk','membuka_bungkusan','mengayuh','meraih_bawah'}
PATH=re.compile(r'^[MmLlHhVvCcSsQqTtAaZz0-9\s.,+\-eE]+$')

def validate(scene,assets):
 if not isinstance(scene,dict):raise ValueError('scene must be an object')
 actors=scene.get('actors',[]);objects=scene.get('objects',[])
 if not 0<=len(actors)<=6 or not 1<=len(objects)<=20:raise ValueError('actor/object limits')
 ids=[o.get('id') for o in objects]
 if len(set(ids))!=len(ids) or any(not isinstance(i,str) or not re.fullmatch(r'[a-z0-9_]{1,30}',i) for i in ids):raise ValueError('object ids')
 for actor in actors:
  if actor.get('jenis','tokoh') not in ('tokoh','pria','bapak','wanita','gadis','anak','nenek','kakek'):raise ValueError('actor kind')
  if actor.get('pose','diam') not in POSES:raise ValueError('pose')
  for key in ('right_target','left_target'):
   if actor.get(key) and actor[key] not in ids:raise ValueError('hand target')
  for frame in actor.get('frames',[]):
   if frame.get('pose',actor.get('pose','diam')) not in POSES:raise ValueError('frame pose')
 for obj in objects:
  if obj.get('asset') not in assets and not obj.get('path'):raise ValueError('asset missing')
  if obj.get('path') and (len(obj['path'])>6000 or not PATH.fullmatch(obj['path'])):raise ValueError('invalid path')
  if obj.get('attached_to') is not None and not 0<=obj['attached_to']<len(actors):raise ValueError('attachment')
 def numbers(v):
  if isinstance(v,dict):
   for k,x in v.items():
    if k in ('x','y','scale','rotation','opacity','at','grip_x','grip_y') and isinstance(x,(int,float)) and not math.isfinite(x):raise ValueError('nonfinite value')
    numbers(x)
  elif isinstance(v,list):
   for x in v:numbers(x)
 numbers(scene)
 for actor in actors:
  if actor.get('right_target'):
   obj=next(o for o in objects if o['id']==actor['right_target'])
   if obj.get('attached_to')==actors.index(actor):raise ValueError('cyclic hand attachment')
 for obj in objects:
  transfer=obj.get('transfer')
  if transfer and any(not isinstance(transfer.get(k),int) or not 0<=transfer[k]<len(actors) for k in ('from','to')):raise ValueError('transfer actor')
 return scene

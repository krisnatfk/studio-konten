"""Local, versioned scene retrieval and immutable render fingerprints."""
import hashlib
import json
import re
from functools import lru_cache
from .config import Cfg

VERSION='2.0.0'
SCHEMA_VERSION=2


def tokens(text):
    words=re.findall(r'[a-z0-9]+',text.lower())
    stop={'di','ke','dari','yang','dan','ia','dia','aku','itu','sebuah','lalu','dengan','orang','mulai','ketika','ada'}
    result={w for w in words if w not in stop}
    path=Cfg.STYLES_DIR/'horor_kampung/library/synonyms.json'
    if path.exists():
        synonyms=json.loads(path.read_text())
        result |= {synonyms[w] for w in words if w in synonyms}
    return result


def shortlist(cat,text,pinned=(),limit=12):
    if len(cat)<=limit:return cat
    words=tokens(text)
    ranked=[]
    for name,spec in cat.items():
        m=spec.get('metadata',{})
        label=tokens(m.get('label',name.replace('_',' ')))
        score=len(words & label)*8+len(words & tokens(' '.join(m.get('examples',[]))))
        if re.search(r'\b(?:tidak|jangan|tanpa|belum)\b.{0,25}'+re.escape(m.get('label','__none__')),text,re.I):score=-100
        if m.get('era')=='modern' and re.search(r'\b(?:198\d|197\d|zaman dahulu|masa lalu|tradisional)\b',text,re.I) and not (words & label):score=-100
        if m.get('supernatural') and not re.search(r'hantu|bayangan|pocong|kuntilanak|makhluk|sosok|arwah|sendiri|jejak|menghilang|cermin',text,re.I):score=-100
        ranked.append((score,name))
    names=list(dict.fromkeys([n for n in pinned if n in cat]+(['komposisi'] if 'komposisi' in cat else [])))
    for score,name in sorted(ranked,key=lambda x:(-x[0],x[1])):
        if score < 0:continue
        if name not in names:names.append(name)
        if len(names)>=limit:break
    return {name:cat[name] for name in names[:limit]}


def references(style,cat,text):
    path=Cfg.STYLES_DIR/style/'library/references.json'
    if not path.exists():return []
    rows=json.loads(path.read_text())
    # Only human/visually verified examples are eligible as positive guidance.
    rows=[r for r in rows if not r.get('negative') and r['template'] in cat and r.get('status')=='verified' and r.get('evidence',{}).get('source_fingerprint')==source_fingerprint(style,[r['template']])]
    return sorted(rows,key=lambda r:-len(tokens(text)&tokens(r['text'])))[:3]


def source_fingerprint(style, templates=None):
    digest=hashlib.sha256()
    paths=list(Cfg.ENGINE_DIR.rglob('*.js'))+list(Cfg.ENGINE_DIR.glob('*.html'))+list((Cfg.STYLES_DIR/style).rglob('*'))
    for p in sorted(paths):
        if p.is_file() and (p.suffix in ('.js','.html') or p.name in ('style.json','assets.json','manifest.json')):
            digest.update(str(p.relative_to(Cfg.STYLES_DIR) if p.is_relative_to(Cfg.STYLES_DIR) else p.relative_to(Cfg.ENGINE_DIR)).encode())
            if p.name == 'manifest.json' and templates is not None:
                value=json.loads(p.read_text());value['recipes']={k:v for k,v in value.get('recipes',{}).items() if k in templates}
                digest.update(json.dumps(value,sort_keys=True).encode())
            else:digest.update(p.read_bytes())
    return digest.hexdigest()


def fingerprint(plan,style):
    digest=hashlib.sha256(json.dumps(plan,sort_keys=True,ensure_ascii=False).encode())
    digest.update(source_fingerprint(style,[s.get('template','') for s in plan.get('scenes',[])]).encode())
    return digest.hexdigest()

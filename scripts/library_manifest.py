"""Inspect a catalog without changing source or assets."""
import sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from studio import director,library
st=director.load_style('horor_kampung');cat=director.load_catalog(st)
print(json.dumps({'version':library.VERSION,'templates':len(cat),'groups':sorted({s.get('metadata',{}).get('category','legacy') for s in cat.values()})},indent=2))

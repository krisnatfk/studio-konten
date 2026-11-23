"""Author bounded declarative candidates through the configured provider; keep review pending."""
import sys,json,concurrent.futures,fcntl
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from studio import director as D,choreography
from studio.config import Cfg
root=Cfg.STYLES_DIR/'horor_kampung/library';manifest=json.loads((root/'manifest.json').read_text());assets=json.loads((root/'assets.json').read_text())['assets']
SYSTEM='''Kamu animator SVG horor kampung dan ahli rig IK. Buat koreografi kegiatan fisik yang terbaca, bukan pose umum atau objek yang melayang. Keluaran JSON saja. Semua gambar dari aset lokal atau path SVG, tanpa kode program.
SCHEMA scene:
{background:"dalam_rumah|dapur|teras|pasar|sawah|hutan|kuburan|sungai|jalan|lapangan|kampung",actors:[{jenis:"tokoh|pria|wanita|anak|nenek|bapak",x:470,y:1040,scale:1,pose:"diam",flip:false,right_target:"id_objek",target_window:[0,1],two_hands:false,frames:[{at:0,x:470,y:1040,scale:1,pose:"diam"},{at:1,x:470,y:1040,scale:1,pose:"diam"}]}],objects:[{id:"name",asset:"nama_aset",x:540,y:1040,scale:1,rotation:0,opacity:1,grip_x:100,grip_y:100,foreground:false,color:"#795c36",frames:[{at:0,x:540,y:1040,scale:1,rotation:0,opacity:1},{at:1,x:540,y:1040,scale:1,rotation:0,opacity:1}]}],streams:[{from:"objek",to:"objek",start:.2,end:.8}]}
KOORDINAT aktor/objek WORLD PIXEL, bukan persen. Area tampak x230..850, y600..1040. Kaki aktor y1040, tinggi aktor scale1=306. Bahu (x,y-246), panjang lengan56+52=108. Semua titik genggaman HARUS maksimal 105 dari bahu. Anak punya faktor tambahan .6: tinggi184 dan lengan65. Berjongkok menurunkan badan92: bahu (x,y-154). Tidur berotasi -90: kepala 300 ke kiri dari titik kaki; gunakan akar x740 y990 untuk tidur di ranjang, bukan x500 terpotong kiri.
Aset memakai kotak lokal200x200, titik dasar default(100,200). Genggaman dihitung dari grip_x/grip_y dalam koordinat aset, setelah scale dan rotation (rotasi PADA TITIK DASAR). Tangan actor.right_target mengikuti genggaman objek (IK). Objek yang bebas memegang tangan pakai attached_to:indeks actor, hand:"right|left"; jangan pasang right_target pada benda yang attached_to aktor itu sendiri. Benda berpindah tangan dapat memakai transfer:{from:0,to:1,start:.35,end:.65}; atur target_window setiap aktor saat kontak.
POSE: diam,jalan,lari,duduk,duduk_lantai,jongkok,tidur,tergeletak,menoleh,menunduk,mengetuk,menunjuk,berdoa,mengipas,mengaduk,berjualan,membeli,berbicara,membawa,makan,minum,mengangguk,membuka_bungkusan,mengayuh. IK tangan+objek yang bergerak menunjukkan aktivitas; pose umum sendiri tidak cukup.
Semua frame LENGKAP x,y,scale,rotation,opacity untuk objek; x,y,scale,pose untuk aktor. at adalah pecahan0..1 dari adegan6detik. Pakai 4-9 tahap, benda merespons (terlipat, terbelah, berpindah, pintu membuka, air masuk, hasil panen). Boleh path SVG baru untuk bagian yang harus terpisah (pintu/kusen, tutup/kotak, kain terlipat), memakai field path menggantikan asset. Path aman hanya perintah dan angka dalam kotak200x200. Jangan menaruh gambar meja di atas meja. Gunakan aset meja sebagai satu objek: scale1.8 dasar1040 -> permukaan878 karena meja punya tinggi90. Piring/cangkir harus kecil dan beralas di permukaan; tangan harus terjangkau. Beri objek pendukung yang relevan, maksimal20, maksimal6aktor. Pertahankan gaya siluet bertepi hangat dan lingkungan kampung.
Contoh sapu: toolscale1.05, grip_y35, dasar(535,1040) -> genggaman(535,867), terjangkau aktor(470,1040). Ayunkan sapu di lantai ±60px, gerakkan tangan sesuai, kumpulkan debu. Jangan pegang sapu pendek di dada.
Tidak ada ekspresi wajah, tidak boleh menambah hantu bila kegiatan bukan horor. Jangan mengganti seluruh objek dengan satu persegi atau membuat benda hilang untuk berpura-pura aktivitas selesai.
Balas {"scene":...}.'''

def one(name):
 r=manifest['recipes'][name]
 selected={k:assets[k] for k in set(r['assets']+['meja','kursi','piring','cangkir','bungkusan','kain','panci','tanaman','padi','ember','baskom','dipan']) if k in assets}
 qa_path=Cfg.DATA_DIR/'library/2.0.0/visual_review.json'
 qa=next((x for x in json.loads(qa_path.read_text()) if x['template']==name),{}) if qa_path.exists() else {}
 prompt=json.dumps({'recipe':r,'previous_visual_review':qa,'available_assets':list(assets),'relevant_asset_shapes':selected},ensure_ascii=False)
 raw=D.parse_json(D._chat([{'role':'system','content':SYSTEM},{'role':'user','content':prompt}],None,print,max_out=7000))
 scene=choreography.validate(raw['scene'],assets)
 for a in scene['actors']:
  if a.get('jenis')!='anak':a['jenis']='tokoh';break
 out=Cfg.DATA_DIR/'choreography-candidates';out.mkdir(exist_ok=True)
 (out/(name+'.json')).write_text(json.dumps(scene,ensure_ascii=False,indent=1))
 return name,scene
if __name__=='__main__':
 names=sys.argv[1:] or list(manifest['recipes'])
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  futures={pool.submit(one,name):name for name in names}
  for f in concurrent.futures.as_completed(futures):
   try:
    name,scene=f.result()
    with (root/'manifest.lock').open('w') as lock:
     fcntl.flock(lock,fcntl.LOCK_EX)
     latest=json.loads((root/'manifest.json').read_text());latest['recipes'][name]['choreography']=scene
     tmp=root/'manifest.tmp'
     tmp.write_text(json.dumps(latest,ensure_ascii=False,indent=1)+'\n');tmp.replace(root/'manifest.json')
     fcntl.flock(lock,fcntl.LOCK_UN)
    manifest['recipes'][name]['choreography']=scene
    print('AUTHORED',name,flush=True)
   except Exception as e:print('FAILED',futures[f],str(e),flush=True)

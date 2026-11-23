"""Build the versioned, authored activity library and its reference examples."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
D=ROOT/'styles/horor_kampung'
GROUPS={
'rumah': '''menyapu_lantai|menyapu lantai|dalam_rumah|sapu|debu|sweep
mengepel_lantai|mengepel lantai|dalam_rumah|pel|ember|sweep
mencuci_piring|mencuci piring|dapur|piring|baskom|wash
mencuci_pakaian|mencuci pakaian|sungai|kain|baskom|wash
menjemur_pakaian|menjemur pakaian|teras|kain|jemuran|hang
melipat_pakaian|melipat pakaian|dalam_rumah|kain|meja|fold
menidurkan_anak|menidurkan anak|kamar|selimut|dipan|rock
membangunkan_orang|membangunkan orang tidur|kamar|tangan|dipan|wake
membuka_pintu|membuka pintu|teras|tangan|pintu|door
mengunci_pintu|mengunci pintu|teras|kunci|pintu|lock''',
'dapur': '''memotong_sayuran|memotong sayuran|dapur|pisau|talenan|chop
menumbuk_bumbu|menumbuk bumbu|dapur|alu|lesung|pound
menanak_nasi|menanak nasi|dapur|centong|panci|stir
menggoreng_makanan|menggoreng makanan|dapur|spatula|wajan|stir
merebus_air|merebus air|dapur|cerek|tungku|boil
menuang_teh|menuang teh|dapur|cerek|cangkir|pour
menyajikan_makanan|menyajikan makanan|dalam_rumah|nampan|meja|serve
makan_bersama|makan bersama|dalam_rumah|sendok|meja|eat
mencuci_beras|mencuci beras|dapur|mangkuk|baskom|wash
membuka_bungkusan|membuka bungkusan|dalam_rumah|tangan|bungkusan|unwrap''',
'pasar': '''membuka_lapak|membuka lapak|pasar|kain|kios|openstall
menutup_lapak|menutup lapak|pasar|kain|kios|closestall
menimbang_dagangan|menimbang dagangan|pasar|buah|timbangan|weigh
tawar_menawar|tawar menawar|pasar|tangan|kios|talk
membungkus_belanjaan|membungkus belanjaan|pasar|kertas|meja|fold
menyerahkan_belanjaan|menyerahkan belanjaan|pasar|bungkusan|meja|transfer
membayar_kembalian|membayar dan menerima kembalian|pasar|uang|kios|exchange
mendorong_gerobak|mendorong gerobak jualan|jalan|tangan|gerobak|push
melayani_warung_kopi|melayani warung kopi|pasar|cangkir|meja|serve
menjahit_pakaian|menjahit pakaian|dalam_rumah|kain|mesin_jahit|sew''',
'pertanian': '''mencangkul_tanah|mencangkul tanah|sawah|cangkul|tanah|dig
membajak_sawah|membajak sawah|sawah|bajak|kerbau|plow
menanam_padi|menanam padi|sawah|bibit|padi|plant
menyiangi_tanaman|menyiangi tanaman|kebun|sabit|tanaman|weed
memanen_padi|memanen padi|sawah|sabit|padi|harvest
merontokkan_padi|merontokkan padi|sawah|padi|perontok|thresh
memikul_panen|memikul hasil panen|sawah|pikulan|karung|carry
menyadap_nira|menyadap nira|kebun|pisau|pohon_nira|tap
memetik_buah|memetik buah|kebun|keranjang|pohon_buah|pick
menyiram_kebun|menyiram kebun|kebun|penyiram|tanaman|water''',
'air_ternak': '''menimba_air|menimba air|sumur|tali|sumur|well
mengangkut_ember|mengangkut ember|jalan|ember|air|carry
mencuci_sungai|mencuci di sungai|sungai|kain|batu|wash
memancing|memancing ikan|sungai|pancing|ikan|fish
menebar_jala|menebar jala|sungai|jala|ikan|net
mendayung_perahu|mendayung perahu|sungai|dayung|perahu|row
menyeberangi_titian|menyeberangi titian|sungai|tangan|titian|bridge
memberi_makan_ayam|memberi makan ayam|kampung|biji|ayam|feed
menggiring_kambing|menggiring kambing|kampung|tongkat|kambing|herd
memandikan_kerbau|memandikan kerbau|sungai|gayung|kerbau|washanimal''',
'perjalanan': '''berjalan_obor|berjalan membawa obor|jalan|obor|pepohonan|walk
berjalan_payung|berjalan dengan payung|jalan|payung|hujan|walk
berjalan_pikulan|berjalan sambil memikul barang|jalan|pikulan|karung|carry
bersepeda|bersepeda|jalan|tangan|sepeda|cycle
mengayuh_becak|mengayuh becak|jalan|tangan|becak|cycle
mengendarai_motor|mengendarai motor|jalan|tangan|motor|ride
menuntun_motor|menuntun motor mogok|jalan|tangan|motor|push
menunggu_angkutan|menunggu angkutan|jalan|tas|halte|wait
jembatan_gantung|menyeberang jembatan gantung|sungai|tangan|jembatan|bridge
tersesat_simpang|tersesat di persimpangan|jalan|lentera|penunjuk|lost''',
'warga': '''ronda_kelompok|ronda berkelompok|jalan|lentera|pepohonan|patrol
memukul_kentongan|memukul kentongan|kampung|pemukul|kentongan|strike
memperbaiki_pagar|memperbaiki pagar|kampung|palu|pagar|hammer
membelah_kayu|membelah kayu|kebun|kapak|kayu|split
menganyam_bambu|menganyam bambu|teras|bambu|anyaman|weave
kerja_bakti|kerja bakti|kampung|sapu|sampah|cleanup
berbincang_teras|berbincang di teras|teras|tangan|kursi|talk
menuntun_anak|menuntun anak|jalan|tangan|anak|lead
menolong_orang|menolong orang jatuh|jalan|tangan|orang|help
membawa_keranda|membawa keranda|jalan|tangan|keranda|coffin''',
'benda_cahaya': '''menyalakan_lampu|menyalakan lampu minyak|dalam_rumah|korek|lampu|light
meniup_lampu|meniup lampu minyak|dalam_rumah|tangan|lampu|extinguish
menyalakan_senter|menyalakan senter|jalan|senter|gelap|flashlight
mengganti_baterai|mengganti baterai senter|teras|baterai|senter|battery
menyalakan_lilin|menyalakan lilin|dalam_rumah|korek|lilin|light
mengangkat_telepon|mengangkat telepon|dalam_rumah|telepon|meja|phone
membaca_pesan|membaca pesan ponsel|teras|ponsel|kursi|read
membuka_surat|membuka surat|dalam_rumah|surat|meja|letter
memeriksa_foto|memeriksa foto lama|dalam_rumah|foto|meja|inspect
membuka_peti|membuka peti|dalam_rumah|tangan|peti|chest''',
'reaksi': '''berhenti_mendengar|berhenti mendengar suara|jalan|lentera|pepohonan|listen
menoleh_belakang|menoleh ke belakang|jalan|lentera|pepohonan|turn
mengintip_jendela|mengintip jendela|teras|tangan|jendela|peek
mengintip_pintu|mengintip celah pintu|teras|tangan|pintu|peek
bersembunyi_lemari|bersembunyi di balik lemari|dalam_rumah|tangan|lemari|hide
mencari_bawah_ranjang|mencari di bawah ranjang|kamar|senter|dipan|searchlow
menyusuri_rumah|menyusuri rumah dengan senter|dalam_rumah|senter|pintu|search
mundur_ketakutan|mundur ketakutan|jalan|tangan|gelap|retreat
tersandung_berlari|tersandung saat berlari|jalan|tangan|batu|trip
berpegangan_berlindung|berpegangan sambil berlindung|teras|tangan|orang|embrace''',
'horor': '''bayangan_jendela|bayangan melintas jendela|teras|bayangan|jendela|shadow
pintu_sendiri|pintu terbuka sendiri|dalam_rumah|angin|pintu|haunteddoor
kursi_sendiri|kursi bergeser sendiri|dalam_rumah|angin|kursi|slide
ayunan_sendiri|ayunan bergerak sendiri|kampung|angin|ayunan|swing
cermin_berbeda|pantulan cermin berbeda|kamar|bayangan|cermin|mirror
jejak_muncul|jejak kaki muncul|jalan|jejak|tanah|footprints
sosok_pohon|sosok di balik pohon|hutan|bayangan|pepohonan|reveal
pocong_melompat|pocong melompat|kuburan|pocong|makam|hop
kuntilanak_turun|kuntilanak turun dari pohon|hutan|kuntilanak|pepohonan|descend
pasar_menghilang|pasar menghilang|pasar|kabut|kios|vanish'''
}
recipes={}
for group,rows in GROUPS.items():
 for row in rows.splitlines():
  id,label,place,tool,target,action=row.split('|')
  recipes[id]=dict(label=label,category=group,location=place,tool=tool,target=target,action=action,
   era='modern' if id in ('mengendarai_motor','menuntun_motor','membaca_pesan','mengganti_baterai','menyalakan_senter','menyusuri_rumah') else 'any',
   supernatural=group=='horor',duration=[4,12],assets=list(dict.fromkeys([tool,target])),
   stages=['persiapan','aksi','kontak','penyelesaian'],
   examples=[f'Di {place.replace("_"," ")}, ia {label}.',f'Ia mulai {label}, lalu berhenti ketika mendengar suara dari luar.'],
   avoid=f'Jangan gunakan {id} bila aksi {label} tidak terjadi atau hanya dilarang/dibayangkan.')
assert len(recipes)==100
previous=json.loads((D/'catalog.json').read_text())
old=dict(previous)
old={k:v for k,v in old.items() if k not in recipes}
assert len(old)==20
params={
 'tokoh':dict(type='enum',values=['pria','bapak','wanita','gadis','anak','nenek','kakek'],default='pria'),
 'waktu':dict(type='enum',values=['malam','senja','subuh'],default='malam'),
 'aksi_mulai_cue':dict(type='cue',default=None,desc='Cue mulai aktivitas; kata pemicu dari naskah menentukan waktu jika tersedia.'),
 'aksi_selesai_cue':dict(type='cue',default=None,desc='Cue terakhir aktivitas, selesai pada akhir ucapan.'),
 'pemicu':dict(type='str',default='',desc='Kata pemicu aksi dalam audio.'),
 'hadap':dict(type='enum',values=['kanan','kiri'],default='kanan'),
 'era':dict(type='enum',values=['tradisional','modern'],default='tradisional'),
}
for id,r in recipes.items():
 old[id]=dict(desc=f"{r['label'].upper()}. Latar {r['location']}; {r['tool']} berinteraksi dengan {r['target']}. Tahap persiapan, aksi, kontak dan penyelesaian tampak. {r['avoid']}",params=previous.get(id,{}).get("params",params),metadata=r)
(D/'catalog.json').write_text(json.dumps(old,ensure_ascii=False,indent=1)+'\n')
existing_manifest=json.loads((D/'library/manifest.json').read_text()) if (D/'library/manifest.json').exists() else {}
for key, recipe in recipes.items():
 previous_recipe=existing_manifest.get('recipes',{}).get(key,{})
 if previous_recipe.get('choreography') and all(previous_recipe.get(k)==recipe.get(k) for k in ('action','tool','target','location')):
  recipe['choreography']=previous_recipe['choreography']
manifest=dict(version='2.0.0',schema_version=2,style='horor_kampung',recipes=recipes)
(D/'library/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=1)+'\n')
refs=[]
for id,r in old.items():
 meta=r.get('metadata',{});label=meta.get('label',id.replace('_',' '));ex=meta.get('examples',[f'Ia {label}.',f'Di kampung, terlihat {label}.'])
 for j,t in enumerate(ex):
  refs.append(dict(id=f'{id}-{j+1}',template=id,text=t,cues=[dict(i=0,start=0,end=6,text=t)],plan=dict(judul=label[:40],adegan=[dict(dari=0,sampai=0,template=id,params={},kamera=dict(gerak='diam'))],peran=[]),purpose='Aksi dan perubahan objek harus terbaca dengan kamera diam.',status='authored_pending_visual_review'))
 refs.append(dict(id=id+'-negative',template=id,text=f'Tidak ada kegiatan {label} di tempat itu.',negative=True,reason='Penyebutan negatif bukan kejadian; pilih adegan sesuai yang benar-benar terlihat.'))
(D/'library/references.json').write_text(json.dumps(refs,ensure_ascii=False,indent=1)+'\n')
print('Built',len(old),'templates;',len(refs),'references')
if __name__=='__main__': pass

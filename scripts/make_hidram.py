"""Bangun diorama dan storyboard dari cue kata Whisper untuk pompa hidram."""
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from studio import director, render
D = ROOT / 'data/jobs/hidram'
source = json.loads((D/'cues.json').read_text())
cues, duration = source['cues'], source['duration']
def word(i, key):
    for w,t in zip(cues[i]['text'].split(), cues[i]['wt']):
        if w.lower().strip('.,!?') == key.lower(): return t
    raise ValueError((i,key))
def changes(key, initial, *steps):
    keys=[[0, initial]]
    for i,w,delta,v in steps:
        t=word(i,w)
        keys.extend([[t,keys[-1][1]],[t+delta,v]])
    return keys

tl=dict(accel=word(19,'alirannya'),reveal=word(8,'mendorong'),repeat=word(40,'berulang-ulang'),
        cut=changes('cut',0,(16,'pipa',2.8,1)),
        shut=changes('shut',0,(21,'menutup',.16,1),(35,'terbuka',.31,0),(37,'menutup',.18,1)),
        pressure=changes('pressure',.09,(19,'cepat',.6,.2),(21,'menutup',.2,.97),(30,'melewati',2.3,.54),(34,'menurun',.85,.08),(38,'meningkat',.46,.95)),
        check=changes('check',0,(27,'membuka',.42,1),(30,'melewati',1.1,0),(38,'meningkat',.32,1)),
        fill=changes('fill',.15,(28,'masuk',2.2,.65),(29,'tertekan',.48,.89),(30,'melewati',2.8,.41),(39,'terdorong',.54,.8)))

# target x,y,z • distance • azimuth • elevation. Every view uses a Hermite move.
views={
 'desa':(11.9,9.1,-1,18,-26,18),'sumber':(-12.7,3,-.6,14,25,30),'lembah':(.5,3.6,0,88,-16,22),
 'pekerja':(-3.35,1.12,.65,7,15,8),'bahu':(-2.9,1.3,1,8,-36,20),'ember':(-3.5,1,.65,6.8,-24,21),
 'pompa':(-.35,1.9,1.5,13,14,13),'poros':(-.65,1.75,1.5,9.4,-20,8),
 'jalur':(5,5.2,1.35,31,-24,19),'masuk':(-7.2,2.2,1.35,23,30,14),'buang':(-.92,1.78,1.6,5.1,-16,13),
 'pipa':(-1.47,1.24,1.5,6.4,16,9),'meter':(-.02,2.02,1.6,3.6,3,6),'katup':(1.39,1.63,1.49,4.8,-17,7),
 'tabung':(1.4,2.83,1.49,6.9,12,6),'bak':(10.2,9.03,.66,6.6,-32,17),'limpas':(-.85,1,2.22,9.3,16,24),
 'atas':(-.25,1.4,1.5,12,7,73),'panorama':(.1,4.1,-.2,91,14,15),'naik':(6.8,6.5,1.4,22,-16,14),
 'tanah':(-.4,1.65,1.5,14,-11,3),'teras':(11.45,8.8,.3,11,-23,13)}
# cue, header, camera, ending view (continuous moves only), chapter
shots=[
(0,'Air Bisa Naik Tanpa Listrik?','desa','desa'),(1,'Sumber di lembah','sumber','sumber'),(2,'Dari lembah ke rumah','lembah','lembah'),
(3,'Desa tanpa listrik','pekerja','pekerja'),(5,'Pompa tanpa bahan bakar','bahu','bahu'),(6,'Setiap hari naik bukit?','ember','ember'),
(7,'Ada jalan lain','tanah','pompa'),(9,'Tanpa sambungan listrik','jalur','jalur'),(10,'Selama air terus mengalir','sumber','masuk'),
(11,'Dari mana tenaganya?','bahu','bahu'),(13,'Tenaga dari air','masuk','masuk'),(14,'Kenali pompa hidram','pompa','pompa'),
(15,'Sumber lebih tinggi','lembah','lembah'),(16,'Air meluncur turun','masuk','poros'),(17,'Katup buang terbuka','buang','buang'),
(18,'Air keluar dahulu','limpas','limpas'),(19,'Aliran makin cepat','pipa','pipa'),(20,'Katup segera menutup','poros','buang'),
(22,'Aliran mendadak tertahan','pipa','pipa'),(23,'Tekanan dalam pipa','atas','atas'),(24,'Lonjakan tekanan','meter','meter'),
(25,'Water hammer','poros','poros'),(27,'Katup hantar terbuka','katup','katup'),(28,'Tabung berisi udara','tabung','tabung'),
(30,'Udara mendorong air','jalur','naik'),(31,'Air sampai di atas','bak','bak'),(33,'Bagaimana siklus berulang?','atas','atas'),
(34,'Tekanan mulai turun','meter','meter'),(35,'Katup buang terbuka lagi','buang','buang'),(36,'Aliran mulai lagi','masuk','masuk'),
(37,'Denyut berikutnya','poros','poros'),(39,'Sebagian air naik','tabung','tabung'),(40,'Siklus otomatis','pompa','pompa'),
(41,'Ke mana air pergi?','atas','atas'),(42,'Dua jalur keluar','jalur','jalur'),(43,'Sebagian besar terbuang','limpas','limpas'),
(44,'Energi untuk mengangkat air','lembah','lembah'),(45,'Tanpa motor listrik','tanah','tanah'),(47,'Tanpa tangki bensin','poros','poros'),
(49,'Air sampai ke desa','teras','teras'),(51,'Ikuti pipanya','naik','naik'),(52,'Dari air ke air','sumber','masuk'),
(54,'Melawan gravitasi','panorama','panorama')]
# One explanatory visual for each spoken line. Select either a diagram, a physical anchor, or a gauge.
beats=[
('desa','rumah','Desa di puncak'),('sumber','air','Mata air'),('rumah','angkat','Tujuan di atas'),('Masalahnya','tanya','Bagaimana caranya?'),
('listrik','listrik','Listrik tidak tersedia'),('mesin','bensin','Pompa bermotor'),('ember','ember','Angkut per ember'),
('anehnya','tanya','Ada cara lain'),('mendorong','angkat','Air terdorong naik'),('listrik','listrik','Tanpa listrik'),
('terus-menerus','arus','Pasokan berkelanjutan'),('tenaga','tanya','Sumber tenaga'),('Ternyata','turun','Beda tinggi'),
('air','arus','Energi aliran'),('hidram','pompa','Pompa hidram'),('Pertama','turun','Jalur masuk'),
('tinggi','turun','Dari sumber ke pompa'),('katup','buang','Katup buang'),('keluar','limpas','Air keluar'),
('cepat','cepat','Aliran dipercepat'),('tiba-tiba','buang','Sesaat sebelum rapat'),('menutup','tutup','Katup buang rapat'),
('tertahan','stop','Aliran tertahan'),('menariknya','meter','Perhatikan manometer'),('lonjakan','tekanan','Tekanan melonjak'),
('water','gelombang','Water hammer'),('pukulan','gelombang','Gelombang di pipa'),('membuka','katup','Katup hantar terangkat'),
('ruang','tabung','Ruang udara'),('tertekan','kompresi','Udara termampatkan'),('melewati','angkat','Pipa hantar'),
('tunggu','tanya','Sesudah air naik'),('atas','bak','Air masuk bak'),('terus','siklus','Pemulihan siklus'),
('menurun','rendah','Tekanan turun'),('terbuka','buang','Katup kembali turun'),('mengalir','arus','Aliran pulih'),
('menutup','tutup','Katup menutup lagi'),('meningkat','tekanan','Denyut tekanan'),('terdorong','angkat','Dorongan berikutnya'),
('otomatis','siklus','Siklus berulang'),('tahu','cabang','Ikuti dua jalur'),('semua','cabang','Hanya sebagian naik'),
('pembuangan','limpas','Aliran buang'),('energi','energi','Air turun mengangkat air'),('menarik','pompa','Penggerak hidraulis'),
('listrik','listrik','Tanpa motor listrik'),('bensin','bensin','Tanpa bensin'),('diputar','rotor','Tanpa poros putar'),
('Jadi','rumah','Kembali ke desa'),('rumah','bak','Air tiba di rumah'),('tersembunyi','listrik','Telusuri pipa hantar'),
('jadi','turun','Mulai dari sumber'),('tenaganya','energi','Energi air jatuh'),('gravitasi','angkat','Air naik ke desa')]
ACTIONS=['Rumah beratap merah dan bak penampung tampak di teras atas. Seorang warga berjalan di depan rumah.', 'Riak pada kolam sumber menandai titik awal. Pipa mengambil air dari tepi kolam.', 'Tampak lebar memperlihatkan tiga elevasi sekaligus. Rumah lebih tinggi daripada mata air, sedangkan pompa berada di dasar lembah.', 'Pekerja berhelm kuning mengamati instalasi. Ikon steker dicoret ketika narator menyebut listrik.', 'Kamera mendekati sisi pekerja dan jalur masuk. Piktogram bahan bakar mengiringi pertanyaan tentang pompa bermotor.', 'Sorotan menghubungkan kata “ember” ke ember logam di tangan pekerja.', 'Kamera mengitari dudukan pompa. Penanda bergerak dari lembah ke rumah ketika air mulai dikirim.', 'Pipa hantar mendaki lereng hingga bak. Ikon steker dicoret mengiringi kata “listrik”.', 'Gerak kamera mengikuti air dari kolam ke lereng pipa penggerak. Rangkaian penanda arus terus bergerak.', 'Pekerja dan alat terlihat dari dekat. Ikon tanya berganti menjadi diagram beda tinggi.', 'Titik-titik aliran mengikuti pipa yang menurun ke pompa.', 'Nama alat muncul di dekat badan pompa. Katup, manometer, dan tabung udara tampak bersama.', 'Bidang potong tanah menunjukkan posisi sumber di atas pompa.', 'Kamera menyusuri pipa dari hulu. Selubung depan turun perlahan untuk memperlihatkan lintasan air.', 'Katup buang berada di bawah dudukannya. Celah di atas cakram membuka jalur buang.', 'Tetes air melewati celah katup, melengkung lalu jatuh menuju saluran terbuka.', 'Penanda aliran bergerak lebih cepat di pipa penggerak.', 'Kamera mengarah ke katup buang. Cakram naik merapat ke dudukan dan semburan berhenti.', 'Penanda arus di dekat katup berhenti. Cincin tekanan merambat kembali di sepanjang pipa.', 'Tampak atas menempatkan katup buang, pengukur, dan ruang hantar dalam satu rangkaian.', 'Jarum manometer dan indikator di kanan memperlihatkan keadaan tekanan tinggi setelah penutupan.', 'Gelombang tekanan terlihat di jalur masuk. Istilah “water hammer” disusul sebutan “pukulan air”.', 'Cakram katup hantar naik. Celah baru menghubungkan pipa penggerak dengan sisi hantar.', 'Permukaan air naik dalam tabung transparan. Ruang yang ditempati udara mengecil.', 'Pipa keluar mengikuti lereng naik. Pergerakan air memperlihatkan arah dari pompa menuju rumah.', 'Tampak dekat ujung pipa di atas bak. Air dari pipa jatuh ke penampung.', 'Kamera dari atas memperlihatkan posisi kedua katup sebelum siklus pulih.', 'Jarum berputar kembali ke wilayah tekanan rendah.', 'Cakram katup buang turun dari dudukan. Air mulai keluar lagi.', 'Kamera kembali mengikuti aliran sumber sepanjang pipa penggerak.', 'Katup buang menutup untuk kedua kalinya. Jarum dan gelombang menunjukkan kenaikan tekanan.', 'Tabung menerima tambahan air untuk denyut berikutnya.', 'Tampak seluruh pompa menunjukkan katup buang, katup hantar, permukaan air, dan jarum bergerak bersiklus.', 'Tampak atas memperlihatkan dua kemungkinan jalan keluar dari rangkaian.', 'Kamera mengikuti jalur kirim ke arah rumah. Diagram percabangan menandai pembagian aliran.', 'Kamera beralih ke saluran bawah. Butiran yang keluar dari katup buang jatuh ke saluran.', 'Tampak seluruh lereng menghubungkan penurunan dari sumber dengan pengangkatan ke rumah.', 'Tampak rendah memperlihatkan instalasi tetap berdenyut. Ikon menjelaskan motor listrik tidak diperlukan.', 'Detail katup dan pengukur mengiringi piktogram bensin serta poros putar.', 'Bak dan rumah berada dalam satu gambar. Warga berjalan di dekat tujuan air.', 'Kamera menelusuri bentangan pipa hantar di lereng.', 'Kamera kembali ke hulu dan meluncur menuju pompa untuk merangkum sumber energinya.', 'Tampak penutup menyatukan air turun dan air naik dalam satu diorama lalu memudar ke putih.']

def build():
    cams={};scenes=[]; board=['# Air Bisa Naik Tanpa Listrik?','','| Shot | Waktu (detik) | Judul layar | Kamera | Aksi dan titik perhatian |','|---:|---|---|---|---|']
    for j,(i,title,a,b) in enumerate(shots):
        endi=shots[j+1][0] if j+1<len(shots) else len(cues)
        st=0 if not j else cues[i]['wt'][0]
        en=cues[endi]['wt'][0] if endi<len(cues) else duration
        name=f'{j+1:02d}-{a}'
        v=list(views[a]);u=list(views[b])
        v[3]*=1.07;v[4]-=3;u[3]*=.97;u[4]+=4
        cams[name]=[[st,*v,41],[en,*u,41]]
        moments=[]
        for k in range(i,endi):
            w,symbol,txt=beats[k]
            moments.append(dict(t0=word(k,w),t1=(cues[k+1]['wt'][0] if k+1<len(cues) else duration)-.04,symbol=symbol,text=txt))
        chapter='TANTANGAN' if i<7 else 'PENEMUAN' if i<15 else 'MEKANISME' if i<31 else 'SIKLUS' if i<41 else 'NERACA AIR' if i<45 else 'KESIMPULAN'
        p=dict(label=chapter,judul=title,sorot=title.split()[-1],cam=name,focus=v[:3],moments=moments)
        scenes.append(dict(start=st,end=en,template='hidram',params=p,camera={'gerak':'tetap'},sambung=False,transisi=.45))
        board.append(f"| {j+1} | {st:.2f}–{en:.2f} | {title} | {a} → {b}, azimut {v[4]}° ke {u[4]}° | "+' · '.join(f"{m['t0']:.2f} s — {m['text']}" for m in moments)+' |')
    # A single spline bridges consecutive phases when both point to the same mechanism.
    for left,right in [(3,4),(14,15),(22,23),(37,38)]:
        l,r=scenes[left],scenes[right]
        lname,rname=l['params']['cam'],r['params']['cam']
        first,mid=cams[lname]
        last=cams[rname][-1]
        cams[lname]=[first,mid,last]
        r['params']['cam']=lname
        r['sambung']=True
    rp=dict(cues=cues,duration=duration,style='edukasi_3d',seed=721,scenes=scenes,tl=tl,cams=cams,fps=60)
    (D/'render_plan.json').write_text(json.dumps(rp,indent=1,ensure_ascii=False))
    # Write the camera that actually renders, including the spline bridges.
    descriptions={'desa':'Sedang · permukiman', 'sumber':'Tinggi · mata air','lembah':'Aerial · tiga elevasi','pekerja':'Sedang · pekerja','bahu':'Tiga perempat · pekerja','ember':'Detail · ember','pompa':'Lebar · seluruh pompa','poros':'Sedang · mekanisme','jalur':'Lebar · lereng','masuk':'Tracking · pipa penggerak','buang':'Detail · katup buang','pipa':'Detail · pipa penggerak','meter':'Makro · manometer','katup':'Makro · katup hantar','tabung':'Detail · tabung udara','bak':'Detail · bak desa','limpas':'Sedang · aliran buang','atas':'Tampak atas · pompa','panorama':'Aerial · sistem lengkap','naik':'Tracking · pipa hantar','tanah':'Sudut rendah · pompa','teras':'Sedang · teras rumah'}
    board=['# Air Bisa Naik Tanpa Listrik?', '', 'Animasi edukasi 3D vertikal · 1080 × 1920 · 60 fps · narasi Indonesia.', '', 'Latar revisi menghubungkan permukiman dan jalan dusun di bukit, kebun sayur di belakang pompa, serta sungai irigasi berkelok, jembatan kayu, dan sawah di lembah.', '', '| Shot | Waktu (detik) | Judul layar | Kamera | Aksi dan momen visual |','|---:|---|---|---|---|']
    for j,(scene,shot) in enumerate(zip(scenes,shots)):
        i,title,a,b=shot
        camera=descriptions[a]+(' → '+descriptions[b] if a!=b else '')
        if scene['sambung']: camera='Gerak kontinu → '+descriptions[b]
        events=' · '.join(f"{m['t0']:.2f} s — {m['text']}" for m in scene['params']['moments'])
        board.append(f"| {j+1} | {scene['start']:.2f}–{scene['end']:.2f} | {title} | {camera} | {ACTIONS[j]} {events}. |")
    (ROOT/'Hasil Produksi/Edukasi/Pompa Hidram/Dokumen/storyboard_pompa_hidram_desa.md').write_text('\n'.join(board)+f'\n\n{len(shots)} shot, {len(beats)} momen narasi.\n')
    render.build_page(rp,D/'page.html',director.load_style('edukasi_3d'))
    return rp
if __name__=='__main__':
    build()
    mode=sys.argv[1] if len(sys.argv)>1 else 'plan'
    if mode=='stills':
        subprocess.run([sys.executable, D/'capture.py','stills'],check=True)
    elif mode=='full':
        def segment(idx):
            subprocess.run([sys.executable,D/'capture.py','full',str(idx),'4'],check=True)
        with ThreadPoolExecutor(4) as pool:
            list(pool.map(segment,range(4)))
        subprocess.run([sys.executable,D/'finish.py'],check=True)
        subprocess.run([sys.executable,ROOT/'scripts/cek_halus.py',ROOT/'Hasil Produksi/Edukasi/Pompa Hidram/Video/air_bisa_naik_tanpa_listrik_desa_60fps.mp4',D/'render_plan.json'],check=True)
    elif mode!='plan':
        raise SystemExit('Gunakan plan, stills, atau full.')

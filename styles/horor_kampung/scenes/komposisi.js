/* 'komposisi': adegan bebas yang dirakit AI dari latar + aktor + properti + elemen kustom (SVG path).
 * Semua elemen dirender dengan perlakuan gaya yang sama (tinta siluet, cahaya hangat/dingin, kabut, debu).
 */
(function () {
  const { H } = ENG; const { att, ramp, nz, cl, lerp } = H;
  const INK = '#050304';
  // x 0-100 -> area yang terlihat di layar penuh 9:16 (tepi dunia 1080 terpotong ~146px kiri-kanan)
  const X = v => 165 + cl(+v, 0, 100) / 100 * 750;
  // Area aksi berhenti sebelum gradien/subtitle bawah, termasuk tokoh berbaring.
  const Y = v => Math.min(1030, cl(+v, 0, 100) * 14);
  const esc = v => String(v || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  function handTransform(c, q, x, y) {
    const hand = c.el('a' + Math.round(+q.aktor) + (q.tangan === 'kiri' ? '_fL' : '_fR'));
    const cam = document.getElementById('cam_' + c.i);
    if (!hand || !cam || !hand.getCTM() || !cam.getCTM()) return 'translate(0,0)';
    const m = cam.getCTM().inverse().multiply(hand.getCTM());
    return `translate(${(m.c * 54 + m.e - x).toFixed(3)},${(m.d * 54 + m.f - y + 35).toFixed(3)})`;
  }
  const RIM = { lentera: '#ffb066', api: '#ff9a4a', lampu_rumah: '#ffc27a', bulan: '#a9c2ff' };

  /* ---------- set dekor: latar desa yang hidup (rumah, tiang, pagar, jalan bertekstur, isi ruangan) ---------- */
  const D2R = Math.PI / 180;
  // panjang langkah rig (px per siklus 2π) -> fase kaki dihitung dari jarak tempuh, telapak tidak meluncur
  const STRIDE = s => 4 * 144 * Math.sin(28 * D2R) * s;
  function winLit(c, pre, n, on) { for (let i = 0; i < n; i++) if (on[i % on.length]) (c.wins = c.wins || []).push(pre + 'r' + i, pre + 'g' + i); }
  function rumahDekor(c, key, x, y, w, ink, lit, o = {}) {
    const pre = c.id(key); winLit(c, pre, o.n || 2, lit);
    return H.house(x, y, w, { ink, pre, n: o.n || 2, busts: false, teras: o.teras !== false, pintu: o.pintu !== false, dapur: !!o.dapur });
  }
  function bohlam(c, key, x, y, k = 1) {
    (c.bulbs = c.bulbs || []).push(c.id(key));
    return `<ellipse id="${c.id(key)}" cx="${x}" cy="${y}" rx="${150 * k}" ry="${130 * k}" fill="url(#gWarm)" opacity=".55"/><path d="M${x - 9 * k} ${y - 8 * k} L${x + 9 * k} ${y - 8 * k} L${x + 5 * k} ${y - 16 * k} L${x - 5 * k} ${y - 16 * k}Z" fill="#050304"/><circle cx="${x}" cy="${y}" r="${6 * k}" fill="#ffe2a8"/>`;
  }
  function jalanBg(c, w) {
    const far = H.inkFar(w), R = H.rng(c.seed + 5), hz = 760, mid = H.lift(far, -4), near = '#040406';
    H.lg(c.id('rd'), [[0, w === 'subuh' ? '#454a4c' : w === 'senja' ? '#3a2016' : '#272a33'], [.45, w === 'subuh' ? '#2b2e2e' : '#16161a'], [1, '#0d0b0a']]);
    H.lg(c.id('gd'), [[0, H.lift(far, 2)], [1, '#050506']]);
    let s = H.sky(c, w, [800, 290, 50]);
    let tl = `M0 ${hz + 10}`; for (let x = 0; x <= 1080; x += 24) tl += ` L${x} ${(hz - 24 - R() * 40 - (Math.sin(x / 90) > .4 ? 50 + R() * 30 : 0)).toFixed(0)}`;
    s += `<path d="${tl} L1080 ${hz + 10}Z" fill="${far}"/>`;
    s += rumahDekor(c, 'hf1', 330, hz + 4, 110, H.lift(far, -1), [1, 0], { teras: false, pintu: false }) + rumahDekor(c, 'hf2', 760, hz + 6, 130, H.lift(far, -1), [0, 1], { teras: false, pintu: false });
    s += `<rect y="${hz}" width="1080" height="${1400 - hz}" fill="url(#${c.id('gd')})"/>`;
    s += `<polygon points="478,${hz} 602,${hz} 1380,1400 -300,1400" fill="url(#${c.id('rd')})"/>`;
    // bekas roda & tepi jalan berumput
    s += `<polygon points="520,${hz} 526,${hz} 270,1400 200,1400" fill="#000" opacity=".28"/><polygon points="556,${hz} 562,${hz} 890,1400 820,1400" fill="#000" opacity=".28"/>`;
    for (let i = 0; i < 70; i++) { const t = R(), y = hz + t * t * 640, half = 62 + (y - hz) * 1.21, x = 540 + (R() - .5) * 2 * half * .95, r = (1 + t * 6) * (0.6 + R()); s += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(r * 1.6).toFixed(1)}" ry="${r.toFixed(1)}" fill="${R() < .5 ? '#000' : '#3a3a40'}" opacity="${(.25 + R() * .3).toFixed(2)}"/>`; }
    if (w !== 'subuh') [[600, 1010, 60], [380, 1170, 90], [720, 1290, 120]].forEach(([x, y, r]) => s += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .22}" fill="#3c4a66" opacity=".55"/><ellipse cx="${x + r * .2}" cy="${y}" rx="${r * .3}" ry="${r * .05}" fill="#c9d6ee" opacity=".4"/>`);
    for (const side of [-1, 1]) for (let i = 0; i < 26; i++) { const t = i / 26, y = hz + 20 + t * t * 620, ex = 540 + side * (62 + (y - hz) * 1.21); s += `<path d="M${ex} ${y} q${side * 4} ${-8 - t * 30} ${side * (6 + t * 14)} ${-14 - t * 40} M${ex + side * 8} ${y} q0 ${-10 - t * 26} ${side * -6} ${-12 - t * 34}" stroke="${near}" stroke-width="${1.5 + t * 3}" fill="none"/>`; }
    // rumah kiri-kanan, pagar bambu, tiang listrik + kabel, pisang
    s += rumahDekor(c, 'hl', 120, 905, 270, mid, [1, 0], { dapur: true }) + rumahDekor(c, 'hr', 965, 915, 280, mid, [0, 1]);
    s += H.pagarBambu(-10, 960, 300, mid) + H.pagarBambu(800, 975, 290, mid);
    s += H.tiangListrik(700, 860, 300, mid) + H.tiangListrik(880, 1010, 520, near) + bohlam(c, 'bl', 860, 520, .9);
    s += `<path d="M700 568 Q600 560 520 ${hz - 40} M880 498 Q780 520 700 568 M880 498 Q980 470 1100 455" stroke="${near}" stroke-width="2" fill="none"/>`;
    s += `<g id="${c.id('ps1')}">${H.banana(300, 900, 140, mid, 4)}</g><g id="${c.id('ps2')}">${H.banana(-10, 1120, 230, near, 6)}</g>`;
    s += H.palm(1060, 1160, 560, near, -14, 3);
    s += H.semak(260, 975, 1.1, mid, 2) + H.semak(830, 990, 1.0, mid, 3) + H.batu(860, 1200, 1.2, near) + H.batu(150, 1260, 1.6, near);
    c.sway = [c.id('ps1'), c.id('ps2')];
    return s;
  }
  function kampungBg(c, w) {
    const far = H.inkFar(w), mid = H.lift(far, -4), near = '#040406', R = H.rng(c.seed + 9);
    H.lg(c.id('gd'), [[0, H.lift(far, 3)], [1, '#060506']]);
    let s = H.sky(c, w, [760, 330, 70]) + `<path d="M0 930 Q220 870 430 915 T830 905 T1080 895 L1080 1400 L0 1400Z" fill="${far}"/>`;
    s += rumahDekor(c, 'k1', 130, 945, 170, H.lift(far, -1), [1, 0], { teras: false }) + rumahDekor(c, 'k2', 560, 930, 150, H.lift(far, -1), [0, 1], { teras: false, pintu: false });
    s += H.palm(40, 965, 320, far, -16, 1) + H.palm(1040, 955, 360, far, 18, 2) + H.tree(760, 940, 420, 50, far, 5, { daun: true });
    s += `<rect y="1000" width="1080" height="400" fill="url(#${c.id('gd')})"/>`;
    s += `<path d="M380 1000 Q520 1010 700 1000 L980 1400 L60 1400Z" fill="${w === 'subuh' ? '#3a3c3a' : w === 'senja' ? '#2e1a12' : '#1d1e24'}" opacity=".85"/>`;
    for (let i = 0; i < 40; i++) { const t = R(), y = 1004 + t * 390, x = 220 + R() * 640; s += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(2 + t * 9).toFixed(1)}" ry="${(1 + t * 4).toFixed(1)}" fill="#000" opacity=".35"/>`; }
    s += H.pagarBambu(-20, 1000, 330, mid) + H.pagarBambu(760, 1002, 340, mid) + H.tiangListrik(930, 1000, 460, mid) + bohlam(c, 'bl', 915, 560, .8);
    s += `<g id="${c.id('ps1')}">${H.banana(880, 985, 150, H.lift(far, -3), 3)}</g><g id="${c.id('ps2')}">${H.banana(20, 1180, 220, near, 7)}</g>`;
    s += H.semak(280, 1004, 1, mid, 4) + H.kandangAyam(830, 1010, 110, mid) + H.ayam(760, 1060, .5, near, true);
    c.sway = [c.id('ps1'), c.id('ps2')];
    return s;
  }
  function terasBg(c, w) {
    const far = H.inkFar(w), R = H.rng(c.seed + 3);
    H.lg(c.id('fl'), [[0, '#2a1b11'], [1, '#0c0806']]);
    let s = H.sky(c, w, [220, 300, 50]) + `<path d="M0 900 Q300 860 600 890 T1080 870 L1080 1000 L0 1000Z" fill="${far}"/>` + H.palm(120, 905, 360, far, 14, 1) + H.palm(960, 900, 400, far, -16, 2);
    s += rumahDekor(c, 'tj', 560, 905, 170, H.lift(far, -1), [1, 1], { teras: false, pintu: false });
    s += `<rect x="0" y="0" width="1080" height="230" fill="#060403"/><rect x="0" y="222" width="1080" height="14" fill="#0b0705"/>`;
    for (let i = 0; i < 14; i++) s += `<rect x="${i * 80}" y="150" width="10" height="80" fill="#0b0705"/>`;
    s += `<rect x="40" y="230" width="22" height="770" fill="#050302"/><rect x="1018" y="230" width="22" height="770" fill="#050302"/><rect x="0" y="880" width="1080" height="8" fill="#050302"/>`;
    for (let i = 0; i < 30; i++) s += `<rect x="${i * 36}" y="888" width="4" height="112" fill="#050302"/>`;
    // lantai papan teras dengan perspektif
    s += `<rect y="1000" width="1080" height="400" fill="url(#${c.id('fl')})"/>`;
    for (let i = -8; i <= 8; i++) s += `<line x1="${540 + i * 70}" y1="1000" x2="${540 + i * 150}" y2="1400" stroke="#050302" stroke-width="3" opacity=".7"/>`;
    for (let i = 1; i < 6; i++) s += `<line x1="0" y1="${1000 + i * i * 14}" x2="1080" y2="${1000 + i * i * 14}" stroke="#050302" stroke-width="1.5" opacity=".35"/>`;
    // lampu gantung berayun, bale-bale, pot tanaman, sandal di anak tangga
    s += `<g id="${c.id('lamp')}"><line x1="540" y1="236" x2="540" y2="330" stroke="#050302" stroke-width="3"/>${bohlam(c, 'bl', 540, 340, 1.1)}</g>`;
    s += `<rect x="70" y="930" width="230" height="16" fill="#060403"/><rect x="80" y="946" width="10" height="56" fill="#060403"/><rect x="280" y="946" width="10" height="56" fill="#060403"/><rect x="70" y="860" width="12" height="80" fill="#060403"/>`;
    s += `<path d="M930 1000 L950 950 L1010 950 L1030 1000Z" fill="#060403"/>` + H.semak(980, 950, .9, '#060403', 5);
    s += `<path d="M640 1300 l40 0 l4 14 l-48 0Z M700 1306 l40 0 l4 14 l-48 0Z" fill="#050302"/>`;
    c.swingLamp = c.id('lamp');
    return s;
  }
  function dalamBg(c, p) {
    const gudang = p.ruang === 'gudang', R = H.rng(c.seed + 1), ink = '#050302';
    H.lg(c.id('wl'), [[0, '#1c120b'], [1, '#0b0705']]); H.lg(c.id('fl'), [[0, '#2a1c12'], [1, '#0e0906']]);
    let s = `<rect width="1080" height="1400" fill="url(#${c.id('wl')})"/>`;
    for (let i = 0; i < 12; i++) s += `<rect x="${i * 95}" y="0" width="5" height="1000" fill="#030201" opacity=".55"/><rect x="${i * 95 + 30 + R() * 30}" y="${220 + R() * 600}" width="2" height="${40 + R() * 90}" fill="#2a1b10" opacity=".5"/>`;
    // plafon: kasau miring + balok
    s += `<rect x="0" y="0" width="1080" height="200" fill="#060403"/><rect x="0" y="190" width="1080" height="18" fill="#030201"/>`;
    for (let i = 0; i < 9; i++) s += `<path d="M${i * 135 - 20} 0 L${i * 135 + 10} 0 L${540 + (i - 4) * 40} 190 L${540 + (i - 4) * 40 - 14} 190Z" fill="#0d0805"/>`;
    s += `<rect x="0" y="520" width="1080" height="14" fill="#080503" opacity=".9"/>`;
    // jendela bulan
    s += `<rect x="70" y="330" width="210" height="300" fill="#16253f"/><rect x="70" y="330" width="210" height="300" fill="url(#gMoon)" opacity=".3"/><rect x="166" y="330" width="12" height="300" fill="${ink}"/><rect x="70" y="474" width="210" height="12" fill="${ink}"/><rect x="60" y="322" width="230" height="12" fill="${ink}"/><rect x="60" y="626" width="230" height="12" fill="${ink}"/>`;
    s += `<polygon points="70,630 280,630 430,1160 160,1160" fill="#7f9fd0" opacity=".07"/>`;
    // sarang laba-laba di sudut
    s += `<path d="M1080 208 Q1020 230 1000 290 M1080 208 Q1040 260 1050 320 M1080 240 Q1040 250 1030 280 M1080 270 Q1050 280 1045 300" stroke="#3a2a1c" stroke-width="1.2" fill="none" opacity=".6"/>`;
    // rak dinding + toples/kendi
    s += `<rect x="690" y="560" width="300" height="10" fill="${ink}"/><path d="M700 570 l20 26 M970 570 l-20 26" stroke="${ink}" stroke-width="6"/>`;
    s += `<path d="M715 560 q-4 -40 14 -46 q-6 -10 6 -12 q12 2 6 12 q18 6 14 46Z M790 560 v-50 h34 v50Z M850 560 v-30 q16 -10 32 0 v30Z M920 560 l6 -60 h10 l6 60Z" fill="${ink}"/>`;
    if (gudang) {
      // perkakas: cangkul, ember, karung, tumpukan tikar
      s += `<path d="M960 1000 L1010 640 L1018 642 L970 1000Z M990 648 l46 -10 l4 24 l-46 10Z" fill="${ink}"/><path d="M880 1000 l-8 -60 h70 l-8 60Z M876 944 q36 -26 72 0" fill="${ink}" stroke="${ink}" stroke-width="3"/>`;
      s += `<path d="M760 1000 q-30 -10 -20 -80 q30 -30 70 -10 q20 50 0 90Z" fill="#0a0604"/><path d="M30 1000 v-140 q30 -10 60 0 v140Z M90 1000 v-120 q24 -8 48 0 v120Z" fill="#0a0604"/>`;
    } else {
      // kamar: gantungan sarung, kalender, tikar
      s += `<circle cx="440" cy="560" r="4" fill="${ink}"/><path d="M425 560 l15 -4 l15 4 l6 130 q-21 10 -42 0Z" fill="#0d0805"/><path d="M430 590 h30 M428 620 h34 M427 650 h36" stroke="#1d130b" stroke-width="3"/>`;
      s += `<rect x="600" y="300" width="70" height="90" fill="#1a1209"/><rect x="600" y="300" width="70" height="20" fill="#3a1a12"/><path d="M610 335 h50 M610 350 h50 M610 365 h50" stroke="#0b0705" stroke-width="2"/>`;
    }
    // lantai dengan papan berperspektif + plint
    s += `<rect y="1000" width="1080" height="400" fill="url(#${c.id('fl')})"/><rect y="990" width="1080" height="12" fill="#030201"/>`;
    for (let i = -9; i <= 9; i++) s += `<line x1="${540 + i * 62}" y1="1002" x2="${540 + i * 140}" y2="1400" stroke="#070403" stroke-width="3" opacity=".8"/>`;
    for (let i = 1; i < 6; i++) s += `<line x1="0" y1="${1002 + i * i * 14}" x2="1080" y2="${1002 + i * i * 14}" stroke="#070403" stroke-width="1.5" opacity=".4"/>`;
    if (!gudang) s += `<polygon points="300,1150 780,1150 840,1260 240,1260" fill="#3a2a18" opacity=".35"/><polygon points="300,1150 780,1150 840,1260 240,1260" fill="none" stroke="#1a120a" stroke-width="3"/>`;
    s += `<ellipse id="${c.id('lg')}" cx="${p.cahaya === 'bulan' ? 180 : 760}" cy="760" rx="620" ry="560" fill="url(#${p.cahaya === 'bulan' ? 'gCold' : 'gWarm'})" opacity=".7"/>`;
    return s;
  }
  /* ---------- bangunan utuh: musala besar + gudang, dinding depan rumah, dinding gudang ---------- */
  const TONE = {
    malam: { tembok: '#3c4150', tembok2: '#2c303c', kubah: '#21402f', kayu: '#2a1a10', atap: '#14161c', lantai: '#2a2c33' },
    senja: { tembok: '#7a5a48', tembok2: '#5e4436', kubah: '#2f4a32', kayu: '#3a2414', atap: '#24140e', lantai: '#4a342a' },
    subuh: { tembok: '#8c9290', tembok2: '#6e7472', kubah: '#355e48', kayu: '#3e2c1e', atap: '#2a2e30', lantai: '#5a5e5e' },
  };
  function lengkung(x, y, w, h) { return `M${x} ${y + h} L${x} ${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} L${x + w} ${y + h}Z`; }
  function bulanSabit(x, y, r, col) { return `<path d="M${x} ${y - r} A${r} ${r} 0 1 0 ${x} ${y + r} A${r * .72} ${r * .8} 0 1 1 ${x} ${y - r}Z" fill="${col}"/><rect x="${x - 2}" y="${y + r}" width="4" height="${r * 1.6}" fill="${col}"/>`; }
  function jendelaLengkung(c, x, y, w, h, T, lit) {
    let s = `<path d="${lengkung(x - 5, y - 5, w + 10, h + 10)}" fill="${T.tembok2}"/><path d="${lengkung(x, y, w, h)}" fill="${lit ? '#c98a3a' : '#0c0d12'}"/>`;
    if (lit) { s += `<path d="${lengkung(x, y, w, h)}" fill="url(#gWarm)" opacity=".8"/>`; (c.bulbs = c.bulbs || []); }
    s += `<path d="M${x + w / 2} ${y + 4} V${y + h} M${x} ${y + h * .6} H${x + w}" stroke="#123222" stroke-width="3"/><path d="${lengkung(x, y, w, h)}" fill="none" stroke="#1f5a3a" stroke-width="3"/>`;
    return s;
  }
  function musalaBg(c, w) {
    const T = TONE[w] || TONE.malam, far = H.inkFar(w), R = H.rng(c.seed + 21);
    let s = H.sky(c, w, [880, 230, 50]);
    let tl = `M0 900`; for (let x = 0; x <= 1080; x += 30) tl += ` L${x} ${(820 - R() * 50 - (x % 210 < 60 ? 70 : 0)).toFixed(0)}`;
    s += `<path d="${tl} L1080 900Z" fill="${far}"/>` + H.palm(1010, 900, 420, far, -12, 4) + H.palm(860, 880, 360, far, 14, 5);
    // menara
    s += `<rect x="690" y="250" width="70" height="750" fill="${T.tembok2}"/><rect x="700" y="250" width="12" height="750" fill="${T.tembok}" opacity=".6"/>`;
    s += `<rect x="676" y="330" width="98" height="16" fill="${T.atap}"/><path d="M678 346 h94 l-8 14 h-78Z" fill="${T.atap}"/>`;
    for (let i = 0; i < 5; i++) s += `<rect x="${682 + i * 20}" y="312" width="5" height="20" fill="${T.atap}"/>`;
    s += `<path d="M686 250 Q725 170 764 250Z" fill="${T.kubah}"/>` + bulanSabit(725, 150, 12, '#c9a13a');
    s += `<path d="M700 380 l-26 -10 v22Z M750 380 l26 -10 v22Z" fill="${T.atap}"/>`;  // pengeras suara
    for (let i = 0; i < 4; i++) s += `<path d="${lengkung(712, 430 + i * 130, 26, 50)}" fill="#0c0d12"/>`;
    // kubah + leher kubah
    s += `<rect x="190" y="430" width="320" height="130" fill="${T.tembok2}"/>`;
    for (let i = 0; i < 6; i++) s += `<path d="${lengkung(212 + i * 50, 462, 26, 64)}" fill="#0c0d12"/>`;
    s += `<rect x="176" y="418" width="348" height="16" fill="${T.atap}"/>`;
    s += `<path d="M190 420 C190 280 260 220 350 214 C440 220 510 280 510 420Z" fill="${T.kubah}"/>`;
    for (let i = 1; i < 6; i++) { const x = 190 + i * 320 / 6; s += `<path d="M${x} 420 Q${(x + 350) / 2} 300 350 216" stroke="#163322" stroke-width="2.5" fill="none" opacity=".7"/>`; }
    s += `<path d="M232 330 C260 270 300 246 350 240" stroke="#4f8a68" stroke-width="5" fill="none" opacity=".45"/>` + bulanSabit(350, 178, 16, '#c9a13a');
    // badan musala + serambi berlengkung
    s += `<rect x="40" y="560" width="620" height="440" fill="${T.tembok}"/>`;
    for (let i = 0; i < 12; i++) s += `<rect x="${40 + R() * 600}" y="${600 + R() * 380}" width="${10 + R() * 40}" height="1.5" fill="${T.tembok2}" opacity=".6"/>`;
    s += `<path d="M10 600 L80 540 L620 540 L690 600Z" fill="${T.atap}"/><rect x="10" y="596" width="680" height="16" fill="${T.atap}"/>`;
    s += `<rect x="230" y="616" width="240" height="40" fill="#1c2a22"/><text x="350" y="644" text-anchor="middle" font-family="serif" font-size="22" fill="#c9a13a" letter-spacing="3">MUSALA</text>`;
    const cols = [60, 180, 300, 420, 540, 640];
    for (let i = 0; i < cols.length - 1; i++) {
      const x = cols[i] + 22, ww = cols[i + 1] - cols[i] - 22, lit = i !== 4;
      s += `<path d="${lengkung(x, 690, ww, 310)}" fill="${lit ? '#2a1a0e' : '#0b0b0f'}"/>`;
      if (lit) s += `<path d="${lengkung(x, 690, ww, 310)}" fill="url(#gWarm)" opacity=".55"/><path d="M${x + ww / 2} 740 v40" stroke="#120c06" stroke-width="2"/><circle cx="${x + ww / 2}" cy="786" r="7" fill="#ffd79a"/>`;
    }
    cols.forEach(x => s += `<rect x="${x}" y="660" width="22" height="340" fill="${T.tembok2}"/><rect x="${x - 6}" y="654" width="34" height="12" fill="${T.atap}"/><rect x="${x - 6}" y="988" width="34" height="12" fill="${T.atap}"/>`);
    // bedug di serambi, rak sandal, tangga
    s += `<rect x="588" y="900" width="8" height="100" fill="${T.atap}"/><rect x="660" y="900" width="8" height="100" fill="${T.atap}"/><ellipse cx="628" cy="890" rx="44" ry="38" fill="#3a2214"/><ellipse cx="672" cy="890" rx="10" ry="38" fill="#6a5440"/>`;
    s += `<rect x="40" y="1000" width="620" height="14" fill="${T.lantai}"/><rect x="20" y="1014" width="660" height="14" fill="${T.tembok2}"/>`;
    for (let i = 0; i < 6; i++) s += `<path d="M${120 + i * 26} 1012 l14 0 l3 -6 l-18 0Z" fill="#0a0806"/>`;
    // gudang di samping (seng miring, papan, pintu bergembok)
    s += `<path d="M770 690 L1090 730 L1090 748 L770 708Z" fill="${T.atap}"/><rect x="785" y="708" width="300" height="292" fill="${T.kayu}"/>`;
    for (let i = 0; i < 12; i++) s += `<rect x="${790 + i * 25}" y="712" width="2" height="288" fill="#000" opacity=".35"/>`;
    s += `<rect x="880" y="800" width="100" height="200" fill="#4a3020" stroke="#120a05" stroke-width="5"/><path d="M890 850 h80 M890 900 h80 M890 950 h80" stroke="#2a1a10" stroke-width="3"/><rect x="962" y="880" width="14" height="18" rx="3" fill="#b8902e"/>`;
    s += `<rect x="1010" y="760" width="50" height="34" fill="#0c0d12" stroke="#120a05" stroke-width="4"/>` + bohlam(c, 'blg', 840, 760, .7);
    // halaman
    H.lg(c.id('gd'), [[0, T.lantai], [1, '#060506']]);
    s += `<rect y="1028" width="1080" height="372" fill="url(#${c.id('gd')})"/>`;
    for (let i = 0; i < 9; i++) s += `<line x1="${-200 + i * 180}" y1="1400" x2="${300 + i * 60}" y2="1028" stroke="#000" stroke-width="2" opacity=".25"/>`;
    s += H.semak(980, 1030, 1.2, '#06070a', 8) + `<g id="${c.id('ps1')}">${H.banana(1050, 1060, 190, '#06070a', 9)}</g>`;
    c.sway = [c.id('ps1')];
    return s;
  }
  function depanRumahBg(c, w) {
    const T = TONE[w] || TONE.malam, R = H.rng(c.seed + 31);
    H.lg(c.id('dw'), [[0, H.lift(T.kayu, 6)], [1, T.kayu]]);
    let s = `<rect width="1080" height="1400" fill="url(#${c.id('dw')})"/>`;
    for (let y = 260; y < 1000; y += 34) s += `<rect x="0" y="${y}" width="1080" height="3" fill="#000" opacity=".45"/><rect x="0" y="${y + 3}" width="1080" height="2" fill="${H.lift(T.kayu, 14)}" opacity=".35"/>`;
    for (let i = 0; i < 30; i++) s += `<ellipse cx="${R() * 1080}" cy="${280 + R() * 700}" rx="${4 + R() * 8}" ry="2" fill="#000" opacity=".3"/>`;
    // atap teritis + lisplang + lampu
    s += `<rect width="1080" height="250" fill="${T.atap}"/>`;
    for (let i = 0; i < 28; i++) s += `<path d="M${i * 40} 0 V246" stroke="${H.lift(T.atap, 8)}" stroke-width="2"/>`;
    s += `<rect y="232" width="1080" height="28" fill="${H.lift(T.kayu, -4)}"/><path d="M0 260 ${Array.from({ length: 27 }, (_, i) => `L${i * 40 + 20} 276 L${i * 40 + 40} 260`).join(' ')}" fill="${H.lift(T.kayu, -4)}"/>`;
    s += `<rect x="30" y="260" width="34" height="740" fill="#0d0805"/><rect x="1016" y="260" width="34" height="740" fill="#0d0805"/>`;
    s += bohlam(c, 'bl', 330, 300, 1);
    // jendela samping menyala bergorden
    s += `<rect x="96" y="430" width="200" height="250" fill="#120a05"/><rect x="110" y="444" width="172" height="222" fill="url(#winG)"/><rect x="110" y="444" width="172" height="222" fill="url(#gWarm)" opacity=".5"/>`;
    s += `<path d="M110 444 H170 Q150 560 140 666 H110Z M282 444 H232 Q246 560 256 666 H282Z" fill="#7a3a18" opacity=".75"/><rect x="194" y="444" width="5" height="222" fill="#120a05"/><rect x="88" y="676" width="216" height="12" fill="#0d0805"/>`;
    s += `<path d="M40 640 l20 -6 l0 60 q-10 8 -20 0Z" fill="#0d0805"/><path d="M50 600 v34" stroke="#0d0805" stroke-width="3"/>`;  // kentongan
    // sangkar burung, kalender, papan nomor
    s += `<path d="M930 276 v40" stroke="#0d0805" stroke-width="2"/><path d="M900 316 Q930 290 960 316 V380 H900Z" fill="none" stroke="#0d0805" stroke-width="3"/><path d="M906 330 V380 M918 322 V380 M930 318 V380 M942 322 V380 M954 330 V380" stroke="#0d0805" stroke-width="1.5"/><rect x="896" y="378" width="68" height="6" fill="#0d0805"/>`;
    s += `<rect x="930" y="470" width="56" height="34" fill="#1d3a2a" stroke="#0d0805" stroke-width="3"/><text x="958" y="494" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#c9b98a">07</text>`;
    // lantai teras papan, bangku, pot, sandal
    H.lg(c.id('fl'), [[0, '#3a2616'], [1, '#0c0806']]);
    s += `<rect y="1000" width="1080" height="400" fill="url(#${c.id('fl')})"/><rect y="994" width="1080" height="10" fill="#0d0805"/>`;
    for (let i = -8; i <= 8; i++) s += `<line x1="${540 + i * 70}" y1="1004" x2="${540 + i * 150}" y2="1400" stroke="#0a0604" stroke-width="3" opacity=".7"/>`;
    s += `<rect x="70" y="900" width="260" height="16" fill="#120a05"/><rect x="82" y="916" width="12" height="84" fill="#120a05"/><rect x="306" y="916" width="12" height="84" fill="#120a05"/>`;
    s += `<path d="M900 1000 L916 940 L992 940 L1008 1000Z" fill="#3a2214"/>` + H.semak(954, 942, 1, '#08090b', 6) + `<path d="M640 1330 l40 0 l4 14 l-48 0Z M700 1336 l40 0 l4 14 l-48 0Z" fill="#050302"/>`;
    return s;
  }
  function gudangLuarBg(c, w) {
    const T = TONE[w] || TONE.malam, R = H.rng(c.seed + 41);
    let s = H.sky(c, w, [980, 160, 40]);
    // pojok tembok musala (kiri) dengan jendela lengkung menyala
    s += `<rect x="0" y="180" width="330" height="820" fill="${T.tembok}"/><rect x="318" y="180" width="12" height="820" fill="${T.tembok2}"/>`;
    s += jendelaLengkung(c, 80, 420, 150, 260, T, true) + `<path d="M0 180 L340 180 L360 150 L0 150Z" fill="${T.atap}"/>`;
    s += `<rect x="334" y="170" width="10" height="830" fill="#1a1c20"/>`;  // talang air
    // dinding gudang papan + seng
    s += `<rect x="344" y="300" width="736" height="700" fill="${T.kayu}"/>`;
    for (let x = 350; x < 1080; x += 30) s += `<rect x="${x}" y="300" width="3" height="700" fill="#000" opacity=".4"/><rect x="${x + 3}" y="300" width="2" height="700" fill="${H.lift(T.kayu, 12)}" opacity=".3"/>`;
    for (let i = 0; i < 18; i++) s += `<ellipse cx="${360 + R() * 700}" cy="${320 + R() * 660}" rx="2.5" ry="5" fill="#000" opacity=".35"/>`;
    s += `<path d="M330 300 L1090 250 L1090 210 L330 268Z" fill="${T.atap}"/>`;
    for (let i = 0; i < 26; i++) s += `<path d="M${340 + i * 30} ${268 - i * 1.9} L${340 + i * 30} ${300 - i * 2}" stroke="${H.lift(T.atap, 10)}" stroke-width="2"/>`;
    s += `<rect x="580" y="560" width="140" height="44" fill="#1a1008" stroke="#0a0604" stroke-width="3"/><text x="650" y="590" text-anchor="middle" font-family="serif" font-size="20" fill="#c9b07a" letter-spacing="2">GUDANG</text>`;
    s += bohlam(c, 'bl', 930, 470, .9) + `<path d="M916 456 h28 v-14 h-28Z" fill="#0a0604"/>`;
    s += `<rect x="900" y="380" width="120" height="50" fill="#08090c" stroke="#0a0604" stroke-width="4"/><path d="M910 390 h100 M910 404 h100 M910 418 h100" stroke="#1a1c20" stroke-width="3"/>`;  // lubang angin
    // teras semen, sapu, ember
    H.lg(c.id('fl'), [[0, T.lantai], [1, '#070707']]);
    s += `<rect y="1000" width="1080" height="400" fill="url(#${c.id('fl')})"/><rect y="996" width="1080" height="8" fill="#0a0a0c"/>`;
    for (let i = 0; i < 25; i++) s += `<path d="M${R() * 1080} ${1010 + R() * 380} l${10 + R() * 30} ${R() * 6 - 3}" stroke="#000" stroke-width="1.2" opacity=".4"/>`;
    s += `<path d="M960 1000 L1000 760 L1008 762 L970 1000Z M948 1000 L990 960 L1010 1000Z" fill="#0f0a06"/><path d="M1020 1000 l-6 -50 h52 l-6 50Z M1012 952 q32 -22 60 0" fill="#1a1e22" stroke="#1a1e22" stroke-width="3"/>`;
    s += H.semak(200, 1004, .9, '#07080a', 4);
    return s;
  }
  // pintu di dinding belakang ruang dalam (gudang): kusen + daun terbuka + cahaya masuk
  function pintuDalam(x, w) {
    const sub = w === 'subuh' ? '#c7cdd0' : '#7f9fd0';
    return `<rect x="${x - 80}" y="560" width="160" height="440" fill="#0a0604"/><rect x="${x - 66}" y="574" width="132" height="426" fill="${sub}" opacity=".55"/><rect x="${x - 66}" y="574" width="132" height="426" fill="url(#gMoon)" opacity=".6"/>` +
      `<path d="M${x - 66} 574 L${x - 120} 560 L${x - 120} 1012 L${x - 66} 1000Z" fill="#3a2616" stroke="#120a05" stroke-width="3"/><polygon points="${x - 66},1000 ${x + 66},1000 ${x + 140},1300 ${x - 140},1300" fill="${sub}" opacity=".12"/>`;
  }
  // kehidupan latar: kunang-kunang/ngengat (luar), debu melayang (dalam), kelelawar sesekali
  function hidup(c, p) {
    let s = '', R = H.rng(c.seed + 77);
    c.life = [];
    const n = c.dalam ? 16 : 12;
    for (let i = 0; i < n; i++) {
      const o = { id: c.id('lf' + i), x: 150 + R() * 780, y: c.dalam ? 300 + R() * 650 : 650 + R() * 380, a: 20 + R() * 50, sp: .2 + R() * .5, ph: R() * 6.28 };
      c.life.push(o);
      s += c.dalam ? `<circle id="${o.id}" cx="0" cy="0" r="${1.2 + R() * 1.6}" fill="#e8c890" opacity=".0"/>`
        : `<g id="${o.id}" opacity="0"><circle r="9" fill="#d8f08a" opacity=".25"/><circle r="2.6" fill="#f2ffb0"/></g>`;
    }
    if (!c.dalam && p.waktu !== 'subuh') {
      c.bats = [c.id('bt0'), c.id('bt1')];
      c.bats.forEach(id => s += `<path id="${id}" d="M0 0 q-14 -12 -30 -4 q10 2 14 10 q8 -4 16 -6 q8 2 16 6 q4 -8 14 -10 q-16 -8 -30 4Z" fill="#020203" opacity="0"/>`);
    }
    return s;
  }
  function hidupUpd(c, t) {
    (c.life || []).forEach((o, i) => {
      const x = o.x + Math.sin(t * o.sp + o.ph) * o.a, y = o.y + Math.cos(t * o.sp * 1.3 + o.ph) * o.a * .6 - (c.dalam ? (t * 4 + i * 30) % 60 : 0);
      att(o.id, 'transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
      att(o.id, 'opacity', (c.dalam ? .25 + .25 * Math.sin(t * .7 + o.ph) : Math.max(0, Math.sin(t * 1.1 + o.ph * 2))).toFixed(2));
    });
    (c.bats || []).forEach((id, i) => {
      const per = 9 + i * 4, u = ((t + i * 5) % per) / 3.2;
      if (u > 1) return att(id, 'opacity', 0);
      const flap = 1 - .6 * Math.abs(Math.sin(t * 16 + i));
      att(id, 'opacity', .9); att(id, 'transform', `translate(${(-100 + u * 1300).toFixed(0)},${(260 + i * 90 + Math.sin(u * 9) * 30).toFixed(0)}) scale(${(.9 - i * .25).toFixed(2)},${(flap * (.9 - i * .25)).toFixed(2)})`);
    });
    (c.wins || []).forEach((id, i) => att(id, 'opacity', (.75 + .25 * nz(t * .6 + i, 4)).toFixed(2)));
    (c.bulbs || []).forEach((id, i) => att(id, 'opacity', (.45 + .15 * nz(t + i * 3, 7) - (nz(t * .3 + i, 3) > .93 ? .3 : 0)).toFixed(2)));
    (c.sway || []).forEach((id, i) => att(id, 'transform', `rotate(${(Math.sin(t * .9 + i) * 1.6).toFixed(2)},${i ? 0 : 300},${i ? 1100 : 900})`));
    if (c.swingLamp) att(c.swingLamp, 'transform', `rotate(${(Math.sin(t * 1.3) * 3).toFixed(2)},540,236)`);
  }

  const PROPS = {
    pohon_kelapa: (x, y, k, ink, seed) => H.palm(x, y, 380 * k, ink, 16 * (seed % 2 ? 1 : -1), seed),
    pohon_besar: (x, y, k, ink, seed) => H.tree(x, y, 900 * k, 110 * k, ink, seed, { daun: true }),
    beringin: (x, y, k, ink, seed) => H.tree(x, y, 1000 * k, 150 * k, ink, seed, { daun: true, akar_gantung: true }),
    pohon_pisang: (x, y, k, ink, seed) => H.banana(x, y, 170 * k, ink, seed),
    bambu: (x, y, k, ink, seed) => H.bamboo(x, y, 330 * k, ink, seed),
    kamboja: (x, y, k, ink, seed) => H.kamboja(x, y, 440 * k, ink, seed),
    rumah: (x, y, k, ink, seed, c, i) => H.house(x, y, 420 * k, { ink, pre: c.id('ph' + i), n: 2, busts: false, dapur: seed % 2 === 0 }),
    pos_ronda: (x, y, k, ink, seed, c, i) => H.pos(x, y, 1.1 * k, ink, c.id('pp' + i), true),
    makam: (x, y, k, ink, seed) => H.grave(x, y, 0.8 * k, ink, seed),
    pagar: (x, y, k, ink) => H.pagarBambu(x - 150 * k, y, 300 * k, ink),
    sumur: (x, y, k, ink) => H.sumurProp(x, y, 0.55 * k, ink),
    gerobak: (x, y, k, ink) => H.gerobak(x, y, 0.8 * k, ink),
    tiang_listrik: (x, y, k, ink) => H.tiangListrik(x, y, 520 * k, ink),
    kandang_ayam: (x, y, k, ink) => H.kandangAyam(x, y, 130 * k, ink),
    ayam: (x, y, k, ink, seed) => H.ayam(x, y, 0.55 * k, ink, seed % 2 === 0),
    batu: (x, y, k, ink) => H.batu(x, y, 0.9 * k, ink),
    semak: (x, y, k, ink, seed) => H.semak(x, y, 1.2 * k, ink, seed),
    meja: (x, y, k, ink) => H.meja(x, y, 180 * k, 110 * k, ink),
    kursi: (x, y, k, ink) => H.kursi(x, y, 0.9 * k, ink),
    dipan: (x, y, k, ink) => H.dipan(x, y, 300 * k, ink),
    lemari: (x, y, k, ink) => H.lemari(x, y, 160 * k, 500 * k, ink),
    lampu_teplok: (x, y, k, ink, seed, c, i) => H.lampuTeplok(c.id('lt' + i), x, y, 0.9 * k, ink),
    kentongan: (x, y, k, ink, seed, c, i) => H.kent(x, y - 300 * k, 0.6 * k, ink, c.id('kt' + i), 0.9),
    kios_sayur: (x, y, k, ink, seed, c, i) => H.kios(c.id('kios' + i), x, y, k, 'sayur'),
    kios_buah: (x, y, k, ink, seed, c, i) => H.kios(c.id('kios' + i), x, y, k, 'buah'),
    toko: (x, y, k, ink, seed, c, i) => H.kios(c.id('kios' + i), x, y, k),
    panggangan: (x, y, k, ink, seed, c, i) => H.panggangan(c.id('masak' + i), x, y, k),
    panci: (x, y, k, ink, seed, c, i) => H.panci(c.id('masak' + i), x, y, k),
    dagangan: (x, y, k) => H.dagangan(x, y, k),
    bungkusan_nasi: (x, y, k, ink, seed, c, i) => H.bungkusan(c.id('bungkus' + i), x, y, k, 'nasi'),
    bungkusan_tanah: (x, y, k, ink, seed, c, i) => H.bungkusan(c.id('bungkus' + i), x, y, k, 'tanah'),
    kalender: (x, y, k) => H.kalender(x, y, k),
    papan_nama: (x, y, k, ink, seed, c, i, q) => H.papanNama(x, y, k, q.teks || 'PASAR SETAN'),
  };
  H.PROPS = Object.keys(PROPS);

  // latar: {langit, tanah (y), warna_tanah, dalam (bool), kabut (kode warna)}
  function latar(c, p) {
    const w = p.waktu || 'malam', far = H.inkFar(w), fc = H.fogCol(w);
    let s = '', ground = 1040, dalam = false, gcol = '#090605';
    switch (p.latar) {
      case 'sawah':
        s = H.sawahBackdrop(c, w); ground = 1050; gcol = 'none'; break;
      case 'pasar':
        s = H.marketBackdrop(c, p); ground = 1100; gcol = 'none'; break;
      case 'hutan': {
        const R = c.R; s = H.sky(c, w, null) + `<ellipse cx="540" cy="700" rx="700" ry="380" fill="url(#gFog${fc})" opacity=".9"/>`;
        for (let i = 0; i < 7; i++) s += H.tree(i * 170 + R() * 60 - 30, 1060, 900 + R() * 300, 60 + R() * 40, '#141d2c', 20 + i, { daun: false });
        for (let i = 0; i < 4; i++) s += H.tree(i * 300 + R() * 120 - 60, 1080, 1000 + R() * 300, 90 + R() * 50, '#0a111c', 40 + i, { daun: false, akar_gantung: true });
        gcol = '#06080c'; break;
      }
      case 'kuburan':
        s = H.sky(c, w, [820, 260, 60]) + `<path d="M0 960 Q300 920 600 950 T1080 930 L1080 1400 L0 1400Z" fill="${far}"/>` + H.kamboja(200, 1010, 500, '#05060a', 3);
        [[330, 1010, 0.6], [560, 1000, 0.55], [790, 1012, 0.6], [1000, 1110, 0.8]].forEach(([x, y, k], i) => { c.later = (c.later || '') + H.grave(x, y, k, '#07080b', 30 + i); });
        gcol = '#07080b'; ground = 1040; break;
      case 'dalam_rumah': case 'dapur': {
        dalam = true; ground = 1000;
        if (p.dekor === false) { H.lg(c.id('wl'), [[0, '#1c120b'], [1, '#0b0705']]); s = `<rect width="1080" height="1400" fill="url(#${c.id('wl')})"/>`; }
        else s = dalamBg(c, p);
        if (p.pintu != null && p.dekor !== false) s += pintuDalam(X(p.pintu), w);
        if (p.latar === 'dapur') s += `<rect x="700" y="760" width="320" height="240" fill="#060403"/><rect x="690" y="750" width="340" height="14" fill="#0a0604"/>`;
        gcol = 'none'; break;
      }
      case 'teras':
        ground = 1000; s = terasBg(c, w); gcol = 'none'; break;
      case 'musala':
        ground = 1028; s = musalaBg(c, w); gcol = 'none'; break;
      case 'depan_rumah':
        ground = 1000; s = depanRumahBg(c, w); gcol = 'none'; break;
      case 'gudang_luar':
        ground = 1000; s = gudangLuarBg(c, w); gcol = 'none'; break;
      case 'sungai':
        ground = 980; s = H.sky(c, w, [540, 240, 60]) + `<path d="M0 900 Q300 860 600 890 T1080 870 L1080 980 L0 980Z" fill="${far}"/>` + H.bamboo(80, 905, 330, far, 1) + H.palm(1000, 900, 360, far, -14, 2);
        s += `<rect y="1100" width="1080" height="300" fill="#0a1220"/><rect y="1098" width="1080" height="6" fill="#1a2a44"/>`;
        for (let i = 0; i < 9; i++) s += `<rect id="${c.id('rp' + i)}" x="${440 + (i % 3) * 30}" y="${1120 + i * 28}" width="${200 - i * 12}" height="3" fill="#aabbd8" opacity="${0.35 - i * 0.03}"/>`;
        c.river = true; gcol = '#0d0a07'; c.groundH = 120; break;
      case 'jalan':
        ground = 1060; s = jalanBg(c, w); gcol = 'none'; break;
      case 'lapangan':
        ground = 1000; s = H.sky(c, w, [700, 280, 64]) + `<path d="M0 940 Q300 900 600 930 T1080 910 L1080 1400 L0 1400Z" fill="${far}"/>` + H.tree(60, 960, 500, 70, far, 7, { daun: true }) + H.tree(1000, 950, 560, 80, far, 8, { daun: true });
        gcol = '#0a0906'; break;
      default: // kampung
        ground = 1000; s = kampungBg(c, w); gcol = 'none';
    }
    if (gcol !== 'none') s += `<rect y="${ground}" width="1080" height="${1400 - ground}" fill="${gcol}"/>`;
    if (!dalam && !['jalan', 'teras', 'musala', 'depan_rumah', 'gudang_luar'].includes(p.latar || 'kampung') && gcol !== 'none') s += H.rumput(ground + 50, H.lift(gcol === 'none' ? '#0b0906' : gcol, 6), 40, 9);
    c.ground = ground; c.dalam = dalam; c.fc = fc;
    return s;
  }

  const SAFE = /^[MmLlHhVvCcSsQqTtAaZz0-9\s.,+\-eE]+$/;
  /* keranda rinci: kain hijau berhias kaligrafi emas + rumbai, rangka kayu cokelat (kotak lokal 0-200) */
  function kerandaDefs() {
    if (H._krdDef) return; H._krdDef = 1;
    H.lg('gKainH', [[0, '#246a37'], [.5, '#174d27'], [1, '#0a2c15']]);
    H.lg('gKayu', [[0, '#6a4426'], [1, '#2e1b0e']]);
    H.lg('gEmas', [[0, '#e2bd55'], [1, '#9c7420']]);
  }
  function motif(x0, x1, base, h, R) {  // goresan bergaya kaligrafi (dekoratif, bukan teks): alif tinggi, gigi, lengkung panjang, titik
    let m = '', x = x0;
    m += `M${x0} ${base + h * .1} C${x0 + (x1 - x0) * .3} ${base + h * .45} ${x0 + (x1 - x0) * .7} ${base + h * .4} ${x1} ${base - h * .15}`;
    while (x < x1 - 8) {
      const ww = 14 + R() * 16;
      m += ` M${x.toFixed(1)} ${base} q${(ww * .5).toFixed(1)} ${(h * .18).toFixed(1)} ${ww.toFixed(1)} 0`;  // garis dasar kata
      const n = 1 + Math.floor(R() * 3);
      for (let j = 0; j < n; j++) {
        const xx = x + ww * (j + .5) / n, hh = h * (.55 + R() * .5);
        if (R() < .6) m += ` M${xx.toFixed(1)} ${base} l${(hh * .12).toFixed(1)} ${(-hh).toFixed(1)}`;              // alif miring
        else m += ` M${(xx - 3).toFixed(1)} ${base} q2 ${(-h * .3).toFixed(1)} 5 0`;                                    // gigi
      }
      if (R() < .35) m += ` M${(x + ww * .3).toFixed(1)} ${(base + h * .12).toFixed(1)} c-6 ${(h * .3).toFixed(1)} ${(ww * .9).toFixed(1)} ${(h * .35).toFixed(1)} ${(ww * 1.2).toFixed(1)} ${(-h * .05).toFixed(1)}`;  // ekor melengkung
      if (R() < .7) m += ` M${(x + ww * R()).toFixed(1)} ${(base - h * (1.05 + R() * .2)).toFixed(1)} l4 -1.5`;     // tanda di atas
      x += ww + 3 + R() * 5;
    }
    return m;
  }
  function kainHijau(x0, x1, top, bot, seed) {
    const R = H.rng(seed), w = x1 - x0, r = Math.min(34, w * .2);
    let g = `<path d="M${x0} ${bot} L${x0} ${top + r} Q${x0} ${top} ${x0 + r} ${top} L${x1 - r} ${top} Q${x1} ${top} ${x1} ${top + r} L${x1} ${bot} ${Array.from({ length: 8 }, (_, i) => { const xa = x1 - (i + .5) * w / 8, xb = x1 - (i + 1) * w / 8; return `Q${xa.toFixed(1)} ${bot + 8} ${xb.toFixed(1)} ${bot}`; }).join(' ')} Z" fill="url(#gKainH)"/>`;
    for (let i = 1; i < 6; i++) { const x = x0 + i * w / 6 + (R() - .5) * 6; g += `<path d="M${x.toFixed(1)} ${top + 8} q${(R() * 4 - 2).toFixed(1)} ${((bot - top) * .5).toFixed(1)} 0 ${(bot - top - 6).toFixed(1)}" stroke="#0a2a13" stroke-width="${(2 + R() * 3).toFixed(1)}" opacity=".45" fill="none"/>`; }
    g += `<path d="M${x0 + r * .6} ${top + 5} L${x1 - r * .6} ${top + 5}" stroke="#4f9a5e" stroke-width="2" opacity=".45"/>`;
    const bh = (bot - top) * .34, base = top + (bot - top) * .58;
    g += `<path d="${motif(x0 + 10, x1 - 10, base, bh, R)}" stroke="url(#gEmas)" stroke-width="2.8" stroke-linecap="round" fill="none"/>`;
    g += `<path d="M${x0} ${bot - 12} L${x1} ${bot - 12}" stroke="#b8902e" stroke-width="4"/><path d="M${x0} ${bot - 5} L${x1} ${bot - 5}" stroke="#c9a13a" stroke-width="2"/>`;
    for (let x = x0 + 3; x < x1; x += 5) g += `<line x1="${x}" y1="${bot - 2}" x2="${x + .5}" y2="${bot + 5}" stroke="#a8842a" stroke-width="1.3"/>`;
    return g;
  }
  function kayu(d) { return `<path d="${d}" fill-rule="evenodd" fill="url(#gKayu)" stroke="#1a0e06" stroke-width="1.5"/>`; }
  const GAMBAR = {
    // keranda di lantai (sejajar KERANDA_KAYU/KAIN lama)
    keranda: (k) => kayu('M-30 146 L230 146 L230 158 L-30 158 Z M12 158 L24 158 L24 200 L12 200 Z M176 158 L188 158 L188 200 L176 200 Z M8 136 L192 136 L192 146 L8 146 Z') +
      `<path d="M-30 149 H230 M-30 155 H230" stroke="#8a5a32" stroke-width="1" opacity=".6"/><rect x="-34" y="145" width="8" height="14" rx="3" fill="#7a4e2a"/><rect x="226" y="145" width="8" height="14" rx="3" fill="#7a4e2a"/>` +
      (k.kain === false ? kayu('M10 136 L10 96 Q12 64 50 58 L150 58 Q188 64 190 96 L190 136 L180 136 L180 98 Q178 72 148 68 L52 68 Q22 72 20 98 L20 136 Z') : ''),
    kain: () => kainHijau(14, 186, 60, 140, 7),
    // keranda dipikul (sejajar PIKUL_KAYU/PIKUL_KAIN)
    keranda_pikul: () => kayu('M80 174 L300 174 L300 184 L80 184 Z M110 164 L270 164 L270 174 L110 174 Z') + `<rect x="76" y="173" width="8" height="12" rx="3" fill="#7a4e2a"/><rect x="296" y="173" width="8" height="12" rx="3" fill="#7a4e2a"/>`,
    kain_pikul: () => kainHijau(114, 266, 90, 168, 11),
    // dari atas (sejajar KERANDA_ATAS_*)
    keranda_atas: () => kayu('M-60 60 L260 60 L260 210 L-60 210 Z M-40 76 L240 76 L240 194 L-40 194 Z M-120 112 L-60 112 L-60 124 L-120 124 Z M-120 146 L-60 146 L-60 158 L-120 158 Z M260 112 L320 112 L320 124 L260 124 Z M260 146 L320 146 L320 158 L260 158 Z'),
    kain_atas: () => { const R = H.rng(5); return `<rect x="-40" y="76" width="280" height="118" fill="url(#gKainH)"/><path d="M-40 88 H240 M-40 182 H240" stroke="#b8902e" stroke-width="4"/><path d="${motif(-20, 220, 146, 30, R)}" stroke="url(#gEmas)" stroke-width="2.6" stroke-linecap="round" fill="none"/>`; },
  };
  function kustom(c, k, i) {
    if (k && GAMBAR[k.gambar]) k = { ...k, path: k.path || 'M0 0' };
    if (!k || !k.path || !SAFE.test(k.path) || k.path.length > 6000) return '';
    const sc = cl(+k.skala || 1, 0.2, 4) * 1.4, px = X(k.x == null ? 50 : k.x);
    const py = k.y == null ? Math.min(c.ground, 1030) : Y(k.y);
    let s = '';
    if (k.cahaya) s += `<ellipse cx="${px}" cy="${py - 100 * sc}" rx="${160 * sc}" ry="${140 * sc}" fill="url(#gWarm)" opacity=".6"/>`;
    s += `<g id="${c.id('ku' + i)}"><g transform="translate(${px - 100 * sc},${py - 200 * sc}) scale(${sc})">${GAMBAR[k.gambar] ? (kerandaDefs(), GAMBAR[k.gambar](k)) : `<path d="${k.path}" fill-rule="evenodd" fill="${/^#[0-9a-fA-F]{6}$/.test(k.warna || '') ? k.warna : k.terang ? '#bfa979' : INK}"/>`}`;
    if (k.teks) s += `<text x="100" y="95" text-anchor="middle" font-family="serif" font-size="${Math.min(18, 160 / Math.max(1, String(k.teks).length) * 1.7)}" fill="${k.terang ? '#21170f' : '#e3cda0'}">${esc(k.teks)}</text>`;
    s += '</g></g>';
    return s;
  }

  ENG.def('komposisi', {
    defaults: { latar: 'kampung', waktu: 'malam', cahaya: 'lentera', aktor: [], props: [], sosok: null, kustom: [] }, focus: [540, 820], dust: [255, 220, 175],
    camKeys(c, p, foc, g) {
      const xs = (p.aktor || []).map(a => X(a.x == null ? 50 : a.x));
      if (p.sosok && p.sosok.jenis) xs.push(X(p.sosok.x == null ? 75 : p.sosok.x));
      const fx = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 540, fy = (c.ground || 1000) - 180;
      const a = c.t0, b = c.t1;
      if (p.zoom != null) {  // bingkai manual: fokus (x,y 0-100) + zoom, dikunci sepanjang adegan
        c.lockCam = true;
        const zx = X(p.fokus_x == null ? 50 : p.fokus_x), zy = Math.min(1100, (+p.fokus_y || 70) * 14), z = H.cl(+p.zoom || 1, 1, 4), d = g === 'geser_kanan' ? 50 : g === 'geser_kiri' ? -50 : 0;
        return [[a, zx - d, zy, z], [b, zx + d, zy, z * 1.04]];
      }
      if (g === 'mundur') return [[a, fx, fy, 1.32], [b, fx, fy, 1.0]];
      if (g === 'geser_kiri') return [[a, fx + 150, fy, 1.25], [b, fx - 150, fy, 1.28]];
      if (g === 'geser_kanan') return [[a, fx - 150, fy, 1.25], [b, fx + 150, fy, 1.28]];
      if (g === 'diam') return [[a, fx, fy, 1.06], [b, fx + 10, fy - 6, 1.1]];
      if (g === 'naik') return [[a, fx, fy + 160, 1.2], [b, fx, fy - 120, 1.25]];
      return [[a, fx, fy + 40, 1.0], [b, fx, fy, 1.3]];
    },
    build(c, p) {
      let s = `<g id="${c.id('backdrop')}">` + latar(c, p) + '</g>';
      const g = c.ground;
      // cahaya lingkungan DI BELAKANG benda & tokoh (dulu di depan -> tokoh tampak pudar)
      if (!c.dalam) {
        if (p.cahaya === 'api') s += `<ellipse id="${c.id('lg')}" cx="540" cy="${g - 120}" rx="560" ry="380" fill="url(#gWarm)" opacity=".6"/>`;
        else if (p.cahaya === 'lampu_rumah') s += `<ellipse id="${c.id('lg')}" cx="360" cy="${g - 220}" rx="480" ry="380" fill="url(#gWarm)" opacity=".55"/>`;
        else if (p.cahaya === 'bulan') s += `<ellipse id="${c.id('lg')}" cx="640" cy="${g - 380}" rx="620" ry="520" fill="url(#gMoon)" opacity=".4"/>`;
        else s += `<ellipse id="${c.id('lg')}" cx="540" cy="${g - 160}" rx="420" ry="320" fill="url(#gWarm)" opacity=".35"/>`;
      }
      // properti (urut dari kiri; yang lebih kecil skala dianggap lebih jauh -> digambar dulu)
      const surface = q => q.depan || ['kalender', 'papan_nama', 'bungkusan_nasi', 'bungkusan_tanah', 'dagangan', 'lampu_teplok'].includes(q.jenis) ? 1 : 0;
      const props = (Array.isArray(p.props) ? p.props : []).slice(0, 24).map((q, i) => ({ ...q, i })).sort((a, b) => surface(a) - surface(b) || (+a.y || 70) - (+b.y || 70) || (+a.skala || 1) - (+b.skala || 1));
      c.dipan = null;
      c.propMotion = props;
      c.propPositions = {};
      props.forEach((q) => {
        const fn = PROPS[q.jenis]; if (!fn) return;
        const k = cl(+q.skala || 1, 0.3, 2.5);
        let x = X(q.x == null ? 50 : q.x), y = q.y == null ? g + 4 * k : Y(cl(+q.y, 45, 88));
        const parent = q.di_atas == null ? null : props.find(v => v.i === Math.round(+q.di_atas) && v.i !== q.i);
        if (parent && parent.jenis === 'meja') {
          const pk = cl(+parent.skala || 1, .3, 2.5), px = X(parent.x == null ? 50 : parent.x);
          const py = parent.y == null ? g + 4 * pk : Y(parent.y);
          x = q.x == null ? px : cl(x, px - 75 * pk, px + 75 * pk); y = py - 110 * pk;
        }
        c.propPositions[q.i] = { x, y };
        s += `<g id="${c.id('prop' + q.i)}">` + fn(x, y, k, INK, 11 + q.i, c, q.i, q) + '</g>';
        if (q.jenis === 'dipan') c.dipan = { x, k, y };
      });
      if (c.later) s += c.later;
      // elemen kustom
      (Array.isArray(p.kustom) ? p.kustom : []).slice(0, 8).forEach((k, i) => s += kustom(c, k, i));
      // kabut di BELAKANG tokoh supaya telapak kaki tetap menapak terlihat
      s += H.fogs(c.id('1'), g + 10, c.fc, c.dalam ? 0.2 : 0.45, 6) + hidup(c, p);
      // sosok
      if (p.sosok && p.sosok.jenis) {
        const kind = H.JENIS_SOSOK.includes(p.sosok.jenis) ? p.sosok.jenis : 'bayangan';
        const hh = H.sosokTinggi[kind] || 674, k = cl(+p.sosok.skala || 1, 0.3, 2) * Math.min(0.75, 420 / hh);
        c.sx = X(p.sosok.x == null ? 75 : p.sosok.x); c.sk = k * 1.25; c.smuncul = cl(+p.sosok.muncul || 0.45, 0, 0.95);
        s += `<ellipse id="${c.id('sbk')}" cx="${c.sx}" cy="${g - 300 * c.sk}" rx="${240 * c.sk}" ry="${420 * c.sk}" fill="url(#gCold)" opacity="0"/>`;
        s += `<g id="${c.id('gh')}" opacity="0" transform="translate(${c.sx},${g + 10}) scale(${c.sk})">${H.sosok(c.id('gs'), kind, 1)}</g>`;
      }
      // aktor
      c.act = []; c.disp = [];
      H.rg(c.id('shd'), '#000000', .85);
      (Array.isArray(p.aktor) ? p.aktor : []).slice(0, 12).forEach((a, i) => {
        const jenis = H.JENIS_ORANG.includes(a.jenis) ? a.jenis : 'pria';
        s += `<ellipse id="${c.id('sh' + i)}" cx="0" cy="0" rx="80" ry="16" fill="url(#${c.id('shd')})"/>`;
        s += H.figure(c.id('a' + i), { jenis, kaki_telanjang: !!a.kaki_telanjang, alat: a.alat, lentera: !!a.lentera, obor: !!a.obor, ink: '#030304', aksen: !!a.aksen, rim: RIM[p.cahaya] || RIM.lentera });
        const ax = X(a.x == null ? 50 : a.x); let flip = a.hadap === 'kiri';
        if (!a.hadap && a.x_akhir != null) flip = X(a.x_akhir) < ax;
        if (a.pose === 'lari_ketakutan' && c.sx != null) flip = c.sx > ax;  // kabur MENJAUHI hantu
        c.act.push({ ...a, jenis, pose: a.pose || 'diam', x: ax, flip, lentera: !!a.lentera, obor: !!a.obor, s: cl(+a.skala || 1, 0.3, 1.6) * 1.3 });
      });
      s += c.dalam ? '' : H.groundMist(g + 260, c.fc, 0.35);
      return s;
    },
    upd(c, t, p) {
      const u = t - c.t0;
      if (p.latar_gerak === 'menjauh') att(c.id('backdrop'), 'transform', `translate(540,850) scale(${lerp(1, .55, c.k(t))}) translate(-540,-850)`);
      c.act.forEach((a, i) => {
        const begin = a.t == null ? c.t0 : a.t, end = a.akhir_t == null ? c.t1 : a.akhir_t;
        // pose awal/akhir hanya bila cue eksplisit; tanpa cue pose dipegang sepanjang crossfade (tidak meletup di batas adegan)
        const pose = a.t != null && t < begin ? (a.pose_awal || 'diam') : a.akhir_t != null && t >= end ? (a.pose_akhir || 'diam') : a.pose;
        const elapsed = cl(t - begin, 0, Math.max(0, end - begin));
        const MOV = ['jalan', 'lari', 'lari_ketakutan'], moving = MOV.includes(a.pose), dir = a.flip ? -1 : 1;
        const sp = a.pose === 'jalan' ? 26 : moving ? 50 : 0;
        let x, phase = null;
        if (a.x_akhir != null && moving) x = lerp(a.x, X(a.x_akhir), cl(elapsed / Math.max(.1, end - begin)));
        else if (a.datang != null && a.t != null && t < begin && MOV.includes(a.pose_awal)) x = a.x - dir * a.datang * 7.5 * cl((begin - t) / Math.max(.1, begin - c.t0));  // datang lalu berhenti tepat di kata
        else if (moving) x = cl(a.x + dir * Math.min(sp * elapsed, 170), 190, 890);
        else x = a.x;
        // fase kaki dari jarak tempuh -> langkah menapak, tidak meluncur
        if (x !== a.x || a.x_akhir != null || a.datang != null) phase = (x - a.x) * dir / STRIDE(a.s) * 6.283 + i * .9;
        c.disp[i] = x - a.x;
        const lie = ['tidur', 'tergeletak'].includes(pose);
        let baseY = a.y == null ? c.ground : Y(cl(+a.y, 45, 88));
        if (lie) baseY = Math.min(baseY, 990);
        const onBed = c.dipan && Math.abs(c.dipan.x - a.x) < 260;
        // duduk di dipan: pinggul tepat di alas dipan (tidak melayang di depannya)
        const y = lie ? (onBed ? baseY - 52 : baseY - 6) : pose === 'duduk' && onBed ? c.dipan.y - 50 + 80 * a.s : baseY + (pose === 'duduk' ? -50 : 0) + 20;
        const lx = lie ? (c.dipan && Math.abs(c.dipan.x - a.x) < 260 ? c.dipan.x : x) + 150 * a.s / 1.3 : x;
        // ganti pose memudar 0,35 dtk (tidak meletup)
        let pose_from = null, blend = null;
        if (a.t != null && t >= begin && t < begin + .35) { pose_from = a.pose_awal || 'diam'; blend = (t - begin) / .35; }
        else if (a.akhir_t != null && t >= end && t < end + .35) { pose_from = a.pose; blend = (t - end) / .35; }
        if (pose_from === pose) blend = null;
        H.poseFigure(c.id('a' + i), { jenis: a.jenis, pose, pose_from, blend, phase: phase != null && MOV.includes(pose) ? phase : elapsed * (pose === 'jalan' ? 5.2 : 3) + i, x: lx, y, s: a.s, flip: a.flip, lentera: a.lentera, obor: a.obor,
          head_turn: a.geleng && pose === a.pose && t >= begin ? Math.cos(elapsed * 7) : a.toleh && a.t != null ? 1 - 2 * ramp(t, begin, begin + .4) : null,
          hand_x: a.tangan_x == null ? null : X(a.tangan_x) + c.disp[i], hand_y: a.tangan_y == null ? null : Y(a.tangan_y) });
        const sh = c.el('sh' + i);
        if (sh) { const fy = lie ? baseY : pose === 'duduk' && onBed ? c.dipan.y + 6 : baseY + 20, wdt = (lie ? 170 : pose === 'duduk' ? 60 : 62) * a.s; att(c.id('sh' + i), 'cx', lx.toFixed(1)); att(c.id('sh' + i), 'cy', fy.toFixed(1)); att(c.id('sh' + i), 'rx', wdt.toFixed(1)); att(c.id('sh' + i), 'ry', (wdt * .2).toFixed(1)); att(c.id('sh' + i), 'opacity', pose === 'duduk' ? .4 : .75); }
      });
      c.propMotion.forEach(q => {
        const active = (q.t == null || t >= q.t) && (q.akhir_t == null || t < q.akhir_t);
        att(c.id('prop' + q.i), 'opacity', active ? 1 : 0);
        if (q.aktor != null && c.propPositions[q.i]) att(c.id('prop' + q.i), 'transform', handTransform(c, q, c.propPositions[q.i].x, c.propPositions[q.i].y));
        if (['panci', 'panggangan'].includes(q.jenis)) H.masakUpd(c.id('masak' + q.i), t, active);
        if (['bungkusan_nasi', 'bungkusan_tanah'].includes(q.jenis)) H.bungkusUpd(c.id('bungkus' + q.i), q.buka_t != null ? ramp(t, q.buka_t, q.buka_t + .8) : q.terbuka ? 1 : 0);
      });
      (p.kustom || []).slice(0, 8).forEach((q, i) => {
        const active = (q.t == null || t >= q.t) && (q.akhir_t == null || t < q.akhir_t), dt = Math.max(0, t - (q.t == null ? c.t0 : q.t));
        att(c.id('ku' + i), 'opacity', active ? (q.t == null ? 1 : ramp(t, q.t, q.t + .35)) : 0);  // muncul memudar, bukan meletup
        const x = X(q.x == null ? 50 : q.x), y = q.y == null ? Math.min(c.ground, 1030) : Y(q.y);
        let transform = q.gerak === 'naik' ? `translate(0,${-Math.min(80, dt * 12)})` : q.gerak === 'goyang' ? `rotate(${Math.sin(dt * 2) * 4},${x},${y})` : q.gerak === 'putar' ? `rotate(${dt * 35},${x},${y - 100})` : 'translate(0,0)';
        if (q.aktor != null) {
          transform = handTransform(c, q, x, y);
        } else if (q.ikut != null && c.disp[q.ikut]) transform = `translate(${c.disp[q.ikut].toFixed(2)},0) ` + transform;
        att(c.id('ku' + i), 'transform', transform);
      });
      if (c.sk) {
        const m = c.at(c.smuncul), a = ramp(t, m, m + Math.min(2.5, (c.t1 - m) * 0.5));
        att(c.id('gh'), 'opacity', a * 0.96); att(c.id('sbk'), 'opacity', a * 0.5);
        att(c.id('gse'), 'opacity', ramp(t, m + (c.t1 - m) * 0.55, m + (c.t1 - m) * 0.75));
      }
      const lg = c.el('lg'); if (lg && !c.dalam) lg.setAttribute('opacity', (p.cahaya === 'bulan' ? 0.4 : 0.55) * (0.85 + 0.15 * nz(t, 6)));
      for (let i = 0; i < 12; i++) { const e = c.el('lt' + i + 'f'); if (e) e.setAttribute('ry', 10 + 5 * nz(t + i, 9)); }
      if (c.river) for (let i = 0; i < 9; i++) att(c.id('rp' + i), 'transform', `translate(${Math.sin(t * 0.8 + i) * 30},0)`);
      H.fogUpd(c.id('1'), 6, t); hidupUpd(c, t);
    }
  });
})();

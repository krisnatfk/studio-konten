/* Adegan luar ruangan — style horor_kampung. */
(function () {
  const { H } = ENG; const { att, ramp, nz, pulse, cl, lerp } = H;
  const INK = '#07050a', INK2 = '#0b0a10';

  // pasang & gerakkan rombongan orang (dipakai beberapa adegan)
  function crew(c, p, n, opts = {}) {
    c.crew = [];
    let s = '';
    const kinds = opts.kinds || ['pria', 'anak', 'wanita', 'bapak'];
    for (let i = 0; i < n; i++) { const jenis = kinds[i % kinds.length]; s += H.figure(c.id('w' + i), { jenis, lentera: p.lentera && i === 0, ink: '#030304' }); c.crew.push({ jenis, lentera: p.lentera && i === 0 }); }
    return s;
  }
  function crewUpd(c, t, x0, y0, s0, dir, speed, pose = 'jalan') {
    const u = t - c.t0;
    c.crew.forEach((w, i) => H.poseFigure(c.id('w' + i), { jenis: w.jenis, lentera: w.lentera, pose, phase: (t + i * 0.9) * 5.2, x: x0 + dir * (u * speed) - dir * i * 95 * s0, y: y0 + i * 3, s: s0 - i * 0.03, flip: dir < 0 }));
  }

  ENG.def('kampung_malam', {
    defaults: { waktu: 'malam', pos_ronda: true, orang: 0 }, focus: [640, 860], dust: [255, 225, 180],
    build(c, p) {
      let s = H.sky(c, p.waktu, [760, 330, 74]);
      const far = H.inkFar(p.waktu), mid = H.lift(far, -3);
      s += `<path d="M0 930 Q220 870 430 915 T830 905 T1080 895 L1080 1400 L0 1400Z" fill="${far}"/>`;
      s += H.house(130, 955, 150, { ink: far, pre: c.id('z'), n: 2, busts: false, teras: false, pintu: false });
      s += H.palm(40, 960, 300, far, -18, 1) + H.palm(990, 950, 330, far, 20, 2) + H.palm(1060, 970, 280, far, 12, 3);
      s += H.banana(330, 985, 150, mid, 4) + H.bamboo(900, 1000, 300, mid, 5);
      s += H.house(240, 1000, 250, { ink: INK, pre: c.id('a'), n: 2, busts: false, dapur: true });
      s += H.house(520, 992, 190, { ink: INK, pre: c.id('b'), n: 2, busts: false, teras: false });
      if (p.pos_ronda) { s += `<ellipse cx="800" cy="860" rx="260" ry="200" fill="url(#gWarm)" opacity=".55"/>`; s += H.pos(800, 1010, 1.25, '#050304', c.id('p'), true); }
      else s += H.house(830, 1005, 300, { ink: INK, pre: c.id('c'), n: 2, busts: false });
      s += `<rect y="1000" width="1080" height="400" fill="#090605"/>`;
      s += H.pagarBambu(560, 1060, 300, '#060403') + H.semak(100, 1070, 1.2, '#060403', 11) + H.rumput(1062, '#0d0906', 50, 12);
      s += crew(c, p, cl(p.orang | 0, 0, 2));
      s += H.fogs(c.id('1'), 1010, H.fogCol(p.waktu), 0.9, 6) + H.groundMist(1010, H.fogCol(p.waktu), 0.6) + H.fogs(c.id('2'), 1090, H.fogCol(p.waktu), 0.6, 5);
      return s;
    },
    upd(c, t, p) {
      ['ag0', 'ag1', 'bg0', 'bg1', 'cg0', 'cg1', 'zg0', 'zg1'].forEach((id, i) => { const a = ramp(t, c.t0 + 0.3 + i * 0.2, c.t0 + 1.0 + i * 0.2) * (0.9 + 0.1 * nz(t + i, 5)); att(c.id(id), 'opacity', 0.55 * a); att(c.id(id.replace('g', 'r')), 'opacity', a); });
      if (p.pos_ronda) { const [px, py] = H.posPivot(800, 1010, 1.25); att(c.id('pk'), 'transform', `rotate(${1.2 * Math.sin(t * 1.6)},${px},${py})`); }
      if (c.crew.length) crewUpd(c, t, 380, 1066, 0.5, 1, 22);
      H.fogUpd(c.id('1'), 6, t);
    }
  });

  ENG.def('rumah_panggung', {
    defaults: { penghuni: 3, pos_ronda: false, ketukan: 0, waktu: 'malam', orang_depan: 0 }, focus: [540, 800], dust: [255, 215, 160],
    points: { pos_ronda: [800, 860], rumah: [420, 800] },
    build(c, p) {
      const n = cl(p.penghuni | 0, 1, 5);
      let s = H.sky(c, p.waktu, p.pos_ronda ? [900, 250, 48] : [170, 230, 52]);
      const far = H.inkFar(p.waktu);
      s += `<path d="M0 960 Q300 930 600 950 T1080 940 L1080 1400 L0 1400Z" fill="${far}"/>`;
      if (p.pos_ronda) {
        s += H.palm(40, 980, 380, far, -18, 1) + H.palm(700, 985, 300, far, 16, 2) + H.banana(1020, 990, 160, far, 3);
        s += H.house(400, 1000, 560, { ink: INK, pre: c.id('h'), n, kinds: ['m', 'w', 'c', 'c', 'w'], teras: false, dapur: true });
        s += H.rings(c.id('q'), 860, 860, 8);
        s += `<ellipse cx="860" cy="860" rx="180" ry="140" fill="url(#gWarm)" opacity=".4"/>`;
        s += H.pos(860, 1005, 0.9, '#050304', c.id('p'), true);
      } else {
        s += H.palm(-10, 1000, 420, far, 18, 1) + H.palm(1060, 1000, 460, far, -20, 2) + H.bamboo(960, 1005, 320, far, 3);
        s += H.house(500, 1010, 640, { ink: INK, pre: c.id('h'), n, kinds: ['m', 'w', 'c', 'c', 'w'], dapur: true });
      }
      s += `<rect y="1000" width="1080" height="400" fill="#090605"/>`;
      s += H.kandangAyam(150, 1090, 110, '#060403') + H.ayam(240, 1086, 0.5, '#060403') + H.rumput(1064, '#0d0906', 40, 9);
      s += crew(c, p, cl(p.orang_depan | 0, 0, 2));
      s += H.fogs(c.id('1'), 1015, H.fogCol(p.waktu), 0.9, 6) + H.groundMist(1015, H.fogCol(p.waktu), 0.5);
      if (p.ketukan > 0) s += H.dots(c.id('d'), 540, 1250, n, 90);
      c.n = n;
      return s;
    },
    upd(c, t, p) {
      const n = c.n;
      for (let i = 0; i < n; i++) {
        const a = ramp(t, c.t0 + 0.2 + i * 0.25, c.t0 + 0.9 + i * 0.25);
        att(c.id('hg' + i), 'opacity', 0.6 * a * (0.92 + 0.08 * nz(t + i, 5))); att(c.id('hr' + i), 'opacity', a);
        att(c.id('hb' + i), 'opacity', ramp(t, c.t0 + 0.5 + i * 0.4, c.t0 + 1.0 + i * 0.4));
      }
      if (p.pos_ronda) {
        H.ringsUpd(c.id('q'), 8, t, c.synth, 0.55, 230);
        const [px, py] = H.posPivot(860, 1005, 0.9);
        att(c.id('pk'), 'transform', `rotate(${(c.synth.length ? pulse(t, c.synth[0], 0.8) * 3 * Math.sin(t * 30) : 0) + 0.6 * Math.sin(t * 1.4)},${px},${py})`);
      }
      if (p.ketukan > 0) H.dotsUpd(c.id('d'), n, t, c.synth);
      if (c.crew.length) crewUpd(c, t, 700, 1075, 0.42, -1, 18);
      H.fogUpd(c.id('1'), 6, t);
    }
  });

  ENG.def('pos_ronda_kosong', {
    defaults: { waktu: 'malam' }, focus: [540, 760], cam: 'maju', dust: [190, 210, 255],
    build(c, p) {
      H.lg(c.id('beam'), [[0, '#aac0e8', 0.0], [0.2, '#aac0e8', 0.28], [1, '#aac0e8', 0.05]]);
      let s = H.sky(c, p.waktu, [170, 150, 56]);
      const far = H.inkFar(p.waktu);
      s += `<path d="M0 980 Q300 950 600 970 T1080 950 L1080 1400 L0 1400Z" fill="${far}"/>`;
      s += H.palm(-10, 980, 430, far, 20, 1) + H.palm(1060, 975, 470, far, -24, 2) + H.bamboo(880, 985, 340, far, 3);
      s += `<polygon points="130,0 300,0 760,1000 330,1000" fill="url(#${c.id('beam')})"/>`;
      s += H.pos(540, 1050, 2.1, '#04060a', c.id('p'), false);
      s += `<g stroke="#9fb4d8" stroke-width="2" fill="none" opacity=".45"><path d="M392 400 L470 470 M392 400 L420 520 M392 400 L520 420 M440 430 Q430 460 452 478 M420 460 Q420 490 440 505"/></g>`;
      s += `<rect x="520" y="960" width="180" height="12" rx="6" fill="#04060a" transform="rotate(-8 520 960)"/>`;
      s += `<rect y="1040" width="1080" height="360" fill="#06080e"/>`;
      s += H.semak(120, 1090, 1.3, '#04060a', 4) + H.semak(960, 1100, 1.1, '#04060a', 5) + H.rumput(1070, '#0a0c12', 60, 6);
      s += H.fogs(c.id('1'), 1050, H.fogCol(p.waktu), 1.0, 7) + H.groundMist(1050, 'C', 0.7) + H.fogs(c.id('2'), 1130, H.fogCol(p.waktu), 0.7, 5);
      return s;
    },
    upd(c, t) {
      const [px, py] = H.posPivot(540, 1050, 2.1);
      att(c.id('pk'), 'transform', `rotate(${0.25 * Math.sin(t * 0.9)},${px},${py})`);
      H.fogUpd(c.id('1'), 7, t, 50, 0.22);
    }
  });

  ENG.def('rumah_kosong_pagi', {
    defaults: {}, focus: [540, 880], dust: [220, 225, 230],
    build(c) {
      let s = H.sky(c, 'subuh', null);
      s += `<ellipse cx="780" cy="820" rx="480" ry="220" fill="url(#gFogG)" opacity=".8"/>`;
      s += H.palm(60, 970, 330, '#2a3238', -14, 1) + H.palm(990, 965, 370, '#2a3238', 18, 2) + H.banana(880, 985, 170, '#232a30', 3);
      s += H.house(540, 1010, 620, { ink: '#0d1116', pre: c.id('h'), n: 3, busts: false, dapur: true });
      // pintu terbuka
      s += `<rect id="${c.id('hdoor')}" x="0" y="0" width="0" height="0"/>`;
      s += `<path d="M808 862 L862 862 L862 975 L808 975Z" fill="#050709"/><path d="M808 862 L770 876 L770 988 L808 975Z" fill="#161c22"/>`;
      s += `<rect y="1010" width="1080" height="390" fill="#0d1013"/>`;
      s += H.kandangAyam(150, 1090, 110, '#0b0f13') + H.rumput(1062, '#161b1f', 50, 7);
      s += H.fogs(c.id('1'), 1020, 'G', 1.0, 7) + H.groundMist(1020, 'G', 0.7) + H.fogs(c.id('2'), 1110, 'G', 0.8, 5);
      return s;
    },
    upd(c, t) { H.fogUpd(c.id('1'), 7, t, 45, 0.3); }
  });

  ENG.def('jendela_malam', {
    defaults: { pos_ronda: true, hitungan: 0 }, focus: [540, 640], dust: [255, 215, 160],
    build(c, p) {
      let s = H.sky(c, 'malam', [300, 400, 44]);
      s += `<path d="M150 840 Q400 800 640 830 T930 820 L930 1000 L150 1000Z" fill="#0a111b"/>`;
      s += H.palm(190, 850, 330, '#0a111b', 16, 1) + H.palm(880, 845, 300, '#0a111b', -20, 2) + H.banana(300, 880, 120, '#0a111b', 3);
      if (p.pos_ronda) {
        s += H.rings(c.id('q'), 610, 760, 8);
        s += `<ellipse cx="610" cy="740" rx="170" ry="130" fill="url(#gWarm)" opacity=".5"/>`;
        s += H.pos(610, 840, 0.8, '#050304', c.id('p'), true);
      } else s += H.house(640, 860, 260, { ink: INK, pre: c.id('h'), n: 2, busts: false, teras: false });
      s += H.fogs(c.id('1'), 900, 'C', 0.95, 6);
      // dinding dalam + kusen
      s += `<path fill-rule="evenodd" fill="#0a0604" d="M0 0 H1080 V1400 H0Z M150 260 H930 V1000 H150Z"/>`;
      for (let i = 1; i < 12; i++) s += `<rect x="0" y="${i * 118}" width="1080" height="1.5" fill="#15100b" opacity=".6"/>`;
      s += `<rect x="526" y="260" width="28" height="740" fill="#0a0604"/><rect x="150" y="600" width="780" height="26" fill="#0a0604"/>`;
      s += `<rect x="130" y="240" width="820" height="22" fill="#120b07"/><rect x="130" y="240" width="22" height="780" fill="#120b07"/><rect x="928" y="240" width="22" height="780" fill="#120b07"/>`;
      s += `<rect x="110" y="1000" width="860" height="46" fill="#120a06"/>`;
      // daun jendela terbuka ke dalam (kiri)
      s += `<path d="M152 262 L40 200 L40 1070 L152 1000Z" fill="#070402"/><path d="M60 230 L140 275 M60 1030 L140 985" stroke="#15100b" stroke-width="2"/>`;
      if (p.hitungan > 0) s += H.dots(c.id('d'), 540, 1130, p.hitungan | 0, 100);
      return s;
    },
    upd(c, t, p) {
      if (p.pos_ronda) {
        H.ringsUpd(c.id('q'), 8, t, c.knocks, 0.7, 300);
        const [px, py] = H.posPivot(610, 840, 0.8);
        const k0 = c.knocks.find(x => x >= c.t0 - 0.5);
        att(c.id('pk'), 'transform', `rotate(${(k0 !== undefined ? pulse(t, k0, 2.4) * 2 * Math.sin(t * 9) : 0) + 0.5 * Math.sin(t * 1.3)},${px},${py})`);
      } else { att(c.id('hg0'), 'opacity', 0.5); att(c.id('hr0'), 'opacity', 0.9); }
      if (p.hitungan > 0) H.dotsUpd(c.id('d'), p.hitungan | 0, t, c.knocks);
      H.fogUpd(c.id('1'), 6, t);
    }
  });

  ENG.def('hutan_kabut', {
    defaults: { orang: 1, lentera: true, sosok: false, sosok_jenis: 'bayangan', waktu: 'malam' }, focus: [540, 820], cam: 'geser_kanan', dust: [200, 215, 240],
    build(c, p) {
      let s = H.sky(c, p.waktu, null);
      const R = c.R;
      const cols = p.waktu === 'senja' ? ['#3a1a14', '#1e0e0b', '#0a0504'] : ['#1a2436', '#0d1420', '#05070c'];
      s += `<ellipse cx="540" cy="700" rx="700" ry="380" fill="url(#gFog${H.fogCol(p.waktu)})" opacity=".9"/>`;
      for (let i = 0; i < 7; i++) s += H.tree(i * 170 + R() * 60 - 30, 1060, 900 + R() * 300, 60 + R() * 40, cols[0], 20 + i, { daun: false });
      s += H.fogs(c.id('a'), 900, H.fogCol(p.waktu), 0.8, 5);
      if (p.sosok) s += `<g id="${c.id('ghost')}" opacity="0" transform="translate(820,1040) scale(.42)">${H.sosok(c.id('gs'), p.sosok_jenis, 1)}</g>`;
      for (let i = 0; i < 4; i++) s += H.tree(i * 300 + R() * 120 - 60, 1080, 1000 + R() * 300, 90 + R() * 50, cols[1], 40 + i, { daun: false, akar_gantung: true });
      s += `<path d="M0 1040 Q300 1020 540 1045 T1080 1035 L1080 1400 L0 1400Z" fill="#06080c"/>`;
      s += H.semak(200, 1075, 1.1, '#05070a', 3) + H.semak(760, 1070, 1.0, '#05070a', 4) + H.batu(600, 1080, 0.7, '#05070a') + H.rumput(1064, '#0b0e13', 70, 5);
      s += crew(c, p, cl(p.orang | 0, 0, 3), { kinds: ['pria', 'anak', 'wanita'] });
      s += H.tree(-20, 1400, 1500, 200, cols[2], 60, { daun: false }) + H.tree(1140, 1400, 1450, 190, cols[2], 61, { daun: false });
      s += H.fogs(c.id('b'), 1060, H.fogCol(p.waktu), 0.9, 6) + H.groundMist(1060, H.fogCol(p.waktu), 0.7);
      return s;
    },
    upd(c, t, p) {
      if (c.crew.length) crewUpd(c, t, 260, 1066, 0.64, 1, 28);
      if (p.sosok) { att(c.id('ghost'), 'opacity', ramp(t, c.at(0.45), c.at(0.75)) * 0.95); att(c.id('gse'), 'opacity', ramp(t, c.at(0.8), c.at(0.9))); }
      H.fogUpd(c.id('a'), 5, t, 60, 0.18); H.fogUpd(c.id('b'), 6, t, 40, 0.25);
    }
  });

  ENG.def('kuburan', {
    defaults: { sosok: true, sosok_jenis: 'pocong', waktu: 'malam', orang: 0 }, focus: [540, 900], dust: [200, 210, 230],
    build(c, p) {
      let s = H.sky(c, p.waktu, [820, 260, 60]);
      const far = H.inkFar(p.waktu), R = c.R;
      s += `<path d="M0 960 Q300 920 600 950 T1080 930 L1080 1400 L0 1400Z" fill="${far}"/>`;
      s += H.palm(980, 960, 420, far, -14, 1) + H.bamboo(60, 965, 330, far, 2);
      s += H.kamboja(230, 1010, 520, '#05060a', 3);
      if (p.sosok) s += `<g id="${c.id('ghost')}" opacity="0">${H.sosok(c.id('gs'), p.sosok_jenis, 1)}</g>`;
      s += `<rect y="1000" width="1080" height="400" fill="#07080b"/>`;
      const graves = [[330, 1010, 0.6], [560, 1000, 0.55], [790, 1012, 0.6], [180, 1120, 0.85], [470, 1140, 0.9], [760, 1130, 0.85], [1000, 1110, 0.8], [300, 1290, 1.15], [680, 1300, 1.2]];
      graves.forEach(([x, y, k], i) => s += H.grave(x, y, k, '#07080b', 30 + i));
      s += H.rumput(1066, '#10131a', 50, 8);
      s += crew(c, p, cl(p.orang | 0, 0, 2), { kinds: ['pria', 'bapak'] });
      s += H.fogs(c.id('1'), 1040, H.fogCol(p.waktu), 1.0, 7) + H.groundMist(1040, 'C', 0.8) + H.fogs(c.id('2'), 1180, H.fogCol(p.waktu), 0.7, 5);
      return s;
    },
    upd(c, t, p) {
      if (p.sosok) {
        const a = ramp(t, c.at(0.4), c.at(0.65));
        const hop = p.sosok_jenis === 'pocong' ? Math.abs(Math.sin((t - c.t0) * 3.2)) * 24 * ramp(t, c.at(0.55), c.at(0.6)) : 0;
        const x = 700 - 60 * ramp(t, c.at(0.55), c.t1);
        att(c.id('ghost'), 'transform', `translate(${x},${1010 - hop}) scale(.4)`); att(c.id('ghost'), 'opacity', a * 0.95);
        att(c.id('gse'), 'opacity', ramp(t, c.at(0.75), c.at(0.85)));
      }
      if (c.crew.length) crewUpd(c, t, 120, 1090, 0.55, 1, 16);
      H.fogUpd(c.id('1'), 7, t, 50, 0.2);
    }
  });

  ENG.def('sumur', {
    defaults: { sosok: true, sosok_jenis: 'kuntilanak', waktu: 'malam', orang: 0 }, focus: [540, 840], dust: [200, 210, 230],
    build(c, p) {
      let s = H.sky(c, p.waktu, [240, 280, 54]);
      const far = H.inkFar(p.waktu);
      s += `<path d="M0 950 Q300 920 600 940 T1080 925 L1080 1400 L0 1400Z" fill="${far}"/>`;
      s += H.palm(40, 960, 380, far, 16, 1) + H.palm(1060, 955, 420, far, -18, 2) + H.banana(900, 980, 170, far, 3) + H.bamboo(150, 985, 300, far, 4);
      s += `<rect y="1010" width="1080" height="390" fill="#08080b"/>`;
      s += `<ellipse cx="540" cy="900" rx="320" ry="240" fill="url(#gCold)" opacity=".5"/>`;
      s += `<g fill="#050507"><rect x="372" y="560" width="18" height="430"/><rect x="690" y="560" width="18" height="430"/><rect x="350" y="548" width="380" height="20"/><circle cx="540" cy="590" r="20"/></g>`;
      s += `<g id="${c.id('rope')}"><line x1="540" y1="590" x2="540" y2="820" stroke="#0a0a0c" stroke-width="4"/><path d="M512 820 L568 820 L560 868 L520 868Z" fill="#050507"/></g>`;
      s += `<clipPath id="${c.id('clip')}"><rect x="0" y="0" width="1080" height="904"/></clipPath>`;
      if (p.sosok) s += `<g clip-path="url(#${c.id('clip')})"><g id="${c.id('ghost')}" transform="translate(540,1400) scale(.5)">${H.sosok(c.id('gs'), p.sosok_jenis, 1)}</g></g>`;
      s += `<path d="M380 905 L700 905 L716 1040 L364 1040Z" fill="#0a0a0d"/><ellipse cx="540" cy="905" rx="162" ry="26" fill="#121216"/><ellipse cx="540" cy="907" rx="140" ry="18" fill="#000"/>`;
      for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) s += `<rect x="${372 + i * 56 + (r % 2) * 26}" y="${928 + r * 28}" width="50" height="22" fill="#141418" opacity=".9"/>`;
      s += H.pagarBambu(760, 1040, 300, '#060608') + H.rumput(1060, '#101014', 40, 9);
      s += crew(c, p, cl(p.orang | 0, 0, 1), { kinds: ['wanita'] });
      s += H.fogs(c.id('1'), 1040, H.fogCol(p.waktu), 1.0, 7) + H.groundMist(1040, 'C', 0.6);
      return s;
    },
    upd(c, t, p) {
      att(c.id('rope'), 'transform', `rotate(${3 * Math.sin(t * 1.3)},540,590)`);
      if (p.sosok) {
        const r = ramp(t, c.at(0.4), c.at(0.9));
        att(c.id('ghost'), 'transform', `translate(540,${lerp(1240, 960, r)}) scale(.5)`);
        att(c.id('gse'), 'opacity', ramp(t, c.at(0.85), c.at(0.95)));
      }
      if (c.crew.length) H.poseFigure(c.id('w0'), { jenis: 'wanita', pose: 'diam', phase: t, x: 250, y: 1072, s: 0.62 });
      H.fogUpd(c.id('1'), 7, t, 45, 0.25);
    }
  });

  ENG.def('jalan_setapak', {
    defaults: { orang: 1, lentera: true, sosok: false, sosok_jenis: 'bayangan', waktu: 'malam' }, focus: [540, 880], cam: 'maju', dust: [255, 220, 175],
    build(c, p) {
      let s = H.sky(c, p.waktu, [800, 300, 50]);
      const far = H.inkFar(p.waktu);
      s += `<path d="M0 860 Q300 820 540 840 T1080 830 L1080 1400 L0 1400Z" fill="${far}"/>`;
      s += `<polygon points="520,850 560,850 860,1400 220,1400" fill="#17130f"/>`;
      s += `<polygon points="530,850 550,850 700,1400 380,1400" fill="#1e1913" opacity=".7"/>`;
      [[60, 1120, 640, -10], [220, 960, 420, 14], [380, 880, 240, -8], [880, 1080, 600, 12], [740, 940, 400, -14], [640, 876, 230, 8]].forEach(([x, y, h, l], i) => s += H.palm(x, y, h, '#05060a', l, 10 + i));
      s += H.banana(140, 1000, 160, '#05060a', 2) + H.banana(930, 990, 150, '#05060a', 3) + H.pagarBambu(0, 1140, 200, '#05060a');
      s += H.tiangListrik(900, 1000, 420, '#05060a');
      if (p.sosok) s += `<g id="${c.id('ghost')}" opacity="0" transform="translate(548,862) scale(.16)">${H.sosok(c.id('gs'), p.sosok_jenis, 1)}</g>`;
      c.n = cl(p.orang | 0, 0, 2);
      c.crew = [];
      for (let i = 0; i < c.n; i++) { const jenis = i ? 'anak' : 'pria'; s += H.figure(c.id('w' + i), { jenis, lentera: p.lentera && i === 0, ink: '#030304' }); c.crew.push({ jenis, lentera: p.lentera && i === 0 }); }
      s += H.rumput(1150, '#0b0c10', 40, 7);
      s += H.fogs(c.id('1'), 880, H.fogCol(p.waktu), 0.9, 6);
      return s;
    },
    upd(c, t, p) {
      const k = c.k(t);
      c.crew.forEach((w, i) => {
        const kk = cl(k * 0.9 + 0.05 - i * 0.06);
        const sc = lerp(0.95, 0.42, kk), x = 520 + i * 70 * sc, y = lerp(1300, 1010, kk);
        H.poseFigure(c.id('w' + i), { jenis: w.jenis, lentera: w.lentera, pose: 'jalan', phase: (t + i * 0.3) * 4.6, x, y, s: sc, flip: false });
      });
      if (p.sosok) { att(c.id('ghost'), 'opacity', ramp(t, c.at(0.5), c.at(0.8)) * 0.9); att(c.id('gse'), 'opacity', ramp(t, c.at(0.82), c.at(0.92))); }
      H.fogUpd(c.id('1'), 6, t);
    }
  });
})();

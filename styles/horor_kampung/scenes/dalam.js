/* Adegan dalam ruangan & close-up — style horor_kampung. */
(function () {
  const { H } = ENG; const { att, ramp, nz, pulse, cl, lerp } = H;

  // dinding papan kayu + lantai; mengembalikan markup
  function room(c, o = {}) {
    const wall = o.wall || '#1c120b', floor = o.floor || '#0b0705';
    H.lg(c.id('wall'), [[0, wall], [1, H.lift(wall, -10)]]); H.lg(c.id('floor'), [[0, H.lift(floor, 14)], [1, floor]]);
    let s = `<rect width="1080" height="1400" fill="url(#${c.id('wall')})"/>`;
    for (let i = 0; i < 12; i++) s += `<rect x="${i * 95}" y="0" width="5" height="1400" fill="#030201" opacity=".55"/>`;
    for (let i = 0; i < 9; i++) s += `<rect x="0" y="${120 + i * 110}" width="1080" height="1.5" fill="#000" opacity=".25"/>`;
    s += `<rect x="0" y="0" width="1080" height="200" fill="#060403"/><rect x="0" y="190" width="1080" height="18" fill="#030201"/>`;
    for (let i = 0; i < 6; i++) s += `<rect x="${60 + i * 190}" y="0" width="16" height="200" fill="#030201"/>`;
    if (o.window !== false) {
      const wx = o.wx || 70;
      s += `<rect x="${wx}" y="330" width="210" height="300" fill="#16253f"/><rect x="${wx}" y="330" width="210" height="300" fill="url(#gMoon)" opacity=".3"/>`;
      s += `<rect x="${wx + 96}" y="330" width="12" height="300" fill="#050302"/><rect x="${wx}" y="474" width="210" height="12" fill="#050302"/><rect x="${wx - 10}" y="322" width="230" height="12" fill="#050302"/><rect x="${wx - 10}" y="626" width="230" height="12" fill="#050302"/>`;
      s += `<polygon points="${wx},630 ${wx + 210},630 ${wx + 350},1000 ${wx - 30},1000" fill="#8fa8d0" opacity=".07"/>`;
    }
    s += `<rect y="1000" width="1080" height="400" fill="url(#${c.id('floor')})"/><rect y="996" width="1080" height="6" fill="#170e08"/>`;
    for (let i = 1; i < 8; i++) s += `<rect x="0" y="${1000 + i * 50}" width="1080" height="1.5" fill="#000" opacity=".35"/>`;
    return s;
  }

  ENG.def('kentongan_dekat', {
    defaults: { hitung: 0 }, focus: [540, 640], cam: 'diam', dust: [255, 200, 140],
    camKeys(c) { return [[c.t0, 560, 640, 1.0], [c.t1, 560, 650, 1.04]]; },
    build(c, p) {
      H.lg(c.id('bg'), [[0, '#1b0f07'], [1, '#060302']]); H.rg(c.id('g'), '#ff9d45', 0.8);
      let s = `<rect width="1080" height="1400" fill="url(#${c.id('bg')})"/>`;
      for (let i = 0; i < 9; i++) s += `<rect x="${i * 128 - 20}" y="0" width="124" height="1400" fill="${i % 2 ? '#120a05' : '#180d07'}"/><rect x="${i * 128 + 100}" y="0" width="5" height="1400" fill="#050302"/>`;
      s += `<ellipse id="${c.id('lg')}" cx="540" cy="560" rx="620" ry="520" fill="url(#${c.id('g')})"/>`;
      s += `<rect x="0" y="0" width="1080" height="150" fill="#050302"/><rect x="0" y="0" width="1080" height="40" fill="#030201"/>`;
      s += `<rect x="70" y="150" width="90" height="1250" fill="#0a0604"/>`;
      const n = cl(p.hitung | 0, 0, 5);
      for (let i = 0; i < n; i++) s += `<rect id="${c.id('t' + i)}" x="${88 + i * 15}" y="620" width="7" height="120" rx="3" fill="#ffd9a0" opacity="0"/>`;
      s += `<g id="${c.id('m')}"><line x1="800" y1="150" x2="800" y2="390" stroke="#050302" stroke-width="6"/><rect x="788" y="390" width="26" height="330" rx="12" fill="#050302"/><rect x="772" y="690" width="58" height="96" rx="24" fill="#050302"/></g>`;
      s += H.kent(540, 170, 1.75, '#050302', c.id('k'), 0.95);  // muat di lebar layar penuh
      s += `<rect y="1180" width="1080" height="220" fill="#050302"/>`;
      return s;
    },
    upd(c, t, p) {
      let hit = 0; for (const k of c.knocks.concat(c.synth)) if (t >= k - 0.15 && t < k + 0.4) hit = Math.max(hit, pulse(t, k - 0.15, 0.5));
      att(c.id('k'), 'transform', `rotate(${1.6 * Math.sin(t * 1.4) + hit * 2.5},540,170)`);
      att(c.id('m'), 'transform', `rotate(${-2.2 * Math.sin(t * 1.4 + 0.8) - hit * 9},800,150)`);
      att(c.id('lg'), 'opacity', 0.8 + 0.2 * nz(t, 6));
      att(c.id('ks'), 'opacity', 0.6 + 0.35 * nz(t, 7));
      const n = cl(p.hitung | 0, 0, 5);
      for (let i = 0; i < n; i++) { const tt = c.at(0.5 + 0.38 * i / Math.max(1, n)); att(c.id('t' + i), 'opacity', ramp(t, tt, tt + 0.18) * 0.9); }
    }
  });

  ENG.def('pintu_diketuk', {
    defaults: { ketukan: 2, kaki: true, orang: false }, focus: [540, 700], dust: [200, 220, 255],
    build(c, p) {
      H.lg(c.id('bg'), [[0, '#0c0807'], [1, '#050303']]); H.rg(c.id('l'), '#ffa850', 0.7);
      let s = `<rect width="1080" height="1400" fill="url(#${c.id('bg')})"/>`;
      for (let i = 0; i < 12; i++) s += `<rect x="${i * 95}" y="0" width="4" height="1400" fill="#030202" opacity=".7"/>`;
      s += `<ellipse id="${c.id('lg')}" cx="130" cy="700" rx="380" ry="420" fill="url(#${c.id('l')})" opacity=".7"/>`;
      s += H.lampuTeplok(c.id('lp'), 113, 736, 1, '#0a0604').replace(`id="${c.id('lp')}g"`, `id="${c.id('lpg')}" style="display:none"`);
      s += `<rect x="60" y="736" width="150" height="14" fill="#0a0604"/><rect x="80" y="750" width="10" height="310" fill="#0a0604"/><rect x="180" y="750" width="10" height="310" fill="#0a0604"/>`;
      s += `<rect y="1060" width="1080" height="340" fill="#080504"/><rect y="1056" width="1080" height="5" fill="#120b07"/>`;
      H.lg(c.id('pl'), [[0, '#3a2516'], [0.5, '#2a190e'], [1, '#170d07']], 0, 0, 1, 0);
      s += `<g id="${c.id('d')}"><rect x="326" y="256" width="428" height="808" fill="#0a0604"/>`;
      for (let i = 0; i < 6; i++) { // papan kayu + serat
        s += `<rect x="${328 + i * 71}" y="260" width="69" height="800" fill="url(#${c.id('pl')})" opacity="${i % 2 ? 0.92 : 1}"/>`;
        for (let k = 0; k < 4; k++) s += `<path d="M${340 + i * 71 + k * 14} 270 q${(k % 2 ? 6 : -6)} 390 0 780" stroke="#0e0805" stroke-width="1.6" fill="none" opacity=".55"/>`;
      }
      // palang Z khas pintu kampung
      s += `<rect x="326" y="330" width="428" height="34" fill="#20130a"/><rect x="326" y="930" width="428" height="34" fill="#20130a"/>`;
      s += `<path d="M352 930 L728 364 L752 380 L376 946Z" fill="#1a0f08"/>`;
      s += `<rect x="296" y="640" width="488" height="40" fill="#24160c"/><rect x="296" y="640" width="488" height="5" fill="#4a2e17"/><rect x="296" y="678" width="488" height="4" fill="#050302"/>`;
      // cahaya bulan menyelinap dari celah samping (tipis), cahaya lampu menyapu papan
      s += `<rect x="320" y="262" width="5" height="798" fill="#8fb0e6" opacity=".35"/><rect x="755" y="262" width="4" height="798" fill="#8fb0e6" opacity=".25"/>`;
      s += `<ellipse cx="380" cy="700" rx="260" ry="520" fill="url(#gWarm)" opacity=".18"/>`;
      s += `<rect x="300" y="250" width="480" height="14" fill="#050302"/><rect x="300" y="1060" width="480" height="8" fill="#050302"/>`;
      s += `<rect x="286" y="236" width="508" height="16" fill="#0d0805"/><rect x="286" y="236" width="14" height="830" fill="#0d0805"/><rect x="780" y="236" width="14" height="830" fill="#0d0805"/>`;
      s += `<circle cx="740" cy="680" r="9" fill="#2a1a0c"/></g>`;
      s += `<rect x="310" y="1062" width="460" height="9" fill="#8fb0e6" opacity=".75"/>`;
      s += `<g id="${c.id('ft')}" opacity="0"><ellipse cx="470" cy="1066" rx="46" ry="7" fill="#050302"/><ellipse cx="600" cy="1066" rx="46" ry="7" fill="#050302"/></g>`;
      s += `<ellipse cx="540" cy="1100" rx="320" ry="60" fill="url(#gCold)" opacity=".5"/>`;
      if (p.orang) s += H.figure(c.id('u'), { jenis: 'pria', ink: '#040201' });
      s += H.rings(c.id('rg'), 560, 600, 5);  // gelombang ketukan di papan pintu
      for (let i = 0; i < 10; i++) s += `<rect id="${c.id('du' + i)}" x="${340 + i * 41}" y="262" width="${3 + (i % 3)}" height="${3 + (i % 2) * 2}" fill="#c9b08a" opacity="0"/>`;
      return s;
    },
    upd(c, t, p) {
      att(c.id('lg'), 'opacity', 0.55 + 0.3 * nz(t, 6)); att(c.id('lpf'), 'ry', 12 + 4 * nz(t, 9));
      if (p.kaki) att(c.id('ft'), 'opacity', ramp(t, c.at(0.25), c.at(0.42)));
      let k = 0; c.synth.concat(c.knocks.filter(x => x >= c.t0 && x <= c.t1)).forEach(tt => { if (t > tt) k += Math.sin((t - tt) * 60) * 8 * Math.exp(-(t - tt) * 10); });
      att(c.id('d'), 'transform', `translate(${(k * 1.8).toFixed(2)},0) rotate(${(k * 0.12).toFixed(3)},326,660)`);
      const kn = c.synth.concat(c.knocks.filter(x => x >= c.t0 && x <= c.t1)).sort((x, y) => x - y);
      H.ringsUpd(c.id('rg'), 5, t, kn, 0.7, 260);
      const last = kn.filter(x => x <= t).pop();
      for (let i = 0; i < 10; i++) { const d = last == null ? -1 : t - last - i * 0.03; att(c.id('du' + i), 'opacity', d < 0 || d > 1.2 ? 0 : 0.8 * (1 - d / 1.2)); att(c.id('du' + i), 'y', 262 + Math.max(0, d) * Math.max(0, d) * 420 + (i % 4) * 6); }
      if (p.orang) H.poseFigure(c.id('u'), { jenis: 'pria', pose: 'diam', phase: t, x: 900, y: 1064, s: 1.05, flip: true });
    }
  });

  ENG.def('kamar_lampu', {
    defaults: { lampu_redup_t: null, jenis: 'pria', pose: 'duduk' }, focus: [600, 860], dust: [255, 215, 160],
    build(c, p) {
      let s = room(c, { wall: '#241508' });
      s += `<ellipse id="${c.id('lg')}" cx="840" cy="720" rx="640" ry="620" fill="url(#gWarm)" opacity=".85"/>`;
      s += H.lemari(960, 1000, 160, 520, '#050302');
      s += H.meja(845, 1000, 170, 120, '#050302') + H.lampuTeplok(c.id('lp'), 845, 882, 0.9, '#050302').replace(/<ellipse id="[^"]*lpg"[^>]*\/>/, '');
      s += H.dipan(470, 1000, 300, '#050302');
      s += H.figure(c.id('u'), { jenis: p.jenis in { pria: 1, wanita: 1, bapak: 1, nenek: 1, kakek: 1, anak: 1 } ? p.jenis : 'pria', ink: '#040201' });
      return s;
    },
    upd(c, t, p) {
      let L = 0.75 + 0.2 * nz(t, 6);
      if (p.lampu_redup_t) L *= 1 - 0.45 * ramp(t, p.lampu_redup_t, p.lampu_redup_t + 0.4) + 0.15 * ramp(t, p.lampu_redup_t + 0.8, p.lampu_redup_t + 1.3);
      att(c.id('lg'), 'opacity', L); att(c.id('lpf'), 'ry', (8 + 10 * L * nz(t, 10)).toFixed(2)); att(c.id('lpf'), 'opacity', 0.5 + 0.5 * L);
      const pose = ['duduk', 'menunduk', 'diam', 'berdoa', 'duduk_lantai'].includes(p.pose) ? p.pose : 'duduk';
      const sit = pose === 'duduk'; const y = sit ? 1000 : (pose === 'duduk_lantai' ? 1000 : 1060);
      H.poseFigure(c.id('u'), { jenis: p.jenis, pose, phase: t, x: sit ? 420 : 500, y: sit ? 950 : y, s: 1.0, flip: false });
    }
  });

  ENG.def('meja_makan', {
    defaults: { piring: 4, uap: true }, focus: [540, 840], dust: [230, 230, 220],
    camKeys(c, p, foc, g) { if (g !== 'maju') return null; return [[c.t0, 540, 820, 1.0], [c.at(0.55), 540, 840, 1.06], [c.t1, 450, 860, 1.85]]; },
    build(c, p) {
      H.lg(c.id('bg'), [[0, '#1a1b1c'], [1, '#080808']]);
      H.rawDef(`<linearGradient id="${c.id('st')}" gradientUnits="userSpaceOnUse" x1="0" y1="820" x2="0" y2="560"><stop offset="0" stop-color="#fff6e0" stop-opacity=".6"/><stop offset="1" stop-color="#fff6e0" stop-opacity="0"/></linearGradient>`);
      let s = `<rect width="1080" height="1400" fill="url(#${c.id('bg')})"/>`;
      for (let i = 0; i < 12; i++) s += `<rect x="${i * 95}" y="0" width="4" height="1400" fill="#020202" opacity=".6"/>`;
      s += `<rect x="760" y="240" width="220" height="420" fill="#7e8c9c"/><rect x="860" y="240" width="8" height="420" fill="#050505"/><rect x="760" y="440" width="220" height="8" fill="#050505"/><rect x="750" y="232" width="240" height="10" fill="#050505"/>`;
      s += `<polygon points="760,660 980,660 700,1060 330,1060" fill="#8a97a8" opacity=".14"/>`;
      s += `<rect y="1000" width="1080" height="400" fill="#070707"/>`;
      s += H.lemari(150, 1000, 150, 480, '#050403');
      s += `<rect x="170" y="905" width="740" height="30" fill="#050403"/><rect x="200" y="935" width="20" height="120" fill="#050403"/><rect x="860" y="935" width="20" height="120" fill="#050403"/>`;
      s += `<g transform="rotate(-9 165 1000)">${H.kursi(165, 1070, 0.9, '#050403')}</g><g transform="rotate(6 600 1040)">${H.kursi(600, 1110, 1.0, '#050403')}</g>`;
      const n = cl(p.piring | 0, 1, 5); c.xs = [];
      for (let i = 0; i < n; i++) c.xs.push(170 + 740 * (i + 0.5) / n);
      c.xs.forEach((x, i) => {
        s += `<ellipse cx="${x}" cy="905" rx="76" ry="14" fill="#cdbf9f"/><ellipse cx="${x}" cy="903" rx="60" ry="9" fill="#e9dcc0"/><path d="M${x - 52} 902 Q${x} ${828 - (i % 2) * 8} ${x + 52} 902Z" fill="#f2e8d0"/>`;
        s += `<path d="M${x + 60} 900 l22 -8 l2 6 l-22 8Z" fill="#8a8070" opacity=".6"/>`;
        if (p.uap) s += `<path id="${c.id('s' + i + 'a')}" d="" fill="none" stroke="url(#${c.id('st')})" stroke-width="13" stroke-linecap="round"/><path id="${c.id('s' + i + 'b')}" d="" fill="none" stroke="url(#${c.id('st')})" stroke-width="10" stroke-linecap="round"/>`;
      });
      s += `<ellipse cx="530" cy="900" rx="520" ry="110" fill="url(#gHalo)" opacity=".18"/>`;
      return s;
    },
    upd(c, t, p) {
      if (!p.uap) return;
      const inten = 0.55 + 0.45 * ramp(t, c.at(0.7), c.at(0.9));
      c.xs.forEach((x, i) => ['a', 'b'].forEach((q, j) => {
        let d = `M${x + (j ? 14 : -12)} 822`;
        for (let k = 1; k <= 14; k++) { const y = 822 - k * 18; const xx = x + (j ? 14 : -12) + Math.sin(k * 0.55 + t * 1.6 + i * 1.7 + j * 2) * (6 + k * 1.7); d += ` L${xx.toFixed(1)} ${y}`; }
        att(c.id('s' + i + q), 'd', d); att(c.id('s' + i + q), 'opacity', inten * (0.8 + 0.2 * nz(t + i + j, 4)));
      }));
    }
  });

  ENG.def('kamar_tidur', {
    defaults: { orang_tidur: 2, narator: true, hitungan: 0, sosok: true, sosok_jenis: 'bayangan', sosok_muncul_t: null, lampu_padam_t: null }, focus: [540, 860], dust: [255, 215, 160],
    prep(c, p) {
      if (p.sosok && !p.sosok_muncul_t) p.sosok_muncul_t = c.at(0.65);
      if (p.lampu_padam_t == null && p.hitungan > 0 && c.knocks.length > p.hitungan) p.lampu_padam_t = c.knocks[p.hitungan];
      p.sosok_muncul_t = p.sosok_muncul_t ? cl(p.sosok_muncul_t, c.t0, c.t1 - 1.5) : null;
    },
    camKeys(c, p) {
      this.prep(c, p);
      if (!p.sosok) return [[c.t0, 540, 800, 1.0], [c.t1, 420, 900, 1.35]];
      const m = p.sosok_muncul_t, e = c.t1;
      const keys = [[c.t0, 540, 800, 1.0]];
      if (m - c.t0 > 3) keys.push([c.t0 + (m - c.t0) * 0.5, 420, 900, 1.3]);
      keys.push([m, 560, 860, 1.25], [m + (e - m) * 0.6, 760, 720, 1.6], [e, 770, 680, 1.8]);
      return keys;
    },
    build(c, p) {
      let s = room(c, { wall: '#1c120b' });
      s += `<rect x="790" y="190" width="300" height="820" fill="#070403" opacity=".8"/><rect x="788" y="190" width="5" height="820" fill="#020101"/>`;
      s += `<ellipse id="${c.id('lg')}" cx="450" cy="880" rx="620" ry="520" fill="url(#gWarm)" opacity=".8"/>`;
      s += H.meja(450, 1000, 160, 60, '#050302') + H.lampuTeplok(c.id('lp'), 450, 940, 0.8, '#050302').replace(/<ellipse id="[^"]*lpg"[^>]*\/>/, '');
      s += H.lemari(120, 1000, 150, 470, '#050302');
      const n = cl(p.orang_tidur | 0, 0, 3);
      c.sleep = [];
      const beds = [[200, 1075, 0.85, 'nenek'], [430, 1128, 0.72, 'anak'], [220, 1185, 0.8, 'wanita']];  // di area layar yang terlihat
      for (let i = 0; i < n; i++) {
        const [x, y, k, j] = beds[i];
        s += `<rect x="${x - 10}" y="${y - 14}" width="${300 * k + 40}" height="18" rx="6" fill="#0d0805"/>`; // tikar
        s += H.figure(c.id('n' + i), { jenis: j, ink: '#040201' }); c.sleep.push([x, y, k, j]);
        s += `<path id="${c.id('bl' + i)}" d="M${x + 70 * k} ${y - 2} Q${x + 80 * k} ${y - 60 * k} ${x + 160 * k} ${y - 54 * k} Q${x + 260 * k} ${y - 46 * k} ${x + 310 * k} ${y - 2}Z" fill="#0b0704"/>`; // selimut
      }
      if (p.narator) s += H.figure(c.id('u'), { jenis: 'pria', ink: '#040201' });
      if (p.sosok) {
        s += `<ellipse id="${c.id('bk')}" cx="830" cy="700" rx="280" ry="560" fill="url(#gCold)" opacity="0"/>`;
        const hh = H.sosokTinggi[p.sosok_jenis] || 674, k = Math.min(1.15, 760 / hh) * (p.sosok_jenis === 'tuyul' ? 1.6 : 1);
        s += `<g id="${c.id('f')}" opacity="0" transform="translate(830,1050) scale(${k.toFixed(3)})">${H.sosok(c.id('fs'), p.sosok_jenis, 1)}</g>`;
      }
      s += `<rect id="${c.id('cold')}" width="1080" height="1400" fill="#14213d" opacity="0"/>`;
      if (p.hitungan > 0) s += H.dots(c.id('d'), 540, 1290, p.hitungan | 0, 90);
      return s;
    },
    upd(c, t, p) {
      let L = 0.8 + 0.15 * nz(t, 6);
      if (p.lampu_padam_t) { const cut = ramp(t, p.lampu_padam_t, p.lampu_padam_t + 0.23); L *= 1 - 0.8 * cut; if (t > p.lampu_padam_t + 0.23) L *= 0.9 + 0.4 * nz(t, 14) * (1 - ramp(t, p.lampu_padam_t + 2, p.lampu_padam_t + 6) * 0.5); att(c.id('cold'), 'opacity', 0.38 * ramp(t, p.lampu_padam_t, p.lampu_padam_t + 3)); }
      else if (p.sosok) att(c.id('cold'), 'opacity', 0.3 * ramp(t, p.sosok_muncul_t - 1, p.sosok_muncul_t + 2));
      att(c.id('lg'), 'opacity', cl(L)); att(c.id('lpf'), 'ry', (6 + 10 * cl(L) * nz(t, 10)).toFixed(2)); att(c.id('lpf'), 'opacity', 0.25 + 0.75 * cl(L));
      if (p.sosok) {
        const m = p.sosok_muncul_t;
        att(c.id('f'), 'opacity', ramp(t, m, m + Math.min(3, (c.t1 - m) * 0.5)) * 0.97); att(c.id('bk'), 'opacity', ramp(t, m, m + 2.6) * 0.55);
        const et = m + (c.t1 - m) * 0.62; att(c.id('fse'), 'opacity', ramp(t, et, et + 0.9) * (0.85 + 0.15 * nz(t, 8)));
      }
      if (p.hitungan > 0) H.dotsUpd(c.id('d'), p.hitungan | 0, t, c.knocks);
      c.sleep.forEach(([x, y, k, j], i) => H.poseFigure(c.id('n' + i), { jenis: j, pose: 'tidur', phase: t + i, x: x + 300 * k, y: y - 1 * Math.sin(t * 1.1 + i), s: k, flip: false }));
      if (p.narator) H.poseFigure(c.id('u'), { jenis: 'pria', pose: 'duduk_lantai', phase: t, x: 640, y: 1110, s: 1.2, flip: true });
    }
  });

  ENG.def('sosok_dekat', {
    defaults: { sosok_jenis: 'bayangan' }, focus: [540, 700], cam: 'diam', dust: [190, 205, 240],
    camKeys(c) { return [[c.t0, 540, 700, 1.0], [c.t1, 540, 690, 1.05]]; },
    build(c, p) {
      H.lg(c.id('bg'), [[0, '#05070c'], [1, '#020203']]);
      let s = `<rect width="1080" height="1400" fill="url(#${c.id('bg')})"/>`;
      s += `<ellipse id="${c.id('rim')}" cx="540" cy="620" rx="520" ry="700" fill="url(#gCold)" opacity=".6"/>`;
      const hh = H.sosokTinggi[p.sosok_jenis] || 674; const sc = Math.min(1.6, 980 / hh);
      c.base = 760 + hh * sc * 0.5; c.sc = sc;  // kepala ±y270: tetap terlihat saat kamera mendekat
      s += `<g id="${c.id('g')}" transform="translate(540,${c.base}) scale(${sc})">${H.sosok(c.id('s'), p.sosok_jenis, 1)}</g>`;
      s += H.fogs(c.id('1'), 1250, 'C', 0.9, 6);
      return s;
    },
    upd(c, t, p) {
      const b = 1 + 0.01 * Math.sin(t * 1.1);
      att(c.id('g'), 'transform', `translate(540,${c.base + 4 * Math.sin(t * 0.9)}) scale(${c.sc * b},${c.sc})`);
      att(c.id('rim'), 'opacity', 0.45 + 0.25 * nz(t, 5));
      att(c.id('se'), 'opacity', ramp(t, c.at(0.4), c.at(0.55)) * (0.85 + 0.15 * nz(t, 8)));
      H.fogUpd(c.id('1'), 6, t);
    }
  });

  ENG.def('judul_kartu', {
    defaults: { teks: '', sub: '' }, focus: [540, 700], cam: 'diam', dust: [255, 215, 170],
    camKeys(c) { return [[c.t0, 540, 700, 1.0], [c.t1, 540, 700, 1.06]]; },
    build(c, p) {
      const esc = x => String(x || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
      let s = `<rect width="1080" height="1400" fill="#070404"/>`;
      s += `<ellipse id="${c.id('g')}" cx="540" cy="700" rx="600" ry="460" fill="url(#gWarm)" opacity=".25"/>`;
      s += H.fogs(c.id('1'), 760, 'W', 0.7, 6);
      const t = esc(p.teks).toUpperCase(); const fs = Math.max(40, Math.min(92, Math.floor(580 / (Math.max(1, t.length) * 0.78))));  // area terlihat layar penuh ±787 px
      s += `<text id="${c.id('t')}" x="540" y="720" text-anchor="middle" font-family="'Cormorant Garamond','Noto Serif','DejaVu Serif',serif" font-size="${fs}" letter-spacing="${Math.round(fs * 0.08)}" fill="#efe2c8" ${t.length * fs * 0.78 > 600 ? 'textLength="600" lengthAdjust="spacingAndGlyphs"' : ''}>${t}</text>`;
      if (p.sub) s += `<text x="540" y="800" text-anchor="middle" font-family="'Noto Serif','DejaVu Serif',serif" font-size="${p.sub.length > 26 ? 26 : 34}" letter-spacing="5" fill="#c99a62" opacity=".85">${esc(p.sub).toUpperCase()}</text>`;
      s += `<rect x="390" y="610" width="300" height="2" fill="#c99a62" opacity=".5"/><rect x="390" y="836" width="300" height="2" fill="#c99a62" opacity=".5"/>`;
      return s;
    },
    upd(c, t) { att(c.id('t'), 'opacity', ramp(t, c.t0 + 0.2, c.t0 + 1.2) * (0.85 + 0.15 * nz(t, 11))); att(c.id('g'), 'opacity', 0.2 + 0.1 * nz(t, 6)); H.fogUpd(c.id('1'), 6, t, 60, 0.2); }
  });
})();

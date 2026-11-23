/* Adegan padat aktivitas: ruang pasar, interaksi pedagang/pembeli, memasak yang terbaca. */
(function () {
  const { H } = ENG;
  function market(c, p) {
    let s = H.sky(c, p.waktu, [800, 260, 45]);
    s += '<path d="M0 720 Q540 680 1080 720 V1400 H0Z" fill="#1b1718"/><path d="M470 760 H610 L990 1400 H90Z" fill="#46352a"/>';
    c.stalls = [];
    // Tiga kedalaman: deret toko, kios tengah, komoditas di depan.
    for (let i = 0; i < 7; i++) {
      const x = 30 + i * 170, y = 780 + (i % 2) * 15;
      const id = c.id('shop' + i); c.stalls.push(id);
      s += H.kios(id, x, y, .57, i % 2 ? 'buah' : 'sayur');
    }
    s += '<path d="M0 450 Q540 550 1080 450" stroke="#47382b" stroke-width="4" fill="none"/>';
    for (let i = 0; i < 9; i++) s += `<ellipse cx="${i * 135}" cy="${450 + Math.sin(i / 8 * Math.PI) * 50}" rx="7" ry="11" fill="#ffd69a"/><ellipse cx="${i * 135}" cy="${450 + Math.sin(i / 8 * Math.PI) * 50}" rx="70" ry="80" fill="url(#gWarm)"/>`;
    [[265, 1010, .92], [840, 990, .9]].forEach(([x, y, k], i) => {
      const id = c.id('stall' + i); c.stalls.push(id); s += H.kios(id, x, y, k, i ? 'buah' : 'sayur');
    });
    s += '<path d="M100 1220 l150 -90 M850 1130 l170 90" stroke="#694a31" stroke-width="9"/>';
    s += H.dagangan(250, 1190, 1.3) + H.dagangan(900, 1150, 1.1, 'buah');
    return s;
  }
  function kitchen(c, p) {
    let s = '<rect width="1080" height="1400" fill="#271d18"/>';
    for (let i = 0; i < 13; i++) s += `<path d="M${i * 90} 0 V1400" stroke="#493328" stroke-width="4"/>`;
    s += '<rect x="180" y="320" width="230" height="270" fill="#273e4c"/><path d="M295 320 V590 M180 450 H410" stroke="#0b0909" stroke-width="14"/><rect x="630" y="570" width="330" height="16" fill="#996a42"/>';
    for (let i = 0; i < 6; i++) s += `<path d="M${650 + i * 54} 570 v-60 h25 v60Z" fill="${i % 2 ? '#937347' : '#53644e'}"/>`;
    s += '<path d="M0 1100 H1080 V1400 H0Z" fill="#17100c"/>' + H.meja(830, 1100, 240, 190, '#3c281d') + H.dagangan(830, 920, .8);
    return s;
  }
  H.marketBackdrop = market;
  function def(name, cooking = false, indoor = false) {
    ENG.def(name, {
      defaults: { waktu: 'malam', ramai: 8, sepi: false, pedagang: 'bapak', aksi: indoor ? 'mengaduk' : 'mengipas', aksi_mulai_t: null, lokasi: 'pasar' },
      focus: [540, 880], dust: [225, 185, 135],
      // Bidang lebar menjaga toko, tangan, dan alat masak tetap terlihat pada crop 9:16.
      camKeys(c, p, f, g) {
        const z = g === 'maju' ? 1.10 : 1.02;
        return [[c.t0, 540, 740, g === 'mundur' ? 1.10 : 1.0], [c.t1, g === 'geser_kiri' ? 510 : g === 'geser_kanan' ? 570 : 540, 750, z]];
      },
      build(c, p) {
        let s = indoor ? kitchen(c, p) : market(c, p); c.people = [];
        const count = indoor || p.sepi ? 0 : H.cl(Math.round(+p.ramai || 0), 0, 14);
        for (let i = 0; i < count; i++) {
          const back = i < Math.ceil(count * .6), x = 235 + ((i * 137) % 610), y = back ? 865 + (i % 3) * 24 : 1050 + (i % 2) * 35;
          const jenis = ['wanita', 'pria', 'bapak', 'anak', 'gadis'][i % 5], pose = i % 3 === 0 ? 'berjualan' : 'jalan';
          const id = c.id('crowd' + i); s += H.figure(id, { jenis, rim: '#c5a77d' });
          c.people.push({ id, jenis, x, y, s: back ? .47 : .70, pose, flip: i % 2 === 0, phase: i * 1.7 });
        }
        if (cooking) {
          const id = c.id('cook');
          s += H.figure(id, { jenis: p.pedagang, alat: p.aksi === 'membalik_sate' ? 'tusuk_sate' : indoor ? 'sendok' : 'kipas', rim: '#ffbf73' });
          c.people.push({ id, jenis: p.pedagang, x: 470, y: 1140, s: 1.04, pose: p.aksi, flip: false, phase: 0, main: true });
          s += indoor ? H.panci(c.id('cooker'), 584, 1110, 1.32) : H.panggangan(c.id('cooker'), 606, 1150, 1.02);
          // Nampan sate matang, mangkuk bumbu, piring dan kursi pelanggan.
          s += H.meja(800, 1185, 180, 160, '#38251b');
          s += '<ellipse cx="800" cy="1020" rx="60" ry="13" fill="#c4ad7d"/><path d="M855 1005 h50 q0 38 -25 38 q-25 0 -25 -38Z" fill="#8b6544"/>';
          for (let i = 0; i < 6; i++) s += `<path d="M${765 + i * 12} 1024 l20 -34" stroke="#cb9d62" stroke-width="5"/>`;
        }
        s += H.fogs(c.id('fog'), 1250, H.fogCol(p.waktu), .26, 4);
        return s;
      },
      upd(c, t, p) {
        const active = t >= (p.aksi_mulai_t == null ? c.t0 : p.aksi_mulai_t);
        c.people.forEach(a => {
          const u = Math.max(0, t - c.t0), walk = a.pose === 'jalan';
          const dx = walk ? Math.sin(u * .18 + a.phase) * 65 : 0;
          H.poseFigure(a.id, { ...a, x: a.x + dx, pose: a.main && !active ? 'diam' : a.pose, hand_x: a.main ? (indoor ? 560 : 540) : null, hand_y: a.main ? (indoor ? 927 : 945) : null, phase: (a.main ? Math.max(0, t - (p.aksi_mulai_t == null ? c.t0 : p.aksi_mulai_t)) : u) * 3 + a.phase });
        });
        if (cooking) H.masakUpd(c.id('cooker'), t, active);
        (c.stalls || []).forEach((id, i) => {
          H.att(id + '_light', 'opacity', .48 + .08 * H.nz(t + i, 3));
          H.att(id + '_awning', 'transform', `rotate(${Math.sin(t * 1.2 + i) * .5},0,-385)`);
        });
        H.fogUpd(c.id('fog'), 4, t);
      }
    });
  }
  def('pasar_ramai'); def('bakar_sate', true); def('dapur_memasak', true, true);
})();

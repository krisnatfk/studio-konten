/* Edukasi 3D - template adegan. Semua animasi = fungsi waktu t (detik absolut). */
(function () {
  const THREE = window.THREE;
  const { cl, ease, ramp, lerp, back, pulse, rng } = ENG.H;
  const ZF = K.ZF;
  const def = ENG.def;

  // benda yang bisa ditaruh di tengah adegan; kembalikan {o, top:[x,y,z], bawah:[x,y,z]}
  function benda(c, nama, x = 0, z = ZF - 0.35, o = {}) {
    const R = rng(c.seed + 77);
    let g, top, bawah = null;
    switch (nama) {
      case 'tiang_bambu': case 'tiang_kayu': case 'tiang_beton': case 'tiang_besi': {
        const tinggi = o.tinggi || 9, dalam = o.dalam || 2.6;
        // Bidang potong tanah harus memperlihatkan pangkal yang tertanam.
        z = Math.max(z, ZF + 0.06);
        g = K.tiang(nama.split('_')[1], tinggi, dalam); top = [x, tinggi - 0.6, z]; bawah = [x, -dalam * 0.55, z + 0.25]; break;
      }
      case 'tangga': g = K.tangga(5.5); top = [x, 5, z]; break;
      case 'ember': g = K.ember(); top = [x, 0.5, z]; break;
      case 'pipa': g = K.pipa(7); g.position.y = 0.45; top = [x, 0.5, z]; break;
      case 'batu': g = K.batu(R, 0.9); top = [x, 0.8, z]; break;
      case 'tumpukan_tanah': g = K.tumpukan(R, 1.2); top = [x, 0.7, z]; break;
      case 'balok': g = K.balok(3.2); g.position.y = 0.1; top = [x, 0.3, z]; break;
      case 'bibit': g = K.bibit(); g.scale.setScalar(2); top = [x, 0.9, z]; break;
      case 'isolator': g = K.isolator(); g.scale.setScalar(2.2); top = [x, 1.4, z]; break;
      case 'pohon': g = K.pohon(R, 1.1); top = [x, 3.8, z]; break;
      case 'kelapa': g = K.kelapa(R, 0.9); top = [x, 5.5, z]; break;
      case 'rumah': g = K.rumah({}); top = [x, 3.2, z]; break;
      case 'gubuk': g = K.gubuk(); top = [x, 3, z]; break;
      case 'cofferdam': g = K.cofferdamKotak(o); top = [x, 4.5, z]; bawah = [x, 0.5, z]; break;
      case 'tiang_jembatan': g = K.tiangJembatan(o); top = [x, 5.2, z]; bawah = [x, 0.5, z]; break;
      case 'jembatan': g = K.jembatanLengkap(o.len || 36); top = [x, 6.0, z]; bawah = [x, 0.8, z]; break;
      case 'pompa_air': g = K.pompaAir(o); top = [x, 1.5, z]; break;
      case 'lembaran_baja': g = K.sheetPile(6.8, 0.8); top = [x, 4.2, z]; break;
      case 'kapal': g = K.kapalKontainer(o); top = [x, 3.5, z]; break;
      case 'gerbang': g = K.gerbangBaja(o.w, o.h); top = [x, 4.5, z]; break;
      case 'lock_panama': g = K.lockPanama(o); top = [x, 5.0, z]; break;
      default: return null;
    }
    const wrap = new THREE.Group(); wrap.add(g); K.place(c, wrap, x, z, o);
    return { o: wrap, inner: g, top, bawah };
  }
  const BENDA = ['tidak_ada', 'tiang_bambu', 'tiang_kayu', 'tiang_beton', 'tiang_besi', 'tangga', 'ember', 'pipa', 'batu', 'tumpukan_tanah', 'balok', 'bibit', 'isolator', 'pohon', 'kelapa', 'rumah', 'gubuk', 'cofferdam', 'tiang_jembatan', 'jembatan', 'pompa_air', 'lembaran_baja', 'kapal', 'gerbang', 'lock_panama'];
  K.BENDA = BENDA;

  function frameStandingPole(c, p) {
    // Tiang 9 m perlu ruang di atas header, juga saat kamera maju.
    // Adegan memanjat tetap memakai kamera yang mengikuti pekerja.
    if (!String(p.objek || '').startsWith('tiang_') || c.shotAt) return;
    c.shot.target[1] = 4;
    c.shot.dist = Math.max(32, c.shot.dist);
  }

  // ikon + panah + label umum (dipakai semua template)
  function overlays(c, p, anchor, def_t) {
    c.detailAnchor = anchor;
    const t0 = p.ikon_t != null ? p.ikon_t : c.t0 + Math.min(1.2, c.dur * 0.3);
    if (p.ikon && p.ikon !== 'tidak_ada') K.hudIkon(c, p.ikon, p.ikon_x === 'kiri' ? 230 : 850, 520, t0, { coret: !!p.coret });
    if (p.ikon2 && p.ikon2 !== 'tidak_ada') K.hudIkon(c, p.ikon2, p.ikon_x === 'kiri' ? 850 : 230, 560, t0 + 0.5);
    if (anchor && p.panah) K.hudPanah(c, anchor, p.panah_t != null ? p.panah_t : (def_t || c.t0 + 0.6), p.panah_dari === 'kiri' ? 180 : 0);
    if (anchor && p.label_objek) K.hudLabel(c, anchor, p.label_objek, p.label_t != null ? p.label_t : c.t0 + 0.8, p.panah_dari === 'kiri' ? 150 : -150, -150);
  }
  const tokoh = (c, x, z, ry = 0, o = {}) => { const b = K.orang(o); b.position.set(x, 0, z); b.rotation.y = ry; c.scene.add(b); return b; };

  function worker(c, x, z, pose = 'tunjuk') {
    const o = tokoh(c, x, z, 0.3, { caping: false, baju: '#f28e25' });
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), K.mat('#ffd23f', { roughness: 0.7 }));
    helmet.position.set(0, 0.31, 0);
    o.userData.J.head.add(helmet);
    o.position.y = 0.18;
    o.scale.setScalar(1.15);
    c.upd.push(t => K.pose(o, pose, t));
    return o;
  }

  // Blue flow markers stay inside the portrait safe area and move with camera.
  function riverFlow(c, t0, z) {
    c.hud.push(t => {
      if (t < t0) return '';
      const [cx, cy] = K.toScreen(c, [0, 2.75, z]);
      const x = cl(cx, 300, 780), y = cl(cy, 520, 1050);
      const shift = ((t - t0) * 55) % 70;
      return [-1, 1].map((side, i) => {
        const xx = x + side * 155 + shift - 35;
        const yy = y + (i ? 108 : -108);
        return `<path d="M${xx-58} ${yy-13} H${xx+22} V${yy-30} L${xx+75} ${yy} L${xx+22} ${yy+30} V${yy+13} H${xx-58} Z" fill="#249add" stroke="#fff" stroke-width="6" stroke-linejoin="round" opacity=".88"/>`;
      }).join('');
    });
  }

  /* ---------- pembuka: establishing shot ---------- */
  def('pembuka', {
    gerak: 'maju',
    build(c, p) {
      K.latar(c, p.latar, {});
      const b = p.objek && p.objek !== 'tidak_ada' ? benda(c, p.objek, 1.3, ZF - 0.4) : null;
      if (p.tokoh) { const o = tokoh(c, -0.9, 2.2, 0.5); c.upd.push(t => K.pose(o, 'berdiri', t)); }
      c.shot = { target: [0, 1.4, 0], dist: 30, yaw: 0, pitch: 6 };
      frameStandingPole(c, p);
      // Bawah tiang tertutup tanah pada establishing shot; callout harus menunjuk bagian terlihat.
      overlays(c, p, b && (b.bawah ? [b.top[0], b.top[1] * 0.55, b.top[2] + 0.2] : b.top));
    },
  });

  /* ---------- aktivitas tokoh ---------- */
  def('aktivitas', {
    gerak: 'maju',
    build(c, p) {
      const aksi = p.aksi || 'berdiri';
      const xT = 0, zT = aksi === 'gali' ? 1.9 : 1.6;
      const PIT = { x: xT + 0.75, y: -1.5, w: 1.15, h: 1.5 };
      K.latar(c, p.latar, aksi === 'gali' ? { lubang: [PIT], tebal: 1.5, dinding: '#5a3520' } : {});
      const o = tokoh(c, xT, zT, aksi === 'panjat' ? Math.PI : 0.35, { caping: p.caping !== false });
      let anchor = [xT, 1.4, zT], fT = [xT, 1.2, zT];
      const J = o.userData.J;
      const b = p.objek && p.objek !== 'tidak_ada' && aksi !== 'panjat' ? benda(c, p.objek, xT + 1.6, zT - 0.6) : null;
      if (b) anchor = b.top;
      const jarak = p.jarak || 'sedang';
      let dist = jarak === 'dekat' ? 6.5 : jarak === 'lebar' ? 22 : 10.5;
      if (aksi === 'gali') {
        const alat = K.cangkul(); alat.rotation.x = Math.PI / 2; alat.position.set(0, -0.02, 0.05); J.handR.add(alat);
        o.position.z = zT; o.rotation.y = 0.6;
        // isi lubang yang berkurang seiring galian -> lubang di potongan makin dalam
        const fill = K.mesh(new THREE.BoxGeometry(PIT.w, 1, 1.5), K.mat('#6a4127', { roughness: 1 }), false, true); c.scene.add(fill);
        const pile = K.tumpukan(rng(c.seed), 0.8); pile.position.set(xT - 1.3, 0, zT - 0.3); c.scene.add(pile);
        const strikes = []; for (let s = c.t0 + 0.75; s < c.t1; s += 1.15) strikes.push(s);
        K.serpih(c, [PIT.x, 0.1, K.ZF - 0.8], strikes, '#6a4428', 6);
        c.upd.push(t => { const d = ramp(t, c.t0, c.t1); const hgt = Math.max(0.001, PIT.h * (1 - (0.25 + 0.7 * d))); fill.scale.y = hgt; fill.position.set(PIT.x, PIT.y + hgt / 2, K.ZF - 0.75); pile.scale.setScalar(0.4 + 0.8 * d); });
        anchor = [PIT.x + 0.3, -0.05, K.ZF];
      } else if (aksi === 'tanam') {
        o.rotation.y = 0.2;
        const n = 6, R = rng(c.seed);
        const seeds = []; for (let i = 0; i < n; i++) { const s = K.bibit(); s.position.set(xT - 0.8 + i * 0.5, 0, zT + 0.7); s.scale.setScalar(0.001); c.scene.add(s); seeds.push([s, c.t0 + 0.6 + i * (c.dur - 1) / n]); }
        c.upd.push(t => { for (const [s, ts] of seeds) s.scale.setScalar(Math.max(0.001, 1.6 * back(cl((t - ts) / 0.4)))); o.position.x = xT + 0.5 * ramp(t, c.t0, c.t1); });
      } else if (aksi === 'angkat') {
        const bl = K.balok(3); bl.rotation.y = Math.PI / 2; bl.position.set(0.25, 0.72, 0.0); J.spine.add(bl);
        o.rotation.y = Math.PI / 2;
        c.upd.push(t => { o.position.x = lerp(-2.6, 2.6, (t - c.t0) / c.dur); });
        c.shotAt = t => ({ target: [o.position.x * 0.8, 1.2, zT], dist, yaw: 12, pitch: 3 });
      } else if (aksi === 'jalan' || aksi === 'dorong') {
        o.rotation.y = Math.PI / 2;
        if (aksi === 'dorong') { const e = K.ember('#e0862a'); e.scale.setScalar(1.4); c.scene.add(e); c.upd.push(t => e.position.set(o.position.x + 0.85, 0, zT)); }
        c.upd.push(t => { o.position.x = lerp(-2.8, 2.4, (t - c.t0) / c.dur); });
        c.shotAt = t => ({ target: [o.position.x * 0.7, 1.1, zT], dist, yaw: 10, pitch: 3 });
      } else if (aksi === 'panjat') {
        const tiang = benda(c, p.objek && p.objek.startsWith('tiang') ? p.objek : 'tiang_bambu', 0, zT - 0.7, { tinggi: 9 });
        const tg = K.tangga(7.2); tg.position.set(0, 0, zT - 0.2); tg.rotation.x = -0.09; c.scene.add(tg);
        o.rotation.y = Math.PI; o.position.z = zT + 0.32;
        c.upd.push(t => { const h = lerp(0.2, 4.6, ramp(t, c.t0 + 0.2, c.t1 - 0.3)); o.position.y = h; o.position.z = zT + 0.32 + h * 0.09; });
        c.shotAt = t => ({ target: [0, o.position.y + 1.4, zT], dist: Math.min(dist, 9), yaw: 28, pitch: -4 });
        anchor = tiang.top; fT = tiang.top;
      } else if (aksi === 'tunjuk' && b) {
        o.rotation.y = 1.1;
      }
      c.upd.push(t => K.pose(o, aksi === 'dorong' ? 'dorong' : aksi, t - c.t0, (p.aksi_t != null ? p.aksi_t : c.t0 + 0.3) - c.t0));
      if (!c.shotAt) c.shot = { target: [xT + (b ? 0.8 : aksi === 'gali' ? 0.4 : 0), jarak === 'lebar' ? 1.6 : aksi === 'gali' ? 0.5 : 1.05, zT + (aksi === 'gali' ? 1 : 0)], dist, yaw: 14, pitch: jarak === 'lebar' ? 6 : 3 };
      frameStandingPole(c, p);
      if (p.hujan) K.hujan(c, 1);
      overlays(c, p, anchor);
    },
  });

  /* ---------- bawah tanah: potongan tanah dekat ---------- */
  def('bawah_tanah', {
    gerak: 'diam',
    build(c, p) {
      const isi = p.isi || 'tiang_bambu';
      const HOLE = isi === 'terowongan' ? { x: 0, y: -6.4, w: 4.4, h: 2.7, belakang: '#6e3018' } : isi === 'lubang' ? { x: 0, y: -2.6, w: 1.3, h: 2.6 } : null;
      K.latar(c, p.latar, HOLE ? { lubang: [HOLE], tebal: isi === 'terowongan' ? 3.4 : 1.6, dinding: isi === 'terowongan' ? '#94452a' : '#4a2c1a' } : {});
      let anchor = [0, -2, ZF + 0.2];
      const t0 = c.t0;
      if (isi.startsWith('tiang')) {
        const b = benda(c, isi, 0, ZF - 0.05, { tinggi: 6, dalam: 3.2 }); anchor = [0.25, -1.8, ZF + 0.25];
        if (p.efek === 'lapuk') { const m = b.inner.children[0].material = b.inner.children[0].material.clone(); const base = m.color.clone(); c.upd.push(t => { m.color.copy(base).lerp(new THREE.Color('#3a2a1a'), 0.75 * ramp(t, t0 + 0.6, t0 + 2.6)); }); }
        if (p.efek === 'lembap' || p.efek === 'rembes') { const col = p.efek === 'rembes' ? '#7cc6ff' : '#ffffff'; K.bintik(c, -0.16, 0.16, -3.0, -0.2, ZF + 0.2, t0 + 0.5, col, 22); K.bintik(c, -1.1, 1.1, -3.2, -0.4, ZF + 0.06, t0 + 0.9, col, 18); }
        if (p.efek === 'amblas') c.upd.push(t => { b.o.position.y = -0.9 * ramp(t, t0 + 0.8, t0 + 2.2); b.o.rotation.z = 0.12 * ramp(t, t0 + 1.2, t0 + 2.4); });
      } else if (isi === 'pipa') {
        const pp = K.pipa(14, 0.5, '#8fb3c9'); pp.position.set(0, -2.4, ZF - 0.2); c.scene.add(pp); anchor = [0, -2.4, ZF + 0.3];
        if (p.efek === 'rembes') K.bintik(c, -2.5, 2.5, -3.6, -1.4, ZF + 0.05, t0 + 0.5, '#7cc6ff', 40);
      } else if (isi === 'akar') {
        const R = rng(c.seed + 4); const m = K.mat('#8a5a33');
        const tr = K.pohon(R, 1.2); tr.position.set(0, 0, ZF - 1.2); c.scene.add(tr);
        const roots = [];
        for (let i = 0; i < 9; i++) {
          const pts = [new THREE.Vector3(0, 0, ZF - 0.1)]; let x = 0, y = 0; const dir = (i - 4) * 0.35;
          for (let k = 0; k < 6; k++) { x += dir * 0.6 + (R() - 0.5) * 0.4; y -= 0.45 + R() * 0.35; pts.push(new THREE.Vector3(x, y, ZF - 0.1)); }
          const tube = K.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.09 - i * 0.004, 6), m); c.scene.add(tube); roots.push(tube);
        }
        c.upd.push(t => { const k = ramp(t, t0 + 0.2, t0 + 2.2); for (const r of roots) r.geometry.setDrawRange(0, Math.floor(r.geometry.index.count * k / 6) * 6); });
        anchor = [0.6, -2.4, ZF + 0.1];
      } else if (isi === 'fondasi') {
        const f = K.mesh(new THREE.BoxGeometry(3.4, 2.2, 1.4), K.mat('#a9a69e', { roughness: 0.95 })); f.position.set(0, -1.1, ZF - 0.5); c.scene.add(f);
        const pl = K.mesh(new THREE.BoxGeometry(0.6, 3, 0.6), K.mat('#b9b6ae')); pl.position.set(0, 1.5, ZF - 0.5); c.scene.add(pl);
        for (let i = -1; i <= 1; i++) { const r = K.mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.1, 5), K.mat('#7a5240', { metalness: 0.5 })); r.position.set(i * 1.1, -1.1, ZF + 0.22); c.scene.add(r); }
        anchor = [0, -1.1, ZF + 0.2];
      } else if (isi === 'air_tanah') {
        const w = K.mesh(new THREE.BoxGeometry(60, 1, 1), new THREE.MeshStandardMaterial({ color: '#3a8fe0', transparent: true, opacity: 0.72, roughness: 0.2 }), false, false); w.position.set(0, -6, ZF - 0.3); c.scene.add(w);
        c.upd.push(t => { const h = lerp(0.6, 2.6, ramp(t, t0 + 0.5, c.t1)); w.scale.y = h; w.position.y = -7 + h / 2 + (p.efek === 'rembes' ? 2.5 * ramp(t, t0 + 0.5, c.t1) : 0); });
        anchor = [0, -5.6, ZF + 0.2];
      } else if (isi === 'lubang' || isi === 'terowongan') {
        const { w: W, h: Hh, y: y0 } = HOLE;
        if (isi === 'terowongan') {
          // rangka penyangga kayu muncul satu per satu (solusi_cue)
          const props = [], ts0 = p.solusi_t != null ? p.solusi_t : t0 + 0.8, wood = K.mat('#d0a258');
          for (let i = 0; i < 4; i++) {
            const g = new THREE.Group(); const x = -1.65 + i * 1.1;
            const post = K.mesh(new THREE.BoxGeometry(0.2, Hh, 0.2), wood); post.position.y = Hh / 2; g.add(post);
            g.position.set(x, y0, ZF - 0.35); g.scale.y = 0.001; c.scene.add(g); props.push([g, ts0 + i * 0.3]);
          }
          const beam = K.mesh(new THREE.BoxGeometry(W, 0.22, 0.24), K.mat('#b88a46')); beam.position.set(0, y0 + Hh - 0.11, ZF - 0.35); c.scene.add(beam);
          c.upd.push(t => { for (const [g, ts] of props) g.scale.y = Math.max(0.001, back(cl((t - ts) / 0.35))); beam.scale.x = Math.max(0.001, ramp(t, props[0][1], props[3][1] + 0.3)); });
          const o = tokoh(c, 1.2, ZF - 1.8, -0.5, { caping: false }); o.position.y = y0; c.upd.push(t => K.pose(o, 'gali', t));
          const alat = K.cangkul(); alat.rotation.x = Math.PI / 2; o.userData.J.handR.add(alat);
        } else {
          const o = tokoh(c, 0, ZF - 0.8, 0.3); o.position.y = y0; c.upd.push(t => K.pose(o, 'tunjuk', t)); o.userData.J.head.rotation.x = -0.3;
        }
        anchor = [0, y0 + Hh * 0.6, ZF];
      } else if (isi === 'batu') {
        const R = rng(c.seed); for (let i = 0; i < 7; i++) { const b = K.batu(R, 0.5 + R() * 0.7); b.position.set((R() - 0.5) * 6, -1.5 - R() * 4, ZF - 0.3); c.scene.add(b); }
        anchor = [0, -3, ZF + 0.3];
      }
      c.shot = { target: [0, isi === 'air_tanah' ? -4.6 : isi === 'terowongan' ? -4.2 : -1.6, ZF], dist: 13, yaw: isi === 'terowongan' ? 6 : 0, pitch: 2 };
      overlays(c, p, anchor);
    },
  });

  /* ---------- masalah: sesuatu gagal ---------- */
  def('masalah', {
    gerak: 'diam',
    build(c, p) {
      const kej = p.kejadian || 'rubuh';
      const TUN = { x: 0, y: -5.6, w: 4.4, h: 2.7, belakang: '#6e3018' };
      K.latar(c, p.latar, kej === 'runtuh' ? { lubang: [TUN], tebal: 3.4, dinding: '#94452a' } : {});
      const tk = p.kejadian_t != null ? p.kejadian_t : c.t0 + Math.min(1.4, c.dur * 0.35);
      let anchor = [0, 2, ZF];
      if (p.tokoh !== false && kej !== 'runtuh') { const o = tokoh(c, -2.1, 1.6, 0.6); c.upd.push(t => K.pose(o, t > tk + 0.15 ? 'kaget' : 'berdiri', t, tk + 0.15)); }
      if (kej === 'rubuh' || kej === 'lapuk') {
        const b = benda(c, p.objek && p.objek.startsWith('tiang') ? p.objek : 'tiang_bambu', 0.6, ZF - 0.5, { tinggi: 8, dalam: 1.5 });
        const poleZ = b.o.position.z;
        const pivot = new THREE.Group(); pivot.position.set(0.6, 0, poleZ); c.scene.add(pivot); b.o.position.set(0, 0, 0); pivot.add(b.o);
        if (kej === 'lapuk') { const m = b.inner.children[0].material = b.inner.children[0].material.clone(); const base = m.color.clone(); c.upd.push(t => m.color.copy(base).lerp(new THREE.Color('#3b2a1c'), 0.7 * ramp(t, c.t0, tk))); }
        if (kej === 'rubuh') {
          c.upd.push(t => { const d = t - tk; let a = 0; if (d > 0) { a = Math.min(1.45, 0.5 * 3.2 * d * d); if (a >= 1.45) a = 1.45 - 0.06 * Math.abs(Math.sin((d - 0.95) * 9)) * Math.exp(-(d - 0.95) * 3); } pivot.rotation.z = -a; pivot.rotation.x = 0.04 * a; });
          K.serpih(c, [4.5, 0.2, poleZ], [tk + 0.92], '#8a6a3c', 14);
          K.hudBunyi(c, p.bunyi || 'BRUK!', 700, 860, tk + 0.92);
        }
        anchor = [0.6, 0.4, poleZ + 0.2];
      } else if (kej === 'runtuh') {
        const { w: W, h: Hh, y: y0 } = TUN;
        const R = rng(c.seed); const rocks = [];
        const dirt = ['#7a4426', '#8f5a34', '#a8703f', '#6b3a20'];
        for (let i = 0; i < 34; i++) { const r = K.mesh(K.geo('rock', () => new THREE.DodecahedronGeometry(1, 0)), K.mat(dirt[i % 4], { flatShading: true })); const k = 0.16 + R() * 0.32; r.scale.set(k * 1.2, k, k); const x = (R() - 0.5) * W * 0.85, ys = y0 + Hh - 0.1 - R() * 0.3, z = ZF - 0.4 - R() * 2.6; r.position.set(x, ys, z); r.visible = false; c.scene.add(r); rocks.push([r, ys, y0 + k * 0.7 + R() * 0.5 * (1 - Math.abs(x) / W), tk + R() * 0.45]); }
        c.upd.push(t => { for (const [r, ys, ye, ts] of rocks) { const d = t - ts; r.visible = d > 0; if (d > 0) { r.position.y = Math.max(ye, ys - 7 * d * d); r.rotation.z = Math.min(d, 0.6) * 4; } } });
        const o = tokoh(c, 1.3, ZF - 2.2, -0.5, { caping: false }); o.position.y = y0; c.upd.push(t => K.pose(o, t > tk ? 'kaget' : 'gali', t, tk));
        const alat = K.cangkul(); alat.rotation.x = Math.PI / 2; o.userData.J.handR.add(alat);
        anchor = [0, y0 + Hh, ZF + 0.2];
        c.shot = { target: [0, y0 + 1.6, ZF], dist: 13, yaw: 0, pitch: 3 };
        K.hudBunyi(c, p.bunyi || 'BRUK!', 600, 700, tk + 0.25);
      } else if (kej === 'banjir') {
        const w = K.mesh(new THREE.BoxGeometry(60, 1, 40), new THREE.MeshStandardMaterial({ color: '#5aa0d8', transparent: true, opacity: 0.8, roughness: 0.1 }), false, false); w.position.set(0, 0, ZF - 20); c.scene.add(w);
        c.upd.push(t => { const h = 0.05 + 1.3 * ramp(t, tk, c.t1); w.scale.y = h; w.position.y = h / 2; });
        K.hujan(c, 1); anchor = [0, 0.6, ZF];
      } else if (kej === 'korsleting') {
        const b = benda(c, 'tiang_kayu', 0.4, ZF - 0.5, { tinggi: 8, dalam: 1.5 }); K.hujan(c, 1);
        const sp = new THREE.PointLight('#7fd8ff', 0, 8); sp.position.set(0.4, 7.5, ZF); c.scene.add(sp);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: K.tex('spark', 128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(140,230,255,.9)'); g.addColorStop(1, 'rgba(60,160,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.position.set(0.4, 7.45, ZF); c.scene.add(glow);
        c.upd.push(t => { const on = t > tk ? (0.55 + 0.45 * Math.sin(t * 47) * Math.sin(t * 13)) : 0; sp.intensity = 30 * on; glow.scale.setScalar(1.3 * on + 0.001); });
        anchor = [0.4, 7.4, ZF]; c.shot = { target: [0, 3.6, 0], dist: 20, yaw: 0, pitch: -1 };
        K.hudIkon(c, 'petir', 820, 560, tk + 0.2);
      } else if (kej === 'kekeringan') {
        K.hudIkon(c, 'matahari', 820, 470, c.t0 + 0.3, { s: 1.15 }); K.hudIkon(c, 'termometer', 220, 600, tk);
        anchor = [0, 0, ZF];
      } else if (kej === 'hujan') { K.hujan(c, 1.2); anchor = [0, 1, ZF]; }
      if (p.hujan && !['banjir', 'korsleting', 'hujan'].includes(kej)) K.hujan(c, 1);
      if (c.shot.dist === 30) c.shot = { target: [0, 2.4, 0], dist: 24, yaw: 0, pitch: 4 };
      frameStandingPole(c, p);
      overlays(c, p, anchor, tk + 1);
    },
  });

  /* ---------- detail benda: close-up berputar + label ---------- */
  def('detail', {
    gerak: 'diam',
    build(c, p) {
      K.latar(c, p.latar, {});
      const nama = p.benda && p.benda !== 'tidak_ada' ? p.benda : 'isolator';
      const ped = new THREE.Group(); ped.position.set(0, 0.02, 1.6); c.scene.add(ped);
      const stand = K.mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.2, 32), K.mat('#f1ede4')); stand.position.y = 0.12; ped.add(stand);
      const b = benda(c, nama, 0, 0, nama.startsWith('tiang') ? { tinggi: 2.4, dalam: 0.01 } : {});
      c.scene.remove(b.o); b.o.position.set(0, 0.25, 0); ped.add(b.o);
      const box = new THREE.Box3().setFromObject(b.o); const hgt = box.max.y - box.min.y || 1;
      const sc = 1.35 / Math.max(hgt, (box.max.x - box.min.x) * 0.8); b.o.scale.setScalar(sc);
      c.upd.push(t => { ped.rotation.y = (t - c.t0) * 0.55; });
      ped.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(b.o);
      c.fokus = ped;
      c.shot = { target: [0, 0.78, 1.6], dist: 8.2, yaw: 0, pitch: 10 };
      if (p.hujan) K.hujan(c, 1);
      (Array.isArray(p.bagian) ? p.bagian : []).slice(0, 3).forEach((it, i) => {
        if (!it || !it.teks) return;
        const f = [0.78, 0.45, 0.15][i], y = lerp(bb.min.y, bb.max.y, f), side = i % 2 ? -1 : 1;
        K.hudLabel(c, [side * (bb.max.x - bb.min.x) * 0.22, y, 1.6 + (bb.max.z - bb.min.z) * 0.3], it.teks, it.t != null ? it.t : c.t0 + 0.6 + i * 0.9, side * 170, -70, { size: 52 });
      });
      overlays(c, p, null);
    },
  });

  /* ---------- bandingkan: kiri vs kanan ---------- */
  def('bandingkan', {
    gerak: 'diam',
    build(c, p) {
      K.latar(c, p.latar, {});
      const L = benda(c, p.kiri && p.kiri !== 'tidak_ada' ? p.kiri : 'tiang_bambu', -1.35, ZF - 0.6, { tinggi: 4.2, dalam: 2 });
      const Rr = benda(c, p.kanan && p.kanan !== 'tidak_ada' ? p.kanan : 'tiang_beton', 1.35, ZF - 0.6, { tinggi: 4.2, dalam: 2 });
      c.shot = { target: [0, 1.0, 0], dist: 19, yaw: 0, pitch: 4 };
      const kanan = p.pemenang !== 'kiri';
      const tL = p.kiri_t != null ? p.kiri_t : c.t0 + 0.5, tR = p.kanan_t != null ? p.kanan_t : c.t0 + Math.max(1.2, c.dur * 0.45);
      K.hudLabel(c, L.top, p.teks_kiri || '', tL, 40, -150, { size: 50 });
      K.hudLabel(c, Rr.top, p.teks_kanan || '', tR, -40, -150, { size: 50 });
      K.hudIkon(c, kanan ? 'silang' : 'centang', 300, 1180, tL + 0.4, { s: 0.75 });
      K.hudIkon(c, kanan ? 'centang' : 'silang', 780, 1180, tR + 0.4, { s: 0.75 });
    },
  });

  /* ---------- angka besar ---------- */
  def('angka', {
    gerak: 'maju',
    build(c, p) {
      K.latar(c, p.latar, {});
      if (p.objek && p.objek !== 'tidak_ada') benda(c, p.objek, 0, ZF - 0.6);
      c.shot = { target: [0, 2.6, 0], dist: 26, yaw: 0, pitch: 3 };
      K.hudAngka(c, p.nilai || '0', p.keterangan || '', p.nilai_t != null ? p.nilai_t : c.t0 + 0.4);
      overlays(c, p, null);
    },
  });

  /* ---------- penutup ---------- */
  def('penutup', {
    gerak: 'mundur',
    build(c, p) {
      K.latar(c, p.latar, {});
      if (p.objek && p.objek !== 'tidak_ada') benda(c, p.objek, 2.3, ZF - 0.5);
      const o = tokoh(c, -0.5, 1.8, 0.2); c.upd.push(t => K.pose(o, 'lapor', t));
      c.shot = { target: [0, 1.6, 0], dist: 20, yaw: 0, pitch: 6 };
      frameStandingPole(c, p);
      overlays(c, p, null);
    },
  });

  /* ---------- cofferdam: tahapan konstruksi tiang jembatan di sungai ---------- */
  def('cofferdam', {
    gerak: 'maju',
    build(c, p) {
      const tahap = p.tahap || 'tancap';
      K.latar(c, p.latar || 'sungai', { riverCutout: !['sungai_deras', 'rencana_jembatan', 'rencana_tiang', 'jembatan_selesai'].includes(tahap) });
      const cBox = K.cofferdamKotak();
      cBox.position.set(0, 0, ZF - 2.5);
      c.scene.add(cBox);

      const walls = cBox.userData.walls;
      const inWater = cBox.userData.innerWater;
      const bracing = cBox.userData.bracing;
      const footing = cBox.userData.footing;
      const pump = cBox.userData.pump;

      // A removable front face makes the inner process readable in portrait
      // framing while the other three sides retain the enclosure's shape.
      if (['sedot', 'kering', 'rangka', 'cor_tiang'].includes(tahap) || (tahap === 'kotak_penuh' && p.lihat_air)) {
        walls.children[0].visible = false;
      }

      let anchor = [0, 2.5, ZF - 2.5];

      if (tahap === 'sungai_deras') {
        cBox.visible = false;
        c.shot = { target: [0, 1.8, ZF - 2], dist: 28, yaw: 15, pitch: 12 };
        anchor = [0, 2.0, ZF - 2];
        if (p.arus) {
          riverFlow(c, c.t0 + 0.05, ZF - 2.5);
          c.hud.push(t => {
            if (t < (p.kedalaman_t ?? c.t0 + 0.15)) return '';
            const [x1, y1] = K.toScreen(c, [2.5, 2.6, ZF - 2.5]);
            const [x2, y2] = K.toScreen(c, [2.5, 0, ZF - 2.5]);
            const x = cl(x1, 540, 850), top = Math.min(y1, y2), bot = Math.max(y1, y2);
            return `<g stroke="#fff" stroke-width="6" fill="none" filter="url(#sh)"><line x1="${x}" y1="${top}" x2="${x}" y2="${bot}"/><path d="M${x-15} ${top+22} L${x} ${top} L${x+15} ${top+22} M${x-15} ${bot-22} L${x} ${bot} L${x+15} ${bot-22}"/></g><text x="${x-30}" y="${bot+56}" text-anchor="end" fill="#fff" stroke="#17181c" stroke-width="8" paint-order="stroke" font-size="42" font-weight="800">Beberapa meter</text>`;
          });
        }
      } else if (tahap === 'rencana_jembatan') {
        cBox.visible = false;
        const bridge = K.jembatanLengkap();
        bridge.position.set(0, 0, ZF - 2.5);
        bridge.traverse(o => { if (o.isMesh) {
          o.material = o.material.clone();
          o.material.transparent = true;
          o.material.opacity = 0.86;
          o.material.depthWrite = false;
        }});
        c.scene.add(bridge);
        c.shot = { target: [0, 4.0, ZF - 2.5], dist: 40, yaw: 22, pitch: 18 };
        c.upd.push(t => { bridge.position.y = -0.45 + 0.45 * ramp(t, c.t0 + 0.1, c.t1 - 0.2); });
        anchor = [0, 7.8, ZF - 2.5];
      } else if (tahap === 'rencana_tiang') {
        cBox.visible = false;
        const ghost = K.tiangJembatan();
        ghost.position.set(0, 0, ZF - 2.5);
        ghost.traverse(o => { if (o.isMesh) {
          o.material = o.material.clone();
          o.material.transparent = true;
          o.material.opacity = 0.83;
          o.material.depthWrite = false;
        }});
        c.scene.add(ghost);
        c.shot = { target: [0, 4.4, ZF - 2.5], dist: 29, yaw: 18, pitch: 18 };
        riverFlow(c, c.t0 + 0.1, ZF - 2.5);
        anchor = [0, 6.4, ZF - 2.5];
      } else if (tahap === 'gali_gagal') {
        cBox.visible = false;
        const z = ZF - 2.5;
        const rimMat = K.mat('#a9764a', { roughness: 1, side: THREE.DoubleSide }).clone();
        rimMat.transparent = true;
        const rim = new THREE.Mesh(new THREE.RingGeometry(1.45, 2.45, 40), rimMat);
        rim.rotation.x = -Math.PI / 2;
        rim.position.set(0, 2.78, z);
        c.scene.add(rim);
        for (const [radius, color, side] of [[2.45, '#765137', THREE.FrontSide], [1.45, '#b18258', THREE.DoubleSide]]) {
          const wall = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 2.4, 40, 1, true), K.mat(color, { roughness: 1, side }));
          wall.position.set(0, 1.55, z);
          c.scene.add(wall);
        }
        const water = new THREE.Mesh(new THREE.CylinderGeometry(1.41, 1.41, 0.18, 40), K.mat('#70c7e3', { roughness: 0.25 }));
        water.position.set(0, 1.0, z);
        c.scene.add(water);
        const chunks = [];
        if (p.runtuh) for (let i = 0; i < 5; i++) {
          const a = i * Math.PI * 2 / 5;
          const chunk = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.62, 0.7), K.mat('#9b6945', { roughness: 1 }));
          chunk.position.set(Math.cos(a) * 2.0, 3.05, z + Math.sin(a) * 2.0);
          chunk.rotation.y = a;
          c.scene.add(chunk);
          chunks.push({ chunk, a });
        }
        c.upd.push(t => {
          const k = ramp(t, c.t0 + 0.3, c.t1 - 0.35);
          water.scale.y = 0.15 + 11 * k;
          water.position.y = 0.8 + 0.09 * water.scale.y;
          if (p.runtuh) {
            const fall = ramp(t, c.t0 + 0.4, c.t1 - 0.2);
            rim.scale.setScalar(1 - 0.16 * fall);
            rim.material.opacity = 1 - 0.55 * fall;
            for (const {chunk, a} of chunks) {
              chunk.position.x = Math.cos(a) * (2.0 - 1.5 * fall);
              chunk.position.z = z + Math.sin(a) * (2.0 - 1.5 * fall);
              chunk.position.y = 3.05 - 2.2 * fall;
              chunk.rotation.z = fall * a;
            }
          }
        });
        c.shot = { target: [0, 1.9, z], dist: 23, yaw: 14, pitch: 30 };
        anchor = p.runtuh ? [1.7, 2.8, z] : [0, 1.9, z];
      } else if (tahap === 'lembaran_baja' || tahap === 'sambungan_baja') {
        cBox.visible = false;
        const z = ZF - 2.5;
        const bed = new THREE.Mesh(new THREE.BoxGeometry(5.3, 1.7, 2.6), K.mat('#755842', { roughness: 1 }));
        bed.position.set(0, -0.84, z);
        c.scene.add(bed);
        const left = K.sheetPile(6.8, 0.8);
        left.position.set(-0.47, -1.15, z + 0.1);
        c.scene.add(left);
        const right = K.sheetPile(6.8, 0.8);
        c.scene.add(right);
        if (tahap === 'lembaran_baja') {
          c.upd.push(t => {
            const k = ramp(t, c.t0 + 0.35, c.t1 - 0.35);
            right.position.set(0.47, lerp(6.5, -1.15, k), z + 0.1);
          });
          c.shot = { target: [0, 2.35, z], dist: 28, yaw: 20, pitch: 19 };
          anchor = [0.47, 4.5, z + 0.1];
        } else {
          const join = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.9, 0.2),
            K.mat('#8de1f2', { metalness: 0.15, roughness: 0.35 }));
          join.position.set(0, 1.85, z + 0.28);
          join.visible = false;
          c.scene.add(join);
          c.upd.push(t => {
            const k = ramp(t, c.t0 + 0.35, c.t0 + 1.75);
            right.position.set(lerp(1.8, 0.47, k), -1.15, z + 0.1);
            join.visible = k > 0.92;
          });
          c.shot = { target: [0.25, 2.9, z], dist: 19, yaw: 17, pitch: 13 };
          anchor = [0, 3.2, z + 0.28];
        }
      } else if (tahap === 'tancap') {
        c.shot = { target: [0, 3.0, ZF - 2.5], dist: 31, yaw: 16, pitch: 31 };
        c.upd.push(t => {
          const k = ramp(t, c.t0 + 0.3, c.t1 - 0.4);
          walls.position.y = lerp(8, 0, k);
        });
        anchor = [0, 4.0, ZF - 2.5];
      } else if (tahap === 'kotak_penuh') {
        c.shot = { target: [0, 2.0, ZF - 2.5], dist: 31, yaw: p.atas ? 0 : 15, pitch: p.atas ? 70 : 53 };
        inWater.scale.y = 2.4;
        inWater.position.y = 1.2;
        if (p.introduksi) c.upd.push(t => {
          const k = back(ramp(t, c.t0 + 0.15, c.t0 + 1.5));
          walls.scale.set(0.82 + 0.18 * k, 0.82 + 0.18 * k, 0.82 + 0.18 * k);
        });
        anchor = p.introduksi ? [2.3, 4.2, ZF - 2.5] : [0, 2.5, ZF - 2.5];
      } else if (tahap === 'sedot' || tahap === 'kering') {
        pump.visible = tahap === 'sedot';
        bracing.visible = true;
        c.shot = { target: [0, 2.0, ZF - 2.5], dist: 30, yaw: 20, pitch: 54 };
        if (tahap === 'sedot') {
          for (let i = 0; i < 7; i++) {
            const drop = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), K.mat('#88e4f4', { roughness: 0.15 }));
            c.scene.add(drop);
            c.upd.push(t => {
              const u = ((t - c.t0) * 1.35 + i / 7) % 1;
              drop.position.set(2.8 + 2.8 * u, 6.2 - 3.4 * u * u, ZF + 0.1 + 1.4 * u);
              drop.scale.setScalar(0.5 + 0.9 * u);
            });
          }
        }
        c.upd.push(t => {
          const k = tahap === 'kering' ? 1.0 : ramp(t, c.t0 + 0.2, c.t1 - 0.2);
          const curH = Math.max(0.02, 2.4 * (1 - k * 0.96));
          inWater.scale.y = curH;
          inWater.position.y = curH / 2;
        });
        if (tahap === 'kering') {
          inWater.visible = false;
          const floor = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.15, 4.25), K.mat('#c8b59d', { roughness: 1 }));
          floor.position.set(0, 0.09, ZF - 2.5);
          c.scene.add(floor);
          worker(c, 1.0, ZF - 2.6, 'jongkok');
        }
        anchor = tahap === 'kering' ? [0, 0.25, ZF - 2.5] : [2.8, 6.0, ZF + 0.1];
      } else if (tahap === 'tekanan') {
        c.shot = { target: [0, 2.4, ZF - 2.5], dist: 28, yaw: 10, pitch: 42 };
        inWater.scale.y = 0.05;
        inWater.position.y = 0.025;
        let leakStream = null;
        if (p.risiko) {
          const z = ZF - 2.5;
          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(3.6, 5.55, z),
            new THREE.Vector3(2.5, 6.25, z),
            new THREE.Vector3(1.2, 5.4, z),
            new THREE.Vector3(0.6, 4.3, z),
          ]);
          leakStream = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.19, 9),
            new THREE.MeshBasicMaterial({ color: '#67d9fa', transparent: true, opacity: 0.9 }));
          leakStream.visible = false;
          c.scene.add(leakStream);
        }
        c.upd.push(t => {
          const d = ramp(t, c.t0 + 0.1, c.t0 + 1.6);
          walls.scale.x = 1.0 - 0.12 * d * (0.8 + 0.2 * Math.sin(t * 12));
          walls.scale.z = 1.0 - 0.12 * d * (0.8 + 0.2 * Math.sin(t * 12));
          if (p.risiko) {
            const leak = ramp(t, c.t0 + 0.4, c.t1 - 0.3);
            walls.children[0].scale.x = 1 - 0.32 * leak;
            const h = 0.05 + 3.4 * leak;
            inWater.scale.y = h;
            inWater.position.y = h / 2;
            leakStream.visible = leak > 0.02;
            leakStream.material.opacity = 0.9 * leak;
          }
        });
        K.hudPanah(c, [-2.6, 2.4, ZF - 2.5], c.t0 + 0.03, 180, {len: 155});
        K.hudPanah(c, [2.6, 2.4, ZF - 2.5], c.t0 + 0.03, 0, {len: 155});
        anchor = p.risiko ? [0.6, 4.3, ZF - 2.5] : [3.6, 2.5, ZF - 2.5];
      } else if (tahap === 'rangka') {
        c.shot = { target: [0, 2.4, ZF - 2.5], dist: 29, yaw: 20, pitch: 54 };
        inWater.scale.y = 0.05;
        inWater.position.y = 0.025;
        bracing.visible = true;
        c.upd.push(t => {
          const k = p.instant ? 1 : back(ramp(t, c.t0 + 0.1, c.t0 + 1.4));
          bracing.scale.set(k, k, k);
        });
        anchor = [-0.9, 3.2, ZF - 2.5];
      } else if (tahap === 'cor_tiang') {
        c.shot = { target: [0, 3.0, ZF - 2.5], dist: 32, yaw: 20, pitch: 49 };
        inWater.scale.y = 0.05;
        inWater.position.y = 0.025;
        bracing.visible = true;
        footing.visible = true;
        if (p.pekerja) worker(c, -1.1, ZF - 2.0, 'tunjuk');
        c.upd.push(t => {
          const k = p.completed ? 1 : ramp(t, c.t0 + 0.2, c.t1 - 0.3);
          footing.scale.y = Math.max(0.01, k);
        });
        anchor = [0, 4.0, ZF - 2.5];
      } else if (tahap === 'bongkar') {
        c.shot = { target: [0, 3.0, ZF - 2.5], dist: 33, yaw: 16, pitch: 38 };
        footing.visible = true;
        c.upd.push(t => {
          const k = ramp(t, c.t0 + 0.3, c.t1 - 0.5);
          walls.position.y = lerp(0, 12, k);
          walls.scale.setScalar(Math.max(0.001, 1 - k * 0.5));
          const h = Math.max(0.03, 2.5 * k);
          inWater.scale.y = h;
          inWater.position.y = h / 2;
        });
        anchor = [0, 4.2, ZF - 2.5];
      } else if (tahap === 'jembatan_selesai') {
        cBox.visible = false;
        const bridge = K.jembatanLengkap();
        bridge.position.set(0, 0, ZF - 2.5);
        c.scene.add(bridge);
        c.shot = { target: [0, 4.0, ZF - 2.5], dist: 38, yaw: 22, pitch: 16 };
        anchor = [0, 7.8, ZF - 2.5];
      }

      overlays(c, p, anchor);
    },
  });

  /* ---------- panama: tahapan sistem lift air terusan panama ---------- */
  def('panama', {
    gerak: 'maju',
    build(c, p) {
      const tahap = p.tahap || 'kapal_laut';
      const isDiorama = ['lokasi_panama', 'tangga_bertingkat'].includes(tahap);
      if (!isDiorama) {
        K.latar(c, p.latar || 'sungai', { riverCutout: ['ruangan_lock', 'saluran_bawah', 'air_naik', 'kapal_terangkat', 'tanpa_crane', 'air_selevel', 'proses_turun', 'air_turun', 'kesimpulan_permukaan'].includes(tahap) });
      }

      let anchor = [0, 2.5, ZF - 2.5];

      if (tahap === 'kapal_laut') {
        const ship = K.kapalKontainer();
        ship.position.set(0, 1.3, ZF - 2.5);
        c.scene.add(ship);
        c.upd.push(t => {
          const k = ramp(t, c.t0, c.t1);
          ship.position.x = lerp(-4.5, 3.5, k);
          ship.rotation.z = Math.sin((t - c.t0) * 1.8) * 0.02;
          ship.position.y = 1.3 + Math.sin((t - c.t0) * 2.2) * 0.04;
        });
        c.shot = { target: [0, 2.6, ZF - 2.5], dist: 35, yaw: 24, pitch: 14 };
        anchor = [0, 4.8, ZF - 2.5];
      } else if (tahap === 'crane_larangan') {
        const ship = K.kapalKontainer();
        ship.position.set(0, 1.2, ZF - 2.0);
        c.scene.add(ship);
        const crane = K.cranePelabuhan();
        crane.position.set(-0.5, 0, ZF - 2.0);
        c.scene.add(crane);
        c.shot = { target: [0, 4.5, ZF - 2.0], dist: 26, yaw: 16, pitch: 20 };
        K.hudIkon(c, 'larangan', 540, 680, c.t0 + 0.3, { s: 1.25 });
        anchor = [0, 7.5, ZF - 2.0];
      } else if (tahap === 'mustahil_tanya') {
        const ship = K.kapalKontainer();
        ship.position.set(0, 1.0, ZF - 1.5);
        c.scene.add(ship);
        worker(c, -2.4, ZF - 0.5, 'pikir');
        c.shot = { target: [0, 3.2, ZF - 1.5], dist: 18, yaw: 32, pitch: -5 };
        K.hudIkon(c, 'tanya', 820, 520, c.t0 + 0.35);
        anchor = [-2.4, 2.2, ZF - 0.5];
      } else if (tahap === 'lokasi_panama') {
        const diorama = K.terusanPanamaDiorama(c.R);
        diorama.position.set(0, 0, ZF - 2.5);
        c.scene.add(diorama);
        const miniShip = K.kapalKontainer({ len: 6.0, w: 1.8, h: 1.1 });
        diorama.add(miniShip);
        c.upd.push(t => {
          const k = ramp(t, c.t0, c.t1);
          miniShip.position.set(0, 2.2, lerp(-12, 10, k));
        });
        c.shot = { target: [0, 2.2, ZF - 2.5], dist: 46, yaw: -16, pitch: 44 };
        anchor = [0, 3.8, ZF - 2.5];
      } else if (tahap === 'konsep_lift') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        lock.userData.frontWall.visible = false;
        c.scene.add(lock);
        const ship = K.kapalKontainer();
        lock.add(ship);
        c.upd.push(t => {
          const k = ramp(t, c.t0 + 0.2, c.t1 - 0.2);
          const curH = lerp(1.2, 5.5, k);
          lock.userData.innerWater.scale.y = curH;
          lock.userData.innerWater.position.y = curH / 2;
          ship.position.set(0, curH, 0);
        });
        c.shot = { target: [0, 3.6, ZF - 2.5], dist: 29, yaw: 0, pitch: 12 };
        anchor = [0, 4.6, ZF - 2.5];
      } else if (tahap === 'tanpa_mesin') {
        const ship = K.kapalKontainer();
        ship.position.set(0, 1.8, ZF - 2.0);
        c.scene.add(ship);
        c.upd.push(t => {
          ship.rotation.y = Math.sin((t - c.t0) * 0.8) * 0.05;
        });
        K.hudIkon(c, 'silang', 260, 720, c.t0 + 0.4, { s: 0.85 });
        K.hudIkon(c, 'silang', 820, 720, c.t0 + 0.8, { s: 0.85 });
        c.shot = { target: [0, 2.6, ZF - 2.0], dist: 22, yaw: 42, pitch: 18 };
        anchor = [0, 3.8, ZF - 2.0];
      } else if (tahap === 'rahasia_air') {
        const ship = K.kapalKontainer();
        ship.position.set(0, 1.4, ZF - 2.0);
        c.scene.add(ship);
        K.hudIkon(c, 'air', 540, 680, c.t0 + 0.2, { s: 1.35 });
        c.shot = { target: [0, 2.2, ZF - 2.0], dist: 20, yaw: 14, pitch: 16 };
        anchor = [0, 2.0, ZF - 2.0];
      } else if (tahap === 'mendekati_gerbang') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        c.scene.add(lock);
        const ship = K.kapalKontainer();
        c.scene.add(ship);
        c.upd.push(t => {
          const k = ramp(t, c.t0, c.t1);
          ship.position.set(0, 1.2, lerp(ZF + 16, ZF + 6, k));
        });
        c.shot = { target: [0, 3.2, ZF - 2.5], dist: 33, yaw: 12, pitch: 14 };
        anchor = [0, 4.2, ZF + 6];
      } else if (tahap === 'gerbang_raksasa') {
        const gate = K.gerbangBaja(7.5, 9.5);
        gate.position.set(0, 0, ZF - 1.0);
        c.scene.add(gate);
        c.shot = { target: [0, 4.5, ZF - 1.0], dist: 17, yaw: 18, pitch: 20 };
        anchor = [0, 5.5, ZF - 1.0];
      } else if (tahap === 'gerbang_buka') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        c.scene.add(lock);
        const ship = K.kapalKontainer();
        ship.position.set(0, 1.2, ZF + 5);
        c.scene.add(ship);
        c.upd.push(t => {
          const k = ramp(t, c.t0 + 0.2, c.t1 - 0.2);
          lock.userData.rearGate.setOpen(k);
        });
        c.shot = { target: [0, 3.8, ZF - 2.5 + lock.userData.chamberL / 2], dist: 22, yaw: -16, pitch: 16 };
        anchor = [0, 4.5, ZF - 2.5 + lock.userData.chamberL / 2];
      } else if (tahap === 'masuk_lock') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        lock.userData.rearGate.setOpen(1.0);
        c.scene.add(lock);
        const ship = K.kapalKontainer();
        lock.add(ship);
        c.upd.push(t => {
          const k = ramp(t, c.t0 + 0.2, c.t1 - 0.2);
          ship.position.set(0, 1.2, lerp(lock.userData.chamberL / 2 + 5, 0, k));
        });
        c.shot = { target: [0, 3.0, ZF - 2.5], dist: 35, yaw: 24, pitch: 38 };
        anchor = [0, 3.5, ZF - 2.5];
      } else if (tahap === 'ruangan_lock') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        lock.userData.frontWall.visible = false;
        c.scene.add(lock);
        const ship = K.kapalKontainer();
        ship.position.set(0, 1.2, 0);
        lock.add(ship);
        c.shot = { target: [0, 3.2, ZF - 2.5], dist: 27, yaw: 12, pitch: 16 };
        anchor = [0, 1.2, ZF - 2.5];
      } else if (tahap === 'gerbang_tutup') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        lock.userData.frontWall.visible = false;
        c.scene.add(lock);
        const ship = K.kapalKontainer();
        ship.position.set(0, 1.2, 0);
        lock.add(ship);
        c.upd.push(t => {
          const k = ramp(t, c.t0 + 0.3, c.t1 - 0.3);
          lock.userData.rearGate.setOpen(1.0 - k);
        });
        c.shot = { target: [0, 3.5, ZF - 2.5 + lock.userData.chamberL / 2], dist: 23, yaw: -25, pitch: 18 };
        anchor = [0, 4.0, ZF - 2.5 + lock.userData.chamberL / 2];
      } else if (tahap === 'saluran_bawah') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        lock.userData.frontWall.visible = false;
        c.scene.add(lock);
        const ship = K.kapalKontainer();
        ship.position.set(0, 1.2, 0);
        lock.add(ship);
        // Gelembung / partikel air masuk dari lantai lock
        const drops = [];
        for (let i = 0; i < 10; i++) {
          const drop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), K.mat('#7dd3fc', { roughness: 0.15 }));
          c.scene.add(drop);
          drops.push(drop);
        }
        c.upd.push(t => {
          for (let i = 0; i < drops.length; i++) {
            const u = ((t - c.t0) * 1.8 + i / 10) % 1;
            const xPos = (i % 2 === 0 ? -1.3 : 1.3);
            const zPos = ZF - 2.5 - 6 + (i * 1.4);
            drops[i].position.set(xPos, -0.6 + u * 2.2, zPos);
            drops[i].scale.setScalar(0.4 + 0.8 * (1 - u));
          }
        });
        c.shot = { target: [0, -0.6, ZF - 2.5], dist: 22, yaw: 18, pitch: 12 };
        anchor = [0, -1.2, ZF - 2.5];
      } else if (tahap === 'air_naik') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        lock.userData.frontWall.visible = false;
        c.scene.add(lock);
        const ship = K.kapalKontainer();
        lock.add(ship);
        c.upd.push(t => {
          const k = ramp(t, c.t0 + 0.2, c.t1 - 0.2);
          const curH = lerp(1.2, 5.6, k);
          lock.userData.innerWater.scale.y = curH;
          lock.userData.innerWater.position.y = curH / 2;
          ship.position.set(0, curH, 0);
        });
        c.shot = { target: [0, 3.4, ZF - 2.5], dist: 28, yaw: 14, pitch: 18 };
        anchor = [0, 3.5, ZF - 2.5];
      } else if (tahap === 'kapal_terangkat') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        lock.userData.frontWall.visible = false;
        c.scene.add(lock);
        const ship = K.kapalKontainer();
        lock.add(ship);
        c.upd.push(t => {
          const k = ramp(t, c.t0 + 0.1, c.t1 - 0.2);
          const curH = lerp(3.5, 6.2, k);
          lock.userData.innerWater.scale.y = curH;
          lock.userData.innerWater.position.y = curH / 2;
          ship.position.set(0, curH, 0);
        });
        c.shot = { target: [0, 4.5, ZF - 2.5], dist: 28, yaw: 20, pitch: 14 };
        anchor = [0, 6.2, ZF - 2.5];
      } else if (tahap === 'tanpa_crane') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        lock.userData.frontWall.visible = false;
        c.scene.add(lock);
        lock.userData.innerWater.scale.y = 6.2;
        lock.userData.innerWater.position.y = 3.1;
        const ship = K.kapalKontainer();
        ship.position.set(0, 6.2, 0);
        lock.add(ship);
        K.hudIkon(c, 'centang', 540, 660, c.t0 + 0.35, { s: 1.15 });
        c.shot = { target: [0, 3.8, ZF - 2.5], dist: 18, yaw: 8, pitch: 6 };
        anchor = [0, 2.5, ZF - 2.5];
      } else if (tahap === 'tanya_lanjut') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        c.scene.add(lock);
        lock.userData.innerWater.scale.y = 6.2;
        lock.userData.innerWater.position.y = 3.1;
        const ship = K.kapalKontainer();
        ship.position.set(0, 6.2, 0);
        lock.add(ship);
        K.hudIkon(c, 'tanya', 820, 520, c.t0 + 0.3);
        c.shot = { target: [0, 6.2, ZF - 2.5 - lock.userData.chamberL / 2 + 2], dist: 24, yaw: 6, pitch: 10 };
        anchor = [0, 6.5, ZF - 2.5 - lock.userData.chamberL / 2];
      } else if (tahap === 'air_selevel') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        lock.userData.frontWall.visible = false;
        c.scene.add(lock);
        lock.userData.innerWater.scale.y = 6.5;
        lock.userData.innerWater.position.y = 3.25;
        const ship = K.kapalKontainer();
        ship.position.set(0, 6.5, 0);
        lock.add(ship);
        c.shot = { target: [0, 5.8, ZF - 2.5 - lock.userData.chamberL / 2], dist: 24, yaw: -14, pitch: 12 };
        anchor = [0, 6.5, ZF - 2.5 - lock.userData.chamberL / 2];
      } else if (tahap === 'gerbang_depan_buka') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        c.scene.add(lock);
        lock.userData.innerWater.scale.y = 6.5;
        lock.userData.innerWater.position.y = 3.25;
        const ship = K.kapalKontainer();
        ship.position.set(0, 6.5, 0);
        lock.add(ship);
        c.upd.push(t => {
          const k = ramp(t, c.t0 + 0.2, c.t1 - 0.2);
          lock.userData.frontGate.setOpen(k);
        });
        c.shot = { target: [0, 6.0, ZF - 2.5 - lock.userData.chamberL / 2], dist: 22, yaw: 16, pitch: 16 };
        anchor = [0, 6.5, ZF - 2.5 - lock.userData.chamberL / 2];
      } else if (tahap === 'kapal_keluar') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        lock.userData.frontGate.setOpen(1.0);
        c.scene.add(lock);
        lock.userData.innerWater.scale.y = 6.5;
        lock.userData.innerWater.position.y = 3.25;
        const ship = K.kapalKontainer();
        lock.add(ship);
        c.upd.push(t => {
          const k = ramp(t, c.t0 + 0.2, c.t1 - 0.2);
          ship.position.set(0, 6.5, lerp(0, -lock.userData.chamberL / 2 - 8, k));
        });
        c.shot = { target: [0, 6.2, ZF - 2.5 - lock.userData.chamberL / 2 - 4], dist: 32, yaw: -18, pitch: 24 };
        anchor = [0, 7.5, ZF - 2.5 - lock.userData.chamberL / 2 - 8];
      } else if (tahap === 'tangga_bertingkat') {
        const steps = K.tanggaLockBertingkat();
        steps.position.set(0, 0, ZF - 2.5);
        c.scene.add(steps);
        c.shot = { target: [0, 4.5, ZF - 2.5], dist: 46, yaw: 26, pitch: 30 };
        anchor = [0, 6.5, ZF - 2.5];
      } else if (tahap === 'proses_turun') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        lock.userData.frontWall.visible = false;
        c.scene.add(lock);
        lock.userData.innerWater.scale.y = 6.2;
        lock.userData.innerWater.position.y = 3.1;
        const ship = K.kapalKontainer();
        ship.position.set(0, 6.2, 0);
        lock.add(ship);
        c.shot = { target: [0, 5.0, ZF - 2.5], dist: 26, yaw: 18, pitch: 20 };
        anchor = [0, 6.2, ZF - 2.5];
      } else if (tahap === 'air_turun') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        lock.userData.frontWall.visible = false;
        c.scene.add(lock);
        const ship = K.kapalKontainer();
        lock.add(ship);
        c.upd.push(t => {
          const k = ramp(t, c.t0 + 0.2, c.t1 - 0.2);
          const curH = lerp(6.2, 1.2, k);
          lock.userData.innerWater.scale.y = curH;
          lock.userData.innerWater.position.y = curH / 2;
          ship.position.set(0, curH, 0);
        });
        c.shot = { target: [0, 3.8, ZF - 2.5], dist: 28, yaw: -14, pitch: 18 };
        anchor = [0, 2.5, ZF - 2.5];
      } else if (tahap === 'kesimpulan_permukaan') {
        const lock = K.lockPanama();
        lock.position.set(0, 0, ZF - 2.5);
        lock.userData.frontWall.visible = false;
        c.scene.add(lock);
        const ship = K.kapalKontainer();
        lock.add(ship);
        c.upd.push(t => {
          const curH = 3.6 + Math.sin((t - c.t0) * 1.5) * 1.8;
          lock.userData.innerWater.scale.y = curH;
          lock.userData.innerWater.position.y = curH / 2;
          ship.position.set(0, curH, 0);
        });
        c.shot = { target: [0, 3.8, ZF - 2.5], dist: 25, yaw: 0, pitch: 12 };
        anchor = [0, 4.2, ZF - 2.5];
      } else if (tahap === 'penutup_gravitasi') {
        const ship = K.kapalKontainer();
        ship.position.set(0, 1.3, ZF - 2.5);
        c.scene.add(ship);
        worker(c, 4.2, ZF + 0.5, 'lapor');
        c.upd.push(t => {
          const k = ramp(t, c.t0, c.t1);
          ship.position.x = lerp(-6, 4, k);
        });
        c.shot = { target: [0, 2.5, ZF - 2.5], dist: 38, yaw: 20, pitch: 16 };
        anchor = [0, 5.5, ZF - 2.5];
      }

      overlays(c, p, anchor);
    },
  });
})();

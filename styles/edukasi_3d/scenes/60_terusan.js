/* Edukasi 3D - template 'terusan': cara kerja pintu air (lock) Terusan Panama.
 * Satu dunia konsisten; keadaan (posisi kapal, tinggi air, gerbang, katup) adalah fungsi waktu
 * global PLAN.tl (bisa ditimpa per adegan lewat p.tl). Kamera = spline Hermite PLAN.cams[p.cam]
 * sehingga adegan berurutan dengan kamera sama menyambung mulus tanpa potongan.
 */
(function () {
  const THREE = window.THREE, K = window.K;
  const { cl, ease, ramp, lerp, back, rng, esc } = ENG.H;

  /* ---------- konstanta dunia ---------- */
  const CW = 8, STEP = 5, N = 3;               // lebar ruang, beda tinggi per ruang, jumlah ruang
  const XC = k => k * 38;                      // pusat ruang k
  const GX = k => -19 + 38 * k;                // gerbang k (0 = hilir)
  const FLOOR = k => -7 + STEP * k;            // dasar ruang k
  const TOP = k => STEP * k + 6;             // puncak dinding ruang k
  const LAKE = STEP * N, X_LAKE = GX(N) + 2;
  const DRAFT = 1.5;
  const PORTS = [-12, -6, 0, 6, 12];

  /* ---------- keyframe & spline ---------- */
  function kf(a, t) {
    if (a == null) return 0; if (typeof a === 'number') return a; if (!a.length) return 0;
    if (t <= a[0][0]) return a[0][1];
    for (let i = 1; i < a.length; i++) if (t < a[i][0]) { const [t0, v0] = a[i - 1], [t1, v1] = a[i]; return lerp(v0, v1, ease((t - t0) / (t1 - t0))); }
    return a[a.length - 1][1];
  }
  // Hermite: kecepatan kontinu di setiap kunci, berhenti halus di ujung
  function spline(keys, t) {
    const n = keys.length; if (n === 1) return keys[0].slice(1);
    if (t <= keys[0][0]) return keys[0].slice(1); if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
    let i = 1; while (keys[i][0] < t) i++;
    const A = keys[i - 1], B = keys[i], h = B[0] - A[0], u = (t - A[0]) / h;
    const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
    const tan = (j, c) => {
      if (j === 0 || j === n - 1) return 0;
      const P = keys[j - 1], Q = keys[j], R = keys[j + 1];
      const s1 = (Q[c] - P[c]) / (Q[0] - P[0]), s2 = (R[c] - Q[c]) / (R[0] - Q[0]);
      return s1 * s2 <= 0 ? 0 : (s1 + s2) / 2;   // tanpa overshoot
    };
    const out = [];
    for (let c = 1; c < A.length; c++) out.push(h00 * A[c] + h10 * h * tan(i - 1, c) + h01 * B[c] + h11 * h * tan(i, c));
    return out;
  }

  /* ---------- material & tekstur ---------- */
  const M = {
    beton: K.mat('#c3c8cc', { roughness: 0.92 }), betonGelap: K.mat('#959ea6', { roughness: 0.95 }),
    rumput: K.mat('#79b04f', { roughness: 0.95 }), rumputGelap: K.mat('#5f9a3e', { roughness: 0.95 }),
    baja: K.mat('#3c4a5e', { roughness: 0.45, metalness: 0.55 }), bajaTerang: K.mat('#56677d', { roughness: 0.45, metalness: 0.5 }),
    kuning: K.mat('#f2b632', { roughness: 0.5 }), hitam: K.mat('#1d232b', { roughness: 0.7 }),
    putih: K.mat('#f4f6f8', { roughness: 0.5 }), kaca: K.mat('#7cc8f2', { roughness: 0.1, metalness: 0.6 }),
    tiang: K.mat('#d9dde1', { roughness: 0.6 }), lorong: K.mat('#26313d', { roughness: 0.8 }),
  };
  const sectionTex = () => K.tex('panSec', 256, 256, (x, w, h) => {
    const L = [['#7d5a3c', 0], ['#94693f', 0.22], ['#a8794a', 0.45], ['#8a6644', 0.7], ['#6f523a', 1]];
    for (let i = 0; i < L.length - 1; i++) { x.fillStyle = L[i][0]; x.fillRect(0, L[i][1] * h, w, (L[i + 1][1] - L[i][1]) * h + 1); }
    const R = rng(7); for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${R() < 0.5 ? '60,40,25' : '210,180,140'},${0.25 + R() * 0.3})`; x.beginPath(); x.ellipse(R() * w, R() * h, 1 + R() * 4, 1 + R() * 3, R() * 3, 0, 6.3); x.fill(); }
  }, 3, 1);
  const SECM = () => new THREE.MeshStandardMaterial({ map: sectionTex(), roughness: 1 });
  const rippleTex = () => K.tex('panRip', 256, 256, (x, w, h) => {
    x.fillStyle = '#3d9bd6'; x.fillRect(0, 0, w, h); const R = rng(11);
    for (let i = 0; i < 70; i++) { const y = R() * h, x0 = R() * w, l = 10 + R() * 40; x.strokeStyle = `rgba(255,255,255,${0.06 + R() * 0.12})`; x.lineWidth = 1 + R() * 2; x.beginPath(); x.moveTo(x0, y); x.quadraticCurveTo(x0 + l / 2, y - 3, x0 + l, y); x.stroke(); }
    for (let i = 0; i < 40; i++) { x.strokeStyle = 'rgba(20,70,120,.12)'; x.lineWidth = 2; const y = R() * h, x0 = R() * w; x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + 20 + R() * 30, y + 2); x.stroke(); }
  });
  const foamTex = () => K.tex('panFoam', 256, 128, (x, w, h) => {
    const R = rng(5);
    for (let i = 0; i < 500; i++) { const u = R(), v = (R() - 0.5) * (0.15 + 0.85 * u); const a = (1 - u) * 0.85; x.fillStyle = `rgba(255,255,255,${a})`; x.beginPath(); x.arc((1 - u) * w, h / 2 + v * h, 1 + R() * 5 * (1 - u), 0, 6.3); x.fill(); }
  });
  const gaugeTex = () => K.tex('panGauge', 128, 1024, (x, w, h) => {
    x.fillStyle = '#f6f2e8'; x.fillRect(0, 0, w, h);
    const m = h / 13;  // 13 m: -7 .. +6
    for (let i = 0; i <= 13; i++) {
      const y = h - i * m; x.fillStyle = '#1d232b'; x.fillRect(0, y - 3, i % 5 === 2 ? w : w * 0.55, 6);
      if (i >= 7) { x.font = 'bold 44px Inter, sans-serif'; x.fillText(String(i - 7), w * 0.6, y + 15); }
      for (let j = 1; j < 4; j++) x.fillRect(0, y - j * m / 4 - 1, w * 0.25, 3);
    }
    x.fillStyle = '#d9342b'; x.fillRect(0, 0, 10, h);
  });
  const depthTex = () => K.tex('panDepth', 4, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7fd0f7'); g.addColorStop(0.08, '#3fa3df'); g.addColorStop(1, '#14527f'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  function water(col = '#ffffff', op = 0.45) {
    return new THREE.MeshStandardMaterial({ color: col, map: depthTex(), roughness: 0.18, metalness: 0.1, transparent: true, opacity: op, depthWrite: false });
  }
  function box(x0, x1, y0, y1, z0, z1, mat, cast = false) {
    const m = K.mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, cast, true);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return m;
  }
  // permukaan air: badan transparan + kulit beriak di atas
  function pool(c, x0, x1, z0, z1, floor, lvFn, o = {}) {
    const g = new THREE.Group();
    const body = K.mesh(new THREE.BoxGeometry(1, 1, 1), water(o.col, o.op), false, false); body.scale.set(x1 - x0, 1, z1 - z0); body.renderOrder = 2;
    const skinM = new THREE.MeshStandardMaterial({ map: rippleTex(), color: '#ffffff', roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.93, depthWrite: false, emissive: '#4fd3ff', emissiveIntensity: 0 });
    skinM.map.repeat.set((x1 - x0) / 14, (z1 - z0) / 14);
    const skin = K.mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), skinM, false, true); skin.rotation.x = -Math.PI / 2; skin.renderOrder = 3;
    g.add(body, skin); c.scene.add(g);
    c.upd.push(t => {
      const lv = lvFn(t), hgt = Math.max(0.02, lv - floor);
      body.scale.y = hgt; body.position.set((x0 + x1) / 2, floor + hgt / 2, (z0 + z1) / 2);
      skin.position.set((x0 + x1) / 2, lv + 0.01, (z0 + z1) / 2);
      skinM.map.offset.set(t * 0.012, t * 0.02);
      skinM.emissiveIntensity = o.glow ? 0.55 * o.glow(t) : 0;
    });
    return g;
  }

  /* ---------- keadaan dunia ---------- */
  function stateOf(c, p) {
    const TL = Object.assign({}, window.PLAN.tl || {}, p.tl || {});
    const S = k => t => kf(TL[k], t);
    const st = { x: S('x'), g: [0, 1, 2, 3].map(k => S('g' + k)), lv: [0, 1, 2].map(k => S('lv' + k)), vin: S('vin'), vout: S('vout'), front: S('front'), glow: S('glow') };
    st.level = (x, t) => x < GX(0) + 2 ? 0 : x >= X_LAKE ? LAKE : st.lv[Math.min(N - 1, Math.floor((x - GX(0) - 2) / 38))](t);
    st.ship = t => { const x = st.x(t); return [x, st.level(x, t) - DRAFT + 0.06 * Math.sin(t * 1.3), 0]; };
    // debit air masuk/keluar (akar beda tinggi: melambat ketika hampir sama tinggi)
    st.fin = t => st.vin(t) * Math.sqrt(cl((st.lv[1](t) - st.lv[0](t)) / STEP));
    st.fout = t => st.vout(t) * Math.sqrt(cl(st.lv[0](t) / STEP));
    return st;
  }

  /* ---------- kapal ---------- */
  function ship(c, posFn, o = {}) {
    const s = K.kapalKontainer(); s.scale.setScalar(1.55); c.scene.add(s);
    // asap cerobong
    const smk = [], sm = new THREE.MeshStandardMaterial({ color: '#e9edf0', roughness: 1, transparent: true, opacity: 0.28, depthWrite: false });
    for (let i = 0; i < 9; i++) { const b = K.mesh(K.geo('puff', () => new THREE.SphereGeometry(0.55, 10, 8)), sm, false, false); c.scene.add(b); smk.push(b); }
    // buih buritan & haluan
    const fm = new THREE.MeshBasicMaterial({ map: foamTex(), transparent: true, opacity: 0, depthWrite: false });
    const wake = new THREE.Mesh(new THREE.PlaneGeometry(26, 9), fm); wake.rotation.x = -Math.PI / 2; wake.renderOrder = 4; c.scene.add(wake);
    const bm = fm.clone(); const bow = new THREE.Mesh(new THREE.PlaneGeometry(6, 7), bm); bow.rotation.x = -Math.PI / 2; bow.rotation.z = Math.PI; bow.renderOrder = 4; c.scene.add(bow);
    c.upd.push(t => {
      const [x, y, z] = posFn(t), [x2] = posFn(t + 0.25), v = Math.abs(x2 - x) / 0.25;
      s.position.set(x, y, z); s.rotation.z = 0.004 * Math.sin(t * 1.1); s.rotation.x = 0.006 * Math.sin(t * 0.8 + 1);
      const wl = y + DRAFT + 0.04, f = cl(v / 2.5);
      wake.position.set(x - 10.5 - 13, wl, z); fm.opacity = 0.55 * f; fm.map.offset.x = -t * 0.05;
      bow.position.set(x + 14.5, wl, z); bm.opacity = 0.7 * f;
      smk.forEach((b, i) => { const ph = ((t * 0.45 + i / smk.length) % 1); b.position.set(x - 9.4 - ph * 4 - v * ph * 1.2, y + 8.0 + ph * 6, z + Math.sin(i * 2.3) * 0.4 * ph); b.scale.setScalar(0.15 + ph * 0.6); });
    });
    return s;
  }

  /* ---------- tokoh kecil (skala) ---------- */
  function pekerja(c, x, y, z, o = {}) {
    const g = K.orang({ baju: o.baju || '#f97316', celana: '#334155', caping: false });
    const helm = K.mesh(K.geo('helm', () => new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), K.mat(o.helm || '#facc15'));
    helm.position.y = 0.2; g.userData.J.head.add(helm);
    g.position.set(x, y, z); g.rotation.y = o.ry || 0; g.scale.setScalar(o.s || 1.25); c.scene.add(g);
    c.upd.push(t => {
      if (o.jalan) { const ph = Math.sin((t + (o.ph || 0)) * 0.25); g.position.x = x + o.jalan * ph; g.rotation.y = Math.cos((t + (o.ph || 0)) * 0.25) > 0 ? Math.PI / 2 : -Math.PI / 2; K.pose(g, 'jalan', t); }
      else K.pose(g, o.pose || 'berdiri', t, o.a || 0);
    });
    return g;
  }

  function burung(c, cx, cy, cz, n = 5, R = rng(3)) {
    const m = K.mat('#f4f4f2');
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group(); const wl = K.mesh(new THREE.BoxGeometry(0.9, 0.04, 0.3), m, false, false), wr = wl.clone(); wl.position.x = -0.45; wr.position.x = 0.45;
      const pl = new THREE.Group(), pr = new THREE.Group(); pl.add(wl); pr.add(wr); g.add(pl, pr); g.scale.setScalar(1.2); c.scene.add(g);
      const r = 6 + R() * 10, sp = 0.15 + R() * 0.1, ph = R() * 6, hy = R() * 4;
      c.upd.push(t => { const a = ph + t * sp; g.position.set(cx + Math.cos(a) * r, cy + hy + Math.sin(t * 0.7 + ph), cz + Math.sin(a) * r); g.rotation.y = -a; const f = Math.sin(t * 9 + ph) * 0.6; pl.rotation.z = f; pr.rotation.z = -f; });
    }
  }

  function pohon(c, R, x, z, y, k) { const p = K.pohon(R, k); p.position.set(x, y, z); p.rotation.y = R() * 6; c.scene.add(p); return p; }

  /* ---------- gerbang baja dua daun ---------- */
  function gerbang(c, k, openFn) {
    const gx = GX(k), y0 = k === 0 ? FLOOR(0) : FLOOR(k - 1), H = (k === N ? LAKE + 2.5 : TOP(k)) - y0 + 0.3, L = CW / 2;
    const mk = (side) => {
      const piv = new THREE.Group(); piv.position.set(gx + 1.7, y0, side * L); c.scene.add(piv);
      const leaf = new THREE.Group(); piv.add(leaf);
      const body = box(0, L, 0, H, -0.3, 0.3, M.baja, true); body.position.x = L / 2 * (1); leaf.add(body);
      for (let i = 1; i < 7; i++) { const r = box(0.05, L - 0.05, i * H / 7 - 0.12, i * H / 7 + 0.12, -0.42, 0.42, M.bajaTerang, true); leaf.add(r); }
      for (let j = 1; j < 3; j++) { const v = box(j * L / 3 - 0.08, j * L / 3 + 0.08, 0.2, H - 0.2, -0.4, 0.4, M.bajaTerang); leaf.add(v); }
      const walk = box(0, L, H, H + 0.16, -0.65, 0.65, M.kuning); leaf.add(walk);
      for (let j = 0; j <= 4; j++) { const pst = box(j * L / 4 - 0.04, j * L / 4 + 0.04, H, H + 1.05, 0.58, 0.64, M.tiang); leaf.add(pst); }
      const rail = box(0, L, H + 1.0, H + 1.07, 0.56, 0.66, M.tiang); leaf.add(rail);
      // daun mengarah ke tengah (tertutup) atau merapat ke dinding hulu (terbuka)
      leaf.rotation.y = 0; leaf.scale.z = 1;
      return { piv, side };
    };
    const A = mk(1), B = mk(-1);
    c.upd.push(t => {
      const o = cl(openFn(t));
      // tertutup: daun tegak lurus alur (menuju z=0); terbuka: sejajar dinding ke arah hulu (+x)
      A.piv.rotation.y = lerp(Math.PI / 2, 0.06, o);
      B.piv.rotation.y = lerp(-Math.PI / 2, -0.06, o);
    });
  }

  /* ---------- dunia: rangkaian pintu air ---------- */
  function dunia(c, p) {
    const st = c.st = stateOf(c, p), R = rng(41), s = c.scene;
    const cutX0 = -30, cutX1 = GX(N) + 4;
    const sec = SECM();
    // tanah belakang (dinding beton menghadap alur) per segmen
    const back = (x0, x1, top) => {
      const b = box(x0, x1, -60, top, -90, -CW / 2, [M.beton, M.beton, M.rumput, sec, M.beton, sec]); s.add(b);
      s.add(box(x0, x1, top, top + 0.22, -CW / 2 - 3.2, -CW / 2, M.betonGelap));
      s.add(box(x0, x1, top + 0.22, top + 0.26, -CW / 2 - 0.25, -CW / 2 - 0.05, M.kuning));
    };
    const front = new THREE.Group(); s.add(front); c.frontGroup = front;
    const frontSeg = (x0, x1, top, grp) => {
      const b = box(x0, x1, -60, top, CW / 2, 60, [M.beton, M.beton, M.rumput, sec, sec, M.beton]); grp.add(b);
      grp.add(box(x0, x1, top, top + 0.22, CW / 2, CW / 2 + 3.2, M.betonGelap));
      grp.add(box(x0, x1, top + 0.22, top + 0.26, CW / 2 + 0.05, CW / 2 + 0.25, M.kuning));
    };
    // hilir: kanal lebar
    s.add(box(-420, cutX0, -60, 2.5, -90, -12, [sec, sec, M.rumput, sec, M.beton, sec]));
    s.add(box(-420, cutX0, -60, 2.5, 12, 60, [sec, sec, M.rumput, sec, sec, M.beton]));
    s.add(box(-420, cutX0, -60, FLOOR(0), -12, 12, M.betonGelap));
    back(cutX0, GX(0) - 2, 2.5); frontSeg(cutX0, GX(0) - 2, 2.5, front);
    s.add(box(cutX0 - 0.01, GX(0) + 2, -60, FLOOR(0), -12, CW / 2, [sec, sec, M.betonGelap, sec, sec, sec]));
    // penyangga sayap kanal hilir
    s.add(box(cutX0 - 14, cutX0, -60, 2.5, -12, -CW / 2, [sec, sec, M.rumput, sec, M.beton, sec]));
    const fw = box(cutX0 - 14, cutX0, -60, 2.5, CW / 2, 12, [sec, sec, M.rumput, sec, sec, M.beton]); s.add(fw);
    for (let k = 0; k < N; k++) {
      back(GX(k) - 2, GX(k + 1) - 2, TOP(k)); frontSeg(GX(k) - 2, GX(k + 1) - 2, TOP(k), front);
      s.add(box(GX(k) + 2, GX(k + 1) + 2, -60, FLOOR(k), -CW / 2 - 0.01, CW / 2, [sec, sec, M.betonGelap, sec, sec, sec]));
    }
    // hulu: danau
    back(GX(N) - 2, X_LAKE + 14, LAKE + 2.5); frontSeg(GX(N) - 2, X_LAKE, LAKE + 2.5, front); s.add(box(X_LAKE, X_LAKE + 14, -60, LAKE + 2.5, CW / 2, 60, [sec, sec, M.rumput, sec, sec, M.beton]));
    s.add(box(X_LAKE, 700, -60, FLOOR(N), -CW / 2 - 0.01, CW / 2, M.betonGelap));
    s.add(box(X_LAKE + 14, 700, -60, FLOOR(N), -120, 80, M.betonGelap));
    s.add(box(X_LAKE + 14, 700, -60, LAKE + 2.5, -260, -120, [sec, sec, M.rumputGelap, sec, sec, sec]));
    s.add(box(X_LAKE + 14, 700, -60, LAKE + 2.5, 80, 200, [sec, sec, M.rumputGelap, sec, sec, sec]));
    // air
    pool(c, -420, cutX0, -12, 12, FLOOR(0), () => 0);
    pool(c, cutX0, GX(0) + 2, -CW / 2, CW / 2, FLOOR(0), () => 0, { glow: st.glow });
    for (let k = 0; k < N; k++) pool(c, GX(k) + 2, GX(k + 1) + 2, -CW / 2, CW / 2, FLOOR(k), t => st.lv[k](t), { glow: k === 0 ? st.glow : null });
    pool(c, X_LAKE, X_LAKE + 14, -CW / 2, CW / 2, FLOOR(N), () => LAKE);
    pool(c, X_LAKE + 14, 700, -120, 80, FLOOR(N), () => LAKE);
    for (let k = 0; k <= N; k++) gerbang(c, k, st.g[k]);
    // mistar tinggi air di dinding belakang ruang 0
    const gm = new THREE.MeshStandardMaterial({ map: gaugeTex(), roughness: 0.7 });
    const gp = K.mesh(new THREE.PlaneGeometry(1.3, 12.9), gm, false, true); gp.position.set(-14.6, FLOOR(0) + 6.45, -CW / 2 + 0.02); s.add(gp);
    // rumah kontrol di dinding belakang
    const rk = new THREE.Group(); rk.add(box(-2.6, 2.6, 0, 3.2, -2.2, 2.2, M.putih, true), box(-2.65, 2.65, 1.7, 2.7, -2.25, 2.25, M.kaca), box(-3, 3, 3.2, 3.55, -2.6, 2.6, K.mat('#c0392b'), true));
    rk.position.set(GX(1) - 6, TOP(0) + 0.22, -CW / 2 - 6.5); s.add(rk);
    // tiang lampu & pagar sepanjang dinding
    for (let k = 0; k < N; k++) for (let x = GX(k) + 6; x < GX(k + 1) - 2; x += 9) {
      const L = new THREE.Group(); L.add(box(-0.08, 0.08, 0, 4.2, -0.08, 0.08, M.tiang, true), box(-0.1, 0.9, 4.1, 4.3, -0.15, 0.15, M.tiang), box(0.55, 0.95, 3.95, 4.12, -0.2, 0.2, M.putih));
      L.position.set(x, TOP(k) + 0.22, -CW / 2 - 2.8); s.add(L);
      const L2 = L.clone(); L2.position.z = CW / 2 + 2.8; L2.rotation.y = Math.PI; front.add(L2);
    }
    // pekerja untuk skala
    pekerja(c, 4, TOP(0) + 0.22, -CW / 2 - 1.6, { jalan: 6, ph: 0 });
    pekerja(c, GX(1) - 4, TOP(0) + 0.22, -CW / 2 - 1.2, { pose: 'tunjuk', ry: 0.3, baju: '#2563eb' });
    pekerja(c, -10, TOP(0) + 0.22, -CW / 2 - 2.0, { jalan: 4, ph: 9, baju: '#16a34a' });
    pekerja(c, 40, TOP(1) + 0.22, -CW / 2 - 1.6, { jalan: 7, ph: 4 });
    // hutan tropis
    for (let i = 0; i < 70; i++) {
      const x = -140 + R() * 260, zb = -42 - R() * 50, k = 1.5 + R() * 1.6;
      const top = x < GX(0) - 2 ? 2.5 : x < GX(1) - 2 ? TOP(0) : x < GX(2) - 2 ? TOP(1) : x < GX(3) - 2 ? TOP(2) : LAKE + 2.5;
      pohon(c, R, x, zb, top, k);
    }
    for (let i = 0; i < 40; i++) {
      const x = -140 + R() * 260, zf = 44 + R() * 14, k = 1.5 + R() * 1.4;
      const top = x < GX(0) - 2 ? 2.5 : x < GX(1) - 2 ? TOP(0) : x < GX(2) - 2 ? TOP(1) : x < GX(3) - 2 ? TOP(2) : LAKE + 2.5;
      if (x > -95 && x < cutX0 - 1) continue;  // jalur kamera potongan: jangan halangi
      const tr = pohon(c, R, x, zf, top, k); if (x > cutX0 - 1 && x < cutX1 + 1) { s.remove(tr); front.add(tr); }
    }
    // dinding depan turun (efek potongan) — c.st.front 0..1
    c.upd.push(t => { const f = ease(cl(st.front(t))); front.position.y = -46 * f; front.visible = f < 0.999; });
    gorong(c, st);
    return st;
  }

  /* ---------- gorong-gorong (saluran khusus) di bidang potongan ---------- */
  function gorong(c, st) {
    const s = c.scene, z = CW / 2 + 0.03, zp = CW / 2 + 0.16;
    const g = new THREE.Group(); s.add(g);
    const dark = M.lorong, rim = K.mat('#4b5563');
    const seg = (x0, x1, y0, y1) => { g.add(box(x0 - 0.18, x1 + 0.18, y0 - 0.18, y1 + 0.18, z - 0.02, z + 0.02, rim)); g.add(box(x0, x1, y0, y1, z, z + 0.04, dark)); };
    seg(-24.6, 24.2, -12.2, -9.8);                    // lorong utama di bawah lantai
    seg(23.0, 24.2, -12.2, FLOOR(1));                  // lubang isap di dasar ruang hulu
    seg(-24.6, -23.4, -12.2, FLOOR(0));                // lubang buang ke kanal hilir
    for (const x of PORTS) seg(x - 0.45, x + 0.45, -10, FLOOR(0));
    // air di dalam lorong (tampak saat mengalir)
    const wm = new THREE.MeshStandardMaterial({ color: '#2f8fd8', transparent: true, opacity: 0, depthWrite: false, emissive: '#1d6fb8', emissiveIntensity: 0.3 });
    const wf = [box(-24.6, 24.2, -12.2, -9.8, z + 0.05, z + 0.07, wm), box(23.0, 24.2, -12.2, FLOOR(1), z + 0.05, z + 0.07, wm), box(-24.6, -23.4, -12.2, FLOOR(0), z + 0.05, z + 0.07, wm)];
    for (const x of PORTS) wf.push(box(x - 0.45, x + 0.45, -10, FLOOR(0), z + 0.05, z + 0.07, wm));
    wf.forEach(m => { m.renderOrder = 5; g.add(m); });
    // katup sorong kuning
    const valve = (x) => {
      const v = new THREE.Group(); v.add(box(-0.35, 0.35, 0, 2.6, 0, 0.12, M.kuning), box(-0.38, 0.38, 2.4, 2.75, -0.02, 0.14, M.hitam));
      for (let i = 0; i < 4; i++) v.add(box(-0.36, 0.36, 0.3 + i * 0.55, 0.42 + i * 0.55, 0.12, 0.16, M.hitam));
      v.position.set(x, -12.2, z + 0.1); g.add(v);
      g.add(box(x - 0.5, x + 0.5, -9.8, -6.4, z + 0.02, z + 0.06, rim));   // rumah katup
      return v;
    };
    const vIn = valve(20.5), vOut = valve(-21.2);
    c.valves = { vIn, vOut };
    // partikel air
    const pm = new THREE.MeshBasicMaterial({ color: '#d8f3ff', transparent: true, opacity: 0.95, depthWrite: false });
    const parts = []; for (let i = 0; i < 90; i++) { const b = new THREE.Mesh(K.geo('pdrop', () => new THREE.SphereGeometry(0.17, 8, 6)), pm); b.renderOrder = 6; b.visible = false; s.add(b); parts.push(b); }
    const pathIn = px => [[23.6, FLOOR(1) - 0.2], [23.6, -11], [px, -11], [px, FLOOR(0)], [px, FLOOR(0) + 3.2]];
    const pathOut = px => [[px, FLOOR(0) + 2.5], [px, FLOOR(0)], [px, -11], [-24, -11], [-24, FLOOR(0)], [-27, FLOOR(0) + 2.5]];
    const at = (P, u) => {
      let L = 0; const seglen = []; for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seglen.push(d); L += d; }
      let d = u * L; for (let i = 0; i < seglen.length; i++) { if (d <= seglen[i]) { const k = d / seglen[i]; return [lerp(P[i][0], P[i + 1][0], k), lerp(P[i][1], P[i + 1][1], k)]; } d -= seglen[i]; }
      return P[P.length - 1];
    };
    // fase = integral debit (kontinu, deterministik)
    let cache = { t: -1, a: 0, b: 0 };
    const phase = t => {
      if (t < cache.t) cache = { t: -1, a: 0, b: 0 };
      let { t: tt, a, b } = cache; if (tt < 0) tt = 0;
      const dt = 1 / 30; while (tt < t) { const h = Math.min(dt, t - tt); a += st.fin(tt) * h; b += st.fout(tt) * h; tt += h; }
      cache = { t: tt, a, b }; return [a, b];
    };
    // gelembung naik di atas lubang lantai saat mengisi
    const rings = []; const rm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
    for (const x of PORTS) for (let j = 0; j < 2; j++) { const r = new THREE.Mesh(K.geo('ring', () => new THREE.RingGeometry(0.7, 1.0, 28)), rm.clone()); r.rotation.x = -Math.PI / 2; r.renderOrder = 6; s.add(r); rings.push({ r, x, j }); }
    c.upd.push(t => {
      const fi = st.fin(t), fo = st.fout(t), [pa, pb] = phase(t);
      vIn.position.y = -12.2 + 2.2 * ease(cl(st.vin(t))); vOut.position.y = -12.2 + 2.2 * ease(cl(st.vout(t)));
      wm.opacity = 0.85 * cl(Math.max(fi, fo) * 4);
      const mode = fi >= fo ? 1 : -1, f = Math.max(fi, fo), ph = mode > 0 ? pa : pb;
      parts.forEach((b, i) => {
        if (f < 0.015) { b.visible = false; return; }
        const px = PORTS[i % PORTS.length], u = ((ph * 0.11 + i / parts.length) % 1 + 1) % 1;
        const [x, y] = at(mode > 0 ? pathIn(px) : pathOut(px), u);
        const lv0 = st.lv[0](t);
        if (mode > 0 && y > lv0 - 0.4) { b.visible = false; return; }
        b.visible = true; b.position.set(x, y, zp); b.scale.setScalar(0.7 + 0.5 * cl(f * 3));
      });
      const lv0 = st.lv[0](t);
      rings.forEach(({ r, x, j }) => { const k = ((t * 0.9 + j * 0.5 + x * 0.07) % 1); r.position.set(x, lv0 + 0.05, 0); r.scale.setScalar(0.6 + k * 2.6); r.material.opacity = 0.55 * (1 - k) * cl(fi * 4); r.visible = fi > 0.02; });
    });
  }

  /* ---------- crane hantu (yang TIDAK dipakai) ---------- */
  function hantu(c, p, posFn) {
    const gm = new THREE.MeshStandardMaterial({ color: '#ff5a4f', transparent: true, opacity: 0, roughness: 0.6, depthWrite: false, emissive: '#ff2d20', emissiveIntensity: 0.35 });
    const cr = K.cranePelabuhan(); cr.traverse(o => { if (o.isMesh) { o.material = gm; o.castShadow = false; } }); cr.scale.setScalar(2.6); cr.rotation.y = Math.PI / 2; c.scene.add(cr);
    const cab = []; for (let i = 0; i < 4; i++) { const m = K.mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), gm, false, false); c.scene.add(m); cab.push(m); }
    c.upd.push(t => {
      const a = ramp(t, p.hantu[0], p.hantu[0] + 0.5) * (1 - ramp(t, p.hantu[1] - 0.5, p.hantu[1]));
      gm.opacity = 0.55 * a; cr.visible = a > 0.01;
      const [x, y] = posFn(t), by = p.hantuY == null ? TOP(0) + 0.2 : p.hantuY; cr.position.set(x, by, 0);
      const hy = by + 3.6 * 2.6;
      [[-7, -2], [7, -2], [-7, 2], [7, 2]].forEach(([dx, dz], i) => {
        const top = new THREE.Vector3(x, hy, 0), bot = new THREE.Vector3(x + dx, y + 4.5, dz);
        const m = cab[i]; m.visible = a > 0.01 && t >= (p.tali || 0); const L = top.distanceTo(bot);
        m.position.copy(top).add(bot).multiplyScalar(0.5); m.scale.set(1, L, 1); m.lookAt(bot); m.rotateX(Math.PI / 2);
      });
    });
  }

  /* ---------- set: laut lepas ---------- */
  function setLaut(c, p) {
    const s = c.scene;
    const om = new THREE.MeshStandardMaterial({ map: rippleTex(), color: '#3d8fc9', roughness: 0.15, metalness: 0.1 }); om.map.repeat.set(60, 60);
    const ocean = K.mesh(new THREE.PlaneGeometry(1600, 1600), om, false, true); ocean.rotation.x = -Math.PI / 2; s.add(ocean);
    c.upd.push(t => { om.map.offset.set(t * 0.01, t * 0.015); });
    const R = rng(9);
    for (const [x, z, k] of [[-160, -260, 30], [120, -300, 42], [300, -240, 26], [-320, -320, 50], [40, -420, 60]]) { const g = K.mesh(K.geo('isle', () => new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), K.mat('#5c9a46', { flatShading: true }), false, false); g.scale.set(k * 1.6, k * 0.45, k); g.position.set(x, -0.5, z); s.add(g); }
    const sp = p.laju ?? 3;
    const pos = t => [(p.x0 || 0) + sp * t, -DRAFT + 0.08 * Math.sin(t * 1.2), 0];
    c.shipPos = pos; ship(c, pos);
    burung(c, 0, 14, -10, 6, R);
    if (p.dermaga) {
      const q = new THREE.Group(); q.add(box(-60, 60, -6, 2.6, -30, -6.5, [M.beton, M.beton, M.betonGelap, M.beton, M.beton, M.beton], true));
      q.add(box(-60, 60, 2.6, 2.75, -7.6, -6.5, M.kuning));
      for (let x = -50; x < 50; x += 7) q.add(box(x, x + 0.5, 2.6, 3.3, -7.4, -6.9, M.hitam));
      const cols = ['#dc2626', '#0284c7', '#ea580c', '#16a34a', '#eab308', '#2563eb'];
      for (let i = 0; i < 26; i++) { const x = -40 + (i % 9) * 6.5, z = -16 - Math.floor(i / 9) * 4.5, hh = 1 + Math.floor(R() * 3); for (let j = 0; j < hh; j++) q.add(box(x, x + 5.6, 2.6 + j * 2.3, 2.6 + (j + 1) * 2.3 - 0.06, z, z + 2.3, K.mat(cols[(i + j) % cols.length]), true)); }
      s.add(q);
      if (p.crane) {
        const cr = K.cranePelabuhan(); cr.scale.setScalar(2.4); cr.rotation.y = Math.PI / 2; cr.position.set(p.craneX || 0, 0, 0); s.add(cr);
        const hook = cr.children.find(o => o.geometry && o.geometry.type === 'TorusGeometry'), cable = cr.children.find(o => o.geometry && o.geometry.type === 'CylinderGeometry' && o.position.y === 6);
        const crM = cr.children.map(o => o.material);
        c.upd.push(t => {
          const d = ramp(t, p.crane[0], p.crane[1]) * 2.2; if (hook) hook.position.y = 3.6 - d; if (cable) { cable.scale.y = (4.5 + d) / 4.5; cable.position.y = 6.0 - d / 2; }
          const off = ramp(t, p.crane[2], p.crane[2] + 0.6); cr.children.forEach((o, i) => { if (o.material) { o.material = off > 0.5 ? K.mat('#9aa3ab') : crM[i]; } });
        });
      }
      if (p.orang) pekerja(c, p.orang[0], 2.75, p.orang[1], { pose: p.orang[2] || 'pikir', ry: p.orang[3] || 0, s: 1.3 });
    }
  }

  /* ---------- set: peta diorama tanah genting Panama ---------- */
  function setPeta(c, p) {
    const s = c.scene;
    const om = new THREE.MeshStandardMaterial({ map: rippleTex(), color: '#3a8fd0', roughness: 0.2 }); om.map.repeat.set(30, 30);
    const ocean = K.mesh(new THREE.PlaneGeometry(900, 900), om, false, true); ocean.rotation.x = -Math.PI / 2; s.add(ocean);
    c.upd.push(t => { om.map.offset.set(t * 0.006, t * 0.01); });
    // daratan berkelok (Amerika Tengah)
    const sh = new THREE.Shape(); const pts = [];
    for (let i = 0; i <= 40; i++) { const u = i / 40, x = -120 + u * 240; pts.push([x, 14 + 10 * Math.sin(u * 5.2) + 6 * Math.sin(u * 13)]); }
    sh.moveTo(pts[0][0], pts[0][1]); pts.forEach(([x, y]) => sh.lineTo(x, y));
    for (let i = 40; i >= 0; i--) { const u = i / 40, x = -120 + u * 240; sh.lineTo(x, -14 + 10 * Math.sin(u * 5.2 + 0.4) - 5 * Math.sin(u * 11)); }
    const lg = new THREE.ExtrudeGeometry(sh, { depth: 2.4, bevelEnabled: true, bevelSize: 1.2, bevelThickness: 0.6, bevelSegments: 2 });
    lg.rotateX(-Math.PI / 2); const land = K.mesh(lg, [K.mat('#7cb552'), K.mat('#c8a46a')], true, true); s.add(land);
    const R = rng(13);
    for (let i = 0; i < 46; i++) { const x = -110 + R() * 220, u = (x + 120) / 240, zc = -(10 * Math.sin(u * 5.2)) , z = zc + (R() - 0.5) * 18; if (Math.abs(x) < 9) continue; const h = K.mesh(K.geo('hillP', () => new THREE.ConeGeometry(1, 1, 7)), K.mat(R() < 0.5 ? '#5b9a3a' : '#4f8a32', { flatShading: true })); const k = 3 + R() * 5; h.scale.set(k, k * 0.8, k); h.position.set(x, 3 + k * 0.4, z); s.add(h); }
    // jalur terusan dari Pasifik ke Atlantik (terbuka perlahan)
    const curve = new THREE.CatmullRomCurve3([[-4, 3.1, 40], [-4, 3.1, 18], [-1, 3.1, 6], [5, 3.1, -2], [8, 3.1, -14], [10, 3.1, -40]].map(a => new THREE.Vector3(...a)));
    const tg = new THREE.TubeGeometry(curve, 120, 1.3, 8, false); tg.translate(0, -3.1, 0); tg.scale(1, 0.25, 1); tg.translate(0, 3.1, 0);
    const tube = K.mesh(tg, K.mat('#2f9be6', { emissive: '#2f9be6', emissiveIntensity: 0.25 }), false, true); s.add(tube);
    const lake = K.mesh(new THREE.CylinderGeometry(7, 7, 0.5, 28), K.mat('#2f9be6')); lake.scale.z = 0.6; lake.position.set(2, 3.0, 2); s.add(lake);
    const tot = tg.index.count;
    const mini = K.kapalKontainer(); mini.scale.setScalar(0.32); s.add(mini);
    const pin = new THREE.Group(); const pb = K.mesh(new THREE.SphereGeometry(2.2, 18, 14), K.mat('#e2452f')); pb.position.y = 6.5; const pc = K.mesh(new THREE.ConeGeometry(1.4, 4.6, 16), K.mat('#e2452f')); pc.rotation.x = Math.PI; pc.position.y = 3.2; const pw = K.mesh(new THREE.SphereGeometry(0.9, 12, 10), M.putih); pw.position.set(0, 6.6, 1.6); pin.add(pb, pc, pw); s.add(pin);
    c.upd.push(t => {
      const k = ramp(t, p.garis[0], p.garis[1]); tg.setDrawRange(0, Math.floor(tot * k / 6) * 6); lake.scale.setScalar(Math.max(0.001, ramp(t, p.garis[0] + 0.5, p.garis[1]))); lake.scale.z *= 0.6;
      const u = cl((t - p.garis[1] + 0.2) / 5); const q = curve.getPointAt(Math.min(0.999, u)), q2 = curve.getPointAt(Math.min(1, u + 0.001));
      mini.position.set(q.x, 3.0, q.z); mini.rotation.y = Math.atan2(-(q2.z - q.z), q2.x - q.x); mini.visible = t > p.garis[1] - 0.2;
      const d = cl((t - p.pin) / 0.6); pin.position.set(2, 3 + 30 * (1 - back(d)) , 2); pin.visible = t >= p.pin; pin.rotation.y = t * 0.8;
    });
  }

  /* ---------- HUD ---------- */
  const fade = (t, a, b, f = 0.3) => cl((t - a) / f) * (b ? 1 - cl((t - (b - f)) / f) : 1);
  function anchor(c, a, t) {
    if (Array.isArray(a)) return a;
    if (c.anchor) { const r = c.anchor(a, t); if (r) return r; }
    const m = /^ship([-+0-9.,]*)$/.exec(a); if (m) { const sp = (c.shipPos || c.st.ship)(t); const o = (m[1] || '0,0,0').split(',').map(Number); return [sp[0] + (o[0] || 0), sp[1] + (o[1] || 0), sp[2] + (o[2] || 0)]; }
    const g = /^lv(\d)([-+0-9.,]*)$/.exec(a); if (g) { const o = (g[2] || '0,0,0').split(',').map(Number); return [o[0] || 0, c.st.lv[+g[1]](t) + (o[1] || 0), o[2] || 0]; }
    return [0, 0, 0];
  }
  const TXT = (x, y, s, size, anchorTxt = 'middle', col = '#fff', w = 900) => `<text x="${x}" y="${y}" text-anchor="${anchorTxt}" font-family="Inter" font-weight="${w}" font-size="${size}" fill="${col}" stroke="#17181c" stroke-width="${size / 5}" paint-order="stroke" stroke-linejoin="round">${esc(s)}</text>`;
  const SVGI = {
    lift: () => `<rect x="-62" y="-86" width="124" height="172" rx="16" fill="#fff" stroke="#1b1b1d" stroke-width="8"/><rect x="-44" y="-62" width="88" height="128" rx="6" fill="#cfd8e3" stroke="#1b1b1d" stroke-width="6"/><line x1="0" y1="-62" x2="0" y2="66" stroke="#1b1b1d" stroke-width="6"/><path d="M-100 -30 L-80 -60 L-60 -30Z" fill="#2fb85a"/><path d="M-100 30 L-80 60 L-60 30Z" fill="#e2452f"/>`,
    balik: () => `<circle r="80" fill="#3157e8" stroke="#fff" stroke-width="8"/><path d="M-40 -14 A44 44 0 0 1 36 -28" stroke="#fff" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M28 -52 L50 -22 L14 -14Z" fill="#fff"/><path d="M40 14 A44 44 0 0 1 -36 28" stroke="#fff" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M-28 52 L-50 22 L-14 14Z" fill="#fff"/>`,
    gravitasi: () => `<circle r="80" fill="#6d4cd8" stroke="#fff" stroke-width="8"/><circle cy="34" r="26" fill="#7cc8f2" stroke="#fff" stroke-width="5"/><path d="M0 -58 L0 -4" stroke="#fff" stroke-width="13" stroke-linecap="round"/><path d="M-20 -22 L0 2 L20 -22" stroke="#fff" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    kapal: () => `<circle r="80" fill="#fff" stroke="#1b1b1d" stroke-width="7"/><path d="M-56 8 L56 8 L40 38 L-44 38Z" fill="#1e293b"/><rect x="-44" y="-22" width="20" height="30" fill="#dc2626"/><rect x="-22" y="-22" width="20" height="30" fill="#0284c7"/><rect x="0" y="-22" width="20" height="30" fill="#eab308"/><rect x="24" y="-36" width="18" height="44" fill="#f8fafc" stroke="#1b1b1d" stroke-width="3"/>`,
  };
  function hud(c, items) {
    for (const h of items || []) c.hud.push(t => {
      const a = fade(t, h.t0, h.t1, h.f || 0.3); if (a <= 0.001) return '';
      const k = back(cl((t - h.t0) / 0.4));
      if (h.k === 'label') { return null; }
      if (h.k === 'icon') { const bob = Math.sin((t - h.t0) * 2.2) * 6; const sc = (h.s || 1) * k; const inner = SVGI[h.name] ? SVGI[h.name]() : null;
        if (!inner) return ''; return `<g transform="translate(${h.x},${h.y + bob}) scale(${sc.toFixed(3)})" opacity="${a.toFixed(3)}" filter="url(#sh)">${inner}</g>`; }
      if (h.k === 'badge') { const sc = k; const w = h.w || 560;
        return `<g transform="translate(${h.x || 540},${h.y || 700}) scale(${sc.toFixed(3)})" opacity="${a.toFixed(3)}"><rect x="${-w / 2}" y="-92" width="${w}" height="${h.sub ? 184 : 130}" rx="30" fill="#fff" opacity=".95" filter="url(#sh)"/><text y="${h.sub ? 8 : 0}" text-anchor="middle" dominant-baseline="${h.sub ? 'auto' : 'middle'}" font-family="Inter" font-weight="900" font-size="${h.size || 96}" fill="${h.col || '#3157e8'}">${esc(h.text)}</text>${h.sub ? `<text y="66" text-anchor="middle" font-family="Inter" font-weight="800" font-size="40" fill="#2a2a2e">${esc(h.sub)}</text>` : ''}</g>`; }
      if (h.k === 'arrow') { const [x, y] = K.toScreen(c, anchor(c, h.at, t)); const dir = h.dir === 'down' ? 1 : -1, L = (h.len || 150) * k, bob = Math.sin((t - h.t0) * 5) * 10 * dir;
        const col = h.col || (dir < 0 ? '#2fb85a' : '#e8322a'); const y0 = y + bob;
        return `<g opacity="${a.toFixed(3)}" filter="url(#sh)" transform="translate(${x.toFixed(1)},${y0.toFixed(1)})"><path d="M-24 0 L-24 ${dir * L * 0.55} L-52 ${dir * L * 0.55} L0 ${dir * L} L52 ${dir * L * 0.55} L24 ${dir * L * 0.55} L24 0Z" fill="${col}" stroke="#fff" stroke-width="7" stroke-linejoin="round"/>${h.text ? TXT(70, dir < 0 ? -L * 0.5 : L * 0.5 , h.text, 40, 'start') : ''}</g>`; }
      if (h.k === 'tag') { const [x, y] = K.toScreen(c, anchor(c, h.at, t)); const dx = h.dx || 0, dy = h.dy || -120; const lx = Math.max(60, Math.min(1020, x + dx * k)), ly = y + dy * k; const tw = h.text.length * 23 + 50;
        const bx = Math.max(20, Math.min(1060 - tw, lx - tw / 2));
        return `<g opacity="${a.toFixed(3)}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12" fill="#fff" stroke="#1b1b1d" stroke-width="5"/><line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${(ly + 30).toFixed(1)}" stroke="#fff" stroke-width="6" filter="url(#sh)"/><rect x="${bx.toFixed(1)}" y="${(ly - 34).toFixed(1)}" width="${tw}" height="64" rx="14" fill="${h.col || '#1b1b1d'}" filter="url(#sh)"/><text x="${(bx + tw / 2).toFixed(1)}" y="${(ly + 11).toFixed(1)}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="38" fill="#fff">${esc(h.text)}</text></g>`; }
      if (h.k === 'garis') { // garis putus-putus antar dua titik 3D (+teks di tengah)
        const p1 = K.toScreen(c, anchor(c, h.a, t)), p2 = K.toScreen(c, anchor(c, h.b, t)); const L = k;
        const x2 = lerp(p1[0], p2[0], cl(L)), y2 = lerp(p1[1], p2[1], cl(L));
        return `<g opacity="${a.toFixed(3)}"><line x1="${p1[0].toFixed(1)}" y1="${p1[1].toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${h.col || '#ffd23f'}" stroke-width="${h.w || 9}" stroke-dasharray="${h.dash || '26 14'}" stroke-linecap="round" filter="url(#sh)"/>${h.ujung ? `<circle cx="${p1[0].toFixed(1)}" cy="${p1[1].toFixed(1)}" r="12" fill="${h.col || '#ffd23f'}"/><circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="12" fill="${h.col || '#ffd23f'}"/>` : ''}${h.text ? TXT((p1[0] + p2[0]) / 2 + (h.tx || 0), (p1[1] + p2[1]) / 2 + (h.ty || -24), h.text, h.size || 40, 'middle', '#fff', 800) : ''}</g>`; }
      if (h.k === 'kotak') { // garis bingkai poligon 3D berdenyut
        const P = h.pts.map(q => K.toScreen(c, q)); const pulse = 0.7 + 0.3 * Math.sin((t - h.t0) * 6);
        return `<g opacity="${(a * pulse).toFixed(3)}"><polygon points="${P.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ')}" fill="${h.fill || 'rgba(255,210,63,.12)'}" stroke="${h.col || '#ffd23f'}" stroke-width="9" stroke-dasharray="30 16" stroke-linejoin="round"/></g>`; }
      if (h.k === 'meter') { // indikator tinggi air
        const v = c.st.lv[h.lv || 0](t) - (h.base || 0), x = h.x || 860, y = h.y || 520, H = 300, f = cl(v / (h.max || STEP));
        return `<g opacity="${a.toFixed(3)}" transform="translate(${x},${y})" filter="url(#sh)"><rect x="-74" y="-60" width="148" height="${H + 150}" rx="26" fill="#fff" opacity=".95"/><text y="-18" text-anchor="middle" font-family="Inter" font-weight="800" font-size="26" fill="#5d5a55">TINGGI AIR</text><rect x="-26" y="10" width="52" height="${H}" rx="12" fill="#dbe4ec"/><rect x="-26" y="${(10 + H * (1 - f)).toFixed(1)}" width="52" height="${(H * f).toFixed(1)}" rx="12" fill="#2f8fd8"/><text y="${H + 64}" text-anchor="middle" font-family="Inter" font-weight="900" font-size="40" fill="#1b1b1d">+${v.toFixed(1).replace('.', ',')} m</text></g>`; }
      if (h.k === 'teks') return `<g opacity="${a.toFixed(3)}" transform="translate(${h.x},${h.y}) scale(${k.toFixed(3)})">${TXT(0, 0, h.text, h.size || 60, 'middle', h.col || '#fff')}</g>`;
      if (h.k === 'sama') { // dua garis permukaan + tanda "="
        const p1 = K.toScreen(c, anchor(c, h.a, t)), p2 = K.toScreen(c, anchor(c, h.b, t)); const eq = ramp(t, h.teq, h.teq + 0.4);
        const col = eq > 0.5 ? '#2fb85a' : '#ffd23f';
        const seg = (q, w) => `<line x1="${(q[0] - w).toFixed(1)}" y1="${q[1].toFixed(1)}" x2="${(q[0] + w).toFixed(1)}" y2="${q[1].toFixed(1)}" stroke="${col}" stroke-width="10" stroke-linecap="round" filter="url(#sh)"/>`;
        return `<g opacity="${a.toFixed(3)}">${seg(p1, 130)}${seg(p2, 130)}${eq > 0 ? `<g transform="translate(${((p1[0] + p2[0]) / 2).toFixed(1)},${(Math.min(p1[1], p2[1]) - 90).toFixed(1)}) scale(${back(eq).toFixed(3)})"><circle r="56" fill="#2fb85a" stroke="#fff" stroke-width="7" filter="url(#sh)"/><path d="M-26 -12 H26 M-26 12 H26" stroke="#fff" stroke-width="11" stroke-linecap="round"/></g>` : ''}</g>`; }
      return '';
    });
    for (const h of items || []) {
      if (h.k !== 'ikon' && h.k !== 'bunyi') continue;
      const n0 = c.hud.length;
      if (h.k === 'ikon') K.hudIkon(c, h.name, h.x, h.y, h.t0, { s: h.s || 1, coret: h.coret }); else K.hudBunyi(c, h.text, h.x, h.y, h.t0, h.col);
      const f = c.hud[n0]; if (f && h.t1) c.hud[n0] = (t, cc) => { if (t > h.t1) return ''; const o = f(t, cc); return o ? `<g opacity="${(1 - cl((t - h.t1 + 0.25) / 0.25)).toFixed(3)}">${o}</g>` : o; };
    }
  }

  // dipakai ulang oleh dunia topik lain (mis. 70_gedung.js)
  ENG.edu = { hud, spline, kf, box, M, SVGI, pekerja, burung, pohon, water, rippleTex };

  /* ---------- template ---------- */
  ENG.def('terusan', {
    gerak: 'tetap',
    build(c, p) {
      const set = p.set || 'lock';
      if (set === 'laut') setLaut(c, p); else if (set === 'peta') setPeta(c, p);
      else { dunia(c, p); c.shipPos = c.st.ship; ship(c, c.st.ship); if (p.kapal2) for (const q of p.kapal2) { const sp = () => [q[0], c.st.level(q[0], 0) + (q[1] || 0) - DRAFT, 0]; const s2 = K.kapalKontainer(); s2.scale.setScalar(1.55); c.scene.add(s2); c.upd.push(t => { const x = q[0]; s2.position.set(x, c.st.level(x, t) - DRAFT + 0.05 * Math.sin(t + x), 0); }); } }
      if (p.hantu) hantu(c, p, c.shipPos || c.st.ship);
      if (!c.st) c.st = { lv: [() => 0, () => 0, () => 0] };
      // langit + kabut
      c.scene.background = K.tex('panSky', 8, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5aa9e6'); g.addColorStop(0.55, '#a9d4f5'); g.addColorStop(1, '#e8f3fb'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
      c.scene.fog = new THREE.Fog('#d4e8f7', p.kabut ? p.kabut[0] : 160, p.kabut ? p.kabut[1] : 700);
      // kamera: spline global; target relatif kapal bila kunci ber-flag
      const cam = (window.PLAN.cams || {})[p.cam] || [[0, 0, 0, 0, 40, -30, 20, 34]];
      const rel = p.camRel;
      c.shot = { target: (p.focus || [0, 0, 0]).slice(), dist: 40, yaw: 0, pitch: 20, fov: 34 };
      c.shotAt = t => {
        const v = spline(cam, t); let tg = [v[0], v[1], v[2]];
        if (rel) { const sp = c.shipPos(t); tg = [tg[0] + sp[0], tg[1] + sp[1] * (rel === 'xy' ? 1 : 0), tg[2]]; }
        return { target: tg, dist: v[3], yaw: v[4], pitch: v[5], fov: v[6] };
      };
      // bayangan mengikuti titik fokus adegan
      let fixed = false;
      c.upd.push(t => {
        if (fixed) return; fixed = true;
        c.scene.traverse(o => { if (o.isDirectionalLight && o.castShadow) { const sc = o.shadow.camera, S = p.bayang || 40; sc.left = sc.bottom = -S; sc.right = sc.top = S; sc.far = 260; sc.updateProjectionMatrix(); const f = p.focus || [0, 0, 0]; o.position.set(f[0] - 30, f[1] + 60, f[2] + 40); o.target.position.set(f[0], f[1], f[2]); o.shadow.mapSize.set(2048, 2048); } });
      });
      hud(c, p.hud);
    },
  });
})();

/* Edukasi 3D - template 'gedung': memindahkan gedung Indiana Bell (1930) tanpa membongkar.
 * Keadaan dunia = fungsi waktu global PLAN.tl (bisa ditimpa p.tl):
 *   bx (geser m), rot (derajat), lift (m), beam/jack/track/roller/ring/ram/cut (0..1).
 * Kamera = spline PLAN.cams[p.cam]; camRel:"b" membuat target mengikuti gedung.
 */
(function () {
  const THREE = window.THREE, K = window.K, E = ENG.edu;
  const { cl, ease, ramp, lerp, back, rng, esc } = ENG.H;
  const { box, M, kf, spline } = E;

  const W = 26, D = 18, FH = 3.6, NF = 8, Y0 = 1.2, HT = Y0 + NF * FH;   // gedung: 26 x 18 m, 8 lantai
  const PIVOT_X = 16;                                                      // gedung bergeser 16 m lalu berputar 90°
  const TRACK_Z = 10;

  /* ---------- tekstur ---------- */
  const facadeTex = (lit) => K.tex('gdFac' + lit, 256, 256, (x, w, h) => {
    x.fillStyle = '#e4d4b2'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(150,120,80,.18)'; for (let i = 0; i < 8; i++) x.fillRect(0, i * 32, w, 2);
    const R = rng(lit ? 5 : 9);
    for (let i = 0; i < 2; i++) {
      const x0 = 34 + i * 128, y0 = 52, ww = 60, hh = 150;
      x.fillStyle = '#b8a27c'; x.fillRect(x0 - 8, y0 - 8, ww + 16, hh + 22);
      const on = lit && R() < 0.55;
      const g = x.createLinearGradient(0, y0, 0, y0 + hh); g.addColorStop(0, on ? '#ffe9b0' : '#5b7894'); g.addColorStop(1, on ? '#f3c76d' : '#2c4258');
      x.fillStyle = g; x.fillRect(x0, y0, ww, hh);
      x.fillStyle = '#f5efe2'; x.fillRect(x0 + ww / 2 - 3, y0, 6, hh); x.fillRect(x0, y0 + hh * 0.45, ww, 6);
      x.fillStyle = '#cdb994'; x.fillRect(x0 - 12, y0 + hh + 8, ww + 24, 8);
    }
  });
  const signTex = () => K.tex('gdSign', 512, 96, (x, w, h) => {
    x.fillStyle = '#2b3a4a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#d9b45a'; x.lineWidth = 6; x.strokeRect(6, 6, w - 12, h - 12);
    x.fillStyle = '#f4e3b0'; x.font = 'bold 56px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('INDIANA BELL', w / 2, h / 2 + 3);
  });
  const roadTex = () => K.tex('gdRoad', 256, 256, (x, w, h) => {
    x.fillStyle = '#4a4c50'; x.fillRect(0, 0, w, h); const R = rng(3);
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '0,0,0'},.05)`; x.fillRect(R() * w, R() * h, 2, 2); }
    x.fillStyle = '#e9e2c8'; for (let i = 0; i < 4; i++) x.fillRect(i * 64 + 8, h / 2 - 3, 36, 6);
  });
  const blueprintTex = () => K.tex('gdBlue', 256, 192, (x, w, h) => {
    x.fillStyle = '#2459a8'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 2;
    x.strokeRect(40, 40, 120, 90); for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(40 + i * 30, 130); x.lineTo(40 + i * 30, 150); x.stroke(); }
    x.beginPath(); x.arc(190, 90, 40, -1.6, 0); x.stroke(); x.beginPath(); x.moveTo(160, 85); x.lineTo(230, 85); x.stroke();
  });

  /* ---------- keadaan ---------- */
  function stateOf(p) {
    const TL = Object.assign({}, window.PLAN.tl || {}, p.tl || {});
    const S = k => t => kf(TL[k], t);
    const st = {};
    for (const k of ['bx', 'rot', 'lift', 'beam', 'jack', 'track', 'roller', 'ring', 'ram', 'cut', 'jitter', 'tilt']) st[k] = S(k);
    // posisi pusat gedung: geser sepanjang x, lalu berputar di tempat (pivot = pusat setelah geser)
    st.pos = t => [st.bx(t), st.lift(t), 0];
    st.dist = t => st.bx(t) + Math.abs(st.rot(t)) * Math.PI / 180 * 8;  // jarak tempuh rol (untuk putaran rol)
    return st;
  }

  /* ---------- tokoh mengetik (pose tangan sendiri) ---------- */
  function ketik(g, t, ph) {
    K.pose(g, 'berdiri', t);
    const J = g.userData.J, a = Math.sin((t + ph) * 18), b = Math.sin((t + ph) * 16 + 1);
    J.shL.rotation.set(-0.9 + 0.08 * a, 0, 0.15); J.shR.rotation.set(-0.9 + 0.08 * b, 0, -0.15);
    J.elL.rotation.x = -0.9; J.elR.rotation.x = -0.9; J.head.rotation.x = 0.25; J.spine.rotation.x = 0.12;
  }
  function orang(o = {}) {
    const g = K.orang({ baju: o.baju || '#f2f2ee', celana: o.celana || '#2f3542', caping: false });
    if (o.helm) { const h = K.mesh(K.geo('helm', () => new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), K.mat(o.helm)); h.position.y = 0.2; g.userData.J.head.add(h); }
    if (o.topi) { const h = new THREE.Group(); h.add(box(-0.2, 0.2, 0, 0.16, -0.2, 0.2, K.mat(o.topi)), box(-0.24, 0.24, 0, 0.03, -0.24, 0.24, K.mat(o.topi))); h.position.y = 0.26; g.userData.J.head.add(h); }
    if (o.dasi) { const d = box(-0.04, 0.04, -0.24, 0, 0.17, 0.2, K.mat(o.dasi)); d.position.y = 0.5; g.userData.J.spine.add(d); }
    g.scale.setScalar(o.s || 1.3);
    return g;
  }

  /* ---------- gedung ---------- */
  function gedung(c, st, p) {
    const B = new THREE.Group(); c.scene.add(B); c.B = B;
    // fondasi lama (terlihat setelah gedung pindah)
    c.scene.add(box(-W / 2 - 0.4, W / 2 + 0.4, 0, 0.12, -D / 2 - 0.4, D / 2 + 0.4, K.mat('#8f8a7e', { roughness: 1 }), false));
    const stone = K.mat('#d9c8a4', { roughness: 0.9 }), stoneD = K.mat('#b9a47c', { roughness: 0.9 }), inner = K.mat('#efe6d2', { roughness: 0.95 }), floorM = K.mat('#9b7b58', { roughness: 0.8 });
    const fm = (rx, lit = true) => { const m = new THREE.MeshStandardMaterial({ map: facadeTex(lit), roughness: 0.85 }); m.map.repeat.set(rx, NF); return m; };
    // dinding samping & belakang (tebal 0.5) dengan jendela di luar, krem di dalam
    B.add(box(-W / 2, W / 2, Y0, HT, -D / 2, -D / 2 + 0.5, [stone, stone, stone, stone, inner, fm(8)], true));
    B.add(box(-W / 2, -W / 2 + 0.5, Y0, HT, -D / 2, D / 2, [inner, fm(6), stone, stone, stone, stone], true));
    B.add(box(W / 2 - 0.5, W / 2, Y0, HT, -D / 2, D / 2, [fm(6), inner, stone, stone, stone, stone], true));
    // pita dasar (basement) + atap + parapet + cornice
    B.add(box(-W / 2 - 0.2, W / 2 + 0.2, 0, Y0, -D / 2 - 0.2, D / 2 + 0.2, stoneD, true));
    B.add(box(-W / 2, W / 2, HT, HT + 0.35, -D / 2, D / 2, K.mat('#8a8f94'), true));
    for (const [x0, x1, z0, z1] of [[-W / 2 - 0.5, W / 2 + 0.5, -D / 2 - 0.5, -D / 2 + 0.3], [-W / 2 - 0.5, -W / 2 + 0.3, -D / 2, D / 2], [W / 2 - 0.3, W / 2 + 0.5, -D / 2, D / 2]])
      B.add(box(x0, x1, HT - 0.4, HT + 1.1, z0, z1, stoneD, true));
    // lantai-lantai + lampu langit-langit
    for (let k = 0; k <= NF; k++) {
      const y = Y0 + k * FH;
      B.add(box(-W / 2 + 0.5, W / 2 - 0.5, y - 0.15, y + 0.15, -D / 2 + 0.5, D / 2 - 0.2, k === NF ? K.mat('#8a8f94') : floorM));
      if (k < NF) for (const x of [-7, 0, 7]) { const l = box(x - 1.2, x + 1.2, y + FH - 0.32, y + FH - 0.2, -2, -1.6, K.mat('#fff6d8', { emissive: '#ffe6a0', emissiveIntensity: 0.8 })); B.add(l); }
    }
    // kolom interior
    for (const x of [-6.5, 6.5]) for (const z of [3]) B.add(box(x - 0.3, x + 0.3, Y0, HT, z - 0.3, z + 0.3, K.mat('#e2d6bd')));
    // isi kantor: meja, mesin tik, kertas, karyawan
    const R = rng(21); const shirts = ['#f2f2ee', '#dfe9f3', '#f3e7d0', '#e9dff0'];
    c.workers = [];
    for (let k = 0; k < NF; k++) {
      const y = Y0 + k * FH + 0.15;
      for (const x of [-9, -3, 3, 9]) {
        if (R() < 0.12) continue;
        const desk = new THREE.Group();
        desk.add(box(-1.0, 1.0, 0.72, 0.8, -0.5, 0.5, K.mat('#7a5233')), box(-0.95, -0.85, 0, 0.72, -0.45, 0.45, K.mat('#5d3e26')), box(0.85, 0.95, 0, 0.72, -0.45, 0.45, K.mat('#5d3e26')));
        desk.add(box(-0.3, 0.3, 0.8, 1.0, -0.2, 0.2, K.mat('#22252a')), box(-0.22, 0.22, 1.0, 1.3, -0.08, -0.04, K.mat('#fbfbf6')));
        if (R() < 0.6) desk.add(box(0.45, 0.85, 0.8, 0.86, -0.25, 0.15, K.mat('#f4f1e6')));
        desk.position.set(x, y, -3.4); B.add(desk);
        const w = orang({ baju: shirts[(k + x) & 3], dasi: R() < 0.5 ? '#7a2b2b' : null, s: 1.25 });
        w.position.set(x, y, -4.3); B.add(w); c.workers.push({ w, ph: R() * 5, k, x });
      }
      // satu karyawan berjalan per dua lantai
      if (k % 2 === 0 && k !== 2) { const w = orang({ baju: '#cfe0f0', s: 1.25 }); w.position.set(0, y, 1.5); B.add(w); c.workers.push({ w, ph: R() * 9, k, walk: 1 }); }
    }
    c.upd.push(t => { for (const q of c.workers) { if (q.walk) { const ph = Math.sin((t + q.ph) * 0.35); q.w.position.x = 8 * ph; q.w.rotation.y = Math.cos((t + q.ph) * 0.35) > 0 ? Math.PI / 2 : -Math.PI / 2; K.pose(q.w, 'jalan', t); } else ketik(q.w, t, q.ph); } });
    // fasad depan (bisa turun ke tanah = tampak dalam)
    const F = new THREE.Group(); B.add(F);
    const ff = new THREE.MeshStandardMaterial({ map: facadeTex(true), roughness: 0.85 }); ff.map.repeat.set(8, NF);
    F.add(box(-W / 2, W / 2, Y0, HT, D / 2 - 0.5, D / 2, [stone, stone, stone, stone, ff, inner], true));
    F.add(box(-W / 2 - 0.5, W / 2 + 0.5, HT - 0.4, HT + 1.1, D / 2 - 0.3, D / 2 + 0.5, stoneD, true));
    // pintu masuk berpilar + papan nama
    F.add(box(-4, 4, Y0, Y0 + 4.2, D / 2, D / 2 + 1.2, stoneD, true));
    for (const x of [-3.2, -1.1, 1.1, 3.2]) { const col = K.mesh(K.geo('gdCol', () => new THREE.CylinderGeometry(0.28, 0.32, 4.2, 12)), K.mat('#efe4c8')); col.position.set(x, Y0 + 2.1, D / 2 + 1.5); F.add(col); }
    F.add(box(-4.4, 4.4, Y0 + 4.2, Y0 + 4.9, D / 2, D / 2 + 1.9, stoneD, true));
    const sg = K.mesh(new THREE.PlaneGeometry(7.6, 1.4), new THREE.MeshStandardMaterial({ map: signTex(), roughness: 0.6, emissive: '#3a2e10', emissiveIntensity: 0.25 }), false, false);
    sg.position.set(0, Y0 + 5.9, D / 2 + 0.02); F.add(sg);
    F.add(box(-1.2, 1.2, Y0, Y0 + 3.2, D / 2 + 1.21, D / 2 + 1.25, K.mat('#3b2a1c')));
    // struktur bawah: balok baja (menembus pita dasar), dongkrak, rol
    const U = new THREE.Group(); B.add(U);
    const beamM = K.mat('#c0452e', { roughness: 0.55, metalness: 0.3 });
    const beams = [];
    for (let x = -12; x <= 12; x += 3) { const b = box(-0.35, 0.35, 0.3, 1.1, -(D / 2 + 2.2), D / 2 + 2.2, beamM, true); b.position.x = x; U.add(b); beams.push(b); }
    const jackM = K.mat('#f2b632', { roughness: 0.4, metalness: 0.2 }), steel = K.mat('#c7ccd1', { roughness: 0.3, metalness: 0.7 });
    const jacks = [];
    for (let x = -12; x <= 12; x += 6) for (const z of [-(D / 2 + 1.4), D / 2 + 1.4]) {
      const j = new THREE.Group(); j.add(K.mesh(K.geo('jBody', () => new THREE.CylinderGeometry(0.32, 0.36, 0.6, 12)), jackM)); j.children[0].position.y = 0.3;
      const pis = K.mesh(K.geo('jPis', () => new THREE.CylinderGeometry(0.16, 0.16, 1, 10)), steel); j.add(pis);
      j.userData.pis = pis; j.position.set(x, 0, z); c.scene.add(j); jacks.push(j);
    }
    const rollM = K.mat('#9aa3ab', { roughness: 0.25, metalness: 0.8 });
    const rollers = [];
    for (const z of [-TRACK_Z, TRACK_Z]) for (let i = 0; i < 18; i++) { const r = K.mesh(K.geo('roll', () => new THREE.CylinderGeometry(0.25, 0.25, 1.3, 14)), rollM); r.rotation.x = Math.PI / 2; U.add(r); rollers.push({ r, z, i }); }
    // rel lurus di tanah + rel melingkar untuk memutar
    const trackM = K.mat('#3d4651', { roughness: 0.5, metalness: 0.5 });
    const tracks = new THREE.Group(); c.scene.add(tracks);
    for (const z of [-TRACK_Z, TRACK_Z]) tracks.add(box(-16, PIVOT_X + 14, 0, 0.3, z - 0.35, z + 0.35, trackM, true));
    const ring = K.mesh(new THREE.TorusGeometry(TRACK_Z, 0.3, 6, 64), trackM, true, true); ring.rotation.x = -Math.PI / 2; ring.position.set(PIVOT_X, 0.15, 0); ring.scale.z = 0.5; c.scene.add(ring);
    // pendorong hidrolik di belakang
    const rams = [];
    for (const z of [-5, 5]) {
      const g = new THREE.Group(); g.add(box(-17.5, -15.5, 0, 1.6, z - 0.9, z + 0.9, K.mat('#7d8790'), true));
      const body = box(0, 2.2, 0.55, 1.05, z - 0.3, z + 0.3, jackM, true); body.position.x = -15.5; g.add(body);
      const rod = K.mesh(K.geo('ramRod', () => new THREE.CylinderGeometry(0.13, 0.13, 1, 8)), steel); rod.rotation.z = Math.PI / 2; rod.position.set(0, 0.8, z); g.add(rod);
      c.scene.add(g); rams.push({ g, rod });
    }
    c.upd.push(t => {
      const [bx, lift] = st.pos(t), rot = st.rot(t) * Math.PI / 180, jit = st.jitter(t) * 0.04 * Math.sin(t * 40);
      B.position.set(bx + jit, lift, 0); B.rotation.set(0, rot, st.tilt(t) * Math.PI / 180, 'YXZ');
      F.position.y = -36 * ease(cl(st.cut(t))); F.visible = st.cut(t) < 0.999;
      const bk = ease(cl(st.beam(t)));
      beams.forEach((b, i) => { const k = cl(bk * 1.6 - i * 0.07); b.scale.z = Math.max(0.001, k); b.visible = k > 0.002; });
      const jk = cl(st.jack(t));
      jacks.forEach(j => { j.visible = jk > 0.01; j.scale.setScalar(Math.max(0.001, back(jk))); const top = 0.3 + lift; j.userData.pis.scale.y = Math.max(0.05, top - 0.6); j.userData.pis.position.y = 0.6 + (top - 0.6) / 2; });
      tracks.visible = st.track(t) > 0.01; tracks.scale.x = Math.max(0.001, ease(cl(st.track(t)))); tracks.position.x = (1 - tracks.scale.x) * -16;
      ring.visible = st.ring(t) > 0.01; ring.scale.set(Math.max(0.001, ease(cl(st.ring(t)))), Math.max(0.001, ease(cl(st.ring(t)))), 0.5 * Math.max(0.001, ease(cl(st.ring(t)))));
      const rk = cl(st.roller(t)), dist = st.dist(t), span = 18 * 1.5;
      rollers.forEach(({ r, z, i }) => {
        const x = (((i * 1.5 - dist / 2) % span) + span) % span - span / 2 + 0.75;
        r.position.set(x, 0.55 - lift, z); r.rotation.y = 0; r.rotation.z = 0; r.rotation.x = Math.PI / 2;
        r.rotateY(-dist / 0.25); r.visible = rk > 0.01 && Math.abs(x) < W / 2 + 0.5; r.scale.setScalar(Math.max(0.001, rk));
      });
      const rm = cl(st.ram(t));
      rams.forEach(({ g, rod }) => { g.visible = rm > 0.01; const end = bx - W / 2 - 0.3, x0 = -13.3; const L = Math.max(0.2, end - x0); rod.scale.y = L; rod.position.x = x0 + L / 2; });
    });
    c.bLocal = (lx, ly, lz) => { const v = new THREE.Vector3(lx, ly, lz); B.updateMatrixWorld(); return B.localToWorld(v).toArray(); };
    return B;
  }

  /* ---------- kota 1930 ---------- */
  function kota(c, st, p) {
    const s = c.scene, R = rng(31);
    const grass = K.mat('#86b45a', { roughness: 0.95 }), walk = K.mat('#cfc9b8', { roughness: 0.9 });
    const g0 = K.mesh(new THREE.PlaneGeometry(900, 900), grass, false, true); g0.rotation.x = -Math.PI / 2; g0.position.y = -0.01; s.add(g0);
    const lot = K.mesh(new THREE.PlaneGeometry(76, 46), K.mat('#bdb6a3', { roughness: 0.95 }), false, true); lot.rotation.x = -Math.PI / 2; lot.position.set(8, 0.005, -2); s.add(lot);
    const road = (x, z, w, d, rot) => { const m = new THREE.MeshStandardMaterial({ map: roadTex(), roughness: 0.9 }); m.map.repeat.set(w / 12, 1); const r = K.mesh(new THREE.PlaneGeometry(w, d), m, false, true); r.rotation.x = -Math.PI / 2; r.rotation.z = rot || 0; r.position.set(x, 0.01, z); s.add(r); };
    road(0, 27, 400, 10); road(-36, -60, 260, 10, Math.PI / 2); road(56, -60, 260, 10, Math.PI / 2);
    s.add(box(-200, 200, 0, 0.2, 21, 22.2, walk), box(-200, 200, 0, 0.2, 31.8, 33, walk));
    // gedung tetangga
    const cols = ['#d8cbb4', '#c9b79c', '#e3d8c4', '#b9a58a', '#d4c3a8', '#cbbfae'];
    for (let i = 0; i < 9; i++) { const w = 10 + R() * 8, h = 12 + R() * 22; const g = K.gedung(w, h, cols[i % 6], R); g.position.set(-90 + i * 22, 0, -44 - R() * 10); s.add(g); }
    for (let i = 0; i < 8; i++) { const w = 10 + R() * 8, h = 10 + R() * 16; const g = K.gedung(w, h, cols[(i + 2) % 6], R); g.position.set(-110 + i * 30, 0, 118 + R() * 6); g.rotation.y = Math.PI; s.add(g); }
    for (const x of [-112, -98, 128, 142]) { const g = K.gedung(10, 14 + R() * 10, cols[R() * 6 | 0], R); g.position.set(x, 0, -8); g.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; s.add(g); }
    // pohon & lampu jalan
    for (let i = 0; i < 16; i++) { const x = -100 + i * 13; if (x > -30 && x < 50) continue; const tr = K.pohon(R, 1.1 + R() * 0.4); tr.position.set(x, 0.2, 20.6); s.add(tr); }
    for (let i = 0; i < 12; i++) { const L = K.lampu(); L.position.set(-90 + i * 16, 0.2, 21.2); s.add(L); }
    // tiang telepon + kabel ke gedung (utilitas tetap tersambung)
    const poleM = K.mat('#6b4a2f');
    const pole = (x, z) => { const g = new THREE.Group(); g.add(box(-0.18, 0.18, 0, 12, -0.18, 0.18, poleM, true), box(-1.6, 1.6, 10.8, 11.1, -0.12, 0.12, poleM)); for (const dx of [-1.3, -0.4, 0.4, 1.3]) g.add(box(dx - 0.06, dx + 0.06, 11.1, 11.35, -0.06, 0.06, K.mat('#e6e1d4'))); g.position.set(x, 0, z); s.add(g); return [x, 11.3, z]; };
    const P1 = pole(-24, 18), P2 = pole(-30, 4);
    const hyd = new THREE.Group(); hyd.add(K.mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.9, 10), K.mat('#d0312d'))); hyd.children[0].position.y = 0.45; hyd.position.set(-21, 0, 14); s.add(hyd);
    const cableM = K.mat('#1f2328'), hoseM = K.mat('#2f6fb3');
    const lines = [
      { a: P1, b: [-W / 2, 26, 4], m: cableM, r: 0.06, sag: 2.2, k: 'listrik' },
      { a: [P1[0] + 1.3, P1[1], P1[2]], b: [-W / 2, 24, 7], m: cableM, r: 0.06, sag: 2.6, k: 'listrik' },
      { a: P2, b: [-W / 2, 20, -4], m: K.mat('#3a3020'), r: 0.07, sag: 2.0, k: 'telepon' },
      { a: [P2[0] - 1.3, P2[1], P2[2]], b: [-W / 2, 18, -6], m: K.mat('#3a3020'), r: 0.07, sag: 2.4, k: 'telepon' },
      { a: [-21, 0.7, 14], b: [-W / 2, 0.8, 6], m: hoseM, r: 0.16, sag: 0, k: 'air', tanah: 1 },
    ];
    const NS = 12;
    for (const L of lines) { L.seg = []; for (let i = 0; i < NS; i++) { const m = K.mesh(new THREE.CylinderGeometry(L.r, L.r, 1, 6), L.m, false, false); s.add(m); L.seg.push(m); } }
    c.lines = lines;
    c.lineUpd = (t => {
      for (const L of lines) {
        const A = new THREE.Vector3(...L.a), Bw = new THREE.Vector3(...c.bLocal(...L.b));
        const pt = u => { const v = A.clone().lerp(Bw, u); if (L.tanah) v.y = Math.max(0.18, v.y - 0.6 * Math.sin(Math.PI * u)); else v.y -= L.sag * 4 * u * (1 - u); return v; };
        for (let i = 0; i < NS; i++) { const p0 = pt(i / NS), p1 = pt((i + 1) / NS), m = L.seg[i]; const len = p0.distanceTo(p1); m.position.copy(p0).add(p1).multiplyScalar(0.5); m.scale.set(1, len, 1); m.lookAt(p1); m.rotateX(Math.PI / 2); }
      }
    });
    // mobil 1930 di jalan
    const car = (col) => { const g = new THREE.Group(); g.add(box(-2, 2, 0.5, 1.3, -0.9, 0.9, K.mat(col), true), box(-1.1, 0.9, 1.3, 2.2, -0.85, 0.85, K.mat(col), true), box(-1.0, 0.8, 1.45, 2.05, -0.87, 0.87, K.mat('#9fc3d8'))); for (const [x, z] of [[-1.3, -0.9], [1.3, -0.9], [-1.3, 0.9], [1.3, 0.9]]) { const w = K.mesh(K.geo('cw', () => new THREE.CylinderGeometry(0.45, 0.45, 0.25, 12)), K.mat('#1b1b1b')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.45, z); g.add(w); } g.add(box(2, 2.3, 0.6, 1.0, -0.6, 0.6, K.mat('#d8d2c0'))); s.add(g); return g; };
    const cars = [['#2b2b2b', 4, 25, 0], ['#5a2324', -3.5, 29, 40], ['#24384f', 3, 25, 120], ['#3d4a2e', -4, 29, 200]].map(([col, v, z, ph]) => ({ g: car(col), v, z, ph }));
    if (p.ngebut) cars.push({ g: car('#c0392b'), v: 60, z: 25, ph: 0, t0: p.ngebut });
    c.upd.push(t => { for (const q of cars) { const x = q.t0 != null ? -160 + (t - q.t0) * q.v : ((q.ph + q.v * t) % 320 + 320) % 320 - 160; q.g.position.set(q.v < 0 ? -x : x, 0, q.z); q.g.rotation.y = q.v < 0 ? Math.PI : 0; q.g.visible = q.t0 == null || (x > -150 && x < 150); } });
    // pejalan kaki
    for (let i = 0; i < 8; i++) { const w = orang({ baju: ['#7a5c3e', '#3e5a7a', '#6d6d6d', '#8a3b3b'][i % 4], topi: i % 2 ? '#2a2a2a' : null, s: 1.3 }); const z = 21.6 + (i % 2) * 10.8, ph = i * 37; s.add(w); c.upd.push(t => { const x = (((ph + (i % 2 ? -1 : 1) * 1.3 * t) % 200) + 200) % 200 - 100; w.position.set(x, 0.2, z); w.rotation.y = i % 2 ? -Math.PI / 2 : Math.PI / 2; K.pose(w, 'jalan', t); }); }
  }

  /* ---------- tambahan per adegan ---------- */
  function extras(c, st, p) {
    const s = c.scene;
    if (p.rame) {   // ramai-ramai mencoba mengangkat
      const R = rng(55);
      for (let i = 0; i < 26; i++) {
        const side = i % 4, u = (Math.floor(i / 4) + 0.5) / 7;
        const [x, z, ry] = side === 0 ? [-W / 2 + u * W, D / 2 + 1.6, Math.PI] : side === 1 ? [-W / 2 + u * W, -D / 2 - 1.6, 0] : side === 2 ? [-W / 2 - 1.6, -D / 2 + u * D, Math.PI / 2] : [W / 2 + 1.6, -D / 2 + u * D, -Math.PI / 2];
        const w = orang({ baju: ['#f97316', '#2563eb', '#16a34a', '#eab308'][i % 4], s: 1.3 }); w.position.set(x, 0, z); w.rotation.y = ry; s.add(w);
        const ph = R() * 3; c.upd.push(t => { K.pose(w, 'angkat', t * 0.4 + ph); w.visible = t >= p.rame[0] && t <= p.rame[1]; });
      }
    }
    if (p.lemari) { // dua orang menggotong lemari, menabrak tiang
      const g = new THREE.Group(); const lm = box(-0.7, 0.7, 0, 2.1, -0.35, 0.35, K.mat('#8a5a33'), true); g.add(lm, box(-0.02, 0.02, 0.1, 2.0, 0.35, 0.37, K.mat('#5d3c21')), box(-0.45, -0.35, 1.0, 1.1, 0.36, 0.4, K.mat('#d9b45a')), box(0.35, 0.45, 1.0, 1.1, 0.36, 0.4, K.mat('#d9b45a')));
      g.rotation.z = Math.PI / 2; const holder = new THREE.Group(); holder.add(g); s.add(holder);
      const a = orang({ baju: '#2563eb', s: 1.3 }), b = orang({ baju: '#16a34a', s: 1.3 }); s.add(a, b);
      const [x0, z0] = p.lemari.pos;
      c.upd.push(t => {
        const k = t - p.lemari.t0, x = x0 + Math.min(k, 1.6) * 1.1 - Math.max(0, k - 1.6) * 0.4 * Math.exp(-(k - 1.6)), wob = Math.sin(t * 9) * 0.06 + (k > 1.6 && k < 2.2 ? Math.sin((k - 1.6) * 30) * 0.12 * (2.2 - k) : 0);
        holder.position.set(x, 1.0, z0); holder.rotation.z = wob;
        a.position.set(x - 1.6, 0.2, z0); b.position.set(x + 1.6, 0.2, z0); a.rotation.y = Math.PI / 2; b.rotation.y = -Math.PI / 2;
        K.pose(a, k > 1.6 && k < 2.6 ? 'kaget' : 'dorong', t, p.lemari.t0 + 1.6); K.pose(b, 'dorong', t + 0.5);
      });
      const L = K.lampu(); L.position.set(x0 + 3.7, 0.2, z0 - 0.2); s.add(L);
    }
    if (p.insinyur) { // tim insinyur dengan cetak biru
      const [x0, z0] = p.insinyur;
      const tb = new THREE.Group(); tb.add(box(-1.4, 1.4, 0.9, 1.0, -0.8, 0.8, K.mat('#6b4a2f'), true));
      for (const [x, z] of [[-1.3, -0.7], [1.3, -0.7], [-1.3, 0.7], [1.3, 0.7]]) tb.add(box(x - 0.06, x + 0.06, 0, 0.9, z - 0.06, z + 0.06, K.mat('#4d3420')));
      const bp = K.mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshStandardMaterial({ map: blueprintTex(), roughness: 0.7 }), false, true); bp.rotation.x = -Math.PI / 2; bp.position.y = 1.01; tb.add(bp);
      tb.position.set(x0, 0.2, z0); s.add(tb);
      [[-2, 0, Math.PI / 2, 'tunjuk'], [2, 0, -Math.PI / 2, 'pikir'], [0, -1.8, 0, 'berdiri'], [0.9, 1.9, Math.PI, 'lapor']].forEach(([dx, dz, ry, pose], i) => {
        const w = orang({ baju: '#f4f1e6', celana: '#3b3f46', helm: '#ffffff', dasi: '#2b4c7e', s: 1.3 }); w.position.set(x0 + dx, 0.2, z0 + dz); w.rotation.y = ry; s.add(w);
        c.upd.push(t => K.pose(w, pose, t + i));
      });
    }
    if (p.pekerjaBaja) { // pekerja di dongkrak & rol
      [[-12, D / 2 + 2.6, Math.PI], [0, D / 2 + 2.6, Math.PI], [12, D / 2 + 2.6, Math.PI], [-6, -(D / 2 + 2.6), 0], [6, -(D / 2 + 2.6), 0]].forEach(([x, z, ry], i) => {
        const w = orang({ baju: '#5b6b7b', celana: '#2d3640', helm: '#facc15', s: 1.3 }); w.rotation.y = ry; s.add(w);
        c.upd.push(t => { const [bx] = st.pos(t); w.position.set(x + bx, 0, z); K.pose(w, i % 2 ? 'dorong' : 'gali', t + i * 0.4); w.visible = t >= p.pekerjaBaja[0] && t <= p.pekerjaBaja[1]; });
      });
    }
    if (p.siput) { // siput yang lebih cepat dari gedung
      const g = new THREE.Group(); const body = K.mesh(new THREE.CapsuleGeometry(0.22, 1.0, 6, 12), K.mat('#d9c7a0')); body.rotation.z = Math.PI / 2; body.position.y = 0.22; g.add(body);
      const sh = K.mesh(new THREE.SphereGeometry(0.5, 18, 14), K.mat('#a0612b')); sh.scale.set(1, 1, 0.62); sh.position.set(-0.15, 0.68, 0); g.add(sh);
      for (const z of [-0.3, 0.3]) { const sp = K.mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 20), K.mat('#e7c48c')); sp.position.set(-0.15, 0.7, z); g.add(sp); }
      for (const z of [-0.08, 0.08]) { const a = K.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6), K.mat('#d9c7a0')); a.position.set(0.68, 0.52, z); a.rotation.z = -0.4; g.add(a); const e = K.mesh(K.geo('eye', () => new THREE.SphereGeometry(0.022, 8, 6)), K.mat('#1a1410')); e.position.set(0.78, 0.74, z); g.add(e); }
      g.scale.setScalar(1.6); s.add(g);
      c.upd.push(t => { const k = Math.max(0, t - p.siput[0]); g.position.set(p.siput[1] + k * 0.9, 0.2, p.siput[2]); body.scale.y = 1 + 0.08 * Math.sin(t * 6); g.visible = t >= p.siput[0] - 0.3; });
    }
    if (p.bos) { // bos & karyawan di lantai 3 (bergerak bersama gedung)
      const y = Y0 + 2 * FH + 0.15;
      const bos = orang({ baju: '#2f3542', celana: '#2f3542', dasi: '#b8322a', s: 1.35 }); bos.position.set(-3.6, y, -1.0); bos.rotation.y = 0.5; c.B.add(bos);
      c.upd.push(t => K.pose(bos, t > p.bos[0] && t < p.bos[1] ? 'lapor' : 'berdiri', t));
    }
    if (p.komuter) { // karyawan berangkat kerja, kantornya sudah pindah
      const { t0, x0, stop, z } = p.komuter;
      const w = orang({ baju: '#8a6a4a', celana: '#3b3f46', topi: '#2a2a2a', dasi: '#2b4c7e', s: 1.3 }); s.add(w);
      const tas = box(-0.25, 0.25, -0.2, 0.15, -0.06, 0.06, K.mat('#5d3c21')); tas.position.y = -0.25; w.userData.J.handR.add(tas);
      c.upd.push(t => { const x = Math.min(stop, x0 + Math.max(0, t - t0) * 1.3), arrived = x >= stop - 0.01; w.position.set(x, 0.2, z); w.rotation.y = arrived ? Math.PI : Math.PI / 2; K.pose(w, arrived ? 'pikir' : 'jalan', t); });
    }
    if (p.hantu) { // bola penghancur hantu (yang TIDAK dipakai)
      const gm = new THREE.MeshStandardMaterial({ color: '#ff5a4f', transparent: true, opacity: 0, depthWrite: false, emissive: '#ff2d20', emissiveIntensity: 0.35 });
      const g = new THREE.Group(); g.add(box(-0.4, 0.4, 0, 34, -0.4, 0.4, gm), box(-0.4, 16, 33, 34, -0.4, 0.4, gm));
      const cab = box(-0.05, 0.05, 20, 33, -0.05, 0.05, gm); cab.position.x = 14; g.add(cab);
      const ball = K.mesh(new THREE.SphereGeometry(1.6, 16, 12), gm, false, false); ball.position.set(14, 18.4, 0); g.add(ball);
      g.position.set(PIVOT_X + 22, 0, -6); g.rotation.y = Math.PI; s.add(g);
      c.upd.push(t => { gm.opacity = 0.55 * ramp(t, p.hantu[0], p.hantu[0] + 0.4) * (1 - ramp(t, p.hantu[1] - 0.4, p.hantu[1])); g.visible = gm.opacity > 0.01; g.rotation.z = 0; ball.position.x = 14 + Math.sin(t * 2.2) * 2; cab.position.x = 14 + Math.sin(t * 2.2) * 1; });
    }
    if (p.hari) { // time-lapse sebulan: matahari berputar, langit berganti
      const t0 = p.hari[0], t1 = p.hari[1];
      c.upd.push(t => {
        const u = cl((t - t0) / (t1 - t0)), ph = u * 6 * Math.PI * 2;
        c.scene.traverse(o => { if (o.isDirectionalLight && o.castShadow) { o.position.set(PIVOT_X + Math.cos(ph) * 60, 40 + Math.sin(ph) * 30, 30); o.intensity = 1.6 + 1.0 * Math.max(0, Math.sin(ph)); } });
      });
    }
  }

  /* ---------- ikon tambahan ---------- */
  Object.assign(E.SVGI, {
    telepon: () => `<circle r="80" fill="#2fb85a" stroke="#fff" stroke-width="8"/><path d="M-34 -40 C -44 -10 -20 30 18 44 L 34 30 L 18 10 L 4 18 C -10 8 -16 -4 -18 -18 L -6 -30 L -18 -50 Z" fill="#fff"/>`,
    ide: () => `<circle r="80" fill="#ffc928" stroke="#fff" stroke-width="8"/><path d="M0 -50 A 32 32 0 0 1 20 8 L 18 22 L -18 22 L -20 8 A 32 32 0 0 1 0 -50 Z" fill="#fff"/><rect x="-16" y="28" width="32" height="10" rx="4" fill="#fff"/><rect x="-11" y="42" width="22" height="8" rx="4" fill="#fff"/>`,
    siput: () => `<circle r="80" fill="#fff" stroke="#1b1b1d" stroke-width="7"/><path d="M-56 36 H 52 Q 62 36 58 24 L 44 24" fill="#d9c7a0" stroke="#1b1b1d" stroke-width="5"/><circle cx="-6" cy="4" r="30" fill="#a0612b" stroke="#1b1b1d" stroke-width="5"/><path d="M-6 4 m-14 0 a14 14 0 1 1 14 14" fill="none" stroke="#f3e2c2" stroke-width="5"/><line x1="48" y1="24" x2="58" y2="-6" stroke="#1b1b1d" stroke-width="4"/>`,
    kalender: () => `<rect x="-70" y="-60" width="140" height="130" rx="14" fill="#fff" stroke="#1b1b1d" stroke-width="7"/><rect x="-70" y="-60" width="140" height="34" rx="12" fill="#e2452f"/><text y="48" text-anchor="middle" font-family="Inter" font-weight="900" font-size="62" fill="#1b1b1d">30</text>`,
    putar: () => `<circle r="80" fill="#3157e8" stroke="#fff" stroke-width="8"/><path d="M-40 20 A 44 44 0 1 1 20 40" stroke="#fff" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M-62 4 L -40 34 L -18 6 Z" fill="#fff"/><text y="14" text-anchor="middle" font-family="Inter" font-weight="900" font-size="34" fill="#fff">90°</text>`,
  });

  /* ---------- template ---------- */
  ENG.def('gedung', {
    gerak: 'tetap',
    build(c, p) {
      const st = c.st = stateOf(p);
      kota(c, st, p); gedung(c, st, p); c.upd.push(c.lineUpd); extras(c, st, p);
      E.burung(c, 0, 40, -10, 5);
      c.scene.background = K.tex('panSky', 8, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5aa9e6'); g.addColorStop(0.55, '#a9d4f5'); g.addColorStop(1, '#e8f3fb'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
      c.scene.fog = new THREE.Fog('#d4e8f7', p.kabut ? p.kabut[0] : 140, p.kabut ? p.kabut[1] : 520);
      c.anchor = (a, t) => {
        if (typeof a !== 'string') return null;
        const m = /^bld(-?[0-9.]+),(-?[0-9.]+),(-?[0-9.]+)$/.exec(a); if (m) return c.bLocal(+m[1], +m[2], +m[3]);
        return null;
      };
      const cam = (window.PLAN.cams || {})[p.cam] || [[0, 0, 10, 0, 90, -30, 20, 36]];
      c.shot = { target: (p.focus || [0, 10, 0]).slice(), dist: 60, yaw: 0, pitch: 20, fov: 36 };
      c.shotAt = t => {
        const v = spline(cam, t); let tg = [v[0], v[1], v[2]];
        if (p.camRel) { const [bx, lift] = st.pos(t); const r = st.rot(t) * Math.PI / 180; tg = p.camRel === 'br' ? [bx + v[0] * Math.cos(r) + v[2] * Math.sin(r), v[1] + lift, -v[0] * Math.sin(r) + v[2] * Math.cos(r)] : [v[0] + bx, v[1] + lift, v[2]]; }
        return { target: tg, dist: v[3], yaw: v[4] + (p.camRel === 'br' ? st.rot(t) : 0), pitch: v[5], fov: v[6] };
      };
      let fixed = false;
      c.upd.push(t => {
        if (fixed) return; fixed = true;
        c.scene.traverse(o => { if (o.isDirectionalLight && o.castShadow) { const sc = o.shadow.camera, S = p.bayang || 45; sc.left = sc.bottom = -S; sc.right = sc.top = S; sc.far = 300; sc.updateProjectionMatrix(); const f = p.focus || [0, 10, 0]; o.position.set(f[0] - 40, f[1] + 70, f[2] + 50); o.target.position.set(f[0], 0, f[2]); o.shadow.mapSize.set(2048, 2048); } });
      });
      E.hud(c, p.hud);
    },
  });
})();

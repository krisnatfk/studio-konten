/* Edukasi 3D - kit: tekstur prosedural, latar diorama (potongan tanah), tokoh low-poly, properti, HUD. */
(function () {
  const THREE = window.THREE;
  const { cl, ease, ramp, lerp, back, pulse, rng, esc } = ENG.H;
  const K = window.K = {};
  const ZF = K.ZF = 4;          // bidang potong tanah (menghadap kamera)
  const DEPTH = 14;             // kedalaman potongan tanah

  /* ---------- material & tekstur (di-cache, dipakai bersama antar adegan) ---------- */
  const MC = {};
  K.mat = (col, o = {}) => {
    const key = col + JSON.stringify(o);
    if (!MC[key]) MC[key] = new THREE.MeshStandardMaterial(Object.assign({ color: col, roughness: 0.82, metalness: 0 }, o));
    return MC[key];
  };
  const TC = {};
  K.tex = (key, w, h, fn, rx = 1, ry = 1) => {
    if (!TC[key]) {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      fn(cv.getContext('2d'), w, h);
      const tx = new THREE.CanvasTexture(cv);
      tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.anisotropy = 4;
      TC[key] = tx;
    }
    const t = TC[key].clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return t;
  };
  const GC = {};
  const geo = (key, f) => { if (!GC[key]) { GC[key] = f(); GC[key].__shared = true; } return GC[key]; };
  K.geo = geo;
  function mesh(g, m, cast = true, recv = true) { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = recv; return o; }
  K.mesh = mesh;

  const LAYERS = {
    kampung: [['#3b2617', 0.35], ['#6a4127', 3.0], ['#b0552c', 6.6], ['#d3a468', 9.4], ['#8b5a36', 14]],
    sawah: [['#4b3a2c', 0.6], ['#7a5232', 3.2], ['#a86a3a', 7.0], ['#c99a62', 10], ['#86603c', 14]],
    kota: [['#2d2a29', 0.5], ['#b2562d', 4.2], ['#d4a86c', 6.0], ['#a87a4c', 9.2], ['#857462', 14]],
    bukit: [['#2f3b1d', 0.45], ['#6b4226', 3.0], ['#b0552c', 6.4], ['#d3a468', 9.2], ['#8b5a36', 14]],
    sungai: [['#2a3a46', 0.5], ['#415462', 3.0], ['#596e7e', 6.5], ['#8398a6', 9.5], ['#647988', 14]],
  };
  function soilTex(latar, rx = 120 / 16, ry = 1) {
    const L = LAYERS[latar] || LAYERS.kampung;
    return K.tex('soil_' + latar, 2048, 1792, (x, w, h) => {
      const S = h / DEPTH, R = rng(latar.length * 31 + 7), Q = w / 1024;
      const wave = (i, X) => (0.16 * Math.sin(X / w * Math.PI * 2 * (2 + i)) + 0.09 * Math.sin(X / w * Math.PI * 2 * (5 + i) + i)) * S;
      for (let i = 0; i < L.length; i++) {
        const top = i ? L[i - 1][1] * S : 0;
        x.fillStyle = L[i][0]; x.beginPath(); x.moveTo(0, h);
        for (let X = 0; X <= w; X += 8 * Q) x.lineTo(X, top + (i ? wave(i, X) : 0));
        x.lineTo(w, h); x.closePath(); x.fill();
      }
      // gradasi halus per lapisan
      const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.18)'); gr.addColorStop(0.08, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.12)');
      x.fillStyle = gr; x.fillRect(0, 0, w, h);
      const wrap = (fn, X) => { fn(X); if (X < 80) fn(X + w); if (X > w - 80) fn(X - w); };
      // akar halus di lapisan atas
      x.strokeStyle = 'rgba(30,18,10,.5)'; x.lineWidth = 1.4 * Q;
      for (let i = 0; i < 46; i++) {
        let X = R() * w, Y = R() * S * 0.6; const n = 5 + R() * 7 | 0;
        wrap(X0 => { let px = X0, py = Y; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < n; k++) { px += (R() - 0.5) * 26 * Q; py += (6 + R() * 16) * Q; x.lineTo(px, py); } x.stroke(); }, X);
      }
      // kerikil & butiran
      for (let i = 0; i < 520; i++) {
        const X = R() * w, Y = (0.5 + R() * (DEPTH - 0.6)) * S;
        const li = L.findIndex(l => Y / S < l[1]);
        const big = R() < 0.12, rr = (big ? 5 + R() * 9 : 1.2 + R() * 2.6) * Q;
        const col = li >= 3 ? ['#efe2c8', '#c9b291', '#fff3dc'] : li === 2 ? ['#d99a6c', '#e7c09a', '#8b4a2a'] : ['#8d6a4c', '#b08a63', '#2c1a10'];
        wrap(X0 => {
          x.fillStyle = col[R() * 3 | 0]; x.beginPath(); x.ellipse(X0, Y, rr * (1 + R() * 0.6), rr, R() * 3, 0, 6.283); x.fill();
          if (big) { x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(X0 - rr * 0.3, Y - rr * 0.35, rr * 0.45, rr * 0.3, 0, 0, 6.283); x.fill(); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1.2 * Q; x.beginPath(); x.ellipse(X0, Y, rr * 1.3, rr, 0, 0, 6.283); x.stroke(); }
        }, X);
      }
      // retakan tipis di lapisan liat
      x.strokeStyle = 'rgba(60,25,10,.35)'; x.lineWidth = 1.2 * Q;
      for (let i = 0; i < 40; i++) { let X = R() * w, Y = (L[1][1] + R() * (L[2][1] - L[1][1])) * S; x.beginPath(); x.moveTo(X, Y); for (let k = 0; k < 4; k++) { X += (R() - 0.5) * 40 * Q; Y += (R() - 0.3) * 18 * Q; x.lineTo(X, Y); } x.stroke(); }
    }, rx, ry);
  }
  const TOPS = {
    kampung: ['#d6bf92', [['#c8ad7c', 0.5], ['#e3cfa5', 0.4], ['#8fae4c', 0.12]]],
    sawah: ['#7fae46', [['#6c9a3a', 0.5], ['#93c257', 0.4]]],
    kota: ['#b9b6ad', [['#a9a69e', 0.5], ['#cdcac2', 0.4]]],
    bukit: ['#6faa3e', [['#5d9433', 0.5], ['#86bf4f', 0.4], ['#9a7a4c', 0.06]]],
    sungai: ['#4b6b7a', [['#3b5b6a', 0.5], ['#5b7b8a', 0.4], ['#789ca8', 0.2]]],
  };
  function topTex(latar) {
    const [base, sp] = TOPS[latar] || TOPS.kampung;
    return K.tex('top_' + latar, 512, 512, (x, w, h) => {
      x.fillStyle = base; x.fillRect(0, 0, w, h); const R = rng(91 + latar.length);
      for (const [col, d] of sp) for (let i = 0; i < 1600 * d; i++) { x.fillStyle = col; x.globalAlpha = 0.5 + R() * 0.5; x.beginPath(); x.ellipse(R() * w, R() * h, 2 + R() * 9, 1 + R() * 5, R() * 3, 0, 6.283); x.fill(); }
      x.globalAlpha = 1;
      if (latar === 'kota') { x.strokeStyle = 'rgba(80,78,72,.35)'; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, h); x.moveTo(0, i * 128); x.lineTo(w, i * 128); x.stroke(); } }
    }, 120 / 8, 90 / 8);
  }
  const skyTex = () => K.tex('sky', 8, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2f7fd8'); g.addColorStop(0.45, '#5ea6ea'); g.addColorStop(0.8, '#a9d3f5'); g.addColorStop(1, '#d6ecfb');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
  const cloudTex = v => K.tex('cloud' + v, 512, 256, (x, w, h) => {
    const R = rng(17 + v * 13);
    const blobs = []; for (let i = 0; i < 14; i++) { const u = R(); blobs.push([60 + u * 390, 150 - Math.sin(u * Math.PI) * (40 + R() * 50) + R() * 20, 38 + R() * 46 * Math.sin(u * Math.PI + 0.3)]); }
    for (const [bx, by, br] of blobs) { const g = x.createRadialGradient(bx, by + br * 0.35, br * 0.2, bx, by, br); g.addColorStop(0, 'rgba(214,226,240,1)'); g.addColorStop(0.75, 'rgba(232,240,250,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(bx, by, br, 0, 6.283); x.fill(); }
    for (const [bx, by, br] of blobs) { const g = x.createRadialGradient(bx - br * 0.2, by - br * 0.3, 2, bx, by - br * 0.1, br * 0.85); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(bx, by, br, 0, 6.283); x.fill(); }
  });

  /* ---------- cahaya ---------- */
  K.lights = function (c) {
    const s = c.scene, tg = c.shot.target;
    s.add(new THREE.HemisphereLight('#cfe6ff', '#9a7a55', 1.25));
    const sun = new THREE.DirectionalLight('#fff1dc', 2.5);
    sun.position.set(tg[0] - 16, tg[1] + 30, tg[2] + 22); sun.target.position.set(tg[0], tg[1], tg[2]);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = sc.bottom = -22; sc.right = sc.top = 22; sc.near = 1; sc.far = 90;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
    s.add(sun, sun.target);
    const fill = new THREE.DirectionalLight('#ffe7c4', 0.55); fill.position.set(tg[0] + 20, tg[1] + 6, tg[2] + 30); s.add(fill);
  };

  /* ---------- latar diorama ---------- */
  // opsi: potong (tampilkan potongan tanah), datar (tanpa dekorasi belakang)
  K.latar = function (c, jenis, o = {}) {
    jenis = LAYERS[jenis] ? jenis : 'kampung';
    const s = c.scene, R = rng(c.seed + 5);
    s.background = skyTex();
    s.fog = new THREE.Fog('#bfdcf3', 70, 260);
    const topM = new THREE.MeshStandardMaterial({ map: topTex(jenis), roughness: 0.95 });
    const soilM = new THREE.MeshStandardMaterial({ map: soilTex(jenis), roughness: 1 });
    const sideM = K.mat(LAYERS[jenis][1][0]);
    const box = mesh(geo('ground', () => new THREE.BoxGeometry(120, DEPTH, 90)), [sideM, sideM, topM, sideM, o.potong === false ? sideM : soilM, sideM], false, true);
    box.position.set(0, -DEPTH / 2, ZF - 45); s.add(box);
    if (o.potong === false) box.position.z = ZF + 30 - 45;
    if (o.lubang && o.lubang.length) {
      const tb = o.tebal || 3.2; box.position.z -= tb;
      K.slab(c, jenis, o.lubang, tb, o.dinding || '#8f4428');
    }
    const far = mesh(geo('far', () => new THREE.PlaneGeometry(900, 500)), K.mat(TOPS[jenis][0]), false, true);
    far.rotation.x = -Math.PI / 2; far.position.set(0, -0.02, -330); s.add(far);
    // bibir potongan (rumput / tanah) sedikit menjorok
    const lipCol = { kampung: '#8a6a3c', sawah: '#5e8f34', kota: '#3a3634', bukit: '#4f8a2e', sungai: '#3b5868' }[jenis];
    const lip = mesh(geo('lip', () => new THREE.BoxGeometry(120, 0.1, 0.14)), K.mat(lipCol), false, true); lip.position.set(0, -0.04, ZF + 0.02); s.add(lip);
    // awan
    for (let i = 0; i < 9; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex(i % 3), fog: false, depthWrite: false, transparent: true }));
      const z = -110 - R() * 120, x = (R() - 0.5) * 220, y = 22 + R() * 55, w = 40 + R() * 50;
      sp.scale.set(w, w * 0.5, 1); sp.position.set(x, y, z); s.add(sp);
      const vx = 0.25 + R() * 0.3; c.upd.push(t => { sp.position.x = x + vx * t; });
    }
    if (o.datar) return;
    const deco = {
      kampung() {
        K.place(c, K.rumah({ dinding: '#e9e1cf', pintu: '#2f7d62' }), -7.5, -12, { ry: 0.08 });
        K.place(c, K.rumah({ dinding: '#ece6d6', pintu: '#2c6f8f', lebar: 5.5 }), 0.5, -14, { ry: -0.02 });
        K.place(c, K.rumah({ dinding: '#e4dccb', pintu: '#7a3f2a' }), 8.5, -12.5, { ry: -0.1 });
        K.place(c, K.pagar(26), 0, -5.2);
        for (const [x, z, k] of [[-16, -26, 1.3], [-9, -30, 1.6], [-1, -33, 1.8], [7, -29, 1.5], [15, -25, 1.3], [22, -32, 1.6], [-22, -30, 1.5]]) K.place(c, K.pohon(R, k), x, z);
        K.place(c, K.kelapa(R, 1), -5.2, -3.2, { ry: 0.6 });
        K.place(c, K.pisang(R), 6.4, -3.6);
        K.place(c, K.ember(), 3.3, -4.3); K.place(c, K.ban(), -3.2, -4.4, { ry: 0.3 });
        K.rumput(c, R, 70, [-14, 14], [-4.5, 3.5]); K.kerikil(c, R, 40);
      },
      sawah() {
        K.sawah(c, R);
        K.place(c, K.gubuk(), 5.2, -6.5, { ry: -0.35 });
        K.place(c, K.kelapa(R, 1.2), 6.8, -3.5, { ry: 2 });
        K.place(c, K.kelapa(R, 1.05), -8, -10, { ry: 1 });
        K.place(c, K.pisang(R), -5.6, -4.8);
        for (const [x, z, k] of [[-30, -170, 1], [25, -190, 0.8], [70, -210, 0.9]]) K.place(c, K.gunung(k), x, z);
        for (const [x, z, k] of [[-14, -40, 1.5], [-4, -46, 1.4], [12, -44, 1.6], [24, -40, 1.3]]) K.place(c, K.pohon(R, k), x, z);
      },
      kota() {
        const cols = ['#e8ecef', '#d9e4ea', '#f0e2d4', '#cfd8e0', '#e6d6c8'];
        let x = -22; let i = 0;
        while (x < 24) { const w = 6 + R() * 4, h = 9 + R() * 16; K.place(c, K.gedung(w, h, cols[i++ % cols.length], R), x + w / 2, -19 - R() * 5); x += w + 0.8; }
        K.place(c, K.jalan(), 0, -9);
        for (const x of [-9, -1, 7]) K.place(c, K.lampu(), x, -5.8);
        for (const x of [-12, 4, 12]) K.place(c, K.pohon(R, 0.8), x, -5.2);
        K.rumput(c, R, 20, [-14, 14], [-4, 3]);
      },
      bukit() {
        for (const [x, z, sx, sy] of [[-20, -50, 40, 12], [18, -60, 46, 16], [-2, -90, 70, 22], [40, -80, 40, 14]]) {
          const h = mesh(geo('hill', () => new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), K.mat('#6fae40'), false, true);
          h.scale.set(sx, sy, sx * 0.6); h.position.set(x, 0, z); s.add(h);
        }
        for (const [x, z, k] of [[-7, -12, 1.5], [-12, -18, 1.8], [6, -14, 1.6], [12, -20, 1.4], [-2, -28, 1.8], [20, -30, 1.7]]) K.place(c, K.pohon(R, k), x, z);
        for (let i = 0; i < 10; i++) K.place(c, K.batu(R, 0.4 + R() * 0.9), (R() - 0.5) * 22, -3 - R() * 10, { ry: R() * 6 });
        K.rumput(c, R, 90, [-14, 14], [-8, 3.5]);
      },
      sungai() {
        K.sungai(c, R, !!o.riverCutout);
      },
    };
    deco[jenis]();
  };

  // lempeng depan dengan lubang nyata (lubang galian menyentuh permukaan / terowongan di dalam tanah)
  K.slab = function (c, jenis, holes, tb, dinding) {
    const W = 60, sh = new THREE.Shape();
    const top = holes.filter(h => h.y + h.h >= -0.001).sort((a, b) => a.x - b.x), inner = holes.filter(h => h.y + h.h < -0.001);
    sh.moveTo(-W, 0);
    for (const h of top) { const x0 = h.x - h.w / 2, x1 = h.x + h.w / 2; sh.lineTo(x0, 0); sh.lineTo(x0, h.y); sh.lineTo(x1, h.y); sh.lineTo(x1, 0); }
    sh.lineTo(W, 0); sh.lineTo(W, -DEPTH); sh.lineTo(-W, -DEPTH); sh.lineTo(-W, 0);
    for (const h of inner) {
      const p = new THREE.Path(), x0 = h.x - h.w / 2, x1 = h.x + h.w / 2, y0 = h.y, y1 = h.y + h.h;
      if (h.lengkung) { const r = h.w / 2; p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1 - r); p.absarc(h.x, y1 - r, r, 0, Math.PI, false); p.lineTo(x0, y0); }
      else { p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1); p.lineTo(x0, y1); p.lineTo(x0, y0); }
      sh.holes.push(p);
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth: tb, bevelEnabled: false, curveSegments: 18 }); g.translate(0, 0, ZF - tb);
    const capM = new THREE.MeshStandardMaterial({ map: soilTex(jenis, 1 / 16, 1 / DEPTH), roughness: 1 });
    const wallM = K.mat(dinding, { roughness: 1 });
    const m = mesh(g, [capM, wallM], true, true); c.scene.add(m);
    // permukaan atas lempeng (di luar lubang galian)
    const topM = new THREE.MeshStandardMaterial({ map: topTex(jenis), roughness: 0.95 });
    let xs = -W; const strips = [];
    for (const h of top) { strips.push([xs, h.x - h.w / 2]); xs = h.x + h.w / 2; } strips.push([xs, W]);
    for (const [a, b] of strips) { const pl = mesh(new THREE.PlaneGeometry(b - a, tb), topM, false, true); pl.rotation.x = -Math.PI / 2; pl.position.set((a + b) / 2, 0.002, ZF - tb / 2); c.scene.add(pl); }
    for (const h of holes) { const bk = mesh(new THREE.PlaneGeometry(h.w, h.h), K.mat(h.belakang || (h.y + h.h >= -0.001 ? '#3a2416' : '#6a2c16'), { roughness: 1 }), false, true); bk.position.set(h.x, h.y + h.h / 2, ZF - tb + 0.01); c.scene.add(bk); }
  };

  K.place = function (c, obj, x, z, o = {}) {
    obj.position.set(x, o.y || 0, z); if (o.ry) obj.rotation.y = o.ry; if (o.s) obj.scale.setScalar(o.s);
    c.scene.add(obj); return obj;
  };

  /* ---------- properti lingkungan ---------- */
  const roofTex = () => K.tex('roof', 256, 256, (x, w, h) => {
    x.fillStyle = '#c4532f'; x.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) { x.fillStyle = r % 2 ? '#b14628' : '#cf6038'; x.fillRect(0, r * 32, w, 18); x.fillStyle = 'rgba(80,20,5,.45)'; x.fillRect(0, r * 32 + 28, w, 4); for (let k = 0; k < 8; k++) { x.fillStyle = 'rgba(70,20,5,.35)'; x.fillRect(k * 32 + (r % 2) * 16, r * 32, 2, 32); } }
  });
  K.rumah = function (o = {}) {
    const g = new THREE.Group(); const W = o.lebar || 4.8, D = 3.6, Hh = 2.5;
    const wall = mesh(new THREE.BoxGeometry(W, Hh, D), K.mat(o.dinding || '#e9e1cf')); wall.position.y = Hh / 2; g.add(wall);
    const base = mesh(new THREE.BoxGeometry(W + 0.2, 0.3, D + 0.2), K.mat('#9c968a')); base.position.y = 0.15; g.add(base);
    const sh = new THREE.Shape(); sh.moveTo(-D / 2 - 0.45, 0); sh.lineTo(0, 1.7); sh.lineTo(D / 2 + 0.45, 0); sh.lineTo(-D / 2 - 0.45, 0);
    const rg = new THREE.ExtrudeGeometry(sh, { depth: W + 0.7, bevelEnabled: false }); rg.translate(0, 0, -(W + 0.7) / 2);
    const roof = mesh(rg, [K.mat('#a64428'), new THREE.MeshStandardMaterial({ map: roofTex(), roughness: 0.8 })]);
    roof.rotation.y = Math.PI / 2; roof.position.y = Hh; g.add(roof);
    const gm = K.mat('#2a3036', { roughness: 0.3 }), fm = K.mat('#f4f1ea');
    const door = mesh(geo('door', () => new THREE.BoxGeometry(0.9, 1.75, 0.08)), K.mat(o.pintu || '#2f7d62')); door.position.set(-W * 0.18, 0.95, D / 2 + 0.03); g.add(door);
    for (const wx of [W * 0.12, W * 0.34]) {
      const fr = mesh(geo('winf', () => new THREE.BoxGeometry(0.95, 0.95, 0.06)), fm); fr.position.set(wx, 1.45, D / 2 + 0.02); g.add(fr);
      const gl = mesh(geo('wing', () => new THREE.BoxGeometry(0.8, 0.8, 0.06)), gm); gl.position.set(wx, 1.45, D / 2 + 0.04); g.add(gl);
    }
    return g;
  };  K.pagar = function (len) {
    const g = new THREE.Group(); const n = Math.round(len / 0.16);
    const ig = geo('slat', () => new THREE.CylinderGeometry(0.045, 0.05, 1.15, 5));
    const im = new THREE.InstancedMesh(ig, K.mat('#d2b877'), n); const m = new THREE.Matrix4(); const R = rng(len * 10 | 0);
    for (let i = 0; i < n; i++) { const hh = 1 + R() * 0.15; m.makeScale(1, hh, 1); m.setPosition(-len / 2 + i * 0.16, 0.57 * hh, 0); im.setMatrixAt(i, m); }
    im.castShadow = im.receiveShadow = true; g.add(im);
    for (const y of [0.35, 0.85]) { const r = mesh(new THREE.CylinderGeometry(0.04, 0.04, len, 6), K.mat('#b89a5a')); r.rotation.z = Math.PI / 2; r.position.set(0, y, 0.07); g.add(r); }
    return g;
  };  K.pohon = function (R, k = 1) {
    const g = new THREE.Group();
    const tr = mesh(geo('trunk', () => new THREE.CylinderGeometry(0.18, 0.28, 2.6, 7)), K.mat('#6b4a2f')); tr.position.y = 1.3; g.add(tr);
    const greens = ['#3f8a35', '#4f9a3c', '#357a2f', '#5aa344'];
    for (let i = 0; i < 6; i++) {
      const b = mesh(geo('blob', () => new THREE.IcosahedronGeometry(1, 1)), K.mat(greens[i % 4], { flatShading: true }));
      const a = R() * 6.28, r = i ? 0.7 + R() * 0.5 : 0; b.position.set(Math.cos(a) * r, 3 + R() * 1.1 + (i ? 0 : 0.5), Math.sin(a) * r * 0.7);
      b.scale.setScalar(0.85 + R() * 0.5); g.add(b);
    }
    g.scale.setScalar(k); return g;
  };
  function leafGeo(len, wid, droop, n = 10) {
    const pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, w = wid * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u * 0.3), y = -droop * u * u, x = len * u;
      pos.push(x, y, -w / 2, x, y + w * 0.12, 0, x, y, w / 2);
      if (i) { const a = (i - 1) * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
    }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setIndex(idx); gg.computeVertexNormals(); return gg;
  }
  K.kelapa = function (R, k = 1) {
    const g = new THREE.Group(); const H = 6.5;
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.4, H * 0.4, 0), new THREE.Vector3(0.3, H * 0.75, 0), new THREE.Vector3(-0.3, H, 0)]);
    const tr = mesh(new THREE.TubeGeometry(curve, 12, 0.2, 7), K.mat('#8a6e4c')); g.add(tr);
    const lm = K.mat('#3d9636', { side: THREE.DoubleSide, flatShading: true }), lg = geo('palmleaf', () => leafGeo(3.2, 0.9, 1.6));
    for (let i = 0; i < 9; i++) { const l = mesh(lg, lm); l.position.set(-0.3, H, 0); l.rotation.set(0, i * 0.7 + R() * 0.3, 0.35 + R() * 0.35); g.add(l); }
    for (let i = 0; i < 4; i++) { const n = mesh(geo('coco', () => new THREE.SphereGeometry(0.2, 8, 6)), K.mat('#6a7a2a')); n.position.set(-0.3 + Math.cos(i * 1.6) * 0.25, H - 0.3, Math.sin(i * 1.6) * 0.25); g.add(n); }
    g.scale.setScalar(k); return g;
  };
  K.pisang = function (R) {
    const g = new THREE.Group();
    const tr = mesh(geo('bantr', () => new THREE.CylinderGeometry(0.2, 0.28, 2.2, 8)), K.mat('#6f8f3a')); tr.position.y = 1.1; g.add(tr);
    const lm = K.mat('#58ad3e', { side: THREE.DoubleSide }), lg = geo('banleaf', () => leafGeo(2.4, 1.1, 0.9, 8));
    for (let i = 0; i < 6; i++) { const l = mesh(lg, lm); l.position.set(0, 2.1, 0); l.rotation.set(0, i * 1.05 + R() * 0.3, 0.6 + R() * 0.4); g.add(l); }
    return g;
  };  K.gunung = function (k = 1) {
    const g = new THREE.Group();
    const m = mesh(geo('mount', () => new THREE.ConeGeometry(55, 42, 9, 3)), K.mat('#a9bfa6', { flatShading: true, fog: false }), false, false); m.position.y = 21; g.add(m);
    const cap = mesh(geo('mountc', () => new THREE.ConeGeometry(18.5, 14, 9, 1)), K.mat('#c9d6c4', { flatShading: true, fog: false }), false, false); cap.position.y = 35.1; g.add(cap);
    g.scale.setScalar(k); return g;
  };
  K.rumput = function (c, R, n, xr, zr) {
    const im = new THREE.InstancedMesh(geo('tuft', () => { const g = new THREE.ConeGeometry(0.06, 0.55, 3); g.translate(0, 0.27, 0); return g; }), K.mat('#4e9a34', { flatShading: true }), n * 5);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    let k = 0;
    for (let i = 0; i < n; i++) {
      const x = xr[0] + R() * (xr[1] - xr[0]), z = zr[0] + R() * (zr[1] - zr[0]);
      for (let j = 0; j < 5; j++) { e.set((R() - 0.5) * 0.7, R() * 6, (R() - 0.5) * 0.7); q.setFromEuler(e); v.set(x + (R() - 0.5) * 0.25, 0, z + (R() - 0.5) * 0.25); const s = 0.6 + R() * 0.8; sc.set(s, s, s); m.compose(v, q, sc); im.setMatrixAt(k++, m); }
    }
    im.castShadow = true; c.scene.add(im);
  };
  K.kerikil = function (c, R, n) { for (let i = 0; i < n; i++) K.place(c, K.batu(R, 0.08 + R() * 0.12), (R() - 0.5) * 18, -4 + R() * 7.5, { ry: R() * 6 }); };
  K.batu = function (R, k = 1) {
    const b = mesh(geo('rock', () => new THREE.DodecahedronGeometry(1, 0)), K.mat(['#9a958c', '#a8a196', '#8c877f'][R() * 3 | 0], { flatShading: true }));
    b.scale.set(k * (1 + R() * 0.4), k * (0.6 + R() * 0.3), k); b.position.y = k * 0.3; const g = new THREE.Group(); g.add(b); return g;
  };
  K.ember = function (col = '#2f6fd0') {
    const g = new THREE.Group();
    const b = mesh(geo('bucket', () => new THREE.CylinderGeometry(0.34, 0.26, 0.55, 14, 1, true)), K.mat(col, { side: THREE.DoubleSide, roughness: 0.5 })); b.position.y = 0.275; g.add(b);
    const bt = mesh(geo('bucketb', () => new THREE.CircleGeometry(0.26, 14)), K.mat(col)); bt.rotation.x = -Math.PI / 2; bt.position.y = 0.02; g.add(bt);
    const h = mesh(geo('bucketh', () => new THREE.TorusGeometry(0.33, 0.015, 4, 16, Math.PI)), K.mat('#333')); h.position.y = 0.55; g.add(h);
    return g;
  };  K.ban = function () { const g = new THREE.Group(); const t = mesh(geo('tire', () => new THREE.TorusGeometry(0.4, 0.16, 8, 16)), K.mat('#222', { roughness: 0.9 })); t.rotation.x = Math.PI / 2; t.position.y = 0.16; g.add(t); return g; };
  K.gubuk = function () {
    const g = new THREE.Group(); const bm = K.mat('#c9ab6a');
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const p = mesh(geo('gpost', () => new THREE.CylinderGeometry(0.07, 0.07, 2.6, 6)), bm); p.position.set(x, 1.3, z); g.add(p); }
    const fl = mesh(new THREE.BoxGeometry(2.3, 0.12, 2.3), K.mat('#b8955a')); fl.position.y = 0.9; g.add(fl);
    const rf = mesh(new THREE.ConeGeometry(2.3, 1.4, 4), K.mat('#d8b46a', { flatShading: true })); rf.rotation.y = Math.PI / 4; rf.position.y = 3.2; g.add(rf);
    return g;
  };  K.sawah = function (c, R) {
    const wm = new THREE.MeshStandardMaterial({ color: '#9ec3c9', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92 });
    const dike = K.mat('#6f9e3c');
    for (const [z0, z1] of [[-3.6, 3.7], [-11, -4.2], [-22, -11.6]]) {
      const w = mesh(new THREE.PlaneGeometry(40, z1 - z0), wm, false, true); w.rotation.x = -Math.PI / 2; w.position.set(0, 0.03, (z0 + z1) / 2); c.scene.add(w);
      const d = mesh(new THREE.BoxGeometry(40, 0.25, 0.55), dike); d.position.set(0, 0.1, z0 - 0.3); c.scene.add(d);
    }
    const n = 420, im = new THREE.InstancedMesh(geo('rice', () => { const g = new THREE.ConeGeometry(0.05, 0.75, 3); g.translate(0, 0.37, 0); return g; }), K.mat('#7fcf3d', { flatShading: true }), n * 6);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(); let k = 0;
    for (let i = 0; i < n; i++) {
      const row = i % 30, col = (i / 30) | 0, x = -15 + row * 1.05 + (R() - 0.5) * 0.15, z = 3.2 - col * 1.6;
      if (Math.abs(x) < 1.6 && z > -2) continue;   // ruang untuk aksi di tengah
      for (let j = 0; j < 6; j++) { e.set((R() - 0.5) * 0.9, R() * 6, (R() - 0.5) * 0.9); q.setFromEuler(e); v.set(x + (R() - 0.5) * 0.12, 0, z + (R() - 0.5) * 0.12); const s = 0.8 + R() * 0.5; sc.set(s, s, s); m.compose(v, q, sc); im.setMatrixAt(k++, m); }
    }
    im.count = k; im.castShadow = true; c.scene.add(im);
    for (let i = 0; i < 8; i++) K.place(c, K.pohon(R, 0.9), -20 + i * 6 + R() * 2, -28 - R() * 6);
  };
  const winTex = () => K.tex('win', 128, 128, (x, w, h) => {
    x.fillStyle = '#f2f2ef'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#4e86b8'; x.fillRect(14, 18, 100, 70); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(18, 22, 30, 62);
    x.fillStyle = '#c9c9c4'; x.fillRect(0, 100, w, 10);
  });
  K.gedung = function (w, h, col, R) {
    const g = new THREE.Group();
    const wt = winTex(); wt.repeat.set(Math.round(w / 1.6), Math.round(h / 1.8));
    const fm = new THREE.MeshStandardMaterial({ map: wt, color: col, roughness: 0.6 });
    const b = mesh(new THREE.BoxGeometry(w, h, 6), [K.mat(col), K.mat(col), K.mat('#c8c8c4'), K.mat(col), fm, K.mat(col)]); b.position.y = h / 2; g.add(b);
    const aw = mesh(new THREE.BoxGeometry(w * 0.9, 0.12, 1.1), K.mat(['#e76f51', '#2a9d8f', '#457b9d'][R() * 3 | 0])); aw.position.set(0, 2.6, 3.4); g.add(aw);
    return g;
  };  K.jalan = function () {
    const g = new THREE.Group();
    const r = mesh(new THREE.PlaneGeometry(80, 6), K.mat('#3b3d42', { roughness: 0.9 }), false, true); r.rotation.x = -Math.PI / 2; r.position.y = 0.02; g.add(r);
    for (let i = 0; i < 20; i++) { const d = mesh(geo('dash', () => new THREE.PlaneGeometry(1.6, 0.15)), K.mat('#f2f2f2'), false, true); d.rotation.x = -Math.PI / 2; d.position.set(-38 + i * 4, 0.03, 0); g.add(d); }
    const sw = mesh(new THREE.BoxGeometry(80, 0.18, 1.6), K.mat('#c9c6bd')); sw.position.set(0, 0.09, 3.8); g.add(sw);
    return g;
  };  K.lampu = function () {
    const g = new THREE.Group(); const m = K.mat('#55595f', { metalness: 0.5, roughness: 0.4 });
    const p = mesh(geo('lpole', () => new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6)), m); p.position.y = 2.1; g.add(p);
    const a = mesh(geo('larm', () => new THREE.BoxGeometry(0.9, 0.08, 0.1)), m); a.position.set(0.4, 4.15, 0); g.add(a);
    return g;
  };
  /* ---------- lingkungan sungai & infrastruktur cofferdam ---------- */
  K.sungai = function (c, R, cutout = false) {
    const wm = new THREE.MeshStandardMaterial({
      color: '#257bb5',
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.82,
    });
    // Leave an actual opening around the sheet-pile enclosure. A single
    // transparent river box would visually refill the supposedly dry workspace.
    const holeZ = K.ZF - 2.5;
    const parts = cutout ? [
      [-18.85, K.ZF - 18, 32.3, 46],
      [18.85, K.ZF - 18, 32.3, 46],
      [0, (-37 + holeZ - 2.7) / 2, 5.4, holeZ - 2.7 + 37],
      [0, (holeZ + 2.7 + 9) / 2, 5.4, 9 - holeZ - 2.7],
    ] : [[0, K.ZF - 18, 70, 46]];
    for (const [x, z, w, d] of parts) {
      const river = mesh(new THREE.BoxGeometry(w, 2.6, d), wm, false, true);
      river.position.set(x, 1.3, z);
      c.scene.add(river);
    }

    const foamTex = K.tex('foam', 256, 256, (x, w, h) => {
      x.fillStyle = 'rgba(255,255,255,0)'; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(255,255,255,0.4)'; x.lineWidth = 3;
      for (let i = 0; i < 20; i++) {
        const y = (i / 20) * h;
        x.beginPath(); x.moveTo(0, y);
        x.bezierCurveTo(w * 0.3, y + 8, w * 0.7, y - 8, w, y);
        x.stroke();
      }
    }, 4, 3);
    const foamMat = new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, opacity: 0.45, depthWrite: false });
    for (const [x, z, w, d] of parts) {
      const foamPlane = mesh(new THREE.PlaneGeometry(w, d), foamMat, false, false);
      foamPlane.rotation.x = -Math.PI / 2;
      foamPlane.position.set(x, 2.62, z);
      c.scene.add(foamPlane);
    }
    c.upd.push(t => { foamTex.offset.x = (t * 0.35) % 1; });

    for (const [x, z, k] of [[-24, -20, 1.6], [-20, -28, 2.2], [22, -22, 1.8], [25, -30, 2.4]]) K.place(c, K.batu(R, k), x, z);
    for (const [x, z, k] of [[-26, -34, 1.4], [-18, -38, 1.6], [18, -36, 1.5], [26, -34, 1.3]]) K.place(c, K.pohon(R, k), x, z);
    for (const [x, z, k] of [[-35, -120, 1.2], [30, -130, 1.0]]) K.place(c, K.gunung(k), x, z);
  };

  K.sheetPile = function (tinggi = 6.8, lebar = 0.8) {
    const g = new THREE.Group();
    const m = K.mat('#8da1ae', { metalness: 0.4, roughness: 0.48 });
    const body = mesh(new THREE.BoxGeometry(lebar, tinggi, 0.12), m);
    body.position.y = tinggi / 2;
    g.add(body);
    for (const [x, z] of [[-lebar / 2 + 0.05, 0.08], [lebar / 2 - 0.05, 0.08]]) {
      const fl = mesh(new THREE.BoxGeometry(0.12, tinggi, 0.18), m);
      fl.position.set(x, tinggi / 2, z);
      g.add(fl);
    }
    return g;
  };
  K.pompaAir = function () {
    const g = new THREE.Group();
    const pm = K.mat('#e67e22', { metalness: 0.4, roughness: 0.4 });
    const bm = mesh(new THREE.BoxGeometry(0.8, 0.7, 0.9), pm);
    bm.position.y = 0.35;
    g.add(bm);
    const mot = mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 12), K.mat('#2c3e50', { metalness: 0.6 }));
    mot.rotation.x = Math.PI / 2;
    mot.position.set(0, 0.45, 0);
    g.add(mot);
    const hm = K.mat('#1abc9c', { roughness: 0.6 });
    const suction = mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8, 12), hm);
    suction.rotation.z = -0.4;
    suction.position.set(0.6, 0.2, 0);
    g.add(suction);
    const discharge = mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 12), hm);
    discharge.rotation.z = 0.7;
    discharge.position.set(-0.7, 0.3, 0);
    g.add(discharge);
    return g;
  };
  K.cofferdamKotak = function (o = {}) {
    const g = new THREE.Group();
    const w = o.w || 4.6, l = o.l || 4.6, h = o.h || 7.0;
    const steelMat = K.mat('#8799a5', { metalness: 0.42, roughness: 0.5 });
    const corrugMat = K.mat('#637785', { metalness: 0.48, roughness: 0.48 });

    const walls = new THREE.Group();
    const nRibs = 8;
    const ribW = w / nRibs;
    for (const [angle, px, pz] of [
      [0, 0, l / 2],
      [Math.PI, 0, -l / 2],
      [-Math.PI / 2, -w / 2, 0],
      [Math.PI / 2, w / 2, 0],
    ]) {
      const sw = new THREE.Group();
      sw.position.set(px, 0, pz);
      sw.rotation.y = angle;
      const wallPlate = mesh(new THREE.BoxGeometry(w, h, 0.08), steelMat);
      wallPlate.position.y = h / 2 - 1.2;
      sw.add(wallPlate);
      for (let r = 0; r < nRibs; r++) {
        const rx = -w / 2 + (r + 0.5) * ribW;
        const rib = mesh(new THREE.BoxGeometry(ribW * 0.45, h, 0.16), corrugMat);
        rib.position.set(rx, h / 2 - 1.2, r % 2 === 0 ? 0.07 : -0.07);
        sw.add(rib);
      }
      walls.add(sw);
    }
    g.add(walls);
    g.userData.walls = walls;

    const inWaterMat = new THREE.MeshStandardMaterial({
      color: '#257bb5',
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    const innerWater = mesh(new THREE.BoxGeometry(w - 0.2, 1, l - 0.2), inWaterMat, false, false);
    innerWater.position.set(0, 1.2, 0);
    g.add(innerWater);
    g.userData.innerWater = innerWater;

    const braceMat = K.mat('#c0392b', { metalness: 0.5, roughness: 0.4 });
    const bracing = new THREE.Group();
    for (const by of [1.2, 3.2]) {
      for (const [wx, wz, bw, bl] of [
        [0, l / 2 - 0.22, w - 0.3, 0.22],
        [0, -l / 2 + 0.22, w - 0.3, 0.22],
        [-w / 2 + 0.22, 0, 0.22, l - 0.3],
        [w / 2 - 0.22, 0, 0.22, l - 0.3],
      ]) {
        const b = mesh(new THREE.BoxGeometry(bw, 0.24, bl), braceMat);
        b.position.set(wx, by, wz);
        bracing.add(b);
      }
      const s1 = mesh(new THREE.BoxGeometry(0.2, 0.22, l - 0.4), braceMat);
      s1.position.set(-w * 0.2, by, 0);
      bracing.add(s1);
      const s2 = mesh(new THREE.BoxGeometry(0.2, 0.22, l - 0.4), braceMat);
      s2.position.set(w * 0.2, by, 0);
      bracing.add(s2);
      const s3 = mesh(new THREE.BoxGeometry(w - 0.4, 0.22, 0.2), braceMat);
      s3.position.set(0, by, 0);
      bracing.add(s3);
    }
    bracing.visible = false;
    g.add(bracing);
    g.userData.bracing = bracing;

    const pierMat = K.mat('#bdc3c7', { roughness: 0.92 });
    const footing = new THREE.Group();
    const cap = mesh(new THREE.BoxGeometry(w - 0.8, 0.9, l - 0.8), pierMat);
    cap.position.y = 0.45;
    footing.add(cap);
    const col = mesh(new THREE.CylinderGeometry(0.75, 0.85, 5.8, 24), pierMat);
    col.position.y = 3.8;
    footing.add(col);
    const phead = mesh(new THREE.BoxGeometry(4.2, 0.7, 1.6), pierMat);
    phead.position.y = 6.7;
    footing.add(phead);

    footing.visible = false;
    g.add(footing);
    g.userData.footing = footing;

    const pump = K.pompaAir();
    pump.position.set(w / 2 + 0.5, 5.5, l / 2 + 0.4);
    pump.visible = false;
    g.add(pump);
    g.userData.pump = pump;

    return g;
  };
  K.tiangJembatan = function (o = {}) {
    const g = new THREE.Group();
    const m = K.mat('#bdc3c7', { roughness: 0.92 });
    const cap = mesh(new THREE.BoxGeometry(3.6, 1.0, 3.6), m);
    cap.position.y = 0.5;
    g.add(cap);
    const col = mesh(new THREE.CylinderGeometry(0.8, 0.9, 6.0, 24), m);
    col.position.y = 4.0;
    g.add(col);
    const phead = mesh(new THREE.BoxGeometry(4.8, 0.8, 1.8), m);
    phead.position.y = 7.0;
    g.add(phead);
    for (const bx of [-1.5, 1.5]) {
      const b = mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), K.mat('#34495e', { metalness: 0.7 }));
      b.position.set(bx, 7.5, 0);
      g.add(b);
    }
    return g;
  };
  K.jembatanLengkap = function (len = 45) {
    const g = new THREE.Group();
    const deckMat = K.mat('#2c3e50', { roughness: 0.8 });
    const girderMat = K.mat('#7f8c8d', { metalness: 0.5, roughness: 0.4 });
    const railMat = K.mat('#bdc3c7', { metalness: 0.3 });

    for (const gz of [-1.8, 1.8]) {
      const girder = mesh(new THREE.BoxGeometry(len, 0.8, 0.4), girderMat);
      girder.position.set(0, 7.3, gz);
      g.add(girder);
    }
    const deck = mesh(new THREE.BoxGeometry(len, 0.35, 4.4), deckMat);
    deck.position.set(0, 7.8, 0);
    g.add(deck);

    const lineMat = K.mat('#f1c40f');
    for (let i = 0; i < 12; i++) {
      const stripe = mesh(new THREE.PlaneGeometry(1.6, 0.12), lineMat, false, false);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(-len / 2 + 2 + i * 3.8, 7.99, 0);
      g.add(stripe);
    }
    for (const rz of [-2.15, 2.15]) {
      const rail = mesh(new THREE.BoxGeometry(len, 0.5, 0.1), railMat);
      rail.position.set(0, 8.25, rz);
      g.add(rail);
      for (let i = 0; i < 15; i++) {
        const post = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), railMat);
        post.position.set(-len / 2 + 1.5 + i * 3.0, 8.2, rz);
        g.add(post);
      }
    }
    const pier = K.tiangJembatan();
    g.add(pier);

    const car = new THREE.Group();
    const carBody = mesh(new THREE.BoxGeometry(1.4, 0.45, 0.7), K.mat('#e74c3c', { metalness: 0.3, roughness: 0.3 }));
    carBody.position.y = 0.35;
    car.add(carBody);
    const carTop = mesh(new THREE.BoxGeometry(0.8, 0.35, 0.65), K.mat('#34495e', { roughness: 0.2 }));
    carTop.position.set(-0.1, 0.7, 0);
    car.add(carTop);
    car.position.set(3, 8.0, 1.0);
    g.add(car);

    return g;
  };


  /* ---------- infrastruktur terusan panama & kapal raksasa ---------- */
  K.kapalKontainer = function (o = {}) {
    const g = new THREE.Group();
    const len = o.len || 13.5, w = o.w || 3.6, h = o.h || 2.2;
    const hullMat = K.mat('#1e293b', { roughness: 0.35, metalness: 0.2 });
    const redMat = K.mat('#8b261d', { roughness: 0.45 });
    const deckMat = K.mat('#475569', { roughness: 0.6 });
    const whiteMat = K.mat('#f8fafc', { roughness: 0.3 });
    const glassMat = K.mat('#38bdf8', { roughness: 0.1, metalness: 0.8 });
    const stackMat = K.mat('#b91c1c', { roughness: 0.4 });

    // Lambung bawah (anti-fouling merah)
    const lowerHull = mesh(new THREE.BoxGeometry(len, h * 0.45, w), redMat);
    lowerHull.position.y = h * 0.225;
    g.add(lowerHull);

    // Bulbous bow
    const bulb = mesh(new THREE.SphereGeometry(w * 0.26, 12, 8), redMat);
    bulb.scale.set(1.4, 0.75, 0.9);
    bulb.position.set(len / 2 + 0.3, h * 0.18, 0);
    g.add(bulb);

    // Lambung atas (navy gelap)
    const upperHull = mesh(new THREE.BoxGeometry(len, h * 0.55, w), hullMat);
    upperHull.position.y = h * 0.725;
    g.add(upperHull);

    // Haluan runcing (bow)
    const bow = mesh(new THREE.ConeGeometry(w * 0.5, 2.5, 4), hullMat);
    bow.rotation.z = -Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(len / 2 + 1.25, h * 0.725, 0);
    g.add(bow);

    // Geladak utama (deck)
    const deck = mesh(new THREE.BoxGeometry(len + 0.3, 0.1, w - 0.1), deckMat);
    deck.position.y = h + 0.05;
    g.add(deck);

    // Tumpukan Kontainer Kargo
    const contColors = ['#dc2626', '#0284c7', '#ea580c', '#16a34a', '#eab308', '#2563eb', '#059669', '#d97706'];
    const cWidth = 0.85, cLen = 2.3, cHgt = 0.72;
    const nBays = Math.floor((len - 4.2) / (cLen + 0.22));
    const nRows = 3, nTiers = 3;
    const containers = new THREE.Group();
    let colIdx = 0;
    for (let b = 0; b < nBays; b++) {
      const bx = -len / 2 + 1.8 + b * (cLen + 0.22);
      for (let r = 0; r < nRows; r++) {
        const bz = (r - 1) * (cWidth + 0.14);
        for (let t = 0; t < nTiers; t++) {
          const by = h + 0.1 + (t + 0.5) * cHgt;
          const cMat = K.mat(contColors[colIdx % contColors.length], { roughness: 0.5, metalness: 0.1 });
          colIdx++;
          const cont = mesh(new THREE.BoxGeometry(cLen, cHgt - 0.04, cWidth), cMat);
          cont.position.set(bx, by, bz);
          containers.add(cont);
        }
      }
    }
    g.add(containers);

    // Anjungan buritan (superstructure)
    const bridge = new THREE.Group();
    const bridgeBase = mesh(new THREE.BoxGeometry(2.3, 1.7, w * 0.85), whiteMat);
    bridgeBase.position.set(-len / 2 + 1.5, h + 0.85, 0);
    bridge.add(bridgeBase);

    const wheelhouse = mesh(new THREE.BoxGeometry(1.5, 0.65, w * 0.95), whiteMat);
    wheelhouse.position.set(-len / 2 + 1.5, h + 2.05, 0);
    bridge.add(wheelhouse);

    const windows = mesh(new THREE.BoxGeometry(1.55, 0.26, w * 0.96), glassMat);
    windows.position.set(-len / 2 + 1.5, h + 2.05, 0);
    bridge.add(windows);

    const mast = mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 8), K.mat('#e2e8f0'));
    mast.position.set(-len / 2 + 1.5, h + 2.95, 0);
    bridge.add(mast);

    const funnel = mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.2, 10), stackMat);
    funnel.position.set(-len / 2 + 0.65, h + 2.2, 0);
    bridge.add(funnel);

    const funnelTop = mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.25, 10), K.mat('#1e293b'));
    funnelTop.position.set(-len / 2 + 0.65, h + 2.8, 0);
    bridge.add(funnelTop);

    g.add(bridge);
    g.userData = { len, w, h, bridge, containers };
    return g;
  };

  K.gerbangBaja = function (w = 6.6, h = 8.5) {
    const g = new THREE.Group();
    const steelMat = K.mat('#334155', { metalness: 0.6, roughness: 0.4 });
    const trimMat = K.mat('#475569', { metalness: 0.5, roughness: 0.4 });
    const walkMat = K.mat('#cbd5e1', { roughness: 0.7 });

    const leafW = w * 0.55;
    const leafThick = 0.35;

    // Daun pintu kiri (Pivot di -w/2)
    const leftPivot = new THREE.Group();
    leftPivot.position.set(-w / 2, 0, 0);
    const leftLeaf = new THREE.Group();
    const lBody = mesh(new THREE.BoxGeometry(leafW, h, leafThick), steelMat);
    lBody.position.set(leafW / 2, h / 2, 0);
    leftLeaf.add(lBody);

    for (let i = 1; i < 5; i++) {
      const rib = mesh(new THREE.BoxGeometry(leafW, 0.18, leafThick + 0.08), trimMat);
      rib.position.set(leafW / 2, (i / 5) * h, 0);
      leftLeaf.add(rib);
    }
    const lWalk = mesh(new THREE.BoxGeometry(leafW, 0.12, 0.8), walkMat);
    lWalk.position.set(leafW / 2, h + 0.06, 0);
    leftLeaf.add(lWalk);

    leftPivot.add(leftLeaf);
    g.add(leftPivot);

    // Daun pintu kanan (Pivot di +w/2)
    const rightPivot = new THREE.Group();
    rightPivot.position.set(w / 2, 0, 0);
    const rightLeaf = new THREE.Group();
    const rBody = mesh(new THREE.BoxGeometry(leafW, h, leafThick), steelMat);
    rBody.position.set(-leafW / 2, h / 2, 0);
    rightLeaf.add(rBody);

    for (let i = 1; i < 5; i++) {
      const rib = mesh(new THREE.BoxGeometry(leafW, 0.18, leafThick + 0.08), trimMat);
      rib.position.set(-leafW / 2, (i / 5) * h, 0);
      rightLeaf.add(rib);
    }
    const rWalk = mesh(new THREE.BoxGeometry(leafW, 0.12, 0.8), walkMat);
    rWalk.position.set(-leafW / 2, h + 0.06, 0);
    rightLeaf.add(rWalk);

    rightPivot.add(rightLeaf);
    g.add(rightPivot);

    g.setOpen = function (k) {
      const closedAngle = 0.22;
      const openAngle = 1.35;
      const a = lerp(closedAngle, openAngle, k);
      leftPivot.rotation.y = -a;
      rightPivot.rotation.y = a;
    };
    g.setOpen(0);

    g.userData = { leftPivot, rightPivot, leftLeaf, rightLeaf };
    return g;
  };

  K.lockPanama = function (o = {}) {
    const g = new THREE.Group();
    const chamberL = o.chamberL || 32;
    const chamberW = o.chamberW || 6.6;
    const wallH = o.wallH || 8.8;
    const wallThick = 2.4;

    const concreteMat = K.mat('#94a3b8', { roughness: 0.92 });
    const floorMat = K.mat('#64748b', { roughness: 0.96 });
    const culvertMat = K.mat('#334155', { roughness: 0.8 });

    // Lantai dasar lock
    const floor = mesh(new THREE.BoxGeometry(chamberW + wallThick * 2, 1.2, chamberL + 8), floorMat);
    floor.position.set(0, -0.6, 0);
    g.add(floor);

    // Dinding belakang (kiri dari kamera)
    const backWall = mesh(new THREE.BoxGeometry(wallThick, wallH, chamberL + 8), concreteMat);
    backWall.position.set(-chamberW / 2 - wallThick / 2, wallH / 2, 0);
    g.add(backWall);

    // Trotoar atas dinding belakang
    const backWalk = mesh(new THREE.BoxGeometry(wallThick + 0.2, 0.15, chamberL + 8), K.mat('#cbd5e1', { roughness: 0.7 }));
    backWalk.position.set(-chamberW / 2 - wallThick / 2, wallH + 0.08, 0);
    g.add(backWalk);

    // Dinding depan (kanan/depan kamera - dapat disembunyikan untuk melihat bagian dalam)
    const frontWall = mesh(new THREE.BoxGeometry(wallThick, wallH, chamberL + 8), concreteMat);
    frontWall.position.set(chamberW / 2 + wallThick / 2, wallH / 2, 0);
    g.add(frontWall);

    // Lokomotif penarik (Mules) di atas dinding
    const mules = new THREE.Group();
    const muleMat = K.mat('#ca8a04', { roughness: 0.4 });
    for (const [mx, mz] of [
      [-chamberW / 2 - wallThick / 2, -chamberL * 0.3],
      [-chamberW / 2 - wallThick / 2, chamberL * 0.3],
      [chamberW / 2 + wallThick / 2, -chamberL * 0.3],
      [chamberW / 2 + wallThick / 2, chamberL * 0.3],
    ]) {
      const mule = mesh(new THREE.BoxGeometry(0.85, 0.6, 1.5), muleMat);
      mule.position.set(mx, wallH + 0.38, mz);
      mules.add(mule);
    }
    g.add(mules);

    // Menara kontrol (Control Tower)
    const tower = new THREE.Group();
    const tBase = mesh(new THREE.BoxGeometry(1.8, wallH + 3.8, 1.8), concreteMat);
    tBase.position.set(-chamberW / 2 - wallThick - 1.1, (wallH + 3.8) / 2, -chamberL * 0.35);
    tower.add(tBase);
    const tCab = mesh(new THREE.BoxGeometry(2.6, 1.5, 2.6), K.mat('#38bdf8', { metalness: 0.7, roughness: 0.2 }));
    tCab.position.set(-chamberW / 2 - wallThick - 1.1, wallH + 3.6, -chamberL * 0.35);
    tower.add(tCab);
    g.add(tower);

    // Gerbang baja belakang (hilir) & depan (hulu)
    const rearGate = K.gerbangBaja(chamberW, wallH * 0.95);
    rearGate.position.set(0, 0, chamberL / 2);
    g.add(rearGate);

    const frontGate = K.gerbangBaja(chamberW, wallH * 0.95);
    frontGate.position.set(0, 0, -chamberL / 2);
    g.add(frontGate);

    // Air di dalam lock (ketinggian dinamis)
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#1d6fa5',
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
    });
    const innerWater = mesh(new THREE.BoxGeometry(chamberW - 0.1, 1.0, chamberL - 0.2), waterMat, false, false);
    innerWater.position.set(0, 0.5, 0);
    g.add(innerWater);

    // Saluran air bawah tanah (Culverts)
    const culverts = new THREE.Group();
    const culvertPipe = mesh(new THREE.BoxGeometry(chamberW * 0.7, 1.4, chamberL + 8), culvertMat);
    culvertPipe.position.set(0, -1.8, 0);
    culverts.add(culvertPipe);

    for (let i = -3; i <= 3; i++) {
      const port = mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.3, 12), K.mat('#1e293b'));
      port.position.set((i % 2 ? -1 : 1) * chamberW * 0.25, -0.6, i * 3.8);
      culverts.add(port);
    }
    g.add(culverts);

    g.userData = {
      chamberL, chamberW, wallH,
      frontWall, backWall,
      rearGate, frontGate,
      innerWater, culverts, mules, tower
    };
    return g;
  };

  K.cranePelabuhan = function () {
    const g = new THREE.Group();
    const mOrange = K.mat('#e67e22', { metalness: 0.4, roughness: 0.4 });
    const mDark = K.mat('#2c3e50', { metalness: 0.6 });
    const mCable = K.mat('#7f8c8d');

    // Kaki gantry
    for (const x of [-1.8, 1.8]) {
      const leg = mesh(new THREE.BoxGeometry(0.3, 8.5, 0.3), mOrange);
      leg.position.set(x, 4.25, 0);
      g.add(leg);
    }
    const beam = mesh(new THREE.BoxGeometry(6.5, 0.6, 0.6), mOrange);
    beam.position.set(0, 8.5, 0);
    g.add(beam);

    const cab = mesh(new THREE.BoxGeometry(1.2, 1.0, 1.0), mDark);
    cab.position.set(0.6, 9.2, 0);
    g.add(cab);

    // Kabel & hook
    const cable = mesh(new THREE.CylinderGeometry(0.02, 0.02, 4.5, 6), mCable);
    cable.position.set(0, 6.0, 0);
    g.add(cable);

    const hook = mesh(new THREE.TorusGeometry(0.25, 0.06, 8, 16, Math.PI * 1.5), mDark);
    hook.position.set(0, 3.6, 0);
    g.add(hook);

    return g;
  };

  K.terusanPanamaDiorama = function (R) {
    const g = new THREE.Group();
    // Bentang tanah daratan sempit (Isthmus)
    const landMat = K.mat('#4b7a38', { roughness: 0.85 });
    const oceanMat = new THREE.MeshStandardMaterial({
      color: '#1b5d88',
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.88,
    });
    const canalWaterMat = new THREE.MeshStandardMaterial({
      color: '#2a8ec7',
      roughness: 0.15,
      metalness: 0.15,
    });

    // Samudra Pasifik & Atlantik di kedua ujung
    const oceanL = mesh(new THREE.BoxGeometry(18, 1.5, 45), oceanMat, false, true);
    oceanL.position.set(-24, 0.75, 0);
    g.add(oceanL);

    const oceanR = mesh(new THREE.BoxGeometry(18, 1.5, 45), oceanMat, false, true);
    oceanR.position.set(24, 0.75, 0);
    g.add(oceanR);

    // Daratan benua di tengah
    const land = mesh(new THREE.BoxGeometry(30, 2.2, 45), landMat, false, true);
    land.position.set(0, 1.1, 0);
    g.add(land);

    // Jalur air Terusan membelah daratan
    const canal = mesh(new THREE.BoxGeometry(6.5, 2.25, 45), canalWaterMat, false, true);
    canal.position.set(0, 1.15, 0);
    g.add(canal);

    // Bukit-bukit tropis di sekitarnya
    for (const [bx, bz, bs] of [
      [-7, -12, 1.6], [7, -15, 1.8], [-8, 12, 1.5], [8, 10, 1.7],
      [-12, -4, 2.0], [12, 2, 2.2], [-9, -20, 1.4], [10, -22, 1.9],
    ]) {
      const hill = mesh(new THREE.SphereGeometry(2.4 * bs, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), K.mat('#3b6a2b', { flatShading: true }));
      hill.scale.set(1.4, 0.75, 1.2);
      hill.position.set(bx, 2.0, bz);
      g.add(hill);
    }
    return g;
  };

  K.tanggaLockBertingkat = function () {
    const g = new THREE.Group();
    const concreteMat = K.mat('#94a3b8', { roughness: 0.9 });
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#1d6fa5',
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
    });

    const stepW = 5.8, stepL = 10.0;
    // Tiga tingkat lock: Tingkat 1 (y=1.0), Tingkat 2 (y=3.5), Tingkat 3 (y=6.0)
    for (let s = 0; s < 3; s++) {
      const z = (s - 1) * (stepL + 0.4);
      const floorH = 1.0 + s * 2.5;

      // Dinding beton per tingkat
      const lWall = mesh(new THREE.BoxGeometry(1.6, floorH + 3.2, stepL), concreteMat);
      lWall.position.set(-stepW / 2 - 0.8, (floorH + 3.2) / 2, z);
      g.add(lWall);

      const rWall = mesh(new THREE.BoxGeometry(1.6, floorH + 3.2, stepL), concreteMat);
      rWall.position.set(stepW / 2 + 0.8, (floorH + 3.2) / 2, z);
      g.add(rWall);

      // Air bertingkat
      const water = mesh(new THREE.BoxGeometry(stepW, floorH, stepL), waterMat);
      water.position.set(0, floorH / 2, z);
      g.add(water);

      // Gerbang pemisah antar tingkat
      const gate = K.gerbangBaja(stepW, floorH + 2.8);
      gate.position.set(0, 0, z + stepL / 2);
      g.add(gate);
    }

    // Mini ship moving up the steps
    const miniShip = K.kapalKontainer({ len: 6.5, w: 2.0, h: 1.2 });
    miniShip.position.set(0, 3.6, 0);
    g.add(miniShip);
    g.userData.miniShip = miniShip;

    return g;
  };
  /* ---------- benda edukasi (bisa ditanam menembus potongan) ---------- */
  const bambooTex = () => K.tex('bamboo', 64, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#b9b46a'); g.addColorStop(0.5, '#ddd894'); g.addColorStop(1, '#a9a35c');
    x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#8f8a44'; x.fillRect(0, 0, w, 7); x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(0, 8, w, 3);
  });
  const woodTex = () => K.tex('wood', 64, 256, (x, w, h) => {
    x.fillStyle = '#6b4428'; x.fillRect(0, 0, w, h); const R = rng(5);
    for (let i = 0; i < 30; i++) { x.strokeStyle = `rgba(${40 + R() * 30},${22 + R() * 15},10,.5)`; x.lineWidth = 1 + R() * 2; const X = R() * w; x.beginPath(); x.moveTo(X, 0); x.bezierCurveTo(X + 6, h * 0.3, X - 6, h * 0.6, X + 3, h); x.stroke(); }
  });
  // tiang: jenis bambu|kayu|beton|besi; tinggi di atas tanah, dalam = di bawah tanah
  K.tiang = function (jenis = 'bambu', tinggi = 9, dalam = 2.5, r = 0.24) {
    const g = new THREE.Group(); const L = tinggi + dalam;
    let m;
    if (jenis === 'bambu') { const t = bambooTex(); t.repeat.set(1, L / 1.1); m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }); }
    else if (jenis === 'kayu') { const t = woodTex(); t.repeat.set(1, L / 3); m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }); }
    else if (jenis === 'beton') m = K.mat('#b7b4ac', { roughness: 0.9 });
    else m = K.mat('#8e979e', { metalness: 0.6, roughness: 0.35 });
    const p = mesh(new THREE.CylinderGeometry(r * (jenis === 'beton' ? 0.8 : 1), r * (jenis === 'beton' ? 1.15 : 1), L, 14), m); p.position.y = (tinggi - dalam) / 2; g.add(p);
    if (jenis !== 'bambu') { const cap = mesh(new THREE.BoxGeometry(2.4, 0.14, 0.16), K.mat('#5b3a22')); cap.position.y = tinggi - 0.5; g.add(cap); }
    g.userData.top = tinggi; g.userData.mat = m; return g;
  };
  K.isolator = function () {
    const g = new THREE.Group(); const m = K.mat('#f6f5f1', { roughness: 0.25 });
    const pts = []; const prof = [[0.05, 0], [0.18, 0], [0.18, 0.06], [0.42, 0.14], [0.16, 0.22], [0.36, 0.32], [0.14, 0.4], [0.28, 0.5], [0.12, 0.58], [0.12, 0.66], [0.0, 0.7]];
    for (const [r, y] of prof) pts.push(new THREE.Vector2(r, y));
    const b = mesh(new THREE.LatheGeometry(pts, 28), m); g.add(b);
    const pin = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), K.mat('#777', { metalness: 0.6 })); pin.position.y = -0.12; g.add(pin);
    return g;
  };  K.tangga = function (tinggi = 6) {
    const g = new THREE.Group(); const m = K.mat('#9c6b3c');
    for (const x of [-0.32, 0.32]) { const r = mesh(new THREE.BoxGeometry(0.08, tinggi, 0.1), m); r.position.set(x, tinggi / 2, 0); g.add(r); }
    for (let y = 0.4; y < tinggi; y += 0.45) { const s = mesh(geo('rung', () => new THREE.BoxGeometry(0.64, 0.05, 0.07)), m); s.position.set(0, y, 0); g.add(s); }
    return g;
  };  K.pipa = function (len = 8, r = 0.35, col = '#9fb8c8') {
    const g = new THREE.Group(); const p = mesh(new THREE.CylinderGeometry(r, r, len, 20), K.mat(col, { metalness: 0.3, roughness: 0.4 })); p.rotation.z = Math.PI / 2; g.add(p);
    return g;
  };  K.cangkul = function () {
    const g = new THREE.Group();
    const h = mesh(geo('hoeh', () => new THREE.CylinderGeometry(0.03, 0.035, 1.25, 6)), K.mat('#8a5a2e')); h.position.y = 0.45; g.add(h);
    const b = mesh(geo('hoeb', () => new THREE.BoxGeometry(0.22, 0.03, 0.24)), K.mat('#6f767b', { metalness: 0.7, roughness: 0.35 })); b.position.set(0, 1.06, 0.12); g.add(b);
    return g;
  };  K.bibit = function () {
    const g = new THREE.Group(); const m = K.mat('#7fcf3d', { flatShading: true });
    for (let i = 0; i < 7; i++) { const l = mesh(geo('seedl', () => { const q = new THREE.ConeGeometry(0.03, 0.5, 3); q.translate(0, 0.25, 0); return q; }), m); l.rotation.set((i - 3) * 0.12, i, (i % 3 - 1) * 0.2); g.add(l); }
    return g;
  };  K.tumpukan = function (R, k = 1, col = '#7a5232') {
    const g = new THREE.Group();
    const m = mesh(geo('mound', () => new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), K.mat(col, { flatShading: true })); m.scale.set(1.2 * k, 0.55 * k, 0.9 * k); g.add(m);
    for (let i = 0; i < 6; i++) { const b = mesh(geo('clod', () => new THREE.DodecahedronGeometry(0.12, 0)), K.mat('#6a4428', { flatShading: true })); b.position.set((R() - 0.5) * 2 * k, 0.05, (R() - 0.3) * k); g.add(b); }
    return g;
  };  K.balok = function (len = 3, col = '#a8763f') { const g = new THREE.Group(); const b = mesh(new THREE.BoxGeometry(len, 0.18, 0.18), K.mat(col)); g.add(b); return g; };

  /* ---------- tokoh low-poly ---------- */
  K.orang = function (o = {}) {
    const g = new THREE.Group();
    const shirt = K.mat(o.baju || '#f07a2c'), pants = K.mat(o.celana || '#2b3552'), skin = K.mat(o.kulit || '#c98a5b'), hair = K.mat('#1b1512'), sandal = K.mat('#4a3020');
    const J = {};
    const hips = new THREE.Group(); hips.position.y = 0.95; g.add(hips); J.hips = hips;
    const spine = new THREE.Group(); hips.add(spine); J.spine = spine;
    const torso = mesh(geo('torso', () => new THREE.CapsuleGeometry(0.2, 0.32, 4, 10)), shirt); torso.scale.set(1.2, 1, 0.78); torso.position.y = 0.33; spine.add(torso);
    const sh = mesh(geo('shorts', () => new THREE.CapsuleGeometry(0.2, 0.08, 4, 10)), pants); sh.scale.set(1.15, 1, 0.8); sh.position.y = 0.03; hips.add(sh);
    const neck = new THREE.Group(); neck.position.y = 0.66; spine.add(neck); J.head = neck;
    const head = mesh(geo('head', () => new THREE.SphereGeometry(0.15, 16, 12)), skin); head.scale.set(1, 1.08, 1); head.position.y = 0.14; neck.add(head);
    for (const ex of [-0.055, 0.055]) { const e = mesh(geo('eye', () => new THREE.SphereGeometry(0.022, 8, 6)), K.mat('#1a1410', { roughness: 0.3 }), false, false); e.position.set(ex, 0.16, 0.135); neck.add(e); }
    const ns = mesh(geo('nose', () => new THREE.SphereGeometry(0.025, 6, 5)), skin, false, false); ns.position.set(0, 0.12, 0.15); neck.add(ns);
    const hr = mesh(geo('hair', () => new THREE.SphereGeometry(0.158, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52)), hair); hr.position.set(0, 0.155, -0.012); hr.rotation.x = -0.25; neck.add(hr);
    if (o.caping !== false) {
      const cp = mesh(geo('caping', () => new THREE.ConeGeometry(0.46, 0.2, 18)), K.mat('#dcc58e', { flatShading: true })); cp.position.y = 0.37; cp.rotation.x = -0.08; neck.add(cp);
    }
    function arm(side) {
      const s = new THREE.Group(); s.position.set(side * 0.27, 0.56, 0); spine.add(s);
      const ua = mesh(geo('uarm', () => new THREE.CapsuleGeometry(0.068, 0.2, 3, 8)), shirt); ua.position.y = -0.14; s.add(ua);
      const el = new THREE.Group(); el.position.y = -0.3; s.add(el);
      const fa = mesh(geo('farm', () => new THREE.CapsuleGeometry(0.055, 0.2, 3, 8)), skin); fa.position.y = -0.13; el.add(fa);
      const hd = new THREE.Group(); hd.position.y = -0.3; el.add(hd);
      const hm = mesh(geo('hand', () => new THREE.SphereGeometry(0.062, 8, 6)), skin); hd.add(hm);
      return [s, el, hd];
    }
    [J.shL, J.elL, J.handL] = arm(1); [J.shR, J.elR, J.handR] = arm(-1);
    function leg(side) {
      const h = new THREE.Group(); h.position.set(side * 0.11, -0.02, 0); hips.add(h);
      const th = mesh(geo('thigh', () => new THREE.CapsuleGeometry(0.088, 0.22, 3, 8)), pants); th.position.y = -0.17; h.add(th);
      const kn = new THREE.Group(); kn.position.y = -0.44; h.add(kn);
      const sn = mesh(geo('shin', () => new THREE.CapsuleGeometry(0.062, 0.3, 3, 8)), skin); sn.position.y = -0.2; kn.add(sn);
      const ft = mesh(geo('foot', () => new THREE.BoxGeometry(0.12, 0.05, 0.27)), sandal); ft.position.set(0, -0.47, 0.06); kn.add(ft);
      return [h, kn];
    }
    [J.hipL, J.kneeL] = leg(1); [J.hipR, J.kneeR] = leg(-1);
    g.userData.J = J;
    return g;
  };  // pose: kembalikan sudut sendi (radian). maju = rotasi x negatif.
  const P0 = { y: 0, lean: 0, head: 0, headY: 0, shL: 0.05, shR: 0.05, szL: 0.12, szR: 0.12, elL: -0.15, elR: -0.15, hipL: 0, hipR: 0, knL: 0, knR: 0 };
  const POSES = {
    berdiri: (t) => ({ lean: 0.02 * Math.sin(t * 1.7), shL: 0.05 + 0.03 * Math.sin(t * 1.7), shR: 0.05 + 0.03 * Math.sin(t * 1.7 + 0.5), head: 0.05 * Math.sin(t * 0.9) }),
    jalan: (t) => { const w = t * 7.5, s = Math.sin(w); return { y: 0.03 * Math.abs(Math.cos(w)), hipL: -0.55 * s, hipR: 0.55 * s, knL: 0.6 * Math.max(0, Math.sin(w + 1.6)), knR: 0.6 * Math.max(0, Math.sin(w + 1.6 + Math.PI)), shL: 0.45 * s, shR: -0.45 * s, elL: -0.35, elR: -0.35, lean: 0.06 }; },
    gali: (t) => { const k = (t % 1.15) / 1.15; const up = k < 0.55 ? ease(k / 0.55) : 1 - ease((k - 0.55) / 0.2 > 1 ? 1 : (k - 0.55) / 0.2); const a = lerp(-0.5, -2.7, up); return { shL: a, shR: a, szL: 0.05, szR: 0.05, elL: -0.3 - 0.4 * up, elR: -0.3 - 0.4 * up, lean: lerp(0.32, 0.0, up), hipL: -0.35, hipR: 0.3, knL: 0.45, knR: 0.25, y: -0.06, head: 0.2 }; },
    panjat: (t) => { const w = t * 4.2, s = Math.sin(w); return { shL: -2.4 + 0.5 * s, shR: -2.4 - 0.5 * s, elL: -0.6, elR: -0.6, hipL: -0.9 - 0.5 * s, hipR: -0.9 + 0.5 * s, knL: 1.2 + 0.4 * s, knR: 1.2 - 0.4 * s, lean: 0.12, head: -0.25 }; },
    angkat: (t) => { const w = t * 6, s = Math.sin(w); return { hipL: -0.4 * s, hipR: 0.4 * s, knL: 0.5 * Math.max(0, Math.sin(w + 1.6)), knR: 0.5 * Math.max(0, Math.sin(w + 1.6 + Math.PI)), shL: -2.9, shR: -2.6, szL: 0.35, szR: 0.25, elL: -1.4, elR: -1.5, lean: 0.12, head: 0.15, y: 0.02 * Math.abs(Math.cos(w)) }; },
    tunjuk: (t) => ({ shR: -1.55 + 0.04 * Math.sin(t * 2), szR: 0.25, elR: -0.05, shL: 0.1, lean: 0.03, head: -0.05, headY: -0.25 }),
    kaget: (t, a) => { const k = ramp(t, a, a + 0.25); const hop = Math.max(0, Math.sin(cl((t - a) / 0.45) * Math.PI)) * 0.18; return { y: hop, shL: lerp(0.05, -2.9, k), shR: lerp(0.05, -2.9, k), szL: lerp(0.1, 0.55, k), szR: lerp(0.1, 0.55, k), elL: -0.5 * k, elR: -0.5 * k, lean: -0.15 * k, head: -0.2 * k, knL: 0.3 * k, knR: 0.3 * k, hipL: -0.2 * k, hipR: -0.2 * k }; },
    pikir: (t) => ({ shR: -1.2, szR: 0.4, elR: -2.3, shL: -0.3, szL: 0.1, elL: -1.6, head: 0.12 + 0.04 * Math.sin(t), headY: 0.15 * Math.sin(t * 0.6), lean: 0.03 }),
    tanam: (t) => { const k = 0.5 + 0.5 * Math.sin(t * 3); return { lean: 0.95, hipL: -1.0, hipR: -0.7, knL: 1.3, knR: 1.0, y: -0.28, shR: -0.9 - 0.5 * k, elR: -0.2, shL: -0.4, elL: -0.6, head: -0.5 }; },
    dorong: (t) => { const w = t * 4, s = Math.sin(w); return { lean: 0.45, shL: -1.45, shR: -1.45, elL: -0.25, elR: -0.25, hipL: -0.5 * s - 0.2, hipR: 0.5 * s - 0.2, knL: 0.4 + 0.3 * Math.max(0, s), knR: 0.4 + 0.3 * Math.max(0, -s), y: -0.04 }; },
    jongkok: (t) => ({ hipL: -1.7, hipR: -1.7, knL: 2.3, knR: 2.3, y: -0.5, lean: 0.35, shL: -0.9 + 0.1 * Math.sin(t * 2), shR: -1.0, elL: -0.5, elR: -0.5, head: 0.3 }),
    lapor: (t) => { const w = t * 5; return { shR: -0.6 + 0.35 * Math.sin(w), szR: 0.35, elR: -1.1 + 0.3 * Math.sin(w * 1.3), shL: -0.4 + 0.25 * Math.sin(w + 2), szL: 0.3, elL: -1.0, head: 0.06 * Math.sin(w * 0.7), headY: 0.12 * Math.sin(t * 0.8) }; },
  };
  K.poses = Object.keys(POSES);
  K.pose = function (o, nama, t, a = 0) {
    const J = o.userData.J; const q = Object.assign({}, P0, (POSES[nama] || POSES.berdiri)(t, a));
    J.hips.position.y = 0.95 + q.y; J.spine.rotation.x = q.lean; J.head.rotation.x = q.head; J.head.rotation.y = q.headY;
    J.shL.rotation.set(q.shL, 0, q.szL); J.shR.rotation.set(q.shR, 0, -q.szR); J.elL.rotation.x = q.elL; J.elR.rotation.x = q.elR;
    J.hipL.rotation.x = q.hipL; J.hipR.rotation.x = q.hipR; J.kneeL.rotation.x = q.knL; J.kneeR.rotation.x = q.knR;
  };

  /* ---------- efek ---------- */
  K.hujan = function (c, kuat = 1) {
    const n = 900 * kuat, R = rng(c.seed + 3), pos = new Float32Array(n * 6), base = [];
    for (let i = 0; i < n; i++) base.push([(R() - 0.5) * 30, R() * 22, -10 + R() * 22, 8 + R() * 4]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const ls = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#dbe8f5', transparent: true, opacity: 0.55 })); c.scene.add(ls);
    c.upd.push(t => { for (let i = 0; i < n; i++) { const [x, y0, z, v] = base[i]; const y = ((y0 - t * v) % 22 + 22) % 22 - 2; pos.set([x, y, z, x - 0.05, y + 0.55, z], i * 6); } g.attributes.position.needsUpdate = true; });
    c.scene.fog.color.set('#a9b8c6'); c.scene.background = K.tex('skyR', 8, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6f8193'); gr.addColorStop(1, '#c3ccd4'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  };
  // semburan tanah/serpihan pada waktu-waktu tertentu
  K.serpih = function (c, origin, times, col = '#6a4428', n = 14) {
    const R = rng(c.seed + 9); const parts = [];
    for (let i = 0; i < n * times.length; i++) {
      const b = mesh(geo('clod2', () => new THREE.DodecahedronGeometry(0.07, 0)), K.mat(col, { flatShading: true })); b.visible = false; c.scene.add(b);
      parts.push({ b, t0: times[(i / n) | 0], v: [(R() - 0.5) * 3.5, 2.5 + R() * 3.5, (R() - 0.2) * 2.5], s: 0.6 + R() * 0.9 });
    }
    c.upd.push(t => { for (const p of parts) { const d = t - p.t0; if (d < 0 || d > 1.1) { p.b.visible = false; continue; } p.b.visible = true; const y = origin[1] + p.v[1] * d - 4.9 * d * d; p.b.position.set(origin[0] + p.v[0] * d, Math.max(-0.1, y), origin[2] + p.v[2] * d); p.b.rotation.set(d * 7, d * 5, 0); p.b.scale.setScalar(p.s * (1 - ramp(d, 0.8, 1.1))); } });
  };
  K.bintik = function (c, x0, x1, y0, y1, z, t0, col = '#ffffff', n = 30) { // tetesan/titik air di potongan
    const R = rng(c.seed + 21 + n * 7 + Math.round(x0 * 10)); const m = K.mat(col, { roughness: 0.2, emissive: col, emissiveIntensity: 0.25 });
    const ds = []; for (let i = 0; i < n; i++) { const d = mesh(geo('drop', () => new THREE.SphereGeometry(0.09, 8, 6)), m, false, false); d.position.set(x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), z); d.userData.t = t0 + R() * 1.6; c.scene.add(d); ds.push(d); }
    c.upd.push(t => { for (const d of ds) { const k = back(cl((t - d.userData.t) / 0.35)); d.scale.setScalar(Math.max(0.001, k)); d.position.y += 0; } });
  };

  /* ---------- HUD 2D (SVG) ---------- */
  const ICONS = {
    matahari: (s) => { let r = ''; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; r += `<line x1="${Math.cos(a) * 62}" y1="${Math.sin(a) * 62}" x2="${Math.cos(a) * 88}" y2="${Math.sin(a) * 88}" stroke="#ffc928" stroke-width="10" stroke-linecap="round"/>`; } return `<circle r="120" fill="#fff6c4" opacity=".45"/>${r}<circle r="52" fill="#ffd23a"/><circle r="52" fill="none" stroke="#f6b81f" stroke-width="5"/>`; },
    termometer: (s, k) => `<rect x="-22" y="-95" width="44" height="150" rx="22" fill="#fff" stroke="#3b3b3b" stroke-width="7"/><circle cy="70" r="38" fill="#e2452f" stroke="#3b3b3b" stroke-width="7"/><rect x="-10" y="${55 - 130 * k}" width="20" height="${130 * k + 10}" rx="8" fill="#e2452f"/>`,
    larangan: () => `<circle r="80" fill="#fff" stroke="#e23b2e" stroke-width="16"/><line x1="-56" y1="-56" x2="56" y2="56" stroke="#e23b2e" stroke-width="16" stroke-linecap="round"/>`,
    centang: () => `<circle r="80" fill="#2fb85a" stroke="#fff" stroke-width="8"/><path d="M-38 2 L-10 30 L42 -26" stroke="#fff" stroke-width="18" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    silang: () => `<circle r="80" fill="#e23b2e" stroke="#fff" stroke-width="8"/><path d="M-32 -32 L32 32 M32 -32 L-32 32" stroke="#fff" stroke-width="18" stroke-linecap="round"/>`,
    petir: () => `<circle r="80" fill="#2b3a67" stroke="#fff" stroke-width="7"/><path d="M12 -62 L-34 8 L-2 8 L-14 62 L36 -12 L4 -12 Z" fill="#ffd23a" stroke="#fff3a0" stroke-width="4" stroke-linejoin="round"/>`,
    air: () => `<path d="M0 -80 C 30 -36 58 -6 58 26 A 58 58 0 0 1 -58 26 C -58 -6 -30 -36 0 -80 Z" fill="#3a9be8" stroke="#fff" stroke-width="8"/><ellipse cx="-20" cy="18" rx="10" ry="18" fill="#bfe3ff"/>`,
    uang: () => `<rect x="-90" y="-52" width="180" height="104" rx="14" fill="#3fae5a" stroke="#fff" stroke-width="7"/><circle r="30" fill="#2c8a45" stroke="#d9f5df" stroke-width="5"/><text y="12" text-anchor="middle" font-size="36" font-weight="900" fill="#fff" font-family="Inter">Rp</text>`,
    jam: () => `<circle r="80" fill="#fff" stroke="#3b3b3b" stroke-width="10"/><path d="M0 -50 L0 0 L34 22" stroke="#e2452f" stroke-width="11" fill="none" stroke-linecap="round"/>`,
    tanya: () => `<circle r="80" fill="#3157e8" stroke="#fff" stroke-width="8"/><text y="34" text-anchor="middle" font-size="104" font-weight="900" fill="#fff" font-family="Inter">?</text>`,
    seru: () => `<path d="M0 -84 L84 66 L-84 66 Z" fill="#ffc928" stroke="#fff" stroke-width="8" stroke-linejoin="round"/><text y="50" text-anchor="middle" font-size="100" font-weight="900" fill="#2a2a2a" font-family="Inter">!</text>`,
    api: () => `<path d="M0 -86 C 44 -30 62 0 52 36 A 54 54 0 0 1 -52 36 C -60 0 -30 -20 -12 -50 C -6 -20 10 -14 0 -86 Z" fill="#ff7a1a" stroke="#fff" stroke-width="7"/><path d="M0 -10 C 20 14 26 30 18 46 A 22 22 0 0 1 -18 46 C -24 28 -6 18 0 -10Z" fill="#ffd23a"/>`,
    angin: () => `<g stroke="#fff" stroke-width="12" fill="none" stroke-linecap="round"><path d="M-80 -30 H30 a24 24 0 1 0 -24 -24"/><path d="M-80 6 H60 a26 26 0 1 1 -26 26"/><path d="M-60 40 H10"/></g>`,
    tanaman: () => `<path d="M0 70 L0 -10" stroke="#3c8a2c" stroke-width="10"/><path d="M0 20 C -60 20 -70 -30 -70 -50 C -20 -50 0 -20 0 20Z M0 0 C 60 0 70 -50 70 -70 C 20 -70 0 -40 0 0Z" fill="#5cbf3a" stroke="#fff" stroke-width="5"/>`,
    ikan: () => `<path d="M-70 0 C -30 -50 40 -50 62 0 C 40 50 -30 50 -70 0Z" fill="#f08a3c" stroke="#fff" stroke-width="7"/><path d="M58 0 L96 -36 L96 36Z" fill="#f08a3c" stroke="#fff" stroke-width="7" stroke-linejoin="round"/><circle cx="-36" cy="-8" r="8" fill="#222"/>`,
    rumah: () => `<path d="M-80 0 L0 -70 L80 0 L60 0 L60 70 L-60 70 L-60 0Z" fill="#fff" stroke="#3b3b3b" stroke-width="8" stroke-linejoin="round"/><rect x="-16" y="20" width="32" height="50" fill="#e2452f"/>`,
  };
  K.icons = Object.keys(ICONS);
  // ikon "lencana" mengambang di posisi layar (x,y px), muncul di t0
  K.hudIkon = function (c, nama, x, y, t0, o = {}) {
    if (!ICONS[nama]) return;
    c.hud.push(t => {
      if (t < t0) return '';
      const k = back(cl((t - t0) / 0.38)); const bob = Math.sin((t - t0) * 2.2) * 6;
      const s = (o.s || 1) * k; const spin = nama === 'matahari' ? (t * 12) % 360 : 0;
      const inner = nama === 'termometer' ? ICONS[nama](s, cl(0.2 + 0.7 * ramp(t, t0 + 0.2, t0 + 1.6))) : ICONS[nama](s);
      return `<g transform="translate(${x},${y + bob}) scale(${s.toFixed(3)})" opacity="${cl(k * 1.5).toFixed(3)}"><g filter="url(#sh)"><g transform="rotate(${spin})">${inner}</g>${o.coret ? `<circle r="84" fill="none" stroke="#e23b2e" stroke-width="14"/><line x1="-58" y1="-58" x2="58" y2="58" stroke="#e23b2e" stroke-width="14" stroke-linecap="round"/>` : ''}</g></g>`;
    });
  };
  // panah merah tebal yang menunjuk titik 3D (anchor) dari arah 'dari' (derajat, 0 = dari kanan)
  K.hudPanah = function (c, anchor, t0, dari = 0, o = {}) {
    c.hud.push(t => {
      if (t < t0 || (o.t1 && t > o.t1)) return '';
      const [sx, sy] = K.toScreen(c, anchor); const k = ease(cl((t - t0) / 0.3));
      const len = o.len || 210, d = 30 + Math.sin((t - t0) * 6) * 12 + (1 - k) * 160;
      return `<g transform="translate(${sx.toFixed(1)},${sy.toFixed(1)}) rotate(${dari}) translate(${d.toFixed(1)},0)" opacity="${k.toFixed(3)}"><path d="M0 0 L70 -58 L70 -26 L${len} -26 L${len} 26 L70 26 L70 58 Z" fill="#e8322a" stroke="#fff" stroke-width="7" stroke-linejoin="round" filter="url(#sh)"/></g>`;
    });
  };
  // label callout: titik pada objek + garis + teks putih
  K.hudLabel = function (c, anchor, teks, t0, dx = 160, dy = -90, o = {}) {
    if (!teks) return;
    c.hud.push(t => {
      if (t < t0 || (o.t1 && t > o.t1)) return '';
      const [sx, sy] = K.toScreen(c, anchor); const k = ease(cl((t - t0) / 0.35)); const tw = String(teks).length * (o.size || 44) * 0.58;
      let lx = sx + dx * k; const ly = sy + dy * k;
      if (dx >= 0) lx = Math.min(lx, 1040 - tw - 40); else lx = Math.max(lx, 40 + tw + 40);  // teks tetap di dalam layar
      const anchorTxt = dx >= 0 ? 'start' : 'end';
      return `<g opacity="${k.toFixed(3)}"><circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="11" fill="#fff" stroke="#1b1b1d" stroke-width="4"/><path d="M${sx.toFixed(1)} ${sy.toFixed(1)} L${lx.toFixed(1)} ${ly.toFixed(1)} L${(lx + (dx >= 0 ? 30 : -30)).toFixed(1)} ${ly.toFixed(1)}" stroke="#fff" stroke-width="5" fill="none" filter="url(#sh)"/><text x="${(lx + (dx >= 0 ? 40 : -40)).toFixed(1)}" y="${(ly + 15).toFixed(1)}" text-anchor="${anchorTxt}" font-family="Inter" font-weight="800" font-size="${o.size || 44}" fill="#fff" stroke="#17181c" stroke-width="9" paint-order="stroke" stroke-linejoin="round">${esc(teks)}</text></g>`;
    });
  };
  // teks komik (BRUK!, KRAK!) di titik layar
  K.hudBunyi = function (c, teks, x, y, t0, col = '#3157e8') {
    if (!teks) return;
    c.hud.push(t => {
      if (t < t0 || t > t0 + 1.6) return '';
      const k = back(cl((t - t0) / 0.25)); const f = 1 - ramp(t, t0 + 1.2, t0 + 1.6);
      return `<g transform="translate(${x},${y}) rotate(-8) scale(${k.toFixed(3)})" opacity="${f.toFixed(3)}"><text text-anchor="middle" font-family="Inter" font-weight="900" font-size="120" fill="${col}" stroke="#fff" stroke-width="14" paint-order="stroke" stroke-linejoin="round" filter="url(#sh)">${esc(teks)}</text></g>`;
    });
  };
  K.hudAngka = function (c, nilai, ket, t0) {
    c.hud.push(t => {
      if (t < t0) return '';
      const k = back(cl((t - t0) / 0.4));
      return `<g transform="translate(540,760) scale(${k.toFixed(3)})"><rect x="-400" y="-150" width="800" height="300" rx="40" fill="#fff" opacity=".93" filter="url(#sh)"/><text y="40" text-anchor="middle" font-family="Inter" font-weight="900" font-size="${String(nilai).length > 7 ? 120 : 160}" fill="#3157e8">${esc(nilai)}</text><text y="112" text-anchor="middle" font-family="Inter" font-weight="800" font-size="44" fill="#2a2a2e">${esc(ket)}</text></g>`;
    });
  };
  K.hudDefs = `<defs><filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".35"/></filter></defs>`;
})();



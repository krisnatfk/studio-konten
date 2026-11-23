/* Edukasi 3D - runtime: renderer Three.js, kamera, header, subtitle, HUD.
 * render(t) murni fungsi waktu: rencana sama -> video sama (semua acak memakai seed).
 */
(function () {
  const THREE = window.THREE;
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = x => x * x * (3 - 2 * x);
  const ramp = (t, a, b) => ease(cl((t - a) / (b - a)));
  const lerp = (a, b, k) => a + (b - a) * k;
  const back = x => { x = cl(x); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const pulse = (t, t0, d) => t < t0 ? 0 : Math.max(0, Math.sin(Math.PI * cl((t - t0) / d)));
  function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const norm = w => String(w).toLowerCase().replace(/[^a-z0-9à-ÿ]/g, '');
  const H = { cl, ease, ramp, lerp, back, pulse, rng, esc, norm };
  const T = {};
  const ENG = { H, T, def(name, d) { T[name] = d; } };
  window.ENG = ENG;
  const $ = id => document.getElementById(id);

  ENG.boot = function (PLAN) {
    const K = window.K;
    const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1); renderer.setSize(1080, 1920, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const pctx = $('prev').getContext('2d'), cctx = $('comp').getContext('2d');
    const cues = PLAN.cues || [];
    const total = PLAN.duration;
    const events = PLAN.events || [];
    const bumps = events.filter(e => ['ketuk', 'brak', 'ketuk_pintu'].includes(e.type)).map(e => e.t);

    const scenes = PLAN.scenes.map((sc, i) => ({ sc, i, d: T[sc.template] || T.aktivitas, ctx: null }));
    function build(S) {
      if (S.ctx) return S.ctx;
      const { sc, i, d } = S;
      const p = Object.assign({}, d.defaults || {}, sc.params || {});
      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(32, 1080 / 1920, 0.2, 900);
      const c = {
        i, p, scene, cam, t0: sc.start, t1: sc.end, dur: sc.end - sc.start, gerak: (sc.camera || {}).gerak || d.gerak || 'maju',
        seed: 1000 + i * 97 + (PLAN.seed || 0), upd: [], hud: [],
        k: t => cl((t - sc.start) / (sc.end - sc.start)), at: f => sc.start + f * (sc.end - sc.start),
        shot: { target: [0, 1.4, 0], dist: 30, yaw: 0, pitch: 6, fov: 32 },
      };
      c.R = rng(c.seed);
      d.build(c, p);
      K.lights(c, p);
      S.ctx = c;
      return c;
    }
    // hapus adegan yang sudah lewat agar memori worker tetap kecil
    function drop(S) {
      if (!S.ctx) return;
      S.ctx.scene.traverse(o => { if (o.geometry && !o.geometry.__shared) o.geometry.dispose(); });
      S.ctx = null;
    }

    function camAt(c, t) {
      let s = c.shotAt ? c.shotAt(t) : c.shot;
      s = Object.assign({}, s, { target: s.target.slice() });
      const k = ease(c.k(t));
      const g = c.gerak;
      if (g === 'maju') s.dist *= lerp(1.13, 0.86, k);
      else if (g === 'mundur') s.dist *= lerp(0.86, 1.14, k);
      else if (g === 'geser_kiri') { s.yaw += lerp(9, -9, k); s.target[0] += lerp(0.8, -0.8, k); }
      else if (g === 'geser_kanan') { s.yaw += lerp(-9, 9, k); s.target[0] += lerp(-0.8, 0.8, k); }
      else if (g === 'naik') { s.pitch += lerp(-3, 9, k); s.target[1] += lerp(-1.2, 1.6, k); }
      else if (g !== 'tetap') s.dist *= lerp(1.0, 0.95, k);
      const view = scenes[c.i].sc.shots?.find(shot => t < shot.end)?.view;
      if (view === 'detail') {
        const keepPole = String(c.p.objek || '').startsWith('tiang_') && !c.shotAt;
        if (c.detailAnchor && !keepPole) {
          s.target = s.target.map((v,i) => lerp(v,c.detailAnchor[i],.62));
          s.dist *= .74;
        } else if (!keepPole) s.dist *= .88;
        s.yaw += 12;
      }
      if (view === 'samping') { s.yaw -= 19; s.pitch = Math.min(78, s.pitch + 6); }
      if (view === 'luas') { s.dist *= 1.18; s.pitch = Math.min(78, s.pitch + 8); }
      const sway = g === 'tetap' ? 0.35 : 1;  // kamera sinematik: goyang tangan sangat halus
      s.yaw += sway * (0.5 * Math.sin(t * 0.61) + 0.25 * Math.sin(t * 1.37 + 1));
      s.pitch += sway * 0.35 * Math.sin(t * 0.53 + 2);
      let bump = 0; for (const b of bumps) if (t >= b && t < b + 0.45) bump += Math.sin((t - b) * 60) * 0.12 * (1 - (t - b) / 0.45);
      const y = s.yaw * Math.PI / 180, pi = s.pitch * Math.PI / 180;
      c.cam.fov = s.fov || 32; c.cam.updateProjectionMatrix();
      c.cam.position.set(s.target[0] + s.dist * Math.cos(pi) * Math.sin(y) + bump, s.target[1] + s.dist * Math.sin(pi) + bump * 0.6, s.target[2] + s.dist * Math.cos(pi) * Math.cos(y));
      c.cam.lookAt(s.target[0], s.target[1], s.target[2]);
    }

    function draw(S, t) {
      const c = build(S);
      for (const f of c.upd) f(t);
      camAt(c, t);
      c.cam.updateMatrixWorld();
      if (!c.fokus) { renderer.render(c.scene, c.cam); $('comp').style.display = 'none'; c.out = $('gl'); return c; }
      // depth of field ala close-up: latar diburamkan, benda fokus tajam
      c.fokus.visible = false; renderer.render(c.scene, c.cam);
      cctx.filter = 'blur(13px)'; cctx.drawImage($('gl'), -30, -50, 1140, 2020); cctx.filter = 'none';
      const hid = [], bg = c.scene.background;
      for (const o of c.scene.children) if (o !== c.fokus && !o.isLight && o.visible) { o.visible = false; hid.push(o); }
      c.fokus.visible = true; c.scene.background = null;
      renderer.setClearColor(0x000000, 0); renderer.render(c.scene, c.cam);
      for (const o of hid) o.visible = true; c.scene.background = bg;
      cctx.drawImage($('gl'), 0, 0);
      $('comp').style.display = 'block';
      c.out = $('comp'); return c;
    }

    const proj = new THREE.Vector3();
    K.toScreen = (c, p) => { proj.set(p[0], p[1], p[2]).project(c.cam); return [(proj.x + 1) * 540, (1 - proj.y) * 960, proj.z]; };

    /* ---------- header ---------- */
    function headerHTML(p) {
      const words = String(p.judul || '').split(/\s+/).filter(Boolean);
      const keys = String(p.sorot || '').split(/[,;]/).map(s => s.trim().toLowerCase()).filter(Boolean);
      let out = []; let i = 0;
      while (i < words.length) {
        let hit = 0;
        for (const kk of keys) { const n = kk.split(/\s+/).length; if (words.slice(i, i + n).map(norm).join(' ') === kk.split(/\s+/).map(norm).join(' ')) { hit = n; break; } }
        if (hit) { out.push(`<span class="hl">${esc(words.slice(i, i + hit).join(' '))}</span>`); i += hit; }
        else { out.push(esc(words[i])); i++; }
      }
      return out.join(' ');
    }

    /* ---------- subtitle: potongan 1-3 kata ala TikTok ---------- */
    function prepCue(cue) {
      if (cue.__ch) return cue.__ch;
      const words = cue.text.split(/\s+/).filter(Boolean);
      let times = cue.wt && cue.wt.length === words.length ? cue.wt : null;
      if (!times) {
        const e = cue.pe || cue.end, tot = words.reduce((n, w) => n + w.length + 1, 0); let acc = 0;
        times = words.map(w => { const tt = cue.start + (e - cue.start) * acc / tot; acc += w.length + 1; return tt; });
      }
      const ch = []; let cur = [];
      words.forEach((w, j) => {
        const len = cur.reduce((n, x) => n + x.w.length + 1, 0) + w.length;
        if (cur.length && (cur.length >= 3 || len > 19 || /[,.!?;:]$/.test(cur[cur.length - 1].w))) { ch.push(cur); cur = []; }
        cur.push({ w, t: times[j] });
      });
      if (cur.length) ch.push(cur);
      ch.forEach((g, k) => { g.t0 = g[0].t; g.t1 = k + 1 < ch.length ? ch[k + 1][0].t : cue.end; });
      return (cue.__ch = ch);
    }
    let lastSub = null;
    function subtitle(t, keys) {
      const sub = $('sub');
      let cue = null; for (const c of cues) if (t >= c.start - 0.05 && t <= c.end) { cue = c; break; }
      if (!cue) { sub.style.opacity = 0; return; }
      const ch = prepCue(cue); let g = ch[0];
      for (const x of ch) if (t >= x.t0 - 0.05) g = x;
      const id = cue.i + ':' + ch.indexOf(g) + ':' + keys.join(',');
      if (lastSub !== id) {
        lastSub = id;
        sub.innerHTML = g.map(x => {
          const n = norm(x.w);
          const k = n.length > 2 && keys.some(kk => kk === n || (kk.length > 4 && n.startsWith(kk)));
          return `<span class="${k ? 'k' : cue.role === 'seram' ? 'w' : ''}">${esc(x.w)}</span>`;
        }).join('');
      }
      const spans = sub.children;
      g.forEach((x, j) => {
        const on = t >= x.t - 0.03; const k = ramp(t, x.t - 0.03, x.t + 0.14);
        const sp = spans[j]; if (!sp) return;
        sp.style.opacity = on ? 1 : 0.32;
        sp.style.transform = `scale(${(on ? 0.82 + 0.18 * back(k / 1) : 0.92).toFixed(3)})`;
      });
      sub.style.opacity = Math.min(ramp(t, g.t0 - 0.06, g.t0 + 0.05), 1 - ramp(t, cue.end + 0.02, cue.end + 0.12));
      sub.style.fontSize = g.reduce((n, x) => n + x.w.length + 1, 0) > 17 ? '58px' : '66px';
    }

    $('wm').textContent = PLAN.watermark || '';
    let hdrKey = null;

    window.render = async function (t) {
      let i = scenes.findIndex(S => t < S.sc.end);
      if (i < 0) i = scenes.length - 1;
      const S = scenes[i];
      scenes.forEach((x, j) => { if (j < i - 1) drop(x); });
      // transisi: larut 0.3 dtk dari adegan sebelumnya
      // adegan bertanda sambung:true memakai kamera kontinu yang sama -> tanpa dissolve
      const TR = S.sc.transisi || 0.32; let mix = 0;
      if (i > 0 && !S.sc.sambung && t < S.sc.start + TR) {
        mix = 1 - ramp(t, S.sc.start, S.sc.start + TR);
        const src = draw(scenes[i - 1], t).out;
        pctx.clearRect(0, 0, 1080, 1920); pctx.drawImage(src, 0, 0);
      }
      $('prev').style.opacity = mix;
      $('prev').style.transform = S.sc.transisi ? 'none' : `scale(${1 + 0.05 * (1 - mix)})`;
      const c = draw(S, t);
      // HUD (panah, ikon, label, teks besar)
      let svg = '';
      for (const h of c.hud) svg += h(t, c) || '';
      $('hud').innerHTML = K.hudDefs + svg;
      $('hud').style.opacity = 1 - mix;
      // header per adegan (judul + kata sorot), jatuh ke judul video bila adegan tanpa judul
      const p = c.p;
      const hp = p.judul ? p : (PLAN.title_bar ? { judul: PLAN.title_bar, label: p.label || '', sorot: p.sorot } : null);
      const key = hp ? (hp.label || '') + '|' + hp.judul + '|' + (hp.sorot || '') : '';
      // judul baru masuk halus (stateless: bandingkan dengan judul adegan sebelumnya)
      const pp = i > 0 ? (scenes[i - 1].sc.params || {}) : null;
      const fresh = !pp || (pp.label || '') + '|' + (pp.judul || '') + '|' + (pp.sorot || '') !== key;
      // judul lama memudar 0.2 dtk, lalu judul baru masuk 0.3 dtk (tanpa kedip)
      const dt = t - S.sc.start, OUT = 0.2;
      let showKey = key, hk = 1, src = hp;
      if (fresh && i > 0 && pp && pp.judul && dt < OUT) { src = pp; showKey = (pp.label || '') + '|' + pp.judul + '|' + (pp.sorot || ''); hk = 1 - ease(cl(dt / OUT)); }
      else if (fresh && i > 0) hk = ease(cl((dt - (pp && pp.judul ? OUT : 0)) / 0.3));
      if (showKey !== hdrKey) { hdrKey = showKey; if (src) { $('hlab').textContent = src.label || ''; $('hlab').style.display = src.label ? 'block' : 'none'; $('htit').innerHTML = headerHTML(src); $('htit').style.top = src.label ? '132px' : '104px'; } }
      $('hdr').style.opacity = src ? 1 : 0;
      $('hlab').style.opacity = $('htit').style.opacity = hk.toFixed(3);
      $('htit').style.transform = `translateY(${((1 - hk) * 14).toFixed(1)}px)`;
      const keys = String(p.sorot || '').split(/[,;\s]+/).map(norm).filter(x => x.length > 2);
      subtitle(t, keys);
      $('wm').style.opacity = 0.75 * ramp(t, 0.5, 1.5) * (1 - ramp(t, total - 1.1, total - 0.3));
      $('blk').style.opacity = Math.max(1 - ramp(t, 0, 0.45), ramp(t, total - 0.6, total - 0.02));
      await new Promise(resolve => requestAnimationFrame(resolve));
    };
    window.render(0).then(() => { window.__ready = true; });
  };
})();

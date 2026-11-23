/* Horor Studio - engine animasi siluet.
 * render(t) adalah fungsi murni: input waktu -> tampilan. Semua acak memakai seed tetap,
 * jadi rencana (PLAN) yang sama selalu menghasilkan video yang sama persis.
 */
(function () {
  const ART_W = 1080, ART_H = 1400;
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = x => x * x * (3 - 2 * x);
  const ramp = (t, a, b) => ease(cl((t - a) / (b - a)));
  const lerp = (a, b, k) => a + (b - a) * k;
  const nz = (t, s) => 0.5 + 0.25 * Math.sin(t * s * 1.7) + 0.15 * Math.sin(t * s * 3.1 + 1.3) + 0.1 * Math.sin(t * s * 5.3 + 2.1);
  const pulse = (t, t0, d) => t < t0 ? 0 : Math.max(0, Math.sin(Math.PI * cl((t - t0) / d)));
  function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const E = {}; const $ = id => E[id] || (E[id] = document.getElementById(id));
  const att = (id, k, v) => { const e = $(id); if (e) e.setAttribute(k, v); };

  let DEFS = '';
  const H = {};
  H.cl = cl; H.ease = ease; H.ramp = ramp; H.lerp = lerp; H.nz = nz; H.pulse = pulse; H.rng = rng; H.$ = $; H.att = att;
  H.lg = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => { DEFS += `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`; };
  H.rg = (id, c, a = 1) => { DEFS += `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${a}"/><stop offset="0.35" stop-color="${c}" stop-opacity="${a * 0.45}"/><stop offset="0.7" stop-color="${c}" stop-opacity="${a * 0.12}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`; };
  H.rawDef = s => { DEFS += s; };

  /* ---------- gradien global ---------- */
  H.rg('gWarm', '#ffb25c', 0.85); H.rg('gWarm2', '#ffd08a', 0.7); H.rg('gCold', '#7f9fd0', 0.5); H.rg('gMoon', '#aabbd8', 0.55);
  H.rg('gHalo', '#ffcf8a', 0.6); H.rg('gHaloC', '#9fb8e8', 0.55); H.rg('gRed', '#d0402a', 0.6);
  H.rg('gFogC', '#7d8fb0', 0.45); H.rg('gFogW', '#b08a6a', 0.35); H.rg('gFogG', '#a9b0b0', 0.5); H.rg('gFogR', '#8a4a3a', 0.4);
  H.rg('gPale', '#e8e2cc', 0.5);
  H.lg('winG', [[0, '#ffd28a'], [1, '#f0902f']]);
  for (const [c, col] of [['C', '#7d8fb0'], ['W', '#b08a6a'], ['G', '#a9b0b0'], ['R', '#8a4a3a']]) H.lg('mist' + c, [[0, col, 0], [0.5, col, 0.35], [1, col, 0]]);

  /* ---------- helper hitungan & langit (bentuk lain ada di engine/lib/*.js) ---------- */
  H.rings = function (pre, cx, cy, n) { let s = ''; for (let i = 0; i < n; i++) s += `<circle id="${pre}${i}" cx="${cx}" cy="${cy}" r="10" fill="none" stroke="#ffb25c" stroke-width="7" opacity="0"/>`; return s; };
  H.ringsUpd = function (pre, n, t, times, dur, maxR) {
    for (let i = 0; i < n; i++) {
      const tt = times[i]; const e = $(pre + i); if (!e) continue;
      const k = tt === undefined ? -1 : (t - tt) / dur;
      if (k < 0 || k > 1) { e.setAttribute('opacity', 0); continue; }
      e.setAttribute('r', 20 + maxR * ramp(k, 0, 1)); e.setAttribute('opacity', 0.75 * (1 - k)); e.setAttribute('stroke-width', 8 * (1 - k) + 1);
    }
  };
  // titik hitungan: n slot + 1 slot "lebih" (merah)
  H.dots = function (pre, cx, cy, n, gap) {
    let s = ''; const m = n + 1;
    for (let i = 0; i < m; i++) {
      const x = cx + (i - (m - 1) / 2) * gap; const extra = i === n;
      s += `<g id="${pre}w${i}" opacity="${extra ? 0 : 1}"><circle cx="${x}" cy="${cy}" r="15" fill="#2a1a10" stroke="${extra ? '#6a2a20' : '#5a4028'}" stroke-width="2"/></g>`;
      s += `<circle id="${pre}${i}" cx="${x}" cy="${cy}" r="13" fill="${extra ? '#e0503a' : '#ffb25c'}" opacity="0"/><ellipse id="${pre}${i}g" cx="${x}" cy="${cy}" rx="46" ry="46" fill="url(#${extra ? 'gRed' : 'gWarm'})" opacity="0"/>`;
    }
    return s;
  };
  H.dotsUpd = function (pre, n, t, times) {
    for (let i = 0; i <= n; i++) {
      const tt = times[i]; const v = tt === undefined ? 0 : ramp(t, tt, tt + 0.12) * (0.85 + 0.15 * nz(t + i, 9));
      att(pre + i, 'opacity', v); att(pre + i + 'g', 'opacity', v * 0.9);
      if (i === n) att(pre + 'w' + i, 'opacity', v);
    }
  };
  // langit: waktu = malam | senja | subuh
  H.sky = function (c, waktu, moon) {
    const id = c.id('sky');
    if (waktu === 'senja') H.lg(id, [[0, '#120708'], [0.5, '#3a1410'], [0.8, '#7a2e16'], [1, '#a5481c']]);
    else if (waktu === 'subuh') H.lg(id, [[0, '#1d2530'], [0.6, '#68737c'], [0.8, '#a3abae'], [1, '#58605f']]);
    else H.lg(id, [[0, '#04060d'], [0.5, '#0d1629'], [0.78, '#262a3d'], [1, '#3d3036']]);
    let s = `<rect width="1080" height="1400" fill="url(#${id})"/>`;
    if (waktu !== 'subuh') { const R = rng(c.seed); for (let i = 0; i < 40; i++) s += `<circle cx="${R() * 1080}" cy="${R() * 620}" r="${0.8 + R() * 1.5}" fill="#cfdcff" opacity="${(waktu === 'senja' ? 0.12 : 0.25) + R() * 0.45}"/>`; }
    if (moon) {
      const [mx, my, mr] = moon;
      if (waktu === 'senja') s += `<ellipse cx="${mx}" cy="${my}" rx="${mr * 5}" ry="${mr * 5}" fill="url(#gRed)"/><circle cx="${mx}" cy="${my}" r="${mr}" fill="#e2603a"/>`;
      else if (waktu !== 'subuh') s += `<ellipse cx="${mx}" cy="${my}" rx="${mr * 4.6}" ry="${mr * 4.6}" fill="url(#gMoon)"/><circle cx="${mx}" cy="${my}" r="${mr}" fill="#dbe4f2"/><circle cx="${mx - mr * 0.3}" cy="${my - mr * 0.27}" r="${mr * 0.19}" fill="#c4cfe0" opacity=".6"/><circle cx="${mx + mr * 0.3}" cy="${my + mr * 0.3}" r="${mr * 0.12}" fill="#c4cfe0" opacity=".5"/>`;
    }
    return s;
  };
  H.fogCol = waktu => waktu === 'subuh' ? 'G' : waktu === 'senja' ? 'R' : 'C';
  H.inkFar = waktu => waktu === 'subuh' ? '#2a3238' : waktu === 'senja' ? '#1a0c0a' : '#0a111c';

  /* ---------- registrasi template ---------- */
  const T = {};
  const ENG = { H, T, def(name, d) { T[name] = d; }, DEFS: () => DEFS };
  window.ENG = ENG;

  ENG.boot = function (PLAN) {
    const art = $('art');
    const film = PLAN.cinematic;
    // Layar penuh 9:16: dunia adegan 1080x1400 di-"slice" ke tinggi #art (1920) -> tidak ada pita hitam kosong,
    // objek ~37% lebih besar. Style dengan #art 1400 (mis. tutorial) tetap seperti semula.
    const AH = art.offsetHeight || ART_H, FULL = AH > ART_H, HALFW = FULL ? 540 * ART_H / AH : 540;
    const events = (PLAN.events || []).slice().sort((a, b) => a.t - b.t);
    const knockEv = events.filter(e => e.type === 'ketuk').map(e => e.t);
    const clusters = []; knockEv.forEach(t => { const c = clusters[clusters.length - 1]; if (c && t - c[c.length - 1] < 12) c.push(t); else clusters.push([t]); });
    const scenes = [];
    PLAN.scenes.forEach((sc, i) => {
      const d = T[sc.template] || T['kampung_malam'];
      const p = Object.assign({}, d.defaults || {}, sc.params || {});
      const pre = 's' + i + '_';
      const c = {
        i, pre, t0: sc.start, t1: sc.end, dur: sc.end - sc.start, p, seed: sc.seed ?? (1000 + i * 97 + (PLAN.seed || 0)),
        id: n => pre + n, el: n => $(pre + n), k: t => cl((t - sc.start) / (sc.end - sc.start)), at: f => sc.start + f * (sc.end - sc.start),
        synth: events.filter(e => e.scene === i).map(e => e.t),
        knocks: (() => { // ketukan "ketuk" dalam klaster yang menyentuh adegan ini
          for (const cs of clusters) { if (cs[cs.length - 1] >= sc.start - 12 && cs[0] <= sc.end) { if (cs.some(x => x >= sc.start - 0.3 && x <= sc.end) || (cs[cs.length - 1] < sc.start && sc.start - cs[cs.length - 1] < 12)) return cs; } }
          return [];
        })(),
      };
      c.R = rng(c.seed);
      const inner = d.build(c, p);
      const div = document.createElement('div'); div.className = 'sc'; div.id = 'sc_' + i;
      div.innerHTML = `<svg width="1080" height="${AH}" viewBox="0 0 1080 1400" preserveAspectRatio="xMidYMid slice"><g id="cam_${i}">${inner}</g></svg>`;
      art.appendChild(div);
      const foc = (p.fokus && d.points && d.points[p.fokus]) || d.focus || [540, 760];
      const cam = sc.camera || {}; const g = cam.gerak || d.cam || 'maju';
      let keys;
      if (d.camKeys) keys = d.camKeys(c, p, foc, g);
      if (!keys) {
        const a = sc.start, b = sc.end, [fx, fy] = foc;
        if (g === 'mundur') keys = [[a, fx, fy, 1.32], [b, fx, fy, 1.0]];
        else if (g === 'geser_kiri') keys = [[a, fx + 150, fy, 1.25], [b, fx - 150, fy, 1.28]];
        else if (g === 'geser_kanan') keys = [[a, fx - 150, fy, 1.25], [b, fx + 150, fy, 1.28]];
        else if (g === 'diam') keys = [[a, fx, fy, 1.06], [b, fx + 12, fy - 6, 1.1]];
        else if (g === 'naik') keys = [[a, fx, fy + 160, 1.2], [b, fx, fy - 120, 1.25]];
        else keys = [[a, fx, fy + 40, 1.0], [b, fx, fy, 1.32]];
      }
      if (FULL) keys = keys.map(([kt, kx, ky, kz]) => [kt, kx, ky, 1 + (kz - 1) * 0.55]);  // sudah diperbesar oleh slice: redam zoom
      if (sc.lens) keys = sc.lensKeys || [[sc.start, ...sc.lens[0]], [sc.end, ...sc.lens[1]]];
      scenes.push({ sc, d, c, p, keys, dust: d.dust || [255, 220, 170] });
    });
    $('defs').innerHTML = `<defs>${DEFS}</defs>`;
    const cues = PLAN.cues || [];
    const shakeEv = events.filter(e => ['ketuk', 'ketuk_pintu', 'brak'].includes(e.type));
    const total = PLAN.duration;
    const roleCol = Object.assign({ narasi: '#f3ead9', dialog: '#eaa45c', seram: '#e07a6a' }, (PLAN.style && PLAN.style.warna_subtitle) || {});
    // color grading global: latar lebih terang & jelas, siluet tetap hitam (brightness mengalikan, hitam tetap hitam)
    const GR = Object.assign({ brightness: 1, contrast: 1, saturate: 1, vignette: 1, handheld: 0 }, (PLAN.style && PLAN.style.grade) || {});  // netral; tiap style mengatur 'grade' sendiri
    $('art').style.filter = `brightness(${GR.brightness}) contrast(${GR.contrast}) saturate(${GR.saturate})`;
    $('vig').style.opacity = GR.vignette;
    if (film) {
      $('grain').style.opacity = '.045';
      $('dust').style.opacity = '0';
    }
    const hiCol = Object.assign({ narasi: '#ffd166', dialog: '#ffc078', seram: '#ff4a3a' }, (PLAN.style && PLAN.style.warna_aktif) || {});
    const seramT = cues.filter(c => c.role === 'seram').map(c => c.start);
    // subtitle karaoke: tiap kata punya waktu mulai (dari Whisper bila ada, selain itu proporsional panjang kata)
    // maks kata per layar (style.subtitle_kata); 0 = satu cue utuh
    const MAXW = +((PLAN.style && PLAN.style.subtitle_kata) || 0);
    function wordTimes(cue) {
      const words = cue.text.split(/\s+/).filter(Boolean);
      let times = cue.wt && cue.wt.length === words.length ? cue.wt : null;
      if (!times) {
        const e = cue.pe || cue.end, tot = words.reduce((n, w) => n + w.length + 1, 0); let acc = 0;
        times = words.map(w => { const tt = cue.start + (e - cue.start) * acc / tot; acc += w.length + 1; return tt; });
      }
      return { words, times };
    }
    // potong cue jadi kelompok <= MAXW kata: utamakan putus setelah tanda baca, hindari sisa satu kata
    function chunks(cue) {
      if (cue.__ch) return cue.__ch;
      const { words, times } = wordTimes(cue), out = [];
      if (!MAXW || words.length <= MAXW) out.push([0, words.length]);
      else {
        let i = 0;
        while (i < words.length) {
          const left = words.length - i;
          if (left <= MAXW) { out.push([i, words.length]); break; }
          let n = left === MAXW + 1 ? Math.ceil(left / 2) : MAXW;
          for (let k = n; k >= 2; k--) if (/[.,!?;:…]$/.test(words[i + k - 1])) { n = k; break; }
          if (left - n === 1) n -= 1;
          out.push([i, i + n]); i += n;
        }
      }
      cue.__ch = out.map(([a, b]) => ({ a, b, t: a ? times[a] : cue.start, words: words.slice(a, b), times: times.slice(a, b) }));
      return cue.__ch;
    }
    function chunkAt(cue, t) { const ch = chunks(cue); let k = 0; ch.forEach((c, j) => { if (t >= c.t) k = j; }); return k; }
    function buildSub(sub, cue, k) {
      const c = chunks(cue)[k];
      sub.textContent = '';
      cue.__w = c.words.map((w, j) => {
        const sp = document.createElement('span'); sp.textContent = w; sp.style.display = 'inline-block';
        if (j) sub.appendChild(document.createTextNode(' '));
        sub.appendChild(sp); return { el: sp, t: c.times[j] };
      });
    }
    $('title').textContent = PLAN.title_bar || '';
    $('wm').textContent = PLAN.watermark || '';

    // debu & grain
    (function () { const cv = $('grain'), x = cv.getContext('2d'), im = x.createImageData(256, 256); const R = rng(77); for (let i = 0; i < im.data.length; i += 4) { const v = R() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); })();
    const dctx = $('dust').getContext('2d');
    const DR = rng(33), DP = []; for (let i = 0; i < 70; i++) DP.push({ x: DR() * 1080, y: DR() * 1400, vx: (DR() - 0.5) * 14, vy: -4 - DR() * 10, r: 1 + DR() * 2.4, ph: DR() * 6.28, a: 0.2 + DR() * 0.5 });

    function camAt(keys, t) {
      if (t <= keys[0][0]) return keys[0].slice(1);
      for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const k = ease(cl((t - a[0]) / Math.max(0.001, b[0] - a[0]))); return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)]; } }
      return keys[keys.length - 1].slice(1);
    }

    window.render = async function (t) {
      let best = null, bestA = -1; const f = (PLAN.style && PLAN.style.crossfade) || 0.16;
      scenes.forEach((S, i) => {
        const { sc } = S;
        let a = cl(Math.min((t - (sc.start - f)) / f, ((sc.end + f) - t) / f));
        if (film) {
          // Incoming artwork fades over a fully opaque outgoing shot.
          const fade = sc.dissolve || 0;
          const hold = scenes[i + 1]?.sc.dissolve || 0;
          a = t < sc.start || (i < scenes.length - 1 && t >= sc.end + hold)
            ? 0 : fade ? cl((t - sc.start) / fade) : 1;
        } else {
          if (i === 0 && t < sc.end) a = 1;
          if (i === scenes.length - 1 && t > sc.start) a = 1;
        }
        const el = $('sc_' + i);
        if (a <= 0.001) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
        el.style.display = 'block'; el.style.opacity = ease(a);
        let [cx, cy, z] = camAt(S.keys, t);
        S.d.upd && S.d.upd(S.c, t, S.p);
        // framing per shot; pergantian shot di dalam adegan = gerak kamera 0,45 dtk (bukan lompatan)
        const frameOf = (shot, cx, cy, z) => {
          if (S.c.lockCam) return [cx, cy, z];  // adegan berbingkai tetap (mis. close-up kaki): shot tidak menggeser kamera
          const view = shot?.view;
          if (view === 'detail') { z *= 1.22; }
          if (view === 'samping') { cx += 78; z *= 1.12; }
          if (shot?.targets?.length) {
            // Bounds are in the camera group's local coordinate system, independent of seek order.
            const camera = $('cam_' + i);
            // Target yang belum muncul tetap dibingkai supaya kamera tidak melompat saat benda tampil.
            const centers = shot.targets.map(target => S.c.el(target.element)).filter(el => el).map(el => {
              const box = el.getBBox();
              const point = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
              return point.matrixTransform(camera.getCTM().inverse().multiply(el.getCTM()));
            });
            if (centers.length) {
              const first = centers[0], last = centers[centers.length-1];
              const k = ramp(t, shot.start + .25*(shot.end-shot.start), shot.start + .75*(shot.end-shot.start));
              cx = lerp(first.x, last.x, k); cy = lerp(first.y, last.y, k);
              z = Math.max(z, 1.65);
            }
          }
          if (view === 'luas') { z *= .85; cx = lerp(cx, 540, .45); }
          if (shot?.targets?.length && S.c.act?.length) {
            // Keep the reacting characters in frame as attention moves to a prop.
            const camera = $('cam_' + i);
            const inverse = camera.getCTM().inverse();
            let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
            S.c.act.forEach((_, j) => {
              const actor = S.c.el('a'+j);
              if (!actor || actor.getAttribute('opacity') === '0') return;
              const box = actor.getBBox(), matrix = inverse.multiply(actor.getCTM());
              for (const x of [box.x, box.x+box.width]) for (const y of [box.y, box.y+box.height]) {
                const point = new DOMPoint(x,y).matrixTransform(matrix);
                left = Math.min(left,point.x); right = Math.max(right,point.x);
                top = Math.min(top,point.y); bottom = Math.max(bottom,point.y);
              }
            });
            if (right > left && bottom > top) {
              z = Math.max(1, Math.min(z, 2*HALFW/(right-left+64), 1400/(bottom-top+140)));
              cx = cl(cx, right+32-HALFW/z, left-32+HALFW/z);
              cy = cl(cy, bottom+85-700/z, top-55+700/z);
            }
          }
          return [cx, cy, z];
        };
        const shots = sc.shots || [], si = shots.findIndex(x => t < x.end), shot = shots[si];
        if (!sc.lens) [cx, cy, z] = frameOf(shot, cx, cy, z);
        if (!sc.lens && si > 0 && t < shot.start + 0.45) {
          const base = camAt(S.keys, t), q = frameOf(shots[si - 1], base[0], base[1], base[2]), k = ease(cl((t - shot.start) / 0.45));
          cx = lerp(q[0], cx, k); cy = lerp(q[1], cy, k); z = lerp(q[2], z, k);
        }
        z = Math.max(1, z); cx = cl(cx, HALFW / z, 1080 - HALFW / z); cy = cl(cy, 700 / z, 1400 - 700 / z);
        $('cam_' + i).setAttribute('transform', `translate(540,700) scale(${z}) translate(${-cx},${-cy})`);
        if (a >= bestA) { bestA = a; best = S; }
      });
      const col = best ? best.dust : [255, 220, 170];
      dctx.clearRect(0, 0, 1080, AH);
      for (const p of film ? [] : DP) {
        const x = ((p.x + p.vx * t) % 1080 + 1080) % 1080, y = ((p.y * AH / 1400 + p.vy * t) % AH + AH) % AH; const a = p.a * (0.5 + 0.5 * Math.sin(t * 0.8 + p.ph));
        dctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a.toFixed(3)})`; dctx.beginPath(); dctx.arc(x, y, p.r, 0, 6.283); dctx.fill();
      }
      let fl = 0, sh = 0;
      shakeEv.forEach(e => { const tt = e.t; if (t >= tt && t < tt + 0.5) { const k = (t - tt) / 0.5; const amp = e.type === 'ketuk_pintu' ? 0.4 : 1; fl = Math.max(fl, 0.16 * amp * (1 - k)); sh += Math.sin((t - tt) * 70) * 9 * amp * (1 - k); } });
      let punch = 0; for (const st of seramT) punch = Math.max(punch, pulse(t, st, 0.7));  // hentakan kalimat seram
      if (film) fl = sh = punch = 0;
      const red = punch * 0.13 > fl;
      $('flash').style.background = red ? '#ff2a14' : '#cfe0ff';
      $('flash').style.opacity = red ? punch * 0.13 : fl;
      const hx = (nz(t, 0.55) - 0.5) * 7 * GR.handheld, hy = (nz(t + 17, 0.47) - 0.5) * 6 * GR.handheld;  // kamera handheld halus
      $('art').style.transform = `translate(${(sh + hx).toFixed(2)}px,${(sh * 0.5 + hy).toFixed(2)}px) scale(${(1.012 + 0.05 * punch).toFixed(4)})`;
      const sub = $('sub'); let cue = null; for (const c of cues) { if (t >= c.start && t <= c.end) { cue = c; break; } }
      if (cue) {
        const a = Math.min(ramp(t, cue.start, cue.start + 0.18), 1 - ramp(t, cue.end - 0.2, cue.end));
        const ck = chunkAt(cue, t), cs = chunks(cue)[ck];
        if (sub.__cue !== cue || sub.__ck !== ck) { sub.__cue = cue; sub.__ck = ck; buildSub(sub, cue, ck); }
        const base = roleCol[cue.role] || roleCol.narasi, hi = hiCol[cue.role] || hiCol.narasi;
        let act = -1; cue.__w.forEach((w, j) => { if (t >= w.t) act = j; });
        cue.__w.forEach((w, j) => {
          const on = !film && j === act;
          w.el.style.color = on ? hi : base;
          w.el.style.opacity = film || j <= act ? 1 : 0.6;
          w.el.style.transform = on ? `translateY(${(-4 - 5 * (1 - ramp(t, w.t, w.t + 0.22))).toFixed(1)}px)` : 'none';  // naik, bukan membesar: spasi tetap utuh
          w.el.style.textShadow = on ? `0 0 18px ${hi}88, 0 2px 14px rgba(0,0,0,.9)` : '';
        });
        sub.style.color = base; sub.style.opacity = a;
        sub.style.transform = film ? 'none' : `scale(${(0.93 + 0.07 * ramp(t, cs.t, cs.t + 0.16)).toFixed(3)})${cue.role === 'seram' ? ` translateX(${(Math.sin(t * 60) * 3 * pulse(t, cue.start, 0.5)).toFixed(2)}px)` : ''}`;
        sub.style.fontSize = cue.big ? '76px' : MAXW ? '64px' : (cue.text.length > 70 ? '48px' : '54px');
      } else sub.style.opacity = 0;
      if (!film) {
        const g = Math.floor(t * 24); $('grain').style.transform = `translate(${(g * 53) % 200}px,${(g * 91) % 200}px)`;
      }
      $('title').style.opacity = ramp(t, 0.3, 1.3) * (1 - ramp(t, total - 1.1, total - 0.3));
      $('wm').style.opacity = 0.5 * ramp(t, 0.5, 1.5) * (1 - ramp(t, total - 1.1, total - 0.3));
      $('blk').style.opacity = Math.max(1 - ramp(t, 0, 0.7), ramp(t, total - 1.0, total - 0.05));
      await new Promise(resolve => requestAnimationFrame(resolve));
    };
    window.render(0);
    window.__ready = true;
  };
})();

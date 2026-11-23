/* Pustaka elemen lingkungan (siluet dua tingkat warna). Semua fungsi mengembalikan markup SVG.
 * Konvensi: (x,y) = titik dasar di tanah, k = skala, ink = warna gelap, ink2 = warna sedikit terang untuk kedalaman.
 */
(function () {
  const { H } = ENG; const { rng } = H;
  const lift = (c, amt) => { // terangkan warna hex sedikit
    const n = parseInt(c.slice(1), 16); const r = Math.min(255, (n >> 16) + amt), g = Math.min(255, ((n >> 8) & 255) + amt), b = Math.min(255, (n & 255) + amt);
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  };
  H.lift = lift;

  /* ---------- pohon kelapa: batang melengkung bersegmen, pelepah bergerigi ---------- */
  H.palm = function (x, y, h, ink, lean = 0, seed = 1) {
    const R = rng(seed + (x | 0)), ink2 = lift(ink, 10);
    const tx = x + lean, ty = y - h, cx = x + lean * 0.25, cy = y - h * 0.55;
    const q = t => [(1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * tx, (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ty];
    let s = `<path d="M${x - 11} ${y} Q${cx - 9} ${cy} ${tx - 4} ${ty} L${tx + 4} ${ty} Q${cx + 9} ${cy} ${x + 11} ${y}Z" fill="${ink}"/>`;
    for (let i = 1; i < 12; i++) { const [px, py] = q(i / 12); const w = 10 - i * 0.5; s += `<path d="M${px - w} ${py} Q${px} ${py + 4} ${px + w} ${py}" stroke="${ink2}" stroke-width="2" fill="none" opacity=".7"/>`; }
    s += `<ellipse cx="${tx}" cy="${ty + 6}" rx="14" ry="9" fill="${ink}"/>`;
    for (let i = 0; i < 9; i++) { const c = R(); s += `<circle cx="${tx + (c - 0.5) * 22}" cy="${ty + 10 + R() * 8}" r="${4 + R() * 3}" fill="${ink}"/>`; }
    const L = h * 0.44, angs = [-200, -170, -142, -116, -90, -64, -38, -12, 12];
    angs.forEach((a, i) => {
      const r = a * Math.PI / 180, len = L * (0.8 + R() * 0.35), droop = 0.55 + R() * 0.3;
      const ex = tx + Math.cos(r) * len, ey = ty + Math.sin(r) * len * 0.4 + len * droop;
      const c1x = tx + Math.cos(r) * len * 0.55, c1y = ty + Math.sin(r) * len * 0.6 - len * 0.12;
      let d = `M${tx} ${ty}`; const pts = [];
      for (let t = 0; t <= 1.0001; t += 1 / 9) { const bx = (1 - t) * (1 - t) * tx + 2 * (1 - t) * t * c1x + t * t * ex, by = (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * c1y + t * t * ey; pts.push([bx, by]); }
      const w = i => 11 * Math.sin(Math.PI * Math.min(1, i / 9 + 0.1));
      let up = '', dn = '';
      pts.forEach(([px, py], j) => { const wj = w(j), zig = j % 2 ? 1 : 0.45; up += ` L${(px).toFixed(1)} ${(py - wj * zig).toFixed(1)}`; dn = ` L${(px).toFixed(1)} ${(py + wj * zig).toFixed(1)}` + dn; });
      s += `<path d="${d}${up}${dn}Z" fill="${ink}"/>`;
    });
    return s;
  };

  /* ---------- pohon pisang ---------- */
  H.banana = function (x, y, h, ink, seed = 2) {
    const R = rng(seed + (x | 0)); let s = `<path d="M${x - 9} ${y} L${x - 6} ${y - h * 0.55} L${x + 6} ${y - h * 0.55} L${x + 9} ${y}Z" fill="${ink}"/>`;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = -150 + i * (120 / (n - 1)) + (R() - 0.5) * 14, r = a * Math.PI / 180, len = h * (0.5 + R() * 0.25), tx = x, ty = y - h * 0.55;
      const ex = tx + Math.cos(r) * len, ey = ty + Math.sin(r) * len * 0.5 + len * 0.35, mx = (tx + ex) / 2 + Math.cos(r) * 10, my = (ty + ey) / 2 - len * 0.22;
      const nx = -(ey - ty), ny = ex - tx, nl = Math.hypot(nx, ny) || 1, w = h * 0.09;
      s += `<path d="M${tx} ${ty} Q${mx + nx / nl * w} ${my + ny / nl * w} ${ex} ${ey} Q${mx - nx / nl * w} ${my - ny / nl * w} ${tx} ${ty}Z" fill="${ink}"/>`;
      if (i % 2) s += `<path d="M${(tx + ex) / 2} ${(ty + ey) / 2 - 6} l${nx / nl * w * 0.9} ${ny / nl * w * 0.9}" stroke="${lift(ink, 14)}" stroke-width="1.5"/>`;
    }
    return s;
  };

  /* ---------- rumpun bambu ---------- */
  H.bamboo = function (x, y, h, ink, seed = 3) {
    const R = rng(seed + (x | 0)); let s = '';
    for (let i = 0; i < 5; i++) {
      const bx = x + (i - 2) * 11 + (R() - 0.5) * 6, lean = (R() - 0.5) * 60, hh = h * (0.75 + R() * 0.35);
      s += `<path d="M${bx - 4} ${y} Q${bx + lean * 0.3 - 4} ${y - hh * 0.6} ${bx + lean - 2} ${y - hh} L${bx + lean + 2} ${y - hh} Q${bx + lean * 0.3 + 4} ${y - hh * 0.6} ${bx + 4} ${y}Z" fill="${ink}"/>`;
      for (let k = 1; k < 7; k++) { const t = k / 7; const px = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * (bx + lean * 0.3) + t * t * (bx + lean), py = y - hh * t; s += `<rect x="${px - 5}" y="${py - 1.5}" width="10" height="3" fill="${lift(ink, 16)}"/>`; }
      for (let k = 0; k < 7; k++) { const t = 0.55 + R() * 0.45; const px = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * (bx + lean * 0.3) + t * t * (bx + lean), py = y - hh * t; const a = (R() - 0.5) * 2.4; s += `<path d="M${px} ${py} q${Math.cos(a) * 20} ${Math.sin(a) * 10 - 10} ${Math.cos(a) * 44} ${Math.sin(a) * 16} q${-Math.cos(a) * 24} ${4} ${-Math.cos(a) * 44} ${-Math.sin(a) * 16 + 2}Z" fill="${ink}"/>`; }
    }
    return s;
  };

  /* ---------- pohon besar (beringin/randu): akar papan, cabang rekursif, tajuk ---------- */
  H.tree = function (x, y, h, w, ink, seed = 4, opts = {}) {
    const R = rng(seed + (x | 0)); let s = '';
    const ink2 = lift(ink, 8);
    s += `<path d="M${x - w * 0.9} ${y} Q${x - w * 0.45} ${y - h * 0.08} ${x - w * 0.3} ${y - h * 0.3} L${x - w * 0.24} ${y - h * 0.62} Q${x} ${y - h * 0.66} ${x + w * 0.24} ${y - h * 0.62} L${x + w * 0.3} ${y - h * 0.3} Q${x + w * 0.45} ${y - h * 0.08} ${x + w * 0.9} ${y}Z" fill="${ink}"/>`;
    s += `<path d="M${x - w * 0.1} ${y} Q${x - w * 0.12} ${y - h * 0.3} ${x - w * 0.06} ${y - h * 0.55}" stroke="${ink2}" stroke-width="${w * 0.05}" fill="none" opacity=".6"/>`;
    const branch = (bx, by, ang, len, wd, depth) => {
      const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
      const mx = (bx + ex) / 2 + Math.cos(ang + 1.57) * len * 0.12 * (R() - 0.5), my = (by + ey) / 2 - len * 0.1;
      s += `<path d="M${bx} ${by} Q${mx} ${my} ${ex} ${ey}" stroke="${ink}" stroke-width="${wd}" fill="none" stroke-linecap="round"/>`;
      if (depth > 0) { const n = 2 + (R() > 0.5 ? 1 : 0); for (let i = 0; i < n; i++) branch(ex, ey, ang + (R() - 0.5) * 1.4, len * (0.55 + R() * 0.25), wd * 0.6, depth - 1); }
      else if (opts.daun !== false) { for (let i = 0; i < 3; i++) s += `<ellipse cx="${ex + (R() - 0.5) * 60}" cy="${ey + (R() - 0.5) * 40}" rx="${26 + R() * 30}" ry="${16 + R() * 18}" fill="${ink}"/>`; }
      if (opts.akar_gantung && depth === 1 && R() > 0.5) { const n = 2 + Math.floor(R() * 3); for (let i = 0; i < n; i++) { const vx = ex + (R() - 0.5) * 40; s += `<path d="M${vx} ${ey} q${(R() - 0.5) * 30} ${len * 0.8} ${(R() - 0.5) * 20} ${len * 1.6}" stroke="${ink}" stroke-width="${2 + R() * 2}" fill="none"/>`; } }
    };
    const top = y - h * 0.62;
    branch(x - w * 0.1, top, -2.0 - R() * 0.5, h * 0.3, w * 0.22, 3);
    branch(x + w * 0.1, top, -1.1 + R() * 0.5, h * 0.3, w * 0.22, 3);
    branch(x, top, -1.57 + (R() - 0.5) * 0.4, h * 0.34, w * 0.2, 3);
    return s;
  };

  /* ---------- rumah panggung kampung ---------- */
  // id jendela: pre+'g'+i (cahaya), pre+'r'+i (kaca), pre+'b'+i (penghuni). o: {ink, pre, n, kinds, busts, teras, dapur}
  H.house = function (x, y, w, o) {
    const ink = o.ink, ink2 = lift(ink, 9), pre = o.pre, n = o.n || 3;
    const st = w * 0.3, wh = w * 0.46, rh = w * 0.3, wx = x - w / 2, fy = y - st, ry = fy - wh;
    let s = '';
    // tiang + palang silang
    for (let i = 0; i < 5; i++) s += `<rect x="${wx + 8 + i * (w - 26) / 4}" y="${fy}" width="${Math.max(7, w * 0.03)}" height="${st}" fill="${ink}"/>`;
    s += `<path d="M${wx + 12} ${fy + st * 0.25} L${wx + w - 12} ${fy + st * 0.75} M${wx + 12} ${fy + st * 0.75} L${wx + w - 12} ${fy + st * 0.25}" stroke="${ink}" stroke-width="3" opacity=".7"/>`;
    s += `<rect x="${wx - 8}" y="${fy - 9}" width="${w + 16}" height="12" fill="${ink}"/>`;
    // teras + pagar kecil di depan
    if (o.teras !== false) {
      s += `<rect x="${wx + w - 6}" y="${fy - 9}" width="${w * 0.22}" height="10" fill="${ink}"/>`;
      s += `<rect x="${wx + w + w * 0.22 - 10}" y="${fy - 9}" width="6" height="${st}" fill="${ink}"/>`;
      for (let i = 0; i < 4; i++) s += `<rect x="${wx + w + i * w * 0.07}" y="${fy - wh * 0.35}" width="3" height="${wh * 0.27}" fill="${ink}"/>`;
      s += `<rect x="${wx + w - 6}" y="${fy - wh * 0.36}" width="${w * 0.24}" height="4" fill="${ink}"/>`;
      // tangga
      for (let i = 0; i < 5; i++) { const t = i / 5; s += `<rect x="${wx + w + w * 0.2 + t * st * 0.7}" y="${fy + t * st}" width="${w * 0.05}" height="4" fill="${ink}"/>`; }
      s += `<path d="M${wx + w + w * 0.2 - 3} ${fy - 2} L${wx + w + w * 0.2 + st * 0.7 + 6} ${y}" stroke="${ink}" stroke-width="4"/>`;
    }
    // dinding papan
    s += `<rect x="${wx}" y="${ry}" width="${w}" height="${wh}" fill="${ink}"/>`;
    for (let i = 1; i < 7; i++) s += `<rect x="${wx}" y="${ry + i * wh / 7}" width="${w}" height="1.5" fill="${ink2}" opacity=".55"/>`;
    // atap pelana + overhang + bubungan
    s += `<path d="M${wx - w * 0.14} ${ry + 10} L${wx + w * 0.12} ${ry - rh} L${wx + w * 0.88} ${ry - rh} L${wx + w * 1.14} ${ry + 10}Z" fill="${ink}"/>`;
    s += `<rect x="${wx + w * 0.1}" y="${ry - rh - 6}" width="${w * 0.8}" height="7" rx="3" fill="${ink}"/>`;
    s += `<path d="M${wx - w * 0.14} ${ry + 10} L${wx + w * 0.12} ${ry - rh}" stroke="${ink2}" stroke-width="2"/><path d="M${wx + w * 0.88} ${ry - rh} L${wx + w * 1.14} ${ry + 10}" stroke="${ink2}" stroke-width="2"/>`;
    for (let i = 1; i < 5; i++) { const t = i / 5; s += `<line x1="${wx - w * 0.14 + (w * 0.26) * t}" y1="${ry + 10 - (rh + 10) * t}" x2="${wx + w * 1.14 - (w * 0.26) * t}" y2="${ry + 10 - (rh + 10) * t}" stroke="${ink2}" stroke-width="1.2" opacity=".5"/>`; }
    // dapur/annex kecil di belakang kiri
    if (o.dapur) s += `<rect x="${wx - w * 0.3}" y="${ry + wh * 0.25}" width="${w * 0.32}" height="${wh * 0.75}" fill="${ink}"/><path d="M${wx - w * 0.36} ${ry + wh * 0.27} L${wx - w * 0.14} ${ry + wh * 0.02} L${wx + 4} ${ry + wh * 0.27}Z" fill="${ink}"/>`;
    // jendela: kusen, daun jendela terbuka, cahaya
    const ww = Math.min(w * 0.14, w / (n + 1) * 0.6), wh2 = wh * 0.44;
    const kinds = o.kinds || ['m', 'w', 'c', 'm', 'w'];
    for (let i = 0; i < n; i++) {
      const cx = wx + w * (i + 1) / (n + 1), cy = ry + wh * 0.5;
      s += `<ellipse id="${pre}g${i}" cx="${cx}" cy="${cy}" rx="${ww * 2.4}" ry="${wh2 * 1.6}" fill="url(#gWarm)" opacity="0"/>`;
      s += `<g id="${pre}r${i}" opacity="0"><rect x="${cx - ww / 2}" y="${cy - wh2 / 2}" width="${ww}" height="${wh2}" fill="url(#winG)"/><path d="M${cx - ww / 2} ${cy - wh2 / 2} L${cx - ww * 0.12} ${cy - wh2 / 2} Q${cx - ww * 0.2} ${cy} ${cx - ww * 0.3} ${cy + wh2 / 2} L${cx - ww / 2} ${cy + wh2 / 2}Z" fill="#8a4a1c" opacity=".55"/><path d="M${cx - ww * 0.42} ${cy - wh2 / 2} q-3 ${wh2 / 2} 0 ${wh2} M${cx - ww * 0.3} ${cy - wh2 / 2} q-4 ${wh2 / 2} -4 ${wh2}" stroke="#5a2c10" stroke-width="1.2" opacity=".6" fill="none"/></g>`;
      if (o.busts !== false) s += `<g id="${pre}b${i}" opacity="0">${H.bust(cx, cy + wh2 * 0.05, ww * 0.19, kinds[i % kinds.length], '#0a0604')}</g>`;
      s += `<rect x="${cx - ww / 2 - 3}" y="${cy - wh2 / 2 - 3}" width="${ww + 6}" height="3" fill="${ink2}"/><rect x="${cx - ww / 2 - 3}" y="${cy + wh2 / 2}" width="${ww + 6}" height="3" fill="${ink2}"/>`;
      s += `<rect x="${cx - ww / 2}" y="${cy - 1}" width="${ww}" height="2.5" fill="${ink}"/><rect x="${cx - 1.2}" y="${cy - wh2 / 2}" width="2.5" height="${wh2}" fill="${ink}"/>`;
      s += `<path d="M${cx - ww / 2 - 2} ${cy - wh2 / 2} L${cx - ww / 2 - ww * 0.42} ${cy - wh2 / 2 - 6} L${cx - ww / 2 - ww * 0.42} ${cy + wh2 / 2 + 6} L${cx - ww / 2 - 2} ${cy + wh2 / 2}Z" fill="${ink}"/>`;
      s += `<path d="M${cx + ww / 2 + 2} ${cy - wh2 / 2} L${cx + ww / 2 + ww * 0.42} ${cy - wh2 / 2 - 6} L${cx + ww / 2 + ww * 0.42} ${cy + wh2 / 2 + 6} L${cx + ww / 2 + 2} ${cy + wh2 / 2}Z" fill="${ink}"/>`;
    }
    // pintu (di tengah bila ada teras)
    if (o.pintu !== false) { const dw = w * 0.1, dx = wx + w - dw - w * 0.04; s += `<rect x="${dx}" y="${ry + wh * 0.3}" width="${dw}" height="${wh * 0.7}" fill="${ink2}" opacity=".5"/><rect id="${pre}door" x="${dx}" y="${ry + wh * 0.3}" width="${dw}" height="${wh * 0.7}" fill="url(#winG)" opacity="0"/>`; }
    return s;
  };
  // siluet kepala-bahu di jendela
  // siluet penghuni di jendela: kepala profil (hidung, dagu, telinga), leher, bahu berkerah, tangan di ambang
  const B_HEAD = 'M-20 0 C-20 -18 -10 -24 0 -24 C12 -24 20 -16 21 -6 L23 0 C25 3 27.5 6 26.5 9 L22 11 C23 14 22.5 16 21 18 C22 21 20 24 16 24 C8 26 -4 22 -12 16 C-18 12 -20 6 -20 0Z';
  H.bust = function (cx, cy, r, kind, fill) {
    const k = r / 26, side = kind === 'w' ? -1 : 1, hl = lift(fill, 16);
    let s = `<g transform="translate(${cx},${cy + r * 0.2}) scale(${k * side},${k})" fill="${fill}">`;
    if (kind === 'c') s += '<g transform="translate(0,22) scale(.8)">';
    // bahu + badan atas (baju), kerah
    s += `<path d="M-58 96 C-58 60 -44 44 -14 38 L18 38 C46 44 60 60 60 96Z"/><rect x="-9" y="14" width="20" height="28"/>`;
    if (kind === 'w') s += `<path d="M-34 -6 C-36 -34 -10 -44 8 -40 C26 -36 30 -20 28 -6 C34 14 40 40 52 62 L-48 62 C-40 40 -34 18 -34 -6Z"/>`;
    s += `<path d="${B_HEAD}"/>`;
    if (kind === 'm') s += `<path d="M-18 -12 L-15 -34 L15 -34 L19 -12 Q0 -18 -18 -12Z"/><path d="M-15 -30 L15 -30" stroke="${hl}" stroke-width="2"/>`;
    if (kind === 'c') s += `<path d="M-20 -6 Q-24 -28 -6 -28 L-2 -34 L4 -27 L10 -32 L12 -24 Q22 -20 20 -6Z"/>`;
    if (kind !== 'w') s += `<path d="M-2 40 L6 52 L14 40" stroke="${hl}" stroke-width="2" fill="none"/><path d="M6 54 V92" stroke="${hl}" stroke-width="1.6" stroke-dasharray="2 7"/>`;
    else s += `<path d="M-30 30 Q4 46 40 30" stroke="${hl}" stroke-width="2" fill="none"/>`;
    s += `<ellipse cx="-6" cy="2" rx="3.5" ry="5" fill="${hl}" opacity=".7"/>`;  // telinga
    // tangan mencengkeram ambang jendela
    s += `<path d="M30 96 C30 84 36 78 44 78 L58 80 C62 82 62 86 58 87 L50 87 C54 89 54 93 50 94 L56 95 C58 97 56 100 52 100 L32 100Z"/>`;
    if (kind === 'c') s += '</g>';
    return s + '</g>';
  };

  /* ---------- pos ronda ---------- */
  H.posPivot = (x, y, sc) => [x, y - 60 * sc - 250 * sc + 12 * sc];
  H.pos = function (x, y, sc, ink, pre, lanternOn) {
    const pw = 300 * sc, ph = 250 * sc, fl = y - 60 * sc, ink2 = lift(ink, 10);
    let s = `<rect x="${x - pw / 2}" y="${fl}" width="${pw}" height="${14 * sc}" fill="${ink}"/>`;
    for (const dx of [-0.46, 0.46]) s += `<rect x="${x + dx * pw - 6 * sc}" y="${fl + 10 * sc}" width="${12 * sc}" height="${52 * sc}" fill="${ink}"/>`;
    for (const dx of [-0.46, -0.16, 0.16, 0.46]) s += `<rect x="${x + dx * pw - 5 * sc}" y="${fl - ph}" width="${10 * sc}" height="${ph + 4 * sc}" fill="${ink}"/>`;
    // pagar bambu setengah badan + bangku
    s += `<rect x="${x - pw / 2 + 6 * sc}" y="${fl - ph * 0.42}" width="${pw - 12 * sc}" height="${7 * sc}" fill="${ink}"/>`;
    for (let i = 1; i < 12; i++) if (i % 4) s += `<rect x="${x - pw / 2 + i * pw / 12 - 2 * sc}" y="${fl - ph * 0.42}" width="${4 * sc}" height="${ph * 0.42}" fill="${ink}" opacity=".85"/>`;
    s += `<rect x="${x - pw * 0.3}" y="${fl - ph * 0.2}" width="${pw * 0.6}" height="${6 * sc}" fill="${ink2}"/>`;
    // atap limas dengan sirap
    s += `<path d="M${x - pw * 0.66} ${fl - ph + 12 * sc} L${x - pw * 0.3} ${fl - ph - 92 * sc} L${x + pw * 0.3} ${fl - ph - 92 * sc} L${x + pw * 0.66} ${fl - ph + 12 * sc}Z" fill="${ink}"/>`;
    s += `<rect x="${x - pw * 0.32}" y="${fl - ph - 98 * sc}" width="${pw * 0.64}" height="${7 * sc}" rx="${3 * sc}" fill="${ink}"/>`;
    for (let i = 1; i < 4; i++) { const t = i / 4; s += `<line x1="${x - pw * 0.66 + pw * 0.36 * t}" y1="${fl - ph + 12 * sc - 104 * sc * t}" x2="${x + pw * 0.66 - pw * 0.36 * t}" y2="${fl - ph + 12 * sc - 104 * sc * t}" stroke="${ink2}" stroke-width="${1.5 * sc}" opacity=".5"/>`; }
    s += H.kent(x, fl - ph + 12 * sc, 0.34 * sc, ink, pre + 'k', lanternOn ? 0.9 : 0);
    return s;
  };
  H.kent = function (x, top, sc, ink, id, slit) {
    return `<g id="${id}"><line x1="${x - 110 * sc}" y1="${top}" x2="${x - 96 * sc}" y2="${top + 95 * sc}" stroke="${ink}" stroke-width="${5 * sc}"/><line x1="${x + 110 * sc}" y1="${top}" x2="${x + 96 * sc}" y2="${top + 95 * sc}" stroke="${ink}" stroke-width="${5 * sc}"/>
 <rect x="${x - 145 * sc}" y="${top + 90 * sc}" width="${290 * sc}" height="${84 * sc}" rx="${40 * sc}" fill="${ink}" stroke="#3a2412" stroke-width="${4 * sc}"/><path d="M${x - 120 * sc} ${top + 112 * sc} H${x + 120 * sc} M${x - 126 * sc} ${top + 150 * sc} H${x + 126 * sc}" stroke="#2a190c" stroke-width="${3 * sc}" fill="none"/><ellipse cx="${x + 140 * sc}" cy="${top + 132 * sc}" rx="${12 * sc}" ry="${36 * sc}" fill="#1a0f08" stroke="#4a2e18" stroke-width="${3 * sc}"/>
 <rect id="${id}s" x="${x - 100 * sc}" y="${top + 125 * sc}" width="${200 * sc}" height="${10 * sc}" rx="${5 * sc}" fill="#ffb25c" opacity="${slit}"/></g>`;
  };

  /* ---------- makam: gundukan berbingkai + nisan kepala & kaki ---------- */
  H.grave = function (x, y, k, ink, seed = 5) {
    const R = rng(seed + (x | 0)); const tilt = (R() - 0.5) * 10, stone = lift(ink, 70), stone2 = lift(ink, 50);
    let s = `<path d="M${x - 118 * k} ${y} L${x - 100 * k} ${y - 14 * k} L${x + 100 * k} ${y - 14 * k} L${x + 118 * k} ${y}Z" fill="${lift(ink, 12)}"/>`;
    s += `<ellipse cx="${x}" cy="${y - 13 * k}" rx="${92 * k}" ry="${11 * k}" fill="${lift(ink, 22)}"/>`;
    // nisan kepala (lebih tinggi, ujung membulat/meruncing)
    s += `<g transform="rotate(${tilt} ${x - 70 * k} ${y - 14 * k})"><path d="M${x - 82 * k} ${y - 12 * k} L${x - 82 * k} ${y - 70 * k} Q${x - 82 * k} ${y - 96 * k} ${x - 70 * k} ${y - 100 * k} Q${x - 58 * k} ${y - 96 * k} ${x - 58 * k} ${y - 70 * k} L${x - 58 * k} ${y - 12 * k}Z" fill="${stone}"/><rect x="${x - 86 * k}" y="${y - 20 * k}" width="${32 * k}" height="${8 * k}" fill="${stone2}"/></g>`;
    // nisan kaki
    s += `<g transform="rotate(${-tilt * 0.6} ${x + 70 * k} ${y - 14 * k})"><path d="M${x + 60 * k} ${y - 12 * k} L${x + 60 * k} ${y - 54 * k} Q${x + 70 * k} ${y - 70 * k} ${x + 80 * k} ${y - 54 * k} L${x + 80 * k} ${y - 12 * k}Z" fill="${stone2}"/></g>`;
    return s;
  };

  /* ---------- pohon kamboja: cabang menggarpu gemuk + bunga ---------- */
  H.kamboja = function (x, y, h, ink, seed = 6) {
    const R = rng(seed + (x | 0)); let s = '';
    const fork = (bx, by, ang, len, wd, d) => {
      const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
      s += `<path d="M${bx} ${by} Q${(bx + ex) / 2 + (R() - 0.5) * 20} ${(by + ey) / 2 + (R() - 0.5) * 20} ${ex} ${ey}" stroke="${ink}" stroke-width="${wd}" fill="none" stroke-linecap="round"/>`;
      if (d > 0) { fork(ex, ey, ang - 0.45 - R() * 0.3, len * 0.72, wd * 0.72, d - 1); fork(ex, ey, ang + 0.45 + R() * 0.3, len * 0.72, wd * 0.72, d - 1); if (R() > 0.6) fork(ex, ey, ang + (R() - 0.5) * 0.4, len * 0.6, wd * 0.6, d - 1); }
      else {
        s += `<ellipse cx="${ex}" cy="${ey - 6}" rx="${len * 0.5}" ry="${len * 0.25}" fill="${ink}"/>`;
        for (let i = 0; i < 6; i++) { const fx = ex + (R() - 0.5) * len, fy = ey - 6 + (R() - 0.5) * len * 0.5; s += `<circle cx="${fx}" cy="${fy}" r="${4 + R() * 4}" fill="#eadfc4" opacity="${0.45 + R() * 0.45}"/>`; }
      }
    };
    s += `<path d="M${x - h * 0.08} ${y} Q${x - h * 0.05} ${y - h * 0.2} ${x} ${y - h * 0.34} Q${x + h * 0.05} ${y - h * 0.2} ${x + h * 0.08} ${y}Z" fill="${ink}"/>`;
    fork(x, y - h * 0.32, -1.57 - 0.5, h * 0.26, h * 0.08, 3);
    fork(x, y - h * 0.32, -1.57 + 0.4, h * 0.28, h * 0.08, 3);
    return s;
  };

  /* ---------- properti kecil ---------- */
  H.pagarBambu = function (x, y, len, ink) {
    let s = `<rect x="${x}" y="${y - 52}" width="${len}" height="4" fill="${ink}"/><rect x="${x}" y="${y - 24}" width="${len}" height="4" fill="${ink}"/>`;
    for (let i = 0; i <= len; i += 18) s += `<path d="M${x + i - 3} ${y} L${x + i - 2} ${y - 70} L${x + i + 2} ${y - 76} L${x + i + 3} ${y}Z" fill="${ink}"/>`;
    return s;
  };
  H.lampuTeplok = function (id, x, y, k, ink) { // di atas meja/lantai; id untuk nyala
    return `<g transform="translate(${x},${y}) scale(${k})"><ellipse id="${id}g" cx="0" cy="-60" rx="260" ry="220" fill="url(#gWarm)" opacity=".8"/><path d="M-16 0 L16 0 L12 -14 L-12 -14Z" fill="${ink}"/><rect x="-4" y="-30" width="8" height="16" fill="${ink}"/><path d="M-10 -30 Q-12 -60 0 -70 Q12 -60 10 -30Z" fill="#ffd79a" opacity=".3"/><ellipse id="${id}f" cx="0" cy="-48" rx="6" ry="14" fill="#ffc470"/><path d="M-14 -72 L14 -72 L10 -66 L-10 -66Z" fill="${ink}"/><line x1="0" y1="-72" x2="0" y2="-96" stroke="${ink}" stroke-width="2"/></g>`;
  };
  H.meja = function (x, y, w, h, ink) { return `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h * 0.12}" fill="${ink}"/><rect x="${x - w / 2 + 8}" y="${y - h}" width="${w * 0.06}" height="${h}" fill="${ink}"/><rect x="${x + w / 2 - 8 - w * 0.06}" y="${y - h}" width="${w * 0.06}" height="${h}" fill="${ink}"/>`; };
  H.dipan = function (x, y, w, ink) { return `<rect x="${x - w / 2}" y="${y - 50}" width="${w}" height="12" fill="${ink}"/><rect x="${x - w / 2 + 4}" y="${y - 38}" width="10" height="38" fill="${ink}"/><rect x="${x + w / 2 - 14}" y="${y - 38}" width="10" height="38" fill="${ink}"/><rect x="${x - w / 2 - 4}" y="${y - 130}" width="12" height="90" fill="${ink}"/><rect x="${x - w / 2 - 4}" y="${y - 134}" width="${w * 0.1}" height="6" fill="${ink}"/>`; };
  H.kursi = function (x, y, k, ink) { return `<g transform="translate(${x},${y}) scale(${k})" fill="${ink}"><rect x="-40" y="-90" width="80" height="10" rx="3"/><rect x="-36" y="-80" width="8" height="80"/><rect x="28" y="-80" width="8" height="80"/><rect x="-36" y="-170" width="8" height="90"/><rect x="-36" y="-174" width="70" height="8"/></g>`; };
  H.lemari = function (x, y, w, h, ink) { const i2 = lift(ink, 10); return `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" fill="${ink}"/><rect x="${x - 1}" y="${y - h + 10}" width="2" height="${h - 20}" fill="${i2}"/><circle cx="${x - 10}" cy="${y - h / 2}" r="3" fill="${i2}"/><circle cx="${x + 10}" cy="${y - h / 2}" r="3" fill="${i2}"/><rect x="${x - w / 2 - 6}" y="${y - h - 8}" width="${w + 12}" height="10" fill="${ink}"/>`; };
  H.kandangAyam = function (x, y, w, ink) { let s = `<rect x="${x - w / 2}" y="${y - w * 0.45}" width="${w}" height="${w * 0.45}" fill="${ink}" opacity=".9"/><path d="M${x - w / 2 - 8} ${y - w * 0.43} L${x} ${y - w * 0.7} L${x + w / 2 + 8} ${y - w * 0.43}Z" fill="${ink}"/>`; for (let i = 1; i < 8; i++) s += `<rect x="${x - w / 2 + i * w / 8}" y="${y - w * 0.42}" width="2" height="${w * 0.42}" fill="${lift(ink, 30)}" opacity=".5"/>`; return s; };
  H.sumurProp = function (x, y, k, ink) { const i2 = lift(ink, 8); return `<g transform="translate(${x},${y}) scale(${k})"><rect x="-160" y="-440" width="16" height="440" fill="${ink}"/><rect x="144" y="-440" width="16" height="440" fill="${ink}"/><rect x="-180" y="-452" width="360" height="18" fill="${ink}"/><circle cx="0" cy="-410" r="18" fill="${ink}"/><line x1="0" y1="-410" x2="0" y2="-190" stroke="${i2}" stroke-width="4"/><path d="M-26 -190 L26 -190 L20 -140 L-20 -140Z" fill="${ink}"/><path d="M-160 -100 L160 -100 L176 0 L-176 0Z" fill="${ink}"/><ellipse cx="0" cy="-100" rx="160" ry="26" fill="${i2}"/><ellipse cx="0" cy="-98" rx="136" ry="18" fill="#000"/></g>`; };
  H.gerobak = function (x, y, k, ink) { return `<g transform="translate(${x},${y}) scale(${k})" fill="${ink}"><rect x="-90" y="-120" width="180" height="70"/><path d="M-110 -150 L110 -150 L96 -120 L-96 -120Z"/><circle cx="-50" cy="-30" r="30"/><circle cx="50" cy="-30" r="30"/><rect x="90" y="-100" width="70" height="8"/><rect x="-120" y="-200" width="6" height="150"/><rect x="114" y="-200" width="6" height="150"/><rect x="-130" y="-206" width="260" height="10"/></g>`; };
  H.tiangListrik = function (x, y, h, ink) { return `<rect x="${x - 5}" y="${y - h}" width="10" height="${h}" fill="${ink}"/><rect x="${x - 50}" y="${y - h + 20}" width="100" height="6" fill="${ink}"/><path d="M${x - 50} ${y - h + 20} q-200 40 -400 30 M${x + 50} ${y - h + 20} q200 40 400 30" stroke="${ink}" stroke-width="2" fill="none"/>`; };
  H.ayam = function (x, y, k, ink, flip) { return `<g transform="translate(${x},${y}) scale(${flip ? -k : k},${k})" fill="${ink}"><ellipse cx="0" cy="-24" rx="26" ry="16"/><path d="M-22 -30 Q-44 -46 -40 -62 Q-30 -46 -18 -36Z"/><path d="M18 -34 L30 -56 L36 -52 L30 -40 L42 -42 L30 -34Z"/><rect x="-6" y="-10" width="3" height="10"/><rect x="6" y="-10" width="3" height="10"/></g>`; };
  H.batu = function (x, y, k, ink) { return `<path d="M${x - 40 * k} ${y} Q${x - 44 * k} ${y - 30 * k} ${x - 10 * k} ${y - 38 * k} Q${x + 30 * k} ${y - 42 * k} ${x + 44 * k} ${y - 12 * k} L${x + 46 * k} ${y}Z" fill="${ink}"/>`; };
  H.semak = function (x, y, k, ink, seed = 7) { const R = rng(seed + (x | 0)); let s = ''; for (let i = 0; i < 7; i++) s += `<ellipse cx="${x + (R() - 0.5) * 90 * k}" cy="${y - R() * 30 * k}" rx="${(20 + R() * 20) * k}" ry="${(14 + R() * 12) * k}" fill="${ink}"/>`; return s; };
  H.rumput = function (y, ink, n = 60, seed = 8) { const R = rng(seed); let s = ''; for (let i = 0; i < n; i++) { const x = R() * 1080, h = 10 + R() * 22; s += `<path d="M${x} ${y} q${(R() - 0.5) * 8} ${-h / 2} ${(R() - 0.5) * 14} ${-h}" stroke="${ink}" stroke-width="2" fill="none"/>`; } return s; };

  /* ---------- kabut ---------- */
  H.fogs = function (pre, y, col, a, n) {
    let s = ''; const R = rng((y | 0) + n * 7);
    for (let i = 0; i < n; i++) s += `<ellipse id="${pre}f${i}" cx="${R() * 1300 - 110}" cy="${y + R() * 70 - 35}" rx="${380 + R() * 260}" ry="${52 + R() * 40}" fill="url(#gFog${col})" opacity="${a * (0.6 + R() * 0.6)}"/>`;
    return s;
  };
  H.fogUpd = (pre, n, t, amp = 40, sp = 0.25) => { for (let i = 0; i < n; i++) H.att(pre + 'f' + i, 'transform', `translate(${Math.sin(t * sp + i) * amp},0)`); };
  H.groundMist = (y, col, a) => `<rect x="0" y="${y - 90}" width="1080" height="180" fill="url(#mist${col})" opacity="${a}"/>`;
})();

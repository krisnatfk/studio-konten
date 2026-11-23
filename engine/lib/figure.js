/* Rig karakter siluet. Semua ukuran pada skala 1 = tinggi ±300 unit, kaki di (0,0), menghadap +x.
 * H.figure(id, opsi) -> markup;  H.poseFigure(id, {x,y,s,flip,pose,phase,...}) tiap frame.
 * Sendi: pinggul (0,-150), bahu (0,-246), leher (0,-258). Lengan 56+52, paha 76, betis 68.
 */
(function () {
  const { H } = ENG; const { att, cl, nz } = H;
  const D2R = Math.PI / 180;

  const JENIS = {
    pria:   { peci: true,  celana: true,  kerudung: false, rok: false, anak: false, tua: false },
    bapak:  { peci: true,  celana: false, kerudung: false, rok: true,  anak: false, tua: false },
    wanita: { peci: false, celana: false, kerudung: true,  rok: true,  anak: false, tua: false },
    gadis:  { peci: false, celana: false, kerudung: false, rok: true,  anak: false, tua: false, sanggul: true },
    anak:   { peci: false, celana: true,  kerudung: false, rok: false, anak: true,  tua: false },
    nenek:  { peci: false, celana: false, kerudung: true,  rok: true,  anak: false, tua: true },
    kakek:  { peci: true,  celana: false, kerudung: false, rok: true,  anak: false, tua: true },
  };
  H.JENIS_ORANG = Object.keys(JENIS);

  // kepala profil (menghadap +x), pusat ±(0,-282)
  const HEAD = 'M-20 -282 C-20 -300 -10 -306 0 -306 C12 -306 20 -298 21 -288 L23 -282 C25 -279 27.5 -276 26.5 -273 L22 -271 C23 -268 22.5 -266 21 -264 C22 -261 20 -258 16 -258 C8 -256 -4 -260 -12 -266 C-18 -270 -20 -276 -20 -282Z';
  const PECI = 'M-18 -294 L-15 -316 L15 -316 L19 -294 Q0 -300 -18 -294Z';
  const KERUDUNG = 'M21 -292 C14 -316 -16 -320 -27 -296 C-33 -282 -36 -262 -38 -234 L18 -234 C17 -256 20 -272 21 -292Z';
  const SANGGUL = '<circle cx="-23" cy="-290" r="8"/><path d="M-20 -300 C-30 -296 -32 -284 -26 -276 L-18 -282Z"/>';
  const TORSO = 'M-21 -250 C-23 -220 -16 -202 -14 -194 L-15 -150 L15 -150 C17 -200 22 -220 21 -250 Q0 -258 -21 -250Z';
  const TORSO_W = 'M-20 -250 C-22 -220 -15 -202 -13 -194 L-14 -150 L14 -150 C16 -198 24 -226 20 -250 Q0 -257 -20 -250Z';
  const SHORTS = 'M-15 -150 L15 -150 L17 -100 L3 -100 L0 -118 L-3 -100 L-17 -100Z';

  // anggota badan meruncing (otot/lengan baju), sendi membulat
  function limb(id, len, w, w2 = w * 0.72) {
    return `<g id="${id}"><path d="M${-w / 2} 0 C${-w / 2 - 1} ${len * .35} ${-w2 / 2 - 1} ${len * .7} ${-w2 / 2} ${len} L${w2 / 2} ${len} C${w2 / 2 + 1} ${len * .7} ${w / 2 + 1} ${len * .35} ${w / 2} 0Z" stroke="none"/><circle r="${w / 2}" stroke="none"/><circle cy="${len}" r="${w2 / 2}" stroke="none"/>`;
  }
  const HAND = '<path d="M-5 50 C-7 58 -5 66 1 67 C5 67 7 63 6 58 L8 55 C9 53 7 51 5 52 L5 50Z" stroke="none"/>';
  // kaki telanjang: telapak bertumit, punggung kaki, lima jari menonjol ke depan (terbaca lewat rim light)
  const FOOT_BARE = '<path d="M-7 56 C-10 64 -10 74 -3 74 L22 74 C25 74 27 72 26 70 C25 68 22 67 18 66 C10 64 5 61 3 56Z" stroke="none"/><circle cx="24.5" cy="71" r="3.2" stroke="none"/><circle cx="28.6" cy="72.4" r="2.2" stroke="none"/><circle cx="31.4" cy="73" r="1.9" stroke="none"/><circle cx="33.8" cy="73.4" r="1.6" stroke="none"/><circle cx="35.8" cy="73.8" r="1.3" stroke="none"/><path d="M-6 66 q3 -2 6 0" stroke-width="1.2" fill="none"/>';
  const FOOT = '<path d="M-8 60 C-9 68 -8 74 -4 74 L24 74 C29 74 29 69 25 67 C18 65 10 63 6 60Z" stroke="none"/>';

  H.figure = function (id, o = {}) {
    const j = JENIS[o.jenis] || JENIS.pria;
    const ink = o.ink || '#040201', aks = o.aksen ? (o.aksenWarna || '#e9dfc8') : null;
    const hs = j.anak ? 1.28 : 1;
    // rim light: pinggiran tokoh bercahaya tipis supaya siluet tetap terbaca di depan benda gelap
    const rim = o.rim === false ? '' : ` style="filter:drop-shadow(0 0 2.5px ${o.rim || '#e0b98a'}) drop-shadow(0 0 9px ${(o.rim || '#e0b98a')}66)"`;
    let g = `<g id="${id}" fill="${ink}" stroke="${ink}"${rim}>`;
    // ---- lengan belakang & kaki belakang (digambar dulu) ----
    g += limb(id + '_aL', 56, 15, 11) + limb(id + '_fL', 52, 11, 8) + HAND + `</g></g>`;
    const KAKI = o.kaki_telanjang ? FOOT_BARE : FOOT;
    g += limb(id + '_lL', 76, 20, 14) + limb(id + '_sL', 68, 14, 9) + `<g id="${id}_shoeL">${KAKI}</g></g></g>`;
    // ---- badan ----
    g += `<g id="${id}_b">`;
    g += `<path d="${j.kerudung || j.sanggul ? TORSO_W : TORSO}" stroke="none"/>`;
    const hl = H.lift(ink, 20);
    if (j.rok) {
      g += `<path id="${id}_sk" d="" stroke="none"${aks ? ` fill="${aks}"` : ''}/>`;
      // motif sarung/kain: garis kotak-kotak tipis, dipotong mengikuti bentuk rok
      g += `<clipPath id="${id}_skc"><use href="#${id}_sk"/></clipPath><g clip-path="url(#${id}_skc)" stroke="${hl}" fill="none" opacity=".8">` +
        `<path d="M-60 -150 H80 M-60 -120 H80 M-60 -112 H80 M-60 -80 H80 M-60 -50 H80 M-60 -42 H80 M-60 -14 H80" stroke-width="1.6"/><path d="M-18 -200 V0 M-6 -200 V0 M10 -200 V0 M22 -200 V0" stroke-width="1.2"/></g>`;
    } else g += `<path d="${SHORTS}" stroke="none"/><path d="M0 -118 L0 -100" stroke="${hl}" stroke-width="1.5"/>`;
    // baju: kerah, kancing, ikat pinggang (pria) / kebaya (perempuan)
    if (j.kerudung || j.sanggul) g += `<path d="M-14 -244 Q0 -226 14 -244 M-16 -200 Q0 -192 16 -200" stroke="${hl}" stroke-width="1.8" fill="none"/>`;
    else g += `<path d="M-8 -251 L1 -236 L10 -251" stroke="${hl}" stroke-width="2" fill="none"/><path d="M1 -232 V-160" stroke="${hl}" stroke-width="2" stroke-dasharray="1.5 9" stroke-linecap="round"/><path d="M-15 -154 H15" stroke="${hl}" stroke-width="2.5"/><path d="M-20 -238 C-22 -220 -17 -204 -15 -196" stroke="${hl}" stroke-width="1.2" fill="none" opacity=".7"/>`;
    g += `<rect x="-6" y="-264" width="12" height="18" stroke="none"/>`;
    // kepala
    g += `<g id="${id}_h"><g transform="translate(0,-258) scale(${hs}) translate(0,258)">`;
    if (j.kerudung) g += `<path d="${KERUDUNG}" stroke="none"${aks && o.kerudungAksen ? ` fill="${aks}"` : ''}/>`;
    g += `<path d="${HEAD}" stroke="none"/>`;
    if (!j.kerudung) g += `<ellipse cx="-6" cy="-280" rx="3.5" ry="5" fill="${hl}" stroke="none" opacity=".8"/>`;
    if (j.tua && !j.kerudung) g += `<path d="M6 -262 C10 -250 16 -246 10 -240 C2 -242 -4 -252 -4 -260Z" stroke="none"/><path d="M4 -258 L6 -246" stroke="${hl}" stroke-width="1"/>`;
    if (j.kerudung) g += `<path d="M20 -290 C14 -310 -14 -314 -24 -292" stroke="${hl}" stroke-width="1.8" fill="none"/>`;
    if (j.peci) g += `<path d="${PECI}" stroke="none"/><path d="M-16 -310 L16 -310" stroke="${hl}" stroke-width="1.6"/>`;
    if (j.sanggul) g += `<g stroke="none">${SANGGUL}</g>`;
    g += `</g></g>`;
    g += `</g>`; // _b
    // ---- kaki depan ----
    g += limb(id + '_lR', 76, 20, 14) + limb(id + '_sR', 68, 14, 9) + `<g id="${id}_shoeR">${KAKI}</g></g></g>`;
    // ---- lengan depan (+ benda di tangan) ----
    g += limb(id + '_aR', 56, 15, 11) + limb(id + '_fR', 52, 11, 8) + HAND;
    if (o.alat === 'kipas') g += '<g transform="translate(0,54) rotate(-30)"><path d="M0 0 V-24" stroke="#cda36c" stroke-width="4"/><path d="M0 -20 L-28 -45 L0 -84 L30 -45Z" fill="#be8f55" stroke="#edd19b" stroke-width="2"/><path d="M0 -22 V-78 M-20 -44 H22 M-12 -58 H13" fill="none" stroke="#7e5631" stroke-width="2"/></g>';
    if (o.alat === 'tusuk_sate') g += '<g transform="translate(0,54) rotate(-65)"><path d="M0 4 V-90" stroke="#d4ac72" stroke-width="3"/><path d="M-7 -40 H7 V-83 H-7Z" fill="#b97b3e" stroke="#623a24" stroke-width="3"/></g>';
    if (o.alat === 'sendok') g += '<path d="M0 54 V125 M0 125 q-20 26 0 30 q20 -4 0 -30Z" fill="#aa8c62" stroke="#aa8c62" stroke-width="5"/>';
    if (o.alat === 'tas') g += '<path d="M-16 74 Q-16 42 0 54 Q16 42 16 74 L24 115 H-24Z" fill="#9f8357" stroke="#bda170" stroke-width="2"/>';
    if (o.lentera) g += `<g id="${id}_ln"><line x1="0" y1="56" x2="0" y2="78" stroke-width="2.5"/><path d="M-9 78 L9 78 L11 104 L-11 104Z" stroke="none"/><rect x="-7" y="104" width="14" height="4" stroke="none"/>
      <ellipse cx="0" cy="92" rx="70" ry="70" fill="url(#gWarm)" stroke="none" opacity=".8"/><ellipse id="${id}_fl" cx="0" cy="92" rx="5" ry="8" fill="#ffd79a" stroke="none"/></g>`;
    if (o.obor) g += `<g id="${id}_ln"><line x1="0" y1="56" x2="0" y2="-40" stroke-width="5"/><ellipse cx="0" cy="-48" rx="80" ry="80" fill="url(#gWarm)" stroke="none" opacity=".85"/><path id="${id}_fl" d="M-9 -40 Q-10 -70 0 -84 Q10 -70 9 -40Z" fill="#ffc46a" stroke="none"/></g>`;
    if (j.tua) g += `<line id="${id}_ck" x1="0" y1="54" x2="0" y2="150" stroke-width="4" stroke-linecap="round"/>`;
    g += `</g></g>`;
    g += `</g>`;
    return g;
  };

  // pose dasar -> sudut (derajat). shR/elR = lengan depan, hip/knee R = kaki depan
  function poseAngles(pose, p, o, j) {
    const A = { lean: 0, head: 0, shL: 0, elL: -8, shR: 0, elR: -8, hipL: 0, kneeL: 4, hipR: 0, kneeR: 4, dy: 0, rot: 0, spread: 0, headFlip: false };
    const sw = o.langkah || 1;
    switch (pose) {
      case 'jalan': case 'lari': {
        const k = pose === 'lari' ? 1.5 : 1;
        const s = Math.sin(p), c = Math.cos(p);
        A.hipR = -28 * k * s * sw; A.hipL = 28 * k * s * sw;
        A.kneeR = 8 + 42 * k * Math.max(0, c); A.kneeL = 8 + 42 * k * Math.max(0, -c);
        A.shR = 24 * k * s; A.shL = -24 * k * s;
        A.elR = -14 - 22 * Math.max(0, -s); A.elL = -14 - 22 * Math.max(0, s);
        A.lean = -3 - 6 * (k - 1); A.head = -3; A.dy = -3 * Math.abs(c) * k; A.spread = s;
        break;
      }
      case 'diam': {
        A.shL = 2 * Math.sin(p * 0.7); A.shR = -2 * Math.sin(p * 0.7); A.head = 2 * Math.sin(p * 0.5); A.dy = 1.2 * Math.sin(p * 0.9);
        break;
      }
      case 'menoleh': { A.headFlip = true; A.head = -6; A.lean = 4; break; }
      case 'menunduk': { A.head = 22; A.lean = -6; A.shR = -8; A.shL = -4; break; }
      case 'mengangguk': { A.head = 10 + 12 * Math.sin(p * 1.8); A.shR = -20; A.elR = -40; break; }
      case 'membuka_bungkusan': { A.head = 18; A.lean = -8; A.shR = -60 + 14 * Math.sin(p); A.elR = -50; A.shL = -50 - 12 * Math.sin(p); A.elL = -60; break; }
      case 'mengetuk': { A.shR = -95 + 12 * Math.sin(p * 9); A.elR = -70; A.lean = -4; break; }
      case 'menunjuk': { A.shR = -80; A.elR = -10; A.lean = -2; break; }
      case 'mengipas': {
        A.shR = -53 + 18 * Math.sin(p * 2.4); A.elR = -38 + 22 * Math.sin(p * 2.4 + .7);
        A.shL = -32; A.elL = -65; A.head = 12; A.lean = -4; A.dy = Math.sin(p) * 1.5; break;
      }
      case 'membalik_sate': {
        A.shR = -60 + 12 * Math.sin(p * 1.7); A.elR = -25 + 18 * Math.cos(p * 1.7);
        A.shL = -25; A.elL = -50; A.head = 15; A.lean = -6 + Math.sin(p) * 2; break;
      }
      case 'mengaduk': {
        A.shR = -56 + 10 * Math.sin(p * 1.5); A.elR = -30 + 14 * Math.cos(p * 1.5);
        A.shL = -25; A.elL = -55; A.head = 16; A.lean = -5; break;
      }
      case 'berjualan': case 'membeli': case 'berbicara': {
        A.shR = -52 + 12 * Math.sin(p * 1.2); A.elR = -70 + 16 * Math.cos(p);
        // Tokoh tua memegang tongkat di kanan; tangan kiri tetap aktif menawarkan barang.
        A.shL = -42 + 25 * Math.sin(p * 1.2 + 1.3); A.elL = -60 + 25 * Math.cos(p);
        A.head = 4 * Math.sin(p * .7); A.dy = Math.sin(p * .8); break;
      }
      case 'membawa': { A.shR = -10; A.elR = -10; A.shL = -35; A.elL = -70; A.head = 3 * Math.sin(p); break; }
      case 'makan': case 'minum': {
        A.shR = -64 + 15 * Math.sin(p); A.elR = -110 + 15 * Math.sin(p); A.head = 8; break;
      }
      case 'berdoa': { A.shR = -70; A.elR = -95; A.shL = -70; A.elL = -95; A.head = 14; break; }
      case 'mengayuh': { A.dy=70;A.hipR=-75+20*Math.sin(p);A.hipL=-75-20*Math.sin(p);A.kneeR=85+25*Math.cos(p);A.kneeL=85-25*Math.cos(p);A.shR=-60;A.elR=-35;A.shL=-60;A.elL=-35;A.lean=-8;break;}
      case 'duduk': {
        A.dy = 70; A.hipR = -82; A.kneeR = 86; A.hipL = -76; A.kneeL = 82; A.lean = -8 + 1.5 * Math.sin(p * 0.8);
        A.shR = -34; A.elR = -62; A.shL = -30; A.elL = -58; A.head = 6; break;
      }
      case 'duduk_lantai': { // bersila
        A.dy = 108; A.hipR = -98; A.kneeR = 150; A.hipL = -94; A.kneeL = 146; A.lean = -6; A.shR = -28; A.elR = -70; A.shL = -26; A.elL = -66; A.head = 8; break;
      }
      case 'meraih_bawah': case 'jongkok': { // berjongkok tegak: paha ke depan, betis ke bawah, lengan bertumpu di lutut
        A.dy = 92; A.hipR = -105; A.kneeR = 118; A.hipL = -98; A.kneeL = 112; A.lean = -10; A.shR = -52; A.elR = -28; A.shL = -46; A.elL = -24; A.head = 10;
        A.dy += 1 * Math.sin(p * 0.7); if(pose==='meraih_bawah')A.lean=-60; break;
      }
      case 'tidur': { // telentang, kepala ke kiri
        A.rot = -90; A.dy = -20; A.hipR = -14; A.kneeR = 26; A.hipL = -8; A.kneeL = 18; A.shR = -60; A.elR = -70; A.shL = -10; A.elL = -20; A.head = -8;
        A.dy += 0.8 * Math.sin(p * 0.6); break;
      }
      case 'tergeletak': { A.rot = -90; A.dy = -20; A.hipR = 10; A.kneeR = 8; A.hipL = -20; A.kneeL = 30; A.shR = 40; A.elR = -20; A.shL = -140; A.elL = -10; A.head = 30; break; }
      case 'lari_ketakutan': { const s = Math.sin(p); A.hipR = -40 * s; A.hipL = 40 * s; A.kneeR = 10 + 60 * Math.max(0, Math.cos(p)); A.kneeL = 10 + 60 * Math.max(0, -Math.cos(p)); A.shR = -60; A.elR = -90; A.shL = -40; A.elL = -100; A.lean = -14; A.head = -10; A.dy = -5 * Math.abs(Math.cos(p)); break; }
      default: break;
    }
    if (o.lentera && !['tidur', 'tergeletak', 'duduk', 'duduk_lantai', 'berdoa'].includes(pose)) { A.shR = -28 + (A.shR * 0.15); A.elR = -78; }
    if (o.obor) { A.shR = -40; A.elR = -60; }
    if (j.tua && !['tidur', 'duduk', 'duduk_lantai', 'tergeletak', 'jongkok', 'meraih_bawah', 'berdoa'].includes(pose)) { A.lean -= 16; A.head += 10; A.kneeR += 6; A.kneeL += 6; A.shR = -36; A.elR = -30; }
    return A;
  }

  H.poseFigure = function (id, q) {
    const j = JENIS[q.jenis] || JENIS.pria;
    const s = (q.s || 1) * (j.anak ? 0.6 : 1);
    const A = poseAngles(q.pose || 'diam', q.phase || 0, q, j);
    const fx = q.flip ? -1 : 1;
    // Interpolate the skeleton before solving contact, so a changing pose keeps its grip.
    if (q.blend != null) {
      const from = poseAngles(q.pose_from || 'diam', q.phase || 0, q, j), k = cl(q.blend);
      for (const key of Object.keys(A)) if (typeof A[key] === 'number') A[key] = from[key] + (A[key] - from[key]) * k;
    }
    if (q.body) Object.assign(A, q.body);
    for (const side of ['L', 'R']) {
      const foot = q.feet?.[side];
      if (!foot) continue;
      const dx = foot.x - (side === 'R' ? 3 : -3);
      const dy = foot.y + 150 - A.dy;
      const knee = Math.acos(cl((dx * dx + dy * dy - 76 * 76 - 68 * 68) / (2 * 76 * 68), -1, 1));
      A['hip' + side] = (Math.atan2(-dx, dy) - Math.atan2(68 * Math.sin(knee), 76 + 68 * Math.cos(knee))) / D2R;
      A['knee' + side] = knee / D2R;
    }
    const shoulder = side => {
      const theta=-A.lean*D2R, x=side==='R'?2:-3;
      return {x:x*Math.cos(theta)+96*Math.sin(theta),y:-150+x*Math.sin(theta)-96*Math.cos(theta)};
    };
    const solve = (side, tx, ty) => {
      if (!Number.isFinite(tx)||!Number.isFinite(ty)||A.rot) return;
      const origin=shoulder(side), wave=q.exact_contact?0:Math.sin((q.phase||0)*1.5)*4;
      const dx=(tx+wave-(q.x||0))/(s*fx)-origin.x;
      const dy=(ty+(q.exact_contact?0:Math.cos(q.phase||0)*3)-(q.y||0)-A.dy*s)/s-origin.y;
      const elbow=-Math.acos(cl((dx*dx+dy*dy-56*56-52*52)/(2*56*52),-1,1));
      A['sh'+side]=(Math.atan2(-dx,dy)-Math.atan2(52*Math.sin(elbow),56+52*Math.cos(elbow)))/D2R;
      A['el'+side]=elbow/D2R;
    };
    solve('R',q.hand_x,q.hand_y);
    if(Number.isFinite(q.left_hand_x))solve('L',q.left_hand_x,q.left_hand_y);
    else if(q.pose==='membuka_bungkusan'||q.two_hands)solve('L',q.hand_x==null?null:q.hand_x-15,q.hand_y);
    const sl=shoulder('L'),sr=shoulder('R');
    att(id, 'transform', `translate(${(q.x || 0).toFixed(2)},${((q.y || 0) + A.dy * s).toFixed(2)}) scale(${(s * fx).toFixed(4)},${s.toFixed(4)}) rotate(${A.rot})`);
    att(id + '_b', 'transform', `rotate(${(-A.lean).toFixed(2)},0,-150)`);
    att(id + '_h', 'transform', `rotate(${A.head.toFixed(2)},0,-258)` + (q.head_turn != null ? ` translate(0,-258) scale(${q.head_turn},1) translate(0,258)` : A.headFlip ? ' translate(0,-258) scale(-1,1) translate(0,258)' : ''));
    att(id + '_aL', 'transform', `translate(${sl.x.toFixed(3)},${sl.y.toFixed(3)}) rotate(${A.shL.toFixed(2)})`); att(id + '_fL', 'transform', `translate(0,56) rotate(${A.elL.toFixed(2)})`);
    att(id + '_aR', 'transform', `translate(${sr.x.toFixed(3)},${sr.y.toFixed(3)}) rotate(${A.shR.toFixed(2)})`); att(id + '_fR', 'transform', `translate(0,56) rotate(${A.elR.toFixed(2)})`);
    att(id + '_lL', 'transform', `translate(-3,-150) rotate(${A.hipL.toFixed(2)})`); att(id + '_sL', 'transform', `translate(0,76) rotate(${A.kneeL.toFixed(2)})`);
    att(id + '_lR', 'transform', `translate(3,-150) rotate(${A.hipR.toFixed(2)})`); att(id + '_sR', 'transform', `translate(0,76) rotate(${A.kneeR.toFixed(2)})`);
    if (q.levelShoes) {
      for (const side of ['L', 'R']) {
        const pitch = q.feet?.[side]?.pitch || 0;
        att(id + '_shoe' + side, 'transform', `rotate(${(pitch - A['hip' + side] - A['knee' + side]).toFixed(2)},0,68)`);
      }
    }
    if (j.rok) {
      const visualPose=q.blend!=null&&q.blend<.5?q.pose_from:q.pose;
      const sit = ['duduk', 'duduk_lantai', 'jongkok', 'meraih_bawah'].includes(visualPose), lie = ['tidur', 'tergeletak'].includes(visualPose);
      const f = 29 + 15 * Math.max(0, A.spread), b = 29 + 15 * Math.max(0, -A.spread);
      let d;
      if (q.followLegCloth) {
        const leg = side => {
          const hip = A['hip' + side] * D2R;
          const shin = hip + A['knee' + side] * D2R;
          return {
            x: (side === 'R' ? 3 : -3) - 76 * Math.sin(hip),
            y: -150 + 76 * Math.cos(hip),
            dx: -55 * Math.sin(shin), dy: 55 * Math.cos(shin),
          };
        };
        const near = leg('R'), far = leg('L');
        const angle = A.lean * D2R;
        const point = (x, y) => [x * Math.cos(angle) - (y + 150) * Math.sin(angle),
          -150 + x * Math.sin(angle) + (y + 150) * Math.cos(angle)].map(v => v.toFixed(1)).join(' ');
        d = `M-16 -189 Q-20 -166 ${point(-21, -148)} Q${point(far.x - 19, far.y + 11)} ${point(far.x + far.dx - 15, far.y + far.dy + 4)} L${point(near.x + near.dx + 16, near.y + near.dy + 4)} Q${point(near.x + 18, near.y - 9)} ${point(near.x + 11, near.y - 15)} Q${point(15, -160)} 15 -189Z`;
      } else if (sit) d = 'M-15 -195 C-20 -150 -24 -112 -20 -84 L68 -78 C74 -76 74 -40 70 -12 L52 -12 L54 -60 L-8 -66 L-12 -12 L-32 -12 C-34 -60 -32 -130 -15 -195Z';
      else if (lie) d = 'M-15 -195 C-24 -150 -28 -90 -24 -8 L30 -8 C32 -90 26 -150 15 -195Z';
      else d = `M-15 -195 C-22 -130 ${-b - 2} -60 ${-b} -8 L${f} -8 C${f + 2} -60 22 -130 15 -195Z`;
      att(id + '_sk', 'd', d);
    }
    if (q.lentera) att(id + '_ln', 'transform', `rotate(${(-A.shR - A.elR + 3 * Math.sin((q.phase || 0) * 1.3)).toFixed(2)},0,56)`);
    if (q.lentera || q.obor) { const f = 0.8 + 0.4 * nz(q.phase || 0, 9); const e = document.getElementById(id + '_fl'); if (e) e.setAttribute('transform', `translate(0,${q.obor ? -40 : 92}) scale(1,${f.toFixed(3)}) translate(0,${q.obor ? 40 : -92})`); }
    if (j.tua) att(id + '_ck', 'transform', `rotate(${(-A.shR - A.elR).toFixed(2)},0,54)`);
  };

  /* ---------- makhluk ---------- */
  H.JENIS_SOSOK = ['bayangan', 'kuntilanak', 'pocong', 'genderuwo', 'tuyul'];
  H.sosok = function (id, kind, s = 1) {
    let g = `<g id="${id}">`;
    if (kind === 'pocong') {
      g += `<ellipse cx="0" cy="-300" rx="170" ry="360" fill="url(#gPale)" opacity=".45"/>`;
      g += `<path d="M-46 0 Q-66 -200 -56 -420 Q-48 -520 -14 -548 L14 -548 Q48 -520 56 -420 Q66 -200 46 0Z" fill="#d6cfbb"/>`;
      g += `<path d="M-14 -548 Q-4 -580 0 -600 Q4 -580 14 -548Z M-30 -560 Q-16 -590 -4 -596 L-2 -572Z M30 -560 Q16 -590 4 -596 L2 -572Z" fill="#cfc7b2"/>`;
      g += `<path d="M-50 -370 Q0 -384 50 -370 M-56 -220 Q0 -234 56 -220 M-48 -80 Q0 -92 48 -80" stroke="#9c947f" stroke-width="6" fill="none"/>`;
      g += `<path d="M-46 -376 l-14 10 M50 -364 l14 10 M-56 -226 l-12 12 M56 -214 l12 12" stroke="#9c947f" stroke-width="4"/>`;
      g += `<path d="M-30 -452 Q-34 -500 0 -512 Q34 -500 30 -452 Q22 -430 0 -426 Q-22 -430 -30 -452Z" fill="#1a1612"/>`;
      g += `<path d="M-22 -470 Q-12 -478 -4 -470 M4 -470 Q12 -478 22 -470" stroke="#0a0806" stroke-width="3" fill="none"/>`;
      g += `<g id="${id}e" opacity="0"><ellipse cx="-12" cy="-474" rx="6" ry="3" fill="#ff4a2a"/><ellipse cx="12" cy="-474" rx="6" ry="3" fill="#ff4a2a"/></g>`;
    } else if (kind === 'kuntilanak') {
      g += `<ellipse cx="0" cy="-300" rx="210" ry="390" fill="url(#gPale)" opacity=".4"/>`;
      // gaun compang-camping
      g += `<path d="M-34 -470 Q-70 -300 -104 -40 L-124 0 L-100 -10 L-84 6 L-66 -8 L-50 8 L-34 -6 L-16 10 L0 -4 L16 10 L34 -6 L50 8 L66 -8 L84 6 L100 -10 L124 0 L104 -40 Q70 -300 34 -470Z" fill="#dcd5c1"/>`;
      g += `<path d="M-40 -440 Q-20 -380 -60 -300 M30 -430 Q0 -360 50 -280 M-10 -200 Q-30 -120 -6 -60" stroke="#b8b09a" stroke-width="3" fill="none" opacity=".7"/>`;
      // lengan panjang menjuntai + jari
      g += `<path d="M-30 -450 Q-70 -330 -86 -210 Q-92 -170 -80 -160 Q-70 -200 -60 -300Z M30 -450 Q66 -340 80 -220 Q86 -180 74 -170 Q66 -200 56 -300Z" fill="#dcd5c1"/>`;
      g += `<path d="M-82 -164 l-8 24 M-78 -162 l-2 28 M-74 -164 l6 24 M76 -174 l-6 26 M80 -172 l2 28 M84 -174 l8 24" stroke="#cfc7b2" stroke-width="3" stroke-linecap="round"/>`;
      // rambut panjang menutup wajah
      g += `<path d="M-50 -560 Q0 -620 50 -560 L66 -250 Q54 -236 44 -262 L36 -340 L26 -270 Q16 -250 10 -300 L0 -330 L-10 -300 Q-16 -250 -26 -270 L-36 -340 L-44 -262 Q-54 -236 -66 -250Z" fill="#050404"/>`;
      g += `<path d="M-30 -520 Q-60 -520 -70 -420 M28 -520 Q58 -520 70 -400" stroke="#050404" stroke-width="9" fill="none" stroke-linecap="round"/>`;
      g += `<g id="${id}e" opacity="0"><ellipse cx="-12" cy="-520" rx="5" ry="2.4" fill="#f4eed8"/><ellipse cx="12" cy="-520" rx="5" ry="2.4" fill="#f4eed8"/></g>`;
    } else if (kind === 'genderuwo') {
      g += `<ellipse cx="0" cy="-300" rx="260" ry="400" fill="url(#gRed)" opacity=".35"/>`;
      let fur = '';
      for (let i = 0; i < 46; i++) { const a = i / 46 * 6.283; const rx = 120, ry = 230; const px = Math.cos(a) * rx, py = -300 + Math.sin(a) * ry; fur += `L${(px * 1.12).toFixed(0)} ${(-300 + (py + 300) * 1.1).toFixed(0)} L${px.toFixed(0)} ${py.toFixed(0)} `; }
      g += `<path d="M120 -300 ${fur}Z" fill="#070404"/>`;
      g += `<path d="M-60 -520 Q0 -600 60 -520 Q80 -470 40 -440 Q0 -430 -40 -440 Q-80 -470 -60 -520Z" fill="#070404"/>`;
      g += `<path d="M-110 -420 Q-190 -300 -170 -60 L-130 -60 Q-140 -250 -90 -380Z M110 -420 Q190 -300 170 -60 L130 -60 Q140 -250 90 -380Z" fill="#070404"/>`;
      g += `<g id="${id}e"><ellipse cx="-22" cy="-500" rx="11" ry="5" fill="#ff5a2a"/><ellipse cx="22" cy="-500" rx="11" ry="5" fill="#ff5a2a"/></g>`;
      g += `<path d="M-30 -462 Q0 -448 30 -462 L26 -452 L-26 -452Z" fill="#e8dcc0" opacity=".9"/>`;
    } else if (kind === 'tuyul') {
      g += `<ellipse cx="0" cy="-120" rx="110" ry="150" fill="url(#gCold)" opacity=".4"/>`;
      g += `<circle cx="0" cy="-170" r="46" fill="#050404"/><path d="M-26 -130 Q0 -140 26 -130 L32 -30 L-32 -30Z" fill="#050404"/>`;
      g += `<path d="M-14 -30 L-18 0 L-4 0 L-2 -30Z M2 -30 L4 0 L18 0 L14 -30Z M-26 -120 L-54 -60 L-46 -56 L-20 -104Z M26 -120 L54 -60 L46 -56 L20 -104Z" fill="#050404"/>`;
      g += `<g id="${id}e" opacity="0"><ellipse cx="-14" cy="-176" rx="7" ry="4" fill="#ff4a2a"/><ellipse cx="14" cy="-176" rx="7" ry="4" fill="#ff4a2a"/></g>`;
    } else { // bayangan: sosok tinggi berjubah compang-camping, bahu bungkuk, lengan panjang bercakar
      g += `<ellipse cx="0" cy="-330" rx="260" ry="480" fill="url(#gCold)" opacity=".6"/>`;
      let hem = ''; for (let i = 0; i <= 12; i++) { const x = -70 + i * (140 / 12); hem += ` L${x.toFixed(0)} ${i % 2 ? -26 : 4}`; }
      g += `<g fill="#010102"><path d="M-30 -560 Q-62 -540 -66 -470 Q-74 -260 -76 -140 L-70 0${hem} L70 0 Q72 -260 66 -470 Q62 -540 30 -560 Q0 -575 -30 -560Z"/>`;
      // kepala bertudung, condong ke depan
      g += `<path d="M-34 -556 Q-44 -640 4 -668 Q50 -660 46 -600 Q44 -570 30 -552 Q0 -540 -34 -556Z"/>`;
      // lengan panjang menjuntai sampai lutut + jari cakar
      g += `<path d="M-50 -540 Q-96 -420 -104 -250 Q-106 -220 -96 -214 Q-84 -300 -54 -470Z M50 -540 Q96 -420 100 -240 Q102 -210 92 -204 Q80 -300 54 -470Z"/>`;
      g += `<path d="M-100 -218 l-14 40 M-96 -214 l-4 46 M-90 -216 l8 40 M96 -208 l-8 40 M100 -206 l4 46 M94 -210 l14 40" stroke="#010102" stroke-width="5" stroke-linecap="round" fill="none"/></g>`;
      g += `<g id="${id}e" opacity="0"><ellipse cx="-4" cy="-610" rx="9" ry="3.6" fill="#f4eed8"/><ellipse cx="22" cy="-612" rx="9" ry="3.6" fill="#f4eed8"/><ellipse cx="9" cy="-611" rx="40" ry="18" fill="url(#gPale)" opacity=".5"/></g>`;
    }
    return g + `</g>`;
  };
  H.sosokTinggi = { bayangan: 674, kuntilanak: 600, pocong: 600, genderuwo: 560, tuyul: 216 };
})();

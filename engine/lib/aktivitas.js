/* Properti aktivitas sehari-hari; animasi murni berdasarkan waktu, aman untuk render paralel. */
(function () {
  const { H } = ENG;
  H.dagangan = function (x, y, k = 1, jenis = 'sayur') {
    let s = `<g transform="translate(${x},${y}) scale(${k})">`;
    for (let i = 0; i < 5; i++) {
      const xx = (i - 2) * 27;
      s += `<path d="M${xx - 17} -4 l4 28 h27 l5 -28Z" fill="#513323" stroke="#9b7040" stroke-width="2"/>`;
      for (let j = 0; j < 5; j++) {
        const px = xx - 8 + (j % 3) * 8, py = -5 - Math.floor(j / 3) * 8;
        s += jenis === 'sayur' ? `<path d="M${px} ${py + 8} q-19 -29 -3 -24 q3 -17 9 0 q18 -10 3 24Z" fill="${i % 2 ? '#647650' : '#859361'}"/>`
          : `<circle cx="${px}" cy="${py}" r="8" fill="${i % 2 ? '#d99a48' : '#b85f40'}" stroke="#6e452a" stroke-width="1"/>`;
      }
    }
    return s + '</g>';
  };
  H.kios = function (id, x, y, k = 1, jenis = 'sayur') {
    let s = `<g id="${id}" transform="translate(${x},${y}) scale(${k})">`;
    s += '<path d="M-145 0 V-350 H145 V0Z" fill="#211916" stroke="#795039" stroke-width="5"/><rect x="-120" y="-292" width="240" height="175" fill="#100e11"/>';
    // Rak, botol, karung: terbaca sebagai toko bahkan saat tanpa kerumunan.
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 7; i++) s += `<path d="M${-105 + i * 32} ${-244 + row * 65} v-28 h6 v-10 h8 v10 h6 v28Z" fill="${i % 2 ? '#9b7952' : '#617362'}"/>`;
      s += `<rect x="-120" y="${-239 + row * 65}" width="240" height="7" fill="#a57849"/>`;
    }
    s += '<rect x="-155" y="-115" width="310" height="18" fill="#b18350"/><path d="M-145 -97 H145 V0 H-145Z" fill="#38271e"/>';
    s += H.dagangan(0, -125, 1.45, jenis);
    s += `<g id="${id}_awning"><path d="M-175 -320 L-145 -385 H145 L175 -320Z" fill="#76513d" stroke="#b68b58" stroke-width="3"/>`;
    for (let i = 0; i < 7; i++) s += `<path d="M${-145 + i * 42} -385 h21 l${i < 3 ? -12 : 8} 65 h-25Z" fill="${i % 2 ? '#9b845b' : '#a35b45'}" opacity=".8"/>`;
    s += '<path d="M-175 -320 H175 V-301 Q150 -280 125 -301 Q100 -280 75 -301 Q50 -280 25 -301 Q0 -280 -25 -301 Q-50 -280 -75 -301 Q-100 -280 -125 -301 Q-150 -280 -175 -301Z" fill="#aa7850"/></g>';
    s += `<ellipse id="${id}_light" cx="0" cy="-285" rx="165" ry="170" fill="url(#gWarm)" opacity=".5"/><path d="M-10 -300 h20 l5 20 h-30Z" fill="#ffd49a"/>`;
    return s + '</g>';
  };
  H.panggangan = function (id, x, y, k = 1) {
    let s = `<g id="${id}" transform="translate(${x},${y}) scale(${k})">`;
    s += '<ellipse cx="0" cy="-170" rx="190" ry="180" fill="url(#gWarm)" opacity=".8"/><path d="M-95 -185 L-80 0 M95 -185 L80 0 M-80 -25 H80" stroke="#7e6550" stroke-width="9" fill="none"/><path d="M-115 -225 H115 L99 -160 H-99Z" fill="#352525" stroke="#9c7960" stroke-width="4"/>';
    s += `<g id="${id}_coals">`;
    for (let i = 0; i < 14; i++) s += `<ellipse cx="${-95 + (i % 7) * 31}" cy="${-215 + Math.floor(i / 7) * 18}" rx="11" ry="7" fill="${i % 2 ? '#ff8d31' : '#d54e22'}"/>`;
    s += '</g>';
    for (let i = 0; i < 7; i++) {
      const xx = -88 + i * 28;
      s += `<g id="${id}_sk${i}"><path d="M${xx} -245 v85" stroke="#dbb67b" stroke-width="3"/>`;
      for (let j = 0; j < 4; j++) s += `<rect x="${xx - 9}" y="${-239 + j * 15}" width="18" height="12" rx="4" fill="${(i + j) % 2 ? '#a86d38' : '#d19b55'}" stroke="#5d3522" stroke-width="2"/>`;
      s += '</g>';
    }
    for (let i = 0; i < 8; i++) s += `<path id="${id}_sm${i}" d="M${-80 + i * 23} -245 q-30 -40 3 -75 t-5 -80" fill="none" stroke="#d5c7aa" stroke-width="${7 + i % 3 * 3}" stroke-linecap="round" opacity=".25"/>`;
    return s + '</g>';
  };
  H.panci = function (id, x, y, k = 1) {
    let s = `<g id="${id}" transform="translate(${x},${y}) scale(${k})"><path d="M-80 -65 H80 L65 0 H-65Z" fill="#52382c"/><ellipse cx="0" cy="-50" rx="95" ry="80" fill="url(#gWarm)"/>`;
    s += `<g id="${id}_coals"><path d="M-40 -18 Q-50 -50 -20 -70 Q-12 -45 0 -85 Q35 -60 44 -18Z" fill="#ef9b3d"/></g><path d="M-65 -155 Q-65 -65 0 -65 Q65 -65 65 -155Z" fill="#4f5050" stroke="#b9a88c" stroke-width="4"/><ellipse cx="0" cy="-155" rx="65" ry="13" fill="#c19254"/><path d="M-65 -145 Q-100 -170 -90 -125 M65 -145 Q100 -170 90 -125" fill="none" stroke="#b9a88c" stroke-width="7"/>`;
    for (let i = 0; i < 8; i++) s += `<path id="${id}_sm${i}" d="M${-50 + i * 14} -168 q-20 -35 5 -60 t-5 -60" fill="none" stroke="#e3d5bb" stroke-width="6" opacity=".3"/>`;
    return s + '</g>';
  };
  H.masakUpd = function (id, t, aktif = true) {
    H.att(id + '_coals', 'opacity', aktif ? 0.65 + 0.35 * H.nz(t, 8) : 0.2);
    for (let i = 0; i < 8; i++) {
      const u = ((t * 0.24 + i / 8) % 1 + 1) % 1;
      H.att(id + '_sm' + i, 'transform', `translate(${Math.sin(t * 1.2 + i) * 15},${-u * 85}) scale(${1 + u * .25},1)`);
      H.att(id + '_sm' + i, 'opacity', aktif ? Math.sin(u * Math.PI) * .36 : 0);
      if (i < 7) H.att(id + '_sk' + i, 'transform', `translate(0,${aktif ? Math.sin(t * 2.6 + i * .3) * 1.5 : 0})`);
    }
  };
})();

/* Objek naratif yang harus terbaca dekat: bungkus makanan, kalender dan papan pasar. */
(function () {
  const { H } = ENG;
  const esc = x => String(x || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  H.bungkusan = function (id, x, y, k = 1, isi = 'nasi') {
    let s = `<g id="${id}" transform="translate(${x},${y}) scale(${k})"><ellipse cx="0" cy="-12" rx="90" ry="22" fill="#281e13"/><path d="M-85 -18 L-65 -65 H65 L85 -18 L50 10 H-50Z" fill="#8a8852" stroke="#b7a56d" stroke-width="3"/>`;
    s += `<g id="${id}_isi">`;
    if (isi === 'tanah') s += '<path d="M-65 -20 L-58 -45 L-38 -50 L-30 -65 L-12 -56 L8 -72 L25 -52 L49 -57 L65 -34 L60 -18Z" fill="#35352d" stroke="#776d54" stroke-width="2"/><path d="M-47 -38 l18 -6 l12 8 l19 -10 l25 9 M-20 -51 l6 12 l-12 13 M22 -49 l-9 10 l13 10" fill="none" stroke="#a19371" stroke-width="2"/>';
    for (let i = 0; i < 24; i++) {
      const xx = -55 + (i % 8) * 16, yy = -30 - Math.floor(i / 8) * 13;
      s += isi === 'tanah' ? `<path d="M${xx} ${yy} l${i % 3 + 2} -3 l4 2 l-2 4Z" fill="${i % 2 ? '#777566' : '#a3987b'}"/>` : `<ellipse cx="${xx}" cy="${yy}" rx="8" ry="4" transform="rotate(${i * 13},${xx},${yy})" fill="#e0d4a8"/>`;
    }
    s += `</g><g id="${id}_left"><path d="M-90 -15 L-75 -80 L5 -115 L10 -25Z" fill="#5c7444" stroke="#b0a165" stroke-width="3"/><path d="M-80 -25 L-20 -85 M-69 -22 L-12 -70" stroke="#81925b" stroke-width="2"/></g><g id="${id}_right"><path d="M90 -15 L75 -80 L-5 -115 L-10 -25Z" fill="#72894e" stroke="#c3b578" stroke-width="3"/><path d="M80 -25 L20 -85 M69 -22 L12 -70" stroke="#9eac6d" stroke-width="2"/></g></g>`;
    return s;
  };
  H.bungkusUpd = function (id, openness) {
    H.att(id + '_left', 'transform', `rotate(${-H.cl(openness) * 70},-80,-15)`);
    H.att(id + '_right', 'transform', `rotate(${H.cl(openness) * 70},80,-15)`);
  };
  H.kalender = function (x, y, k = 1) {
    let s = `<g transform="translate(${x},${y}) scale(${k})"><path d="M-70 -195 H70 V0 H-70Z" fill="#b9a779" stroke="#66513b" stroke-width="5"/><rect x="-70" y="-195" width="140" height="43" fill="#833f31"/><path d="M-40 -207 V-180 M40 -207 V-180" stroke="#30251b" stroke-width="7"/><text x="0" y="-164" text-anchor="middle" fill="#ecd5a2" font-family="serif" font-size="22">JUMAT</text>`;
    for (let i = 0; i < 21; i++) s += `<text x="${-49 + i % 7 * 16}" y="${-123 + Math.floor(i / 7) * 25}" font-family="serif" font-size="12" fill="#493726">${i + 1}</text>`;
    return s + '<circle cx="1" cy="-81" r="17" fill="none" stroke="#a33c26" stroke-width="3"/><text x="0" y="-23" text-anchor="middle" font-family="serif" font-size="22" fill="#723a28">KLIWON</text></g>';
  };
  H.papanNama = function (x, y, k = 1, teks = 'PASAR SETAN') {
    let s = `<g transform="translate(${x},${y}) scale(${k})"><path d="M-100 0 V-160 M100 0 V-160" stroke="#6f4c30" stroke-width="9"/><path d="M-140 -215 H140 V-145 H-140Z" fill="#84603c" stroke="#c4a26a" stroke-width="4"/><path d="M-130 -200 H130 M-130 -160 H130" stroke="#5b3b28" stroke-width="2"/>`;
    return s + `<text x="0" y="-170" text-anchor="middle" font-family="serif" font-size="26" fill="#f0d09a">${esc(teks)}</text></g>`;
  };
  H.sawahBackdrop = function (c, waktu) {
    let s = H.sky(c, waktu, [780, 280, 55]) + '<path d="M0 850 Q540 810 1080 850 V1400 H0Z" fill="#18251d"/>';
    for (let row = 0; row < 8; row++) {
      const y = 870 + row * 65;
      s += `<path d="M0 ${y} Q540 ${y - 30} 1080 ${y}" fill="none" stroke="#64724c" stroke-width="8"/>`;
      for (let i = 0; i < 20; i++) s += `<path d="M${i * 58} ${y - 5} l-12 -34 l12 24 l2 -43 l8 42 l17 -29 l-18 39" fill="none" stroke="${row % 2 ? '#718451' : '#526f40'}" stroke-width="3"/>`;
    }
    return s + '<path d="M490 840 H520 L750 1400 H570Z" fill="#665035"/>';
  };
})();

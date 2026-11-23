/* Sets and character animation authored for Orang Asing di Pos Ronda. */
(function () {
  const { H } = ENG;
  const { cl, lerp, ramp, rng, nz } = H;
  // palet gelap & pudar; pinggiran hangat dari teplok (orang asing: pinggiran dingin)
  const cast = {
    narator: ['#24393a', '#7f5a49', '#0d1214', '#c89a6c'],
    udin: ['#3f3d2c', '#7a5a46', '#121313', '#c89a6c'],
    karto: ['#3b2a24', '#86624a', '#14191b', '#c89a6c'],
    jaya: ['#2f2a3a', '#6e4d40', '#131215', '#c89a6c'],
    roni: ['#26324a', '#8a6550', '#0f1318', '#c89a6c'],
    asing: ['#17191a', '#8d927f', '#0b0d0d', '#7f9c9c'],
    ibu: ['#45333a', '#86634f', '#2c1b22', '#c89a6c'],
  };

  const group = (id, art, transform = '') => `<g id="${id}" transform="${transform}">${art}</g>`;
  const box = (x, y, w, h, fill, rest = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${rest}/>`;
  const oval = (x, y, rx, ry, fill, rest = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${rest}/>`;
  const path = (d, fill, rest = '') => `<path d="${d}" fill="${fill}" ${rest}/>`;
  const line = (d, color, width, rest = '') => path(d, 'none', `stroke="${color}" stroke-width="${width}" stroke-linecap="round" ${rest}`);

  function wood(c, x, y, w, h, vertical, seed) {
    const random = rng(seed);
    let art = box(x, y, w, h, '#292520', 'stroke="#57463b" stroke-width="2"');
    const n = Math.ceil((vertical ? w : h) / 39);
    const across = (vertical ? w : h) / n;
    for (let i = 0; i < n; i++) {
      const offset = i * across, tint = ['#392e25', '#302820', '#40312a', '#332c26'][Math.floor(random() * 4)];
      art += vertical ? box(x + offset + 1, y, across - 2, h, tint) : box(x, y + offset + 1, w, across - 2, tint);
      for (let j = 0; j < 3; j++) {
        const a = offset + 4 + random() * (across - 8), length = vertical ? h : w, b = random() * length * .56;
        const d = vertical
          ? `M${x+a} ${y+b} q-4 ${length*.1} 0 ${length*.24} t0 ${length*.15}`
          : `M${x+b} ${y+a} q${length*.1} -4 ${length*.24} 0 t${length*.15} 0`;
        art += line(d, '#ac7b50', .8, 'opacity=".19"');
      }
    }
    return art;
  }

  function head(c, id, who, back = false) {
    const [, skin, hair, rim] = cast[who];
    const old = who === 'asing' || who === 'karto';
    const cap = who === 'karto' || who === 'roni';
    const ghoul = who === 'asing';
    let art = '';
    if (who === 'ibu') art += path('M-31 36Q-33 -24 -9 -39Q20 -49 32 -18L42 54L-40 57Z', hair, 'stroke="#7a5a5a" stroke-width="1.8"');
    // wajah: lebih panjang & cekung untuk orang asing
    art += path(ghoul ? 'M-21 -21Q-13 -39 10 -33Q28 -28 27 -9L28 2L33 12L27 15L25 28Q23 40 11 41L-12 33Q-23 22 -23 -3Z'
                      : 'M-21 -21Q-13 -39 10 -33Q28 -28 27 -9L28 0L34 10L28 13L26 22Q25 31 13 33L-14 27Q-23 18 -23 -3Z', back ? hair : skin,
      `stroke="${rim}" stroke-opacity=".7" stroke-width="1.8"`);
    if (!back) {
      // setengah wajah tenggelam dalam bayangan (chiaroscuro)
      art += path('M-23 -22Q-11 -16 -7 0Q-4 16 -9 31Q-20 27 -23 13Z', '#0b0709', 'opacity=".42"') + path('M-23 -22Q-16 -17 -14 0Q-12 15 -15 29Q-21 25 -23 13Z', '#0b0709', 'opacity=".3"');
      art += path('M2 -9Q14 -14 27 -10L27 -3Q14 -6 3 -2Z', '#0b0709', 'opacity=".35"');
      if (ghoul) {
        // rongga mata hitam, titik putih, kulit kelabu berkerut
        art += path('M5 -9q12 -5 22 1', 'none', 'stroke="#141414" stroke-width="3.4" stroke-linecap="round"');
        art += group(id + '-eye', oval(17, 2, 6.5, 4.6, '#050505') + oval(18.6, 1.6, 1.3, 1.3, '#f2f6ea'));
        art += line('M8 9q6 4 12 2 M3 -14q10 -3 19 0 M4 -19q9 -2 17 0 M2 22l-4 7 M6 32l12 2 M14 7l8 2', '#3d3d33', 1.3);
        art += path('M10 26Q18 26 25 26', 'none', `id="${id}-mouth" stroke="#1d1717" stroke-width="2.2" stroke-linecap="round"`);
        art += `<g id="${id}-teeth" opacity="0">${path('M4 21Q17 38 31 19Q18 27 4 21Z', '#120b0b')}${path('M7 23L9 27L11 24L13 29L15 25L17 30L19 25L21 29L23 24L25 27L28 21Q17 27 7 23Z', '#e9e4cc')}</g>`;
      } else {
        art += line('M7 -6q9 -3 17 1', '#1f1718', 3) + group(id + '-eye', oval(17, 1, 3.4, 2.3, '#e8dccb') + oval(18, 1, 1.9, 2, '#140f0e') + oval(18.6, .4, .6, .6, '#fff3dd'));
        art += line('M23 10l6 2', '#3e2b25', 1.4) + line('M10 6q4 2 9 1', '#2b1f1c', 1, 'opacity=".55"');
        art += path('M11 24Q18 22 25 24', 'none', `id="${id}-mouth" stroke="#2a1b1c" stroke-width="2.1" stroke-linecap="round"`);
        if (who === 'narator') art += `<g id="${id}-void" opacity="0">${oval(17, 1, 5.4, 4.2, '#030303')}</g>` +
          `<g id="${id}-teeth" opacity="0">${path('M6 19Q18 34 30 17Q18 24 6 19Z', '#120b0b')}${path('M8 20L10 24L12 21L14 26L16 22L18 27L20 22L22 26L24 21L26 24L28 18Q18 24 8 20Z', '#ece6cf')}</g>`;
      }
      art += line('M-15 3q-9 -5 -7 5q2 6 7 7', '#5b4134', 1.3);
      if (old && !ghoul) art += line('M3 -15q10 -3 19 0 M4 -11q9 -2 17 0 M14 5l8 2 M3 20l-3 6 M6 28l12 2', '#3d2e26', 1.2);
    }
    if (who !== 'ibu') {
      art += path(ghoul ? 'M-23 7Q-33 -12 -22 -27Q-14 -41 8 -39Q27 -36 28 -18Q19 -22 9 -21L-9 -18L-15 6Z'
                        : 'M-23 7Q-32 -9 -23 -26Q-17 -42 8 -39Q29 -35 28 -16Q17 -24 7 -18L-8 -15L-14 4Z', hair);
      if (old) art += line('M-24 -17Q-23 -31 -7 -33 M-19 -14Q-14 -27 1 -31 M-15 -24l12 -3', ghoul ? '#9aa39c' : '#8f8678', 1.35, 'opacity=".7"');
    }
    if (who === 'ibu' && !back) art += path('M-27 -6Q-27 -40 3 -43Q32 -41 33 -10Q24 -27 4 -28Q-15 -27 -27 -6Z', hair, 'stroke="#7a5a5a" stroke-width="1.6"') +
      path('M-31 30Q-24 40 -6 38L-14 27Q-24 20 -27 6Z', hair);
    if (who === 'narator' && !back) art += `<g id="${id}-sweat" opacity="0">${path('M-6 -16q-5 8 0 11q5 -3 0 -11Z', '#bcd9e6', 'stroke="#e9f6fb" stroke-width=".8"')}</g>`;
    if (cap) art += path('M-27 -22L-25 -43Q0 -48 26 -42L29 -20Q8 -25 -27 -22Z', '#0c0e10', 'stroke="#4a4a44" stroke-width="1.4"');
    if (who === 'karto' && !back) art += line('M12 18q8 -4 14 1 M12 19l14 1', '#1a1814', 2.1);
    if (who === 'jaya') art += path('M-24 30Q4 44 30 30L28 40Q4 52 -22 40Z', '#b8ad97', 'opacity=".85"');   // handuk di leher
    return group(id, art);
  }

  function person(c, name, who, x, y, scale, flip = 1, seated = true, back = false) {
    const [shirt, skin, hair, rim] = cast[who], id = c.id(name);
    let art = oval(seated ? 40 : 0, 2, 59, 10, '#05080b', 'opacity=".6"');
    if (seated) art += path('M-23 -99Q-5 -101 18 -86L35 -60L23 -13H5L9 -56L-26 -72Z', '#171d21',
      'stroke="#798079" stroke-opacity=".4" stroke-width="1.6"');
    const legs = seated
      ? 'M-38 -103Q-14 -115 3 -106L55 -81Q69 -74 64 -57L53 -12L28 -12L31 -59L-22 -69Q-42 -76 -38 -103Z'
      : 'M-33 -105L35 -105L31 -52L27 -6H4L0 -49L-14 -9H-38L-30 -56Z';
    const legFill = who === 'asing' ? '#0c1010' : hair, legRim = `stroke="${rim}" stroke-opacity=".32" stroke-width="2"`;
    if (seated) {
      art += path(legs, legFill, legRim);
      art += path('M6 -14H23L32 -7L32 0H4Z M29 -14H53L66 -6V1H28Z', '#0d0f11', 'stroke="#5a564c" stroke-width="1.2"');
    } else {
      // kaki terpisah agar bisa melangkah (poros di pinggul y=-105)
      art += group(id + '-legL', path('M-33 -105L0 -105L-1 -49L-14 -9H-38L-30 -56Z', legFill, legRim) + path('M-38 -10H-15L-7 -5V1H-40Z', '#0d0f11', 'stroke="#5a564c" stroke-width="1.2"'));
      art += group(id + '-legR', path('M-2 -105L35 -105L31 -52L27 -6H4L0 -49Z', legFill, legRim) + path('M3 -9H26L40 -4V2H3Z', '#0d0f11', 'stroke="#5a564c" stroke-width="1.2"'));
    }
    if (who === 'ibu') art += path('M-39 -115Q0 -105 37 -117L33 -12Q-4 -7 -41 -15Z', '#462f33',
      'stroke="#ad7b73" stroke-opacity=".55" stroke-width="1.8"') +
      line('M-28 -99l-4 79 M-12 -91l-1 70 M12 -98l2 76 M25 -98l1 75', '#82615a', 1.4, 'opacity=".51"');
    if (who === 'asing' && seated) {
      art += path('M-32 -100Q7 -110 57 -80L55 -15L24 -13L22 -62L-23 -65Z', '#202625', 'stroke="#60665e" stroke-width="1.2"');
      art += line('M-28 -89Q20 -87 53 -72 M24 -54l30 2 M24 -43h30 M26 -28h27 M37 -69l-1 51 M47 -70l-1 49', '#63716a', 1.4, 'opacity=".58"');
    }
    let top = path('M-39 -111L-38 -165Q-37 -183 -12 -190L-11 -204L15 -204L18 -191Q45 -182 43 -157L34 -103Q4 -92 -39 -111Z', shirt,
      `stroke="${rim}" stroke-opacity=".62" stroke-width="2"`);
    top += path('M-39 -165Q-27 -152 -22 -128L-15 -100L-39 -111Z M-12 -190Q-30 -170 -20 -112L-38 -112L-38 -165Q-37 -183 -12 -190Z', '#050708', 'opacity=".5"');
    top += line('M-2 -186q4 30 -2 70 M20 -178q6 26 3 60', '#000', 1.4, 'opacity=".35"');
    if (who === 'karto') top += path('M-36 -176Q4 -150 40 -176L42 -160Q4 -132 -36 -158Z', '#2b2f2c', 'stroke="#575c55" stroke-width="1.4"') +
      line('M-30 -168l64 -2 M-28 -160l62 0', '#4d5650', 1.4, 'opacity=".7"');   // sarung diselempangkan
    if (who === 'narator') {
      top += line('M-32 -153Q2 -146 40 -152 M-33 -148Q2 -141 39 -147', '#a5a77f', 2.3);
      if (!back) top += path('M11 -143h16l-1 17l-12 2Z', '#45605c', 'stroke="#74918a" stroke-width="1"');
    }
    top += line('M-12 -188l10 13l17 -14 M-12 -119q19 4 39 1', rim, 1.3, 'opacity=".35"');
    top += group(id + '-arm', path('M30 -168Q40 -161 35 -138L48 -126L68 -131L72 -120L51 -114Q42 -112 34 -122L19 -137Q12 -152 20 -165Z', shirt,
      `stroke="${rim}" stroke-opacity=".48" stroke-width="1.6"`) + path('M62 -130q16 -11 22 -3q2 7 -8 14l-10 1Z', skin));
    top += `<g transform="translate(0,-221)">${head(c, id + '-head', who, back)}${back ? `<g id="${id}-face">${head(c, id + '-turned', who)}</g>` : ''}</g>`;
    return group(id, art + top, `translate(${x},${y}) scale(${flip*scale},${scale})`);
  }

  function glass(c, id, x, y, scale = 1) {
    const glass = oval(0, 7, 38, 9, '#121411') +
      path('M-26 -58L-20 1Q0 11 21 1L27 -58Z', '#72908a', 'fill-opacity=".31" stroke="#b8bda4" stroke-width="2.2"') +
      path('M-22 -36L-17 0Q0 7 18 0L23 -36Z', '#371e16') +
      oval(0, -36, 23, 5, '#67412b') + oval(0, -58, 27, 7, 'none', 'stroke="#d6c8a7" stroke-width="2"') +
      line('M-20 -51l4 43 M19 -49l-4 43', '#f2c184', 1.5, 'opacity=".69"') +
      group(id + '-steam', line('M-9 -65q-15 -20 4 -31t8 -32 M9 -68q15 -18 4 -29t6 -27', '#b7c5bd', 2.0, 'opacity=".48"'));
    return group(id, glass, `translate(${x},${y}) scale(${scale})`);
  }

  function lamp(c, id, x, y, scale = 1, glow = true) {
    return group(id, (glow ? oval(0, -62, 155, 153, 'url(#gWarm)', `id="${id}-glow"`) : '') +
      oval(0, 1, 45, 10, '#0c1111') +
      path('M-35 0Q-35 -22 -14 -24H14Q35 -22 35 0Z', '#796448', 'stroke="#c29559" stroke-width="2"') +
      path('M-15 -24Q-36 -49 -23 -77L-10 -107H10L23 -77Q37 -50 15 -24Z', '#d4c081', 'fill-opacity=".17" stroke="#ccab73" stroke-width="2.4"') +
      line('M-19 -72Q-32 -51 -16 -36 M16 -86l8 20 M-10 -27h20 M-12 -108h24', '#e3c08d', 2.2, 'opacity=".8"') +
      oval(0, -41, 6, 3, '#251a17') +
      group(id + '-flame', path('M0 -43Q-16 -44 0 -74Q13 -52 7 -45Z', '#ffac56') + oval(0, -49, 4, 8, '#fff2bc')),
      `translate(${x},${y}) scale(${scale})`);
  }

  function pos(c, p) {
    const id = c.id, dark = ['gelap', 'langkah', 'lucu'].includes(p.action);
    let art = H.sky(c, 'malam', null) + oval(540, 570, 620, 390, 'url(#gFogC)');
    art += H.palm(177, 765, 420, '#132330', -22, 8) + H.palm(900, 782, 420, '#142634', 20, 5);
    art += H.house(770, 795, 170, {ink:'#16242b',pre:id('jauh'),n:2,busts:false,teras:false,pintu:false});
    art += path('M0 385L1080 274V380L0 535Z', '#211d1d', 'stroke="#55433a" stroke-width="4"');
    art += line('M0 488L1080 340 M70 476l163 -117 M315 440l160 -106 M640 395l154 -95', '#685747', 5, 'opacity=".62"');
    art += wood(c, 0, 884, 1080, 516, false, 422) + path('M0 884H1080L1080 914H0Z', '#5b4738');
    art += box(0, 791, 1080, 16, '#4b4032') + box(0, 852, 1080, 14, '#41372c');
    for (const x of [125, 318, 558, 804, 965]) art += box(x, 799, 9, 80, '#2e2923');
    art += wood(c, 152, 444, 24, 449, true, 15) + wood(c, 902, 362, 34, 552, true, 18);
    art += group(id('sign'), box(206, 402, 238, 62, '#2c2620', 'stroke="#8a6c4c" stroke-width="3"') + line('M232 402l-8 -32 M418 402l8 -36', '#4a3b2f', 3) +
      `<text x="325" y="443" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="27" fill="#d9c49a" letter-spacing="2">POS KAMLING</text>`);
    art += group(id('kentongan'), line('M0 0v38', '#3d3127', 3) + path('M-17 38Q-19 34 -15 32H15Q19 34 17 38L15 168Q14 174 0 174Q-14 174 -15 168Z', '#8a6b3c', 'stroke="#b8925a" stroke-width="2"') +
      box(-4, 70, 8, 70, '#1c1712', 'rx="4"') + line('M-15 58h30 M-15 152h30', '#6b5230', 3) + line('M22 70l18 82', '#6b4f33', 7, 'opacity=".95"'), 'translate(188,470)');
    art += oval(546, 832, 590, 296, 'url(#gWarm)', `id="${id('roomlight')}"`);
    art += wood(c, 215, 841, 644, 25, false, 90);
    for (const x of [237, 834]) art += box(x, 866, 13, 50, '#231c19');
    art += group(id('clock'), oval(0, 0, 48, 48, '#3c2b24', 'stroke="#927453" stroke-width="4"') +
      oval(0, 0, 41, 41, '#9d9375', 'stroke="#151d20" stroke-width="3"') +
      Array.from({length:12}, (_, i) => line('M0 -34v6','#272b26',2,`transform="rotate(${30*i})"`)).join('') +
      line('M0 -2L-2 -21 M0 0l2 -31','#211d19',3) + oval(0,0,3,3,'#a45a45'), 'translate(382,515)');
    const people = [['narator', 361, 893, 1], ['udin', 478, 883, -1], ['karto', 602, 887, -1],
      ['jaya', 249, 877, 1], ['roni', 712, 882, -1]];
    if (p.action === 'buka' || p.action === 'kenal') people.push(['asing', 825, 897, -1]);
    art += oval(541, 837 - 62 * .98, 152, 150, 'url(#gWarm)', `id="${id('lamp')}-glow"`);
    for (const [who, x, y, flip] of people) {
      art += person(c, who, who, x, y, who === 'jaya' ? .68 : .78, flip);
    }
    art += wood(c, 398, 838, 251, 20, false, 498) + box(411, 858, 14, 83, '#322922') + box(620, 858, 14, 83, '#30261f');
    art += group(id('asbak'), oval(0, 0, 26, 7, '#5b5550', 'stroke="#8e877c" stroke-width="2"') + line('M-2 -3l13 -3', '#cbbf9f', 3) + oval(12, -6.5, 2, 1.6, '#ff7a3a'), 'translate(476,838)');
    art += group(id('rokok'), line('M488 830q-10 -22 4 -38t-2 -36', '#b9c2c0', 1.6, 'opacity=".45"'));
    art += group(id('senter'), box(-34, -12, 52, 22, '#2d3b45', 'rx="6" stroke="#7b8a92" stroke-width="2"') + box(18, -15, 14, 28, '#3c4d58', 'rx="3"'), 'translate(660,828)');
    art += lamp(c, id('lamp'), 541, 837, .98, false) + glass(c, id('cup'), 449, 837, .76) + glass(c, id('cup2'), 617, 839, .68);
    if (['buka','kenal','hilang','tanya'].includes(p.action)) {
      art += glass(c, id('asingcup'), 769, p.action === 'hilang' || p.action === 'tanya' ? 841 : 805, .66);
    }
    if (p.action === 'pegang') {
      art += group(id('grip'), path('M671 811Q611 783 561 786L525 780L510 807L550 841Q604 847 668 869Z', '#355455', 'stroke="#89a498" stroke-width="3"') +
        path('M404 803L465 790L486 759Q492 748 509 751L565 765Q575 770 567 778L525 776L576 788Q589 795 578 803L522 794L572 810Q583 821 570 823L522 810L548 826Q555 838 542 840L494 817L461 829L414 835Z', '#9f785c', 'stroke="#d3ae82" stroke-width="2.5"') +
        line('M430 814l39 -10 M510 761l30 7 M544 778l13 4 M545 803l17 6', '#d7ab82', 2));
    }
    if (p.action === 'lucu') art += group(id('grin'), oval(-14, 0, 6, 2.6, '#d8e7ea') + oval(14, 0, 6, 2.6, '#d8e7ea') + path('M-22 26Q0 44 22 26', 'none', 'stroke="#d8e7ea" stroke-width="3" stroke-linecap="round"'), 'translate(818,662)');
    if (p.action === 'langkah') for (let i=0;i<4;i++) art += group(id('track' + i), oval(0,0,11,24,'#151d21','stroke="#7d9da8" stroke-width="1.2"') + oval(0,-16,12,11,'#18242a'), `translate(${662+53*i},${933+25*i}) rotate(-47)`);
    if (dark || p.action === 'padam' || p.action === 'nyala') art += box(0, 0, 1080, 1400, '#07111e', `id="${id('dark')}" opacity="0"`);
    return art;
  }

  function house(c, p) {
    const id = c.id, bedroom = p.set === 'kamar';
    let art = box(0, 0, 1080, 1400, '#172229') + wood(c, 0, 240, 1080, 682, true, bedroom ? 830 : 746);
    art += path('M0 280L1080 205V315L0 429Z', '#221e20', 'stroke="#5b4940" stroke-width="5"') + wood(c, 0, 918, 1080, 482, false, 249);
    art += box(659, 418, 204, 238, '#171f28', 'stroke="#5e4f41" stroke-width="10"') + oval(762, 537, 180, 216, 'url(#gCold)');
    art += line('M760 421v232 M665 545h193 M691 427v225 M834 427v225', '#362f2b', 6);
    if (bedroom) {
      art += path('M628 616L810 680L913 925L537 956Z', '#70898d', 'opacity=".18"') + oval(598, 816, 395, 295, 'url(#gCold)');
      art += path('M445 795L735 768L881 895L483 914Z', '#5d3f2c', 'stroke="#8a6346" stroke-width="3"');
      art += path('M483 914L881 895V924L487 949Z', '#3d2a1d', 'stroke="#6f4f36" stroke-width="3"');
      art += path('M436 790L431 640Q433 630 442 631L452 790Z M726 770L724 650Q726 641 735 642L742 768Z', '#4a3222', 'stroke="#7b583c" stroke-width="2"');
      art += path('M480 924l6 75h14l5 -70 M850 915l3 69h13l3 -70', '#251f1d');
      art += path('M519 824L727 805L851 887L548 904Z', '#6e4a3a', 'stroke="#a07a5c" stroke-width="2"');
      for (let r = 0; r < 4; r++) for (let q = 0; q < 6; q++) { const u = (q + .5) / 6, v = (r + .5) / 4, xx = 519 + u * 208 + v * 29 + u * v * 95, yy = 824 - u * 19 + v * 80 + u * v * 2;
        art += oval(xx, yy, 7, 3, 'none', 'stroke="#d9b36b" stroke-width="1.6" opacity=".55"') + oval(xx, yy, 1.8, 1.2, '#d9b36b', 'opacity=".6"'); }
      art += line('M560 839l133 -10l96 53 M593 858l124 -9 M620 879l122 -10', '#c9a46a', 1.4, 'opacity=".35"');
      art += path('M505 799Q501 779 520 776L580 773Q601 780 602 805L529 815Z', '#a5a08c', 'stroke="#bdad92" stroke-width="2"');
      if (p.action === 'tidur') {
        art += path('M584 811Q647 791 716 819L793 858L647 871L569 843Z', '#345252', 'stroke="#a5a77f" stroke-width="3"');
        art += group(id('sleep'), head(c, id('asleep'), 'narator'), 'translate(553,810) rotate(-87) scale(.61)');
      } else {
        art += person(c, 'ganda', 'narator', 637, 935, 1.12, -1, true, true);
      }
      art += group(id('kelambu'), path('M452 344Q470 520 452 790L486 795Q505 560 478 344Z', '#dde6ea', 'opacity=".16"') +
        path('M716 335Q760 520 742 770L770 772Q781 540 744 333Z', '#dde6ea', 'opacity=".14"') +
        line('M462 350q14 220 -2 438 M470 350q10 230 2 440 M728 340q38 210 22 428', '#eef4f6', 1.2, 'opacity=".22"') +
        path('M440 330H760L756 342H444Z', '#cfd8dc', 'opacity=".25"'));
      art += group(id('jamb'), wood(c, 113, 327, 167, 700, true, 34) + wood(c, 904, 316, 121, 797, true, 33) +
        box(279, 337, 13, 690, '#775943') + path('M280 328L908 315V348L278 372Z', '#3d2c26'));
      if (p.action === 'celah') {
        art += group(id('beddoor'),
          path('M283 367L431 432V941L283 1026Z', '#322b29', 'stroke="#795a49" stroke-width="4"') +
          line('M303 383v628 M328 393v603 M354 406v579 M380 418v549 M406 430v525', '#584338', 3) +
          line('M286 515l140 41 M286 843l140 -38', '#241f20', 10) +
          oval(409,715,7,11,'#a57f56','stroke="#caa780" stroke-width="2"'));
      }
    } else {
      art += box(391, 388, 287, 572, '#12151b', 'stroke="#83604a" stroke-width="10"');
      art += path('M402 409H670V936H402Z', '#bc853e', 'opacity=".62"') + oval(543, 732, 277, 420, 'url(#gWarm)');
      art += path('M404 913L663 913L806 1146L267 1146Z', '#d5a36d', 'opacity=".17"');
      art += group(id('door'), wood(c, 398, 393, 270, 566, true, 70) +
        line('M403 548h260 M403 809h260 M431 401l194 531', '#171916', 9) +
        box(607, 666, 37, 53, '#272828', 'stroke="#997552" stroke-width="2"') +
        oval(623, 689, 9, 9, '#aa8c54', 'stroke="#cab374" stroke-width="2"'));
      const atKnock = p.action === 'ketuk' || p.action === 'tiba';
      if (!atKnock) art += person(c, 'ibu', 'ibu', 580, 934, 1.17, -1, false);
      if (p.action !== 'ketuk') art += person(c, 'pulang', 'narator', atKnock ? 710 : 381, 989, 1.28, atKnock ? -1 : 1, false);
      if (p.action === 'ketuk') art += group(id('fist'), path('M830 762L717 702L690 674Q676 666 662 677L648 695Q640 703 648 714L677 737L737 766L821 813Z', '#365353', 'stroke="#82968b" stroke-width="3"') +
        path('M695 680Q680 666 667 674L650 689Q642 697 650 710L669 720L688 707L703 701Z', '#9f7460', 'stroke="#d3b39c" stroke-width="2"') +
        line('M653 690l15 -9 M650 699l16 -9 M657 707l13 -9', '#d3b39c', 1.8));
    }
    return art;
  }

  function field(c, p) {
    const id = c.id;
    let art = H.sky(c, 'malam', [780, 280, 55]);
    art += path('M0 848Q114 792 263 833T454 839Q684 775 845 817T1080 800V965H0Z', '#1b2b32');
    art += path('M0 882Q263 839 469 863T1080 846V1400H0Z', '#263d3a');
    const rice = rng(402);
    for (let row = 0; row < 8; row++) {
      const y = 881 + row * row * 9.6, height = 8 + row * 3.5;
      art += line(`M0 ${y+12}Q560 ${y-17} 1080 ${y+8}`, '#52635a', 1 + row*.8, 'opacity=".49"');
      for (let i=0;i<37-row*2;i++) {
        const x = (i+rice()*.8)*1080/(37-row*2), dy = (rice()-.5)*(8+row*2), h=height*(.65+.65*rice());
        art += path(`M${x} ${y+dy}q${-h*.65} ${-h*.65} ${-h*.55} ${-h}q${h*.55} ${h*.58} ${h*.65} ${h*.73}q0 ${-h*.73} ${h*.4} ${-h*.91}q${-h*.2} ${h*.8} ${-h*.35} ${h*1.18}Z`,
          ['#425e46','#3b544b','#58705b'][i%3]);
      }
    }
    art += path('M0 990Q403 993 1080 892V910Q569 1005 0 1009Z', '#3c4237', 'stroke="#59604c" stroke-width="2"');
    art += path('M482 867Q507 863 522 870Q543 1061 760 1400H491Q471 1160 489 1025Z', '#5a5141', 'stroke="#706b56" stroke-width="2"');
    art += line('M504 885Q507 1048 566 1177T663 1400', '#a39270', 3, 'opacity=".32"');
    art += group(id('village'), H.house(416, 922, 160, {ink:'#121b21',pre:id('desa1'),n:2,busts:false,teras:false,pintu:false}) +
      H.house(576, 921, 135, {ink:'#17232a',pre:id('desa2'),n:2,busts:false,teras:false,pintu:false}) +
      H.pos(721, 947, .78, '#172126', id('pos'), true));
    art += group(id('windows'), [[374,844],[447,844],[546,853],[602,853]].map(([x,y])=>oval(x,y,64,48,'url(#gWarm)')+box(x-5,y-7,10,12,'#e9ad68')).join(''));
    art += H.palm(252, 991, 426, '#121d24', -15, 8) + H.palm(864, 981, 392, '#111d24', 19, 11);
    const random = rng(113);
    for (let i=0;i<21;i++) {
      const x=200+random()*680, y=1030+random()*230, w=15+random()*95;
      art += line(`M${x} ${y}h${w}`, i%2 ? '#749da1' : '#637e75', 1+random()*2, 'opacity=".28"');
    }
    art += group(id('fog'), oval(334,934,560,128,'url(#gFogC)','opacity=".72"') + oval(885,1064,610,104,'url(#gFogC)','opacity=".58"'));
    if (['patroli','lari','ingat'].includes(p.action)) {
      const names = p.action === 'patroli' ? ['narator','udin','karto','jaya','roni'] : ['narator'];
      // tokoh yang sama persis dengan di pos ronda (bukan siluet lain)
      names.forEach((name,i) => { art += person(c, 'walk'+i, name, 0, 0, .5, 1, false); });
      if (p.action === 'patroli') art += lamp(c, id('lentera'), 0, 0, .32);
    }
    const ff = rng(77);
    art += group(id('fireflies'), Array.from({ length: 16 }, (_, i) => oval(120 + ff() * 840, 900 + ff() * 260, 3.2, 3.2, '#e8f59a', `id="${id('ff' + i)}" opacity=".0"`) ).join(''));
    if (p.action === 'sunyi') art += group(id('sosok'), path('M0 0Q-9 -3 -10 -40Q-11 -62 -6 -70Q-12 -78 -8 -88Q0 -98 8 -88Q12 -78 6 -70Q11 -62 10 -40Q9 -3 0 0Z', '#05090c') + oval(0, 1, 16, 3, '#05090c', 'opacity=".5"'), 'translate(652,972) scale(1.15)');
    art += group(id('reeds'), H.rumput(1183, '#416756', 80, 11) + H.rumput(1252, '#426355', 74, 21) + H.rumput(1390, '#2f4d43', 90, 7));
    return art;
  }

  function update(c, t, p) {
    const id = c.id, set = (name, attr, value) => H.att(id(name), attr, value);
    const cue = (n, span = .75) => p.beats[n] == null ? 0 : ramp(t, p.beats[n], p.beats[n] + span);
    const wave = (n, span = 1) => Math.sin(Math.PI * cue(n, span));
    const blink = k => { const per = 3.4 + (k % 5) * .55, ph = (t + k * 1.37) % per; return ph < .13 ? .12 : 1; };
    const eyes = (names) => names.forEach((n, k) => set(n + '-eye', 'transform', `translate(17,1) scale(1,${blink(k)}) translate(-17,-1)`));
    if (p.set === 'sawah') {
      for (let i = 0; i < 16; i++) { const a = i * 2.39; set('ff' + i, 'transform', `translate(${18 * Math.sin(t * .37 + a)},${10 * Math.sin(t * .53 + a * 1.7)})`); set('ff' + i, 'opacity', (.25 + .7 * Math.max(0, Math.sin(t * 1.9 + a * 3))) * (p.action === 'mati' ? .4 : 1)); }
      if (p.action === 'sunyi') set('sosok', 'opacity', .92 * ramp(t, p.beats[90], p.beats[90] + 1.4));
      set('fog', 'transform', `translate(${29*Math.sin(t*.21)},0)`);
      set('reeds', 'transform', `translate(${4*Math.sin(t*1.45)},0)`);
      set('windows', 'opacity', p.action === 'mati' ? 1-cue(12,.27) : .92);
      const moving = p.action === 'lari' || p.action === 'ingat';
      for(let i=0;i<(p.action === 'patroli' ? 5 : moving ? 1 : 0);i++) {
        const k = moving ? cl((t-p.run)/3.5) : cl((t-p.walk)/8.45);
        const x = moving ? 576-104*k+32*k*k : 306+i*94+64*k;
        const y = moving ? 1215-416*k+104*k*k : 991-(x-170)*.074;
        const sc = (moving ? .83 - .47 * k : .50 - i * .035) * 1.12, fl = moving ? -1 : 1, ph = t * (moving ? 11 : 6.5) + i * .87;
        const sw = Math.sin(ph) * (moving ? 34 : 20), bob = Math.abs(Math.cos(ph)) * (moving ? 9 : 4) * sc;
        set('walk'+i, 'transform', `translate(${x},${y - bob}) rotate(${moving ? -7 : 0}) scale(${fl * sc},${sc})`);
        set('walk'+i+'-legL', 'transform', `rotate(${sw},0,-105)`); set('walk'+i+'-legR', 'transform', `rotate(${-sw},0,-105)`);
        set('walk'+i+'-arm', 'transform', `rotate(${(moving ? -40 : -12) - sw * .6},24,-159)`);
        if (i === 2 && p.action === 'patroli') set('lentera', 'transform', `translate(${x + fl * 78 * sc},${y - bob - 118 * sc}) scale(.3)`);
      }
      return;
    }
    const turn = (name, degrees) => set(name+'-head','transform',`rotate(${degrees},0,28)`);
    const smile = (name, s, speech) => set(name+'-mouth','d',`M10 ${23-3*s}Q18 ${23+5*s+speech} 25 ${23-3*s}`);
    if (p.set === 'pos') {
      const up = p.action === 'kenal' ? cue(32,2.7) : 0;
      const speak = n => (p.beats[n] != null && Math.abs(t-p.beats[n]-1)<1) ? 2.3*Math.abs(Math.sin(t*12)) : 0;
      turn('asing', 32*(1-up)+1.2*Math.sin(t*.89));
      eyes(['narator-head', 'udin-head', 'karto-head', 'jaya-head', 'roni-head']);   // orang asing TIDAK pernah berkedip
      set('narator-head-sweat', 'opacity', cue(31, .8) * (1 - cue(52, 1.2)) + cue(53, .8));
      set('narator-head-sweat', 'transform', `translate(0,${6 * ((t * .7) % 1)})`);
      if (p.action === 'lucu') set('grin', 'opacity', .85 * ramp(t, p.beats[40] + .7, p.beats[40] + 1.3) * (1 - ramp(t, p.beats[41] - .5, p.beats[41])) * (.75 + .25 * Math.sin(t * 9)));
      set('rokok', 'transform', `translate(${3 * Math.sin(t * 1.3)},${-2 * Math.sin(t * 1.7)})`);
      turn('narator', 16*wave(17,.94)-13*cue(19,.62)+5*wave(31,1.6));
      turn('udin', -14*cue(15,1.1)+1.3*Math.sin(t*.85));
      turn('karto', 12*wave(54,2.2)-5*wave(53,1.5));
      turn('jaya', 1.5*Math.sin(t*.91)); turn('roni', -1.7*Math.sin(t*.77));
      smile('asing-head', cue(33,.9)*up, speak(34)+speak(35)+speak(36));
      const grin = cue(33, .5) * up; set('asing-head-teeth', 'opacity', grin); set('asing-head-mouth', 'opacity', 1 - grin);
      smile('udin-head', 0, speak(16)+speak(18));
      smile('karto-head', 0, speak(30)+speak(56)+speak(57));
      set('narator-arm', 'transform', `rotate(${-18*wave(10,2.4)},24,-159)`);
      if (p.action === 'usir') set('karto-arm', 'transform', `rotate(${-56*wave(59,1.9)},24,-159)`);
      set('grip','transform',`translate(${-42*(1-cue(28,.35))},${7*(1-cue(28,.35))})`);
      set('grip','opacity', .12+.88*cue(28,.28));
      for (const [j,name] of ['cup','cup2','asingcup'].entries()) {
        set(name+'-steam','transform',`translate(${4*Math.sin(t*1.8+j)},${-3*Math.sin(t*2+j)})`);
        set(name+'-steam','opacity', .58+.34*Math.sin(t*1.6+j));
      }
      const extinguished = p.action === 'padam' ? cue(38,.24)
        : p.action === 'nyala' ? 1-cue(43,.56)
        : ['gelap','langkah','lucu'].includes(p.action) ? 1 : 0;
      const flicker = .75+.22*nz(t,7), lit = (1-extinguished)*flicker;
      set('lamp-flame','transform',`translate(${1.8*Math.sin(t*11)},${(1-flicker)*7})`);
      set('lamp-flame','opacity',lit); set('lamp-glow','opacity',lit); set('roomlight','opacity',.74*lit);
      set('dark','opacity',.57*extinguished);
      for(let i=0;i<4;i++) set('track'+i,'opacity',.80*ramp(t,p.steps+i*.48,p.steps+i*.48+.23));
    } else if(p.set === 'rumah') {
      const open = cue(63,1.45);
      set('door','transform',`translate(400,0) scale(${1-.76*open},1) translate(-400,0)`);
      turn('ibu', -5*wave(64,1.0)+10*wave(67,1.2)-7*wave(68,1.1));
      eyes(['ibu-head', 'pulang-head']);
      set('pulang-head-sweat', 'opacity', cue(65, .6)); set('pulang-head-sweat', 'transform', `translate(0,${6 * ((t * .8) % 1)})`);
      turn('pulang', 6*Math.sin(t*2.8)*(.8-.61*cue(66,1.5)));
      const talking = (a,b) => cue(a,.12)*(1-cue(b,.2))*2.3*Math.abs(Math.sin(t*12));
      smile('ibu-head',0,talking(64,65)+talking(68,70)); smile('pulang-head',0,talking(66,67));
      const knock = p.knocks.reduce((sum, at) => sum + Math.sin(Math.PI*ramp(t,at-.14,at+.07)),0);
      set('fist','transform',`translate(${-32*knock},${-11*knock})`);
    } else {
      const k = cue(79,2.2), reveal = cue(80,1.1);
      set('ganda-head','opacity',1-reveal); set('ganda-face','opacity',reveal);
      set('ganda-face','transform',`translate(${-12*(1-k)},0) scale(${.34+.66*k},1)`);
      set('ganda-head','transform',`rotate(${-8*k},0,28) scale(${1-.4*k},1)`);
      smile('ganda-turned',cue(82,.92),cue(83,.6)*(1-cue(86,.3))*2.9*Math.abs(Math.sin(t*13)));
      set('ganda-turned-void', 'opacity', cue(82, .4)); set('ganda-turned-teeth', 'opacity', cue(82, .45)); set('ganda-turned-mouth', 'opacity', 1 - cue(82, .45));
      set('jamb','opacity',p.action === 'celah' ? 1 : .96);
      set('kelambu', 'transform', `translate(${2.5 * Math.sin(t * .6)},0)`);
    }
  }

  ENG.def('ronda_film', {
    build(c,p) {
      if (p.set === 'pos') return pos(c,p);
      if (p.set === 'rumah' || p.set === 'kamar') return house(c,p);
      return field(c,p);
    },
    upd: update,
  });
})();

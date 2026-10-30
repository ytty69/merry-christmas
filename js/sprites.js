/* 像素精灵：字符画 → 画布。'.' 为透明，其他字母对应调色板 */
(function () {
  const PIX = { k: '#1b1433', b: '#ffb3c6', d: '#e5809c', w: '#ffffff', p: '#ff5d8f' };
  const ICON = { k: '#1b1433', y: '#ffd23f', o: '#e08e0b', w: '#ffffff', r: '#ff4d6d', n: '#5bc0eb', g: '#6b5f8a' };

  // 主角「小P」14x13
  const pix = [
    '....kkkkkk....',
    '..kkbbbbbbkk..',
    '.kbbbbbbbbbbk.',
    '.kbwwbbbbwwbk.',
    'kbbwkbbbbwkbbk',
    'kbbwkbbbbwkbbk',
    'kbbbbbbbbbbbbk',
    'kbpbbbkkbbbpbk',
    'kbbbbbbbbbbbbk',
    '.kbbbbbbbbbbk.',
    '.kdbbbbbbbbdk.',
    '..kkddddddkk..',
    '...kk....kk...',
  ];
  const variant = over => pix.map((row, i) => over[i] || row);
  const closedEyes = { 3: '.kbbbbbbbbbbk.', 4: 'kbbkkbbbbkkbbk', 5: 'kbbbbbbbbbbbbk' };

  const icons = {
    star: [
      '....k....',
      '...kyk...',
      'kkkyyykkk',
      'kyyyyyyyk',
      '.kyyyyyk.',
      '..kyyyk..',
      '.kyykyyk.',
      '.kyk.kyk.',
      '.kk...kk.',
    ],
    coin: [
      '..kkkkk..',
      '.kyyyyyk.',
      'kyywyyyok',
      'kywyyyyok',
      'kyyyyyyok',
      'kyyyyyyok',
      'kyyyyyook',
      '.koooook.',
      '..kkkkk..',
    ],
    note: [
      '...kkkkkk',
      '...knnnnk',
      '...kkkkkk',
      '...k....k',
      '...k....k',
      '.kkk..kkk',
      'knnk.knnk',
      'knnk.knnk',
      '.kk...kk.',
    ],
    heart: [
      '.kk...kk.',
      'krrk.krrk',
      'krwrkrrrk',
      'krrrrrrrk',
      'krrrrrrrk',
      '.krrrrrk.',
      '..krrrk..',
      '...krk...',
      '....k....',
    ],
    bolt: [
      '....kkkk.',
      '...kyyk..',
      '..kyyk...',
      '.kyyykkk.',
      '.kkkyyyk.',
      '...kyyk..',
      '..kyyk...',
      '..kyk....',
      '..kk.....',
    ],
    bomb: [
      '.....y.y.',
      '......r..',
      '.....k...',
      '..kkkkk..',
      '.kgwgggk.',
      '.kwggggk.',
      '.kgggggk.',
      '.kgggggk.',
      '..kkkkk..',
    ],
  };

  const small = {
    heartS: ['rr.rr', 'rrrrr', 'rrrrr', '.rrr.', '..r..'],
    noteS: ['..nn.', '..n.n', '..n..', 'nnn..', 'nnn..'],
    coinS: ['.yyy.', 'yywyo', 'ywyyo', 'yyyyo', '.ooo.'],
    spark: ['..y..', '..y..', 'yywyy', '..y..', '..y..'],
    soundOn: ['...w....', '..ww..w.', 'wwww.w.w', 'wwww.w.w', 'wwww.w.w', '..ww..w.', '...w....'],
    soundOff: ['...w....', '..ww....', 'wwww.w.w', 'wwww..w.', 'wwww.w.w', '..ww....', '...w....'],
  };

  const S = G.SPR = {
    pix: G.makeSprite(pix, PIX),
    pixBlink: G.makeSprite(variant(closedEyes), PIX),
    pixWalk: G.makeSprite(variant({ 12: '....kk..kk....' }), PIX),
  };
  for (const k in icons) S[k] = G.makeSprite(icons[k], ICON);
  for (const k in small) S[k] = G.makeSprite(small[k], ICON);
})();

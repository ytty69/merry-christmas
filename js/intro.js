/* 开场：拆礼物 → 她去森林砍树（他在窗边等）→ 拖回家 → 两人一起装饰圣诞树 → MERRY CHRISTMAS
   场景画在一半分辨率的离屏画布上（90px 宽）再放大 2 倍；两个角色和文字画在原分辨率上 */
(function () {
  const TO = '小邹';   // 礼物盒上的称呼：「给 TO 的圣诞礼物」，可以改成他的名字或昵称

  // ---------- 剧情时间轴（秒，从拆开礼物后开始算） ----------
  const T = {
    walk: 1, chop: 5, fall: 7.4, land: 8.2, turn: 8.6, drag: 9, fadeOut: 13.6,
    inside: 14.2, deco: 15, lights: 18.6, throwStar: 19.6, star: 20, title: 20.4, ready: 21.6,
  };
  const HITS = [5.48, 6.28, 7.08];
  const CAPTIONS = [
    [0.3, 3, '圣诞节快到啦…'],
    [3, 5.4, '去森林挑一棵最美的树!'],
    [5.5, 8.4, '就选这一棵!'],
    [9, 13.4, '嘿咻嘿咻~ 拖回家!'],
    [14.8, 18.8, '一起装饰圣诞树~'],
  ];

  // ---------- 场景布局（世界坐标，半分辨率像素） ----------
  const HOUSE_X = 0, DOOR_X = 44, CHOP_X = 155, TREE_X = 166, WORLD = 224;
  // 森林里的树 [x, 宽, 高]；150~200 留一片空地给要砍的那棵
  const FOREST = [[96, 14, 24], [108, 18, 30], [122, 12, 20], [136, 16, 28], [206, 18, 32], [218, 12, 22]];
  const IN_TREE_X = 24, IN_GIRL_X = 45, IN_BOY_X = 59, ORN_GAP = 0.22;
  const NIGHT = ['#0b0b1a', '#121436', '#1a1f4f', '#243066', '#2f4280'];
  const HANDLE = '#8a5a3c', METAL = '#9aa5b8';
  const ORN_COLORS = ['#ff4d6d', '#ffd23f', '#5bc0eb', '#ffffff', '#b388ff'];

  // ---------- 精灵 ----------
  // 两个角色是 32x41 的像素图（脚底在第 40 行），在原分辨率上 1:1 绘制
  function loadImg(src) { const i = new Image(); i.src = src; return i; }
  const STAR = ['..y..', '.yyy.', 'yywyy', '.yyy.', '.y.y.'];

  let SPR = null;
  function sprites() {
    if (SPR) return SPR;
    SPR = {
      girl: loadImg('assets/girl.png'),   // 去砍树的她
      boy: loadImg('assets/boy.png'),     // 在家等的他
      star: G.makeSprite(STAR, { y: '#ffd23f', w: '#ffffff' }),
      tree: pine(18, 30, false),
      bigTree: pine(28, 46, false),   // 进屋后的近景大树
      bgTree: pine(8, 14, true),
      forest: {},
    };
    for (const [, w, h] of FOREST) SPR.forest[w + 'x' + h] = pine(w, h, false);
    SPR.spots = ornamentSpots(SPR.bigTree);
    SPR.lights = lightPoints(SPR.bigTree);
    return SPR;
  }

  // 程序生成的松树（三层），带积雪
  function pine(w, h, dark) {
    const c = G.makeCanvas(w, h), x = c.getContext('2d');
    const cx = w / 2, th = Math.max(2, Math.round(h * 0.12)), b = h - th;
    const col = dark ? ['#16243f', '#1b2d4d', '#22385c'] : ['#1f6e4a', '#2f9e5e', '#5cc47e'];
    const snow = dark ? '#5a6c98' : '#ffffff';
    G.rect(cx - 1, b, 2, th, dark ? '#16243f' : '#5a3d2b', x);
    const layers = [[0, 0.45, 0, 0.3], [0.25, 0.72, 0.12, 0.4], [0.5, 1, 0.18, 0.5]];
    for (const [a, z, w0, w1] of layers) {
      const y0 = Math.round(a * b), y1 = Math.round(z * b);
      for (let y = y0; y < y1; y++) {
        const k = (y - y0) / Math.max(1, y1 - y0 - 1);
        const hw = Math.max(1, Math.round((w0 + (w1 - w0) * k) * w));
        G.rect(cx - hw, y, hw * 2, 1, col[0], x);
        G.rect(cx - hw, y, hw * 2 - 1, 1, col[1], x);
        G.rect(cx - hw, y, Math.max(1, Math.round(hw * 0.5)), 1, col[2], x);
        if (y === y1 - 1) { G.rect(cx - hw, y, 2, 1, snow, x); G.rect(cx + hw - 2, y, 2, 1, snow, x); }
      }
    }
    G.rect(cx - 1, 0, 2, 1, snow, x);
    return c;
  }

  // 像素级旋转（最近邻取样，保持硬边），支点在树根
  const rotCache = {};
  function rotTree(deg) {
    const key = Math.round(deg / 5) * 5;
    if (rotCache[key]) return rotCache[key];
    const img = SPR.tree, w = img.width, h = img.height, px = w / 2, py = h;
    const R = Math.ceil(Math.hypot(w, h)) + 1, size = R * 2;
    const src = img.getContext('2d').getImageData(0, 0, w, h).data;
    const c = G.makeCanvas(size, size), x = c.getContext('2d'), out = x.createImageData(size, size), d = out.data;
    const a = key * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const dx = i + 0.5 - R, dy = j + 0.5 - R;
        const si = Math.floor(cos * dx + sin * dy + px), sj = Math.floor(-sin * dx + cos * dy + py);
        if (si < 0 || sj < 0 || si >= w || sj >= h) continue;
        const k = (sj * w + si) * 4;
        if (!src[k + 3]) continue;
        const o = (j * size + i) * 4;
        d[o] = src[k]; d[o + 1] = src[k + 1]; d[o + 2] = src[k + 2]; d[o + 3] = 255;
      }
    }
    x.putImageData(out, 0, 0);
    return (rotCache[key] = { c, R });
  }

  // 按树的形状自动找挂装饰的位置
  function rowSpan(data, w, y) {
    let l = -1, r = -1;
    for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3]) { if (l < 0) l = x; r = x; }
    return [l, r];
  }
  function ornamentSpots(img) {
    const w = img.width, d = img.getContext('2d').getImageData(0, 0, w, img.height).data, spots = [];
    for (let y = 5, row = 0; y < img.height - 5; y += 3, row++) {
      const [l, r] = rowSpan(d, w, y);
      if (l < 0 || r - l < 4) continue;
      (row % 2 ? [0.25, 0.75] : [0.5]).forEach(f => spots.push([Math.round(l + 1 + (r - l - 2) * f), y]));
    }
    // 打乱顺序，挂上去的时候看起来更随意
    return spots.map((s, i) => [s, (i * 7) % spots.length]).sort((a, b) => a[1] - b[1]).map(s => s[0]).slice(0, 16);
  }
  function lightPoints(img) {
    const w = img.width, d = img.getContext('2d').getImageData(0, 0, w, img.height).data, pts = [];
    for (const y of [10, 18, 26, 33]) {
      const [l, r] = rowSpan(d, w, y);
      for (let s = 0; s <= 7; s++) pts.push([Math.round(l + (r - l) * s / 7), Math.round(y + 3 * s / 7)]);
    }
    return pts;
  }

  // 2x2 抖动的像素风淡入淡出（在原分辨率上画，所以每格 2px）
  const FADE = [1, 2, 3].map(l => {
    const c = G.makeCanvas(4, 4), x = c.getContext('2d'), B = [[0, 2], [3, 1]];
    x.fillStyle = '#000';
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) if (B[j][i] < l) x.fillRect(i * 2, j * 2, 2, 2);
    return c;
  });
  function fade(k, w, h) {
    const l = Math.round(G.clamp(k, 0, 1) * 4);
    if (!l) return;
    const c = G.ctx;
    c.fillStyle = l >= 4 ? '#000' : c.createPattern(FADE[l - 1], 'repeat');
    c.fillRect(0, 0, w, h);
  }

  function logo(s, y, col, scale) {
    const cx = G.W / 2, o = { scale, align: 'center' };
    [[-1, 0], [1, 0], [0, -1], [0, 1], [0, scale], [-1, scale], [1, scale]].forEach(([dx, dy]) =>
      G.text(s, cx + dx, y + dy, Object.assign({}, o, { color: '#1b1433' })));
    G.text(s, cx, y, Object.assign({}, o, { color: col }));
    G.ctx.save();
    G.ctx.beginPath();
    G.ctx.rect(0, y, G.W, scale);
    G.ctx.clip();
    G.text(s, cx, y, Object.assign({}, o, { color: '#fff6d0' }));
    G.ctx.restore();
  }

  G.Intro = function () {
    const A = G.audio, P = sprites();
    const S = { phase: 'gift', gt: 0, open: 0, t: 0, ei: 0, parts: [], floats: [], hops: {}, heartT: 0, skipTap: null, leaving: 0, gone: false };
    const flakes = Array.from({ length: 50 }, () => ({ x: G.rand(0, 90), y: G.rand(0, 200), v: G.rand(6, 14), ph: G.rand(0, 6) }));
    const stars = Array.from({ length: 28 }, () => ({ x: Math.floor(G.rand(0, 90)), y: Math.random(), p: G.rand(0, 6.28) }));
    let wb = null, sky = null, skyKey = '';

    const dims = () => { const H2 = Math.ceil(G.H / 2); return { W2: G.W / 2, H2, gy: Math.round(H2 * 0.74) }; };
    const part = o => S.parts.push(Object.assign({ vx: 0, vy: 0, g: 0, s: 1 }, o));
    const float = (text, x, y) => S.floats.push({ text, x, y, life: 0.9 });
    // 跳一下：who = 'girl' | 'boy'，h 为原分辨率像素
    const hop = (who, dur, h) => { S.hops[who] = { t0: S.t, dur, h }; };
    const hopY = who => {
      const h = S.hops[who];
      if (!h || S.t - h.t0 > h.dur) return 0;
      return -Math.round(Math.sin((S.t - h.t0) / h.dur * Math.PI) * h.h);
    };

    // ---------- 剧情事件（到点触发音效 / 粒子） ----------
    const events = [];
    const at = (t, fn) => events.push({ t, fn });
    for (let t = T.walk; t < T.chop; t += 0.25) at(t, () => A.play('crunch'));
    for (let t = T.drag; t < T.fadeOut; t += 0.3) at(t, () => A.play('crunch'));
    HITS.forEach(h => at(h, () => {
      const { gy } = dims();
      A.play('chop');
      G.shake = 1.5;
      for (let i = 0; i < 6; i++) {
        part({ x: TREE_X, y: gy - 4, vx: G.rand(-40, 30), vy: G.rand(-60, -20), g: 200, life: 0.5, c: G.pick(['#c8a070', '#ffffff']) });
      }
      float('咚!', TREE_X + 4, gy - 22);
    }));
    at(T.land, () => {
      const { gy } = dims();
      A.play('thud');
      G.shake = 5;
      for (let i = 0; i < 16; i++) {
        part({ x: TREE_X + G.rand(0, 30), y: gy - 2, vx: G.rand(-20, 20), vy: G.rand(-40, -10), g: 80, life: 0.7, c: '#ffffff' });
      }
      float('TIMBER!', TREE_X + 18, gy - 20);
    });
    at(T.land + 0.1, () => { A.play('jump'); hop('girl', 0.35, 12); });
    P.spots.forEach((_, i) => at(T.deco + i * ORN_GAP, () => { A.play('ding', i); hop(i % 2 ? 'boy' : 'girl', 0.2, 6); }));
    at(T.lights, () => A.play('sparkle'));
    at(T.throwStar, () => { A.play('jump'); hop('girl', 0.4, 16); });
    at(T.star, () => {
      const { gy } = dims();
      A.play('sparkle');
      A.play('ding', 11);
      hop('boy', 0.35, 10);
      G.flash = 0.4;
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        part({ x: IN_TREE_X, y: gy - 47, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, life: 0.6, c: G.pick(['#ffd23f', '#ffffff']) });
      }
    });
    events.sort((a, b) => a.t - b.t);

    // ---------- 她在每个时刻的状态（世界坐标） ----------
    const GRAB_X = TREE_X - 4;            // 拖树时手的位置正好在树根
    const DRAG_DONE = T.fadeOut - 0.4;
    function girl(t) {
      if (t < T.walk) return { x: DOOR_X, axe: 'shoulder', hidden: t < 0.4 };
      if (t < T.chop) {
        const k = (t - T.walk) / (T.chop - T.walk);
        return { x: DOOR_X + (CHOP_X - DOOR_X) * k, walk: true, axe: 'shoulder' };
      }
      if (t < T.fall) {
        const p = ((t - T.chop) % 0.8) / 0.8;
        return { x: CHOP_X, axe: p < 0.6 ? 'up' : 'down' };
      }
      if (t < T.turn) return { x: CHOP_X, axe: 'shoulder' };
      if (t < T.drag) {
        const k = (t - T.turn) / (T.drag - T.turn);
        return { x: CHOP_X + (GRAB_X - CHOP_X) * k, walk: true, axe: 'shoulder' };
      }
      const k = Math.min(1, (t - T.drag) / (DRAG_DONE - T.drag));
      return { x: GRAB_X + (DOOR_X - GRAB_X) * k, flip: true, walk: k < 1, axe: 'shoulder', hidden: t > T.fadeOut - 0.3 };
    }

    // 在原分辨率上画角色：sx 为屏幕中心 x，ground 为屏幕上的地面 y
    function drawAvatar(img, sx, ground, o = {}) {
      const X = Math.round(sx), f = o.flip ? -1 : 1;
      const r = (ox, oy, w, h, c) => G.rect(f > 0 ? X + ox : X - ox - w, ground + oy, w, h, c);
      if (o.axe === 'shoulder') { r(-11, -32, 2, 22, HANDLE); r(-17, -35, 8, 6, METAL); r(-17, -35, 2, 6, '#ffffff'); }
      const bob = o.walk ? -(Math.floor(S.t * 6) % 2) * 2 : 0;
      if (img.complete && img.naturalWidth) G.draw(img, X - 16, ground - 40 + bob + (o.dy || 0), 1, o.flip);
      if (o.axe === 'up') { r(8, -36, 2, 26, HANDLE); r(8, -40, 9, 6, METAL); r(15, -40, 2, 6, '#ffffff'); }
      if (o.axe === 'down') { r(8, -11, 12, 2, HANDLE); r(18, -15, 6, 9, METAL); r(22, -15, 2, 9, '#ffffff'); }
    }

    // ---------- 室外 ----------
    function drawOutdoorBg(cam, d) {
      const { W2, H2, gy } = d;
      if (skyKey !== W2 + 'x' + gy) { sky = G.bands(W2, gy, NIGHT); skyKey = W2 + 'x' + gy; }
      G.ctx.drawImage(sky, 0, 0);
      for (const s of stars) {
        if (Math.sin(G.t * 3 + s.p) > -0.3) G.rect(s.x, Math.floor(s.y * (gy - 30)), 1, 1, '#c8c8ff');
      }
      G.circle(70, 30, 7, '#fff3b0');
      G.rect(67, 27, 2, 2, '#e8d98a');
      G.rect(72, 32, 2, 1, '#e8d98a');
      for (let i = 0; i < W2; i += 2) {
        const wx = i + cam * 0.25, h = Math.round(18 + Math.sin(wx * 0.06) * 6 + Math.sin(wx * 0.15) * 3);
        G.rect(i, gy - h, 2, h, '#2b3a6e');
        G.rect(i, gy - h, 2, 1, '#8ea0c8');
      }
      const off = cam * 0.55;
      for (let k = Math.floor(off / 9) - 1; k * 9 - off < W2; k++) {
        G.draw(P.bgTree, k * 9 - off + ((k * 5) & 3), gy - 13 - ((k * 3) & 1));
      }
      G.rect(0, gy, W2, H2 - gy, '#dfe8fb');
      G.rect(0, gy, W2, 1, '#ffffff');
      for (let wx = Math.floor(cam / 6) * 6; wx < cam + W2; wx += 6) {
        G.rect(wx - cam + (wx * 13) % 4, gy + 3 + (wx * 7) % 12, 2, 1, '#c4d4f0');
      }
    }

    // 窗户玻璃区域（世界坐标，相对房子），他会出现在这里
    const WIN = { x: 8, y: -24, w: 18, h: 13 };
    const BULBS = ['#ff4d6d', '#ffd23f', '#5bc0eb', '#7bd389'];
    function drawHouse(cam, gy, doorOpen) {
      const x = HOUSE_X - cam, blink = Math.floor(G.t * 3);

      // 窗户和门透出的暖光洒在雪地上
      for (const [lx, lw] of [[WIN.x - 2, WIN.w + 4], [35, 17]]) {
        for (let j = 1; j < 7; j++) {
          for (let i = 0; i < lw; i++) if ((i + j) % 2 === 0 && (j < 4 || (i + j) % 4 === 0)) G.rect(x + lx + i, gy + j, 1, 1, '#f7f0d8');
        }
      }

      // 砖砌烟囱 + 炊烟
      const cx = x + 40;
      G.rect(cx, gy - 50, 7, 16, '#8a4a3a');
      for (let r = 0; r < 5; r++) {
        const yy = gy - 48 + r * 3;
        G.rect(cx, yy, 7, 1, '#6a3628');
        G.rect(cx + (r % 2 ? 2 : 5), yy - 2, 1, 2, '#6a3628');
      }
      G.rect(cx - 1, gy - 52, 9, 3, '#ffffff');
      G.rect(cx + 1, gy - 49, 2, 1, '#ffffff');
      for (let k = 0; k < 4; k++) {
        const p = (G.t * 0.4 + k / 4) % 1;
        if (p > 0.85 && Math.floor(G.t * 20) % 2) continue;
        G.rect(cx + 2 + Math.round(Math.sin(p * 6 + k) * 3), gy - 55 - Math.round(p * 20), p > 0.5 ? 3 : 2, 2, '#9aa5b8');
      }

      // 原木墙 + 石头地基
      const wx = x + 2, ww = 56;
      for (let y = gy - 30; y < gy - 3; y += 3) {
        G.rect(wx, y, ww, 3, '#8a5a3c');
        G.rect(wx, y, ww, 1, '#a8714a');
        G.rect(wx, y + 2, ww, 1, '#6f4630');
        for (const ex of [wx - 1, wx + ww - 1]) { G.rect(ex, y, 2, 3, '#c8a070'); G.rect(ex, y + 1, 2, 1, '#a07850'); }
      }
      G.rect(wx - 1, gy - 3, ww + 2, 3, '#6b5f8a');
      G.rect(wx - 1, gy - 3, ww + 2, 1, '#8a80a8');
      for (let i = 0; i < ww + 2; i += 5) G.rect(wx - 1 + i, gy - 2, 1, 2, '#4f4570');

      // 瓦片屋顶 + 积雪
      for (let i = 0; i < 20; i++) {
        const w = 64 - i * 3, rx = x - 2 + i * 1.5, ry = gy - 31 - i;
        G.rect(rx, ry, w, 1, i % 2 ? '#7a2e3a' : '#8e2f3e');
        for (let k = (i % 2) * 2; k < w; k += 4) G.rect(rx + k, ry, 1, 1, '#5e2230');
        if (i >= 13) G.rect(rx, ry, w, 1, i === 13 ? '#e6eefc' : '#ffffff');
        else { const s = 2 + ((i * 7) % 3); G.rect(rx, ry, s, 1, '#ffffff'); G.rect(rx + w - s, ry, s, 1, '#ffffff'); }
      }
      G.rect(x - 3, gy - 31, 66, 2, '#ffffff');
      G.rect(x - 3, gy - 29, 66, 1, '#c4d4f0');
      for (const ix of [1, 4, 58, 61]) G.rect(x + ix, gy - 28, 1, 1 + (ix % 3), '#dff4ff');

      // 屋檐下的彩灯串
      for (let i = 0, k = 0; i < 56; i += 4, k++) {
        const ly = gy - 27 + (k % 2);
        G.rect(x + 4 + i, ly - 1, 4, 1, '#2b1d1a');
        G.rect(x + 5 + i, ly, 1, 2, (k + blink) % 4 ? BULBS[k % 4] : '#4a3a3a');
      }

      // 窗户：百叶窗、奶油色窗框、暖光玻璃、积雪花箱
      const wnx = x + WIN.x, wny = gy + WIN.y;
      for (const sx of [wnx - 5, wnx + WIN.w + 1]) {
        G.rect(sx, wny - 1, 4, WIN.h + 2, '#2f6e4a');
        for (let j = 1; j < WIN.h; j += 2) G.rect(sx + 1, wny + j, 2, 1, '#245a3c');
      }
      G.rect(wnx - 1, wny - 1, WIN.w + 2, WIN.h + 2, '#f3e6c8');
      G.rect(wnx, wny, WIN.w, WIN.h, '#ffcf5a');
      G.rect(wnx, wny, WIN.w, 3, '#ffe58a');
      G.rect(wnx - 2, wny + WIN.h + 1, WIN.w + 4, 3, '#6f4630');
      G.rect(wnx - 2, wny + WIN.h + 1, WIN.w + 4, 1, '#ffffff');
      for (const bx of [2, 7, 13, 18]) G.rect(wnx + bx, wny + WIN.h + 2, 1, 1, '#e23b4b');

      // 门：门框、木板门、小窗、花环、石阶、壁灯
      const dx = x + 37, dt = gy - 25;
      G.rect(dx - 2, dt - 2, 17, 24, '#f3e6c8');
      if (doorOpen) {
        G.rect(dx, dt, 13, 22, '#ffb347');
        G.rect(dx, dt, 13, 3, '#ffd27a');
      } else {
        G.rect(dx, dt, 13, 22, '#7a4a2c');
        for (let i = 3; i < 13; i += 3) G.rect(dx + i, dt, 1, 22, '#5e3820');
        G.rect(dx + 4, dt + 2, 5, 3, '#ffd23f');
        G.rect(dx + 10, dt + 13, 2, 2, '#ffd23f');
        G.circle(dx + 6.5, dt + 11, 4, '#2f9e5e');
        G.circle(dx + 6.5, dt + 11, 2, '#7a4a2c');
        G.rect(dx + 4, dt + 9, 1, 1, '#e23b4b');
        G.rect(dx + 9, dt + 12, 1, 1, '#e23b4b');
        G.rect(dx + 5, dt + 14, 3, 2, '#e23b4b');
      }
      G.rect(dx - 3, gy - 3, 19, 3, '#9a90b8');
      G.rect(dx - 3, gy - 3, 19, 1, '#ffffff');
      G.rect(x + 52, gy - 21, 4, 1, '#2b2b3a');
      G.rect(x + 53, gy - 20, 3, 4, '#2b2b3a');
      G.rect(x + 54, gy - 19, 1, 2, Math.floor(G.t * 6) % 3 ? '#ffd23f' : '#ffb347');

      // 墙根的雪堆
      for (let i = 0; i < 56; i += 6) if (i < 32 || i > 50) G.rect(x + 1 + i, gy - 2, 5, 2, '#ffffff');

      // 雪人
      const sm = x + 70;
      G.circle(sm, gy - 4, 4, '#ffffff');
      G.circle(sm, gy - 11, 3, '#ffffff');
      G.rect(sm + 2, gy - 6, 1, 4, '#c4d4f0');
      G.rect(sm - 1, gy - 12, 1, 1, '#1b1433');
      G.rect(sm + 1, gy - 12, 1, 1, '#1b1433');
      G.rect(sm, gy - 11, 2, 1, '#ff9f1c');
      G.rect(sm - 3, gy - 8, 6, 1, '#e23b4b');
      G.rect(sm + 1, gy - 7, 1, 2, '#e23b4b');
      G.rect(sm, gy - 5, 1, 1, '#1b1433');
      G.rect(sm, gy - 3, 1, 1, '#1b1433');
      G.rect(sm - 7, gy - 9, 4, 1, '#5a3d2b');
      G.rect(sm + 4, gy - 10, 4, 1, '#5a3d2b');
      G.rect(sm - 3, gy - 14, 7, 1, '#1b1433');
      G.rect(sm - 2, gy - 17, 5, 3, '#1b1433');
      G.rect(sm - 2, gy - 15, 5, 1, '#e23b4b');
    }

    // 窗户里的他（原分辨率），窗帘和窗格画在他前面
    function drawBoyInWindow(cam, gy) {
      const x0 = (HOUSE_X + WIN.x - cam) * 2, y0 = (gy + WIN.y) * 2, w = WIN.w * 2, h = WIN.h * 2;
      if (x0 + w < 0) return;
      const c = G.ctx;
      c.save();
      c.beginPath();
      c.rect(x0, y0, w, h);
      c.clip();
      // 往上提一点，让脸露在窗户正中
      G.draw(P.boy, x0 + w / 2 - 16, y0 - 7 + (Math.floor(G.t * 1.5) % 2), 1);
      c.restore();
      for (const cx of [x0, x0 + w - 4]) {
        G.rect(cx, y0, 4, h, '#c22f40');
        G.rect(cx + (cx === x0 ? 3 : 0), y0, 1, h, '#e23b4b');
        G.rect(cx, y0 + 14, 4, 2, '#ffd23f');
      }
    }

    function drawOutside(t, d) {
      const { gy } = d, h = girl(t);
      const cam = Math.round(G.clamp(h.x - 45, 0, WORLD - d.W2));
      drawOutdoorBg(cam, d);
      drawHouse(cam, gy, t < T.walk || t > T.fadeOut - 0.6);
      for (const [fx, w, hh] of FOREST) G.draw(P.forest[w + 'x' + hh], fx - w / 2 - cam, gy - hh);

      // 要砍的那棵树
      if (t < T.fall) {
        const hit = HITS.some(x => t >= x && t - x < 0.15);
        const off = hit ? (Math.floor(t * 40) % 2 ? 1 : -1) : 0;
        G.draw(P.tree, TREE_X - 9 + off - cam, gy - 30);
      } else {
        G.rect(TREE_X - 1 - cam, gy - 2, 2, 2, '#5a3d2b');
        G.rect(TREE_X - 1 - cam, gy - 2, 2, 1, '#c8a070');
        const deg = t < T.land ? 90 * Math.pow((t - T.fall) / (T.land - T.fall), 2) : 90;
        const px = t >= T.drag ? Math.round(h.x) + 4 : TREE_X;
        if (t >= T.drag) G.rect(px - cam, gy + 1, TREE_X - px, 1, '#b8c8e8');
        const fr = rotTree(deg), py = gy - Math.round(9 * Math.sin(deg * Math.PI / 180));
        G.ctx.drawImage(fr.c, Math.round(px - fr.R - cam), Math.round(py - fr.R));
      }
      return { cam, h };
    }

    // ---------- 室内 ----------
    function drawInside(t, d) {
      const { W2, H2, gy } = d;
      G.rect(0, 0, W2, gy, '#1e3a2f');
      for (let x = 3; x < W2; x += 6) G.rect(x, 0, 1, gy, '#23443a');
      G.rect(0, gy - 3, W2, 3, '#5a3d2b');

      // 墙上的一串彩灯（树上的灯亮起后开始闪）
      const gl = gy - 62, blinkG = Math.floor(G.t * 3);
      for (let x = 0; x < W2; x++) G.rect(x, gl + Math.round(Math.sin(x / W2 * Math.PI * 3) ** 2 * 4), 1, 1, '#16302a');
      for (let x = 4, i = 0; x < W2; x += 8, i++) {
        const y = gl + Math.round(Math.sin(x / W2 * Math.PI * 3) ** 2 * 4) + 1;
        const lit = t >= T.lights && (i + blinkG) % 3 !== 0;
        G.rect(x, y, 2, 2, lit ? ORN_COLORS[i % 3] : '#2b4a40');
      }

      const wx = 40, wy = gy - 46;
      G.rect(wx, wy, 20, 18, '#5a3d2b');
      G.rect(wx + 1, wy + 1, 18, 16, '#1a1f4f');
      for (let i = 0; i < 8; i++) {
        G.rect(wx + 2 + (i * 5) % 16, wy + 1 + Math.floor((G.t * 8 + i * 7) % 15), 1, 1, '#ffffff');
      }
      G.rect(wx + 9, wy + 1, 2, 16, '#5a3d2b');
      G.rect(wx + 1, wy + 8, 18, 1, '#5a3d2b');
      G.rect(wx + 1, wy + 15, 18, 2, '#ffffff');

      const fx = 66;   // 壁炉左边
      G.rect(fx + 6, gy - 42, 12, 10, '#ffd23f');
      G.rect(fx + 7, gy - 41, 10, 8, '#fff6d0');
      G.draw(G.SPR.heartS, fx + 9, gy - 40);
      G.rect(fx, gy - 20, 24, 20, '#7a6e98');
      for (let y = gy - 16; y < gy; y += 4) G.rect(fx, y, 24, 1, '#6b5f8a');
      G.rect(fx + 5, gy - 12, 14, 12, '#1b1433');
      const fl = Math.floor(G.t * 10);
      for (let i = 0; i < 5; i++) {
        const h = 3 + ((fl + i * 3) % 4);
        G.rect(fx + 6 + Math.round(i * 2.4), gy - h - 1, 2, h, i % 2 ? '#ff9f1c' : '#ffd23f');
      }
      G.rect(fx + 6, gy - 2, 12, 2, '#5a3d2b');
      G.rect(fx - 2, gy - 22, 28, 3, '#5a3d2b');
      for (const sx of [fx + 3, fx + 14]) {
        G.rect(sx, gy - 20, 6, 2, '#ffffff');
        G.rect(sx + 1, gy - 18, 4, 6, '#e23b4b');
        G.rect(sx + 1, gy - 13, 6, 2, '#e23b4b');
      }

      G.rect(0, gy, W2, H2 - gy, '#7a4f32');
      for (let y = gy + 5, n = 0; y < H2; y += 6, n++) {
        G.rect(0, y, W2, 1, '#6a432a');
        for (let x = (n % 2) * 9; x < W2; x += 18) G.rect(x, y - 5, 1, 5, '#6a432a');
      }

      G.rect(IN_TREE_X - 15, gy - 1, 30, 2, '#e23b4b');
      G.rect(IN_TREE_X - 12, gy - 2, 24, 1, '#e23b4b');
      const tx = IN_TREE_X - 14, ty = gy - 46;
      G.draw(P.bigTree, tx, ty);

      const n = G.clamp(Math.floor((t - T.deco) / ORN_GAP) + 1, 0, P.spots.length);
      for (let i = 0; i < n; i++) {
        const [ox, oy] = P.spots[i], fresh = t - (T.deco + i * ORN_GAP) < 0.12;
        G.rect(tx + ox, ty + oy, 1, 1, fresh ? '#ffffff' : ORN_COLORS[i % ORN_COLORS.length]);
      }
      if (t >= T.lights) {
        const blink = Math.floor(G.t * 4);
        P.lights.forEach(([ox, oy], i) => {
          if (t - T.lights > i * 0.03) G.rect(tx + ox, ty + oy, 1, 1, (i + blink) % 2 ? '#ffd23f' : '#fff6d0');
        });
      }
      if (t >= T.star) {
        G.rect(4, gy - 6, 7, 6, '#5bc0eb');
        G.rect(7, gy - 6, 1, 6, '#ffffff');
        G.rect(4, gy - 4, 7, 1, '#ffffff');
        G.rect(34, gy - 5, 6, 5, '#b388ff');
        G.rect(36, gy - 5, 2, 5, '#ffd23f');
        G.draw(P.star, IN_TREE_X - 2, gy - 49);
        if (Math.floor(G.t * 3) % 2) {
          for (const [dx, dy] of [[-4, -4], [4, -4], [-4, 2], [4, 2]]) G.rect(IN_TREE_X + dx, gy - 47 + dy, 1, 1, '#fff6d0');
        }
      } else if (t >= T.throwStar) {
        const p = (t - T.throwStar) / (T.star - T.throwStar);
        const sx = IN_GIRL_X - 4 + (IN_TREE_X - IN_GIRL_X + 4) * p, sy = gy - 14 + (-33) * p - Math.sin(p * Math.PI) * 14;
        G.draw(P.star, sx - 2, sy - 2);
      }
    }

    // ---------- 礼物盒 ----------
    function drawGift(d) {
      const { W2, gy } = d, cx = W2 / 2;
      const wiggle = !S.open && G.t % 2 < 0.3 ? (Math.floor(G.t * 30) % 2 ? 1 : -1) : 0;
      const x = cx - 15 + wiggle, y = gy + 3 - 22;
      G.rect(x - 1, y, 32, 23, '#1b1433');
      G.rect(x, y, 30, 22, '#e23b4b');
      G.rect(x + 26, y, 4, 22, '#c22f40');
      G.rect(x, y + 18, 30, 4, '#a8283a');
      G.rect(x + 13, y, 4, 22, '#ffd23f');
      G.rect(x + 16, y, 1, 22, '#e08e0b');
      if (S.open) {
        // 打开后从盒子里射出的光
        for (let i = 0; i < 6; i++) {
          if ((i + Math.floor(G.t * 12)) % 3) G.rect(x + 3 + i * 5, y - 40, 2, 40, '#fff6d0');
        }
      }
      const ly = y - 6 + (S.open ? -Math.round(S.open * 120) : (wiggle ? -1 : 0)), lx = x + (S.open ? Math.round(S.open * 30) : 0);
      G.rect(lx - 3, ly - 1, 36, 8, '#1b1433');
      G.rect(lx - 2, ly, 34, 6, '#ff5d6d');
      G.rect(lx - 2, ly + 5, 34, 1, '#a8283a');
      G.rect(lx + 13, ly, 4, 6, '#ffd23f');
      G.rect(lx + 7, ly - 5, 6, 5, '#ffd23f');
      G.rect(lx + 17, ly - 5, 6, 5, '#ffd23f');
      G.rect(lx + 9, ly - 4, 2, 3, '#e08e0b');
      G.rect(lx + 19, ly - 4, 2, 3, '#e08e0b');
      G.rect(lx + 13, ly - 4, 4, 4, '#e08e0b');
    }

    function drawCaption(t) {
      const c = CAPTIONS.find(c => t >= c[0] && t < c[1]);
      if (!c) return;
      const s = Array.from(c[2]).slice(0, Math.floor((t - c[0]) * 16)).join('');
      G.box(8, 8, G.W - 16, 24, '#1b1433', '#ffffff');
      G.text(s, 16, 16, { color: '#ffffff' });
    }

    return {
      update(dt) {
        const { H2 } = dims();
        for (const f of flakes) {
          f.y += f.v * dt;
          f.x += Math.sin(G.t + f.ph) * 0.1;
          if (f.y > H2) { f.y = -2; f.x = G.rand(0, 90); }
        }
        for (const p of S.parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
        S.parts = S.parts.filter(p => p.life > 0);
        for (const f of S.floats) { f.y -= 14 * dt; f.life -= dt; }
        S.floats = S.floats.filter(f => f.life > 0);

        if (S.phase === 'gift') {
          S.gt += dt;
          if (S.open && (S.open += dt) > 1.3) { S.phase = 'story'; S.t = 0; S.parts = []; }
          return;
        }
        S.t += dt;
        while (S.ei < events.length && events[S.ei].t <= S.t) events[S.ei++].fn();
        // 结尾：两人中间不停冒出小爱心
        if (S.t > T.title && (S.heartT -= dt) <= 0) {
          S.heartT = 0.7;
          const { gy } = dims();
          part({ spr: G.SPR.heartS, x: (IN_GIRL_X + IN_BOY_X) / 2 + G.rand(-3, 3), y: gy - 24, vx: G.rand(-4, 4), vy: -10, life: 1.8 });
        }
        if (S.leaving && (S.leaving += dt) > 0.4 && !S.gone) {
          S.gone = true;
          G.transition(() => G.Stage());
        }
      },

      draw(ctx) {
        const d = dims(), t = S.t;
        if (!wb || wb.width !== d.W2 || wb.height !== d.H2) wb = G.makeCanvas(d.W2, d.H2);
        const main = G.ctx;
        G.ctx = wb.getContext('2d');
        G.ctx.imageSmoothingEnabled = false;

        let cam = 0, h = null;
        const outside = S.phase === 'gift' || t < T.inside;
        if (S.phase === 'gift') {
          drawOutdoorBg(0, d);
          drawGift(d);
        } else if (outside) {
          ({ cam, h } = drawOutside(t, d));
        } else {
          drawInside(t, d);
        }
        for (const p of S.parts) {
          if (p.life < 0.2 && Math.floor(G.t * 20) % 2) continue;
          if (p.spr) G.draw(p.spr, p.x - cam - 2, p.y - 2);
          else G.rect(p.x - cam, p.y, p.s, p.s, p.c);
        }
        if (outside) {
          for (const f of flakes) G.rect(((f.x - cam * 0.3) % d.W2 + d.W2) % d.W2, f.y, 1, 1, '#ffffff');
        }

        G.ctx = main;
        ctx.drawImage(wb, 0, 0, d.W2 * 2, d.H2 * 2);

        // ---- 原分辨率：角色 ----
        const W = G.W, gy2 = d.gy * 2;
        if (S.phase === 'story') {
          if (outside) {
            drawBoyInWindow(cam, d.gy);
            if (!h.hidden) drawAvatar(P.girl, (h.x - cam) * 2, gy2, Object.assign({ dy: hopY('girl') }, h));
          } else {
            drawAvatar(P.boy, IN_BOY_X * 2, gy2, { dy: hopY('boy') });
            drawAvatar(P.girl, IN_GIRL_X * 2, gy2, { dy: hopY('girl') });
          }
        }

        // 淡入淡出盖在角色上面
        if (S.phase === 'gift') fade((S.open - 0.8) / 0.4, W, G.H);
        else if (t < 0.6) fade(1 - t / 0.6, W, G.H);
        else if (t >= T.fadeOut && t < T.inside) fade((t - T.fadeOut) / (T.inside - T.fadeOut), W, G.H);
        else if (t >= T.inside && t < T.inside + 0.6) fade(1 - (t - T.inside) / 0.6, W, G.H);

        // ---- 原分辨率：文字 ----
        for (const f of S.floats) G.text(f.text, (f.x - cam) * 2, f.y * 2, { color: '#ffffff', align: 'center', shadow: '#1b1433' });

        if (S.phase === 'gift') {
          if (S.open) return;
          // 放在月亮下方，避免和月亮重叠
          G.text('给' + TO + '的圣诞礼物', W / 2, Math.max(90, Math.round(G.H * 0.3)), { color: '#ffd23f', align: 'center', shadow: '#1b1433', wave: true });
          if (Math.floor(G.t * 2.5) % 2 === 0) G.text('TAP TO OPEN', W / 2, gy2 + 26, { color: '#1b1433', align: 'center' });
          G.text('(记得打开声音哦)', W / 2, G.H - 22, { color: '#8ea0c8', align: 'center' });
          return;
        }

        drawCaption(t);
        if (t >= T.title) {
          const drop = (t0, ty) => Math.round(-40 + (ty + 40) * G.ease.outBounce(G.clamp((t - t0) / 0.8, 0, 1)));
          const bob = t > T.ready ? Math.round(Math.sin(G.t * 2) * 1.5) : 0;
          logo('MERRY', drop(T.title, 16) + bob, '#ff4d6d', 3);
          logo('CHRISTMAS', drop(T.title + 0.25, 46) + bob, '#ffd23f', 2);
          if (t > T.title + 1) G.text('~ 圣诞快乐 ~', W / 2, 72, { color: '#ffffff', align: 'center', shadow: '#1b1433' });
        }
        if (t >= T.ready) {
          const on = S.leaving ? Math.floor(G.t * 12) % 2 : Math.floor(G.t * 2.5) % 2 === 0;
          if (on) G.text('TAP TO CONTINUE', W / 2, gy2 + 18, { color: '#ffffff', align: 'center', shadow: '#1b1433' });
          G.text('点击屏幕继续', W / 2, gy2 + 36, { color: '#ffd23f', align: 'center', wave: true });
        }
      },

      // 礼物盒：松手时拆开（这次点击同时解锁音频）
      // 剧情中：按下 = 跳到结尾；结尾时松手 = 进入互动页
      down(x, y, id) {
        if (S.phase !== 'story') return;
        if (S.t < T.ready) {
          S.t = T.ready;
          S.ei = events.length;
          S.parts = [];
          S.floats = [];
          S.hops = {};
          G.flash = 0.6;
          S.skipTap = id;
        } else {
          S.skipTap = null;
        }
      },
      up(x, y, id) {
        if (S.phase === 'gift') {
          if (S.open) return;
          A.unlock();
          A.play('pop');
          A.startBgm();
          G.flash = 0.8;
          S.open = 0.0001;
          const { W2, gy } = dims();
          for (let i = 0; i < 30; i++) {
            const a = G.rand(-Math.PI, 0), sp = G.rand(30, 90);
            part({ x: W2 / 2, y: gy - 22, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 60, life: G.rand(0.5, 1), c: G.pick(['#ffd23f', '#ffffff', '#ff4d6d']) });
          }
          return;
        }
        if (S.skipTap === id) { S.skipTap = null; return; }
        if (S.t >= T.ready && !S.leaving) {
          S.leaving = 0.0001;
          A.play('coin');
          G.flash = 0.4;
        }
      },
    };
  };
})();

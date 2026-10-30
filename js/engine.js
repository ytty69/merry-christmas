/* 像素引擎：低分辨率画布放大显示 + 场景 / 转场 / 输入 */
(function () {
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');

  const G = window.G = {
    W: 180,     // 逻辑宽度（像素数），高度按屏幕比例自动计算
    H: 320,
    t: 0,
    ctx,
    canvas,
    scene: null,
    trans: null,
    shake: 0,   // 屏幕震动强度
    flash: 0,   // 白闪 0~1
    CRT: true,  // 扫描线效果
  };

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const h = Math.max(240, Math.round(G.W * r.height / r.width));
    if (h !== G.H || canvas.width !== G.W) {
      G.H = h;
      canvas.width = G.W;
      canvas.height = h;
    }
    ctx.imageSmoothingEnabled = false;
  }

  // ---------- 绘制工具（坐标一律取整，保证像素对齐） ----------
  // 默认画在 G.ctx 上；场景可以临时把 G.ctx 换成离屏画布
  G.rect = (x, y, w, h, c, cx = G.ctx) => {
    cx.fillStyle = c;
    cx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // 切角像素框
  G.box = (x, y, w, h, fill, border, cx = G.ctx) => {
    x = Math.round(x); y = Math.round(y);
    cx.fillStyle = border;
    cx.fillRect(x + 1, y, w - 2, h);
    cx.fillRect(x, y + 1, w, h - 2);
    cx.fillStyle = fill;
    cx.fillRect(x + 1, y + 1, w - 2, h - 2);
  };

  // 阶梯像素圆
  G.circle = (x, y, r, c, cx = G.ctx) => {
    cx.fillStyle = c;
    for (let dy = -r; dy <= r; dy++) {
      const hw = Math.round(Math.sqrt(r * r - dy * dy));
      cx.fillRect(Math.round(x - hw), Math.round(y + dy), hw * 2, 1);
    }
  };

  G.makeCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  };

  // 用字符画 + 调色板生成精灵
  G.makeSprite = (rows, pal) => {
    const c = G.makeCanvas(rows[0].length, rows.length), x = c.getContext('2d');
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const col = pal[row[i]];
        if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
      }
    });
    return c;
  };

  G.draw = (img, x, y, s = 1, flip = false) => {
    const c = G.ctx;
    x = Math.round(x); y = Math.round(y);
    if (flip) {
      c.save();
      c.translate(x + img.width * s, y);
      c.scale(-1, 1);
      c.drawImage(img, 0, 0, img.width * s, img.height * s);
      c.restore();
    } else {
      c.drawImage(img, x, y, img.width * s, img.height * s);
    }
  };

  // 分段色带 + 抖动过渡（像素风渐变）
  G.bands = (w, h, colors) => {
    const c = G.makeCanvas(w, h), x = c.getContext('2d');
    const bh = h / colors.length;
    colors.forEach((col, i) => {
      x.fillStyle = col;
      x.fillRect(0, Math.floor(i * bh), w, Math.ceil(bh) + 1);
    });
    for (let i = 1; i < colors.length; i++) {
      const yb = Math.floor(i * bh);
      x.fillStyle = colors[i];
      for (let xx = 0; xx < w; xx++) {
        if ((xx + yb) % 2 === 0) x.fillRect(xx, yb - 1, 1, 1);
        if ((xx + yb) % 4 === 0) x.fillRect(xx, yb - 2, 1, 1);
      }
    }
    return c;
  };

  G.ease = {
    outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    outBounce: t => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
    inOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  };
  G.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  G.rand = (a, b) => a + Math.random() * (b - a);
  G.pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // ---------- 场景与转场 ----------
  G.setScene = s => { G.scene = s; };

  const TD = 0.35;
  G.transition = make => {
    if (!G.trans) G.trans = { t: 0, out: true, make };
  };

  function stepTrans(dt) {
    const tr = G.trans;
    if (!tr) return;
    tr.t += dt;
    if (tr.t < TD) return;
    if (tr.out) { G.setScene(tr.make()); tr.out = false; tr.t = 0; }
    else G.trans = null;
  }

  // 像素圆形遮罩（3px 一阶的块状边缘）
  function drawTrans() {
    const tr = G.trans;
    if (!tr) return;
    let p = G.ease.inOut(Math.min(1, tr.t / TD));
    if (tr.out) p = 1 - p;
    const cx = Math.round(G.W / 2), cy = G.H / 2, R = Math.hypot(G.W / 2, cy) * p;
    ctx.fillStyle = '#000';
    for (let y = 0; y < G.H; y += 3) {
      const dy = y + 1.5 - cy, h2 = R * R - dy * dy;
      if (h2 <= 0) { ctx.fillRect(0, y, G.W, 3); continue; }
      const hw = Math.round(Math.sqrt(h2) / 3) * 3;
      if (cx - hw > 0) ctx.fillRect(0, y, cx - hw, 3);
      if (cx + hw < G.W) ctx.fillRect(cx + hw, y, G.W - cx - hw, 3);
    }
  }

  function drawCRT() {
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    for (let y = 1; y < G.H; y += 2) ctx.fillRect(0, y, G.W, 1);
  }

  // ---------- 输入 ----------
  function local(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * G.W / r.width, (e.clientY - r.top) * G.H / r.height];
  }
  function call(name, e) {
    if (G.trans || !G.scene || !G.scene[name]) return;
    const [x, y] = local(e);
    G.scene[name](x, y, e.pointerId);
  }
  // 移动端浏览器只允许在用户手势里启动音频，所以每次触摸都尝试解锁
  const unlock = () => G.audio && G.audio.unlock();

  canvas.addEventListener('pointerdown', e => { e.preventDefault(); unlock(); call('down', e); });
  canvas.addEventListener('pointerup', e => { unlock(); call('up', e); });
  canvas.addEventListener('pointercancel', e => call('up', e));
  window.addEventListener('touchend', unlock, { passive: true });
  window.addEventListener('click', unlock);
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault());

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  if (window.visualViewport) visualViewport.addEventListener('resize', resize);

  // ---------- 主循环 ----------
  let last = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    G.t += dt;

    if (G.scene) G.scene.update(dt);
    stepTrans(dt);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, G.W, G.H);
    ctx.save();
    if (G.shake > 0) {
      const s = Math.ceil(G.shake);
      ctx.translate(Math.round(G.rand(-s, s)), Math.round(G.rand(-s, s)));
      G.shake = Math.max(0, G.shake - dt * 25);
    }
    if (G.scene) G.scene.draw(ctx);
    ctx.restore();

    if (G.flash > 0) {
      ctx.globalAlpha = Math.ceil(G.flash * 4) / 4 * 0.9;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, G.W, G.H);
      ctx.globalAlpha = 1;
      G.flash -= dt * 3;
    }
    drawTrans();
    if (G.CRT) drawCRT();

    requestAnimationFrame(frame);
  }

  G.start = scene => {
    resize();
    G.setScene(scene);
    requestAnimationFrame(n => { last = n; frame(n); });
  };
})();

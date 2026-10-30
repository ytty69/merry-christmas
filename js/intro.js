/* 开场动画：开机自检 → 白闪 → 夜空标题 + 小P走入 → 点击开始 */
(function () {
  const BOOT = [
    'PIXEL-BIOS V1.0',
    '(C) 2026 PIXEL LAB',
    '',
    'MEMORY ...... 640K OK',
    'SOUND ....... 8BIT OK',
    'SCREEN ...... 180PX OK',
    '',
    'LOADING',
  ];
  const CPS = 75;          // 打字速度（字/秒）
  const T_BAR = 1.45;      // 进度条开始
  const T_TITLE = 2.15;    // 进入标题画面
  const T_READY = 4.1;     // 出现「点击开始」
  const NIGHT = ['#0b0b1a', '#120f2e', '#1b1745', '#261d5c', '#33246e'];

  G.Intro = function () {
    const S = { t: 0, flashed: false, starting: 0, gone: false, skipTap: null };
    const stars = Array.from({ length: 46 }, () => ({
      x: Math.floor(G.rand(0, G.W)), y: Math.random(), p: G.rand(0, 6.28), big: Math.random() < 0.15,
    }));
    const city = [];
    for (let x = 0; x < G.W;) {
      const w = 10 + Math.floor(Math.random() * 14);
      city.push({ x, w, h: 14 + Math.floor(Math.random() * 36), seed: Math.floor(Math.random() * 1000) });
      x += w + 1;
    }
    let sky = null, skyH = 0;

    function drawBoot() {
      const W = G.W;
      G.rect(0, 0, W, G.H, '#05050d');
      let n = Math.floor((S.t - 0.25) * CPS), y = 12, curX = 8, curY = 12;
      BOOT.forEach((line, i) => {
        if (n < 0) return;
        const s = line.slice(0, Math.max(0, n));
        G.text(s, 8, y, { color: i < 2 ? '#ffd23f' : '#9cff9c' });
        curX = 8 + G.textWidth(s) + 2; curY = y;
        n -= line.length;
        y += 11;
      });
      if (S.t > T_BAR) {
        const p = G.clamp((S.t - T_BAR) / (T_TITLE - 0.15 - T_BAR), 0, 1);
        const by = 12 + BOOT.length * 11 + 2, segs = 16, segW = Math.floor((W - 20) / segs);
        G.rect(8, by, W - 16, 9, '#9cff9c');
        G.rect(9, by + 1, W - 18, 7, '#05050d');
        for (let i = 0; i < Math.floor(p * segs); i++) G.rect(10 + i * segW, by + 2, segW - 1, 5, '#9cff9c');
        G.text(Math.floor(p * 100) + '%', W - 8, by - 11, { color: '#9cff9c', align: 'right' });
      }
      if (Math.floor(S.t * 4) % 2) G.rect(curX, curY, 5, 7, '#9cff9c');
    }

    function logo(s, y, col) {
      const cx = G.W / 2, o = { scale: 3, align: 'center' };
      [[-1, 0], [1, 0], [0, -1], [0, 1], [0, 3], [-1, 3], [1, 3]].forEach(([dx, dy]) =>
        G.text(s, cx + dx, y + dy, Object.assign({}, o, { color: '#1b1433' })));
      G.text(s, cx, y, Object.assign({}, o, { color: col }));
      // 顶部一排高光
      G.ctx.save();
      G.ctx.beginPath();
      G.ctx.rect(0, y, G.W, 3);
      G.ctx.clip();
      G.text(s, cx, y, Object.assign({}, o, { color: '#fff6d0' }));
      G.ctx.restore();
    }

    function drawTitle() {
      const W = G.W, H = G.H, tt = S.t - T_TITLE, gy = Math.round(H * 0.74);
      if (!sky || skyH !== gy) { sky = G.bands(W, gy, NIGHT); skyH = gy; }
      G.ctx.drawImage(sky, 0, 0);

      for (const s of stars) {
        if (Math.sin(G.t * 3 + s.p) < -0.3) continue;
        const sy = Math.floor(s.y * (gy - 20));
        if (s.big) { G.rect(s.x - 1, sy, 3, 1, '#ffffff'); G.rect(s.x, sy - 1, 1, 3, '#ffffff'); }
        else G.rect(s.x, sy, 1, 1, '#c8c8ff');
      }

      const my = Math.round(H * 0.09) + 6;
      G.circle(W - 34, my, 12, '#fff3b0');
      G.rect(W - 40, my - 4, 3, 3, '#e8d98a');
      G.rect(W - 30, my + 2, 4, 3, '#e8d98a');
      G.rect(W - 36, my + 6, 2, 2, '#e8d98a');

      const blinkT = Math.floor(G.t * 0.5);
      for (const b of city) {
        G.rect(b.x, gy - b.h, b.w, b.h, '#1b1433');
        for (let wy = gy - b.h + 3; wy < gy - 3; wy += 5) {
          for (let wx = b.x + 2; wx < b.x + b.w - 2; wx += 4) {
            if ((wx * 7 + wy * 13 + b.seed + blinkT) % 6 === 0) G.rect(wx, wy, 2, 2, '#ffd23f');
          }
        }
      }

      G.rect(0, gy, W, H - gy, '#2a1d3d');
      G.rect(0, gy, W, 2, '#5c3d7a');
      for (let x = 3; x < W; x += 9) G.rect(x, gy + 5 + (x * 7) % 6, 2, 1, '#3d2a55');

      // LOGO 弹跳落下
      const ly = Math.round(H * 0.17);
      const bob = tt > 1.3 ? Math.round(Math.sin(G.t * 2) * 1.5) : 0;
      const drop = (t0, ty) => {
        if (tt < t0) return -60;
        return Math.round(-40 + (ty + 40) * G.ease.outBounce(G.clamp((tt - t0) / 0.8, 0, 1)));
      };
      logo('PIXEL', drop(0.15, ly) + bob, '#ffd23f');
      logo('PARTY', drop(0.4, ly + 26) + bob, '#ff7aa2');
      if (tt > 1.5 || (tt > 1.2 && Math.floor(tt * 20) % 2)) {
        G.text('~ 像素派对 ~', W / 2, ly + 58, { color: '#c8c8ff', align: 'center' });
      }

      // 小P走进来
      const k = G.clamp((tt - 0.9) / 0.9, 0, 1);
      const px = Math.round(-30 + (W / 2 - 14 + 30) * k);
      let py = 0;
      if (tt > 1.8 && tt < 2.2) py = -Math.sin((tt - 1.8) / 0.4 * Math.PI) * 10;
      if (S.starting) py = -Math.sin(Math.min(1, S.starting / 0.4) * Math.PI) * 16;
      let spr = G.SPR.pix;
      if (k < 1) spr = Math.floor(tt * 8) % 2 ? G.SPR.pixWalk : G.SPR.pix;
      else if (S.starting || G.t % 3 < 0.12) spr = G.SPR.pixBlink;
      G.draw(spr, px, gy - 26 + Math.round(py), 2);

      // 点击开始
      if (S.t >= T_READY) {
        const on = S.starting ? Math.floor(G.t * 12) % 2 : Math.floor(G.t * 2.5) % 2 === 0;
        if (on) G.text('TAP TO START', W / 2, gy + 16, { color: '#ffffff', align: 'center', shadow: '#000000' });
        G.text('点击屏幕开始', W / 2, gy + 34, { color: '#ffd23f', align: 'center', wave: true });
      }
    }

    return {
      update(dt) {
        S.t += dt;
        if (!S.flashed && S.t >= T_TITLE) { S.flashed = true; G.flash = 1; }
        for (const s of stars) { s.y += dt * 0.004; if (s.y > 1) s.y -= 1; }
        if (S.starting) {
          S.starting += dt;
          if (S.starting > 0.7 && !S.gone) { S.gone = true; G.transition(() => G.Stage()); }
        }
      },
      draw() {
        if (S.t < T_TITLE) drawBoot();
        else drawTitle();
      },
      // 动画中点一下 = 跳过；动画结束后点一下 = 开始
      down(x, y, id) {
        if (S.t < T_READY) {
          S.t = T_READY;
          S.flashed = true;
          G.flash = 0.6;
          S.skipTap = id;
        } else {
          S.skipTap = null;
        }
      },
      up(x, y, id) {
        if (S.skipTap === id) { S.skipTap = null; return; }
        if (S.t >= T_READY && !S.starting) {
          S.starting = 0.0001;
          G.audio.unlock();
          G.audio.play('start');
          G.flash = 0.5;
        }
      },
    };
  };
})();

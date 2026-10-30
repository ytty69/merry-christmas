/* 门外：两个人站在家门口，和雪人一起看烟花（从「我们的家」点门进来，点屏幕回家）
   烟花画在一半分辨率的画布上再放大；两个人和文字画在原分辨率上 */
(function () {
  const NIGHT = ['#0b0b1a', '#121436', '#1a1f4f', '#243066', '#2f4280'];
  // [主色, 亮色]
  // 房子往左挪一点：门在画面左侧，两人站在门口，雪人在右边
  const HOUSE_CAM = 10, COUPLE = [36, 50];
  const COLORS = [['#ff4d6d', '#ffb3c1'], ['#ffd23f', '#fff3b0'], ['#5bc0eb', '#c4ecfa'], ['#7bd389', '#d0f5d8'], ['#b388ff', '#e4d4ff'], ['#ff9f1c', '#ffd8a0']];

  G.Fireworks = function (home, caption) {
    const A = G.audio, P = G.ART.sprites();
    const S = {
      t: 0, rockets: [], sparks: [], hearts: [], flashes: [], next: 0.4, count: 0,
      flakes: Array.from({ length: 40 }, () => ({ x: G.rand(0, 90), y: G.rand(0, 200), v: G.rand(5, 10), ph: G.rand(0, 6) })),
      stars: Array.from({ length: 30 }, () => ({ x: Math.floor(G.rand(0, 90)), y: Math.random(), p: G.rand(0, 6.28) })),
    };
    let wb = null, sky = null, skyKey = '';
    const dims = () => { const H2 = Math.ceil(G.H / 2); return { W2: G.W / 2, H2, gy: Math.round(H2 * 0.78) }; };

    function launch(d) {
      S.count++;
      S.rockets.push({
        x: G.rand(30, d.W2 - 8), y: d.gy - 4, vy: -G.rand(75, 95),
        top: G.rand(14, d.gy * 0.45), c: G.pick(COLORS), heart: S.count % 4 === 0,
      });
      A.play('launch');
    }
    // 炸开：普通的是一圈放射状火花；每第 4 发是一颗粉色爱心
    function burst(r) {
      A.play('burst');
      S.flashes.push({ x: r.x, y: r.y, t: 0 });
      if (r.heart) {
        for (let i = 0; i < 36; i++) {
          const a = i / 36 * Math.PI * 2;
          const hx = 16 * Math.pow(Math.sin(a), 3), hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
          S.sparks.push({ x: r.x, y: r.y, vx: hx * 1.3, vy: hy * 1.3, life: 1.6, max: 1.6, c: ['#ff4d6d', '#ffb3c1'], g: 4 });
        }
        return;
      }
      const n = 40 + Math.floor(Math.random() * 14);
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + G.rand(-0.1, 0.1), sp = G.rand(16, 26);
        S.sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: G.rand(1, 1.5), max: 1.5, c: r.c, g: 10 });
      }
    }

    return {
      update(dt) {
        const d = dims();
        S.t += dt;
        A.pollBeats();
        if ((S.next -= dt) <= 0) { launch(d); S.next = G.rand(0.35, 0.8); }
        for (const fl of S.flashes) fl.t += dt;
        S.flashes = S.flashes.filter(fl => fl.t < 0.15);
        for (const r of S.rockets) { r.vy += 30 * dt; r.y += r.vy * dt; }
        S.rockets = S.rockets.filter(r => {
          if (r.y <= r.top || r.vy >= -12) { burst(r); return false; }
          return true;
        });
        for (const p of S.sparks) {
          p.vy += p.g * dt;
          p.vx *= 1 - dt * 1.8;
          p.vy *= 1 - dt * 1.4;
          p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        }
        S.sparks = S.sparks.filter(p => p.life > 0);
        for (const f of S.flakes) {
          f.y += f.v * dt;
          f.x += Math.sin(S.t + f.ph) * 0.08;
          if (f.y > d.H2) { f.y = -2; f.x = G.rand(0, 90); }
        }
        // 两人中间偶尔冒出小爱心
        if (Math.random() < dt * 0.8) S.hearts.push({ x: (COUPLE[0] + COUPLE[1]) / 2 * 2 - HOUSE_CAM * 2 + G.rand(-4, 4), y: d.gy * 2 - 44, life: 1.6 });
        for (const h of S.hearts) { h.y -= 18 * dt; h.life -= dt; }
        S.hearts = S.hearts.filter(h => h.life > 0);
      },

      draw(ctx) {
        const d = dims(), { W2, H2, gy } = d;
        if (!wb || wb.width !== W2 || wb.height !== H2) wb = G.makeCanvas(W2, H2);
        const main = G.ctx;
        G.ctx = wb.getContext('2d');
        G.ctx.imageSmoothingEnabled = false;

        if (skyKey !== W2 + 'x' + gy) { sky = G.bands(W2, gy, NIGHT); skyKey = W2 + 'x' + gy; }
        G.ctx.drawImage(sky, 0, 0);
        for (const s of S.stars) {
          if (Math.sin(G.t * 3 + s.p) > -0.3) G.rect(s.x, Math.floor(s.y * (gy - 30)), 1, 1, '#c8c8ff');
        }
        G.circle(78, 36, 5, '#fff3b0');
        // 远处的雪山和松树剪影
        for (let i = 0; i < W2; i += 2) {
          const h = Math.round(16 + Math.sin(i * 0.07) * 5 + Math.sin(i * 0.17) * 2);
          G.rect(i, gy - h, 2, h, '#2b3a6e');
          G.rect(i, gy - h, 2, 1, '#8ea0c8');
        }
        for (let k = 5; k < 10; k++) {
          const x = k * 10 + ((k * 7) % 5), h = 8 + ((k * 5) % 6);
          for (let j = 0; j < h; j++) G.rect(x - Math.floor(j / 2), gy - h + j, Math.floor(j / 2) * 2 + 1, 1, '#16243f');
        }

        // 烟花：升空的火箭拖尾 + 炸开的火花（快消失时一闪一闪）
        for (const r of S.rockets) {
          G.rect(r.x, r.y, 1, 3, '#fff6d0');
          if (Math.floor(G.t * 20) % 2) G.rect(r.x, r.y + 4, 1, 1, '#ffd23f');
        }
        for (const fl of S.flashes) {
          G.circle(fl.x, fl.y, 4, '#fff6d0');
          G.circle(fl.x, fl.y, 2, '#ffffff');
        }
        for (const p of S.sparks) {
          const k = p.life / p.max;
          if (k < 0.25 && Math.floor(G.t * 16 + p.x) % 2) continue;
          G.rect(p.x - p.vx * 0.05, p.y - p.vy * 0.05, 1, 1, p.c[0]);   // 拖尾
          G.rect(p.x, p.y, 1, 1, k > 0.5 ? p.c[1] : p.c[0]);
        }

        // 雪地 + 家（小木屋自带门口的雪人）
        G.rect(0, gy, W2, H2 - gy, '#dfe8fb');
        G.rect(0, gy, W2, 1, '#ffffff');
        for (let x = 2; x < W2; x += 6) G.rect(x + (x * 13) % 4, gy + 3 + (x * 7) % 10, 2, 1, '#c4d4f0');
        G.ART.drawHouse(HOUSE_CAM, gy, false);
        for (const f of S.flakes) G.rect(f.x, f.y, 1, 1, '#ffffff');

        G.ctx = main;
        ctx.drawImage(wb, 0, 0, W2 * 2, H2 * 2);

        // 两个人并肩站在家门口
        const feet = (gy + 4) * 2;
        for (const [img, x] of [[P.girl, (COUPLE[0] - HOUSE_CAM) * 2], [P.boy, (COUPLE[1] - HOUSE_CAM) * 2]]) {
          if (img.complete && img.naturalWidth) G.draw(img, Math.round(x) - 16, feet - 40);
        }
        for (const h of S.hearts) {
          if (h.life < 0.3 && Math.floor(G.t * 20) % 2) continue;
          G.draw(G.SPR.heartS, h.x - 5, h.y, 2);
        }

        G.text(caption, G.W / 2, 24, { color: '#ffd23f', align: 'center', shadow: '#1b1433' });
        if (S.t > 2.5 && Math.floor(G.t * 2) % 2 === 0) G.text('点击屏幕回家', G.W / 2, G.H - 28, { color: '#1b1433', align: 'center' });
      },

      down() {
        if (S.t < 1) return;
        A.play('blip');
        G.transition(() => home);
      },
    };
  };
})();

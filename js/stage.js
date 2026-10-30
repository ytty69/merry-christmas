/* 互动主场景：上方小场景 + 下方 6 个音效按钮 */
(function () {
  // ===== 按钮配置 =====
  // 想换成自己的音频：加上 src，例如 { ..., src: 'assets/audio/coin.mp3' }
  // 不填 src 就用内置的 8bit 合成音效；bgm 按钮填 src 时会循环播放该文件
  const PADS = [
    { id: 'jump', label: '跳跃', icon: 'star', color: '#5bc0eb' },
    { id: 'coin', label: '金币', icon: 'coin', color: '#ffd23f' },
    { id: 'bgm', label: '音乐', icon: 'note', color: '#b388ff' },
    { id: 'love', label: '心动', icon: 'heart', color: '#ff7aa2' },
    { id: 'laser', label: '激光', icon: 'bolt', color: '#6ee7b7' },
    { id: 'boom', label: '爆炸', icon: 'bomb', color: '#ff9f1c' },
  ];
  const TALK = ['你好呀!', '嘿嘿~', '好耶!', '再点一下?', '♪♪♪'];
  const SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86];
  const KEY = 'pixelparty.coins';

  function loadCoins() { try { return +localStorage.getItem(KEY) || 0; } catch (e) { return 0; } }
  function saveCoins(n) { try { localStorage.setItem(KEY, n); } catch (e) {} }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  function layout() {
    const W = G.W, H = G.H, m = 7, gap = 5, padH = 44;
    const padW = Math.floor((W - m * 2 - gap * 2) / 3);
    const panelH = m + (padH + 3) * 2 + gap + 6 + 12 + 6;
    const panelY = H - panelH;
    return { W, H, m, gap, padW, padH, panelY, groundY: panelY - 12, top: 18 };
  }
  function padRect(i, l) {
    const c = i % 3, r = Math.floor(i / 3);
    return { x: l.m + c * (l.padW + l.gap), y: l.panelY + l.m + r * (l.padH + 3 + l.gap), w: l.padW, h: l.padH };
  }

  function buildBg(l) {
    const c = G.makeCanvas(l.W, l.H), x = c.getContext('2d');
    x.drawImage(G.bands(l.W, l.groundY - l.top, ['#5bc0eb', '#76cdef', '#93d9f2', '#b3e5f5', '#d3f1f8']), 0, l.top);
    G.circle(30, l.top + 24, 11, '#fff3b0', x);
    G.circle(30, l.top + 24, 9, '#ffe066', x);
    for (let i = 0; i < l.W; i += 2) {
      const h = 26 + Math.sin(i * 0.045 + 1) * 9 + Math.sin(i * 0.11) * 4;
      G.rect(i, l.groundY - h, 2, h, '#a0d8c8', x);
    }
    for (let i = 0; i < l.W; i += 2) {
      const h = 12 + Math.sin(i * 0.07 + 3) * 5 + Math.sin(i * 0.19) * 2;
      G.rect(i, l.groundY - h, 2, h, '#5fb88a', x);
    }
    G.rect(0, l.groundY, l.W, l.panelY - l.groundY, '#5a3d2b', x);
    G.rect(0, l.groundY, l.W, 3, '#7bd389', x);
    G.rect(0, l.groundY, l.W, 1, '#c4f0a0', x);
    for (let i = 2; i < l.W; i += 7) G.rect(i + (i * 13) % 5, l.groundY + 5 + (i * 7) % 4, 2, 1, '#7a5640', x);

    G.rect(0, 0, l.W, l.top, '#0b0b1a', x);
    G.rect(0, l.top - 1, l.W, 1, '#2e2366', x);
    G.rect(0, l.panelY, l.W, l.H - l.panelY, '#1b1433', x);
    G.rect(0, l.panelY, l.W, 1, '#40287a', x);
    G.rect(0, l.panelY + 1, l.W, 1, '#0b0b1a', x);
    return c;
  }

  G.Stage = function () {
    const A = G.audio;
    const S = {
      pads: PADS.map(p => Object.assign({ down: null, hot: 0 }, p)),
      parts: [], rings: [], floats: [], bubble: null, beam: 0, beat: 0,
      coins: loadCoins(), greet: 0.6,
      clouds: Array.from({ length: 4 }, () => ({
        x: G.rand(0, G.W), y: Math.round(G.rand(26, 64)), w: Math.round(G.rand(18, 34)), v: G.rand(3, 8),
      })),
    };
    const pix = { x: G.W / 2, y: 0, vy: 0, flip: false, blink: 0, nextBlink: 2, happy: 0 };
    let bg = null, bgH = 0;
    PADS.forEach(p => p.src && A.preload(p.src));

    const part = o => S.parts.push(Object.assign({ vx: 0, vy: 0, g: 0, max: o.life }, o));
    const say = (text, life = 1.6) => { S.bubble = { text, life }; };
    const headY = l => l.groundY - 26 + pix.y;

    function dust(l) {
      for (let i = 0; i < 6; i++) {
        part({ x: pix.x + G.rand(-10, 10), y: l.groundY - 2, vx: G.rand(-30, 30), vy: G.rand(-20, -5), life: 0.35, s: 2, c: '#e8f5d0' });
      }
    }
    function hop(v) { pix.vy = -v; pix.y = Math.min(pix.y, -0.01); }

    function act(p, l) {
      p.hot = 1;
      buzz(12);
      if (p.id === 'bgm') {
        if (p.src) A.toggleLoopFile(p.src); else A.toggleBgm();
        say(A.bgmOn ? '♪ 开始派对!' : '休息一下~');
        return;
      }
      if (p.src) A.playFile(p.src); else A.play(p.id);
      const hy = headY(l);
      switch (p.id) {
        case 'jump':
          hop(170);
          dust(l);
          break;
        case 'coin':
          S.coins++;
          saveCoins(S.coins);
          part({ spr: G.SPR.coinS, x: pix.x, y: hy - 4, vy: -45, life: 0.7 });
          S.floats.push({ text: '+1', x: pix.x + 12, y: hy - 6, life: 0.8, c: '#ffd23f' });
          pix.happy = 0.5;
          break;
        case 'love':
          for (let i = 0; i < 10; i++) {
            const a = i / 10 * Math.PI * 2;
            part({ spr: G.SPR.heartS, x: pix.x, y: hy + 10, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 - 40, g: 60, life: 1 });
          }
          pix.happy = 1;
          say('♥');
          break;
        case 'laser':
          S.beam = 0.25;
          break;
        case 'boom': {
          const bx = G.rand(30, l.W - 30), by = G.rand(l.top + 20, l.groundY - 50);
          const cols = ['#ffffff', '#ffd23f', '#ff9f1c', '#ff4d6d'];
          for (let i = 0; i < 26; i++) {
            const a = G.rand(0, Math.PI * 2), sp = G.rand(40, 120);
            part({ x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 80, life: G.rand(0.4, 0.8), s: G.pick([2, 3]), c: G.pick(cols) });
          }
          S.rings.push({ x: bx, y: by, r: 2, life: 0.4, c: '#ffffff' });
          G.shake = 3;
          G.flash = 0.3;
          pix.flip = bx < pix.x;
          break;
        }
      }
    }

    function tapChar(l) {
      A.play('talk');
      hop(90);
      part({ spr: G.SPR.heartS, x: pix.x + 10, y: headY(l), vy: -30, life: 0.8 });
      say(G.pick(TALK));
      pix.happy = 0.8;
      buzz(8);
    }

    function tapSky(x, y) {
      const i = G.clamp(Math.floor(x / G.W * SCALE.length), 0, SCALE.length - 1);
      A.pluck(A.mf(SCALE[i]));
      S.rings.push({ x, y, r: 1, life: 0.5, c: '#ffffff' });
      part({ spr: G.SPR.spark, x, y, vy: -10, life: 0.5 });
      pix.flip = x < pix.x;
    }

    return {
      update(dt) {
        const l = layout();
        for (const ev of A.pollBeats()) {
          if (ev.step % 2 === 0) S.beat = 1;
          if (ev.step % 8 === 0) {
            part({ spr: G.SPR.noteS, x: pix.x + G.rand(-14, 14), y: headY(l), vx: G.rand(-10, 10), vy: -30, life: 1.2 });
          }
        }
        S.beat = Math.max(0, S.beat - dt * 5);

        if (S.greet > 0 && (S.greet -= dt) <= 0) say('点我试试!', 2);

        for (const c of S.clouds) { c.x += c.v * dt; if (c.x > l.W + 10) c.x = -c.w - 10; }

        if (pix.y < 0 || pix.vy < 0) {
          pix.vy += 520 * dt;
          pix.y += pix.vy * dt;
          if (pix.y >= 0) {
            if (pix.vy > 150) dust(l);
            pix.y = 0;
            pix.vy = 0;
          }
        }
        if ((pix.nextBlink -= dt) <= 0) { pix.blink = 0.12; pix.nextBlink = G.rand(1.5, 4); }
        pix.blink -= dt;
        pix.happy -= dt;

        for (const p of S.parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
        S.parts = S.parts.filter(p => p.life > 0);
        for (const r of S.rings) { r.r += 60 * dt; r.life -= dt; }
        S.rings = S.rings.filter(r => r.life > 0);
        for (const f of S.floats) { f.y -= 18 * dt; f.life -= dt; }
        S.floats = S.floats.filter(f => f.life > 0);
        if (S.bubble && (S.bubble.life -= dt) <= 0) S.bubble = null;
        S.beam -= dt;
        for (const p of S.pads) p.hot = Math.max(0, p.hot - dt * 4);
      },

      draw(ctx) {
        const l = layout();
        if (!bg || bgH !== l.H) { bg = buildBg(l); bgH = l.H; }
        ctx.drawImage(bg, 0, 0);

        for (const c of S.clouds) {
          G.rect(c.x + 4, c.y - 2, c.w * 0.35, 3, '#ffffff');
          G.rect(c.x + c.w * 0.45, c.y - 4, c.w * 0.35, 5, '#ffffff');
          G.rect(c.x, c.y + 1, c.w, 5, '#ffffff');
          G.rect(c.x + 1, c.y + 6, c.w - 2, 1, '#d6eef7');
        }

        // 影子 + 小P
        const sw = 20 - Math.min(10, Math.round(-pix.y / 6));
        G.rect(pix.x - sw / 2, l.groundY, sw, 2, '#4e9a5e');
        const spr = pix.blink > 0 || pix.happy > 0 ? G.SPR.pixBlink : G.SPR.pix;
        const bob = S.beat > 0.5 && pix.y === 0 ? 1 : 0;
        G.draw(spr, pix.x - 14, headY(l) + bob, 2, pix.flip);

        if (S.beam > 0) {
          const ey = headY(l) + 9;
          const x0 = pix.flip ? 0 : pix.x + 12, x1 = pix.flip ? pix.x - 12 : l.W;
          G.rect(x0, ey - 2, x1 - x0, 5, Math.floor(G.t * 30) % 2 ? '#6ee7b7' : '#b8f5dc');
          G.rect(x0, ey - 1, x1 - x0, 3, '#ffffff');
        }

        for (const p of S.parts) {
          if (p.life < 0.25 && Math.floor(G.t * 20) % 2) continue;
          if (p.spr) G.draw(p.spr, p.x - p.spr.width / 2, p.y - p.spr.height / 2);
          else G.rect(p.x, p.y, p.s, p.s, p.c);
        }
        for (const r of S.rings) {
          const n = Math.max(8, Math.round(r.r * 3));
          ctx.fillStyle = r.c;
          for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2;
            ctx.fillRect(Math.round(r.x + Math.cos(a) * r.r), Math.round(r.y + Math.sin(a) * r.r), 1, 1);
          }
        }
        for (const f of S.floats) G.text(f.text, f.x, f.y, { color: f.c, align: 'center', shadow: '#1b1433' });

        if (S.bubble && !(S.bubble.life < 0.2 && Math.floor(G.t * 20) % 2)) {
          const b = S.bubble, w = G.textWidth(b.text) + 8, h = 16;
          const px = Math.round(pix.x), bx = G.clamp(px - Math.round(w / 2), 2, l.W - w - 2);
          const by = Math.round(headY(l)) - h - 6;
          G.box(bx, by, w, h, '#ffffff', '#1b1433');
          G.rect(px - 1, by + h - 1, 2, 1, '#ffffff');
          G.rect(px - 2, by + h, 1, 1, '#1b1433');
          G.rect(px - 1, by + h, 2, 1, '#ffffff');
          G.rect(px + 1, by + h, 1, 1, '#1b1433');
          G.rect(px - 1, by + h + 1, 2, 1, '#1b1433');
          G.text(b.text, bx + 4, by + 5, { color: '#1b1433' });
        }

        // 顶栏
        G.text('MERRY XMAS', 5, 6, { color: '#ffd23f' });
        G.draw(G.SPR.coinS, l.W - 52, 6);
        G.text(String(S.coins).padStart(4, '0'), l.W - 45, 6, { color: '#ffffff' });
        G.draw(A.muted ? G.SPR.soundOff : G.SPR.soundOn, l.W - 13, 6);

        // 按钮
        S.pads.forEach((p, i) => {
          const r = padRect(i, l), pressed = p.down !== null, on = p.id === 'bgm' && A.bgmOn;
          const lit = pressed || on, off = pressed ? 2 : 0;
          G.box(r.x, r.y + 3, r.w, r.h, '#120d24', '#0b0b1a');
          G.box(r.x, r.y + off, r.w, r.h, lit ? p.color : '#2e2366', '#0b0b1a');
          G.rect(r.x + 2, r.y + off + 1, r.w - 4, 1, lit ? '#ffffff' : '#4b3a8c');
          let iy = r.y + off + 4 - Math.round(Math.sin(p.hot * Math.PI) * 3);
          if (on && S.beat > 0.5) iy -= 1;
          G.draw(G.SPR[p.icon], r.x + (r.w - 18) / 2, iy, 2);
          G.text(p.label, r.x + r.w / 2, r.y + off + 29, { color: lit ? '#1b1433' : '#ffffff', align: 'center' });
          if (p.id === 'bgm') G.rect(r.x + r.w - 7, r.y + off + 4, 3, 3, on ? (S.beat > 0.5 ? '#ff4d6d' : '#ffd23f') : '#120d24');
        });

        const hintY = l.panelY + l.m + (l.padH + 3) * 2 + l.gap + 6 + 3;
        G.text('试试点按钮/小家伙/天空', l.W / 2, hintY, { color: '#6a5a9a', align: 'center' });
      },

      down(x, y, id) {
        const l = layout();
        if (y < l.top) {
          if (x > l.W - 24) { A.setMuted(!A.muted); if (!A.muted) A.play('blip'); }
          return;
        }
        if (y >= l.panelY) {
          S.pads.forEach((p, i) => {
            const r = padRect(i, l);
            if (p.down === null && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h + 3) {
              p.down = id;
              act(p, l);
            }
          });
          return;
        }
        const cy = l.groundY + pix.y;
        if (Math.abs(x - pix.x) < 16 && y > cy - 30 && y < cy + 2) tapChar(l);
        else tapSky(x, y);
      },

      up(x, y, id) {
        for (const p of S.pads) if (p.down === id) p.down = null;
      },
    };
  };
})();

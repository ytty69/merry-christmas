/* 卧室游戏机里的小游戏「圣诞方块」
   落下的每一格画成扎丝带的小盒子，拼满一整行就消除得分
   底部按钮：◀ ▶ 移动 / ▼ 加速 / ⤓ 直接落下 / ⟳ 旋转；左上角「回家」回到屋里 */
(function () {
  const COLS = 10, ROWS = 18, BEST_KEY = 'xmas.blocks.best';
  const SHAPES = {
    I: [[0, 1], [1, 1], [2, 1], [3, 1]],
    O: [[1, 0], [2, 0], [1, 1], [2, 1]],
    T: [[0, 1], [1, 1], [2, 1], [1, 0]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    J: [[0, 0], [0, 1], [1, 1], [2, 1]],
    L: [[2, 0], [0, 1], [1, 1], [2, 1]],
  };
  // [盒子颜色, 丝带颜色, 高光]
  const GIFT = {
    I: ['#5bc0eb', '#ffffff', '#a8e4fa'],
    O: ['#ffd23f', '#e23b4b', '#fff0a0'],
    T: ['#b388ff', '#ffd23f', '#d8c4ff'],
    S: ['#2f9e5e', '#ffd23f', '#6cc483'],
    Z: ['#e23b4b', '#ffffff', '#ff8a96'],
    J: ['#3a6ea5', '#ffd23f', '#7aa4d4'],
    L: ['#ff9f1c', '#ffffff', '#ffc878'],
  };
  const LINE_SCORE = [0, 100, 300, 500, 800];

  const ICONS = {
    L: ['...w....', '..ww....', '.wwwwwww', 'wwwwwwww', '.wwwwwww', '..ww....', '...w....'],
    D: ['..www..', '..www..', '..www..', 'wwwwwww', '.wwwww.', '..www..', '...w...'],
    H: ['.wwwww.', '..www..', '...w...', '.wwwww.', '..www..', '...w...', 'wwwwwww'],
    U: ['..wwww...', '.w....w..', 'w......w.', 'w.....www', 'w......w.', '.w.......', '..wwww...'],
  };
  let ICON = null;
  const icons = () => ICON || (ICON = Object.fromEntries(Object.entries(ICONS).map(([k, rows]) => [k, {
    w: G.makeSprite(rows, { w: '#ffffff' }), k: G.makeSprite(rows, { w: '#1b1433' }),
  }])));

  function loadBest() { try { return +localStorage.getItem(BEST_KEY) || 0; } catch (e) { return 0; } }
  function saveBest(n) { try { localStorage.setItem(BEST_KEY, n); } catch (e) {} }

  G.BlockGame = function (home) {
    const A = G.audio;
    const S = {
      board: [], piece: null, next: null, bag: [], acc: 0, score: 0, lines: 0, level: 1,
      over: false, clearRows: [], clearT: 0, press: {}, das: null, floats: [], best: loadBest(), t: 0,
    };

    function reset() {
      S.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      S.score = 0; S.lines = 0; S.level = 1; S.acc = 0; S.over = false;
      S.clearRows = []; S.clearT = 0; S.bag = []; S.floats = [];
      S.next = draw7();
      spawn();
    }
    // 7 种轮流出现，不会连续很久等不到某一种
    function draw7() {
      if (!S.bag.length) {
        S.bag = Object.keys(SHAPES);
        for (let i = S.bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [S.bag[i], S.bag[j]] = [S.bag[j], S.bag[i]]; }
      }
      return S.bag.pop();
    }
    function spawn() {
      const type = S.next;
      S.next = draw7();
      S.piece = { type, cells: SHAPES[type].map(c => c.slice()), x: 3, y: 0 };
      if (collides(S.piece.cells, S.piece.x, S.piece.y)) {
        S.over = true;
        A.play('thud');
        if (S.score > S.best) { S.best = S.score; saveBest(S.best); }
      }
    }
    function collides(cells, px, py) {
      return cells.some(([cx, cy]) => {
        const x = px + cx, y = py + cy;
        return x < 0 || x >= COLS || y >= ROWS || (y >= 0 && S.board[y][x]);
      });
    }
    function move(dx) {
      const p = S.piece;
      if (!collides(p.cells, p.x + dx, p.y)) { p.x += dx; A.play('step'); return true; }
      return false;
    }
    function rotate() {
      const p = S.piece;
      if (p.type === 'O') return;
      const n = p.type === 'I' ? 4 : 3;
      const cells = p.cells.map(([x, y]) => [n - 1 - y, x]);
      // 贴墙时左右挪一挪再试（简单的踢墙）
      for (const k of [0, -1, 1, -2, 2]) {
        if (!collides(cells, p.x + k, p.y)) { p.cells = cells; p.x += k; A.play('blip'); return; }
      }
    }
    function lock() {
      const p = S.piece;
      for (const [cx, cy] of p.cells) {
        const y = p.y + cy;
        if (y >= 0) S.board[y][p.x + cx] = p.type;
      }
      A.play('crunch');
      const full = [];
      for (let y = 0; y < ROWS; y++) if (S.board[y].every(Boolean)) full.push(y);
      if (full.length) {
        S.clearRows = full;
        S.clearT = 0.25;
        const pts = LINE_SCORE[full.length] * S.level;
        S.score += pts;
        S.lines += full.length;
        S.level = 1 + Math.floor(S.lines / 10);
        A.play(full.length >= 4 ? 'sparkle' : 'coin');
        S.floats.push({ text: '+' + pts, y: full[0], life: 1.2 });
        S.piece = null;
      } else spawn();
    }
    function step() {
      const p = S.piece;
      if (!collides(p.cells, p.x, p.y + 1)) { p.y++; return true; }
      lock();
      return false;
    }
    function hardDrop() {
      let n = 0;
      while (S.piece && !collides(S.piece.cells, S.piece.x, S.piece.y + 1)) { S.piece.y++; n++; }
      S.score += n * 2;
      A.play('chop');
      if (S.piece) lock();
    }

    // ---------- 布局 ----------
    function layout() {
      const W = G.W, H = G.H, top = 18, infoH = 24, ctrlH = 38;
      // 横屏：上下没有按键和信息栏，棋盘可以占满高度
      const wide = W >= 260;
      const cell = wide
        ? G.clamp(Math.floor((H - top - 12) / ROWS), 6, 16)
        : G.clamp(Math.floor((H - top - infoH - ctrlH - 16) / ROWS), 6, Math.floor((W - 12) / COLS));
      const bw = cell * COLS, bh = cell * ROWS;
      return { W, H, cell, top, wide, bx: Math.round((W - bw) / 2), by: wide ? top + 6 : top + infoH + 2, bw, bh, ctrlY: H - ctrlH - 4 };
    }
    // 底部按钮：◀ ▶ | ▼ ⤓ | ⟳
    function buttons(l) {
      const w = 30, g = 5, y = l.ctrlY;
      if (l.wide) {
        // 左手：左右移动；右手：加速 / 落下 / 旋转
        const R = l.W - 5 - w;
        return [
          { k: 'L', x: 8, y, w }, { k: 'R', x: 8 + w + g, y, w },
          { k: 'D', x: R - (w + g) * 2, y, w }, { k: 'H', x: R - (w + g), y, w }, { k: 'U', x: R, y, w },
        ];
      }
      return [
        { k: 'L', x: 5, y, w }, { k: 'R', x: 5 + w + g, y, w },
        { k: 'D', x: 5 + (w + g) * 2, y, w }, { k: 'H', x: 5 + (w + g) * 3, y, w },
        { k: 'U', x: 5 + (w + g) * 4, y, w },
      ];
    }

    function drawGift(x, y, c, type, ghost) {
      if (ghost) {
        G.rect(x, y, c, 1, '#4b3a8c'); G.rect(x, y + c - 1, c, 1, '#4b3a8c');
        G.rect(x, y, 1, c, '#4b3a8c'); G.rect(x + c - 1, y, 1, c, '#4b3a8c');
        return;
      }
      const [base, rib, hi] = GIFT[type], m = Math.floor(c / 2);
      G.rect(x, y, c, c, '#1b1433');
      G.rect(x + 1, y + 1, c - 2, c - 2, base);
      G.rect(x + 1, y + 1, c - 2, 1, hi);
      G.rect(x + 1, y + 1, 1, c - 2, hi);
      G.rect(x + m, y + 1, 1, c - 2, rib);
      G.rect(x + 1, y + m, c - 2, 1, rib);
    }

    function btn(b, pressed) {
      const off = pressed ? 2 : 0, I = icons()[b.k === 'R' ? 'L' : b.k];
      G.box(b.x, b.y + 3, b.w, b.w, '#120d24', '#0b0b1a');
      G.box(b.x, b.y + off, b.w, b.w, pressed ? '#ffd23f' : '#2e2366', '#0b0b1a');
      G.rect(b.x + 2, b.y + off + 1, b.w - 4, 1, pressed ? '#ffffff' : '#4b3a8c');
      const img = pressed ? I.k : I.w;
      G.draw(img, b.x + Math.round((b.w - img.width * 2) / 2), b.y + off + Math.round((b.w - img.height * 2) / 2), 2, b.k === 'R');
    }

    reset();

    return {
      update(dt) {
        S.t += dt;
        A.pollBeats();
        for (const f of S.floats) f.life -= dt;
        S.floats = S.floats.filter(f => f.life > 0);
        if (S.over) return;
        if (S.clearT > 0) {
          if ((S.clearT -= dt) <= 0) {
            S.board = S.board.filter((_, y) => !S.clearRows.includes(y));
            while (S.board.length < ROWS) S.board.unshift(Array(COLS).fill(null));
            S.clearRows = [];
            spawn();
          }
          return;
        }
        if (!S.piece) return;
        // 按住左右：先停一下再连续移动
        if (S.das && Object.values(S.press).includes(S.das.k)) {
          S.das.t -= dt;
          while (S.das.t <= 0) { move(S.das.k === 'L' ? -1 : 1); S.das.t += 0.05; }
        } else S.das = null;
        const soft = Object.values(S.press).includes('D');
        S.acc += dt * (soft ? 14 : 1);
        const interval = Math.max(0.1, 0.8 - (S.level - 1) * 0.07);
        while (S.acc >= interval && S.piece) {
          S.acc -= interval;
          if (soft) S.score += 1;
          step();
        }
      },

      draw(ctx) {
        const l = layout(), c = l.cell;
        G.rect(0, 0, l.W, l.H, '#141432');
        for (let i = 0; i < 30; i++) {
          if (Math.sin(G.t * 2 + i * 1.7) > 0.3) G.rect((i * 53) % l.W, (i * 97) % l.H, 1, 1, '#4b4b8c');
        }

        // 顶栏
        G.rect(0, 0, l.W, 17, '#1b1433');
        G.text('< 回家', 5, 6, { color: '#ffd23f' });
        G.text('圣诞方块', l.W - 6, 6, { color: '#ffffff', align: 'right' });

        // 棋盘
        G.rect(l.bx - 2, l.by - 2, l.bw + 4, l.bh + 4, '#ffd23f');
        G.rect(l.bx - 1, l.by - 1, l.bw + 2, l.bh + 2, '#1b1433');
        G.rect(l.bx, l.by, l.bw, l.bh, '#0b0b1a');
        for (let y = 1; y < ROWS; y++) for (let x = 1; x < COLS; x++) G.rect(l.bx + x * c, l.by + y * c, 1, 1, '#2a2a4a');
        const flash = S.clearT > 0 && Math.floor(S.t * 20) % 2;
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            const t = S.board[y][x];
            if (!t) continue;
            if (flash && S.clearRows.includes(y)) G.rect(l.bx + x * c, l.by + y * c, c, c, '#ffffff');
            else drawGift(l.bx + x * c, l.by + y * c, c, t);
          }
        }
        if (S.piece && !S.over) {
          const p = S.piece;
          let gy = p.y;
          while (!collides(p.cells, p.x, gy + 1)) gy++;
          for (const [cx, cy] of p.cells) if (gy + cy >= 0) drawGift(l.bx + (p.x + cx) * c, l.by + (gy + cy) * c, c, p.type, true);
          for (const [cx, cy] of p.cells) if (p.y + cy >= 0) drawGift(l.bx + (p.x + cx) * c, l.by + (p.y + cy) * c, c, p.type);
        }
        for (const f of S.floats) {
          if (f.life < 0.3 && Math.floor(S.t * 20) % 2) continue;
          G.text(f.text, l.bx + l.bw / 2, l.by + f.y * c - (1.2 - f.life) * 20, { color: '#ffd23f', align: 'center', shadow: '#1b1433' });
        }

        // 信息：竖屏在棋盘上方排成一行；横屏放在棋盘左边一列
        const iy = l.top + 3, stats = [['SCORE', S.score], ['LINES', S.lines], ['BEST', S.best]];
        if (l.wide) {
          G.text('NEXT', 8, l.by + 2, { color: '#ffd23f' });
          G.rect(8, l.by + 12, 4 * 7 + 4, 2 * 7 + 4, '#0b0b1a');
          for (const [cx, cy] of SHAPES[S.next]) drawGift(10 + cx * 7, l.by + 14 + cy * 7, 7, S.next);
          stats.forEach(([label, val], i) => {
            G.text(label, 8, l.by + 40 + i * 24, { color: '#8ea0c8' });
            G.text(String(val), 8, l.by + 50 + i * 24, { color: '#ffffff' });
          });
        } else {
          G.text('NEXT', 6, iy, { color: '#ffd23f' });
          for (const [cx, cy] of SHAPES[S.next]) drawGift(32 + cx * 5, iy - 1 + cy * 5, 5, S.next);
          stats.forEach(([label, val], i) => {
            const x = 62 + i * 40;
            G.text(label, x, iy, { color: '#8ea0c8' });
            G.text(String(val), x, iy + 10, { color: '#ffffff' });
          });
        }

        // 结束画面
        if (S.over) {
          const bw = l.bw - 8, bx = l.bx + 4, by = l.by + l.bh / 2 - 34;
          G.box(bx, by, bw, 68, '#1b1433', '#ffd23f');
          G.text('游戏结束', bx + bw / 2, by + 10, { color: '#ffd23f', align: 'center' });
          G.text('得分 ' + S.score, bx + bw / 2, by + 28, { color: '#ffffff', align: 'center' });
          if (Math.floor(S.t * 2.5) % 2 === 0) G.text('点击再来一局', bx + bw / 2, by + 48, { color: '#ff7aa2', align: 'center' });
        }

        const pressed = Object.values(S.press);
        buttons(l).forEach(b => btn(b, pressed.includes(b.k)));
      },

      down(x, y, id) {
        if (y < 18) {
          if (x < 60) { A.play('blip'); G.transition(() => home); }
          return;
        }
        const l = layout();
        const b = buttons(l).find(o => x >= o.x - 2 && x < o.x + o.w + 3 && y >= o.y - 4 && y < o.y + o.w + 6);
        if (S.over) {
          if (!b) { reset(); A.play('start'); }
          return;
        }
        if (!b || !S.piece) return;
        S.press[id] = b.k;
        if (b.k === 'L' || b.k === 'R') { move(b.k === 'L' ? -1 : 1); S.das = { k: b.k, t: 0.17 }; }
        else if (b.k === 'U') rotate();
        else if (b.k === 'H') hardDrop();
      },

      up(x, y, id) { delete S.press[id]; },
    };
  };
})();

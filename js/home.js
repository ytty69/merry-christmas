/* 「我们的家」：可以左右走动参观的屋子
   - 底部左右箭头：按住让他走；点屋里的物品：他会走过去并互动
   - 走到她身边：随机触发一种互动
   场景画在一半分辨率的离屏画布上再放大 2 倍；角色、文字、按钮画在原分辨率上 */
(function () {
  // ================= 文字都在这里，改这里就行 =================
  const TEXT = {
    welcome: '欢迎回家~\n按左右箭头走走看，点点屋里的东西吧',
    allFound: '全部都发现啦！\n圣诞快乐，老公 ♥',
    // 树下的礼物：按顺序一个一个拆开，最后一个放最想说的话
    gifts: [
      '礼物 1：\n（这里写一段想对他说的话）',
      '礼物 2：\n（这里写一段你们的回忆）',
      '礼物 3：\n（压轴的话放在最后一个）',
    ],
    giftsDone: '礼物都拆完啦~\n最好的礼物\n是我们在一起 ♥',
    // 靠近她时，她随机说的话
    girl: ['今天也超级喜欢你', '老公圣诞快乐！', '手好冰，给你暖暖', '明年圣诞也要一起过哦', '我爱你♥'],
    hug: '抱抱~',
    // 第一次槲寄生垂下来时的说明；之后再遇到只说短的那句
    mistletoe: '槲寄生垂下来啦！\n站在槲寄生下的两个人\n要亲吻哦~',
    mistletoeShort: '槲寄生下要亲亲哦~',
    items: {
      door: '一起看烟花吧~',   // 点门：出门和雪人一起看烟花
      rack: '你的外套我挂好啦\n出门记得穿上，别着凉',
      sofa: '一起窝在沙发里看电影吧',
      dog: '汪汪~',
      tree: '我们一起装饰的圣诞树\n是世界上最好看的一棵！',
      stocking: '袜子里塞了一张小纸条：\n「最喜欢你啦！」',
      fireplace: '暖暖的炉火\n和你在一起的冬天一点都不冷',
      oven: '叮~ 姜饼人烤好啦\n等下一起吃~',
      fridge: '冰箱上贴满了\n我们一起去过的地方',
      cocoa: '两杯热可可\n一杯给你，一杯给我',
      window: '今晚的月亮好圆\n一起许个愿吧~',
      recordOn: '放一首圣诞歌~',
      recordOff: '安静一会儿\n听听雪的声音',
      bed: '晚安\n要梦到我呀',
      lampOff: '关灯啦\n只留一串小星星灯~',
      lampOn: '开灯~',
    },
  };

  // ================= 布局（世界坐标，半分辨率像素） =================
  const WORLD = 374, GIRL_X = 146, TREE_X = 122, SPEED = 34, BTN = 40, FEET = 3;
  const ROOMS = [
    { x0: 0, x1: 70, wall: '#efe0c2', pat: '#e2cda6' },                 // 玄关
    { x0: 70, x1: 190, wall: '#f1e2c6', pat: '#e7d2ae' },               // 客厅
    { x0: 190, x1: 270, wall: '#dcefe4', pat: '#c6e2d2', kitchen: true }, // 餐厅
    { x0: 270, x1: 374, wall: '#f5dede', pat: '#ecc8c8' },              // 卧室
  ];
  // 挂在衣架上的外套（按参考图还原）：歪着的弯钩、随意垂下来的外套、里面的红衬衫
  const COAT_ROWS = [
    '.........hhh..........',
    '........h...h.........',
    '............h.........',
    '............h.........',
    '...........h..........',
    '.........hhh..........',
    '......kkkSSSk.........',
    '....kkckbhhhbkkk......',
    '....kkckbkkhbkkdkk....',
    '...kclckhkkkhbdlkk....',
    '...kllcdkdddkkdllck...',
    '..kclllkbkkkkdllllck..',
    '..kllclckkkkdclllllk..',
    '..kllclckkSkkclllllk..',
    '..kllkllkSSkkllclllk..',
    '.kclcdllkSSkcllklllck.',
    '.kllkcllkSSklllkclllk.',
    '.kllkcllkSSklllcklllk.',
    '.kllkcllkSSklllcklllk.',
    'kclckcllkSSklllckcllk.',
    'kllckcclkSSklllckcllck',
    '.kkkkcllkSSkllcccklllk',
    '....klllkksklllcckllck',
    '....klllkkbklllccklcck',
    '....kclckkkklllllkkkk.',
    '.....kkk...kclllck....',
    '............kkkkk.....',
  ];
  const COAT_PAL = { k: '#173322', c: '#3f8a5c', l: '#5fae7a', d: '#2a6444', s: '#c2392b', S: '#962a20', b: '#a0662f', h: '#7a4a2a' };
  let coatSpr = null;
  const COAT = () => coatSpr || (coatSpr = G.makeSprite(COAT_ROWS, COAT_PAL));
  // 侧坐的小柴犬：竖耳朵、红项圈和小铃铛、奶白色胸口、大卷尾巴
  const DOG_ROWS = [
    '...k....k.........',
    '..kok..kok........',
    '..kdokkodk........',
    '..kdlllldk...kkk..',
    '.kolllllook.kowok.',
    '.kooeooeookkooowok',
    '.knnwoooookkooowwk',
    '.kwwwwwoook.kwwook',
    '..kpwwwwokk.koook.',
    '...krryrrllkoook..',
    '...kowwwoolllook..',
    '...kowwwwoollkk...',
    '...kowwwwooodddk..',
    '...koowwwooooddk..',
    '...kooooooooook...',
    '...kwwkwwkkoook...',
    '....kk.kk..kkk....',
  ];
  let dogSpr = null;
  const DOG = () => dogSpr || (dogSpr = G.makeSprite(DOG_ROWS, { k: '#2a1a0e', o: '#e0904a', l: '#f2c07a', d: '#a0552a', w: '#fbe9cf', r: '#c0392b', y: '#ffd23f', e: '#1b1209', n: '#1b1209', p: '#ff7a8a' }));
  const FAIRY = [276, 284, 292, 300, 308, 316, 324, 332, 340, 348, 356, 364];   // 卧室墙上小星星灯的 x

  G.Home = function () {
    const A = G.audio, ART = G.ART, P = ART.sprites();
    const S = {
      t: 0, parts: [], floats: [], hops: {}, bubbles: {}, timers: [], queue: [],
      boy: { x: 24, flip: false, target: null, pending: null, walking: false, stepT: 0 },
      hold: {}, dialog: null, found: new Set(), gifts: TEXT.gifts.length,
      near: false, lastInter: '', lock: 0, lampOff: false,
      mistle: -99, wag: -99, kiss: -99, kissExplained: false, fire: -99, oven: -99, shoot: -99, allShown: false,
    };
    let wb = null;
    const dims = () => { const H2 = Math.ceil(G.H / 2); return { W2: G.W / 2, H2, gy: Math.round(H2 * 0.72) }; };
    const camOf = () => G.clamp(Math.round(S.boy.x) - 45, 0, WORLD - G.W / 2);
    const ceilOf = gy => Math.max(12, gy - 72);   // 天花板的 y

    // ---------- 小工具 ----------
    const part = o => S.parts.push(Object.assign({ vx: 0, vy: 0, g: 0, s: 1 }, o));
    const float = (text, x, y, c = '#ffffff') => S.floats.push({ text, x, y, c, life: 1.2 });
    const later = (sec, fn) => S.timers.push({ at: S.t + sec, fn });
    const hop = (who, dur, h) => { S.hops[who] = { t0: S.t, dur, h }; };
    const hopY = who => {
      const h = S.hops[who];
      if (!h || S.t - h.t0 > h.dur) return 0;
      return -Math.round(Math.sin((S.t - h.t0) / h.dur * Math.PI) * h.h);
    };
    const say = (who, text, life = 2.2) => { S.bubbles[who] = { text, life }; };
    function hearts(x, y, n) {
      for (let i = 0; i < n; i++) {
        part({ spr: G.SPR.heartS, x: x + G.rand(-4, 4), y, vx: G.rand(-10, 10), vy: G.rand(-30, -14), life: 1.4 });
      }
    }
    function sparkles(x, y, n, spread = 14) {
      for (let i = 0; i < n; i++) {
        part({ x: x + G.rand(-spread, spread), y: y + G.rand(-spread, spread), vy: -8, life: G.rand(0.4, 0.9), c: G.pick(['#ffffff', '#ffd23f', '#fff6d0']) });
      }
    }
    // 文字自动换行（\n 强制换行）
    function wrap(s, maxW) {
      const lines = [];
      for (const para of s.split('\n')) {
        let cur = '';
        for (const ch of para) {
          if (cur && G.textWidth(cur + ch) > maxW) { lines.push(cur); cur = ch; } else cur += ch;
        }
        lines.push(cur);
      }
      return lines;
    }
    function dialog(text) {
      if (S.dialog) { S.queue.push(text); return; }
      S.dialog = { lines: wrap(text, G.W - 36), age: 0 };
    }
    function closeDialog() {
      S.dialog = null;
      if (S.queue.length) dialog(S.queue.shift());
    }
    function discover(id) {
      S.found.add(id);
      if (S.found.size === items(dims().gy).length && !S.allShown) {
        S.allShown = true;
        later(1.5, () => { dialog(TEXT.allFound); G.flash = 0.3; hearts(GIRL_X, dims().gy - 22, 10); A.play('sparkle'); });
      }
    }

    // ---------- 和她的随机互动 ----------
    function girlInteract() {
      const { gy } = dims(), b = S.boy;
      const type = G.pick(['talk', 'hug', 'kiss', 'dance'].filter(x => x !== S.lastInter));
      S.lastInter = type;
      discover('girl');
      if (type === 'talk') {
        A.play('talk');
        say('girl', G.pick(TEXT.girl));
        hearts(GIRL_X, gy - 22, 4);
      } else if (type === 'hug') {
        b.x = GIRL_X - 11; b.flip = false; S.lock = 1.2;
        A.play('love');
        hop('girl', 0.35, 6); hop('boy', 0.35, 6);
        say('girl', TEXT.hug);
        later(0.3, () => hearts((b.x + GIRL_X) / 2, gy - 24, 8));
      } else if (type === 'kiss') {
        // 槲寄生垂下 → 两人靠近、身体倾斜贴在一起 → 「啾~」冒爱心 → 分开
        b.x = GIRL_X - 13; b.flip = false; S.lock = 2.6;
        S.mistle = S.t; S.kiss = S.t;
        later(0.3, () => {
          if (!S.kissExplained) { S.kissExplained = true; dialog(TEXT.mistletoe); }
          else say('girl', TEXT.mistletoeShort, 1.4);
        });
        later(0.9, () => {
          A.play('ding', 10);
          float('啾~', (b.x + GIRL_X) / 2, gy - 32, '#ff4d6d');
          hearts((b.x + GIRL_X) / 2, gy - 26, 12);
        });
      } else {
        S.lock = 1.6;
        A.play('sparkle');
        for (let i = 0; i < 6; i++) {
          later(i * 0.25, () => {
            hop(i % 2 ? 'boy' : 'girl', 0.22, 6);
            part({ spr: G.SPR.noteS, x: (b.x + GIRL_X) / 2 + G.rand(-10, 10), y: gy - 22, vy: -20, vx: G.rand(-6, 6), life: 1 });
          });
        }
      }
    }

    // ---------- 屋里可以点的东西 ----------
    // r: 点击区域（世界坐标），stand: 他走到哪里互动
    let itemCache = null, itemGy = -1;
    function items(gy) {
      if (itemCache && itemGy === gy) return itemCache;
      const T = TEXT.items;
      itemGy = gy;
      itemCache = [
        {
          id: 'door', r: [10, gy - 30, 24, 30], stand: 22, act() {
            A.play('blip');
            S.hold = {};
            later(0.2, () => G.transition(() => G.Fireworks(scene, T.door)));
          },
        },
        { id: 'rack', r: [37, gy - 46, 22, 46], stand: 48, act() { dialog(T.rack); A.play('blip'); hop('boy', 0.3, 5); } },
        { id: 'dog', r: [89, gy - 15, 19, 18], stand: 104, act() { dialog(T.dog); S.wag = S.t; A.play('woof'); float('汪~', 96, gy - 18); hearts(96, gy - 14, 3); } },
        { id: 'sofa', r: [74, gy - 18, 36, 18], stand: 92, act() { dialog(T.sofa); A.play('jump'); hop('boy', 0.4, 8); } },
        {
          id: 'gifts', r: [108, gy - 10, 28, 13], stand: 112, act() {
            if (S.gifts > 0) {
              const i = TEXT.gifts.length - S.gifts;
              S.gifts--;
              A.play('pop');
              sparkles(TREE_X, gy - 4, 14, 10);
              dialog(TEXT.gifts[i]);
              if (!S.gifts) { G.flash = 0.3; hearts(TREE_X, gy - 10, 10); }
            } else dialog(TEXT.giftsDone);
          },
        },
        { id: 'tree', r: [106, gy - 72, 32, 62], stand: 112, act() { dialog(T.tree); A.play('sparkle'); sparkles(TREE_X, gy - 36, 20, 16); } },
        { id: 'girl', r: [GIRL_X - 8, gy - 21, 16, 24], stand: GIRL_X - 12, act() { S.near = true; girlInteract(); } },
        { id: 'stocking', r: [159, gy - 21, 22, 11], stand: 170, act() { dialog(T.stocking); A.play('coin'); float('♥', 170, gy - 24, '#ff4d6d'); } },
        { id: 'fireplace', r: [156, gy - 23, 28, 23], stand: 170, act() { dialog(T.fireplace); S.fire = S.t; A.play('crunch'); later(0.15, () => A.play('crunch')); } },
        { id: 'oven', r: [195, gy - 15, 20, 15], stand: 205, act() { dialog(T.oven); S.oven = S.t; A.play('ding', 8); } },
        { id: 'fridge', r: [221, gy - 36, 16, 36], stand: 229, act() { dialog(T.fridge); A.play('blip'); } },
        { id: 'cocoa', r: [244, gy - 20, 22, 20], stand: 255, act() { dialog(T.cocoa); A.play('ding', 3); hearts(255, gy - 18, 3); } },
        { id: 'window', r: [275, gy - 54, 24, 24], stand: 286, act() { dialog(T.window); S.shoot = S.t; A.play('sparkle'); } },
        {
          id: 'record', r: [273, gy - 18, 16, 18], stand: 280, act() {
            A.toggleBgm();
            dialog(A.bgmOn ? T.recordOn : T.recordOff);
            A.play('blip');
          },
        },
        {
          // 电视游戏机：进入「圣诞礼物方块」小游戏
          id: 'game', r: [294, gy - 28, 22, 28], stand: 305, act() {
            A.play('coin');
            S.hold = {};
            later(0.3, () => G.transition(() => G.BlockGame(scene)));
          },
        },
        { id: 'bed', r: [322, gy - 15, 37, 15], stand: 338, act() { dialog(T.bed); A.play('jump'); hop('boy', 0.4, 8); } },
        {
          id: 'lamp', r: [359, gy - 28, 14, 28], stand: 362, act() {
            S.lampOff = !S.lampOff;
            dialog(S.lampOff ? T.lampOff : T.lampOn);
            A.play('blip');
          },
        },
      ];
      return itemCache;
    }

    // ---------- 画场景 ----------
    function drawRoom(r, cam, d) {
      const { H2, gy } = d, x0 = r.x0 - cam, w = r.x1 - r.x0;
      if (x0 > d.W2 || x0 + w < 0) return;
      G.rect(x0, 0, w, gy, r.wall);
      for (let y = 6, row = 0; y < gy - 20; y += 7, row++) {
        for (let x = r.x0 + (row % 2) * 4 + 2; x < r.x1 - 2; x += 8) {
          G.rect(x + 1 - cam, y, 1, 1, r.pat);
          G.rect(x - cam, y + 1, 3, 1, r.pat);
          G.rect(x + 1 - cam, y + 2, 1, 1, r.pat);
        }
      }
      if (r.kitchen) {
        // 白瓷砖墙 + 格子地板
        G.rect(x0, gy - 32, w, 32, '#ffffff');
        for (let y = gy - 32; y < gy; y += 4) G.rect(x0, y, w, 1, '#c6e2d2');
        for (let x = r.x0; x < r.x1; x += 5) G.rect(x - cam, gy - 32, 1, 32, '#c6e2d2');
        for (let y = gy, j = 0; y < H2; y += 3, j++) {
          for (let x = r.x0, i = 0; x < r.x1; x += 3, i++) G.rect(x - cam, y, 3, 3, (i + j) % 2 ? '#efe6d4' : '#d9cdb5');
        }
      } else {
        G.rect(x0, gy - 17, w, 14, '#c08a5a');
        for (let x = r.x0 + 2; x < r.x1 - 10; x += 14) {
          G.rect(x - cam, gy - 14, 11, 9, '#b07a4c');
          G.rect(x - cam, gy - 6, 11, 1, '#d09a68');
        }
        G.rect(x0, gy - 18, w, 2, '#d09a68');
        G.rect(x0, gy - 18, w, 1, '#ecc08c');
        G.rect(x0, gy - 3, w, 3, '#8a5a3c');
        G.rect(x0, gy, w, H2 - gy, '#c48a58');
        for (let y = gy + 5, n = 0; y < H2; y += 6, n++) {
          G.rect(x0, y, w, 1, '#b07848');
          for (let x = r.x0 + (n % 2) * 9; x < r.x1; x += 18) G.rect(x - cam, y - 5, 1, 5, '#b07848');
        }
      }
    }

    function drawWindow(wx, wy, ww, wh, moon) {
      G.rect(wx - 1, wy - 1, ww + 2, wh + 2, '#a06a46');
      G.rect(wx, wy, ww, wh, '#1a1f4f');
      G.rect(wx, wy, ww, 4, '#22285e');
      if (moon) G.circle(wx + ww - 6, wy + 5, 3, '#fff3b0');
      for (let i = 0; i < 6; i++) G.rect(wx + 1 + (i * 5 + wx) % (ww - 2), wy + Math.floor((G.t * 7 + i * 6) % (wh - 1)), 1, 1, '#ffffff');
      G.rect(wx + (ww >> 1) - 1, wy, 2, wh, '#a06a46');
      G.rect(wx, wy + (wh >> 1), ww, 1, '#a06a46');
      G.rect(wx, wy + wh - 2, ww, 2, '#ffffff');
      for (const cx of [wx - 4, wx + ww]) {
        G.rect(cx, wy - 2, 4, wh + 4, '#2f8a55');
        G.rect(cx + (cx < wx ? 3 : 0), wy - 2, 1, wh + 4, '#1f6a43');
        G.rect(cx, wy + (wh >> 1) + 1, 4, 1, '#c22f40');
      }
      G.rect(wx - 5, wy - 4, ww + 10, 3, '#2f8a55');
      G.rect(wx - 5, wy - 2, ww + 10, 1, '#d8b04a');
    }

    function drawWorld(cam, d) {
      const { W2, gy } = d, X = x => x - cam, flick = Math.floor(G.t * 10);
      ROOMS.forEach(r => drawRoom(r, cam, d));
      // 房间之间的柱子 + 顶上的木梁
      for (const bx of [70, 190, 270]) {
        G.rect(X(bx) - 2, 0, 4, gy, '#b07a4c');
        G.rect(X(bx) - 2, 0, 1, gy, '#d09a68');
      }
      // 天花板：木板 + 横梁 + 收边
      const ceil = ceilOf(gy);
      G.rect(0, 0, W2, ceil, '#8a5a3c');
      for (let y = 2; y < ceil; y += 5) G.rect(0, y, W2, 1, '#7a4e34');
      for (let x = -(cam % 24); x < W2; x += 24) G.rect(x, 0, 2, ceil, '#6e4630');
      G.rect(0, ceil - 2, W2, 2, '#d09a68');
      G.rect(0, ceil, W2, 1, '#a06a46');
      // 吊灯：玄关一盏小灯笼，餐厅一盏绿色吊灯
      for (const [lx, len, shade] of [[58, 10, '#2b2b3a'], [255, 14, '#2f8a55']]) {
        G.rect(X(lx), ceil, 1, len, '#3a2a1e');
        G.rect(X(lx) - 3, ceil + len, 7, 3, shade);
        G.rect(X(lx) - 1, ceil + len + 3, 3, 1, (flick % 7) ? '#ffd23f' : '#ffb347');
      }

      // ===== 玄关 =====
      G.circle(X(36), gy - 48, 5, '#a06a46');
      G.circle(X(36), gy - 48, 4, '#ffffff');
      G.rect(X(36), gy - 51, 1, 3, '#1b1433');
      G.rect(X(36), gy - 48, 2, 1, '#1b1433');
      G.rect(X(10), gy - 31, 24, 31, '#f3e6c8');
      G.rect(X(12), gy - 29, 20, 29, '#8a4a2c');
      G.rect(X(14), gy - 18, 7, 14, '#7a3e24');
      G.rect(X(23), gy - 18, 7, 14, '#7a3e24');
      G.rect(X(16), gy - 27, 12, 5, '#1a1f4f');
      G.rect(X(16 + (Math.floor(G.t * 3) % 10)), gy - 26, 1, 1, '#ffffff');
      G.rect(X(29), gy - 14, 2, 2, '#ffd23f');
      G.circle(X(22), gy - 19, 4, '#2f9e5e');
      G.circle(X(22), gy - 19, 2, '#8a4a2c');
      G.rect(X(20), gy - 16, 4, 2, '#e23b4b');
      G.rect(X(12), gy, 20, 2, '#a8283a');
      // 衣帽架：顶上挂圣诞帽，钩子上挂着外套
      G.rect(X(48), gy - 41, 2, 41, '#6e4630');
      G.rect(X(44), gy - 2, 10, 2, '#6e4630');
      G.rect(X(46), gy - 45, 6, 3, '#e23b4b');
      G.rect(X(45), gy - 42, 8, 1, '#ffffff');
      G.rect(X(52), gy - 46, 2, 2, '#ffffff');
      G.draw(COAT(), X(37), gy - 41);
      G.rect(X(56), gy - 2, 4, 2, '#5a3d2b');
      G.rect(X(61), gy - 2, 4, 2, '#5a3d2b');

      // ===== 客厅 =====
      drawWindow(X(80), gy - 52, 18, 18, false);
      // 墙顶松枝花环 + 小暖灯
      for (let x = 74; x < 186; x++) {
        const y = ceil + 2 + Math.round(Math.sin((x - 74) / 28 * Math.PI) ** 2 * 4);
        G.rect(X(x), y, 1, 3, '#1f6a43');
        if (x % 2) G.rect(X(x), y, 1, 1, '#4fae6c');
        if (x % 5 === 2) G.rect(X(x), y + 3, 1, 1, (x + Math.floor(G.t * 2)) % 3 ? (x % 2 ? '#ffd23f' : '#fff6d0') : '#7a4e34');
      }
      // 沙发：深色描边、靠背、两块坐垫、扶手、抱枕；右扶手上搭着一条格子毯
      const SO = '#4a1420';
      const sofa = [
        [77, gy - 19, 30, 10, '#c22f40'],
        [74, gy - 14, 6, 11, '#a8283a'],
        [104, gy - 14, 6, 11, '#a8283a'],
        [79, gy - 10, 26, 5, '#d23a4c'],
        [79, gy - 5, 26, 3, '#8e2232'],
      ];
      sofa.forEach(([x, y, w, h]) => G.rect(X(x) - 1, y - 1, w + 2, h + 2, SO));
      sofa.forEach(([x, y, w, h, c]) => G.rect(X(x), y, w, h, c));
      G.rect(X(78), gy - 18, 28, 1, '#e05566');
      G.rect(X(92), gy - 18, 1, 8, '#a8283a');
      G.rect(X(92), gy - 10, 1, 5, '#a8283a');
      G.rect(X(80), gy - 10, 24, 1, '#e86070');
      G.rect(X(75), gy - 14, 4, 1, '#c84050');
      G.rect(X(105), gy - 14, 4, 1, '#c84050');
      G.rect(X(76), gy - 2, 2, 2, '#5a3d2b');
      G.rect(X(106), gy - 2, 2, 2, '#5a3d2b');
      G.rect(X(81), gy - 16, 7, 6, SO);
      G.rect(X(82), gy - 15, 5, 4, '#f3e6c8');
      G.rect(X(91), gy - 16, 7, 6, SO);
      G.rect(X(92), gy - 15, 5, 4, '#2f8a55');
      G.rect(X(93), gy - 14, 1, 1, '#ff4d6d');
      G.rect(X(95), gy - 14, 1, 1, '#ff4d6d');
      G.rect(X(94), gy - 13, 1, 1, '#ff4d6d');
      G.rect(X(101), gy - 16, 9, 14, SO);
      G.rect(X(102), gy - 15, 7, 12, '#f3e6c8');
      for (let i = 0; i < 7; i += 3) G.rect(X(102 + i), gy - 15, 1, 12, '#c22f40');
      for (let j = 1; j < 12; j += 3) G.rect(X(102), gy - 15 + j, 7, 1, '#2f8a55');
      G.rect(X(102), gy - 15, 7, 1, '#ffffff');
      for (let x = 102; x < 109; x += 2) G.rect(X(x), gy - 2, 1, 1, '#c22f40');
      // 圆地毯
      for (let dy = -3; dy <= 3; dy++) {
        const hw = Math.round(30 * Math.sqrt(1 - (dy / 3.6) ** 2)), y = gy + 4 + dy;
        G.rect(X(TREE_X + 4) - hw, y, hw * 2, 1, '#8e2232');
        if (Math.abs(dy) < 3) {
          G.rect(X(TREE_X + 4) - hw + 3, y, hw * 2 - 6, 1, '#a8283a');
        }
      }
      // 圣诞树 + 树下礼物
      const tr = ART.fancyTree(Math.min(ART.treeH(gy), gy - ceil - 14));
      ART.drawTree(tr, X(TREE_X), gy, { orn: 99, tinsel: 1, lightsT: 99, star: true });
      const giftsSpec = [[-13, 7, 6, '#5bc0eb', '#ffffff'], [-5, 9, 8, '#e23b4b', '#ffd23f'], [6, 7, 5, '#b388ff', '#ffffff']];
      giftsSpec.slice(0, S.gifts).forEach(([gx, gw, gh, c1, c2]) => {
        const x = X(TREE_X + gx), y = gy + 2 - gh;
        G.rect(x - 1, y - 1, gw + 2, gh + 1, '#1b1433');
        G.rect(x, y, gw, gh, c1);
        G.rect(x + (gw >> 1), y, 1, gh, c2);
        G.rect(x, y + (gh >> 1), gw, 1, c2);
        G.rect(x + (gw >> 1) - 1, y - 2, 3, 1, c2);
      });
      // 壁炉（点击后火会旺一下）
      const fx = X(156), big = S.t - S.fire < 1.2 ? 3 : 0;
      G.rect(fx, gy - 20, 28, 20, '#8a80a8');
      for (let y = gy - 16; y < gy; y += 4) G.rect(fx, y, 28, 1, '#6b5f8a');
      G.rect(fx + 6, gy - 13, 16, 13, '#1b1433');
      for (let i = 0; i < 6; i++) {
        const h = 3 + big + ((flick + i * 3) % 4);
        G.rect(fx + 7 + Math.round(i * 2.4), gy - h - 1, 2, h, i % 2 ? '#ff9f1c' : '#ffd23f');
      }
      G.rect(fx + 7, gy - 2, 14, 2, '#5a3d2b');
      G.rect(fx - 2, gy - 23, 32, 3, '#a06a46');
      G.rect(fx - 2, gy - 24, 32, 2, '#2f6e4a');
      for (let x = 0; x < 32; x += 4) G.rect(fx - 1 + x, gy - 23, 1, 1, '#e23b4b');
      for (const cx of [fx + 1, fx + 26]) {
        G.rect(cx, gy - 29, 2, 5, '#fff6d0');
        G.rect(cx, gy - 30, 1, 1, (flick + cx) % 3 ? '#ffd23f' : '#ff9f1c');
      }
      for (const sx of [fx + 4, fx + 17]) {
        G.rect(sx, gy - 21, 6, 2, '#ffffff');
        G.rect(sx + 1, gy - 19, 4, 6, '#e23b4b');
        G.rect(sx + 1, gy - 14, 6, 2, '#e23b4b');
      }
      // 沙发旁坐着的小柴犬（点它会开心地蹦两下）
      const jump = S.t - S.wag < 0.6 && Math.floor(S.t * 8) % 2 ? 2 : 0;
      G.draw(DOG(), X(89), gy - 15 - jump);

      // ===== 餐厅（190~270） =====
      G.rect(X(194), gy - 58, 44, 14, '#f3e6c8');
      for (const x of [194, 205, 216, 227]) G.rect(X(x), gy - 58, 1, 14, '#c8b48a');
      for (const x of [203, 214, 225, 236]) G.rect(X(x), gy - 52, 1, 2, '#a06a46');
      G.rect(X(194), gy - 45, 44, 1, '#c8b48a');
      G.rect(X(246), gy - 40, 20, 2, '#a06a46');
      for (const [x, c] of [[248, '#e23b4b'], [252, '#ffd23f'], [256, '#2f8a55'], [260, '#5bc0eb']]) G.rect(X(x), gy - 44, 3, 4, c);
      // 料理台 + 烤箱（点击后发光）
      G.rect(X(194), gy - 14, 22, 14, '#c08a5a');
      G.rect(X(193), gy - 15, 24, 2, '#e8e0d0');
      G.rect(X(197), gy - 12, 14, 10, '#4a4a5a');
      G.rect(X(199), gy - 10, 10, 5, S.t - S.oven < 2 && flick % 2 ? '#ffb347' : '#ff9f1c');
      for (const x of [200, 203, 206]) G.rect(X(x), gy - 8, 2, 2, '#8a4a2c');
      G.rect(X(199), gy - 12, 10, 1, '#d0d0d8');
      // 冰箱
      G.rect(X(222), gy - 35, 14, 35, '#1b1433');
      G.rect(X(223), gy - 34, 12, 34, '#e8eef4');
      G.rect(X(223), gy - 22, 12, 1, '#b8c4d0');
      G.rect(X(233), gy - 31, 1, 6, '#b8c4d0');
      G.rect(X(233), gy - 19, 1, 8, '#b8c4d0');
      G.rect(X(225), gy - 31, 6, 5, '#ffffff');
      G.rect(X(225), gy - 31, 6, 1, '#e23b4b');
      G.rect(X(227), gy - 29, 2, 2, '#ff7aa2');
      for (const [x, y, c] of [[226, gy - 18, '#5bc0eb'], [229, gy - 15, '#ffd23f'], [226, gy - 12, '#7bd389']]) G.rect(X(x), y, 2, 2, c);
      // 餐桌 + 两把椅子 + 两杯热可可（冒热气）
      for (const [sx, back] of [[240, 240], [264, 268]]) {
        G.rect(X(back), gy - 18, 1, 11, '#a06a46');
        G.rect(X(sx), gy - 9, 5, 2, '#c08a5a');
        G.rect(X(sx), gy - 7, 1, 7, '#8a5a3c');
        G.rect(X(sx + 4), gy - 7, 1, 7, '#8a5a3c');
      }
      G.rect(X(246), gy - 12, 18, 2, '#a06a46');
      G.rect(X(246), gy - 12, 18, 1, '#c08a5a');
      G.rect(X(247), gy - 10, 1, 10, '#8a5a3c');
      G.rect(X(262), gy - 10, 1, 10, '#8a5a3c');
      for (const [x, c] of [[249, '#e23b4b'], [257, '#2f8a55']]) {
        G.rect(X(x), gy - 16, 4, 4, c);
        G.rect(X(x + 4), gy - 15, 1, 2, c);
        G.rect(X(x), gy - 16, 4, 1, '#8a4a2c');
        for (let k = 0; k < 2; k++) {
          const p = (G.t * 0.8 + k * 0.5 + x * 0.1) % 1;
          G.rect(X(x + 1 + Math.round(Math.sin(p * 6))), gy - 18 - Math.round(p * 6), 1, 1, '#ffffff');
        }
      }

      // ===== 卧室（270~374） =====
      drawWindow(X(276), gy - 53, 20, 20, true);
      if (S.t - S.shoot < 0.8) {
        const p = (S.t - S.shoot) / 0.8;
        G.rect(X(278 + Math.round(p * 14)), gy - 50 + Math.round(p * 8), 2, 1, '#ffffff');
      }
      G.rect(X(272), ceil + 4, 100, 1, '#c8a0a0');
      FAIRY.forEach((x, i) => G.rect(X(x), ceil + 5 + (i % 2), 1, 1, (i + Math.floor(G.t * 2)) % 3 ? '#ffd23f' : '#fff6d0'));
      // 矮柜 + 唱片机（放歌时唱片转、冒音符）
      G.rect(X(273), gy - 12, 15, 12, '#a06a46');
      G.rect(X(273), gy - 12, 15, 1, '#c08a5a');
      G.rect(X(275), gy - 7, 11, 1, '#8a5a3c');
      G.rect(X(274), gy - 17, 13, 5, '#3a2a2a');
      G.rect(X(275), gy - 18, 8, 1, '#1b1433');
      G.rect(X(278 + (A.bgmOn ? Math.floor(G.t * 8) % 3 : 0)), gy - 18, 1, 1, '#e23b4b');
      G.rect(X(284), gy - 19, 1, 2, '#d0d0d8');
      // 电视柜 + 电视（屏幕里一直在掉小方块）+ 游戏机 + 手柄
      G.rect(X(294), gy - 9, 22, 9, '#a06a46');
      G.rect(X(294), gy - 9, 22, 1, '#c08a5a');
      G.rect(X(305), gy - 7, 1, 7, '#8a5a3c');
      G.rect(X(300), gy - 10, 10, 1, '#3a2a2a');
      G.rect(X(295), gy - 27, 20, 17, '#1b1433');
      G.rect(X(296), gy - 26, 18, 14, '#141432');
      const tvc = ['#e23b4b', '#ffd23f', '#2f9e5e', '#5bc0eb', '#b388ff'];
      for (let i = 0; i < 9; i++) G.rect(X(296 + i * 2), gy - 14, 2, 2, tvc[i % 5]);
      for (let i = 0; i < 5; i++) G.rect(X(298 + i * 2), gy - 16, 2, 2, tvc[(i + 2) % 5]);
      const fy = Math.floor(G.t * 4) % 6, fc = tvc[Math.floor(G.t * 4 / 6) % 5];
      G.rect(X(304), gy - 26 + fy * 2, 4, 2, fc);
      G.rect(X(306), gy - 24 + fy * 2, 2, 2, fc);
      G.rect(X(296), gy - 26, 18, 1, '#2a2a5a');
      G.rect(X(297), gy - 6, 6, 3, '#e8e8f0');
      G.rect(X(298), gy - 5, 1, 1, '#e23b4b');
      G.rect(X(301), gy - 5, 1, 1, '#5bc0eb');
      G.rect(X(308), gy - 4, 5, 2, '#5a5a6a');
      G.rect(X(303), gy - 5, 5, 1, '#3a3a4a');
      // 床（两个枕头）
      G.rect(X(355), gy - 20, 4, 20, '#a06a46');
      G.rect(X(322), gy - 20, 3, 20, '#a06a46');
      G.rect(X(324), gy - 11, 32, 6, '#f3e6c8');
      G.rect(X(324), gy - 13, 22, 8, '#e88aa0');
      for (let x = 325; x < 346; x += 4) G.rect(X(x), gy - 12, 2, 1, '#ffffff');
      G.rect(X(345), gy - 14, 9, 3, '#ffffff');
      G.rect(X(346), gy - 16, 8, 2, '#f3e6c8');
      G.rect(X(324), gy - 5, 32, 2, '#a06a46');
      // 床头柜 + 台灯
      G.rect(X(360), gy - 10, 12, 10, '#a06a46');
      G.rect(X(360), gy - 10, 12, 1, '#c08a5a');
      G.rect(X(365), gy - 18, 2, 8, '#6e4630');
      G.rect(X(361), gy - 26, 10, 8, S.lampOff ? '#c8b48a' : '#ffd27a');
      G.rect(X(361), gy - 26, 10, 1, S.lampOff ? '#a8946a' : '#fff6d0');
    }

    // ---------- 角色、气泡、按钮、对话框（原分辨率） ----------
    // ang：以脚底为支点的倾斜角度（亲亲时两人往中间靠）
    function drawAvatar(img, sx, ground, flip, dy, walk, ang = 0) {
      if (!img.complete || !img.naturalWidth) return;
      const bob = walk ? -(Math.floor(S.t * 4) % 2) : 0;
      if (!ang) { G.draw(img, Math.round(sx) - 16, ground - 40 + bob + dy, 1, flip); return; }
      const c = G.ctx;
      c.save();
      c.translate(Math.round(sx), ground + dy);
      c.rotate(ang);
      if (flip) c.scale(-1, 1);
      c.drawImage(img, -16, -40);
      c.restore();
    }

    function drawBubble(text, sx, headY) {
      const lines = wrap(text, 104);
      const w = Math.max(...lines.map(l => G.textWidth(l))) + 10, h = lines.length * 14 + 6;
      const px = Math.round(sx), bx = G.clamp(px - Math.round(w / 2), 2, G.W - w - 2), by = Math.round(headY) - h - 6;
      G.box(bx, by, w, h, '#ffffff', '#1b1433');
      G.rect(px - 1, by + h - 1, 2, 1, '#ffffff');
      G.rect(px - 2, by + h, 1, 1, '#1b1433');
      G.rect(px - 1, by + h, 2, 1, '#ffffff');
      G.rect(px + 1, by + h, 1, 1, '#1b1433');
      G.rect(px - 1, by + h + 1, 2, 1, '#1b1433');
      lines.forEach((ln, i) => G.text(ln, bx + 5, by + 6 + i * 14, { color: '#1b1433' }));
    }

    function arrowBtn(x, y, dir, pressed) {
      const off = pressed ? 2 : 0, col = pressed ? '#1b1433' : '#ffffff';
      G.box(x, y + 3, BTN, BTN, '#120d24', '#0b0b1a');
      G.box(x, y + off, BTN, BTN, pressed ? '#ffd23f' : '#2e2366', '#0b0b1a');
      G.rect(x + 2, y + off + 1, BTN - 4, 1, pressed ? '#ffffff' : '#4b3a8c');
      const cx = x + BTN / 2, cy = y + off + BTN / 2;
      for (let i = 0; i < 8; i++) {
        const h = 2 + i * 2, xx = dir < 0 ? cx - 7 + i : cx + 6 - i;
        G.rect(xx, cy - h / 2, 1, h, col);
      }
      G.rect(dir < 0 ? cx + 1 : cx - 8, cy - 3, 7, 6, col);
    }
    const btnRects = () => ({ L: [8, G.H - BTN - 11], R: [G.W - BTN - 8, G.H - BTN - 11] });

    function drawDialog() {
      const dg = S.dialog;
      if (!dg) return;
      const h = dg.lines.length * 14 + 14, x = 8, y = 22, w = G.W - 16;
      G.box(x, y, w, h, '#1b1433', '#ffffff');
      let n = Math.floor(dg.age * 24);
      dg.lines.forEach((ln, i) => {
        const shown = Array.from(ln).slice(0, Math.max(0, n)).join('');
        n -= Array.from(ln).length;
        G.text(shown, x + 8, y + 10 + i * 14, { color: '#ffffff' });
      });
      if (n >= 0 && Math.floor(G.t * 3) % 2) {
        const tx = x + w - 12, ty = y + h - 8;
        G.rect(tx, ty, 5, 1, '#ffd23f');
        G.rect(tx + 1, ty + 1, 3, 1, '#ffd23f');
        G.rect(tx + 2, ty + 2, 1, 1, '#ffd23f');
      }
    }
    const dialogDone = () => S.dialog && Math.floor(S.dialog.age * 24) >= S.dialog.lines.join('').length;

    later(0.6, () => dialog(TEXT.welcome));

    const scene = {
      update(dt) {
        S.t += dt;
        const { gy } = dims(), b = S.boy;
        A.pollBeats();
        S.timers = S.timers.filter(tm => (tm.at <= S.t ? (tm.fn(), false) : true));

        // ---- 他的移动：按住箭头 > 自动走向目标 ----
        const holds = Object.values(S.hold);
        const dir = holds.includes('L') ? -1 : holds.includes('R') ? 1 : 0;
        const x0 = b.x;
        if (S.lock > 0) S.lock -= dt;
        else if (dir) {
          b.target = null; b.pending = null;
          b.x += dir * SPEED * dt;
          b.flip = dir < 0;
        } else if (b.target !== null) {
          const dx = b.target - b.x;
          if (Math.abs(dx) <= 1) {
            b.x = b.target;
            const it = b.pending;
            b.target = null; b.pending = null;
            if (it) { it.act(); discover(it.id); }
          } else {
            b.x += Math.sign(dx) * Math.min(Math.abs(dx), SPEED * dt);
            b.flip = dx < 0;
          }
        }
        b.x = G.clamp(b.x, 8, WORLD - 8);
        b.walking = Math.abs(b.x - x0) > 0.01;
        if (b.walking && (b.stepT -= dt) <= 0) { b.stepT = 0.3; A.play('step'); }

        // ---- 走到她身边：随机互动 ----
        const dist = Math.abs(b.x - GIRL_X);
        if (dist < 14 && !S.near && S.lock <= 0) { S.near = true; girlInteract(); }
        if (dist > 26) S.near = false;

        for (const p of S.parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
        S.parts = S.parts.filter(p => p.life > 0);
        for (const f of S.floats) { f.y -= 12 * dt; f.life -= dt; }
        S.floats = S.floats.filter(f => f.life > 0);
        for (const k in S.bubbles) if ((S.bubbles[k].life -= dt) <= 0) delete S.bubbles[k];
        if (S.dialog) S.dialog.age += dt;
        if (A.bgmOn && Math.random() < dt * 1.5) {
          part({ spr: G.SPR.noteS, x: 280 + G.rand(-3, 3), y: gy - 20, vy: -14, vx: G.rand(-4, 4), life: 1.4 });
        }
      },

      draw(ctx) {
        const d = dims(), { gy } = d, cam = camOf(), b = S.boy;
        if (!wb || wb.width !== d.W2 || wb.height !== d.H2) wb = G.makeCanvas(d.W2, d.H2);
        const main = G.ctx;
        G.ctx = wb.getContext('2d');
        G.ctx.imageSmoothingEnabled = false;
        drawWorld(cam, d);
        // 亲亲时从天花板垂下来的槲寄生
        const mt = S.t - S.mistle;
        if (mt < 2.6) {
          const mx = Math.round((b.x + GIRL_X) / 2) - cam, k = Math.min(1, mt / 0.5, (2.6 - mt) / 0.4);
          const ceil = ceilOf(gy), my = ceil + Math.round((gy - 28 - ceil) * k);
          G.rect(mx, ceil, 1, my - ceil, '#d8b04a');
          G.rect(mx - 2, my - 2, 2, 2, '#e23b4b');
          G.rect(mx + 1, my - 2, 2, 2, '#e23b4b');
          G.rect(mx - 5, my, 5, 2, '#2f9e5e');
          G.rect(mx + 1, my, 5, 2, '#2f9e5e');
          G.rect(mx - 1, my + 1, 1, 1, '#ffffff');
          G.rect(mx + 1, my + 2, 1, 1, '#ffffff');
        }
        for (const p of S.parts) {
          if (p.life < 0.2 && Math.floor(G.t * 20) % 2) continue;
          if (p.spr) G.draw(p.spr, p.x - cam - 2, p.y - 2);
          else G.rect(p.x - cam, p.y, p.s, p.s, p.c);
        }
        G.ctx = main;
        ctx.drawImage(wb, 0, 0, d.W2 * 2, d.H2 * 2);

        const feet = (gy + FEET) * 2, bx = Math.round(b.x);
        const kt = S.t - S.kiss;
        const lean = kt < 0.5 ? 0 : kt < 0.8 ? (kt - 0.5) / 0.3 : kt < 1.9 ? 1 : kt < 2.2 ? (2.2 - kt) / 0.3 : 0;
        drawAvatar(P.girl, (GIRL_X - cam) * 2 - Math.round(lean * 4), feet, b.x > GIRL_X, hopY('girl') - Math.round(lean * 2), false, -0.12 * lean);
        drawAvatar(P.boy, (bx - cam) * 2 + Math.round(lean * 4), feet, b.flip, hopY('boy'), b.walking, 0.12 * lean);

        // 关灯后的卧室：变暗，只剩小星星灯亮着
        if (S.lampOff) {
          const x0 = (270 - cam) * 2, x1 = (WORLD - cam) * 2;
          if (x1 > 0 && x0 < G.W) {
            ctx.fillStyle = 'rgba(20,16,50,0.6)';
            ctx.fillRect(Math.max(0, x0), 0, Math.min(G.W, x1) - Math.max(0, x0), G.H);
            FAIRY.forEach((x, i) => {
              const sx = (x - cam) * 2, sy = (ceilOf(gy) + 5 + (i % 2)) * 2, on = (i + Math.floor(G.t * 2)) % 3;
              G.rect(sx - 2, sy, 6, 2, on ? '#ffd23f' : '#fff6d0');
              G.rect(sx, sy - 2, 2, 6, on ? '#ffd23f' : '#fff6d0');
            });
          }
        }

        // 还没互动过的东西头上有一颗小星星提示
        const blink = Math.floor(G.t * 2.5) % 2;
        items(gy).forEach(it => {
          if (S.found.has(it.id)) return;
          const sx = (it.r[0] + it.r[2] / 2 - cam) * 2, sy = it.r[1] * 2 - 8 + (blink ? -2 : 0);
          if (sx < -4 || sx > G.W + 4) return;
          G.rect(sx - 3, sy, 7, 1, '#ffd23f');
          G.rect(sx, sy - 3, 1, 7, '#ffd23f');
          G.rect(sx, sy, 1, 1, '#ffffff');
        });

        for (const f of S.floats) G.text(f.text, (f.x - cam) * 2, f.y * 2, { color: f.c, align: 'center', shadow: '#1b1433' });
        const head = feet - 40;
        if (S.bubbles.girl) drawBubble(S.bubbles.girl.text, (GIRL_X - cam) * 2, head + hopY('girl'));
        if (S.bubbles.boy) drawBubble(S.bubbles.boy.text, (bx - cam) * 2, head + hopY('boy'));

        // 顶栏
        G.rect(0, 0, G.W, 17, '#1b1433');
        G.text('我们的家', 6, 6, { color: '#ffd23f' });
        G.text('发现 ' + S.found.size + '/' + items(gy).length, G.W - 26, 6, { color: '#ffffff', align: 'right' });
        G.draw(A.muted ? G.SPR.soundOff : G.SPR.soundOn, G.W - 15, 5);

        const br = btnRects(), holds = Object.values(S.hold);
        arrowBtn(br.L[0], br.L[1], -1, holds.includes('L'));
        arrowBtn(br.R[0], br.R[1], 1, holds.includes('R'));
        drawDialog();
      },

      down(x, y, id) {
        // 对话框打开时：先显示完整，再点一下关闭
        if (S.dialog) {
          if (!dialogDone()) S.dialog.age = 99; else closeDialog();
          return;
        }
        if (y < 17) {
          if (x > G.W - 22) { A.setMuted(!A.muted); if (!A.muted) A.play('blip'); }
          return;
        }
        const br = btnRects();
        for (const k of ['L', 'R']) {
          const [bx, by] = br[k];
          if (x >= bx - 4 && x < bx + BTN + 4 && y >= by - 4 && y < by + BTN + 6) { S.hold[id] = k; return; }
        }
        // 点屋里：先看是不是点到了物品，否则就走过去
        const { gy } = dims(), cam = camOf(), wx = x / 2 + cam, wy = y / 2;
        const it = items(gy).find(o => wx >= o.r[0] && wx < o.r[0] + o.r[2] && wy >= o.r[1] && wy < o.r[1] + o.r[3]);
        if (S.lock > 0) return;
        if (it) { S.boy.target = it.stand; S.boy.pending = it; A.play('blip'); }
        else if (wy > gy - 20) { S.boy.target = G.clamp(wx, 8, WORLD - 8); S.boy.pending = null; }
      },

      up(x, y, id) { delete S.hold[id]; },

      _state: S,   // 调试用
    };
    return scene;
  };
})();

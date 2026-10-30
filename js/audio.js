/* 音频：WebAudio 实时合成 8bit 音效 / 背景乐，也支持播放音频文件 */
(function () {
  const A = G.audio = { ctx: null, master: null, bgmBus: null, muted: false, bgmOn: false, events: [] };
  const VOL = 0.6;
  const mf = A.mf = m => 440 * Math.pow(2, (m - 69) / 12);

  // 必须在用户点击/触摸时调用（iOS / 安卓禁止自动播放有声音频）
  A.unlock = function () {
    try {
      if (!A.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        A.ctx = new AC();
        A.master = A.ctx.createGain();
        A.master.gain.value = A.muted ? 0 : VOL;
        A.master.connect(A.ctx.destination);
        A.bgmBus = A.ctx.createGain();
        A.bgmBus.gain.value = 0.55;
        A.bgmBus.connect(A.master);
        const len = A.ctx.sampleRate;
        A.noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
        const d = A.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        // iOS 16.4+：让网页声音不受静音键影响
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      }
      if (A.ctx.state !== 'running') {
        const p = A.ctx.resume();
        if (p && p.catch) p.catch(() => {});
        const s = A.ctx.createBufferSource();
        s.buffer = A.ctx.createBuffer(1, 1, 22050);
        s.connect(A.ctx.destination);
        s.start(0);
      }
    } catch (e) {
      console.warn('audio unlock failed', e);
    }
  };

  // ---------- 合成器 ----------
  function tone(o) {
    if (!A.ctx) return;
    const c = A.ctx, dur = o.dur || 0.1, v = o.vol == null ? 0.15 : o.vol;
    const t = o.t != null ? o.t : c.currentTime + (o.at || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(o.bus || A.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noise(o) {
    if (!A.ctx) return;
    const c = A.ctx, dur = o.dur || 0.2, v = o.vol == null ? 0.3 : o.vol;
    const t = o.t != null ? o.t : c.currentTime + (o.at || 0);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = A.noiseBuf;
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.f || 3000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(o.bus || A.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  const SFX = {
    blip() { tone({ f: 880, dur: 0.05, vol: 0.1 }); },
    start() {
      [72, 76, 79, 84].forEach((m, i) => tone({ f: mf(m), dur: 0.12, at: i * 0.08, vol: 0.13 }));
      tone({ f: mf(88), dur: 0.45, at: 0.32, vol: 0.13 });
      tone({ type: 'triangle', f: mf(48), dur: 0.6, at: 0.32, vol: 0.35 });
    },
    jump() { tone({ f: 200, f2: 800, dur: 0.18, vol: 0.13 }); },
    coin() {
      tone({ f: 988, dur: 0.08, vol: 0.12 });
      tone({ f: 1319, dur: 0.35, at: 0.08, vol: 0.12 });
    },
    love() {
      [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => tone({ f: mf(m), dur: 0.1, at: i * 0.05, vol: 0.1 }));
    },
    laser() {
      tone({ type: 'sawtooth', f: 1800, f2: 120, dur: 0.28, vol: 0.1 });
      tone({ f: 1200, f2: 80, dur: 0.28, at: 0.02, vol: 0.05 });
    },
    boom() {
      noise({ dur: 0.7, f: 3000, f2: 60, vol: 0.6 });
      tone({ type: 'sine', f: 150, f2: 30, dur: 0.5, vol: 0.5 });
    },
    talk() {
      for (let i = 0; i < 3; i++) tone({ f: mf(G.pick([72, 74, 76, 79, 81])), dur: 0.05, at: i * 0.07, vol: 0.09 });
    },
  };

  A.play = name => { if (A.ctx && SFX[name]) SFX[name](); };
  A.pluck = f => {
    tone({ type: 'triangle', f, dur: 0.3, vol: 0.35 });
    tone({ f: f * 2, dur: 0.08, vol: 0.04 });
  };

  // ---------- 内置 8bit 背景乐（32 步循环，八分音符） ----------
  const LEAD = [
    72, 0, 76, 79, 84, 0, 79, 76,
    77, 0, 81, 84, 81, 79, 77, 0,
    76, 0, 79, 84, 88, 86, 84, 79,
    81, 79, 76, 74, 72, 0, 0, 0,
  ];
  const BASS = [
    48, 0, 55, 0, 48, 0, 55, 0,
    53, 0, 60, 0, 53, 0, 60, 0,
    57, 0, 64, 0, 57, 0, 64, 0,
    55, 0, 62, 0, 55, 0, 59, 0,
  ];
  const STEP = 60 / 132 / 2;
  let timer = null, nextT = 0, step = 0;

  function playStep(i, t) {
    const bus = A.bgmBus;
    if (LEAD[i]) tone({ t, f: mf(LEAD[i]), dur: STEP * 0.9, vol: 0.07, bus });
    if (BASS[i]) tone({ t, type: 'triangle', f: mf(BASS[i]), dur: STEP * 1.8, vol: 0.28, bus });
    if (i % 2 === 1) noise({ t, dur: 0.04, f: 7000, filter: 'highpass', vol: 0.12, bus });
    if (i % 4 === 0) tone({ t, type: 'sine', f: 160, f2: 40, dur: 0.12, vol: 0.45, bus });
  }

  function schedule() {
    while (nextT < A.ctx.currentTime + 0.12) {
      playStep(step, nextT);
      A.events.push({ t: nextT, step });
      nextT += STEP;
      step = (step + 1) % LEAD.length;
    }
  }

  A.startBgm = () => {
    if (!A.ctx || A.bgmOn) return;
    A.bgmOn = true;
    nextT = A.ctx.currentTime + 0.06;
    step = 0;
    timer = setInterval(schedule, 25);
    schedule();
  };
  A.stopBgm = () => {
    A.bgmOn = false;
    clearInterval(timer);
    timer = null;
    A.events.length = 0;
  };
  A.toggleBgm = () => (A.bgmOn ? A.stopBgm() : A.startBgm());

  // 取出已经"响起"的节拍，供画面同步跳动
  A.pollBeats = () => {
    const out = [];
    if (!A.ctx) return out;
    const now = A.ctx.currentTime;
    while (A.events.length && A.events[0].t <= now) out.push(A.events.shift());
    return out;
  };

  // ---------- 音频文件 ----------
  const bufs = {};
  function load(url) {
    if (!bufs[url]) {
      bufs[url] = fetch(url)
        .then(r => r.arrayBuffer())
        .then(ab => new Promise((res, rej) => A.ctx.decodeAudioData(ab, res, rej)))
        .catch(e => { delete bufs[url]; console.warn('音频加载失败', url, e); });
    }
    return bufs[url];
  }
  A.preload = url => { if (A.ctx) load(url); };

  A.playFile = (url, vol = 1) => {
    if (!A.ctx) return;
    load(url).then(buf => {
      if (!buf) return;
      const s = A.ctx.createBufferSource(), g = A.ctx.createGain();
      s.buffer = buf;
      g.gain.value = vol;
      s.connect(g);
      g.connect(A.master);
      s.start();
    });
  };

  let loopNode = null;
  A.toggleLoopFile = url => {
    if (A.bgmOn) {
      A.bgmOn = false;
      if (loopNode) { try { loopNode.stop(); } catch (e) {} loopNode = null; }
      return;
    }
    if (!A.ctx) return;
    A.bgmOn = true;
    load(url).then(buf => {
      if (!buf || !A.bgmOn) return;
      loopNode = A.ctx.createBufferSource();
      loopNode.buffer = buf;
      loopNode.loop = true;
      loopNode.connect(A.bgmBus);
      loopNode.start();
    });
  };

  A.setMuted = m => {
    A.muted = m;
    if (A.ctx) A.master.gain.setValueAtTime(m ? 0 : VOL, A.ctx.currentTime);
  };

  // 切到后台时暂停声音
  document.addEventListener('visibilitychange', () => {
    if (!A.ctx) return;
    const p = document.hidden ? A.ctx.suspend() : A.ctx.resume();
    if (p && p.catch) p.catch(() => {});
  });
})();

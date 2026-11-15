/* Web Audio による音源。周波数は正確に指定どおり鳴らす。 */
window.AudioEngine = (() => {
  const TIMBRES = {
    soft:  { label: 'やわらか', harmonics: [0, 1, 0.42, 0.2, 0.1, 0.05, 0.025], attack: 0.03, decayTo: 0.7, decayTime: 0.6, release: 0.12, gain: 0.55 },
    piano: { label: 'ピアノ風', harmonics: [0, 1, 0.7, 0.45, 0.3, 0.2, 0.13, 0.08, 0.05, 0.03], attack: 0.004, decayTo: 0.22, decayTime: 1.1, release: 0.16, gain: 0.6 },
    sine:  { label: 'サイン波', harmonics: [0, 1], attack: 0.03, decayTo: 0.85, decayTime: 0.8, release: 0.1, gain: 0.6 },
  };

  let ctx = null;
  let master = null;
  const waves = {};
  let voices = [];
  let timers = [];

  function init() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function wave(key) {
    if (!waves[key]) {
      const h = TIMBRES[key].harmonics;
      const real = new Float32Array(h.length);
      const imag = new Float32Array(h);
      waves[key] = ctx.createPeriodicWave(real, imag);
    }
    return waves[key];
  }

  /** freq[Hz] の音を when 秒（AudioContext 時刻）から dur 秒鳴らす */
  function tone(freq, when, dur, timbreKey = 'soft') {
    init();
    const t = TIMBRES[timbreKey] || TIMBRES.soft;
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(wave(timbreKey in TIMBRES ? timbreKey : 'soft'));
    osc.frequency.setValueAtTime(freq, when);

    // 低い音ほど少しだけ大きく（聴感補正）
    const loud = t.gain * Math.min(1.25, Math.max(0.8, Math.pow(440 / freq, 0.25)));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(loud, when + t.attack);
    g.gain.setTargetAtTime(loud * t.decayTo, when + t.attack, t.decayTime / 3);
    g.gain.setTargetAtTime(0, when + dur, t.release / 3);

    osc.connect(g);
    g.connect(master);
    osc.start(when);
    const end = when + dur + t.release * 2.5;
    osc.stop(end);
    const v = { osc, g, end };
    voices.push(v);
    osc.onended = () => { voices = voices.filter(x => x !== v); g.disconnect(); };
    return v;
  }

  /** AudioContext 時刻 when に fn を呼ぶ（UI のハイライト用） */
  function at(when, fn) {
    const ms = Math.max(0, (when - ctx.currentTime) * 1000);
    timers.push(setTimeout(fn, ms));
  }

  function stopAll() {
    timers.forEach(clearTimeout);
    timers = [];
    if (!ctx) return;
    const now = ctx.currentTime;
    voices.forEach(({ osc, g }) => {
      try {
        g.gain.cancelScheduledValues(now);
        g.gain.setTargetAtTime(0, now, 0.015);
        osc.stop(now + 0.08);
      } catch (e) { /* 既に停止済み */ }
    });
    voices = [];
  }

  return {
    TIMBRES,
    init,
    tone,
    at,
    stopAll,
    now: () => init().currentTime,
  };
})();

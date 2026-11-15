(() => {
  const DIFFS = {
    easy:   { label: '初級', min: 30, max: 50 },
    normal: { label: '中級', min: 10, max: 30 },
    hard:   { label: '上級', min: 5,  max: 10 },
  };
  const MODES = { single: '単音モード', phrase: 'フレーズモード' };
  const TOTAL = 10;
  const SINGLE = { dur: 0.75, gap: 0.42, lowMidi: 55, highMidi: 74 }; // G3〜D5

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  function load(k, d) {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      return v && typeof v === 'object' ? Object.assign({}, d, v) : d;
    } catch (e) { return d; }
  }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 保存不可 */ } }

  const settings = load('zureon-settings', { mode: 'single', diff: 'easy', timbre: 'soft' });
  if (!MODES[settings.mode]) settings.mode = 'single';
  if (!DIFFS[settings.diff]) settings.diff = 'easy';
  if (!AudioEngine.TIMBRES[settings.timbre]) settings.timbre = 'soft';
  const best = load('zureon-best', {});

  const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const freqOf = (midi, cents = 0) => 440 * Math.pow(2, (midi - 69) / 12 + cents / 1200);
  const fmtCents = c => (c > 0 ? '+' : '−') + Math.abs(c) + '¢';
  const dirWord = c => (c > 0 ? '高い' : '低い');

  function randCents(diff) {
    const d = DIFFS[diff];
    const c = randInt(d.min, d.max);
    return Math.random() < 0.5 ? c : -c;
  }

  // ---------------- menu ----------------
  function buildTimbreSeg() {
    const seg = $('#timbre-seg');
    seg.innerHTML = '';
    for (const k in AudioEngine.TIMBRES) {
      const b = document.createElement('button');
      b.dataset.timbre = k;
      b.setAttribute('role', 'radio');
      b.textContent = AudioEngine.TIMBRES[k].label;
      seg.appendChild(b);
    }
  }

  function syncMenu() {
    $$('[data-mode]').forEach(b => b.setAttribute('aria-checked', b.dataset.mode === settings.mode));
    $$('[data-diff]').forEach(b => b.setAttribute('aria-checked', b.dataset.diff === settings.diff));
    $$('[data-timbre]').forEach(b => b.setAttribute('aria-checked', b.dataset.timbre === settings.timbre));
    renderBest();
  }

  function renderBest() {
    const t = $('#best-table');
    let html = '<tr><th></th>' + Object.values(DIFFS).map(d => `<th>${d.label}</th>`).join('') + '</tr>';
    for (const m in MODES) {
      html += `<tr><td>${MODES[m]}</td>`;
      for (const d in DIFFS) {
        const b = best[m + ':' + d];
        html += b ? `<td><b>${b.score}</b> / ${TOTAL}<br><small class="none">${b.plays}回プレイ</small></td>` : '<td class="none">—</td>';
      }
      html += '</tr>';
    }
    t.innerHTML = html;
  }

  function show(id) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    window.scrollTo({ top: 0 });
  }

  // ---------------- game ----------------
  let game = null;

  function startGame() {
    AudioEngine.init();
    game = {
      mode: settings.mode, diff: settings.diff, timbre: settings.timbre,
      q: 0, correct: 0, streak: 0, maxStreak: 0, history: [], recent: [],
    };
    const card = $('.game-card');
    card.classList.toggle('mode-single', game.mode === 'single');
    card.classList.toggle('mode-phrase', game.mode === 'phrase');
    $('#game-meta').textContent = `${MODES[game.mode]}・${DIFFS[game.diff].label}`;
    show('screen-game');
    nextQuestion();
  }

  function nextQuestion() {
    AudioEngine.stopAll();
    if (game.q >= TOTAL) return finish();
    game.q++;
    game.answered = false;
    game.played = false;
    $('#q-num').textContent = game.q;
    $('#score').textContent = game.correct;
    $('#progress-fill').style.width = ((game.q - 1) / TOTAL * 100) + '%';
    $('#feedback').className = 'feedback';
    $('#feedback').innerHTML = '';
    $('#next-btn').hidden = true;
    $('#play-correct-btn').hidden = true;
    $('#play-btn').textContent = '▶ 再生';

    if (game.mode === 'single') {
      game.cur = {
        base: randInt(SINGLE.lowMidi, SINGLE.highMidi),
        odd: randInt(0, 2),
        cents: randCents(game.diff),
      };
      $('#melody-title').textContent = '';
      $('#instruction').textContent = '3つの音のうち、1つだけ音程がズレています。どれ？';
      $('.choices').classList.remove('answered');
      $$('.choice').forEach(b => {
        b.className = 'choice';
        b.disabled = true;
        b.querySelector('.sub').textContent = '';
      });
    } else {
      const pool = MELODIES.filter(m => !game.recent.includes(m));
      const melody = pick(pool.length ? pool : MELODIES);
      game.recent.push(melody);
      if (game.recent.length > Math.min(8, MELODIES.length - 1)) game.recent.shift();
      const { notes } = Score.parse(melody);
      const sounding = notes.filter(n => !n.rest);
      const longOnes = sounding.filter(n => n.beats >= 1);
      const target = pick(longOnes.length ? longOnes : sounding).index;
      game.cur = { melody, target, cents: randCents(game.diff) };
      $('#melody-title').textContent = '♪ ' + melody.title;
      $('#instruction').textContent = 'メロディーの中に1つだけ音程がズレた音があります。楽譜の音符をタップして答えてください。';
      renderScore();
    }
    setTimeout(() => { if (game && !game.played) play(); }, 350);
  }

  function renderScore() {
    if (!game || game.mode !== 'phrase') return;
    const c = game.cur;
    const opts = { interactive: true, onNoteClick: onNoteClick, marks: {}, labels: {} };
    if (game.answered) {
      opts.marks[c.target] = 'correct';
      opts.labels[c.target] = fmtCents(c.cents);
      if (c.chosen !== c.target) opts.marks[c.chosen] = 'wrong';
    }
    Score.render($('#score-box'), c.melody, opts);
  }

  function play() {
    if (!game) return;
    AudioEngine.stopAll();
    game.played = true;
    $('#play-btn').textContent = '↻ もう一度聴く';
    if (game.mode === 'single') playSingle();
    else playPhrase(true);
  }

  function playSingle(only = null) {
    const c = game.cur;
    const choices = $$('.choice');
    if (!game.answered) choices.forEach(b => (b.disabled = false));
    let t = AudioEngine.now() + 0.08;
    for (let i = 0; i < 3; i++) {
      if (only !== null && i !== only) continue;
      const f = freqOf(c.base, i === c.odd ? c.cents : 0);
      AudioEngine.tone(f, t, SINGLE.dur, game.timbre);
      const b = choices[i];
      AudioEngine.at(t, () => b.classList.add('playing'));
      AudioEngine.at(t + SINGLE.dur, () => b.classList.remove('playing'));
      t += SINGLE.dur + SINGLE.gap;
    }
  }

  function playPhrase(detuned, onlyIdx = null) {
    const c = game.cur;
    const { notes } = Score.parse(c.melody);
    const beat = 60 / c.melody.bpm;
    const box = $('#score-box');
    let t = AudioEngine.now() + 0.1;
    const list = onlyIdx === null ? notes : [notes[onlyIdx]];
    list.forEach(n => {
      const len = onlyIdx === null ? n.beats * beat : Math.max(0.7, n.beats * beat);
      if (!n.rest) {
        const cents = detuned && n.index === c.target ? c.cents : 0;
        AudioEngine.tone(freqOf(n.midi, cents), t, len * 0.92, game.timbre);
        AudioEngine.at(t, () => Score.highlight(box, n.index));
      }
      t += len;
    });
    AudioEngine.at(t, () => Score.highlight(box, null));
  }

  function onChoice(i) {
    if (!game || game.mode !== 'single') return;
    if (game.answered) { AudioEngine.stopAll(); $$('.choice').forEach(b => b.classList.remove('playing')); playSingle(i); return; }
    if (!game.played) return;
    const c = game.cur;
    const ok = i === c.odd;
    c.chosen = i;
    $$('.choice').forEach((b, j) => {
      b.classList.remove('playing');
      b.disabled = false;
      b.querySelector('.sub').textContent = j === c.odd ? fmtCents(c.cents) : '基準';
      if (j === c.odd) b.classList.add('correct');
      else if (j === i) b.classList.add('wrong');
    });
    $('.choices').classList.add('answered');
    const detail = ok
      ? `${c.odd + 1}番目の音が <b>${Math.abs(c.cents)}セント${dirWord(c.cents)}</b> 音でした`
      : `正解は <b>${c.odd + 1}番目</b>（${Math.abs(c.cents)}セント${dirWord(c.cents)}）`;
    settle(ok, detail, 'ボタンを押すと1音ずつ聴き比べできます');
  }

  function onNoteClick(idx) {
    if (!game || game.mode !== 'phrase') return;
    const c = game.cur;
    const { notes } = Score.parse(c.melody);
    if (game.answered) { AudioEngine.stopAll(); playPhrase(true, idx); return; }
    if (!game.played) return;
    c.chosen = idx;
    const ok = idx === c.target;
    const n = notes[c.target];
    const pos = c.target + 1 - notes.slice(0, c.target).filter(x => x.rest).length;
    const name = `${pos}番目の「${Score.noteName(n)}」`;
    const detail = ok
      ? `${name}が <b>${Math.abs(c.cents)}セント${dirWord(c.cents)}</b> 音でした`
      : `正解は ${name}（<b>${Math.abs(c.cents)}セント${dirWord(c.cents)}</b>）`;
    settle(ok, detail, '音符をタップすると1音ずつ聴けます');
    renderScore();
    $('#play-correct-btn').hidden = false;
  }

  function settle(ok, detail, hint) {
    AudioEngine.stopAll();
    if (game.mode === 'phrase') Score.highlight($('#score-box'), null);
    game.answered = true;
    const c = game.cur;
    if (ok) { game.correct++; game.streak++; game.maxStreak = Math.max(game.maxStreak, game.streak); }
    else game.streak = 0;
    game.history.push({
      ok, cents: c.cents,
      what: game.mode === 'single' ? `正解は${c.odd + 1}番目` : c.melody.title.replace(/（.*?）/, ''),
    });
    $('#score').textContent = game.correct;
    $('#streak').textContent = game.streak;
    $('#streak-wrap').hidden = game.streak < 2;
    $('#progress-fill').style.width = (game.q / TOTAL * 100) + '%';
    const fb = $('#feedback');
    fb.className = 'feedback ' + (ok ? 'ok' : 'ng');
    fb.innerHTML = `<span class="big">${ok ? '⭕ 正解！' : '❌ ざんねん…'}</span>${detail}<span class="hint">${hint}</span>`;
    $('#play-btn').textContent = game.mode === 'phrase' ? '▶ ズレたフレーズ' : '↻ もう一度聴く';
    $('#next-btn').textContent = game.q >= TOTAL ? '結果を見る →' : '次の問題 →';
    $('#next-btn').hidden = false;
    $('#next-btn').focus({ preventScroll: true });
  }

  function finish() {
    AudioEngine.stopAll();
    const k = game.mode + ':' + game.diff;
    const prev = best[k];
    const isNew = !prev || game.correct > prev.score;
    best[k] = { score: isNew ? game.correct : prev.score, plays: (prev ? prev.plays : 0) + 1 };
    save('zureon-best', best);

    $('#result-meta').textContent = `${MODES[game.mode]}・${DIFFS[game.diff].label}`;
    $('#result-score').textContent = game.correct;
    const s = game.correct;
    const msg = s === 10 ? '🏆 パーフェクト！ 驚異の耳です'
      : s >= 8 ? '🎉 すばらしい！ かなり鋭い耳です'
      : s >= 6 ? '👍 いい感じ！ あと一歩'
      : s >= 4 ? '🙂 まずまず。くり返すと上達します'
      : '🌱 これから伸びます。ヘッドホンで試してみて';
    $('#result-msg').textContent = msg;
    const chance = game.mode === 'single' ? '（あてずっぽうの期待値は約3.3問）' : '';
    $('#result-best').textContent = (isNew && prev ? '✨ ベスト更新！ ' : '') +
      `ベスト ${best[k].score} / ${TOTAL}・最大 ${game.maxStreak} 連続正解 ${chance}`;
    $('#history').innerHTML = '<tr><th>問</th><th>出題</th><th>ズレ</th><th>結果</th></tr>' +
      game.history.map((h, i) => `<tr><td>${i + 1}</td><td>${h.what}</td><td>${fmtCents(h.cents)}</td>` +
        `<td class="r ${h.ok ? 'o' : 'x'}">${h.ok ? '○' : '×'}</td></tr>`).join('');
    show('screen-result');
    renderBest();
  }

  function quit() {
    AudioEngine.stopAll();
    game = null;
    show('screen-menu');
    syncMenu();
  }

  // ---------------- events ----------------
  buildTimbreSeg();
  document.addEventListener('click', e => {
    const m = e.target.closest('[data-mode]');
    const d = e.target.closest('[data-diff]');
    const t = e.target.closest('[data-timbre]');
    if (m) settings.mode = m.dataset.mode;
    if (d) settings.diff = d.dataset.diff;
    if (t) {
      settings.timbre = t.dataset.timbre;
      AudioEngine.stopAll();
      AudioEngine.tone(freqOf(69), AudioEngine.now() + 0.05, 0.5, settings.timbre); // 試聴
    }
    if (m || d || t) { save('zureon-settings', settings); syncMenu(); }
  });
  $('#start-btn').addEventListener('click', startGame);
  $('#play-btn').addEventListener('click', play);
  $('#play-correct-btn').addEventListener('click', () => { AudioEngine.stopAll(); playPhrase(false); });
  $('#next-btn').addEventListener('click', nextQuestion);
  $('#quit-btn').addEventListener('click', quit);
  $('#retry-btn').addEventListener('click', startGame);
  $('#menu-btn').addEventListener('click', quit);
  $$('.choice').forEach(b => b.addEventListener('click', () => onChoice(+b.dataset.i)));

  document.addEventListener('keydown', e => {
    if (!game || !$('#screen-game').classList.contains('active')) return;
    if (e.target.closest('input, textarea')) return;
    if (e.target.closest('button') && (e.code === 'Space' || e.key === 'Enter')) return; // ボタン自身の操作を優先
    if (e.code === 'Space') { e.preventDefault(); play(); }
    else if (e.key === 'Enter' && game.answered) { e.preventDefault(); nextQuestion(); }
    else if (['1', '2', '3'].includes(e.key) && game.mode === 'single') onChoice(+e.key - 1);
  });

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(renderScore, 120); });

  syncMenu();
})();

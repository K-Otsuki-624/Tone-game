/* シンプルな五線譜（ト音記号）SVG レンダラー */
window.Score = (() => {
  const S = 10;                 // 線間（SVG 単位）
  const NS = 'http://www.w3.org/2000/svg';
  const LETTER_STEP = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  const PC = [0, 2, 4, 5, 7, 9, 11];
  const BEATS = { w: 4, h: 2, q: 1, e: 0.5 };
  const SHARP_ORDER = 'FCGDAEB';
  const FLAT_ORDER = 'BEADGCF';
  const SHARP_STEPS = [8, 5, 9, 6, 3, 7, 4];   // 第1線(E4)=0 からの段数
  const FLAT_STEPS = [4, 7, 3, 6, 2, 5, 1];
  const E4_DIA = 4 * 7 + LETTER_STEP.E;
  const SOLFA = { C: 'ド', D: 'レ', E: 'ミ', F: 'ファ', G: 'ソ', A: 'ラ', B: 'シ' };
  const MIN_VIRTUAL_WIDTH = 440; // これより狭い画面では縮小表示

  function parseToken(tok) {
    const [p, d] = tok.split('/');
    const dm = /^([whqe])(\.)?$/.exec(d || '');
    if (!dm) throw new Error('長さの書式が不正: ' + tok);
    const dotted = !!dm[2];
    const beats = BEATS[dm[1]] * (dotted ? 1.5 : 1);
    if (p === 'R') return { rest: true, dur: dm[1], dotted, beats };
    const pm = /^([A-G])(#|b)?(\d)$/.exec(p);
    if (!pm) throw new Error('音名の書式が不正: ' + tok);
    const letter = pm[1];
    const acc = pm[2] === '#' ? 1 : pm[2] === 'b' ? -1 : 0;
    const oct = +pm[3];
    return {
      rest: false, letter, acc, oct, dur: dm[1], dotted, beats,
      midi: 12 * (oct + 1) + PC[LETTER_STEP[letter]] + acc,
      step: oct * 7 + LETTER_STEP[letter] - E4_DIA,
    };
  }

  function keyAcc(key, letter) {
    if (key > 0 && SHARP_ORDER.indexOf(letter) < key) return 1;
    if (key < 0 && FLAT_ORDER.indexOf(letter) < -key) return -1;
    return 0;
  }

  function parse(m) {
    if (m._parsed) return m._parsed;
    const notes = m.notes.trim().split(/\s+/).filter(t => t !== '|').map(parseToken);
    const mlen = m.time[0] * 4 / m.time[1];
    const measures = [];
    let cur = [], acc = 0, cap = m.pickup || mlen;
    notes.forEach((n, i) => {
      n.index = i;
      n.pos = acc;
      cur.push(n);
      acc += n.beats;
      if (acc >= cap - 1e-6) {
        measures.push({ notes: cur, cap });
        cur = []; acc = 0; cap = mlen;
      }
    });
    if (cur.length) measures.push({ notes: cur, cap });

    // 臨時記号の表示判定（小節内で持続）
    const key = m.key || 0;
    measures.forEach(ms => {
      const state = {};
      ms.notes.forEach(n => {
        n.showAcc = null;
        if (n.rest) return;
        const k = n.letter + n.oct;
        const current = k in state ? state[k] : keyAcc(key, n.letter);
        if (n.acc !== current) { n.showAcc = n.acc; state[k] = n.acc; }
      });
      // 8分音符の連桁グループ（同じ拍の中で連続するもの）
      let group = [];
      const flush = () => { if (group.length >= 2) group.forEach(n => (n.beam = group)); group = []; };
      ms.notes.forEach(n => {
        if (n.dur === 'e' && !n.dotted && !n.rest) {
          if (group.length && Math.floor(group[0].pos + 1e-6) !== Math.floor(n.pos + 1e-6)) flush();
          group.push(n);
        } else flush();
      });
      flush();
    });

    return (m._parsed = { notes, measures, mlen });
  }

  function noteName(n) {
    if (n.rest) return '休符';
    return SOLFA[n.letter] + (n.acc === 1 ? '♯' : n.acc === -1 ? '♭' : '');
  }

  // ---------- SVG helpers ----------
  function el(name, attrs = {}, parent) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function drawAccidental(g, type, x, y) {
    const p = { stroke: 'currentColor', fill: 'none', 'stroke-linecap': 'butt' };
    if (type === 1) { // ♯
      el('path', { ...p, 'stroke-width': 1.2, d: `M${x - 2} ${y - 11}V${y + 12}M${x + 2} ${y - 12}V${y + 11}` }, g);
      el('path', { ...p, 'stroke-width': 3, d: `M${x - 4.5} ${y - 2.5}L${x + 4.5} ${y - 5.2}M${x - 4.5} ${y + 5.2}L${x + 4.5} ${y + 2.5}` }, g);
    } else if (type === -1) { // ♭
      el('path', { ...p, 'stroke-width': 1.3, d: `M${x - 3} ${y - 16}V${y + 5}` }, g);
      el('path', { ...p, 'stroke-width': 2, d: `M${x - 3} ${y + 4.5}C${x + 2} ${y + 1} ${x + 6} ${y - 1.5} ${x + 4.5} ${y - 4}C${x + 3} ${y - 6.5} ${x - 1} ${y - 4} ${x - 3} ${y - 1.5}` }, g);
    } else { // ♮
      el('path', { ...p, 'stroke-width': 1.2, d: `M${x - 3} ${y - 13}V${y + 5}M${x + 3} ${y - 5}V${y + 13}` }, g);
      el('path', { ...p, 'stroke-width': 3, d: `M${x - 3} ${y - 2}L${x + 3} ${y - 4}M${x - 3} ${y + 4}L${x + 3} ${y + 2}` }, g);
    }
  }

  // ト音記号（フォントの SMuFL 風グリフに頼らず、パスで描画）
  function drawTrebleClef(g, x, gLineY) {
    // gLineY = 第2線（G4）の y。線間 S=10 を想定した座標。
    const ox = x, oy = gLineY;
    el('path', {
      fill: 'none', stroke: 'currentColor', 'stroke-width': 2.1, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      d:
        // 中心の渦 → 外側のループ → 上の飾り → 縦の芯 → 下のフック
        `M${ox + 11} ${oy + 3}` +
        `C${ox + 6} ${oy + 4} ${ox + 4} ${oy - 3} ${ox + 9} ${oy - 6}` +
        `C${ox + 16} ${oy - 9} ${ox + 23} ${oy - 2} ${ox + 20} ${oy + 6}` +
        `C${ox + 17} ${oy + 13} ${ox + 3} ${oy + 13} ${ox + 1} ${oy + 3}` +
        `C${ox - 1} ${oy - 8} ${ox + 10} ${oy - 15} ${ox + 15} ${oy - 24}` +
        `C${ox + 19} ${oy - 31} ${ox + 18} ${oy - 41} ${ox + 14} ${oy - 41}` +
        `C${ox + 9} ${oy - 41} ${ox + 7} ${oy - 31} ${ox + 9} ${oy - 22}` +
        `L${ox + 15} ${oy + 19}` +
        `C${ox + 16} ${oy + 26} ${ox + 11} ${oy + 29} ${ox + 7} ${oy + 27}`,
    }, g);
    el('circle', { cx: ox + 7.5, cy: oy + 23.5, r: 3.4, fill: 'currentColor' }, g);
  }

  function drawQuarterRest(g, x, midY) {
    el('path', {
      fill: 'none', stroke: 'currentColor', 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      d: `M${x - 2} ${midY - 14}L${x + 4} ${midY - 6}L${x - 2} ${midY + 1}L${x + 4} ${midY + 7}C${x - 2} ${midY + 4} ${x - 4} ${midY + 9} ${x} ${midY + 13}`,
    }, g);
  }

  /**
   * 楽譜を描画する。
   * opts: { onNoteClick(idx), marks: {idx: 'correct'|'wrong'}, labels: {idx: text}, interactive: bool }
   */
  function render(container, melody, opts = {}) {
    const { notes, measures } = parse(melody);
    const key = melody.key || 0;
    const nKey = Math.abs(key);
    const W = Math.max(MIN_VIRTUAL_WIDTH, Math.floor(container.clientWidth || MIN_VIRTUAL_WIDTH));
    const marginX = 4;
    const clefW = 34;
    const keyW = nKey ? nKey * 9 + 4 : 0;
    const timeW = 24;

    // 自然幅
    measures.forEach(ms => {
      ms.w = 12;
      ms.notes.forEach(n => {
        n.w = 16 + 16 * Math.pow(n.beats, 0.6) + (n.showAcc !== null ? 10 : 0) + (n.dotted ? 6 : 0);
        ms.w += n.w;
      });
      ms.w += 4;
    });

    // 行分け
    const lines = [];
    let line = [], used = 0;
    measures.forEach(ms => {
      const header = clefW + keyW + (lines.length === 0 ? timeW : 0) + 6;
      const avail = W - marginX * 2 - header;
      if (line.length && used + ms.w > avail) {
        lines.push(line); line = []; used = 0;
      }
      line.push(ms); used += ms.w;
    });
    if (line.length) lines.push(line);

    const sysH = 12.5 * S;
    const H = lines.length * sysH + 4;
    container.innerHTML = '';
    const svg = el('svg', {
      viewBox: `0 0 ${W} ${H}`, width: '100%', class: 'score-svg' + (opts.interactive ? ' interactive' : ''),
      role: 'img', 'aria-label': melody.title + ' の楽譜',
    });
    svg.style.maxWidth = W + 'px';
    container.appendChild(svg);

    const positions = [];
    let prevScale = null;

    lines.forEach((ln, li) => {
      const top = li * sysH + 4.5 * S;
      const yOf = step => top + 4 * S - step * S / 2;
      const header = clefW + keyW + (li === 0 ? timeW : 0) + 6;
      const avail = W - marginX * 2 - header;
      const natural = ln.reduce((a, m) => a + m.w, 0);
      let scale = avail / natural;
      const isLast = li === lines.length - 1;
      if (isLast && lines.length > 1 && prevScale !== null) scale = Math.min(scale, prevScale);
      scale = Math.min(scale, 3);
      prevScale = scale;
      const endX = marginX + header + natural * scale;

      const staff = el('g', { class: 'staff' }, svg);
      for (let i = 0; i < 5; i++) {
        el('line', { x1: marginX, x2: endX, y1: top + i * S, y2: top + i * S, stroke: 'currentColor', 'stroke-width': 1 }, staff);
      }
      el('line', { x1: marginX, x2: marginX, y1: top, y2: top + 4 * S, stroke: 'currentColor', 'stroke-width': 1 }, staff);
      drawTrebleClef(staff, marginX + 5, yOf(2));
      for (let i = 0; i < nKey; i++) {
        const st = key > 0 ? SHARP_STEPS[i] : FLAT_STEPS[i];
        drawAccidental(staff, key > 0 ? 1 : -1, marginX + clefW + 6 + i * 9, yOf(st));
      }
      if (li === 0) {
        const tx = marginX + clefW + keyW + 12;
        const tAttr = { x: tx, 'text-anchor': 'middle', 'font-size': 21, 'font-weight': 700, 'font-family': 'Georgia, "Times New Roman", serif', fill: 'currentColor' };
        el('text', { ...tAttr, y: top + 2 * S - 2.5 }, staff).textContent = melody.time[0];
        el('text', { ...tAttr, y: top + 4 * S - 2.5 }, staff).textContent = melody.time[1];
      }

      let x = marginX + header;
      ln.forEach((ms, mi) => {
        x += 12 * scale;
        ms.notes.forEach(n => {
          const colW = n.w * scale;
          const g = el('g', { class: 'note' + (n.rest ? ' rest' : ''), 'data-idx': n.index }, svg);
          const accOff = n.showAcc !== null ? 12 : 0;
          const hx = x + 7 + accOff;
          if (!n.rest) {
            el('rect', { class: 'hit', x: x - 2, y: top - 3.5 * S, width: colW, height: 11 * S, rx: 6 }, g);
          }
          if (n.rest) {
            const midY = yOf(4);
            if (n.dur === 'q') drawQuarterRest(g, hx, midY);
            else if (n.dur === 'h') el('rect', { x: hx - 6, y: midY - S / 2, width: 12, height: S / 2, fill: 'currentColor' }, g);
            else if (n.dur === 'w') el('rect', { x: hx - 6, y: yOf(6), width: 12, height: S / 2, fill: 'currentColor' }, g);
            else el('text', { x: hx, y: midY + 6, 'text-anchor': 'middle', 'font-size': 26, fill: 'currentColor' }, g).textContent = '𝄾';
            positions[n.index] = { x: hx, y: midY, top, g };
          } else {
            const y = yOf(n.step);
            // 加線
            for (let s = -2; s >= n.step; s -= 2) el('line', { x1: hx - 10, x2: hx + 10, y1: yOf(s), y2: yOf(s), stroke: 'currentColor', 'stroke-width': 1.2 }, g);
            for (let s = 10; s <= n.step; s += 2) el('line', { x1: hx - 10, x2: hx + 10, y1: yOf(s), y2: yOf(s), stroke: 'currentColor', 'stroke-width': 1.2 }, g);
            if (n.showAcc !== null) drawAccidental(g, n.showAcc, hx - 15, y);
            const hollow = n.dur === 'h' || n.dur === 'w';
            const rx = n.dur === 'w' ? 7.2 : 6.2;
            el('ellipse', {
              class: 'head', cx: hx, cy: y, rx, ry: 4.4,
              transform: n.dur === 'w' ? '' : `rotate(-20 ${hx} ${y})`,
              fill: hollow ? 'none' : 'currentColor', stroke: 'currentColor', 'stroke-width': hollow ? 1.9 : 1,
            }, g);
            if (n.dotted) {
              const onLine = ((n.step % 2) + 2) % 2 === 0;
              el('circle', { cx: hx + rx + 5, cy: onLine ? y - S / 2 : y, r: 1.8, fill: 'currentColor' }, g);
            }
            positions[n.index] = { x: hx, y, top, g, n, rx };
          }
          x += colW;
        });
        x += 4 * scale;
        const isFinal = li === lines.length - 1 && mi === ln.length - 1;
        if (isFinal) {
          el('line', { x1: x - 6, x2: x - 6, y1: top, y2: top + 4 * S, stroke: 'currentColor', 'stroke-width': 1 }, staff);
          el('rect', { x: x - 3.5, y: top, width: 3.5, height: 4 * S, fill: 'currentColor' }, staff);
        } else {
          el('line', { x1: x, x2: x, y1: top, y2: top + 4 * S, stroke: 'currentColor', 'stroke-width': 1 }, staff);
        }
      });
    });

    // 符幹・旗・連桁
    const stemLen = 3.4 * S;
    const done = new Set();
    notes.forEach(n => {
      if (n.rest || n.dur === 'w' || done.has(n)) return;
      const group = n.beam || [n];
      group.forEach(m => done.add(m));
      const ps = group.map(m => positions[m.index]);
      // 中央線から最も遠い音で向きを決める
      let far = group[0];
      group.forEach(m => { if (Math.abs(m.step - 4) > Math.abs(far.step - 4)) far = m; });
      const up = far.step < 4;
      const stemX = p => up ? p.x + p.rx - 0.7 : p.x - p.rx + 0.7;
      if (group.length === 1) {
        const p = ps[0];
        const sx = stemX(p);
        const ey = up ? p.y - stemLen : p.y + stemLen;
        el('line', { x1: sx, x2: sx, y1: p.y + (up ? -1 : 1), y2: ey, stroke: 'currentColor', 'stroke-width': 1.3 }, p.g);
        if (n.dur === 'e') {
          const d = up
            ? `M${sx} ${ey}C${sx + 1} ${ey + 7} ${sx + 10} ${ey + 10} ${sx + 7} ${ey + 22}`
            : `M${sx} ${ey}C${sx + 1} ${ey - 7} ${sx + 10} ${ey - 10} ${sx + 7} ${ey - 22}`;
          el('path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, p.g);
        }
      } else {
        const beamY = up ? Math.min(...ps.map(p => p.y)) - stemLen : Math.max(...ps.map(p => p.y)) + stemLen;
        ps.forEach(p => {
          const sx = stemX(p);
          el('line', { x1: sx, x2: sx, y1: p.y + (up ? -1 : 1), y2: beamY, stroke: 'currentColor', 'stroke-width': 1.3 }, p.g);
        });
        const x1 = stemX(ps[0]) - 0.65, x2 = stemX(ps[ps.length - 1]) + 0.65;
        el('rect', { x: x1, y: up ? beamY : beamY - 4.5, width: x2 - x1, height: 4.5, fill: 'currentColor', class: 'beam' }, svg);
      }
    });

    // 状態・ラベル
    const marks = opts.marks || {};
    const labels = opts.labels || {};
    positions.forEach((p, i) => {
      if (!p) return;
      if (marks[i]) p.g.classList.add(marks[i]);
      if (labels[i]) {
        const ly = Math.min(p.top - 1.6 * S, p.y - 1.8 * S);
        el('text', { x: p.x, y: ly, 'text-anchor': 'middle', class: 'note-label', 'font-size': 13, 'font-weight': 700, fill: 'currentColor' }, p.g).textContent = labels[i];
      }
    });

    if (opts.onNoteClick) {
      svg.addEventListener('click', e => {
        const g = e.target.closest('.note');
        if (!g || g.classList.contains('rest')) return;
        opts.onNoteClick(+g.dataset.idx);
      });
    }
    return svg;
  }

  function highlight(container, idx) {
    container.querySelectorAll('.note.playing').forEach(g => g.classList.remove('playing'));
    if (idx === null || idx === undefined) return;
    const g = container.querySelector(`.note[data-idx="${idx}"]`);
    if (g) g.classList.add('playing');
  }

  return { parse, render, highlight, noteName };
})();

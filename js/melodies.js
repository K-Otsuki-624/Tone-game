/*
 * フレーズモード用のメロディー集
 *
 * 書式: "音名/長さ" をスペース区切りで並べる。"|" は小節線（読みやすさ用・省略可）
 *   音名  : C D E F G A B + (#|b) + オクターブ   例) C4, F#4, Bb4   休符は R
 *   長さ  : w=全音符 h=2分 q=4分 e=8分、末尾に "." で付点  例) q.  h.
 *   key   : 調号（正=♯の数, 負=♭の数）
 *   time  : 拍子 [分子, 分母]（分母は 4 のみ対応）
 *   pickup: 弱起（アウフタクト）の拍数
 *
 * 収録曲はすべてパブリックドメインの楽曲、またはこのゲームのためのオリジナルです。
 */
window.MELODIES = [
  {
    title: 'きらきら星',
    bpm: 100, key: 0, time: [4, 4],
    notes: 'C4/q C4/q G4/q G4/q | A4/q A4/q G4/h | F4/q F4/q E4/q E4/q | D4/q D4/q C4/h',
  },
  {
    title: 'かえるの合唱',
    bpm: 100, key: 0, time: [4, 4],
    notes: 'C4/q D4/q E4/q F4/q | E4/q D4/q C4/h | E4/q F4/q G4/q A4/q | G4/q F4/q E4/h',
  },
  {
    title: 'ちょうちょう',
    bpm: 100, key: 0, time: [4, 4],
    notes: 'G4/q E4/q E4/h | F4/q D4/q D4/h | C4/q D4/q E4/q F4/q | G4/q G4/q G4/h',
  },
  {
    title: 'メリーさんのひつじ',
    bpm: 108, key: 0, time: [4, 4],
    notes: 'E4/q D4/q C4/q D4/q | E4/q E4/q E4/h | D4/q D4/q D4/h | E4/q G4/q G4/h',
  },
  {
    title: '喜びの歌（ベートーヴェン「第九」）',
    bpm: 108, key: 2, time: [4, 4],
    notes: 'F#4/q F#4/q G4/q A4/q | A4/q G4/q F#4/q E4/q | D4/q D4/q E4/q F#4/q | F#4/q. E4/e E4/h',
  },
  {
    title: 'ロンドン橋',
    bpm: 108, key: 0, time: [4, 4],
    notes: 'G4/q. A4/e G4/q F4/q | E4/q F4/q G4/h | D4/q E4/q F4/h | E4/q F4/q G4/h',
  },
  {
    title: '聖者の行進',
    bpm: 132, key: 0, time: [4, 4],
    notes: 'R/q C4/q E4/q F4/q | G4/w | R/q C4/q E4/q F4/q | G4/w | R/q C4/q E4/q F4/q | G4/h E4/h | C4/h E4/h | D4/w',
  },
  {
    title: 'ジングルベル',
    bpm: 132, key: 0, time: [4, 4],
    notes: 'E4/q E4/q E4/h | E4/q E4/q E4/h | E4/q G4/q C4/q. D4/e | E4/w | ' +
           'F4/q F4/q F4/q. F4/e | F4/q E4/q E4/q E4/e E4/e | E4/q D4/q D4/q E4/q | D4/h G4/h',
  },
  {
    title: 'ふるさと',
    bpm: 84, key: -1, time: [3, 4],
    notes: 'F4/q F4/q F4/q | G4/q. A4/e G4/q | A4/q A4/q Bb4/q | A4/h.',
  },
  {
    title: 'さくらさくら',
    bpm: 76, key: 0, time: [4, 4],
    notes: 'A4/q A4/q B4/h | A4/q A4/q B4/h | A4/q B4/q C5/q B4/q | A4/q B4/e A4/e F4/h',
  },
  {
    title: '蛍の光',
    bpm: 84, key: -1, time: [4, 4], pickup: 1,
    notes: 'C4/q | F4/q. F4/e F4/q A4/q | G4/q. F4/e G4/q A4/q | F4/q. F4/e A4/q C5/q | D5/h.',
  },
  {
    title: '家路（ドヴォルザーク「新世界より」）',
    bpm: 66, key: 0, time: [4, 4],
    notes: 'E4/q. G4/e G4/h | E4/q. D4/e C4/h | D4/q E4/q G4/q E4/q | D4/w',
  },
  {
    title: 'ハッピー・バースデー',
    bpm: 100, key: 0, time: [3, 4], pickup: 1,
    notes: 'G4/e G4/e | A4/q G4/q C5/q | B4/h G4/e G4/e | A4/q G4/q D5/q | C5/h',
  },
  {
    title: 'アルプス一万尺',
    bpm: 120, key: 1, time: [4, 4],
    notes: 'G4/q G4/q A4/q B4/q | G4/q B4/q A4/q D4/q | G4/q G4/q A4/q B4/q | G4/h F#4/h',
  },
  {
    title: 'メヌエット ト長調',
    bpm: 112, key: 1, time: [3, 4],
    notes: 'D5/q G4/e A4/e B4/e C5/e | D5/q G4/q G4/q | E5/q C5/e D5/e E5/e F#5/e | G5/q G4/q G4/q',
  },
  // ---- ここからオリジナル ----
  {
    title: 'オリジナル「朝の散歩」',
    bpm: 104, key: 1, time: [4, 4],
    notes: 'G4/q B4/q D5/q B4/q | C5/q A4/q F#4/q D4/q | E4/q G4/q B4/q A4/q | G4/w',
  },
  {
    title: 'オリジナル「夕焼けワルツ」',
    bpm: 112, key: -1, time: [3, 4],
    notes: 'F4/q A4/q C5/q | Bb4/h G4/q | A4/q C5/q F5/q | E5/h. | D5/q Bb4/q G4/q | C5/h E4/q | F4/h.',
  },
  {
    title: 'オリジナル「雨の窓辺」',
    bpm: 84, key: 0, time: [4, 4],
    notes: 'A4/q C5/q E5/q D5/q | C5/q B4/q A4/h | F4/q A4/q G#4/q B4/q | A4/w',
  },
  {
    title: 'オリジナル「ちいさな行進」',
    bpm: 112, key: 2, time: [4, 4],
    notes: 'D4/q F#4/q A4/q F#4/q | G4/q B4/q A4/h | B4/e A4/e G4/e F#4/e E4/q A4/q | D4/w',
  },
  {
    title: 'オリジナル「はずむ心」',
    bpm: 100, key: 0, time: [4, 4],
    notes: 'C5/e B4/e A4/e G4/e E4/q G4/q | F4/e E4/e D4/e C4/e D4/h | E4/q G4/q C5/q E5/q | D5/q. C5/e C5/h',
  },
  {
    title: 'オリジナル「ブルーな午後」',
    bpm: 92, key: 0, time: [4, 4],
    notes: 'C4/q E4/q G4/q Bb4/q | A4/q F4/q D4/h | Eb4/q E4/q G4/q C5/q | C5/w',
  },
];

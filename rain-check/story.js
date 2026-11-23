// Rain Check: timeline. 120 BPM, 4/4, bar = 2.0 s, 15 bars = 30 s. Every cut sits on a bar line.
export const BPM = 120, BEAT = 0.5, BAR = 2, DUR = 30;
export const bar = n => n * BAR;
export const q12 = t => Math.floor(t * 12 + 1e-6) / 12;
export const q8 = t => Math.floor(t * 8 + 1e-6) / 8;
export const XAN = '#F7B538', BUR = '#780116';
export const T = {
  pat: 3.0, thunder: 4.0, hush0: 5.0, drop: 6.0, rain: 8.0, news: 10.0, run: 12.0, flash: 14.0,
  leaf: 14.6, eyes: 16.0, rip: 18.0, still: 20.0, title: 22.0, repaint: 26.0, end: 29.4,
};
// [start, end, name]
export const SHOTS = [
  [0, 3, 'walk'], [3, 4, 'pat'], [4, 6, 'crane'], [6, 8, 'drop'], [8, 10, 'case'], [10, 12, 'news'],
  [12, 14, 'run'], [14, 14.6, 'impact'], [14.6, 16, 'leaf'], [16, 18, 'eyes'], [18, 20, 'rip'],
  [20, 26, 'still'], [26, 30, 'after'],
];
export const shotAt = t => SHOTS.find(s => t >= s[0] && t < s[1]) || SHOTS[SHOTS.length - 1];
// thought subtitles (no voice): [in, out, text]
export const SUBS = [
  [3.4, 5.4, 'Umbrella...?'],
  [10.4, 12.4, 'Oh, come on.'],
  [15.2, 17.4, '...Okay. Nature, then.'],
];
export const CREDITS = [
  'Original score, sound design & animation: code-generated (numpy, Canvas 2D, WebGL)',
  'Fonts: Anton, Dela Gothic One, Barlow Semi Condensed (SIL Open Font License)',
];

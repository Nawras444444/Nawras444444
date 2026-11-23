export type Scene = {
  id: string;
  from: number; // start frame
  dur: number; // length in frames
  label?: string;
  headline: string;
  highlight?: string; // word(s) in the headline painted yellow
  vo: string;
  visual: 'counter' | 'swipe' | 'button' | 'none';
};

export const FPS = 30;
export const TOTAL_FRAMES = 1800; // 60 seconds at 30 fps

export const SCENES: Scene[] = [
  {id: 'hook', from: 0, dur: 120, headline: 'Posted on TikTok.', highlight: 'TikTok.',
    vo: "Posted on TikTok and got zero views? Here's the fix.", visual: 'counter'},
  {id: 'problem', from: 120, dur: 180, label: 'The problem', headline: 'Viewers decide in about 2 seconds.', highlight: '2 seconds.',
    vo: 'TikTok often shows a new video to a small audience first. If they keep watching, it reaches more people. If they swipe away, it stops.', visual: 'swipe'},
  {id: 'tip1', from: 300, dur: 240, label: 'Tip 1', headline: 'Hook in the first 2 seconds', highlight: 'Hook',
    vo: 'Tip one: start with the result or the question. Skip the intro. Say the hook out loud and show it on screen.', visual: 'none'},
  {id: 'tip2', from: 540, dur: 240, label: 'Tip 2', headline: 'Keep them watching', highlight: 'watching',
    vo: 'Tip two: keep them watching. Short videos, tight cuts, and a clear payoff. Make them want to see the end.', visual: 'none'},
  {id: 'tip3', from: 780, dur: 300, label: 'Tip 3', headline: 'Captions + keywords = found', highlight: 'found',
    vo: 'Tip three: add on-screen text and captions, and put your main keyword in your caption. Search reads it, and viewers with sound off can still follow.', visual: 'none'},
  {id: 'tip4', from: 1080, dur: 240, label: 'Tip 4', headline: 'Same topic. Same rhythm.', highlight: 'rhythm.',
    vo: 'Tip four: pick one niche and post on a regular schedule. Consistency helps TikTok learn who your audience is.', visual: 'none'},
  {id: 'tip5', from: 1320, dur: 210, label: 'Tip 5', headline: 'Reply to comments early', highlight: 'early',
    vo: 'Tip five: reply to comments in the first hour, and end with a question to start the conversation.', visual: 'none'},
  {id: 'recap', from: 1530, dur: 150, label: 'Recap', headline: 'Hook. Hold. Caption. Post. Reply.', highlight: 'Reply.',
    vo: 'Hook fast. Hold attention. Add captions. Post consistently. Reply to comments.', visual: 'none'},
  {id: 'cta', from: 1680, dur: 120, headline: 'Follow for Part 2', highlight: 'Part 2',
    vo: "Follow for more, and tell me in the comments which tip you're trying first.", visual: 'button'},
];

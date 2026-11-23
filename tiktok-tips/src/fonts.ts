import {loadFont as loadPoppins} from '@remotion/google-fonts/Poppins';
import {loadFont as loadCairo} from '@remotion/google-fonts/Cairo';

// Heavy geometric sans, like "Claude AI" on the poster.
export const {fontFamily: headingFont} = loadPoppins('normal', {
  weights: ['800', '900'],
  subsets: ['latin'],
});

// Cairo is the poster's Arabic-style face; it also has matching Latin glyphs.
export const {fontFamily: bodyFont} = loadCairo('normal', {
  weights: ['700', '800'],
  subsets: ['latin', 'arabic'],
});

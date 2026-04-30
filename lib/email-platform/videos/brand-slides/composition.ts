import { buildAnimationsScript } from './animations';
import { buildStyles } from './styles';
import {
  effectiveTotalSeconds,
  renderMusic,
  renderSlide1,
  renderSlide2,
  renderSlide3,
  renderSlide4,
  renderStinger,
} from './slides';
import { deriveLayout, type SlideInput } from './util';

export type { SlideInput } from './util';

export function buildBrandSlideVideoHtml(input: SlideInput): string {
  const L = deriveLayout(input);
  const styles = buildStyles(input, L);
  const stinger = renderStinger(input);
  const s1 = renderSlide1(input);
  const s2 = renderSlide2(input);
  const s3 = renderSlide3(input);
  const s4 = renderSlide4(input);
  const music = renderMusic(input);
  const script = buildAnimationsScript();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=${input.width}, height=${input.height}"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>${styles}</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${effectiveTotalSeconds(input)}" data-width="${input.width}" data-height="${input.height}">
${stinger}
${s1}
${s2}
${s3}
${s4}
${music}
</div>
<script>${script}</script>
</body>
</html>`;
}

type CompositionInput = {
  subjectLine: string;
  subtitle: string;
  ctaUrl: string;
  logoImagePath: string | null;
  heroImagePath: string | null;
  musicPath: string | null;
  width: number;
  height: number;
  brand: {
    primary: string;
    secondary: string;
    foreground: string;
    background: string;
    fontFamily: string;
  };
};

function esc(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildCampaignVideoHtml(input: CompositionInput): string {
  const isPortrait = input.height > input.width;
  const titleTop = isPortrait ? 130 : 120;
  const titleLeft = isPortrait ? 72 : 100;
  const titleWidth = isPortrait ? Math.round(input.width * 0.86) : Math.round(input.width * 0.47);
  const titleFontSize = isPortrait ? 84 : 86;
  const subtitleTop = isPortrait ? 480 : 470;
  const subtitleLeft = isPortrait ? 72 : 100;
  const subtitleWidth = isPortrait ? Math.round(input.width * 0.84) : Math.round(input.width * 0.43);
  const subtitleFontSize = isPortrait ? 44 : 34;
  const ctaTop = isPortrait ? input.height - 190 : input.height - 260;
  const ctaLeft = isPortrait ? 72 : 100;
  const ctaFontSize = isPortrait ? 42 : 36;
  const logoTop = 40;
  const logoRight = isPortrait ? 40 : 50;
  const logoWidth = isPortrait ? 210 : 260;
  const logoHeight = isPortrait ? 56 : 64;
  const heroTop = isPortrait ? 760 : 90;
  const heroLeft = isPortrait ? 72 : Math.round(input.width * 0.54);
  const heroWidth = isPortrait ? Math.round(input.width * 0.86) : Math.round(input.width * 0.41);
  const heroHeight = isPortrait ? 840 : Math.round(input.height * 0.72);
  const logo = input.logoImagePath ? `<img src="${esc(input.logoImagePath)}" alt="Brand logo" />` : '';
  const hero = input.heroImagePath ? `<img src="${esc(input.heroImagePath)}" alt="Campaign product" />` : '';
  const music = input.musicPath
    ? `<audio id="bg-audio" class="clip" data-start="0" data-duration="12" data-track-index="5" data-volume="0.28" src="${esc(input.musicPath)}"></audio>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${input.width}, height=${input.height}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${input.width}px; height: ${input.height}px; overflow: hidden; }
      body { background: linear-gradient(160deg, ${esc(input.brand.primary)} 0%, ${esc(input.brand.secondary)} 100%); color: ${esc(input.brand.foreground)}; font-family: ${esc(input.brand.fontFamily)}; }
      #root { position: relative; width: ${input.width}px; height: ${input.height}px; }
      .clip { position: absolute; }
      #title { top: ${titleTop}px; left: ${titleLeft}px; width: ${titleWidth}px; font-size: ${titleFontSize}px; line-height: 1.06; font-weight: 700; }
      #sub { top: ${subtitleTop}px; left: ${subtitleLeft}px; width: ${subtitleWidth}px; font-size: ${subtitleFontSize}px; line-height: 1.4; color: ${esc(input.brand.background)}; }
      #cta { top: ${ctaTop}px; left: ${ctaLeft}px; font-size: ${ctaFontSize}px; color: ${esc(input.brand.background)}; letter-spacing: 0.08em; text-transform: uppercase; }
      #logo { top: ${logoTop}px; right: ${logoRight}px; width: ${logoWidth}px; height: ${logoHeight}px; display: flex; justify-content: flex-end; align-items: center; }
      #logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
      #hero { top: ${heroTop}px; left: ${heroLeft}px; width: ${heroWidth}px; height: ${heroHeight}px; border-radius: 24px; overflow: hidden; background: rgba(255,255,255,0.12); box-shadow: 0 35px 80px rgba(0,0,0,0.45); }
      #hero img { width: 100%; height: 100%; object-fit: cover; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="12" data-width="${input.width}" data-height="${input.height}">
      <div id="title" class="clip" data-start="0" data-duration="12" data-track-index="0">${esc(input.subjectLine)}</div>
      <div id="sub" class="clip" data-start="0" data-duration="12" data-track-index="1">${esc(input.subtitle)}</div>
      <div id="cta" class="clip" data-start="0" data-duration="12" data-track-index="2">${esc(input.ctaUrl)}</div>
      <div id="hero" class="clip" data-start="0" data-duration="12" data-track-index="3">${hero}</div>
      <div id="logo" class="clip" data-start="0" data-duration="12" data-track-index="4">${logo}</div>
      ${music}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.from("#title", { opacity: 0, y: 40, duration: 0.9, ease: "power3.out" }, 0)
        .from("#sub", { opacity: 0, y: 30, duration: 0.8, ease: "power2.out" }, 0.3)
        .from("#cta", { opacity: 0, y: 20, duration: 0.8, ease: "power2.out" }, 0.55)
        .from("#hero", { opacity: 0, x: 120, duration: 1.0, ease: "power3.out" }, 0.35)
        .from("#logo", { opacity: 0, y: -20, duration: 0.6, ease: "power2.out" }, 0.4);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>`;
}

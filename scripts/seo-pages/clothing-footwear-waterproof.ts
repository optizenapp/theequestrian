import type { PageSEOContent } from '../run-page-seo-update';

/**
 * /clothing/footwear/waterproof — April 2026
 *
 * Intent (Ahrefs matching terms): waterproof riding boots, tall waterproof riding boots,
 * waterproof horse riding boots, yard/stable wet weather, women’s/men’s waterproof boots.
 *
 * Below-grid tables follow the same idea as Trailrace’s waterproof collection page: a
 * brand-orientation table plus a leather-vs-rubber comparison (`table-wrap` + globals.css).
 *
 * Internal links: parent /clothing/footwear, siblings, /brands/ariat, /brands/cavallo.
 */
const content: PageSEOContent = {
  url_path: '/clothing/footwear/waterproof',

  meta_title: 'Waterproof Riding Boots Australia | The Equestrian',
  meta_description:
    'Shop waterproof riding boots in Australia for wet yards, winter schooling and everyday stable work. Free shipping Australia-wide at The Equestrian.',
  h1_title: 'Waterproof Riding Boots & Wet-Weather Equestrian Footwear',
  breadcrumb_label: 'Waterproof',

  short_description: `<p>Shop <strong>waterproof riding boots</strong> and wet-weather equestrian footwear built for Australian rain, mud and long days around the yard—without giving up stirrup-friendly fit when you ride.</p>
<!--read-more-trigger-->
<p>Browse tall and short waterproof options alongside the wider <a href="/clothing/footwear">equestrian footwear</a> range, including <a href="/clothing/footwear/riding-boots">riding boots</a> for competition-focused riders.</p>`,

  long_description: `<h2>Waterproof Riding Boots Explained</h2>
<p>
Waterproof riding boots answer a simple problem: keeping feet drier and more comfortable when weather, wash bays and paddocks stay wet. Shoppers often compare tall waterproof styles for a classic riding line with shorter waterproof yard boots that are easier to slip on for chores. Materials, linings and sole grip vary by brand, so use each product page for care, warmth rating and fit notes before you buy.
</p>

<h3>Tall & Long Waterproof Styles</h3>
<p>
Tall waterproof riding boots suit riders who want more coverage through the calf in wet grass or arena footing. If you want a dedicated tall-boot edit without filtering to waterproof-only, explore our <a href="/clothing/footwear/tall-boots">tall boots</a> collection for additional styles and fits.
</p>

<h3>Short, Yard & Everyday Waterproof Boots</h3>
<p>
Waterproof yard boots, muck boots and short riding boots are practical for stable work, float loading and quick rides when you do not need a full competition polish. Pair them with <a href="/clothing/footwear/ankle-boots">ankle boots</a> picks when you want a smarter short boot for mixed barn and saddle use.
</p>

<h3>Fit, Warmth & Care</h3>
<p>
Waterproof membranes and treated leathers behave differently in heat and humidity. Check width, calf height and any insulated lining if you ride early mornings or in cooler regions. Rotate pairs when possible and follow the brand care guide so waterproofing lasts across seasons.
</p>

<h2>Waterproof boot brands in this collection</h2>
<p>
Use the comparison below to orient quickly, then open each brand hub for the full range beyond waterproof-only picks.
</p>
<div class="table-wrap"><table>
<thead><tr><th scope="col">Brand</th><th scope="col">Speciality</th><th scope="col">Typical range</th></tr></thead>
<tbody>
<tr><td><a href="/brands/ariat">Ariat</a></td><td>Waterproof paddock, country and yard lines with H2O-style membranes where offered</td><td>Mid to premium</td></tr>
<tr><td><a href="/brands/cavallo">Cavallo</a></td><td>Technical riding boots; check individual styles for wet-weather ratings</td><td>Mid to premium</td></tr>
</tbody>
</table></div>

<h2>Waterproof leather vs rubber yard boots</h2>
<p>
Leather boots with a membrane (often labelled H2O or WP) stay more breathable for mixed riding and barn days. Full rubber yard boots are simpler to hose off after mud but are usually not intended for stirrup work.
</p>
<div class="table-wrap"><table>
<thead><tr><th scope="col">Feature</th><th scope="col">Waterproof leather (H2O / WP)</th><th scope="col">Rubber yard boots</th></tr></thead>
<tbody>
<tr><td>Best for</td><td>Riding, yard work, longer wear days</td><td>Mucking out, wet paddocks, float loading</td></tr>
<tr><td>Breathability</td><td>Generally better</td><td>Limited</td></tr>
<tr><td>Cleaning</td><td>Wipe down; condition per brand guidance</td><td>Hose off and air dry</td></tr>
<tr><td>Stirrup use</td><td>Yes, when the heel and sole are riding-safe</td><td>Usually not</td></tr>
<tr><td>Longevity with care</td><td>Often several seasons</td><td>Varies with use and rubber grade</td></tr>
</tbody>
</table></div>

<h3>At a glance</h3>
<ul>
<li>Choose tall coverage for wet grass and schooling; short boots for fast yard jobs.</li>
<li>Check lining and sole grip for winter yards and slippery concrete.</li>
<li>Match boot height to your riding style: dressage, jumping or casual hacking.</li>
<li>Shop trusted equestrian footwear brands available in Australia at The Equestrian.</li>
</ul>`,

  faq_items: [
    {
      question: 'Are waterproof riding boots true to size?',
      answer:
        'Most waterproof riding boots follow the same sizing principles as standard tall or short boots, but insulated or lined models can feel snugger. Measure your foot length and calf circumference, then compare to the brand size chart on the product page. If you are between sizes, your retailer can advise based on sock thickness and intended use.',
    },
    {
      question: 'How do I care for waterproof leather or synthetic boots?',
      answer:
        'Rinse mud after use, let boots dry at room temperature away from direct heaters, and use only cleaners or conditioners recommended for waterproof finishes. Harsh solvents can strip treatments that keep water out. Store upright with boot trees or shapers when possible to preserve the shaft shape.',
    },
  ],
};

export default content;

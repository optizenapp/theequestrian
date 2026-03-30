import type { PageSEOContent } from '../run-page-seo-update';

/**
 * /horse/rugs/winter — optimised March 2026
 * GSC clusters:
 *   - Core: winter horse rugs (19 imp, pos 39 — big gap)
 *   - Foal/pony: foal rugs (26 imp, pos 9), foal rug (14 imp, pos 10) — fast wins
 *   - Heavyweight/spec: heavyweight horse rug (pos 6), 1200d/1200 denier (pos 11-16)
 *   - Material: polar fleece, canvas combo, merino wool
 *   - Brand: thermomaster (pos 1.83, clicks — protect); kozy (pos 20)
 *     No brand block: neither thermomaster nor kozy has a brand_content row
 *
 * Internal links:
 *   - Parent: rendered by CollectionDescription (Next.js Link to parent_url /horse/rugs)
 *   - Sibling: /horse/rugs/summer in long_description
 */
const content: PageSEOContent = {
  url_path: '/horse/rugs/winter',

  meta_title: 'Winter Horse Rugs - Heavyweight, Combo and Turnout | The Equestrian',
  meta_description:
    'Shop winter horse rugs in Australia including heavyweight turnout rugs, combo rugs, foal rugs and fleece options. Free shipping. All weights and sizes available.',
  h1_title: 'Winter Horse Rugs for Every Cold-Weather Condition',
  breadcrumb_label: 'Winter Rugs',

  short_description: `<p>Browse our range of <strong>winter horse rugs</strong> designed to keep your horse warm, dry and comfortable through the coldest months.</p>
<!--read-more-trigger-->
<p>From lightweight fleece rugs to heavily insulated 1200-denier turnout rugs, we stock options for all climates and conditions, including sizes for foals, ponies and full-sized horses.</p>

<p>Whether you need a waterproof combo rug for wet paddock conditions or a stable fleece for cooler nights, you will find the right weight and fit in the products below.</p>`,

  long_description: `<h2>Winter Horse Rugs Explained</h2>

<p>
Choosing the right <strong>winter horse rug</strong> depends on your horse's environment, breed, clip and the conditions you're riding or turning out in. The key variables are fill weight, waterproofing and whether you need a combo (neck attachment) or standard cut.
</p>

<h3>Heavyweight and Waterproof Turnout Rugs</h3>
<p>
For cold, wet Australian winters, <strong>heavyweight horse rugs</strong> in 300g to 400g fill provide serious insulation while a 1200-denier outer keeps moisture out. A waterproof turnout rug is essential for horses living out in paddocks, so look for taped seams and breathable membranes to prevent overheating on milder days. When the season changes, our <a href="/horse/rugs/summer">summer horse rugs</a> offer lighter protection for warmer months.
</p>

<h3>Foal and Pony Winter Rugs</h3>
<p>
Young horses and smaller breeds lose heat faster and need well-fitting rugs that do not restrict movement. Our range includes <strong>foal rugs</strong> and pony sizes starting from 3'6", designed with shorter body lengths and adjustable surcingles to stay secure as foals grow.
</p>

<h3>Fleece, Wool and Canvas Combo Rugs</h3>
<p>
<strong>Polar fleece horse rugs</strong> work well as under-rugs, coolers or light stable covers on milder nights. Canvas combo rugs offer a more traditional, breathable outer layer suited to drier conditions. For natural fibre warmth, <strong>merino wool rugs</strong> regulate temperature well and are a good choice for horses sensitive to synthetic fills.
</p>

<h2>Winter Horse Rug FAQs</h2>

<h3>What fill weight do I need for a winter horse rug?</h3>
<p>
As a guide: 0g (no fill) for mild nights, 100g to 200g for cool conditions, 300g or more for cold winters or clipped horses. Horses living out in wet paddocks should always have a waterproof outer regardless of fill.
</p>

<h3>What does 1200D mean on a horse rug?</h3>
<p>
1200D refers to 1200-denier fabric, which indicates the thread count of the outer shell. Higher denier means greater tear resistance. A <strong>1200-denier horse rug</strong> is suited to horses that roll, rub on fences or live out in tough conditions.
</p>

<h3>What size winter rug does a foal need?</h3>
<p>
Foal rugs are sized by back length in inches (e.g. 36", 42", 48"). Measure from the centre of the chest to the point of the tail along the back. Fit should allow freedom at the shoulder and sit snug at the chest without pulling.
</p>

<h3>Can I use a combo rug on a clipped horse?</h3>
<p>
Yes. A combo rug with an integrated or detachable neck cover is ideal for clipped horses as it covers the neck and shoulder where body heat escapes fastest. Choose a combo with at least 300g fill for horses in full or trace clips during winter.
</p>`,
};

export default content;

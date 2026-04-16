import type { PageSEOContent } from '../run-page-seo-update';

/**
 * /horse/pads/western - optimised April 2026
 *
 * GSC top queries:
 *   - western saddle pad (10 imp, pos 11.6)
 *   - western saddle pads (4 imp, pos 9)
 *   - western saddle pads australia (3 imp, pos 12.33)
 *   - thin line pad (1 imp, pos 6)
 *
 * Ahrefs top volume clusters:
 *   - western saddle pad (350 vol AU) - primary target
 *   - western saddle pad australia (30), saddle pad western (30), pink western saddle pad (30)
 *   - contoured western saddle pad (20), western saddle pad with shims (10)
 *   - wither relief (10-20 vol), high withers, shimmable, swayback
 *   - Material: felt (10), sheepskin (10), wool (10), fleece, gel, neoprene
 *   - Colour: pink, turquoise, teal, red, black, blue, purple (each 10 vol)
 *   - Non-slip (100 global), trail, barrel, show, correction
 *   - Informational: sizing, how to fit, how to clean
 *   - Brand: mattes western saddle pad (10), thinline (branded)
 *
 * Internal links:
 *   - Parent: /horse/pads - rendered by CollectionDescription (NOT in HTML)
 *   - Sibling: /horse/tack (broader context, long_description)
 *   - Brand: /brands/mattes, /brands/thinline-global-australia
 */
const content: PageSEOContent = {
  url_path: '/horse/pads/western',

  meta_title: 'Western Saddle Pads Australia | Felt, Wool & Contoured | The Equestrian',
  meta_description:
    'Shop western saddle pads in Australia at The Equestrian. Browse contoured, felt, wool, sheepskin and shimmable western pads for trail, show and everyday riding. Free shipping sitewide.',
  h1_title: 'Western Saddle Pads for Trail, Show & Everyday Riding',
  breadcrumb_label: 'Western Pads',

  short_description: `<p>Browse <strong>western saddle pads</strong> suited to trail riding, show work and everyday use, with options across felt, wool, sheepskin, contoured and shimmable styles.</p>
<!--read-more-trigger-->
<p>This collection covers a range of fits and fabrics to suit different western saddles and horses, including pads with wither relief cutouts, shim pockets and non-slip liners for horses that need extra support or a more precise saddle fit.</p>

<p>For the broader saddle pad range across all disciplines, browse our full <a href="/horse/pads">horse pads and saddle cloths</a> collection.</p>`,

  long_description: `<h2>Western Saddle Pads Explained</h2>
<p>
A western saddle pad sits between the horse's back and the western saddle, cushioning pressure points, absorbing sweat and helping to keep the saddle in position. Choosing the right pad depends on the horse's conformation, the saddle's fit and the type of riding being done. A pad that is too thin, too thick or poorly shaped for the horse can affect comfort and saddle stability equally.
</p>

<h3>Contoured & Fitted Western Pads</h3>
<p>
Contoured western saddle pads are shaped to follow the natural line of the horse's back rather than sitting flat. This helps reduce pressure along the spine and across the shoulder, making them a practical choice for horses that are sensitive through the back or for riders covering longer distances. They work well under a range of western saddle styles and are commonly chosen for trail and endurance use.
</p>

<h3>Wither Relief & High Wither Pads</h3>
<p>
Horses with prominent or high withers often need a pad with a wither relief cutout to prevent pressure and rubbing at the withers when the saddle is cinched down. Wither relief western saddle pads are cut away at the front to create clearance across the wither and shoulder, allowing the saddle to sit correctly without causing discomfort or restricting movement.
</p>

<h3>Shimmable Western Saddle Pads</h3>
<p>
Shimmable western saddle pads include built-in pockets that allow shims to be added or removed to correct saddle balance. This is particularly useful for horses that are uneven through the back, downhill in build or have a saddle that rocks or tips to one side. Shimming allows a rider to fine-tune the fit without replacing the saddle.
</p>

<h3>Felt, Wool & Sheepskin Western Pads</h3>
<p>
Felt western saddle pads are a traditional choice that provides firm, even support under the saddle and is easy to brush clean after use. Wool and sheepskin pads offer natural breathability and moisture-wicking properties, making them well suited to longer rides in variable conditions. Fleece-lined options add extra cushioning while remaining lightweight.
</p>

<h3>Non-Slip & Gel Western Pads</h3>
<p>
Non-slip western saddle pads have a grippy underside that helps prevent the saddle from shifting during work. Gel pads are designed to absorb impact and distribute pressure more evenly, which can be useful for horses with sore or sensitive backs. Both styles are often used under a standard pad as a liner rather than as a standalone saddle pad.
</p>

<h2>Shop Western Saddle Pads by Brand</h2>
<p>
For riders looking for quality fitted and shimmable options, <a href="/brands/mattes">Mattes</a> is a well-regarded choice for western and performance pads, offering a range of contoured styles with interchangeable shim inserts. ThinLine is another strong option in this space, especially for riders comparing felt, liner and correction styles, so you can also browse <a href="/brands/thinline-global-australia">ThinLine Global Australia</a>. For a broader view of saddle support and correction options, our <a href="/horse/tack">horse tack</a> collection covers related riding equipment.
</p>

`,

  faq_items: [
    {
      question: 'What size western saddle pad do I need?',
      answer:
        'Most western saddle pads are sized at 30x30 inches or 32x32 inches for a standard square skirt saddle. Round skirt saddles typically need a pad cut to match the rounded shape. The pad should extend at least two to three inches beyond the saddle on all sides to protect the horse\'s back. If your horse has a broader or narrower build, checking the manufacturer\'s fit guide is the most reliable way to confirm the right size.',
    },
    {
      question: 'What is the difference between a contoured and a flat western saddle pad?',
      answer:
        'A flat western saddle pad sits evenly across the horse\'s back without any shaping, while a contoured pad is cut and shaped to follow the natural curve of the spine and slope of the shoulder. Contoured pads tend to sit more securely, reduce pressure points and suit horses with more pronounced back curves or prominent withers.',
    },
    {
      question: 'Are shimmable western saddle pads worth it?',
      answer:
        'Shimmable western saddle pads are worth considering if your saddle does not sit level on your horse\'s back, if the horse is downhill in build or if you are noticing uneven sweat patterns under the pad after riding. They allow you to adjust the fit of an existing saddle without buying a new one, making them a practical and cost-effective solution for many horses.',
    },
    {
      question: 'How do I clean a western saddle pad?',
      answer:
        'Most felt and synthetic western saddle pads can be brushed off when dry to remove hair and dried sweat, then spot-cleaned or hand-washed in cool water. Wool and sheepskin pads usually need a gentle wool wash and should be air-dried flat rather than machine-dried to avoid shrinkage or damage to the fibres. Always check the care label on the specific pad before washing.',
    },
  ],
};

export default content;

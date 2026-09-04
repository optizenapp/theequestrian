import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/kitchen/glassware',

  // Layout appends " | The Equestrian" → SERP title lands at 57 chars.
  meta_title: 'Equestrian Glassware | Wine & Tumblers',
  meta_description:
    'Shop horse-themed wine glasses, champagne flutes, gin balloons and tumbler sets in Australia. Compare stemmed, stemless and set packs by size and care.',
  h1_title: 'Equestrian Glassware',
  breadcrumb_label: 'Glassware',

  short_description: `<p>Shop <strong>equestrian glassware</strong> for horse-themed drinkware cut from glass: stemmed and stemless wine glasses, champagne flutes, gin balloons, hi-ball tumblers and matching multi-piece sets.</p>
<!--read-more-trigger-->
<p>Listings often sell as a single glass, a pair, or a set of four or six. Motifs range from dressage, polo, racehorse and campdraft scenes to snaffle and horseshoe hardware on the stem or bowl. Read capacity, height and wash guidance on each product page before you choose.</p>
<p>Ceramic everyday cups belong on <a href="/accessories/kitchen/mugs">equestrian mugs</a>. Openers, holders and bar tools sit on <a href="/accessories/kitchen/barware">equestrian barware</a>. Table protectors sit on <a href="/accessories/kitchen/coasters">equestrian coasters</a>.</p>`,

  long_description: `<h2>What Is Equestrian Glassware?</h2>
<p>Equestrian glassware is glass drinkware decorated with horse, discipline or tack motifs, sold for table service rather than as ceramic mugs or soft home decor.</p>
<p>Common silhouettes on this leaf include:</p>
<ul>
<li>Stemmed wine glasses and champagne flutes</li>
<li>Stemless wine bowls and gin balloons</li>
<li>Tumblers and hi-ball glasses</li>
<li>Pairs and boxed sets (often four or six pieces)</li>
</ul>

<h2>Stemmed, Stemless and Set Packs</h2>
<p>Stemmed pieces keep hand heat off the bowl and suit formal pours. Stemless bowls and tumblers stack more easily for everyday use. Set packs match print and capacity across multiple glasses, while pair listings suit smaller cabinets or gifts for two.</p>

<h2>Equestrian Glassware vs Mugs</h2>
<p>Mugs are ceramic (or similar) cups for hot drinks. Glassware here is glass drinkware for wine, spirits and cold serves. Keep everyday cups on the mugs leaf when the listing is not glass stemware or tumblers.</p>

<h2>Equestrian Glassware vs Barware</h2>
<p>Barware covers tools and holders such as openers and stands. Glassware is the vessel that holds the drink. Compare tools on the barware leaf when you need accessories rather than glasses.</p>

<h2>Equestrian Glassware vs Coasters and Trays</h2>
<p>Coasters protect the table surface under a glass. Trays move glassware and plates between rooms. Neither replaces the drink vessel itself. See <a href="/accessories/kitchen/trays">equestrian trays</a> when you need a carry surface, and keep table mats on the coasters leaf.</p>

<h2>How to Choose Horse Theme Glassware</h2>
<p>Match silhouette to the pour (wine, champagne, gin, hi-ball), then check listed dimensions, piece count and care notes. Motif alone does not move a glass into riding equipment on <a href="/horse/tack">horse tack</a>. Soft kitchen textiles sit on <a href="/accessories/kitchen/tea-towels">equestrian tea towels</a>, and platters or boards sit on <a href="/accessories/kitchen/servingware">equestrian servingware</a>. Mixed present-scale items without a clear glassware type stay on <a href="/accessories/gifts">equestrian gifts</a>.</p>`,

  faq_items: [
    {
      question: 'What products belong on the equestrian glassware page?',
      answer:
        'Wine glasses, champagne flutes, gin balloons, tumblers, hi-ball glasses and matching glass sets with horse or tack motifs. Ceramic mugs, bar tools, coasters and trays sit on sibling kitchen leaves. Read capacity, piece count and wash notes on each listing before you buy. Australian shipping options show at checkout for each vendor.',
    },
    {
      question: 'Should I buy a pair, a set, or a single glass?',
      answer:
        'Choose a single glass when you need one replacement or a sample silhouette. Pairs suit two place settings. Sets of four or six keep print and capacity matched for a full table. Check the title and options for piece count, because pair and set packs are priced and packed differently from singles.',
    },
    {
      question: 'How is glassware different from equestrian mugs?',
      answer:
        'Glassware on this page is glass drinkware for wine, champagne, spirits and cold serves, including stemmed and stemless shapes. Mugs are everyday cups, usually ceramic, for hot drinks. If the listing is a cup rather than a wine glass, flute, balloon or tumbler, shop the mugs leaf instead so you compare like with like.',
    },
    {
      question: 'Can I give equestrian glassware as a present?',
      answer:
        'Yes. Pair and boxed set packs are common present formats, and wrapping a glass set does not move it into apparel or riding tack. Keep clothing and rider gear on those silos, and keep soft home textiles or mixed gift leftovers on their own pages. Confirm dimensions and care notes so the recipient can wash and store the pieces safely.',
    },
    {
      question: 'How should I care for horse theme wine glasses and tumblers?',
      answer:
        'Follow the care line on each product page. Many etched, printed or jewelled glasses prefer hand washing or a gentle dishwasher cycle, and stemmed pieces need space so bowls do not knock. Dry stems upright and store sets together so prints stay matched. When guidance is missing, treat decorated glass as hand-wash first.',
    },
  ],
};

export const frameworkNotes: SubcollectionFrameworkNotes = {
  centralEntity: 'equestrian glassware',
  primaryAngle:
    'Glass drinkware silhouettes (stemmed, stemless, flute, balloon, tumbler) and pair or multi-piece packs with horse motifs, not ceramic mugs or bar tools.',
  informationGain: [
    'Stemmed wine and champagne vs stemless bowls vs gin balloons vs hi-ball tumblers.',
    'Sold as singles, pairs, and sets of four or six with matched print.',
    'Motifs include discipline scenes plus snaffle or horseshoe hardware on stem or bowl.',
    'Care and capacity sit on the listing; decorated glass often needs gentle washing.',
    'Ceramic mugs are a sibling leaf, not glass drinkware.',
    'Barware is tools and holders; coasters and trays are table support, not vessels.',
    'Horse motif does not reclassify a glass as riding tack.',
  ],
  closestSibling: '/accessories/kitchen/mugs',
  overlapSplit:
    'Glassware = glass drink vessels and sets. Mugs = ceramic everyday cups. Barware = tools/holders. Coasters/trays = table support and carry.',
  verifyBeforePublishing: [
    'No parent /accessories/kitchen link in HTML.',
    'Sibling kitchen leaf URLs live.',
    'No hardcoded product counts.',
    'No GSC stuffing (new page).',
  ],
  anchors: [
    { text: 'equestrian mugs', href: '/accessories/kitchen/mugs' },
    { text: 'equestrian barware', href: '/accessories/kitchen/barware' },
    { text: 'equestrian coasters', href: '/accessories/kitchen/coasters' },
    { text: 'equestrian trays', href: '/accessories/kitchen/trays' },
    { text: 'horse tack', href: '/horse/tack' },
    { text: 'equestrian tea towels', href: '/accessories/kitchen/tea-towels' },
    { text: 'equestrian servingware', href: '/accessories/kitchen/servingware' },
    { text: 'equestrian gifts', href: '/accessories/gifts' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

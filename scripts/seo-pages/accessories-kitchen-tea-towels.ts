import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/kitchen/tea-towels',

  meta_title: 'Equestrian Tea Towels | Horse Kitchen Linen',
  meta_description:
    'Horse-themed tea towels for kitchen use. Bedding and throws sit under homeware. Shop Australia-wide with clear product details.',
  h1_title: 'Equestrian Tea Towels',
  breadcrumb_label: 'Tea Towels',

  short_description: `<p>Browse <strong>equestrian tea towels</strong>: Tea towels and kitchen cloth with horse motifs, not bed linen and not bath towels sold as bedding.</p>
<!--read-more-trigger-->
<p>Open sibling leaves when the job changes. Stay on this page when the listing matches this object type.</p>
<p>Australian shipping applies as on other accessories pages. Read dimensions on each listing.</p>

<p>Compare sibling leaves when the job changes rather than treating every horse motif as the same product. Stay here when the listing matches this object type. Check care notes and dimensions on the product page before you buy, and expect Australian shipping options at checkout for each vendor listing.</p>`,

  long_description: `<h2>What Are Equestrian Tea Towels?</h2>
<p>Tea towels and kitchen cloth with horse motifs, not bed linen and not bath towels sold as bedding.</p>
<p>Typical pieces include:</p>
<ul>
<li>Kitchen tea towels</li>
<li>Printed horse motifs</li>
<li>Drying and display cloths</li>
</ul>

<h2>Equestrian Tea Towels vs Bedding</h2>
<p>Bedding is for beds. Tea towels are kitchen cloth. See <a href="/accessories/homeware/bedding">bedding</a>.</p>

<h2>Equestrian Tea Towels vs Throws</h2>
<p>Throws drape furniture. Tea towels dry dishes. See <a href="/accessories/homeware/throws">throws</a>.</p>

<h2>Equestrian Tea Towels vs Stationery</h2>
<p>Stationery is paper. Tea towels are cloth. See <a href="/accessories/cards/stationery">stationery</a>.</p>

<h2>Related Accessories</h2>
<p>Pair trays with tea towels for a kitchen gift set idea. Compare <a href="/accessories/kitchen/trays">trays</a>.</p>

<h2>How to Choose</h2>
<p>Match the room job and check size on the listing. Do not treat a horse motif as riding tack from <a href="/horse/tack">horse tack</a>.</p>
<p>Mixed leftovers without this type stay on <a href="/accessories/gifts">equestrian gifts</a>.</p>`,

  faq_items: [
    {
        question: "What belongs on the tea towels page?",
        answer: "Tea towels and kitchen cloth with horse motifs, not bed linen and not bath towels sold as bedding. Sibling leaves cover related but different jobs. Choose by the product type and how you will use the piece at home. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "How is this different from the gifts hub?",
        answer: "Gifts holds mixed present-scale leftovers. This leaf is for typed equestrian tea towels. When the listing matches this type, shop here so you compare like with like. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "Can I give these as presents?",
        answer: "Yes. Wrapping a piece as a present does not move it to apparel or tack. Keep wearables on clothing or rider pages, and keep riding equipment in the horse silo. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "Where do kitchen pieces sit?",
        answer: "Mugs, trays and glassware sit under equestrian kitchen. Soft and hard room decor sit under homeware leaves such as this one when they match the type. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    }
],
};

export const frameworkNotes: SubcollectionFrameworkNotes = {
  centralEntity: 'equestrian tea towels',
  primaryAngle:
    'Tea towels and kitchen cloth with horse motifs, not bed linen and not bath towels sold as bedding.',
  informationGain: [
    'Typed leaf under homeware, not residual gifts.',
    'Sibling soft or hard leaves cover different jobs.',
    'Kitchen tableware is a separate hub.',
    'Motif does not equal riding tack.',
    'Read dimensions on the listing.',
    'Outdoor vs indoor splits where relevant.',
    'Wearables stay on clothing or rider.',
  ],
  closestSibling: '/accessories/kitchen/servingware',
  overlapSplit: `equestrian tea towels vs siblings on homeware and kitchen.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Sibling leaf links live.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'bedding', href: '/accessories/homeware/bedding' },
    { text: 'throws', href: '/accessories/homeware/throws' },
    { text: 'stationery', href: '/accessories/cards/stationery' },
    { text: 'trays', href: '/accessories/kitchen/trays' },
    { text: 'tack', href: '/horse/tack' },
    { text: 'gifts', href: '/accessories/gifts' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

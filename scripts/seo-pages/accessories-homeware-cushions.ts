import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/homeware/cushions',

  meta_title: 'Equestrian Cushions | Horse Theme Covers',
  meta_description:
    'Horse-themed cushions and cushion covers for sofas and chairs. Throws and wall art sit on sibling homeware pages. Shop Australia-wide with clear product de',
  h1_title: 'Equestrian Cushions',
  breadcrumb_label: 'Cushions',

  short_description: `<p>Browse <strong>equestrian cushions</strong>: Cushions and cushion covers with horse motifs for seating, not trays and not wall prints.</p>
<!--read-more-trigger-->
<p>Open sibling leaves when the job changes. Stay on this page when the listing matches this object type.</p>
<p>Australian shipping applies as on other accessories pages. Read dimensions on each listing.</p>

<p>Compare sibling leaves when the job changes rather than treating every horse motif as the same product. Stay here when the listing matches this object type. Check care notes and dimensions on the product page before you buy, and expect Australian shipping options at checkout for each vendor listing.</p>`,

  long_description: `<h2>What Are Equestrian Cushions?</h2>
<p>Cushions and cushion covers with horse motifs for seating, not trays and not wall prints.</p>
<p>Typical pieces include:</p>
<ul>
<li>Cushion covers and filled cushions</li>
<li>Horse and discipline motifs</li>
<li>Indoor soft seating accents</li>
</ul>

<h2>Equestrian Cushions vs Throws</h2>
<p>Throws cover laps and beds. Cushions are seat pads and covers. See <a href="/accessories/homeware/throws">throws</a>.</p>

<h2>Equestrian Cushions vs Wall art</h2>
<p>Wall art hangs. Cushions sit on furniture. See <a href="/accessories/homeware/wall-art">wall art</a>.</p>

<h2>Equestrian Cushions vs Kitchen mugs</h2>
<p>Mugs are drinkware. Cushions are soft furnishings. See <a href="/accessories/kitchen/mugs">kitchen mugs</a>.</p>

<h2>Related Accessories</h2>
<p>Bedding covers beds. Cushions cover seats. Compare <a href="/accessories/homeware/bedding">bedding</a>.</p>

<h2>How to Choose</h2>
<p>Match the room job and check size on the listing. Do not treat a horse motif as riding tack from <a href="/horse/tack">horse tack</a>.</p>
<p>Mixed leftovers without this type stay on <a href="/accessories/gifts">equestrian gifts</a>.</p>`,

  faq_items: [
    {
        question: "What belongs on the cushions page?",
        answer: "Cushions and cushion covers with horse motifs for seating, not trays and not wall prints. Sibling leaves cover related but different jobs. Choose by the product type and how you will use the piece at home. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "How is this different from the gifts hub?",
        answer: "Gifts holds mixed present-scale leftovers. This leaf is for typed equestrian cushions. When the listing matches this type, shop here so you compare like with like. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
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
  centralEntity: 'equestrian cushions',
  primaryAngle:
    'Cushions and cushion covers with horse motifs for seating, not trays and not wall prints.',
  informationGain: [
    'Typed leaf under homeware, not residual gifts.',
    'Sibling soft or hard leaves cover different jobs.',
    'Kitchen tableware is a separate hub.',
    'Motif does not equal riding tack.',
    'Read dimensions on the listing.',
    'Outdoor vs indoor splits where relevant.',
    'Wearables stay on clothing or rider.',
  ],
  closestSibling: '/accessories/homeware/throws',
  overlapSplit: `equestrian cushions vs siblings on homeware and kitchen.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Sibling leaf links live.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'throws', href: '/accessories/homeware/throws' },
    { text: 'wall art', href: '/accessories/homeware/wall-art' },
    { text: 'mugs', href: '/accessories/kitchen/mugs' },
    { text: 'bedding', href: '/accessories/homeware/bedding' },
    { text: 'tack', href: '/horse/tack' },
    { text: 'gifts', href: '/accessories/gifts' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

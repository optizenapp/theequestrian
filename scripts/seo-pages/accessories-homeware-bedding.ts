import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/homeware/bedding',

  meta_title: 'Equestrian Bedding | Doonas & Linen',
  meta_description:
    'Horse-themed bedding and linen for beds. Throws and cushions sit on sibling soft pages. Shop Australia-wide with clear product details.',
  h1_title: 'Equestrian Bedding',
  breadcrumb_label: 'Bedding',

  short_description: `<p>Browse <strong>equestrian bedding</strong>: Bedding, doonas and bed linen with horse themes, not sofa throws and not tea towels.</p>
<!--read-more-trigger-->
<p>Open sibling leaves when the job changes. Stay on this page when the listing matches this object type.</p>
<p>Australian shipping applies as on other accessories pages. Read dimensions on each listing.</p>

<p>Compare sibling leaves when the job changes rather than treating every horse motif as the same product. Stay here when the listing matches this object type. Check care notes and dimensions on the product page before you buy, and expect Australian shipping options at checkout for each vendor listing.</p>`,

  long_description: `<h2>What Are Equestrian Bedding?</h2>
<p>Bedding, doonas and bed linen with horse themes, not sofa throws and not tea towels.</p>
<p>Typical pieces include:</p>
<ul>
<li>Doonas and covers</li>
<li>Bed linen sets</li>
<li>Horse motif sleep textiles</li>
</ul>

<h2>Equestrian Bedding vs Throws</h2>
<p>Throws drape casually. Bedding is for made beds. See <a href="/accessories/homeware/throws">throws</a>.</p>

<h2>Equestrian Bedding vs Cushions</h2>
<p>Cushions are seating. Bedding covers mattresses. See <a href="/accessories/homeware/cushions">cushions</a>.</p>

<h2>Equestrian Bedding vs Tea towels</h2>
<p>Tea towels are kitchen cloth, not bed linen. See <a href="/accessories/kitchen/tea-towels">tea towels</a>.</p>

<h2>Related Accessories</h2>
<p>Sleepwear is apparel. Bedding is textile for the bed. Compare <a href="/clothing/sleepwear">sleepwear</a>.</p>

<h2>How to Choose</h2>
<p>Match the room job and check size on the listing. Do not treat a horse motif as riding tack from <a href="/horse/tack">horse tack</a>.</p>
<p>Mixed leftovers without this type stay on <a href="/accessories/gifts">equestrian gifts</a>.</p>`,

  faq_items: [
    {
        question: "What belongs on the bedding page?",
        answer: "Bedding, doonas and bed linen with horse themes, not sofa throws and not tea towels. Sibling leaves cover related but different jobs. Choose by the product type and how you will use the piece at home. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "How is this different from the gifts hub?",
        answer: "Gifts holds mixed present-scale leftovers. This leaf is for typed equestrian bedding. When the listing matches this type, shop here so you compare like with like. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
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
  centralEntity: 'equestrian bedding',
  primaryAngle:
    'Bedding, doonas and bed linen with horse themes, not sofa throws and not tea towels.',
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
  overlapSplit: `equestrian bedding vs siblings on homeware and kitchen.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Sibling leaf links live.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'throws', href: '/accessories/homeware/throws' },
    { text: 'cushions', href: '/accessories/homeware/cushions' },
    { text: 'tea towels', href: '/accessories/kitchen/tea-towels' },
    { text: 'sleepwear', href: '/clothing/sleepwear' },
    { text: 'tack', href: '/horse/tack' },
    { text: 'gifts', href: '/accessories/gifts' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

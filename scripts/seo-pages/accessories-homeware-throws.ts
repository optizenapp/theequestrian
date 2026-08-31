import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/homeware/throws',

  meta_title: 'Equestrian Throws | Horse Theme Blankets',
  meta_description:
    'Horse-themed throws for sofas and beds. Cushions and bedding sit on related homeware pages. Shop Australia-wide with clear product details.',
  h1_title: 'Equestrian Throws',
  breadcrumb_label: 'Throws',

  short_description: `<p>Browse <strong>equestrian throws</strong>: Throws and soft blankets with horse motifs for draping, not cushion covers and not tea towels.</p>
<!--read-more-trigger-->
<p>Open sibling leaves when the job changes. Stay on this page when the listing matches this object type.</p>
<p>Australian shipping applies as on other accessories pages. Read dimensions on each listing.</p>

<p>Compare sibling leaves when the job changes rather than treating every horse motif as the same product. Stay here when the listing matches this object type. Check care notes and dimensions on the product page before you buy, and expect Australian shipping options at checkout for each vendor listing.</p>`,

  long_description: `<h2>What Are Equestrian Throws?</h2>
<p>Throws and soft blankets with horse motifs for draping, not cushion covers and not tea towels.</p>
<p>Typical pieces include:</p>
<ul>
<li>Sofa and chair throws</li>
<li>Horse print blankets</li>
<li>Indoor soft cover layers</li>
</ul>

<h2>Equestrian Throws vs Cushions</h2>
<p>Cushions pad a seat. Throws drape over furniture. See <a href="/accessories/homeware/cushions">cushions</a>.</p>

<h2>Equestrian Throws vs Bedding</h2>
<p>Bedding is for beds. Throws are lighter drape pieces. See <a href="/accessories/homeware/bedding">bedding</a>.</p>

<h2>Equestrian Throws vs Tea towels</h2>
<p>Tea towels are kitchen cloth. Throws are lounge textiles. See <a href="/accessories/kitchen/tea-towels">tea towels</a>.</p>

<h2>Related Accessories</h2>
<p>Statues are hard display. Throws are fabric. Compare <a href="/accessories/homeware/statues">statues</a>.</p>

<h2>How to Choose</h2>
<p>Match the room job and check size on the listing. Do not treat a horse motif as riding tack from <a href="/horse/tack">horse tack</a>.</p>
<p>Mixed leftovers without this type stay on <a href="/accessories/gifts">equestrian gifts</a>.</p>`,

  faq_items: [
    {
        question: "What belongs on the throws page?",
        answer: "Throws and soft blankets with horse motifs for draping, not cushion covers and not tea towels. Sibling leaves cover related but different jobs. Choose by the product type and how you will use the piece at home. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "How is this different from the gifts hub?",
        answer: "Gifts holds mixed present-scale leftovers. This leaf is for typed equestrian throws. When the listing matches this type, shop here so you compare like with like. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
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
  centralEntity: 'equestrian throws',
  primaryAngle:
    'Throws and soft blankets with horse motifs for draping, not cushion covers and not tea towels.',
  informationGain: [
    'Typed leaf under homeware, not residual gifts.',
    'Sibling soft or hard leaves cover different jobs.',
    'Kitchen tableware is a separate hub.',
    'Motif does not equal riding tack.',
    'Read dimensions on the listing.',
    'Outdoor vs indoor splits where relevant.',
    'Wearables stay on clothing or rider.',
  ],
  closestSibling: '/accessories/homeware/cushions',
  overlapSplit: `equestrian throws vs siblings on homeware and kitchen.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Sibling leaf links live.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'cushions', href: '/accessories/homeware/cushions' },
    { text: 'bedding', href: '/accessories/homeware/bedding' },
    { text: 'tea towels', href: '/accessories/kitchen/tea-towels' },
    { text: 'statues', href: '/accessories/homeware/statues' },
    { text: 'tack', href: '/horse/tack' },
    { text: 'gifts', href: '/accessories/gifts' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

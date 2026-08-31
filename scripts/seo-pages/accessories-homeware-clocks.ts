import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/homeware/clocks',

  meta_title: 'Equestrian Clocks | Indoor & Outdoor',
  meta_description:
    'Horse-themed clocks for walls and rooms. Lighting and wall art sit on sibling homeware pages. Shop Australia-wide with clear product details.',
  h1_title: 'Equestrian Clocks',
  breadcrumb_label: 'Clocks',

  short_description: `<p>Browse <strong>equestrian clocks</strong>: Clocks with horse motifs for keeping time at home or in a stable office.</p>
<!--read-more-trigger-->
<p>Open sibling leaves when the job changes. Stay on this page when the listing matches this object type.</p>
<p>Australian shipping applies as on other accessories pages. Read dimensions on each listing.</p>

<p>Compare sibling leaves when the job changes rather than treating every horse motif as the same product. Stay here when the listing matches this object type. Check care notes and dimensions on the product page before you buy, and expect Australian shipping options at checkout for each vendor listing.</p>`,

  long_description: `<h2>What Are Equestrian Clocks?</h2>
<p>Clocks with horse motifs for keeping time at home or in a stable office.</p>
<p>Typical pieces include:</p>
<ul>
<li>Wall clocks</li>
<li>Outdoor-style clock faces where listed</li>
<li>Horse motif timepieces</li>
</ul>

<h2>Equestrian Clocks vs Lighting</h2>
<p>Lighting illuminates. Clocks measure time. See <a href="/accessories/homeware/lighting">lighting</a>.</p>

<h2>Equestrian Clocks vs Wall art</h2>
<p>Art decorates. Clocks must also keep time. See <a href="/accessories/homeware/wall-art">wall art</a>.</p>

<h2>Equestrian Clocks vs Garden</h2>
<p>Garden covers statues and weathervanes. Clocks stay on this leaf when typed as clocks. See <a href="/accessories/homeware/garden">garden</a>.</p>

<h2>Related Accessories</h2>
<p>Hooks hang kit. Clocks hang as timepieces. Compare <a href="/accessories/homeware/hooks">hooks</a>.</p>
<p>Kitchen is tableware, not wall clocks. Compare <a href="/accessories/kitchen">kitchen</a>.</p>

<h2>How to Choose</h2>
<p>Match the room job and check size on the listing. Do not treat a horse motif as riding tack from <a href="/horse/tack">horse tack</a>.</p>
<p>Mixed leftovers without this type stay on <a href="/accessories/gifts">equestrian gifts</a>.</p>`,

  faq_items: [
    {
        question: "What belongs on the clocks page?",
        answer: "Clocks with horse motifs for keeping time at home or in a stable office. Sibling leaves cover related but different jobs. Choose by the product type and how you will use the piece at home. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "How is this different from the gifts hub?",
        answer: "Gifts holds mixed present-scale leftovers. This leaf is for typed equestrian clocks. When the listing matches this type, shop here so you compare like with like. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
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
  centralEntity: 'equestrian clocks',
  primaryAngle:
    'Clocks with horse motifs for keeping time at home or in a stable office.',
  informationGain: [
    'Typed leaf under homeware, not residual gifts.',
    'Sibling soft or hard leaves cover different jobs.',
    'Kitchen tableware is a separate hub.',
    'Motif does not equal riding tack.',
    'Read dimensions on the listing.',
    'Outdoor vs indoor splits where relevant.',
    'Wearables stay on clothing or rider.',
  ],
  closestSibling: '/accessories/homeware/lighting',
  overlapSplit: `equestrian clocks vs siblings on homeware and kitchen.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Sibling leaf links live.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'lighting', href: '/accessories/homeware/lighting' },
    { text: 'wall art', href: '/accessories/homeware/wall-art' },
    { text: 'garden', href: '/accessories/homeware/garden' },
    { text: 'hooks', href: '/accessories/homeware/hooks' },
    { text: 'kitchen', href: '/accessories/kitchen' },
    { text: 'tack', href: '/horse/tack' },
    { text: 'gifts', href: '/accessories/gifts' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

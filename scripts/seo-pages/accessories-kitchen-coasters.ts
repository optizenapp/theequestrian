import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/kitchen/coasters',

  meta_title: 'Equestrian Coasters | Horse Theme Sets',
  meta_description:
    'Horse-themed coaster sets. Trays and barware sit on sibling kitchen pages. Shop Australia-wide with clear product details.',
  h1_title: 'Equestrian Coasters',
  breadcrumb_label: 'Coasters',

  short_description: `<p>Browse <strong>equestrian coasters</strong>: Coaster sets with horse motifs for protecting tables under glasses.</p>
<!--read-more-trigger-->
<p>Open sibling leaves when the job changes. Stay on this page when the listing matches this object type.</p>
<p>Australian shipping applies as on other accessories pages. Read dimensions on each listing.</p>

<p>Compare sibling leaves when the job changes rather than treating every horse motif as the same product. Stay here when the listing matches this object type. Check care notes and dimensions on the product page before you buy, and expect Australian shipping options at checkout for each vendor listing.</p>`,

  long_description: `<h2>What Are Equestrian Coasters?</h2>
<p>Coaster sets with horse motifs for protecting tables under glasses.</p>
<p>Typical pieces include:</p>
<ul>
<li>Coaster sets</li>
<li>Horse motif table mats</li>
<li>Drink protection pieces</li>
</ul>

<h2>Equestrian Coasters vs Trays</h2>
<p>Trays carry. Coasters sit under individual glasses. See <a href="/accessories/kitchen/trays">trays</a>.</p>

<h2>Equestrian Coasters vs Barware</h2>
<p>Barware opens and holds bottles. Coasters protect surfaces. See <a href="/accessories/kitchen/barware">barware</a>.</p>

<h2>Equestrian Coasters vs Glassware</h2>
<p>Glassware is the glass. Coasters sit underneath. See <a href="/accessories/kitchen/glassware">glassware</a>.</p>

<h2>Related Accessories</h2>
<p>Mugs and coasters often gift together but stay on typed leaves. Compare <a href="/accessories/kitchen/mugs">mugs</a>.</p>

<h2>How to Choose</h2>
<p>Match the room job and check size on the listing. Do not treat a horse motif as riding tack from <a href="/horse/tack">horse tack</a>.</p>
<p>Mixed leftovers without this type stay on <a href="/accessories/gifts">equestrian gifts</a>.</p>`,

  faq_items: [
    {
        question: "What belongs on the coasters page?",
        answer: "Coaster sets with horse motifs for protecting tables under glasses. Sibling leaves cover related but different jobs. Choose by the product type and how you will use the piece at home. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "How is this different from the gifts hub?",
        answer: "Gifts holds mixed present-scale leftovers. This leaf is for typed equestrian coasters. When the listing matches this type, shop here so you compare like with like. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
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
  centralEntity: 'equestrian coasters',
  primaryAngle:
    'Coaster sets with horse motifs for protecting tables under glasses.',
  informationGain: [
    'Typed leaf under homeware, not residual gifts.',
    'Sibling soft or hard leaves cover different jobs.',
    'Kitchen tableware is a separate hub.',
    'Motif does not equal riding tack.',
    'Read dimensions on the listing.',
    'Outdoor vs indoor splits where relevant.',
    'Wearables stay on clothing or rider.',
  ],
  closestSibling: '/accessories/kitchen/barware',
  overlapSplit: `equestrian coasters vs siblings on homeware and kitchen.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Sibling leaf links live.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'trays', href: '/accessories/kitchen/trays' },
    { text: 'barware', href: '/accessories/kitchen/barware' },
    { text: 'glassware', href: '/accessories/kitchen/glassware' },
    { text: 'mugs', href: '/accessories/kitchen/mugs' },
    { text: 'tack', href: '/horse/tack' },
    { text: 'gifts', href: '/accessories/gifts' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

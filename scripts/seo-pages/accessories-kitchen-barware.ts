import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/kitchen/barware',

  meta_title: 'Equestrian Barware | Openers & Holders',
  meta_description:
    'Horse-themed bottle openers, stoppers and wine holders. Glassware sits on a sibling page. Shop Australia-wide with clear product details.',
  h1_title: 'Equestrian Barware',
  breadcrumb_label: 'Barware',

  short_description: `<p>Browse <strong>equestrian barware</strong>: Bar tools and holders with horse themes, not the wine glasses themselves.</p>
<!--read-more-trigger-->
<p>Open sibling leaves when the job changes. Stay on this page when the listing matches this object type.</p>
<p>Australian shipping applies as on other accessories pages. Read dimensions on each listing.</p>

<p>Compare sibling leaves when the job changes rather than treating every horse motif as the same product. Stay here when the listing matches this object type. Check care notes and dimensions on the product page before you buy, and expect Australian shipping options at checkout for each vendor listing.</p>`,

  long_description: `<h2>What Are Equestrian Barware?</h2>
<p>Bar tools and holders with horse themes, not the wine glasses themselves.</p>
<p>Typical pieces include:</p>
<ul>
<li>Bottle openers</li>
<li>Stoppers and pour tools</li>
<li>Wine holders</li>
</ul>

<h2>Equestrian Barware vs Glassware</h2>
<p>Glassware is drinkware. Barware is tools and holders. See <a href="/accessories/kitchen/glassware">glassware</a>.</p>

<h2>Equestrian Barware vs Coasters</h2>
<p>Coasters protect tables. Barware serves the bottle. See <a href="/accessories/kitchen/coasters">coasters</a>.</p>

<h2>Equestrian Barware vs Mugs</h2>
<p>Mugs are cups. Barware is bar hardware. See <a href="/accessories/kitchen/mugs">mugs</a>.</p>

<h2>Related Accessories</h2>
<p>Trays can carry barware to a table. Compare <a href="/accessories/kitchen/trays">trays</a>.</p>

<h2>How to Choose</h2>
<p>Match the room job and check size on the listing. Do not treat a horse motif as riding tack from <a href="/horse/tack">horse tack</a>.</p>
<p>Mixed leftovers without this type stay on <a href="/accessories/gifts">equestrian gifts</a>.</p>`,

  faq_items: [
    {
        question: "What belongs on the barware page?",
        answer: "Bar tools and holders with horse themes, not the wine glasses themselves. Sibling leaves cover related but different jobs. Choose by the product type and how you will use the piece at home. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "How is this different from the gifts hub?",
        answer: "Gifts holds mixed present-scale leftovers. This leaf is for typed equestrian barware. When the listing matches this type, shop here so you compare like with like. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
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
  centralEntity: 'equestrian barware',
  primaryAngle:
    'Bar tools and holders with horse themes, not the wine glasses themselves.',
  informationGain: [
    'Typed leaf under homeware, not residual gifts.',
    'Sibling soft or hard leaves cover different jobs.',
    'Kitchen tableware is a separate hub.',
    'Motif does not equal riding tack.',
    'Read dimensions on the listing.',
    'Outdoor vs indoor splits where relevant.',
    'Wearables stay on clothing or rider.',
  ],
  closestSibling: '/accessories/kitchen/glassware',
  overlapSplit: `equestrian barware vs siblings on homeware and kitchen.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Sibling leaf links live.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'glassware', href: '/accessories/kitchen/glassware' },
    { text: 'coasters', href: '/accessories/kitchen/coasters' },
    { text: 'mugs', href: '/accessories/kitchen/mugs' },
    { text: 'trays', href: '/accessories/kitchen/trays' },
    { text: 'tack', href: '/horse/tack' },
    { text: 'gifts', href: '/accessories/gifts' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

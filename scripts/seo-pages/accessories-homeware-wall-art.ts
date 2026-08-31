import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/homeware/wall-art',

  meta_title: 'Equestrian Wall Art | Horse Prints & Signs',
  meta_description:
    'Horse wall art, prints and signs for indoor walls. Statues and clocks sit on sibling pages. Shop Australia-wide with clear product details.',
  h1_title: 'Equestrian Wall Art',
  breadcrumb_label: 'Wall Art',

  short_description: `<p>Browse <strong>equestrian wall art</strong>: Wall-mounted prints, signs and artwork with horse themes, not freestanding statues.</p>
<!--read-more-trigger-->
<p>Open sibling leaves when the job changes. Stay on this page when the listing matches this object type.</p>
<p>Australian shipping applies as on other accessories pages. Read dimensions on each listing.</p>

<p>Compare sibling leaves when the job changes rather than treating every horse motif as the same product. Stay here when the listing matches this object type. Check care notes and dimensions on the product page before you buy, and expect Australian shipping options at checkout for each vendor listing.</p>`,

  long_description: `<h2>What Are Equestrian Wall Art?</h2>
<p>Wall-mounted prints, signs and artwork with horse themes, not freestanding statues.</p>
<p>Typical pieces include:</p>
<ul>
<li>Prints and canvases</li>
<li>Wall signs and reliefs</li>
<li>Indoor display pieces</li>
</ul>

<h2>Equestrian Wall Art vs Statues</h2>
<p>Statues stand free. Wall art hangs. See <a href="/accessories/homeware/statues">statues</a>.</p>

<h2>Equestrian Wall Art vs Clocks</h2>
<p>Clocks tell time. Wall art is decorative display. See <a href="/accessories/homeware/clocks">clocks</a>.</p>

<h2>Equestrian Wall Art vs Cards</h2>
<p>Cards are write-on paper. Framed wall pieces sit here. See <a href="/accessories/cards">cards</a>.</p>

<h2>Related Accessories</h2>
<p>Lighting illuminates a room. Art fills a wall. Compare <a href="/accessories/homeware/lighting">lighting</a>.</p>
<p>Garden pieces are outdoor. Wall art here is indoor. Compare <a href="/accessories/homeware/garden">garden</a>.</p>

<h2>How to Choose</h2>
<p>Match the room job and check size on the listing. Do not treat a horse motif as riding tack from <a href="/horse/tack">horse tack</a>.</p>
<p>Mixed leftovers without this type stay on <a href="/accessories/gifts">equestrian gifts</a>.</p>`,

  faq_items: [
    {
        question: "What belongs on the wall art page?",
        answer: "Wall-mounted prints, signs and artwork with horse themes, not freestanding statues. Sibling leaves cover related but different jobs. Choose by the product type and how you will use the piece at home. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "How is this different from the gifts hub?",
        answer: "Gifts holds mixed present-scale leftovers. This leaf is for typed equestrian wall art. When the listing matches this type, shop here so you compare like with like. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
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
  centralEntity: 'equestrian wall art',
  primaryAngle:
    'Wall-mounted prints, signs and artwork with horse themes, not freestanding statues.',
  informationGain: [
    'Typed leaf under homeware, not residual gifts.',
    'Sibling soft or hard leaves cover different jobs.',
    'Kitchen tableware is a separate hub.',
    'Motif does not equal riding tack.',
    'Read dimensions on the listing.',
    'Outdoor vs indoor splits where relevant.',
    'Wearables stay on clothing or rider.',
  ],
  closestSibling: '/accessories/homeware/statues',
  overlapSplit: `equestrian wall art vs siblings on homeware and kitchen.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Sibling leaf links live.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'statues', href: '/accessories/homeware/statues' },
    { text: 'clocks', href: '/accessories/homeware/clocks' },
    { text: 'cards', href: '/accessories/cards' },
    { text: 'lighting', href: '/accessories/homeware/lighting' },
    { text: 'garden', href: '/accessories/homeware/garden' },
    { text: 'tack', href: '/horse/tack' },
    { text: 'gifts', href: '/accessories/gifts' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

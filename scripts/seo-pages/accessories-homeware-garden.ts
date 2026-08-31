import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/homeware/garden',

  meta_title: 'Equestrian Garden Decor | Outdoor Pieces',
  meta_description:
    'Outdoor horse statues, weathervanes and garden accents. Indoor statues sit on the statues leaf. Shop Australia-wide with clear product details.',
  h1_title: 'Equestrian Garden Decor',
  breadcrumb_label: 'Garden',

  short_description: `<p>Browse <strong>equestrian garden decor</strong>: Outdoor garden horse decor such as weathervanes and garden statues, not indoor soft furnishings.</p>
<!--read-more-trigger-->
<p>Open sibling leaves when the job changes. Stay on this page when the listing matches this object type.</p>
<p>Australian shipping applies as on other accessories pages. Read dimensions on each listing.</p>

<p>Compare sibling leaves when the job changes rather than treating every horse motif as the same product. Stay here when the listing matches this object type. Check care notes and dimensions on the product page before you buy, and expect Australian shipping options at checkout for each vendor listing.</p>`,

  long_description: `<h2>What Are Equestrian Garden Decor?</h2>
<p>Outdoor garden horse decor such as weathervanes and garden statues, not indoor soft furnishings.</p>
<p>Typical pieces include:</p>
<ul>
<li>Garden statues</li>
<li>Weathervanes and outdoor accents</li>
<li>Yard display pieces</li>
</ul>

<h2>Equestrian Garden Decor vs Statues</h2>
<p>Indoor statues stay dry inside. Garden pieces are outdoor. See <a href="/accessories/homeware/statues">statues</a>.</p>

<h2>Equestrian Garden Decor vs Wall art</h2>
<p>Indoor wall art is not garden decor. See <a href="/accessories/homeware/wall-art">wall art</a>.</p>

<h2>Equestrian Garden Decor vs Hooks</h2>
<p>Hooks hang kit indoors. Garden pieces sit outside. See <a href="/accessories/homeware/hooks">hooks</a>.</p>

<h2>Related Accessories</h2>
<p>Some outdoor clocks may list under clocks when typed that way. Compare <a href="/accessories/homeware/clocks">clocks</a>.</p>

<h2>How to Choose</h2>
<p>Match the room job and check size on the listing. Do not treat a horse motif as riding tack from <a href="/horse/tack">horse tack</a>.</p>
<p>Mixed leftovers without this type stay on <a href="/accessories/gifts">equestrian gifts</a>.</p>`,

  faq_items: [
    {
        question: "What belongs on the garden page?",
        answer: "Outdoor garden horse decor such as weathervanes and garden statues, not indoor soft furnishings. Sibling leaves cover related but different jobs. Choose by the product type and how you will use the piece at home. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "How is this different from the gifts hub?",
        answer: "Gifts holds mixed present-scale leftovers. This leaf is for typed equestrian garden decor. When the listing matches this type, shop here so you compare like with like. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
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
  centralEntity: 'equestrian garden decor',
  primaryAngle:
    'Outdoor garden horse decor such as weathervanes and garden statues, not indoor soft furnishings.',
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
  overlapSplit: `equestrian garden decor vs siblings on homeware and kitchen.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Sibling leaf links live.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'statues', href: '/accessories/homeware/statues' },
    { text: 'wall art', href: '/accessories/homeware/wall-art' },
    { text: 'hooks', href: '/accessories/homeware/hooks' },
    { text: 'clocks', href: '/accessories/homeware/clocks' },
    { text: 'tack', href: '/horse/tack' },
    { text: 'gifts', href: '/accessories/gifts' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

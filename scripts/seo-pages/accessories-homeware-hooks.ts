import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/homeware/hooks',

  meta_title: 'Equestrian Hooks | Key Racks & Hardware',
  meta_description:
    'Horse-themed hooks and key racks for home or tack room walls. Garden statues sit nearby. Shop Australia-wide with clear product details.',
  h1_title: 'Equestrian Hooks & Hardware',
  breadcrumb_label: 'Hooks',

  short_description: `<p>Browse <strong>equestrian hooks</strong>: Hooks, key racks and hanging hardware with horse motifs, not soft cushions.</p>
<!--read-more-trigger-->
<p>Open sibling leaves when the job changes. Stay on this page when the listing matches this object type.</p>
<p>Australian shipping applies as on other accessories pages. Read dimensions on each listing.</p>

<p>Compare sibling leaves when the job changes rather than treating every horse motif as the same product. Stay here when the listing matches this object type. Check care notes and dimensions on the product page before you buy, and expect Australian shipping options at checkout for each vendor listing.</p>`,

  long_description: `<h2>What Are Equestrian Hooks & Hardware?</h2>
<p>Hooks, key racks and hanging hardware with horse motifs, not soft cushions.</p>
<p>Typical pieces include:</p>
<ul>
<li>Wall hooks and racks</li>
<li>Key holders</li>
<li>Tack-room style hardware</li>
</ul>

<h2>Equestrian Hooks & Hardware vs Garden</h2>
<p>Garden is outdoor decor. Hooks are hanging hardware. See <a href="/accessories/homeware/garden">garden</a>.</p>

<h2>Equestrian Hooks & Hardware vs Keychains</h2>
<p>Keychains travel on keys. Hooks mount on walls. See <a href="/rider/accessories/keychains">keychains</a>.</p>

<h2>Equestrian Hooks & Hardware vs Cushions</h2>
<p>Cushions are soft. Hooks are hard hardware. See <a href="/accessories/homeware/cushions">cushions</a>.</p>

<h2>Related Accessories</h2>
<p>Stable storage is horse-yard organisation gear when typed that way. Compare <a href="/horse/stable/storage">stable storage</a>.</p>

<h2>How to Choose</h2>
<p>Match the room job and check size on the listing. Do not treat a horse motif as riding tack from <a href="/horse/tack">horse tack</a>.</p>
<p>Mixed leftovers without this type stay on <a href="/accessories/gifts">equestrian gifts</a>.</p>`,

  faq_items: [
    {
        question: "What belongs on the hooks page?",
        answer: "Hooks, key racks and hanging hardware with horse motifs, not soft cushions. Sibling leaves cover related but different jobs. Choose by the product type and how you will use the piece at home. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "How is this different from the gifts hub?",
        answer: "Gifts holds mixed present-scale leftovers. This leaf is for typed equestrian hooks. When the listing matches this type, shop here so you compare like with like. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
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
  centralEntity: 'equestrian hooks',
  primaryAngle:
    'Hooks, key racks and hanging hardware with horse motifs, not soft cushions.',
  informationGain: [
    'Typed leaf under homeware, not residual gifts.',
    'Sibling soft or hard leaves cover different jobs.',
    'Kitchen tableware is a separate hub.',
    'Motif does not equal riding tack.',
    'Read dimensions on the listing.',
    'Outdoor vs indoor splits where relevant.',
    'Wearables stay on clothing or rider.',
  ],
  closestSibling: '/accessories/homeware/garden',
  overlapSplit: `equestrian hooks vs siblings on homeware and kitchen.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Sibling leaf links live.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'garden', href: '/accessories/homeware/garden' },
    { text: 'keychains', href: '/rider/accessories/keychains' },
    { text: 'cushions', href: '/accessories/homeware/cushions' },
    { text: 'storage', href: '/horse/stable/storage' },
    { text: 'tack', href: '/horse/tack' },
    { text: 'gifts', href: '/accessories/gifts' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/books/childrens-books',

  meta_title: "Children's Horse Books | Kids Equestrian Titles",
  meta_description:
    "Children's horse books and story titles. Colouring books and adult reading sit nearby. Shop typed book leaves Australia-wide.",
  h1_title: "Children's Horse Books",
  breadcrumb_label: "Children's Books",

  short_description: `<p>Browse <strong>children's horse books</strong>: Children's reading and story books with horse themes, not colouring pads alone.</p>
<!--read-more-trigger-->
<p>Open sibling leaves when the job changes. Stay on this page when the listing matches this object type.</p>
<p>Australian shipping applies as on other accessories pages. Read dimensions on each listing.</p>

<p>Compare sibling leaves when the job changes rather than treating every horse motif as the same product. Stay here when the listing matches this object type. Check care notes and dimensions on the product page before you buy, and expect Australian shipping options at checkout for each vendor listing.</p>`,

  long_description: `<h2>What Are Children's Horse Books?</h2>
<p>Children's reading and story books with horse themes, not colouring pads alone.</p>
<p>Typical pieces include:</p>
<ul>
<li>Story books</li>
<li>Finger-puppet and early reader titles</li>
<li>Horse themes for children</li>
</ul>

<h2>Children's Horse Books vs Colouring books</h2>
<p>Colouring books are activity pages. Children's books are reading titles. See <a href="/accessories/books/colouring-books">colouring books</a>.</p>

<h2>Children's Horse Books vs Greeting cards</h2>
<p>Cards are messages. Books are bound reading. See <a href="/accessories/cards/greeting-cards">greeting cards</a>.</p>

<h2>Children's Horse Books vs Toys</h2>
<p>Toys are play objects. Books are reading titles when typed as books. See <a href="/accessories/toys">toys</a>.</p>

<h2>Related Accessories</h2>
<p>Bookmarks accompany reading titles. Compare <a href="/accessories/books/bookmarks">bookmarks</a>.</p>

<h2>How to Choose</h2>
<p>Match the room job and check size on the listing. Do not treat a horse motif as riding tack from <a href="/horse/tack">horse tack</a>.</p>
<p>Mixed leftovers without this type stay on <a href="/accessories/gifts">equestrian gifts</a>.</p>`,

  faq_items: [
    {
        question: "What belongs on the children's books page?",
        answer: "Children's reading and story books with horse themes, not colouring pads alone. Sibling leaves cover related but different jobs. Choose by the product type and how you will use the piece at home. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "How is this different from the gifts hub?",
        answer: "Gifts holds mixed present-scale leftovers. This leaf is for typed children's horse books. When the listing matches this type, shop here so you compare like with like. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "Can I give these as presents?",
        answer: "Yes. Wrapping a piece as a present does not move it to apparel or tack. Keep wearables on clothing or rider pages, and keep riding equipment in the horse silo. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "Where do kitchen pieces sit?",
        answer: "Cards sit under the cards hub. Kitchenware sits under kitchen. This leaf stays with books. Keep paper messages and drinkware off this grid so reading titles stay easy to compare across brands. Read the product title and dimensions before you buy."
    }
],
};

export const frameworkNotes: SubcollectionFrameworkNotes = {
  centralEntity: "children's horse books",
  primaryAngle:
    "Children's reading and story books with horse themes, not colouring pads alone.",
  informationGain: [
    'Typed leaf under homeware, not residual gifts.',
    'Sibling soft or hard leaves cover different jobs.',
    'Kitchen tableware is a separate hub.',
    'Motif does not equal riding tack.',
    'Read dimensions on the listing.',
    'Outdoor vs indoor splits where relevant.',
    'Wearables stay on clothing or rider.',
  ],
  closestSibling: '/accessories/books/colouring-books',
  overlapSplit: `children's horse books vs siblings on homeware and kitchen.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Sibling leaf links live.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'colouring books', href: '/accessories/books/colouring-books' },
    { text: 'greeting cards', href: '/accessories/cards/greeting-cards' },
    { text: 'toys', href: '/accessories/toys' },
    { text: 'bookmarks', href: '/accessories/books/bookmarks' },
    { text: 'tack', href: '/horse/tack' },
    { text: 'gifts', href: '/accessories/gifts' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

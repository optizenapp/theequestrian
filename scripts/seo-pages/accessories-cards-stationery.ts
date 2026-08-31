import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/cards/stationery',

  meta_title: 'Equestrian Stationery | Notebooks & Stickers',
  meta_description:
    'Horse-themed notebooks, stickers and stationery. Greeting cards sit on a sibling page. Shop Australia-wide with clear product details.',
  h1_title: 'Equestrian Stationery',
  breadcrumb_label: 'Stationery',

  short_description: `<p>Browse <strong>equestrian stationery</strong>: Notebooks, stickers and desk stationery with horse themes, not single greeting cards.</p>
<!--read-more-trigger-->
<p>Open sibling leaves when the job changes. Stay on this page when the listing matches this object type.</p>
<p>Australian shipping applies as on other accessories pages. Read dimensions on each listing.</p>

<p>Compare sibling leaves when the job changes rather than treating every horse motif as the same product. Stay here when the listing matches this object type. Check care notes and dimensions on the product page before you buy, and expect Australian shipping options at checkout for each vendor listing.</p>`,

  long_description: `<h2>What Are Equestrian Stationery?</h2>
<p>Notebooks, stickers and desk stationery with horse themes, not single greeting cards.</p>
<p>Typical pieces include:</p>
<ul>
<li>Notebooks and pads</li>
<li>Stickers</li>
<li>Desk stationery</li>
</ul>

<h2>Equestrian Stationery vs Greeting cards</h2>
<p>Greeting cards are single messages. Stationery is reusable paper goods. See <a href="/accessories/cards/greeting-cards">greeting cards</a>.</p>

<h2>Equestrian Stationery vs Books</h2>
<p>Books are reading titles. Stationery is for writing and sticking. See <a href="/accessories/books">books</a>.</p>

<h2>Equestrian Stationery vs Bookmarks</h2>
<p>Bookmarks sit with books. Notebooks sit here. See <a href="/accessories/books/bookmarks">bookmarks</a>.</p>

<h2>Related Accessories</h2>
<p>Fun cards are single humorous cards. Compare <a href="/accessories/cards/fun-cards">fun cards</a>.</p>

<h2>How to Choose</h2>
<p>Match the room job and check size on the listing. Do not treat a horse motif as riding tack from <a href="/horse/tack">horse tack</a>.</p>
<p>Mixed leftovers without this type stay on <a href="/accessories/gifts">equestrian gifts</a>.</p>`,

  faq_items: [
    {
        question: "What belongs on the stationery page?",
        answer: "Notebooks, stickers and desk stationery with horse themes, not single greeting cards. Sibling leaves cover related but different jobs. Choose by the product type and how you will use the piece at home. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "How is this different from the gifts hub?",
        answer: "Gifts holds mixed present-scale leftovers. This leaf is for typed equestrian stationery. When the listing matches this type, shop here so you compare like with like. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "Can I give these as presents?",
        answer: "Yes. Wrapping a piece as a present does not move it to apparel or tack. Keep wearables on clothing or rider pages, and keep riding equipment in the horse silo. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "Where do kitchen pieces sit?",
        answer: "Kitchen mugs sit under kitchen. Soft homeware sits under homeware. This leaf stays focused on paper goods. Keep drinkware and soft decor on their own hubs so you compare like with like. Read the product title and dimensions before you buy."
    }
],
};

export const frameworkNotes: SubcollectionFrameworkNotes = {
  centralEntity: 'equestrian stationery',
  primaryAngle:
    'Notebooks, stickers and desk stationery with horse themes, not single greeting cards.',
  informationGain: [
    'Typed leaf under homeware, not residual gifts.',
    'Sibling soft or hard leaves cover different jobs.',
    'Kitchen tableware is a separate hub.',
    'Motif does not equal riding tack.',
    'Read dimensions on the listing.',
    'Outdoor vs indoor splits where relevant.',
    'Wearables stay on clothing or rider.',
  ],
  closestSibling: '/accessories/cards/greeting-cards',
  overlapSplit: `equestrian stationery vs siblings on homeware and kitchen.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Sibling leaf links live.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'greeting cards', href: '/accessories/cards/greeting-cards' },
    { text: 'books', href: '/accessories/books' },
    { text: 'bookmarks', href: '/accessories/books/bookmarks' },
    { text: 'fun cards', href: '/accessories/cards/fun-cards' },
    { text: 'tack', href: '/horse/tack' },
    { text: 'gifts', href: '/accessories/gifts' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

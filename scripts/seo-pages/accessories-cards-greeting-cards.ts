import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/cards/greeting-cards',

  meta_title: 'Equestrian Greeting Cards | Horse Occasion Cards',
  meta_description:
    'Horse-themed greeting and note cards. Fun cards and stationery sit on sibling pages. Shop Australia-wide with clear product details.',
  h1_title: 'Equestrian Greeting Cards',
  breadcrumb_label: 'Greeting Cards',

  short_description: `<p>Browse <strong>equestrian greeting cards</strong>: Greeting and occasion cards with horse themes for written messages.</p>
<!--read-more-trigger-->
<p>Open sibling leaves when the job changes. Stay on this page when the listing matches this object type.</p>
<p>Australian shipping applies as on other accessories pages. Read dimensions on each listing.</p>

<p>Compare sibling leaves when the job changes rather than treating every horse motif as the same product. Stay here when the listing matches this object type. Check care notes and dimensions on the product page before you buy, and expect Australian shipping options at checkout for each vendor listing.</p>`,

  long_description: `<h2>What Are Equestrian Greeting Cards?</h2>
<p>Greeting and occasion cards with horse themes for written messages.</p>
<p>Typical pieces include:</p>
<ul>
<li>Birthday and occasion cards</li>
<li>Note cards</li>
<li>Horse motif greetings</li>
</ul>

<h2>Equestrian Greeting Cards vs Fun cards</h2>
<p>Fun cards skew humorous. Greeting cards cover standard occasions. See <a href="/accessories/cards/fun-cards">fun cards</a>.</p>

<h2>Equestrian Greeting Cards vs Stationery</h2>
<p>Stationery is notebooks and stickers. Greeting cards are single messages. See <a href="/accessories/cards/stationery">stationery</a>.</p>

<h2>Equestrian Greeting Cards vs Books</h2>
<p>Books are bound titles. Cards are write-on messages. See <a href="/accessories/books">books</a>.</p>

<h2>Related Accessories</h2>
<p>Colouring books sit under books, not cards. Compare <a href="/accessories/books/colouring-books">colouring books</a>.</p>
<p>Store credit cards are separate from greeting cards. Compare <a href="/accessories/gift-cards">gift cards</a>.</p>

<h2>How to Choose</h2>
<p>Match the room job and check size on the listing. Do not treat a horse motif as riding tack from <a href="/horse/tack">horse tack</a>.</p>
<p>Mixed leftovers without this type stay on <a href="/accessories/gifts">equestrian gifts</a>.</p>`,

  faq_items: [
    {
        question: "What belongs on the greeting cards page?",
        answer: "Greeting and occasion cards with horse themes for written messages. Sibling leaves cover related but different jobs. Choose by the product type and how you will use the piece at home. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "How is this different from the gifts hub?",
        answer: "Gifts holds mixed present-scale leftovers. This leaf is for typed equestrian greeting cards. When the listing matches this type, shop here so you compare like with like. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
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
  centralEntity: 'equestrian greeting cards',
  primaryAngle:
    'Greeting and occasion cards with horse themes for written messages.',
  informationGain: [
    'Typed leaf under homeware, not residual gifts.',
    'Sibling soft or hard leaves cover different jobs.',
    'Kitchen tableware is a separate hub.',
    'Motif does not equal riding tack.',
    'Read dimensions on the listing.',
    'Outdoor vs indoor splits where relevant.',
    'Wearables stay on clothing or rider.',
  ],
  closestSibling: '/accessories/cards/fun-cards',
  overlapSplit: `equestrian greeting cards vs siblings on homeware and kitchen.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Sibling leaf links live.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'fun cards', href: '/accessories/cards/fun-cards' },
    { text: 'stationery', href: '/accessories/cards/stationery' },
    { text: 'books', href: '/accessories/books' },
    { text: 'colouring books', href: '/accessories/books/colouring-books' },
    { text: 'gift cards', href: '/accessories/gift-cards' },
    { text: 'tack', href: '/horse/tack' },
    { text: 'gifts', href: '/accessories/gifts' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

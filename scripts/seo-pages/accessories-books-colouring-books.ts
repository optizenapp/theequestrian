import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/books/colouring-books',

  meta_title: 'Equestrian Colouring Books | Horse Activity Books',
  meta_description:
    "Horse colouring and activity books. Children's reading titles and greeting cards sit nearby. Shop typed book leaves Australia-wide.",
  h1_title: 'Equestrian Colouring Books',
  breadcrumb_label: 'Colouring Books',

  short_description: `<p>Browse <strong>equestrian colouring books</strong>: Colouring and activity books with horse themes, not greeting cards and not everyday mugs.</p>
<!--read-more-trigger-->
<p>Open sibling leaves when the job changes. Stay on this page when the listing matches this object type.</p>
<p>Australian shipping applies as on other accessories pages. Read dimensions on each listing.</p>

<p>Compare sibling leaves when the job changes rather than treating every horse motif as the same product. Stay here when the listing matches this object type. Check care notes and dimensions on the product page before you buy, and expect Australian shipping options at checkout for each vendor listing.</p>`,

  long_description: `<h2>What Are Equestrian Colouring Books?</h2>
<p>Colouring and activity books with horse themes, not greeting cards and not everyday mugs.</p>
<p>Typical pieces include:</p>
<ul>
<li>Colouring books</li>
<li>Activity titles</li>
<li>Horse motif pages to colour</li>
</ul>

<h2>Equestrian Colouring Books vs Children's books</h2>
<p>Children's books are reading titles. Colouring books are activity pages. See <a href="/accessories/books/childrens-books">children's books</a>.</p>

<h2>Equestrian Colouring Books vs Greeting cards</h2>
<p>Cards are messages. Colouring books are bound activity titles. See <a href="/accessories/cards/greeting-cards">greeting cards</a>.</p>

<h2>Equestrian Colouring Books vs Bookmarks</h2>
<p>Bookmarks mark pages. Colouring books are the activity itself. See <a href="/accessories/books/bookmarks">bookmarks</a>.</p>

<h2>Related Accessories</h2>
<p>Paper cards sit under cards, not here. Compare <a href="/accessories/cards">cards</a>.</p>

<h2>How to Choose</h2>
<p>Match the room job and check size on the listing. Do not treat a horse motif as riding tack from <a href="/horse/tack">horse tack</a>.</p>
<p>Mixed leftovers without this type stay on <a href="/accessories/gifts">equestrian gifts</a>.</p>`,

  faq_items: [
    {
        question: "What belongs on the colouring books page?",
        answer: "Colouring and activity books with horse themes, not greeting cards and not everyday mugs. Sibling leaves cover related but different jobs. Choose by the product type and how you will use the piece at home. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
    },
    {
        question: "How is this different from the gifts hub?",
        answer: "Gifts holds mixed present-scale leftovers. This leaf is for typed equestrian colouring books. When the listing matches this type, shop here so you compare like with like. Read the product title and dimensions before you buy. Australian delivery options appear at checkout for each vendor listing."
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
  centralEntity: 'equestrian colouring books',
  primaryAngle:
    'Colouring and activity books with horse themes, not greeting cards and not everyday mugs.',
  informationGain: [
    'Typed leaf under homeware, not residual gifts.',
    'Sibling soft or hard leaves cover different jobs.',
    'Kitchen tableware is a separate hub.',
    'Motif does not equal riding tack.',
    'Read dimensions on the listing.',
    'Outdoor vs indoor splits where relevant.',
    'Wearables stay on clothing or rider.',
  ],
  closestSibling: '/accessories/books/childrens-books',
  overlapSplit: `equestrian colouring books vs siblings on homeware and kitchen.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Sibling leaf links live.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'childrens books', href: '/accessories/books/childrens-books' },
    { text: 'greeting cards', href: '/accessories/cards/greeting-cards' },
    { text: 'bookmarks', href: '/accessories/books/bookmarks' },
    { text: 'cards', href: '/accessories/cards' },
    { text: 'tack', href: '/horse/tack' },
    { text: 'gifts', href: '/accessories/gifts' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

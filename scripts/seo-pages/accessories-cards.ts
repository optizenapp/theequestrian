import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/cards',

  meta_title: 'Equestrian Cards | Greeting Cards & Stationery',
  meta_description:
    'Horse-themed greeting cards, fun cards and stationery. Bound books and colouring titles sit under books, not on this hub.',
  h1_title: 'Equestrian Cards & Stationery',
  breadcrumb_label: 'Cards',

  short_description: `<p>Browse <strong>equestrian cards</strong> and stationery: greeting cards, fun cards, notebooks and stickers with a horse theme, not bound reading books and not kitchen mugs.</p>
<!--read-more-trigger-->
<p>The main decision is paper you write on or stick versus a title you read. Colouring books and children's reading titles live under books. A birthday card and a sticky-note pad belong here.</p>
<p>Use this hub when the gift is a message on paper. Soft homeware and tableware sit on their own hubs. Check pack size on each listing before you buy.</p>`,

  long_description: `<h2>What Belongs on Cards?</h2>
<p>This hub is horse-themed paper goods for writing, noting and light stationery, not hardcover reading catalogues.</p>
<p>Typical pieces include:</p>
<ul>
<li>Greeting and occasion cards.</li>
<li>Fun and humorous cards.</li>
<li>Notebooks, stickers and desk stationery.</li>
</ul>

<h2>Cards vs Books</h2>
<p>Bound titles sit under <a href="/accessories/books">books</a>, including <a href="/accessories/books/colouring-books">colouring books</a> and <a href="/accessories/books/childrens-books">children's books</a>.</p>
<p>A bookmark that ships with books sits on <a href="/accessories/books/bookmarks">bookmarks</a>. A blank greeting card stays here.</p>

<h2>Greeting vs Fun Cards</h2>
<p>Open <a href="/accessories/cards/greeting-cards">greeting cards</a> for birthdays and notes. Use <a href="/accessories/cards/fun-cards">fun cards</a> when the tone is playful rather than formal.</p>
<p>Stationery pads and stickers sit on <a href="/accessories/cards/stationery">stationery</a>.</p>

<h2>Cards vs Gifts and Kitchen</h2>
<p>Mixed leftovers remain on <a href="/accessories/gifts">equestrian gifts</a>. Drinkware sits under <a href="/accessories/kitchen">kitchen</a> and <a href="/accessories/kitchen/mugs">mugs</a>.</p>
<p>Wrapping a mug does not make it a card. Writing a card does not make it homeware.</p>

<h2>Cards vs Homeware</h2>
<p>Cushions and wall prints sit under <a href="/accessories/homeware">homeware</a>. A paper card is not wall art unless it is sold as a framed print on wall art.</p>
<p>Gift cards for store credit sit on <a href="/accessories/gift-cards">gift cards</a>.</p>

<h2>How to Choose</h2>
<p>Match the occasion and tone, then check pack size on the listing. Australian shipping applies as on other accessories pages.</p>
<p>Collectible models sit on <a href="/accessories/collectibles">collectibles</a> when that is the product type.</p>`,

  faq_items: [
    {
      question: 'Are colouring books listed under cards?',
      answer:
        'No. Colouring books sit under books with other activity and reading titles. Cards are for messages and light stationery. If the product is a bound colouring title, use the colouring books leaf rather than greeting cards so you compare activity books with activity books.',
    },
    {
      question: 'What is the difference between greeting cards and fun cards?',
      answer:
        'Greeting cards cover occasion and note cards meant for a written message. Fun cards skew humorous or playful. Stationery covers notebooks and stickers. Choose by how the listing describes the card style, not only by the horse motif on the front.',
    },
    {
      question: 'Should I buy a horse mug on the cards hub?',
      answer:
        'No. Mugs sit under kitchen. Cards are paper goods. Use gifts only when the product type does not yet map to a leaf. Keep drinkware and paper on their own hubs so comparisons stay fair across brands, sizes and finishes.',
    },
    {
      question: 'Is a shop gift card the same as a greeting card?',
      answer:
        'No. Store credit gift cards have their own page. Greeting cards are physical or printed messages you write and send. Do not treat a voucher as stationery when you need a birthday card for someone who loves horses and riding.',
    },
  ],
};

export const frameworkNotes: SubcollectionFrameworkNotes = {
  centralEntity: 'equestrian cards',
  primaryAngle:
    'Paper for writing and stationery. Bound books and kitchenware are other hubs.',
  informationGain: [
    'Cards are write-on paper, not reading books.',
    'Colouring books sit under books.',
    'Greeting and fun cards are tone splits.',
    'Stationery covers notebooks and stickers.',
    'Kitchen mugs are not cards.',
    'Store gift cards are a separate page.',
    'Gifts remains residual for untyped presents.',
  ],
  closestSibling: '/accessories/books',
  overlapSplit: `Cards: greeting, fun, stationery.
Books: reading and colouring.
Kitchen: mugs and trays.
Gifts: residual.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Books colouring leaf linked.',
    'Gift cards split clear.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'books', href: '/accessories/books' },
    { text: 'colouring books', href: '/accessories/books/colouring-books' },
    { text: "children's books", href: '/accessories/books/childrens-books' },
    { text: 'bookmarks', href: '/accessories/books/bookmarks' },
    { text: 'greeting cards', href: '/accessories/cards/greeting-cards' },
    { text: 'fun cards', href: '/accessories/cards/fun-cards' },
    { text: 'stationery', href: '/accessories/cards/stationery' },
    { text: 'equestrian gifts', href: '/accessories/gifts' },
    { text: 'kitchen', href: '/accessories/kitchen' },
    { text: 'mugs', href: '/accessories/kitchen/mugs' },
    { text: 'homeware', href: '/accessories/homeware' },
    { text: 'gift cards', href: '/accessories/gift-cards' },
    { text: 'collectibles', href: '/accessories/collectibles' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

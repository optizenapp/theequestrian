import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

/**
 * /accessories/gifts — residual present-scale hub after homeware/kitchen/cards split.
 */
const content: PageSEOContent = {
  url_path: '/accessories/gifts',

  meta_title: 'Equestrian Gifts | Mixed Horse Presents',
  meta_description:
    'Mixed equestrian presents that do not yet sit on homeware, kitchen or cards leaves. Typed cushions, mugs and cards have their own pages.',
  h1_title: 'Equestrian Gifts',
  breadcrumb_label: 'Gifts',

  short_description: `<p>Browse <strong>equestrian gifts</strong> as a residual mix of present-scale horse pieces that are not yet on a typed homeware, kitchen, cards or books leaf.</p>
<!--read-more-trigger-->
<p>The main decision is whether you already know the object type. Cushions, mugs, trays and greeting cards now have dedicated pages. Use this hub when the listing is still a mixed present without a clear leaf.</p>
<p>Wearable jewellery, scarves and riding tack stay on rider, clothing and horse pages even when wrapped as presents. Check dimensions on each listing before you buy.</p>`,

  long_description: `<h2>What Remains on Gifts?</h2>
<p>This hub holds present-scale horse pieces that do not yet map cleanly to a typed leaf under homeware, kitchen, cards or books.</p>
<p>Prefer typed hubs when you know the job:</p>
<ul>
<li>Homeware for cushions, hooks and decor.</li>
<li>Kitchen for mugs, trays and glass.</li>
<li>Cards for greeting cards and stationery.</li>
</ul>

<h2>Gifts vs Homeware</h2>
<p>Room decor leaves live under <a href="/accessories/homeware">equestrian homeware</a>, including <a href="/accessories/homeware/cushions">cushions</a> and <a href="/accessories/homeware/hooks">hooks</a>.</p>
<p>If the listing is clearly a cushion or wall clock, open that leaf instead of this mix.</p>

<h2>Gifts vs Kitchen</h2>
<p>Drink and serve pieces sit under <a href="/accessories/kitchen">equestrian kitchen</a>, including <a href="/accessories/kitchen/mugs">mugs</a>, <a href="/accessories/kitchen/trays">trays</a> and <a href="/accessories/kitchen/glassware">glassware</a>.</p>
<p>A mug you wrap as a present is still kitchenware when typed as a mug.</p>

<h2>Gifts vs Cards and Books</h2>
<p>Paper messages sit under <a href="/accessories/cards">cards</a> and <a href="/accessories/cards/greeting-cards">greeting cards</a>. Bound titles sit under <a href="/accessories/books">books</a>, including <a href="/accessories/books/colouring-books">colouring books</a>.</p>
<p>Store credit sits on <a href="/accessories/gift-cards">gift cards</a>.</p>

<h2>Gifts vs Jewellery and Clothing</h2>
<p>Worn pieces sit on <a href="/rider/jewellery">equestrian jewellery</a>, <a href="/clothing/accessories/scarves">scarves</a>, <a href="/clothing/accessories/hats">hats</a> and <a href="/rider/accessories/hair">hair accessories</a>.</p>
<p>Wrapping apparel does not move it onto this residual gifts grid.</p>

<h2>Gifts vs Bags and Collectibles</h2>
<p>Everyday totes sit with <a href="/rider/luggage/bags">rider bags</a>. Key rings sit on <a href="/rider/accessories/keychains">keychains</a>.</p>
<p>Scale models sit on <a href="/accessories/collectibles">collectibles</a> when that is the product type. Riding gear stays in <a href="/horse/tack">horse tack</a>.</p>

<h2>How to Choose</h2>
<p>Start on a typed hub when you know the object. Use this page for leftovers and odd present-scale pieces. Read dimensions on each listing. Australian shipping applies as on other accessories pages.</p>`,

  faq_items: [
    {
      question: 'Why did cushions and mugs leave the gifts page?',
      answer:
        'Typed homeware and kitchen leaves make it easier to compare like with like. Cushions sit under homeware. Mugs sit under kitchen. This gifts hub remains for mixed present-scale pieces that do not yet have a clear leaf. Choose the typed page whenever the product type is obvious.',
    },
    {
      question: 'Are equestrian gifts the same as jewellery?',
      answer:
        'No. Jewellery is worn and sits on rider jewellery pages. This gifts hub is for residual present-scale objects. A jewellery box can appear in mixed gifts. A necklace you fasten around a neck belongs on jewellery, not here, even when wrapped as a present.',
    },
    {
      question: 'Should I buy a horse book on gifts?',
      answer:
        'Prefer the books hub for reading titles and colouring books. Greeting cards sit under cards. Use gifts only when the listing is still an untyped present mix. Bound titles meant to be read belong with books rather than this residual aisle.',
    },
    {
      question: 'Is a horse scarf an equestrian gift on this page?',
      answer:
        'A scarf is clothing. Buy it on the scarves page even if you wrap it as a present. The same is true of hats and hair bows. This residual gifts page is not a substitute for apparel or riding tack from the horse silo.',
    },
  ],
};

export const frameworkNotes: SubcollectionFrameworkNotes = {
  centralEntity: 'equestrian gift',
  primaryAngle:
    'Residual present-scale mix after homeware, kitchen and cards leaves took typed stock.',
  informationGain: [
    'Gifts is residual, not the only giftware aisle.',
    'Homeware owns cushions and hooks.',
    'Kitchen owns mugs, trays and glass.',
    'Cards owns greeting cards and stationery.',
    'Books owns reading and colouring titles.',
    'Apparel and jewellery stay on clothing and rider.',
    'Gift cards are store credit, not greeting cards.',
  ],
  closestSibling: '/accessories/homeware',
  overlapSplit: `Gifts: residual presents.
Homeware: cushions, decor.
Kitchen: mugs, trays.
Cards: paper messages.`,
  verifyBeforePublishing: [
    'Homeware, kitchen and cards hubs linked.',
    'No parent /accessories link in HTML.',
    'No hardcoded product counts.',
    'Typed leaves preferred over this mix.',
  ],
  anchors: [
    { text: 'Homeware', href: '/accessories/homeware' },
    { text: 'Kitchen', href: '/accessories/kitchen' },
    { text: 'Cards', href: '/accessories/cards' },
    { text: 'cushions', href: '/accessories/homeware/cushions' },
    { text: 'hooks', href: '/accessories/homeware/hooks' },
    { text: 'mugs', href: '/accessories/kitchen/mugs' },
    { text: 'trays', href: '/accessories/kitchen/trays' },
    { text: 'glassware', href: '/accessories/kitchen/glassware' },
    { text: 'greeting cards', href: '/accessories/cards/greeting-cards' },
    { text: 'books', href: '/accessories/books' },
    { text: 'colouring books', href: '/accessories/books/colouring-books' },
    { text: 'gift cards', href: '/accessories/gift-cards' },
    { text: 'equestrian jewellery', href: '/rider/jewellery' },
    { text: 'scarves', href: '/clothing/accessories/scarves' },
    { text: 'hats', href: '/clothing/accessories/hats' },
    { text: 'hair accessories', href: '/rider/accessories/hair' },
    { text: 'rider bags', href: '/rider/luggage/bags' },
    { text: 'keychains', href: '/rider/accessories/keychains' },
    { text: 'collectibles', href: '/accessories/collectibles' },
    { text: 'horse tack', href: '/horse/tack' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

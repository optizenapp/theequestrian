import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/kitchen',

  meta_title: 'Equestrian Kitchenware | Mugs, Trays & Glass',
  meta_description:
    'Equestrian kitchen and tableware: mugs, trays, glassware, tea towels and barware. Soft homeware decor sits on the homeware hub.',
  h1_title: 'Equestrian Kitchen & Table',
  breadcrumb_label: 'Kitchen',

  short_description: `<p>Browse <strong>equestrian kitchen</strong> pieces for the table: mugs, trays, glassware, tea towels, servingware, coasters and barware with a horse theme, not sofa cushions and not greeting cards.</p>
<!--read-more-trigger-->
<p>The main decision is something you drink from or serve on versus room decor. Cushions and wall art live under homeware. Cards and notebooks live under cards. A snaffle mug and a scatter tray belong here.</p>
<p>Use this hub when the gift is for a kitchen or bar. Riding tack stays in the horse silo. Read capacity and care notes on each listing before you buy.</p>`,

  long_description: `<h2>What Counts as Equestrian Kitchenware?</h2>
<p>Equestrian kitchenware is horse-themed table and bar hardware you use for drinks and serving, not soft furnishings for a lounge.</p>
<p>Typical pieces include:</p>
<ul>
<li>Mugs, tumblers and wine glass sets.</li>
<li>Trays, coasters and serving bowls.</li>
<li>Tea towels, openers and wine holders.</li>
</ul>

<h2>Kitchen vs Homeware</h2>
<p>Soft seats and wall decor sit under <a href="/accessories/homeware">equestrian homeware</a>, including <a href="/accessories/homeware/cushions">cushions</a> and <a href="/accessories/homeware/wall-art">wall art</a>.</p>
<p>A tea towel is kitchen linen. A cushion cover is homeware even if it shows a bit motif.</p>

<h2>Drinkware Leaves</h2>
<p>Start with <a href="/accessories/kitchen/mugs">mugs</a> for everyday cups, then <a href="/accessories/kitchen/glassware">glassware</a> for wine and tumbler sets.</p>
<p><a href="/accessories/kitchen/barware">Barware</a> covers openers, stoppers and holders. Do not buy a wine glass on the barware leaf unless the listing is that type.</p>

<h2>Serving Leaves</h2>
<p>Use <a href="/accessories/kitchen/trays">trays</a> for scatter and serving trays, <a href="/accessories/kitchen/servingware">servingware</a> for bowls and platters, and <a href="/accessories/kitchen/coasters">coasters</a> for table sets.</p>
<p><a href="/accessories/kitchen/tea-towels">Tea towels</a> are kitchen cloth, not bath towels under bedding.</p>

<h2>Kitchen vs Gifts and Cards</h2>
<p>Mixed leftovers stay on <a href="/accessories/gifts">equestrian gifts</a>. Paper cards sit under <a href="/accessories/cards">cards</a> and <a href="/accessories/cards/greeting-cards">greeting cards</a>.</p>
<p>A mug you wrap as a present is still kitchenware when the type is mug.</p>

<h2>Kitchen vs Books</h2>
<p>Reading titles sit under <a href="/accessories/books">books</a>. A recipe-style gift book is still a book, not a tray.</p>
<p>Collectible models sit on <a href="/accessories/collectibles">collectibles</a> when that is the product type.</p>

<h2>How to Choose</h2>
<p>Match the job: drink, serve, wipe, or open a bottle. Read capacity and dimensions on the listing. Australian shipping applies as on other accessories pages.</p>
<p>Do not treat a snaffle motif on a mug as a riding bit from <a href="/horse/bits">horse bits</a>.</p>`,

  faq_items: [
    {
      question: 'Are equestrian mugs homeware or kitchenware?',
      answer:
        'Mugs sit under kitchen. Homeware is for cushions, wall art and soft room decor. If you drink from it, use kitchen mugs. If you sit on it or hang it on a wall, use homeware leaves instead. Keep the split by how you use the object at home.',
    },
    {
      question: 'What is the difference between trays and servingware?',
      answer:
        'Trays are flat carriers and scatter trays. Servingware covers bowls, platters and related table pieces. Choose by the listing shape rather than the motif alone. Coasters are a separate leaf for table protection sets under glasses, cups, bottles and mugs.',
    },
    {
      question: 'Do tea towels belong with bedding?',
      answer:
        'No. Tea towels are kitchen cloth for drying and display in a kitchen. Bedding and doonas sit under homeware. Buy tea towels here when the job is kitchen linen, not a bed cover, and check size on the listing before you order.',
    },
    {
      question: 'Should I buy a horse mug on the gifts page?',
      answer:
        'Prefer the mugs leaf under kitchen when the product type is a mug. The gifts hub holds mixed leftovers without a clear leaf. Typed kitchen pieces should land on kitchen leaves so shoppers can compare like with like across brands.',
    },
  ],
};

export const frameworkNotes: SubcollectionFrameworkNotes = {
  centralEntity: 'equestrian kitchenware',
  primaryAngle:
    'Table and bar hardware for drinks and serving. Soft homeware is a different hub.',
  informationGain: [
    'Kitchen is drink and serve, not sofa decor.',
    'Mugs and glassware are drinkware leaves.',
    'Trays, servingware and coasters are serving leaves.',
    'Tea towels are kitchen cloth, not bedding.',
    'Barware is openers and holders, not wine glasses.',
    'Gifts is residual when type is unclear.',
    'A motif on a mug is not a riding bit.',
  ],
  closestSibling: '/accessories/homeware',
  overlapSplit: `Kitchen: mugs, trays, glass.
Homeware: cushions, wall art.
Gifts: residual presents.
Cards: paper.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Homeware split linked.',
    'Leaf drinkware vs servingware clear.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'equestrian homeware', href: '/accessories/homeware' },
    { text: 'cushions', href: '/accessories/homeware/cushions' },
    { text: 'wall art', href: '/accessories/homeware/wall-art' },
    { text: 'mugs', href: '/accessories/kitchen/mugs' },
    { text: 'glassware', href: '/accessories/kitchen/glassware' },
    { text: 'Barware', href: '/accessories/kitchen/barware' },
    { text: 'trays', href: '/accessories/kitchen/trays' },
    { text: 'servingware', href: '/accessories/kitchen/servingware' },
    { text: 'coasters', href: '/accessories/kitchen/coasters' },
    { text: 'Tea towels', href: '/accessories/kitchen/tea-towels' },
    { text: 'equestrian gifts', href: '/accessories/gifts' },
    { text: 'cards', href: '/accessories/cards' },
    { text: 'greeting cards', href: '/accessories/cards/greeting-cards' },
    { text: 'books', href: '/accessories/books' },
    { text: 'collectibles', href: '/accessories/collectibles' },
    { text: 'horse bits', href: '/horse/bits' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

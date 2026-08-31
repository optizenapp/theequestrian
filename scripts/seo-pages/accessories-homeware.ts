import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';
import { ACCESSORIES_SILO_INBOUND_TALLY } from '../lib/accessories-silo-inbound-tally';

const content: PageSEOContent = {
  url_path: '/accessories/homeware',

  meta_title: 'Equestrian Homeware | Decor & Soft Furnishings',
  meta_description:
    'Equestrian homeware covers cushions, hooks, wall art and decor for the house. Kitchen tableware and greeting cards sit on their own hubs.',
  h1_title: 'Equestrian Homeware',
  breadcrumb_label: 'Homeware',

  short_description: `<p>Browse <strong>equestrian homeware</strong> for the house: cushions, throws, wall art, statues, clocks, hooks and garden pieces with a horse theme, not riding tack and not kitchen tableware.</p>
<!--read-more-trigger-->
<p>The main decision is room decor versus something you eat or drink from. Mugs, trays and glassware live under kitchen. Greeting cards and notebooks live under cards. A cushion cover and a wall print belong here.</p>
<p>Use this hub when you are furnishing a room or stable office. Worn jewellery and scarves stay on rider and clothing pages.</p>`,

  long_description: `<h2>What Is Equestrian Homeware?</h2>
<p>Equestrian homeware is horse-themed furniture finish and soft furnishing for living spaces, not gear you ride in.</p>
<p>Typical pieces on this hub include:</p>
<ul>
<li>Cushions, throws and bedding.</li>
<li>Wall art, statues, clocks and lighting.</li>
<li>Hooks, key racks and garden outdoor pieces.</li>
</ul>

<h2>Homeware vs Kitchen</h2>
<p>Pieces you drink from or serve food on sit under <a href="/accessories/kitchen">equestrian kitchen</a>, including <a href="/accessories/kitchen/mugs">mugs</a>, <a href="/accessories/kitchen/trays">trays</a> and <a href="/accessories/kitchen/glassware">glassware</a>.</p>
<p>A cushion or wall clock is homeware even if it sits near a dining table.</p>

<h2>Homeware vs Gifts</h2>
<p>Mixed present-scale leftovers stay on <a href="/accessories/gifts">equestrian gifts</a>. Dedicated hanging hardware lives on <a href="/accessories/homeware/hooks">hooks</a>.</p>
<p>If you know the object type, open the leaf. Use gifts when the listing does not fit a leaf yet.</p>

<h2>Homeware vs Cards and Books</h2>
<p>Paper you write on sits under <a href="/accessories/cards">cards</a>. Bound titles sit under <a href="/accessories/books">books</a>.</p>
<p>A framed print is wall art here. A colouring book is still a book.</p>

<h2>Soft Furnishings</h2>
<p>Start with <a href="/accessories/homeware/cushions">cushions</a>, then <a href="/accessories/homeware/throws">throws</a> and <a href="/accessories/homeware/bedding">bedding</a> when you want fabric for a sofa or bed.</p>
<p>Hard sculpture and clocks are separate leaves so you are not comparing a cushion cover to a bronze.</p>

<h2>Hard Decor and Outdoor</h2>
<p>Browse <a href="/accessories/homeware/wall-art">wall art</a>, <a href="/accessories/homeware/statues">statues</a>, <a href="/accessories/homeware/clocks">clocks</a> and <a href="/accessories/homeware/lighting">lighting</a> for indoor display.</p>
<p><a href="/accessories/homeware/garden">Garden decor</a> is for outdoor statues and weathervanes. Do not treat garden pieces as indoor soft furnishings.</p>

<h2>How to Choose</h2>
<p>Pick by room job: soft seat, wall, mantel, or outdoor. Read dimensions on the listing. Australian shipping applies as on other accessories pages.</p>
<p>Scarves and jewellery are worn elsewhere. Scale models sit on <a href="/accessories/collectibles">collectibles</a> when that is the product type.</p>`,

  faq_items: [
    {
      question: 'Is equestrian homeware the same as kitchenware?',
      answer:
        'No. Homeware is room decor and soft furnishings such as cushions, wall art and hooks. Kitchenware is for serving and drinking: mugs, trays and glass. A cushion near a table is still homeware. Choose by whether you sit on it, hang it, or eat from it.',
    },
    {
      question: 'Should I shop gifts or homeware for a cushion?',
      answer:
        'Use the cushions leaf under homeware when you want cushion covers and soft seat pieces. The gifts hub is for mixed present-scale leftovers that do not yet sit on a typed leaf. If the listing is clearly a cushion, stay on homeware.',
    },
    {
      question: 'Do garden statues belong with indoor statues?',
      answer:
        'Indoor statues and outdoor garden pieces have separate leaves so weather-rated outdoor decor is not mixed with indoor sculpture. Check the listing for outdoor suitability before you buy. If the piece is for a living room mantel, use statues rather than garden.',
    },
    {
      question: 'Are scarves listed as homeware?',
      answer:
        'No. Scarves are clothing accessories. Buy them on the scarves page even if you plan to wrap them as a present. Homeware is for objects that furnish a room, not apparel you wear outdoors or at events. Keep wearables on clothing leaves.',
    },
  ],
};

export const frameworkNotes: SubcollectionFrameworkNotes = {
  centralEntity: 'equestrian homeware',
  primaryAngle:
    'Room decor and soft furnishings. Kitchen tableware and paper cards are other hubs.',
  informationGain: [
    'Homeware is furniture finish, not riding tack.',
    'Kitchen mugs and trays are a different hub.',
    'Gifts is residual when type is unclear.',
    'Cushions, throws and bedding are soft leaves.',
    'Wall art, statues, clocks and lighting are hard leaves.',
    'Garden is outdoor-rated decor.',
    'Scarves and jewellery stay on clothing and rider.',
  ],
  closestSibling: '/accessories/kitchen',
  overlapSplit: `Homeware: cushions, hooks, wall art.
Kitchen: mugs, trays, glass.
Gifts: residual presents.
Cards: paper to write on.`,
  verifyBeforePublishing: [
    'No parent /accessories link in HTML.',
    'Kitchen and gifts linked as splits.',
    'Leaf URLs confirmed published.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'equestrian kitchen', href: '/accessories/kitchen' },
    { text: 'mugs', href: '/accessories/kitchen/mugs' },
    { text: 'trays', href: '/accessories/kitchen/trays' },
    { text: 'glassware', href: '/accessories/kitchen/glassware' },
    { text: 'equestrian gifts', href: '/accessories/gifts' },
    { text: 'cushions', href: '/accessories/homeware/cushions' },
    { text: 'hooks', href: '/accessories/homeware/hooks' },
    { text: 'cards', href: '/accessories/cards' },
    { text: 'books', href: '/accessories/books' },
    { text: 'throws', href: '/accessories/homeware/throws' },
    { text: 'bedding', href: '/accessories/homeware/bedding' },
    { text: 'wall art', href: '/accessories/homeware/wall-art' },
    { text: 'statues', href: '/accessories/homeware/statues' },
    { text: 'clocks', href: '/accessories/homeware/clocks' },
    { text: 'lighting', href: '/accessories/homeware/lighting' },
    { text: 'Garden decor', href: '/accessories/homeware/garden' },
    { text: 'collectibles', href: '/accessories/collectibles' },
  ],
  inboundTally: ACCESSORIES_SILO_INBOUND_TALLY,
};

export default content;

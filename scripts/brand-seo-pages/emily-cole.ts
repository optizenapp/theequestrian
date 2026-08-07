import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'emily-cole',
  title: 'Emily Cole',
  breadcrumb_label: 'Emily Cole',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Emily Cole' },
    { column: 'HANDLE', relation: 'CONTAINS', condition: 'emily-cole' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'Emily Cole' },
  ],

  meta_title: 'Emily Cole Australia | Equestrian Art Calendars & Giftware',
  meta_description:
    'Shop Emily Cole equestrian art and giftware in Australia at The Equestrian. Discover Emily Cole desk calendars and horse-inspired gifts for riders.',
  h1_title: 'Shop Emily Cole Equestrian Art & Giftware',

  quick_answer:
    'Emily Cole is an equestrian artist known for horse-inspired illustrations used on calendars and giftware. Riders often look for Emily Cole pieces as thoughtful presents or decorative desk and home items with a clear equestrian theme.',

  short_description: `<p>Shop <strong>Emily Cole</strong> for equestrian art giftware, including illustrated desk calendars and horse-themed presents for riders and horse lovers.</p>
<!--read-more-trigger-->
<p>Browse Emily Cole alongside our wider <a href="/accessories/gifts">equestrian gifts</a> and <a href="/accessories">accessories</a> collections.</p>`,

  long_description: `<h2>About Emily Cole</h2>
<p>
Emily Cole creates equestrian-themed artwork that translates well into practical gift formats such as desk calendars. The style suits riders who want a decorative piece with a clear horse-and-riding focus rather than generic stationery.
</p>

<h3>Emily Cole Calendars & Desk Gifts</h3>
<p>
Search interest around Emily Cole often centres on calendars and seasonal gift pieces. If you are shopping for rider presents, also compare options in our <a href="/accessories/gifts">gifts range</a> and <a href="/accessories/homeware">homeware</a> collection.
</p>

<h3>Why Shop Emily Cole at The Equestrian</h3>
<p>
We list Emily Cole products with Australian shipping, clear product details and easy browsing next to complementary equestrian giftware from other makers.
</p>`,

  faq_items: [
    {
      question: 'Who is Emily Cole?',
      answer:
        'Emily Cole is an equestrian illustrator known for horse-themed artwork used on calendars and related gift items.',
    },
    {
      question: 'What Emily Cole products do you sell?',
      answer:
        'Availability varies, but Emily Cole listings typically include equestrian art giftware such as desk calendars. Check the brand page for current stock.',
    },
    {
      question: 'Is Emily Cole suitable as a gift for riders?',
      answer:
        'Yes. Emily Cole pieces are popular as thoughtful gifts for riders and horse lovers who want equestrian art they can use or display.',
    },
    {
      question: 'Do you ship Emily Cole products Australia-wide?',
      answer:
        'Yes. Emily Cole products purchased through The Equestrian ship Australia-wide, with rates calculated at checkout.',
    },
  ],
};

export default content;

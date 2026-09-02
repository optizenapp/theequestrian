import type { BrandSEOContent } from '../run-brand-seo-update';

/** House brand for Exclusively Equine Collective vendor — only products assigned brand Exclusively Equine. */
const content: BrandSEOContent = {
  handle: 'exclusively-equine',
  title: 'Exclusively Equine',
  breadcrumb_label: 'Exclusively Equine',
  logo_url: '/brands/logos/exclusively-equine.png',
  rules: [{ column: 'BRAND', relation: 'EQUALS', condition: 'Exclusively Equine' }],
  meta_title: 'Exclusively Equine Australia | Equestrian Giftware & Homeware',
  meta_description:
    'Shop Exclusively Equine giftware, Twilly scarves, Snaffle Bit accessories and equestrian homeware in Australia at The Equestrian. Australia-wide shipping.',
  h1_title: 'Shop Exclusively Equine',
  quick_answer:
    'Exclusively Equine designs bespoke equestrian giftware and homeware, from Twilly scarves and Snaffle Bit accessories to brooches, belts and cushion covers. Shop the range at The Equestrian with Australian shipping.',
  short_description: `<p>Shop <strong>Exclusively Equine</strong> for bespoke equestrian giftware — Twilly scarves, Snaffle Bit homeware, brooches, stirrup belts and more.</p>
<!--read-more-trigger-->
<p>Browse Exclusively Equine alongside our wider <a href="/accessories/gifts">equestrian gifts</a> and <a href="/accessories/homeware">homeware</a> collections.</p>`,
  long_description: `<h2>About Exclusively Equine</h2>
<p>
Exclusively Equine creates horse-inspired giftware and homeware for riders and horse lovers — from refined lapel pins and Twilly scarves to Snaffle Bit cushion covers, trays and accessories. The range suits gifting, stable décor and everyday equestrian style.
</p>

<h3>Exclusively Equine Twilly Scarves & Accessories</h3>
<p>
Twilly scarves, scrunchies, headbands and brooches are among the most searched Exclusively Equine lines. Also explore Snaffle Bit homeware and stirrup belts in our <a href="/accessories/gifts">gifts</a> range.
</p>

<h3>Why Shop Exclusively Equine at The Equestrian</h3>
<p>
We stock Exclusively Equine house-brand products with Australian shipping, clear product details and easy browsing alongside complementary equestrian giftware from other makers.
</p>`,
  faq_items: [
    {
      question: 'What is Exclusively Equine?',
      answer:
        'Exclusively Equine is an Australian equestrian giftware brand offering bespoke horse-themed accessories, homeware and apparel-style pieces such as Twilly scarves and Snaffle Bit designs.',
    },
    {
      question: 'What Exclusively Equine products do you sell?',
      answer:
        'We list Exclusively Equine house-brand products including Twilly scarves, Snaffle Bit homeware, brooches, stirrup belts, cushion covers and related giftware. Check the brand page for current stock.',
    },
    {
      question: 'Do you ship Exclusively Equine products Australia-wide?',
      answer:
        'Yes. Exclusively Equine products purchased through The Equestrian ship Australia-wide, with rates calculated at checkout.',
    },
  ],
};

export default content;

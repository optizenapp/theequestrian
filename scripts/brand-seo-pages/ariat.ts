import type { BrandSEOContent } from '../run-brand-seo-update';

/**
 * /brands/ariat - optimised April 2026
 * GSC clusters:
 *   - Brand core: ariat, ariats, ariat brand, ariat shop, ariat store
 *   - Geography: ariat australia, ariat australia store, ariat clothing australia
 *   - Apparel: ariat clothing, ariat wear, ariat apparel, ariat women's clothing, ariat jackets
 *   - Footwear: ariat boots, ariat footwear australia, ariat shoes
 *   - Purchase intent: ariat online store, where to buy ariat, ariat stockists
 */
const content: BrandSEOContent = {
  handle: 'ariat',
  title: 'Ariat',
  breadcrumb_label: 'Ariat',
  logo_url: '/brands/logos/ariat.png',

  meta_title: 'Ariat Australia - Riding Clothing & Footwear | The Equestrian',
  meta_description:
    'Shop Ariat in Australia at The Equestrian. Discover Ariat riding clothing, boots, footwear and everyday equestrian apparel for riders and stable life.',
  h1_title: 'Shop Ariat Riding Clothing, Boots & Footwear',

  short_description: `<p>Shop <strong>Ariat</strong>, one of the best-known names in riding clothing and footwear, trusted for practical comfort, modern style and everyday performance.</p>
<!--read-more-trigger-->
<p>Explore Ariat boots, riding apparel, jackets, polos, breeches and casual equestrian pieces designed for training, competition, stable work and everyday wear.</p>`,

  long_description: `<h2>About Ariat</h2>
<p>
Ariat is a globally recognised equestrian and country lifestyle brand known for combining rider-focused performance with practical everyday wear. In Australia, the brand is especially popular across both clothing and footwear for riders who want dependable gear that works in and out of the saddle.
</p>

<h2>Ariat Product Range</h2>

<h3>Ariat Riding Boots & Footwear</h3>
<p>
Ariat is well known for boots and footwear, including paddock boots, waterproof styles and practical everyday options for stable and riding use. If you are browsing the wider range, explore our <a href="/clothing/footwear">equestrian footwear</a> collection for more Ariat and riding boot styles.
</p>

<h3>Ariat Riding Clothing & Apparel</h3>
<p>
Ariat clothing is another core demand area, covering polos, technical tops, jackets, outerwear and casual rider staples. You can also browse related <a href="/clothing/outerwear/jackets">riding jackets</a> and <a href="/clothing/tops/polo-shirts">polo shirts</a> if you are comparing apparel options across the range.
</p>

<h3>Ariat Breeches, Tights & Everyday Rider Wear</h3>
<p>
The range also includes legwear and everyday rider essentials, with versatile pieces for regular training, stable use and casual wear. Ariat styles often balance technical comfort with a polished look that works well for riding, travel and general equestrian lifestyle wear.
</p>

<h2>Why Choose Ariat</h2>
<ul>
<li>Well-known equestrian brand trusted for both apparel and footwear</li>
<li>Popular for riding boots, jackets, polos, breeches and casual rider clothing</li>
<li>Designed for practical comfort across riding, stable work and everyday wear</li>
</ul>`,

  faq_items: [
    {
      question: 'What is Ariat known for?',
      answer:
        'Ariat is best known for riding boots, equestrian clothing and practical rider footwear that combine comfort, durability and modern styling.',
    },
    {
      question: 'Can I buy Ariat in Australia?',
      answer:
        'Yes. You can shop Ariat in Australia through The Equestrian, including Ariat riding clothing, boots, footwear and equestrian apparel.',
    },
    {
      question: 'Does Ariat make riding boots and clothing?',
      answer:
        'Yes. Ariat is popular for both riding boots and apparel, including jackets, polos, breeches, tights and casual rider wear.',
    },
    {
      question: 'Is Ariat only an equestrian brand?',
      answer:
        'Ariat is strongly associated with equestrian and riding use, but the range also includes country lifestyle, casual and workwear-inspired pieces that appeal beyond the arena.',
    },
  ],
};

export default content;

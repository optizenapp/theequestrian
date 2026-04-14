import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'thinline-global-australia',
  title: 'ThinLine Global Australia',
  breadcrumb_label: 'ThinLine Global Australia',
  rules: [
    { column: 'HANDLE', relation: 'CONTAINS', condition: 'thinline' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'thinline' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'thin line' },
  ],

  meta_title: 'ThinLine Global Australia | Saddle Pads & Western Pads | The Equestrian',
  meta_description:
    'Shop ThinLine Global Australia at The Equestrian. Explore ThinLine western saddle pads, liner pads, half pads, girths, reins and horse comfort products.',
  h1_title: 'Shop ThinLine Global Australia',

  short_description: `<p>Shop <strong>ThinLine Global Australia</strong> for western saddle pads, liner pads, half pads, girths, reins and horse comfort products designed to improve feel, cushioning and saddle stability.</p>
<!--read-more-trigger-->
<p>ThinLine is especially popular with riders looking for western pad options, correction support and shock-absorbing materials that help improve comfort for both horse and rider.</p>`,

  long_description: `<h2>About ThinLine Global Australia</h2>
<p>
ThinLine is recognised for specialist equestrian products built around shock absorption, comfort and a closer connection between horse and rider. The range includes western pads, liner pads, half pads, girths, reins and selected protective accessories, with many riders turning to the brand when they want support-focused gear rather than standard everyday tack alone.
</p>

<h2>Popular ThinLine Products</h2>

<h3>ThinLine Western Saddle Pads</h3>
<p>
ThinLine western saddle pads are a standout part of the range, especially for riders searching for felt western pads, liner pads and comfort-focused options for trail, ranch and general western riding. The brand is also relevant for riders comparing shimmable and corrective western pad styles that help manage saddle balance and pressure distribution. If you are shopping across the full category, browse our <a href="/horse/pads/western">western saddle pads</a> collection as well.
</p>

<h3>Half Pads & English Saddle Support</h3>
<p>
Outside the western category, ThinLine also offers half pads and saddle support products for English riding. These options are chosen by riders who want extra cushioning under the saddle while maintaining a close feel, making them relevant across schooling, competition and everyday riding.
</p>

<h3>Girths, Reins & Rider Comfort Accessories</h3>
<p>
The range also extends into reins, girths, stirrup-related accessories and other comfort-focused products that fit into everyday tack setups. This gives riders a way to stay within the same brand when looking for coordinated support products around the saddle area.
</p>

<h2>Why Riders Choose ThinLine</h2>
<ul>
<li>Best known for ThinLine western saddle pads, liner pads and comfort-focused support products</li>
<li>Popular with riders looking for shock absorption, stability and pressure distribution under saddle</li>
<li>Useful across both western and English tack setups</li>
</ul>`,

  faq_items: [
    {
      question: 'What is ThinLine known for?',
      answer:
        'ThinLine is best known for saddle support products, especially western saddle pads, liner pads and half pads designed to improve cushioning, pressure distribution and comfort under the saddle.',
    },
    {
      question: 'Can I buy ThinLine in Australia?',
      answer:
        'Yes. You can shop ThinLine Global Australia at The Equestrian, including western pads, liner pads, half pads, girths, reins and selected comfort accessories.',
    },
    {
      question: 'Does ThinLine make western saddle pads?',
      answer:
        'Yes. ThinLine offers a strong western range including felt pads, liner pads and comfort-focused western saddle pad options suited to riders wanting extra support and stability.',
    },
    {
      question: 'Are ThinLine products only for western riders?',
      answer:
        'No. Although ThinLine is highly relevant for western saddle pads, the brand also offers half pads, girths, reins and support products that suit English riding as well.',
    },
  ],
};

export default content;

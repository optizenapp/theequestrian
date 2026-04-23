import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'tucci',
  title: 'Tucci',
  breadcrumb_label: 'Tucci',
  rules: [
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'tucci-' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'tucci' },
  ],

  meta_title: 'Tucci Riding Boots Australia | The Equestrian',
  meta_description:
    'Shop Tucci riding boots in Australia at The Equestrian. Explore Tucci tall boots, short boots and premium Italian riding boot styles for competition riders.',
  h1_title: 'Shop Tucci Riding Boots in Australia',

  short_description: `<p>Shop <strong>Tucci</strong> riding boots for riders who want premium Italian styling, refined boot fit and polished presentation for training and competition.</p>
<!--read-more-trigger-->
<p>Explore Tucci tall boots, short boots and premium field boot styles, including well-known models such as Galileo, Marilyn, Harley, Leonardo and Sofia.</p>`,

  long_description: `<h2>About Tucci</h2>
<p>
Tucci is a premium riding boot brand known for Italian design, elegant finishes and competition-ready tall boots. The range is especially relevant for riders looking for smart long boots, polished short boots and premium leather styles that stand out in the arena.
</p>

<h2>Popular Tucci Boot Styles</h2>

<h3>Tucci Tall Boots & Field Boots</h3>
<p>
Many Tucci riders shop the brand for tall boots and field boots that combine refined shape with a close, elegant profile. Styles such as Galileo, Harley, Leonardo and Sofia appeal to riders who want premium competition boots with a clean finish.
</p>

<h3>Tucci Short Boots & Everyday Riding Options</h3>
<p>
Tucci also offers short boots for riders who want the same premium look in a more versatile everyday format. Marilyn and Harley short boot styles are suited to riders comparing polished paddock and riding boot options.
</p>

<h3>Italian Riding Boots for Competition Riders</h3>
<p>
Across the range, Tucci is closely associated with premium Italian riding boots for show jumping, showing and formal arena presentation. If you are comparing across the wider category, browse our <a href="/clothing/footwear">equestrian footwear</a> and <a href="/clothing/footwear/riding-boots">riding boots</a> collections.
</p>

<h2>Why Riders Choose Tucci</h2>
<ul>
<li>Popular for premium Italian tall boots and polished competition styles</li>
<li>Well-known models including Galileo, Marilyn, Harley, Leonardo and Sofia</li>
<li>Strong choice for riders who value fit, finish and elegant arena presentation</li>
</ul>`,

  faq_items: [
    {
      question: 'What is Tucci known for?',
      answer:
        'Tucci is best known for premium Italian riding boots, especially elegant tall boots and polished competition styles for riders who want refined fit and finish.',
    },
    {
      question: 'Can I buy Tucci riding boots in Australia?',
      answer:
        'Yes. You can shop Tucci riding boots in Australia at The Equestrian, including tall boots, field boots and short boot styles.',
    },
    {
      question: 'Does Tucci make tall boots and short boots?',
      answer:
        'Yes. Tucci offers both tall riding boots and short boots, making the brand suitable for riders comparing premium competition boots and everyday riding footwear.',
    },
    {
      question: 'Which Tucci boot styles are popular?',
      answer:
        'Popular Tucci boot styles include Galileo, Marilyn, Harley, Leonardo and Sofia, with options across tall boots, field boots and premium short boots.',
    },
  ],
};

export default content;

import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'cavallo',
  title: 'Cavallo',
  breadcrumb_label: 'Cavallo',
  rules: [
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'cavallo-' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'cavallo' },
  ],

  meta_title: 'Cavallo Riding Boots Australia | The Equestrian',
  meta_description:
    'Shop Cavallo riding boots in Australia at The Equestrian. Explore Cavallo dressage boots, jump boots and premium tall riding boot styles.',
  h1_title: 'Shop Cavallo Riding Boots in Australia',

  short_description: `<p>Shop <strong>Cavallo</strong> riding boots for riders who want premium tall boots with elegant presentation, supportive fit and performance-ready comfort.</p>
<!--read-more-trigger-->
<p>Explore Cavallo dressage boots, jump boots and refined long boot styles suited to competition riders, everyday training and polished arena turnout.</p>`,

  long_description: `<h2>About Cavallo</h2>
<p>
Cavallo is a recognised name in premium riding boots, especially for riders looking for tall boots with a refined fit and classic European styling. The range appeals to riders comparing dressage boots, jump boots and competition-ready long boots with a polished finish.
</p>

<h2>Popular Cavallo Boot Styles</h2>

<h3>Cavallo Dressage Boots</h3>
<p>
Cavallo dressage boots are a strong fit for riders who want tall boots with structure, support and a smart competition look. These styles are often chosen for a close leg fit and a more formal presentation in the arena.
</p>

<h3>Cavallo Jump Boots & Tall Riding Boots</h3>
<p>
The brand also suits riders shopping for jump boots and versatile tall riding boots that balance presentation with practical comfort. If you are comparing across the wider category, browse our full <a href="/clothing/footwear">equestrian footwear</a> and <a href="/clothing/footwear/riding-boots">riding boots</a> collections.
</p>

<h3>Premium Boot Fit & Finish</h3>
<p>
Cavallo is especially relevant for riders who care about finish, silhouette and boot feel. From dressage-focused styles to general tall boots, the brand is a strong option for riders investing in long-term riding footwear.
</p>

<h2>Why Riders Choose Cavallo</h2>
<ul>
<li>Popular for premium tall riding boots, jump boots and dressage boots</li>
<li>Well suited to competition riders seeking a polished arena look</li>
<li>Strong focus on fit, structure and smart presentation</li>
</ul>`,

  faq_items: [
    {
      question: 'What is Cavallo known for?',
      answer:
        'Cavallo is best known for premium riding boots, especially tall boots, dressage boots and jump boots designed for riders who want elegant presentation and supportive fit.',
    },
    {
      question: 'Can I buy Cavallo riding boots in Australia?',
      answer:
        'Yes. You can shop Cavallo riding boots in Australia at The Equestrian, including premium long boot styles for dressage, jumping and general riding.',
    },
    {
      question: 'Does Cavallo make dressage boots?',
      answer:
        'Yes. Cavallo is a strong choice for riders searching dressage boots, with styles suited to riders who want a formal look and a supportive tall boot fit.',
    },
    {
      question: 'Are Cavallo boots suitable for competition riders?',
      answer:
        'Yes. Cavallo boots are popular with competition riders thanks to their polished look, tall boot profile and performance-focused fit for arena use.',
    },
  ],
};

export default content;

import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'kep-italia',
  title: 'KEP Italia',
  breadcrumb_label: 'KEP Italia',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'KEP Italia' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'kep-italia-' },
  ],

  meta_title: 'KEP Italia Helmets Australia | The Equestrian',
  meta_description:
    'Shop KEP Italia helmets in Australia at The Equestrian. Explore KEP Cromo, Smart, Nova and helmet liner options for everyday riding and competition.',
  h1_title: 'Shop KEP Italia Helmets in Australia',

  short_description: `<p>Shop <strong>KEP Italia</strong> helmets for riders who want lightweight comfort, modern styling and trusted protection for training, competition and everyday riding.</p>
<!--read-more-trigger-->
<p>Explore popular KEP styles including Cromo, Smart and Nova helmets, plus liner and configurator options for riders comparing fit, finish and custom details.</p>`,

  long_description: `<h2>About KEP Italia</h2>
<p>KEP Italia is known for premium riding helmets that combine Italian styling with practical comfort and modern equestrian safety features. The brand is popular with riders looking for a polished helmet with a distinctive fit and finish.</p>

<h2>Popular KEP Helmet Styles</h2>

<h3>KEP Cromo & KEP Smart Helmets</h3>
<p>KEP Cromo and KEP Smart models are among the most searched styles, with riders comparing shape, peak, finish and everyday wearability. These helmets appeal to riders looking for smart presentation in the arena as well as practical comfort for regular riding.</p>

<h3>KEP Nova, Liners & Fit Options</h3>
<p>Keyword demand also shows interest in KEP Nova helmets, KEP helmet liners and sizing-related searches. That tells us riders are actively comparing fit systems, replacement liners and model differences before they buy.</p>

<h3>Custom & Premium KEP Designs</h3>
<p>Custom KEP helmets, glossy finishes, rose gold trims and Cromo 2.0 styles appeal to riders who want premium details and configurable looks. If you are comparing across the wider helmet range, browse our full <a href="/rider/helmets">horse riding helmets</a> collection.</p>

<h2>Why Riders Choose KEP Italia</h2>
<ul>
<li>Popular brand for riders searching premium horse riding helmets in Australia</li>
<li>Well-known styles including KEP Cromo, Smart and Nova helmets</li>
<li>Liner, fit and finish options that support personalised comfort and presentation</li>
</ul>`,

  faq_items: [
    {
      question: 'What is KEP Italia known for?',
      answer:
        'KEP Italia is best known for premium riding helmets that combine lightweight comfort, modern styling and refined finishes for competition and everyday riding.',
    },
    {
      question: 'Can I buy KEP Italia helmets in Australia?',
      answer:
        'Yes. You can shop KEP Italia helmets in Australia at The Equestrian, including popular KEP Cromo, Smart and Nova styles.',
    },
    {
      question: 'Does KEP Italia offer helmet liners and fit options?',
      answer:
        'Yes. KEP riders often look for liners and fit-related options so they can fine-tune comfort, sizing and helmet feel across different KEP models.',
    },
    {
      question: 'Which KEP Italia helmets are popular?',
      answer:
        'Popular KEP Italia searches include KEP Cromo helmets, KEP Smart helmets, KEP Nova helmets and premium custom-style designs with different finishes and trim details.',
    },
  ],
};

export default content;

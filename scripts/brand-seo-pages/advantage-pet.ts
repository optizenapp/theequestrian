import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'advantage-pet',
  title: 'Advantage Pet',
  breadcrumb_label: 'Advantage Pet',
  rules: [
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'advantage-' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'advantage' },
  ],

  meta_title: 'Advantage Pet for Dogs & Cats Australia | The Equestrian',
  meta_description:
    'Shop Advantage Pet in Australia at The Equestrian. Explore Advantage products for dogs and cats, including size-based treatments and selected collar options.',
  h1_title: 'Shop Advantage Pet for Dogs and Cats',

  short_description: `<p>Shop <strong>Advantage Pet</strong> for dogs and cats, including size-based flea treatment options and selected pet care products for easy repeat ordering.</p>
<!--read-more-trigger-->
<p>Browse Advantage dog and Advantage cat products across common weight ranges, with practical pack formats and selected collar options for everyday parasite control routines.</p>`,

  long_description: `<h2>About Advantage Pet</h2>
<p>
Advantage Pet is a familiar name for dog and cat parasite control products, with options designed to make shopping by pet type and weight range more straightforward. The range appeals to pet owners who want clear size-based choices and convenient reordering.
</p>

<h2>Popular Advantage Product Types</h2>

<h3>Advantage for Dogs</h3>
<p>
Advantage dog products are commonly shopped by size, with options for medium, large and other weight-based categories depending on the product line. These formats help owners select a treatment that matches their dog's size more easily.
</p>

<h3>Advantage for Cats</h3>
<p>
Advantage cat products are also available in size-based formats, including options for cats under 4kg and over 4kg. This makes the range easy to browse for households that want a clear match for smaller or larger cats.
</p>

<h3>Pack Sizes and Collar Options</h3>
<p>
Alongside standard treatment packs, the Advantage range can also include selected collar options in the broader pet care lineup. That gives pet owners the flexibility to compare formats across dogs and cats in one place.
</p>

<h2>Why Pet Owners Choose Advantage</h2>
<ul>
<li>Clear dog and cat options grouped by pet size or weight range</li>
<li>Easy-to-shop treatment packs for repeat purchase convenience</li>
<li>A practical range spanning both spot-on and selected collar-style products</li>
</ul>`,

  faq_items: [
    {
      question: 'Can I buy Advantage Pet for dogs and cats in Australia?',
      answer:
        'Yes. You can shop Advantage Pet in Australia at The Equestrian, including products for both dogs and cats.',
    },
    {
      question: 'Do you stock Advantage for cats under and over 4kg?',
      answer:
        'Yes. We stock Advantage cat products in common size groupings, including under 4kg and over 4kg options.',
    },
    {
      question: 'Do you have Advantage products for different dog sizes?',
      answer:
        'Yes. The Advantage dog range includes size-based options so you can choose a product suited to your dog.',
    },
    {
      question: 'Does the Advantage range include collars as well as treatment packs?',
      answer:
        'Yes. Our Advantage Pet range can include both treatment packs and selected collar options, depending on current availability.',
    },
  ],
};

export default content;

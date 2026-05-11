import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'credelio',
  title: 'Credelio',
  breadcrumb_label: 'Credelio',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Credelio' },
    { column: 'HANDLE', relation: 'CONTAINS', condition: 'credelio' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'credelio' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'credilio' },
  ],

  meta_title: 'Credelio for Dogs Australia | Credelio Plus Chews | The Equestrian',
  meta_description:
    'Shop Credelio in Australia at The Equestrian. Browse Credelio and Credelio Plus chew treatments for dogs across common weight ranges and pack sizes.',
  h1_title: 'Shop Credelio and Credelio Plus for Dogs',

  quick_answer:
    'Credelio is a dog parasite treatment range commonly shopped by weight bracket and pack size. On this page you can compare Credelio and Credelio Plus options for very small to extra large dogs, including 3, 6, 9 and 12 chew formats where available.',

  short_description: `<p>Shop <strong>Credelio</strong> and Credelio Plus for dogs, with size-based options that make it easier to match products to your dog’s weight range.</p>
<!--read-more-trigger-->
<p>Browse practical pack formats across small, medium, large and extra large dogs, and compare with our wider <a href="/pet/dog/wormers">dog wormers</a> and <a href="/pet/dog/flea-tick-worming">flea, tick & worming</a> categories.</p>`,

  long_description: `<h2>About Credelio</h2>
<p>
Credelio is a well-known dog treatment range that pet owners often search for by product type, dog size and chew count. This page groups Credelio and Credelio Plus listings to make repeat purchasing and size matching more straightforward.
</p>

<h3>Credelio Plus by Dog Weight</h3>
<p>
Credelio Plus products are commonly selected by weight bracket, including very small, small, medium, large and extra large dogs. This helps owners choose the right option with less guesswork when they already know their dog’s current weight range.
</p>

<h3>Pack Sizes for Ongoing Treatment</h3>
<p>
Depending on stock, Credelio and Credelio Plus are often available in multiple pack counts such as 3, 6, 9 and 12 chews. This makes it easier to choose a shorter restock cycle or a longer-coverage option based on your household routine.
</p>

<h3>Compare dog treatment options</h3>
<p>
If you are comparing alternatives, browse our broader <a href="/pet/dog/wormers">dog wormers</a>, <a href="/pet/dog/flea-tick-worming">flea, tick & worming</a> and <a href="/pet/dog">dog health range</a> for category-level selection.
</p>

<h2>Why Pet Owners Choose Credelio</h2>
<ul>
<li>Clear size-based options from very small to extra large dogs.</li>
<li>Commonly stocked in multiple pack sizes for easier repeat ordering.</li>
<li>Straightforward product naming by weight band and chew count.</li>
</ul>`,

  faq_items: [
    {
      question: 'Can I buy Credelio in Australia?',
      answer:
        'Yes. You can shop Credelio in Australia at The Equestrian, including Credelio and Credelio Plus options for dogs.',
    },
    {
      question: 'How do I choose the right Credelio size?',
      answer:
        'Choose by your dog’s current weight range shown on the product label. Match your dog to the listed bracket before selecting pack size.',
    },
    {
      question: 'Do you stock Credelio Plus in different pack sizes?',
      answer:
        'Yes. Depending on availability, Credelio Plus can be stocked in multiple chew counts such as 3, 6, 9 and 12 packs.',
    },
    {
      question: 'Is this page for dog Credelio products only?',
      answer:
        'This brand page is focused on dog products, with listings grouped by dog weight categories and pack formats.',
    },
  ],
};

export default content;

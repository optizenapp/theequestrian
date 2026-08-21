import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'advocate-pet',
  title: 'Advocate Pet',
  breadcrumb_label: 'Advocate Pet',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Advocate Pet' },
    { column: 'BRAND', relation: 'EQUALS', condition: 'Advocate' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'advocate-' },
  ],

  meta_title: 'Advocate Pet for Dogs & Cats Australia | The Equestrian',
  meta_description:
    'Shop Advocate Pet in Australia at The Equestrian. Find Advocate for dogs and cats in 3 pack and 6 pack options across common weight ranges.',
  h1_title: 'Shop Advocate Pet for Dogs and Cats',

  short_description: `<p>Shop <strong>Advocate Pet</strong> spot-on treatments for dogs and cats, including common pack sizes and weight-range options for easier repeat ordering.</p>
<!--read-more-trigger-->
<p>Browse Advocate dog and Advocate cat products in 3 pack and 6 pack formats, with options for small, medium, large and extra large pets.</p>`,

  long_description: `<h2>About Advocate Pet</h2>
<p>
Advocate Pet is a well-known spot-on treatment range for dogs and cats. Many pet owners choose Advocate when they want a familiar product line with clear size-based options and practical pack formats for ongoing treatment routines.
</p>

<h2>Popular Advocate Product Types</h2>

<h3>Advocate for Dogs</h3>
<p>
Advocate for dogs is available across multiple weight brackets, including under 4kg, 4-10kg, 10-25kg and over 25kg. This makes it easier to select the right option for your dog's size, with both 3 pack and 6 pack choices commonly available.
</p>

<h3>Advocate for Cats</h3>
<p>
Advocate cat options are typically grouped by weight, including under 4kg and over 4kg packs. These cat-specific options are popular with shoppers looking for straightforward size matching and repeat purchase convenience.
</p>

<h3>3 Pack and 6 Pack Options</h3>
<p>
Across both dog and cat ranges, Advocate 3 pack and 6 pack formats are common choices depending on how frequently you purchase and how many pets you are treating at home.
</p>

<h2>Why Pet Owners Choose Advocate</h2>
<ul>
<li>Clear size and weight-based options for both dogs and cats</li>
<li>Convenient 3 pack and 6 pack formats for regular use</li>
<li>Easy to shop by pet type, weight range and pack size</li>
</ul>`,

  faq_items: [
    {
      question: 'Can I buy Advocate Pet for dogs and cats in Australia?',
      answer:
        'Yes. You can shop Advocate Pet in Australia at The Equestrian, including options for both dogs and cats.',
    },
    {
      question: 'Do you stock Advocate in 3 pack and 6 pack options?',
      answer:
        'Yes. We stock Advocate products in common 3 pack and 6 pack formats across dog and cat ranges.',
    },
    {
      question: 'How do I choose the right Advocate size?',
      answer:
        'Choose Advocate by your pet type first, then match the listed weight range on the product to your dog or cat.',
    },
    {
      question: 'Do you have Advocate for cats under and over 4kg?',
      answer:
        'Yes. We stock Advocate cat options for common weight groups, including under 4kg and over 4kg.',
    },
  ],
};

export default content;

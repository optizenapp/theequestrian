import type { PageSEOContent } from '../run-page-seo-update';

const content: PageSEOContent = {
  url_path: '/pet/cat/food',
  meta_title: 'Cat Food Australia | Premium Cat Nutrition | The Equestrian',
  meta_description:
    'Shop cat food and treats in Australia at The Equestrian. Quality nutrition for cats with Australia-wide shipping.',
  h1_title: 'Cat Food & Treats',
  breadcrumb_label: 'Food & Treats',

  short_description: `<p>Shop <strong>cat food</strong> for complete daily nutrition, including dry and wet options for adult cats.</p>
<!--read-more-trigger-->
<p>Browse our <a href="/pet/cat">cat range</a> and wider <a href="/pet">pet essentials</a>.</p>`,

  long_description: `<h2>Cat Food Explained</h2>
<p>
Cats need complete, animal-protein-rich diets. Choose food matched to age and activity, and transition slowly when changing brands or formulas.
</p>

<ul>
<li>Provide fresh water alongside dry food.</li>
<li>Introduce new food gradually over a week.</li>
<li>See <a href="/pet/dog/food">dog food</a> if you shop for multiple pets.</li>
<li>Explore <a href="/pet">all pet products</a> at The Equestrian.</li>
</ul>`,

  faq_items: [
    {
      question: 'Do you sell cat food online in Australia?',
      answer: 'Yes. Cat food listed on The Equestrian ships Australia-wide.',
    },
  ],
};

export default content;

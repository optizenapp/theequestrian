import type { PageSEOContent } from '../run-page-seo-update';

const content: PageSEOContent = {
  url_path: '/pet/dog/food',
  meta_title: 'Dog Food Australia | Premium Nutrition | The Equestrian',
  meta_description:
    'Shop premium dog food in Australia at The Equestrian. Browse dry, wet and specialty dog nutrition with Australia-wide shipping.',
  h1_title: 'Premium Dog Food & Nutrition',
  breadcrumb_label: 'Food',

  short_description: `<p>Shop <strong>dog food</strong> for everyday nutrition, including dry, wet and specialty formulas for different life stages and dietary needs.</p>
<!--read-more-trigger-->
<p>Pair with <a href="/pet/dog/treats">dog treats</a> for training and our wider <a href="/pet/dog">dog essentials</a> range.</p>`,

  long_description: `<h2>Dog Food Explained</h2>
<p>
Choosing dog food means matching your dog’s age, size, activity level and any dietary sensitivities. Quality protein, digestible ingredients and appropriate fat levels support energy, coat condition and long-term health.
</p>

<h3>Everyday Dry & Wet Food</h3>
<p>
Complete and balanced dry or wet diets suit most dogs when portion sizes match weight and activity. Rotate flavours carefully if your dog has a sensitive stomach.
</p>

<h3>Specialty & Low-Fat Options</h3>
<p>
Low-fat and limited-ingredient formulas can suit dogs needing lighter meals or ingredient control. Always transition gradually when changing food.
</p>

<ul>
<li>Match food to life stage: puppy, adult or senior.</li>
<li>Introduce new foods slowly over 7–10 days.</li>
<li>Combine with <a href="/pet/dog/grooming">grooming care</a> for overall wellbeing.</li>
<li>Browse our full <a href="/pet">pet range</a> for complementary products.</li>
</ul>`,

  faq_items: [
    {
      question: 'Do you ship dog food across Australia?',
      answer: 'Yes. The Equestrian offers Australia-wide shipping on dog food listed online.',
    },
  ],
};

export default content;

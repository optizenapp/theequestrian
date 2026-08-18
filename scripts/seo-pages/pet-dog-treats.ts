import type { PageSEOContent } from '../run-page-seo-update';

const content: PageSEOContent = {
  url_path: '/pet/dog/treats',
  meta_title: 'Dog Treats Australia | Natural & Training Rewards | The Equestrian',
  meta_description:
    'Shop dog treats in Australia including natural chews and training rewards. Free shipping Australia-wide at The Equestrian.',
  h1_title: 'Natural Dog Treats & Training Rewards',
  breadcrumb_label: 'Treats',

  short_description: `<p>Browse <strong>dog treats</strong> for training, rewarding good behaviour and everyday snacking, including natural and protein-rich options.</p>
<!--read-more-trigger-->
<p>See also <a href="/pet/dog/food">dog food</a> and <a href="/pet/dog">dog essentials</a>.</p>`,

  long_description: `<h2>Dog Treats Explained</h2>
<p>
Treats support training, enrichment and bonding. Smaller, low-calorie rewards work well for repetitive training; longer chews suit quiet time and dental engagement.
</p>

<ul>
<li>Use small treats for frequent training sessions.</li>
<li>Choose natural ingredients where possible.</li>
<li>Balance treat calories with daily <a href="/pet/dog/food">food intake</a>.</li>
<li>Explore the wider <a href="/pet/dog">dog collection</a> for bowls and accessories.</li>
</ul>`,

  faq_items: [
    {
      question: 'What treats are best for dog training?',
      answer:
        'Small, soft treats that can be eaten quickly work best for training so your dog stays focused. Low-calorie options help when you reward frequently.',
    },
  ],
};

export default content;

import type { PageSEOContent } from '../run-page-seo-update';

/**
 * /horse/pads - optimised April 2026
 * GSC clusters:
 *   - Core generic: saddle pads, horse saddle pads, saddle pads australia
 *   - Discipline and shape: dressage saddle pad, all purpose saddle pad, showjumping saddle pads
 *   - Synonyms and adjacent intent: numnahs, saddle cloths, saddle blanket
 *   - Brand demand: LeMieux, Mattes, Classic Equine, Roma
 *
 * Internal links:
 *   - Parent: rendered by CollectionDescription using parent_url /horse
 *   - Siblings: /horse/saddles, /horse/tack, /horse/boots
 */
const content: PageSEOContent = {
  url_path: '/horse/pads',

  meta_title: 'Horse Saddle Pads Australia | Dressage, Jump & All Purpose',
  meta_description:
    'Shop horse saddle pads in Australia, including dressage pads, jump pads, all purpose saddle cloths and numnahs for everyday riding and competition.',
  h1_title: 'Horse Saddle Pads, Numnahs & Saddle Cloths for Every Ride',
  breadcrumb_label: 'Pads',

  short_description: `<p>Browse <strong>horse saddle pads</strong>, numnahs and saddle cloths designed for comfort under the saddle, everyday practicality and a neat turnout across different riding styles.</p>
<!--read-more-trigger-->
<p>This collection includes dressage saddle pads, jump pads, all purpose pads and shaped numnahs, helping riders choose the right cut, thickness and feel for their saddle and horse.</p>

<p>Whether you are refreshing your everyday schooling gear or shopping for a smarter competition look, you can compare a wide range of pad styles, colours and materials here.</p>`,

  long_description: `<h2>Horse Saddle Pads Explained</h2>
<p>
Horse saddle pads help protect the horse's back, improve comfort under the saddle and keep your tack cleaner during regular use. Riders often choose between saddle pads, saddle blankets, numnahs and more discipline-specific styles based on shape, intended use and the overall look they want under the saddle.
</p>

<h3>Dressage, Jump & All Purpose Saddle Pads</h3>
<p>
<strong>Dressage saddle pads</strong>, all purpose pads and showjumping saddle pads are usually chosen to suit the cut of the saddle first. Dressage pads are generally shaped for longer straight flaps, while jump and all purpose pads are designed to work neatly with more forward-cut saddles and versatile everyday riding.
</p>

<h3>Numnahs, Saddle Cloths & Everyday Schooling Pads</h3>
<p>
Numnahs, saddle cloths and everyday schooling pads remain popular because they offer practical coverage, easy care and a tidy look for regular riding. Riders comparing their full setup may also want to browse our <a href="/horse/saddles">horse saddles</a> and <a href="/horse/tack">horse tack</a> collections.
</p>

<h3>Choosing Padding, Grip & Support</h3>
<p>
Some riders look for extra grip, cushioning or specialised materials, while others simply want a practical pad for daily use. For horses in regular work, overall comfort can also depend on the rest of the equipment used around the leg and back, including supportive <a href="/horse/boots">horse boots</a> where appropriate.
</p>
`,

  faq_items: [
    {
      question: 'What is the difference between a saddle pad and a numnah?',
      answer:
        'The terms are often used interchangeably, but a numnah is usually more shaped to the saddle while a saddle pad or saddle cloth may have a squarer outline. The best choice depends on your saddle, desired coverage and riding style.',
    },
    {
      question: 'How do I choose the right saddle pad for my horse?',
      answer:
        'Start by matching the pad shape to your saddle type, such as dressage, jump or all purpose. Then consider thickness, materials, breathability and whether you want more everyday practicality or a smarter competition finish.',
    },
    {
      question: 'Can I use the same saddle pad for dressage and jumping?',
      answer:
        'Some riders use versatile all purpose pads across different activities, but dedicated dressage and jumping pads are usually shaped to suit the specific cut of those saddles more neatly.',
    },
    {
      question: 'What are saddle blankets used for?',
      answer:
        'Saddle blankets are another term shoppers sometimes use for saddle pads or cloths. They are used under the saddle to add comfort, protect the horse\'s back and help keep the saddle cleaner during use.',
    },
  ],
};

export default content;

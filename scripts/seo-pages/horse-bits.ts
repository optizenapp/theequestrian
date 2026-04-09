import type { PageSEOContent } from '../run-page-seo-update';

/**
 * /horse/bits - optimised April 2026
 * GSC clusters:
 *   - Core: horse bits, horse bit, bits for horses, horse bits australia
 *   - Education intent: horse bits types, types of horse bits, bit types
 *   - Common families: snaffle bit, gag bit, full cheek, pelham, weymouth, mullen
 *   - Materials and feel: rubber bits, sweet iron bits, happy tongue
 *   - Brand terms: Trust bits, Sprenger bits, Bombers bits, Myler bits
 *
 * Internal links:
 *   - Parent: rendered by CollectionDescription using parent_url /horse
 *   - Contextual: /horse/tack, /horse/tack/bridles
 */
const content: PageSEOContent = {
  url_path: '/horse/bits',

  meta_title: 'Horse Bits Australia | Snaffle, Gag, Pelham & More',
  meta_description:
    'Shop horse bits in Australia, including snaffle bits, gag bits, pelhams, full cheek and rubber mouth options for training and competition.',
  h1_title: 'Bits for Horses and Ponies Across All Riding Levels',
  breadcrumb_label: 'Bits',

  short_description: `<p>Browse <strong>horse bits</strong> for clearer communication, better comfort and more confidence in the saddle, with options for ponies, young horses and experienced campaigners.</p>
<!--read-more-trigger-->
<p>This collection includes snaffle bits, gag bits, pelhams, full cheek styles and specialist mouthpieces in a range of materials and ring designs.</p>

<p>Whether you are refining everyday flatwork, improving steering or selecting a show-ready setup, you can compare trusted bit styles and sizes in one place.</p>`,

  long_description: `<h2>Horse Bits Explained</h2>
<p>
Choosing the right horse bit comes down to your horse's mouth conformation, level of training, rider feel and the type of work you are doing. A good bit should support soft, consistent contact while helping the horse stay relaxed, responsive and confident.
</p>

<h3>Snaffle Bits, Gag Bits & Core Bit Families</h3>
<p>
Many riders begin with a snaffle, then move to other styles such as gag bits, pelhams or weymouth combinations based on training goals and competition requirements. Full cheek and dee ring designs can help with lateral guidance, while loose ring and eggbutt styles are often chosen for different levels of movement and stability in the mouth.
</p>

<h3>Rubber, Sweet Iron & Mouthpiece Feel</h3>
<p>
Mouthpiece material plays a big role in acceptance and comfort. Rubber bits can feel softer for some horses, while sweet iron and shaped mouthpieces are often used to encourage a steadier contact. Riders comparing setup options can also look at ported, mullen and double-jointed designs to find the best response for their horse.
</p>

<h3>Bit Choice for Training and Competition</h3>
<p>
Bit selection is often adjusted as training progresses, with different choices for schooling, jumping, dressage and stronger horses. If you are reviewing your full setup, you can also browse our <a href="/horse/tack">horse tack</a> and <a href="/horse/tack/bridles">bridles</a> collections to match your bit with the right bridle and rein arrangement.
</p>`,

  faq_items: [
    {
      question: 'What is the best bit for a horse?',
      answer:
        'There is no single best bit for every horse. The right choice depends on your horse’s mouth, training level, way of going and the discipline you ride. Fit, rider hands and correct use are just as important as bit style.',
    },
    {
      question: 'What are the main types of horse bits?',
      answer:
        'Common bit families include snaffle bits, gag bits, pelhams, weymouths and curb-style options, with ring variations such as loose ring, eggbutt, dee ring and full cheek.',
    },
    {
      question: 'Are rubber bits softer for horses?',
      answer:
        'Rubber mouthpieces can feel softer for some horses and are often chosen for horses that prefer a milder feel. Correct size, thickness and fit still matter for comfort and effective communication.',
    },
    {
      question: 'How do I choose the right bit size?',
      answer:
        'Measure the horse’s mouth from corner to corner and choose a bit that sits comfortably without pinching. As a guide, the bit should be wide enough to clear the lips but not so wide that it shifts excessively in use.',
    },
  ],
};

export default content;

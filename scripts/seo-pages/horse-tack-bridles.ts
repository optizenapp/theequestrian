import type { PageSEOContent } from '../run-page-seo-update';

/**
 * /horse/tack/bridles - optimised April 2026
 * GSC clusters:
 *   - Core generic: bridles, horse bridle, horse bridles, bridles australia
 *   - Discipline and type: show jumping bridles, dressage bridles, grackle bridle, western bridle
 *   - Fit modifiers: pony bridles, cob bridle, warmblood bridle
 *   - Accessories: bridle accessories, bridle parts, bridle reins
 *   - Brand: equipe bridle, equipe bridles
 *
 * Internal links:
 *   - Parent: rendered by CollectionDescription using parent_url /horse/tack
 *   - Siblings: /horse/tack/reins, /horse/tack/browbands, /horse/tack/number-holders
 *   - Brand: /brands/equipe
 */
const content: PageSEOContent = {
  url_path: '/horse/tack/bridles',

  meta_title: 'Horse Bridles Australia | Dressage, Jumping & Pony Bridles',
  meta_description:
    'Shop horse bridles in Australia, including dressage bridles, jumping bridles, pony bridles and leather options for training and competition.',
  h1_title: 'Horse Bridles for Training, Competition & Everyday Riding',
  breadcrumb_label: 'Bridles',

  short_description: `<p>Browse <strong>horse bridles</strong> for schooling, competition and everyday riding, with options suited to different disciplines, head shapes and levels of rider preference.</p>
<!--read-more-trigger-->
<p>This collection includes dressage bridles, jumping bridles, pony bridles and everyday leather bridles, helping riders compare fit, style and intended use in one place.</p>

<p>Whether you are replacing a well-used bridle or refining a turnout for the show ring, these bridles are selected for practical use, neat presentation and reliable comfort.</p>`,

  long_description: `<h2>Horse Bridles Explained</h2>
<p>
The right horse bridle should suit both the horse and the discipline, balancing comfort, control and presentation. Riders often compare everyday bridles with more specialised styles for show jumping, dressage and ponies, so fit, finish and noseband style all play an important part in choosing the right option.
</p>

<h3>Dressage, Jumping & Show Bridles</h3>
<p>
<strong>Dressage bridles</strong>, show jumping bridles and show bridles all serve slightly different needs in the saddle and in the ring. Dressage riders may prefer a more formal look, while jumping riders often focus on practical noseband styles and a secure fit for horses that work actively in front.
</p>

<h3>Pony Bridles, Cob Sizes & Fit Choices</h3>
<p>
Pony bridles, cob bridles and warmblood bridles all need thoughtful fitting to sit comfortably and work correctly. A well-fitted bridle should sit neatly over the poll and cheeks without pinching, while allowing enough adjustment through the noseband, browband and throatlash for the horse's head shape.
</p>

<h3>Bridle Parts, Reins & Competition Accessories</h3>
<p>
Many riders refresh the full setup at the same time, including bridle accessories, reins and competition details such as number holders. To complete your bridle setup, browse our <a href="/horse/tack/reins">horse reins</a>, <a href="/horse/tack/browbands">browbands</a> and <a href="/horse/tack/number-holders">number holders</a>.
</p>

<h2>Shop Horse Bridles by Brand</h2>
<p>
Shop horse bridles from premium brands including <a href="/brands/equipe">Equipe</a>, known for refined leatherwork and competition-ready bridle styles.
</p>`,

  faq_items: [
    {
      question: 'What type of horse bridle do I need?',
      answer:
        'The best bridle depends on your discipline, your horse\'s head shape and how much adjustability you need. Many riders choose between everyday riding bridles, dressage styles, jumping bridles and pony-specific fits.',
    },
    {
      question: 'What is the difference between a dressage bridle and a jumping bridle?',
      answer:
        'Dressage bridles often have a more formal presentation and may use different noseband styles, while jumping bridles are commonly chosen for practical fit, freedom and suitability for horses working actively over fences.',
    },
    {
      question: 'How do I know if a pony bridle fits properly?',
      answer:
        'A pony bridle should sit evenly across the head without pinching at the poll or cheeks. The browband should not pull the headpiece forward, and the noseband and throatlash should allow comfortable adjustment.',
    },
    {
      question: 'Can I buy Equipe bridles in Australia?',
      answer:
        'Yes. This bridles collection includes Equipe options for riders shopping premium leather bridles in Australia.',
    },
  ],
};

export default content;

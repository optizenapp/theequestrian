import type { PageSEOContent } from '../run-page-seo-update';

/**
 * /horse/tack - optimised April 2026
 * GSC clusters:
 *   - Core generic: horse tack, horsetack, horse tackle
 *   - Breastplates and martingales: horse breastplate, breastplate horse, martingale horse
 *   - Stirrups: jumping stirrups, showjumping stirrups, tack stirrups
 *   - Competition accessories: bridle numbers, horse number holder
 *
 * Internal links:
 *   - Parent: rendered by CollectionDescription using parent_url /horse
 *   - Siblings: /horse/saddles, /horse/pads, /horse/boots
 */
const content: PageSEOContent = {
  url_path: '/horse/tack',

  meta_title: 'Horse Tack Australia | Bridles, Breastplates & Stirrups',
  meta_description:
    'Shop horse tack in Australia, including bridles, breastplates, martingales, stirrups and competition tack for everyday riding and show preparation.',
  h1_title: 'Horse Tack for Training, Competition & Everyday Riding',
  breadcrumb_label: 'Tack',

  short_description: `<p>Browse <strong>horse tack</strong> for training, competition and everyday riding, including bridles, reins, breastplates, stirrups and key competition accessories used across Australian disciplines.</p>
<!--read-more-trigger-->
<p>This category helps you compare core setups in one place, from <a href="/horse/tack/bridles">horse bridles</a> and <a href="/horse/tack/reins">horse reins</a> through to rider-control hardware and turnout details.</p>

<p>Whether you are replacing one worn item or rebuilding a full kit, you can shop practical tack for flatwork, jumping and everyday riding with fast shipping Australia-wide.</p>`,

  long_description: `<h2>Horse Tack Types & Uses</h2>
<p>
Horse tack covers the equipment used on and around the horse for riding, control and presentation. A practical tack setup should suit your discipline, fit your horse correctly and support safe, comfortable riding whether you are schooling at home, heading to pony club or preparing for competition.
</p>

<h3>Bridles, Reins & Everyday Control</h3>
<p>
Most riders start with the essentials: a well-fitted <a href="/horse/tack/bridles">bridle</a>, reliable <a href="/horse/tack/reins">reins</a> and hardware matched to how the horse works. From schooling to competition prep, correct fit and quality materials make day-to-day riding more consistent.
</p>

<h3>Front-End Support & Discipline Setup</h3>
<p>
Breastplates and martingales are common additions for riders who want more front-end stability over fences or on varied terrain. Pair those choices with the right <a href="/horse/tack/stirrup-irons">stirrup irons</a> and leg-position setup to improve rider balance and confidence in the saddle.
</p>

<h3>Competition Details & Complete Kits</h3>
<p>
For show days and events, riders often add practical finishing pieces such as <a href="/horse/tack/number-holders">number holders</a> and matching accessories. If you are building a complete setup, also browse <a href="/horse/saddles">horse saddles</a>, <a href="/horse/pads">horse pads</a> and <a href="/horse/boots">horse boots</a> to round out your riding kit.
</p>

<h3>At a glance</h3>
<ul>
<li>Shop core tack categories in one place: bridles, reins, stirrups and accessories.</li>
<li>Choose tack by discipline and horse fit, not just price point.</li>
<li>Add competition-ready details like number holders when needed.</li>
<li>Complete your setup with saddles, pads and horse boots for regular work.</li>
</ul>
`,

  faq_items: [
    {
      question: 'What is included in horse tack?',
      answer:
        'Horse tack usually includes riding equipment such as bridles, reins, breastplates, martingales, stirrups, girths and related accessories used for control, rider support and turnout.',
    },
    {
      question: 'What tack do I need to start riding?',
      answer:
        'The exact setup depends on your discipline, but many riders start with a saddle, bridle, girth, stirrups and any supporting tack needed for fit and stability. Additional accessories can be added based on the horse and type of riding.',
    },
    {
      question: 'What is the difference between a breastplate and a martingale?',
      answer:
        'A breastplate helps keep the saddle from slipping back, while a martingale is used to influence head carriage or rein action depending on the design. Some products combine both functions in one setup.',
    },
    {
      question: 'Do I need special tack for competition?',
      answer:
        'Many riders use their everyday tack in competition, but some events also require presentation items such as number holders or more discipline-specific tack choices depending on the class and rules.',
    },
  ],
};

export default content;

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

  short_description: `<p>Browse <strong>horse tack</strong> for training, competition and everyday riding, including the key leatherwork and hardware used to ride, manage and present your horse properly.</p>
<!--read-more-trigger-->
<p>This collection brings together essential tack categories such as bridles, breastplates, martingales, stirrups and competition accessories, making it easier to compare the gear that supports fit, control and rider stability.</p>

<p>Whether you are updating a single piece of tack or building out a complete setup for flatwork, jumping or general riding, you can shop the core categories below in one place.</p>`,

  long_description: `<h2>Horse Tack Explained</h2>
<p>
Horse tack covers the equipment used on and around the horse for riding, control and presentation. A well-planned tack setup should match your discipline, fit your horse correctly and support safe, comfortable riding whether you are schooling at home, heading to pony club or preparing for competition.
</p>

<h3>Breastplates, Martingales & Front-End Stability</h3>
<p>
<strong>Horse breastplates</strong>, pony breastplates and martingales are useful for riders who want extra stability through the front end and a more secure saddle setup. These pieces are especially popular for jumping, eventing and horses working over varied terrain where keeping the saddle in place matters.
</p>

<h3>Stirrups, Irons & Rider Position</h3>
<p>
The right stirrup setup can improve grip, comfort and balance, whether you are flat riding, jumping or building a more competition-focused kit. If you are refining your overall riding setup, you can also browse our <a href="/horse/saddles">horse saddles</a> and <a href="/horse/pads">horse pads and saddle cloths</a> collections.
</p>

<h3>Competition Tack & Everyday Essentials</h3>
<p>
Alongside everyday riding essentials, many tack setups also include competition accessories such as bridle numbers and horse number holders for show days and events. For horses in regular work, many riders also shop supportive gear such as <a href="/horse/boots">horse boots</a> alongside their tack setup.
</p>
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

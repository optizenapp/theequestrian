import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';

const content: PageSEOContent = {
  url_path: '/clothing/mens/show-shirts',

  // Layout appends " | The Equestrian" → SERP title lands at 55 chars.
  meta_title: 'Mens Show Shirts | Competition Riding',
  meta_description:
    'Shop mens show shirts in Australia: long and short sleeve competition shirts, zip polos and classic show collars from Samshield, Ego7 and more.',
  h1_title: 'Mens Show Shirts',
  breadcrumb_label: 'Show Shirts',

  short_description: `<p>Shop <strong>mens show shirts</strong> for competition: long sleeve and short sleeve show shirts, zip competition polos and classic collar styles worn under a show jacket.</p>
<!--read-more-trigger-->
<p>Fabrics lean toward breathable competition knits and woven show cloths with a tidy placket, so the shirt sits clean under a jacket without bulk at the collar. Check sleeve length, collar type and listed size on each product page.</p>
<p>Finish the ring kit with <a href="/clothing/mens/show-jackets">mens competition jackets</a> and <a href="/clothing/mens/breeches">mens breeches</a>. Casual day shirts sit on <a href="/clothing/tops/shirts">shirts</a>, not this competition leaf.</p>`,

  long_description: `<h2>What Are Mens Show Shirts?</h2>
<p>Mens show shirts are competition tops cut to sit under a show jacket, with a clean collar line, secure placket and fabrics chosen for arena wear rather than casual yard layering.</p>
<p>Typical formats on this leaf include:</p>
<ul>
<li>Long sleeve competition shirts</li>
<li>Short sleeve show shirts for warmer days</li>
<li>Zip competition polos with a closer athletic collar</li>
<li>Classic woven show shirts with a traditional placket</li>
</ul>

<h2>Long Sleeve vs Short Sleeve Competition Shirts</h2>
<p>Long sleeves give a formal line under a jacket and more sun cover between classes. Short sleeves reduce bulk and heat when jackets come off at the truck. Match sleeve length to climate and whether your class expects a jacket on for the entire round.</p>

<h2>Competition Polos vs Classic Show Collars</h2>
<p>Zip competition polos use a sport collar and closer knit for a modern ring look. Classic show shirts keep a traditional collar and button or hidden placket that sits flat under a tailored jacket. Choose by jacket neckline and the presentation rules for your discipline.</p>

<h2>Mens Show Shirts vs Everyday Shirts and Polos</h2>
<p>Everyday woven shirts and casual polos live on the tops leaves. This page is for competition show shirts only. Casual polos sit on <a href="/clothing/tops/polo-shirts">polo shirts</a> when you are not shopping for arena presentation.</p>

<h2>How to Choose a Mens Show Shirt</h2>
<p>Confirm sleeve length and collar type first, then check size systems (alpha versus numeric) and fabric care on the listing. Compare competition lines on <a href="/brands/samshield">Samshield</a>, <a href="/brands/ego7">Ego7</a>, <a href="/brands/cavalleria-toscana">Cavalleria Toscana</a> and <a href="/brands/qj-riding-wear">QJ Riding Wear</a> when you already prefer a label.</p>`,

  faq_items: [
    {
      question: 'What belongs on the mens show shirts page?',
      answer:
        'Competition shirts for men, including long and short sleeve show shirts, zip competition polos and classic collar styles meant to wear under a show jacket. Casual shirts and everyday polos sit on the tops leaves. Read sleeve length, collar type and size notes on each listing before you buy.',
    },
    {
      question: 'Should I buy long sleeve or short sleeve for competition?',
      answer:
        'Long sleeves suit cooler days and a more formal jacket line. Short sleeves suit warm Australian show conditions when jackets come off between classes. Some events expect jackets on for the round regardless of sleeve length, so check the class schedule and then match the shirt to climate and comfort.',
    },
    {
      question: 'What is the difference between a competition polo and a classic show shirt?',
      answer:
        'A competition polo usually has a sport collar and zip placket in a stretch knit. A classic show shirt keeps a traditional collar and button or hidden placket that sits flat under a tailored coat. Pick the collar that matches your jacket and the presentation style your discipline prefers.',
    },
    {
      question: 'Which brands of mens show shirts do you stock?',
      answer:
        'This leaf includes competition shirts from labels such as Samshield, Ego7, Cavalleria Toscana and QJ Riding Wear, with long sleeve, short sleeve and zip polo options. Stock moves with vendor inventory, so use brand filters and confirm the size chart on each product page.',
    },
    {
      question: 'What do I wear with a mens show shirt?',
      answer:
        'Most riders pair a show shirt with a mens competition jacket, competition breeches and tall boots, plus helmet and gloves as required. Shop jackets and breeches on their mens clothing leaves. Confirm colour rules for shirt and jacket in your class schedule before competition day.',
    },
  ],
};

export const frameworkNotes: SubcollectionFrameworkNotes = {
  centralEntity: 'mens show shirts',
  primaryAngle:
    'Competition shirts under a show jacket: long vs short sleeve, zip polo vs classic collar, separate from casual tops.',
  informationGain: [
    'Long sleeve vs short sleeve for climate and jacket line.',
    'Zip competition polos vs classic show collars and plackets.',
    'Cut to sit under a competition jacket without collar bulk.',
    'Alpha and numeric size systems appear on listings.',
    'Casual shirts and polos live on tops leaves, not this page.',
    'Pairs with mens competition jackets and mens breeches.',
    'Brand filters include Samshield, Ego7, Cavalleria Toscana and QJ Riding Wear.',
  ],
  closestSibling: '/clothing/mens/show-jackets',
  overlapSplit:
    'Show shirts = competition tops under the coat. Show jackets = competition coats. Tops shirts/polos = everyday wear.',
  verifyBeforePublishing: [
    'No parent /clothing/mens link in HTML.',
    'Only published sibling and brand URLs linked.',
    'No free-shipping or 24-hour dispatch claims.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'mens competition jackets', href: '/clothing/mens/show-jackets' },
    { text: 'mens breeches', href: '/clothing/mens/breeches' },
    { text: 'shirts', href: '/clothing/tops/shirts' },
    { text: 'polo shirts', href: '/clothing/tops/polo-shirts' },
    { text: 'Samshield', href: '/brands/samshield' },
    { text: 'Ego7', href: '/brands/ego7' },
    { text: 'Cavalleria Toscana', href: '/brands/cavalleria-toscana' },
    { text: 'QJ Riding Wear', href: '/brands/qj-riding-wear' },
  ],
  inboundTally: {},
};

export default content;

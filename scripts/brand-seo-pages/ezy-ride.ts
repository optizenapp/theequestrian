import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'ezy-ride',
  title: 'EZY Ride',
  breadcrumb_label: 'EZY Ride',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'EZY Ride' },
    { column: 'BRAND', relation: 'EQUALS', condition: 'Ezy Ride' },
    { column: 'HANDLE', relation: 'CONTAINS', condition: 'ezy-ride' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'ezy ride' },
  ],

  meta_title: 'EZY Ride Australia | Saddles, Stirrups, Girths & Western Gear',
  meta_description:
    'Shop EZY Ride in Australia at The Equestrian. Explore EZY Ride saddles, stirrups, girths, saddle pads, gloves and western riding essentials.',
  h1_title: 'Shop EZY Ride Saddles, Stirrups & Western Riding Gear',

  quick_answer:
    'EZY Ride is a western-focused equestrian brand known in Australia for practical gear including saddles, stirrups, girths, saddle pads and riding accessories. Riders often search EZY Ride for affordable stock and western setup pieces that work for everyday riding, training and general paddock use.',

  short_description: `<p>Shop <strong>EZY Ride</strong> for western and stock-riding essentials including saddles, stirrups, girths, saddle pads, gloves and everyday horse-and-rider accessories.</p>
<!--read-more-trigger-->
<p>Browse EZY Ride gear in one place, then compare across our wider <a href="/horse/stock-western">stock & western</a>, <a href="/horse/pads/western">western pads</a> and <a href="/rider/gloves">riding gloves</a> collections.</p>`,

  long_description: `<h2>About EZY Ride</h2>
<p>
EZY Ride is a practical brand for riders building or refreshing western and stock setups without overcomplicating product choice. The range covers key tack and rider items used across training, leisure riding and day-to-day horse management.
</p>

<h3>EZY Ride Saddles & Saddle Setup Pieces</h3>
<p>
Search demand around EZY Ride is led by saddles, with riders also looking for related setup items such as fenders and wither-support products. If you are comparing options by discipline, browse the wider <a href="/horse/stock-western">stock and western range</a> for complementary tack.
</p>

<h3>Stirrups, Girths & Everyday Riding Hardware</h3>
<p>
EZY Ride stirrups and girths are common add-ons for riders replacing high-wear components or upgrading comfort. These categories suit riders who want straightforward, functional pieces for regular riding schedules.
</p>

<h3>Western Pads, Gloves & Grooming Accessories</h3>
<p>
The brand also spans practical accessories including western pads, roping gloves and selected grooming items. For broader category comparison, see <a href="/horse/pads/western">western pads</a>, <a href="/rider/gloves">rider gloves</a> and <a href="/horse/grooming">horse grooming</a>.
</p>

<h2>Why Riders Choose EZY Ride</h2>
<ul>
<li>Western-oriented product mix with core saddle and tack essentials.</li>
<li>Popular search demand for EZY Ride saddles and stirrup components.</li>
<li>Useful everyday range across tack, rider accessories and grooming extras.</li>
</ul>`,

  faq_items: [
    {
      question: 'What is EZY Ride known for?',
      answer:
        'EZY Ride is best known for western and stock-riding gear, especially saddles, stirrups, girths, western pads and practical rider accessories.',
    },
    {
      question: 'Can I buy EZY Ride in Australia?',
      answer:
        'Yes. You can shop EZY Ride in Australia at The Equestrian, including saddles, stirrups, girths, pads and selected accessories.',
    },
    {
      question: 'Does EZY Ride make stirrups and girths?',
      answer:
        'Yes. EZY Ride includes stirrups and girths within its tack range, alongside other western and stock-riding setup items.',
    },
    {
      question: 'Is EZY Ride mainly a western riding brand?',
      answer:
        'EZY Ride is primarily aligned with western and stock-riding categories, with products commonly used for everyday riding, training and paddock work.',
    },
  ],
};

export default content;

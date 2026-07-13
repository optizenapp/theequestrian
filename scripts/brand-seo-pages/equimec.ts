import type { BrandSEOContent } from '../run-brand-seo-update';

/**
 * /brands/equimec — April 2026
 *
 * Ahrefs clusters:
 *   - Core branded: equimec, equimec australia, equimec wormer
 *   - Formats: equimec paste, equimec horse paste, equimec wormer paste
 *   - Actives: equimec ivermectin, equimec ivermectin paste
 *   - Lines: equimec plus tape, equimec tape, equimec plus
 *   - Informational: equimec ingredients, equimec paste ingredients
 *
 * Product rules:
 *   - HANDLE STARTS_WITH equimec-
 *   - TITLE CONTAINS equimec
 */
const content: BrandSEOContent = {
  handle: 'equimec',
  title: 'Equimec',
  breadcrumb_label: 'Equimec',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Equimec' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'equimec-' },
  ],

  meta_title: 'Equimec Australia | Horse Wormer Paste | The Equestrian',
  meta_description:
    'Shop Equimec horse wormers in Australia at The Equestrian. Browse Equimec paste, ivermectin options, Equimec Plus Tape and more. Free shipping sitewide.',
  h1_title: 'Shop Equimec Horse Wormers in Australia',

  short_description: `<p>Shop <strong>Equimec</strong> horse wormers trusted by Australian riders for practical paste dosing and broad-spectrum coverage when the label matches your program.</p>
<!--read-more-trigger-->
<p>Browse Equimec paste and combination lines such as Equimec Plus Tape, alongside everyday worming essentials in our full <a href="/horse/stable/wormers">horse wormers</a> collection.</p>`,

  long_description: `<h2>About Equimec</h2>
<p>
Equimec is a recognised equine wormer label stocked for riders who want clear paste dosing and options that extend coverage to additional parasite groups when the registered formulation allows. Riders often compare Equimec paste with combination products when they need tapeworm or bot coverage alongside routine strongyle control.
</p>

<h2>Popular Equimec Lines</h2>

<h3>Equimec Paste & Ivermectin-Based Options</h3>
<p>
Equimec paste is widely used for routine dosing thanks to familiar syringe delivery and label-based dosing by weight. Ivermectin-based Equimec options are commonly chosen where label directions match the parasites your veterinarian is managing on your property.
</p>

<h3>Equimec Plus Tape & Broader Coverage</h3>
<p>
Equimec Plus Tape combines actives to broaden coverage compared with a single-active paste when the label supports it, including tapeworm where registered. Always confirm the registered claims, dose interval and any withholding periods on the pack before use.
</p>

<h3>Ingredients & Label Reading</h3>
<p>
If you are comparing Equimec ingredients across products, start with the active constituents table on each label and note what each formulation is registered to treat. Your veterinarian can help interpret label claims against faecal egg counts and regional risk.
</p>

<h2>Why Riders Choose Equimec</h2>
<ul>
<li>Familiar paste presentation with syringe dosing for weight-based programs</li>
<li>Combination options such as Equimec Plus Tape when broader coverage is required on-label</li>
<li>Widely stocked alongside other trusted wormer brands at The Equestrian</li>
</ul>`,

  faq_items: [
    {
      question: 'What is Equimec paste used for?',
      answer:
        'Equimec paste is an equine wormer product designed for oral dosing according to the label. It is used as part of a deworming program based on veterinary advice and registered label claims.',
    },
    {
      question: 'What is Equimec Plus Tape?',
      answer:
        'Equimec Plus Tape is a combination equine wormer formulation. Check the product label for the exact actives, parasites covered, dosing instructions and withholding periods.',
    },
    {
      question: 'Is Equimec the same as ivermectin?',
      answer:
        'Equimec is a brand name for registered equine wormer products. Some Equimec lines use ivermectin as an active ingredient while others add different actives for broader coverage. Always read the specific product label.',
    },
    {
      question: 'Can I buy Equimec in Australia at The Equestrian?',
      answer:
        'Yes. You can shop Equimec horse wormers in Australia at The Equestrian with free shipping sitewide, subject to any product-specific shipping rules.',
    },
  ],
};

export default content;

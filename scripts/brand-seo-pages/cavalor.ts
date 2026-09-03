import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'cavalor',
  title: 'Cavalor',
  breadcrumb_label: 'Cavalor',
  logo_url: '/brands/logos/cavalor.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Cavalor' },
    { column: 'BRAND', relation: 'EQUALS', condition: 'Cavalor Equicare' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'cavalor-' },
  ],

  // Layout appends " | The Equestrian" → SERP title lands at 56 chars.
  meta_title: 'Cavalor Equicare | Horse Supplements AU',
  meta_description:
    'Shop Cavalor Equicare in Australia: Laminaid, Take It Easy Forte, Podosens, Freebute, Derma Wash plus pastes, hoof oils and washes at The Equestrian.',
  h1_title: 'Cavalor Horse Care & Nutrition Products',

  quick_answer:
    'Cavalor is a Belgian equine nutrition and care brand founded by Peter Bollen, built around research-led feed decisions, supplements and stable care for sport and leisure horses. At The Equestrian in Australia you will find Cavalor Equicare lines such as Laminaid, Take It Easy Forte, Podosens, Freebute, Derma Wash and related pastes, oils and washes.',

  short_description: `<p>Shop <strong>Cavalor</strong> and <strong>Cavalor Equicare</strong> for research-backed horse supplements, respiratory and muscle pastes, hoof oils, washes and leather soap selected for Australian stables.</p>
<!--read-more-trigger-->
<p>Cavalor develops formulas around measurable equine needs rather than one-size routines: competition support pastes, daily condition products, hoof barrier oils and wash protocols sit in distinct packs with clear label dosing. Browse the lines below, then compare related categories such as <a href="/horse/supplements">horse supplements</a> when building a full barn kit.</p>`,

  long_description: `<h2>What Defines Cavalor?</h2>
<p>Cavalor began with founder Peter Bollen's brief to build equine nutrition and care products from scientific R&amp;D, controlled production methods and ongoing quality checks. The brand is available in around 50 countries and partners with the FEI on equine wellbeing messaging. Product development targets health inside and out across foal stages through retirement, with nutritionists supporting ration decisions for sport horses.</p>
<p>On this hub, the Australian range focuses on Cavalor Equicare care SKUs and targeted supplements rather than bulk bags of feed. Expect labelled active purposes, batch-controlled manufacturing and formats chosen for yard use: oral pastes, liquids, sprays, washes and hoof oils.</p>

<h2>Cavalor Product Lines &amp; Core Ranges</h2>
<p>Stock is organised by job, matching how riders search Cavalor Equicare, Lurax, Take It Easy Forte, Podosens, Podoguard, Laminaid, Derma Wash, Freebute and Switch.</p>

<h3>Supplements, Muscle &amp; Internal Support</h3>
<p>Oral pastes and daily supplements cover muscle work (Muscle Motion, Lactatec Paste), gut comfort (Gastro Aid Paste), hormonal support (Venus) and calming stacks (Take It Easy Forte). These sit alongside the wider <a href="/horse/veterinary">horse veterinary</a> aisle when you are pairing barn first-aid with labelled supplement routines.</p>

<h3>Respiratory, Joint Comfort &amp; Freebute Formats</h3>
<p>Bronchix Pulmo Paste and Bronchix Liq address airway support searches. Freebute appears as tub, paste and gel formats for owners comparing oral versus topical use. Switch and Muddoc cover seasonal skin management when coats and heels need a dedicated product rather than a general wash.</p>

<h3>Hoof Oils, Dry Feet &amp; Wall Care</h3>
<p>Podosens and Podoguard hoof oils, plus Dry Feet Spray, target frog and wall routines between farrier visits. Compare application style against other dressings in <a href="/horse/stable/hoof-care">hoof care</a> before choosing an oil, spray or dual-product schedule.</p>

<h3>Washes, Coat Finish &amp; Skin Care</h3>
<p>Derma Wash, Equi Wash, Bianco Wash, Derma Spray, Star Shine and Lurax Cream cover bath, stain, spray-on skin care and cream formats. For wash chemistry context, see <a href="/horse/grooming/shampoo">horse shampoo</a>. Leather Soap Bottle handles tack cleaning separately from coat products, and Flyless covers insect pressure on turnout.</p>

<h2>How Cavalor Lines Differ on the Shelf</h2>
<ul>
<li><strong>Paste vs liquid vs gel:</strong> pastes suit measured oral doses at the float or truck; liquids suit bucket or syringe routines; gels and sprays suit local skin or hoof application.</li>
<li><strong>Daily care vs event support:</strong> washes, hoof oils and leather soap are stable staples; Muscle Motion, Lactatec, Bronchix and Take It Easy Forte are typically timed around work, travel or respiratory load.</li>
<li><strong>Equicare naming:</strong> many care SKUs carry the Cavalor Equicare prefix in titles and search (Equicare Laminaid, Equicare Podosens), while some supplements list as Cavalor only. Both match this brand hub.</li>
<li><strong>White coats vs general wash:</strong> Bianco Wash is stain-focused; Derma Wash and Equi Wash are general cleansing; Star Shine is a finish product, not a deep cleanse.</li>
</ul>

<h2>Quality Control, Labels &amp; Yard Use</h2>
<p>Cavalor emphasises ingredient selection, fixed production methods and continuous quality control for competition yards that need doping-aware nutrition partners. Always follow the pack label for dose, withholding notes and species. Store pastes and liquids sealed, shake suspensions if directed, and keep hoof oils and sprays away from feed scoops. Do not substitute coat shampoo for leather soap, or hoof oil for skin cream.</p>`,

  faq_items: [
    {
      question: 'Where are Cavalor products designed and manufactured?',
      answer:
        'Cavalor is a Belgian equine brand founded by Peter Bollen, with product development grounded in research, controlled production methods and ongoing quality checks. Formulas are built for sport and leisure horses and distributed in around 50 countries. Always read the Australian pack label for local directions, batch details and any competition notes before use.',
    },
    {
      question: 'How do Cavalor pastes, liquids and washes differ in use?',
      answer:
        'Pastes are measured oral doses for targeted support such as Gastro Aid Paste, Bronchix Pulmo Paste or Take It Easy Forte. Liquids suit syringe or feed-bucket routines. Washes and sprays such as Derma Wash, Equi Wash and Derma Spray are external coat or skin protocols. Match the format to the job on the label rather than swapping pack types interchangeably.',
    },
    {
      question: 'What is Cavalor Equicare compared with Cavalor supplements?',
      answer:
        'Cavalor Equicare is the care-facing naming used on many washes, hoof oils, creams and related stable products such as Laminaid, Podosens, Podoguard, Lurax and Freebute formats. Cavalor supplements and pastes often appear without the Equicare prefix. Both groups appear on this brand page when stocked for Australia.',
    },
    {
      question: 'How do I buy authentic Cavalor products in Australia?',
      answer:
        'Purchase Cavalor and Cavalor Equicare from authorised Australian retailers such as The Equestrian, and check that titles, packaging and batch codes match the manufacturer labelling. Avoid unsealed or relabelled goods. If a price or listing looks inconsistent with normal wholesale packs, confirm the seller and product handle before adding to cart.',
    },
    {
      question: 'How should I store and use Cavalor care products?',
      answer:
        'Follow each label for dose, frequency and application site. Keep pastes and liquids capped, store out of extreme heat, and shake if the directions say so. Apply hoof oils and Dry Feet Spray to clean, dry feet. Use leather soap on tack only, not as coat shampoo. When unsure about a health issue, ask your veterinarian before changing protocols.',
    },
  ],
};

export default content;

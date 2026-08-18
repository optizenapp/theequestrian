import type { BrandSEOContent } from '../run-brand-seo-update';

/**
 * Canonical hub stays /brands/breyer (already live).
 * Display name: Breyer Horses Australia (Collective vendor + existing Trailrace Breyer).
 */
const content: BrandSEOContent = {
  handle: 'breyer',
  title: 'Breyer Horses Australia',
  breadcrumb_label: 'Breyer',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Breyer' },
    { column: 'VENDOR', relation: 'EQUALS', condition: 'Breyer Horses Australia' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'breyer-' },
  ],

  meta_title: 'Breyer Horses Australia | Model Horses & Collectibles | The Equestrian',
  meta_description:
    'Shop Breyer Horses Australia at The Equestrian. Discover Breyer model horses, Freedom and Classics series, Stablemates and paint-and-play kits with Australian shipping.',
  h1_title: 'Shop Breyer Model Horses, Collectibles & Play Sets',

  quick_answer:
    'Breyer is the well-known maker of realistic model horses and horse-themed play sets. Shop Breyer Horses Australia at The Equestrian for Freedom, Classics, Stablemates and activity kits, with Australian shipping.',

  short_description: `<p>Shop <strong>Breyer Horses Australia</strong> for realistic model horses, collectible series and horse-themed play sets — a favourite gift for riders and horse lovers.</p>
<!--read-more-trigger-->
<p>Explore Freedom and Classics scale models, Stablemates, farm sets and paint-your-own kits alongside our wider <a href="/accessories/gifts">equestrian gifts</a> range.</p>`,

  long_description: `<h2>About Breyer</h2>
<p>
Breyer model horses are collectible scale figures known for realistic conformation, breed variety and series such as Freedom, Classics and Stablemates. They sit naturally in an equestrian gift range — display pieces for collectors and play sets for younger horse fans.
</p>

<h2>Breyer Product Range</h2>

<h3>Freedom &amp; Classics Model Horses</h3>
<p>
The larger Freedom and Classics series (around 1:12) are the core collectible models: individual horses, rider sets and stables. Browse them with other horse-themed presents in <a href="/accessories/gifts">gifts &amp; accessories</a>.
</p>

<h3>Stablemates, Farms &amp; Activity Kits</h3>
<p>
Smaller Stablemates (around 1:32), farm play sets and paint-your-own ornament kits round out the range for gifts and rainy-day play. Compare with other collectibles in our <a href="/accessories">accessories</a> collection.
</p>

<h2>Why Shop Breyer at The Equestrian</h2>
<ul>
<li>Official Breyer Horses Australia range listed with Australian shipping</li>
<li>Model horses, play sets and craft kits in one brand hub</li>
<li>Easy to browse next to other equestrian gifts</li>
</ul>`,

  faq_items: [
    {
      question: 'What is Breyer known for?',
      answer:
        'Breyer is known for realistic model horses and horse-themed play sets, including Freedom, Classics and Stablemates series plus paint-and-play kits.',
    },
    {
      question: 'Can I buy Breyer Horses Australia at The Equestrian?',
      answer:
        'Yes. You can shop Breyer Horses Australia through The Equestrian, including model horses, stables, farm sets and activity kits, with Australian shipping.',
    },
    {
      question: 'Are Breyer models gifts as well as collectibles?',
      answer:
        'Yes. Many riders buy Breyer models as display collectibles, while Freedom play sets and paint-your-own kits are popular gifts for younger horse lovers.',
    },
  ],
};

export default content;

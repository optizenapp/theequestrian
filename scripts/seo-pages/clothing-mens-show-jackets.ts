import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';

const content: PageSEOContent = {
  url_path: '/clothing/mens/show-jackets',

  // Layout appends " | The Equestrian" → SERP title lands at 56 chars.
  meta_title: 'Mens Competition Jackets | Show Ring',
  meta_description:
    'Shop mens competition jackets Australia: GP show jackets, tech-knit and mesh air styles, matt finishes and dressage tails. Compare fit, fabric and brand.',
  h1_title: 'Mens Competition Jackets',
  breadcrumb_label: 'Competition Jackets',

  short_description: `<p>Shop <strong>mens competition jackets</strong> for the show ring: GP riding jackets, ventilated mesh and air builds, tech-knit competition coats and formal dressage tails.</p>
<!--read-more-trigger-->
<p>Stock spans competition labels such as Samshield, Cavalleria Toscana, Ego7 and Trolle, with matt finishes, zip fronts and light technical knits chosen for arena presentation. Check listed EU size, sleeve length and fabric notes on each product page.</p>
<p>Pair with <a href="/clothing/mens/show-shirts">mens show shirts</a> and <a href="/clothing/mens/breeches">mens breeches</a>. Everyday riding coats sit on <a href="/clothing/mens/jackets">mens jackets</a>, not this competition leaf.</p>`,

  long_description: `<h2>What Are Mens Competition Jackets?</h2>
<p>Mens competition jackets are tailored show coats built for arena presentation, worn over a show shirt with breeches and boots rather than as casual yard outerwear.</p>
<p>Formats you will see on this leaf include:</p>
<ul>
<li>GP and general show jackets for mixed competition use</li>
<li>Mesh and air jackets with open panels for warmer days</li>
<li>Tech-knit and light knit zip coats with stretch structure</li>
<li>Dressage tails and frack-style formal coats</li>
</ul>

<h2>GP Show Jackets vs Dressage Tails</h2>
<p>GP and standard competition jackets suit general show jumping and mixed classes with a shorter, riding-focused skirt. Dressage tails and frack coats add the longer back panels used for formal dressage presentation. Choose by class rules and the silhouette shown on the listing, not by brand alone.</p>

<h2>Mesh, Air and Tech-Knit Builds</h2>
<p>Mesh and air jackets prioritise airflow through panels and lighter shells. Tech-knit coats use stretch knits for a closer athletic line and easier shoulder movement. Matt finishes tone down shine for a cleaner ring look. Read each listing for fabric mix, zip versus button front and care guidance.</p>

<h2>Mens Competition Jackets vs Everyday Mens Jackets</h2>
<p>Everyday riding and casual coats live on the mens jackets leaf. This page is for competition show coats only. Womens arena coats sit on <a href="/clothing/womens/riding-jackets">womens competition jackets</a>.</p>

<h2>How to Choose a Mens Show Jacket</h2>
<p>Match silhouette to the class (GP versus tails), then check EU size charts, sleeve length and whether you need mesh ventilation or a denser knit. Compare brand lines on <a href="/brands/samshield">Samshield</a>, <a href="/brands/cavalleria-toscana">Cavalleria Toscana</a>, <a href="/brands/ego7">Ego7</a> and <a href="/brands/trolle">Trolle</a> when you already know the label you ride in.</p>`,

  faq_items: [
    {
      question: 'What belongs on the mens competition jackets page?',
      answer:
        'Mens show coats for competition, including GP riding jackets, mesh and air jackets, tech-knit competition coats and dressage tails. Casual yard jackets and everyday coats sit on the mens jackets leaf. Check EU size, fabric and care notes on each listing. Shipping options appear at checkout for each vendor.',
    },
    {
      question: 'What is the difference between a GP jacket and dressage tails?',
      answer:
        'A GP or general competition jacket is the shorter show coat used across many riding classes. Dressage tails, sometimes listed as a frack, add elongated back panels for formal dressage presentation. Choose the silhouette your class expects, then confirm length and fit on the product page before you buy.',
    },
    {
      question: 'Are mesh and air competition jackets cooler to ride in?',
      answer:
        'Mesh and air jackets use open panels and lighter shells to move heat and moisture more freely than denser woollen-style coats. Tech-knit styles still breathe, but they prioritise stretch and a close athletic line. Compare fabric notes and panel layout when you ride in warm Australian show conditions.',
    },
    {
      question: 'Which brands of mens show jackets do you stock?',
      answer:
        'This leaf currently centres on competition labels such as Samshield, Cavalleria Toscana, Ego7 and Trolle, with styles ranging from matt GP jackets to tech-knit zips and dressage tails. Availability changes with vendor stock, so use the brand filters on the page and read each size chart carefully.',
    },
    {
      question: 'What should I wear under a mens competition jacket?',
      answer:
        'Most riders wear a mens show shirt or competition polo under the jacket, with competition breeches and tall boots. Helmet and glove rules follow the event. Complete the kit from the mens show shirts and mens breeches leaves, and confirm any colour or collar requirements in your class schedule.',
    },
  ],
};

export const frameworkNotes: SubcollectionFrameworkNotes = {
  centralEntity: 'mens competition jackets',
  primaryAngle:
    'Arena show coats for men: GP vs dressage tails, mesh/air ventilation vs tech-knit structure, separate from everyday mens jackets.',
  informationGain: [
    'GP show jackets vs dressage tails and frack silhouettes.',
    'Mesh and air panels for warm-weather airflow.',
    'Tech-knit and light knit zip coats for stretch structure.',
    'Matt finishes reduce shine for cleaner ring presentation.',
    'EU size and sleeve length sit on the listing, not a shared chart.',
    'Everyday mens jackets are a sibling leaf, not competition coats.',
    'Womens competition jackets live on the womens riding-jackets path.',
  ],
  closestSibling: '/clothing/mens/show-shirts',
  overlapSplit:
    'Show jackets = competition coats. Show shirts = shirts under the coat. Mens jackets = everyday coats. Womens riding jackets = womens arena coats.',
  verifyBeforePublishing: [
    'No parent /clothing/mens link in HTML.',
    'Only published sibling and brand URLs linked.',
    'No free-shipping or 24-hour dispatch claims.',
    'No hardcoded product counts.',
  ],
  anchors: [
    { text: 'mens show shirts', href: '/clothing/mens/show-shirts' },
    { text: 'mens breeches', href: '/clothing/mens/breeches' },
    { text: 'mens jackets', href: '/clothing/mens/jackets' },
    { text: 'womens competition jackets', href: '/clothing/womens/riding-jackets' },
    { text: 'Samshield', href: '/brands/samshield' },
    { text: 'Cavalleria Toscana', href: '/brands/cavalleria-toscana' },
    { text: 'Ego7', href: '/brands/ego7' },
    { text: 'Trolle', href: '/brands/trolle' },
  ],
  inboundTally: {},
};

export default content;

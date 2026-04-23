import type { PageSEOContent } from '../run-page-seo-update';

/**
 * /clothing/womens/breeches - optimised April 2026
 * GSC clusters:
 *   - Core generic: breeches, riding breeches, horse riding breeches, equestrian breeches
 *   - Womens intent: women breeches, womens riding breeches, horse riding pants for women
 *   - Competition intent: competition breeches, show breeches, white breeches
 *   - Fit and style: denim breeches, cotton riding breeches, high waisted breeches, black/navy/beige
 *   - Brand demand: Samshield breeches, Equiline breeches
 *
 * Internal links:
 *   - Parent: rendered by CollectionDescription (Next.js Link to parent_url /clothing/womens)
 *   - Siblings: /clothing/womens/tights, /clothing/womens/leggings
 */
const content: PageSEOContent = {
  url_path: '/clothing/womens/breeches',

  meta_title: "Women's Riding Breeches Australia | Samshield & More",
  meta_description:
    "Shop women's riding breeches in Australia, including competition breeches, full grip styles and denim looks from Samshield, Equiline and more.",
  h1_title: "Women's Breeches for Riding, Training & Competition",
  breadcrumb_label: 'Breeches',

  short_description: `<p>Browse <strong>women's riding breeches</strong> designed for comfort in the saddle, secure grip through the leg and a polished fit for everyday riding and competition.</p>
<!--read-more-trigger-->
<p>Our range includes full grip and knee grip breeches, classic cotton styles, technical stretch fabrics and modern denim-look options for riders who want both performance and style.</p>

<p>Whether you need competition breeches for the show ring or practical horse riding pants for regular training, this collection brings together flattering fits, supportive waistbands and durable fabrics suited to long days at the stables.</p>`,

  long_description: `<h2>Women's Riding Breeches Explained</h2>
<p>
Women's riding breeches are built to give riders more comfort, flexibility and stability in the saddle than regular pants. The right pair should move easily through the seat and knee, sit neatly under long boots or half chaps and offer enough structure for schooling, clinics and competition days.
</p>

<h3>Everyday Riding Breeches for Women</h3>
<p>
For daily riding, many riders look for breathable fabrics, stretch panels and practical grip options that stay comfortable through lessons, hacking and yard work. If you prefer a pull-on feel or want a lighter option for warm weather, you can also browse our <a href="/clothing/womens/tights">women's equestrian tights</a> and <a href="/clothing/womens/leggings">women's leggings</a>.
</p>

<h3>Competition Breeches, Show Breeches & White Styles</h3>
<p>
<strong>Competition breeches</strong>, white breeches and polished show-ready styles are chosen for clean presentation, supportive fit and reliable grip, helping riders feel secure and smart in the arena.
</p>

<h3>Denim, Cotton & High Waisted Breeches</h3>
<p>
Denim breeches, cotton riding breeches and high waisted styles give riders more choice in fit and finish. Some prefer traditional breeches with a classic feel, while others want modern silhouettes, deeper waistbands and versatile colours such as black, navy and beige.
</p>

<h2>Shop Women's Breeches by Brand</h2>
<p>
Shop breeches from leading equestrian brands including <a href="/brands/samshield">Samshield</a> and <a href="/brands/equiline">Equiline</a> for premium competition and everyday riding breeches.
</p>`,

  faq_items: [
    {
      question: 'What are breeches in horse riding?',
      answer:
        'Breeches are close-fitting riding pants designed for comfort in the saddle. They usually feature stretch fabric, reinforced grip through the seat or knee and a lower-profile leg that sits neatly under boots.',
    },
    {
      question: 'What is the difference between breeches and jodhpurs?',
      answer:
        'Breeches are typically designed to finish higher on the calf for use with tall riding boots, while jodhpurs are often longer and worn with paddock boots. In everyday shopping, many riders use the terms interchangeably.',
    },
    {
      question: 'Are competition breeches usually white?',
      answer:
        'Yes. White breeches are a popular choice for competition and show classes, although exact requirements can vary by discipline and competition rules.',
    },
    {
      question: 'Can I buy Samshield and Equiline breeches in Australia?',
      answer:
        "Yes. This page includes premium women's breeches from brands such as Samshield and Equiline, available to shop in Australia through The Equestrian.",
    },
  ],
};

export default content;

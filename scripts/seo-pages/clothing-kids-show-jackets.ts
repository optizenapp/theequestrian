import type { PageSEOContent } from '../run-page-seo-update';

/**
 * /clothing/kids/show-jackets - optimised April 2026
 * GSC clusters:
 *   - Core generic: show jackets australia, horse show jacket, competition jacket equestrian
 *   - Kids intent: childrens riding jackets, show jacket kids, kids show jacket, kids equestrian jacket
 *   - Boys and girls modifiers: boys show jacket, boys riding jacket, girls show jacket, girls riding jacket
 *   - Discipline intent: dressage jacket, show jumping jacket, showing jackets
 *   - Brand demand: Animo riding jacket, Animo competition jacket
 *
 * Internal links:
 *   - Parent: rendered by CollectionDescription using parent_url /clothing/kids
 *   - Siblings: /clothing/kids/show-shirts, /clothing/kids/breeches
 */
const content: PageSEOContent = {
  url_path: '/clothing/kids/show-jackets',

  meta_title: 'Kids Show Jackets Australia | Boys & Girls Competition',
  meta_description:
    'Shop kids show jackets in Australia for boys and girls, including horse riding competition jackets, dressage styles and junior show-ring options.',
  h1_title: 'Kids Show Jackets for Competition, Showing & Dressage',
  breadcrumb_label: 'Show Jackets',

  short_description: `<p>Browse <strong>kids show jackets</strong> for boys and girls who need a smart, comfortable competition look for showing, dressage and general horse riding events.</p>
<!--read-more-trigger-->
<p>This collection includes junior competition jackets designed for polished presentation, easy movement and all-day comfort in the saddle and around the showgrounds.</p>

<p>Whether you are shopping for a boys show jacket, a girls riding jacket or a child's dressage jacket, these styles are selected for horse show and competition use.</p>`,

  long_description: `<h2>Kids Show Jackets Explained</h2>
<p>
Kids show jackets are designed for young riders who need a neat, competition-ready look without sacrificing comfort. The right jacket should sit smartly over a show shirt, allow easy movement through the shoulders and feel practical enough for long days at pony club, interschool competitions and local shows.
</p>

<h3>Boys & Girls Competition Jackets</h3>
<p>
Search demand shows strong intent around boys show jackets, girls riding jackets and children's horse riding show jackets. That tells us parents and riders are often looking for age-appropriate competition wear that feels polished in the ring while still being comfortable enough for younger riders to wear confidently.
</p>

<h3>Dressage, Showing & Show Jumping Styles</h3>
<p>
This page also picks up dressage jacket, showing jacket and show jumping jacket intent, so the collection needs to serve more than one discipline. Some riders want a formal look for dressage and showing, while others need a smart jacket that can work across general competition use. To complete the outfit, browse our <a href="/clothing/kids/show-shirts">kids show shirts</a> and <a href="/clothing/kids/breeches">kids breeches and jodhpurs</a>.
</p>

<h3>Junior Competition Wear by Brand</h3>
<p>
Brand interest includes Animo riding jackets and related competition styles, which shows that some shoppers are comparing premium junior showwear brands as well as generic product searches. If you want to explore broader apparel ranges from established competition labels, see <a href="/brands/animo">Animo</a> and <a href="/brands/cavalleria-toscana">Cavalleria Toscana</a>.
</p>`,

  faq_items: [
    {
      question: 'What should kids wear for horse riding competitions?',
      answer:
        'For many horse riding competitions, kids wear a show jacket, show shirt, breeches or jodhpurs and the correct boots and helmet. Exact requirements can vary by discipline and event level.',
    },
    {
      question: 'Are kids show jackets suitable for dressage and showing?',
      answer:
        'Yes. Many kids show jackets work well across dressage, showing and general competition use, although some riders prefer more formal styles depending on the class and presentation required.',
    },
    {
      question: 'Do you stock boys and girls show jackets?',
      answer:
        'Yes. This collection includes kids show jackets for both boys and girls, with styles suited to junior competition riders across different disciplines.',
    },
    {
      question: 'Can I buy Animo kids competition jackets in Australia?',
      answer:
        'Yes. This page includes junior competition jacket options relevant to shoppers searching for Animo riding jackets and other premium kids showwear in Australia.',
    },
  ],
};

export default content;

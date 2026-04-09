import type { PageSEOContent } from '../run-page-seo-update';

/**
 * /clothing/footwear - optimised April 2026
 * GSC clusters:
 *   - Core generic: horse riding boots, riding boots, equestrian boots, horse riding footwear
 *   - Tall boot intent: tall boots equestrian, long riding boots, tall riding boots australia
 *   - Yard and waterproof intent: yard boots equestrian, rubber riding boots, waterproof equestrian boots
 *   - Gender/style modifiers: horse riding boots for men, ladies riding boots australia, womens horse riding boots
 *   - Brand demand: Tucci boots, Cavallo riding boots, Ariat jodhpur boots
 *
 * Internal links:
 *   - Parent: rendered by CollectionDescription using parent_url /clothing
 *   - Siblings: /clothing/footwear/riding-boots, /clothing/footwear/ankle-boots
 */
const content: PageSEOContent = {
  url_path: '/clothing/footwear',

  meta_title: 'Horse Riding Boots Australia | Tall, Yard & Jodhpur',
  meta_description:
    'Shop horse riding boots in Australia, including tall boots, yard boots, jodhpur boots and waterproof equestrian footwear from leading brands.',
  h1_title: 'Equestrian Footwear for Riding, Stable Work & Competition',
  breadcrumb_label: 'Footwear',

  short_description: `<p>Browse <strong>horse riding boots</strong> and equestrian footwear designed for comfort on the ground, reliable support in the saddle and polished style for everyday riding and competition.</p>
<!--read-more-trigger-->
<p>This collection includes tall riding boots, jodhpur boots, yard boots, riding shoes and waterproof options to suit training, stable work and show preparation.</p>

<p>Whether you need practical everyday boots or a smarter competition-ready pair, you can compare trusted footwear styles for men, women and junior riders in one place.</p>`,

  long_description: `<h2>Equestrian Footwear Explained</h2>
<p>
Horse riding footwear is built to give riders the right balance of support, comfort and safety. The best riding boots should feel secure in the stirrup, offer stable footing around the yard and suit the type of riding you do most often, whether that is daily schooling, competition or stable work.
</p>

<h3>Tall Riding Boots & Long Equestrian Boots</h3>
<p>
<strong>Horse riding boots</strong>, tall equestrian boots and long riding boots are popular with riders who want a neat leg line, close contact through the calf and a traditional competition look. If you want to narrow your options further, browse our dedicated <a href="/clothing/footwear/riding-boots">riding boots</a> range.
</p>

<h3>Yard Boots, Waterproof Boots & Everyday Stable Wear</h3>
<p>
Yard boots, waterproof riding boots and equestrian work boots are practical choices for wet conditions and long days around the stables. These styles are ideal for riders who split their time between horse care, paddock jobs and time in the saddle.
</p>

<h3>Jodhpur Boots, Riding Shoes & Fit Options</h3>
<p>
Horse riding shoes, jodhpur boots and men's and women's riding boots offer a mix of smart short boots and everyday footwear options. For shorter boot styles suited to regular riding and stable use, see our <a href="/clothing/footwear/ankle-boots">ankle boots</a> collection.
</p>

<h2>Shop Horse Riding Boots by Brand</h2>
<p>
Shop leading footwear brands including <a href="/brands/ariat">Ariat</a>, <a href="/brands/cavallo">Cavallo</a> and <a href="/brands/tucci">Tucci</a> for premium riding boots and equestrian footwear in Australia.
</p>`,

  faq_items: [
    {
      question: 'What boots are best for horse riding?',
      answer:
        'The best horse riding boots depend on how you ride. Tall boots are popular for competition and a traditional look, while jodhpur, ankle and yard boots suit everyday riding, stable work and more casual use.',
    },
    {
      question: 'What is the difference between riding boots and yard boots?',
      answer:
        'Riding boots are designed with stirrup use and riding fit in mind, while yard boots are often chosen for comfort, grip and weather protection during stable work and time on the ground.',
    },
    {
      question: 'Are waterproof riding boots good for everyday use?',
      answer:
        'Yes. Waterproof riding and yard boots are a practical option for everyday use, especially during wet weather, winter chores and riders who spend long hours around the stables.',
    },
    {
      question: 'Can I buy Ariat, Cavallo and Tucci riding boots in Australia?',
      answer:
        'Yes. This footwear collection includes equestrian boot options from brands such as Ariat, Cavallo and Tucci, available to shop in Australia through The Equestrian.',
    },
  ],
};

export default content;

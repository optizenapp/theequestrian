import type { PageSEOContent } from '../run-page-seo-update';

/**
 * /horse/stable/wormers — optimised April 2026
 *
 * Query clusters (Ahrefs + Search Console):
 *   - Core: horse wormers, horse wormers australia, wormers for horses
 *   - Formats: horse wormer paste, worming paste for horses, worming pellets for horses
 *   - Ingredients: ivermectin paste, moxidectin, praziquantel / tapeworm combinations
 *   - Brands in demand: Equimec, Equimax, Equest, Eraquell, Easymec, Strategy-T, Ultimum, Applemax
 *
 * Internal links:
 *   - Parent: /horse/stable
 *   - Siblings: /horse/stable/feed, /horse/stable/hoof-care, /horse/stable/fly-control
 *   - Related: /horse/veterinary, /brands/equimec (brand hub)
 */
const content: PageSEOContent = {
  url_path: '/horse/stable/wormers',

  meta_title: 'Horse Wormers Australia | Paste & Pellets | The Equestrian',
  meta_description:
    'Shop horse wormers in Australia at The Equestrian. Browse paste and pellet dewormers, tapeworm combinations and trusted brands. Free shipping sitewide.',
  h1_title: 'Horse Wormers for Paste, Pellet & Broad-Spectrum Programs',
  breadcrumb_label: 'Wormers',

  short_description: `<p>Browse <strong>horse wormers</strong> and deworming products for Australian yards, including paste syringes, pellet options and broad-spectrum combinations riders use year-round.</p>
<!--read-more-trigger-->
<p>Whether you are topping up a rotation plan or replacing a trusted staple, compare formats and active-ingredient profiles in one place. Explore the wider <a href="/horse/stable">stable equipment</a> range and <a href="/horse/stable/feed">horse feed</a> for everyday yard care.</p>`,

  long_description: `<h2>Horse Wormers Explained</h2>
<p>
Horse wormers help manage internal parasites as part of a responsible deworming program. The right product depends on your horse’s age, workload, pasture exposure and what your veterinarian recommends for your region. This collection focuses on practical formats riders buy most often: easy-dose pastes, convenient pellets and combination products that target more than one parasite group when label directions allow.
</p>

<h3>Paste & Gel Dewormers</h3>
<p>
Paste and gel wormers remain popular because they are straightforward to dose by weight and easy to keep on the tack-room shelf. Shoppers often compare ivermectin-based pastes with broader combination pastes that add tapeworm or boticide coverage. Always read the label for species, dose interval and withholding periods before use.
</p>

<h3>Pellet & Granule Options</h3>
<p>
Pellet wormers suit horses that are sensitive to oral syringes or yards that prefer feed-top dressing for a few days. Pellets can be a practical choice when you need a consistent intake pattern; check each product’s feeding directions and compatibility with your current concentrate or balancer.
</p>

<h3>Tapeworm, Bots & Combination Coverage</h3>
<p>
Tapeworm and bot control often involves different active ingredients than a simple rotational paste. Combination products bundle actives such as ivermectin with praziquantel, or pair moxidectin with praziquantel, depending on the registered label. If you are unsure which stage of the lifecycle you are targeting, your veterinarian can help you match the product to the risk window.
</p>

<h3>Stable Care Around Deworming</h3>
<p>
Good parasite control also depends on pasture rotation, manure pickup and general stable hygiene. Pair worming with everyday stable care by browsing <a href="/horse/stable/hoof-care">hoof care</a>, <a href="/horse/stable/fly-control">fly control</a> and our <a href="/horse/veterinary">horse health care</a> hub for first-aid and wound essentials.
</p>

<h2>Shop Horse Wormers by Brand</h2>
<p>
When you want to shop a single label end to end, browse <a href="/brands/equimec">Equimec</a> for paste and combination lines carried in this category.
</p>

<h3>At a glance</h3>
<ul>
<li>Match the product label to the parasites and season your program is targeting.</li>
<li>Paste suits precise syringe dosing; pellets can suit fussy eaters when label-fed.</li>
<li>Combination pastes often cover tapeworm or bots where registered for that use.</li>
<li>Combine worming with pasture hygiene and veterinary guidance for best results.</li>
</ul>`,

  faq_items: [
    {
      question: 'What horse wormer formats do you stock?',
      answer:
        'This wormers collection includes paste and gel dewormers, pellet options and combination products. Use each product’s label for the correct dose, interval and any withholding periods.',
    },
    {
      question: 'Do you ship horse wormers across Australia?',
      answer:
        'Yes. The Equestrian ships Australia-wide with free shipping sitewide, subject to any carrier or regulatory restrictions that apply to specific products.',
    },
    {
      question: 'How do I choose between paste and pellet wormers?',
      answer:
        'Paste is often chosen for accurate weight-based dosing from a syringe. Pellets can suit horses that resist syringes when fed according to the label. Your veterinarian can advise which format fits your horse and program.',
    },
    {
      question: 'When should I use a combination wormer?',
      answer:
        'Combination wormers add coverage beyond a single active when the registered label supports it, such as tapeworm or bot control. Always follow label directions and veterinary advice for your horse and property.',
    },
  ],
};

export default content;

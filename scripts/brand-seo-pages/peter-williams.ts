import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'peter-williams',
  title: 'Peter Williams',
  breadcrumb_label: 'Peter Williams',
  rules: [
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'peter-williams-' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'peter williams' },
  ],

  meta_title: 'Peter Williams Riding Apparel & Jodhpurs | The Equestrian',
  meta_description:
    'Shop Peter Williams riding apparel in Australia, including Peter Williams jodhpurs and breeches for everyday riding, training and competition turnout.',
  h1_title: 'Shop Peter Williams Riding Apparel',

  quick_answer:
    'Peter Williams is an established equestrian apparel brand known for practical riding jodhpurs and breeches with rider-friendly fit for daily training and competition preparation. At The Equestrian, riders can shop Peter Williams apparel in Australia across women’s, men’s and junior-friendly options, with fast shipping and easy returns.',

  short_description: `<p>Shop <strong>Peter Williams riding apparel</strong> built for practical comfort in the saddle, with popular jodhpurs and breeches for everyday riding, lessons and competition prep.</p>
<!--read-more-trigger-->
<p>Explore Peter Williams equestrian legwear across classic and modern cuts, then compare related options in our <a href="/clothing/womens/breeches">women's breeches</a> and <a href="/clothing/womens/tights">riding tights</a> collections.</p>`,

  long_description: `<h2>About Peter Williams Equestrian</h2>
<p>
Peter Williams is a recognised riding apparel brand for riders looking for practical, durable legwear with reliable fit. The range is especially known for jodhpurs and breeches that suit regular training, club riding and everyday stable use.
</p>

<h2>Popular Peter Williams Riding Apparel</h2>

<h3>Peter Williams Jodhpurs</h3>
<p>
Peter Williams jodhpurs are a core demand area for riders who want comfortable saddle grip and everyday durability. They are commonly chosen for schooling sessions, pony club and regular yard-to-arena use where freedom of movement matters.
</p>

<h3>Peter Williams Breeches</h3>
<p>
Peter Williams breeches are suited to riders who want a neat riding silhouette with practical stretch and support through long training days. If you are comparing styles, browse the wider <a href="/clothing/womens/breeches">breeches collection</a> for additional cuts and finishes.
</p>

<h3>Peter Williams Equestrian Outfit Pairing</h3>
<p>
To complete your Peter Williams apparel setup, pair your legwear with essentials from <a href="/clothing/footwear">riding footwear</a>, <a href="/clothing/womens/tops">riding tops</a> and <a href="/clothing/outerwear/jackets">riding jackets</a> for year-round comfort.
</p>

<h2>Why Riders Choose Peter Williams</h2>
<ul>
<li>Known for practical riding jodhpurs and breeches.</li>
<li>Built for everyday training, pony club and competition preparation.</li>
<li>Comfort-focused fit and durable construction for regular use.</li>
<li>Easy to pair with boots, tops and outerwear across rider wardrobes.</li>
</ul>`,

  faq_items: [
    {
      question: 'What is Peter Williams best known for?',
      answer:
        'Peter Williams is best known for riding apparel, particularly jodhpurs and breeches designed for practical comfort, fit and durability for everyday riding.',
    },
    {
      question: 'Can I buy Peter Williams riding apparel in Australia?',
      answer:
        'Yes. You can shop Peter Williams riding apparel in Australia at The Equestrian, including jodhpurs and breeches for training and competition preparation.',
    },
    {
      question: 'Are Peter Williams jodhpurs suitable for daily riding?',
      answer:
        'Yes. Peter Williams jodhpurs are commonly chosen for regular riding sessions because they balance comfort, stretch and durable construction for frequent use.',
    },
    {
      question: 'Does Peter Williams make breeches as well as jodhpurs?',
      answer:
        'Yes. The Peter Williams range includes both breeches and jodhpurs, giving riders options across fit preferences and riding needs.',
    },
  ],
};

export default content;

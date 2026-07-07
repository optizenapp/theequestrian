import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'kentucky',
  title: 'Kentucky',
  breadcrumb_label: 'Kentucky',
  logo_url: '/brands/logos/kentucky.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Kentucky' },
    { column: 'TAG', relation: 'EQUALS', condition: 'kentucky' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'kentucky-' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'kentucky' },
  ],

  meta_title: 'Kentucky Horsewear Australia | Boots, Pads & More | The Equestrian',
  meta_description:
    'Shop Kentucky Horsewear in Australia at The Equestrian. Browse Kentucky horse boots, saddle pads, fly veils, girths, grooming accessories and stable gear trusted by riders worldwide.',
  h1_title: 'Shop Kentucky Horsewear Boots, Pads & Equestrian Gear',

  quick_answer:
    'Kentucky Horsewear is a Belgian equestrian brand founded to create high-quality equine products that stand out for innovation, durability and style. Best known for leg protection including eventing boots, tendon boots and overreach boots, Kentucky also offers saddle pads, fly veils, girths, grooming accessories and stable gear used by elite and everyday riders.',

  short_description: `<p>Shop <strong>Kentucky Horsewear</strong> — Belgian-designed horse boots, saddle pads, fly veils, girths and stable accessories built to make a difference in performance, protection and presentation.</p>
<!--read-more-trigger-->
<p>Browse Kentucky leg protection, saddle pads, ear bonnets and grooming gear trusted by international competitors and everyday riders alike.</p>`,

  long_description: `<h2>About Kentucky Horsewear</h2>
<p>
Kentucky Horsewear was born from a simple mission: to create high-quality equine products that make a difference and stand out from what existed before. The brand was never built to be the biggest or most well-known — the focus has always been on authenticity, innovation and products that riders can trust for safety, comfort and long-lasting performance.
</p>

<h2>Where It All Started</h2>
<p>
The Kentucky story began when Thomas Tuytens returned to Belgium from China, full of enthusiasm and entrepreneurship. After working in stables, the idea for innovative horse rugs emerged first — but after market research and early feedback, he pivoted to a product that was smaller, seasonless and offered high added value in the horse world: <strong>leg protection</strong>.
</p>
<p>
Thomas entered a partnership with Kentucky Reitmode and, by 2011, had developed six core products including the tail guard, overreach boots, eventing boots and air tendon boots. Kentucky rapidly became a must-have brand in the equine industry, with products used worldwide by prestigious riders competing around the globe — while their durability also makes them a favourite for amateur riders in everyday training.
</p>

<h2>Popular Kentucky Horsewear Product Lines</h2>

<h3>Kentucky Horse Boots & Leg Protection</h3>
<p>
Kentucky horse boots remain at the heart of the brand, with eventing boots, tendon boots, fetlock boots, overreach boots and air tendon protection among the most recognised styles. These boots are designed for lightweight protection, secure fit and a clean competition look. Compare options across our full <a href="/horse/boots">horse boots</a> collection when choosing discipline-specific protection.
</p>

<h3>Kentucky Saddle Pads, Half Pads & Fly Veils</h3>
<p>
Kentucky saddle pads and half pads are popular for smart quilting, velvet finishes and practical everyday fabrics suited to training and show use. Fly veils and ear bonnets complete a polished turnout for competition or clinics, with coordinated sets that pair easily with Kentucky boots and pads. Explore related styles in our <a href="/horse/pads">horse pads and saddle cloths</a> and <a href="/horse/saddle-pads">saddle pads</a> collections.
</p>

<h3>Kentucky Girths, Halters & Stable Accessories</h3>
<p>
Beyond competition gear, Kentucky covers halters, girths, grooming bags and stable accessories for riders who want coordinated everyday equipment around the yard. The Grooming Deluxe collection extends this expertise into brushes and stable accessories designed for premium comfort and quality.
</p>

<h2>Designed by Riders, for Riders</h2>
<p>
Kentucky products are shaped by hands-on equestrian experience. Claudia Weber, Kentucky's product manager, began as a professional groom working with riders including Michael Jung, with whom she won two Olympic gold medals in London, the World Championships in Kentucky and the European Championships. She also accompanied Taizo Sugitani to the Olympic Games in Rio. That front-line insight into the needs of horses and riders at the highest level informs Kentucky's product development — from leg protection and saddle pads to grooming tools and stable accessories.
</p>
<p>
Today, Thomas and Claudia test products at home for safety, comfort, durability and ease of use, ensuring every Kentucky Horsewear item earns its place in the range before it reaches riders around the world.
</p>

<h2>Why Riders Choose Kentucky Horsewear</h2>
<ul>
<li>Belgian brand built on authenticity, innovation and products that stand out for quality and durability.</li>
<li>Core expertise in leg protection, including eventing boots, tendon boots and overreach boots.</li>
<li>Saddle pads, fly veils, girths, halters and stable accessories for coordinated competition and yard use.</li>
<li>Product development informed by professional grooming and international competition experience.</li>
</ul>`,

  faq_items: [
    {
      question: 'What is Kentucky Horsewear known for?',
      answer:
        'Kentucky Horsewear is best known for high-quality leg protection including eventing boots, tendon boots and overreach boots, alongside saddle pads, fly veils, girths, halters and stable accessories with a polished competition-ready finish.',
    },
    {
      question: 'Where is Kentucky Horsewear from?',
      answer:
        'Kentucky Horsewear is a Belgian equestrian brand that grew from a partnership with Kentucky Reitmode, with roots in Ronse, Belgium, and products now used by riders worldwide.',
    },
    {
      question: 'Can I buy Kentucky Horsewear in Australia?',
      answer:
        'Yes. You can shop Kentucky Horsewear in Australia at The Equestrian, including horse boots, saddle pads, fly veils, girths and selected grooming and stable accessories.',
    },
    {
      question: 'Does Kentucky Horsewear make horse boots?',
      answer:
        'Yes. Horse boots and leg protection are Kentucky\'s foundation, with eventing boots, tendon boots, fetlock boots, overreach boots and air tendon boots among the most popular styles.',
    },
    {
      question: 'Are Kentucky saddle pads suitable for competition use?',
      answer:
        'Yes. Kentucky saddle pads are popular for competition riders because they combine smart presentation with practical fabrics and shapes that also work well for regular training rides.',
    },
    {
      question: 'Who designs Kentucky Horsewear products?',
      answer:
        'Kentucky products are developed with input from experienced equestrian professionals, including product manager Claudia Weber, whose background as a groom for Olympic and international riders informs the brand\'s focus on safety, comfort and durability.',
    },
  ],
};

export default content;

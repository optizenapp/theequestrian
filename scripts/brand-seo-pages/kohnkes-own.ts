import type { BrandSEOContent } from '../run-brand-seo-update';

/**
 * /brands/kohnkes-own - April 2026
 * Ahrefs clusters:
 *   - Core branded: kohnkes own (70 vol), kohnkes own trim, kohnkes own cell vital, kohnkes own cell perform
 *   - Product lines: Trim, Cell Vital, Cell Perform, Palomino Gold, Gastro-Coat, Mag-E, Muscle XL
 *
 * Product rules:
 *   - HANDLE STARTS_WITH kohnkes-own-
 *   - HANDLE STARTS_WITH kohnke-
 *   - TITLE CONTAINS kohnke
 */
const content: BrandSEOContent = {
  handle: 'kohnkes-own',
  title: "Kohnke's Own",
  breadcrumb_label: "Kohnke's Own",
  rules: [
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'kohnkes-own-' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'kohnke-' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'kohnke' },
  ],

  meta_title: "Kohnke's Own Horse Supplements Australia | The Equestrian",
  meta_description:
    "Shop Kohnke's Own in Australia at The Equestrian. Explore scientifically formulated horse supplements including Gastro-Coat, Mag-E, Muscle XL, Cell Vital and more.",
  h1_title: "Shop Kohnke's Own Horse Supplements in Australia",

  short_description: `<p>Shop <strong>Kohnke's Own</strong>, an Australian equine supplement brand built on over 40 years of veterinary expertise and long-term field research across hundreds of horses.</p>
<!--read-more-trigger-->
<p>Browse the full Kohnke's Own supplement range including Gastro-Coat, Mag-E, Muscle XL, Cell Vital, Trim and more, each formulated by Dr. John Kohnke BVSc and rigorously trialled before release.</p>`,

  long_description: `<h2>About Kohnke's Own</h2>
<p>
Kohnke's Own was founded in 2001 by Dr. John Kohnke BVSc RDA, one of Australia's most respected equine veterinarians and a leading expert in practical horse nutrition. Rather than taking a typical supplement approach, Kohnke's Own invests in long-term field research trials involving 50 to 100 horses over periods of two to five years before any product reaches the market. The result is a range of 28 supplements that have been tested under real-world conditions across Australian yards, not in controlled stables with a handful of horses.
</p>
<p>
The brand is now a family business. Dr. John's daughter, Dr. Philippa Kohnke, leads research and development, combining her PhD in Biochemistry with hands-on equine nutrition work to refine existing formulas and develop new products. The team is backed by qualified nutritional advisors with years of experience supporting horse owners across Australia.
</p>

<h2>Popular Kohnke's Own Supplement Lines</h2>

<h3>Gastro-Coat & Digestive Support</h3>
<p>
Gastro-Coat is one of the most well-known products in the Kohnke's Own range, formulated to support gastric comfort and digestive health in horses under regular work. It is commonly chosen by riders and trainers looking to support horses that show signs of gastric sensitivity or irregular appetite.
</p>

<h3>Mag-E & Calming Supplements</h3>
<p>
Mag-E is a popular choice for horse owners looking at magnesium and vitamin E support, particularly for horses showing tense or excitable behaviour or those in hard work that may benefit from additional magnesium. It is commonly compared alongside other calming and recovery-focused supplement options.
</p>

<h3>Muscle XL & Performance Support</h3>
<p>
Muscle XL is formulated to support muscle development and recovery in horses in consistent training. It appeals to riders working with horses across disciplines where muscle condition and recovery time matter, from dressage and jumping to eventing and general performance work.
</p>

<h3>Trim, Cell Vital & Daily Ration Support</h3>
<p>
The Trim and Cell Vital products sit within the daily vitamin and mineral supplement range, designed to support ration balancing for horses on varying pasture and hay diets. Kohnke's Own uses a patented cold-pressed Supplet pellet system across many of its formulas, which keeps nutrients separated by group to prevent destructive interactions between vitamins and minerals during storage and feeding.
</p>

<h2>Why Riders Choose Kohnke's Own</h2>
<ul>
<li>Founded by Dr. John Kohnke BVSc, one of Australia's leading equine veterinarians and nutrition experts</li>
<li>Products developed through long-term field trials of 2 to 5 years involving up to 100 horses before launch</li>
<li>A proudly Australian family business trusted by horse owners, riders and trainers across the country</li>
</ul>`,

  faq_items: [
    {
      question: "What is Kohnke's Own known for?",
      answer:
        "Kohnke's Own is known for scientifically formulated horse supplements developed by Dr. John Kohnke BVSc, an Australian equine veterinarian with over 40 years of experience. The brand is recognised for its long-term field research approach and practical, research-backed nutrition products.",
    },
    {
      question: "Can I buy Kohnke's Own in Australia?",
      answer:
        "Yes. You can shop Kohnke's Own in Australia at The Equestrian, including popular products such as Gastro-Coat, Mag-E, Muscle XL, Cell Vital and Trim.",
    },
    {
      question: "What is Kohnke's Own Gastro-Coat used for?",
      answer:
        "Gastro-Coat is formulated to support gastric comfort and digestive health in horses, particularly those in regular work. It is a widely chosen option for horses showing signs of gastric sensitivity or changes in appetite.",
    },
    {
      question: "What makes Kohnke's Own different from other horse supplement brands?",
      answer:
        "Kohnke's Own conducts long-term field research trials involving 50 to 100 horses over two to five years before releasing a product. This approach, combined with a patented cold-pressed Supplet pellet system that keeps incompatible nutrients separated, sets the brand apart from many supplement ranges that skip extended real-world testing.",
    },
  ],
};

export default content;

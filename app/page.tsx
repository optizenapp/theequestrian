import { Hero } from '@/components/Hero';
import { TrustSignals } from '@/components/TrustSignals';
import { BestDealsSlider } from '@/components/BestDealsSlider';
import { MostWantedCarousel } from '@/components/MostWantedCarousel';

const mostWanted = [
  {
    title: 'Professional Dressage Saddle',
    price: 'From $2,299',
    rating: '4.9',
    tag: 'Most wanted',
    image: 'https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Premium Show Jumping Boots',
    price: 'From $449',
    rating: '4.8',
    tag: 'New arrivals',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Equestrian GPS Watch',
    price: 'From $349',
    rating: '4.7',
    tag: 'Trending',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Competition Riding Jacket',
    price: 'From $599',
    rating: '4.8',
    tag: 'Best seller',
    image: 'https://images.unsplash.com/photo-1434725039720-aaad6dd32dfe?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Advanced Safety Helmet',
    price: 'From $279',
    rating: '4.9',
    tag: 'Top rated',
    image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Leather Riding Gloves',
    price: 'From $89',
    rating: '4.6',
    tag: 'Fan favorite',
    image: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Professional Grooming Kit',
    price: 'From $159',
    rating: '4.7',
    tag: 'Essential',
    image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Show Bridle Set',
    price: 'From $329',
    rating: '4.8',
    tag: 'Premium',
    image: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=800&q=80',
  },
];

const deals = Array.from({ length: 6 }).map((_, index) => ({
  title: `Deal ${index + 1}`,
  detail: 'Limited stock',
  price: `$${index * 150 + 199}`,
}));

const newsItems = [
  {
    title: 'Refurbished tech helps the planet',
    body: 'Learn how we keep gear cycling back into use with minimal impact.',
  },
  {
    title: 'Why “used” is the new premium',
    body: 'A closer look at our 25-point inspection process.',
  },
  {
    title: 'We’re officially a B Corp',
    body: 'Accountability in every order we ship.',
  },
];

const faqs = [
  {
    question: 'Can you help me recycle my old phone?',
    answer: 'Yes — trade-in options make it easy to offset the cost of new gear.',
  },
  {
    question: 'Do you offer payment plans?',
    answer: 'Several flexible plans are available; just choose “pay later” at checkout.',
  },
  {
    question: 'Is shipping free?',
    answer: 'Free standard shipping applies to orders over $100.',
  },
];

const seenIn = ['Trustpilot', 'Glassdoor', 'Medium', 'Vogue', 'CNBC'];

export default function Home() {
  return (
    <div>
      <Hero
        title={
          <>
            The <span className="text-white">Equestrian</span>
          </>
        }
        subtitle={
          <>
            Australian Owned <span className="text-primary mx-2">|</span> Global Brands
          </>
        }
        ctaText="Shop Now"
        ctaLink="/horse"
        secondaryCtaText="View Collections"
        secondaryCtaLink="/collections"
      />

      <TrustSignals />

      <MostWantedCarousel products={mostWanted} />

      {/* Shop our most wanted */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2">
            <p className="text-sm font-semibold tracking-[0.4em] uppercase text-gray-400">
              Shop our most wanted
            </p>
            <h3 className="text-3xl font-bold text-gray-900">Rider favorites</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {mostWanted.map((item) => (
              <div key={item.title} className="rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="relative h-48 w-full rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="mt-4 text-xs text-primary font-semibold uppercase tracking-[0.4em]">
                  {item.tag}
                </p>
                <h4 className="mt-2 text-lg font-semibold text-gray-900 line-clamp-2">{item.title}</h4>
                <p className="mt-1 text-base text-gray-700">{item.price}</p>
                <p className="text-sm text-gray-500">Rating {item.rating} ✦</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BestDealsSlider />

      {/* Sign up */}
      <section className="bg-[#1DC4C6] py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 text-center text-white sm:px-6">
          <p className="text-sm uppercase tracking-[0.4em]">Get $15 off</p>
          <h3 className="text-3xl font-bold">Sign up & unlock exclusive offers</h3>
          <p className="max-w-2xl text-white/90">
            Join the community for curated drops, early access to new collections, and insider pricing.
          </p>
          <div className="flex w-full max-w-md items-center gap-3">
            <input
              type="email"
              placeholder="Email address"
              className="flex-1 rounded-full border border-white/60 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/70 focus:border-white focus:outline-none"
            />
            <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1DC4C6]">
              Sign up
            </button>
          </div>
        </div>
      </section>

      {/* News */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-400">News</p>
            <h3 className="text-3xl font-bold text-gray-900">What we’re talking about</h3>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {newsItems.map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-100 p-6 shadow-sm">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-[0.4em]">News</p>
                <h4 className="mt-3 text-xl font-semibold text-gray-900">{item.title}</h4>
                <p className="mt-2 text-sm text-gray-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-400">FAQs</p>
            <h3 className="text-3xl font-bold text-gray-900">Questions we answer most often</h3>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900">{faq.question}</h4>
                <p className="mt-2 text-sm text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* As seen in */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-400">As seen in</p>
            <h3 className="text-2xl font-bold text-gray-900">Trusted by the industries you admire</h3>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            {seenIn.map((label) => (
              <span key={label} className="text-sm font-semibold tracking-widest text-gray-500">
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

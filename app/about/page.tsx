import { Metadata } from 'next';
import { PolicyLayout } from '@/components/policy/PolicyLayout';

export const metadata: Metadata = {
  title: 'About Us | The Equestrian',
  description: 'Learn about The Equestrian team and our mission to serve the Australian equestrian community.',
};

export default function AboutPage() {
  return (
    <PolicyLayout title="About The Equestrian">
      <div className="space-y-6 text-gray-700">
        <p className="text-xl text-gray-900 font-semibold">
          Australia's Premier Equestrian Marketplace
        </p>

        <p>
          The Equestrian is founded by individuals with extensive experience across all sectors of the equestrian industry, including retail, wholesale, manufacturing, and e-commerce. Our team comprises digital marketing professionals, professional trainers, and competition riders across various disciplines, all sharing a passion for horses and the Australian equine community.
        </p>

        <p>
          This unique position allows The Equestrian to offer customers and vendors the opportunity to buy and sell online in one place, not only for new physical equestrian products but also for courses, horses for sale, transport, property, and more.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Our Mission</h2>
        
        <p>
          We're dedicated to making quality equestrian products accessible to riders, horse owners, and enthusiasts across Australia. Whether you're a competitive rider, a weekend warrior, or simply passionate about horses, we're here to support your equestrian journey.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Meet Our Team</h2>

        <div className="space-y-6 mt-6">
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Jason & Steven Philips</h3>
            <p className="text-sm text-action font-medium mb-3">Principals</p>
            <p>
              Jason and Steven are the principals of the highly respected Trailrace equestrian retail business in Tuggerah, NSW, with decades of experience in equestrian retail and manufacturing. Jason serves as General Manager, focusing on seller relations and strategy, while Steve is the CFO, bringing financial expertise and business acumen to The Equestrian.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Jono Farrington</h3>
            <p className="text-sm text-action font-medium mb-3">Technical Director & Digital Marketing</p>
            <p>
              With 20 years of experience in digital and online marketing, including founding start-ups in Australia and internationally, Jono brings expertise in technical development, growth strategies, and management of large e-commerce assets. He was also a competitive showjumper up to World Cup level for over 20 years. At The Equestrian, Jono handles technical development, digital marketing, and strategic planning.
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Why Choose The Equestrian?</h2>
        
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="bg-pink-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🛍️ Curated Selection</h3>
            <p className="text-sm">
              We carefully select products from trusted brands and sellers to ensure quality and authenticity.
            </p>
          </div>

          <div className="bg-pink-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🤝 Expert Knowledge</h3>
            <p className="text-sm">
              Our team includes experienced riders and industry professionals who understand your needs.
            </p>
          </div>

          <div className="bg-pink-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🇦🇺 Australian Owned</h3>
            <p className="text-sm">
              Proudly Australian owned and operated, supporting local businesses and the equestrian community.
            </p>
          </div>

          <div className="bg-pink-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">💝 Customer First</h3>
            <p className="text-sm">
              We're committed to providing exceptional customer service and support at every step.
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Our Marketplace</h2>
        
        <p>
          The Equestrian operates as a multi-vendor marketplace, bringing together quality sellers from across Australia. This means:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>Access to a wider range of products from specialist sellers</li>
          <li>Competitive pricing through healthy marketplace competition</li>
          <li>Support for small and medium equestrian businesses</li>
          <li>One convenient checkout for multiple sellers</li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">For Sellers</h2>
        
        <p>
          Are you an equestrian retailer, manufacturer, or brand looking to reach more customers? The Equestrian provides a platform for sellers to:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>Reach Australia's equestrian community</li>
          <li>Manage your products and orders easily</li>
          <li>Benefit from our marketing and SEO expertise</li>
          <li>Focus on what you do best while we handle the technology</li>
        </ul>

        <p>
          Interested in becoming a seller?{' '}
          <a href="/contact" className="text-action hover:text-action-hover font-semibold">
            Contact us
          </a>{' '}
          to learn more about our seller program.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Our Location</h2>
        
        <div className="bg-gray-50 rounded-xl p-6">
          <p className="font-semibold text-gray-900 mb-2">The Equestrian</p>
          <p>
            41B Luck St<br />
            Macclesfield, South Australia 5153<br />
            Australia
          </p>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Get in Touch</h2>
        
        <p>
          We'd love to hear from you! Whether you have a question, feedback, or just want to say hello:
        </p>

        <ul className="list-none space-y-2 mt-4">
          <li>
            📧 Email:{' '}
            <a href="mailto:support@theequestrian.com.au" className="text-action hover:text-action-hover">
              support@theequestrian.com.au
            </a>
          </li>
          <li>
            📞 Phone:{' '}
            <a href="tel:+61419851891" className="text-action hover:text-action-hover">
              0419 851 891
            </a>
          </li>
          <li>⏰ Business Hours: Mon - Fri, 9am - 5pm AEST</li>
        </ul>

        <div className="bg-action/10 border border-action/20 rounded-xl p-6 mt-8">
          <p className="text-gray-900 font-semibold mb-2">Join Our Community</p>
          <p className="text-sm">
            Follow us on social media for the latest products, tips, and equestrian news. We're passionate about building a supportive community for all horse lovers across Australia.
          </p>
        </div>
      </div>
    </PolicyLayout>
  );
}


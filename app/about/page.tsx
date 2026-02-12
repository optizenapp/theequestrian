import { PolicyLayout } from '@/components/policy/PolicyLayout';
import { getStaticPageContent } from '@/lib/content/static-pages';
import { generateAboutPageSchema } from '@/lib/utils/site-schema';

export async function generateMetadata() {
  const page = await getStaticPageContent('about');
  return {
    title: page?.meta_title || 'About Us | The Equestrian',
    description:
      page?.meta_description ||
      'Learn about The Equestrian team and our mission to serve the Australian equestrian community.',
  };
}

export default async function AboutPage() {
  const page = await getStaticPageContent('about');
  const title = page?.title || 'About The Equestrian';
  const description =
    page?.meta_description ||
    'Learn about The Equestrian team and our mission to serve the Australian equestrian community.';
  const schema = generateAboutPageSchema('/about', title, description);

  if (page?.body_html || page?.intro_html || page?.bottom_html) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
        <PolicyLayout title={title}>
          <div className="space-y-6 text-gray-700">
            {page.intro_html ? <div dangerouslySetInnerHTML={{ __html: page.intro_html }} /> : null}
            {page.body_html ? <div dangerouslySetInnerHTML={{ __html: page.body_html }} /> : null}
            {page.bottom_html ? <div dangerouslySetInnerHTML={{ __html: page.bottom_html }} /> : null}
          </div>
        </PolicyLayout>
      </>
    );
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <PolicyLayout title="About The Equestrian">
        <div className="space-y-6 text-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">It's time for an Equestrian Marketplace for everyone</h2>

        <p>
          As a team, The Equestrian is founded by individuals who have experience across all sectors of the equestrian industry.
        </p>

        <p>
          Our team consists of individuals who have many successful years experience in equestrian retail, wholesale, manufacturing, and e-commerce. The team also consists of digital marketing professionals, current and past professional trainers and competition riders across a range of disciplines. Most important of all, we have a passion for horses and the Australian equine community.
        </p>

        <p>
          This allows us to be in a unique position to leverage our years of experience and give you as a customer or vendor, the unique opportunity to buy and sell online in one place, for not only new physical equestrian products, but also list your courses, horses for sale, transport, property, and almost anything else you can buy or sell in the one equestrian marketplace.
        </p>

        <p>
          Simply, it was time that there was one place in Australia where you can buy and sell not only second hand gear, but give retailers and wholesalers the opportunity to list their products where everyone shops.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Meet Our Team</h2>

        <div className="space-y-6 mt-6">
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Jason & Steven Philips</h3>
            <p>
              Jason & Steven Philips are well known throughout Australia as the principles of the highly respected Trailrace equestrian retail business, based in Tuggerah, NSW. With decades in the equestrian retail and manufacturing sector, their combined knowledge of equestrian retail manufacturing, and customer service ensure the same attention to detail is embedded at The Equestrian.
            </p>
            <p className="mt-3">
              Jason takes on the role of general manager, seller relations and strategy. Steve takes on the role of CFO.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Jono Farrington</h3>
            <p>
              Jono Farrington has 20 years experience in digital and online marketing, including founding start-ups in both Australia and internationally. A directory of the technical E-commerce agency Silicon Dales, he brings knowledge in technical, growth, and management of large e-commerce assets.
            </p>
            <p className="mt-3">
              Jono was also a competitive showjumper up to World Cup level for over 20 years. He takes care of technical, digital marketing and strategy at The Equestrian.
            </p>
          </div>
        </div>


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
    </>
  );
}


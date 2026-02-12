import { Metadata } from 'next';
import { PolicyLayout } from '@/components/policy/PolicyLayout';
import { generatePolicyPageSchema } from '@/lib/utils/site-schema';

export const metadata: Metadata = {
  title: 'Terms of Service | The Equestrian',
  description: 'Read our terms of service to understand the conditions of use for The Equestrian marketplace.',
};

export default function TermsOfServicePage() {
  const schema = generatePolicyPageSchema({
    path: '/terms-of-service',
    title: 'Terms of Service | The Equestrian',
    description: 'Read our terms of service to understand the conditions of use for The Equestrian marketplace.',
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <PolicyLayout title="Terms of Service" lastUpdated="19 April 2021">
        <div className="space-y-6 text-gray-700">
        <p>
          Welcome to The Equestrian. These Terms of Service govern your use of our website and services. By accessing or using The Equestrian, you agree to be bound by these terms.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Conditions of Use</h2>
        
        <p>
          Equine Marketplace Pty Ltd offers its goods and services under the following terms and conditions. By using this website, you agree to comply with and be bound by these terms.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Copyright</h2>
        
        <p>
          All content on this website, including logos, pictures, text, and software, is the property of Equine Marketplace Pty Ltd and is protected by Australian and international copyright laws. Unauthorized use, reproduction, or distribution of any content without written consent is strictly prohibited.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Currency</h2>
        
        <p>
          All prices and transactions on The Equestrian are in Australian Dollars (AUD). Customers purchasing from outside Australia are responsible for any currency conversion costs and potential variations in the final amount charged due to exchange rate fluctuations.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Your Account</h2>
        
        <p>
          When you create an account with us, you are responsible for:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>Maintaining the confidentiality of your account and password</li>
          <li>Restricting access to your computer or device</li>
          <li>Accepting responsibility for all activities that occur under your account</li>
          <li>Providing accurate and complete information</li>
        </ul>

        <p>
          We reserve the right to refuse service, terminate accounts, or cancel orders at our discretion.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Reviews and User Content</h2>
        
        <p>
          Visitors may post reviews and other content, provided that such content:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>Is not illegal, obscene, threatening, or defamatory</li>
          <li>Does not invade privacy or infringe on intellectual property rights</li>
          <li>Is not discriminatory or hateful</li>
          <li>Does not contain viruses or malicious code</li>
          <li>Does not impersonate any person or entity</li>
        </ul>

        <p>
          We reserve the right to remove any content that violates these terms without prior notice.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Risk of Loss</h2>
        
        <p>
          Items purchased from The Equestrian are made pursuant to a shipment contract. This means that the risk of loss and title for such items pass to you upon delivery to the carrier.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Product Descriptions</h2>
        
        <p>
          We make every effort to provide accurate product descriptions, specifications, and pricing. However, we do not warrant that product descriptions, pricing, or other content on this site is accurate, complete, reliable, current, or error-free.
        </p>

        <p>
          If a product offered by The Equestrian is not as described, your sole remedy is to return it in unused condition for a refund in accordance with our returns policy.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Pricing and Availability</h2>
        
        <p>
          We reserve the right to:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>Limit quantities of items purchased per person or per order</li>
          <li>Refuse any order placed</li>
          <li>Discontinue any product at any time</li>
          <li>Change prices without notice</li>
        </ul>

        <p>
          In the event of a pricing error, we will contact you for instructions or cancel your order and notify you of the cancellation.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Disclaimer of Warranties and Limitation of Liability</h2>
        
        <p>
          This site and all information, content, materials, products, and services included on or otherwise made available to you through this site are provided on an "as is" and "as available" basis.
        </p>

        <p>
          Equine Marketplace Pty Ltd makes no representations or warranties of any kind, express or implied, as to the operation of this site or the information, content, materials, products, or services included on or otherwise made available to you through this site.
        </p>

        <p>
          To the full extent permissible by applicable law, Equine Marketplace Pty Ltd disclaims all warranties, express or implied, including but not limited to implied warranties of merchantability and fitness for a particular purpose.
        </p>

        <p>
          Equine Marketplace Pty Ltd will not be liable for any damages of any kind arising from the use of this site, including but not limited to direct, indirect, incidental, punitive, and consequential damages.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Applicable Law</h2>
        
        <p>
          These Terms of Service and any disputes arising out of or related to them or your use of The Equestrian shall be governed by the laws of Australia, without regard to conflict of law principles.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Checkout and Order Acceptance</h2>
        
        <p>
          By clicking the "PLACE ORDER" button during checkout, you:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>Agree to these Terms of Service</li>
          <li>Confirm that all information provided is accurate</li>
          <li>Authorize us to charge your payment method</li>
          <li>Agree to our Privacy Policy and Refund Policy</li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Sharing Your Personal Information</h2>
        
        <p>
          Personal information is not shared with any other person or business, except where a third party is used to perform services for Equine Marketplace Pty Ltd (such as payment processing or shipping). For more information, please see our{' '}
          <a href="/privacy-policy" className="text-action hover:text-action-hover">
            Privacy Policy
          </a>
          .
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Changes to Terms</h2>
        
        <p>
          We reserve the right to update or modify these Terms of Service at any time without prior notice. Your continued use of The Equestrian following any changes indicates your acceptance of the new terms.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Contact Us</h2>
        
        <p>
          If you have any questions about these Terms of Service, please contact us at{' '}
          <a href="mailto:support@theequestrian.com.au" className="text-action hover:text-action-hover">
            support@theequestrian.com.au
          </a>
        </p>

        <p className="text-sm text-gray-500 italic mt-8">
          Last updated on 19 April 2021 by Equine Marketplace Pty Ltd
        </p>
        </div>
      </PolicyLayout>
    </>
  );
}




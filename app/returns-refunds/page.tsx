import { Metadata } from 'next';
import { PolicyLayout } from '@/components/policy/PolicyLayout';

export const metadata: Metadata = {
  title: 'Returns & Refunds | The Equestrian',
  description: 'Learn about our returns and refunds policy, including how to return items and request refunds.',
};

export default function ReturnsRefundsPage() {
  return (
    <PolicyLayout title="Returns & Refunds Policy">
      <div className="space-y-6 text-gray-700">
        <p>
          At The Equestrian, we want you to be completely satisfied with your purchase. If you're not happy with your order, we're here to help.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Our Return Policy</h2>
        
        <p>
          You have 30 days from the date of delivery to return most items for a refund or exchange. To be eligible for a return, items must be:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>In their original condition and packaging</li>
          <li>Unworn, unused, and unwashed</li>
          <li>With all tags and labels attached</li>
          <li>Accompanied by proof of purchase</li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Non-Returnable Items</h2>
        
        <p>
          For hygiene and safety reasons, the following items cannot be returned:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>Helmets and body protectors (unless faulty)</li>
          <li>Underwear and intimate apparel</li>
          <li>Earrings and body jewelry</li>
          <li>Items marked as "Final Sale" or "Clearance"</li>
          <li>Personalized or custom-made items</li>
          <li>Opened supplements, medications, or consumables</li>
          <li>Gift cards</li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">How to Return an Item</h2>
        
        <p>
          To initiate a return, please follow these steps:
        </p>

        <ol className="list-decimal pl-6 space-y-2">
          <li>
            Contact our customer service team at{' '}
            <a href="mailto:support@theequestrian.com.au" className="text-action hover:text-action-hover">
              support@theequestrian.com.au
            </a>{' '}
            or call us at{' '}
            <a href="tel:+61419851891" className="text-action hover:text-action-hover">
              0419 851 891
            </a>
          </li>
          <li>Provide your order number and the reason for return</li>
          <li>We'll send you a return authorization and instructions</li>
          <li>Pack the item securely in its original packaging</li>
          <li>Ship the item back to us using a trackable shipping method</li>
        </ol>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 my-6">
          <p className="text-blue-900 font-semibold mb-2">📦 Return Shipping Address:</p>
          <p className="text-blue-800">
            The Equestrian Returns<br />
            41B Luck St<br />
            Macclesfield, SA 5153<br />
            Australia
          </p>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Return Shipping Costs</h2>
        
        <p>
          Return shipping costs depend on the reason for the return:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Faulty or incorrect items:</strong> We'll cover the return shipping cost</li>
          <li><strong>Change of mind:</strong> Customer is responsible for return shipping costs</li>
          <li><strong>Exchange:</strong> We'll cover shipping for the replacement item</li>
        </ul>

        <p>
          We recommend using a trackable shipping service and purchasing shipping insurance for valuable items, as we cannot guarantee that we will receive your returned item.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Refunds</h2>
        
        <p>
          Once we receive your return and inspect the item, we will notify you of the approval or rejection of your refund.
        </p>

        <p>
          If approved, your refund will be processed and automatically applied to your original payment method within 5-10 business days.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Late or Missing Refunds</h3>
        
        <p>
          If you haven't received your refund within the expected timeframe:
        </p>

        <ol className="list-decimal pl-6 space-y-2">
          <li>Check your bank account again</li>
          <li>Contact your credit card company (it may take time before your refund is officially posted)</li>
          <li>Contact your bank (there is often processing time before a refund is posted)</li>
          <li>If you've done all of this and still haven't received your refund, please contact us at{' '}
            <a href="mailto:support@theequestrian.com.au" className="text-action hover:text-action-hover">
              support@theequestrian.com.au
            </a>
          </li>
        </ol>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Exchanges</h2>
        
        <p>
          We're happy to exchange items for a different size or color, subject to availability. To request an exchange:
        </p>

        <ol className="list-decimal pl-6 space-y-2">
          <li>Contact us with your order number and exchange request</li>
          <li>Return the original item following our return process</li>
          <li>We'll send the replacement item once we receive your return</li>
        </ol>

        <p>
          If the replacement item is more expensive, you'll need to pay the difference. If it's less expensive, we'll refund the difference.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Faulty or Damaged Items</h2>
        
        <p>
          If you receive a faulty or damaged item, please contact us immediately with:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>Your order number</li>
          <li>Photos of the damage or fault</li>
          <li>A description of the issue</li>
        </ul>

        <p>
          We'll arrange for a replacement or full refund, including return shipping costs.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Wrong Item Received</h2>
        
        <p>
          If you receive the wrong item, please contact us immediately. We'll arrange for the correct item to be sent to you at no additional cost and provide a prepaid return label for the incorrect item.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Australian Consumer Law</h2>
        
        <p>
          Our returns policy does not affect your rights under Australian Consumer Law. You are entitled to a replacement or refund for a major failure and compensation for any other reasonably foreseeable loss or damage. You are also entitled to have the goods repaired or replaced if the goods fail to be of acceptable quality and the failure does not amount to a major failure.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Questions?</h2>
        
        <p>
          If you have any questions about our returns and refunds policy, please don't hesitate to contact us:
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
      </div>
    </PolicyLayout>
  );
}



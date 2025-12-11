import { Metadata } from 'next';
import { PolicyLayout } from '@/components/policy/PolicyLayout';

export const metadata: Metadata = {
  title: 'Shipping & Delivery | The Equestrian',
  description: 'Learn about our shipping and delivery options, rates, and timeframes for Australia and international orders.',
};

export default function ShippingDeliveryPage() {
  return (
    <PolicyLayout title="Shipping & Delivery Policy">
      <div className="space-y-6 text-gray-700">
        <p>
          We're committed to getting your equestrian gear to you as quickly and safely as possible. Here's everything you need to know about our shipping and delivery options.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Shipping Within Australia</h2>
        
        <p>
          We ship to all states and territories across Australia using trusted courier services including Australia Post, Fastway, and TNT.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Standard Shipping</h3>
        
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Delivery Time:</strong> 3-7 business days</li>
          <li><strong>Cost:</strong> Calculated at checkout based on weight and destination</li>
          <li><strong>Tracking:</strong> Provided for all orders</li>
        </ul>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Express Shipping</h3>
        
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Delivery Time:</strong> 1-3 business days</li>
          <li><strong>Cost:</strong> Calculated at checkout based on weight and destination</li>
          <li><strong>Tracking:</strong> Provided for all orders</li>
          <li><strong>Availability:</strong> Major metro areas only</li>
        </ul>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 my-6">
          <p className="text-green-900 font-semibold mb-2">🎉 Free Shipping</p>
          <p className="text-green-800">
            Enjoy free standard shipping on all orders over $100 within Australia!
          </p>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">International Shipping</h2>
        
        <p>
          We ship to select international destinations. International shipping rates and delivery times vary by destination and are calculated at checkout.
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Delivery Time:</strong> 7-21 business days (depending on destination)</li>
          <li><strong>Customs & Duties:</strong> Customer is responsible for any customs fees, duties, or taxes</li>
          <li><strong>Tracking:</strong> Provided for all international orders</li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Processing Time</h2>
        
        <p>
          Orders are typically processed and dispatched within 1-2 business days. During busy periods (sales, holidays), processing may take up to 3-5 business days.
        </p>

        <p>
          You'll receive an email confirmation when your order is dispatched, including tracking information.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Tracking Your Order</h2>
        
        <p>
          Once your order has been dispatched, you'll receive:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>Email confirmation with tracking number</li>
          <li>Link to track your parcel online</li>
          <li>Estimated delivery date</li>
        </ul>

        <p>
          Please allow 24 hours after dispatch for tracking information to become active.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Delivery</h2>
        
        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Signature Required</h3>
        
        <p>
          For orders over $200, signature on delivery is required for security purposes. If you're not home, the courier will leave a card with instructions for redelivery or collection.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Safe Drop</h3>
        
        <p>
          For orders under $200, parcels may be left in a safe place at the driver's discretion if no one is home. You can specify delivery instructions during checkout.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">PO Boxes and Parcel Lockers</h3>
        
        <p>
          We can ship to PO Boxes and Parcel Lockers via Australia Post. Please note that express shipping is not available for these delivery options.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Shipping Restrictions</h2>
        
        <p>
          Some items may have shipping restrictions due to size, weight, or hazardous materials regulations:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Large items</strong> (saddles, large rugs): May incur additional freight charges</li>
          <li><strong>Aerosols and liquids:</strong> Cannot be shipped via air freight (affects express shipping to some areas)</li>
          <li><strong>International restrictions:</strong> Some products cannot be shipped internationally</li>
        </ul>

        <p>
          If your order contains restricted items, we'll contact you to discuss alternative shipping options.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Delivery Issues</h2>
        
        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Lost or Damaged Parcels</h3>
        
        <p>
          If your parcel is lost or arrives damaged:
        </p>

        <ol className="list-decimal pl-6 space-y-2">
          <li>Contact us immediately at{' '}
            <a href="mailto:support@theequestrian.com.au" className="text-action hover:text-action-hover">
              support@theequestrian.com.au
            </a>
          </li>
          <li>Provide your order number and photos of any damage</li>
          <li>We'll lodge a claim with the courier and arrange a replacement or refund</li>
        </ol>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Incorrect Address</h3>
        
        <p>
          Please ensure your delivery address is correct before completing your order. If you need to change your delivery address after placing an order, contact us immediately. We may be able to redirect your parcel, but this is not always possible once it's been dispatched.
        </p>

        <p>
          If a parcel is returned to us due to an incorrect address provided by the customer, you'll be responsible for the cost of reshipping.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Rural and Remote Areas</h2>
        
        <p>
          Delivery to rural and remote areas may take longer than standard delivery times. Additional freight charges may apply for very remote locations. These will be calculated at checkout or we'll contact you if additional charges apply.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Multiple Sellers</h2>
        
        <p>
          The Equestrian is a marketplace with multiple sellers. If your order contains items from different sellers, they may arrive in separate parcels at different times. Each parcel will have its own tracking number.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Questions About Shipping?</h2>
        
        <p>
          If you have any questions about shipping or delivery, please contact us:
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


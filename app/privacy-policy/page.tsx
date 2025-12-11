import { Metadata } from 'next';
import { PolicyLayout } from '@/components/policy/PolicyLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy | The Equestrian',
  description: 'Read our privacy policy to understand how we collect, use, and protect your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout title="Privacy Policy" lastUpdated="19 April 2021">
      <div className="space-y-6 text-gray-700">
        <p>
          Equine Marketplace Pty Ltd ("us", "we", or "our") operates{' '}
          <a href="https://theequestrian.com.au" className="text-action hover:text-action-hover">
            theequestrian.com.au
          </a>{' '}
          (the "Site"). This page informs you of our policies regarding the collection, use and disclosure of Personal Information we receive from users of the Site.
        </p>

        <p>
          We use your Personal Information only for providing and improving the Site. By using the Site, you agree to the collection and use of information in accordance with this policy.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">I. INFORMATION COLLECTION AND USE</h2>
        
        <p>
          While using our Site, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you. Personally identifiable information may include, but is not limited to your name, email address, postal address and phone number ("Personal Information").
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">II. LOG DATA</h2>
        
        <p>
          Like many site operators, we collect information that your browser sends whenever you visit our Site ("Log Data"). This Log Data may include information such as your computer's Internet Protocol ("IP") address, browser type, browser version, the pages of our Site that you visit, the time and date of your visit, the time spent on those pages and other statistics.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">III. WILL THE EQUESTRIAN SHARE ANY OF THE PERSONAL INFORMATION IT RECEIVES?</h2>
        
        <p>
          We neither rent nor sell your Personal Information to anyone. We share your Personal Information only as described below.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">A. AFFILIATED BUSINESSES WE DO NOT CONTROL</h3>
        
        <p>
          We anticipate that we will become affiliated with a variety of businesses and work closely with them. In certain situations, these businesses may operate stores on the Site or sell items to you through the Site. In other situations, we may provide services, or sell products jointly with affiliated businesses. You can easily recognise when an affiliated business is associated with your transaction, and we will share customer information that is related to such transactions with that affiliated business.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">B. AGENTS</h3>
        
        <p>
          We employ other companies and people to perform tasks on our behalf and need to share your information with them to provide products or services to you. Examples include sending email, analysing data, providing marketing assistance, processing credit card payments, and providing customer service. Unless we tell you differently, our agents do not have any right to use Personal Information we share with them beyond what is necessary to assist us.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">C. USER SUBMISSIONS</h3>
        
        <p>
          If you post User Content on the Site, or otherwise submit User Content to us, we may share such User Content with other users of the Site, and may also publish it on the Site or via our social media accounts.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">D. PROMOTIONAL OFFERS</h3>
        
        <p>
          We may send offers to you on behalf of other businesses. However, when we do so, we do not give the other business your name and address. If you do not wish to receive these offers, please change your account settings or contact us.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">E. BUSINESS TRANSFERS</h3>
        
        <p>
          In some cases, we may choose to buy or sell assets. In these types of transactions, customer information (which may include your Personal Information) is typically one of the business assets that is transferred. Also, if all of our assets (or substantially all of our assets) are acquired, or if we go out of business or enter bankruptcy, Personal Information may be one of the assets transferred to or acquired by a third party.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">F. PROTECTING OURSELVES AND OTHERS</h3>
        
        <p>
          We may release Personal Information when we believe in good faith that release is necessary to comply with laws; notify the Office of the Australian Information Commissioner about a data breach or report a matter for investigation; enforce or apply our conditions of use and/or other agreements; or protect the rights, property, or safety of us, our employees, our users, or others. We may exchange information with other companies and organisations (including governmental authorities) for fraud protection and credit risk reduction.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">G. WITH YOUR CONSENT</h3>
        
        <p>
          Except as set out in this Privacy Policy, you will be notified when your Personal Information may be shared with third parties, and will be able to prevent the sharing of this information.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">IV. IS PERSONAL INFORMATION ABOUT ME SECURE?</h2>
        
        <p>
          Your account is protected by a password for your privacy and security. You need to prevent unauthorised access to your account and Personal Information by selecting and protecting your password (or other sign-on protections) appropriately and limiting access to your computer or device by signing off after you have finished accessing your account. We endeavour to protect the privacy of your account and other Personal Information we hold in our records, but we cannot guarantee complete security. Unauthorised entry or use, hardware or software failure, and other factors may compromise the security of user information at any time.
        </p>

        <p>
          The Site may contain links to other sites. We are not responsible for the privacy policies and/or practices on other sites. When following a link to another site you should read that site's privacy policy.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">A. WHAT PERSONAL INFORMATION CAN I ACCESS?</h3>
        
        <p>
          Through your account settings, you may access, and, in some cases, edit or delete the following information you've provided to us:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>name and password</li>
          <li>email address</li>
          <li>billing information</li>
          <li>user profile information and User Content, including images you have uploaded to the Site</li>
        </ul>

        <p>
          The information you can view and update may change as the Site changes. If you have any questions about viewing or updating information we have on file about you, please contact us at{' '}
          <a href="mailto:support@theequestrian.com.au" className="text-action hover:text-action-hover">
            support@theequestrian.com.au
          </a>
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">V. WHAT DATA DO WE RETAIN?</h2>
        
        <p>
          We will retain your information only for as long as is necessary or your account is active or as needed in order to provide you with services. We will also retain and use your information for as long as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements. You may inform us of any changes or requests with regard to your personal data, and in accordance with our obligations under local data protection law, we may update or delete your personal data.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">VI. WHAT CHOICES DO I HAVE?</h2>
        
        <p>
          You can always choose not to disclose information to us. However, please keep in mind that we may need some information to allow you to register with us or to take advantage of some or all of our features, and if you choose not to provide that information, your ability to use our Site and services may be limited.
        </p>

        <p>
          You may be able to add, update, or delete information. When you update information, however, we may maintain a copy of the unrevised information in our records. You may request deletion of your account by visiting your account settings. Please note that some information may remain in our private records after your deletion of such information from your account. We may use any aggregated data derived from or incorporating your Personal Information even if you update or delete it, but we will not use that information in a manner that would identify you personally.
        </p>

        <p>
          If you do not wish to receive email or other mail from us, please change your account settings accordingly. Please note that if you do not want to receive legal notices from us, such as this Privacy Policy, those legal notices will still govern your use of the Site, and you are responsible for reviewing such legal notices for changes.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">VII. CHANGES TO THIS PRIVACY POLICY</h2>
        
        <p>
          We may amend this Privacy Policy from time to time. Use of information we collect now is subject to the Privacy Policy in effect at the time such information is used. If we make changes in the way we use Personal Information, we will notify you by posting an announcement on our Site or contacting you directly via email or other means. You are bound by any changes to the Privacy Policy when you use the Site after such changes have been first posted. The current Privacy Policy supersedes all prior Privacy Policies.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">VIII. QUESTIONS OR CONCERNS</h2>
        
        <p>
          If you have any questions or concerns regarding our privacy policies, please send us a detailed message to{' '}
          <a href="mailto:support@theequestrian.com.au" className="text-action hover:text-action-hover">
            support@theequestrian.com.au
          </a>
          . We will make every effort to resolve your concerns.
        </p>

        <p className="text-sm text-gray-500 italic mt-8">
          Last updated on 19 April 2021 by Equine Marketplace Pty Ltd
        </p>
      </div>
    </PolicyLayout>
  );
}


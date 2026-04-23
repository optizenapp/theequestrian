'use client';

import Image from 'next/image';
import { FaCcVisa, FaCcMastercard, FaCcPaypal } from 'react-icons/fa';
import { SiAfterpay, SiShopify } from 'react-icons/si';

interface ProductBuyBoxPostCtaProps {
  layout: 'default' | 'croTrial' | 'croTheme3';
}

function PaymentMethodsRow() {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex justify-center items-center gap-2">
      <div className="h-6 w-10 bg-white border border-gray-200 rounded flex items-center justify-center" title="Visa">
        <FaCcVisa className="text-[#1A1F71] text-2xl" />
      </div>
      <div className="h-6 w-10 bg-[#5A31F4] border border-gray-200 rounded flex items-center justify-center" title="Shop Pay">
        <SiShopify className="text-white text-xl" />
      </div>
      <div className="h-6 w-10 bg-white border border-gray-200 rounded flex items-center justify-center" title="Mastercard">
        <FaCcMastercard className="text-[#EB001B] text-2xl" />
      </div>
      <div className="h-6 w-10 bg-white border border-gray-200 rounded flex items-center justify-center" title="PayPal">
        <FaCcPaypal className="text-[#003087] text-2xl" />
      </div>
      <div className="h-6 w-10 bg-[#b2fce4] border border-gray-200 rounded flex items-center justify-center" title="Afterpay">
        <SiAfterpay className="text-black text-lg" />
      </div>
      <div className="h-6 w-10 bg-white border border-gray-200 rounded flex items-center justify-center overflow-hidden" title="Zip">
        <Image src="/zip.png" alt="Zip Pay" width={40} height={24} loading="eager" className="w-[40px] h-[24px] object-contain" />
      </div>
    </div>
  );
}

function TrustRowsCro() {
  return (
    <>
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>Free shipping on all orders</span>
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Secure checkout — major cards and buy-now-pay-later where available.</span>
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Returns — see our policy for eligibility and timeframes.</span>
      </div>
    </>
  );
}

function TrustRowsDefault() {
  return (
    <>
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>Free shipping on all orders</span>
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Secure checkout</span>
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Easy returns within 30 days</span>
      </div>
    </>
  );
}

/** Trust strip + payment icons after primary CTAs (order differs for CRO trial). */
export function ProductBuyBoxPostCta({ layout }: ProductBuyBoxPostCtaProps) {
  const isCro = layout === 'croTrial' || layout === 'croTheme3';
  const trustBlock = (
    <div className={`space-y-3 ${isCro ? 'pt-2' : 'pt-4 border-t'}`}>
      {isCro ? <TrustRowsCro /> : <TrustRowsDefault />}
    </div>
  );
  const paymentBlock = <PaymentMethodsRow />;

  return isCro ? (
    <>
      {trustBlock}
      {paymentBlock}
    </>
  ) : (
    <>
      {paymentBlock}
      {trustBlock}
    </>
  );
}

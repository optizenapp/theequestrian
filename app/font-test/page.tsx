'use client';

import { useState } from 'react';
import { Inter, Plus_Jakarta_Sans, Outfit, Manrope, DM_Sans, Playfair_Display } from 'next/font/google';

// Load all fonts
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

const fontOptions = [
  { 
    name: 'System Fonts (Current)', 
    value: 'system',
    className: '',
    description: 'Fast loading, no external requests'
  },
  { 
    name: 'Inter', 
    value: 'inter',
    className: inter.className,
    description: 'Clean, modern, excellent readability - Used by Stripe, GitHub'
  },
  { 
    name: 'Plus Jakarta Sans', 
    value: 'jakarta',
    className: plusJakarta.className,
    description: 'Geometric, friendly, modern with personality'
  },
  { 
    name: 'Outfit', 
    value: 'outfit',
    className: outfit.className,
    description: 'Rounded, contemporary, very 2024'
  },
  { 
    name: 'Manrope', 
    value: 'manrope',
    className: manrope.className,
    description: 'Modern geometric, excellent for e-commerce'
  },
  { 
    name: 'DM Sans', 
    value: 'dm-sans',
    className: dmSans.className,
    description: 'Low contrast, excellent readability'
  },
];

const pairingOptions = [
  {
    name: 'Manrope (Headings) + Inter (Body)',
    value: 'manrope-inter',
    headingClass: manrope.className,
    bodyClass: inter.className,
    description: 'Perfect balance - geometric warmth with clean readability'
  },
  {
    name: 'Manrope (Headings) + DM Sans (Body)',
    value: 'manrope-dm',
    headingClass: manrope.className,
    bodyClass: dmSans.className,
    description: 'Soft and approachable - great for friendly brand feel'
  },
  {
    name: 'Manrope (All) - Recommended',
    value: 'manrope-all',
    headingClass: manrope.className,
    bodyClass: manrope.className,
    description: 'Single font system - clean, cohesive, modern (Best for Manrope)'
  },
  {
    name: 'Outfit (Headings) + Inter (Body)',
    value: 'outfit-inter',
    headingClass: outfit.className,
    bodyClass: inter.className,
    description: 'Modern personality with clean readability'
  },
  {
    name: 'Playfair Display (Headings) + Inter (Body)',
    value: 'playfair-inter',
    headingClass: playfair.className,
    bodyClass: inter.className,
    description: 'Elegant serif headings, premium feel'
  },
  {
    name: 'Outfit (Headings) + DM Sans (Body)',
    value: 'outfit-dm',
    headingClass: outfit.className,
    bodyClass: dmSans.className,
    description: 'Friendly geometric with soft body'
  },
];

export default function FontTestPage() {
  const [selectedFont, setSelectedFont] = useState('system');
  const [selectedPairing, setSelectedPairing] = useState<string | null>(null);

  const currentFont = fontOptions.find(f => f.value === selectedFont);
  const currentPairing = pairingOptions.find(p => p.value === selectedPairing);

  const getFontClass = () => {
    if (currentPairing) {
      return ''; // Will apply classes to specific elements
    }
    return currentFont?.className || '';
  };

  const getHeadingClass = () => {
    return currentPairing ? currentPairing.headingClass : '';
  };

  const getBodyClass = () => {
    return currentPairing ? currentPairing.bodyClass : '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Font Selector */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Font Testing Lab</h1>
          
          {/* Single Font Options */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Single Font (All Text)
            </label>
            <div className="flex flex-wrap gap-2">
              {fontOptions.map((font) => (
                <button
                  key={font.value}
                  onClick={() => {
                    setSelectedFont(font.value);
                    setSelectedPairing(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedFont === font.value && !selectedPairing
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {font.name}
                </button>
              ))}
            </div>
          </div>

          {/* Font Pairing Options */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Font Pairings (Heading + Body)
            </label>
            <div className="flex flex-wrap gap-2">
              {pairingOptions.map((pairing) => (
                <button
                  key={pairing.value}
                  onClick={() => {
                    setSelectedPairing(pairing.value);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedPairing === pairing.value
                      ? 'bg-secondary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {pairing.name}
                </button>
              ))}
            </div>
          </div>

          {/* Current Selection Info */}
          <div className="mt-4 p-3 bg-primary-pale rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Current:</strong>{' '}
              {currentPairing ? currentPairing.description : currentFont?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 ${getFontClass()}`}>
        
        {/* Hero Section Preview */}
        <section className="mb-16 bg-gradient-to-br from-primary-pale via-white to-secondary-pale rounded-xl p-12">
          <h1 className={`text-5xl font-bold text-gray-900 mb-4 ${getHeadingClass()}`}>
            Premium Equestrian Equipment
          </h1>
          <p className={`text-xl text-gray-700 mb-6 ${getBodyClass()}`}>
            Everything you need for horse and rider. World-leading brands at competitive prices.
          </p>
          <div className="flex gap-4">
            <button className="btn-primary">Shop Now</button>
            <button className="btn-outline">View Collections</button>
          </div>
        </section>

        {/* Typography Scale */}
        <section className="mb-16 bg-white rounded-xl p-8 border border-gray-200">
          <h2 className={`text-3xl font-bold text-gray-900 mb-6 ${getHeadingClass()}`}>
            Typography Scale
          </h2>
          
          <div className="space-y-6">
            <div>
              <h1 className={`text-5xl font-bold text-gray-900 mb-2 ${getHeadingClass()}`}>
                Heading 1 - 48px Bold
              </h1>
              <p className={`text-gray-600 ${getBodyClass()}`}>Used for page titles and hero sections</p>
            </div>

            <div>
              <h2 className={`text-4xl font-bold text-gray-900 mb-2 ${getHeadingClass()}`}>
                Heading 2 - 36px Bold
              </h2>
              <p className={`text-gray-600 ${getBodyClass()}`}>Used for section titles</p>
            </div>

            <div>
              <h3 className={`text-2xl font-semibold text-gray-900 mb-2 ${getHeadingClass()}`}>
                Heading 3 - 24px Semibold
              </h3>
              <p className={`text-gray-600 ${getBodyClass()}`}>Used for card titles and subsections</p>
            </div>

            <div>
              <p className={`text-lg text-gray-700 mb-2 ${getBodyClass()}`}>
                Body Large - 18px Regular
              </p>
              <p className={`text-gray-600 ${getBodyClass()}`}>Used for introductions and important text</p>
            </div>

            <div>
              <p className={`text-base text-gray-700 mb-2 ${getBodyClass()}`}>
                Body Regular - 16px Regular
              </p>
              <p className={`text-gray-600 ${getBodyClass()}`}>Used for main content and descriptions</p>
            </div>

            <div>
              <p className={`text-sm text-gray-700 mb-2 ${getBodyClass()}`}>
                Body Small - 14px Regular
              </p>
              <p className={`text-gray-600 ${getBodyClass()}`}>Used for captions and secondary information</p>
            </div>
          </div>
        </section>

        {/* Product Card Preview */}
        <section className="mb-16">
          <h2 className={`text-3xl font-bold text-gray-900 mb-6 ${getHeadingClass()}`}>
            Product Card Preview
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-primary hover:shadow-md transition-all">
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-4">
                  <h3 className={`font-semibold text-gray-900 mb-2 ${getHeadingClass()}`}>
                    Premium Riding Boots
                  </h3>
                  <p className={`text-sm text-gray-600 mb-3 ${getBodyClass()}`}>
                    High-quality leather boots for professional riders
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold text-primary ${getHeadingClass()}`}>
                      $299.00
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Content Block */}
        <section className="mb-16 bg-white rounded-xl p-8 border border-gray-200">
          <h2 className={`text-3xl font-bold text-gray-900 mb-4 ${getHeadingClass()}`}>
            About Our Products
          </h2>
          <div className={`prose max-w-none ${getBodyClass()}`}>
            <p className="text-gray-700 mb-4">
              At The Equestrian, we pride ourselves on offering only the highest quality equestrian equipment. 
              Our carefully curated selection includes products from world-leading brands, ensuring that both 
              horse and rider have access to the best gear available.
            </p>
            <p className="text-gray-700 mb-4">
              Whether you're a professional competitor or a weekend enthusiast, our extensive range covers 
              everything from riding apparel and boots to saddles, bridles, and horse care products. Each 
              item in our collection has been selected for its quality, durability, and performance.
            </p>
            <p className="text-gray-700">
              We understand that equestrian sports demand excellence, which is why we partner with brands 
              that share our commitment to quality and innovation. Browse our collections to find the 
              perfect equipment for your needs.
            </p>
          </div>
        </section>

        {/* UI Elements */}
        <section className="mb-16 bg-white rounded-xl p-8 border border-gray-200">
          <h2 className={`text-3xl font-bold text-gray-900 mb-6 ${getHeadingClass()}`}>
            UI Elements
          </h2>
          
          <div className="space-y-6">
            {/* Buttons */}
            <div>
              <h3 className={`text-lg font-semibold text-gray-900 mb-3 ${getHeadingClass()}`}>Buttons</h3>
              <div className="flex flex-wrap gap-3">
                <button className="btn-primary">Primary Button</button>
                <button className="btn-secondary">Secondary Button</button>
                <button className="btn-outline">Outline Button</button>
              </div>
            </div>

            {/* Links */}
            <div>
              <h3 className={`text-lg font-semibold text-gray-900 mb-3 ${getHeadingClass()}`}>Links</h3>
              <div className={`space-y-2 ${getBodyClass()}`}>
                <p><a href="#" className="text-primary hover:text-primary-dark font-semibold">Primary Link</a></p>
                <p><a href="#" className="text-gray-700 hover:text-primary">Regular Link</a></p>
                <p><a href="#" className="text-sm text-gray-600 hover:text-primary">Small Link</a></p>
              </div>
            </div>

            {/* Badges */}
            <div>
              <h3 className={`text-lg font-semibold text-gray-900 mb-3 ${getHeadingClass()}`}>Badges</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-primary text-white text-sm font-semibold rounded-full">New</span>
                <span className="px-3 py-1 bg-secondary text-white text-sm font-semibold rounded-full">Sale</span>
                <span className="px-3 py-1 bg-success text-white text-sm font-semibold rounded-full">In Stock</span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 text-sm font-semibold rounded-full">Popular</span>
              </div>
            </div>
          </div>
        </section>

        {/* Numbers & Pricing */}
        <section className="bg-white rounded-xl p-8 border border-gray-200">
          <h2 className={`text-3xl font-bold text-gray-900 mb-6 ${getHeadingClass()}`}>
            Numbers & Pricing
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className={`text-4xl font-bold text-primary mb-2 ${getHeadingClass()}`}>$299.00</div>
              <p className={`text-gray-600 ${getBodyClass()}`}>Large Price</p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className={`text-2xl font-semibold text-gray-900 mb-2 ${getHeadingClass()}`}>1,234</div>
              <p className={`text-gray-600 ${getBodyClass()}`}>Product Count</p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className={`text-xl font-medium text-secondary mb-2 ${getHeadingClass()}`}>Free Shipping</div>
              <p className={`text-gray-600 ${getBodyClass()}`}>On orders over $100</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );

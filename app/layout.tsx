import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/header/Header';
import { FreeShippingBanner } from '@/components/header/FreeShippingBanner';
import { Footer } from '@/components/footer/Footer';
import dynamic from 'next/dynamic';
import { CartProvider } from '@/components/cart/cart-context';

// Lazy load cart drawer - only loads when user interacts with cart
const CartDrawer = dynamic(
  () => import('@/components/cart/CartDrawer').then((mod) => ({ default: mod.CartDrawer })),
  {
    loading: () => null,
  }
);
import { NavigationProgress } from '@/components/NavigationProgress';
import { ConfiguredShopifyInbox } from '@/components/chat/ConfiguredShopifyInbox';
import Script from 'next/script';

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});
const gaMeasurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

export const metadata: Metadata = {
  title: 'The Equestrian - Premium Equestrian Equipment',
  description: 'Everything you need for horse and rider. World-leading brands at competitive prices.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', type: 'image/png' },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={manrope.variable}>
      <head>
        {/* Critical resource hints - reduces connection time by 200-400ms */}
        <link rel="preconnect" href="https://theequestrian.myshopify.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.shopify.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://monorail-edge.shopifysvc.com" />
        
        {/* Analytics and tracking domains */}
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        
        {/* Preload critical assets for faster LCP */}
        <link rel="preload" as="image" href="/hero-image-v2.jpg" fetchPriority="high" />
        
        {/* Preload fonts to prevent layout shift */}
        <link
          rel="preload"
          href="https://fonts.gstatic.com/s/manrope/v15/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk59FO_F87jxeN7B.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className={manrope.className}>
        {gaMeasurementId ? (
          <>
            {/* Defer GA4 to lazyOnload for better initial load performance */}
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="lazyOnload"
            />
            <Script id="ga4-init" strategy="lazyOnload">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        ) : null}
        <CartProvider>
          <NavigationProgress />
          <FreeShippingBanner />
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
          <CartDrawer />
          <ConfiguredShopifyInbox
            config={{
              colors: {
                background: '#00B2A9', // Your Shopify Admin teal
                text: '#FFFFFF',
                buttons: '#6A6A6A', // Your Shopify Admin gray
              },
              greetingMessage: '👋 Hey. Welcome to The Equestrian. If you have a question, just ask. We\'ll reply shortly.',
            }}
          />
        </CartProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/header/Header';
import { FreeShippingBanner } from '@/components/header/FreeShippingBanner';
import { Footer } from '@/components/footer/Footer';
import { CartProvider } from '@/components/cart/cart-context';
import { CartDrawer } from '@/components/cart/CartDrawer';
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={manrope.variable}>
      <head>
        {/* Resource hints for Shopify domains - reduces connection time by 200-400ms */}
        <link rel="dns-prefetch" href="https://theequestrian.myshopify.com" />
        <link rel="preconnect" href="https://theequestrian.myshopify.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.shopify.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://monorail-edge.shopifysvc.com" />
        {/* Preload hero image for faster LCP */}
        <link rel="preload" as="image" href="/hero-image-v2.jpg" fetchPriority="high" />
      </head>
      <body className={manrope.className}>
        {gaMeasurementId ? (
          <>
            {/* Defer GA4 to idle for better initial load performance */}
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="idle"
            />
            <Script id="ga4-init" strategy="idle">
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

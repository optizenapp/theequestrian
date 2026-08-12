import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { SITE_DESCRIPTION, SITE_NAME, SITE_NAME_DISPLAY } from '@/lib/seo/site-identity';
import { generateSitewideSchemaGraph } from '@/lib/utils/site-schema';
import './globals.css';
import { Header } from '@/components/header/Header';
import { CrawlNav } from '@/components/header/CrawlNav';
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
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});
const gaMeasurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
const performSiteId =
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'theequestrian.myshopify.com';
const PERFORM_SCRIPT = `https://perform-by-silicondales.vercel.app/api/attribution/script?siteId=${performSiteId}`;
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au'
).replace(/\/$/, '');

const GA4_CHECKOUT_HOST = 'checkout.theequestrian.com.au';
const ga4LinkerDomainsJson = JSON.stringify(
  Array.from(
    new Set([
      (() => {
        try {
          return new URL(siteUrl).hostname;
        } catch {
          return 'www.theequestrian.com.au';
        }
      })(),
      GA4_CHECKOUT_HOST,
      process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'theequestrian.myshopify.com',
    ])
  )
);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: SITE_NAME_DISPLAY,
  title: {
    default: `${SITE_NAME_DISPLAY} | Premium Horse Riding Gear & Apparel Australia`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    types: {
      'application/rss+xml': `${siteUrl}/rss.xml`,
    },
  },
  openGraph: {
    siteName: SITE_NAME_DISPLAY,
    locale: 'en_AU',
    type: 'website',
  },
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
        <link rel="dns-prefetch" href="https://perform-by-silicondales.vercel.app" />

        <link rel="entitymap" type="application/json" href={`${siteUrl}/entitymap.json`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateSitewideSchemaGraph(siteUrl)),
          }}
        />
      </head>
      <body className={`${manrope.className} overflow-x-hidden`}>
        {gaMeasurementId ? (
          <>
            {/* afterInteractive so gtag is ready before fast checkout clicks */}
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}', {
                  linker: { domains: ${ga4LinkerDomainsJson} },
                  // Include query params so GA4 can attribute UTMs
                  page_path: window.location.pathname + window.location.search,
                  page_location: window.location.href,
                });
              `}
            </Script>
          </>
        ) : null}
        <Script src={PERFORM_SCRIPT} strategy="afterInteractive" />
        <CartProvider>
          <NavigationProgress />
          <Header />
          <CrawlNav />
          <main className="min-h-screen overflow-x-hidden">
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
          <Analytics />
          <SpeedInsights />
        </CartProvider>
      </body>
    </html>
  );
}

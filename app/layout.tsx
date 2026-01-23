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

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'The Equestrian - Premium Equestrian Equipment',
  description: 'Everything you need for horse and rider. World-leading brands at competitive prices.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className={manrope.className}>
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

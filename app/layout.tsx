import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/header/Header';
import { Footer } from '@/components/footer/Footer';
import { CartProvider } from '@/components/cart/cart-context';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { NavigationProgress } from '@/components/NavigationProgress';

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
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}

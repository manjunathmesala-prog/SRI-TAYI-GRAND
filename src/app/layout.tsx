import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import ScrollReveal from '@/components/anantha/ScrollReveal';
import PwaProvider from '@/components/pwa/PwaProvider';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#43001F',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://sritayigrand.com'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sri Tayi Grand',
  },
  formatDetection: {
    telephone: false,
  },
  title: {
    default: 'Sri Tayi Grand | Luxury Stay & Grand Convention Hall in Kadiri',
    template: '%s | Sri Tayi Grand Hotel Kadiri',
  },
  description: 'Experience thoughtful comfort and authentic hospitality at Sri Tayi Grand, Kadiri. Fully AC Deluxe Rooms, Four Bed Family Rooms, Executive Suites, and Grand 800-capacity Convention Hall with ample parking.',
  keywords: 'Sri Tayi Grand, Tayi Grand Hotel, Kadiri Hotel, Hotels in Kadiri, Convention Hall Kadiri, Luxury Hotel Anantapur, Rooms in Kadiri',
  icons: {
    icon: [
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/hotel/tayi-grand-logo.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/icons/icon-192x192.png',
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/images/hotel/tayi-grand-logo.png' },
    ],
  },
  openGraph: {
    title: 'Sri Tayi Grand | Luxury Stay & Grand Convention Hall',
    description: 'Thoughtful comfort, authentic hospitality, and modern convenience on Bypass Road, Kadiri.',
    url: 'https://sritayigrand.com',
    siteName: 'SRI TAYI GRAND',
    images: [
      {
        url: '/images/hotel/hotel-exterior-hero-clean.jpg',
        width: 1200,
        height: 630,
        alt: 'Sri Tayi Grand Hotel Kadiri Exterior',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hotelStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: 'SRI TAYI GRAND',
    image: 'https://sritayigrand.com/images/hotel/hotel-exterior-hero-clean.jpg',
    telephone: '084942 23379',
    email: 'contact@sritayigrand.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '4585+F8J, Opp. Girls High School, Bypass Road, Tadipatri – Pulivendula – Kadiri Road, Revenue Colony',
      addressLocality: 'Kadiri',
      addressRegion: 'Andhra Pradesh',
      postalCode: '515591',
      addressCountry: 'IN',
    },
    priceRange: '₹1,800 - ₹3,300',
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Fully Air-Conditioned Rooms', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Car Parking', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Convention Hall', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'High-Speed Wi-Fi', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Room Service', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Lift Access', value: true },
    ],
  };

  return (
    <html
      lang="en"
      className={`scroll-smooth ${cormorant.variable} ${playfair.variable} ${plusJakarta.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelStructuredData) }}
        />
      </head>
      <body className="w-full min-h-screen flex flex-col bg-[#F8F3E9] text-[#33271D] font-sans antialiased selection:bg-[#B18A4A] selection:text-white relative">
        <ScrollReveal />
        <PwaProvider />
        {children}
      </body>
    </html>
  );
}

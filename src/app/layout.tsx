import type { Metadata, Viewport } from 'next';
import './globals.css';
import ScrollReveal from '@/components/anantha/ScrollReveal';

export const viewport: Viewport = {
  themeColor: '#8D672F',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://sritayigrand.com'),
  title: {
    default: 'Sri Tayi Grand | Luxury Stay & Grand Convention Hall in Kadiri',
    template: '%s | Sri Tayi Grand Hotel Kadiri',
  },
  description: 'Experience thoughtful comfort and authentic hospitality at Sri Tayi Grand, Kadiri. Fully AC Deluxe Rooms, Four Bed Family Rooms, Executive Suites, and Grand 800-capacity Convention Hall with ample parking.',
  keywords: 'Sri Tayi Grand, Tayi Grand Hotel, Kadiri Hotel, Hotels in Kadiri, Convention Hall Kadiri, Luxury Hotel Anantapur, Rooms in Kadiri',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/images/hotel/tayi-grand-logo.jpg',
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
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelStructuredData) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#F8F3E9] text-[#33271D] selection:bg-[#B18A4A] selection:text-white relative">
        <ScrollReveal />
        {children}
      </body>
    </html>
  );
}

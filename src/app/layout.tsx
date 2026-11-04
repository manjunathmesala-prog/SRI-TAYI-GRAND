import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://sritayigrand.com'),
  title: 'Sri Tayi Grand | Luxury Stay & Convention Hall in Kadiri, Andhra Pradesh',
  description: 'Experience thoughtful comfort and grand hospitality at Sri Tayi Grand, Kadiri. Suite Rooms, Double Bed Rooms, Single Bed Rooms, and Grand Convention Hall.',
  keywords: 'Sri Tayi Grand, Tayi Grand Hotel, Kadiri Hotel, Hotels in Kadiri, Convention Hall Kadiri, Luxury Hotel Anantapur, Rooms in Kadiri',
  openGraph: {
    title: 'Sri Tayi Grand | Luxury Stay & Convention Hall',
    description: 'Your Stay. Your Comfort. Your Grand Experience at Sri Tayi Grand, Kadiri.',
    url: 'https://sritayigrand.com',
    siteName: 'SRI TAYI GRAND',
    images: [
      {
        url: '/images/hotel/hotel-exterior-hero.jpg',
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
    image: 'https://sritayigrand.com/images/hotel/hotel-exterior-hero.jpg',
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
    priceRange: '₹1,999 - ₹4,999',
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
      <body className="min-h-screen flex flex-col bg-[#F8F1E9] text-[#241912] selection:bg-[#D8AD56] selection:text-[#25150F]">
        {children}
      </body>
    </html>
  );
}

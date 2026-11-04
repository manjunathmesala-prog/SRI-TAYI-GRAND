'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { repo } from '@/lib/db/repository';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function GalleryPage() {
  const allImages = repo.getGallery();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const categories = [
    { label: 'All', key: 'all' },
    { label: 'Hotel & Facade', key: 'exterior' },
    { label: 'Rooms & Suites', key: 'rooms' },
    { label: 'Convention Hall', key: 'convention_hall' },
    { label: 'Reception', key: 'reception' },
  ];

  const filteredImages = activeCategory === 'all'
    ? allImages
    : allImages.filter((img) => img.category === activeCategory);

  const openLightbox = (idx: number) => setLightboxIndex(idx);
  const closeLightbox = () => setLightboxIndex(null);

  const prevImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : filteredImages.length - 1);
    }
  };

  const nextImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex < filteredImages.length - 1 ? lightboxIndex + 1 : 0);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F1E9]">
      <Header transparentInitially={false} />

      <main className="flex-grow pt-24 sm:pt-28 pb-24">
        {/* Page Header */}
        <section className="bg-[#20120B] text-white py-16 sm:py-20 mb-12 border-b border-[#D8AD56]/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#D8AD56] block mb-3">
              Visual Tour
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-normal tracking-tight">
              Property Gallery
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#EFE3D6]/80 max-w-lg mx-auto font-light leading-relaxed">
              Explore the architectural beauty, serene guest suites, and majestic event spaces of Sri Tayi Grand.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Minimal Filter Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-5 py-2 rounded-full text-xs uppercase tracking-wider transition-all duration-300 ${
                  activeCategory === cat.key
                    ? 'bg-[#20120B] text-[#D8AD56] shadow-sm font-medium border border-[#D8AD56]/40'
                    : 'bg-white/80 text-[#786B61] hover:text-[#241912] border border-[#EFE3D6]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Photos Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredImages.map((img, idx) => (
              <div
                key={img.id}
                onClick={() => openLightbox(idx)}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury border border-[#D8AD56]/20 bg-[#20120B]/10 cursor-pointer"
              >
                <Image
                  src={img.image_url}
                  alt={img.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <span className="font-serif text-base text-white font-medium">{img.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lightbox Modal */}
        {lightboxIndex !== null && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <button
              onClick={closeLightbox}
              className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <button
              onClick={prevImage}
              className="absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={nextImage}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <div className="relative max-w-5xl max-h-[85vh] w-full h-full flex flex-col items-center justify-center">
              <div className="relative w-full h-[75vh]">
                <Image
                  src={filteredImages[lightboxIndex].image_url}
                  alt={filteredImages[lightboxIndex].title}
                  fill
                  className="object-contain"
                />
              </div>
              <p className="font-serif text-sm text-[#EFE3D6] mt-4 tracking-wide">
                {filteredImages[lightboxIndex].title}
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import MobileStickyBookingBar from '@/components/anantha/MobileStickyBookingBar';
import FloatingActionBar from '@/components/anantha/FloatingActionBar';
import TayiBrandIcon from '@/components/anantha/TayiBrandIcon';
import { repo } from '@/lib/db/repository';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

export default function GalleryPage() {
  const allImages = repo.getGallery();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const categories = [
    { label: 'All Photos', key: 'all' },
    { label: 'Hotel & Facade', key: 'exterior' },
    { label: 'Rooms & Suites', key: 'rooms' },
    { label: 'Convention Hall', key: 'convention_hall' },
    { label: 'Reception & Lobby', key: 'reception' },
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
    <main className="min-h-screen flex flex-col bg-[#F8F3E9] text-[#33271D]">
      <Header transparentInitially={false} />

      {/* Hero Banner */}
      <section className="relative z-20 w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hotel/hotel-exterior-night-enhanced.png"
            alt="Sri Tayi Grand Visual Tour"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-[#21180F]/75 backdrop-blur-[2px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-3 pt-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] font-semibold text-[#B18A4A]">
            <TayiBrandIcon size={18} />
            <span>VISUAL TOUR</span>
            <TayiBrandIcon size={18} />
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif text-white font-normal tracking-tight">
            Property Gallery
          </h1>
          <p className="text-sm sm:text-base text-[#F8F3E9]/85 font-serif italic max-w-lg mx-auto">
            Explore the architectural elegance, serene guest accommodations, and grand event spaces of Sri Tayi Grand.
          </p>
        </div>
      </section>

      {/* Gallery Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-12">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-5 py-2.5 rounded-full text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeCategory === cat.key
                  ? 'bg-[#43001F] text-white font-semibold shadow-md'
                  : 'bg-white text-[#786A5B] hover:text-[#33271D] border border-[#E6D9C5] hover:bg-[#FAF6EE]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Photos Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 reveal-stagger">
          {filteredImages.map((img, idx) => (
            <div
              key={img.id}
              onClick={() => openLightbox(idx)}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury border border-[#E6D9C5] bg-[#21180F] cursor-pointer luxury-card-hover"
            >
              <Image
                src={img.image_url}
                alt={img.title}
                fill
                className="object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold mb-0.5">
                  Sri Tayi Grand
                </span>
                <span className="font-serif text-base text-white font-medium">{img.title}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
        >
          <button
            onClick={closeLightbox}
            aria-label="Close Lightbox"
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={prevImage}
            aria-label="Previous image"
            className="absolute left-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors hidden sm:block"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="relative w-full max-w-5xl h-[70vh] rounded-2xl overflow-hidden">
            <Image
              src={filteredImages[lightboxIndex].image_url}
              alt={filteredImages[lightboxIndex].title}
              fill
              className="object-contain"
            />
            <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm font-serif">
              {filteredImages[lightboxIndex].title}
            </div>
          </div>

          <button
            onClick={nextImage}
            aria-label="Next image"
            className="absolute right-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors hidden sm:block"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      <MobileStickyBookingBar />
      <FloatingActionBar />
      <Footer />
    </main>
  );
}

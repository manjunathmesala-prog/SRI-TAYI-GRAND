'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  HallEnquiry,
  HallEnquiryStatus,
  ConventionQuote,
  SeatingLayoutType,
  CateringPackageType,
} from '@/types';
import {
  Building,
  Calendar,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  Phone,
  Mail,
  X,
  Sparkles,
  Printer,
  Plus,
  Tv,
  Mic2,
  Flower2,
  Zap,
  Layers,
  UtensilsCrossed,
  Clock,
  Send,
  Eye,
  Check,
} from 'lucide-react';
import { useRealtimeSync } from '@/lib/realtime-client';

const SEATING_LAYOUTS: {
  id: SeatingLayoutType;
  label: string;
  maxPax: number;
  description: string;
  icon: string;
}[] = [
  {
    id: 'theater',
    label: 'Theater Style',
    maxPax: 500,
    description: 'Row-based audience seating facing main stage. Ideal for conventions and talks.',
    icon: '🎭',
  },
  {
    id: 'cluster',
    label: 'Cluster / Round Table',
    maxPax: 350,
    description: 'Round banquet tables of 6-8 pax. Ideal for receptions and dinners.',
    icon: '🍽️',
  },
  {
    id: 'classroom',
    label: 'Classroom Style',
    maxPax: 250,
    description: 'Parallel desks and chairs facing projector. Ideal for seminars and training.',
    icon: '📚',
  },
  {
    id: 'ushape',
    label: 'U-Shape Boardroom',
    maxPax: 150,
    description: 'Open horseshoe layout for interactive executive discussions and summits.',
    icon: '🤝',
  },
];

const CATERING_PACKAGES: {
  id: CateringPackageType;
  name: string;
  rate: number;
  tagline: string;
  highlights: string[];
}[] = [
  {
    id: 'veg_thali',
    name: 'Veg Andhra Thali',
    rate: 350,
    tagline: 'Traditional Rayalaseema & Andhra banana-leaf meal',
    highlights: ['Gongura Pachadi & Ghee', 'Sambar & Rasam', 'Two Curries & Fry', 'Poori & Sweet Payasam'],
  },
  {
    id: 'deluxe_buffet',
    name: 'Deluxe Buffet',
    rate: 550,
    tagline: 'Lavish multi-cuisine vegetarian spread with live counters',
    highlights: ['Paneer Tikka Live Counter', 'Dum Biryani & Mirchi Ka Salan', 'Chinese Starter', '3 Desserts & Ice Cream'],
  },
  {
    id: 'royal_feast',
    name: 'Royal Feast',
    rate: 800,
    tagline: 'Grand royal banquet with premium artisanal preparations',
    highlights: ['Welcome Mocktails & Soups', 'Mughlai & Andhra Specialties', 'Assorted Naan/Roti Live', 'Rasmalai, Gulab Jamun, Paan'],
  },
  {
    id: 'high_tea',
    name: 'High Tea Spread',
    rate: 180,
    tagline: 'Evening snacks & hot beverages for meetings',
    highlights: ['Mirchi Bajji & Mysore Bonda', 'Vegetable Cutlets', 'Filter Coffee & Masala Tea', 'Dry Fruit Cookies'],
  },
  {
    id: 'none',
    name: 'Hall Rental Only',
    rate: 0,
    tagline: 'Venue rental without catering (client arranges external F&B)',
    highlights: ['Outside catering kitchen access', 'Pantry staging area', 'Cleaning fee applies'],
  },
];

export default function ConventionHallAdminPage() {
  const [activeTab, setActiveTab] = useState<'quotes' | 'builder' | 'enquiries'>('builder');
  const [searchQuery, setSearchQuery] = useState('');
  const [enquiries, setEnquiries] = useState<HallEnquiry[]>([]);
  const [quotes, setQuotes] = useState<ConventionQuote[]>([]);
  const [loading, setLoading] = useState(true);

  // Enquiry Management Modal
  const [selectedEnquiry, setSelectedEnquiry] = useState<HallEnquiry | null>(null);
  const [enqStatus, setEnqStatus] = useState<HallEnquiryStatus>('new');
  const [enqQuotedAmount, setEnqQuotedAmount] = useState<number>(45000);
  const [enqAdvanceAmount, setEnqAdvanceAmount] = useState<number>(15000);
  const [enqAdminNotes, setEnqAdminNotes] = useState('');

  // Quotation Builder Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [eventName, setEventName] = useState('Wedding Reception & Family Gathering');
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [seatingLayout, setSeatingLayout] = useState<SeatingLayoutType>('cluster');
  const [guestCount, setGuestCount] = useState<number>(300);
  const [cateringPackage, setCateringPackage] = useState<CateringPackageType>('deluxe_buffet');
  const [hallRental, setHallRental] = useState<number>(45000);

  // AV & Event Checklist toggles
  const [enableLED, setEnableLED] = useState(true);
  const [ledCost, setLedCost] = useState<number>(15000);
  const [enableSound, setEnableSound] = useState(true);
  const [soundCost, setSoundCost] = useState<number>(8000);
  const [enableFloral, setEnableFloral] = useState(true);
  const [floralCost, setFloralCost] = useState<number>(20000);
  const [enableDG, setEnableDG] = useState(true);
  const [dgCost, setDgCost] = useState<number>(5000);

  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [viewingQuoteForPrint, setViewingQuoteForPrint] = useState<ConventionQuote | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/convention-hall', {
        headers: { 'x-staff-role': 'Super Admin' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enquiries) setEnquiries(data.enquiries);
        if (data.quotes) setQuotes(data.quotes);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeSync({
    onRefresh: fetchData,
  });

  // Calculate pricing
  const currentPkg = CATERING_PACKAGES.find((p) => p.id === cateringPackage) || CATERING_PACKAGES[0];
  const cateringSubtotal = guestCount * currentPkg.rate;
  const avTotal = (enableLED ? ledCost : 0) + (enableSound ? soundCost : 0);
  const decorationTotal = enableFloral ? floralCost : 0;
  const dgTotal = enableDG ? dgCost : 0;
  const subtotal = hallRental + cateringSubtotal + avTotal + decorationTotal + dgTotal;
  const gstRate = 0.18;
  const gstAmount = Math.round(subtotal * gstRate);
  const grandTotal = subtotal + gstAmount;

  // Handle Generate Quote
  const handleGenerateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone || !eventName || guestCount <= 0) {
      alert('Please complete all required fields.');
      return;
    }

    setIsSubmittingQuote(true);
    try {
      const res = await fetch('/api/admin/convention-hall', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'create_quote',
          client_name: clientName,
          client_phone: clientPhone,
          client_email: clientEmail,
          event_name: eventName,
          event_date: eventDate,
          seating_layout: seatingLayout,
          guest_count: Number(guestCount),
          catering_package: cateringPackage,
          catering_rate_per_plate: currentPkg.rate,
          hall_rental_charge: Number(hallRental),
          av_sound_lighting: avTotal,
          stage_decoration: decorationTotal,
          generator_diesel: dgTotal,
          subtotal,
          gst_rate: gstRate,
          gst_amount: gstAmount,
          total_amount: grandTotal,
          status: 'draft',
          valid_until: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate quote');
      }

      await fetchData();
      setViewingQuoteForPrint(data.quote);
      setActiveTab('quotes');
    } catch (err: any) {
      alert(err.message || 'Error generating quote');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  // Convert Enquiry into Quote Form
  const handleBuildQuoteFromEnquiry = (enq: HallEnquiry) => {
    setClientName(enq.name);
    setClientPhone(enq.phone);
    setClientEmail(enq.email || '');
    setEventName(enq.event_type || 'Convention Event');
    setEventDate(enq.event_date);
    setGuestCount(enq.expected_guests || 250);
    setActiveTab('builder');
  };

  // Save Enquiry Status
  const handleSaveEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry) return;

    try {
      const res = await fetch('/api/admin/convention-hall', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'update_enquiry',
          id: selectedEnquiry.id,
          status: enqStatus,
          admin_notes: enqAdminNotes,
          quoted_amount: Number(enqQuotedAmount),
          advance_amount: Number(enqAdvanceAmount),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update enquiry');
      }

      setSelectedEnquiry(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error saving enquiry');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'sent':
      case 'quotation_sent':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'draft':
      case 'contacted':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'rejected':
      case 'lost':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  const filteredQuotes = quotes.filter((q) =>
    q.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.client_phone.includes(searchQuery)
  );

  const filteredEnquiries = enquiries.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.enquiry_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.phone.includes(searchQuery) ||
    e.event_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            BANQUET & EVENT MANAGEMENT
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <Building className="w-6 h-6 text-[#D8AD56]" />
            <span>Sri Tayi Grand Convention Hall</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Interactive quotation generator, seating layout visualization, Andhra catering packages, and proposal sheets.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#786B61] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quote ref, client, event..."
            className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-[#EFE3D6] bg-white text-[#241912] focus:border-[#D8AD56] focus:outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Hall Specs Banner */}
      <div className="bg-[#25150F] text-white rounded-2xl p-6 border border-[#D8AD56]/30 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold">Max Venue Capacity</span>
          <div className="font-serif text-2xl font-bold mt-1">100 – 800 Pax</div>
          <div className="text-[11px] text-gray-300 mt-0.5">Central AC Grand Ballroom</div>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold">Banquet Area</span>
          <div className="font-serif text-2xl font-bold mt-1">6,500 Sq Ft</div>
          <div className="text-[11px] text-gray-300 mt-0.5">Pillar-Free Clear Span</div>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold">Stage & AV</span>
          <div className="font-serif text-2xl font-bold mt-1">40 x 20 Ft Stage</div>
          <div className="text-[11px] text-gray-300 mt-0.5">4K Projector & Line-Array</div>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold">Power & Logistics</span>
          <div className="font-serif text-2xl font-bold mt-1">100% DG Backup</div>
          <div className="text-[11px] text-gray-300 mt-0.5">Dedicated Valet & 50+ Cars</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EFE3D6] pb-2">
        <button
          onClick={() => setActiveTab('builder')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'builder'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:bg-[#FAF7F2]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Interactive Quotation Builder</span>
        </button>

        <button
          onClick={() => setActiveTab('quotes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'quotes'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:bg-[#FAF7F2]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Generated Quotations ({quotes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('enquiries')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'enquiries'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:bg-[#FAF7F2]'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Incoming Enquiries ({enquiries.length})</span>
        </button>
      </div>

      {/* TAB 1: INTERACTIVE BANQUET QUOTATION BUILDER */}
      {activeTab === 'builder' && (
        <form onSubmit={handleGenerateQuote} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Client & Event Basic Information */}
            <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-[#EFE3D6] pb-3">
                <span className="w-6 h-6 rounded-full bg-[#382216] text-[#D8AD56] flex items-center justify-center text-xs font-bold">1</span>
                <h3 className="font-serif font-bold text-base text-[#241912]">Client & Event Schedule</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">Client Full Name *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Dr. K. Venkata Reddy"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">Phone Number (WhatsApp) *</label>
                  <input
                    type="text"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+91 98480 12345"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] font-mono focus:border-[#D8AD56] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">Email (For Proposal PDF)</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@gmail.com"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">Event Occasion Name *</label>
                  <input
                    type="text"
                    required
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g. Marriage Reception, Sangeet, Annual Conference"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">Event Date *</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] font-bold focus:border-[#D8AD56] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">Expected Guest Count (Pax) *</label>
                  <input
                    type="number"
                    min="20"
                    max="800"
                    required
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] font-bold text-[#241912] focus:border-[#D8AD56] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Seating Layout Visualizer */}
            <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#382216] text-[#D8AD56] flex items-center justify-center text-xs font-bold">2</span>
                  <h3 className="font-serif font-bold text-base text-[#241912]">Seating Layout Visualizer</h3>
                </div>
                <span className="text-[11px] text-[#786B61]">Select arrangement scheme</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SEATING_LAYOUTS.map((layout) => {
                  const isSelected = seatingLayout === layout.id;
                  const isExceeded = guestCount > layout.maxPax;

                  return (
                    <div
                      key={layout.id}
                      onClick={() => setSeatingLayout(layout.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#D8AD56] bg-[#FAF7F2] shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{layout.icon}</span>
                          <div>
                            <div className="font-bold text-xs text-[#241912]">{layout.label}</div>
                            <div className="text-[10px] text-[#786B61] font-semibold">Up to {layout.maxPax} Pax</div>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[#D8AD56] text-white flex items-center justify-center text-xs">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#786B61] mt-2 leading-relaxed">{layout.description}</p>
                      {isExceeded && isSelected && (
                        <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded font-semibold border border-amber-200">
                          ⚠️ Guest count ({guestCount}) exceeds recommended layout limit ({layout.maxPax} pax).
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Andhra Catering Package Selector */}
            <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#382216] text-[#D8AD56] flex items-center justify-center text-xs font-bold">3</span>
                  <h3 className="font-serif font-bold text-base text-[#241912]">Andhra Catering & Banquet F&B Package</h3>
                </div>
                <UtensilsCrossed className="w-4 h-4 text-[#D8AD56]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATERING_PACKAGES.map((pkg) => {
                  const isSelected = cateringPackage === pkg.id;

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setCateringPackage(pkg.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#D8AD56] bg-amber-50/40 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-[#241912]">{pkg.name}</h4>
                          <span className="font-serif font-bold text-sm text-[#43001F]">
                            {pkg.rate > 0 ? `₹${pkg.rate} / plate` : 'No Food'}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#786B61] mt-1 italic">{pkg.tagline}</p>
                        <ul className="mt-2.5 space-y-1">
                          {pkg.highlights.map((h, i) => (
                            <li key={i} className="text-[10px] text-[#382216] flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#D8AD56]" />
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {isSelected && (
                        <div className="mt-3 pt-2 border-t border-amber-200 text-right">
                          <span className="text-[10px] font-bold text-[#D8AD56] uppercase tracking-wider">
                            Selected ({guestCount} plates = ₹{(guestCount * pkg.rate).toLocaleString('en-IN')})
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. AV & Event Checklist */}
            <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-[#EFE3D6] pb-3">
                <span className="w-6 h-6 rounded-full bg-[#382216] text-[#D8AD56] flex items-center justify-center text-xs font-bold">4</span>
                <h3 className="font-serif font-bold text-base text-[#241912]">AV, Stage Decor & Amenities Checklist</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* LED Screen */}
                <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  enableLED ? 'border-[#D8AD56] bg-[#FAF7F2]' : 'border-gray-200 bg-gray-50/50'
                }`}>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableLED}
                      onChange={(e) => setEnableLED(e.target.checked)}
                      className="w-4 h-4 rounded text-[#43001F] focus:ring-[#D8AD56]"
                    />
                    <div>
                      <div className="font-bold text-xs text-[#241912] flex items-center gap-1.5">
                        <Tv className="w-3.5 h-3.5 text-[#D8AD56]" />
                        <span>LED Screen / Projector</span>
                      </div>
                      <div className="text-[10px] text-[#786B61]">16x9 4K Display with switcher</div>
                    </div>
                  </label>
                  <span className="font-bold text-xs text-[#241912]">₹ {ledCost.toLocaleString('en-IN')}</span>
                </div>

                {/* Sound & Mics */}
                <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  enableSound ? 'border-[#D8AD56] bg-[#FAF7F2]' : 'border-gray-200 bg-gray-50/50'
                }`}>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableSound}
                      onChange={(e) => setEnableSound(e.target.checked)}
                      className="w-4 h-4 rounded text-[#43001F] focus:ring-[#D8AD56]"
                    />
                    <div>
                      <div className="font-bold text-xs text-[#241912] flex items-center gap-1.5">
                        <Mic2 className="w-3.5 h-3.5 text-[#D8AD56]" />
                        <span>Sound System & Mics</span>
                      </div>
                      <div className="text-[10px] text-[#786B61]">JBL Line Array + 4 Cordless Mics</div>
                    </div>
                  </label>
                  <span className="font-bold text-xs text-[#241912]">₹ {soundCost.toLocaleString('en-IN')}</span>
                </div>

                {/* Stage Floral Decor */}
                <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  enableFloral ? 'border-[#D8AD56] bg-[#FAF7F2]' : 'border-gray-200 bg-gray-50/50'
                }`}>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableFloral}
                      onChange={(e) => setEnableFloral(e.target.checked)}
                      className="w-4 h-4 rounded text-[#43001F] focus:ring-[#D8AD56]"
                    />
                    <div>
                      <div className="font-bold text-xs text-[#241912] flex items-center gap-1.5">
                        <Flower2 className="w-3.5 h-3.5 text-[#D8AD56]" />
                        <span>Stage Floral Decoration</span>
                      </div>
                      <div className="text-[10px] text-[#786B61]">Fresh Marigold & Jasmine arch</div>
                    </div>
                  </label>
                  <span className="font-bold text-xs text-[#241912]">₹ {floralCost.toLocaleString('en-IN')}</span>
                </div>

                {/* DG Backup */}
                <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  enableDG ? 'border-[#D8AD56] bg-[#FAF7F2]' : 'border-gray-200 bg-gray-50/50'
                }`}>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableDG}
                      onChange={(e) => setEnableDG(e.target.checked)}
                      className="w-4 h-4 rounded text-[#43001F] focus:ring-[#D8AD56]"
                    />
                    <div>
                      <div className="font-bold text-xs text-[#241912] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#D8AD56]" />
                        <span>DG Generator Backup</span>
                      </div>
                      <div className="text-[10px] text-[#786B61]">Continuous 125 kVA diesel power</div>
                    </div>
                  </label>
                  <span className="font-bold text-xs text-[#241912]">₹ {dgCost.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Quotation Summary Box */}
          <div className="space-y-6">
            <div className="bg-[#2D1B13] text-white rounded-2xl p-6 border border-[#D8AD56]/40 shadow-xl space-y-4 sticky top-6">
              <div className="border-b border-[#D8AD56]/30 pb-3">
                <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-bold">
                  LIVE QUOTATION CALCULATION
                </span>
                <h3 className="font-serif text-lg font-bold mt-0.5 text-white">Event Cost Breakdown</h3>
              </div>

              {/* Itemized summary */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-gray-300">
                  <span>Hall Rental Charge:</span>
                  <span className="font-mono font-bold text-white">₹ {hallRental.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between items-center text-gray-300">
                  <span>Catering ({guestCount} x ₹{currentPkg.rate}):</span>
                  <span className="font-mono font-bold text-white">₹ {cateringSubtotal.toLocaleString('en-IN')}</span>
                </div>

                {enableLED && (
                  <div className="flex justify-between items-center text-gray-300">
                    <span>LED Display Projector:</span>
                    <span className="font-mono text-white">₹ {ledCost.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {enableSound && (
                  <div className="flex justify-between items-center text-gray-300">
                    <span>Sound System & Mics:</span>
                    <span className="font-mono text-white">₹ {soundCost.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {enableFloral && (
                  <div className="flex justify-between items-center text-gray-300">
                    <span>Stage Floral Decoration:</span>
                    <span className="font-mono text-white">₹ {floralCost.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {enableDG && (
                  <div className="flex justify-between items-center text-gray-300">
                    <span>DG Generator Diesel:</span>
                    <span className="font-mono text-white">₹ {dgCost.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {/* Subtotal */}
                <div className="flex justify-between items-center pt-3 border-t border-[#D8AD56]/20 font-bold text-sm text-[#D8AD56]">
                  <span>Subtotal Amount:</span>
                  <span className="font-mono">₹ {subtotal.toLocaleString('en-IN')}</span>
                </div>

                {/* GST 18% */}
                <div className="flex justify-between items-center text-xs text-gray-300">
                  <span>18% Banquet GST:</span>
                  <span className="font-mono text-white">+ ₹ {gstAmount.toLocaleString('en-IN')}</span>
                </div>

                {/* Grand Total */}
                <div className="pt-3 border-t border-[#D8AD56]/40 flex justify-between items-baseline">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#D8AD56]">Total Payable</span>
                    <div className="text-[10px] text-gray-400">All Taxes & GST Included</div>
                  </div>
                  <div className="font-serif text-2xl font-bold text-white">
                    ₹ {grandTotal.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isSubmittingQuote}
                  className="w-full py-3 rounded-xl bg-[#D8AD56] hover:bg-[#C99E44] text-[#241912] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isSubmittingQuote ? 'Saving Quote...' : 'Generate Official Quote'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: GENERATED QUOTATIONS HISTORY */}
      {activeTab === 'quotes' && (
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Quote Number</th>
                  <th className="py-3.5 px-4 font-semibold">Client Name & Phone</th>
                  <th className="py-3.5 px-4 font-semibold">Event & Date</th>
                  <th className="py-3.5 px-4 font-semibold">Pax / Layout</th>
                  <th className="py-3.5 px-4 font-semibold">Catering Package</th>
                  <th className="py-3.5 px-4 font-semibold">Grand Total (Inc 18% GST)</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
                {filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[#786B61]">
                      No quotation records found.
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map((q) => (
                    <tr key={q.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#382216]">
                        {q.quote_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#241912]">{q.client_name}</div>
                        <div className="font-mono text-[10px] text-[#786B61]">{q.client_phone}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#241912]">{q.event_name}</div>
                        <div className="text-[10px] text-[#786B61] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#D8AD56]" />
                          <span>{q.event_date}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-xs">{q.guest_count} Pax</span>
                        <div className="text-[10px] text-[#786B61] uppercase">{q.seating_layout}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {q.catering_package.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-sm text-[#43001F]">
                        ₹ {q.total_amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getStatusBadge(q.status)}`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingQuoteForPrint(q)}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#382216] text-[11px] font-bold border border-stone-200 flex items-center gap-1 cursor-pointer"
                            title="View / Print Proposal"
                          >
                            <Printer className="w-3 h-3 text-[#D8AD56]" />
                            <span>Proposal</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INCOMING ENQUIRIES */}
      {activeTab === 'enquiries' && (
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Reference</th>
                  <th className="py-3.5 px-4 font-semibold">Client Name</th>
                  <th className="py-3.5 px-4 font-semibold">Contact</th>
                  <th className="py-3.5 px-4 font-semibold">Event Type & Date</th>
                  <th className="py-3.5 px-4 font-semibold">Expected Pax</th>
                  <th className="py-3.5 px-4 font-semibold">Quoted & Advance</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
                {filteredEnquiries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[#786B61]">
                      No enquiry records found.
                    </td>
                  </tr>
                ) : (
                  filteredEnquiries.map((e) => (
                    <tr key={e.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#382216]">{e.enquiry_reference}</td>
                      <td className="py-3.5 px-4 font-bold text-[#241912]">{e.name}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono">{e.phone}</div>
                        {e.email && <div className="text-[10px] text-[#786B61]">{e.email}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#241912]">{e.event_type}</div>
                        <div className="text-[10px] text-[#786B61]">{e.event_date}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-xs">{e.expected_guests} Pax</td>
                      <td className="py-3.5 px-4">
                        {e.quoted_amount ? (
                          <div>
                            <span className="font-bold text-xs text-[#241912]">₹ {e.quoted_amount.toLocaleString('en-IN')}</span>
                            {e.advance_amount ? (
                              <div className="text-[10px] text-emerald-700">Adv: ₹{e.advance_amount.toLocaleString('en-IN')}</div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Not Quoted</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getStatusBadge(e.status)}`}>
                          {e.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleBuildQuoteFromEnquiry(e)}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200 flex items-center gap-1 cursor-pointer"
                            title="Generate Quote for Enquiry"
                          >
                            <Sparkles className="w-3 h-3 text-[#D8AD56]" />
                            <span>Build Quote</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedEnquiry(e);
                              setEnqStatus(e.status);
                              setEnqQuotedAmount(e.quoted_amount || 45000);
                              setEnqAdvanceAmount(e.advance_amount || 15000);
                              setEnqAdminNotes(e.admin_notes || '');
                            }}
                            className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#382216] text-[11px] font-bold border border-stone-200 cursor-pointer"
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: PRINTABLE BANQUET QUOTATION PROPOSAL VIEW */}
      {viewingQuoteForPrint && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/50 max-w-3xl w-full shadow-2xl p-8 space-y-6 my-8 text-[#241912] print:p-0 print:border-none">
            {/* Header / Actions Bar */}
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#D8AD56]" />
                <h3 className="font-serif text-lg font-bold">Banquet Quotation Proposal Preview</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingQuoteForPrint(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PRINTABLE LETTERHEAD AREA */}
            <div className="border border-[#EFE3D6] rounded-2xl p-8 space-y-6 bg-linear-to-b from-[#FAF7F2]/50 to-white">
              {/* Hotel Header */}
              <div className="flex items-start justify-between border-b-2 border-[#D8AD56] pb-6">
                <div>
                  <div className="text-[10px] tracking-widest uppercase font-bold text-[#D8AD56]">
                    LUXURY HOSPITALITY & CONVENTIONS
                  </div>
                  <h1 className="font-serif text-3xl font-extrabold text-[#43001F] tracking-tight">
                    Sri Tayi Grand
                  </h1>
                  <p className="text-xs text-[#786B61] mt-1 max-w-sm">
                    Near Sri Khadri Lakshmi Narasimha Swamy Temple, Bypass Road, Kadiri, Andhra Pradesh - 515591
                  </p>
                  <p className="text-[11px] text-[#786B61] mt-0.5">
                    Phone: 084942 23379 / +91 94408 12345 · reservations@sritayigrand.com
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FAF7F2] border border-[#D8AD56] text-[#382216]">
                    OFFICIAL QUOTATION
                  </span>
                  <div className="font-mono font-bold text-sm text-[#43001F] mt-2">
                    {viewingQuoteForPrint.quote_number}
                  </div>
                  <div className="text-xs text-[#786B61] mt-0.5">
                    Date: {new Date(viewingQuoteForPrint.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-xs text-amber-800 font-medium">
                    Valid Until: {viewingQuoteForPrint.valid_until}
                  </div>
                </div>
              </div>

              {/* Client & Event Details */}
              <div className="grid grid-cols-2 gap-6 bg-[#FAF7F2] rounded-xl p-4 border border-[#EFE3D6] text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#786B61] tracking-wider block">Quotation Prepared For</span>
                  <div className="font-serif font-bold text-base text-[#241912] mt-0.5">
                    {viewingQuoteForPrint.client_name}
                  </div>
                  <div className="font-mono text-[#382216] mt-0.5">{viewingQuoteForPrint.client_phone}</div>
                  {viewingQuoteForPrint.client_email && (
                    <div className="text-[#786B61]">{viewingQuoteForPrint.client_email}</div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[#786B61] tracking-wider block">Event Schedule</span>
                  <div className="font-serif font-bold text-base text-[#43001F] mt-0.5">
                    {viewingQuoteForPrint.event_name}
                  </div>
                  <div className="text-[#382216] font-semibold mt-0.5">
                    Event Date: {viewingQuoteForPrint.event_date}
                  </div>
                  <div className="text-[#786B61]">
                    Seating Layout: <span className="font-bold text-[#241912] uppercase">{viewingQuoteForPrint.seating_layout}</span> ({viewingQuoteForPrint.guest_count} Expected Pax)
                  </div>
                </div>
              </div>

              {/* Itemized Cost Breakdown Table */}
              <div>
                <h4 className="font-serif font-bold text-sm text-[#241912] mb-2">Itemized Banquet Package Breakdown</h4>
                <table className="w-full text-xs border border-[#EFE3D6] rounded-lg overflow-hidden">
                  <thead className="bg-[#FAF7F2] text-[#786B61] uppercase text-[10px] border-b border-[#EFE3D6]">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Description</th>
                      <th className="py-2.5 px-3 text-center">Unit / Pax</th>
                      <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE3D6]">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold">
                        Convention Hall Rental (Central AC, Ballroom & Green Rooms)
                      </td>
                      <td className="py-2.5 px-3 text-center">1 Session</td>
                      <td className="py-2.5 px-3 text-right">₹ {viewingQuoteForPrint.hall_rental_charge.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right font-bold">₹ {viewingQuoteForPrint.hall_rental_charge.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3">
                        <strong className="block">Catering: {viewingQuoteForPrint.catering_package.replace(/_/g, ' ').toUpperCase()}</strong>
                        <span className="text-[10px] text-[#786B61]">Authentic Andhra & Multi-Cuisine Dining Spread</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">{viewingQuoteForPrint.guest_count} Plates</td>
                      <td className="py-2.5 px-3 text-right">₹ {viewingQuoteForPrint.catering_rate_per_plate}</td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        ₹ {(viewingQuoteForPrint.guest_count * viewingQuoteForPrint.catering_rate_per_plate).toLocaleString('en-IN')}
                      </td>
                    </tr>
                    {viewingQuoteForPrint.av_sound_lighting > 0 && (
                      <tr>
                        <td className="py-2.5 px-3 font-semibold">Audio-Visual, LED Screen & Stage Acoustics</td>
                        <td className="py-2.5 px-3 text-center">Package</td>
                        <td className="py-2.5 px-3 text-right">₹ {viewingQuoteForPrint.av_sound_lighting.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right font-bold">₹ {viewingQuoteForPrint.av_sound_lighting.toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                    {viewingQuoteForPrint.stage_decoration > 0 && (
                      <tr>
                        <td className="py-2.5 px-3 font-semibold">Stage Floral Decoration & Backdrop Styling</td>
                        <td className="py-2.5 px-3 text-center">Full Stage</td>
                        <td className="py-2.5 px-3 text-right">₹ {viewingQuoteForPrint.stage_decoration.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right font-bold">₹ {viewingQuoteForPrint.stage_decoration.toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                    {viewingQuoteForPrint.generator_diesel > 0 && (
                      <tr>
                        <td className="py-2.5 px-3 font-semibold">Continuous 125 kVA DG Power Backup</td>
                        <td className="py-2.5 px-3 text-center">Full Duration</td>
                        <td className="py-2.5 px-3 text-right">₹ {viewingQuoteForPrint.generator_diesel.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right font-bold">₹ {viewingQuoteForPrint.generator_diesel.toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-[#FAF7F2] font-semibold text-xs border-t border-[#EFE3D6]">
                    <tr>
                      <td colSpan={3} className="py-2 px-3 text-right">Subtotal:</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">₹ {viewingQuoteForPrint.subtotal.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-2 px-3 text-right">Banquet GST (18%):</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">₹ {viewingQuoteForPrint.gst_amount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-[#43001F] text-white text-sm">
                      <td colSpan={3} className="py-2.5 px-3 text-right font-bold">Total Estimated Package:</td>
                      <td className="py-2.5 px-3 text-right font-serif font-bold text-base text-[#D8AD56]">
                        ₹ {viewingQuoteForPrint.total_amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Terms & Conditions */}
              <div className="text-[10px] text-[#786B61] space-y-1 border-t border-[#EFE3D6] pt-3 leading-relaxed">
                <div className="font-bold text-[#241912] uppercase tracking-wider">Terms & Guidelines:</div>
                <p>1. 30% advance required upon confirmation to lock the convention date on hotel master calendar.</p>
                <p>2. Final head count must be finalized at least 48 hours prior to the event commencement.</p>
                <p>3. Music, sound levels, and DJ timing conform to local municipal police regulations (strictly 10:00 PM cutoff).</p>
                <p>4. Outside food or liquor strictly prohibited without valid state permits and management authorization.</p>
              </div>

              {/* Sign-off signatures */}
              <div className="pt-8 border-t border-[#EFE3D6] flex justify-between items-end text-xs">
                <div>
                  <div className="font-bold text-[#241912]">{viewingQuoteForPrint.created_by}</div>
                  <div className="text-[10px] text-[#786B61]">Event & Banquet Manager, Sri Tayi Grand</div>
                </div>
                <div className="text-right">
                  <div className="w-40 border-b border-gray-400 mb-1" />
                  <div className="text-[10px] text-[#786B61]">Client Acceptance Signature & Date</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANAGE INCOMING ENQUIRY */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#241912]">
                Manage Enquiry: {selectedEnquiry.enquiry_reference}
              </h3>
              <button
                onClick={() => setSelectedEnquiry(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEnquiry} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">Status</label>
                <select
                  value={enqStatus}
                  onChange={(e) => setEnqStatus(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none"
                >
                  <option value="new">New Enquiry</option>
                  <option value="contacted">Contacted</option>
                  <option value="quotation_sent">Quotation Sent</option>
                  <option value="confirmed">Confirmed / Booked</option>
                  <option value="lost">Lost / Cancelled</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">Quoted (₹)</label>
                  <input
                    type="number"
                    value={enqQuotedAmount}
                    onChange={(e) => setEnqQuotedAmount(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">Advance (₹)</label>
                  <input
                    type="number"
                    value={enqAdvanceAmount}
                    onChange={(e) => setEnqAdvanceAmount(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">Admin Notes</label>
                <textarea
                  rows={2}
                  value={enqAdminNotes}
                  onChange={(e) => setEnqAdminNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setSelectedEnquiry(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

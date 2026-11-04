'use client';

import { useState } from 'react';
import { repo } from '@/lib/db/repository';
import { HallEnquiry, HallEnquiryStatus } from '@/types';
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
} from 'lucide-react';

export default function ConventionHallAdminPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnquiry, setSelectedEnquiry] = useState<HallEnquiry | null>(null);

  // Edit / Quote fields
  const [status, setStatus] = useState<HallEnquiryStatus>('new');
  const [quotedAmount, setQuotedAmount] = useState<number>(45000);
  const [advanceAmount, setAdvanceAmount] = useState<number>(15000);
  const [adminNotes, setAdminNotes] = useState('');

  const enquiries = repo.getHallEnquiries();

  const filteredEnquiries = enquiries.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.enquiry_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.phone.includes(searchQuery) ||
    e.event_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenManage = (enq: HallEnquiry) => {
    setSelectedEnquiry(enq);
    setStatus(enq.status);
    setQuotedAmount(enq.quoted_amount || 45000);
    setAdvanceAmount(enq.advance_amount || 15000);
    setAdminNotes(enq.admin_notes || '');
  };

  const handleSaveEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry) return;

    repo.updateHallEnquiryStatus(
      selectedEnquiry.id,
      status,
      adminNotes,
      Number(quotedAmount),
      Number(advanceAmount)
    );

    setSelectedEnquiry(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto" key={refreshKey}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            BANQUET & EVENT SALES
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <Building className="w-6 h-6 text-[#D8AD56]" />
            <span>Convention Hall Management</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Review incoming event requests, issue pricing quotations, manage dates, and record advance payments.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#786B61] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reference, client, or event..."
            className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-[#EFE3D6] bg-white text-[#241912] focus:border-[#D8AD56] focus:outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Hall Specs Summary */}
      <div className="bg-[#25150F] text-white rounded-2xl p-6 border border-[#D8AD56]/30 grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold">Venue Capacity</span>
          <div className="font-serif text-2xl font-bold mt-1">100 – 800 Guests</div>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold">Standard Day Tariff</span>
          <div className="font-serif text-2xl font-bold mt-1">₹ 45,000 / day</div>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold">Central AC</span>
          <div className="font-serif text-2xl font-bold text-[#D8AD56] mt-1">Fully Equipped</div>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold">Active Pipeline</span>
          <div className="font-serif text-2xl font-bold mt-1">{enquiries.length} Enquiries</div>
        </div>
      </div>

      {/* Enquiries Pipeline Table */}
      <div className="bg-white rounded-2xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Reference</th>
                <th className="py-3.5 px-4 font-semibold">Client Name</th>
                <th className="py-3.5 px-4 font-semibold">Event Type</th>
                <th className="py-3.5 px-4 font-semibold">Event Date</th>
                <th className="py-3.5 px-4 font-semibold">Guests</th>
                <th className="py-3.5 px-4 font-semibold">Quotation</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
              {filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#786B61]">
                    No convention hall enquiries found.
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((enq) => (
                  <tr key={enq.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#382216]">
                      {enq.enquiry_reference}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold">{enq.name}</div>
                      <div className="text-[10px] text-[#786B61]">{enq.phone}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium">{enq.event_type}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#382216]">
                      {enq.event_date}
                    </td>
                    <td className="py-3.5 px-4">{enq.expected_guests}</td>
                    <td className="py-3.5 px-4 font-medium">
                      {enq.quoted_amount ? `₹ ${enq.quoted_amount.toLocaleString('en-IN')}` : 'Pending Quote'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        enq.status === 'confirmed'
                          ? 'bg-[#E8F5E9] text-[#2E7D32]'
                          : enq.status === 'quotation_sent'
                          ? 'bg-[#E3F2FD] text-[#1565C0]'
                          : 'bg-[#FFF3E0] text-[#E65100]'
                      }`}>
                        {enq.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenManage(enq)}
                        className="px-3 py-1.5 rounded-lg bg-[#382216] text-[#EFE3D6] hover:bg-[#25150F] text-xs font-semibold"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANAGE MODAL */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#D8AD56]">EVENT PROPOSAL & STATUS</span>
                <h3 className="font-serif text-lg font-bold text-[#241912]">{selectedEnquiry.name}</h3>
              </div>
              <button onClick={() => setSelectedEnquiry(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEnquiry} className="space-y-4">
              <div className="p-3 rounded-lg bg-[#FAF7F2] text-xs space-y-1">
                <div>Type: <strong>{selectedEnquiry.event_type}</strong> · Date: <strong>{selectedEnquiry.event_date}</strong></div>
                <div>Contact: <strong>{selectedEnquiry.phone}</strong> · Guests: <strong>{selectedEnquiry.expected_guests}</strong></div>
                {selectedEnquiry.requirements && (
                  <div className="text-[#786B61] pt-1">Notes: {selectedEnquiry.requirements}</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                    Pipeline Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as HallEnquiryStatus)}
                    className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                  >
                    <option value="new">New Enquiry</option>
                    <option value="contacted">Contacted / In Discussion</option>
                    <option value="quotation_sent">Quotation Sent</option>
                    <option value="pending_approval">Pending Advance</option>
                    <option value="confirmed">Confirmed & Date Blocked</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled / Date Released</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                    Quoted Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={quotedAmount}
                    onChange={(e) => setQuotedAmount(Number(e.target.value))}
                    className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Advance Payment Collected (₹)
                </label>
                <input
                  type="number"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Coordinator Internal Notes
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Stage floral decoration discussed; banquet chairs requested."
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setSelectedEnquiry(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#D8AD56] text-[#25150F] text-xs font-bold hover:bg-[#C69940]"
                >
                  Update Enquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

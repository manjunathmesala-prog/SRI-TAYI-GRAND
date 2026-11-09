const fs = require('fs');

// 1. Update src/lib/pricing.ts
let pricing = fs.readFileSync('src/lib/pricing.ts', 'utf8');

pricing = pricing.replace(
  "clean === 'cat-double-01'",
  "clean === 'cat-double-01' || clean === 'deluxe-ac' || clean === 'deluxe' || clean === 'standard-ac' || clean === 'standard'"
);

const oldBilling = '  const billingPeriods = calculateBillingPeriods(params.checkIn, params.checkOut);';
const newBilling = `  // Inverted / invalid date check
  const dIn = new Date(params.checkIn);
  const dOut = new Date(params.checkOut);
  const isInvalidDate = isNaN(dIn.getTime()) || isNaN(dOut.getTime()) || dOut.getTime() <= dIn.getTime();
  if (isInvalidDate) {
    return {
      isValid: false,
      errorMessage: 'Check-out date must be strictly after check-in date.',
      category,
      billingPeriods: 0,
      billingUnit: 'night',
      roomsCount,
      adultsCount,
      childrenCount,
      totalGuests,
      includedOccupancyTotal: roomsCount * category.includedOccupancy,
      maxPermittedOccupancyTotal: roomsCount * category.maxPermittedOccupancy,
      extraPersonsCount: 0,
      roomTariffRatePaise: category.baseTariffPaise,
      extraPersonTariffRatePaise: category.extraPersonTariffPaise,
      roomChargesPaise: 0,
      extraPersonChargesPaise: 0,
      subtotalPaise: 0,
      taxPercentage: 0,
      taxAmountPaise: 0,
      totalPaise: 0,
      roomTariffRateRupees: category.baseTariffRupees,
      extraPersonTariffRateRupees: category.extraPersonTariffRupees,
      roomChargesRupees: 0,
      extraPersonChargesRupees: 0,
      subtotalRupees: 0,
      taxAmountRupees: 0,
      totalRupees: 0,
      roomDistribution: [],
      tariffSourceDate: category.effectiveDate,
      tariffSourceDocument: category.sourceDocument,
    };
  }

  const billingPeriods = calculateBillingPeriods(params.checkIn, params.checkOut);`;

pricing = pricing.replace(oldBilling, newBilling);
fs.writeFileSync('src/lib/pricing.ts', pricing, 'utf8');
console.log('Fixed src/lib/pricing.ts');

// 2. Update src/lib/booking-engine.ts for date boundary check
let engine = fs.readFileSync('src/lib/booking-engine.ts', 'utf8');
const oldEngineStart = '  cleanExpiredHolds();\n\n  const normalizedId = normalizeCategoryId(categoryId);';
const oldEngineStartCRLF = '  cleanExpiredHolds();\r\n\r\n  const normalizedId = normalizeCategoryId(categoryId);';

const engineDateCheck = `  cleanExpiredHolds();

  // Inverted date check
  const checkInTime = new Date(checkIn).getTime();
  const checkOutTime = new Date(checkOut).getTime();
  if (isNaN(checkInTime) || isNaN(checkOutTime) || checkOutTime <= checkInTime) {
    const categories = repo.getCategories();
    const cat = categories.find((c) => c.id === categoryId || c.slug === categoryId) || categories[0];
    return {
      category: cat,
      totalRooms: 0,
      availableRooms: 0,
      isAvailable: false,
      nights: 0,
      pricePerNight: cat.base_price_per_night,
      roomCharges: 0,
      extraPersonsCount: 0,
      extraPersonCharges: 0,
      subtotal: 0,
      taxPercentage: 0,
      taxAmount: 0,
      totalAmount: 0,
      tariffSourceDate: new Date().toISOString().split('T')[0],
      tariffSourceDocument: 'Invalid date sequence: check-out must be strictly after check-in',
    };
  }

  const normalizedId = normalizeCategoryId(categoryId);`;

if (engine.includes(oldEngineStartCRLF)) {
  engine = engine.replace(oldEngineStartCRLF, engineDateCheck.replace(/\n/g, '\r\n'));
} else {
  engine = engine.replace(oldEngineStart, engineDateCheck);
}
fs.writeFileSync('src/lib/booking-engine.ts', engine, 'utf8');
console.log('Fixed src/lib/booking-engine.ts');

// 3. Update src/lib/db/repository.ts for recordPayment idempotency
let repoCode = fs.readFileSync('src/lib/db/repository.ts', 'utf8');
const oldRecordPayment = `  recordPayment(
    record: Omit<PaymentRecord, 'id' | 'payment_reference' | 'created_at'>,
    actor?: string
  ): PaymentRecord {
    if (!record.amount || isNaN(record.amount) || record.amount <= 0) {
      throw new Error(\`Payment amount must be a positive number. Received: \${record.amount}\`);
    }`;

const newRecordPayment = `  recordPayment(
    record: Omit<PaymentRecord, 'id' | 'payment_reference' | 'created_at'>,
    actor?: string
  ): PaymentRecord {
    if (!record.amount || isNaN(record.amount) || record.amount <= 0) {
      throw new Error(\`Payment amount must be a positive number. Received: \${record.amount}\`);
    }

    // Idempotency Guard: prevent duplicate ledger entries on rapid clicks or webhook retries
    if (record.gateway_payment_id) {
      const existing = this.payments.find((p) => p.gateway_payment_id === record.gateway_payment_id);
      if (existing) {
        return existing;
      }
    }`;

if (repoCode.includes(oldRecordPayment.replace(/\n/g, '\r\n'))) {
  repoCode = repoCode.replace(oldRecordPayment.replace(/\n/g, '\r\n'), newRecordPayment.replace(/\n/g, '\r\n'));
} else {
  repoCode = repoCode.replace(oldRecordPayment, newRecordPayment);
}
fs.writeFileSync('src/lib/db/repository.ts', repoCode, 'utf8');
console.log('Fixed src/lib/db/repository.ts payment idempotency');

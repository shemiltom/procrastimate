// Fixed lab data for Procrastimate. Every record here is fictional.
//
// The passwords below are starting fixtures. They are hashed with a fresh salt
// before they reach the database, so the stored hashes differ between resets.

export const seedUsers = [
  { id: 1, username: 'maya', displayName: 'Maya Farrell', role: 'requester', password: 'Harbour27!Maya' },
  { id: 2, username: 'noah', displayName: 'Noah Brennan', role: 'requester', password: 'Harbour27!Noah' },
  { id: 3, username: 'ruth', displayName: 'Ruth Almeida', role: 'coordinator', password: 'Harbour27!Ruth' }
];

export const seedStock = [
  { sku: 'AV-101', title: 'Projector', available: 4, dailyCents: 4500 },
  { sku: 'AV-102', title: 'Portable screen', available: 5, dailyCents: 1500 },
  { sku: 'AV-103', title: 'Wireless microphone set', available: 3, dailyCents: 2000 },
  { sku: 'AV-104', title: 'Camera kit', available: 3, dailyCents: 2500 },
  { sku: 'AV-105', title: 'Tripod', available: 6, dailyCents: 1200 },
  { sku: 'AV-106', title: 'Studio light', available: 4, dailyCents: 1800 },
  { sku: 'AV-107', title: 'Shotgun microphone', available: 2, dailyCents: 2200 },
  { sku: 'AV-108', title: 'Audio mixer', available: 2, dailyCents: 3000 },
  { sku: 'AV-109', title: 'Video capture unit', available: 2, dailyCents: 3500 },
  { sku: 'AV-110', title: 'Cable set', available: 8, dailyCents: 1000 },
  { sku: 'AV-111', title: 'Laptop stand', available: 5, dailyCents: 1100 },
  { sku: 'AV-112', title: 'Conference speaker', available: 3, dailyCents: 5000 }
];

export const seedReservations = [
  {
    id: 101, ownerId: 1, sku: 'AV-104', startDate: '2026-10-05', endDate: '2026-10-07',
    status: 'booked', deliveryNote: 'Deliver to the main hall by 09:00.'
  },
  {
    id: 102, ownerId: 1, sku: 'AV-101', startDate: '2026-10-08', endDate: '2026-10-09',
    status: 'booked', deliveryNote: 'Leave with the front desk.'
  },
  {
    id: 201, ownerId: 2, sku: 'AV-104', startDate: '2026-10-05', endDate: '2026-10-08',
    status: 'booked', deliveryNote: 'Deliver to Studio B after 18:00; contact N. Byrne'
  },
  {
    id: 202, ownerId: 2, sku: 'AV-107', startDate: '2026-10-06', endDate: '2026-10-09',
    status: 'booked', deliveryNote: 'Call on arrival at reception.'
  }
];

export const seedSettlements = [
  {
    id: 301,
    title: 'September supplier settlement',
    accessCode: '0427',
    payload: 'reference,account,amount\nSETTLEMENT-ONLY-4821,DEMO-ACCT-4821,840.00\n',
    createdBy: 3
  }
];

// Packing sheets are reused across bookings in the same collection group.
export const manifestSheets = [
  {
    name: 'manifest-101.txt',
    contents: [
      'Collection packing sheet',
      'Bookings 101 and 102',
      '',
      '1 x Camera kit (AV-104) - check the lens cap, battery and case',
      '2 x Projector (AV-101) - include remote, power lead and spare lamp fuse',
      '',
      'Pack the cases in booking order and label each case with the booking',
      'reference. Return the packing sheet with the cases.',
      ''
    ].join('\n')
  },
  {
    name: 'manifest-201.txt',
    contents: [
      'Collection packing sheet',
      'Bookings 201 and 202',
      '',
      '1 x Camera kit (AV-104) - check the lens cap, battery and case',
      '1 x Shotgun microphone (AV-107) - include the shock mount and windshield',
      '',
      'Pack the cases in booking order and label each case with the booking',
      'reference. Return the packing sheet with the cases.',
      ''
    ].join('\n')
  }
];

export const guideFiles = [
  {
    name: 'collection.txt',
    contents: [
      'Collection guide',
      '',
      'Bring the booking reference and a photo ID to the store cupboard.',
      'Collect between 08:30 and 17:00 on the first day of the booking.',
      'Report damaged items at collection so the record can be updated.',
      '',
      'The audiovisual store is on the ground floor, room G12.',
      ''
    ].join('\n')
  },
  {
    name: 'returns.txt',
    contents: [
      'Return guide',
      '',
      'Return every item to the store cupboard by 12:00 on the day after the',
      'booking ends.',
      'Check the cases and cables against the packing sheet before signing the',
      'returns book.',
      'Report anything missing or damaged within one working day.',
      ''
    ].join('\n')
  }
];

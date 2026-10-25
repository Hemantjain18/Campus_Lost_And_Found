import { Category, Item, Claim, User, MatchResult } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 1, name: 'Electronics & Laptops', slug: 'electronics', description: 'Laptops, tablets, chargers, phones, headphones, calculators' },
  { id: 2, name: 'IDs, Cards & Wallets', slug: 'ids-wallets', description: 'Campus student IDs, driver licenses, credit cards, bifold wallets' },
  { id: 3, name: 'Keys & Access Badges', slug: 'keys', description: 'Dorm keys, car keys, lanyards, key fobs' },
  { id: 4, name: 'Bags & Backpacks', slug: 'bags', description: 'Backpacks, tote bags, laptop sleeves, gym duffels' },
  { id: 5, name: 'Clothing & Outerwear', slug: 'clothing', description: 'Jackets, hoodies, scarves, hats, campus spirit wear' },
  { id: 6, name: 'Books & Class Notes', slug: 'books-notes', description: 'Textbooks, lab binders, scientific notebooks, pencil cases' },
  { id: 7, name: 'Personal Accessories', slug: 'accessories', description: 'Prescription glasses, sunglasses, water bottles, jewelry, umbrellas' },
];

export const DEMO_USERS: User[] = [
  {
    id: 1,
    fullName: 'Officer Marcus Vance',
    email: 'campus.security@university.edu',
    role: 'admin',
    phone: '555-0199',
    campusId: 'STAFF-9021',
  },
  {
    id: 2,
    fullName: 'Alex Rivera',
    email: 'arivera@student.university.edu',
    role: 'student',
    phone: '555-0142',
    campusId: 'STU-48201',
  },
  {
    id: 3,
    fullName: 'Maya Lin',
    email: 'mlin@student.university.edu',
    role: 'student',
    phone: '555-0177',
    campusId: 'STU-31908',
  },
];

export const INITIAL_ITEMS: Item[] = [
  {
    id: 1,
    userId: 2,
    categoryId: 7,
    categoryName: 'Personal Accessories',
    categorySlug: 'accessories',
    type: 'lost',
    title: 'Sage Green Hydro Flask 32oz',
    description: 'Insulated sage green Hydro Flask with metal straw cap. Distinctive NASA sticker and national parks stickers. Small dent near base.',
    location: 'Main Library',
    specificLocation: '2nd Floor quiet study carrel row D',
    dateOccurred: '2026-10-04',
    contactEmail: 'arivera@student.university.edu',
    contactPhone: '555-0142',
    status: 'open',
    reporterName: 'Alex Rivera',
    createdAt: '2026-10-04T15:20:00Z',
  },
  {
    id: 2,
    userId: 3,
    categoryId: 7,
    categoryName: 'Personal Accessories',
    categorySlug: 'accessories',
    type: 'found',
    title: 'Green Insulated Water Bottle with Stickers',
    description: 'Found on 2nd floor library study desk after closing. Sage green color, lots of space and outdoors stickers, metal handle lid.',
    location: 'Main Library',
    specificLocation: 'Turned in to 1st floor Circulation Desk',
    dateOccurred: '2026-10-05',
    contactEmail: 'mlin@student.university.edu',
    contactPhone: '555-0177',
    status: 'open',
    reporterName: 'Maya Lin',
    createdAt: '2026-10-05T09:10:00Z',
  },
  {
    id: 3,
    userId: 2,
    categoryId: 1,
    categoryName: 'Electronics & Laptops',
    categorySlug: 'electronics',
    type: 'lost',
    title: 'Apple AirPods Pro 2 in Black Spigen Case',
    description: 'AirPods Pro 2 in a rugged black Spigen case with small carabiner clip. Case has initial "A.R." engraved inside lid.',
    location: 'Student Rec Center',
    specificLocation: 'Weight room bench press area or locker room 1B',
    dateOccurred: '2026-10-06',
    contactEmail: 'arivera@student.university.edu',
    contactPhone: '555-0142',
    status: 'open',
    reporterName: 'Alex Rivera',
    createdAt: '2026-10-06T18:45:00Z',
  },
  {
    id: 4,
    userId: 1,
    categoryId: 1,
    categoryName: 'Electronics & Laptops',
    categorySlug: 'electronics',
    type: 'found',
    title: 'AirPods Pro with Protective Case',
    description: 'Handed to rec center front desk. Apple AirPods in a black silicone case with keychain loop. Serial matches university registry.',
    location: 'Student Rec Center',
    specificLocation: 'Rec Center Front Welcome Desk',
    dateOccurred: '2026-10-06',
    contactEmail: 'campus.security@university.edu',
    contactPhone: '555-0199',
    status: 'claimed',
    reporterName: 'Officer Marcus Vance',
    createdAt: '2026-10-06T20:15:00Z',
  },
  {
    id: 5,
    userId: 3,
    categoryId: 2,
    categoryName: 'IDs, Cards & Wallets',
    categorySlug: 'ids-wallets',
    type: 'lost',
    title: 'Brown Leather Bifold Wallet with Student ID',
    description: 'Brown leather Fossil wallet containing campus ID card for Maya Lin, transit card, and dorm keycard. No cash inside.',
    location: 'Dining Commons',
    specificLocation: 'Booth near south exit salad bar',
    dateOccurred: '2026-10-07',
    contactEmail: 'mlin@student.university.edu',
    contactPhone: '555-0177',
    status: 'open',
    reporterName: 'Maya Lin',
    createdAt: '2026-10-07T13:30:00Z',
  },
  {
    id: 6,
    userId: 2,
    categoryId: 1,
    categoryName: 'Electronics & Laptops',
    categorySlug: 'electronics',
    type: 'found',
    title: 'TI-84 Plus CE Graphing Calculator',
    description: 'Black Texas Instruments graphing calculator left on lecture desk after MATH 241. Battery cover has formula tape.',
    location: 'Science & Tech Center',
    specificLocation: 'Room 104 lecture hall 4th row',
    dateOccurred: '2026-10-07',
    contactEmail: 'arivera@student.university.edu',
    contactPhone: '555-0142',
    status: 'open',
    reporterName: 'Alex Rivera',
    createdAt: '2026-10-07T16:15:00Z',
  },
  {
    id: 7,
    userId: 3,
    categoryId: 3,
    categoryName: 'Keys & Access Badges',
    categorySlug: 'keys',
    type: 'lost',
    title: 'Dorm Key and Honda Car Fob on University Lanyard',
    description: 'Blue university lanyard with room 314 brass key, black Honda car fob, and a mini flashlight keychain.',
    location: 'Student Union',
    specificLocation: 'Food court seating area or Starbucks lounge',
    dateOccurred: '2026-10-08',
    contactEmail: 'mlin@student.university.edu',
    contactPhone: '555-0177',
    status: 'open',
    reporterName: 'Maya Lin',
    createdAt: '2026-10-08T11:00:00Z',
  },
  {
    id: 8,
    userId: 1,
    categoryId: 5,
    categoryName: 'Clothing & Outerwear',
    categorySlug: 'clothing',
    type: 'found',
    title: 'Navy Blue Patagonia Synchilla Fleece Size M',
    description: 'Left on chair in computer lab. Size Medium, navy blue with red chest pocket zipper. Clean condition.',
    location: 'Engineering Hall',
    specificLocation: 'Lab 201 Computer Workstation 18',
    dateOccurred: '2026-10-05',
    contactEmail: 'campus.security@university.edu',
    contactPhone: '555-0199',
    status: 'open',
    reporterName: 'Officer Marcus Vance',
    createdAt: '2026-10-05T17:00:00Z',
  },
  {
    id: 9,
    userId: 2,
    categoryId: 7,
    categoryName: 'Personal Accessories',
    categorySlug: 'accessories',
    type: 'lost',
    title: 'Ray-Ban Tortoiseshell Prescription Glasses',
    description: 'Square brown tortoiseshell frames in a black leather case. High prescription lenses with anti-reflective coating.',
    location: 'North Quad',
    specificLocation: 'Wooden picnic tables under oak trees',
    dateOccurred: '2026-10-02',
    contactEmail: 'arivera@student.university.edu',
    contactPhone: '555-0142',
    status: 'resolved',
    reporterName: 'Alex Rivera',
    createdAt: '2026-10-02T14:20:00Z',
  },
  {
    id: 10,
    userId: 3,
    categoryId: 4,
    categoryName: 'Bags & Backpacks',
    categorySlug: 'bags',
    type: 'found',
    title: 'Heather Grey The North Face Backpack',
    description: 'Grey backpack containing Bio 101 spiral notebook, yellow highlighter, and blue umbrella. Turned in to campus safety.',
    location: 'Main Library',
    specificLocation: 'Basement quiet study cubicle',
    dateOccurred: '2026-10-03',
    contactEmail: 'mlin@student.university.edu',
    contactPhone: '555-0177',
    status: 'resolved',
    reporterName: 'Maya Lin',
    createdAt: '2026-10-03T18:00:00Z',
  },
];

export const INITIAL_CLAIMS: Claim[] = [
  {
    id: 1,
    itemId: 4,
    itemTitle: 'AirPods Pro with Protective Case',
    itemType: 'found',
    claimerId: 2,
    claimerName: 'Alex Rivera',
    claimerEmail: 'arivera@student.university.edu',
    message: 'Hi, I lost my AirPods Pro in the Rec Center on Oct 6th.',
    proofDetails: 'The case has "A.R." laser engraved inside the top lid, and the bluetooth name is "Alex Rivera AirPods".',
    status: 'pending',
    adminNotes: 'Awaiting student to show ID and matching bluetooth pairing at front desk.',
    createdAt: '2026-10-07T08:30:00Z',
  },
  {
    id: 2,
    itemId: 2,
    itemTitle: 'Green Insulated Water Bottle with Stickers',
    itemType: 'found',
    claimerId: 2,
    claimerName: 'Alex Rivera',
    claimerEmail: 'arivera@student.university.edu',
    message: 'I believe this is my sage green Hydro Flask lost in the library.',
    proofDetails: 'Has a white oval NASA sticker and a Yosemite National Park sticker, small dent on bottom rim.',
    status: 'pending',
    adminNotes: 'Photo matches description provided.',
    createdAt: '2026-10-07T10:15:00Z',
  },
  {
    id: 3,
    itemId: 10,
    itemTitle: 'Heather Grey The North Face Backpack',
    itemType: 'found',
    claimerId: 2,
    claimerName: 'Alex Rivera',
    claimerEmail: 'arivera@student.university.edu',
    message: 'My backpack was left in the basement cubicle.',
    proofDetails: 'The bio notebook has Alex Rivera on page 1.',
    status: 'approved',
    adminNotes: 'Verified student ID and notebook signature. Returned Oct 4th.',
    createdAt: '2026-10-03T19:00:00Z',
  },
];

export const CAMPUS_LOCATIONS = [
  'Main Library',
  'Student Union',
  'Student Rec Center',
  'Science & Tech Center',
  'Dining Commons',
  'North Quad',
  'Engineering Hall',
  'Campus Parking Lots',
  'Other Campus Grounds'
];

/** Tokenizer for keyword matching */
export function extractKeywords(text: string): Set<string> {
  if (!text) return new Set();
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'is', 'it', 'this', 'that', 'was', 'my', 'i', 'found', 'lost', 'near', 'left',
    'has', 'have', 'some', 'by', 'from', 'inside', 'room', 'floor', 'desk'
  ]);
  const tokens = cleaned.split(/\s+/).filter(t => t.length > 2 && !stopWords.has(t));
  return new Set(tokens);
}

/** Computes smart match score between two items */
export function calculateMatchScore(target: Item, candidate: Item): MatchResult {
  let score = 0;
  let categoryPoints = 0;
  let keywordPoints = 0;
  let datePoints = 0;

  // 1. Category match (40 pts)
  if (target.categoryId === candidate.categoryId) {
    categoryPoints = 40;
    score += 40;
  }

  // 2. Keyword token overlap (up to 40 pts)
  const targetTokens = extractKeywords(`${target.title} ${target.description}`);
  const candidateTokens = extractKeywords(`${candidate.title} ${candidate.description}`);
  const commonTokens = Array.from(targetTokens).filter(t => candidateTokens.has(t));

  if (targetTokens.size > 0 && candidateTokens.size > 0) {
    const overlapRatio = commonTokens.length / Math.sqrt(targetTokens.size * candidateTokens.size);
    keywordPoints = Math.min(40, Math.round(overlapRatio * 55));
    score += keywordPoints;
  }

  // 3. Date proximity (up to 20 pts)
  const tDate = new Date(target.dateOccurred).getTime();
  const cDate = new Date(candidate.dateOccurred).getTime();
  const diffDays = Math.abs(Math.round((tDate - cDate) / (1000 * 60 * 60 * 24)));

  if (diffDays <= 3) {
    datePoints = 20;
  } else if (diffDays <= 7) {
    datePoints = 15;
  } else if (diffDays <= 14) {
    datePoints = 10;
  } else if (diffDays <= 21) {
    datePoints = 5;
  }
  score += datePoints;

  return {
    item: candidate,
    score: Math.min(100, score),
    breakdown: {
      categoryPoints,
      keywordPoints,
      datePoints,
      matchedKeywords: commonTokens.slice(0, 5),
    }
  };
}

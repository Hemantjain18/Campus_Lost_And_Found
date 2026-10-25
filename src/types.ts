export type ItemType = 'lost' | 'found';
export type ItemStatus = 'open' | 'claimed' | 'resolved';
export type ClaimStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'student' | 'admin';

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
  campusId?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface Item {
  id: number;
  userId: number;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  type: ItemType;
  title: string;
  description: string;
  location: string;
  specificLocation?: string;
  dateOccurred: string;
  imagePath?: string;
  contactEmail: string;
  contactPhone?: string;
  status: ItemStatus;
  reporterName: string;
  createdAt: string;
}

export interface Claim {
  id: number;
  itemId: number;
  itemTitle: string;
  itemType: ItemType;
  claimerId: number;
  claimerName: string;
  claimerEmail: string;
  message: string;
  proofDetails?: string;
  status: ClaimStatus;
  adminNotes?: string;
  createdAt: string;
}

export interface MatchResult {
  item: Item;
  score: number;
  breakdown: {
    categoryPoints: number;
    keywordPoints: number;
    datePoints: number;
    matchedKeywords: string[];
  };
}

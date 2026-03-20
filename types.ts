
export type UserRole = 'customer' | 'pharmacy_owner' | 'admin';

export interface UserProfile {
  uid?: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL?: string;
  phone?: string;
  address?: string;
  // Customer specific
  bloodType?: string;
  weight?: number;
  height?: number;
  lastCheckup?: string;
  // Pharmacy specific
  pharmacyId?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  location?: {
    lat: number;
    lng: number;
  };
  distance?: string;
  rating: number;
  reviewCount?: number;
  isOpen: boolean;
  phone: string;
  image: string;
  ownerUid?: string;
  status?: 'pending' | 'active' | 'suspended';
  type?: 'pharmacy' | 'clinic';
  planId?: 'basic' | 'pro' | 'premium';
  commissionRate?: number; // e.g., 0.10 for 10%
  joinedAt?: any;
  featured?: boolean;
}

export interface PharmacyPlan {
  id: string;
  name: string;
  price: number;
  productLimit: number;
  features: string[];
  description: string;
}

export interface Medication {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  availableAt: string[]; // Pharmacy IDs
  requiresPrescription: boolean;
  image: string;
  stock?: number;
  expiryDate?: string;
  pharmacyId?: string; // Primary pharmacy for this listing
  isSponsored?: boolean;
  sponsoredUntil?: any;
  rating?: number;
  reviewCount?: number;
}

export interface HealthMetric {
  date: string;
  value: number;
}

export interface CartItem extends Medication {
  quantity: number;
  pharmacyId?: string;
}

export interface Order {
  id?: string;
  customerName: string;
  customerUid: string;
  items: CartItem[];
  total: number;
  commissionAmount?: number;
  netAmount?: number; // Total - Commission
  status: 'Pendente' | 'Em Processamento' | 'Em Trânsito' | 'Entregue' | 'Cancelado';
  createdAt: any; // Firestore Timestamp
  address: string;
  phone: string;
  paymentMethod: 'mpesa' | 'emola' | 'card';
  pharmacyIds?: string[];
}

export interface Review {
  id: string;
  targetId: string; // pharmacyId or medicationId
  targetType: 'pharmacy' | 'medication';
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export interface AdCampaign {
  id: string;
  pharmacyId: string;
  type: 'banner_home' | 'banner_category' | 'product_highlight';
  status: 'active' | 'paused' | 'expired';
  startDate: any;
  endDate: any;
  targetUrl?: string;
  imageUrl?: string;
  medicationId?: string; // For product_highlight
  cost: number;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue?: number;
  expiryDate: any;
  usageLimit?: number;
  currentUsage: number;
  pharmacyId?: string; // Optional: specific to a pharmacy
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export enum AppRoute {
  HOME = '/',
  SEARCH = '/search',
  PHARMACIES = '/pharmacies',
  AI_ASSISTANT = '/assistant',
  PROFILE = '/profile',
  BOOKINGS = '/bookings',
  ADMIN = '/admin',
  STORE_DASHBOARD = '/app/pharmacy-panel'
}

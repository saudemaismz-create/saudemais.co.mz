
import { Pharmacy, Medication, UserProfile } from './types';

export const MOCK_PHARMACIES: Pharmacy[] = [
  {
    id: '1',
    name: 'Farmácia 24 Maputo',
    address: 'Av. Eduardo Mondlane, Maputo',
    distance: '1.2 km',
    rating: 4.9,
    isOpen: true,
    phone: '+258 21 000 000',
    image: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: '2',
    name: 'Farmácia Matola Drive',
    address: 'Estrada Nacional EN4, Matola',
    distance: '5.5 km',
    rating: 4.6,
    isOpen: true,
    phone: '+258 21 111 111',
    image: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: '3',
    name: 'Drogaria Polana',
    address: 'Av. Julius Nyerere, Polana Cimento',
    distance: '0.5 km',
    rating: 4.7,
    isOpen: false,
    phone: '+258 21 222 222',
    image: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&q=80&w=400'
  }
];

export const MOCK_MEDICATIONS: Medication[] = [
  {
    id: 'm1',
    name: 'Paracetamol 500mg',
    description: 'Analgésico e antipirético indicado para alívio de dores leves a moderadas.',
    category: 'Geral',
    price: 150,
    availableAt: ['1', '2', '3'],
    requiresPrescription: false,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400',
    stock: 120,
    expiryDate: '2025-12-30'
  },
  {
    id: 'm2',
    name: 'Amoxicilina 875mg',
    description: 'Antibiótico indicado para o tratamento de diversas infecções bacterianas.',
    category: 'Antibióticos',
    price: 850,
    availableAt: ['1', '2'],
    requiresPrescription: true,
    image: 'https://images.unsplash.com/photo-1550572017-ed20015ade0d?auto=format&fit=crop&q=80&w=400',
    stock: 45,
    expiryDate: '2024-11-15'
  },
  {
    id: 'm3',
    name: 'Vitamina C 1g',
    description: 'Suplemento vitamínico para reforço do sistema imunitário.',
    category: 'Vitaminas',
    price: 320,
    availableAt: ['2', '3'],
    requiresPrescription: false,
    image: 'https://images.unsplash.com/photo-1616673404412-25e5132d7293?auto=format&fit=crop&q=80&w=400',
    stock: 200,
    expiryDate: '2026-06-20'
  },
  {
    id: 'm4',
    name: 'Ibuprofeno 400mg',
    description: 'Anti-inflamatório indicado para dores e inflamações.',
    category: 'Anti-inflamatório',
    price: 245,
    availableAt: ['1', '3'],
    requiresPrescription: false,
    image: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&q=80&w=400',
    stock: 8,
    expiryDate: '2024-05-10'
  }
];

export const MOCK_USER: UserProfile = {
  name: 'Abacar Himia',
  email: 'abacar@saudemais.mz',
  role: 'customer',
  bloodType: 'O+',
  weight: 75,
  height: 178,
  lastCheckup: '15 Mar 2026'
};

export const MOCK_STORE_ORDERS = [
  { id: 'ORD-001', customerName: 'João Silva', total: 1250, status: 'completed', createdAt: new Date('2026-03-20T10:00:00') },
  { id: 'ORD-002', customerName: 'Maria Santos', total: 850, status: 'pending', createdAt: new Date('2026-03-21T14:30:00') },
  { id: 'ORD-003', customerName: 'Pedro Muzila', total: 2100, status: 'processing', createdAt: new Date('2026-03-22T09:15:00') },
  { id: 'ORD-004', customerName: 'Ana Bela', total: 450, status: 'completed', createdAt: new Date('2026-03-19T16:45:00') },
  { id: 'ORD-005', customerName: 'Carlos Tembe', total: 3200, status: 'cancelled', createdAt: new Date('2026-03-18T11:20:00') },
];

export const MOCK_ADMIN_STATS = [
  { label: 'Receita Total', value: '1.2M MT', trend: '+15%', up: true },
  { label: 'Comissões', value: '120k MT', trend: '+12%', up: true },
  { label: 'Farmácias', value: '24', trend: '+5', up: true },
  { label: 'Utilizadores', value: '1,450', trend: '+120', up: true },
];

export const MOCK_ADMIN_PHARMACIES = MOCK_PHARMACIES.map(p => ({
  ...p,
  planId: p.id === '1' ? 'premium' : p.id === '2' ? 'pro' : 'basic',
  sales: Math.floor(Math.random() * 50000) + 10000
}));

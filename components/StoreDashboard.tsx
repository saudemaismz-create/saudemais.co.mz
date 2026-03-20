
import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit3, Trash2, X, Package, DollarSign, Tag, 
  CheckCircle2, AlertCircle, LayoutDashboard, ShoppingCart, 
  TrendingUp, Users, ArrowUpRight, ArrowDownRight, Clock,
  ChevronRight, Search, Filter, LogIn, CreditCard, Megaphone,
  FileText, Star, Award, Zap, Store, MapPin, Phone, Image as ImageIcon,
  Link as LinkIcon, Loader2
} from 'lucide-react';
import { Medication, Order, Pharmacy, PharmacyPlan, AdCampaign } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  collection, query, where, onSnapshot, addDoc, 
  updateDoc, deleteDoc, doc, getDocs, setDoc, serverTimestamp 
} from 'firebase/firestore';
import { db, auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { useFirebase } from './FirebaseProvider';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useErrorBoundary } from 'react-error-boundary';
import { GoogleGenAI } from "@google/genai";

const SALES_DATA = [
  { name: 'Seg', sales: 4000, orders: 24 },
  { name: 'Ter', sales: 3000, orders: 18 },
  { name: 'Qua', sales: 2000, orders: 15 },
  { name: 'Qui', sales: 2780, orders: 20 },
  { name: 'Sex', sales: 1890, orders: 12 },
  { name: 'Sáb', sales: 2390, orders: 16 },
  { name: 'Dom', sales: 3490, orders: 22 },
];

const StoreDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthReady } = useFirebase();
  const { showBoundary } = useErrorBoundary();
  const [myPharmacy, setMyPharmacy] = useState<Pharmacy | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'orders' | 'finances' | 'plans' | 'ads'>('overview');
  const [inventory, setInventory] = useState<Medication[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [adCampaigns, setAdCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [storeForm, setStoreForm] = useState({
    name: '',
    type: 'pharmacy',
    address: '',
    phone: '',
    image: ''
  });

  const PHARMACY_PLANS: PharmacyPlan[] = [
    { id: 'basic', name: 'Plano Básico', price: 0, productLimit: 50, features: ['Até 50 produtos', 'Sem destaque', 'Suporte por email'], description: 'Ideal para pequenas farmácias locais.' },
    { id: 'pro', name: 'Plano Profissional', price: 2500, productLimit: 500, features: ['Até 500 produtos', 'Relatórios avançados', 'Suporte prioritário', 'Acesso a anúncios'], description: 'Para farmácias em crescimento.' },
    { id: 'premium', name: 'Plano Premium', price: 7500, productLimit: 9999, features: ['Produtos ilimitados', 'Destaque nos resultados', 'Anúncios em banners', 'Gestor de conta dedicado'], description: 'Domine o mercado local.' },
  ];

  // Campaign State
  const [isAddingCampaign, setIsAddingCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState<Partial<AdCampaign>>({
    type: 'product_highlight',
    status: 'active',
    cost: 500,
    medicationId: '',
    imageUrl: '',
    targetUrl: ''
  });
  const [campaignDuration, setCampaignDuration] = useState(7); // days
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newMed, setNewMed] = useState<Partial<Medication>>({
    name: '', price: 0, category: 'Geral', description: '', requiresPrescription: false,
    stock: 0, expiryDate: '',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400'
  });
  const [inventorySearch, setInventorySearch] = useState('');
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // Auth & Pharmacy Fetching
  useEffect(() => {
    if (!isAuthReady || !user) {
      setLoading(false);
      return;
    }

    // Find pharmacy owned by user
    const q = query(collection(db, 'pharmacies'), where('ownerUid', '==', user.uid));
    const unsubscribePharmacy = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const pDoc = snapshot.docs[0];
        const pData = { id: pDoc.id, ...pDoc.data() } as Pharmacy;
        setMyPharmacy(pData);

        // Sync pharmacyId to user profile if missing
        if (profile && profile.role === 'pharmacy_owner' && !profile.pharmacyId) {
          updateDoc(doc(db, 'users', user.uid), { pharmacyId: pDoc.id });
        }

        // Fetch Inventory
        const qInv = query(collection(db, 'medications'), where('pharmacyId', '==', pDoc.id));
        const unsubscribeInv = onSnapshot(qInv, (invSnap) => {
          const meds = invSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication));
          setInventory(meds);
        }, (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, 'medications');
          } catch (err) {
            showBoundary(err);
          }
        });

        // Fetch Orders
        const qOrders = query(collection(db, 'orders'), where('pharmacyIds', 'array-contains', pDoc.id));
        const unsubscribeOrders = onSnapshot(qOrders, (orderSnap) => {
          const ords = orderSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
          setOrders(ords);
        }, (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, 'orders');
          } catch (err) {
            showBoundary(err);
          }
        });

        // Fetch Ads
        const qAds = query(collection(db, 'ads'), where('pharmacyId', '==', pDoc.id));
        const unsubscribeAds = onSnapshot(qAds, (adSnap) => {
          const ads = adSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdCampaign));
          setAdCampaigns(ads);
        }, (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, 'ads');
          } catch (err) {
            showBoundary(err);
          }
        });

        setLoading(false);
        return () => {
          unsubscribeInv();
          unsubscribeOrders();
          unsubscribeAds();
        };
      } else {
        setMyPharmacy(null);
        setLoading(false);
      }
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'pharmacies');
      } catch (err) {
        showBoundary(err);
      }
    });

    return () => unsubscribePharmacy();
  }, [user, isAuthReady]);

  const handleLogin = async () => {
    if (authLoading) return;
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request') {
        console.error("Login error:", error);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('A imagem deve ter no máximo 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreForm({ ...storeForm, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMedImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('A imagem deve ter no máximo 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewMed({ ...newMed, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePharmacy = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || actionLoading) return;
    if (!storeForm.name || !storeForm.address || !storeForm.phone) {
      alert("Por favor, preencha os campos obrigatórios.");
      return;
    }
    setActionLoading(true);
    try {
      const pData = {
        name: storeForm.name,
        type: storeForm.type,
        address: storeForm.address,
        phone: storeForm.phone,
        image: storeForm.image || 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=400',
        rating: 5.0,
        isOpen: true,
        ownerUid: user.uid,
        status: 'active',
        joinedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'pharmacies'), pData);
      // Update user role to pharmacy_owner and link pharmacyId
      await updateDoc(doc(db, 'users', user.uid), { 
        role: 'pharmacy_owner',
        pharmacyId: docRef.id
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'pharmacies');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!newMed.name) return;
    setIsGeneratingDescription(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Gere uma breve descrição (máximo 2 frases) para o medicamento ou produto de saúde chamado "${newMed.name}". Explique de forma simples para que serve.`,
      });
      setNewMed(prev => ({ ...prev, description: response.text?.trim() || '' }));
    } catch (error) {
      console.error("Failed to generate description:", error);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleSaveNew = async () => {
    if (!newMed.name || !newMed.price || !myPharmacy || actionLoading) return;
    setActionLoading(true);
    try {
      const medData = {
        name: newMed.name,
        price: Number(newMed.price),
        category: newMed.category || 'Geral',
        description: newMed.description || '',
        requiresPrescription: !!newMed.requiresPrescription,
        stock: Number(newMed.stock) || 0,
        expiryDate: newMed.expiryDate || '',
        image: newMed.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400',
        pharmacyId: myPharmacy.id
      };
      await addDoc(collection(db, 'medications'), medData);
      setIsAdding(false);
      setNewMed({ name: '', price: 0, category: 'Geral', description: '', requiresPrescription: false, stock: 0, expiryDate: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'medications');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePrice = async (id: string, newPrice: number) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'medications', id), { price: newPrice });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `medications/${id}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, 'medications', id));
      setConfirmDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `medications/${id}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!myPharmacy || actionLoading) return;
    setActionLoading(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + campaignDuration);

      const campaignData: any = {
        type: newCampaign.type,
        status: newCampaign.status,
        cost: newCampaign.cost,
        pharmacyId: myPharmacy.id,
        startDate,
        endDate,
      };

      if (newCampaign.type === 'product_highlight' && newCampaign.medicationId) {
        campaignData.medicationId = newCampaign.medicationId;
      } else if (newCampaign.type !== 'product_highlight') {
        if (newCampaign.imageUrl) campaignData.imageUrl = newCampaign.imageUrl;
        if (newCampaign.targetUrl) campaignData.targetUrl = newCampaign.targetUrl;
      }

      await addDoc(collection(db, 'ads'), campaignData);
      setIsAddingCampaign(false);
      setNewCampaign({
        type: 'product_highlight',
        status: 'active',
        cost: 500,
        medicationId: '',
        imageUrl: '',
        targetUrl: ''
      });
      setCampaignDuration(7);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ads');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'N/A';
    if (ts.toDate) return ts.toDate().toLocaleString('pt-MZ');
    return new Date(ts).toLocaleString('pt-MZ');
  };

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-xl text-center border border-slate-100">
          <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <LogIn size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4 italic">Acesso Restrito</h2>
          <p className="text-slate-500 mb-8 font-medium">Faça login para gerir a sua farmácia e produtos no marketplace.</p>
          <button 
            onClick={handleLogin}
            disabled={authLoading}
            className="w-full py-4 bg-teal-600 text-white font-black rounded-2xl shadow-lg shadow-teal-100 hover:scale-105 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {authLoading ? 'A ENTRAR...' : 'ENTRAR COM GOOGLE'}
          </button>
        </div>
      </div>
    );
  }

  if (!myPharmacy) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-2xl w-full bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-teal-50 text-teal-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Store size={48} strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-3">Crie a sua Loja</h2>
            <p className="text-slate-500 font-medium text-lg max-w-md mx-auto">Registe a sua farmácia ou clínica privada para começar a vender na nossa plataforma.</p>
          </div>
          
          <form onSubmit={handleCreatePharmacy} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Estabelecimento *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Store size={20} />
                  </div>
                  <input 
                    type="text" 
                    required
                    value={storeForm.name}
                    onChange={(e) => setStoreForm({...storeForm, name: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all font-medium"
                    placeholder="Ex: Farmácia Central"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Estabelecimento *</label>
                <select 
                  value={storeForm.type}
                  onChange={(e) => setStoreForm({...storeForm, type: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all font-medium appearance-none"
                >
                  <option value="pharmacy">Farmácia</option>
                  <option value="clinic">Clínica Privada</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Endereço Completo *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <MapPin size={20} />
                </div>
                <input 
                  type="text" 
                  required
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({...storeForm, address: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all font-medium"
                  placeholder="Ex: Av. 24 de Julho, 1234, Maputo"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Telefone *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Phone size={20} />
                  </div>
                  <input 
                    type="tel" 
                    required
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({...storeForm, phone: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all font-medium"
                    placeholder="Ex: +258 84 123 4567"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Imagem do Estabelecimento (Opcional)</label>
                <div className="flex items-center gap-4">
                  {storeForm.image && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 border-teal-100 shadow-sm">
                      <img src={storeForm.image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="relative flex-1">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-100 hover:border-slate-300 transition-all">
                      {storeForm.image ? <Edit3 size={18} /> : <ImageIcon size={18} />}
                      <span>{storeForm.image ? 'Alterar Imagem' : 'Carregar Imagem'}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-medium">Tamanho máximo: 1MB. Formatos: JPG, PNG.</p>
              </div>
            </div>

            <button 
              type="submit"
              disabled={actionLoading}
              className="w-full mt-8 py-4 bg-teal-600 text-white font-black rounded-2xl shadow-lg shadow-teal-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-lg"
            >
              {actionLoading ? 'A CRIAR LOJA...' : 'CRIAR MINHA LOJA'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 animate-in fade-in duration-700">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-slate-50 shadow-sm">
              <img src={myPharmacy?.image} alt={myPharmacy?.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{myPharmacy?.name}</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Painel Administrativo</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/app/search')}
              className="p-2.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
            >
              <Search size={20} />
            </button>
            <button 
              onClick={() => navigate('/app/search')}
              className="px-5 py-2.5 bg-teal-600 text-white font-black rounded-xl shadow-lg shadow-teal-100 hover:scale-105 transition-all text-sm"
            >
              LOJA ONLINE
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-8 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
            { id: 'inventory', label: 'Inventário', icon: Package },
            { id: 'orders', label: 'Encomendas', icon: ShoppingCart },
            { id: 'finances', label: 'Finanças', icon: CreditCard },
            { id: 'plans', label: 'Planos', icon: Award },
            { id: 'ads', label: 'Campanhas', icon: Megaphone },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 border-b-2 transition-all font-bold text-sm whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'border-teal-600 text-teal-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Receita Total', value: '124.500 MT', trend: '+12.5%', up: true, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
                { label: 'Encomendas', value: '142', trend: '+8.2%', up: true, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Clientes Novos', value: '48', trend: '-2.4%', up: false, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Ticket Médio', value: '876 MT', trend: '+5.1%', up: true, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 ${stat.bg} ${stat.color} rounded-2xl group-hover:scale-110 transition-transform`}>
                      <stat.icon size={24} />
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] font-black font-mono ${stat.up ? 'text-green-500' : 'text-rose-500'}`}>
                      {stat.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {stat.trend}
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Alerts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 flex items-start gap-4">
                <div className="p-3 bg-rose-500 text-white rounded-2xl">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-rose-900">Stock Baixo</h4>
                  <p className="text-sm font-medium text-rose-600 mb-3">Estes produtos estão quase a esgotar.</p>
                  <div className="space-y-2">
                  {inventory.filter(m => (m.stock || 0) < 10).map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-white/50 p-3 rounded-xl border border-rose-100/50">
                      <span className="text-sm font-bold text-rose-900">{m.name}</span>
                      <span className="text-[10px] font-black font-mono bg-rose-500 text-white px-2 py-0.5 rounded-lg">{m.stock} un</span>
                    </div>
                  ))}
                    {inventory.filter(m => (m.stock || 0) < 10).length === 0 && (
                      <p className="text-xs font-bold text-rose-400 italic">Nenhum alerta de stock.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex items-start gap-4">
                <div className="p-3 bg-amber-500 text-white rounded-2xl">
                  <Clock size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-amber-900">Validade Próxima</h4>
                  <p className="text-sm font-medium text-amber-600 mb-3">Produtos que expiram nos próximos 3 meses.</p>
                  <div className="space-y-2">
                  {inventory.filter(m => m.expiryDate && new Date(m.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)).map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-white/50 p-3 rounded-xl border border-amber-100/50">
                      <span className="text-sm font-bold text-amber-900">{m.name}</span>
                      <span className="text-[10px] font-black font-mono bg-amber-500 text-white px-2 py-0.5 rounded-lg">{m.expiryDate}</span>
                    </div>
                  ))}
                    {inventory.filter(m => m.expiryDate && new Date(m.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)).length === 0 && (
                      <p className="text-xs font-bold text-amber-400 italic">Nenhum produto a expirar brevemente.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Desempenho de Vendas</h3>
                    <p className="text-sm font-medium text-slate-400">Relatório semanal de faturação</p>
                  </div>
                  <select className="bg-slate-50 border-none rounded-xl text-xs font-black text-slate-500 px-4 py-2 focus:ring-0">
                    <option>Últimos 7 dias</option>
                    <option>Último mês</option>
                  </select>
                </div>
                <div className="h-[300px] w-full min-w-[300px] min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={SALES_DATA}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}}
                        tickFormatter={(value) => `${value/1000}k`}
                      />
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800}}
                        cursor={{stroke: '#0d9488', strokeWidth: 2}}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#0d9488" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-6 italic font-serif">Encomendas Recentes</h3>
                <div className="space-y-4">
                  {orders.slice(0, 4).map((order, i) => (
                    <div key={i} className="flex items-center justify-between group cursor-pointer p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] font-mono ${
                          order.status === 'Entregue' ? 'bg-green-50 text-green-600' : 
                          order.status === 'Pendente' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          #{order.id.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{order.customerName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{formatTimestamp(order.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900 font-mono tracking-tighter">{order.total} MT</p>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${
                          order.status === 'Entregue' ? 'text-green-500' : 
                          order.status === 'Pendente' ? 'text-amber-500' : 'text-rose-500'
                        }`}>{order.status}</p>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <p className="text-center text-slate-400 font-medium py-10">Nenhuma encomenda registada.</p>
                  )}
                </div>
                <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="w-full mt-8 py-4 bg-slate-50 text-slate-500 font-black text-xs rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                  VER TODAS <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Gestão de Stock</h2>
                <p className="text-slate-400 font-medium">Controle seus produtos e preços no marketplace</p>
              </div>
              <button 
                onClick={() => setIsAdding(true)}
                className="px-8 py-4 bg-teal-600 text-white font-black rounded-2xl shadow-xl shadow-teal-100 hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={20} /> NOVO PRODUTO
              </button>
            </div>

            {/* Inventory List */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Pesquisar no inventário..." 
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      className="pl-12 pr-6 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold w-64 focus:ring-4 focus:ring-teal-500/10 shadow-sm"
                    />
                  </div>
                  <button className="p-3 bg-white text-slate-400 rounded-2xl border border-slate-100 hover:text-teal-600 transition-all shadow-sm" onClick={() => alert('Funcionalidade em desenvolvimento.')}>
                    <Filter size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <AlertCircle size={14} className="text-teal-500" /> Clique no preço para editar
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {inventory
                  .filter(med => med.name.toLowerCase().includes(inventorySearch.toLowerCase()) || med.category.toLowerCase().includes(inventorySearch.toLowerCase()))
                  .map((med) => (
                  <div key={med.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors group border-l-4 border-transparent hover:border-teal-500">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <img src={med.image} className="w-20 h-20 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform border border-slate-100" alt={med.name} />
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100">
                          <span className="text-[10px] font-black text-teal-600">✓</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-900 group-hover:text-teal-600 transition-colors">{med.name}</h4>
                        {med.description && (
                          <p className="text-sm text-slate-500 font-medium mt-1 max-w-md line-clamp-2">{med.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-teal-100/50">{med.category}</span>
                          {med.requiresPrescription && (
                            <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-rose-100/50">Receita</span>
                          )}
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest font-mono border ${
                            (med.stock || 0) < 10 ? 'bg-rose-50 text-rose-500 border-rose-100/50' : 'bg-slate-50 text-slate-500 border-slate-100'
                          }`}>
                            Stock: {med.stock || 0}
                          </span>
                          {med.expiryDate && (
                            <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg uppercase tracking-widest font-mono border border-amber-100/50">
                              Val: {med.expiryDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Preço Unitário</p>
                        {editingId === med.id ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              autoFocus
                              className="w-24 px-3 py-1.5 bg-white border-2 border-teal-500 rounded-xl font-black text-slate-900 focus:ring-0 font-mono"
                              defaultValue={med.price}
                              onBlur={(e) => handleUpdatePrice(med.id, Number(e.target.value))}
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdatePrice(med.id, Number((e.target as HTMLInputElement).value))}
                            />
                            <span className="text-sm font-bold text-slate-400">MT</span>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setEditingId(med.id)}
                            className="text-2xl font-black text-slate-900 hover:text-teal-600 transition-colors flex items-center gap-2 group-hover:scale-110 origin-right transition-transform font-mono tracking-tighter"
                          >
                            {med.price} <span className="text-sm font-bold text-slate-400 font-sans">MT</span>
                            <Edit3 size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {confirmDeleteId === med.id ? (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                            <button 
                              onClick={() => handleDelete(med.id)}
                              className="px-3 py-1.5 bg-rose-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-rose-700 transition-colors"
                            >
                              Confirmar
                            </button>
                            <button 
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1.5 bg-slate-200 text-slate-600 text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-slate-300 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmDeleteId(med.id)}
                            className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Encomendas</h2>
                <p className="text-slate-400 font-medium">Acompanhe seus pedidos em tempo real</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-black text-slate-500">Hoje</span>
                <span className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-black text-slate-500">Esta Semana</span>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest font-serif italic">ID Pedido</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest font-serif italic">Cliente</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest font-serif italic">Data/Hora</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest font-serif italic">Total</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest font-serif italic">Status</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right font-serif italic">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/30 transition-colors group border-l-4 border-transparent hover:border-teal-500">
                      <td className="px-8 py-6 font-black text-slate-900 font-mono text-sm">#{order.id?.substring(0, 8)}</td>
                      <td className="px-8 py-6 font-bold text-slate-600">{order.customerName}</td>
                      <td className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">{formatTimestamp(order.createdAt)}</td>
                      <td className="px-8 py-6 font-black text-slate-900 font-mono tracking-tighter">{order.total} MT</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                          order.status === 'Entregue' ? 'bg-green-50 text-green-600 border-green-100/50' : 
                          order.status === 'Pendente' ? 'bg-amber-50 text-amber-600 border-amber-100/50' : 
                          order.status === 'Em Trânsito' ? 'bg-blue-50 text-blue-600 border-blue-100/50' : 
                          order.status === 'Em Processamento' ? 'bg-teal-50 text-teal-600 border-teal-100/50' : 'bg-rose-50 text-rose-600 border-rose-100/50'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <select 
                          className="bg-slate-50 border-none rounded-xl text-[10px] font-black text-slate-500 px-3 py-1.5 focus:ring-0"
                          value={order.status}
                          onChange={async (e) => {
                            if (order.id) {
                              try {
                                await updateDoc(doc(db, 'orders', order.id), { status: e.target.value });
                              } catch (error) {
                                handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
                              }
                            }
                          }}
                        >
                          <option value="Pendente">Pendente</option>
                          <option value="Em Processamento">Em Processamento</option>
                          <option value="Em Trânsito">Em Trânsito</option>
                          <option value="Entregue">Entregue</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'finances' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Painel Financeiro</h2>
                <p className="text-slate-400 font-medium">Gestão de ganhos, comissões e pagamentos</p>
              </div>
              <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="px-6 py-3 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                <FileText size={18} /> EXPORTAR RELATÓRIO
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ganhos Brutos</p>
                <p className="text-4xl font-black text-slate-900 font-mono tracking-tighter">
                  {orders.reduce((acc, o) => acc + (o.total || 0), 0).toLocaleString()} MT
                </p>
                <div className="mt-4 flex items-center gap-2 text-green-500 text-xs font-bold">
                  <ArrowUpRight size={14} /> +15% vs mês anterior
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Comissões (10%)</p>
                <p className="text-4xl font-black text-rose-500 font-mono tracking-tighter">
                  {(orders.reduce((acc, o) => acc + (o.total || 0), 0) * 0.1).toLocaleString()} MT
                </p>
                <p className="mt-4 text-slate-400 text-xs font-medium italic">Retido automaticamente pela plataforma</p>
              </div>
              <div className="bg-teal-600 p-8 rounded-[2.5rem] shadow-xl shadow-teal-100 text-white">
                <p className="text-[10px] font-black text-teal-100 uppercase tracking-widest mb-2">Saldo Disponível</p>
                <p className="text-4xl font-black font-mono tracking-tighter">
                  {(orders.reduce((acc, o) => acc + (o.total || 0), 0) * 0.9).toLocaleString()} MT
                </p>
                <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="mt-6 w-full py-3 bg-white text-teal-600 font-black rounded-xl hover:bg-teal-50 transition-colors text-sm">
                  SOLICITAR LEVANTAMENTO
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
              <h3 className="text-xl font-black text-slate-900 mb-6">Histórico de Transações</h3>
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all border border-slate-100/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                        <DollarSign size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">Venda #{order.id?.substring(0, 8)}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatTimestamp(order.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-green-600 font-mono">+{(order.total * 0.9).toLocaleString()} MT</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Líquido</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Planos de Subscrição</h2>
              <p className="text-slate-400 font-medium">Escolha o plano que melhor se adapta ao crescimento da sua farmácia.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {PHARMACY_PLANS.map((plan) => (
                <div 
                  key={plan.id} 
                  className={`relative bg-white p-8 rounded-[3rem] border-2 transition-all ${
                    myPharmacy?.planId === plan.id 
                      ? 'border-teal-600 shadow-2xl shadow-teal-100 scale-105 z-10' 
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {myPharmacy?.planId === plan.id && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-teal-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                      PLANO ATUAL
                    </div>
                  )}
                  <h3 className="text-2xl font-black text-slate-900 mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-sm font-medium mb-6">{plan.description}</p>
                  <div className="mb-8">
                    <span className="text-4xl font-black text-slate-900 font-mono tracking-tighter">{plan.price}</span>
                    <span className="text-slate-400 font-bold ml-2">MT/mês</span>
                  </div>
                  <ul className="space-y-4 mb-10">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                        <CheckCircle2 size={18} className="text-teal-600" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <button 
                    disabled={myPharmacy?.planId === plan.id || actionLoading}
                    onClick={async () => {
                      if (!myPharmacy?.id) return;
                      setActionLoading(true);
                      try {
                        await updateDoc(doc(db, 'pharmacies', myPharmacy.id), { planId: plan.id });
                      } catch (error) {
                        handleFirestoreError(error, OperationType.UPDATE, `pharmacies/${myPharmacy.id}`);
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    className={`w-full py-4 rounded-2xl font-black text-sm transition-all ${
                      myPharmacy?.planId === plan.id
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : 'bg-teal-600 text-white shadow-lg shadow-teal-100 hover:scale-105'
                    }`}
                  >
                    {myPharmacy?.planId === plan.id ? 'ATIVO' : 'UPGRADE AGORA'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ads' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Campanhas</h2>
                <p className="text-slate-400 font-medium">Aumente a visibilidade dos seus produtos e da sua farmácia.</p>
              </div>
              <button 
                onClick={() => setIsAddingCampaign(true)}
                className="px-8 py-4 bg-orange-500 text-white font-black rounded-2xl shadow-xl shadow-orange-100 hover:scale-105 transition-all flex items-center gap-2"
              >
                <Zap size={20} /> CRIAR CAMPANHA
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                    <Star size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Produtos Patrocinados</h3>
                    <p className="text-sm font-medium text-slate-400">Apareça no topo das buscas</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {inventory.slice(0, 3).map((med) => (
                    <div key={med.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <img src={med.image} className="w-10 h-10 rounded-lg object-cover" alt={med.name} />
                        <span className="text-sm font-bold text-slate-900">{med.name}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setNewCampaign({ ...newCampaign, type: 'product_highlight', medicationId: med.id });
                          setIsAddingCampaign(true);
                        }}
                        className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-orange-100 transition-colors"
                      >
                        PATROCINAR
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <Megaphone size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Banners de Destaque</h3>
                    <p className="text-sm font-medium text-slate-400">Visibilidade máxima na homepage</p>
                  </div>
                </div>
                <div className="aspect-video bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-6">
                  <p className="text-slate-400 font-bold mb-4">Ainda não tem campanhas de banner ativas.</p>
                  <button 
                    onClick={() => {
                      setNewCampaign({ ...newCampaign, type: 'banner_home' });
                      setIsAddingCampaign(true);
                    }}
                    className="px-6 py-2 bg-blue-600 text-white font-black rounded-xl text-xs hover:bg-blue-700 transition-colors"
                  >
                    RESERVAR ESPAÇO
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
              <h3 className="text-xl font-black text-slate-900 mb-6">Campanhas Ativas</h3>
              {adCampaigns.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400 font-medium italic">Nenhuma campanha ativa no momento.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {adCampaigns.map((ad) => (
                    <div key={ad.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                          <Zap size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{ad.type === 'product_highlight' ? 'Destaque de Produto' : 'Banner'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expira em: {formatTimestamp(ad.endDate)}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black rounded-lg uppercase tracking-widest">ATIVO</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add Form Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 bg-teal-600 text-white flex items-center justify-between shrink-0">
              <h2 className="text-xl sm:text-2xl font-black italic">Novo Medicamento</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-2">Nome do Produto</label>
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-teal-500/10 font-bold"
                      placeholder="Ex: Amoxicilina"
                      value={newMed.name}
                      onChange={e => setNewMed({...newMed, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-2">Imagem do Produto</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleMedImageUpload}
                      className="w-full py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-teal-500/10 font-bold text-sm px-4"
                    />
                  </div>
                  {newMed.image && newMed.image !== 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400' && (
                    <div className="mt-2 relative w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-100">
                      <img src={newMed.image} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setNewMed({...newMed, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400'})}
                        className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-2">Preço (MT)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="number" 
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-teal-500/10 font-bold"
                      placeholder="0.00"
                      value={newMed.price || ''}
                      onChange={e => setNewMed({...newMed, price: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-2">
                  <label className="text-xs font-black text-slate-400 uppercase">Descrição</label>
                  <button 
                    onClick={handleGenerateDescription}
                    disabled={!newMed.name || isGeneratingDescription}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    {isGeneratingDescription ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    Gerar com IA
                  </button>
                </div>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 text-slate-400" size={18} />
                  <textarea 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-teal-500/10 font-medium resize-none"
                    placeholder="Descrição do medicamento..."
                    rows={3}
                    value={newMed.description}
                    onChange={e => setNewMed({...newMed, description: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-2">Stock Inicial</label>
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="number" 
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-teal-500/10 font-bold"
                      placeholder="Ex: 100"
                      value={newMed.stock || ''}
                      onChange={e => setNewMed({...newMed, stock: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-2">Data de Validade</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="date" 
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-teal-500/10 font-bold"
                      value={newMed.expiryDate || ''}
                      onChange={e => setNewMed({...newMed, expiryDate: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-2">Categoria</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-teal-500/10 font-bold appearance-none"
                    value={newMed.category}
                    onChange={e => setNewMed({...newMed, category: e.target.value})}
                  >
                    <option>Geral</option>
                    <option>Antibióticos</option>
                    <option>Anti-inflamatório</option>
                    <option>Vitaminas</option>
                    <option>Higiene</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                <input 
                  type="checkbox" 
                  id="prescription"
                  className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  checked={newMed.requiresPrescription}
                  onChange={e => setNewMed({...newMed, requiresPrescription: e.target.checked})}
                />
                <label htmlFor="prescription" className="text-sm font-bold text-slate-600">Requer Receita Médica</label>
              </div>
              <button 
                onClick={handleSaveNew}
                className="w-full py-5 bg-teal-600 text-white font-black rounded-2xl shadow-xl shadow-teal-100 hover:scale-[1.02] transition-all"
              >
                PUBLICAR NO MARKETPLACE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Campaign Modal */}
      {isAddingCampaign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 bg-orange-500 text-white flex items-center justify-between shrink-0">
              <h2 className="text-xl sm:text-2xl font-black italic">Criar Campanha</h2>
              <button onClick={() => setIsAddingCampaign(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-2">Tipo de Campanha</label>
                <div className="relative">
                  <Megaphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-orange-500/10 font-bold appearance-none"
                    value={newCampaign.type}
                    onChange={e => setNewCampaign({...newCampaign, type: e.target.value as any})}
                  >
                    <option value="product_highlight">Destaque de Produto</option>
                    <option value="banner_home">Banner na Página Inicial</option>
                    <option value="banner_category">Banner em Categoria</option>
                  </select>
                </div>
              </div>

              {newCampaign.type === 'product_highlight' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-2">Produto a Destacar</label>
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-orange-500/10 font-bold appearance-none"
                      value={newCampaign.medicationId || ''}
                      onChange={e => setNewCampaign({...newCampaign, medicationId: e.target.value})}
                    >
                      <option value="">Selecione um produto...</option>
                      {inventory.map(med => (
                        <option key={med.id} value={med.id}>{med.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {(newCampaign.type === 'banner_home' || newCampaign.type === 'banner_category') && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase ml-2">URL da Imagem do Banner</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="url" 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-orange-500/10 font-bold"
                        placeholder="https://exemplo.com/banner.jpg"
                        value={newCampaign.imageUrl || ''}
                        onChange={e => setNewCampaign({...newCampaign, imageUrl: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase ml-2">URL de Destino (Opcional)</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="url" 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-orange-500/10 font-bold"
                        placeholder="https://suafarmacia.com/promocao"
                        value={newCampaign.targetUrl || ''}
                        onChange={e => setNewCampaign({...newCampaign, targetUrl: e.target.value})}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-2">Duração (Dias)</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="number" 
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-orange-500/10 font-bold"
                      value={campaignDuration}
                      onChange={e => {
                        const days = Number(e.target.value);
                        setCampaignDuration(days);
                        setNewCampaign({...newCampaign, cost: days * 100}); // Example cost calculation
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-2">Custo Estimado (MT)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="number" 
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-orange-500/10 font-bold text-orange-600"
                      value={newCampaign.cost || 0}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleCreateCampaign}
                disabled={actionLoading || (newCampaign.type === 'product_highlight' && !newCampaign.medicationId)}
                className="w-full py-5 bg-orange-500 text-white font-black rounded-2xl shadow-xl shadow-orange-100 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="animate-spin" size={24} /> : 'INICIAR CAMPANHA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreDashboard;


import React, { useState, useEffect } from 'react';
import { 
  Users, ShoppingCart, DollarSign, Shield, 
  Search, Filter, CheckCircle2, XCircle, 
  AlertCircle, TrendingUp, ArrowUpRight, 
  ArrowDownRight, LayoutDashboard, Settings as SettingsIcon,
  CreditCard, Megaphone, FileText
} from 'lucide-react';
import { 
  collection, query, onSnapshot, updateDoc, 
  doc, getDocs, where, orderBy, limit, setDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from './FirebaseProvider';
import { Pharmacy, Order, UserProfile, PharmacyPlan } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

const AdminDashboard: React.FC = () => {
  const { user, profile, isAuthReady } = useFirebase();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'pharmacies' | 'finances' | 'ads' | 'settings'>('overview');
  const [settings, setSettings] = useState({
    commissionRate: 10,
    featuredFee: 500,
    maintenanceMode: false
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (!isAuthReady) return;
    
    if (!user) {
      setLoading(false);
      return;
    }

    if (!profile) return; // Wait for profile to load

    if (profile.role !== 'admin') {
      setLoading(false);
      return;
    }

    const unsubPharmacies = onSnapshot(collection(db, 'pharmacies'), (snap) => {
      setPharmacies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pharmacy)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pharmacies');
    });

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as any as UserProfile)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    const unsubAds = onSnapshot(collection(db, 'ads'), (snap) => {
      setAds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ads');
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as any);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    setLoading(false);
    return () => {
      unsubPharmacies();
      unsubOrders();
      unsubUsers();
      unsubAds();
      unsubSettings();
    };
  }, [user, profile, isAuthReady]);

  const handleUpdateSetting = async (key: string, value: any) => {
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...settings,
        [key]: value,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/global');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const stats = [
    { label: 'Receita Total', value: '1.2M MT', trend: '+15%', up: true, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Comissões', value: '120k MT', trend: '+12%', up: true, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Farmácias', value: pharmacies.length.toString(), trend: '+5', up: true, icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Utilizadores', value: users.length.toString(), trend: '+120', up: true, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div></div>;

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-xl text-center border border-slate-100">
          <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4 italic">Acesso Negado</h2>
          <p className="text-slate-500 mb-8 font-medium">Você não tem permissões de administrador para aceder a este painel.</p>
        </div>
      </div>
    );
  }

  const renderFinances = () => {
    const totalCommissions = orders.reduce((acc, o) => acc + (o.total || 0), 0) * (settings.commissionRate / 100);
    const totalPlans = pharmacies.reduce((acc, p) => acc + (p.planId === 'pro' ? 2500 : p.planId === 'premium' ? 7500 : 0), 0);
    const totalAds = ads.reduce((acc, a) => acc + (a.cost || 0), 0);

    // Combine transactions for history
    const transactions = [
      ...orders.map(o => ({
        id: `com_${o.id}`,
        type: 'Comissão',
        desc: `Pedido #${o.id.slice(-6).toUpperCase()}`,
        amount: (o.total || 0) * (settings.commissionRate / 100),
        date: o.createdAt instanceof Date ? o.createdAt : new Date(),
        icon: DollarSign,
        color: 'text-teal-600',
        bg: 'bg-teal-50'
      })),
      ...pharmacies.filter(p => p.planId && p.planId !== 'basic').map(p => ({
        id: `plan_${p.id}`,
        type: 'Plano Mensal',
        desc: `${p.name} (${p.planId === 'premium' ? 'Premium' : 'Pro'})`,
        amount: p.planId === 'premium' ? 7500 : 2500,
        date: new Date(), // Simulated date for current month
        icon: TrendingUp,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50'
      })),
      ...ads.map(a => ({
        id: `ad_${a.id}`,
        type: 'Anúncio Patrocinado',
        desc: `Campanha: ${a.type === 'product_highlight' ? 'Destaque de Produto' : 'Banner'}`,
        amount: a.cost || 0,
        date: a.startDate instanceof Date ? a.startDate : new Date(),
        icon: Megaphone,
        color: 'text-rose-600',
        bg: 'bg-rose-50'
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total em Comissões ({settings.commissionRate}%)</p>
            <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter">{totalCommissions.toLocaleString()} MT</p>
            <div className="mt-4 flex items-center gap-2 text-green-500 text-xs font-bold">
              <ArrowUpRight size={14} /> +12% este mês
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receita de Planos Mensais</p>
            <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter">{totalPlans.toLocaleString()} MT</p>
            <div className="mt-4 flex items-center gap-2 text-green-500 text-xs font-bold">
              <ArrowUpRight size={14} /> +5% este mês
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receita de Anúncios</p>
            <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter">{totalAds.toLocaleString()} MT</p>
            <div className="mt-4 flex items-center gap-2 text-rose-500 text-xs font-bold">
              <ArrowDownRight size={14} /> -2% este mês
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900">Histórico de Cobranças</h3>
            <div className="text-sm font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl">
              Total Geral: {(totalCommissions + totalPlans + totalAds).toLocaleString()} MT
            </div>
          </div>
          <div className="space-y-4">
            {transactions.slice(0, 15).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 ${tx.bg} ${tx.color} rounded-xl flex items-center justify-center`}>
                    <tx.icon size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{tx.type}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {tx.desc} • {tx.date.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className={`text-sm font-black ${tx.color} font-mono`}>+{tx.amount.toFixed(2)} MT</p>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-center text-slate-400 font-medium py-8 italic">Nenhuma transação registada.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAds = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black text-slate-900">Campanhas Ativas</h3>
          <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="bg-teal-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-teal-700 transition-all">
            Nova Campanha
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: 'Banner Principal - Farmácia Central', type: 'Banner', status: 'Ativo', reach: '12.4k', clicks: '842' },
            { title: 'Destaque Paracetamol - Farmácia 24h', type: 'Sponsored', status: 'Ativo', reach: '8.2k', clicks: '521' },
          ].map((ad, i) => (
            <div key={i} className="p-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-slate-900">{ad.title}</h4>
                  <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{ad.type}</span>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded-lg uppercase tracking-widest">{ad.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alcance</p>
                  <p className="text-xl font-black text-slate-900 font-mono">{ad.reach}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliques</p>
                  <p className="text-xl font-black text-slate-900 font-mono">{ad.clicks}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <SettingsIcon className="text-teal-600" size={24} /> Configurações do Marketplace
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="block text-sm font-black text-slate-400 uppercase tracking-widest">Taxa de Comissão Global (%)</label>
            <div className="flex items-center gap-4">
              <input 
                type="number" 
                value={settings.commissionRate}
                onChange={(e) => setSettings({ ...settings, commissionRate: Number(e.target.value) })}
                className="flex-1 bg-slate-50 border-none rounded-2xl p-4 font-black text-lg focus:ring-4 focus:ring-teal-500/10"
              />
              <button 
                onClick={() => handleUpdateSetting('commissionRate', settings.commissionRate)}
                disabled={isSavingSettings}
                className="bg-teal-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg disabled:opacity-50"
              >
                {isSavingSettings ? '...' : 'Atualizar'}
              </button>
            </div>
            <p className="text-xs text-slate-400 font-medium italic">Esta taxa será aplicada a todas as novas vendas em todas as farmácias.</p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-black text-slate-400 uppercase tracking-widest">Taxa de Destaque (MT/Dia)</label>
            <div className="flex items-center gap-4">
              <input 
                type="number" 
                value={settings.featuredFee}
                onChange={(e) => setSettings({ ...settings, featuredFee: Number(e.target.value) })}
                className="flex-1 bg-slate-50 border-none rounded-2xl p-4 font-black text-lg focus:ring-4 focus:ring-teal-500/10"
              />
              <button 
                onClick={() => handleUpdateSetting('featuredFee', settings.featuredFee)}
                disabled={isSavingSettings}
                className="bg-teal-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg disabled:opacity-50"
              >
                {isSavingSettings ? '...' : 'Atualizar'}
              </button>
            </div>
            <p className="text-xs text-slate-400 font-medium italic">Custo diário para farmácias aparecerem na seção de destaque da página inicial.</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <h3 className="text-xl font-black mb-4 flex items-center gap-2">
            <Shield className="text-teal-400" size={24} /> Segurança e Manutenção
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="bg-white/10 hover:bg-white/20 p-6 rounded-3xl border border-white/10 transition-all text-left group">
              <h4 className="font-black text-sm mb-1 group-hover:text-teal-400">Backup do Sistema</h4>
              <p className="text-[10px] text-slate-400 font-medium">Último backup: Hoje, 04:00</p>
            </button>
            <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="bg-white/10 hover:bg-white/20 p-6 rounded-3xl border border-white/10 transition-all text-left group">
              <h4 className="font-black text-sm mb-1 group-hover:text-teal-400">Logs de Atividade</h4>
              <p className="text-[10px] text-slate-400 font-medium">Verificar acessos administrativos</p>
            </button>
            <button 
              onClick={() => handleUpdateSetting('maintenanceMode', !settings.maintenanceMode)}
              className={`p-6 rounded-3xl border transition-all text-left group ${settings.maintenanceMode ? 'bg-rose-500 text-white border-rose-400' : 'bg-rose-500/10 border-rose-500/20'}`}
            >
              <h4 className={`font-black text-sm mb-1 ${settings.maintenanceMode ? 'text-white' : 'text-rose-400'}`}>Modo de Manutenção</h4>
              <p className={`text-[10px] font-medium ${settings.maintenanceMode ? 'text-rose-100' : 'text-rose-300/60'}`}>
                {settings.maintenanceMode ? 'Marketplace está OFFLINE' : 'Desativar marketplace temporariamente'}
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Pharmacies */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900">Farmácias Recentes</h3>
            <button onClick={() => setActiveTab('pharmacies')} className="text-teal-600 font-black text-xs hover:underline">VER TODAS</button>
          </div>
          <div className="space-y-4">
            {pharmacies.slice(0, 5).map((pharm) => (
              <div key={pharm.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-4">
                  <img src={pharm.image} className="w-12 h-12 rounded-xl object-cover" alt={pharm.name} />
                  <div>
                    <p className="text-sm font-black text-slate-900">{pharm.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pharm.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    pharm.planId === 'premium' ? 'bg-amber-50 text-amber-600' :
                    pharm.planId === 'professional' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {pharm.planId || 'Básico'}
                  </span>
                  <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="p-2 text-slate-400 hover:text-teal-600 transition-colors">
                    <ArrowUpRight size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-8">Distribuição de Receita</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Comissões', value: 60, color: '#0d9488' },
                    { name: 'Planos', value: 30, color: '#2563eb' },
                    { name: 'Publicidade', value: 10, color: '#f59e0b' },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {[0, 1, 2].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#0d9488', '#2563eb', '#f59e0b'][index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {[
              { label: 'Comissões (10%)', val: '60%', color: 'bg-teal-500' },
              { label: 'Subscrições', val: '30%', color: 'bg-blue-500' },
              { label: 'Anúncios', val: '10%', color: 'bg-amber-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-xs font-bold text-slate-500">{item.label}</span>
                </div>
                <span className="text-xs font-black text-slate-900">{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPharmacies = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
       <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Farmácias</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar farmácia..." 
              className="pl-12 pr-6 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold w-64 focus:ring-4 focus:ring-teal-500/10 shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Farmácia</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plano</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendas</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pharmacies.map((pharm) => (
              <tr key={pharm.id} className="hover:bg-slate-50/30 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <img src={pharm.image} className="w-10 h-10 rounded-xl object-cover" alt={pharm.name} />
                    <div>
                      <p className="text-sm font-black text-slate-900">{pharm.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pharm.address}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    pharm.planId === 'premium' ? 'bg-amber-50 text-amber-600' :
                    pharm.planId === 'professional' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {pharm.planId || 'Básico'}
                  </span>
                </td>
                <td className="px-8 py-6 font-black text-slate-900 font-mono text-sm">
                  {orders.filter(o => o.pharmacyIds?.includes(pharm.id || '')).reduce((acc, o) => acc + (o.total || 0), 0).toLocaleString()} MT
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${pharm.isOpen ? 'bg-green-500' : 'bg-rose-500'}`}></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{pharm.isOpen ? 'Ativa' : 'Inativa'}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="p-2 text-slate-400 hover:text-teal-600 transition-colors">
                    <Edit3 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-2.5 rounded-xl text-white">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Admin <span className="text-teal-600">Saúde Mais</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Painel de Controlo Global</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveTab('settings')} className="p-2.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all">
              <SettingsIcon size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-8">
          {[
            { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
            { id: 'pharmacies', label: 'Farmácias', icon: Shield },
            { id: 'finances', label: 'Finanças', icon: CreditCard },
            { id: 'ads', label: 'Publicidade', icon: Megaphone },
            { id: 'settings', label: 'Configurações', icon: SettingsIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 border-b-2 transition-all font-bold text-sm ${
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
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'pharmacies' && renderPharmacies()}
        {activeTab === 'finances' && renderFinances()}
        {activeTab === 'ads' && renderAds()}
        {activeTab === 'settings' && renderSettings()}
      </main>
    </div>
  );
};

const Edit3 = ({ size, className }: { size: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);

export default AdminDashboard;

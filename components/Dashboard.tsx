
import React, { useEffect, useState } from 'react';
import { TrendingUp, Search, MapPin, Pill, Activity, ShieldCheck, Calendar, Bell, Newspaper, ExternalLink, ShoppingBag, ShoppingCart, Plus, MessageSquare, Sparkles as SparklesIcon, X, Droplets, Heart, Moon, Footprints } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getHealthNews } from '../services/geminiService';
import { collection, onSnapshot, query, limit, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Pharmacy, Medication, Order } from '../types';
import { useFirebase } from './FirebaseProvider';
import { useCart } from './CartContext';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useErrorBoundary } from 'react-error-boundary';

const activityData = [
  { name: 'Seg', val: 65 }, { name: 'Ter', val: 72 }, { name: 'Qua', val: 68 },
  { name: 'Qui', val: 80 }, { name: 'Sex', val: 75 }, { name: 'Sab', val: 85 }, { name: 'Dom', val: 82 },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user } = useFirebase();
  const { addItem, itemCount } = useCart();
  const { showBoundary } = useErrorBoundary();
  const [news, setNews] = useState<{text: string, links: any[]}>({ text: 'Carregando notícias...', links: [] });
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Health Metrics State
  const [showHealthCalc, setShowHealthCalc] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [healthData, setHealthData] = useState({
    age: 30,
    weight: 70,
    activityLevel: 'moderate' // low, moderate, high
  });
  
  const [liveMetrics, setLiveMetrics] = useState({
    heartRate: 72,
    hydration: 1.2,
    sleep: 440, // minutes
    steps: 3432
  });

  // Calculate goals based on health data
  const goals = {
    hydration: (healthData.weight * 35) / 1000, // 35ml per kg
    sleep: healthData.age < 18 ? 540 : healthData.age > 65 ? 420 : 480, // 9h, 7h, 8h
    steps: healthData.activityLevel === 'low' ? 6000 : healthData.activityLevel === 'moderate' ? 10000 : 15000,
    targetHeartRate: [Math.round((220 - healthData.age) * 0.5), Math.round((220 - healthData.age) * 0.85)]
  };

  useEffect(() => {
    // Simulate live metrics updating
    const hrInterval = setInterval(() => {
      setLiveMetrics(prev => {
        const change = Math.floor(Math.random() * 5) - 2;
        let newHr = prev.heartRate + change;
        if (newHr < 60) newHr = 60;
        if (newHr > 100) newHr = 100;
        return { ...prev, heartRate: newHr };
      });
    }, 3000);

    const stepsInterval = setInterval(() => {
      setLiveMetrics(prev => ({
        ...prev,
        steps: prev.steps + Math.floor(Math.random() * 3)
      }));
    }, 5000);

    return () => {
      clearInterval(hrInterval);
      clearInterval(stepsInterval);
    };
  }, []);

  const formatSleep = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const notifications = [
    {
      id: 1,
      title: 'Resumo Diário',
      message: `Você deu ${liveMetrics.steps.toLocaleString()} passos hoje e dormiu ${formatSleep(liveMetrics.sleep)}. Continue assim!`,
      time: 'Agora mesmo',
      read: false,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      id: 2,
      title: 'Hidratação',
      message: `Lembre-se de beber água! Você atingiu ${(liveMetrics.hydration / goals.hydration * 100).toFixed(0)}% da sua meta.`,
      time: 'Há 2 horas',
      read: true,
      icon: Droplets,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    }
  ];

  useEffect(() => {
    getHealthNews().then(setNews);

    // Fetch Active Order for the user
    let unsubscribeOrder = () => {};
    if (user) {
      // Simplified query to avoid composite index requirement
      const qOrder = query(
        collection(db, 'orders'),
        where('customerUid', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      unsubscribeOrder = onSnapshot(qOrder, (snapshot) => {
        const activeOrders = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Order))
          .filter(order => ['Pendente', 'Em Processamento', 'Em Trânsito'].includes(order.status));
        
        if (activeOrders.length > 0) {
          setActiveOrder(activeOrders[0]);
        } else {
          setActiveOrder(null);
        }
      }, (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'orders');
        } catch (err) {
          showBoundary(err);
        }
      });
    }

    // Fetch Pharmacies - Simplified to rule out index issues
    const qPharmacies = query(collection(db, 'pharmacies'), limit(10));
    const unsubscribePharmacies = onSnapshot(qPharmacies, (snapshot) => {
      const pData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pharmacy));
      // Sort in memory if needed
      const sorted = [...pData].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      setPharmacies(sorted.slice(0, 3));
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'pharmacies');
      } catch (err) {
        showBoundary(err);
      }
    });

    // Fetch Medications - Simplified to rule out index issues
    const qMedications = query(collection(db, 'medications'), limit(20));
    const unsubscribeMedications = onSnapshot(qMedications, (snapshot) => {
      const mData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication));
      // Sort in memory if needed
      const sorted = [...mData].sort((a, b) => (b.isSponsored ? 1 : 0) - (a.isSponsored ? 1 : 0));
      setMedications(sorted.slice(0, 8));
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'medications');
      } catch (err) {
        showBoundary(err);
      }
    });

    return () => {
      unsubscribePharmacies();
      unsubscribeMedications();
      unsubscribeOrder();
    };
  }, [user]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-20">
      <section className="flex items-center justify-between relative">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Saúde <span className="text-teal-600">Mais</span></h1>
          <p className="text-slate-500 font-medium text-sm md:text-base">Kanimambo, {profile?.name?.split(' ')[0] || 'Visitante'}. Como se sente hoje?</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Cart Icon */}
          <button 
            onClick={() => navigate('/app/checkout')}
            className="relative p-2.5 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-teal-600 transition-all hover:shadow-lg shadow-sm"
          >
            <ShoppingCart size={24} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-teal-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
                {itemCount}
              </span>
            )}
          </button>

          {/* Notifications Icon */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-teal-600 transition-all hover:shadow-lg shadow-sm"
            >
              <Bell size={24} />
              <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">Notificações</h3>
                  <span className="text-xs font-black text-teal-600 bg-teal-100 px-2 py-1 rounded-full">1 Nova</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map(notif => (
                    <div key={notif.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.read ? 'bg-teal-50/30' : ''}`}>
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notif.bg} ${notif.color}`}>
                          <notif.icon size={20} />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-sm font-bold ${!notif.read ? 'text-slate-900' : 'text-slate-700'}`}>{notif.title}</h4>
                            <span className="text-[10px] font-bold text-slate-400">{notif.time}</span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{notif.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                  <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="text-xs font-bold text-teal-600 hover:text-teal-700">Marcar todas como lidas</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Search Bar below greeting */}
      <section className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={20} />
        <input 
          type="text"
          placeholder="Pesquisar medicamentos ou farmácias..."
          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-teal-500/10 transition-all font-medium cursor-pointer"
          onClick={() => navigate('/app/search')}
          readOnly
        />
      </section>

      {/* NEW: Dynamic Banner Ads Section */}
      <section className="relative h-48 md:h-64 rounded-[2.5rem] overflow-hidden shadow-xl group cursor-pointer" onClick={() => navigate('/app/search')}>
        <img 
          src="https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?auto=format&fit=crop&q=80&w=2000" 
          alt="Banner Ad" 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-transparent flex flex-col justify-center p-8 md:p-12">
          <span className="text-teal-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Oferta Especial</span>
          <h2 className="text-white text-3xl md:text-4xl font-black leading-tight max-w-md">
            Cuide da sua <br /> <span className="text-teal-400 italic">Saúde Familiar</span>
          </h2>
          <p className="text-slate-300 text-sm md:text-base mt-4 max-w-sm hidden md:block">
            Entrega grátis em Maputo para pedidos acima de 2.000 MT. Aproveite agora!
          </p>
          <div className="mt-6 flex items-center gap-4">
            <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="bg-teal-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-teal-900/40">
              Ver Ofertas
            </button>
            <span className="text-[10px] text-white/40 font-mono uppercase">Anúncio</span>
          </div>
        </div>
      </section>

      {/* Active Order Tracking Banner - Hardware/Specialist vibe */}
      {activeOrder && (
        <section 
          onClick={() => navigate('/app/profile')}
          className="bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl cursor-pointer relative overflow-hidden group border border-slate-800"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-16 h-16 bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-400 border border-teal-500/20 group-hover:scale-110 transition-transform duration-500">
              <ShoppingBag size={32} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-black text-teal-400 uppercase tracking-[0.2em] bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                  Encomenda em Curso
                </span>
                <span className="text-[10px] font-mono text-slate-500 tracking-widest">ID: {activeOrder.id.slice(-8).toUpperCase()}</span>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight mb-1">
                Status: <span className="text-teal-400 italic">{activeOrder.status}</span>
              </h3>
              <p className="text-sm text-slate-400 font-medium">A sua saúde está a caminho. Toque para detalhes.</p>
            </div>

            <div className="md:w-64 space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progresso da Entrega</span>
                <span className="text-xs font-mono text-teal-400">
                  {Math.round(((['Pendente', 'Em Processamento', 'Em Trânsito', 'Entregue'].indexOf(activeOrder.status) + 1) / 4) * 100)}%
                </span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
                <div className="h-full bg-teal-500 rounded-full shadow-[0_0_15px_rgba(20,184,166,0.5)] transition-all duration-1000 ease-out" style={{ width: `${((['Pendente', 'Em Processamento', 'Em Trânsito', 'Entregue'].indexOf(activeOrder.status) + 1) / 4) * 100}%` }}></div>
              </div>
              <div className="flex justify-between text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                <span>Pedido</span>
                <span>Preparo</span>
                <span>Caminho</span>
                <span>Chegada</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Vitals Summary - Improved with gradients and hover effects */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-rose-500" size={22} />
            Métricas de Saúde
          </h2>
          <button 
            onClick={() => setShowHealthCalc(true)}
            className="text-sm font-bold text-teal-600 hover:text-teal-700 bg-teal-50 px-4 py-2 rounded-xl transition-colors"
          >
            Configurar Metas
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Batimentos', val: `${liveMetrics.heartRate} bpm`, sub: `Meta: ${goals.targetHeartRate[0]}-${goals.targetHeartRate[1]}`, icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', gradient: 'from-rose-500/10 to-transparent' },
            { label: 'Hidratação', val: `${liveMetrics.hydration.toFixed(1)}L`, sub: `Meta: ${goals.hydration.toFixed(1)}L`, icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50', gradient: 'from-blue-500/10 to-transparent' },
            { label: 'Sono', val: formatSleep(liveMetrics.sleep), sub: `Meta: ${formatSleep(goals.sleep)}`, icon: Moon, color: 'text-indigo-600', bg: 'bg-indigo-50', gradient: 'from-indigo-500/10 to-transparent' },
            { label: 'Passos', val: liveMetrics.steps.toLocaleString(), sub: `Meta: ${goals.steps.toLocaleString()}`, icon: Footprints, color: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-500/10 to-transparent' },
          ].map((v, i) => (
            <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-1 hover:border-teal-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${v.gradient} rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700`}></div>
              <div className={`${v.bg} ${v.color} w-11 h-11 rounded-2xl flex items-center justify-center mb-3 shadow-inner relative z-10`}>
                <v.icon size={22} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] relative z-10">{v.label}</span>
              <span className="text-xl font-black text-slate-900 tracking-tight relative z-10">{v.val}</span>
              <span className="text-xs font-medium text-slate-400 relative z-10 mt-1">{v.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* NEW: Featured Medications Section (CENTRAL) */}
      <section>
        <div className="flex items-center justify-between mb-5 px-1">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <SparklesIcon className="text-teal-600" size={22} />
            Produtos Patrocinados
          </h2>
          <button onClick={() => navigate('/app/search')} className="text-teal-600 text-sm font-bold hover:underline">
            Ver Catálogo
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide">
          {medications.map((med) => (
            <div 
              key={med.id} 
              onClick={() => navigate(`/app/product/${med.id}`)}
              className={`min-w-[180px] bg-white rounded-3xl border p-4 shadow-sm hover:shadow-md transition-all flex-shrink-0 relative overflow-hidden cursor-pointer group ${med.isSponsored ? 'border-teal-200 ring-1 ring-teal-100' : 'border-slate-100'}`}
            >
              {med.isSponsored && (
                <div className="absolute top-0 right-0 bg-teal-600 text-white text-[7px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-widest">
                  Patrocinado
                </div>
              )}
              <div className="relative mb-3 overflow-hidden rounded-2xl">
                <img 
                  src={med.image} 
                  alt={med.name} 
                  className="w-full h-32 object-cover transition-transform duration-500 group-hover:scale-110" 
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    addItem(med);
                    alert(`${med.name} adicionado ao carrinho!`);
                  }} 
                  className="absolute -bottom-2 -right-2 bg-teal-600 text-white p-2 rounded-xl shadow-lg hover:scale-110 transition-transform active:scale-95"
                >
                  <Plus size={16} />
                </button>
              </div>
              <h4 className="font-bold text-slate-800 text-sm truncate">{med.name}</h4>
              <p className="text-[10px] text-slate-400 font-medium mb-1">{med.category}</p>
              {med.description && (
                <p className="text-[10px] text-slate-500 font-medium mb-2 line-clamp-2 leading-tight">{med.description}</p>
              )}
              <p className="text-teal-700 font-black text-base">{med.price.toLocaleString()} MT</p>
            </div>
          ))}
          {medications.length === 0 && (
            <p className="text-slate-400 font-medium py-10 px-4 italic">Nenhum medicamento disponível no momento.</p>
          )}
        </div>
      </section>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Activity Chart - Now lower */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-teal-600" size={20} />
              Índice de Saúde Semanal
            </h3>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                   contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}
                   itemStyle={{fontWeight: 'bold', color: '#0d9488'}}
                />
                <Area type="monotone" dataKey="val" stroke="#0d9488" strokeWidth={5} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time Health News via Gemini */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Newspaper className="text-orange-500" size={20} />
            Notícias Locais
          </h3>
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 max-h-[240px] text-sm text-slate-600 leading-relaxed">
            {news.text.split('\n').map((line, i) => line && <p key={i} className="pb-3 border-b border-slate-50 last:border-0">{line}</p>)}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
            {news.links.slice(0, 2).map((link: any, i: number) => (
              <a key={i} href={link.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-teal-600 font-bold hover:text-teal-700">
                <ExternalLink size={12} /> {link.title || 'Ver fonte da notícia'}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Main Search & AI Promo - Split Layout Recipe 11 */}
      <section 
        onClick={() => navigate('/app/assistant')}
        className="bg-slate-900 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group cursor-pointer border border-slate-800"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[320px]">
          <div className="p-10 flex flex-col justify-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-500/10 text-teal-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-teal-500/20 w-fit">
              <SparklesIcon size={14} /> IA+ ASSISTENTE VIRTUAL
            </div>
            <h2 className="text-5xl font-black leading-[0.9] mb-6 tracking-tighter italic">
              Dúvidas <br /> <span className="text-teal-500">Médicas?</span>
            </h2>
            <p className="text-slate-400 font-medium text-lg leading-relaxed mb-8 max-w-sm">
              Fale com a nossa IA sobre sintomas de malária, cólera ou informações sobre medicamentos.
            </p>
            <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="w-fit px-10 py-5 bg-teal-600 text-white font-black rounded-2xl shadow-2xl shadow-teal-900/40 hover:scale-105 hover:bg-teal-500 transition-all duration-500 uppercase tracking-widest text-xs">
              CONSULTAR AGORA
            </button>
          </div>
          <div className="relative bg-teal-600/5 overflow-hidden hidden md:block">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 bg-teal-500/20 rounded-full blur-[100px] animate-pulse"></div>
              <div className="relative z-10 transform -rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-slate-700 shadow-2xl">
                  <MessageSquare size={120} className="text-teal-500 opacity-50" />
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute top-10 right-10 w-4 h-4 bg-teal-500 rounded-full animate-ping"></div>
            <div className="absolute bottom-20 left-10 w-2 h-2 bg-teal-300 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Marketplace CTA for Pharmacies - Split Layout Recipe 11 */}
      <section 
        onClick={() => navigate('/app/pharmacy-panel')}
        className="bg-teal-600 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group cursor-pointer"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[320px]">
          <div className="relative bg-white/5 overflow-hidden hidden md:block order-last md:order-first">
             <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 bg-white/10 rounded-full blur-[100px]"></div>
              <div className="relative z-10 transform rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                <div className="bg-white/10 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-md shadow-2xl">
                  <ShoppingBag size={120} className="text-white opacity-50" />
                </div>
              </div>
            </div>
          </div>
          <div className="p-10 flex flex-col justify-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-white/10 w-fit">
              MARKETPLACE FARMACÊUTICO
            </div>
            <h2 className="text-5xl font-black leading-[0.9] mb-6 tracking-tighter italic">
              Venda na <br /> <span className="text-teal-200 underline decoration-teal-400/50">Saúde Mais</span>
            </h2>
            <p className="text-teal-50 font-medium text-lg leading-relaxed mb-8 max-w-sm">
              Coloque os seus produtos no nosso marketplace e alcance milhares de clientes.
            </p>
            <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="w-fit px-10 py-5 bg-white text-teal-600 font-black rounded-2xl shadow-2xl shadow-teal-900/20 hover:scale-105 transition-all duration-500 uppercase tracking-widest text-xs">
              COMEÇAR A VENDER
            </button>
          </div>
        </div>
      </section>

      {/* Nearby Pharmacies Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Farmácias em Maputo</h2>
          <button onClick={() => navigate('/app/search')} className="text-teal-600 font-bold hover:underline flex items-center gap-1">
            Ver todas <MapPin size={16} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pharmacies.map((pharmacy) => (
            <div key={pharmacy.id} className="group bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500">
              <div className="h-44 relative overflow-hidden">
                <img 
                  src={pharmacy.image} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  alt={pharmacy.name} 
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className={`absolute top-4 left-4 px-4 py-1.5 rounded-full text-[10px] font-black shadow-xl backdrop-blur-md ${pharmacy.isOpen ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                  {pharmacy.isOpen ? 'ABERTA AGORA' : 'FECHADA'}
                </div>
              </div>
              <div className="p-6">
                <h4 className="font-black text-slate-800 text-xl mb-1">{pharmacy.name}</h4>
                <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                  <MapPin size={16} className="text-teal-500" />
                  <span className="truncate">{pharmacy.address}</span>
                </div>
                <div className="mt-5 flex items-center justify-between">
                   <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl">
                     <span className="text-amber-500 text-lg">★</span>
                     <span className="text-slate-800 font-black">{pharmacy.rating}</span>
                   </div>
                   <span className="text-teal-600 font-black text-sm">{pharmacy.distance || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
          {pharmacies.length === 0 && (
            <p className="text-slate-400 font-medium py-10 px-4 italic col-span-3 text-center">Nenhuma farmácia registada no momento.</p>
          )}
        </div>
      </section>

      {/* Health Calculator Modal */}
      {showHealthCalc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="p-6 bg-teal-600 text-white flex items-center justify-between shrink-0">
              <h2 className="text-xl font-black italic">Configurar Metas de Saúde</h2>
              <button onClick={() => setShowHealthCalc(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-2">Idade (anos)</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-teal-500/10 font-bold"
                  value={healthData.age}
                  onChange={e => setHealthData({...healthData, age: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-2">Peso (kg)</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-teal-500/10 font-bold"
                  value={healthData.weight}
                  onChange={e => setHealthData({...healthData, weight: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-2">Nível de Atividade</label>
                <select 
                  className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-teal-500/10 font-bold appearance-none"
                  value={healthData.activityLevel}
                  onChange={e => setHealthData({...healthData, activityLevel: e.target.value})}
                >
                  <option value="low">Baixo (Sedentário)</option>
                  <option value="moderate">Moderado (Ativo)</option>
                  <option value="high">Alto (Atleta)</option>
                </select>
              </div>
              <button 
                onClick={() => setShowHealthCalc(false)}
                className="w-full py-4 bg-teal-600 text-white font-black rounded-2xl shadow-xl shadow-teal-100 hover:scale-[1.02] transition-all"
              >
                SALVAR METAS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Dashboard component
export default Dashboard;

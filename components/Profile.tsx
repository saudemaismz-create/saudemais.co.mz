
import React, { useState, useEffect } from 'react';
import { User, Shield, Bell, History, LogOut, ChevronRight, Activity, Droplets, Ruler, Weight, LogIn, Package, Clock, CheckCircle2, AlertCircle, Truck, Calendar } from 'lucide-react';
import { useFirebase } from './FirebaseProvider';
import { auth, googleProvider, db } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Order } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

const Profile: React.FC = () => {
  const { user, profile, isAuthReady } = useFirebase();
  const [authLoading, setAuthLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showOrders, setShowOrders] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrdersLoading(false);
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('customerUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ords);
      setOrdersLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
      setOrdersLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'N/A';
    if (ts.toDate) return ts.toDate().toLocaleString('pt-MZ');
    return new Date(ts).toLocaleString('pt-MZ');
  };

  const handleForceAdmin = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
      alert('Cargo de administrador ativado com sucesso! A página será recarregada.');
      window.location.reload();
    } catch (error) {
      console.error('Erro ao forçar admin:', error);
      alert('Erro ao ativar cargo de administrador.');
    }
  };

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto bg-white p-10 rounded-[3rem] shadow-xl text-center border border-slate-100">
        <div className="p-2 flex items-center justify-center mx-auto mb-6">
          <img 
            src="https://img.icons8.com/fluency/96/health-book.png" 
            alt="Logo" 
            className="w-16 h-16"
            referrerPolicy="no-referrer"
          />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-4 italic">Perfil de Saúde</h2>
        <p className="text-slate-500 mb-8 font-medium">Faça login para aceder ao seu histórico de saúde, receitas e agendamentos.</p>
        <button 
          onClick={handleLogin}
          disabled={authLoading}
          className="w-full py-4 bg-teal-600 text-white font-black rounded-2xl shadow-lg shadow-teal-100 hover:scale-105 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {authLoading ? 'A ENTRAR...' : 'ENTRAR COM GOOGLE'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-teal-600 opacity-10"></div>
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg mx-auto overflow-hidden bg-slate-100">
            <img src={user.photoURL || "https://picsum.photos/seed/user/200/200"} className="w-full h-full object-cover" alt="User" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mt-4">{profile?.name || user.displayName}</h2>
          <p className="text-slate-500 text-sm">{user.email}</p>
          <p className="text-slate-500 text-sm mt-1 font-mono bg-slate-100 inline-block px-2 py-1 rounded">Role: {profile?.role}</p>
          
          {user.email?.toLowerCase().includes('caneabacarhimiacane') && profile?.role !== 'admin' && (
            <button 
              onClick={handleForceAdmin}
              className="mt-3 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-teal-700 transition-colors block mx-auto"
            >
              Ativar Acesso Admin
            </button>
          )}

          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">
            Membro desde {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Outubro 2023'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="p-4 bg-slate-50 rounded-2xl">
            <Droplets className="mx-auto text-rose-500 mb-2" size={20} />
            <p className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Tipo Sanguíneo</p>
            <p className="text-lg font-bold text-slate-800">{profile?.bloodType || 'N/A'}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl">
            <Weight className="mx-auto text-blue-500 mb-2" size={20} />
            <p className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Peso</p>
            <p className="text-lg font-bold text-slate-800">{profile?.weight || '--'} kg</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl">
            <Ruler className="mx-auto text-teal-500 mb-2" size={20} />
            <p className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Altura</p>
            <p className="text-lg font-bold text-slate-800">{profile?.height || '--'} cm</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden group">
        <div className="p-8 pb-4 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-900 italic flex items-center gap-3">
            <Package className="text-teal-600" size={24} />
            Minhas Encomendas
          </h3>
          <button 
            onClick={() => setShowOrders(!showOrders)}
            className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-50 hover:text-teal-600 transition-all"
          >
            {showOrders ? 'Recolher' : 'Ver Todas'}
          </button>
        </div>
        
        {ordersLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : showOrders ? (
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto scrollbar-hide">
            {orders.length > 0 ? (
              orders.map((order) => (
                <div key={order.id} className="p-8 hover:bg-slate-50/50 transition-all duration-500 relative group/item">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
                        order.status === 'Entregue' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        order.status === 'Em Trânsito' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 
                        order.status === 'Em Processamento' ? 'bg-teal-50 text-teal-600 border border-teal-100' : 
                        order.status === 'Pendente' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {order.status === 'Entregue' ? <CheckCircle2 size={28} /> : 
                         order.status === 'Em Trânsito' ? <Truck size={28} /> : 
                         order.status === 'Em Processamento' ? <Package size={28} /> : 
                         order.status === 'Pendente' ? <Clock size={28} /> : <AlertCircle size={28} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-black text-slate-900 tracking-tight">Pedido #{order.id?.substring(0, 8).toUpperCase()}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                            order.status === 'Entregue' ? 'bg-emerald-600 text-white' : 
                            order.status === 'Em Trânsito' ? 'bg-blue-600 text-white' : 
                            order.status === 'Em Processamento' ? 'bg-teal-600 text-white' : 
                            order.status === 'Pendente' ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Calendar size={10} /> {formatTimestamp(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total da Compra</p>
                      <p className="text-2xl font-black text-teal-600 tracking-tighter">{order.total.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50/50 rounded-2xl p-4 space-y-3 border border-slate-100/50">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-white rounded-lg flex items-center justify-center font-black text-teal-600 shadow-sm border border-slate-100">{item.quantity}</span>
                          <span className="font-bold text-slate-700">{item.name}</span>
                        </div>
                        <span className="font-mono text-slate-500">{(item.price * item.quantity).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</span>
                      </div>
                    ))}
                  </div>
                  
                  {order.status !== 'Entregue' && (
                    <div className="mt-6 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-teal-500 rounded-full transition-all duration-1000" 
                          style={{ width: `${((['Pendente', 'Em Processamento', 'Em Trânsito', 'Entregue'].indexOf(order.status) + 1) / 4) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Em Progresso</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-16 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="text-slate-200" size={40} />
                </div>
                <p className="text-slate-400 font-bold text-lg">Nenhuma encomenda encontrada.</p>
                <p className="text-slate-300 text-sm">As suas compras aparecerão aqui.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 pt-4">
            {orders.length > 0 ? (
              <div className="group/banner relative bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden cursor-pointer" onClick={() => setShowOrders(true)}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-[40px] -mr-16 -mt-16"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-400 border border-teal-500/20 shadow-inner">
                      <Truck size={28} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black text-teal-400 uppercase tracking-[0.2em] bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">Último Pedido</span>
                        <span className="text-[9px] font-mono text-slate-500 tracking-widest">#{orders[0].id?.substring(0, 8).toUpperCase()}</span>
                      </div>
                      <p className="text-lg font-black text-white tracking-tight">Status: <span className="text-teal-400 italic">{orders[0].status}</span></p>
                    </div>
                  </div>
                  <div className="bg-white/10 p-3 rounded-xl text-white group-hover:bg-teal-600 transition-colors duration-500">
                    <ChevronRight size={20} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm font-bold italic">Você ainda não realizou compras.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {isInstallable && (
        <div className="bg-teal-600 rounded-3xl shadow-lg shadow-teal-100 overflow-hidden mb-6">
          <button 
            onClick={handleInstallClick}
            className="w-full px-6 py-5 flex items-center justify-between hover:bg-teal-700 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="text-white bg-white/20 p-3 rounded-2xl">
                <ShoppingBag size={24} />
              </div>
              <div className="text-left">
                <span className="font-black text-white block italic">Instalar Aplicativo</span>
                <span className="text-xs text-teal-100 font-bold uppercase tracking-widest">Baixe para o seu telemóvel</span>
              </div>
            </div>
            <ChevronRight size={20} className="text-white/50 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-50 font-bold text-slate-800">Negócios</div>
        <div className="divide-y divide-slate-50">
          <button 
            onClick={() => window.location.hash = '#/app/pharmacy-panel'}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="text-teal-600 bg-teal-50 p-2 rounded-xl">
                <Package size={20} />
              </div>
              <div className="text-left">
                <span className="font-bold text-slate-800 block">Minha Loja</span>
                <span className="text-xs text-slate-500 font-medium">Gerir farmácia ou clínica</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-50 font-bold text-slate-800">Minha Saúde</div>
        <div className="divide-y divide-slate-50">
          {[
            { label: 'Histórico de Consultas', icon: History, color: 'text-purple-500' },
            { label: 'Receitas Médicas', icon: Shield, color: 'text-teal-500' },
            { label: 'Resultados de Exames', icon: Activity, color: 'text-blue-500' },
          ].map((item) => (
            <button key={item.label} onClick={() => alert('Funcionalidade em desenvolvimento.')} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`${item.color} bg-white p-2`}>
                  <item.icon size={20} />
                </div>
                <span className="font-medium text-slate-700">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-50 font-bold text-slate-800">Configurações</div>
        <div className="divide-y divide-slate-50">
          <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="text-amber-500 bg-white p-2">
                <Bell size={20} />
              </div>
              <span className="font-medium text-slate-700">Notificações</span>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </button>
          <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="text-slate-500 bg-white p-2">
                <User size={20} />
              </div>
              <span className="font-medium text-slate-700">Dados da Conta</span>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </button>
          <button 
            onClick={handleLogout}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="text-rose-500 bg-white p-2">
                <LogOut size={20} />
              </div>
              <span className="font-medium text-slate-700">Sair da Conta</span>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;

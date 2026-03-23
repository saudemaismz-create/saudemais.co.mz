
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, MessageSquare, User, Calendar, MapPin, Heart, ShoppingBag, ShoppingCart, ShieldAlert } from 'lucide-react';
import { useCart } from './CartContext';
import { useFirebase } from './FirebaseProvider';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();
  const { profile } = useFirebase();

  const isAppRoute = location.pathname.startsWith('/app');

  const navItems = [
    { icon: Home, label: 'Início', path: '/app' },
    { icon: Search, label: 'Buscar', path: '/app/search' },
    { icon: MessageSquare, label: 'IA+', path: '/app/assistant' },
    { icon: ShoppingBag, label: 'Minha Loja', path: '/app/pharmacy-panel' },
    { icon: Calendar, label: 'Agenda', path: '/app/bookings' },
    { icon: User, label: 'Perfil', path: '/app/profile' },
  ];

  if (profile?.role === 'admin') {
    navItems.splice(4, 0, { icon: ShieldAlert, label: 'Admin', path: '/app/admin' });
  }

  if (!isAppRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-0 md:pl-64">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 h-screen fixed left-0 top-0 p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="bg-teal-600 p-2.5 rounded-2xl text-white shadow-lg shadow-teal-100">
            <Heart size={24} fill="white" />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tighter">Saúde <span className="text-teal-600">Mais</span></span>
        </div>
        
        <nav className="flex-1 space-y-3">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-[1.5rem] transition-all duration-500 group relative overflow-hidden ${
                location.pathname === item.path
                  ? 'bg-teal-600 text-white font-black shadow-2xl shadow-teal-200/50 scale-[1.02] z-10'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800 font-bold'
              }`}
            >
              <item.icon size={24} strokeWidth={location.pathname === item.path ? 2.5 : 2} className="transition-transform group-hover:scale-110" />
              <span className="text-[15px] tracking-tight">{item.label}</span>
              {location.pathname === item.path && (
                <div className="absolute right-0 top-0 h-full w-1 bg-white/20"></div>
              )}
            </button>
          ))}
          
          <div className="pt-4 mt-4 border-t border-slate-50">
            <button
              onClick={() => navigate('/app/checkout')}
              className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-[1.5rem] transition-all duration-500 relative group ${
                location.pathname === '/app/checkout'
                  ? 'bg-rose-600 text-white font-black shadow-2xl shadow-rose-200/50 scale-[1.02]'
                  : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600 font-bold'
              }`}
            >
              <ShoppingCart size={24} strokeWidth={location.pathname === '/app/checkout' ? 2.5 : 2} className="transition-transform group-hover:scale-110" />
              <span className="text-[15px] tracking-tight">Carrinho</span>
              {itemCount > 0 && (
                <span className="absolute right-6 bg-white text-rose-600 text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </nav>
        
        <div className="mt-auto p-6 bg-slate-900 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-full bg-teal-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Emergência</p>
          <p className="text-2xl font-black mb-3 text-teal-500">112 / 119</p>
          <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="w-full py-3 bg-white text-slate-900 rounded-xl text-xs font-black shadow-sm hover:scale-105 transition-transform active:scale-95">
            LIGAR AGORA
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-5 bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-teal-600 p-2 rounded-xl text-white shadow-md">
            <Heart size={18} fill="white" />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tighter">Saúde Mais</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/app/checkout')}
            className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:text-teal-600 transition-colors relative"
          >
            <ShoppingCart size={22} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                {itemCount}
              </span>
            )}
          </button>
          <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:text-teal-600 transition-colors">
            <MapPin size={22} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-5 md:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Mobile Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-4 py-4 flex justify-around items-center z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center p-2 min-w-[64px] transition-all duration-500 relative ${
              location.pathname === item.path ? 'text-teal-600 scale-110' : 'text-slate-400'
            }`}
          >
            {location.pathname === item.path && (
              <div className="absolute -top-1 w-12 h-1 bg-teal-600 rounded-full blur-[2px]"></div>
            )}
            <item.icon size={26} strokeWidth={location.pathname === item.path ? 3 : 2} />
            <span className={`text-[10px] mt-2 font-black uppercase tracking-tighter ${location.pathname === item.path ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;

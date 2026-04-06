
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, MessageSquare, User, Calendar, MapPin, Heart, ShieldAlert, FileText, Bell, Users, Sparkles, Activity, ShoppingBag } from 'lucide-react';
import { useFirebase } from './FirebaseProvider';
import { ToastProvider, useToast } from './ToastContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <ToastProvider>
      <LayoutContent>{children}</LayoutContent>
    </ToastProvider>
  );
};

const LayoutContent: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useFirebase();
  const { showToast } = useToast();

  const isAppRoute = location.pathname.startsWith('/app');

  const navItems = [
    { icon: Home, label: 'Início', path: '/app' },
    { icon: FileText, label: 'Receita', path: '/app/prescription' },
    { icon: Sparkles, label: 'IA+', path: '/app/assistant' },
    { icon: Activity, label: 'Bem-Estar', path: '/app/wellness' },
    { icon: Bell, label: 'Lembretes', path: '/app/reminders' },
    { icon: MessageSquare, label: 'Chat', path: '/app/chat' },
    { icon: Users, label: 'Família', path: '/app/family' },
    { icon: Calendar, label: 'Agenda', path: '/app/bookings' },
    { icon: User, label: 'Perfil', path: '/app/profile' },
    { icon: ShoppingBag, label: 'Minha Loja', path: '/app/pharmacy-panel' },
  ];

  if (profile?.role === 'admin') {
    navItems.splice(4, 0, { icon: ShieldAlert, label: 'Admin', path: '/app/admin' });
  }

  if (!isAppRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 pb-32 md:pb-0 md:pl-64">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 h-screen fixed left-0 top-0">
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10 px-2 shrink-0 cursor-pointer" onClick={() => navigate('/app')}>
            <img src="/input_file_0.png" alt="Saúde Mais Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
          </div>
          
          <nav className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
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
        </nav>
        
        <div className="mt-auto p-6 bg-slate-900 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group shrink-0">
          <div className="absolute top-0 left-0 w-full h-full bg-teal-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Emergência</p>
          <p className="text-2xl font-black mb-3 text-teal-500">112 / 119</p>
          <button onClick={() => showToast('Ligando para a emergência...', 'info')} className="w-full py-3 bg-white text-slate-900 rounded-xl text-xs font-black shadow-sm hover:scale-105 transition-transform active:scale-95">
            LIGAR AGORA
          </button>
        </div>
      </div>
    </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-5 bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/app')}>
          <img src="/input_file_0.png" alt="Saúde Mais Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/app/pharmacy-panel')} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:text-teal-600 transition-colors">
            <ShoppingBag size={22} />
          </button>
          <button onClick={() => showToast('Localização em tempo real em desenvolvimento.', 'info')} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:text-teal-600 transition-colors">
            <MapPin size={22} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-5 md:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Mobile Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-4 py-4 flex justify-start items-center z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 min-w-full">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center p-2 min-w-[72px] transition-all duration-500 relative ${
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
        </div>
      </nav>
    </div>
  );
};

export default Layout;

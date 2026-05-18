
import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Activity } from 'lucide-react';
import { useFirebase } from './FirebaseProvider';

export const MaintenanceGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { profile } = useFirebase();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setMaintenanceMode(snapshot.data().maintenanceMode || false);
      }
      setLoading(false);
    }, (error) => {
      console.error("MaintenanceGuard error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Allow admins to bypass maintenance mode, and allow login page
  if (maintenanceMode && profile?.role !== 'admin' && location.pathname !== '/login') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white/5 backdrop-blur-xl p-12 rounded-[4rem] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          <div className="flex flex-col items-center justify-center mb-8 relative z-10">
            <div className="w-24 h-24 bg-teal-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-teal-500/20 mb-4 transition-transform hover:scale-110 duration-500">
              <Activity className="text-white" size={48} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter">Saúde <span className="text-teal-400">Mais</span></h1>
          </div>
          <h2 className="text-3xl font-black text-white mb-4 italic tracking-tight relative z-10">Estamos em Manutenção</h2>
          <p className="text-slate-400 font-bold leading-relaxed mb-10 relative z-10">
            O Saúde Mais está a passar por uma atualização rápida para melhorar a sua experiência. Voltaremos em breve!
          </p>
          
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-teal-500 uppercase tracking-widest bg-teal-500/10 py-3 rounded-2xl">
              <span className="w-2 h-2 bg-teal-500 rounded-full animate-ping"></span>
              A trabalhar na melhoria...
            </div>
            
            <Link 
              to="/login" 
              className="block w-full py-4 text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
            >
              Acesso Administrativo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

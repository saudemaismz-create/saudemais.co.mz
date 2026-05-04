
import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { ShieldAlert, Activity } from 'lucide-react';

export const MaintenanceGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

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

  if (maintenanceMode) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white/5 backdrop-blur-xl p-12 rounded-[4rem] border border-white/10 shadow-2xl">
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-24 h-24 bg-teal-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-teal-500/20 mb-4">
              <Activity className="text-white" size={48} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter">Saúde <span className="text-teal-400">Mais</span></h1>
          </div>
          <h2 className="text-3xl font-black text-white mb-4 italic tracking-tight">Estamos em Manutenção</h2>
          <p className="text-slate-400 font-bold leading-relaxed mb-10">
            O Saúde Mais está a passar por uma atualização rápida para melhorar a sua experiência. Voltaremos em breve!
          </p>
          <div className="flex items-center justify-center gap-2 text-[10px] font-black text-teal-500 uppercase tracking-widest bg-teal-500/10 py-3 rounded-2xl">
            <span className="w-2 h-2 bg-teal-500 rounded-full animate-ping"></span>
            A trabalhar na melhoria...
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

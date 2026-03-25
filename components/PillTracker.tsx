
import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Clock, CheckCircle2, AlertCircle, Pill, Calendar, ChevronRight } from 'lucide-react';
import { useFirebase } from './FirebaseProvider';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Reminder } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const PillTracker: React.FC = () => {
  const { user } = useFirebase();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newReminder, setNewReminder] = useState({
    medicationName: '',
    dosage: '',
    frequency: 'daily' as const,
    times: ['08:00'],
  });

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'reminders'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder));
      setReminders(data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'reminders'), {
        ...newReminder,
        userId: user.uid,
        active: true,
        createdAt: serverTimestamp(),
      });
      setIsAdding(false);
      setNewReminder({ medicationName: '', dosage: '', frequency: 'daily', times: ['08:00'] });
    } catch (error) {
      console.error("Error adding reminder:", error);
    }
  };

  const toggleReminder = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'reminders', id), { active: !currentStatus });
    } catch (error) {
      console.error("Error toggling reminder:", error);
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reminders', id));
    } catch (error) {
      console.error("Error deleting reminder:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">
            Lembrete de <span className="text-teal-600">Medicamentos</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">Nunca perca uma dose. Gerencie seus horários com precisão.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-4 bg-teal-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-teal-200 hover:scale-105 transition-all active:scale-95"
        >
          <Plus size={20} /> ADICIONAR LEMBRETE
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
            {reminders.length > 0 ? (
              reminders.map((reminder) => (
                <motion.div 
                  key={reminder.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${
                    reminder.active ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50 border-transparent opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                      reminder.active ? 'bg-teal-50 text-teal-600' : 'bg-slate-200 text-slate-400'
                    }`}>
                      <Pill size={28} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg tracking-tight">{reminder.medicationName}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock size={12} /> {reminder.times.join(', ')}
                        </span>
                        <span className="text-xs font-bold text-teal-600 uppercase tracking-widest bg-teal-50 px-2 py-0.5 rounded-md">
                          {reminder.dosage}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleReminder(reminder.id!, reminder.active)}
                      className={`p-3 rounded-xl transition-all ${
                        reminder.active ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <CheckCircle2 size={20} />
                    </button>
                    <button 
                      onClick={() => deleteReminder(reminder.id!)}
                      className="p-3 bg-rose-50 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-white p-12 rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
                  <Bell size={40} />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Nenhum lembrete ativo</h3>
                <p className="text-slate-400 font-medium mt-2 max-w-xs">Adicione seus medicamentos para receber notificações e manter sua saúde em dia.</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <h3 className="text-xl font-black mb-4 flex items-center gap-2 italic">
              <Calendar className="text-teal-500" size={24} /> Próximas Doses
            </h3>
            <div className="space-y-4 relative z-10">
              {reminders.filter(r => r.active).length > 0 ? (
                reminders.filter(r => r.active).slice(0, 3).map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div>
                      <p className="font-bold text-sm">{r.medicationName}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{r.times[0]}</p>
                    </div>
                    <ChevronRight size={16} className="text-teal-500" />
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-sm font-medium italic">Tudo em dia por enquanto!</p>
              )}
            </div>
          </div>

          <div className="bg-teal-50 rounded-[2.5rem] p-8 border border-teal-100">
            <h3 className="text-lg font-black text-teal-900 mb-2">Dica de Saúde</h3>
            <p className="text-sm text-teal-700 font-medium leading-relaxed">
              Tente tomar seus medicamentos sempre no mesmo horário para manter níveis estáveis no organismo. Use água, a menos que indicado o contrário.
            </p>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8 bg-teal-600 text-white">
                <h2 className="text-2xl font-black italic tracking-tight">Novo Lembrete</h2>
                <p className="text-teal-100 text-sm font-medium">Preencha os detalhes do medicamento.</p>
              </div>
              <form onSubmit={handleAddReminder} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome do Medicamento</label>
                  <input 
                    required
                    type="text"
                    value={newReminder.medicationName}
                    onChange={e => setNewReminder({...newReminder, medicationName: e.target.value})}
                    placeholder="Ex: Paracetamol"
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-teal-500 font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Dosagem</label>
                    <input 
                      required
                      type="text"
                      value={newReminder.dosage}
                      onChange={e => setNewReminder({...newReminder, dosage: e.target.value})}
                      placeholder="Ex: 500mg"
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-teal-500 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Horário</label>
                    <input 
                      required
                      type="time"
                      value={newReminder.times[0]}
                      onChange={e => setNewReminder({...newReminder, times: [e.target.value]})}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-teal-500 font-bold"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm tracking-widest uppercase hover:bg-slate-200 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-teal-600 text-white rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl shadow-teal-200 hover:scale-105 transition-all"
                  >
                    SALVAR
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PillTracker;

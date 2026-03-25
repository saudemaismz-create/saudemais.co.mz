
import React, { useState, useEffect } from 'react';
import { User, Plus, Trash2, Heart, Activity, Droplets, Ruler, Weight, AlertCircle, Users, ChevronRight, Edit2, Save, X as CloseIcon } from 'lucide-react';
import { useFirebase } from './FirebaseProvider';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Dependent } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const FamilyProfiles: React.FC = () => {
  const { user } = useFirebase();
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newDependent, setNewDependent] = useState<Partial<Dependent>>({
    name: '',
    relationship: 'Filho(a)',
    age: 0,
    bloodType: 'O+',
    allergies: [],
    chronicConditions: [],
  });

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'dependents'), where('parentUid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dependent));
      setDependents(data);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'dependents'), {
        ...newDependent,
        parentUid: user.uid,
        createdAt: serverTimestamp(),
      });
      setIsAdding(false);
      setNewDependent({ name: '', relationship: 'Filho(a)', age: 0, bloodType: 'O+', allergies: [], chronicConditions: [] });
    } catch (error) {
      console.error("Error adding dependent:", error);
    }
  };

  const deleteDependent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'dependents', id));
    } catch (error) {
      console.error("Error deleting dependent:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">
            Perfis <span className="text-teal-600">Familiares</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">Cuide de quem você ama. Gerencie a saúde dos seus dependentes.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-4 bg-teal-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-teal-200 hover:scale-105 transition-all active:scale-95"
        >
          <Plus size={20} /> ADICIONAR DEPENDENTE
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {dependents.length > 0 ? (
            dependents.map((dep, idx) => (
              <motion.div 
                key={dep.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-teal-50 rounded-3xl flex items-center justify-center text-teal-600 shadow-sm">
                      <User size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{dep.name}</h3>
                      <p className="text-xs font-bold text-teal-600 uppercase tracking-widest bg-teal-50 px-2 py-0.5 rounded-md inline-block">
                        {dep.relationship} • {dep.age} anos
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteDependent(dep.id!)}
                    className="p-3 bg-rose-50 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Droplets size={12} className="text-rose-500" /> Sangue
                    </p>
                    <p className="font-black text-slate-900">{dep.bloodType || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <AlertCircle size={12} className="text-amber-500" /> Alergias
                    </p>
                    <p className="font-black text-slate-900 truncate">{dep.allergies?.length || 0} Registradas</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-teal-600 text-white rounded-2xl shadow-lg shadow-teal-100 cursor-pointer hover:scale-[1.02] transition-transform">
                    <span className="text-xs font-black uppercase tracking-widest">Ver Histórico Médico</span>
                    <ChevronRight size={18} />
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="md:col-span-2 bg-white p-12 rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
                <Users size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Nenhum dependente cadastrado</h3>
              <p className="text-slate-400 font-medium mt-2 max-w-xs">Adicione membros da sua família para gerenciar consultas, receitas e lembretes em um só lugar.</p>
            </div>
          )}
        </AnimatePresence>
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
                <h2 className="text-2xl font-black italic tracking-tight">Novo Dependente</h2>
                <p className="text-teal-100 text-sm font-medium">Cadastre um membro da família.</p>
              </div>
              <form onSubmit={handleAddDependent} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome Completo</label>
                  <input 
                    required
                    type="text"
                    value={newDependent.name}
                    onChange={e => setNewDependent({...newDependent, name: e.target.value})}
                    placeholder="Ex: João Silva"
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-teal-500 font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Parentesco</label>
                    <select 
                      required
                      value={newDependent.relationship}
                      onChange={e => setNewDependent({...newDependent, relationship: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-teal-500 font-bold"
                    >
                      <option>Filho(a)</option>
                      <option>Cônjuge</option>
                      <option>Pai/Mãe</option>
                      <option>Outro</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Idade</label>
                    <input 
                      required
                      type="number"
                      value={newDependent.age}
                      onChange={e => setNewDependent({...newDependent, age: parseInt(e.target.value)})}
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
                    CADASTRAR
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

export default FamilyProfiles;

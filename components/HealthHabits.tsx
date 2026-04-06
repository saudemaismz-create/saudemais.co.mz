
import React, { useState, useEffect } from 'react';
import { 
  Droplets, Footprints, Zap, Apple, ArrowLeft, Plus, Minus, 
  TrendingUp, Calendar, Award, Sparkles, ChevronRight, 
  CheckCircle2, AlertCircle, Info, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from './FirebaseProvider';
import { useToast } from './ToastContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { WellnessHabit } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { getWellnessTips } from '../services/geminiService';

const HealthHabits: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useFirebase();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<WellnessHabit[]>([]);
  const [aiTips, setAiTips] = useState<Record<string, string>>({});
  const [loadingTips, setLoadingTips] = useState<Record<string, boolean>>({});

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'wellness_habits'),
      where('userId', '==', user.uid),
      where('date', '==', today)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WellnessHabit));
      setHabits(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'wellness_habits');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, today]);

  const getHabitByType = (type: WellnessHabit['type']) => {
    return habits.find(h => h.type === type);
  };

  const updateHabit = async (type: WellnessHabit['type'], delta: number, goal: number) => {
    if (!user) return;

    const existing = getHabitByType(type);
    try {
      if (existing) {
        const newValue = Math.max(0, existing.value + delta);
        await updateDoc(doc(db, 'wellness_habits', existing.id!), {
          value: newValue,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'wellness_habits'), {
          userId: user.uid,
          type,
          value: Math.max(0, delta),
          goal,
          date: today,
          updatedAt: serverTimestamp()
        });
      }
      showToast('Progresso atualizado!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'wellness_habits');
    }
  };

  const fetchAiTip = async (type: WellnessHabit['type']) => {
    setLoadingTips(prev => ({ ...prev, [type]: true }));
    try {
      const tip = await getWellnessTips(type);
      setAiTips(prev => ({ ...prev, [type]: tip }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTips(prev => ({ ...prev, [type]: false }));
    }
  };

  const habitConfigs = [
    { 
      type: 'water' as const, 
      label: 'Hidratação', 
      unit: 'Copos', 
      icon: Droplets, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50', 
      borderColor: 'border-blue-100',
      defaultGoal: 8,
      step: 1,
      description: 'Beba pelo menos 2L de água por dia.'
    },
    { 
      type: 'steps' as const, 
      label: 'Passos', 
      unit: 'Passos', 
      icon: Footprints, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50', 
      borderColor: 'border-emerald-100',
      defaultGoal: 10000,
      step: 500,
      description: 'Caminhar ajuda na saúde cardiovascular.'
    },
    { 
      type: 'running' as const, 
      label: 'Corrida', 
      unit: 'Minutos', 
      icon: Zap, 
      color: 'text-orange-600', 
      bg: 'bg-orange-50', 
      borderColor: 'border-orange-100',
      defaultGoal: 30,
      step: 5,
      description: 'Correr queima calorias e melhora o humor.'
    },
    { 
      type: 'eating' as const, 
      label: 'Alimentação', 
      unit: 'Pontos', 
      icon: Apple, 
      color: 'text-rose-600', 
      bg: 'bg-rose-50', 
      borderColor: 'border-rose-100',
      defaultGoal: 10,
      step: 1,
      description: 'Coma frutas, vegetais e evite processados.'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="animate-spin text-teal-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 bg-white rounded-xl border border-slate-100 text-slate-500 hover:text-teal-600 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Hábitos Saudáveis</h1>
            <p className="text-slate-500 font-medium text-sm">Acompanhe o seu progresso diário</p>
          </div>
        </div>
        <div className="bg-teal-50 px-4 py-2 rounded-2xl border border-teal-100 flex items-center gap-2">
          <Calendar size={18} className="text-teal-600" />
          <span className="text-sm font-black text-teal-700">{new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {habitConfigs.map((config) => {
          const habit = getHabitByType(config.type);
          const progress = habit ? (habit.value / habit.goal) * 100 : 0;
          const isCompleted = progress >= 100;

          return (
            <motion.div 
              key={config.type}
              whileHover={{ y: -4 }}
              className={`bg-white p-6 rounded-[2.5rem] border ${config.borderColor} shadow-sm space-y-6 relative overflow-hidden`}
            >
              {isCompleted && (
                <div className="absolute top-4 right-4 text-emerald-500 animate-bounce">
                  <Award size={24} />
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${config.bg} ${config.color} shadow-inner`}>
                  <config.icon size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">{config.label}</h3>
                  <p className="text-xs text-slate-400 font-medium">{config.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black text-slate-900">
                    {habit?.value || 0} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">{config.unit}</span>
                  </span>
                  <span className="text-xs font-black text-slate-400">Meta: {config.defaultGoal}</span>
                </div>
                <div className="h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-1">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, progress)}%` }}
                    className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-teal-500'} shadow-sm`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => updateHabit(config.type, -config.step, config.defaultGoal)}
                  className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-xl font-black text-xs hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Minus size={16} /> REDUZIR
                </button>
                <button 
                  onClick={() => updateHabit(config.type, config.step, config.defaultGoal)}
                  className="flex-[2] py-3 bg-teal-600 text-white rounded-xl font-black text-xs hover:bg-teal-700 transition-colors shadow-lg shadow-teal-100 flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> ADICIONAR {config.step}
                </button>
              </div>

              {/* AI Tip Section */}
              <div className="pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-amber-600">
                    <Sparkles size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Dica da IA+</span>
                  </div>
                  <button 
                    onClick={() => fetchAiTip(config.type)}
                    disabled={loadingTips[config.type]}
                    className="text-[10px] font-bold text-teal-600 hover:underline disabled:opacity-50"
                  >
                    {loadingTips[config.type] ? 'A pensar...' : (aiTips[config.type] ? 'Nova Dica' : 'Obter Dica')}
                  </button>
                </div>
                <AnimatePresence mode="wait">
                  {aiTips[config.type] ? (
                    <motion.p 
                      key={aiTips[config.type]}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-xs text-slate-500 font-medium italic leading-relaxed"
                    >
                      "{aiTips[config.type]}"
                    </motion.p>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium">Toque em "Obter Dica" para conselhos personalizados.</p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Health Summary Card */}
      <section className="bg-slate-900 p-8 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 bg-teal-500/20 rounded-3xl flex items-center justify-center text-teal-400 border border-teal-500/20">
            <TrendingUp size={48} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl font-black italic mb-2 tracking-tight">O seu Índice de <span className="text-teal-400">Bem-Estar</span></h2>
            <p className="text-slate-400 font-medium leading-relaxed max-w-lg">
              Você completou {habits.filter(h => (h.value / h.goal) >= 1).length} de {habitConfigs.length} metas hoje. 
              Mantenha a consistência para melhorar a sua saúde a longo prazo.
            </p>
          </div>
          <button 
            onClick={() => navigate('/app/assistant')}
            className="px-8 py-4 bg-teal-600 text-white font-black rounded-2xl shadow-xl shadow-teal-900/40 hover:scale-105 transition-all uppercase tracking-widest text-xs"
          >
            Falar com Assistente
          </button>
        </div>
      </section>
    </div>
  );
};

export default HealthHabits;

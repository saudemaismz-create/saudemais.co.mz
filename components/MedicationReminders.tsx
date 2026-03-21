
import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Clock, Calendar, CheckCircle2, AlertCircle, Pill } from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from './FirebaseProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useErrorBoundary } from 'react-error-boundary';

interface Reminder {
  id: string;
  userId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  times: string[];
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
}

const MedicationReminders: React.FC = () => {
  const { user } = useFirebase();
  const { showBoundary } = useErrorBoundary();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newReminder, setNewReminder] = useState({
    medicationName: '',
    dosage: '',
    frequency: '8h',
    times: ['08:00'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'reminders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder));
      setReminders(docs);
      setLoading(false);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'reminders');
      } catch (err) {
        showBoundary(err);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'reminders'), {
        userId: user.uid,
        ...newReminder,
        active: true,
        createdAt: new Date().toISOString()
      });
      setNewReminder({
        medicationName: '',
        dosage: '',
        frequency: '8h',
        times: ['08:00'],
        startDate: new Date().toISOString().split('T')[0],
        endDate: ''
      });
      setShowAdd(false);
    } catch (error) {
      console.error("Error adding reminder:", error);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'reminders', id), { active: !currentStatus });
    } catch (error) {
      console.error("Error toggling reminder:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este lembrete?')) {
      try {
        await deleteDoc(doc(db, 'reminders', id));
      } catch (error) {
        console.error("Error deleting reminder:", error);
      }
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lembretes de Medicamentos</h1>
          <p className="text-slate-500">Nunca esqueça de tomar sua medicação</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus size={20} />
          Novo Lembrete
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-lg mb-8"
          >
            <h2 className="text-lg font-semibold mb-4">Adicionar Lembrete</h2>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Medicamento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Paracetamol"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={newReminder.medicationName}
                  onChange={(e) => setNewReminder({ ...newReminder, medicationName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dosagem</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 500mg"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={newReminder.dosage}
                  onChange={(e) => setNewReminder({ ...newReminder, dosage: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Frequência</label>
                <select
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={newReminder.frequency}
                  onChange={(e) => setNewReminder({ ...newReminder, frequency: e.target.value })}
                >
                  <option value="4h">A cada 4 horas</option>
                  <option value="6h">A cada 6 horas</option>
                  <option value="8h">A cada 8 horas</option>
                  <option value="12h">A cada 12 horas</option>
                  <option value="daily">Uma vez ao dia</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Início</label>
                <input
                  type="date"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={newReminder.startDate}
                  onChange={(e) => setNewReminder({ ...newReminder, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Término (Opcional)</label>
                <input
                  type="date"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={newReminder.endDate}
                  onChange={(e) => setNewReminder({ ...newReminder, endDate: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Salvar Lembrete
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <Bell size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Nenhum lembrete configurado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reminders.map((r) => (
            <motion.div
              key={r.id}
              layout
              className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 ${!r.active && 'opacity-60'}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${r.active ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                <Pill size={24} />
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold text-slate-900">{r.medicationName}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Clock size={14} /> {r.dosage} • {r.frequency}
                  </span>
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Calendar size={14} /> {new Date(r.startDate).toLocaleDateString('pt-MZ')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleActive(r.id, r.active)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${r.active ? 'bg-teal-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${r.active ? 'right-1' : 'left-1'}`} />
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-slate-400 hover:text-red-600 transition-colors p-2"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MedicationReminders;

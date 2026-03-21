
import React, { useState, useEffect } from 'react';
import { User, Users, Plus, Trash2, Heart, Ruler, Weight, Calendar, ChevronRight, UserPlus } from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from './FirebaseProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useErrorBoundary } from 'react-error-boundary';

interface FamilyMember {
  id: string;
  ownerId: string;
  name: string;
  relationship: string;
  bloodType?: string;
  weight?: number;
  height?: number;
  birthDate?: string;
  photoUrl?: string;
}

const FamilyProfiles: React.FC = () => {
  const { user } = useFirebase();
  const { showBoundary } = useErrorBoundary();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    relationship: 'Filho(a)',
    bloodType: '',
    weight: 0,
    height: 0,
    birthDate: ''
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'family'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FamilyMember));
      setMembers(docs);
      setLoading(false);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'family');
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
      await addDoc(collection(db, 'family'), {
        ownerId: user.uid,
        ...newMember,
        createdAt: new Date().toISOString()
      });
      setNewMember({
        name: '',
        relationship: 'Filho(a)',
        bloodType: '',
        weight: 0,
        height: 0,
        birthDate: ''
      });
      setShowAdd(false);
    } catch (error) {
      console.error("Error adding family member:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este perfil familiar?')) {
      try {
        await deleteDoc(doc(db, 'family', id));
      } catch (error) {
        console.error("Error deleting family member:", error);
      }
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Perfis Familiares</h1>
          <p className="text-slate-500">Gerencie a saúde de quem você ama</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <UserPlus size={20} />
          Adicionar Dependente
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-lg mb-8"
          >
            <h2 className="text-lg font-semibold mb-4">Novo Dependente</h2>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Parentesco</label>
                <select
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={newMember.relationship}
                  onChange={(e) => setNewMember({ ...newMember, relationship: e.target.value })}
                >
                  <option value="Filho(a)">Filho(a)</option>
                  <option value="Pai/Mãe">Pai/Mãe</option>
                  <option value="Cônjuge">Cônjuge</option>
                  <option value="Irmão/Irmã">Irmão/Irmã</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo Sanguíneo</label>
                <input
                  type="text"
                  placeholder="Ex: O+"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={newMember.bloodType}
                  onChange={(e) => setNewMember({ ...newMember, bloodType: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={newMember.birthDate}
                  onChange={(e) => setNewMember({ ...newMember, birthDate: e.target.value })}
                />
              </div>
              <div className="flex justify-end md:col-span-2 gap-3 mt-4">
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
                  Salvar Perfil
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
      ) : members.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Nenhum dependente cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((m) => (
            <motion.div
              key={m.id}
              layout
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-teal-200 transition-colors cursor-pointer group"
            >
              <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition-colors">
                <User size={28} />
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold text-slate-900">{m.name}</h3>
                <p className="text-sm text-slate-500">{m.relationship}</p>
                <div className="flex gap-3 mt-2">
                  {m.bloodType && (
                    <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded flex items-center gap-1">
                      <Heart size={10} /> {m.bloodType}
                    </span>
                  )}
                  {m.birthDate && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                      <Calendar size={10} /> {new Date(m.birthDate).toLocaleDateString('pt-MZ')}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(m.id);
                }}
                className="text-slate-300 hover:text-red-500 transition-colors p-2"
              >
                <Trash2 size={18} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FamilyProfiles;

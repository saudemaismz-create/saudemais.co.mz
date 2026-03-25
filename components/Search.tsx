
import React, { useState, useMemo, useEffect } from 'react';
import { Search as SearchIcon, MapPin, Pill, Info, ChevronRight, Star, ShoppingCart, Plus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Medication, Pharmacy } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useCart } from './CartContext';
import { MOCK_PHARMACIES, MOCK_MEDICATIONS } from '../constants';

const Search: React.FC = () => {
  const navigate = useNavigate();
  const [queryStr, setQueryStr] = useState('');
  const [activeTab, setActiveTab] = useState<'meds' | 'pharmacies'>('meds');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem, items } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    const qMeds = query(collection(db, 'medications'));
    const unsubscribeMeds = onSnapshot(qMeds, (snapshot) => {
      const mData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication));
      setMedications(mData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'medications');
    });

    const qPharms = query(collection(db, 'pharmacies'));
    const unsubscribePharms = onSnapshot(qPharms, (snapshot) => {
      const pData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pharmacy));
      setPharmacies(pData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pharmacies');
    });

    return () => {
      unsubscribeMeds();
      unsubscribePharms();
    };
  }, []);

  const filteredMeds = useMemo(() => {
    const filtered = medications.filter(m => 
      m.name.toLowerCase().includes(queryStr.toLowerCase()) || 
      m.category.toLowerCase().includes(queryStr.toLowerCase())
    );
    // Sort: Sponsored first
    return [...filtered].sort((a, b) => (b.isSponsored ? 1 : 0) - (a.isSponsored ? 1 : 0));
  }, [queryStr, medications]);

  const filteredPharmacies = useMemo(() => {
    const filtered = pharmacies.filter(p => 
      p.name.toLowerCase().includes(queryStr.toLowerCase()) || 
      p.address.toLowerCase().includes(queryStr.toLowerCase())
    );
    // Sort: Featured first
    return [...filtered].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }, [queryStr, pharmacies]);

  const handleAddToCart = (med: Medication) => {
    addItem({
      ...med,
      pharmacyId: med.availableAt?.[0] || 'default'
    } as any);
    setAddedId(med.id);
    setTimeout(() => setAddedId(null), 2000);
  };

  const isItemInCart = (id: string) => items.some(i => i.id === id);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <h1 className="text-3xl font-black mb-6 text-slate-900 tracking-tight italic">Encontre o que precisa</h1>
        <div className="relative group">
          <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={24} />
          <input 
            type="text"
            placeholder={activeTab === 'meds' ? "Nome do remédio (ex: Paracetamol)..." : "Farmácia por nome ou bairro..."}
            className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-teal-500/10 transition-all font-medium text-lg"
            value={queryStr}
            onChange={(e) => setQueryStr(e.target.value)}
          />
        </div>

        <div className="flex gap-4 mt-8">
          <button 
            onClick={() => setActiveTab('meds')}
            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black transition-all ${
              activeTab === 'meds' ? 'bg-teal-600 text-white shadow-xl shadow-teal-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Pill size={20} /> MEDICAMENTOS
          </button>
          <button 
            onClick={() => setActiveTab('pharmacies')}
            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black transition-all ${
              activeTab === 'pharmacies' ? 'bg-teal-600 text-white shadow-xl shadow-teal-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <MapPin size={20} /> FARMÁCIAS
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto"></div>
          </div>
        ) : activeTab === 'meds' ? (
          filteredMeds.length > 0 ? (
            filteredMeds.map((med) => (
              <div 
                key={med.id} 
                onClick={() => navigate(`/app/product/${med.id}`)}
                className={`bg-white p-5 rounded-[2rem] border flex gap-6 hover:shadow-xl transition-all group items-center relative overflow-hidden cursor-pointer ${med.isSponsored ? 'border-teal-200 bg-teal-50/10' : 'border-slate-50'}`}
              >
                {med.isSponsored && (
                  <div className="absolute top-0 right-0 bg-teal-600 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                    Patrocinado
                  </div>
                )}
                <img 
                  src={med.image} 
                  className="w-28 h-28 rounded-2xl object-cover bg-slate-50 shadow-sm transition-transform duration-500 group-hover:scale-105" 
                  alt={med.name} 
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">{med.name}</h3>
                      <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-full uppercase tracking-widest">{med.category}</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{med.price.toLocaleString()} <span className="text-sm font-bold text-slate-400">MT</span></p>
                  </div>
                  <p className="text-sm text-slate-500 mt-2 line-clamp-1 font-medium">{med.description}</p>
                  <div className="flex items-center justify-between mt-5">
                    <div className="flex items-center gap-4 text-[10px] uppercase font-black text-slate-400">
                      <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg">
                        <MapPin size={14} className="text-teal-500" /> Disponível
                      </span>
                      {med.requiresPrescription && (
                        <span className="text-rose-500 flex items-center gap-1.5 bg-rose-50 px-3 py-1 rounded-lg">
                          <Info size={14} /> Receita Necessária
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(med);
                      }}
                      className={`p-3 rounded-2xl shadow-lg hover:scale-110 transition-all flex items-center gap-2 px-5 ${
                        addedId === med.id ? 'bg-green-500 text-white' : 'bg-teal-600 text-white'
                      }`}
                    >
                      {addedId === med.id ? <Check size={18} /> : <ShoppingCart size={18} />}
                      <span className="text-xs font-black">{addedId === med.id ? 'ADICIONADO' : 'COMPRAR'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200 text-slate-400 font-bold italic">Nenhum medicamento encontrado.</div>
          )
        ) : (
          filteredPharmacies.length > 0 ? (
            filteredPharmacies.map((pharm) => (
              <div key={pharm.id} className={`bg-white p-6 rounded-[2rem] border flex gap-6 hover:shadow-xl transition-all group items-center relative overflow-hidden ${pharm.featured ? 'border-teal-200 bg-teal-50/10' : 'border-slate-50'}`}>
                {pharm.featured && (
                  <div className="absolute top-0 right-0 bg-teal-600 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                    Destaque
                  </div>
                )}
                <img 
                  src={pharm.image} 
                  className="w-32 h-32 rounded-3xl object-cover shadow-sm" 
                  alt={pharm.name} 
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-black text-slate-900">{pharm.name}</h3>
                    <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-xl text-xs font-black">
                      <Star size={14} fill="currentColor" /> {pharm.rating}
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 font-medium">{pharm.address}</p>
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-4">
                       <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl ${pharm.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                         {pharm.isOpen ? 'Aberta Agora' : 'Fechada'}
                       </span>
                       <span className="text-xs text-slate-400 font-bold tracking-tight">{pharm.distance || 'Próximo de si'}</span>
                    </div>
                    <button onClick={() => alert('Funcionalidade em desenvolvimento.')} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs hover:bg-teal-600 transition-all shadow-lg">
                      COMO CHEGAR
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200 text-slate-400 font-bold italic">Nenhuma farmácia encontrada próxima.</div>
          )
        )}
      </div>
    </div>

  );
};

export default Search;

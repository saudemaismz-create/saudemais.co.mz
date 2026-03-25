
import React, { useState } from 'react';
import { Camera, Upload, Search, FileText, AlertCircle, ShoppingCart, ChevronRight, Loader2, CheckCircle2, Sparkles, MapPin, Bot, ShieldAlert } from 'lucide-react';
import { analyzePrescription } from '../services/geminiService';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Medication } from '../types';
import { useCart } from './CartContext';
import { motion, AnimatePresence } from 'motion/react';

const PrescriptionPrice: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [medications, setMedications] = useState<(Medication & { found: boolean; originalName: string })[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setMedications([]);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setError(null);
    setMedications([]);

    try {
      // Remove data:image/jpeg;base64, prefix
      const base64Data = image.split(',')[1];
      const extractedNames = await analyzePrescription(base64Data);

      if (extractedNames.length === 0) {
        setError("Não foi possível identificar medicamentos nesta imagem. Por favor, tente uma foto mais clara.");
        setIsAnalyzing(false);
        return;
      }

      const foundMedications: (Medication & { found: boolean; originalName: string })[] = [];

      for (const name of extractedNames) {
        // Simple search in Firestore
        const medsRef = collection(db, 'medications');
        // Try exact match first (case insensitive is hard in Firestore, so we'll do a few variations or just fetch and filter)
        // For simplicity in this demo, we'll use a prefix search or similar if possible, 
        // but Firestore doesn't support case-insensitive search easily.
        // We'll search for the name as is.
        const q = query(medsRef, where('name', '>=', name), where('name', '<=', name + '\uf8ff'), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const medData = querySnapshot.docs[0].data() as Medication;
          foundMedications.push({ ...medData, id: querySnapshot.docs[0].id, found: true, originalName: name });
        } else {
          // Add a placeholder for not found
          foundMedications.push({ 
            id: `not-found-${name}`,
            name: name,
            description: 'Medicamento não encontrado no nosso sistema.',
            category: 'N/A',
            price: 0,
            availableAt: [],
            requiresPrescription: true,
            image: '',
            found: false,
            originalName: name
          });
        }
      }

      setMedications(foundMedications);
    } catch (err) {
      console.error(err);
      setError("Ocorreu um erro ao analisar a receita. Por favor, tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-600 rounded-full text-xs font-black uppercase tracking-widest mb-6 border border-teal-100">
              <Sparkles size={14} /> IA Scanner de Receitas
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none mb-6 italic">
              Quanto custa a sua <span className="text-teal-600">Receita?</span>
            </h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              Carregue uma foto da sua receita médica e nossa IA identificará os medicamentos e mostrará os preços em tempo real nas farmácias parceiras.
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <div className="w-32 h-32 bg-teal-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-teal-200 rotate-3">
              <FileText size={64} />
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className={`relative aspect-[4/3] rounded-[2.5rem] border-4 border-dashed transition-all duration-500 flex flex-col items-center justify-center overflow-hidden ${
              image ? 'border-teal-500 bg-white' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-teal-300'
            }`}>
              {image ? (
                <>
                  <img src={image} alt="Receita" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setImage(null)}
                    className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-md text-rose-500 rounded-2xl shadow-xl hover:bg-rose-500 hover:text-white transition-all"
                  >
                    <AlertCircle size={20} />
                  </button>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-8 text-center">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-teal-600 shadow-xl mb-6 group-hover:scale-110 transition-transform">
                    <Camera size={40} />
                  </div>
                  <p className="text-slate-900 font-black text-xl tracking-tight mb-2">Tirar Foto ou Carregar</p>
                  <p className="text-slate-400 font-medium text-sm">JPG, PNG ou PDF (máx. 5MB)</p>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!image || isAnalyzing}
              className={`w-full py-6 rounded-[2rem] font-black text-lg tracking-tight flex items-center justify-center gap-3 transition-all ${
                !image || isAnalyzing 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-teal-600 text-white shadow-2xl shadow-teal-200 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin" size={24} /> ANALISANDO RECEITA...
                </>
              ) : (
                <>
                  <Search size={24} /> VERIFICAR PREÇOS
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 flex flex-col">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3 italic">
              <ShoppingCart className="text-teal-600" size={24} />
              Resultados da Análise
            </h3>

            <div className="flex-1 space-y-4 pr-2">
              <AnimatePresence mode="popLayout">
                {medications.length > 0 ? (
                  medications.map((med, idx) => (
                    <motion.div 
                      key={med.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-5 rounded-2xl border transition-all ${
                        med.found ? 'bg-white border-teal-100 shadow-sm' : 'bg-rose-50 border-rose-100'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Medicamento Identificado</p>
                          <h4 className="font-black text-slate-900 text-lg tracking-tight">{med.originalName}</h4>
                        </div>
                        {med.found && (
                          <div className="bg-teal-500 text-white p-1.5 rounded-lg">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                      </div>
                      
                      {med.found ? (
                        <div className="flex items-center justify-between mt-4">
                          <div>
                            <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Preço Estimado</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tighter">
                              {med.price.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}
                            </p>
                          </div>
                          <button 
                            onClick={() => addItem({ ...med, quantity: 1 })}
                            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-600 transition-colors"
                          >
                            Adicionar
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-rose-500 font-bold italic mt-2">Não encontramos este medicamento em stock.</p>
                      )}
                    </motion.div>
                  ))
                ) : !isAnalyzing && !error ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-12">
                    <FileText size={48} className="mb-4" />
                    <p className="font-bold text-slate-500">Aguardando análise da receita...</p>
                  </div>
                ) : null}
              </AnimatePresence>

              {error && (
                <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-center">
                  <AlertCircle className="text-rose-500 mx-auto mb-3" size={32} />
                  <p className="text-rose-600 font-bold text-sm">{error}</p>
                </div>
              )}
            </div>

            {medications.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Estimado</p>
                    <p className="text-3xl font-black text-teal-600 tracking-tighter">
                      {medications.reduce((acc, m) => acc + (m.found ? m.price : 0), 0).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Itens Encontrados</p>
                    <p className="text-xl font-black text-slate-900">{medications.filter(m => m.found).length} / {medications.length}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    medications.filter(m => m.found).forEach(m => addItem({ ...m, quantity: 1 }));
                    alert('Todos os medicamentos encontrados foram adicionados ao carrinho!');
                  }}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-widest uppercase hover:bg-teal-600 transition-all flex items-center justify-center gap-2"
                >
                  ADICIONAR TUDO AO CARRINHO <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Privacidade Total', desc: 'Suas receitas são processadas de forma segura e não são armazenadas permanentemente.', icon: ShieldAlert },
          { title: 'Preços Reais', desc: 'Conectamos diretamente com o stock das farmácias locais para dar o preço exato.', icon: MapPin },
          { title: 'IA Especializada', desc: 'Nossa inteligência artificial é treinada para ler caligrafias médicas complexas.', icon: Bot }
        ].map((feature, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="bg-teal-50 p-3 rounded-2xl text-teal-600">
              <feature.icon size={24} />
            </div>
            <div>
              <h4 className="font-black text-slate-900 mb-1">{feature.title}</h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrescriptionPrice;

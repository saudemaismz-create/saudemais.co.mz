
import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, Trash2, Plus, Camera, Image as ImageIcon, X } from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from './FirebaseProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useErrorBoundary } from 'react-error-boundary';

interface Prescription {
  id: string;
  userId: string;
  imageUrl: string;
  status: 'Pendente' | 'Aprovada' | 'Rejeitada';
  createdAt: any;
  notes?: string;
}

const PrescriptionManager: React.FC = () => {
  const { user } = useFirebase();
  const { showBoundary } = useErrorBoundary();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newPrescription, setNewPrescription] = useState({
    imageUrl: '',
    notes: ''
  });

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setPreviewUrl(compressed);
      setNewPrescription(prev => ({ ...prev, imageUrl: compressed }));
      setError(null);
    } catch (error) {
      console.error("Error processing image:", error);
      setError("Erro ao processar imagem. Tente novamente.");
    }
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'prescriptions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription));
      setPrescriptions(docs);
      setLoading(false);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'prescriptions');
      } catch (err) {
        showBoundary(err);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPrescription.imageUrl) return;

    setUploading(true);
    try {
      await addDoc(collection(db, 'prescriptions'), {
        userId: user.uid,
        imageUrl: newPrescription.imageUrl,
        notes: newPrescription.notes,
        status: 'Pendente',
        createdAt: new Date().toISOString()
      });
      setNewPrescription({ imageUrl: '', notes: '' });
      setPreviewUrl(null);
      setShowUpload(false);
    } catch (error) {
      console.error("Error uploading prescription:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta receita?')) {
      try {
        await deleteDoc(doc(db, 'prescriptions', id));
      } catch (error) {
        console.error("Error deleting prescription:", error);
      }
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minhas Receitas</h1>
          <p className="text-slate-500">Gerencie suas prescrições médicas digitais</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus size={20} />
          Enviar Receita
        </button>
      </div>

      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8"
          >
            <h2 className="text-lg font-semibold mb-4">Nova Receita</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50 transition-colors hover:bg-slate-100">
                {previewUrl ? (
                  <div className="relative w-full max-w-xs aspect-[3/4] rounded-lg overflow-hidden shadow-md">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewUrl(null);
                        setNewPrescription(prev => ({ ...prev, imageUrl: '' }));
                      }}
                      className="absolute top-2 right-2 p-1 bg-white/80 backdrop-blur-sm rounded-full text-rose-600 hover:bg-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-teal-500 hover:text-teal-600 transition-all"
                      >
                        <Camera size={32} />
                        <span className="text-xs font-bold">Câmera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-teal-500 hover:text-teal-600 transition-all"
                      >
                        <ImageIcon size={32} />
                        <span className="text-xs font-bold">Galeria</span>
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 text-center">Tire uma foto nítida da sua receita médica</p>
                  </div>
                )}

                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas (Opcional)</label>
                <textarea
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  rows={3}
                  value={newPrescription.notes}
                  onChange={(e) => setNewPrescription({ ...newPrescription, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? <Clock className="animate-spin" size={18} /> : <Upload size={18} />}
                  {uploading ? 'Enviando...' : 'Confirmar Envio'}
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
      ) : prescriptions.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Nenhuma receita encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prescriptions.map((p) => (
            <motion.div
              key={p.id}
              layout
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4"
            >
              <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={p.imageUrl}
                  alt="Receita"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    p.status === 'Aprovada' ? 'bg-green-100 text-green-700' :
                    p.status === 'Rejeitada' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {p.status}
                  </span>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{p.notes || 'Sem notas'}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(p.createdAt).toLocaleDateString('pt-MZ')}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PrescriptionManager;

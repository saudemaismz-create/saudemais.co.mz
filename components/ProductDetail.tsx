
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Medication, Pharmacy } from '../types';
import { useCart } from './CartContext';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Star, 
  ShieldCheck, 
  Truck, 
  Clock, 
  MapPin,
  Info,
  ChevronRight,
  Heart
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useErrorBoundary } from 'react-error-boundary';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { showBoundary } = useErrorBoundary();
  
  const [product, setProduct] = useState<Medication | null>(null);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<Medication[]>([]);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'medications', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const productData = { id: docSnap.id, ...docSnap.data() } as Medication;
          setProduct(productData);
          
          // Fetch pharmacy info if available
          if (productData.pharmacyId) {
            const pharmRef = doc(db, 'pharmacies', productData.pharmacyId);
            const pharmSnap = await getDoc(pharmRef);
            if (pharmSnap.exists()) {
              setPharmacy({ id: pharmSnap.id, ...pharmSnap.data() } as Pharmacy);
            }
          }

          // Fetch related products (same category)
          const qRelated = query(
            collection(db, 'medications'),
            where('category', '==', productData.category),
            limit(5)
          );
          
          const unsubscribeRelated = onSnapshot(qRelated, (snapshot) => {
            const related = snapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() } as Medication))
              .filter(p => p.id !== id);
            setRelatedProducts(related);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'medications');
          });

          return () => unsubscribeRelated();
        } else {
          navigate('/app/search');
        }
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.GET, `medications/${id}`);
        } catch (err) {
          showBoundary(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate, showBoundary]);

  const handleAddToCart = () => {
    if (product) {
      for (let i = 0; i < quantity; i++) {
        addItem(product);
      }
      // Optional: show success toast or navigate to cart
      alert(`${quantity}x ${product.name} adicionado ao carrinho!`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-600 hover:text-teal-600 transition-all shadow-sm"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-slate-800 italic">Detalhes do Produto</h1>
        <button className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-rose-500 transition-all shadow-sm">
          <Heart size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="relative group">
          <div className="aspect-square rounded-[3rem] overflow-hidden bg-white border border-slate-100 shadow-xl">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
          </div>
          {product.isSponsored && (
            <div className="absolute top-6 right-6 bg-teal-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
              Destaque Saúde Mais
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-6">
            <span className="text-teal-600 font-black text-xs uppercase tracking-[0.2em] mb-2 block">
              {product.category}
            </span>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4 leading-tight">
              {product.name}
            </h2>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-xl">
                <Star size={16} className="text-amber-500 fill-amber-500" />
                <span className="text-amber-700 font-black text-sm">{product.rating || '4.8'}</span>
              </div>
              <span className="text-slate-400 text-sm font-medium">({product.reviewCount || '120+'} avaliações)</span>
            </div>

            <div className="text-3xl font-black text-teal-700 mb-8">
              {product.price.toLocaleString()} MT
            </div>

            <p className="text-slate-500 leading-relaxed mb-8 text-lg font-medium">
              {product.description || 'Este medicamento é indicado para o tratamento de sintomas específicos. Consulte sempre um profissional de saúde antes de iniciar qualquer tratamento.'}
            </p>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qualidade</p>
                  <p className="text-xs font-bold text-slate-700">Certificado</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  <Truck size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrega</p>
                  <p className="text-xs font-bold text-slate-700">Rápida</p>
                </div>
              </div>
            </div>

            {/* Quantity and Add to Cart */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-auto">
              <div className="flex items-center bg-slate-100 rounded-2xl p-1 w-full sm:w-auto">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-white rounded-xl transition-colors text-slate-600"
                >
                  <Minus size={20} />
                </button>
                <span className="px-6 font-black text-xl text-slate-800 min-w-[60px] text-center">
                  {quantity}
                </span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 hover:bg-white rounded-xl transition-colors text-slate-600"
                >
                  <Plus size={20} />
                </button>
              </div>
              <button 
                onClick={handleAddToCart}
                className="flex-1 w-full py-5 bg-teal-600 text-white font-black rounded-2xl shadow-2xl shadow-teal-900/20 hover:scale-[1.02] hover:bg-teal-500 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
              >
                <ShoppingBag size={20} />
                Adicionar ao Carrinho
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pharmacy Info */}
      {pharmacy && (
        <section className="mt-16 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-100 shrink-0">
                <img src={pharmacy.image} alt={pharmacy.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mb-1">Vendido por</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{pharmacy.name}</h3>
                <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mt-1">
                  <MapPin size={14} className="text-teal-500" />
                  <span>{pharmacy.address}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => navigate('/app/search')}
              className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-2 uppercase tracking-widest text-xs"
            >
              Ver Farmácia <ChevronRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <div className="flex items-center justify-between mb-8 px-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight italic">Produtos Relacionados</h2>
            <button onClick={() => navigate('/app/search')} className="text-teal-600 font-bold hover:underline">Ver todos</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {relatedProducts.map((med) => (
              <div 
                key={med.id} 
                onClick={() => navigate(`/app/product/${med.id}`)}
                className="group bg-white rounded-3xl border border-slate-100 p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 cursor-pointer"
              >
                <div className="relative mb-4 overflow-hidden rounded-2xl aspect-square">
                  <img 
                    src={med.image} 
                    alt={med.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h4 className="font-bold text-slate-800 text-sm truncate mb-1">{med.name}</h4>
                <p className="text-[10px] text-slate-400 font-medium mb-3">{med.category}</p>
                <p className="text-teal-700 font-black text-base">{med.price.toLocaleString()} MT</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;

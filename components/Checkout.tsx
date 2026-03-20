
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  ChevronLeft, 
  MapPin, 
  Phone, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  Truck,
  ArrowRight,
  Trash2,
  Plus,
  Minus,
  Smartphone,
  X
} from 'lucide-react';
import { useCart } from './CartContext';
import { useFirebase } from './FirebaseProvider';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Order } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { items, total, removeItem, updateQuantity, clearCart } = useCart();
  const { user, profile } = useFirebase();
  
  const [step, setStep] = useState<'cart' | 'shipping' | 'payment' | 'success'>('cart');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    address: '',
    phone: '',
    paymentMethod: 'mpesa' as 'mpesa' | 'emola'
  });

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'waiting' | 'success' | 'error'>('idle');
  const [orderId, setOrderId] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitOrder = async () => {
    if (!user || !profile) {
      setError('Você precisa estar logado para finalizar a compra.');
      return;
    }

    if (!formData.address || !formData.phone) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    setError(null);
    setIsProcessingPayment(true);
    setPaymentStatus('waiting');

    try {
      // Simulate payment gateway delay (M-Pesa/e-Mola USSD prompt)
      await new Promise(resolve => setTimeout(resolve, 3500));

      const orderData: Omit<Order, 'id'> = {
        customerName: profile.name,
        customerUid: user.uid,
        items: items,
        total: total,
        status: 'Pendente',
        createdAt: serverTimestamp(),
        address: formData.address,
        phone: formData.phone,
        paymentMethod: formData.paymentMethod,
        pharmacyIds: Array.from(new Set(items.map(i => i.pharmacyId).filter(Boolean))) as string[]
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      setOrderId(docRef.id);
      
      setPaymentStatus('success');
      // Short delay to show success before moving to success step
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStep('success');
      clearCart();
    } catch (err) {
      setPaymentStatus('error');
      handleFirestoreError(err, OperationType.WRITE, 'orders');
      setError('Ocorreu um erro ao processar seu pedido. Tente novamente.');
    } finally {
      setLoading(false);
      setIsProcessingPayment(false);
    }
  };

  if (items.length === 0 && step !== 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="bg-slate-100 p-8 rounded-[3rem] mb-8">
          <ShoppingBag size={80} className="text-slate-300" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">Seu carrinho está vazio</h2>
        <p className="text-slate-500 font-bold mb-10 max-w-xs">Adicione alguns medicamentos para começar a sua jornada de saúde.</p>
        <button 
          onClick={() => navigate('/app/search')}
          className="px-10 py-5 bg-teal-600 text-white rounded-[2rem] font-black shadow-2xl shadow-teal-100 hover:scale-105 transition-transform active:scale-95"
        >
          BUSCAR MEDICAMENTOS
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Payment Processing Overlay */}
      {isProcessingPayment && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white max-w-sm w-full p-10 rounded-[3rem] shadow-2xl text-center"
          >
            {paymentStatus === 'waiting' && (
              <>
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 border-4 border-teal-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-teal-600 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-teal-600">
                    <Smartphone size={32} />
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Aguardando Pagamento</h3>
                <p className="text-sm font-medium text-slate-500 mb-6">
                  Por favor, confirme a transação no seu telemóvel (Prompt USSD enviado para {formData.phone}).
                </p>
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A aguardar resposta...</span>
                </div>
              </>
            )}
            {paymentStatus === 'success' && (
              <>
                <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Pagamento Confirmado</h3>
                <p className="text-sm font-medium text-slate-500">Processando o seu pedido...</p>
              </>
            )}
            {paymentStatus === 'error' && (
              <>
                <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-8">
                  <X size={48} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Erro no Pagamento</h3>
                <p className="text-sm font-medium text-slate-500 mb-6">Não foi possível processar o pagamento. Por favor, tente novamente.</p>
                <button 
                  onClick={() => setIsProcessingPayment(false)}
                  className="w-full py-3 bg-slate-900 text-white font-black rounded-xl"
                >
                  TENTAR NOVAMENTE
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <button 
          onClick={() => step === 'cart' ? navigate(-1) : setStep(step === 'shipping' ? 'cart' : 'shipping')}
          className="p-3 bg-white text-slate-900 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Checkout</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
            {step === 'cart' && 'Revisão do Carrinho'}
            {step === 'shipping' && 'Endereço de Entrega'}
            {step === 'payment' && 'Pagamento Móvel'}
            {step === 'success' && 'Pedido Confirmado'}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Sidebar Summary - Moved to top on mobile */}
        {step !== 'success' && (
          <div className="lg:w-1/3 order-1 lg:order-2 space-y-6">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-50">
              <h3 className="text-xl font-black text-slate-900 mb-6 tracking-tight">Resumo</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-slate-500 font-bold">
                  <span>Subtotal</span>
                  <span>{total.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-bold">
                  <span>Entrega</span>
                  <span className="text-teal-600">Grátis</span>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                  <span className="text-slate-900 font-black">Total</span>
                  <span className="text-3xl font-black text-teal-600 tracking-tighter">
                    {total.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}
                  </span>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex gap-3 text-rose-600 text-xs font-bold">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <button 
                onClick={() => {
                  if (step === 'cart') setStep('shipping');
                  else if (step === 'shipping') setStep('payment');
                  else handleSubmitOrder();
                }}
                disabled={loading}
                className="w-full py-5 bg-teal-600 text-white rounded-[2rem] font-black shadow-2xl shadow-teal-100 flex items-center justify-center gap-3 hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
              >
                {loading ? (
                  <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {step === 'cart' && 'CONTINUAR'}
                    {step === 'shipping' && 'PAGAMENTO'}
                    {step === 'payment' && 'FINALIZAR COMPRA'}
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>

            <div className="hidden lg:block bg-teal-600 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white opacity-10 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
              <Truck className="mb-4 opacity-50" size={32} />
              <h4 className="text-lg font-black mb-2 tracking-tight">Entrega Rápida</h4>
              <p className="text-teal-100 text-xs font-bold leading-relaxed">
                Entregamos em toda Maputo e Matola em menos de 60 minutos.
              </p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className={`lg:w-2/3 order-2 lg:order-1 ${step === 'success' ? 'w-full' : ''}`}>
          <AnimatePresence mode="wait">
            {step === 'cart' && (
              <motion.div 
                key="cart"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {items.map((item) => (
                  <div key={item.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-50 flex items-center gap-5 group">
                    <div className="w-24 h-24 bg-slate-50 rounded-3xl overflow-hidden flex-shrink-0">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">{item.name}</h3>
                      <p className="text-teal-600 font-black text-xl">{item.price.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</p>
                      
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center bg-slate-50 rounded-xl p-1">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-500"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center font-black text-slate-900">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-500"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {step === 'shipping' && (
              <motion.div 
                key="shipping"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50 space-y-8"
              >
                <div className="space-y-6">
                  <div className="relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Endereço de Entrega</label>
                    <div className="relative">
                      <MapPin className="absolute left-5 top-5 text-teal-600" size={20} />
                      <textarea 
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Ex: Av. Eduardo Mondlane, Prédio 123, R/C, Maputo"
                        className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-[2rem] font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-teal-500 min-h-[120px] resize-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Telefone de Contacto</label>
                    <div className="relative">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-teal-600" size={20} />
                      <input 
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="Ex: 84 123 4567"
                        className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-[2rem] font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'payment' && (
              <motion.div 
                key="payment"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50 space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'mpesa' }))}
                    className={`p-8 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-4 ${
                      formData.paymentMethod === 'mpesa' 
                        ? 'border-teal-600 bg-teal-50/30' 
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl">M</div>
                    <span className="font-black text-slate-900">M-Pesa</span>
                  </button>

                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'emola' }))}
                    className={`p-8 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-4 ${
                      formData.paymentMethod === 'emola' 
                        ? 'border-teal-600 bg-teal-50/30' 
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl">E</div>
                    <span className="font-black text-slate-900">e-Mola</span>
                  </button>
                </div>

                <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
                  <AlertCircle className="text-amber-600 flex-shrink-0" size={24} />
                  <p className="text-amber-900 text-sm font-bold leading-relaxed">
                    Após confirmar o pedido, você receberá uma notificação no seu celular para autorizar o pagamento.
                  </p>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-12 rounded-[4rem] shadow-2xl border border-teal-50 text-center space-y-8"
              >
                <div className="w-32 h-32 bg-teal-100 rounded-[3rem] flex items-center justify-center mx-auto">
                  <CheckCircle2 size={64} className="text-teal-600" />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Pedido Realizado!</h2>
                  {orderId && (
                    <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mb-4">ID: #{orderId.substring(0, 8)}</p>
                  )}
                  <p className="text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
                    Seu pedido foi recebido e está sendo processado. Você pode acompanhar o status no seu perfil.
                  </p>
                </div>
                <div className="pt-6">
                  <button 
                    onClick={() => navigate('/app')}
                    className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black shadow-xl hover:scale-105 transition-transform active:scale-95"
                  >
                    VOLTAR AO INÍCIO
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Checkout;


import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, ArrowLeft, Truck, Droplets, Calendar, MessageSquare, Heart, AlertCircle, Sparkles, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './ToastContext';
import { useFirebase } from './FirebaseProvider';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  writeBatch, 
  doc, 
  deleteDoc, 
  updateDoc,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: any;
  actionUrl?: string;
}

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, profile } = useFirebase();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: user?.uid,
        email: user?.email,
        emailVerified: user?.emailVerified,
        isAnonymous: user?.isAnonymous,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    showToast(`Erro: ${error instanceof Error ? error.message : 'Falha na operação'}`, 'error');
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(docs);
      setUnreadCount(docs.filter(n => !n.read).length);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const seedSampleNotifications = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const samples = [
        {
          userId: user.uid,
          title: 'Entrega em Caminho',
          message: 'O seu pedido #8821 está em trânsito e chegará em breve.',
          type: 'info',
          read: false,
          createdAt: Timestamp.now(),
        },
        {
          userId: user.uid,
          title: 'Dica de Saúde',
          message: 'Lembre-se de beber pelo menos 2L de água hoje.',
          type: 'success',
          read: false,
          createdAt: new Timestamp(Timestamp.now().seconds - 3600, 0),
        },
        {
          userId: user.uid,
          title: 'Consulta Agendada',
          message: 'Sua consulta com Dr. Silva é amanhã às 09:00.',
          type: 'info',
          read: true,
          createdAt: new Timestamp(Timestamp.now().seconds - 7200, 0),
        }
      ];

      samples.forEach(s => {
        const docRef = doc(collection(db, 'notifications'));
        batch.set(docRef, s);
      });

      await batch.commit();
      showToast('Notificações de exemplo geradas com sucesso!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications (seed)');
    }
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) {
      showToast('Todas as notificações já estão lidas', 'info');
      return;
    }

    try {
      setActionLoading(true);
      const batch = writeBatch(db);
      unreadNotifications.forEach(notif => {
        const docRef = doc(db, 'notifications', notif.id);
        batch.update(docRef, { read: true });
      });
      await batch.commit();
      showToast('Todas as notificações foram marcadas como lidas', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications (batch)');
    } finally {
      setActionLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const docRef = doc(db, 'notifications', id);
      await updateDoc(docRef, { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const docRef = doc(db, 'notifications', id);
      await deleteDoc(docRef);
      showToast('Notificação eliminada', 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const clearAll = async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      notifications.forEach(notif => {
        const docRef = doc(db, 'notifications', notif.id);
        batch.delete(docRef);
      });
      await batch.commit();
      showToast('Todas as notificações foram removidas', 'warning');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notifications (batch)');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return Heart;
      case 'warning': return AlertCircle;
      case 'error': return AlertCircle;
      default: return Bell;
    }
  };

  const getColors = (type: string) => {
    switch (type) {
      case 'success': return { bg: 'bg-teal-50', text: 'text-teal-600' };
      case 'warning': return { bg: 'bg-amber-50', text: 'text-amber-600' };
      case 'error': return { bg: 'bg-rose-50', text: 'text-rose-600' };
      default: return { bg: 'bg-blue-50', text: 'text-blue-600' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 bg-white rounded-xl border border-slate-100 text-slate-500 hover:text-teal-600 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notificações</h1>
        </div>
        <div className="flex gap-2">
          {notifications.some(n => !n.read) && (
            <button 
              onClick={markAllAsRead}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-xl text-sm font-bold hover:bg-teal-100 transition-all disabled:opacity-50"
            >
              <CheckCheck size={18} className={actionLoading ? 'animate-pulse' : ''} />
              <span className="hidden sm:inline">{actionLoading ? 'Processando...' : 'Marcar todas lidas'}</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all font-sans"
            >
              <Trash2 size={18} />
              <span className="hidden sm:inline">Limpar tudo</span>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((notif, index) => {
              const Icon = getIcon(notif.type);
              const colors = getColors(notif.type);
              const date = notif.createdAt instanceof Timestamp ? notif.createdAt.toDate() : new Date(notif.createdAt);
              
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  key={notif.id} 
                  className={`p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative group ${!notif.read ? 'ring-2 ring-teal-500/10' : ''}`}
                >
                  {!notif.read && (
                    <div className="absolute top-6 right-6 w-3 h-3 bg-teal-500 rounded-full"></div>
                  )}
                  <div className="flex gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}>
                      <Icon size={28} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`text-lg font-black ${!notif.read ? 'text-slate-900' : 'text-slate-700'}`}>{notif.title}</h3>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                          <Clock size={12} />
                          <span>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <p className="text-slate-500 leading-relaxed font-medium">{notif.message}</p>
                      <div className="mt-4 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.read && (
                          <button 
                            onClick={() => markAsRead(notif.id)}
                            className="text-xs font-bold text-teal-600 hover:underline"
                          >
                            Marcar como lida
                          </button>
                        )}
                        <button 
                          onClick={() => deleteNotification(notif.id)}
                          className="text-xs font-bold text-rose-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm"
          >
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Bell size={40} className="text-slate-300" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Sem notificações</h2>
            <p className="text-slate-500 mt-2 font-medium">Você está em dia com todas as suas mensagens.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => navigate('/app')}
                className="mt-8 px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition-colors"
              >
                VOLTAR AO INÍCIO
              </button>
              <button 
                onClick={seedSampleNotifications}
                className="mt-8 px-8 py-3 bg-teal-600 text-white rounded-xl font-black shadow-lg shadow-teal-200 hover:scale-105 transition-transform"
              >
                GERAR EXEMPLOS
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notifications;

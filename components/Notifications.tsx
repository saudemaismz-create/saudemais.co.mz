
import React, { useState } from 'react';
import { Bell, CheckCheck, Trash2, ArrowLeft, Truck, Droplets, Calendar, MessageSquare, Heart, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([
    { 
      id: '1', 
      title: 'Entrega em Caminho', 
      message: 'O seu pedido #8821 está em trânsito e chegará em breve. O estafeta está a caminho da sua localização.', 
      time: '10 min atrás', 
      read: false, 
      icon: Truck, 
      bg: 'bg-blue-50', 
      color: 'text-blue-600' 
    },
    { 
      id: '2', 
      title: 'Dica de Saúde', 
      message: 'Lembre-se de beber pelo menos 2L de água hoje. A hidratação é fundamental para o bom funcionamento do seu organismo.', 
      time: '2h atrás', 
      read: false, 
      icon: Droplets, 
      bg: 'bg-teal-50', 
      color: 'text-teal-600' 
    },
    { 
      id: '3', 
      title: 'Consulta Agendada', 
      message: 'Sua consulta com Dr. Silva é amanhã às 09:00 no Hospital Central de Maputo. Não se esqueça de levar os exames anteriores.', 
      time: '5h atrás', 
      read: true, 
      icon: Calendar, 
      bg: 'bg-indigo-50', 
      color: 'text-indigo-600' 
    },
    { 
      id: '4', 
      title: 'Nova Funcionalidade', 
      message: 'Agora você pode usar a nossa IA para tirar dúvidas sobre medicamentos em tempo real!', 
      time: '1 dia atrás', 
      read: true, 
      icon: Sparkles, 
      bg: 'bg-amber-50', 
      color: 'text-amber-600' 
    },
    { 
      id: '5', 
      title: 'Perfil Atualizado', 
      message: 'As suas informações de saúde foram atualizadas com sucesso.', 
      time: '2 dias atrás', 
      read: true, 
      icon: Heart, 
      bg: 'bg-rose-50', 
      color: 'text-rose-600' 
    }
  ]);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

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
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-xl text-sm font-bold hover:bg-teal-100 transition-all"
          >
            <CheckCheck size={18} />
            <span className="hidden sm:inline">Marcar todas como lidas</span>
          </button>
          <button 
            onClick={clearAll}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all"
          >
            <Trash2 size={18} />
            <span className="hidden sm:inline">Limpar tudo</span>
          </button>
        </div>
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-4">
          {notifications.map((notif, index) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={notif.id} 
              className={`p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative group ${!notif.read ? 'ring-2 ring-teal-500/10' : ''}`}
            >
              {!notif.read && (
                <div className="absolute top-6 right-6 w-3 h-3 bg-teal-500 rounded-full"></div>
              )}
              <div className="flex gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${notif.bg} ${notif.color}`}>
                  <notif.icon size={28} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-lg font-black ${!notif.read ? 'text-slate-900' : 'text-slate-700'}`}>{notif.title}</h3>
                    <span className="text-xs font-bold text-slate-400">{notif.time}</span>
                  </div>
                  <p className="text-slate-500 leading-relaxed font-medium">{notif.message}</p>
                  <div className="mt-4 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n))}
                      className="text-xs font-bold text-teal-600 hover:underline"
                    >
                      Marcar como lida
                    </button>
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
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <Bell size={40} className="text-slate-300" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Sem notificações</h2>
          <p className="text-slate-500 mt-2 font-medium">Você está em dia com todas as suas mensagens.</p>
          <button 
            onClick={() => navigate('/app')}
            className="mt-8 px-8 py-3 bg-teal-600 text-white rounded-xl font-black shadow-lg shadow-teal-200 hover:scale-105 transition-transform"
          >
            VOLTAR AO INÍCIO
          </button>
        </div>
      )}
    </div>
  );
};

const Sparkles = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

export default Notifications;

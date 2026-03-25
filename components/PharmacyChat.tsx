
import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageSquare, Search, ChevronRight, Clock, CheckCheck, MapPin, Phone, Star } from 'lucide-react';
import { useFirebase } from './FirebaseProvider';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, updateDoc, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import { ChatSession, DirectMessage, Pharmacy } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const PharmacyChat: React.FC = () => {
  const { user } = useFirebase();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    // Load user's chat sessions
    const q = query(collection(db, 'chat_sessions'), where('userId', '==', user.uid), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
      setSessions(data);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!activeSession) return;

    // Load messages for active session
    const q = query(collection(db, 'chat_messages'), where('sessionId', '==', activeSession.id), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DirectMessage));
      setMessages(data);
    });

    return () => unsubscribe();
  }, [activeSession]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeSession || !newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'chat_messages'), {
        sessionId: activeSession.id,
        senderId: user.uid,
        text,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'chat_sessions', activeSession.id!), {
        lastMessage: text,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const startNewChat = async (pharmacy: Pharmacy) => {
    if (!user) return;

    // Check if session already exists
    const existing = sessions.find(s => s.pharmacyId === pharmacy.id);
    if (existing) {
      setActiveSession(existing);
      setIsSearching(false);
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'chat_sessions'), {
        userId: user.uid,
        userName: user.displayName || 'Usuário',
        pharmacyId: pharmacy.id,
        pharmacyName: pharmacy.name,
        lastMessage: 'Iniciou conversa',
        updatedAt: serverTimestamp(),
      });
      setActiveSession({ id: docRef.id, userId: user.uid, userName: user.displayName || 'Usuário', pharmacyId: pharmacy.id, pharmacyName: pharmacy.name, lastMessage: 'Iniciou conversa', updatedAt: new Date() });
      setIsSearching(false);
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  const searchPharmacies = async () => {
    if (!searchTerm.trim()) return;
    try {
      const q = query(collection(db, 'pharmacies'), where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'), limit(5));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pharmacy));
      setPharmacies(data);
    } catch (error) {
      console.error("Error searching pharmacies:", error);
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] md:h-[calc(100vh-80px)] flex max-w-6xl mx-auto bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
      {/* Sidebar - Sessions */}
      <div className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
        <div className="p-6 border-b border-slate-100 bg-white">
          <h2 className="text-xl font-black text-slate-900 tracking-tight mb-4 italic">Mensagens</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar farmácia..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchPharmacies()}
              className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {searchTerm && (
            <div className="mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2">Resultados da Busca</p>
              {pharmacies.map(p => (
                <button 
                  key={p.id}
                  onClick={() => startNewChat(p)}
                  className="w-full p-4 bg-teal-600 text-white rounded-2xl flex items-center gap-4 shadow-lg shadow-teal-100 mb-2 hover:scale-[1.02] transition-transform"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <MessageSquare size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-sm">{p.name}</p>
                    <p className="text-[10px] opacity-70">Clique para iniciar chat</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2">Conversas Recentes</p>
          {sessions.length > 0 ? (
            sessions.map(session => (
              <button 
                key={session.id}
                onClick={() => setActiveSession(session)}
                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${
                  activeSession?.id === session.id ? 'bg-white shadow-xl shadow-slate-200 border border-slate-100' : 'hover:bg-white/50'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  activeSession?.id === session.id ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-400'
                }`}>
                  <MessageSquare size={24} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-black text-slate-900 text-sm truncate">{session.pharmacyName}</p>
                  <p className="text-xs text-slate-400 truncate">{session.lastMessage}</p>
                </div>
                {activeSession?.id === session.id && <div className="w-2 h-2 bg-teal-500 rounded-full"></div>}
              </button>
            ))
          ) : (
            <div className="p-8 text-center opacity-40">
              <MessageSquare size={32} className="mx-auto mb-2" />
              <p className="text-xs font-bold">Nenhuma conversa ativa</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeSession ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 tracking-tight">{activeSession.pharmacyName}</h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-green-500 font-black uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    Farmacêutico Online
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-teal-600 transition-colors">
                  <Phone size={20} />
                </button>
                <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-teal-600 transition-colors">
                  <MapPin size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
              {messages.map((msg, idx) => (
                <div key={msg.id || idx} className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${
                    msg.senderId === user?.uid 
                      ? 'bg-teal-600 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                  }`}>
                    <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                    <div className={`flex items-center gap-1 mt-2 ${msg.senderId === user?.uid ? 'justify-end text-teal-100' : 'text-slate-400'}`}>
                      <span className="text-[9px] font-bold uppercase">
                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                      </span>
                      {msg.senderId === user?.uid && <CheckCheck size={12} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-slate-100">
              <form onSubmit={handleSendMessage} className="relative flex items-center bg-slate-100 rounded-2xl focus-within:ring-4 focus-within:ring-teal-500/10 transition-all">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem aqui..."
                  className="w-full bg-transparent border-none rounded-2xl px-6 py-4 pr-16 focus:ring-0 text-slate-800 font-medium"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className={`absolute right-2 p-3 rounded-xl transition-all ${
                    newMessage.trim() ? 'bg-teal-600 text-white shadow-lg shadow-teal-100' : 'bg-slate-300 text-slate-500'
                  }`}
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-24 h-24 bg-teal-50 text-teal-600 rounded-[2.5rem] flex items-center justify-center mb-8 animate-bounce">
              <MessageSquare size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Fale com um Farmacêutico</h3>
            <p className="text-slate-400 font-medium mt-3 max-w-sm">
              Tire dúvidas sobre medicamentos, dosagens ou disponibilidade de stock em tempo real.
            </p>
            <button 
              onClick={() => setIsSearching(true)}
              className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm tracking-widest uppercase shadow-2xl shadow-slate-200 hover:scale-105 transition-all"
            >
              INICIAR NOVA CONVERSA
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyChat;

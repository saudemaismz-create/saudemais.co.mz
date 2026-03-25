
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, User, Store, Clock, ChevronLeft, Search } from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, updateDoc, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from './FirebaseProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useErrorBoundary } from 'react-error-boundary';

interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage: string;
  updatedAt: any;
  pharmacyId: string;
  userId: string;
  pharmacyName?: string;
  userName?: string;
}

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  createdAt: any;
}

const Chat: React.FC = () => {
  const { user, profile } = useFirebase();
  const { showBoundary } = useErrorBoundary();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chat_rooms'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const roomDocs = await Promise.all(snapshot.docs.map(async (roomDoc) => {
        const data = roomDoc.data() as ChatRoom;
        // Fetch pharmacy name if not present
        let pharmacyName = 'Farmácia';
        if (data.pharmacyId) {
          try {
            const phDoc = await getDocs(query(collection(db, 'pharmacies'), where('__name__', '==', data.pharmacyId), limit(1)));
            if (!phDoc.empty) pharmacyName = phDoc.docs[0].data().name;
          } catch (error) {
            console.error("Error fetching pharmacy name in chat:", error);
          }
        }
        return { id: roomDoc.id, ...data, pharmacyName };
      }));
      setRooms(roomDocs);
      setLoading(false);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'chat_rooms');
      } catch (err) {
        showBoundary(err);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!activeRoom) return;

    const q = query(
      collection(db, 'chat_messages'),
      where('roomId', '==', activeRoom.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(docs);
      scrollToBottom();
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'chat_messages');
      } catch (err) {
        showBoundary(err);
      }
    });

    return () => unsubscribe();
  }, [activeRoom]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !newMessage.trim()) return;

    if (!user) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'chat_messages'), {
        roomId: activeRoom.id,
        senderId: user.uid,
        text,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'chat_rooms', activeRoom.id), {
        lastMessage: text,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Sidebar - Chat List */}
      <div className={`w-full md:w-80 border-r border-slate-200 flex flex-col ${activeRoom ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-bottom border-slate-200 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare size={20} className="text-teal-600" />
            Mensagens
          </h2>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Procurar conversas..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-grow overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-sm text-slate-500">Nenhuma conversa ativa.</p>
            </div>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left ${activeRoom?.id === room.id ? 'bg-teal-50/50' : ''}`}
              >
                <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Store size={24} />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-semibold text-slate-900 truncate">{room.pharmacyName}</h3>
                    <span className="text-[10px] text-slate-400">
                      {room.updatedAt?.toDate ? room.updatedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{room.lastMessage || 'Inicie uma conversa'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-grow flex flex-col bg-slate-50/30 ${!activeRoom ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {activeRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-3">
              <button
                onClick={() => setActiveRoom(null)}
                className="md:hidden p-2 hover:bg-slate-100 rounded-full"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center">
                <Store size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{activeRoom.pharmacyName}</h3>
                <p className="text-[10px] text-green-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Online
                </p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl shadow-sm text-sm ${
                      msg.senderId === user?.uid
                        ? 'bg-teal-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className={`text-[10px] mt-1 block ${msg.senderId === user?.uid ? 'text-teal-100' : 'text-slate-400'}`}>
                      {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escreva sua mensagem..."
                  className="flex-grow p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="text-center p-8">
            <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Suas Conversas</h3>
            <p className="text-slate-500 mt-2 max-w-xs mx-auto">
              Selecione uma farmácia para tirar dúvidas ou consultar sobre medicamentos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;


import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, AlertCircle, RefreshCcw, ExternalLink, Camera } from 'lucide-react';
import { getHealthAdvice } from '../services/geminiService';
import { ChatMessage } from '../types';

const Assistant: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<(ChatMessage & { links?: any[] })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { text, links } = await getHealthAdvice(messages, input);
      const botMessage = { role: 'model' as const, parts: [{ text }], links };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-80px)] flex flex-col max-w-4xl mx-auto bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
      {/* Premium Header */}
      <div className="p-6 bg-gradient-to-br from-teal-600 to-teal-800 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
            <Bot size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Saúde Mais IA Assistente</h2>
            <div className="flex items-center gap-1.5 text-xs text-teal-100 font-medium">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-sm shadow-green-400"></span>
              Ativo com Google Search Grounding
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => alert('Funcionalidade de scanner de receita em desenvolvimento.')}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
            title="Escanear Receita"
          >
            <Camera size={20} />
          </button>
          <button 
            onClick={() => setMessages([])}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
            title="Nova Conversa"
          >
            <RefreshCcw size={20} />
          </button>
        </div>
      </div>

      <div className="px-6 py-2.5 bg-amber-50/80 backdrop-blur-sm border-b border-amber-100 text-amber-800 text-[11px] font-medium flex items-center gap-2">
        <AlertCircle size={14} className="flex-shrink-0 text-amber-500" />
        <span>Aviso: IA informativa. Não substitui diagnóstico médico. Em emergências, ligue 112 ou 115.</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
             <div className="bg-teal-50 p-8 rounded-[3rem] text-teal-600 mb-6 animate-bounce">
               <Sparkles size={64} />
             </div>
             <h3 className="text-2xl font-black text-slate-800 tracking-tight">Como posso cuidar de você?</h3>
             <p className="text-slate-500 max-w-sm mt-3 font-medium">Perquise sobre dosagens, sintomas comuns ou peça dicas de saúde.</p>
             <div className="flex flex-wrap justify-center gap-3 mt-8">
               {['O que é Malária?', 'Sintomas de Gripe', 'Remédios para febre'].map((q) => (
                 <button 
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:border-teal-500 hover:text-teal-600 hover:shadow-lg transition-all"
                 >
                   {q}
                 </button>
               ))}
             </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in slide-in-from-bottom-2`}>
            <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
              msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-teal-600'
            }`}>
              {msg.role === 'user' ? <User size={24} /> : <Bot size={24} />}
            </div>
            <div className="flex flex-col gap-2 max-w-[80%]">
              <div className={`p-5 rounded-[1.5rem] shadow-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-teal-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none font-medium'
              }`}>
                {msg.parts[0].text}
              </div>
              
              {msg.links && msg.links.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {msg.links.map((link, i) => (
                    <a 
                      key={i} 
                      href={link.uri} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase hover:bg-teal-50 hover:text-teal-600 transition-colors"
                    >
                      <ExternalLink size={10} /> {link.title || 'Ver Fonte'}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4 animate-pulse">
            <div className="w-12 h-12 bg-slate-200 rounded-2xl"></div>
            <div className="space-y-2 flex-1">
              <div className="bg-slate-200 h-12 rounded-[1.5rem] w-3/4"></div>
              <div className="bg-slate-100 h-6 rounded-full w-1/4"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-100">
        <div className="relative flex items-center bg-slate-100 rounded-[1.5rem] focus-within:ring-4 focus-within:ring-teal-500/10 transition-all">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Descreva seu sintoma ou pergunte algo..."
            className="w-full bg-transparent border-none rounded-[1.5rem] px-6 py-5 pr-16 focus:ring-0 text-slate-800 font-medium"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`absolute right-2 p-4 rounded-2xl transition-all ${
              input.trim() ? 'bg-teal-600 text-white shadow-xl shadow-teal-200 rotate-0 scale-100' : 'bg-slate-300 text-slate-500 scale-90'
            }`}
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Assistant;

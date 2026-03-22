
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShieldCheck, Activity, Search, MessageSquare, ArrowRight, CheckCircle2, MapPin, Pill, Truck } from 'lucide-react';
import { useFirebase } from './FirebaseProvider';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthReady } = useFirebase();

  useEffect(() => {
    const is2FAVerified = sessionStorage.getItem('2fa_verified') === 'true';
    if (isAuthReady && user && is2FAVerified) {
      navigate('/app');
    }
  }, [user, isAuthReady, navigate]);

  const handleCTA = () => {
    if (user) {
      navigate('/app');
    } else {
      navigate('/login');
    }
  };

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white text-slate-900 font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1">
              <img 
                src="https://img.icons8.com/fluency/48/health-book.png" 
                alt="Logo" 
                className="w-8 h-8"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tighter">Saúde <span className="text-teal-600">Mais</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500">
            <a href="#features" className="hover:text-teal-600 transition-colors">Funcionalidades</a>
            <a href="#pharmacies" className="hover:text-teal-600 transition-colors">Farmácias</a>
            <a href="#about" className="hover:text-teal-600 transition-colors">Sobre Nós</a>
            <a href="#contact" className="hover:text-teal-600 transition-colors">Contacto</a>
          </div>
          <button 
            onClick={handleCTA}
            className="px-6 py-2.5 bg-teal-600 text-white font-black rounded-xl shadow-lg shadow-teal-100 hover:scale-105 transition-transform active:scale-95"
          >
            {user ? 'Ir para a App' : 'Entrar na App'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-32 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-50 text-teal-700 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-teal-100">
              <ShieldCheck size={14} /> Saúde Digital
            </div>
            
            <div className="relative mb-12 transform -skew-x-6 origin-left">
              <h1 className="text-4xl md:text-[10vw] font-black text-slate-900 leading-[0.82] tracking-[-0.04em] uppercase">
                O seu ecossistema <br />
                <span className="text-teal-600">inteligente</span> <br />
                de saúde.
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
              <div>
                <p className="text-xl text-slate-500 font-medium max-w-lg mb-10 leading-relaxed">
                  Conectamos pacientes a farmácias, médicos e diagnósticos inteligentes. Tudo o que precisa para cuidar da sua saúde, na palma da sua mão.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <button 
                    onClick={handleCTA}
                    className="px-10 py-5 bg-slate-900 text-white font-black rounded-2xl shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 group"
                  >
                    {user ? 'Acessar a App' : 'Começar Agora'} <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                  </button>
                  <div className="flex items-center gap-3 px-6 py-4 bg-teal-50 border border-teal-100 rounded-2xl">
                    <Truck size={24} className="text-teal-600" />
                    <div>
                      <p className="text-[10px] font-black text-teal-700 uppercase tracking-widest leading-none mb-1">Promoção</p>
                      <p className="text-xs font-black text-slate-900">Entregas Grátis {'>'} 500 MT</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 lg:justify-end">
                <div className="flex -space-x-4">
                  {[1, 2, 3, 4].map(i => (
                    <img 
                      key={i}
                      src={`https://picsum.photos/seed/user${i}/100/100`} 
                      className="w-14 h-14 rounded-full border-4 border-white object-cover shadow-lg" 
                      alt="User"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900 leading-none">+10.000</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Utilizadores Ativos</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Floating Visual Elements */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="absolute top-20 right-[-10%] w-[50%] h-[80%] -z-10 hidden lg:block"
          >
            <div className="relative w-full h-full">
              <div className="absolute top-0 right-0 w-full h-full bg-teal-50 rounded-[5rem] rotate-6 blur-[100px] opacity-60"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-white p-6 rounded-[4rem] shadow-2xl border border-slate-100 rotate-3 overflow-hidden">
                <img 
                  src="https://picsum.photos/seed/health/800/1000" 
                  className="w-full h-full object-cover rounded-[3rem]" 
                  alt="Saúde"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sponsored Products Section */}
      <section className="py-24 px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-orange-100">
                <Activity size={12} /> Destaques da Semana
              </div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Produtos Patrocinados</h2>
            </div>
            <button 
              onClick={handleCTA}
              className="hidden md:flex items-center gap-2 text-teal-600 font-black text-sm hover:gap-4 transition-all"
            >
              Ver Todos <ArrowRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[
              { name: "Vitamina C 1000mg", price: "450 MT", pharmacy: "Farmácia Central", img: "vitamins" },
              { name: "Paracetamol 500mg", price: "120 MT", pharmacy: "Farmácia 24h", img: "medicine" },
              { name: "Protetor Solar 50+", price: "1.200 MT", pharmacy: "Beauty Care", img: "skincare" },
              { name: "Máscaras KN95", price: "250 MT", pharmacy: "MedPlus", img: "health" },
              { name: "Termómetro Digital", price: "850 MT", pharmacy: "Farmácia Central", img: "tech" }
            ].map((prod, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -8 }}
                className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm hover:shadow-xl transition-all relative group"
              >
                <div className="absolute top-3 right-3 z-10">
                  <span className="px-2 py-1 bg-orange-500 text-white text-[8px] font-black rounded-full uppercase tracking-tighter">Patrocinado</span>
                </div>
                <div className="aspect-square bg-slate-50 rounded-2xl mb-4 overflow-hidden">
                  <img 
                    src={`https://picsum.photos/seed/${prod.img}/400/400`} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    alt={prod.name}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-1">{prod.pharmacy}</p>
                <h3 className="font-bold text-slate-900 text-sm mb-2 line-clamp-1">{prod.name}</h3>
                <p className="text-lg font-black text-slate-900">{prod.price}</p>
                <button 
                  onClick={handleCTA}
                  className="w-full mt-4 py-2 bg-slate-900 text-white text-xs font-black rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Comprar Agora
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">Categorias em Destaque</h2>
            <p className="text-slate-500 font-medium">Navegue pelos nossos departamentos especializados.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { name: "Medicamentos", icon: Pill, color: "bg-blue-500" },
              { name: "Bem-estar", icon: Heart, color: "bg-teal-500" },
              { name: "Maternidade", icon: Activity, color: "bg-rose-500" },
              { name: "Higiene", icon: ShieldCheck, color: "bg-indigo-500" },
              { name: "Suplementos", icon: Activity, color: "bg-orange-500" },
              { name: "Primeiros Socorros", icon: ShieldCheck, color: "bg-emerald-500" }
            ].map((cat, i) => (
              <motion.div 
                key={i}
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 text-center cursor-pointer hover:shadow-lg transition-all"
              >
                <div className={`${cat.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-md`}>
                  <cat.icon size={24} />
                </div>
                <span className="text-sm font-black text-slate-900">{cat.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Pharmacies Section */}
      <section id="pharmacies" className="py-24 px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Farmácias Parceiras</h2>
              <p className="text-slate-500 font-medium mt-2">As melhores farmácias num só lugar.</p>
            </div>
            <button 
              onClick={handleCTA}
              className="px-6 py-2 border-2 border-slate-900 text-slate-900 font-black rounded-xl hover:bg-slate-900 hover:text-white transition-all"
            >
              Ver Todas
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Farmácia Central", location: "Maputo, Av. 25 de Setembro", rating: 4.9, reviews: 1240, img: "pharmacy1" },
              { name: "MedPlus", location: "Beira, Rua Correia de Brito", rating: 4.7, reviews: 850, img: "pharmacy2" },
              { name: "Farmácia 24 Horas", location: "Nampula, Av. Eduardo Mondlane", rating: 4.8, reviews: 2100, img: "pharmacy3" }
            ].map((pharm, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all group"
              >
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={`https://picsum.photos/seed/${pharm.img}/800/400`} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    alt={pharm.name}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full flex items-center gap-1 shadow-sm">
                    <span className="text-orange-500 font-black text-sm">★</span>
                    <span className="text-slate-900 font-black text-sm">{pharm.rating}</span>
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{pharm.name}</h3>
                  <div className="flex items-center gap-2 text-slate-400 mb-6">
                    <MapPin size={16} />
                    <span className="text-sm font-medium">{pharm.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{pharm.reviews} Avaliações</span>
                    <button 
                      onClick={handleCTA}
                      className="p-3 bg-teal-50 text-teal-600 rounded-2xl group-hover:bg-teal-600 group-hover:text-white transition-colors"
                    >
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">Tudo o que precisa para a sua saúde.</h2>
            <p className="text-slate-500 font-medium">Uma plataforma completa desenhada para as suas necessidades reais.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: Search,
                title: "Busca de Farmácias",
                desc: "Encontre farmácias abertas perto de si em Maputo, Beira ou Nampula e verifique o stock de medicamentos.",
                color: "bg-blue-500",
                num: "01"
              },
              {
                icon: MessageSquare,
                title: "IA+ Diagnóstico",
                desc: "Assistente inteligente treinado para identificar sintomas comuns e orientar sobre primeiros socorros.",
                color: "bg-teal-600",
                num: "02"
              },
              {
                icon: Pill,
                title: "Scanner de Receitas",
                desc: "Digitalize as suas receitas médicas e receba lembretes automáticos para nunca falhar uma dose.",
                color: "bg-orange-500",
                num: "03"
              },
              {
                icon: Activity,
                title: "Monitorização",
                desc: "Acompanhe os seus sinais vitais e histórico médico de forma segura e privada.",
                color: "bg-rose-500",
                num: "04"
              },
              {
                icon: MapPin,
                title: "Telemedicina",
                desc: "Consulte médicos especialistas sem sair de casa através da nossa rede integrada.",
                color: "bg-indigo-500",
                num: "05"
              },
              {
                icon: ShieldCheck,
                title: "Segurança Total",
                desc: "Os seus dados de saúde são encriptados e protegidos com os mais altos padrões de segurança.",
                color: "bg-emerald-500",
                num: "06"
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="relative group"
              >
                <div className="absolute -top-6 -left-6 text-6xl font-black text-slate-100 group-hover:text-teal-50 transition-colors -z-10">
                  {feature.num}
                </div>
                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 hover:shadow-2xl transition-all h-full">
                  <div className={`${feature.color} w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg transform group-hover:rotate-6 transition-transform`}>
                    <feature.icon size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{feature.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 px-6 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -ml-64 -mb-64"></div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 text-center relative z-10">
          {[
            { val: "0+", label: "Farmácias Parceiras" },
            { val: "0+", label: "Utilizadores Ativos" },
            { val: "24/7", label: "Apoio IA+" },
            { val: "100%", label: "Seguro & Privado" }
          ].map((stat, i) => (
            <div key={i} className="group">
              <p className="text-6xl md:text-8xl font-black text-teal-500 mb-4 tracking-tighter group-hover:scale-110 transition-transform duration-500">{stat.val}</p>
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-teal-600 rounded-[3rem] p-12 md:p-20 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <h2 className="text-4xl md:text-6xl font-black leading-tight mb-8 relative z-10">Pronto para transformar a sua saúde?</h2>
          <p className="text-teal-100 text-lg font-medium mb-10 max-w-2xl mx-auto relative z-10">
            Junte-se a milhares de moçambicanos que já estão a utilizar a Saúde Mais para uma vida mais saudável e conectada através de <span className="underline">saudemais.co.mz</span>.
          </p>
          <button 
            onClick={handleCTA}
            className="px-12 py-5 bg-white text-teal-600 font-black rounded-2xl shadow-xl hover:scale-105 transition-transform relative z-10"
          >
            {user ? 'Acessar a App' : 'Começar Gratuitamente'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="p-1">
              <img 
                src="https://img.icons8.com/fluency/48/health-book.png" 
                alt="Logo" 
                className="w-6 h-6"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tighter">Saúde <span className="text-teal-600">Mais</span></span>
          </div>
          <p className="text-slate-400 text-sm font-bold">© 2026 Saúde Mais. Todos os direitos reservados. | saudemais.co.mz</p>
          <div className="flex gap-6 text-slate-400 text-sm font-bold">
            <a href="#" className="hover:text-teal-600">Privacidade</a>
            <a href="#" className="hover:text-teal-600">Termos</a>
            <a href="#" className="hover:text-teal-600">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

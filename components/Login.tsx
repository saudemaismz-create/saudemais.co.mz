import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, getMultiFactorResolver, PhoneAuthProvider, PhoneMultiFactorGenerator, RecaptchaVerifier } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Heart, MapPin, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFirebase } from './FirebaseProvider';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthReady } = useFirebase();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // 2FA States
  const [mfaResolver, setMfaResolver] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  
  // Custom Email 2FA
  const [showEmail2FA, setShowEmail2FA] = useState(false);
  const [email2FACode, setEmail2FACode] = useState('');
  const [email2FALoading, setEmail2FALoading] = useState(false);
  const [isSimulation, setIsSimulation] = useState(false);
  const [simulatedCode, setSimulatedCode] = useState('');

  useEffect(() => {
    // If user is already logged in and 2FA is verified (or not required yet)
    const is2FAVerified = sessionStorage.getItem('2fa_verified') === 'true';
    if (isAuthReady && user && is2FAVerified) {
      navigate('/app');
    }
  }, [user, isAuthReady, navigate]);

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const handleGetLocation = () => {
    setLocationLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationLoading(false);
      },
      (err) => {
        console.error("Error getting location:", err);
        setError('Não foi possível obter a localização. Por favor, permita o acesso à localização no seu navegador.');
        setLocationLoading(false);
      }
    );
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor, insira o seu email primeiro para recuperar a senha.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
    } catch (err: any) {
      console.error("Reset password error:", err);
      if (err.code === 'auth/user-not-found') {
        setError('Não existe nenhuma conta com este email.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Erro de conexão. Verifique a sua internet ou desative bloqueadores de anúncios.');
      } else if (err.code === 'auth/invalid-email') {
        setError('O formato do email é inválido.');
      } else {
        setError(`Erro ao enviar email de recuperação. Tente novamente.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    setError('');
    try {
      const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      await mfaResolver.resolveSignIn(multiFactorAssertion);
      sessionStorage.setItem('2fa_verified', 'true');
      navigate('/app');
    } catch (err: any) {
      console.error("MFA verification error:", err);
      setError('Código de verificação inválido ou expirado.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyEmail2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmail2FALoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: email2FACode })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Código inválido');
      }

      sessionStorage.setItem('2fa_verified', 'true');
      navigate('/app');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEmail2FALoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        
        // After successful login, initiate Email 2FA
        const response = await fetch('/api/auth/send-2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Falha ao enviar código de verificação.');
        }

        const data = await response.json();
        setIsSimulation(!!data.simulation);
        if (data.simulation && data.code) {
          setSimulatedCode(data.code);
        }
        setShowEmail2FA(true);
      } else {
        // Validation for registration
        if (!name || !email || !phone || !password) {
          setError('Os campos Nome, Email, Telefone e Senha são obrigatórios.');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userData: any = {
          uid: user.uid,
          name,
          email,
          phone,
          role: 'customer'
        };
        
        if (location) {
          userData.location = location;
        }

        // Save additional user data to Firestore
        await setDoc(doc(db, 'users', user.uid), userData, { merge: true });

        // For new users, we can skip 2FA for the first time or require it
        sessionStorage.setItem('2fa_verified', 'true');
        navigate('/app');
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Email ou senha incorretos.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Erro de conexão. Verifique a sua internet ou desative bloqueadores de anúncios.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas de login. Tente novamente mais tarde.');
      } else if (err.code === 'auth/multi-factor-auth-required') {
        try {
          const resolver = getMultiFactorResolver(auth, err);
          setMfaResolver(resolver);
          
          if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
              'size': 'invisible'
            });
          }
          
          const phoneInfoOptions = {
            multiFactorHint: resolver.hints[0],
            session: resolver.session
          };
          const phoneAuthProvider = new PhoneAuthProvider(auth);
          const vId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, window.recaptchaVerifier);
          setVerificationId(vId);
          setError('Código SMS enviado para o seu telemóvel. Por favor, insira-o abaixo.');
        } catch (mfaErr: any) {
          console.error("MFA Error:", mfaErr);
          setError('Erro ao iniciar a verificação de dois fatores.');
        }
      } else if (err.code === 'auth/invalid-email') {
        setError('O formato do email é inválido.');
      } else {
        setError(err.message || `Ocorreu um erro inesperado. Verifique os seus dados e tente novamente.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="p-1">
            <img 
              src="https://img.icons8.com/fluency/96/health-book.png" 
              alt="Saúde Mais Logo" 
              className="w-16 h-16"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black text-slate-900 tracking-tight">
          {mfaResolver || showEmail2FA ? 'Verificação de Segurança' : (isLogin ? 'Entrar na sua conta' : 'Criar nova conta')}
        </h2>
        {!mfaResolver && !showEmail2FA && (
          <p className="mt-2 text-center text-sm text-slate-500 font-medium">
            {isLogin ? 'Ou ' : 'Já tem uma conta? '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="font-bold text-teal-600 hover:text-teal-500 transition-colors"
            >
              {isLogin ? 'crie uma conta agora' : 'faça login'}
            </button>
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white py-8 px-4 shadow-2xl shadow-slate-200/50 sm:rounded-3xl sm:px-10 border border-slate-100"
        >
          <div id="recaptcha-container"></div>
          
          {mfaResolver ? (
            <form className="space-y-5" onSubmit={handleVerifyMfa}>
              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-3">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Código de Verificação SMS *</label>
                <input
                  type="text"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow font-medium text-center tracking-widest text-lg"
                  placeholder="123456"
                  maxLength={6}
                />
                <p className="mt-2 text-xs text-slate-500 text-center">
                  Enviamos um código para o número terminado em {mfaResolver.hints[0]?.phoneNumber?.slice(-4)}
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={mfaLoading || verificationCode.length < 6}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-teal-200 text-sm font-black text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {mfaLoading && <Loader2 size={18} className="animate-spin" />}
                  Verificar Código
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMfaResolver(null);
                    setVerificationId('');
                    setVerificationCode('');
                    setError('');
                  }}
                  className="w-full flex justify-center items-center py-3 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all"
                >
                  Voltar ao Login
                </button>
              </div>
            </form>
          ) : showEmail2FA ? (
            <form className="space-y-5" onSubmit={handleVerifyEmail2FA}>
              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-3">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100 mb-6">
                <p className="text-teal-800 text-sm font-bold text-center">
                  Enviamos um código de 6 dígitos para o seu email <strong>{email}</strong>.
                </p>
                {isSimulation && (
                  <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg">
                    <p className="text-rose-600 text-xs text-center font-black uppercase tracking-wider">
                      [MODO SIMULAÇÃO]
                    </p>
                    <p className="text-rose-700 text-sm text-center font-bold mt-1">
                      Use o código: <span className="text-lg tracking-widest">{simulatedCode}</span>
                    </p>
                  </div>
                )}
                <p className="text-teal-600 text-xs text-center mt-1">
                  Verifique também a sua pasta de spam.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Código de Verificação Email *</label>
                <input
                  type="text"
                  required
                  value={email2FACode}
                  onChange={(e) => setEmail2FACode(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow font-medium text-center tracking-widest text-lg"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={email2FALoading || email2FACode.length < 6}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-teal-200 text-sm font-black text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {email2FALoading && <Loader2 size={18} className="animate-spin" />}
                  Confirmar Verificação
                </button>
                <button
                  type="button"
                  disabled={email2FALoading}
                  onClick={async () => {
                    setEmail2FALoading(true);
                    setError('');
                    try {
                      const response = await fetch('/api/auth/send-2fa', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                      });
                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || 'Falha ao reenviar código.');
                      }
                      const data = await response.json();
                      setIsSimulation(!!data.simulation);
                      if (data.simulation && data.code) {
                        setSimulatedCode(data.code);
                      }
                      setError('Novo código enviado com sucesso!');
                    } catch (err: any) {
                      setError(err.message);
                    } finally {
                      setEmail2FALoading(false);
                    }
                  }}
                  className="w-full flex justify-center items-center py-3 px-4 border border-slate-200 rounded-xl text-sm font-bold text-teal-600 bg-white hover:bg-teal-50 transition-all"
                >
                  Reenviar Código
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmail2FA(false);
                    setEmail2FACode('');
                    setError('');
                  }}
                  className="w-full flex justify-center items-center py-3 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all"
                >
                  Voltar ao Login
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-3">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {resetEmailSent && (
              <div className="bg-teal-50 border border-teal-100 text-teal-700 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-3">
                <Heart size={18} className="shrink-0 mt-0.5" />
                <span>Email de recuperação enviado! Verifique a sua caixa de entrada.</span>
              </div>
            )}

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nome e Sobrenome *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow font-medium"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Número de Celular *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow font-medium"
                    placeholder="+258 8X XXX XXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Localização (Opcional)</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={locationLoading}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border rounded-xl font-bold transition-all ${
                        location 
                          ? 'bg-teal-50 border-teal-200 text-teal-700' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {locationLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <MapPin size={18} className={location ? 'text-teal-600' : 'text-slate-400'} />
                      )}
                      {location ? 'Localização Obtida' : 'Obter Localização'}
                    </button>
                  </div>
                  {!location && !isLogin && (
                    <p className="mt-1.5 text-xs text-slate-500 font-medium">A localização ajuda a encontrar farmácias próximas.</p>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow font-medium"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold text-slate-700">Senha *</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-sm font-bold text-teal-600 hover:text-teal-500 transition-colors"
                    disabled={loading}
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow font-medium pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || (!isLogin && !location)}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-teal-200 text-sm font-black text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {isLogin ? 'Entrar' : 'Criar Conta'}
              </button>
            </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Login;

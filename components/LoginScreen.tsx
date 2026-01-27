import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

const LoginScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
            await updateProfile(userCredential.user, { displayName: name });
        }
      }
    } catch (err: any) {
      const errorCode = err.code;
      let msg = "Ocorreu um erro. Tente novamente.";
      
      const isExpectedError = [
          'auth/invalid-credential', 
          'auth/user-not-found', 
          'auth/wrong-password',
          'auth/email-already-in-use',
          'auth/weak-password',
          'auth/too-many-requests'
      ].includes(errorCode);

      if (!isExpectedError) {
          console.error("Auth Error:", err);
      }

      switch (errorCode) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          msg = "E-mail ou senha incorretos.";
          break;
        case 'auth/email-already-in-use':
          msg = "Este e-mail já está cadastrado.";
          break;
        case 'auth/weak-password':
          msg = "A senha deve ter pelo menos 6 caracteres.";
          break;
        default:
          msg = "Erro ao autenticar. Verifique suas credenciais.";
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      {/* Background Decor - Lime Green Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-500/10 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 animate-fadeIn">
        <div className="p-10">
          <div className="text-center mb-10">
            {/* Logo Icon Style Updated */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500 mb-4 shadow-lg shadow-brand-500/20 text-slate-900">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
               </svg>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">NutriVision <span className="text-brand-500">AI</span></h1>
            <p className="text-slate-400 text-base mt-2">Sua jornada clínica começa aqui</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
                <div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-transparent focus:border-brand-500 rounded-2xl px-6 py-4 text-white outline-none transition-all placeholder-slate-500"
                    placeholder="Nome Profissional"
                  />
                </div>
            )}

            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border-2 border-transparent focus:border-brand-500 rounded-2xl px-6 py-4 text-white outline-none transition-all placeholder-slate-500"
                placeholder="E-mail Corporativo"
              />
            </div>

            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border-2 border-transparent focus:border-brand-500 rounded-2xl px-6 py-4 text-white outline-none transition-all placeholder-slate-500"
                placeholder="Senha"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 animate-fadeIn">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-200 font-medium">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-full font-bold text-slate-900 text-lg shadow-lg shadow-brand-500/20 transition-all transform flex items-center justify-center gap-2
                ${loading 
                  ? 'bg-slate-600 cursor-wait text-slate-300' 
                  : 'bg-brand-500 hover:bg-brand-400 hover:scale-[1.02] active:scale-[0.98]'
                }`}
            >
              {loading && (
                 <svg className="animate-spin h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isLogin ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-400 text-sm">
              {isLogin ? 'Não tem acesso?' : 'Já possui conta?'}
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="ml-2 text-brand-500 hover:text-brand-400 font-bold outline-none underline decoration-2 decoration-transparent hover:decoration-brand-500 transition-all"
              >
                {isLogin ? 'Cadastre-se' : 'Fazer Login'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
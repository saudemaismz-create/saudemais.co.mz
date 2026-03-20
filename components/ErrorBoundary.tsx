import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  let errorMessage = 'Ocorreu um erro inesperado.';
  let errorDetail = '';

  try {
    if (error?.message) {
      errorDetail = error.message;
      const parsedError = JSON.parse(error.message);
      if (parsedError.error) {
        if (parsedError.error.includes('Missing or insufficient permissions')) {
          errorMessage = 'Erro de Permissão: Não tem autorização para realizar esta ação ou aceder a estes dados.';
        } else if (parsedError.error.includes('The query requires an index')) {
          errorMessage = 'Erro de Índice: Esta consulta requer um índice no Firestore. Por favor, verifique a consola do Firebase.';
        } else {
          errorMessage = `Erro de Dados: ${parsedError.error}`;
        }
      }
    } else if (error instanceof Error) {
      errorDetail = error.message;
    } else if (typeof error === 'string') {
      errorDetail = error;
    }
  } catch (e) {
    // Not a JSON error message
    if (error?.message?.includes('permission-denied')) {
      errorMessage = 'Erro de Permissão: Acesso negado pelo servidor.';
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white p-12 rounded-[4rem] shadow-2xl">
        <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-4 italic tracking-tight">Ops! Algo correu mal</h2>
        <p className="text-slate-600 font-bold leading-relaxed mb-6">
          {errorMessage}
        </p>
        
        {errorDetail && (
          <div className="mb-8 p-4 bg-slate-50 rounded-2xl text-left overflow-auto max-h-40">
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2">Detalhes Técnicos:</p>
            <p className="text-xs font-mono text-slate-600 break-all">{errorDetail}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => {
              resetErrorBoundary();
              window.location.reload();
            }}
            className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black shadow-lg shadow-teal-100 hover:scale-105 transition-transform active:scale-95"
          >
            TENTAR NOVAMENTE
          </button>
          
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = '/';
            }}
            className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors"
          >
            LIMPAR CACHE E VOLTAR
          </button>
        </div>
      </div>
    </div>
  );
};

export const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ReactErrorBoundary>
  );
};

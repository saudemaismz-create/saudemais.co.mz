import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  let errorMessage = 'Ocorreu um erro inesperado.';
  
  try {
    if (error?.message) {
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
    }
  } catch (e) {
    // Not a JSON error message
    if (error?.message.includes('permission-denied')) {
      errorMessage = 'Erro de Permissão: Acesso negado pelo servidor.';
    }
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-[2.5rem] border border-rose-100 shadow-xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2 italic">Ops! Algo correu mal</h2>
        <p className="text-slate-500 mb-6 font-medium">{errorMessage}</p>
        <button 
          onClick={() => {
            resetErrorBoundary();
            window.location.reload();
          }}
          className="w-full py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all"
        >
          RECARREGAR PÁGINA
        </button>
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

import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);
let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, tipo = 'sucesso', ms = 4000) => {
    const id = ++_id;
    setToasts(t => [...t, { id, msg, tipo }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ms);
  }, []);

  const icons = { sucesso: '✅', erro: '❌', aviso: '⚠️', info: 'ℹ️' };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.tipo}`}>
            <span>{icons[t.tipo]}</span><span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() { return useContext(ToastContext); }

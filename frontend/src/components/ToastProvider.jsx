import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-5 top-5 z-[100] space-y-3">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border px-4 py-3 text-sm font-bold shadow-2xl backdrop-blur-xl ${
              item.type === 'error'
                ? 'border-rose-500/30 bg-rose-500/15 text-rose-100'
                : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-100'
            }`}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

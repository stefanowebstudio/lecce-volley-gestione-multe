import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Check, CircleAlert, X } from 'lucide-react';

type ToastKind = 'success' | 'error';
type ToastItem = { id: number; message: string; kind: ToastKind };
const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const notify = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map((item) => (
          <div className={`toast toast-${item.kind}`} key={item.id} role="status">
            {item.kind === 'success' ? <Check size={18} /> : <CircleAlert size={18} />}
            <span>{item.message}</span>
            <button className="icon-button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} aria-label="Chiudi"><X size={15} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() { return useContext(ToastContext); }

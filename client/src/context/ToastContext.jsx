import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, message, duration = 4200) => {
      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-3), { id, type, message }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const toast = useMemo(
    () => ({
      success: (m, d) => push('success', m, d),
      error: (m, d) => push('error', m, d ?? 6000),
      info: (m, d) => push('info', m, d),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-region" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className={`toast toast--${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
              <Icon size={18} aria-hidden="true" />
              <span>{t.message}</span>
              <button className="toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

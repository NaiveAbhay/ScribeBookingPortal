import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, Video, CheckCircle, AlertCircle } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', action = null) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, action }]);
    
    // Auto remove after 5 seconds if no action
    if (!action) {
      setTimeout(() => removeToast(id), 5000);
    }
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Toast Container */}
      <div 
        className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none"
        role="region" 
        aria-live="polite" 
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`
              pointer-events-auto p-4 rounded-xl shadow-2xl border-2 flex items-start gap-3 transition-all animate-in slide-in-from-right
              ${toast.type === 'call' ? 'bg-slate-900 border-primary text-white' : 'bg-white border-slate-200 text-slate-900'}
            `}
            role="alert"
          >
            <div className="mt-1">
              {toast.type === 'call' && <Video className="text-primary animate-pulse" size={24} />}
              {toast.type === 'success' && <CheckCircle className="text-green-500" size={24} />}
              {toast.type === 'error' && <AlertCircle className="text-red-500" size={24} />}
            </div>
            
            <div className="flex-1">
              <p className="font-bold text-sm">{toast.type === 'call' ? 'Incoming Video Call' : 'Notification'}</p>
              <p className="text-sm opacity-90 mt-1">{toast.message}</p>
              
              {toast.action && (
                <div className="mt-3 flex gap-2">
                  <button 
                    onClick={() => { toast.action.onClick(); removeToast(toast.id); }}
                    className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-primary-dark focus:ring-2 focus:ring-white"
                  >
                    {toast.action.label}
                  </button>
                  <button 
                    onClick={() => removeToast(toast.id)}
                    className="bg-white/10 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-white/20"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => removeToast(toast.id)} aria-label="Close notification">
              <X size={18} className="opacity-50 hover:opacity-100" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
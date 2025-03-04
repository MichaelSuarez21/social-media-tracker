'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';

// Toast type definitions
export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// Create context with default values
const ToastContext = createContext<ToastContextType>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

// Hook to use the toast context
export const useToast = () => useContext(ToastContext);

// Toast icons by type
const toastIcons = {
  info: <FaInfoCircle className="text-blue-500" />,
  success: <FaCheckCircle className="text-green-500" />,
  warning: <FaExclamationTriangle className="text-amber-500" />,
  error: <FaTimesCircle className="text-red-500" />,
};

// Toast colors by type
const toastColors = {
  info: 'bg-blue-900/20 border-blue-800',
  success: 'bg-green-900/20 border-green-800',
  warning: 'bg-amber-900/20 border-amber-800',
  error: 'bg-red-900/20 border-red-800',
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Add a new toast
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prevToasts) => [...prevToasts, { id, ...toast }]);
  }, []);

  // Remove a toast by ID
  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// Toast item component
const ToastItem: React.FC<{
  toast: Toast;
  onClose: () => void;
}> = ({ toast, onClose }) => {
  const { type, message } = toast;
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 5000);
    
    return () => clearTimeout(timer);
  }, [onClose, toast.duration]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className={`p-4 rounded-lg border shadow-xl flex items-start mb-3 ${toastColors[type]}`}
    >
      <span className="flex-shrink-0 mr-3 mt-1">{toastIcons[type]}</span>
      <div className="flex-1">
        <p className="text-white text-sm">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="ml-3 text-gray-400 hover:text-white"
        aria-label="Close notification"
      >
        <FaTimesCircle />
      </button>
    </motion.div>
  );
};

// Toast container component
const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}; 
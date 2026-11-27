import React from 'react';
import { Toaster } from 'react-hot-toast';

export const ToastProvider: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      toastOptions={{
        duration: 4000,
        className:
          '!bg-white/95 dark:!bg-slate-800/95 !text-gray-800 dark:!text-slate-100 !rounded-2xl !border !border-gray-200/80 dark:!border-slate-700/80 !shadow-soft-xl !backdrop-blur-md !px-4 !py-3.5 !text-sm !font-medium',
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
          className:
            '!bg-white/95 dark:!bg-slate-800/95 !text-gray-800 dark:!text-slate-100 !rounded-2xl !border !border-emerald-500/50 dark:!border-emerald-500/40 !shadow-soft-xl !backdrop-blur-md !px-4 !py-3.5 !text-sm !font-medium',
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
          className:
            '!bg-white/95 dark:!bg-slate-800/95 !text-gray-800 dark:!text-slate-100 !rounded-2xl !border !border-red-500/50 dark:!border-red-500/40 !shadow-soft-xl !backdrop-blur-md !px-4 !py-3.5 !text-sm !font-medium',
        },
        loading: {
          iconTheme: {
            primary: '#3b82f6',
            secondary: '#fff',
          },
          className:
            '!bg-white/95 dark:!bg-slate-800/95 !text-gray-800 dark:!text-slate-100 !rounded-2xl !border !border-blue-500/50 dark:!border-blue-500/40 !shadow-soft-xl !backdrop-blur-md !px-4 !py-3.5 !text-sm !font-medium',
        },
      }}
    />
  );
};
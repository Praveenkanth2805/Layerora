'use client';

import { useUIStore } from '@/lib/stores/ui';

export const Toast = () => {
  const { toast } = useUIStore();
  if (!toast) return null;
  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      {toast.message}
    </div>
  );
};
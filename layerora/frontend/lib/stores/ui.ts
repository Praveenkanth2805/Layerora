import { create } from 'zustand';

type Toast = { message: string; type: 'info' | 'error' | 'success' } | null;

interface UIStore {
  toast: Toast;
  showToast: (message: string, type?: 'info' | 'error' | 'success') => void;
  hideToast: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  toast: null,
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  hideToast: () => set({ toast: null }),
}));
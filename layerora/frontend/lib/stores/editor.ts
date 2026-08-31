import { create } from 'zustand';
import { fabric } from 'fabric';
import { api } from '@/lib/api-client';

export interface Layer {
  id: string;
  name: string;
  type: string;
  objectUrl: string;
  properties: any;
  textContent?: string;
}

interface EditorState {
  design: { id: string; canvasWidth: number; canvasHeight: number; layers: Layer[] } | null;
  selectedObjectId: string | null;
  isLoading: boolean;
  // actions
  loadDesign: (id: string) => Promise<void>;
  updateLayer: (fabricObject: fabric.Object) => Promise<void>;
  setSelectedObject: (obj: fabric.Object | null) => void;
  export: (format: 'png' | 'jpg') => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  design: null,
  selectedObjectId: null,
  isLoading: false,

  loadDesign: async (id: string) => {
    set({ isLoading: true });
    try {
      const data = await api.get(`/designs/${id}`);
      set({ design: data });
    } catch (e) {
      // handle error
    } finally {
      set({ isLoading: false });
    }
  },

  updateLayer: async (fabricObject: fabric.Object) => {
    const { design } = get();
    if (!design) return;
    // find layer by id (stored in fabricObject)
    const layer = design.layers.find(l => l.id === fabricObject.id);
    if (!layer) return;

    // update properties
    const updated = {
      ...layer,
      properties: {
        left: fabricObject.left,
        top: fabricObject.top,
        scaleX: fabricObject.scaleX,
        scaleY: fabricObject.scaleY,
        angle: fabricObject.angle,
        // ...
      }
    };

    // optimistic update + debounced API call
    // (use lodash.debounce in effect)
    set(state => ({
      design: {
        ...state.design!,
        layers: state.design!.layers.map(l => l.id === updated.id ? updated : l),
      },
    }));

    // Actually call API after debounce
    await api.patch(`/designs/${design.id}/layer/${layer.id}`, updated.properties);
  },

  setSelectedObject: (obj) => {
    set({ selectedObjectId: obj?.id || null });
  },

  export: (format) => {
    const canvas = fabricRef.current; // need a global ref
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format, quality: 1 });
    // download
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `design.${format}`;
    link.click();
  },
}));
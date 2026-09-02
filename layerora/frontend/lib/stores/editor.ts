import { create } from 'zustand';
import { FabricObject } from 'fabric';
import { api } from '@/lib/api-client';

export interface Layer {
  id: string;
  name: string;
  type: string;
  objectUrl: string;
  properties: any;
  textContent?: string;
}

interface ApiLayer {
  id: string;
  design_id: string;
  layer_type: string;
  name: string;
  object_key: string | null;
  object_url: string | null;
  properties: any;
  text_content?: string | null;
}

interface ApiDesign {
  id: string;
  user_id: string;
  name: string;
  canvas_width: number;
  canvas_height: number;
  status: string;
  thumbnail_key: string | null;
  layers: ApiLayer[];
  created_at: string;
  updated_at: string;
}

interface EditorState {
  design: {
    id: string;
    canvasWidth: number;
    canvasHeight: number;
    layers: Layer[];
  } | null;

  selectedObjectId: string | null;
  isLoading: boolean;

  loadDesign: (id: string) => Promise<void>;
  updateLayer: (fabricObject: FabricObject) => Promise<void>;
  setSelectedObject: (obj: FabricObject | null) => void;
  export: (format: 'png' | 'jpg') => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  design: null,
  selectedObjectId: null,
  isLoading: false,

  loadDesign: async (id: string) => {
    set({ isLoading: true });

    try {
      const data = await api.get<ApiDesign>(`/designs/${id}`);

      const layers: Layer[] = data.layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        type: layer.layer_type,
        objectUrl: layer.object_url || '',
        properties: layer.properties,
        textContent: layer.text_content || undefined,
      }));

      set({
        design: {
          id: data.id,
          canvasWidth: data.canvas_width,
          canvasHeight: data.canvas_height,
          layers,
        },
      });
    } catch (error) {
      console.error('Failed to load design:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateLayer: async (fabricObject: FabricObject) => {
    const { design } = get();

    if (!design) return;

    const layerId = (fabricObject as any).layerId;

    if (!layerId) return;

    const layer = design.layers.find(
      (item) => item.id === layerId
    );

    if (!layer) return;

    const properties = {
      ...layer.properties,
      left: fabricObject.left,
      top: fabricObject.top,
      scaleX: fabricObject.scaleX,
      scaleY: fabricObject.scaleY,
      angle: fabricObject.angle,
    };

    set((state) => ({
      design: state.design
        ? {
            ...state.design,
            layers: state.design.layers.map((item) =>
              item.id === layerId
                ? {
                    ...item,
                    properties,
                  }
                : item
            ),
          }
        : null,
    }));

    try {
      await api.patch(
        `/designs/${design.id}/layer/${layerId}`,
        properties
      );
    } catch (error) {
      console.error('Failed to update layer:', error);
    }
  },

  setSelectedObject: (obj) => {
    set({
      selectedObjectId: obj
        ? (obj as any).layerId || null
        : null,
    });
  },

  export: (format) => {
    console.warn(
      `Export ${format} will be connected to the Fabric canvas next.`
    );
  },
}));
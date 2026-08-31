'use client';

import { useEditorStore } from '@/lib/stores/editor';

export const LayersPanel = () => {
  const { design, selectedObjectId, setSelectedObject } = useEditorStore();

  return (
    <div className="w-64 bg-white border-r p-4 overflow-y-auto">
      <h3 className="font-semibold mb-2">Layers</h3>
      <ul>
        {design?.layers.map((layer) => (
          <li
            key={layer.id}
            className={`p-2 cursor-pointer ${layer.id === selectedObjectId ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            onClick={() => setSelectedObject(layer.id)}
          >
            {layer.name}
          </li>
        ))}
      </ul>
    </div>
  );
};
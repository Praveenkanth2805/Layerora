'use client';

import { useEditorStore } from '@/lib/stores/editor';

export const PropertiesPanel = () => {
  const { selectedObjectId, design } = useEditorStore();
  const layer = design?.layers.find(l => l.id === selectedObjectId);

  if (!layer) return <div className="w-64 bg-white border-l p-4">Select a layer</div>;

  return (
    <div className="w-64 bg-white border-l p-4 overflow-y-auto">
      <h3 className="font-semibold mb-2">Properties</h3>
      <div className="space-y-2">
        <label className="block text-sm">Name</label>
        <input value={layer.name} className="w-full border p-1 text-sm" readOnly />
        <label className="block text-sm">Type</label>
        <input value={layer.type} className="w-full border p-1 text-sm" readOnly />
        {layer.textContent !== undefined && (
          <>
            <label className="block text-sm">Text</label>
            <textarea value={layer.textContent} className="w-full border p-1 text-sm" rows={2} />
          </>
        )}
      </div>
    </div>
  );
};
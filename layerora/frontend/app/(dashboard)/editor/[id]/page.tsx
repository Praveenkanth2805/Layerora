'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useEditorStore } from '@/lib/stores/editor';
import { Canvas } from '@/components/editor/Canvas';
import { LayersPanel } from '@/components/editor/LayersPanel';
import { PropertiesPanel } from '@/components/editor/PropertiesPanel';

export default function EditorPage() {
  const { id } = useParams();
  const { loadDesign, design, isLoading } = useEditorStore();

  useEffect(() => {
    if (id) loadDesign(id as string);
  }, [id]);

  if (isLoading) return <div>Loading design...</div>;
  if (!design) return <div>Design not found</div>;

  return (
    <div className="flex h-screen">
      <LayersPanel />
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <Canvas />
      </div>
      <PropertiesPanel />
    </div>
  );
}
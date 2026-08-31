'use client';

import { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { useEditorStore } from '@/lib/stores/editor';
import { useUIStore } from '@/lib/stores/ui';

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const { design, setSelectedObject, updateLayer } = useEditorStore();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: design?.canvasWidth || 1024,
      height: design?.canvasHeight || 1024,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    // Load layers from design
    if (design?.layers) {
      design.layers.forEach(layer => {
        fabric.Image.fromURL(layer.objectUrl, (img) => {
          img.set({
            left: layer.properties.left,
            top: layer.properties.top,
            scaleX: layer.properties.scaleX,
            scaleY: layer.properties.scaleY,
            // ... other props
          });
          canvas.add(img);
        }, { crossOrigin: 'anonymous' });
      });
    }

    // Selection listener
    canvas.on('selection:created', (e) => {
      const selected = e.selected?.[0];
      if (selected) setSelectedObject(selected);
    });

    canvas.on('object:modified', (e) => {
      const obj = e.target;
      if (obj) {
        // Debounced autosave
        updateLayer(obj);
      }
    });

    return () => {
      canvas.dispose();
    };
  }, [design]);

  return <canvas ref={canvasRef} />;
};
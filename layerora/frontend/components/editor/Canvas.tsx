'use client';

import { useEffect, useRef } from 'react';
import { Canvas as FabricCanvas, FabricImage } from 'fabric';
import { useEditorStore } from '@/lib/stores/editor';

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);

  const {
    design,
    setSelectedObject,
    updateLayer,
  } = useEditorStore();

  useEffect(() => {
    if (!canvasRef.current || !design) return;

    let canvas: FabricCanvas | null = null;

    const initCanvas = async () => {
      if (!canvasRef.current || !design) return;

      canvas = new FabricCanvas(canvasRef.current, {
        width: design.canvasWidth,
        height: design.canvasHeight,
        backgroundColor: '#ffffff',
        preserveObjectStacking: true,
      });

      fabricRef.current = canvas;

      console.log('DESIGN:', design);
      console.log('LAYERS:', design.layers);

      // Background should always be rendered first.
      const sortedLayers = [...design.layers].sort((a, b) => {
        if (a.type === 'background') return -1;
        if (b.type === 'background') return 1;
        return 0;
      });

      for (const layer of sortedLayers) {
        if (!layer.objectUrl) {
          console.warn(
            'Layer has no object URL:',
            layer.name
          );
          continue;
        }

        try {
          const img = await FabricImage.fromURL(
            layer.objectUrl,
            {
              crossOrigin: 'anonymous',
            }
          );

          img.set({
            left: layer.properties.left ?? 0,
            top: layer.properties.top ?? 0,
            scaleX: layer.properties.scaleX ?? 1,
            scaleY: layer.properties.scaleY ?? 1,
            angle: layer.properties.angle ?? 0,
          });

          // Connect Fabric object with Layer database record.
          (img as any).layerId = layer.id;

          canvas.add(img);
        } catch (error) {
          console.error(
            `Failed to load layer: ${layer.name}`,
            error
          );
        }
      }

      canvas.renderAll();

      canvas.on('selection:created', (e) => {
        const selected = e.selected?.[0];

        if (selected) {
          setSelectedObject(selected);
        }
      });

      canvas.on('selection:updated', (e) => {
        const selected = e.selected?.[0];

        if (selected) {
          setSelectedObject(selected);
        }
      });

      canvas.on('selection:cleared', () => {
        setSelectedObject(null);
      });

      canvas.on('object:modified', (e) => {
        if (e.target) {
          updateLayer(e.target);
        }
      });
    };

    initCanvas();

    return () => {
      canvas?.dispose();
      fabricRef.current = null;
    };
  }, [
    design,
    setSelectedObject,
    updateLayer,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="block"
    />
  );
};
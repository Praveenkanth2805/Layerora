'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/stores/ui';
import { api } from '@/lib/api-client';

type Tool = 'layer-split' | 'watermark-remover';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const optimizeImage = async (file: File): Promise<File> => {
  if (file.size <= 5 * 1024 * 1024) return file;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, file.type, 1)
  );

  if (!blob || blob.size >= file.size) return file;

  return new File([blob], file.name, {
    type: file.type,
    lastModified: file.lastModified,
  });
};

export const ImageUploadZone = () => {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const { showToast } = useUIStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const originalFile = acceptedFiles[0];
    if (!originalFile) return;

    if (originalFile.size > MAX_FILE_SIZE) {
      showToast('File too large. Max 10MB.', 'error');
      return;
    }

    setUploading(true);

    try {
      let file = originalFile;

      if (selectedTool === 'watermark-remover' && file.size > 5 * 1024 * 1024) {
        file = await optimizeImage(file);
      }

      const formData = new FormData();
      formData.append('file', file);

      if (selectedTool === 'layer-split') {
        const response = await api.post('/designs/upload', formData);
        router.push(`/editor/${response.id}`);
        return;
      }

      const response = await api.post('/watermark-remover/upload', formData);
      router.push(`/watermark-remover/${response.id}`);
    } catch {
      showToast('Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  }, [selectedTool, router, showToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  if (!selectedTool) {
    return (
      <div className="w-full">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold">Choose a Tool</h2>
          <p className="mt-1 text-sm text-gray-500">
            Select what you want to do with your image
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSelectedTool('layer-split')}
            className="rounded-xl border border-gray-200 p-6 text-left transition hover:border-blue-500 hover:shadow-md"
          >
            <div className="text-lg font-semibold">Layer Split</div>
            <p className="mt-2 text-sm text-gray-500">
              Extract objects, text and background into separate layers.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTool('watermark-remover')}
            className="rounded-xl border border-gray-200 p-6 text-left transition hover:border-blue-500 hover:shadow-md"
          >
            <div className="text-lg font-semibold">Watermark Remover</div>
            <p className="mt-2 text-sm text-gray-500">
              Remove text, logos or selected areas from an image.
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {selectedTool === 'layer-split' ? 'Layer Split' : 'Watermark Remover'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Upload an image to continue
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSelectedTool(null)}
          disabled={uploading}
          className="text-sm text-blue-600 hover:underline disabled:opacity-50"
        >
          Change Tool
        </button>
      </div>

      <div
        {...getRootProps()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-12 text-center transition hover:border-blue-500"
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div>Uploading...</div>
        ) : isDragActive ? (
          <p>Drop the image here...</p>
        ) : (
          <div>
            <p>Drag & drop an image, or click to browse</p>
            <p className="mt-2 text-sm text-gray-500">
              PNG, JPG, WebP up to 10MB
            </p>
            <p className="mt-4 text-xs text-blue-500">
              First image free • No signup required
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

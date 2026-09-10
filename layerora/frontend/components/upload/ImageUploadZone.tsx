'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/stores/ui';
import { api } from '@/lib/api-client';
import { WatermarkRemoverUpload } from './WatermarkRemoverUpload';
import {LayerSplitComingSoon} from '@/app/layer-split/LayerSplitComingSoon';

type Tool = 'layer-split' | 'watermark-remover';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ImageUploadZone = () => {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [uploading, setUploading] = useState(false);

  const router = useRouter();
  const { showToast } = useUIStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];

      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        showToast('File too large. Max 10MB.', 'error');
        return;
      }

      setUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/designs/upload', formData);

        router.push(`/editor/${response.id}`);
      } catch (error: unknown) {
        const err = error as {
          response?: {
            data?: {
              detail?: string;
              message?: string;
            };
          };
          message?: string;
        };

        const message =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Upload failed. Please try again.';

        showToast(message, 'error');
      } finally {
        setUploading(false);
      }
    },
    [router, showToast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  if (selectedTool === 'watermark-remover') {
    return <WatermarkRemoverUpload />;
  }
if (selectedTool === 'layer-split') {
    return <LayerSplitComingSoon />;
  }
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
            <div className="text-lg font-semibold">
              Watermark Remover
            </div>

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
          <h2 className="text-xl font-semibold">Layer Split</h2>

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
          </div>
        )}
      </div>
    </div>
  );
};
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/stores/ui';
import { api } from '@/lib/api-client';

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

export const WatermarkRemoverUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [checkingCredits, setCheckingCredits] = useState(true);
    
  const router = useRouter();
  const { showToast } = useUIStore();

  const checkCredits = useCallback(async () => {
    setCheckingCredits(true);

    try {
      const response = await api.get('/watermark-remover/credits');
      setCredits(response.remaining);
    } catch {
      setCredits(null);
    } finally {
      setCheckingCredits(false);
    }
  }, []);
  useEffect(() => {
  checkCredits();
}, [checkCredits]);
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const originalFile = acceptedFiles[0];

      if (!originalFile) return;

      if (credits === 0) {
        showToast(
          'No watermark removal credits remaining today.',
          'error'
        );
        return;
      }

      if (originalFile.size > MAX_FILE_SIZE) {
        showToast('File too large. Max 10MB.', 'error');
        return;
      }

      setUploading(true);

      try {
        let file = originalFile;

        if (file.size > 5 * 1024 * 1024) {
          file = await optimizeImage(file);
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post(
          '/watermark-remover/upload',
          formData
        );

        router.push(`/watermark-remover/${response.id}`);
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

        await checkCredits();
      } finally {
        setUploading(false);
      }
    },
    [credits, router, showToast, checkCredits]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: 1,
    disabled: uploading || checkingCredits || credits === 0,
  });

  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Watermark Remover</h2>

        <p className="mt-1 text-sm text-gray-500">
          Upload an image to remove text, logos or selected areas.
        </p>
      </div>

      <div
        {...getRootProps({
          onClick: (event) => {
            if (credits === 0) {
              event.preventDefault();

              showToast(
                'No watermark removal credits remaining today.',
                'error'
              );
            }
          },
        })}
        className={`relative rounded-xl border-2 border-dashed p-12 text-center transition ${
          credits === 0
            ? 'cursor-not-allowed border-gray-300 bg-gray-50'
            : 'cursor-pointer border-gray-300 hover:border-blue-500'
        }`}
      >
        <input {...getInputProps()} />

        {checkingCredits ? (
          <div>Checking available credits...</div>
        ) : credits === 0 ? (
          <div>
            <p className="font-medium text-red-600">
              No watermark removal credits remaining
            </p>

            <p className="mt-2 text-sm text-gray-500">
              You cannot upload another image until your credits reset.
            </p>

            <p className="mt-4 text-xs text-gray-400">
              Click or drag & drop is disabled
            </p>
          </div>
        ) : uploading ? (
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

            {credits !== null && (
              <p className="mt-2 text-xs text-gray-400">
                {credits} removal{credits === 1 ? '' : 's'} remaining today
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
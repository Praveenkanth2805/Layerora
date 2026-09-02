'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/stores/ui';
import { api } from '@/lib/api-client';

export const ImageUploadZone = () => {
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const { showToast } = useUIStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('File too large. Max 5MB.', 'error');
      return;
    }
    // more client validation

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/designs/upload', formData);
      router.push(`/editor/${response.id}`);
    } catch (error) {
      showToast('Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition cursor-pointer"
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div>Uploading...</div>
      ) : isDragActive ? (
        <p>Drop the image here...</p>
      ) : (
        <div>
          <p>Drag & drop an image, or click to browse</p>
          <p className="text-sm text-gray-500 mt-2">PNG, JPG, WebP up to 5MB</p>
          <p className="text-xs text-blue-500 mt-4">First image free • No signup required</p>
        </div>
      )}
    </div>
  );
};
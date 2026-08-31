'use client';

import { useSession } from 'next-auth/react';
import { ImageUploadZone } from '@/components/upload/ImageUploadZone';

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold text-center mb-4">Turn Images Into Layers</h1>
      <p className="text-center text-gray-600 mb-8">
        Upload an image. Layerora separates it into editable layers for easy designing.
      </p>
      <ImageUploadZone />
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
        <div>1. Upload</div>
        <div>2. AI separates</div>
        <div>3. Edit layers</div>
        <div>4. Export</div>
      </div>
    </main>
  );
}
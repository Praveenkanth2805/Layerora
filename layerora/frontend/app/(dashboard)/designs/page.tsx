'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api-client';
import Link from 'next/link';

export default function Designs() {
  const { data: session } = useSession();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      api.get('/designs').then(res => {
        setDesigns(res);
        setLoading(false);
      });
    }
  }, [session]);

  if (!session) return <div>Please sign in to view your designs.</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">My Designs</h1>
      {loading ? (
        <div>Loading...</div>
      ) : designs.length === 0 ? (
        <div>No designs yet. <Link href="/" className="text-blue-500">Upload an image</Link> to get started.</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {designs.map((d: any) => (
            <Link key={d.id} href={`/editor/${d.id}`} className="border p-4 rounded hover:shadow">
              <div className="h-40 bg-gray-100 flex items-center justify-center">Thumbnail</div>
              <p className="mt-2 font-medium">{d.name}</p>
              <p className="text-sm text-gray-500">{d.status}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api-client';

export default function Credits() {
  const { data: session } = useSession();
  const [balance, setBalance] = useState({ free_remaining: 0, purchased: 0, total: 0 });
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    if (session) {
      api.get('/credits/balance').then(setBalance);
      api.get('/credits/packages').then(setPackages);
    }
  }, [session]);

  if (!session) return <div>Please sign in to view credits.</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">Credits</h1>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="border p-4 rounded">Free Daily: {balance.free_remaining}</div>
        <div className="border p-4 rounded">Purchased: {balance.purchased}</div>
        <div className="border p-4 rounded">Total: {balance.total}</div>
      </div>
      <h2 className="text-xl mt-8">Buy Credits</h2>
      <div className="grid grid-cols-3 gap-4 mt-4">
        {packages.map((pkg: any) => (
          <div key={pkg.id} className="border p-4 rounded">
            <h3>{pkg.name}</h3>
            <p>{pkg.credits} credits</p>
            <p className="font-bold">${pkg.price}</p>
            <button className="mt-2 bg-green-500 text-white p-2 rounded w-full">Buy</button>
          </div>
        ))}
      </div>
    </div>
  );
}
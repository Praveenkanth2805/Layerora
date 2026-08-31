'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Unknown error';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
        <p className="text-gray-700 mb-4">Something went wrong during sign in:</p>
        <pre className="bg-gray-100 p-3 rounded text-sm text-red-500 mb-6">{error}</pre>
        <Link href="/login" className="text-blue-600 hover:underline">
          ← Back to Sign In
        </Link>
      </div>
    </div>
  );
}
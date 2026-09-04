'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

type Mode = 'text' | 'logo' | 'custom';

interface WatermarkJob {
  id: string;
  original_url: string | null;
  status: string;
  mode: Mode | null;
  text: string | null;
}

export default function WatermarkRemoverPage() {
  const { job_id } = useParams();
  const router = useRouter();
  const [job, setJob] = useState<WatermarkJob | null>(null);
  const [mode, setMode] = useState<Mode>('custom');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!job_id) return;
    const loadJob = async () => {
      try {
        const response = await api.get(`/watermark-remover/${job_id}`);
        setJob(response);
        if (response.mode) setMode(response.mode);
        if (response.text) setText(response.text);
      } catch {
        setJob(null);
      } finally {
        setLoading(false);
      }
    };
    loadJob();
  }, [job_id]);

  const handleContinue = async () => {
    if (!job_id || saving) return;

    if (mode === 'text' && !text.trim()) {
      alert('Please enter the watermark text.');
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/watermark-remover/${job_id}`, {
        mode,
        text: mode === 'text' ? text.trim() : null,
        selection: mode === 'text' ? null : { x: 0, y: 0, width: 0, height: 0 },
      });
      router.push(`/watermark-remover/${job_id}/process`);
    } catch (error) {
      alert('Failed to save watermark settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Job not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Watermark Remover</h1>
          <p className="mt-1 text-sm text-gray-500">
            Select the type of watermark you want to remove.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex min-h-[500px] items-center justify-center rounded-xl border bg-gray-50 p-6">
            {job.original_url ? (
              <img
                src={job.original_url}
                alt="Uploaded image"
                className="max-h-[600px] max-w-full object-contain"
              />
            ) : (
              <p className="text-gray-500">Image unavailable.</p>
            )}
          </div>

          <aside className="rounded-xl border p-5">
            <h2 className="mb-4 font-semibold">Removal Mode</h2>

            <div className="space-y-3">
              {(['text', 'logo', 'custom'] as Mode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    mode === item
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium capitalize">{item}</div>
                  <p className="mt-1 text-sm text-gray-500">
                    {item === 'text'
                      ? 'Remove a text watermark.'
                      : item === 'logo'
                      ? 'Remove a logo watermark.'
                      : 'Select any area manually.'}
                  </p>
                </button>
              ))}
            </div>

            {mode === 'text' && (
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter watermark text"
                className="mt-4 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
              />
            )}

            <button
              type="button"
              onClick={handleContinue}
              disabled={saving}
              className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
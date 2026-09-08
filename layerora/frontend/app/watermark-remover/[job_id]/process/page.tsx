'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

type Point = {
  x: number;
  y: number;
};

type Stroke = {
  points: Point[];
  size: number;
};

type Job = {
  id: string;
  user_id: string;
  original_key: string;
  original_url?: string | null;
  mask_key?: string | null;
  result_key?: string | null;
  result_url?: string | null;
  mode?: string | null;
  text?: string | null;
  selection?: unknown;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export default function WatermarkProcessPage() {
  const { job_id } = useParams();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [brushSize, setBrushSize] = useState(40);
  const [drawing, setDrawing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
    const [credits, setCredits] = useState<number | null>(null);
      useEffect(() => {
    const loadCredits = async () => {
      try {
        const response = await api.get('/watermark-remover/credits');
        setCredits(response.remaining);
      } catch {
        setCredits(null);
      }
    };

    loadCredits();
  }, []);
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !image.naturalWidth || !image.naturalHeight) return;

    const rect = image.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.drawImage(image, 0, 0, rect.width, rect.height);

    const scale = rect.width / image.naturalWidth;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(59,130,246,0.55)';
    ctx.fillStyle = 'rgba(59,130,246,0.55)';

    for (const stroke of strokes) {
      if (!stroke.points.length) continue;

      ctx.lineWidth = stroke.size * scale;

      if (stroke.points.length === 1) {
        const point = stroke.points[0];

        ctx.beginPath();
        ctx.arc(
          point.x * scale,
          point.y * scale,
          ctx.lineWidth / 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        continue;
      }

      ctx.beginPath();

      stroke.points.forEach((point, index) => {
        const x = point.x * scale;
        const y = point.y * scale;

        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
    }
  }, [strokes]);

  useEffect(() => {
    if (!job_id) return;

    const load = async () => {
      try {
        const response = await api.get(`/watermark-remover/${job_id}`);
        setJob(response);
      } catch {
        setJob(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [job_id]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    const handleResize = () => drawCanvas();

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas]);

  useEffect(() => {
    if (!processing || !job_id) return;

    const interval = setInterval(async () => {
      try {
        const response = await api.get<Job>(
          `/watermark-remover/${job_id}`,
        );

        console.log('Watermark job response:', response);
        console.log('RESULT KEY:', response.result_key);
        console.log('RESULT URL:', response.result_url);

        setJob(response);

        if (
          response.status === 'completed' ||
          response.status === 'failed'
        ) {
          setProcessing(false);
          clearInterval(interval);
        }
      } catch {
        setProcessing(false);
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [processing, job_id]);

  const getPoint = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ): Point | null => {
    const image = imageRef.current;

    if (!image || !image.naturalWidth || !image.naturalHeight) {
      return null;
    }

    const rect = image.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (
      x < 0 ||
      y < 0 ||
      x > rect.width ||
      y > rect.height
    ) {
      return null;
    }

    return {
      x: (x / rect.width) * image.naturalWidth,
      y: (y / rect.height) * image.naturalHeight,
    };
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (processing) return;

    const point = getPoint(event);

    if (!point) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    setDrawing(true);

    setStrokes((current) => [
      ...current,
      {
        points: [point],
        size: brushSize,
      },
    ]);
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (!drawing || processing) return;

    const point = getPoint(event);

    if (!point) return;

    setStrokes((current) => {
      if (!current.length) return current;

      const next = [...current];
      const last = next[next.length - 1];

      next[next.length - 1] = {
        ...last,
        points: [...last.points, point],
      };

      return next;
    });
  };

  const handlePointerUp = () => {
    setDrawing(false);
  };

  const handleUndo = () => {
    setStrokes((current) => current.slice(0, -1));
  };

  const handleClear = () => {
    setStrokes([]);
  };

    const handleRemove = async () => {
    if (!job_id || !strokes.length || processing) return;

    setProcessing(true);

    try {
      await api.post(`/watermark-remover/${job_id}/process`, {
        strokes,
      });
    } catch (error: any) {
  console.log('FULL API ERROR:', error);
  console.log('RESPONSE DATA:', error?.response?.data);

  setProcessing(false);

  const message =
    error?.response?.data?.detail ||
    error?.message ||
    'Failed to start watermark removal.';

  alert(message);
}
  };

  const handleDownload = async () => {
    if (!job?.result_url) return;

    try {
      const response = await fetch(job.result_url);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'watermark-removed.png';

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download image.');
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">
          Loading...
        </p>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">
            Job not found
          </h1>

          <button
            onClick={() => router.push('/')}
            className="mt-4 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white"
          >
            Go Home
          </button>
        </div>
      </main>
    );
  }

  if (job.status === 'completed' && job.result_url) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Watermark Removed
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Your image has been processed successfully.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <img
              src={job.result_url}
              alt="Watermark removed"
              className="mx-auto max-h-[70vh] max-w-full rounded-xl object-contain"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={handleDownload}
              className="rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Download PNG
            </button>

            <button
              onClick={() => router.push('/')}
              className="rounded-xl border bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Remove Another
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Remove Watermark
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Paint over the watermark area and remove it naturally.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-xl bg-gray-100">
              <img
                ref={imageRef}
                src={job.original_url || ''}
                alt="Original image"
                onLoad={drawCanvas}
                className="block max-h-[75vh] max-w-full object-contain"
              />

              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="absolute inset-0 h-full w-full touch-none cursor-crosshair"
              />
            </div>
          </div>

          <aside className="rounded-2xl border bg-white p-5 shadow-sm">
                        <div className="mb-4 rounded-xl border bg-gray-50 p-3 text-sm">
              <div className="mb-4 rounded-lg border bg-gray-50 p-3 text-sm">
  Watermark credits remaining:{' '}
  <span className="font-semibold">
    {credits === null ? 'Loading...' : credits}
  </span>
</div>
            </div>
            <h2 className="text-base font-semibold text-gray-900">
              Brush Size
            </h2>

            <div className="mt-4">
              <input
                type="range"
                min="4"
                max="300"
                value={brushSize}
                onChange={(event) =>
                  setBrushSize(Number(event.target.value))
                }
                className="w-full"
                disabled={processing}
              />

              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>Small</span>
                <span>{brushSize}px</span>
                <span>Large</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!strokes.length || processing || credits === 0}
                className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Undo
              </button>

              <button
                type="button"
                onClick={handleClear}
              disabled={!strokes.length || processing || credits === 0}
                className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear
              </button>
            </div>

            {/* AdSense Space */}
            <div className="mt-4 flex min-h-[100px] items-center justify-center rounded-xl bg-gray-50">
              <span className="text-xs text-gray-400">
                Advertisement
              </span>
            </div>

            <button
              type="button"
              onClick={handleRemove}
              disabled={!strokes.length || processing || credits === 0}
              className="mt-4 w-full rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing
                ? 'Removing Watermark...'
                : credits === 0
                ? 'No Credits'
                : 'Remove Watermark'}
            </button>
            {credits === 0 && (
              <p className="mt-3 text-sm text-red-500">
                No watermark removal credits remaining today.
              </p>
            )}
            <p className="mt-3 text-xs leading-5 text-gray-500">
              For best results, paint slightly beyond the watermark edges.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
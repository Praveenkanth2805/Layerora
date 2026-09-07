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

  ctx.drawImage(
    image,
    0,
    0,
    rect.width,
    rect.height,
  );

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

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
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
        const response = await api.get<Job>(`/watermark-remover/${job_id}`);
console.log('Watermark job response:', response);
console.log('RESULT KEY:', response.result_key);
console.log('RESULT URL:', response.result_url);
        setJob(response);

        if (response.status === 'completed' || response.status === 'failed') {
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
    } catch {
      setProcessing(false);
      alert('Failed to start watermark removal.');
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

  if (job.status === 'completed' && job.result_url) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Watermark Removed</h1>
            <p className="mt-1 text-sm text-gray-500">
              Your image is ready.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <img
              src={job.result_url}
              alt="Watermark removed result"
              className="mx-auto max-h-[75vh] max-w-full object-contain"
            />

            <div className="mt-6 flex justify-center gap-3">
              <a
                href={job.result_url}
                download
                className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
              >
                Download PNG
              </a>

              <button
                type="button"
                onClick={() => router.push('/')}
                className="rounded-xl border px-6 py-3 font-medium"
              >
                Remove Another
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold">Remove Watermark</h1>
          <p className="mt-1 text-sm text-gray-500">
            Paint over the watermark area. We will reconstruct the selected
            area from the surrounding image.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border bg-white p-3 shadow-sm">
  <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-xl bg-gray-900">
    <img
      ref={(image) => {
        imageRef.current = image;
        if (image) {
          image.onload = () => {
            drawCanvas();
          };
        }
      }}
      src={job.original_url ?? ''}
      alt="Image to edit"
      className="block h-auto w-full"
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
            <div className="mb-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Removal mode
              </p>

              <h2 className="mt-1 text-lg font-semibold capitalize">
                {job.mode}
              </h2>

              {job.text && (
                <p className="mt-1 text-sm text-gray-500">
                  Text: {job.text}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Brush size</label>

                <span className="text-sm text-gray-500">
                  {brushSize}px
                </span>
              </div>

              <input
                type="range"
                min="10"
                max="150"
                value={brushSize}
                onChange={(event) =>
                  setBrushSize(Number(event.target.value))
                }
                className="mt-3 w-full"
                disabled={processing}
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!strokes.length || processing}
                className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-40"
              >
                Undo
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={!strokes.length || processing}
                className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-40"
              >
                Clear
              </button>
            </div>

            <button
              type="button"
              onClick={handleRemove}
              disabled={!strokes.length || processing}
              className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? 'Removing Watermark...' : 'Remove Watermark'}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-gray-400">
              For best results, paint slightly beyond the watermark edges.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
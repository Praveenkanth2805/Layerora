import { ImageUploadZone } from '@/components/upload/ImageUploadZone';

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <section className="flex min-h-screen items-center px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          {/* Hero */}
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 shadow-sm">
              ✨ AI-Powered Image Editing
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              Transform Your Images
              <span className="mt-2 block text-gray-500">
                Into Layers. Remove Watermarks.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              Layerora gives you powerful image tools to separate images into
              editable layers and remove unwanted watermarks naturally.
            </p>
          </div>

          {/* Upload Tool */}
          <div className="mx-auto mt-8 max-w-3xl">
            <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-xl shadow-gray-200/50 sm:p-4">
              <ImageUploadZone />
            </div>
          </div>

          {/* Workflow */}
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 text-center">
              <div className="text-lg">📤</div>
              <p className="mt-1 text-xs font-semibold text-gray-900">
                Upload
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                Choose your image
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 text-center">
              <div className="text-lg">✨</div>
              <p className="mt-1 text-xs font-semibold text-gray-900">
                Separate
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                Create editable layers
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 text-center">
              <div className="text-lg">🪄</div>
              <p className="mt-1 text-xs font-semibold text-gray-900">
                Remove
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                Clean unwanted watermarks
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 text-center">
              <div className="text-lg">⬇️</div>
              <p className="mt-1 text-xs font-semibold text-gray-900">
                Export
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                Download your result
              </p>
            </div>
          </div>

          {/* Bottom text */}
          <p className="mt-6 text-center text-xs text-gray-400">
            Simple tools. Powerful results. Built for creators.
          </p>
        </div>
      </section>
    </main>
  );
}
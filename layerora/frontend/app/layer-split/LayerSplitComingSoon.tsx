export const LayerSplitComingSoon =() => {
  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-gradient-to-br from-white via-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 text-4xl">
          🧩
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Layer Split
        </h1>

        <p className="mt-4 text-base leading-7 text-gray-600">
          This feature is coming soon.
          <br />
          We’re working on something powerful for your images.
        </p>

        <div className="mt-8">
          <a
            href="/"
            className="inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}
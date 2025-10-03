"use client";

export default function LoadingPage() {
  return (
    <main className="max-w-5xl mx-auto py-12 px-4 gap-8 space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="h-8 w-64 bg-card mx-auto rounded-md" />
        <div className="h-4 w-96 bg-card mx-auto rounded-md" />
      </div>

      {/* Balance / Progress Section */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-3 flex-col lg:flex-row justify-between">
          <div className="flex gap-2 items-center">
            <div className="h-6 w-16 bg-card rounded-md" />
            <div className="h-6 w-40 bg-card rounded-md" />
          </div>

          <div className="flex gap-2 items-center">
            <div className="h-4 w-48 bg-card rounded-md" />
            <div className="h-8 w-24 bg-card rounded-md" />
            <div className="h-8 w-24 bg-card rounded-md" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full bg-card rounded-full" />
        <div className="h-4 w-72 mx-auto bg-card rounded-md" />
      </div>

      {/* Input + Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Left Section */}
        <section>
          <div className="bg-card p-4 space-y-4 border rounded-xl">
            <div className="h-6 w-32 bg-card rounded-md" />
            <div className="h-40 w-full bg-card rounded-md" />
            <div className="flex justify-end">
              <div className="h-10 w-32 bg-card rounded-md" />
            </div>
          </div>
        </section>

        {/* Right Section */}
        <section>
          <div className="bg-card p-4 h-full space-y-4 border rounded-xl">
            <div className="h-6 w-32 bg-card rounded-md" />
            <div className="h-40 w-full bg-card rounded-md" />
          </div>
        </section>
      </div>

      {/* History Section */}
      <section>
        <div className="py-4 px-1 border-t">
          <div className="flex justify-between pb-4 border-b mb-4">
            <div className="h-6 w-32 bg-card rounded-md" />
            <div className="h-4 w-24 bg-card rounded-md" />
          </div>

          <ul className="space-y-3 max-h-64 overflow-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="p-3 border rounded-md bg-muted space-y-2"
              >
                <div className="h-3 w-32 bg-card rounded-md" />
                <div className="h-4 w-full bg-card rounded-md" />
                <div className="h-4 w-2/3 bg-card rounded-md" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

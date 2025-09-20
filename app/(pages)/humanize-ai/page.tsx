"use client";

import { Suspense } from "react";
import HumanizerPageContent from "./HumanizerPageContent";


export default function HumanizerPage() {
  return (
    <Suspense
      fallback={
        <main className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      }
    >
      <HumanizerPageContent />
    </Suspense>
  );
}

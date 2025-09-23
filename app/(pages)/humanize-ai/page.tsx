import { Suspense } from "react";
import HumanizerPageContent from "./HumanizerPageContent";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";

export default async function HumanizerPage() {
  const { has } = await auth();
  const hasPaidPlan = has({ plan:"free" });

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

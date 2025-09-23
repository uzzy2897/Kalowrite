import { Suspense } from "react";
import HumanizerPageContent from "./HumanizerPageContent";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";

export default async function HumanizerPage() {
  const { has } = await auth();
  const hasPaidPlan = has({ plan:"ultra" });

  return (
    <Suspense
      fallback={
        <main className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      }
    >
      {hasPaidPlan ? (
        <HumanizerPageContent />
      ) : (
        <main className="flex items-center justify-center min-h-screen px-4">
          <div className="max-w-md border p-4  flex flex-col gap-3">
            <TriangleAlert className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-bold" >Upgrade Required</h2>
            <p className="text-muted-foreground text-sm">
              This feature is only available on the{" "}
              <span className="font-semibold">Ultra Plan</span>.  
              Upgrade now to unlock full access.
            </p>
            <div className="mt-4 flex justify-end">
              <Button asChild>
                <Link href="/pricing">Upgrade Plan</Link>
              </Button>
            </div>
          </div>
        </main>
      )}
    </Suspense>
  );
}

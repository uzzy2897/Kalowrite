import { Suspense } from "react";
import HumanizerPageContent from "./HumanizerPageContent";


export default async function HumanizerPage() {


  return (
    <Suspense
      fallback={
        <main className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      }
    >

        <HumanizerPageContent />

      
     
    </Suspense>
  );
}

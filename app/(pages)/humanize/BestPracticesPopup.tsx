"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function BestPracticesPopup() {
  const [showPopup, setShowPopup] = useState(false);

  // ✅ Show popup for first 3 visits
  useEffect(() => {
    const popupCount = Number(localStorage.getItem("humanize_popup_count") || 0);
    if (popupCount < 3) setShowPopup(true);
  }, []);

  const handleClosePopup = () => {
    const popupCount = Number(localStorage.getItem("humanize_popup_count") || 0);
    localStorage.setItem("humanize_popup_count", String(popupCount + 1));
    setShowPopup(false);
  };

  return (
    <Dialog open={showPopup} onOpenChange={setShowPopup}>
      <DialogContent className="max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-emerald-700">
            Best Practices (Important)
          </DialogTitle>

          {/* ✅ Use DialogDescription only for short paragraph */}
          <DialogDescription className="text-sm text-muted-foreground">
            Please follow these instructions if you want the best possible
            humanized output.
          </DialogDescription>
        </DialogHeader>

        {/* ✅ Move lists outside of DialogDescription for valid HTML */}
        <div className="text-sm text-muted-foreground space-y-3 mt-3">
          <ul className="list-disc pl-5 space-y-2 text-left">
            <li>
              KaloWrite works best with <b>GPT-5</b>, <b>Gemini 2.5 Pro</b>, and{" "}
              <b>Claude 4.5 Sonnet</b>. Older models may provide inconsistent
              results.
            </li>
            <li>
              It’s tested against top AI detectors such as <b>Copyleaks</b>,{" "}
              <b>ZeroGPT</b>, <b>Quillbot</b>, and <b>Winston AI</b>. However, AI
              detectors change frequently and may still give false flags.
            </li>
            <li>
              If your AI detector doesn’t bypass on the first try:
              <ul className="list-decimal pl-5 mt-1 space-y-1">
                <li>Regenerate the output in KaloWrite.</li>
                <li>Regenerate the AI text and try again.</li>
                <li>Try changing the model (Pro or Lite).</li>
              </ul>
            </li>
          </ul>
        </div>

        <Button
          className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          onClick={handleClosePopup}
        >
          I UNDERSTAND
        </Button>
      </DialogContent>
    </Dialog>
  );
}

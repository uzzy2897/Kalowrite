"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { useEffect } from "react";

// 🧩 Custom Highlight extension: removes yellow background
const CustomHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({
          class: "text-muted-foreground bg-transparent",
          style: "",
        }),
      },
    };
  },
}).configure({
  multicolor: false,
});

export default function Page() {
  const wordLimit = 50;

  const editor = useEditor({
    extensions: [StarterKit, CustomHighlight],
    immediatelyRender: false,
    content: `
      <p>
    
      </p>
    `,
  });

  useEffect(() => {
    if (!editor) return;

    const updateHighlight = () => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/);
      const wordCount = words.length;

      // Remove all previous highlights
      editor.chain().unsetHighlight().run();

      if (wordCount > wordLimit) {
        const textBeforeLimit = words.slice(0, wordLimit).join(" ");
        const start = textBeforeLimit.length + 1;
        const end = text.length;

        // Highlight exceeded words with text-muted-foreground class
        editor
          .chain()
          .setTextSelection({ from: start, to: end })
          .setHighlight()
          .setTextSelection(0)
          .run();
      }
    };

    updateHighlight();
    editor.on("update", updateHighlight);

    // ✅ Type-safe cleanup (return void)
    return () => {
      editor.off("update", updateHighlight);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="min-h-screen bg-background text-foreground p-8 transition-colors">
      <h1 className="text-2xl font-semibold mb-4">🧠 Word Limit Demo</h1>

      <div className="border rounded-md p-4 bg-card max-w-3xl shadow-sm">
        <EditorContent editor={editor} />
      </div>

      <p
        className={`mt-2 text-sm ${
          editor.getText().trim().split(/\s+/).length > wordLimit
            ? "text-destructive"
            : "text-muted-foreground "
        }`}
      >
        {editor.getText().trim().split(/\s+/).length}/{wordLimit} words
      </p>
    </div>
  );
}

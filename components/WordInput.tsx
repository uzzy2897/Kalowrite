"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";

// 🧩 Custom Highlight extension to make exceeded words use text-muted-foreground (no yellow)
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

interface WordLimitEditorProps {
  wordLimit: number;
  value: string;
  onChange: (value: string) => void;
}

export default function WordLimitEditor({
  wordLimit,
  value,
  onChange,
}: WordLimitEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, CustomHighlight],
    immediatelyRender: false,
    content: value ? `<p>${value}</p>` : "<p></p>",
    onUpdate({ editor }) {
      const text = editor.getText();
      onChange(text);
    },
  });

  /* ✅ NEW: React to external `value` changes (like Clear button) */
  useEffect(() => {
    if (editor && value !== editor.getText()) {
      editor.commands.setContent(value ? `<p>${value}</p>` : "<p></p>");
    }
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;

    const updateHighlight = () => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/);
      const wordCount = words.length;

      // Clear all previous highlights
      editor.chain().unsetHighlight().run();

      if (wordCount > wordLimit) {
        const textBeforeLimit = words.slice(0, wordLimit).join(" ");
        const start = textBeforeLimit.length + 1;
        const end = text.length;

        const currentPos = editor.state.selection.from; // Save current cursor
        editor
          .chain()
          .setTextSelection({ from: start, to: end })
          .setHighlight()
          .setTextSelection(currentPos) // Restore where user was typing
          .run();
      }
    };

    updateHighlight();
    editor.on("update", updateHighlight);
    return () => {
      editor.off("update", updateHighlight);
    };
  }, [editor, wordLimit]);

  if (!editor) return null;

  return (
    <div className="relative w-full h-[200px] border rounded-md bg-card text-foreground p-3 overflow-y-auto">
      <EditorContent className="tiptap" editor={editor} />
    </div>
  );
}

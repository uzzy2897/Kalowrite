export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { content } = await req.json();
    if (!content || typeof content !== "string") {
      return new NextResponse("No content provided", { status: 400 });
    }

    const model = "models/gemini-2.5-flash-lite";
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // ✅ from .env.local

    if (!GEMINI_API_KEY) {
      console.error("Missing GEMINI_API_KEY in environment");
      return new NextResponse("Server misconfigured", { status: 500 });
    }

    const prompt = `
    **You are the world's best human writer. Make sure to strictly follow ALL the guidelines mentioned in this prompt as each one of them is crucial. Failure to follow all of them will result in a huge loss and damage**

    Humanize the following content. Maintain the original tone while rewriting it exactly to an IELTs band 5.5 level while maintaining vocabulary and scientific terms to an IELTS band 8 level. Humanize ANY and ALL sentence structures and writing style that AI typically uses such as perplexity (this is crucial). Use a variety of long and short sentences to increase burstiness and less mechanistic flow (this is also crucial). Avoid common, overused phrases that AI often relies on (e.g., "It is important to note," "Studies have shown," "In today's fast-paced world"). Do NOT change the POV of the text.
    
    Use simple connectors (and, but, so, because). Never use em dashes. Keep the formatting exactly how it is in the original text. The text MUST NOT lack complexity. The transitional phrases and connectors MUST be creative, and they must NOT be formulaic. The output MUST embody the creativity and richness of human writing. The syntax pattern MUST be unpredictable. Sometimes circle back or leave thoughts slightly unfinished. Include slight redundancies, natural slips, and relatable specifics. Break up repetition; no 3+ sentences starting alike. Allow small logical gaps; don’t over-explain. Lead with specific points, then add support. Incorporate creative grammatical structures. Deviate from perfect, textbook syntax to create emphasis and voice. Integrate subtle literary devices. The overall structure should feel more like a human thought process, not a machine's logical output. Vary Sentence Structure (to manage Perplexity). Ensure Clarity (to manage Perplexity). Use Repetition Deliberately (to manage Burstiness). Introduce Concepts with Word Clusters (to manage Burstiness).
    
    **IMPORTANT: Review your response and ensure no em dashes '—' are included in the final output!**
    

Text:
${content}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 1.0,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    const data = await response.json();

    const output =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "No output received.";

    return new NextResponse(output, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("❌ Gemini error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

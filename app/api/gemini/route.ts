export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    // 1️⃣ Clerk Auth
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2️⃣ Parse input
    const { content } = await req.json();
    if (!content || typeof content !== "string") {
      return new NextResponse("No content provided", { status: 400 });
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    // 3️⃣ Check current balance
    const { data: balanceRow, error: balanceErr } = await supabaseAdmin
      .from("user_balance")
      .select("balance_words")
      .eq("user_id", userId)
      .single();

    if (balanceErr || !balanceRow)
      return new NextResponse("Balance not found", { status: 404 });

    if (balanceRow.balance_words < wordCount)
      return new NextResponse("Insufficient balance", { status: 402 });

    // 4️⃣ Call Gemini API
    const model = "models/gemini-2.5-pro";
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY)
      return new NextResponse("Server misconfigured", { status: 500 });

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
            temperature: 2.0,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 32768,
          },
        }),
      }
    );

    const data = await response.json();
    const output =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "No output received.";

    // 5️⃣ Deduct balance via RPC
    await supabaseAdmin.rpc("deduct_balance", {
      user_id: userId,
      words_to_deduct: wordCount,
    });

   // ✅ 4️⃣ Save history safely
   const { error: historyErr } = await supabaseAdmin
   .from("history")
   .insert({
     user_id: userId,
     input_text: content,
     output_text: output,
     word_count: wordCount,
   })
   .select()
   .single();

 if (historyErr) console.error("❌ Failed to insert history:", historyErr.message);

 return new NextResponse(output, {
   status: 200,
   headers: { "Content-Type": "text/plain; charset=utf-8" },
 });
} catch (err) {
 console.error("❌ Gemini error:", err);
 return new NextResponse("Internal Server Error", { status: 500 });
}
}
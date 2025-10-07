export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { content } = await req.json();
    if (!content || typeof content !== "string")
      return new NextResponse("No content provided", { status: 400 });

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    const { data: balanceRow, error: balanceErr } = await supabaseAdmin
      .from("user_balance")
      .select("balance_words")
      .eq("user_id", userId)
      .single();

    if (balanceErr || !balanceRow)
      return new NextResponse("Balance not found", { status: 404 });

    if (balanceRow.balance_words < wordCount)
      return new NextResponse("Insufficient balance", { status: 402 });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY)
      return new NextResponse("Server misconfigured", { status: 500 });

    const model = "gemini-2.5-pro";

    const prompt = `
    You are the world's best human writer. Make sure to strictly follow ALL the guidelines mentioned in this prompt as each one of them is crucial.

    Humanize the following content. Maintain the original tone while rewriting it exactly to an IELTS band 5.5 level while keeping vocabulary and scientific terms to an IELTS band 8 level.
    
    Humanize ANY and ALL sentence structures and writing style that AI typically uses such as perplexity (this is crucial). Use a variety of long and short sentences to increase burstiness and less mechanistic flow (this is also crucial). Avoid common, overused phrases that AI often relies on. Do NOT change the POV of the text.
    
    Use simple connectors (and, but, so, because). Never use em dashes. Keep the formatting exactly how it is in the original text. The text MUST NOT lack complexity. The transitional phrases and connectors MUST be creative, and they must NOT be formulaic. The output MUST embody the creativity and richness of human writing.
    
    Text:
${content}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 2.0,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 2048,
          },
          safetySettings: [],
        }),
      }
    );

    // ✅ SAFER PARSE (prevents "Unexpected end of JSON input")
    const textBody = await response.text();
    if (!textBody) {
      console.error("⚠️ Gemini API returned empty body");
      return new NextResponse("Gemini returned empty response", { status: 502 });
    }

    let data;
    try {
      data = JSON.parse(textBody);
    } catch (e) {
      console.error("⚠️ Failed to parse Gemini response:", e, textBody);
      return new NextResponse("Gemini invalid JSON response", { status: 502 });
    }

    if (!data?.candidates?.length) {
      console.error("⚠️ Gemini response has no candidates:", data);
      return new NextResponse("Gemini produced no output", { status: 502 });
    }

    const output =
      data.candidates[0]?.content?.parts?.[0]?.text?.trim() ||
      "No output received.";

    // ✅ Deduct balance
    await supabaseAdmin.rpc("deduct_balance", {
      user_id: userId,
      words_to_deduct: wordCount,
    });

    // ✅ Save history
    await supabaseAdmin.from("history").insert({
      user_id: userId,
      input_text: content,
      output_text: output,
      word_count: wordCount,
    });

    // ✅ Return plain text (frontend reads this with res.text())
    return new NextResponse(output, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("❌ Gemini 2.5 Pro error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

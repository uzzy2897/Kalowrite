export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    // ✅ 1. Clerk Auth
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // ✅ 2. Parse input
    const { content } = await req.json();
    if (!content || typeof content !== "string") {
      return new NextResponse("No content provided", { status: 400 });
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    // ✅ 3. Check current balance
    const { data: balanceRow, error: balanceErr } = await supabaseAdmin
      .from("user_balance")
      .select("balance_words")
      .eq("user_id", userId)
      .single();

    if (balanceErr || !balanceRow)
      return new NextResponse("Balance not found", { status: 404 });

    if (balanceRow.balance_words < wordCount)
      return new NextResponse("Insufficient balance", { status: 402 });

    // ✅ 4. Call Gemini API
    const model = "models/gemini-2.5-flash-lite";
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY)
      return new NextResponse("Server misconfigured", { status: 500 });

    const prompt = `
You are the world's best human writer. Humanize the following content...
(no em dashes, IELTS 5.5 tone, 8.0 vocabulary)

Text:
${content}
`;

    // --- IMPROVED CONFIGURATION START ---
    // Note: The maximum supported temperature for the Gemini API is typically 1.0.
    // Setting to 1.0 for compliance, but noting the request for 2.0.
    // 'Thinking budget' (32768) is interpreted as maxOutputTokens.
    const generationConfig = {
        temperature: 1.0, // Requested 2.0, set to max 1.0
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 32768, // Interpreted 'thinking budget' as maxOutputTokens
    };
    // --- IMPROVED CONFIGURATION END ---

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: generationConfig,
        }),
      }
    );

    const data = await response.json();
    const output =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "No output received.";

    // ✅ 5. Deduct used words
    await supabaseAdmin
      .from("user_balance")
      .update({
        balance_words: balanceRow.balance_words - wordCount,
      })
      .eq("user_id", userId);

    // ✅ 6. Save history (optional)
    await supabaseAdmin.from("history").insert({
      user_id: userId,
      input_text: content,
      output_text: output,
      word_count: wordCount,
    });

    // ✅ 7. Return output
    return new NextResponse(output, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("❌ Gemini error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    /* -------------------------------------------------------------------------- */
    /* 🧾 1️⃣ Clerk Authentication                                               */
    /* -------------------------------------------------------------------------- */
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    /* -------------------------------------------------------------------------- */
    /* 📥 2️⃣ Parse Input                                                        */
    /* -------------------------------------------------------------------------- */
    const { content } = await req.json();
    if (!content || typeof content !== "string") {
      return new NextResponse("No content provided", { status: 400 });
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    /* -------------------------------------------------------------------------- */
    /* 💳 3️⃣ Check User Balance in Supabase                                    */
    /* -------------------------------------------------------------------------- */
    const { data: balanceRow, error: balanceErr } = await supabaseAdmin
      .from("user_balance")
      .select("balance_words")
      .eq("user_id", userId)
      .single();

    if (balanceErr || !balanceRow)
      return new NextResponse("Balance not found", { status: 404 });

    if (balanceRow.balance_words < wordCount)
      return new NextResponse("Insufficient balance", { status: 402 });

    /* -------------------------------------------------------------------------- */
    /* 🤖 4️⃣ Call Gemini API                                                   */
    /* -------------------------------------------------------------------------- */
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY)
      return new NextResponse("Server misconfigured", { status: 500 });

    // Use the stable, creative-capable model
    const model = "models/gemini-2.5-pro";

    const prompt = `
You are the world's best human writer. 
Humanize the following text to sound natural, with IELTS band 5.5 structure but vocabulary at band 8 level.
Use varied sentence lengths and simple connectors (and, but, so, because). 
Avoid overused AI-style transitions and never use em dashes.

Text:
${content}
`;

    // ✅ FULL 2.0 TEMPERATURE SUPPORT
    const generationConfig = {
      temperature: 2.0, // ✅ Now supported!
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 32768, // generous context window
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return new NextResponse("Gemini API Error", { status: 502 });
    }

    const output =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "No output received.";

    /* -------------------------------------------------------------------------- */
    /* 💰 5️⃣ Deduct Used Words                                                */
    /* -------------------------------------------------------------------------- */
    await supabaseAdmin
      .from("user_balance")
      .update({
        balance_words: balanceRow.balance_words - wordCount,
      })
      .eq("user_id", userId);

    /* -------------------------------------------------------------------------- */
    /* 🕓 6️⃣ Log History (Optional)                                           */
    /* -------------------------------------------------------------------------- */
    await supabaseAdmin.from("history").insert({
      user_id: userId,
      input_text: content,
      output_text: output,
      word_count: wordCount,
    });

    /* -------------------------------------------------------------------------- */
    /* 📤 7️⃣ Return Output                                                    */
    /* -------------------------------------------------------------------------- */
    return new NextResponse(output, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("❌ Gemini route error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

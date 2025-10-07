export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    /* -------------------------------------------------------------------------- */
    /* 1️⃣ Clerk Authentication                                                  */
    /* -------------------------------------------------------------------------- */
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* -------------------------------------------------------------------------- */
    /* 2️⃣ Parse Input                                                          */
    /* -------------------------------------------------------------------------- */
    const { content } = await req.json();
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    /* -------------------------------------------------------------------------- */
    /* 3️⃣ Check User Balance in Supabase                                        */
    /* -------------------------------------------------------------------------- */
    const { data: balanceRow, error: balanceErr } = await supabaseAdmin
      .from("user_balance")
      .select("balance_words")
      .eq("user_id", userId)
      .single();

    if (balanceErr || !balanceRow) {
      return NextResponse.json({ error: "Balance not found" }, { status: 404 });
    }

    if (balanceRow.balance_words < wordCount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 402 });
    }

    /* -------------------------------------------------------------------------- */
    /* 4️⃣ Call Gemini API                                                      */
    /* -------------------------------------------------------------------------- */
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const model = "models/gemini-2.5-pro"; // ✅ Stable model name

    const prompt = `
You are the world's best human writer.
Humanize the following text to sound natural, with IELTS band 5.5 structure but vocabulary at band 8 level.
Use varied sentence lengths and simple connectors (and, but, so, because).
Avoid overused AI-style transitions and never use em dashes.

Text:
${content}
`;

    // ✅ Stay within maxTemperature=2
    const generationConfig = {
      temperature: 1.5,
      topP: 0.9,
      topK: 64,
      maxOutputTokens: 32768,
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
        }),
      }
    );

    /* -------------------------------------------------------------------------- */
    /* 5️⃣ Safely Parse Gemini Response                                          */
    /* -------------------------------------------------------------------------- */
    const rawText = await response.text();
    let data: any = null;

    try {
      data = JSON.parse(rawText);
    } catch (err) {
      console.error("⚠️ Gemini returned non-JSON output:", rawText.slice(0, 300));
      return NextResponse.json(
        {
          error: "Gemini API returned a non-JSON response",
          detail: rawText.slice(0, 500),
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      const msg =
        data?.error?.message ||
        rawText.slice(0, 300) ||
        "Unknown Gemini API error";
      console.error("🚨 Gemini API error:", msg);
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const output =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "No output received. Try adjusting the input.";

    /* -------------------------------------------------------------------------- */
    /* 6️⃣ Deduct Used Words                                                    */
    /* -------------------------------------------------------------------------- */
    await supabaseAdmin
      .from("user_balance")
      .update({
        balance_words: balanceRow.balance_words - wordCount,
      })
      .eq("user_id", userId);

    /* -------------------------------------------------------------------------- */
    /* 7️⃣ Log History                                                          */
    /* -------------------------------------------------------------------------- */
    await supabaseAdmin.from("history").insert({
      user_id: userId,
      input_text: content,
      output_text: output,
      word_count: wordCount,
    });

    /* -------------------------------------------------------------------------- */
    /* 8️⃣ Return Output                                                        */
    /* -------------------------------------------------------------------------- */
    return new NextResponse(output, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("❌ Gemini route error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", detail: err.message || err },
      { status: 500 }
    );
  }
}

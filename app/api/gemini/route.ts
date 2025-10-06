export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { content } = await req.json();
    if (!content || typeof content !== "string") {
      return new NextResponse("No content provided", { status: 400 });
    }

    const model = "models/gemini-2.5-flash-lite";
    const GEMINI_API_KEY = "AIzaSyA33UissxYCdMNAJPdYNFw4DFTlMMmSrtM";

    const prompt = `
You are the world's best human writer.
Humanize the following text: keep meaning and tone, but write it naturally.
Use IELTS 5.5 sentence simplicity with IELTS 8 vocabulary for technical words.
Avoid robotic phrases and em dashes. Return only the rewritten text.

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

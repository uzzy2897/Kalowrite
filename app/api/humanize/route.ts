// app/api/humanize/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // server-side only
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text: string | undefined = body?.text;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Updated rich humanizer prompt
    const prompt = `
Humanize the following content and simplify it to academic level writing. Keep it professional while simplifying it so all medium English level people can easily understand. Humanize ANY and ALL sentence structures and writing style that AI typically uses. Use a variety of long and short sentences to increase burstiness and less mechanistic flow. Avoid common, overused phrases that AI often relies on (e.g., "It is important to note," "Studies have shown," "In today's fast-paced world"). Try to keep the basic meaning, but break up any overly polished phrasing.

Follow these rules:
- Sometimes circle back or leave thoughts slightly unfinished.
- Use everyday words at a high school level.
- Replace complex/academic terms and phrases with simple alternatives.
- Forbidden words/phrases: delve, embark, enlightening, esteemed, shed light, craft, realm, game-changer, unlock, discover, revolutionize, disruptive, utilize, dive deep, tapestry, illuminate, unveil, pivotal, intricate, elucidate, hence, furthermore, harness, groundbreaking, cutting-edge, remarkable, testament, landscape, navigate, ever-evolving, profound, arduous, in conclusion, in summary, moreover, it is important to note, studies have shown, in today’s fast-paced world.
- Use simple connectors (and, but, so, because).
- Never use em dashes.
- Include slight redundancies, natural slips, and relatable specifics.
- Keep the formatting exactly how it is in the original text.
- The text should not lack complexity.
- The transitional phrases and connectors must be creative, and they must not be formulaic.
- The output must embody the creativity and richness of human writing.
- IMPORTANT: Review your response and ensure no em dashes '—' are included in the final output!

Here's the content: ${text}

Model: O3
Reasoning Effort: High
Temperature: 0.7
Response Length: Standard
`;

    const resp = await client.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
      max_output_tokens: 800,
      temperature: 0.7,
    });

    const humanized =
      (resp as any).output_text ??
      (Array.isArray((resp as any).output)
        ? (resp as any).output
            .map((o: any) =>
              Array.isArray(o.content)
                ? o.content.map((c: any) => c.text ?? "").join("")
                : ""
            )
            .join("\n")
        : "");

    return NextResponse.json({ humanized });
  } catch (err: any) {
    console.error("Humanizer API error:", err);
    const message = err?.message ?? "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

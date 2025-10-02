// lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Pick a valid model
// "gemini-1.5-pro" is stable and works with generateContent
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

export async function humanizeWithGemini(prompt: string) {
  const result = await model.generateContent(prompt);
  const response = result.response;

  let text = response.text();

  try {
    const parsed = JSON.parse(text);
    if (parsed.content) {
      return parsed.content;
    }
  } catch {
    // Not JSON, return raw
  }

  return text;
}

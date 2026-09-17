import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Part } from "@google/generative-ai";
import { requireLiveSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const REPORT_PROMPT = `You are MediSync Clinical Evidence Report Generator.

Analyze the supplied medical document/image and create a professional Clinical Evidence Report.

STRICT RULES:
- Use ONLY information visible in the supplied document or extracted text.
- Never invent patient data, values, diagnoses, medications, or recommendations.
- Preserve names, dates, IDs, values, units, reference ranges, and stated findings exactly.
- If information is unavailable, write "Not provided".
- This is AI-assisted extraction and organization, NOT diagnosis or treatment.
- Do not prescribe, recommend medication changes, or make autonomous clinical decisions.
- Clearly state that human clinical review is required.

Return ONLY a compact HTML BODY FRAGMENT. Do not return markdown fences, <!DOCTYPE>, <html>, <head>, <style>, or JavaScript.

Use these sections:
1. MediSync Clinical Evidence Report
2. Report Information
3. Patient Information
4. Documented Findings
5. Clinical Summary
6. Key Observations
7. Human Review Required
8. Clinical Review / Signature
9. MediSync Disclaimer

For laboratory reports, include ALL documented tests in a table with test name, result, unit, reference range, and status.
For other medical documents/images, organize the visible/documented evidence into concise sections without inventing missing details.
Keep the HTML complete and reasonably short.`;

function stripCodeFence(value: string) {
  return value.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

async function analyzePdf(file: File, apiKey: string) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const response = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: { type: "document_url", document_url: `data:application/pdf;base64,${bytes.toString("base64")}` },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mistral OCR failed (${response.status}): ${text.slice(0, 500)}`);
  }
  const data = await response.json();
  const pages = Array.isArray(data?.pages) ? data.pages : [];
  const text = pages.map((page: { markdown?: string; text?: string }) => page.markdown ?? page.text ?? "").join("\n\n").trim();
  if (!text) throw new Error("Mistral OCR returned no extracted text.");
  return text;
}

async function analyzeWithGemini(file: File, apiKey: string, extractedText?: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const parts: Part[] = [{ text: REPORT_PROMPT }];
  if (extractedText) {
    parts.push({ text: `\nOCR EXTRACTED TEXT:\n${extractedText}` });
  } else {
    const bytes = Buffer.from(await file.arrayBuffer());
    parts.push({ inlineData: { mimeType: file.type, data: bytes.toString("base64") } });
  }
  const result = await model.generateContent({ contents: [{ role: "user", parts }] });
  const html = stripCodeFence(result.response.text());
  if (!html) throw new Error("Gemini returned an empty report.");
  return html;
}

export async function POST(req: NextRequest) {
  const auth = await requireLiveSession(req, ["patient"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please select a PDF or image report." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Supported formats are PDF, PNG, JPEG, and WEBP." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be between 1 byte and 15 MB." }, { status: 400 });
    }

    const mistralKey = process.env.MISTRAL_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });

    let extractedText: string | undefined;
    let sourceType: "pdf" | "image";
    if (file.type === "application/pdf") {
      sourceType = "pdf";
      if (!mistralKey) return NextResponse.json({ error: "MISTRAL_API_KEY is not configured." }, { status: 500 });
      extractedText = await analyzePdf(file, mistralKey);
    } else {
      sourceType = "image";
    }

    const html = await analyzeWithGemini(file, geminiKey, extractedText);
    return NextResponse.json({ success: true, sourceType, filename: file.name, mimeType: file.type, extractedText: extractedText ?? null, reportHtml: html, humanReviewRequired: true });
  } catch (error) {
    console.error("MediSync direct document analysis error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Document analysis failed." }, { status: 500 });
  }
}

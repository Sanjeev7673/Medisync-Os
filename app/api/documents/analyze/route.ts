import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { Part } from "@google/generative-ai";
import { requireLiveSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

const REPORT_PROMPT = `You are MediSync Clinical Evidence Data Extractor.

Extract ONLY medical evidence explicitly present in the supplied document or OCR text.

CRITICAL SOURCE-GROUNDING RULES:
- The source document is authoritative. Never invent, guess, normalize, or fill missing patient data or clinical values.
- Extract patient_name, patient_id, date_of_birth, sex, report_date, referring_unit, and specimen ONLY when explicitly visible.
- Extract EVERY laboratory test or measurable finding visible in the source, including result, unit, reference range, and status when available.
- Preserve numeric values, decimal places, units, dates, IDs, names, and reference ranges exactly as written.
- If a value is not present in the source, use "Not provided". Never substitute a plausible value.
- Do not infer diagnoses, treatment, medication changes, risk scores, or clinical conclusions.
- possible_associations, symptom_associations, red_flags, and questions_for_clinician must be empty unless explicitly stated in the source.
- If OCR contains table placeholders such as [tbl-0.md], use the expanded table content supplied in the OCR source; never treat the placeholder itself as evidence.
- confidence reflects extraction quality only, not clinical certainty.
- requires_human_review must always be true.

Return JSON only. No markdown, no code fences, no HTML.`;

const ANALYSIS_SCHEMA: any = {
  type: SchemaType.OBJECT,
  properties: {
    document_type: { type: SchemaType.STRING },
    report_date: { type: SchemaType.STRING },
    patient_name: { type: SchemaType.STRING },
    patient_id: { type: SchemaType.STRING },
    date_of_birth: { type: SchemaType.STRING },
    sex: { type: SchemaType.STRING },
    referring_unit: { type: SchemaType.STRING },
    specimen: { type: SchemaType.STRING },
    summary: { type: SchemaType.STRING },
    findings: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          item: { type: SchemaType.STRING },
          value: { type: SchemaType.STRING },
          unit: { type: SchemaType.STRING },
          reference_range: { type: SchemaType.STRING },
          status: { type: SchemaType.STRING, enum: ["normal", "abnormal", "unclear", "not_reported"] },
          evidence: { type: SchemaType.STRING },
        },
        required: ["item", "value", "unit", "reference_range", "status", "evidence"],
      },
    },
    key_observations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    supportive_findings: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    limitations_and_concerns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    possible_associations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    symptom_associations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    red_flags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    questions_for_clinician: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    priority: { type: SchemaType.STRING },
    specialty_hint: { type: SchemaType.STRING },
    workflow: { type: SchemaType.STRING },
    confidence: { type: SchemaType.NUMBER },
    requires_human_review: { type: SchemaType.BOOLEAN },
  },
  required: [
    "document_type", "report_date", "patient_name", "patient_id", "date_of_birth", "sex",
    "referring_unit", "specimen", "summary", "findings", "key_observations", "supportive_findings",
    "limitations_and_concerns", "possible_associations", "symptom_associations", "red_flags",
    "questions_for_clinician", "priority", "specialty_hint", "workflow", "confidence", "requires_human_review",
  ],
};

function buildOcrText(data: { pages?: unknown[] }) {
  const pages = Array.isArray(data?.pages) ? data.pages : [];

  return pages.map((pageUnknown) => {
    const page = pageUnknown as {
      markdown?: string;
      text?: string;
      tables?: Array<{ id?: string; content?: string; markdown?: string; html?: string }>;
    };

    let markdown = page.markdown ?? page.text ?? "";
    const tables = Array.isArray(page.tables) ? page.tables : [];

    // Mistral leaves table placeholders in page.markdown while the actual
    // table payload is returned separately in page.tables. Expand both.
    for (const table of tables) {
      const id = table.id?.trim();
      const content = table.content ?? table.markdown ?? table.html ?? "";
      if (!content) continue;
      if (id) {
        const escapedId = id.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
        markdown = markdown.replace(new RegExp(`\\[${escapedId}\\]\\([^)]*\\)`, "g"), content);
      }
    }

    const expandedTables = tables
      .map((table) => table.content ?? table.markdown ?? table.html ?? "")
      .filter(Boolean);

    if (expandedTables.length) markdown += `\n\n${expandedTables.join("\n\n")}`;
    return markdown.trim();
  }).filter(Boolean).join("\n\n").trim();
}

async function analyzePdf(file: File, apiKey: string) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const response = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: { type: "document_url", document_url: `data:application/pdf;base64,${bytes.toString("base64")}` },
      table_format: "markdown",
      include_blocks: false,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mistral OCR failed (${response.status}): ${text.slice(0, 500)}`);
  }

  const data = await response.json();
  const text = buildOcrText(data);
  if (!text) throw new Error("Mistral OCR returned no extracted text.");
  return text;
}

async function analyzeWithGemini(file: File, apiKey: string, extractedText?: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    generationConfig: { responseMimeType: "application/json", responseSchema: ANALYSIS_SCHEMA },
  });

  const parts: Part[] = [{ text: REPORT_PROMPT }];
  if (extractedText) {
    parts.push({ text: `\nCOMPLETE OCR SOURCE, INCLUDING EXPANDED TABLES:\n${extractedText}` });
  } else {
    const bytes = Buffer.from(await file.arrayBuffer());
    parts.push({ inlineData: { mimeType: file.type, data: bytes.toString("base64") } });
  }

  const result = await model.generateContent({ contents: [{ role: "user", parts }] });
  const raw = result.response.text().trim();
  if (!raw) throw new Error("Gemini returned an empty extraction.");

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`Gemini returned invalid structured data: ${raw.slice(0, 500)}`);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireLiveSession(req, ["patient"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Please select a PDF or image report." }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Supported formats are PDF, PNG, JPEG, and WEBP." }, { status: 400 });
    if (file.size <= 0 || file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "File must be between 1 byte and 15 MB." }, { status: 400 });

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

    const analysis = await analyzeWithGemini(file, geminiKey, extractedText);
    return NextResponse.json({
      success: true,
      sourceType,
      filename: file.name,
      mimeType: file.type,
      extractedText: extractedText ?? null,
      analysis,
      humanReviewRequired: true,
    });
  } catch (error) {
    console.error("MediSync direct document analysis error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Document analysis failed.",
    }, { status: 500 });
  }
}

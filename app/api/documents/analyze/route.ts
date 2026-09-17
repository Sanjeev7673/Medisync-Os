import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { Part } from "@google/generative-ai";
import { requireLiveSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

const REPORT_PROMPT = `You are MediSync Clinical Evidence Data Extractor.

Extract ONLY medical evidence explicitly present in the supplied document, image, or OCR text.

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

Return one JSON object with exactly these top-level fields:
document_type, report_date, patient_name, patient_id, date_of_birth, sex, referring_unit, specimen, summary, findings, key_observations, supportive_findings, limitations_and_concerns, possible_associations, symptom_associations, red_flags, questions_for_clinician, priority, specialty_hint, workflow, confidence, requires_human_review.

Each findings item must contain: item, value, unit, reference_range, status, evidence.
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

const ANALYSIS_DEFAULTS: Record<string, unknown> = {
  document_type: "Not provided",
  report_date: "Not provided",
  patient_name: "Not provided",
  patient_id: "Not provided",
  date_of_birth: "Not provided",
  sex: "Not provided",
  referring_unit: "Not provided",
  specimen: "Not provided",
  summary: "Not provided",
  findings: [],
  key_observations: [],
  supportive_findings: [],
  limitations_and_concerns: [],
  possible_associations: [],
  symptom_associations: [],
  red_flags: [],
  questions_for_clinician: [],
  priority: "Not provided",
  specialty_hint: "Not provided",
  workflow: "Human review required",
  confidence: 0,
  requires_human_review: true,
};

function normalizeAnalysis(input: Record<string, unknown>) {
  const output: Record<string, unknown> = { ...ANALYSIS_DEFAULTS, ...input };
  const arrayFields = [
    "findings", "key_observations", "supportive_findings", "limitations_and_concerns",
    "possible_associations", "symptom_associations", "red_flags", "questions_for_clinician",
  ];

  for (const field of arrayFields) {
    if (!Array.isArray(output[field])) output[field] = [];
  }

  output.requires_human_review = true;
  if (typeof output.confidence !== "number" || !Number.isFinite(output.confidence)) output.confidence = 0;
  return output;
}

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
    return normalizeAnalysis(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    throw new Error(`Gemini returned invalid structured data: ${raw.slice(0, 500)}`);
  }
}

function isTransientGeminiError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /\b(429|500|502|503|504)\b|high demand|temporarily unavailable|service unavailable/i.test(message);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function analyzeWithGeminiWithRetry(file: File, apiKey: string, extractedText?: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await analyzeWithGemini(file, apiKey, extractedText);
    } catch (error) {
      lastError = error;
      if (!isTransientGeminiError(error) || attempt === 1) break;
      await sleep(900);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini analysis failed.");
}

async function analyzeWithGroq(file: File, apiKey: string, extractedText?: string) {
  const model = process.env.GROQ_MODEL || (extractedText ? "openai/gpt-oss-120b" : "qwen/qwen3.8-27b");
  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: extractedText
        ? `${REPORT_PROMPT}\n\nCOMPLETE OCR SOURCE, INCLUDING EXPANDED TABLES:\n${extractedText}`
        : REPORT_PROMPT,
    },
  ];

  if (!extractedText) {
    const bytes = Buffer.from(await file.arrayBuffer());
    content.push({
      type: "image_url",
      image_url: { url: `data:${file.type};base64,${bytes.toString("base64")}` },
    });
  }

  // Groq uses different reasoning_effort values for GPT-OSS and Qwen.
  // GPT-OSS requires low/medium/high; Qwen 3.6/3.8 accepts none/default.
  const reasoningEffort = model.startsWith("openai/gpt-oss-") ? "low" : "none";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      response_format: { type: "json_object" },
      temperature: 0.1,
      reasoning_effort: reasoningEffort,
      max_completion_tokens: 4096,
      stream: false,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq fallback failed (${response.status}, model=${model}): ${text.slice(0, 500)}`);
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Groq returned an empty extraction.");

  try {
    return normalizeAnalysis(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    throw new Error(`Groq returned invalid structured data: ${String(raw).slice(0, 500)}`);
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
    const groqKey = process.env.GROQ_API_KEY;
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

    let analysis: Record<string, unknown>;
    try {
      analysis = await analyzeWithGeminiWithRetry(file, geminiKey, extractedText);
    } catch (geminiError) {
      console.warn("Gemini primary analysis failed:", geminiError);

      if (!groqKey || !isTransientGeminiError(geminiError)) {
        throw geminiError;
      }

      console.warn("Gemini transient failure detected. Switching to Groq fallback.");
      analysis = await analyzeWithGroq(file, groqKey, extractedText);
    }

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

export type DocumentAnalysis = {
  document_type: string;
  report_date: string | null;
  summary: string;
  findings: Array<{
    item: string;
    value: string | null;
    reference_range: string | null;
    status: "normal" | "abnormal" | "unclear" | "not_reported";
    evidence: string;
  }>;
  key_observations: string[];
  supportive_findings: string[];
  limitations_and_concerns: string[];
  possible_associations: string[];
  symptom_associations: string[];
  red_flags: string[];
  questions_for_clinician: string[];
  priority: "routine" | "review_soon" | "urgent_review" | "unclear";
  specialty_hint: string | null;
  workflow: "DOCUMENT" | "SPECIALIST_REVIEW" | "APPOINTMENT" | "GENERAL";
  confidence: number;
  requires_human_review: true;
  limitations: string[];
};

const responseSchema = {
  type: "OBJECT",
  properties: {
    document_type: { type: "STRING" },
    report_date: { type: "STRING", description: "Report date in ISO-like text when explicitly present; empty string when absent." },
    summary: { type: "STRING" },
    findings: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          item: { type: "STRING" },
          value: { type: "STRING", description: "Reported value; empty string when not reported." },
          reference_range: { type: "STRING", description: "Reported reference range; empty string when not reported." },
          status: { type: "STRING", enum: ["normal", "abnormal", "unclear", "not_reported"] },
          evidence: { type: "STRING" },
        },
        required: ["item", "value", "reference_range", "status", "evidence"],
      },
    },
    key_observations: { type: "ARRAY", items: { type: "STRING" } },
    supportive_findings: { type: "ARRAY", items: { type: "STRING" } },
    limitations_and_concerns: { type: "ARRAY", items: { type: "STRING" } },
    possible_associations: { type: "ARRAY", items: { type: "STRING" } },
    symptom_associations: { type: "ARRAY", items: { type: "STRING" } },
    red_flags: { type: "ARRAY", items: { type: "STRING" } },
    questions_for_clinician: { type: "ARRAY", items: { type: "STRING" } },
    priority: { type: "STRING", enum: ["routine", "review_soon", "urgent_review", "unclear"] },
    specialty_hint: { type: "STRING", description: "Routing specialty hint; empty string when none is supported by the document." },
    workflow: { type: "STRING", enum: ["DOCUMENT", "SPECIALIST_REVIEW", "APPOINTMENT", "GENERAL"] },
    confidence: { type: "NUMBER", description: "Confidence from 0 to 1." },
    requires_human_review: { type: "BOOLEAN" },
    limitations: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["document_type", "report_date", "summary", "findings", "key_observations", "supportive_findings", "limitations_and_concerns", "possible_associations", "symptom_associations", "red_flags", "questions_for_clinician", "priority", "specialty_hint", "workflow", "confidence", "requires_human_review", "limitations"],
};

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

const instructions = [
  "You are MediSync Document Intelligence, a healthcare document understanding assistant.",
  "Analyze only evidence explicitly present in the supplied document. Preserve uncertainty and never invent facts.",
  "Extract report facts, measurements, reference ranges, dates, observations and source wording accurately.",
  "supportive_findings may describe useful or reassuring findings that are explicitly documented.",
  "limitations_and_concerns should describe missing context, unclear text, limitations of the document, or documented concerns.",
  "possible_associations may explain medically plausible associations between documented findings and symptoms, but must use uncertainty language such as may, can, or could and must never state a diagnosis.",
  "symptom_associations may connect reported symptoms to documented findings only when the relationship is reasonably supported; never claim causation.",
  "red_flags must only include urgent or critical findings explicitly present in the document or safety-relevant symptoms explicitly supplied in the document. Do not invent emergency findings.",
  "questions_for_clinician should be neutral questions a patient could ask an authorized clinician about the documented evidence.",
  "Never diagnose, prescribe, recommend a treatment, change medication, or make an autonomous clinical decision.",
  "specialty_hint is only a routing hint based on document content.",
  "urgent_review is allowed only when the source contains an explicit critical or urgent flag or clearly critical result; otherwise use review_soon, routine, or unclear.",
  "Always require human specialist or clinician review before clinical interpretation or action.",
  "Return only the requested structured JSON object.",
].join(" ");

export async function analyzeDocument(input: { bytes: Buffer; contentType: string; filename: string }): Promise<DocumentAnalysis> {
  const apiKey = required("GEMINI_API_KEY");
  const model = process.env.GEMINI_DOCUMENT_MODEL || "gemini-3.6-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instructions }] },
      contents: [{
        role: "user",
        parts: [
          { text: `Analyze this healthcare document for MediSync record standardization and care coordination. Filename: ${input.filename}` },
          { inlineData: { mimeType: input.contentType, data: input.bytes.toString("base64") } },
        ],
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1,
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(60000),
  });

  const raw = await response.text();
  if (!response.ok) {
    let detail = raw;
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } };
      detail = parsed.error?.message || raw;
    } catch {
      // Keep the raw provider response when it is not JSON.
    }
    throw new Error(`Gemini document analysis failed (${response.status}): ${detail.slice(0, 1000)}`);
  }

  let payload: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    throw new Error("Gemini document analysis returned invalid JSON");
  }

  const outputText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!outputText) throw new Error("Gemini document analysis returned no structured output");

  let analysis: Omit<DocumentAnalysis, "requires_human_review"> & { requires_human_review?: boolean };
  try {
    analysis = JSON.parse(outputText) as typeof analysis;
  } catch {
    throw new Error("Gemini document analysis returned malformed structured output");
  }

  return {
    ...analysis,
    report_date: analysis.report_date || null,
    specialty_hint: analysis.specialty_hint || null,
    requires_human_review: true,
    confidence: Math.max(0, Math.min(1, Number(analysis.confidence) || 0)),
  } as DocumentAnalysis;
}

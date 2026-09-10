import OpenAI from "openai";

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
  priority: "routine" | "review_soon" | "urgent_review" | "unclear";
  specialty_hint: string | null;
  workflow: "DOCUMENT" | "SPECIALIST_REVIEW" | "APPOINTMENT" | "GENERAL";
  confidence: number;
  requires_human_review: true;
  limitations: string[];
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    document_type: { type: "string" },
    report_date: { type: ["string", "null"] },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          item: { type: "string" },
          value: { type: ["string", "null"] },
          reference_range: { type: ["string", "null"] },
          status: { type: "string", enum: ["normal", "abnormal", "unclear", "not_reported"] },
          evidence: { type: "string" },
        },
        required: ["item", "value", "reference_range", "status", "evidence"],
      },
    },
    key_observations: { type: "array", items: { type: "string" } },
    priority: { type: "string", enum: ["routine", "review_soon", "urgent_review", "unclear"] },
    specialty_hint: { type: ["string", "null"] },
    workflow: { type: "string", enum: ["DOCUMENT", "SPECIALIST_REVIEW", "APPOINTMENT", "GENERAL"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    requires_human_review: { type: "boolean", enum: [true] },
    limitations: { type: "array", items: { type: "string" } },
  },
  required: ["document_type", "report_date", "summary", "findings", "key_observations", "priority", "specialty_hint", "workflow", "confidence", "requires_human_review", "limitations"],
} as const;

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export async function analyzeDocument(input: { bytes: Buffer; contentType: string; filename: string }): Promise<DocumentAnalysis> {
  const client = new OpenAI({ apiKey: required("OPENAI_API_KEY") });
  const model = process.env.OPENAI_DOCUMENT_MODEL || "gpt-5.6-luna";
  const dataUrl = `data:${input.contentType};base64,${input.bytes.toString("base64")}`;

  const response = await client.responses.create({
    model,
    store: false,
    input: [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text: [
              "You are MediSync Document Intelligence, an administrative healthcare document analysis assistant.",
              "Analyze only what is explicitly present in the supplied patient report.",
              "Extract report facts, values, reference ranges, dates, and observations accurately.",
              "Never diagnose, prescribe, recommend treatment, or claim that an abnormal value proves a disease.",
              "If the document is unclear or information is missing, say so explicitly.",
              "Always require human specialist review before any clinical interpretation or action.",
              "Use specialty_hint only as a routing hint based on the document content, not as a diagnosis.",
              "Use urgent_review only when the report itself contains an explicitly urgent/critical flag or clearly documented critical result; otherwise use review_soon or routine.",
              "Return only the requested structured object.",
            ].join(" "),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Analyze this healthcare document for administrative coordination. Filename: ${input.filename}`,
          },
          {
            type: "input_file",
            filename: input.filename,
            file_data: dataUrl,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "medisync_document_analysis",
        strict: true,
        schema,
      },
    },
  });

  if (!response.output_text) throw new Error("Document AI returned no analysis");
  return JSON.parse(response.output_text) as DocumentAnalysis;
}

// ---------------------------------------------------------------------------
// STATUS: 🟢 DynamoDB-backed persistence.
// ---------------------------------------------------------------------------

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { AuditEvent, PatientRequest } from "./types";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME ?? "MediSyncRequests";
const REGION = process.env.AWS_REGION ?? "ap-south-1";

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

type StoredRequest = PatientRequest & {
  audit_events?: AuditEvent[];
};

function stripInternalFields(item: StoredRequest | undefined): PatientRequest | undefined {
  if (!item) return undefined;
  const { audit_events: _auditEvents, ...request } = item;
  return request;
}

async function getStoredRequest(requestId: string): Promise<StoredRequest | undefined> {
  const response = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { request_id: requestId },
      ConsistentRead: true,
    }),
  );

  return response.Item as StoredRequest | undefined;
}

async function ensureSeeded(): Promise<void> {
  const existing = await getStoredRequest("REQ-1001");
  if (existing) return;

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const seeded: StoredRequest = {
    request_id: "REQ-1001",
    patient_id: "P1001",
    request:
      "I have a heart-related health concern and need to consult a cardiologist. Please help me find the appropriate specialist.",
    request_source: "patient_portal",
    document_uploaded: false,
    request_type: "SPECIALIST_REVIEW",
    specialty: "Cardiology",
    specialist_review_required: true,
    document_required: false,
    classification_reason:
      "The patient is requesting assistance finding the appropriate specialist.",
    specialist_review: {
      status: "APPROVED",
      reviewed_by: "DR-CARD-01",
      reviewed_at: hourAgo.toISOString(),
      notes: null,
    },
    hospital_matching: {
      status: "COMPLETED",
      recommendations: [
        {
          hospital_id: "H001",
          hospital_name: "Hospital A",
          match_score: 0.94,
          matched_capabilities: ["Cardiology", "Cardiac Imaging", "ICU"],
          missing_capabilities: [],
          reason: "Hospital has the required specialty and capabilities.",
        },
      ],
    },
    referral: {
      status: "CREATED",
      referral_id: "REF-2001",
      hospital_id: "H001",
    },
    appointment: {
      status: "PENDING",
      scheduled_at: null,
    },
    workflow_status: "APPOINTMENT_PENDING",
    created_at: hourAgo.toISOString(),
    updated_at: now.toISOString(),
    audit_events: [],
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: seeded,
        ConditionExpression: "attribute_not_exists(request_id)",
      }),
    );
  } catch (error) {
    // Another request may have seeded the record concurrently.
    if ((error as { name?: string }).name !== "ConditionalCheckFailedException") {
      throw error;
    }
  }
}

export async function listRequestsForPatient(patientId: string): Promise<PatientRequest[]> {
  await ensureSeeded();

  const records: PatientRequest[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "patient_id = :patientId",
        ExpressionAttributeValues: {
          ":patientId": patientId,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    for (const item of response.Items ?? []) {
      const record = stripInternalFields(item as StoredRequest);
      if (record) records.push(record);
    }

    exclusiveStartKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (exclusiveStartKey);

  return records.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getRequest(requestId: string): Promise<PatientRequest | undefined> {
  await ensureSeeded();
  return stripInternalFields(await getStoredRequest(requestId));
}

export async function putRequest(request: PatientRequest): Promise<void> {
  await ensureSeeded();

  const existing = await getStoredRequest(request.request_id);
  if (!existing) {
    throw new Error(`Cannot update unknown request: ${request.request_id}`);
  }

  const updated: StoredRequest = {
    ...request,
    updated_at: new Date().toISOString(),
    audit_events: existing.audit_events ?? [],
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: updated,
    }),
  );
}

export async function createRequest(input: {
  patient_id: string;
  request: string;
  request_source: PatientRequest["request_source"];
  document_uploaded: boolean;
}): Promise<PatientRequest> {
  await ensureSeeded();

  const now = new Date().toISOString();
  const record: PatientRequest = {
    request_id: `REQ-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`,
    patient_id: input.patient_id,
    request: input.request,
    request_source: input.request_source,
    document_uploaded: input.document_uploaded,
    request_type: null,
    specialty: null,
    specialist_review_required: null,
    document_required: null,
    classification_reason: null,
    specialist_review: {
      status: null,
      reviewed_by: null,
      reviewed_at: null,
      notes: null,
    },
    hospital_matching: { status: null, recommendations: [] },
    referral: { status: null, referral_id: null, hospital_id: null },
    appointment: { status: null, scheduled_at: null },
    workflow_status: "CREATED",
    created_at: now,
    updated_at: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...record, audit_events: [] },
      ConditionExpression: "attribute_not_exists(request_id)",
    }),
  );

  return record;
}

export async function appendAudit(
  event: Omit<AuditEvent, "audit_id" | "created_at">,
): Promise<AuditEvent> {
  const record: AuditEvent = {
    ...event,
    audit_id: randomUUID(),
    created_at: new Date().toISOString(),
  };

  await ensureSeeded();

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { request_id: record.request_id },
      UpdateExpression:
        "SET audit_events = list_append(if_not_exists(audit_events, :empty), :event)",
      ExpressionAttributeValues: {
        ":empty": [],
        ":event": [record],
      },
      ConditionExpression: "attribute_exists(request_id)",
    }),
  );

  return record;
}

export async function listAuditForRequest(requestId: string): Promise<AuditEvent[]> {
  await ensureSeeded();
  const record = await getStoredRequest(requestId);
  return (record?.audit_events ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

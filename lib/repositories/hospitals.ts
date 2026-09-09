import { getDb } from "@/lib/db";
import type { Session } from "@/lib/auth";

export type Hospital = {
  id: string;
  organization_id: string | null;
  name: string;
  legal_name: string | null;
  registration_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  operational_status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  created_at: string;
  updated_at: string;
};

export type HospitalCapability = {
  id: string;
  hospital_id: string;
  specialty: string | null;
  capability_type: "SPECIALTY" | "EQUIPMENT" | "SERVICE" | "FACILITY";
  capability_name: string;
  insurance_networks: string[];
  operational_status: "ACTIVE" | "INACTIVE";
  metadata: Record<string, unknown>;
};

export type HospitalMatchCandidate = Hospital & {
  capabilities: HospitalCapability[];
  match_reasons: string[];
};

type RequestMatchContext = {
  id: string;
  patient_id: string;
  request_type: string | null;
  description: string;
  workflow_stage: string;
  ai_classification: Record<string, unknown>;
};

function assertStaffOrAdmin(session: Session) {
  if (!["hospital", "admin", "insurance_agent", "specialist"].includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
}

async function getRequestMatchContext(requestId: string) {
  const { data, error } = await getDb()
    .from("requests")
    .select("id, patient_id, request_type, description, workflow_stage, ai_classification")
    .eq("request_id", requestId)
    .maybeSingle<RequestMatchContext>();
  if (error) throw error;
  return data;
}

export async function assertHospitalCanMatchRequest(session: Session, requestId: string) {
  if (!["admin", "hospital"].includes(session.role)) throw new Error("FORBIDDEN");
  const request = await getRequestMatchContext(requestId);
  if (!request) throw new Error("NOT_FOUND");
  if (request.workflow_stage !== "HOSPITAL_MATCHING") throw new Error("INVALID_STAGE");
  if (session.role === "admin") return request;
  if (!session.organizationId) throw new Error("FORBIDDEN");

  const specialty = typeof request.ai_classification?.specialty === "string"
    ? request.ai_classification.specialty.trim()
    : "";
  if (!specialty) throw new Error("NO_MATCHING_SPECIALTY");

  const { data, error } = await getDb()
    .from("hospital_capabilities")
    .select("hospital_id, hospitals!inner(id, organization_id, operational_status)")
    .eq("specialty", specialty)
    .eq("operational_status", "ACTIVE")
    .eq("hospitals.operational_status", "ACTIVE")
    .eq("hospitals.organization_id", session.organizationId)
    .returns<{ hospital_id: string; hospitals: { id: string; organization_id: string | null; operational_status: string } }[]>();
  if (error) throw error;
  if (!data.length) throw new Error("FORBIDDEN");
  if (session.hospitalId && !data.some((row) => row.hospital_id === session.hospitalId)) {
    throw new Error("FORBIDDEN");
  }
  return request;
}

export async function getHospital(session: Session, hospitalId: string) {
  assertStaffOrAdmin(session);
  const db = getDb();
  const { data, error } = await db
    .from("hospitals")
    .select("*")
    .eq("id", hospitalId)
    .maybeSingle<Hospital>();
  if (error) throw error;
  if (!data) return null;
  if (session.role === "admin") return data;
  if (session.organizationId && data.organization_id !== session.organizationId) {
    throw new Error("FORBIDDEN");
  }
  if (
    session.role === "hospital" &&
    session.hospitalId !== data.organization_id &&
    session.hospitalId !== data.id
  ) {
    throw new Error("FORBIDDEN");
  }
  return data;
}

export async function listHospitals(session: Session, specialty?: string) {
  assertStaffOrAdmin(session);
  const db = getDb();
  let query = db
    .from("hospitals")
    .select("*")
    .eq("operational_status", "ACTIVE")
    .order("name");
  if (session.organizationId && session.role !== "admin") {
    query = query.eq("organization_id", session.organizationId);
  }
  if (specialty) {
    const { data, error } = await db
      .from("hospital_capabilities")
      .select("hospital_id")
      .eq("specialty", specialty)
      .eq("operational_status", "ACTIVE")
      .returns<{ hospital_id: string }[]>();
    if (error) throw error;
    const ids = [...new Set(data.map((x) => x.hospital_id))];
    if (!ids.length) return [];
    query = query.in("id", ids);
  }
  const { data, error } = await query.returns<Hospital[]>();
  if (error) throw error;
  return data;
}

export async function listCapabilities(session: Session, hospitalId: string) {
  const hospital = await getHospital(session, hospitalId);
  if (!hospital) return [];
  const { data, error } = await getDb()
    .from("hospital_capabilities")
    .select("*")
    .eq("hospital_id", hospitalId)
    .eq("operational_status", "ACTIVE")
    .returns<HospitalCapability[]>();
  if (error) throw error;
  return data;
}

export async function findMatchingHospitals(
  session: Session,
  requestId: string,
): Promise<HospitalMatchCandidate[]> {
  const request = await assertHospitalCanMatchRequest(session, requestId);
  const db = getDb();

  const specialty =
    typeof request.ai_classification?.specialty === "string"
      ? request.ai_classification.specialty.trim()
      : "";
  if (!specialty) return [];

  const { data: capabilities, error: capabilityError } = await db
    .from("hospital_capabilities")
    .select("*")
    .eq("specialty", specialty)
    .eq("operational_status", "ACTIVE")
    .returns<HospitalCapability[]>();
  if (capabilityError) throw capabilityError;
  if (!capabilities.length) return [];

  const hospitalIds = [...new Set(capabilities.map((capability) => capability.hospital_id))];
  let hospitalQuery = db
    .from("hospitals")
    .select("*")
    .in("id", hospitalIds)
    .eq("operational_status", "ACTIVE")
    .order("name");
  if (session.organizationId && session.role !== "admin") {
    hospitalQuery = hospitalQuery.eq("organization_id", session.organizationId);
  }

  const { data: hospitals, error: hospitalError } = await hospitalQuery.returns<Hospital[]>();
  if (hospitalError) throw hospitalError;

  const capabilityMap = new Map<string, HospitalCapability[]>();
  for (const capability of capabilities) {
    const existing = capabilityMap.get(capability.hospital_id) ?? [];
    existing.push(capability);
    capabilityMap.set(capability.hospital_id, existing);
  }

  return hospitals.map((hospital) => {
    const matchedCapabilities = capabilityMap.get(hospital.id) ?? [];
    return {
      ...hospital,
      capabilities: matchedCapabilities,
      match_reasons: [
        "Active hospital",
        `Active ${specialty} capability`,
        ...matchedCapabilities.map(
          (capability) => `${capability.capability_type}: ${capability.capability_name}`,
        ),
      ],
    };
  });
}

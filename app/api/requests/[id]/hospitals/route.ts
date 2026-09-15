import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getRequestForPatient } from "@/lib/repositories/requests";
import { listCapabilities, listHospitals } from "@/lib/repositories/hospitals";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "patient" || !session.patientId || session.sub !== session.patientId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  try {
    const request = await getRequestForPatient(session, id);
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    const hospitals = await listHospitals(session, request.specialty || undefined);
    const matches = await Promise.all(hospitals.map(async (hospital) => {
      const capabilities = await listCapabilities(session, hospital.id);
      const specialtyMatches = request.specialty ? capabilities.filter((item) => item.specialty?.toLowerCase() === request.specialty?.toLowerCase()) : [];
      const capabilityNames = [...new Set(capabilities.map((item) => item.capability_name))];
      const matchedCapabilities = [...new Set(specialtyMatches.map((item) => item.capability_name))];
      return {
        hospital_id: hospital.id,
        hospital_name: hospital.name,
        city: hospital.city,
        state: hospital.state,
        address: [hospital.address_line1, hospital.address_line2].filter(Boolean).join(", "),
        specialties: [...new Set(capabilities.map((item) => item.specialty).filter(Boolean))],
        matched_capabilities: matchedCapabilities.length ? matchedCapabilities : capabilityNames.slice(0, 8),
        match_basis: request.specialty ? `${matchedCapabilities.length} documented capability match${matchedCapabilities.length === 1 ? "" : "es"} for ${request.specialty}` : "Active provider with documented capabilities",
        medisync_tier: "Pending verification",
      };
    }));
    return NextResponse.json({ request_id: request.request_id, specialty: request.specialty, hospitals: matches });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "FORBIDDEN" ? "Forbidden" : "Unable to match hospitals" }, { status: 503 });
  }
}

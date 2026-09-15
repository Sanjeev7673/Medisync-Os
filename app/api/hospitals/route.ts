import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { listCapabilities, listHospitals } from "@/lib/repositories/hospitals";

function publicHospital(hospital: Awaited<ReturnType<typeof listHospitals>>[number]) {
  return { id: hospital.id, name: hospital.name, address_line1: hospital.address_line1, address_line2: hospital.address_line2, city: hospital.city, state: hospital.state, postal_code: hospital.postal_code, country: hospital.country, phone: hospital.phone, operational_status: hospital.operational_status };
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const specialty = req.nextUrl.searchParams.get("specialty")?.trim() || undefined;
  const hospitalId = req.nextUrl.searchParams.get("hospital_id")?.trim() || undefined;
  try {
    if (hospitalId) {
      const { data } = await (async () => {
        const hospitals = await listHospitals(session);
        const hospital = hospitals.find((item) => item.id === hospitalId);
        if (!hospital) return { data: null };
        return { data: { hospital: publicHospital(hospital), capabilities: await listCapabilities(session, hospitalId) } };
      })();
      if (!data) return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
      return NextResponse.json(data);
    }
    const hospitals = await listHospitals(session, specialty);
    const enriched = await Promise.all(hospitals.map(async (hospital) => {
      const capabilities = await listCapabilities(session, hospital.id);
      const specialties = [...new Set(capabilities.map((item) => item.specialty).filter(Boolean))] as string[];
      const capabilityNames = [...new Set(capabilities.map((item) => item.capability_name))];
      return { ...publicHospital(hospital), specialties, capabilities: capabilityNames.slice(0, 12) };
    }));
    return NextResponse.json({ hospitals: enriched });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "FORBIDDEN" ? "Forbidden" : "Unable to load hospitals" }, { status: 503 });
  }
}

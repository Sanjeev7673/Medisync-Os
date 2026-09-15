import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { listCapabilities, listHospitals } from "@/lib/repositories/hospitals";

function publicHospital(hospital: Awaited<ReturnType<typeof listHospitals>>[number]) {
  return {
    id: hospital.id,
    name: hospital.name,
    address_line1: hospital.address_line1,
    address_line2: hospital.address_line2,
    city: hospital.city,
    state: hospital.state,
    postal_code: hospital.postal_code,
    country: hospital.country,
    phone: hospital.phone,
    operational_status: hospital.operational_status,
    medisync_tier: hospital.medisync_tier,
    tier_basis: hospital.tier_basis,
    catalog_metadata: hospital.catalog_metadata,
  };
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const specialty = req.nextUrl.searchParams.get("specialty")?.trim() || undefined;
  const tier = req.nextUrl.searchParams.get("tier")?.trim() || undefined;
  const city = req.nextUrl.searchParams.get("city")?.trim() || undefined;
  const hospitalId = req.nextUrl.searchParams.get("hospital_id")?.trim() || undefined;
  try {
    if (hospitalId) {
      const hospitals = await listHospitals(session);
      const hospital = hospitals.find((item) => item.id === hospitalId);
      if (!hospital) return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
      return NextResponse.json({ hospital: publicHospital(hospital), capabilities: await listCapabilities(session, hospitalId) });
    }
    let hospitals = await listHospitals(session, specialty);
    if (tier) hospitals = hospitals.filter((hospital) => hospital.medisync_tier === tier);
    if (city) hospitals = hospitals.filter((hospital) => hospital.city?.toLowerCase() === city.toLowerCase());
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

// Backward-compatible alias for the legacy login endpoint.
// Credential verification now lives in the Supabase Auth-backed route.
export { POST } from "@/app/api/auth/supabase-login/route";

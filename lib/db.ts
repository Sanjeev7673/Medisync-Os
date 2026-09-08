import { createClient } from "@supabase/supabase-js";

function required(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function getDb() {
  return createClient(
    required("SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export type DbUser = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: "PATIENT" | "SPECIALIST" | "HOSPITAL" | "INSURANCE" | "ADMIN";
  organization_id: string | null;
  status: "ACTIVE" | "SUSPENDED" | "DISABLED";
  session_version: number;
  created_at: string;
  updated_at: string;
};

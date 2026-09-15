import { createHmac, timingSafeEqual } from "crypto";

const TTL_SECONDS = 60 * 60 * 24 * 30;

function secret() {
  return process.env.MEDISYNC_REPORT_SHARE_SECRET || process.env.MEDISYNC_WEBHOOK_SECRET || "";
}

export function createReportShareToken(documentId: string, now = Math.floor(Date.now() / 1000)) {
  const key = secret();
  if (!key) throw new Error("REPORT_SHARE_SECRET_NOT_CONFIGURED");
  const payload = `${documentId}.${now + TTL_SECONDS}`;
  const signature = createHmac("sha256", key).update(payload).digest("hex");
  return `${now + TTL_SECONDS}.${signature}`;
}

export function verifyReportShareToken(documentId: string, token: string) {
  const key = secret();
  if (!key || !token) return false;
  const [expiry, signature] = token.split(".");
  const expiryNumber = Number(expiry);
  if (!Number.isSafeInteger(expiryNumber) || expiryNumber < Math.floor(Date.now() / 1000) || !/^[a-f0-9]{64}$/.test(signature || "")) return false;
  const payload = `${documentId}.${expiryNumber}`;
  const expected = createHmac("sha256", key).update(payload).digest("hex");
  return timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expected, "utf8"));
}

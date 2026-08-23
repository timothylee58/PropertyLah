/**
 * Server-only environment helpers.
 * `NEXT_PUBLIC_*` is readable on the server, but real secrets are never sent to the browser.
 */

export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export const QWEN_API_KEY = process.env.QWEN_API_KEY || "";
export const QWEN_BASE_URL =
  (process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
export const QWEN_MODEL = process.env.QWEN_MODEL || "qwen-plus";

export const HERMES_API_URL = process.env.HERMES_API_URL || "";
export const HERMES_API_KEY = process.env.HERMES_API_KEY || "";

export const SUPABASE_URL = process.env.SUPABASE_URL || "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "";
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

export const WHATSAPP_BUSINESS_TOKEN = process.env.WHATSAPP_BUSINESS_TOKEN || "";
export const VAPI_WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET || "";

export function hasQwenConfig(): boolean {
  return Boolean(QWEN_API_KEY && QWEN_BASE_URL && QWEN_MODEL);
}

export function hasHermesConfig(): boolean {
  return Boolean(HERMES_API_URL);
}

export function hasSupabaseConfig(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

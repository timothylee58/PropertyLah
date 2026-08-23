import { TELEGRAM_BOT_TOKEN } from "./env";

const TELEGRAM_API = "https://api.telegram.org";

export interface TelegramSendResult {
  ok: boolean;
  result?: unknown;
  error?: string;
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  opts?: { parse_mode?: "HTML" | "Markdown" | "MarkdownV2" }
): Promise<TelegramSendResult> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" };
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...opts,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };

    if (!res.ok || data.ok === false) {
      return { ok: false, error: data.description || `HTTP ${res.status}` };
    }

    return { ok: true, result: data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

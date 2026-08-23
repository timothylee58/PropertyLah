import {
  ELEVENLABS_API_KEY,
  ELEVENLABS_AGENT_ID,
  ELEVENLABS_PHONE_NUMBER_ID,
  ELEVENLABS_PROVIDER,
  ELEVENLABS_MODEL_ID,
  ELEVENLABS_VOICE_ID,
  ELEVENLABS_VOICE_ID_EN,
  ELEVENLABS_VOICE_ID_MS,
} from "./env";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io";

export interface ElevenLabsCallResult {
  ok: boolean;
  callId?: string;
  conversationId?: string;
  error?: string;
}

export async function textToSpeech(text: string, language: "en" | "ms" = "en"): Promise<ArrayBuffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }
  const voiceId =
    (language === "ms" ? ELEVENLABS_VOICE_ID_MS : ELEVENLABS_VOICE_ID_EN) ||
    ELEVENLABS_VOICE_ID;
  if (!voiceId) {
    throw new Error(`ELEVENLABS_VOICE_ID for ${language} is not configured`);
  }
  const res = await fetch(`${ELEVENLABS_API_BASE}/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL_ID,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: string | object };
    console.error("ElevenLabs TTS error:", res.status, data);
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : data.detail
          ? JSON.stringify(data.detail)
          : "";
    throw new Error(detail || `ElevenLabs TTS failed: ${res.status}`);
  }
  return res.arrayBuffer();
}

export async function requestElevenLabsCall(toNumber: string, leadName?: string): Promise<ElevenLabsCallResult> {
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID || !ELEVENLABS_PHONE_NUMBER_ID) {
    return { ok: false, error: "ElevenLabs is not fully configured" };
  }

  const provider = ["twilio", "exotel"].includes(ELEVENLABS_PROVIDER) ? ELEVENLABS_PROVIDER : "twilio";
  const url = `${ELEVENLABS_API_BASE}/v1/convai/${provider}/outbound-call`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: ELEVENLABS_AGENT_ID,
        agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
        to_number: toNumber,
        conversation_initiation_client_data: {
          conversation_config_override: {
            agent: {
              first_message: `Hello, this is Sara from PropertyLah. I'm calling about your property inquiry. Am I speaking with ${leadName || "the right person"}?`,
            },
          },
        },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      conversation_id?: string;
      callSid?: string;
      detail?: string;
    };

    if (!res.ok || data.success === false) {
      return { ok: false, error: data.detail || data.message || `HTTP ${res.status}` };
    }

    return {
      ok: true,
      callId: data.callSid || data.conversation_id,
      conversationId: data.conversation_id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

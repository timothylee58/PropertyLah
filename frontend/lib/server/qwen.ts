import { QWEN_API_KEY, QWEN_BASE_URL, QWEN_MODEL } from "./env";

export interface QwenMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: QwenToolCall[];
}

export interface QwenToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface QwenResponse {
  id: string;
  choices: Array<{
    index: number;
    message: QwenMessage;
    finish_reason: string;
  }>;
  error?: { message: string };
}

export interface QwenToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export async function callQwen(
  messages: QwenMessage[],
  tools?: QwenToolDefinition[],
  toolChoice: "auto" | "none" = "auto"
): Promise<QwenResponse | null> {
  if (!QWEN_API_KEY) return null;
  try {
    const body: Record<string, unknown> = {
      model: QWEN_MODEL,
      messages,
      temperature: 0.6,
      max_tokens: 800,
    };
    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = toolChoice;
    }

    const res = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${QWEN_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "unknown");
      console.warn("Qwen request failed:", res.status, text);
      return null;
    }

    return (await res.json()) as QwenResponse;
  } catch (err) {
    console.warn("Qwen call error:", err);
    return null;
  }
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { IS_DEMO } from "@/lib/api";
import {
  MessageSquare,
  Bot,
  Phone,
  Shield,
  Send,
  Globe,
  Database,
  Sparkles,
} from "lucide-react";

interface Health {
  ok: boolean;
  mode: "demo" | "live";
  qwenConfigured: boolean;
  hermesConfigured: boolean;
  supabaseConfigured: boolean;
  telegramConfigured: boolean;
  elevenLabsConfigured: boolean;
}

function statusBadge(status: string) {
  const configured =
    status === "Configured" ||
    status === "Connected" ||
    status === "Active" ||
    status === "Enabled";
  const demo = status === "Demo";

  return (
    <Badge
      className={cn(
        configured && "bg-emerald-100 text-emerald-700",
        demo && "bg-amber-100 text-amber-700",
        !configured && !demo && "bg-stone-100 text-stone-600"
      )}
    >
      {status}
    </Badge>
  );
}

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: Health) => setHealth(data))
      .catch(() => setHealth(null))
      .finally(() => setLoading(false));
  }, []);

  const mode = health ? health.mode : IS_DEMO ? "demo" : "live";
  const modeLabel = mode === "demo" ? "Demo Mode" : "Live Mode";
  const modeDescription =
    mode === "demo"
      ? "Simulated channels and deterministic agent responses."
      : "Connected to live services and AI providers.";

  const aiStatus =
    mode === "demo"
      ? "Demo"
      : health && (health.qwenConfigured || health.hermesConfigured)
        ? "Configured"
        : "Not configured";
  const telegramStatus =
    mode === "demo"
      ? "Demo"
      : health && health.telegramConfigured
        ? "Configured"
        : "Not configured";
  const voiceStatus =
    mode === "demo"
      ? "Demo"
      : health && health.elevenLabsConfigured
        ? "Configured"
        : "Not configured";
  const storageStatus =
    mode === "demo"
      ? "Demo"
      : health && health.supabaseConfigured
        ? "Connected"
        : "Not connected";

  const integrations = [
    {
      icon: Sparkles,
      title: "Operating Mode",
      status: modeLabel,
      description: modeDescription,
    },
    {
      icon: Bot,
      title: "AI Agent",
      status: aiStatus,
      description:
        "Hermes or Qwen powers the conversation brain. Responses are generated in English and Bahasa Melayu.",
    },
    {
      icon: MessageSquare,
      title: "WhatsApp Channel",
      status: "Demo",
      description:
        "In production, connect the WhatsApp Business Platform webhook to receive and respond to customer messages.",
    },
    {
      icon: Send,
      title: "Telegram Channel",
      status: telegramStatus,
      description:
        "Receives Telegram bot updates and sends AI replies when a bot token is configured.",
    },
    {
      icon: Globe,
      title: "Web Chat",
      status: "Enabled",
      description:
        "The web chat API is available for website and portal integrations.",
    },
    {
      icon: Phone,
      title: "AI Voice Escalation",
      status: voiceStatus,
      description:
        "ElevenLabs enables text-to-speech and outbound calls when configured.",
    },
    {
      icon: Database,
      title: "Supabase Storage",
      status: storageStatus,
      description:
        "Persist leads, viewings, and chat history to Supabase in live mode.",
    },
    {
      icon: Shield,
      title: "Data & Privacy",
      status: "Active",
      description:
        "Customer phone numbers are masked in the operations dashboard. No real PII is stored in demo mode.",
    },
  ];

  return (
    <div className="min-h-full bg-warm-50 p-4 pb-10 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Settings</h1>
          <p className="text-sm text-stone-500">
            Channel and agent configuration.
          </p>
        </div>

        {loading && (
          <p className="text-sm text-stone-500">Loading integration status…</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {integrations.map(({ icon: Icon, title, status, description }) => (
            <Card key={title}>
              <CardHeader className="border-b border-stone-100 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-sm font-semibold text-stone-900">
                      {title}
                    </h2>
                  </div>
                  {statusBadge(status)}
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <p className="text-sm text-stone-600">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

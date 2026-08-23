"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone, Bot, Shield } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="min-h-full bg-warm-50 p-4 pb-10 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Settings</h1>
          <p className="text-sm text-stone-500">Channel and agent configuration. Demo mode is active.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-stone-900">WhatsApp Channel</h2>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="mb-3 flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-700">Demo Connected</Badge>
              </div>
              <p className="text-sm text-stone-600">In production, connect the WhatsApp Business Platform webhook to receive and respond to customer messages.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-stone-900">AI Agent</h2>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <p className="text-sm text-stone-600">Hermes + Qwen power the conversation brain. Responses are generated in English and Bahasa Melayu.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-stone-900">AI Voice Escalation</h2>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <p className="text-sm text-stone-600">In demo mode, call requests are simulated. Production requires a telephony or voice provider integration.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-stone-900">Data & Privacy</h2>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <p className="text-sm text-stone-600">Customer phone numbers are masked in the operations dashboard. No real PII is stored in demo mode.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

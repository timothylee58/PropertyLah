"use client";

import { Lead } from "@/lib/types";
import { cn, formatCurrency, scoreLabel, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Hand, Phone, User, Sparkles } from "lucide-react";

interface LeadIntelligencePanelProps {
  lead: Lead;
  onTakeOver: () => void;
  onRequestCall: () => void;
  onAssign: () => void;
}

export function LeadIntelligencePanel({ lead, onTakeOver, onRequestCall, onAssign }: LeadIntelligencePanelProps) {
  const score = scoreLabel(lead.score);

  const explanation = [
    lead.qualification.financing === "approved" ? "Financing approved" : undefined,
    lead.qualification.budgetMax ? "Budget matches inventory" : undefined,
    lead.qualification.location ? "Specific area selected" : undefined,
    lead.qualification.timelineDays != null && lead.qualification.timelineDays <= 60 ? `Timeline: ${lead.qualification.timelineDays} days` : undefined,
    lead.status === "booked" ? "Viewing booked" : undefined,
    lead.qualification.bedrooms ? `${lead.qualification.bedrooms} BR specified` : undefined,
  ].filter(Boolean) as string[];

  return (
    <div className="h-full space-y-4 overflow-y-auto border-l border-stone-200 bg-white p-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-200 text-sm font-bold text-stone-700">
              {getInitials(lead.name)}
            </div>
            <div>
              <p className="font-semibold text-stone-900">{lead.name}</p>
              <p className="text-xs text-stone-500">{lead.phoneMasked}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className={score.colorClass}>{score.label}</Badge>
            <Badge variant="outline">{lead.conversationStatus === "ai_handling" ? "AI handling" : "Human handling"}</Badge>
            {lead.callStatus !== "not_requested" && (
              <Badge variant="soft" className="text-amber-700">Call {lead.callStatus}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-stone-100 pb-3">
          <h2 className="text-sm font-semibold text-stone-900">Lead Score</h2>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center gap-4">
            <div className={cn("flex h-16 w-16 items-center justify-center rounded-full border-4 bg-white text-lg font-bold", score.colorClass.split(" ")[1]?.replace("text-", "border-").replace("700", "500") || "border-stone-300", score.colorClass.split(" ")[1] || "text-stone-700")}>
              {lead.score}
            </div>
            <div>
              <p className="font-semibold text-stone-900">{lead.score} / 100 · {score.label}</p>
              <p className="text-xs text-stone-500">Based on qualification and activity</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {explanation.map((item) => (
              <Badge key={item} variant="soft" className="text-[10px] text-stone-600">{item}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-stone-100 pb-3">
          <h2 className="text-sm font-semibold text-stone-900">Qualification</h2>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 pt-4 text-sm">
          <div><p className="text-xs text-stone-500">Budget</p><p className="font-medium text-stone-800">{lead.budgetLabel || (lead.qualification.budgetMax ? formatCurrency(lead.qualification.budgetMax) : "—")}</p></div>
          <div><p className="text-xs text-stone-500">Location</p><p className="font-medium text-stone-800">{lead.qualification.location || "—"}</p></div>
          <div><p className="text-xs text-stone-500">Property</p><p className="font-medium text-stone-800">{lead.qualification.propertyType || "—"}</p></div>
          <div><p className="text-xs text-stone-500">Bedrooms</p><p className="font-medium text-stone-800">{lead.qualification.bedrooms != null ? `${lead.qualification.bedrooms} BR` : "—"}</p></div>
          <div><p className="text-xs text-stone-500">Financing</p><p className="font-medium text-stone-800">{lead.qualification.financing ? (lead.qualification.financing === "approved" ? "Pre-approved" : lead.qualification.financing) : "—"}</p></div>
          <div><p className="text-xs text-stone-500">Timeline</p><p className="font-medium text-stone-800">{lead.qualification.timeline || "—"}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-stone-900">AI Summary</h2>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm leading-relaxed text-stone-700">{lead.aiSummary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-stone-100 pb-3">
          <h2 className="text-sm font-semibold text-stone-900">Next Best Action</h2>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm leading-relaxed text-stone-700">{lead.nextBestAction}</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Button size="sm" className="w-full" onClick={onTakeOver}>
          <Hand className="mr-2 h-4 w-4" />Take Over Conversation
        </Button>
        <Button size="sm" variant="secondary" className="w-full" onClick={onRequestCall}>
          <Phone className="mr-2 h-4 w-4" />Request AI Call
        </Button>
        <Button size="sm" variant="secondary" className="w-full" onClick={onAssign}>
          <User className="mr-2 h-4 w-4" />Assign to Human Agent
        </Button>
      </div>
    </div>
  );
}

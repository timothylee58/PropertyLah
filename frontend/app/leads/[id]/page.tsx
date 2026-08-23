"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Lead } from "@/lib/types";
import { getLead } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { LeadDetailPanel } from "@/components/dashboard/lead-detail-panel";
import { ChatMessage } from "@/components/chat/chat-message";
import { ListingCard } from "@/components/chat/listing-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarCheck, Lightbulb } from "lucide-react";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getLead(id).then((data) => {
      setLead(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-stone-500">
        Loading lead…
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-semibold text-stone-800">Lead not found</p>
        <p className="text-sm text-stone-500">This lead doesn’t exist or was removed.</p>
        <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-warm-50 p-4 pb-10 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="h-9 w-9 rounded-full p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-stone-900">{lead.name}</h1>
              <p className="text-sm text-stone-500">
                {lead.source} · {lead.intent} · Last activity {formatDate(lead.lastActivity)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-warm-100 text-stone-700">Score {lead.score}/100</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader className="border-b border-stone-100 pb-4">
                <h2 className="text-sm font-semibold text-stone-900">Conversation transcript</h2>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                {lead.conversation.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {lead.conversation.length === 0 && (
                  <p className="text-sm text-stone-500">No conversation recorded yet.</p>
                )}
              </CardContent>
            </Card>

            {lead.bookedViewing && (
              <Card className="border-emerald-200 bg-emerald-50/40">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CalendarCheck className="h-4 w-4" />
                    <h2 className="text-sm font-semibold">Booked viewing</h2>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ListingCard listing={lead.bookedViewing.listing} />
                  <p className="text-sm text-emerald-900">
                    <span className="font-medium">{lead.bookedViewing.slot.label}</span>
                    <span className="mx-2">·</span>
                    Booking #{lead.bookedViewing.bookingId}
                  </p>
                </CardContent>
              </Card>
            )}

            {lead.recommendedListings && lead.recommendedListings.length > 0 && !lead.bookedViewing && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-stone-900">Recommended listings</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {lead.recommendedListings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <LeadDetailPanel lead={lead} />

            <Card>
              <CardHeader className="border-b border-stone-100 pb-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                  <h2 className="text-sm font-semibold text-stone-900">Next best action</h2>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <p className="text-sm leading-relaxed text-stone-700">
                  {lead.nextBestAction || "Reach out to keep the conversation moving."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

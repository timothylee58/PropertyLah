"use client";

import { useEffect, useState } from "react";
import { Viewing } from "@/lib/types";
import { getViewings, getLeads } from "@/lib/api";
import { formatDate, timeAgo } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Clock } from "lucide-react";

export default function ViewingsPage() {
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [bookedThisWeek, setBookedThisWeek] = useState(0);
  const [qualifiedThisWeek, setQualifiedThisWeek] = useState(0);

  useEffect(() => {
    getViewings().then(setViewings);
    getLeads().then((leads) => {
      setBookedThisWeek(leads.filter((l) => l.status === "booked").length);
      setQualifiedThisWeek(leads.filter((l) => l.status === "qualified" || l.status === "booked").length);
    });
  }, []);

  return (
    <div className="min-h-full bg-warm-50 p-4 pb-10 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Viewings</h1>
          <p className="text-sm text-stone-500">Appointments booked by KeyNest through WhatsApp.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {viewings.map((v) => (
            <Card key={v.bookingId} className="overflow-hidden border-stone-200">
              <CardHeader className="border-b border-stone-100 bg-white pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-stone-500" />
                    <h3 className="font-semibold text-stone-900">{v.slot.label}</h3>
                  </div>
                  <Badge className={v.confirmed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                    {v.confirmed ? "Confirmed" : "Pending"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <div>
                  <p className="font-medium text-stone-900">{v.listing.name}</p>
                  <p className="text-xs text-stone-500">{v.listing.location}</p>
                </div>
                <p className="text-sm text-stone-700">Lead: <span className="font-medium">{v.leadId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span></p>
                <p className="text-xs text-stone-500">Booked via WhatsApp · {timeAgo(v.appointmentAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="flex items-center gap-3 p-4">
            <CalendarCheck className="h-5 w-5 text-emerald-700" />
            <p className="text-sm text-emerald-900">
              <span className="font-semibold">{bookedThisWeek} of {qualifiedThisWeek}</span> qualified WhatsApp leads booked a viewing this week.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

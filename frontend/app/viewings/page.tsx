"use client";

import { useEffect, useMemo, useState } from "react";
import { Viewing } from "@/lib/types";
import { getViewings, getLeads } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, ChevronLeft, ChevronRight, Clock, LayoutGrid, List } from "lucide-react";

type ViewMode = "list" | "calendar";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function calendarDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function ViewingsPage() {
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [bookedThisWeek, setBookedThisWeek] = useState(0);
  const [qualifiedThisWeek, setQualifiedThisWeek] = useState(0);
  const [view, setView] = useState<ViewMode>("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    getViewings().then(setViewings);
    getLeads().then((leads) => {
      setBookedThisWeek(leads.filter((l) => l.status === "booked").length);
      setQualifiedThisWeek(leads.filter((l) => l.status === "qualified" || l.status === "booked").length);
    });
  }, []);

  const days = useMemo(() => calendarDays(currentMonth), [currentMonth]);

  const viewingsByDay = useMemo(() => {
    const map = new Map<string, Viewing[]>();
    for (const v of viewings) {
      const d = new Date(v.appointmentAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return map;
  }, [viewings]);

  const monthLabel = currentMonth.toLocaleDateString("en-MY", { month: "long", year: "numeric" });

  function previousMonth() {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  return (
    <div className="min-h-full bg-warm-50 p-4 pb-10 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Viewings</h1>
            <p className="text-sm text-stone-500">Appointments booked by PropertyLah through WhatsApp.</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-1">
            <button
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
                view === "list" ? "bg-stone-800 text-white" : "text-stone-600 hover:bg-stone-100"
              )}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
                view === "calendar" ? "bg-stone-800 text-white" : "text-stone-600 hover:bg-stone-100"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Calendar
            </button>
          </div>
        </div>

        {view === "list" ? (
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
                    <p className="font-medium text-stone-900">{v.listing?.name || v.propertyReference || "Property"}</p>
                    <p className="text-xs text-stone-500">{v.listing?.location || ""}</p>
                  </div>
                  <p className="text-sm text-stone-700">
                    Lead:{" "}
                    <span className="font-medium">
                      {v.leadId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </p>
                  <p className="text-xs text-stone-500">Booked via WhatsApp · {v.confirmed ? "Confirmed" : "Pending"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-stone-200">
            <CardHeader className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-stone-900">{monthLabel}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={previousMonth}
                  className="rounded-md border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-50"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="rounded-md border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className="rounded-md border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-50"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-stone-500">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} className="min-h-[80px] rounded-md bg-stone-50/50" />;
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  const isToday = isSameDay(date, new Date());
                  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                  const dayViewings = viewingsByDay.get(key) || [];
                  return (
                    <div
                      key={day}
                      className={cn(
                        "min-h-[80px] rounded-md border p-1.5 transition",
                        isToday
                          ? "border-emerald-300 bg-emerald-50/30"
                          : "border-stone-100 bg-white hover:border-stone-200"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium",
                          isToday ? "bg-emerald-600 text-white" : "text-stone-700"
                        )}
                      >
                        {day}
                      </div>
                      <div className="mt-1 space-y-1">
                        {dayViewings.map((v) => (
                          <div
                            key={v.bookingId}
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] leading-tight",
                              v.confirmed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            )}
                            title={`${formatDate(v.appointmentAt)} — ${v.listing?.name || v.propertyReference || "Property"}`}
                          >
                            {formatTime(v.appointmentAt)} · {v.listing?.name || v.propertyReference || "Property"}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="flex items-center gap-3 p-4">
            <CalendarCheck className="h-5 w-5 text-emerald-700" />
            <p className="text-sm text-emerald-900">
              <span className="font-semibold">{bookedThisWeek} of {qualifiedThisWeek}</span> qualified WhatsApp leads
              booked a viewing this week.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit" });
}

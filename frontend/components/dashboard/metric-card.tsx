"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "teal" | "violet" | "emerald" | "amber";
}

const toneMap = {
  teal: "bg-teal-50 text-teal-700",
  violet: "bg-violet-50 text-violet-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
};

export function MetricCard({ title, value, icon: Icon, tone = "teal" }: MetricCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-stone-900">{value}</p>
        <p className="text-xs font-medium text-stone-500">{title}</p>
      </CardContent>
    </Card>
  );
}

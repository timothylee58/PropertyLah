"use client";

import { LeadStatus } from "@/lib/types";
import { statusColor, statusLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface LeadStatusBadgeProps {
  status: LeadStatus;
}

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  return (
    <Badge className={statusColor(status)}>
      {statusLabel(status)}
    </Badge>
  );
}

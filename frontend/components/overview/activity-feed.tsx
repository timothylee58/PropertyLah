"use client";

import { ActivityEvent } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MessageSquare, CheckCircle, Home, Calendar, Phone, Sparkles } from "lucide-react";

interface ActivityFeedProps {
  activities: ActivityEvent[];
}

const iconMap: Record<ActivityEvent["type"], React.ElementType> = {
  qualification: CheckCircle,
  listing_match: Home,
  viewing_booked: Calendar,
  new_lead: MessageSquare,
  call_requested: Phone,
  ai_response: Sparkles,
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="border-b border-stone-100 pb-4">
        <h2 className="text-sm font-semibold text-stone-900">Live AI Activity</h2>
      </CardHeader>
      <CardContent className="divide-y divide-stone-100 p-0">
        {activities.map((activity) => {
          const Icon = iconMap[activity.type];
          return (
            <div key={activity.id} className="flex items-start gap-3 px-5 py-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-warm-100 text-stone-600">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-800">{activity.title}</p>
                {activity.description && <p className="text-xs text-stone-500">{activity.description}</p>}
                <p className="text-[10px] text-stone-400">{activity.leadName} · {timeAgo(activity.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

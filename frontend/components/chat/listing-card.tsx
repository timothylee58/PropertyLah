"use client";

import Image from "next/image";
import { Listing } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed, Bath, Maximize } from "lucide-react";

interface ListingCardProps {
  listing: Listing;
  onSelect?: (listing: Listing) => void;
  disabled?: boolean;
}

export function ListingCard({ listing, onSelect, disabled }: ListingCardProps) {
  return (
    <Card className="w-full max-w-sm overflow-hidden border-stone-200">
      <div className="relative h-40 w-full overflow-hidden bg-stone-100">
        <Image
          src={listing.image}
          alt={listing.name}
          fill
          sizes="(max-width: 640px) 100vw, 400px"
          className="object-cover"
          loading="lazy"
        />
        {listing.badge && (
          <div className="absolute left-3 top-3">
            <Badge className="bg-emerald-700 text-white">{listing.badge}</Badge>
          </div>
        )}
      </div>
      <CardContent className="space-y-3 p-4">
        <div>
          <h3 className="font-semibold text-stone-900">{listing.name}</h3>
          <p className="text-xs text-stone-500">{listing.location}</p>
        </div>
        <p className="text-lg font-bold text-teal-800">{formatCurrency(listing.price)}</p>
        <div className="flex items-center gap-4 text-xs text-stone-600">
          <span className="flex items-center gap-1">
            <Bed className="h-3.5 w-3.5" /> {listing.beds} bed
          </span>
          <span className="flex items-center gap-1">
            <Bath className="h-3.5 w-3.5" /> {listing.baths} bath
          </span>
          <span className="flex items-center gap-1">
            <Maximize className="h-3.5 w-3.5" /> {listing.sqft.toLocaleString()} sq ft
          </span>
        </div>
        <p className="text-xs leading-relaxed text-stone-600">{listing.description}</p>
        {onSelect && (
          <Button
            size="sm"
            className="w-full rounded-lg"
            onClick={() => onSelect(listing)}
            disabled={disabled}
          >
            Select to view
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

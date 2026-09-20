"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateID } from "@/lib/format-date";

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
};

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [selected, setSelected] = useState<GalleryItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item)}
            className="group aspect-square overflow-hidden rounded-lg border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={item.caption ?? "Lihat foto galeri"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url}
              alt={item.caption ?? "Foto galeri HIMASAL Probolinggo"}
              loading="lazy"
              className="size-full object-cover transition-transform group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl" showCloseButton>
          <DialogTitle className="sr-only">
            {selected?.caption ?? "Foto galeri"}
          </DialogTitle>
          {selected ? (
            <div className="flex flex-col gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.image_url}
                alt={selected.caption ?? "Foto galeri HIMASAL Probolinggo"}
                className="max-h-[70vh] w-full rounded-md object-contain"
              />
              {selected.caption ? (
                <p className="text-sm text-foreground">{selected.caption}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {formatDateID(selected.created_at)}
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

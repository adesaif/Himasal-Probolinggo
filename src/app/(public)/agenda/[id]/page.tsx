import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";

import { createPublicClient } from "@/lib/supabase/public";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEventRange } from "@/lib/format-date";

export const revalidate = 300;

async function getEvent(id: string) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("events")
    .select("title, description, location, start_at, end_at, is_mandatory")
    .eq("id", id)
    .eq("status", "published")
    .single();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return { title: "Agenda tidak ditemukan" };
  return { title: event.title, description: event.description ?? undefined };
}

export default async function AgendaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link href="/agenda">
          <ArrowLeft />
          Kembali ke Agenda
        </Link>
      </Button>

      <div className="flex flex-col gap-3">
        {event.is_mandatory ? (
          <Badge variant="warning" className="w-fit">
            Wajib Hadir
          </Badge>
        ) : null}
        <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
          {event.title}
        </h1>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
            {formatEventRange(event.start_at, event.end_at)}
          </div>
          {event.location ? (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
              {event.location}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {event.description ? (
        <div className="flex flex-col gap-5 text-base leading-relaxed text-foreground sm:text-[17px]">
          {event.description
            .split(/\n{2,}/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((paragraph, i) => (
              <p key={i} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
        </div>
      ) : null}
    </div>
  );
}

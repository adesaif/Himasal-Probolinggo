import type { CSSProperties, ReactNode } from "react";

import {
  personInitials,
  type OrganizationLayout,
  type StructureGroup,
  type StructurePerson,
} from "@/lib/organization-structure";
import { cn } from "@/lib/utils";

/*
 * Tampilan publik struktur organisasi. Satu DOM untuk semua ukuran layar:
 * - < md: tumpukan bertingkat dengan garis vertikal di kiri (rail + titik
 *   per tingkat) - bukan diagram desktop yang diperkecil.
 * - >= md: diagram terpusat (penasehat -> pimpinan -> pengurus inti ->
 *   bidang) dengan konektor tipis.
 * Semua garis/titik bersifat dekoratif (aria-hidden); urutan & makna tetap
 * terbaca dari heading dan list. Kartu tidak interaktif.
 */

type AvatarSize = "leader" | "advisory" | "member";

const AVATAR_SIZE: Record<AvatarSize, string> = {
  leader: "size-28 text-3xl md:size-32 md:text-4xl",
  advisory: "size-16 text-lg",
  member: "size-11 text-sm",
};

const AVATAR_FALLBACK: Record<AvatarSize, string> = {
  // Navy -> biru HIMASAL; di dark mode --brand-text-himasal berubah terang,
  // jadi pakai --secondary (navy gelap) sebagai pangkal gradien.
  leader:
    "bg-gradient-to-br from-brand-text-himasal to-primary text-white dark:from-secondary dark:to-primary",
  advisory: "bg-secondary text-secondary-foreground ring-1 ring-primary/20",
  member: "bg-accent text-accent-foreground ring-1 ring-primary/15",
};

function Avatar({
  person,
  size,
  priority = false,
}: {
  person: StructurePerson;
  size: AvatarSize;
  priority?: boolean;
}) {
  const base = cn("shrink-0 rounded-full", AVATAR_SIZE[size]);
  if (person.foto_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.foto_url}
        alt={person.nama}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cn(base, "bg-muted object-cover object-[50%_20%]")}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        base,
        "flex items-center justify-center font-semibold tracking-wide select-none",
        AVATAR_FALLBACK[size],
      )}
    >
      {personInitials(person.nama)}
    </span>
  );
}

/** Satu tingkat hierarki; di mobile membawa rail + titik penanda di kiri. */
function Tier({
  children,
  railStyle,
  node = "ring",
  last = false,
}: {
  children: ReactNode;
  railStyle?: "solid" | "dashed";
  node?: "ring" | "filled";
  last?: boolean;
}) {
  return (
    <div className={cn("relative pl-8 md:pl-0", !last && "pb-10 md:pb-0")}>
      {!last ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-4 -bottom-2 left-[11px] border-l md:hidden",
            railStyle === "dashed" ? "border-dashed border-primary/35" : "border-primary/30",
          )}
        />
      ) : null}
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1.5 left-1.5 size-3 rounded-full border-2 border-primary md:hidden",
          node === "filled" ? "bg-primary" : "bg-background",
        )}
      />
      {children}
    </div>
  );
}

/** Garis penghubung antar tingkat, hanya di layout diagram (>= md). */
function Connector({ dashed = false, className }: { dashed?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mx-auto hidden w-0 border-l md:block",
        dashed ? "h-10 border-dashed border-primary/35" : "h-8 border-primary/35",
        className,
      )}
    />
  );
}

function TierHeading({
  id,
  title,
  meta,
  className,
}: {
  id: string;
  title: string;
  meta?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-center gap-4 md:justify-center", className)}>
      <span aria-hidden="true" className="hidden h-px w-10 bg-border md:block lg:w-16" />
      <div className="flex items-baseline gap-2.5">
        <h2
          id={id}
          className="text-lg font-semibold tracking-tight text-brand-text-himasal md:text-xl"
        >
          {title}
        </h2>
        {meta ? <span className="text-sm text-muted-foreground">{meta}</span> : null}
      </div>
      <span aria-hidden="true" className="hidden h-px w-10 bg-border md:block lg:w-16" />
    </div>
  );
}

function AdvisoryPanel({ group, index }: { group: StructureGroup; index: number }) {
  const id = `struktur-penasehat-${index}`;
  return (
    <section
      aria-labelledby={id}
      className="rounded-3xl border border-dashed border-primary/30 bg-card/80 px-4 py-6 sm:px-6 md:px-8"
    >
      <h2
        id={id}
        className="text-center text-lg font-semibold tracking-tight text-brand-text-himasal md:text-xl"
      >
        {group.label}
      </h2>
      <ul className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-6">
        {group.members.map((person) => (
          <li
            key={person.id}
            className="flex w-[calc(50%-0.5rem)] flex-col items-center text-center sm:w-36"
          >
            <Avatar person={person} size="advisory" />
            <p className="mt-3 text-sm leading-snug font-medium break-words text-foreground">
              {person.nama}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LeaderCard({ person }: { person: StructurePerson }) {
  return (
    <section aria-labelledby="struktur-pimpinan" className="mx-auto w-full md:max-w-sm">
      <div className="relative overflow-hidden rounded-3xl border bg-card px-6 pt-8 pb-7 text-center shadow-[0_1px_3px_var(--header-elevation),0_12px_32px_-16px_var(--header-elevation)]">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-primary" />
        <div className="mx-auto w-fit rounded-full p-1 ring-1 ring-primary/25">
          <Avatar person={person} size="leader" priority />
        </div>
        <h2
          id="struktur-pimpinan"
          className="mt-5 text-xl leading-snug font-semibold tracking-tight break-words text-brand-text-himasal md:text-2xl"
        >
          {person.nama}
        </h2>
        <p className="mt-2 flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          <span aria-hidden="true" className="h-px w-4 bg-brand-gold" />
          {person.jabatan}
          <span aria-hidden="true" className="h-px w-4 bg-brand-gold" />
        </p>
      </div>
    </section>
  );
}

function MemberRow({ person, showJabatan }: { person: StructurePerson; showJabatan: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar person={person} size="member" />
      <div className="min-w-0">
        <p className="text-sm leading-snug font-semibold break-words text-foreground">
          {person.nama}
        </p>
        {showJabatan ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{person.jabatan}</p>
        ) : null}
      </div>
    </div>
  );
}

// Garis cabang hanya digambar jika semua kolom muat dalam satu baris.
const hasFork = (columns: StructureGroup[]) => columns.length >= 2 && columns.length <= 4;

function CoreColumns({ columns }: { columns: StructureGroup[] }) {
  const fork = hasFork(columns);
  return (
    <ul
      className={cn(
        "grid gap-y-6",
        fork
          ? "md:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
          : "gap-x-4 md:grid-cols-2 lg:grid-cols-3",
      )}
      style={{ "--cols": columns.length } as CSSProperties}
    >
      {columns.map((column, i) => (
        <li key={column.key} className={cn("relative", fork && "md:px-2 md:pt-8 lg:px-3")}>
          {fork ? (
            <>
              <span
                aria-hidden="true"
                className="absolute top-0 hidden border-t border-primary/35 md:block"
                style={{
                  left: i === 0 ? "50%" : 0,
                  right: i === columns.length - 1 ? "50%" : 0,
                }}
              />
              <span
                aria-hidden="true"
                className="absolute top-0 left-1/2 hidden h-8 border-l border-primary/35 md:block"
              />
            </>
          ) : null}
          <h3 className="mb-3 text-xs font-semibold tracking-[0.16em] text-primary uppercase md:text-center">
            {column.label}
          </h3>
          <ul className="flex flex-col gap-2.5">
            {column.members.map((person) => (
              <li
                key={person.id}
                className="rounded-xl border bg-card px-3.5 py-3 transition-colors hover:border-primary/30 motion-reduce:transition-none"
              >
                <MemberRow person={person} showJabatan />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function DivisionGrid({ divisions }: { divisions: StructureGroup[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {divisions.map((division) => (
        <li
          key={division.key}
          className="flex flex-col rounded-2xl border bg-card transition-colors hover:border-primary/30 motion-reduce:transition-none"
        >
          <div className="flex items-start justify-between gap-3 border-b px-4 py-3.5">
            <div className="flex min-w-0 items-start gap-2.5">
              <span aria-hidden="true" className="mt-1 h-4 w-1 shrink-0 rounded-full bg-primary" />
              <h3 className="leading-snug font-semibold break-words text-foreground">
                {division.label}
              </h3>
            </div>
            <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
              {division.members.length} orang
            </span>
          </div>
          <ul className="divide-y px-4">
            {division.members.map((person) => (
              <li key={person.id} className="py-3">
                {/* Jabatan anggota = nama bidang (judul kartu), jadi tidak diulang. */}
                <MemberRow person={person} showJabatan={false} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export function OrganizationStructure({ layout }: { layout: OrganizationLayout }) {
  const { advisory, leader, core, divisions } = layout;
  const tiers: { key: string; node: "ring" | "filled"; dashed: boolean; content: ReactNode }[] =
    [];

  if (advisory.length > 0) {
    tiers.push({
      key: "advisory",
      node: "ring",
      dashed: true,
      content: (
        <div className="flex flex-col gap-4 md:flex-row md:justify-center">
          {advisory.map((group, i) => (
            <div key={group.key} className="md:max-w-4xl md:flex-1">
              <AdvisoryPanel group={group} index={i} />
            </div>
          ))}
        </div>
      ),
    });
  }

  if (leader) {
    tiers.push({
      key: "leader",
      node: "filled",
      dashed: false,
      content: (
        <>
          {advisory.length > 0 ? <Connector dashed /> : null}
          <LeaderCard person={leader} />
        </>
      ),
    });
  }

  if (core.length > 0) {
    tiers.push({
      key: "core",
      node: "ring",
      dashed: false,
      content: (
        <section aria-labelledby="struktur-inti">
          <Connector />
          <TierHeading id="struktur-inti" title="Dewan Harian" className="md:my-2" />
          {hasFork(core) ? <Connector className="h-5" /> : null}
          <CoreColumns columns={core} />
        </section>
      ),
    });
  }

  if (divisions.length > 0) {
    tiers.push({
      key: "divisions",
      node: "ring",
      dashed: false,
      content: (
        <section aria-labelledby="struktur-bidang" className="md:mt-14">
          <TierHeading
            id="struktur-bidang"
            title="Management"
            meta={`${divisions.length} bidang`}
          />
          <DivisionGrid divisions={divisions} />
        </section>
      ),
    });
  }

  return (
    <div>
      {tiers.map((tier, i) => {
        const next = tiers[i + 1];
        return (
          <Tier
            key={tier.key}
            node={tier.node}
            // Segmen rail menuju pimpinan putus-putus: penasehat bukan garis komando.
            railStyle={tier.dashed && next?.key === "leader" ? "dashed" : "solid"}
            last={!next}
          >
            {tier.content}
          </Tier>
        );
      })}
    </div>
  );
}

// Distribusi alumni per Kecamatan (master lokasi yang sama dengan Admin ->
// Alumni). Bar horizontal dengan angka jumlah di setiap baris - 24 kecamatan
// + "Belum Dipetakan" tetap terbaca di layar sempit, tanpa JS client.

export type KecamatanCount = { id: string | null; nama: string; total: number };

export function KecamatanDistribution({
  rows,
  totalAlumni,
}: {
  rows: KecamatanCount[];
  totalAlumni: number;
}) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  const sum = rows.reduce((acc, r) => acc + r.total, 0);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => {
          const unmapped = r.id === null;
          return (
            <li
              key={r.id ?? "belum-dipetakan"}
              className="grid grid-cols-[minmax(6.5rem,9rem)_1fr_2.5rem] items-center gap-2 text-sm"
            >
              <span className={unmapped ? "truncate italic text-muted-foreground" : "truncate"}>
                {r.nama}
              </span>
              <span className="h-2.5 overflow-hidden rounded-full bg-muted">
                <span
                  className={`block h-full rounded-full ${unmapped ? "bg-muted-foreground/50" : "bg-primary"}`}
                  style={{ width: `${(r.total / max) * 100}%` }}
                />
              </span>
              <span className="text-right font-medium tabular-nums">{r.total}</span>
            </li>
          );
        })}
      </ul>
      <p className="border-t pt-2 text-xs text-muted-foreground">
        Total terpetakan + belum dipetakan: <span className="font-medium text-foreground">{sum}</span>{" "}
        alumni
        {sum === totalAlumni ? " (sama dengan Total Alumni)" : ` (Total Alumni: ${totalAlumni})`}
      </p>
    </div>
  );
}

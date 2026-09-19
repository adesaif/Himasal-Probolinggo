export function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Modul ini akan dibangun pada fase implementasi berikutnya.
      </p>
    </div>
  );
}

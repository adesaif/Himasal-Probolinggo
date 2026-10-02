const LOGO_SRC = "/brand/himasal-logo.png";
const LOGO_ASPECT_RATIO = 1151 / 1381;

/**
 * Logo resmi HIMASAL Probolinggo (aset asli, jangan pernah diganti/digambar
 * ulang). Ukuran diatur lewat `heightClassName` (tinggi), lebar mengikuti
 * aspect ratio asli agar tidak gepeng. `plate` menambah backing putih agar
 * tetap kontras di dark mode tanpa mengubah file logo itu sendiri.
 */
export function HimasalLogo({
  heightClassName = "h-8",
  plate = false,
  className,
}: {
  heightClassName?: string;
  plate?: boolean;
  className?: string;
}) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      alt="Logo HIMASAL Probolinggo"
      width={Math.round(200 * LOGO_ASPECT_RATIO)}
      height={200}
      className={`w-auto ${heightClassName} ${className ?? ""}`}
    />
  );

  if (!plate) return img;

  return (
    <span className="inline-flex shrink-0 rounded-md bg-white p-0.5 dark:bg-white/95">
      {img}
    </span>
  );
}

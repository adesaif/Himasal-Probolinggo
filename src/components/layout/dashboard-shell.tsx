import { LogoutButton } from "@/components/shared/logout-button";
import { HimasalLogo } from "@/components/shared/himasal-logo";

export function DashboardShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <HimasalLogo heightClassName="h-8" />
            <span>
              HIMASAL Probolinggo — {title}
            </span>
          </span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}

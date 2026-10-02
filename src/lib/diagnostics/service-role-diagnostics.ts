import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// DIAGNOSTIK SEMENTARA - hapus file ini bersama
// src/app/api/admin/diagnostics/service-role/route.ts setelah selesai.
//
// Hanya memeriksa APAKAH SUPABASE_SERVICE_ROLE_KEY tersedia di tiap sumber.
// Hasilnya murni boolean: tidak pernah ada nilai, prefix, panjang, potongan,
// atau hash secret yang dikembalikan maupun di-log.

const KEY = "SUPABASE_SERVICE_ROLE_KEY";
// Penanda non-rahasia: menunjukkan apakah runtime variables lain sampai ke
// Worker (NEXT_PUBLIC_* biasanya di-inline saat build, bukan binding).
const CONTROL_KEY = "NEXT_PUBLIC_SUPABASE_URL";

function present(value: unknown): boolean {
  return typeof value === "string" && value.length > 0;
}

/** Ada nama binding yang mirip (beda huruf besar/kecil/spasi) tapi tidak persis sama. */
function hasNearMissName(env: Record<string, unknown> | null): boolean {
  if (!env) return false;
  return Object.keys(env).some(
    (name) => name !== KEY && name.trim().toUpperCase() === KEY,
  );
}

export type ServiceRoleDiagnostics = {
  cloudflareContext: boolean;
  cloudflareBinding: boolean;
  globalWorkerEnvModule: boolean;
  globalWorkerEnv: boolean;
  processEnv: boolean;
  bindingNearMissName: boolean;
  controlPublicUrlInBinding: boolean;
  controlPublicUrlInProcessEnv: boolean;
};

export async function collectServiceRoleDiagnostics(): Promise<ServiceRoleDiagnostics> {
  // 1. getCloudflareContext().env
  let cfEnv: Record<string, unknown> | null = null;
  try {
    cfEnv = getCloudflareContext().env as unknown as Record<string, unknown>;
  } catch {
    cfEnv = null;
  }

  // 2. import { env } from "cloudflare:workers" - specifier dirakit saat
  // runtime supaya Next/OpenNext tidak mencoba me-resolve modul bawaan
  // workerd ini saat build; di luar workerd import ini gagal -> false.
  let workerEnv: Record<string, unknown> | null = null;
  try {
    const specifier = ["cloudflare", "workers"].join(":");
    const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ specifier)) as {
      env?: Record<string, unknown>;
    };
    workerEnv = mod.env ?? null;
  } catch {
    workerEnv = null;
  }

  // 3. process.env
  return {
    cloudflareContext: cfEnv !== null,
    cloudflareBinding: present(cfEnv?.[KEY]),
    globalWorkerEnvModule: workerEnv !== null,
    globalWorkerEnv: present(workerEnv?.[KEY]),
    processEnv: present(process.env[KEY]),
    bindingNearMissName: hasNearMissName(cfEnv) || hasNearMissName(workerEnv),
    controlPublicUrlInBinding: present(cfEnv?.[CONTROL_KEY]),
    controlPublicUrlInProcessEnv: present(process.env[CONTROL_KEY]),
  };
}

# HIMASAL Probolinggo

Website & sistem informasi resmi **Himpunan Alumni Santri Lirboyo (HIMASAL) Probolinggo**: profil organisasi, berita, agenda, absensi kegiatan berbasis QR, materi Fiqh, dan bank soal — dengan tiga role (Alumni, Admin, Super Admin).

> Status: **Fase 0 — fondasi proyek.** Fitur di atas dibangun bertahap pada fase-fase berikutnya. Lihat [`ARSITEKTUR & ROADMAP`](#roadmap-fase-implementasi) di bawah.

## Tech Stack

| Layer | Pilihan |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling / UI | Tailwind CSS v4 + shadcn/ui (Radix) |
| Backend | Supabase (Postgres, Auth, Storage, RLS) |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` |
| Package manager | npm |

## Struktur Folder

```
src/
├── app/
│   ├── (public)/        # Beranda, Profil, Struktur, Berita, Agenda, Masayikh, Galeri, Kontak
│   ├── (auth)/           # login, reset-password
│   ├── (alumni)/dashboard/   # profil, agenda, fiqh, bank-soal, absensi/scan, riwayat
│   ├── (admin)/admin/        # konten, alumni, agenda, fiqh, bank-soal, absensi, laporan
│   └── (super-admin)/monitoring/  # dashboard read-only, laporan
├── components/{ui,layout,charts,forms,shared}/
├── lib/
│   ├── supabase/{client.ts,server.ts,middleware.ts}
│   ├── auth/
│   ├── validators/
│   └── constants.ts
├── hooks/
├── types/database.types.ts
└── middleware.ts
supabase/
├── migrations/     # SQL migration, dijalankan berurutan berdasarkan timestamp
└── config.toml      # konfigurasi Supabase CLI untuk local dev
```

Route group (`(public)`, `(auth)`, dst.) tidak menambah segmen URL — hanya memisahkan layout & memudahkan proteksi akses per role.

## Local Setup

Prasyarat: Node.js 20+, npm.

```bash
npm install
cp .env.example .env.local   # isi sesuai bagian "Environment Variables" di bawah
npm run dev
```

Buka http://localhost:3000.

## Environment Variables

Lihat `.env.example`. **Jangan pernah commit `.env.local`** (sudah di-ignore lewat `.gitignore`).

| Variable | Wajib untuk | Sumber |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client & server | Dashboard Supabase project **Himasal Probolinggo** → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & server | Sama seperti di atas (anon/public key, aman diekspos — dilindungi RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only (Server Action/Route Handler) | Sama seperti di atas (**secret**, jangan pernah diekspos ke browser/commit ke Git) |
| `NEXT_PUBLIC_SITE_URL` | Link reset password/undangan akun | `http://localhost:3000` untuk lokal, domain produksi saat deploy |

Untuk deployment di Cloudflare, nilai-nilai ini **tidak** disimpan di `wrangler.jsonc`, melainkan lewat `wrangler secret put <NAME>` (untuk secret) atau environment variable di dashboard Cloudflare Workers (lihat bagian [Cloudflare Deployment](#cloudflare-deployment)).

## Supabase Setup

Project Supabase yang dipakai aplikasi ini **harus** bernama **"Himasal Probolinggo"** — bukan project `ruangberita` atau project lain milik pemilik akun.

1. Ambil `Project URL` dan `anon public key` dari Dashboard Supabase project Himasal Probolinggo → **Project Settings → API**, isi ke `.env.local`.
2. Ambil `service_role key` dari halaman yang sama — **hanya untuk `.env.local`/secret server, jangan pernah ke client atau Git.**
3. Jalankan migration (lihat bagian berikutnya).
4. (Opsional, Fase 1) Aktifkan **Auth Hook "Custom Access Token"** untuk meng-embed `role` dari `profiles` ke JWT, supaya middleware bisa cek role tanpa round-trip DB.

## Database Migration

Migration Fase 0 (`supabase/migrations/`) membangun fondasi role & keamanan:

1. `extensions_and_helpers.sql` — extension `pgcrypto` + helper `set_updated_at()`.
2. `profiles_and_roles.sql` — tabel `profiles`, enum `app_role`, trigger auto-create profil saat signup, helper RLS (`current_app_role`, `is_admin`, `is_super_admin`), RPC `update_own_profile`.
3. `audit_logs.sql` — tabel log tindakan penting, read-only dari sisi client.
4. `admin_set_role_rpc.sql` — satu-satunya jalur mengubah role (`admin_set_role`), dengan aturan hanya Super Admin yang boleh menetapkan role `super_admin`.
5. `wilayah.sql` — master data wilayah (Probolinggo Barat/Tengah/Timur), dapat ditambah Admin nanti.

**Migration ini belum diterapkan ke project Supabase manapun** — hanya berupa file SQL di repository. Untuk menerapkannya ke project Himasal Probolinggo:

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF_HIMASAL>
npx supabase db push
```

`<PROJECT_REF_HIMASAL>` dilihat dari URL dashboard Supabase project **Himasal Probolinggo** (bukan `ruangberita`). Pastikan `npx supabase projects list` menunjukkan project yang benar sebelum `db push`.

Alternatif: jalankan isi tiap file `.sql` secara berurutan lewat **SQL Editor** di dashboard Supabase project Himasal Probolinggo.

Setelah migration diterapkan, generate types:

```bash
npx supabase gen types typescript --project-id <PROJECT_REF_HIMASAL> > src/types/database.types.ts
```

## Authentication

- Satu halaman **Login** untuk semua role (Alumni, Admin, Super Admin) — tidak ada pilihan role di UI.
- Supabase Auth dengan **email + password**. Alumni **tidak** memakai NIK sebagai credential.
- Alur pembuatan akun: **Admin input data alumni terlebih dahulu** (tabel `alumni`, Fase 2), lalu mengundang akun lewat Supabase Admin API (invite link, server-side, memakai `service_role` key) — **Admin tidak pernah melihat/mengetahui password** karena alumni mengatur password sendiri saat aktivasi pertama.
- Reset password memakai alur bawaan Supabase Auth (`resetPasswordForEmail`) berbasis email.
- Setelah login, redirect otomatis berdasarkan `profiles.role`: Alumni → `/dashboard`, Admin → `/admin`, Super Admin → `/monitoring`.
- Detail implementasi (form, invite flow, reset password) dibangun pada **Fase 1**.

## Roles

| Role | Sifat |
|---|---|
| `alumni` | Akses data & fitur milik sendiri (profil, agenda, Fiqh, bank soal, absensi QR, riwayat) |
| `admin` | Pengelola/operator — CRUD konten, data alumni, agenda, Fiqh, bank soal, absensi, generate QR |
| `super_admin` | **Read-only** — dashboard monitoring & laporan. Tidak bisa CRUD, generate QR, atau mengubah data. Satu-satunya aksi tulis yang diizinkan: menetapkan role `super_admin` ke user lain (lewat RPC `admin_set_role`, sebagai mekanisme khusus). |

Role disimpan di `public.profiles.role` dan **tidak pernah diubah lewat `UPDATE` langsung** — hanya lewat RPC `admin_set_role` yang menegakkan aturan di atas di level database.

## Row Level Security (RLS)

Prinsip: **default deny**, RLS aktif di semua tabel, otorisasi ditegakkan berlapis:

1. **Middleware** (`src/middleware.ts`) — memblokir akses route `/dashboard`, `/admin`, `/monitoring` untuk user yang belum login (pengecekan role granular menyusul Fase 1).
2. **Server Action / Route Handler** — mengecek ulang role sebelum memanggil Supabase (tidak hanya menyembunyikan tombol di UI).
3. **RLS di database** — lapisan terakhir, tetap aktif meski dua lapisan di atas ter-bypass.

Ringkasan kebijakan yang sudah ada (Fase 0):

- `profiles`: user hanya bisa `SELECT` baris miliknya; Admin & Super Admin bisa `SELECT` semua. Tidak ada policy `UPDATE` langsung dari client — perubahan data sendiri lewat RPC `update_own_profile`, perubahan role lewat RPC `admin_set_role`.
- `audit_logs`: hanya bisa dibaca (Admin & Super Admin sesuai permission), hanya bisa ditulis lewat fungsi `SECURITY DEFINER` (tidak ada policy `INSERT` untuk client).
- `wilayah`: bisa dibaca semua user login; hanya Admin yang bisa insert/update.

Kebijakan untuk tabel alumni, agenda, absensi, Fiqh, dan bank soal dirancang dengan prinsip yang sama dan akan ditambahkan pada fase modul masing-masing.

## Cloudflare Deployment

Project Cloudflare Workers: **`himasal-probolinggo`** (lihat `wrangler.jsonc`). Deploy memakai [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare).

```bash
npx wrangler login          # login ke akun Cloudflare Anda
npm run preview             # build + jalankan preview lokal di Workers runtime
npm run deploy               # build + deploy ke Cloudflare Workers
```

- Tahap awal memakai subdomain `*.workers.dev` bawaan Cloudflare. Domain custom ditambahkan kemudian lewat dashboard Cloudflare (Workers → Triggers → Custom Domain) tanpa perlu mengubah kode.
- **Secret** (`SUPABASE_SERVICE_ROLE_KEY`, dll) diset lewat `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`, **tidak pernah** ditulis di `wrangler.jsonc` atau file yang di-commit.
- Variable publik (`NEXT_PUBLIC_*`) sudah aman ditanam saat build karena memang untuk client; tetap tidak disimpan sebagai secret.
- `wrangler.jsonc` menggunakan `nodejs_compat` agar Next.js dapat berjalan di Cloudflare Workers runtime.

## GitHub Workflow

- Repository utama: **`adesaif/Himasal-Probolinggo`** — satu-satunya repository development untuk proyek ini.
- Branch kerja saat ini: `claude/himasal-website-system-g3n3nl`.
- Commit dengan pesan jelas per perubahan; hindari force-push ke branch bersama.
- Belum ada CI/CD otomatis (deploy manual di tahap awal, sesuai keputusan). GitHub Actions untuk lint/typecheck/deploy dapat ditambahkan di fase berikutnya jika disetujui.

## Troubleshooting

| Gejala | Kemungkinan penyebab |
|---|---|
| `Error: supabaseUrl is required` | `.env.local` belum diisi / server belum di-restart setelah mengubah env |
| Redirect loop di `/login` | Middleware belum melihat session — pastikan cookie Supabase tidak diblokir browser |
| `relation "public.profiles" does not exist` | Migration belum diterapkan ke project Supabase yang sedang dipakai |
| Build Cloudflare gagal karena API Node.js | Pastikan `compatibility_flags: ["nodejs_compat"]` ada di `wrangler.jsonc` |

## Backup / Migration Data

- Backup database: gunakan fitur **Database Backups** bawaan Supabase (dashboard project Himasal Probolinggo), atau `pg_dump` manual via connection string dari dashboard.
- Perubahan skema **selalu** lewat file baru di `supabase/migrations/` (jangan edit migration lama yang sudah diterapkan) agar histori dapat direplay di environment lain.

## Development Workflow

1. Kerjakan di branch fitur, commit bertahap dengan pesan jelas.
2. Jalankan `npm run lint` dan `npm run typecheck` sebelum push.
3. Setiap fase besar (lihat roadmap) direview sebelum lanjut ke fase berikutnya.

## Roadmap Fase Implementasi

- **Fase 0 (selesai):** scaffold Next.js/Tailwind/shadcn, struktur folder, Supabase client, middleware dasar, konfigurasi Cloudflare, migration fondasi role & RLS.
- **Fase 1:** Auth & Roles — form login, invite akun, reset password, redirect per role.
- **Fase 2:** Data Alumni & Wilayah.
- **Fase 3:** Website publik & manajemen konten.
- **Fase 4:** Agenda & Absensi QR.
- **Fase 5:** Fiqh & Bank Soal.
- **Fase 6:** Dashboard monitoring Super Admin.
- **Fase 7:** Polish UI/UX & security hardening.
- **Fase 8:** Deployment produksi.

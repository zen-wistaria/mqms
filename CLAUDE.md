# MQMS — MikroTik Queue Management System

## Stack
- **Framework:** Next.js 15.5 (App Router, Turbopack)
- **Runtime:** Bun
- **Language:** TypeScript
- **Database:** SQLite via Prisma + libSQL adapter
- **Auth:** better-auth (email/password + username plugin, bcrypt-ts)
- **State:** TanStack React Query v5
- **Styling:** Tailwind CSS + class-variance-authority + clsx
- **UI:** base-ui/react + custom components (shadcn/ui style)
- **Icons:** lucide-react
- **Charts:** recharts
- **Lint/Format:** Biome (recommended preset, indent: tab, quotes: double)
- **HTTP:** axios
- **QR:** qrcode (offline)
- **VPN:** WireGuard (wg/wg-quick via wireguard-tools)

## Project Structure
```
src/
├── app/
│   ├── (auth)/              # login, register
│   ├── (dashboard)/         # home, queues, routers, settings, hotspot, users, vpn
│   │   ├── hotspot/         # active, generate, profiles, users, batch, ip-binding
│   │   ├── users/           # manajemen user & RBAC (admin only)
│   │   └── vpn/             # WireGuard VPN management (admin only)
│   └── api/                 # REST routes: auth, queues, routers, dashboard, cron, hotspot, settings, users, vpn
├── components/
│   ├── ui/                  # shadcn-style primitives (button, card, dialog, sidebar, table, etc.)
│   ├── charts/              # recharts components
│   ├── dashboard/           # dashboard widgets
│   ├── voucher/             # print templates + QR + custom HTML
│   └── providers/           # React context providers (query-provider)
├── lib/                     # prisma, auth, auth-client, permissions, mikrotik, wireguard, encryption, format, utils, validations
├── hooks/                   # custom hooks (use-mobile)
└── worker/                  # background workers (syncer, poller)
```

## Routes
| Path | Deskripsi | Role |
|------|-----------|------|
| `/login`, `/register` | Halaman auth (public) — email atau username | public |
| `/` | Dashboard utama + live queue (polling 1-5 detik) | all |
| `/queues` | Daftar queue | all |
| `/queues/[id]` | Detail queue (daily, usage, export) | all |
| `/routers` | Daftar router | all (user: assigned only) |
| `/routers/[id]` | Detail router + queues + test + command | all (user: assigned only) |
| `/hotspot` | Halaman utama hotspot | all |
| `/hotspot/active` | Hotspot active users + kick | all |
| `/hotspot/generate` | Generate voucher (batch, QR, print) | all |
| `/hotspot/profiles` | Hotspot profiles | all |
| `/hotspot/users` | Hotspot users (CRUD, batch action, print) | all |
| `/hotspot/ip-binding` | IP binding management | all |
| `/hotspot/batch` | Batch management | all |
| `/settings` | Pengaturan aplikasi + data cleanup | all (cleanup: per-role) |
| `/users` | Manajemen user, role, assign router | admin only |
| `/vpn` | WireGuard VPN management | admin only |

## API Routes
| Endpoint | Method | Fungsi | Role |
|----------|--------|--------|------|
| `/api/auth/[...all]` | * | better-auth handler | public |
| `/api/routers` | GET/POST | List/tambah router | GET: all, POST: admin |
| `/api/routers/[id]` | GET/PUT/DELETE | Detail/edit/hapus router | GET: all, PUT/DEL: admin |
| `/api/routers/[id]/queues` | GET | Queue per router | all |
| `/api/routers/[id]/test` | GET | Test koneksi router | all |
| `/api/routers/[id]/command` | POST | Eksekusi command REST API | all |
| `/api/queues` | GET | Daftar queue (filter by accessible routers) | all |
| `/api/queues/live` | GET | Live queue langsung dari router | all |
| `/api/queues/[id]` | GET | Detail queue | all |
| `/api/queues/[id]/daily` | GET | Daily usage | all |
| `/api/queues/[id]/usage` | GET | Usage history | all |
| `/api/queues/[id]/export` | GET | Export data queue | all |
| `/api/dashboard/stats` | GET | Statistik dashboard | all |
| `/api/cron/sync` | GET | Cron sync dari router | internal |
| `/api/cron/poll` | GET | Cron polling | internal |
| `/api/settings/cleanup` | POST | Cleanup data (admin: pilih router) | all (own) |
| `/api/hotspot/active` | GET/DELETE | List/kick active session | all |
| `/api/hotspot/hosts` | GET | Hotspot hosts | all |
| `/api/hotspot/servers` | GET | Hotspot servers | all |
| `/api/hotspot/users` | GET/POST/DELETE | CRUD hotspot users | all |
| `/api/hotspot/users/generate` | POST | Generate voucher batch | all |
| `/api/hotspot/users/[id]` | PATCH | Enable/disable/reset user | all |
| `/api/hotspot/profiles` | GET/POST | CRUD hotspot profiles | all |
| `/api/hotspot/bindings` | GET/POST/DELETE | CRUD IP binding | all |
| `/api/hotspot/batches` | GET | List batch by comment | all |
| `/api/hotspot/batches/[comment]` | DELETE | Hapus semua user dalam batch | all |
| `/api/users` | GET/POST | List/tambah user | admin only |
| `/api/users/[id]` | PATCH/DELETE | Edit/hapus user | admin only |
| `/api/users/[id]/role` | PATCH | Ubah role user | admin only |
| `/api/users/[id]/routers` | GET/POST | List/assign router ke user | admin only |
| `/api/users/[id]/routers/[routerId]` | DELETE | Remove router assignment | admin only |
| `/api/vpn/config` | GET/POST | Status/init WireGuard | admin only |
| `/api/vpn/config/start` | POST | Start WireGuard | admin only |
| `/api/vpn/config/stop` | POST | Stop WireGuard | admin only |
| `/api/vpn/peers` | GET/POST | List/tambah peer | admin only |
| `/api/vpn/peers/[id]` | PATCH/DELETE | Edit/hapus peer | admin only |
| `/api/vpn/peers/[id]/config` | GET | Download config peer | admin only |

## RBAC
- **Role:** `admin` / `user` (field `role` di model User)
- **Router assignment:** many-to-many via `RouterAssignment`
- **Admin:** bisa manage routers, users, VPN, assign router ke user
- **User:** cuma lihat router yang di-assign, hotspot tetap full akses
- **First-user:** user pertama register auto jadi admin
- **Helper:** `src/lib/permissions.ts` — `requireRole()`, `canAccessRouter()`, `getAccessibleRouterIds()`

## Commands
```bash
bun dev              # Start dev server (Turbopack)
bun build            # Build production
bun start            # Start production server
bun lint             # Biome check
bun format           # Biome check --write
bun worker           # Run worker
bun db:migrate       # Prisma migrate deploy
bun db:studio        # Prisma studio
bun db:seed          # Seed database
```

## Conventions
- **API routes:** Handler function (GET/POST/PUT/DELETE/PATCH) dengan NextResponse + error try/catch. Permission via `requireRole()` / `requireRouterAccess()` dari `src/lib/permissions.ts`.
- **Components:** Client components pakai "use client"; server component default. All hotspot pages are client components.
- **Auth:** better-auth middleware cek cookie `better-auth.session_token`, redirect ke `/login?callbackUrl=...`. Login bisa pake email atau username.
- **Biome:** Linter/formatter aktif di `src/**`, nonaktif di `src/components/ui/` (vendor components)
- **DB:** Prisma + SQLite via libSQL adapter. Queue history di-cleanup via settings.
- **Docker:** `oven/bun:alpine`, multi-stage build. Untuk WireGuard perlu `cap_add: NET_ADMIN` + `apk add wireguard-tools`.
- **Worker:** Polling router dan sync data ke DB. Tidak untuk live traffic (live traffic langsung dari REST API router).

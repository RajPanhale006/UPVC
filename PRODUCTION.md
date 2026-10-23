# Shivshakti ProERP — Production Deployment

Offline-first Next.js + Capacitor workshop app. No database server is required for core operation.

## Prerequisites

- Node.js 20+
- npm
- Android Studio (APK) or Xcode (iOS) for native builds

## Build & verify

```bash
npm install
npm run verify:all
npm run build
```

For mobile:

```bash
npm run build:android   # or build:apk
```

## Storage architecture

| Data | Location |
|------|----------|
| Jobs, quotations, settings | `localStorage` (browser / WebView) |
| PDF blobs | IndexedDB (`upvc-workshop-documents`) |
| ID counters | `localStorage` with client-side lock |

There is **no PostgreSQL/MySQL schema**. Back up user devices or export PDFs for archival.

## Optional server configuration

Copy `.env.example` to `.env.local` for local API routes:

- `EMAIL_PROVIDER` — name of provider to implement in `app/api/email/send/route.ts`
- `EMAIL_API_KEY` — server-only credential

Email is **not required** for workshop operation. When unconfigured, the UI opens the system mail client.

## Company settings

Configure under **Settings** tab (Admin role). Values flow into quotation PDF headers/footers dynamically.

## Roles (device-local)

Roles are stored in `localStorage` per device — suitable for trusted workshop devices, **not** for multi-user server deployment without a backend auth layer.

| Role | Access |
|------|--------|
| Admin | Full access, company settings, finalize documents |
| Manager | Jobs, products, documents, send quotations |
| Sales | Customer quotations (no internal costs) |
| Workshop | Labour sheets only |

## Backup recommendations

1. Export finalized quotation PDFs from **Documents** tab
2. Periodically copy browser profile / Capacitor app data on shared devices
3. Document job IDs (`JOB-YYYY-NNNN`) for customer correspondence

## Known production limitations

- No server-side permission enforcement (client-only roles)
- No secure public document URLs (WhatsApp shares text + local PDF)
- Labour / estimation PDF auto-registration to document history: quotation wired; others use same `registerGeneratedDocument()` hook when integrated
- Flat mullion double-door formula: verified against acceptance sample; deduction constant documented in `lib/cutting/door/constants.ts`

## Post-launch monitoring

- Run `npm run verify:all` after any calculation or PDF change
- Watch for IndexedDB quota errors on devices with large document history
- Monitor `/api/email/send` 501/400 responses if email is enabled

## Verification scripts

| Script | Purpose |
|--------|---------|
| `verify:cutting` | Sarik window reference samples |
| `verify:door-cutting` | Single/double door samples |
| `verify:units` | Feet/mm conversions |
| `verify:calculations` | Shared engine + validation |
| `verify:consistency` | Cross-module alignment |
| `verify:product-preview` | Preview architecture |
| `verify:workflow` | Job/document workflow |

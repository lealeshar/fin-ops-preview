# Enterprise Financial Operations Platform v5.1 — Claude Code Rules

## 7 כללים קריטיים — אין לסטות מהם

1. **אין כתיבה ישירה ל-DB** — הכל דרך `supabase.rpc()` דרך Repository בלבד. אין `supabase.from().insert/update/delete` מחוץ לקבצי `src/lib/repositories/`.

2. **organization_id בכל שאילתה** — בידוד מלא. כל RPC מקבל `p_organization_id`. הערך מגיע תמיד מ-`useAuth().organizationId`.

3. **Repository pattern בלבד** — אין `supabase.from()` מחוץ ל-`src/lib/repositories/`. כל גישה ל-DB עוברת דרך `BaseRepository.callRpc()` / `callReadRpc()`.

4. **Optimistic locking** — כל UPDATE עם `p_expected_version: row.version_number`. אם מוחזר שגיאת conflict — להציג הודעה למשתמש לרענן.

5. **Idempotency key** — בכל כתיבה. תמיד `generateIdempotencyKey()` מ-`src/utils/idempotency.ts`.

6. **financial_events append-only** — אין UPDATE/DELETE לעולם על טבלת `financial_events`. רק `rpc_append_financial_event`.

7. **Soft delete** — אין DELETE על ישויות פיננסיות/תפעוליות. שימוש ב-`rpc_archive_factory` / `rpc_archive_supervisor`. שדות `is_deleted`, `archived_at`, `inactive_reason`.

---

## State Machine — Jobs

- **תפעולי:** `Draft → Waiting_Match → Partial_Match → Matched | Cancelled`
- **חשבונאי:** `Pending_Approval → Approved → Queued_For_MASAV → Paid → Closed`
- **חוק מקשר:** מעבר ל-`Approved` / `Queued_For_MASAV` מחייב `operational_status = Matched`
- **נעילה:** `{Queued_For_MASAV, Paid, Closed}` — רשומות נעולות לחלוטין, אין עריכה

---

## Stack

React 18 + TypeScript strict mode (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`),  
Supabase + PostgreSQL, React Hook Form + Zod, TanStack Table v8, Vite 5.

---

## מבנה src/

```
src/
  types/          enums.ts, domain.types.ts, async.types.ts, database.types.ts
  lib/
    supabase/     client.ts
    repositories/ base, factories, supervisors, jobs, financial-events,
                  flex-field-definitions, system-settings, create-repositories, index
  contexts/       auth.context.tsx, repository.context.tsx
  hooks/          use-factories, use-supervisors, use-jobs, use-financial-events, use-system-settings
  schemas/        factory, supervisor, job, financial-event, system-setting
  components/
    ui/           table, form-field, error-banner, modal, status-badge
    factories/    factory-form, factories-table
    supervisors/  supervisor-form, supervisors-table
    jobs/         job-form, jobs-table, job-detail
    financial-events/ append-event-form
    settings/     settings-table, setting-form
  pages/          factories-page, supervisors-page, jobs-page, settings-page, login-page
  utils/          idempotency.ts, transitions.ts
  App.tsx, main.tsx, styles.css, vite-env.d.ts
```

---

## Migrations (supabase/migrations/)

| קובץ | תוכן |
|------|------|
| `20260531000001_initial_schema.sql` | 10 ENUMs, 12 טבלאות, composite PKs, seed allowed_transitions |
| `20260531000002_triggers.sql` | set_updated_at, increment_version, state_machine, audit_log, prevent_mutation |
| `20260531000003_rls.sql` | RLS על 12 טבלאות, current_organization_id() מ-JWT |
| `20260531000004_rpc.sql` | 13 SECURITY DEFINER RPCs לכתיבה |
| `20260531000005_read_rpc.sql` | 9 RPCs לקריאה |

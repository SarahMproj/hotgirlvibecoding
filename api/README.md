# HGVC Serverless API

Three Vercel functions backed by Supabase Postgres (project: Pallas Signal, schema: `hgvc`).

- `POST /api/signup` — WhatsApp Inner Circle signups (phone + archetype + qual) → `hgvc.signups`
- `POST /api/track`  — anonymized archetype distribution → `hgvc.quiz_events` (no PII)
- `GET  /api/stats`  — public aggregate counts via the `public.hgvc_stats()` RPC

## Vercel environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production + Preview + Development):

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://nughpxqzfoytibwzollp.supabase.co` |
| `SUPABASE_ANON_KEY` | **Anon public key** from Supabase → Project Settings → API → anon (safe to expose; bound by RLS) |

All privileged writes go through SECURITY DEFINER RPCs (`public.hgvc_track`, `public.hgvc_signup`) which validate input and enforce constraints server-side. No service-role key is needed.

After saving env vars, redeploy (or push any commit) and `/api/signup`, `/api/track`, `/api/stats` go live.

## Schema (lives in the `hgvc` schema, isolated from other Pallas tables)

| Object | Type | Purpose |
|---|---|---|
| `hgvc.quiz_events` | table | One row per completion / deep-link view. No PII. |
| `hgvc.signups`     | table | One row per WhatsApp signup, deduped by phone (upsert). |
| `public.hgvc_stats()` | RPC | Returns aggregate counts as JSON. Public-callable via anon key. |

Enums lock down values: `archetype_code` (V/A/C/S), `event_source` (quiz_complete/deep_link), `stage_code`, `goal_code`, `mkt_code`.

RLS is on for both tables — only the service-role key (used by the API routes) can read/write rows. The anon key only sees `hgvc_stats()`.

## Pulling the PR data

Anytime you want the live distribution:

```bash
curl https://hotgirlvibecoding.com/api/stats | jq
```

Returns:
```json
{
  "totals": { "V": 412, "A": 388, "C": 510, "S": 290 },
  "quiz_completes": { "V": 300, "A": 280, ... },
  "deep_links": { "V": 112, "A": 108, ... },
  "by_stage": { "traction:V": 88, "idea_stage:C": 210, ... },
  "by_goal": { "founder_track:V": 145, ... },
  "by_mkt":  { "high:V": 60, ... },
  "signups": { "V": 32, "A": 28, "C": 41, "S": 19 },
  "total_events": 1600,
  "total_signups": 120
}
```

## Exporting WhatsApp signups

Via the Supabase dashboard SQL editor:

```sql
SELECT phone, archetype, stage, goal, marketing_ready, created_at
FROM hgvc.signups
ORDER BY created_at DESC;
```

Or use the dashboard's **Table Editor → hgvc.signups → Export CSV**.

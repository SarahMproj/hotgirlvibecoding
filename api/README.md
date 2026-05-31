# HGVC Serverless API

Three Vercel serverless functions backing the quiz:

- `POST /api/signup` — WhatsApp Inner Circle signups (phone + archetype + qual)
- `POST /api/track` — anonymized archetype distribution tracking (NO phone, NO PII)
- `GET  /api/stats` — public read of aggregate counts (powers PR angle)

## One-time setup

The endpoints work without setup (they log + return ok), so the site never breaks. To actually persist data:

1. In Vercel project → **Storage** → **Create Database** → **KV** (Upstash Redis, free tier).
2. Click **Connect Project** and select this project. Vercel auto-injects these env vars:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`
   - `KV_URL`
3. Redeploy. That's it — both endpoints will start writing immediately.

## KV schema

| Key | Type | Purpose |
|---|---|---|
| `hgvc:counts:total` | hash | `{ V: n, A: n, C: n, S: n }` all-source totals |
| `hgvc:counts:quiz_complete` | hash | counts from real quiz takers |
| `hgvc:counts:deep_link` | hash | counts from `?result=` shared links |
| `hgvc:by_stage:{idea_stage\|building\|traction\|employed}` | hash | archetype × stage cross-tab |
| `hgvc:by_goal:{founder_track\|creator_track\|experimenter\|operator_track}` | hash | archetype × goal |
| `hgvc:by_mkt:{low\|medium\|high}` | hash | archetype × marketing-readiness |
| `hgvc:day:YYYY-MM-DD` | hash | per-day counts |
| `hgvc:signups` | list | full signup records (LPUSH, newest first) |
| `hgvc:signup_phones` | hash | `{ phone: archetype }` for dedupe |
| `hgvc:signups:counts` | hash | per-archetype signup counts |

## Exporting signups

In the Vercel KV dashboard, or via the CLI:

```bash
# Get all signups (newest first)
vercel kv lrange hgvc:signups 0 -1
```

## Free-tier limits (Upstash via Vercel KV)

- 30k commands/day, 256 MB storage on the free tier — comfortably handles thousands of quiz takers per day.
- Each quiz completion = ~4-6 commands. Each signup = ~3 commands.

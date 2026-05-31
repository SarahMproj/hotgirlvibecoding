// /api/track — anonymized archetype distribution tracking
// Counts archetypes + qualification breakdowns. NO phone, NO PII.
// Powers the PR angle: "X% of women in AI identify as Chaos Shippers"
//
// Storage: Vercel KV (Upstash Redis). Set KV_REST_API_URL + KV_REST_API_TOKEN
// in Vercel project env vars. If unset, the endpoint logs and 200s so the
// frontend never breaks during early setup.

import { kv } from '@vercel/kv';

export const config = { runtime: 'nodejs' };

const VALID_ARCHETYPES = new Set(['V', 'A', 'C', 'S']);
const VALID_SOURCES = new Set(['quiz_complete', 'deep_link']);

function bad(res, code, msg) {
  res.status(code).json({ ok: false, error: msg });
}

function corsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  corsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return bad(res, 405, 'method_not_allowed');

  // Body parsing — handle both Vercel-parsed objects and raw text/sendBeacon blobs
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return bad(res, 400, 'bad_json'); }
  } else if (!body || typeof body !== 'object') {
    // sendBeacon Blob: read raw stream
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    } catch { return bad(res, 400, 'bad_body'); }
  }

  const { archetype, source, stage, goal, marketing_ready } = body || {};
  if (!VALID_ARCHETYPES.has(archetype)) return bad(res, 400, 'bad_archetype');
  const src = VALID_SOURCES.has(source) ? source : 'quiz_complete';

  // If KV isn't configured yet, log and 200 so we never block the user
  if (!process.env.KV_REST_API_URL) {
    console.log('[track] KV not configured; payload:', { archetype, src, stage, goal, marketing_ready });
    return res.status(200).json({ ok: true, kv: false });
  }

  try {
    const pipeline = kv.pipeline();
    // Total counts per archetype (broken out by source)
    pipeline.hincrby(`hgvc:counts:${src}`, archetype, 1);
    pipeline.hincrby('hgvc:counts:total', archetype, 1);

    // Cross-tabs (only for real quiz completions, deep-links have no qual signal)
    if (src === 'quiz_complete') {
      if (stage)           pipeline.hincrby(`hgvc:by_stage:${stage}`, archetype, 1);
      if (goal)            pipeline.hincrby(`hgvc:by_goal:${goal}`, archetype, 1);
      if (marketing_ready) pipeline.hincrby(`hgvc:by_mkt:${marketing_ready}`, archetype, 1);
    }

    // Day buckets for trend lines later
    const day = new Date().toISOString().slice(0, 10);
    pipeline.hincrby(`hgvc:day:${day}`, archetype, 1);

    await pipeline.exec();
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[track] kv error:', err);
    // Still 200 — we don't want client retries piling up
    return res.status(200).json({ ok: true, kv: false, err: 'kv_write_failed' });
  }
}

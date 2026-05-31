// /api/stats — public read-only endpoint for archetype distribution data
// Powers the eventual PR landing page. No PII. Cached 60s at the edge.

import { kv } from '@vercel/kv';

export const config = { runtime: 'nodejs' };

function corsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
}

export default async function handler(req, res) {
  corsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  if (!process.env.KV_REST_API_URL) {
    return res.status(200).json({ ok: true, kv: false, totals: {}, signups: {} });
  }

  try {
    const [totals, completes, deeps, signups] = await Promise.all([
      kv.hgetall('hgvc:counts:total'),
      kv.hgetall('hgvc:counts:quiz_complete'),
      kv.hgetall('hgvc:counts:deep_link'),
      kv.hgetall('hgvc:signups:counts')
    ]);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      ok: true,
      totals: totals || {},
      quiz_completes: completes || {},
      deep_links: deeps || {},
      signups: signups || {},
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('[stats] kv error:', err);
    return res.status(500).json({ ok: false, error: 'kv_read_failed' });
  }
}

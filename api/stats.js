// /api/stats — public read-only aggregate counts for the PR landing page.
// No PII. Cached 60s at the edge.

import { getSupabase, corsHeaders } from './_supabase.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  corsHeaders(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const supa = getSupabase();
  if (!supa) {
    return res.status(200).json({ ok: true, supabase: false, totals: {}, signups: {} });
  }

  try {
    // Call a SQL function defined in the migration (returns aggregated JSON in one round-trip)
    const { data, error } = await supa.rpc('hgvc_stats');
    if (error) throw error;
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ ok: true, ...data, generated_at: new Date().toISOString() });
  } catch (err) {
    console.error('[stats] error:', err);
    return res.status(500).json({ ok: false, error: 'stats_failed' });
  }
}

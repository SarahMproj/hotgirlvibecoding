// /api/scan-stats — returns aggregated Perplexity QR scan analytics (no PII).
// Powers the /analytics dashboard. Calls public.hgvc_scan_stats() RPC.

import { getSupabase, corsHeaders } from './_supabase.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  corsHeaders(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const campaign = (req.query?.campaign || 'perplexity_computer').toString().slice(0, 80);

  const supa = getSupabase();
  if (!supa) return res.status(200).json({ ok: false, error: 'supabase_unconfigured' });

  try {
    const { data, error } = await supa.rpc('hgvc_scan_stats', { p_campaign: campaign });
    if (error) throw error;
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({ ok: true, stats: data });
  } catch (err) {
    console.error('[scan-stats] error:', err);
    return res.status(200).json({ ok: false, error: 'query_failed' });
  }
}

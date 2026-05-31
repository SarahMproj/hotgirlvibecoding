// /api/track — anonymized archetype distribution tracking
// Calls public.hgvc_track() RPC (SECURITY DEFINER) — validates server-side
// and inserts one row into hgvc.quiz_events. No PII.

import { getSupabase, corsHeaders, readJson, VALID_ARCHETYPES, VALID_SOURCES, VALID_STAGES, VALID_GOALS, VALID_MKT } from './_supabase.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  corsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const body = await readJson(req);
  if (!body) return res.status(400).json({ ok: false, error: 'bad_body' });

  const { archetype, source, stage, goal, marketing_ready, referrer } = body;
  if (!VALID_ARCHETYPES.has(archetype)) return res.status(400).json({ ok: false, error: 'bad_archetype' });

  const src = VALID_SOURCES.has(source) ? source : 'quiz_complete';

  const supa = getSupabase();
  if (!supa) {
    console.log('[track] Supabase not configured');
    return res.status(200).json({ ok: true, supabase: false });
  }

  try {
    const { data, error } = await supa.rpc('hgvc_track', {
      p_archetype: archetype,
      p_source: src,
      p_stage: src === 'quiz_complete' && VALID_STAGES.has(stage) ? stage : null,
      p_goal: src === 'quiz_complete' && VALID_GOALS.has(goal) ? goal : null,
      p_mkt: src === 'quiz_complete' && VALID_MKT.has(marketing_ready) ? marketing_ready : null,
      p_referrer: typeof referrer === 'string' ? referrer.slice(0, 500) : null
    });
    if (error) throw error;
    if (data && data.ok === false) {
      console.warn('[track] rpc rejected:', data);
      return res.status(200).json({ ok: true, supabase: false, err: data.error });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[track] rpc error:', err);
    // Fail open — don't punish the client
    return res.status(200).json({ ok: true, supabase: false, err: 'rpc_failed' });
  }
}

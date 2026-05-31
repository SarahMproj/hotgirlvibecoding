// /api/track — anonymized archetype distribution tracking
// Inserts one row per quiz completion / deep-link view into `quiz_events`.
// NO phone, NO PII. Powers the PR angle: aggregate counts via /api/stats.

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
  const row = {
    archetype,
    source: src,
    stage: src === 'quiz_complete' && VALID_STAGES.has(stage) ? stage : null,
    goal: src === 'quiz_complete' && VALID_GOALS.has(goal) ? goal : null,
    marketing_ready: src === 'quiz_complete' && VALID_MKT.has(marketing_ready) ? marketing_ready : null,
    referrer: typeof referrer === 'string' ? referrer.slice(0, 500) : null
  };

  const supa = getSupabase();
  if (!supa) {
    console.log('[track] Supabase not configured; row:', row);
    return res.status(200).json({ ok: true, supabase: false });
  }

  try {
    const { error } = await supa.schema('hgvc').from('quiz_events').insert(row);
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[track] insert error:', err);
    // Fail open — don't punish the client
    return res.status(200).json({ ok: true, supabase: false, err: 'insert_failed' });
  }
}

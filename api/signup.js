// /api/signup — WhatsApp Inner Circle signup capture
// Calls public.hgvc_signup() RPC (SECURITY DEFINER) — validates phone
// and upserts into hgvc.signups (deduped by phone).

import { getSupabase, corsHeaders, readJson, VALID_ARCHETYPES, VALID_STAGES, VALID_GOALS, VALID_MKT } from './_supabase.js';

export const config = { runtime: 'nodejs' };

function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 16) return null;
  return trimmed.startsWith('+') ? '+' + digits : digits;
}

export default async function handler(req, res) {
  corsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const body = await readJson(req);
  if (!body) return res.status(400).json({ ok: false, error: 'bad_body' });

  const phone = normalizePhone(body.phone);
  if (!phone) return res.status(400).json({ ok: false, error: 'bad_phone' });
  if (!VALID_ARCHETYPES.has(body.archetype)) return res.status(400).json({ ok: false, error: 'bad_archetype' });

  const supa = getSupabase();
  if (!supa) {
    console.log('[signup] Supabase not configured');
    return res.status(200).json({ ok: true, supabase: false });
  }

  try {
    const { data, error } = await supa.rpc('hgvc_signup', {
      p_phone: phone,
      p_archetype: body.archetype,
      p_stage: VALID_STAGES.has(body.stage) ? body.stage : null,
      p_goal: VALID_GOALS.has(body.goal) ? body.goal : null,
      p_mkt: VALID_MKT.has(body.marketing_ready) ? body.marketing_ready : null
    });
    if (error) throw error;
    if (data && data.ok === false) {
      console.warn('[signup] rpc rejected:', data);
      return res.status(200).json({ ok: true, supabase: false, err: data.error });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[signup] rpc error:', err);
    return res.status(200).json({ ok: true, supabase: false, err: 'rpc_failed' });
  }
}

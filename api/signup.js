// /api/signup — WhatsApp Inner Circle signup capture
// Upserts into `signups` (deduped by phone). Returns ok regardless so the
// frontend can reveal the WhatsApp invite link immediately.

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

  const row = {
    phone,
    archetype: body.archetype,
    stage: VALID_STAGES.has(body.stage) ? body.stage : null,
    goal: VALID_GOALS.has(body.goal) ? body.goal : null,
    marketing_ready: VALID_MKT.has(body.marketing_ready) ? body.marketing_ready : null,
    user_agent: (req.headers['user-agent'] || '').slice(0, 500) || null,
    ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null
  };

  const supa = getSupabase();
  if (!supa) {
    console.log('[signup] Supabase not configured; row:', { ...row, phone: phone.replace(/.(?=.{4})/g, '*') });
    return res.status(200).json({ ok: true, supabase: false });
  }

  try {
    // Upsert on phone — re-takers replace their record with latest archetype
    const { error } = await supa
      .schema('hgvc')
      .from('signups')
      .upsert(row, { onConflict: 'phone' });
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[signup] upsert error:', err);
    return res.status(200).json({ ok: true, supabase: false, err: 'insert_failed' });
  }
}

// /api/signup — WhatsApp Inner Circle signup capture
// Stores full record (phone + archetype + qual) in a KV list for later export.
// Also bumps a separate "signups" counter per archetype.
//
// Storage: Vercel KV. Falls back to logging if KV not configured.

import { kv } from '@vercel/kv';

export const config = { runtime: 'nodejs' };

const VALID_ARCHETYPES = new Set(['V', 'A', 'C', 'S']);

function bad(res, code, msg) {
  res.status(code).json({ ok: false, error: msg });
}

function corsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

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
  if (req.method !== 'POST') return bad(res, 405, 'method_not_allowed');

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return bad(res, 400, 'bad_json'); }
  } else if (!body || typeof body !== 'object') {
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    } catch { return bad(res, 400, 'bad_body'); }
  }

  const phone = normalizePhone(body && body.phone);
  if (!phone) return bad(res, 400, 'bad_phone');

  const { archetype, stage, goal, marketing_ready } = body || {};
  if (!VALID_ARCHETYPES.has(archetype)) return bad(res, 400, 'bad_archetype');

  const record = {
    phone,
    archetype,
    stage: stage || null,
    goal: goal || null,
    marketing_ready: marketing_ready || null,
    ua: req.headers['user-agent'] || null,
    ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
    at: new Date().toISOString()
  };

  if (!process.env.KV_REST_API_URL) {
    console.log('[signup] KV not configured; record:', { ...record, phone: phone.replace(/.(?=.{4})/g, '*') });
    return res.status(200).json({ ok: true, kv: false });
  }

  try {
    const pipeline = kv.pipeline();
    // Full record list for export
    pipeline.lpush('hgvc:signups', JSON.stringify(record));
    // Phone -> archetype set, to detect duplicates if you want to dedupe later
    pipeline.hset('hgvc:signup_phones', { [phone]: archetype });
    // Counter per archetype
    pipeline.hincrby('hgvc:signups:counts', archetype, 1);
    await pipeline.exec();
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[signup] kv error:', err);
    return res.status(200).json({ ok: true, kv: false, err: 'kv_write_failed' });
  }
}

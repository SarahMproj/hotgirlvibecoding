// Shared Supabase client for serverless functions.
// Uses the ANON (public) key only. All privileged writes go through
// SECURITY DEFINER RPCs in the public schema (hgvc_track, hgvc_signup),
// which validate input and enforce constraints server-side.
//
// SET in Vercel env vars (Production + Preview + Development):
//   SUPABASE_URL      = https://<project-ref>.supabase.co
//   SUPABASE_ANON_KEY = <anon public key>  (safe to expose; bound by RLS)

import { createClient } from '@supabase/supabase-js';

let _client = null;

export function getSupabase() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return _client;
}

export function corsHeaders(res, methods = 'POST, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Reads JSON body whether parsed by Vercel, sent as a string, or as a Blob via sendBeacon.
export async function readJson(req) {
  let body = req.body;
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) return body;
  if (typeof body === 'string') { try { return JSON.parse(body); } catch { return null; } }
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    return raw ? JSON.parse(raw) : {};
  } catch { return null; }
}

export const VALID_ARCHETYPES = new Set(['V', 'A', 'C', 'S']);
export const VALID_SOURCES = new Set(['quiz_complete', 'deep_link']);
export const VALID_STAGES = new Set(['idea_stage', 'building', 'traction', 'employed']);
export const VALID_GOALS = new Set(['founder_track', 'creator_track', 'experimenter', 'operator_track']);
export const VALID_MKT = new Set(['low', 'medium', 'high']);

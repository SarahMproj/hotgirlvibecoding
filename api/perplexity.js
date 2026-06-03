// /api/perplexity — trackable Perplexity download redirect.
// Logs one scan row (platform, UTM, referrer, country) to Supabase via the
// public.hgvc_scan() SECURITY DEFINER RPC, then 302-redirects the visitor to
// the right destination based on their device.
//
// Wired to hotgirlvibecoding.com/perplexity via vercel.json rewrite.

import { getSupabase } from './_supabase.js';

export const config = { runtime: 'nodejs' };

// Single destination — Perplexity's official mobile landing page (serves iOS + Android).
const MOBILE_TARGET = 'https://www.perplexity.ai/mobile';

function detectPlatform(ua = '') {
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/macintosh|windows|linux|cros/i.test(ua)) return 'desktop';
  return 'other';
}

export default async function handler(req, res) {
  const ua = req.headers['user-agent'] || '';
  const platform = detectPlatform(ua);

  // Pull UTMs from the query string, with QR-friendly defaults.
  const q = req.query || {};
  const utm = {
    source:   (q.utm_source   || 'qr').toString().slice(0, 80),
    medium:   (q.utm_medium   || 'qr_code').toString().slice(0, 80),
    campaign: (q.utm_campaign || 'perplexity_computer').toString().slice(0, 80)
  };

  // Best-effort geo from Vercel's edge headers.
  const country = (req.headers['x-vercel-ip-country'] || '').toString().slice(0, 8) || null;
  const referrer = (req.headers['referer'] || req.headers['referrer'] || '').toString().slice(0, 500) || null;

  // Log the scan (fail-open — never block the redirect on a logging error).
  try {
    const supa = getSupabase();
    if (supa) {
      await supa.rpc('hgvc_scan', {
        p_campaign:     utm.campaign,
        p_platform:     platform,
        p_utm_source:   utm.source,
        p_utm_medium:   utm.medium,
        p_utm_campaign: utm.campaign,
        p_referrer:     referrer,
        p_user_agent:   ua.slice(0, 500),
        p_country:      country
      });
    }
  } catch (err) {
    console.error('[perplexity] scan log failed:', err);
  }

  // All devices go to Perplexity's mobile landing page (still log the platform).
  const target = MOBILE_TARGET;

  // No-cache so every scan re-hits this function and gets counted.
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.writeHead(302, { Location: target });
  res.end();
}

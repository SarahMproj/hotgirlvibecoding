-- HGVC Quiz schema (lives in the `hgvc` schema to keep it isolated from
-- the host project's other tables)

CREATE SCHEMA IF NOT EXISTS hgvc;

-- Enums keep the data clean and queryable
DO $$ BEGIN
  CREATE TYPE hgvc.archetype_code AS ENUM ('V','A','C','S');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE hgvc.event_source AS ENUM ('quiz_complete','deep_link');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE hgvc.stage_code AS ENUM ('idea_stage','building','traction','employed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE hgvc.goal_code AS ENUM ('founder_track','creator_track','experimenter','operator_track');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE hgvc.mkt_code AS ENUM ('low','medium','high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Anonymized event log (powers the PR distribution data)
CREATE TABLE IF NOT EXISTS hgvc.quiz_events (
  id              bigserial PRIMARY KEY,
  archetype       hgvc.archetype_code NOT NULL,
  source          hgvc.event_source   NOT NULL DEFAULT 'quiz_complete',
  stage           hgvc.stage_code     NULL,
  goal            hgvc.goal_code      NULL,
  marketing_ready hgvc.mkt_code       NULL,
  referrer        text                NULL,
  created_at      timestamptz         NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_events_archetype ON hgvc.quiz_events (archetype);
CREATE INDEX IF NOT EXISTS idx_quiz_events_source    ON hgvc.quiz_events (source);
CREATE INDEX IF NOT EXISTS idx_quiz_events_created   ON hgvc.quiz_events (created_at DESC);

-- WhatsApp Inner Circle signups (PII — phone number)
CREATE TABLE IF NOT EXISTS hgvc.signups (
  id              bigserial PRIMARY KEY,
  phone           text       NOT NULL UNIQUE,
  archetype       hgvc.archetype_code NOT NULL,
  stage           hgvc.stage_code NULL,
  goal            hgvc.goal_code  NULL,
  marketing_ready hgvc.mkt_code   NULL,
  user_agent      text       NULL,
  ip              text       NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signups_archetype ON hgvc.signups (archetype);
CREATE INDEX IF NOT EXISTS idx_signups_created   ON hgvc.signups (created_at DESC);

-- Keep updated_at fresh on upsert
CREATE OR REPLACE FUNCTION hgvc.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_signups_touch ON hgvc.signups;
CREATE TRIGGER trg_signups_touch
  BEFORE UPDATE ON hgvc.signups
  FOR EACH ROW EXECUTE FUNCTION hgvc.touch_updated_at();

-- ============================================================
-- RLS — service role bypasses RLS automatically. No anon policies = no anon access.
-- Public stats are served via the SECURITY DEFINER RPC below.
-- ============================================================
ALTER TABLE hgvc.quiz_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hgvc.signups     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Aggregate stats RPC used by /api/stats
-- Defined in `public` so PostgREST exposes it under the default /rest/v1/rpc path.
-- SECURITY DEFINER lets it read the locked hgvc tables with the anon key.
-- Returns no PII — just counts.
-- ============================================================
CREATE OR REPLACE FUNCTION public.hgvc_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hgvc, public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'totals', (
      SELECT COALESCE(jsonb_object_agg(archetype, n), '{}'::jsonb)
      FROM (SELECT archetype, COUNT(*)::int AS n FROM hgvc.quiz_events GROUP BY archetype) t
    ),
    'quiz_completes', (
      SELECT COALESCE(jsonb_object_agg(archetype, n), '{}'::jsonb)
      FROM (SELECT archetype, COUNT(*)::int AS n FROM hgvc.quiz_events WHERE source='quiz_complete' GROUP BY archetype) t
    ),
    'deep_links', (
      SELECT COALESCE(jsonb_object_agg(archetype, n), '{}'::jsonb)
      FROM (SELECT archetype, COUNT(*)::int AS n FROM hgvc.quiz_events WHERE source='deep_link' GROUP BY archetype) t
    ),
    'by_stage', (
      SELECT COALESCE(jsonb_object_agg(stage || ':' || archetype, n), '{}'::jsonb)
      FROM (SELECT stage::text, archetype, COUNT(*)::int AS n FROM hgvc.quiz_events WHERE stage IS NOT NULL GROUP BY stage, archetype) t
    ),
    'by_goal', (
      SELECT COALESCE(jsonb_object_agg(goal || ':' || archetype, n), '{}'::jsonb)
      FROM (SELECT goal::text, archetype, COUNT(*)::int AS n FROM hgvc.quiz_events WHERE goal IS NOT NULL GROUP BY goal, archetype) t
    ),
    'by_mkt', (
      SELECT COALESCE(jsonb_object_agg(marketing_ready || ':' || archetype, n), '{}'::jsonb)
      FROM (SELECT marketing_ready::text, archetype, COUNT(*)::int AS n FROM hgvc.quiz_events WHERE marketing_ready IS NOT NULL GROUP BY marketing_ready, archetype) t
    ),
    'signups', (
      SELECT COALESCE(jsonb_object_agg(archetype, n), '{}'::jsonb)
      FROM (SELECT archetype, COUNT(*)::int AS n FROM hgvc.signups GROUP BY archetype) t
    ),
    'total_events',  (SELECT COUNT(*)::int FROM hgvc.quiz_events),
    'total_signups', (SELECT COUNT(*)::int FROM hgvc.signups)
  )
  INTO result;
  RETURN result;
END; $$;

-- Expose only the RPC publicly. Tables stay locked.
REVOKE ALL ON FUNCTION public.hgvc_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hgvc_stats() TO anon, authenticated, service_role;

-- Make the hgvc schema reachable for the service-role key (which bypasses RLS)
GRANT USAGE ON SCHEMA hgvc TO service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA hgvc TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA hgvc TO service_role;

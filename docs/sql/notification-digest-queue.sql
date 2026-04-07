-- Notification-Preferences + Digest-Queue (idempotent)
-- Dieses Skript kann mehrfach ausgeführt werden.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Organisations-Defaults für E-Mail-Benachrichtigungen
CREATE TABLE IF NOT EXISTS organization_notification_settings (
  organization_id UUID PRIMARY KEY REFERENCES organization(id) ON DELETE CASCADE,
  email_enabled_default BOOLEAN NOT NULL DEFAULT TRUE,
  delivery_mode_default TEXT NOT NULL DEFAULT 'critical_and_digest',
  minimum_priority_default TEXT NOT NULL DEFAULT 'review',
  digest_interval_default TEXT NOT NULL DEFAULT 'daily',
  digest_time_default TIME NOT NULL DEFAULT TIME '08:00',
  digest_second_time_default TIME NOT NULL DEFAULT TIME '16:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (delivery_mode_default IN ('critical_only', 'digest_only', 'critical_and_digest')),
  CHECK (minimum_priority_default IN ('info', 'review', 'critical')),
  CHECK (digest_interval_default IN ('daily', 'every_2_days'))
);

-- 2) Nutzer-Overrides pro Organisation
CREATE TABLE IF NOT EXISTS user_organization_notification_preference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  use_organization_defaults BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NULL,
  delivery_mode TEXT NULL,
  minimum_priority TEXT NULL,
  digest_interval TEXT NULL,
  digest_time TIME NULL,
  digest_second_time TIME NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (delivery_mode IS NULL OR delivery_mode IN ('critical_only', 'digest_only', 'critical_and_digest')),
  CHECK (minimum_priority IS NULL OR minimum_priority IN ('info', 'review', 'critical')),
  CHECK (digest_interval IS NULL OR digest_interval IN ('daily', 'every_2_days')),
  UNIQUE (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS user_org_notification_preference_org_idx
  ON user_organization_notification_preference (organization_id);

CREATE INDEX IF NOT EXISTS user_org_notification_preference_user_idx
  ON user_organization_notification_preference (user_id);

-- 3) Sammelmail-Pufferung und Versandstatus
CREATE TABLE IF NOT EXISTS notification_email_digest_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  priority TEXT NOT NULL CHECK (priority IN ('info', 'review', 'critical')),
  digest_interval TEXT NOT NULL CHECK (digest_interval IN ('daily', 'every_2_days')),
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  dedupe_key TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ NULL,
  message_id TEXT NULL,
  send_error TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_email_digest_queue_dedupe_key_idx
  ON notification_email_digest_queue (dedupe_key);

CREATE INDEX IF NOT EXISTS notification_email_digest_queue_due_idx
  ON notification_email_digest_queue (sent_at, scheduled_for);

CREATE INDEX IF NOT EXISTS notification_email_digest_queue_org_user_idx
  ON notification_email_digest_queue (organization_id, user_id, sent_at);

-- 4) Backward-compatible ALTERs (für bestehende Installationen)
ALTER TABLE organization_notification_settings
  ADD COLUMN IF NOT EXISTS digest_time_default TIME NOT NULL DEFAULT TIME '08:00';

ALTER TABLE organization_notification_settings
  ADD COLUMN IF NOT EXISTS digest_second_time_default TIME NOT NULL DEFAULT TIME '16:00';

ALTER TABLE user_organization_notification_preference
  ADD COLUMN IF NOT EXISTS digest_time TIME NULL;

ALTER TABLE user_organization_notification_preference
  ADD COLUMN IF NOT EXISTS digest_second_time TIME NULL;

-- 5) Bestehende Daten migrieren: twice_daily -> daily
UPDATE organization_notification_settings
SET digest_interval_default = 'daily'
WHERE digest_interval_default = 'twice_daily';

UPDATE user_organization_notification_preference
SET digest_interval = 'daily'
WHERE digest_interval = 'twice_daily';

UPDATE notification_email_digest_queue
SET digest_interval = 'daily'
WHERE digest_interval = 'twice_daily';

-- 6) Bestehende CHECK-Constraints auf neue Intervallwerte umstellen
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'organization_notification_settings'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%digest_interval_default%'
  LOOP
    EXECUTE format(
      'ALTER TABLE organization_notification_settings DROP CONSTRAINT IF EXISTS %I',
      constraint_name
    );
  END LOOP;
END
$$;

ALTER TABLE organization_notification_settings
  DROP CONSTRAINT IF EXISTS organization_notification_settings_digest_interval_default_check;

ALTER TABLE organization_notification_settings
  ADD CONSTRAINT organization_notification_settings_digest_interval_default_check
  CHECK (digest_interval_default IN ('daily', 'every_2_days'));

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'user_organization_notification_preference'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%digest_interval%'
  LOOP
    EXECUTE format(
      'ALTER TABLE user_organization_notification_preference DROP CONSTRAINT IF EXISTS %I',
      constraint_name
    );
  END LOOP;
END
$$;

ALTER TABLE user_organization_notification_preference
  DROP CONSTRAINT IF EXISTS user_org_notification_preference_digest_interval_check;

ALTER TABLE user_organization_notification_preference
  ADD CONSTRAINT user_org_notification_preference_digest_interval_check
  CHECK (digest_interval IS NULL OR digest_interval IN ('daily', 'every_2_days'));

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'notification_email_digest_queue'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%digest_interval%'
  LOOP
    EXECUTE format(
      'ALTER TABLE notification_email_digest_queue DROP CONSTRAINT IF EXISTS %I',
      constraint_name
    );
  END LOOP;
END
$$;

ALTER TABLE notification_email_digest_queue
  DROP CONSTRAINT IF EXISTS notification_email_digest_queue_digest_interval_check;

ALTER TABLE notification_email_digest_queue
  ADD CONSTRAINT notification_email_digest_queue_digest_interval_check
  CHECK (digest_interval IN ('daily', 'every_2_days'));

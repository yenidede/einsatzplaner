-- Notification-Preferences + Digest-Queue (idempotent)
-- Dieses Skript kann mehrfach ausgeführt werden.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Organisations-Defaults für E-Mail-Benachrichtigungen
CREATE TABLE IF NOT EXISTS organization_notification_settings (
  organization_id UUID PRIMARY KEY REFERENCES organization(id) ON DELETE CASCADE,
  email_enabled_default BOOLEAN NOT NULL DEFAULT TRUE,
  delivery_mode_default TEXT NOT NULL DEFAULT 'critical_and_digest',
  minimum_priority_default TEXT NOT NULL DEFAULT 'review',
  urgent_delivery_default TEXT NOT NULL DEFAULT 'immediate',
  important_delivery_default TEXT NOT NULL DEFAULT 'digest',
  general_delivery_default TEXT NOT NULL DEFAULT 'off',
  digest_interval_default TEXT NOT NULL DEFAULT 'daily',
  digest_time_default TIME NOT NULL DEFAULT TIME '08:00',
  digest_second_time_default TIME NOT NULL DEFAULT TIME '16:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (delivery_mode_default IN ('critical_only', 'digest_only', 'critical_and_digest')),
  CHECK (minimum_priority_default IN ('info', 'review', 'critical')),
  CHECK (urgent_delivery_default IN ('immediate', 'digest')),
  CHECK (important_delivery_default IN ('immediate', 'digest')),
  CHECK (general_delivery_default IN ('digest', 'off')),
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
  urgent_delivery TEXT NULL,
  important_delivery TEXT NULL,
  general_delivery TEXT NULL,
  digest_interval TEXT NULL,
  digest_time TIME NULL,
  digest_second_time TIME NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (delivery_mode IS NULL OR delivery_mode IN ('critical_only', 'digest_only', 'critical_and_digest')),
  CHECK (minimum_priority IS NULL OR minimum_priority IN ('info', 'review', 'critical')),
  CHECK (urgent_delivery IS NULL OR urgent_delivery IN ('immediate', 'digest')),
  CHECK (important_delivery IS NULL OR important_delivery IN ('immediate', 'digest')),
  CHECK (general_delivery IS NULL OR general_delivery IN ('digest', 'off')),
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
  ADD COLUMN IF NOT EXISTS urgent_delivery_default TEXT;

ALTER TABLE organization_notification_settings
  ADD COLUMN IF NOT EXISTS important_delivery_default TEXT;

ALTER TABLE organization_notification_settings
  ADD COLUMN IF NOT EXISTS general_delivery_default TEXT;

ALTER TABLE organization_notification_settings
  ADD COLUMN IF NOT EXISTS digest_time_default TIME NOT NULL DEFAULT TIME '08:00';

ALTER TABLE organization_notification_settings
  ADD COLUMN IF NOT EXISTS digest_second_time_default TIME NOT NULL DEFAULT TIME '16:00';

ALTER TABLE user_organization_notification_preference
  ADD COLUMN IF NOT EXISTS urgent_delivery TEXT NULL;

ALTER TABLE user_organization_notification_preference
  ADD COLUMN IF NOT EXISTS important_delivery TEXT NULL;

ALTER TABLE user_organization_notification_preference
  ADD COLUMN IF NOT EXISTS general_delivery TEXT NULL;

ALTER TABLE user_organization_notification_preference
  ADD COLUMN IF NOT EXISTS digest_time TIME NULL;

ALTER TABLE user_organization_notification_preference
  ADD COLUMN IF NOT EXISTS digest_second_time TIME NULL;

-- 5) Bestehende Daten migrieren: twice_daily -> daily
UPDATE organization_notification_settings
SET digest_interval_default = 'daily'
WHERE digest_interval_default = 'twice_daily';

UPDATE organization_notification_settings
SET urgent_delivery_default = CASE
  WHEN delivery_mode_default = 'digest_only' THEN 'digest'
  ELSE 'immediate'
END
WHERE urgent_delivery_default IS NULL;

UPDATE organization_notification_settings
SET important_delivery_default = CASE
  WHEN delivery_mode_default = 'critical_and_digest'
       AND minimum_priority_default <> 'critical'
    THEN 'digest'
  ELSE 'immediate'
END
WHERE important_delivery_default IS NULL;

UPDATE organization_notification_settings
SET general_delivery_default = CASE
  WHEN minimum_priority_default = 'info'
       AND delivery_mode_default IN ('critical_and_digest', 'digest_only')
    THEN 'digest'
  ELSE 'off'
END
WHERE general_delivery_default IS NULL;

ALTER TABLE organization_notification_settings
  ALTER COLUMN urgent_delivery_default SET DEFAULT 'immediate';

ALTER TABLE organization_notification_settings
  ALTER COLUMN important_delivery_default SET DEFAULT 'digest';

ALTER TABLE organization_notification_settings
  ALTER COLUMN general_delivery_default SET DEFAULT 'off';

ALTER TABLE organization_notification_settings
  ALTER COLUMN urgent_delivery_default SET NOT NULL;

ALTER TABLE organization_notification_settings
  ALTER COLUMN important_delivery_default SET NOT NULL;

ALTER TABLE organization_notification_settings
  ALTER COLUMN general_delivery_default SET NOT NULL;

UPDATE user_organization_notification_preference
SET digest_interval = 'daily'
WHERE digest_interval = 'twice_daily';

UPDATE user_organization_notification_preference
SET urgent_delivery = CASE
  WHEN COALESCE(delivery_mode, 'critical_and_digest') = 'digest_only' THEN 'digest'
  ELSE 'immediate'
END
WHERE urgent_delivery IS NULL
  AND (delivery_mode IS NOT NULL OR minimum_priority IS NOT NULL);

UPDATE user_organization_notification_preference
SET important_delivery = CASE
  WHEN COALESCE(delivery_mode, 'critical_and_digest') = 'critical_and_digest'
       AND COALESCE(minimum_priority, 'review') <> 'critical'
    THEN 'digest'
  ELSE 'immediate'
END
WHERE important_delivery IS NULL
  AND (delivery_mode IS NOT NULL OR minimum_priority IS NOT NULL);

UPDATE user_organization_notification_preference
SET general_delivery = CASE
  WHEN COALESCE(minimum_priority, 'review') = 'info'
       AND COALESCE(delivery_mode, 'critical_and_digest') IN ('critical_and_digest', 'digest_only')
    THEN 'digest'
  ELSE 'off'
END
WHERE general_delivery IS NULL
  AND (delivery_mode IS NOT NULL OR minimum_priority IS NOT NULL);

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

ALTER TABLE organization_notification_settings
  DROP CONSTRAINT IF EXISTS organization_notification_settings_urgent_delivery_default_check;

ALTER TABLE organization_notification_settings
  ADD CONSTRAINT organization_notification_settings_urgent_delivery_default_check
  CHECK (urgent_delivery_default IN ('immediate', 'digest'));

ALTER TABLE organization_notification_settings
  DROP CONSTRAINT IF EXISTS organization_notification_settings_important_delivery_default_check;

ALTER TABLE organization_notification_settings
  ADD CONSTRAINT organization_notification_settings_important_delivery_default_check
  CHECK (important_delivery_default IN ('immediate', 'digest'));

ALTER TABLE organization_notification_settings
  DROP CONSTRAINT IF EXISTS organization_notification_settings_general_delivery_default_check;

ALTER TABLE organization_notification_settings
  ADD CONSTRAINT organization_notification_settings_general_delivery_default_check
  CHECK (general_delivery_default IN ('digest', 'off'));

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

ALTER TABLE user_organization_notification_preference
  DROP CONSTRAINT IF EXISTS user_org_notification_preference_urgent_delivery_check;

ALTER TABLE user_organization_notification_preference
  ADD CONSTRAINT user_org_notification_preference_urgent_delivery_check
  CHECK (urgent_delivery IS NULL OR urgent_delivery IN ('immediate', 'digest'));

ALTER TABLE user_organization_notification_preference
  DROP CONSTRAINT IF EXISTS user_org_notification_preference_important_delivery_check;

ALTER TABLE user_organization_notification_preference
  ADD CONSTRAINT user_org_notification_preference_important_delivery_check
  CHECK (important_delivery IS NULL OR important_delivery IN ('immediate', 'digest'));

ALTER TABLE user_organization_notification_preference
  DROP CONSTRAINT IF EXISTS user_org_notification_preference_general_delivery_check;

ALTER TABLE user_organization_notification_preference
  ADD CONSTRAINT user_org_notification_preference_general_delivery_check
  CHECK (general_delivery IS NULL OR general_delivery IN ('digest', 'off'));

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

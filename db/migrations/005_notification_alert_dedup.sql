-- ============================================================================
-- Migration 005: Notification alert de-duplication
-- ============================================================================
--
-- Some notifications are generated automatically (expiry alerts, reminders, etc.).
-- This table prevents sending the same alert repeatedly on every scheduler run.
--
-- We store a caller-defined `dedup_key` (unique), for example:
--   expiry_soon:<extinguisher_id>:<expiry_date>
--   inspection_upcoming:<inspection_id>:<user_id>:<scheduled_date>
--   compliance_summary:<YYYY-MM-DD>
--
-- IMPORTANT:
-- - The notifications table remains the source of truth for user-visible items.
-- - This table is only used to avoid duplicates/spam.

CREATE TABLE IF NOT EXISTS notification_alert_dedup (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dedup_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_notification_alert_dedup_key UNIQUE (dedup_key)
);

CREATE INDEX IF NOT EXISTS idx_notif_dedup_created ON notification_alert_dedup (created_at DESC);


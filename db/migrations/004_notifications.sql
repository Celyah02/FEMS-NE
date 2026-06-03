-- ============================================================================
-- Migration 004: Notifications table
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = broadcast
    type           VARCHAR(50)  NOT NULL DEFAULT 'info',          -- info | inspection | compliance | maintenance
    title          VARCHAR(160) NOT NULL,
    message        TEXT         NOT NULL,
    related_entity VARCHAR(50),                                   -- e.g. 'extinguisher', 'inspection'
    related_id     UUID,
    is_read        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_user    ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notif_is_read ON notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications (created_at DESC);

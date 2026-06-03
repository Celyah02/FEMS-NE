-- ============================================================================
-- Migration 003: Inspection scheduling & Maintenance logging tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- inspections
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extinguisher_id UUID NOT NULL REFERENCES fire_extinguishers(id) ON DELETE CASCADE,
    scheduled_date  DATE NOT NULL,
    scheduled_time  TIME,
    status          inspection_status NOT NULL DEFAULT 'pending',
    result          inspection_result,
    assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,   -- inspector
    scheduled_by    UUID REFERENCES users(id) ON DELETE SET NULL,   -- requester
    notes           TEXT,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insp_extinguisher ON inspections (extinguisher_id);
CREATE INDEX IF NOT EXISTS idx_insp_status       ON inspections (status);
CREATE INDEX IF NOT EXISTS idx_insp_sched_date   ON inspections (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_insp_assigned     ON inspections (assigned_to);

DROP TRIGGER IF EXISTS trg_insp_updated_at ON inspections;
CREATE TRIGGER trg_insp_updated_at
    BEFORE UPDATE ON inspections
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- maintenance_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extinguisher_id    UUID NOT NULL REFERENCES fire_extinguishers(id) ON DELETE CASCADE,
    inspection_id      UUID REFERENCES inspections(id) ON DELETE SET NULL,
    action_taken       VARCHAR(255) NOT NULL,
    maintenance_date   DATE NOT NULL,
    issues_identified  TEXT,
    notes              TEXT,
    recommendations    TEXT,
    performed_by       UUID REFERENCES users(id) ON DELETE SET NULL,  -- inspector
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maint_extinguisher ON maintenance_logs (extinguisher_id);
CREATE INDEX IF NOT EXISTS idx_maint_date         ON maintenance_logs (maintenance_date);
CREATE INDEX IF NOT EXISTS idx_maint_performer    ON maintenance_logs (performed_by);

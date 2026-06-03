-- ============================================================================
-- Migration 006: Reports table for persistent report storage
-- ============================================================================
-- Stores generated reports so they can be retrieved later, audited, and archived.
-- Supports multiple formats (PDF, CSV) and report types.

CREATE TABLE IF NOT EXISTS reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_type     VARCHAR(50) NOT NULL,  -- summary | inventory | inspections | compliance | maintenance
    format          VARCHAR(10) NOT NULL,  -- pdf | csv
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    file_path       VARCHAR(255),          -- Path to stored file (S3, local filesystem, etc.)
    file_size_bytes INTEGER,
    data            BYTEA,                 -- Raw file data (if small) or NULL (if stored externally)
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ,           -- Optional: auto-delete after N days
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_user       ON reports (user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type       ON reports (report_type);
CREATE INDEX IF NOT EXISTS idx_reports_generated  ON reports (generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_expires    ON reports (expires_at);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
CREATE TRIGGER trg_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- Scheduled Job Tracking Table (for notification reminders, report cleanup, etc.)
-- ============================================================================
-- Tracks background jobs so they can be retried, monitored, and debugged.

CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type        VARCHAR(50) NOT NULL,  -- inspection_reminder | maintenance_reminder | expiry_alert | compliance_alert | cleanup_reports
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | running | completed | failed
    run_at          TIMESTAMPTZ NOT NULL,  -- When the job should run
    ran_at          TIMESTAMPTZ,           -- When it actually ran
    next_run_at     TIMESTAMPTZ,           -- For recurring jobs
    error_message   TEXT,                  -- If status = failed
    retry_count     INTEGER DEFAULT 0,
    max_retries     INTEGER DEFAULT 3,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_type      ON scheduled_jobs (job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_status    ON scheduled_jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_run_at    ON scheduled_jobs (run_at);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trg_jobs_updated_at ON scheduled_jobs;
CREATE TRIGGER trg_jobs_updated_at
    BEFORE UPDATE ON scheduled_jobs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

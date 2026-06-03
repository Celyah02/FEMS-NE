-- ============================================================================
-- Migration 002: Fire Extinguisher Management tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS fire_extinguishers (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number     VARCHAR(64)  NOT NULL,
    location          VARCHAR(255) NOT NULL,
    type              extinguisher_type   NOT NULL,
    size              extinguisher_size   NOT NULL,
    installation_date DATE         NOT NULL,
    expiry_date       DATE         NOT NULL,
    status            extinguisher_status NOT NULL DEFAULT 'active',
    last_inspected_at TIMESTAMPTZ,
    created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_extinguisher_serial UNIQUE (serial_number),
    CONSTRAINT chk_extinguisher_dates CHECK (expiry_date >= installation_date)
);

CREATE INDEX IF NOT EXISTS idx_ext_status      ON fire_extinguishers (status);
CREATE INDEX IF NOT EXISTS idx_ext_type        ON fire_extinguishers (type);
CREATE INDEX IF NOT EXISTS idx_ext_expiry      ON fire_extinguishers (expiry_date);
CREATE INDEX IF NOT EXISTS idx_ext_location    ON fire_extinguishers (location);
CREATE INDEX IF NOT EXISTS idx_ext_serial_trgm ON fire_extinguishers (serial_number);

DROP TRIGGER IF EXISTS trg_ext_updated_at ON fire_extinguishers;
CREATE TRIGGER trg_ext_updated_at
    BEFORE UPDATE ON fire_extinguishers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

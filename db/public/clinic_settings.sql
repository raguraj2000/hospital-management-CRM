-- ==============================================================================
-- Table: public.clinic_settings
-- Purpose: Facility operational configuration, default fees, time-slots, and presets
-- Source: apps/api/src/db/schema.ts (clinic_setting)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.clinic_settings (
    branch_id BIGINT PRIMARY KEY REFERENCES public.branches(id) ON DELETE CASCADE,
    consultation_fee_paise BIGINT NOT NULL DEFAULT 0 CHECK (consultation_fee_paise >= 0),
    default_doctor_user_id BIGINT NULL REFERENCES global.users(id) ON DELETE SET NULL,
    charge_presets JSONB NOT NULL DEFAULT '[]'::jsonb, -- Ready-made clinical charges ([{"name": "Dressing", "amountPaise": 15000}])
    fee_slots JSONB NOT NULL DEFAULT '[]'::jsonb,      -- Time-of-day fees ([{"from": "22:00", "to": "06:00", "feePaise": 30000}])
    nav_counts BOOLEAN NOT NULL DEFAULT true,          -- Toggles dynamic waiting badges
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.clinic_settings IS 'Facility-specific pricing, time-of-day fee slots, and procedural charge presets';

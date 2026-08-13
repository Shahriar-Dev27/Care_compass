-- CareCompass Updated At Triggers
-- Run order: 3 of 3

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END $$;

-- Apply to tables with updated_at column
CREATE TRIGGER set_patient_profiles_updated
    BEFORE UPDATE ON patient_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_appointments_updated
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_user_prefs_updated
    BEFORE UPDATE ON user_prefs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- CareCompass — slot exclusivity + SECURITY DEFINER hardening
-- Run order: 4

-- ── Slot exclusivity ─────────────────────────────────────────────────────────
-- Two users could book the same clinician at the same time: booked_slots()
-- only ever returned the caller's own bookings, so the picker never saw the
-- conflict, and nothing in the database stopped the second insert.
-- Partial so cancelled/completed visits do not block the slot being re-sold.
CREATE UNIQUE INDEX IF NOT EXISTS appointments_slot_unique
    ON public.appointments (doctor_slug, at) WHERE status = 'booked';

-- Availability across every patient. Returns only doctor_slug + at — no
-- user_id, no reason, no PHI — which is the same information a public booking
-- page shows, so anon may read it too.
CREATE OR REPLACE FUNCTION public.booked_slots()
RETURNS TABLE (doctor_slug TEXT, at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    RETURN QUERY
    SELECT a.doctor_slug, a.at
    FROM public.appointments a
    WHERE a.status = 'booked'
      AND a.at > NOW();
END $$;

GRANT EXECUTE ON FUNCTION public.booked_slots() TO anon;

-- ── search_path hardening ────────────────────────────────────────────────────
-- A SECURITY DEFINER function with a mutable search_path can be pointed at an
-- attacker-owned schema by whoever calls it.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    INSERT INTO public.patient_profiles (user_id, name, relation, is_self, insurance, member_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'You',
        TRUE,
        'Self-pay',
        ''
    );
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.log_access(who TEXT, what TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    INSERT INTO public.access_log (user_id, who, what)
    VALUES (auth.uid(), who, what);
END $$;

-- Writes only to NEW; it never needed the definer's privileges.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END $$;

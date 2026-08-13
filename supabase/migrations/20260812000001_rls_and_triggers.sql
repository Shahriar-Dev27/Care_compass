-- CareCompass RLS Policies & Triggers
-- Run order: 2 of 3

-- Enable RLS on all tables
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_log ENABLE ROW LEVEL SECURITY;

-- Patient Profiles: users can only see/modify their own profiles
CREATE POLICY "Users can view own profiles" ON patient_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profiles" ON patient_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles" ON patient_profiles
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profiles" ON patient_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Appointments: users can only see/modify their own appointments
CREATE POLICY "Users can view own appointments" ON appointments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appointments" ON appointments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointments" ON appointments
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own appointments" ON appointments
    FOR DELETE USING (auth.uid() = user_id);

-- Waitlist: users can only see/modify their own waitlist entries
CREATE POLICY "Users can view own waitlist" ON waitlist
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own waitlist" ON waitlist
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own waitlist" ON waitlist
    FOR DELETE USING (auth.uid() = user_id);

-- Messages: users can only see/modify their own messages
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Preferences: users can only see/modify their own preferences
CREATE POLICY "Users can view own prefs" ON user_prefs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own prefs" ON user_prefs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prefs" ON user_prefs
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Access Log: users can only see their own log entries
CREATE POLICY "Users can view own access log" ON access_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own access log" ON access_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to create first patient profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
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

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to log access events
CREATE OR REPLACE FUNCTION public.log_access(who TEXT, what TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.access_log (user_id, who, what)
    VALUES (auth.uid(), who, what);
END $$;

-- Function to get booked slots for a doctor (used by schedule.js)
CREATE OR REPLACE FUNCTION public.booked_slots()
RETURNS TABLE (doctor_slug TEXT, at TIMESTAMPTZ) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT a.doctor_slug, a.at
    FROM public.appointments a
    WHERE a.user_id = auth.uid()
      AND a.status = 'booked'
      AND a.at > NOW();
END $$;

-- Grant execute on RPC to authenticated users
GRANT EXECUTE ON FUNCTION public.booked_slots() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_access(TEXT, TEXT) TO authenticated;
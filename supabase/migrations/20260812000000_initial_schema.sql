-- CareCompass Initial Schema
-- Run order: 1 of 3

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Patient profiles: one row per person whose care the user manages
CREATE TABLE patient_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relation TEXT NOT NULL CHECK (relation IN ('You', 'Child', 'Partner', 'Parent', 'Other')),
    is_self BOOLEAN NOT NULL DEFAULT FALSE,
    dob DATE,
    insurance TEXT,
    member_id TEXT,
    medications TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    conditions TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Appointments: booked visits
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    doctor_slug TEXT NOT NULL,
    at TIMESTAMPTZ NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('video', 'in-person')),
    reason TEXT NOT NULL,
    insurance TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'cancelled', 'completed', 'no-show')),
    summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Waitlist: users waiting for slots
CREATE TABLE waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    doctor_slug TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, profile_id, doctor_slug)
);

-- Messages: encrypted chat with care teams
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    doctor_slug TEXT NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('you', 'care-team', 'system')),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User preferences: theme, reminders, AI suggestions
CREATE TABLE user_prefs (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    text_scale TEXT NOT NULL DEFAULT 'base' CHECK (text_scale IN ('sm', 'base', 'lg', 'xl')),
    reminder_sms BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_email BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_push BOOLEAN NOT NULL DEFAULT FALSE,
    ai_suggestions BOOLEAN NOT NULL DEFAULT TRUE,
    dismissed TEXT[] DEFAULT '{}',
    follow_up JSONB,
    active_profile_id UUID REFERENCES patient_profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Access log: audit trail for HIPAA compliance
CREATE TABLE access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    who TEXT NOT NULL,
    what TEXT NOT NULL,
    at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_patient_profiles_user ON patient_profiles(user_id);
CREATE INDEX idx_appointments_user ON appointments(user_id);
CREATE INDEX idx_appointments_profile ON appointments(profile_id);
CREATE INDEX idx_appointments_at ON appointments(at);
CREATE INDEX idx_waitlist_user ON waitlist(user_id);
CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_messages_doctor ON messages(doctor_slug);
CREATE INDEX idx_access_log_user ON access_log(user_id);
CREATE INDEX idx_access_log_at ON access_log(at DESC);